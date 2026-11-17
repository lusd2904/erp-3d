import { Injectable, OnModuleInit } from '@nestjs/common';
import { SYSTEM_USER } from '../common/request-context';
import { JobScheduler } from '../common/job-scheduler.service';
import { DbService } from '../db/db.service';
import { MessageService } from '../core/message/message.service';
import { WsGateway } from '../core/ws/ws.gateway';
import { nowStr } from '../bill-engine/meta/meta-util';
import { WfEngine } from './wf-engine.service';
import type { WfTaskRow } from './wf.types';

@Injectable()
export class WfJobs implements OnModuleInit {
  constructor(
    private readonly db: DbService,
    private readonly scheduler: JobScheduler,
    private readonly engine: WfEngine,
    private readonly messages: MessageService,
    private readonly ws: WsGateway,
  ) {}

  async onModuleInit() {
    await this.scheduler.register({
      handler: 'workflow_timeout_reminder',
      name: '审批待办超时提醒',
      intervalSec: 300,
      fn: async () => `提醒 ${await this.remindTimeouts()} 条审批待办`,
    });
    await this.scheduler.register({
      handler: 'workflow_delegate_return',
      name: '审批代理到期归还',
      intervalSec: 600,
      fn: async () => `归还 ${await this.returnExpiredDelegations()} 条审批待办`,
    });
  }

  async remindTimeouts(now = nowStr()): Promise<number> {
    return this.db.tx(async () => {
      const candidates = await this.db.q<{ instance_id: number }>(
        `SELECT DISTINCT i.id AS instance_id
           FROM wf_node_timeout nt
           JOIN wf_task t ON t.id = nt.task_id AND t.status = 'PENDING'
           JOIN wf_instance i ON i.id = t.instance_id AND i.status = 'RUNNING'
          WHERE nt.reminded = 0 AND nt.remind_at <= ?
          ORDER BY i.id LIMIT 500`,
        [now],
      );
      let sent = 0;
      for (const candidate of candidates) {
        const inst = await this.engine.lockInstance(Number(candidate.instance_id));
        if (inst.status !== 'RUNNING') continue;
        const tasks = await this.db.q<WfTaskRow & { timeout_id: number }>(
          `SELECT t.*, nt.id AS timeout_id
             FROM wf_node_timeout nt
             JOIN wf_task t ON t.id = nt.task_id
            WHERE t.instance_id = ? AND t.status = 'PENDING'
              AND nt.reminded = 0 AND nt.remind_at <= ?
            ORDER BY t.id FOR UPDATE`,
          [inst.id, now],
        );
        for (const task of tasks) {
          await this.messages.send({
            toUserId: Number(task.assignee_id),
            fromUserId: SYSTEM_USER.id,
            title: '审批待办已超时',
            content: `单据 ${inst.bill_no} 的审批待办已达到处理时限，请尽快处理。`,
            type: 'WORKFLOW',
            level: 'WARN',
            objectCode: inst.form,
            billId: inst.bill_id,
            link: `/bills/${inst.form}/${inst.bill_id}`,
          });
          await this.db.exec(
            'UPDATE wf_node_timeout SET reminded = 1, reminded_at = ? WHERE id = ?',
            [now, task.timeout_id],
          );
          sent += 1;
        }
      }
      return sent;
    });
  }

  async returnExpiredDelegations(now = nowStr()): Promise<number> {
    return this.db.tx(async () => {
      const candidates = await this.db.q<{ instance_id: number }>(
        `SELECT DISTINCT i.id AS instance_id
           FROM wf_task t
           JOIN wf_delegate d ON d.id = t.delegate_id
           JOIN wf_instance i ON i.id = t.instance_id AND i.status = 'RUNNING'
          WHERE t.status IN ('PENDING', 'WAITING') AND d.eff_to < ?
          ORDER BY i.id LIMIT 500`,
        [now],
      );
      let returned = 0;
      for (const candidate of candidates) {
        const inst = await this.engine.lockInstance(Number(candidate.instance_id));
        if (inst.status !== 'RUNNING') continue;
        const tasks = await this.db.q<WfTaskRow>(
          `SELECT t.* FROM wf_task t
           JOIN wf_delegate d ON d.id = t.delegate_id
          WHERE t.instance_id = ? AND t.status IN ('PENDING', 'WAITING') AND d.eff_to < ?
          ORDER BY t.id FOR UPDATE`,
          [inst.id, now],
        );
        for (const task of tasks) {
          await this.db.exec(
            'UPDATE wf_task SET assignee_id = owner_id, delegate_id = NULL WHERE id = ?',
            [task.id],
          );
          await this.engine.logAction(inst, task.id, task.node_key, 'RETURN', SYSTEM_USER, '代理期限已结束', null, undefined, {
            ownerId: Number(task.owner_id),
            previousAssigneeId: Number(task.assignee_id),
          });
          await this.messages.send({
            toUserId: Number(task.owner_id),
            fromUserId: SYSTEM_USER.id,
            title: '代理已到期，审批待办已归还',
            content: `单据 ${inst.bill_no} 的审批待办已归还给你。`,
            type: 'WORKFLOW',
            level: 'INFO',
            objectCode: inst.form,
            billId: inst.bill_id,
            link: `/bills/${inst.form}/${inst.bill_id}`,
          });
          for (const userId of new Set([Number(task.owner_id), Number(task.assignee_id)])) {
            this.db.afterCommit(() => this.ws.emitToUser(userId, 'todo.changed', {}));
          }
          returned += 1;
        }
      }
      return returned;
    });
  }
}
