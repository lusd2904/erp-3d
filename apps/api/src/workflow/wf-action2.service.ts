import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { BizError } from '../common/biz-error';
import type { AuthUser } from '../common/request-context';
import { WsGateway } from '../core/ws/ws.gateway';
import { MessageService } from '../core/message/message.service';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';
import { nowStr } from '../bill-engine/meta/meta-util';
import { AssigneeResolver } from './assignee.resolver';
import { WfEngine } from './wf-engine.service';
import { WfTaskFactory } from './wf-task.factory';
import type { AddSignInput, RejectInput, TransferInput, WfTaskRow } from './wf.types';

@Injectable()
export class WfAction2Service {
  constructor(
    private readonly db: DbService,
    private readonly engine: WfEngine,
    private readonly factory: WfTaskFactory,
    private readonly resolver: AssigneeResolver,
    private readonly ws: WsGateway,
    private readonly messages: MessageService,
  ) {}

  async reject(input: RejectInput, user: AuthUser): Promise<void> {
    await this.db.tx(async () => {
      const { inst, task } = await this.lockTask(input.taskId, user);
      const model = await this.engine.loadModel(inst);
      const node = model.nodes[task.node_key];
      if (!node?.task?.allowReject) {
        throw new BizError(ErrorCodes.WF_ACTION_NOT_ALLOWED, '当前审批节点不允许驳回');
      }
      await this.engine.logAction(inst, task.id, task.node_key, 'REJECT', user, input.opinion, input.targetNodeKey ?? null);

      if (!input.targetNodeKey) {
        await this.engine.endInstance(inst, 'REJECTED', user);
        return;
      }

      const target = model.nodes[input.targetNodeKey];
      if (!target || target.type !== 'userTask') {
        throw new BizError(ErrorCodes.WF_ACTION_NOT_ALLOWED, '驳回目标必须是流程中已走过的审批节点');
      }
      if (this.engine.currentNodes(inst.current_nodes_json).includes(input.targetNodeKey)) {
        throw new BizError(ErrorCodes.WF_ACTION_NOT_ALLOWED, '不能驳回到当前正在处理的节点');
      }
      const visited = await this.db.one<{ id: number }>(
        `SELECT id FROM wf_task
          WHERE instance_id = ? AND node_key = ? AND is_cc = 0 AND vote IS NOT NULL
          LIMIT 1`,
        [inst.id, input.targetNodeKey],
      );
      if (!visited) {
        throw new BizError(ErrorCodes.WF_ACTION_NOT_ALLOWED, '驳回目标尚未处理过');
      }

      await this.db.exec(
        `UPDATE wf_task SET status = 'CANCELED', done_at = ?
          WHERE instance_id = ? AND status IN ('PENDING', 'WAITING')`,
        [nowStr(), inst.id],
      );
      const nextRound = Number(inst.round) + 1;
      await this.db.exec(
        `UPDATE wf_instance SET round = ?, current_nodes_json = ? WHERE id = ?`,
        [nextRound, JSON.stringify([input.targetNodeKey]), inst.id],
      );
      inst.round = nextRound;
      inst.current_nodes_json = [input.targetNodeKey];
      await this.engine.resetJoinState(inst, user.id);
      const starter = await this.engine.starterFor(inst);
      const created = await this.factory.createNodeTasks(inst, target, starter);
      if (created.skipped) {
        inst.current_nodes_json = [];
        await this.db.exec('UPDATE wf_instance SET current_nodes_json = JSON_ARRAY() WHERE id = ?', [inst.id]);
        await this.engine.enterFlows(inst, model, target.outgoing, user);
      }
      this.notify(user.id);
    });
  }

  async withdraw(instanceId: number, user: AuthUser): Promise<void> {
    await this.db.tx(async () => {
      const inst = await this.engine.lockInstance(instanceId);
      if (inst.status !== 'RUNNING' || Number(inst.starter_id) !== user.id) {
        throw new BizError(ErrorCodes.WF_WITHDRAW_NOT_ALLOWED, '只有流程发起人可以撤回运行中的流程');
      }
      const hasVote = await this.db.one<{ id: number }>(
        `SELECT id FROM wf_task WHERE instance_id = ? AND vote IS NOT NULL LIMIT 1`, [inst.id],
      );
      if (hasVote) throw new BizError(ErrorCodes.WF_WITHDRAW_NOT_ALLOWED, '已有审批人处理，不能撤回');
      const model = await this.engine.loadModel(inst);
      const current = this.engine.currentNodes(inst.current_nodes_json);
      if (current.length === 0 || current.some((key) => !model.nodes[key]?.task?.allowWithdraw)) {
        throw new BizError(ErrorCodes.WF_WITHDRAW_NOT_ALLOWED, '当前审批节点不允许撤回');
      }
      await this.engine.logAction(inst, null, current[0] ?? null, 'WITHDRAW', user);
      await this.engine.endInstance(inst, 'WITHDRAWN', user);
    });
  }

  async terminate(instanceId: number, user: AuthUser, opinion?: string): Promise<void> {
    await this.db.tx(async () => {
      const inst = await this.engine.lockInstance(instanceId);
      if (!user.isSuper) throw new BizError(ErrorCodes.PERM_DENIED, '只有系统管理员可以终止流程');
      if (inst.status !== 'RUNNING') throw new BizError(ErrorCodes.WF_TASK_DONE, '流程已结束');
      await this.engine.logAction(inst, null, null, 'TERMINATE', user, opinion);
      await this.engine.endInstance(inst, 'TERMINATED', user);
    });
  }

  async transfer(input: TransferInput, user: AuthUser): Promise<void> {
    await this.db.tx(async () => {
      const { inst, task } = await this.lockTask(input.taskId, user);
      const node = (await this.engine.loadModel(inst)).nodes[task.node_key];
      if (!node?.task?.allowTransfer) {
        throw new BizError(ErrorCodes.WF_ACTION_NOT_ALLOWED, '当前审批节点不允许转交');
      }
      if (!Number.isSafeInteger(input.toUserId) || input.toUserId <= 0 || input.toUserId === user.id) {
        throw new BizError(ErrorCodes.SYS_VALIDATION, '转交对象无效');
      }
      const target = await this.db.one<{ id: number }>(
        `SELECT id FROM sys_user WHERE id = ? AND org_id = ? AND status = 'ENABLED'`,
        [input.toUserId, inst.org_id],
      );
      if (!target) throw new BizError(ErrorCodes.WF_NO_ASSIGNEE, '转交对象不存在或已停用');
      const delegation = await this.resolver.resolveDelegate(input.toUserId, inst.form, nowStr(), true);
      const assigneeId = delegation?.delegateeId ?? input.toUserId;
      const newTaskId = nextId();
      await this.db.exec(
        `UPDATE wf_task SET status = 'TRANSFERRED', done_at = ? WHERE id = ?`,
        [nowStr(), task.id],
      );
      await this.db.exec(
        `INSERT INTO wf_task
          (id, org_id, creator_id, instance_id, node_key, owner_id, assignee_id,
           delegate_id, seq, round, status, is_cc, due_at, add_sign_from)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', 0, ?, ?)`,
        [newTaskId, inst.org_id, user.id, inst.id, task.node_key, input.toUserId,
          assigneeId, delegation?.delegateId ?? null, task.seq, task.round, task.due_at,
          task.add_sign_from],
      );
      if (task.due_at) {
        await this.db.exec(
          `INSERT INTO wf_node_timeout (id, org_id, creator_id, task_id, remind_at, reminded)
           VALUES (?, ?, ?, ?, ?, 0)
           ON DUPLICATE KEY UPDATE remind_at = VALUES(remind_at), reminded = 0, reminded_at = NULL`,
          [nextId(), inst.org_id, user.id, newTaskId, task.due_at],
        );
      }
      await this.engine.logAction(inst, task.id, task.node_key, 'TRANSFER', user, input.opinion, null, undefined, {
        fromUserId: task.assignee_id,
        toUserId: input.toUserId,
        replacementTaskId: newTaskId,
      });
      if (delegation) {
        await this.engine.logAction(inst, newTaskId, task.node_key, 'DELEGATE', user, undefined, null, undefined, {
          ownerId: input.toUserId,
          delegateId: delegation.delegateId,
          delegateeId: assigneeId,
        });
      }
      await this.messages.send({
        toUserId: assigneeId,
        fromUserId: user.id,
        title: '审批待办已转交',
        content: `单据 ${inst.bill_no} 的“${node.name}”节点待办已转交给你。`,
        type: 'WORKFLOW',
        level: 'INFO',
        objectCode: inst.form,
        billId: inst.bill_id,
        link: `/bills/${inst.form}/${inst.bill_id}`,
      });
      this.notify(user.id, assigneeId);
    });
  }

  async addSign(input: AddSignInput, user: AuthUser): Promise<void> {
    await this.db.tx(async () => {
      const { inst, task } = await this.lockTask(input.taskId, user);
      const model = await this.engine.loadModel(inst);
      const node = model.nodes[task.node_key];
      if (!node?.task?.allowAddSign) {
        throw new BizError(ErrorCodes.WF_ACTION_NOT_ALLOWED, '当前审批节点不允许加签');
      }
      const userIds = [...new Set((input.userIds ?? []).map(Number))];
      if (userIds.length === 0 || userIds.some((id) => !Number.isSafeInteger(id) || id <= 0 || id === user.id)) {
        throw new BizError(ErrorCodes.SYS_VALIDATION, '加签人必须是有效的其他用户');
      }
      const marks = userIds.map(() => '?').join(', ');
      const valid = await this.db.q<{ id: number }>(
        `SELECT id FROM sys_user WHERE org_id = ? AND status = 'ENABLED' AND id IN (${marks})`,
        [inst.org_id, ...userIds],
      );
      if (valid.length !== userIds.length) throw new BizError(ErrorCodes.WF_NO_ASSIGNEE, '部分加签人不存在或已停用');

      await this.db.exec('UPDATE wf_task SET status = \'WAITING\' WHERE id = ?', [task.id]);
      const now = nowStr();
      const starter = await this.engine.starterFor(inst);
      for (let index = 0; index < userIds.length; index += 1) {
        const ownerId = userIds[index];
        const delegate = await this.resolver.resolveDelegate(ownerId, inst.form, now, true);
        const assigneeId = delegate?.delegateeId ?? ownerId;
        await this.db.exec(
          `INSERT INTO wf_task
            (id, org_id, creator_id, instance_id, node_key, owner_id, assignee_id,
             delegate_id, seq, round, status, due_at, add_sign_from)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [nextId(), inst.org_id, starter.userId, inst.id, task.node_key, ownerId,
            assigneeId, delegate?.delegateId ?? null, index + 1, task.round,
            node.task.sequential && index > 0 ? 'WAITING' : 'PENDING', task.due_at, task.id],
        );
        if (task.due_at) {
          await this.db.exec(
            `INSERT INTO wf_node_timeout (id, org_id, creator_id, task_id, remind_at, reminded)
             SELECT ?, ?, ?, id, ?, 0 FROM wf_task WHERE instance_id = ? AND add_sign_from = ? AND seq = ?
             ON DUPLICATE KEY UPDATE remind_at = VALUES(remind_at), reminded = 0, reminded_at = NULL`,
            [nextId(), inst.org_id, starter.userId, task.due_at, inst.id, task.id, index + 1],
          );
        }
        if (delegate) {
          await this.engine.logAction(inst, task.id, task.node_key, 'DELEGATE', user, undefined, null, undefined, {
            ownerId,
            delegateId: delegate.delegateId,
            delegateeId: assigneeId,
          });
        }
        await this.messages.send({
          toUserId: assigneeId,
          fromUserId: user.id,
          title: '收到审批加签',
          content: `单据 ${inst.bill_no} 的“${node.name}”节点需要你补充审批意见。`,
          type: 'WORKFLOW',
          level: 'INFO',
          objectCode: inst.form,
          billId: inst.bill_id,
          link: `/bills/${inst.form}/${inst.bill_id}`,
        });
        this.notify(user.id, assigneeId);
      }
      await this.engine.logAction(inst, task.id, task.node_key, 'ADD_SIGN', user, input.opinion, null, undefined, { userIds });
      this.notify(user.id, Number(task.assignee_id));
    });
  }

  private async lockTask(taskId: number, user: AuthUser) {
    const instanceId = await this.engine.instanceIdForTask(taskId);
    const inst = await this.engine.lockInstance(instanceId);
    if (inst.status !== 'RUNNING') throw new BizError(ErrorCodes.WF_TASK_DONE, '流程已结束，待办已失效');
    const task = await this.db.one<WfTaskRow>('SELECT * FROM wf_task WHERE id = ? FOR UPDATE', [taskId]);
    if (!task) throw new BizError(ErrorCodes.WF_TASK_NOT_FOUND, '审批任务不存在');
    if (task.status !== 'PENDING') throw new BizError(ErrorCodes.WF_TASK_DONE, '待办已处理或尚未轮到处理');
    if (Number(task.assignee_id) !== user.id) throw new BizError(ErrorCodes.WF_TASK_NOT_YOURS, '该审批待办不属于当前用户');
    if (task.is_cc) throw new BizError(ErrorCodes.WF_ACTION_NOT_ALLOWED, '抄送任务不能执行该操作');
    return { inst, task };
  }

  private notify(...userIds: number[]) {
    for (const userId of new Set(userIds)) {
      this.db.afterCommit(() => this.ws.emitToUser(userId, 'todo.changed', {}));
    }
  }
}
