import { Injectable } from '@nestjs/common';
import { compileExpr, ErrorCodes, type WfModel, type WfNode } from '@erp3d/shared';
import { BizError } from '../common/biz-error';
import type { AuthUser } from '../common/request-context';
import { BillEngineRegistry } from '../bill-engine/bill-engine.registry';
import { BillOpService } from '../bill-engine/service/bill-op.service';
import type { BillHookContext } from '../bill-engine/engine.types';
import { nowStr } from '../bill-engine/meta/meta-util';
import { WsGateway } from '../core/ws/ws.gateway';
import { MessageService } from '../core/message/message.service';
import { DbService, ident } from '../db/db.service';
import { nextId } from '../db/snowflake';
import { activateFrom, outgoingOf, startFlows } from './wf-graph';
import { WfTaskFactory } from './wf-task.factory';
import type { StarterInfo, WfInstanceRow } from './wf.types';

type Row = Record<string, any>;
type TemplateRow = Row & { id: number; definition_key: string; start_condition: string | null };

function parseObject(value: unknown): Record<string, unknown> | null {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  if (typeof value !== 'string') return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed !== null && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

@Injectable()
export class WfEngine {
  constructor(
    private readonly db: DbService,
    private readonly factory: WfTaskFactory,
    private readonly bills: BillOpService,
    private readonly registry: BillEngineRegistry,
    private readonly ws: WsGateway,
    private readonly messages: MessageService,
  ) {}

  async matchTemplate(
    form: string,
    header: Row,
    at: string,
  ): Promise<{ template: TemplateRow; definition: Row } | null> {
    const rows = await this.db.q<TemplateRow>(
      `SELECT *
         FROM wf_template
        WHERE org_id = ? AND form = ? AND enabled = 1
          AND (bill_type_id IS NULL OR bill_type_id = ?)
          AND (eff_date IS NULL OR eff_date <= ?)
          AND (exp_date IS NULL OR exp_date >= ?)
        ORDER BY priority DESC, (bill_type_id IS NOT NULL) DESC, id DESC`,
      [Number(header.org_id ?? 1), form, header.bill_type_id ?? null, at, at],
    );

    for (const template of rows) {
      if (template.start_condition?.trim()) {
        let matches = false;
        try {
          matches = compileExpr(template.start_condition).evalBool({ ...header, head: header });
        } catch {
          throw new BizError(ErrorCodes.WF_DEF_INVALID, `流程模板 ${template.id} 的启动条件无效`);
        }
        if (!matches) continue;
      }
      const definition = await this.db.one<Row>(
        `SELECT * FROM wf_definition
          WHERE org_id = ? AND def_key = ? AND form = ? AND status = 'PUBLISHED'
          ORDER BY version DESC, id DESC LIMIT 1`,
        [Number(header.org_id ?? 1), template.definition_key, form],
      );
      if (definition) return { template, definition };
      throw new BizError(ErrorCodes.WF_DEF_INVALID, `流程模板 ${template.id} 引用的已发布定义不存在`);
    }
    return null;
  }

  async start(ctx: BillHookContext): Promise<'started' | 'none'> {
    if (!this.db.inTx) {
      throw new BizError(ErrorCodes.SYS_INTERNAL, '审批流程必须与单据提交共用事务');
    }
    const match = await this.matchTemplate(ctx.form, ctx.header, nowStr());
    if (!match) return 'none';

    const model = this.modelOf(match.definition.model_json);
    const starter = this.starterFromUser(ctx.user);
    const instanceId = nextId();
    const inst: WfInstanceRow = {
      id: instanceId,
      org_id: Number(ctx.header.org_id ?? ctx.user.orgId),
      definition_id: Number(match.definition.id),
      template_id: Number(match.template.id),
      form: ctx.form,
      bill_id: ctx.billId,
      bill_no: String(ctx.header.bill_no ?? ''),
      starter_id: ctx.user.id,
      status: 'RUNNING',
      current_nodes_json: [],
      round: 1,
      started_at: nowStr(),
      ended_at: null,
    };
    await this.db.exec(
      `INSERT INTO wf_instance
        (id, org_id, creator_id, definition_id, template_id, form, bill_id, bill_no,
         starter_id, status, current_nodes_json, round, started_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'RUNNING', JSON_ARRAY(), 1, ?)`,
      [instanceId, inst.org_id, ctx.user.id, inst.definition_id, inst.template_id,
        inst.form, inst.bill_id, inst.bill_no, inst.starter_id, inst.started_at],
    );
    await this.db.exec(
      `UPDATE ${ident(this.registry.get(ctx.form).meta.table)}
          SET wf_instance_id = ? WHERE id = ?`,
      [instanceId, ctx.billId],
    );
    await this.enterFlows(inst, model, startFlows(model), ctx.user);
    return 'started';
  }

  async enterFlows(
    inst: WfInstanceRow,
    model: WfModel,
    flowIds: string[],
    user: AuthUser,
  ): Promise<void> {
    const starter = await this.starterFor(inst);
    let queue = [...flowIds];
    let joinState = await this.joinState(inst.id);
    let reachedEnd = false;
    const activeNodes = new Set(this.currentNodes(inst.current_nodes_json));
    let steps = 0;

    while (queue.length > 0) {
      if (++steps > 100) {
        throw new BizError(ErrorCodes.WF_DEF_INVALID, '流程自动跳过节点过多，可能存在循环');
      }
      const result = activateFrom(model, queue, await this.vars(inst), joinState);
      queue = [];
      joinState = result.joinState;
      reachedEnd ||= result.reachedEnd;

      for (const nodeKey of result.userTasks) {
        const node = model.nodes[nodeKey] as WfNode;
        const created = await this.factory.createNodeTasks(inst, node, starter);
        if (created.skipped) {
          await this.factory.createCcTasks(inst, node, starter);
          queue.push(...outgoingOf(model, nodeKey));
        } else {
          activeNodes.add(nodeKey);
        }
      }
    }

    await this.saveJoinState(inst, joinState, user.id);
    await this.db.exec(
      'UPDATE wf_instance SET current_nodes_json = ? WHERE id = ?',
      [JSON.stringify([...activeNodes]), inst.id],
    );

    if (activeNodes.size > 0) return;
    if (!reachedEnd) {
      throw new BizError(ErrorCodes.WF_NO_ROUTE, '流程当前没有待办节点，也未到达结束事件');
    }

    const endedAt = nowStr();
    await this.db.exec(
      `UPDATE wf_instance SET status = 'COMPLETED', current_nodes_json = JSON_ARRAY(), ended_at = ? WHERE id = ?`,
      [endedAt, inst.id],
    );
    await this.bills.auditByWorkflow(inst.form, inst.bill_id, user);
    await this.messages.send({
      toUserId: inst.starter_id,
      fromUserId: user.id,
      title: '审批流程已完成',
      content: `单据 ${inst.bill_no} 已完成审批并审核。`,
      type: 'WORKFLOW',
      level: 'INFO',
      objectCode: inst.form,
      billId: inst.bill_id,
      link: `/bills/${inst.form}/${inst.bill_id}`,
    });
  }

  async nodePassed(
    inst: WfInstanceRow,
    model: WfModel,
    nodeKey: string,
    user: AuthUser,
  ): Promise<void> {
    const starter = await this.starterFor(inst);
    const node = model.nodes[nodeKey];
    if (node) await this.factory.createCcTasks(inst, node, starter);
    await this.db.exec(
      `UPDATE wf_task SET status = 'CANCELED', done_at = ?
        WHERE instance_id = ? AND node_key = ? AND round = ?
          AND status IN ('PENDING', 'WAITING')`,
      [nowStr(), inst.id, nodeKey, inst.round],
    );
    await this.notifyTaskUsers(inst.id, nodeKey, inst.round);
    const remaining = this.currentNodes(inst.current_nodes_json).filter((key) => key !== nodeKey);
    await this.db.exec(
      'UPDATE wf_instance SET current_nodes_json = ? WHERE id = ?',
      [JSON.stringify(remaining), inst.id],
    );
    inst.current_nodes_json = remaining;
    await this.enterFlows(inst, model, outgoingOf(model, nodeKey), user);
  }

  async loadModel(inst: WfInstanceRow): Promise<WfModel> {
    const row = await this.db.one<{ model_json: unknown }>(
      'SELECT model_json FROM wf_definition WHERE id = ?',
      [inst.definition_id],
    );
    if (!row) throw new BizError(ErrorCodes.WF_DEF_INVALID, '流程定义版本不存在');
    return this.modelOf(row.model_json);
  }

  async lockInstance(id: number): Promise<WfInstanceRow> {
    const candidate = await this.db.one<WfInstanceRow>(
      'SELECT * FROM wf_instance WHERE id = ?',
      [id],
    );
    if (!candidate) throw new BizError(ErrorCodes.WF_TASK_NOT_FOUND, '流程实例不存在');

    // L1 单据操作锁单据头后再访问流程实例；所有工作流动作遵循相同顺序。
    const billTable = ident(this.registry.get(candidate.form).meta.table);
    await this.db.one(
      `SELECT id FROM ${billTable} WHERE id = ? FOR UPDATE`,
      [candidate.bill_id],
    );
    const row = await this.db.one<WfInstanceRow>(
      'SELECT * FROM wf_instance WHERE id = ? FOR UPDATE',
      [id],
    );
    if (!row) throw new BizError(ErrorCodes.WF_TASK_NOT_FOUND, '流程实例不存在');
    return row;
  }

  async instanceIdForTask(taskId: number): Promise<number> {
    const row = await this.db.one<{ instance_id: number }>(
      'SELECT instance_id FROM wf_task WHERE id = ?', [taskId],
    );
    if (!row) throw new BizError(ErrorCodes.WF_TASK_NOT_FOUND, '审批任务不存在');
    return Number(row.instance_id);
  }

  async vars(inst: WfInstanceRow): Promise<Record<string, unknown>> {
    const registered = this.registry.get(inst.form);
    const header = await this.db.one<Row>(
      `SELECT * FROM ${ident(registered.meta.table)} WHERE id = ?`,
      [inst.bill_id],
    );
    if (!header) throw new BizError(ErrorCodes.BIZ_BILL_NOT_FOUND, '审批单据不存在');
    const rows = await this.db.q<{ key: string; value: unknown }>(
      'SELECT `key`, value FROM wf_variable WHERE instance_id = ?', [inst.id],
    );
    const vars: Record<string, unknown> = { ...header, head: header };
    for (const row of rows) {
      const value = parseObject(row.value);
      if (value) vars[row.key] = value;
      else {
        try { vars[row.key] = typeof row.value === 'string' ? JSON.parse(row.value) : row.value; }
        catch { vars[row.key] = row.value; }
      }
    }
    return vars;
  }

  async endInstance(
    inst: WfInstanceRow,
    status: 'REJECTED' | 'WITHDRAWN' | 'TERMINATED',
    user: AuthUser,
    updateBill = true,
  ): Promise<void> {
    await this.db.exec(
      `UPDATE wf_task SET status = 'CANCELED', done_at = ?
        WHERE instance_id = ? AND status IN ('PENDING', 'WAITING')`,
      [nowStr(), inst.id],
    );
    await this.db.exec(
      `UPDATE wf_instance SET status = ?, current_nodes_json = JSON_ARRAY(), ended_at = ? WHERE id = ?`,
      [status, nowStr(), inst.id],
    );
    await this.notifyTaskUsers(inst.id);
    if (updateBill) await this.bills.rejectByWorkflow(inst.form, inst.bill_id, user);
    await this.messages.send({
      toUserId: inst.starter_id,
      fromUserId: user.id,
      title: status === 'REJECTED' ? '审批流程已驳回' : status === 'WITHDRAWN' ? '审批流程已撤回' : '审批流程已终止',
      content: `单据 ${inst.bill_no} 的审批流程状态为 ${status}。`,
      type: 'WORKFLOW',
      level: status === 'REJECTED' ? 'WARN' : 'INFO',
      objectCode: inst.form,
      billId: inst.bill_id,
      link: `/bills/${inst.form}/${inst.bill_id}`,
    });
  }

  async resetJoinState(inst: WfInstanceRow, userId: number): Promise<void> {
    await this.saveJoinState(inst, {}, userId);
  }

  async logAction(
    inst: WfInstanceRow,
    taskId: number | null,
    nodeKey: string | null,
    action: string,
    user: AuthUser,
    opinion?: string,
    targetNodeKey?: string | null,
    signImage?: string,
    data?: Record<string, unknown>,
  ): Promise<void> {
    await this.db.exec(
      `INSERT INTO wf_action_log
        (id, org_id, creator_id, instance_id, task_id, node_key, round, action,
         target_node_key, opinion, sign_image, user_id, action_data_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nextId(), inst.org_id, user.id, inst.id, taskId, nodeKey, inst.round, action,
        targetNodeKey ?? null, opinion ?? null, signImage ?? null, user.id,
        data ? JSON.stringify(data) : null],
    );
  }

  async starterFor(inst: WfInstanceRow): Promise<StarterInfo> {
    const row = await this.db.one<Row>(
      'SELECT id, org_id, dept_id, employee_id FROM sys_user WHERE id = ?',
      [inst.starter_id],
    );
    if (!row) throw new BizError(ErrorCodes.WF_NO_ASSIGNEE, '流程发起人账号不存在');
    return {
      userId: Number(row.id),
      orgId: Number(row.org_id),
      deptId: row.dept_id === null ? null : Number(row.dept_id),
      employeeId: row.employee_id === null ? null : Number(row.employee_id),
    };
  }

  async notifyTaskUsers(instanceId: number, nodeKey?: string, round?: number): Promise<void> {
    const where = ['instance_id = ?', 'assignee_id > 0'];
    const params: unknown[] = [instanceId];
    if (nodeKey) { where.push('node_key = ?'); params.push(nodeKey); }
    if (round !== undefined) { where.push('round = ?'); params.push(round); }
    const rows = await this.db.q<{ assignee_id: number }>(
      `SELECT DISTINCT assignee_id FROM wf_task WHERE ${where.join(' AND ')}`,
      params,
    );
    for (const row of rows) {
      const id = Number(row.assignee_id);
      this.db.afterCommit(() => this.ws.emitToUser(id, 'todo.changed', {}));
    }
  }

  currentNodes(value: unknown): string[] {
    if (Array.isArray(value)) return value.map(String);
    if (typeof value !== 'string') return [];
    try {
      const parsed: unknown = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }

  private async joinState(instanceId: number): Promise<Record<string, string[]>> {
    const row = await this.db.one<{ value: unknown }>(
      'SELECT value FROM wf_variable WHERE instance_id = ? AND `key` = \'__join\'',
      [instanceId],
    );
    const parsed = parseObject(row?.value);
    if (!parsed) return {};
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.map(String) : [],
    ]));
  }

  private async saveJoinState(
    inst: WfInstanceRow,
    value: Record<string, string[]>,
    userId: number,
  ) {
    await this.db.exec(
      `INSERT INTO wf_variable (id, org_id, creator_id, instance_id, \`key\`, value)
       VALUES (?, ?, ?, ?, '__join', ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value)`,
      [nextId(), inst.org_id, userId, inst.id, JSON.stringify(value)],
    );
  }

  private starterFromUser(user: AuthUser): StarterInfo {
    return {
      userId: user.id,
      orgId: user.orgId,
      deptId: user.deptId,
      employeeId: user.employeeId,
    };
  }

  private modelOf(value: unknown): WfModel {
    const model = parseObject(value) as unknown as WfModel | null;
    if (!model || !model.nodes || !model.flows || !model.startKey) {
      throw new BizError(ErrorCodes.WF_DEF_INVALID, '已发布流程定义的数据损坏');
    }
    return model;
  }
}
