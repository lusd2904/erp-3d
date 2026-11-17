import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { BizError } from '../common/biz-error';
import type { AuthUser } from '../common/request-context';
import { MessageService } from '../core/message/message.service';
import { WsGateway } from '../core/ws/ws.gateway';
import { BillEngineRegistry } from '../bill-engine/bill-engine.registry';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';
import { nowStr } from '../bill-engine/meta/meta-util';
import { WfEngine } from './wf-engine.service';

export interface WfDelegationInput {
  delegateeId: number;
  forms?: string[];
  effFrom: string;
  effTo: string;
}

@Injectable()
export class WfDelegationService {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
    private readonly engine: WfEngine,
    private readonly messages: MessageService,
    private readonly ws: WsGateway,
  ) {}

  async list(user: AuthUser): Promise<Record<string, unknown>[]> {
    return this.db.q(
      `SELECT id, delegatee_id, form_scope, eff_from, eff_to, enabled, created_at
         FROM wf_delegate WHERE org_id = ? AND delegator_id = ?
        ORDER BY enabled DESC, eff_from DESC, id DESC`,
      [user.orgId, user.id],
    );
  }

  async create(input: WfDelegationInput, user: AuthUser): Promise<{ id: number }> {
    if (!input || !Number.isSafeInteger(input.delegateeId) || input.delegateeId <= 0 || input.delegateeId === user.id) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '代理人必须是有效的其他用户');
    }
    if (input.forms !== undefined && (!Array.isArray(input.forms) || input.forms.some((form) => typeof form !== 'string'))) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '适用单据类型必须是字符串列表');
    }
    const from = Date.parse(input.effFrom);
    const to = Date.parse(input.effTo);
    if (!input.effFrom || !input.effTo || !Number.isFinite(from) || !Number.isFinite(to) || from > to) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '代理生效时间范围无效');
    }
    const delegatee = await this.db.one<{ id: number }>(
      `SELECT id FROM sys_user WHERE id = ? AND org_id = ? AND status = 'ENABLED'`,
      [input.delegateeId, user.orgId],
    );
    if (!delegatee) throw new BizError(ErrorCodes.WF_NO_ASSIGNEE, '代理人不存在、已停用或不属于本组织');

    const forms = [...new Set((input.forms ?? []).map((form) => form.trim()).filter(Boolean))];
    for (const form of forms) this.registry.get(form);
    const id = nextId();
    await this.db.exec(
      `INSERT INTO wf_delegate
        (id, org_id, creator_id, delegator_id, delegatee_id, form_scope, eff_from, eff_to, enabled)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [id, user.orgId, user.id, user.id, input.delegateeId, forms.length ? forms.join(',') : null, input.effFrom, input.effTo],
    );
    return { id };
  }

  async revoke(id: number, user: AuthUser): Promise<{ ok: true; returned: number }> {
    return this.db.tx(async () => {
      const delegation = await this.db.one<{ id: number; delegatee_id: number; enabled: number }>(
        `SELECT id, delegatee_id, enabled FROM wf_delegate
          WHERE id = ? AND org_id = ? AND delegator_id = ?`,
        [id, user.orgId, user.id],
      );
      if (!delegation) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '代理授权不存在');

      const candidates = await this.db.q<{ instance_id: number }>(
        `SELECT DISTINCT t.instance_id FROM wf_task t
          JOIN wf_instance i ON i.id = t.instance_id AND i.status = 'RUNNING'
         WHERE t.delegate_id = ? AND t.status IN ('PENDING', 'WAITING')
         ORDER BY t.instance_id`,
        [id],
      );
      for (const candidate of candidates) await this.engine.lockInstance(Number(candidate.instance_id));
      await this.db.exec('UPDATE wf_delegate SET enabled = 0, modifier_id = ?, modified_at = NOW(3) WHERE id = ?', [user.id, id]);

      const live = await this.db.q<{ instance_id: number }>(
        `SELECT DISTINCT t.instance_id FROM wf_task t
          JOIN wf_instance i ON i.id = t.instance_id AND i.status = 'RUNNING'
         WHERE t.delegate_id = ? AND t.status IN ('PENDING', 'WAITING')
         ORDER BY t.instance_id`,
        [id],
      );
      let returned = 0;
      for (const row of live) {
        const inst = await this.engine.lockInstance(Number(row.instance_id));
        const tasks = await this.db.q<any>(
          `SELECT * FROM wf_task
            WHERE instance_id = ? AND delegate_id = ? AND status IN ('PENDING', 'WAITING')
            ORDER BY id FOR UPDATE`,
          [inst.id, id],
        );
        for (const task of tasks) {
          await this.db.exec(
            'UPDATE wf_task SET assignee_id = owner_id, delegate_id = NULL WHERE id = ?', [task.id],
          );
          await this.engine.logAction(inst, Number(task.id), String(task.node_key), 'RETURN', user, '代理授权已撤回', null, undefined, {
            ownerId: Number(task.owner_id),
            previousAssigneeId: Number(task.assignee_id),
          });
          await this.messages.send({
            toUserId: Number(task.owner_id),
            fromUserId: user.id,
            title: '代理已撤回，审批待办已归还',
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
      return { ok: true as const, returned };
    });
  }
}
