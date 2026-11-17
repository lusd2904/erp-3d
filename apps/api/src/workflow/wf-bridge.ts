import { Injectable, OnModuleInit } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { BizError } from '../common/biz-error';
import { currentUser } from '../common/request-context';
import type { AuthUser } from '../common/request-context';
import { BillEngineRegistry } from '../bill-engine/bill-engine.registry';
import type { BillHookContext, WorkflowBillOperations, WorkflowBridge } from '../bill-engine/engine.types';
import { DbService } from '../db/db.service';
import { WfEngine } from './wf-engine.service';

@Injectable()
export class WfBridge implements WorkflowBridge, OnModuleInit {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
    private readonly engine: WfEngine,
  ) {}

  onModuleInit() {
    this.registry.setWorkflowBridge(this);
  }

  onSubmit(ctx: BillHookContext, _bills: WorkflowBillOperations): Promise<'started' | 'none'> {
    return this.engine.start(ctx);
  }

  async onUnsubmit(ctx: BillHookContext): Promise<void> {
    const instanceId = await this.db.one<{ id: number }>(
      `SELECT id FROM wf_instance
        WHERE org_id = ? AND form = ? AND bill_id = ? AND status = 'RUNNING'
        ORDER BY started_at DESC, id DESC LIMIT 1`,
      [ctx.user.orgId, ctx.form, ctx.billId],
    );
    if (!instanceId) return;
    const inst = await this.engine.lockInstance(Number(instanceId.id));
    if (Number(inst.starter_id) !== ctx.user.id) {
      throw new BizError(ErrorCodes.WF_WITHDRAW_NOT_ALLOWED, '只有流程发起人可以撤回');
    }
    const vote = await this.db.one<{ id: number }>(
      'SELECT id FROM wf_task WHERE instance_id = ? AND vote IS NOT NULL LIMIT 1', [inst.id],
    );
    if (vote) throw new BizError(ErrorCodes.WF_WITHDRAW_NOT_ALLOWED, '已有审批人处理，不能撤回');
    const model = await this.engine.loadModel(inst);
    const current = this.engine.currentNodes(inst.current_nodes_json);
    if (current.length === 0 || current.some((key) => !model.nodes[key]?.task?.allowWithdraw)) {
      throw new BizError(ErrorCodes.WF_WITHDRAW_NOT_ALLOWED, '当前审批节点不允许撤回');
    }
    const user = currentUser() ?? ctx.user;
    await this.engine.logAction(inst, null, current[0] ?? null, 'WITHDRAW', user);
    // L1 has already changed the bill to REAUDIT in this transaction.
    await this.engine.endInstance(inst, 'WITHDRAWN', user, false);
  }
}
