import { Injectable } from '@nestjs/common';
import type { WfNode } from '@erp3d/shared';
import { ErrorCodes } from '@erp3d/shared';
import { BizError } from '../common/biz-error';
import { WsGateway } from '../core/ws/ws.gateway';
import { MessageService } from '../core/message/message.service';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';
import { nowStr } from '../bill-engine/meta/meta-util';
import { AssigneeResolver } from './assignee.resolver';
import type { StarterInfo, WfInstanceRow } from './wf.types';

@Injectable()
export class WfTaskFactory {
  constructor(
    private readonly db: DbService,
    private readonly resolver: AssigneeResolver,
    private readonly ws: WsGateway,
    private readonly messages: MessageService,
  ) {}

  async createNodeTasks(
    inst: WfInstanceRow,
    node: WfNode,
    starter: StarterInfo,
  ): Promise<{ created: number; skipped: boolean }> {
    if (!node.task) {
      throw new BizError(ErrorCodes.WF_DEF_INVALID, `审批节点“${node.name}”缺少处理人配置`);
    }

    const owners = await this.resolver.resolve(node.task, starter);
    if (owners.length === 0 && node.task.emptyPolicy === 'admin') {
      owners.push(...(await this.resolver.adminUserIds(starter.orgId)));
    }
    if (owners.length === 0) {
      if (node.task.emptyPolicy === 'skip') return { created: 0, skipped: true };
      throw new BizError(ErrorCodes.WF_NO_ASSIGNEE, `审批节点“${node.name}”没有可用处理人或管理员`);
    }

    const now = nowStr();
    const dueAt = node.task.timeoutHours && node.task.timeoutHours > 0
      ? nowStr(new Date(Date.now() + node.task.timeoutHours * 60 * 60 * 1000))
      : null;
    const notified = new Set<number>();
    let created = 0;

    for (let index = 0; index < owners.length; index += 1) {
      const ownerId = owners[index];
      const delegation = await this.resolver.resolveDelegate(ownerId, inst.form, now, true);
      const assigneeId = delegation?.delegateeId ?? ownerId;
      const taskId = nextId();
      const status = node.task.sequential && index > 0 ? 'WAITING' : 'PENDING';

      await this.db.exec(
        `INSERT INTO wf_task
          (id, org_id, creator_id, instance_id, node_key, owner_id, assignee_id,
           delegate_id, seq, round, status, due_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [taskId, inst.org_id, starter.userId, inst.id, node.key, ownerId, assigneeId,
          delegation?.delegateId ?? null, index + 1, inst.round, status, dueAt],
      );
      created += 1;
      notified.add(assigneeId);
      await this.messages.send({
        toUserId: assigneeId,
        fromUserId: starter.userId,
        title: '新增审批待办',
        content: `单据 ${inst.bill_no} 已进入“${node.name}”节点，请处理审批。`,
        type: 'WORKFLOW',
        level: 'INFO',
        objectCode: inst.form,
        billId: inst.bill_id,
        link: `/bills/${inst.form}/${inst.bill_id}`,
      });

      if (dueAt) {
        await this.db.exec(
          `INSERT INTO wf_node_timeout (id, org_id, creator_id, task_id, remind_at, reminded)
           VALUES (?, ?, ?, ?, ?, 0)
           ON DUPLICATE KEY UPDATE remind_at = VALUES(remind_at), reminded = 0, reminded_at = NULL`,
          [nextId(), inst.org_id, starter.userId, taskId, dueAt],
        );
      }
      if (delegation) {
        await this.log(inst, taskId, node.key, 'DELEGATE', starter.userId, {
          ownerId,
          delegateId: delegation.delegateId,
          delegateeId: assigneeId,
        });
      }
    }

    this.notify(notified);
    return { created, skipped: false };
  }

  async createCcTasks(inst: WfInstanceRow, node: WfNode, starter: StarterInfo): Promise<number> {
    if (!node.task?.cc?.length) return 0;
    const ccIds = await this.resolveCc(node.task.cc, starter);
    for (const userId of ccIds) {
      const taskId = nextId();
      await this.db.exec(
        `INSERT INTO wf_task
          (id, org_id, creator_id, instance_id, node_key, owner_id, assignee_id,
           delegate_id, seq, round, status, is_cc)
         VALUES (?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, 'CC', 1)`,
        [taskId, inst.org_id, starter.userId, inst.id, node.key, userId, userId, inst.round],
      );
      await this.log(inst, taskId, node.key, 'CC', starter.userId, { toUserId: userId });
      await this.messages.send({
        toUserId: userId,
        fromUserId: starter.userId,
        title: '流程抄送',
        content: `单据 ${inst.bill_no} 的“${node.name}”节点已完成，供你查阅。`,
        type: 'WORKFLOW',
        level: 'INFO',
        objectCode: inst.form,
        billId: inst.bill_id,
        link: `/bills/${inst.form}/${inst.bill_id}`,
      });
      this.notify(new Set([userId]));
    }
    return ccIds.length;
  }

  private async resolveCc(values: string[], starter: StarterInfo): Promise<number[]> {
    if (values.length === 0) return [];
    return this.resolver.resolve({
      assigneeType: 'user',
      assignees: values,
      multi: 'all',
      emptyPolicy: 'skip',
      allowTransfer: false,
      allowAddSign: false,
      allowReject: false,
      allowWithdraw: false,
    }, starter);
  }

  private async log(
    inst: WfInstanceRow,
    taskId: number,
    nodeKey: string,
    action: 'DELEGATE' | 'CC',
    userId: number,
    data: Record<string, unknown>,
  ) {
    await this.db.exec(
      `INSERT INTO wf_action_log
        (id, org_id, creator_id, instance_id, task_id, node_key, round, action, user_id, action_data_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nextId(), inst.org_id, userId, inst.id, taskId, nodeKey, inst.round, action, userId, JSON.stringify(data)],
    );
  }

  private notify(userIds: Set<number>) {
    for (const userId of userIds) {
      this.db.afterCommit(() => this.ws.emitToUser(userId, 'todo.changed', {}));
    }
  }
}
