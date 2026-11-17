import { Module, OnApplicationBootstrap, OnModuleInit } from '@nestjs/common';
import { BillEngineRegistry } from '../bill-engine/bill-engine.registry';
import type { BillHooks } from '../bill-engine/engine.types';
import { JobScheduler } from '../common/job-scheduler.service';
import { NO_UNAUDIT_STATE_MACHINE, STOCK_BILL_METAS } from './metas/stock-bill.meta';
import { ScmController } from './scm.controller';
import { InventoryService } from './services/inventory.service';

@Module({
  controllers: [ScmController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class ScmModule implements OnModuleInit, OnApplicationBootstrap {
  constructor(
    private readonly registry: BillEngineRegistry,
    private readonly inventory: InventoryService,
    private readonly scheduler: JobScheduler,
  ) {}

  onModuleInit(): void {
    for (const meta of STOCK_BILL_METAS) {
      const hooks: BillHooks = {
        beforeAudit: (ctx) => this.inventory.validateAudit(ctx),
        afterAudit: (ctx) => this.inventory.applyAudit(ctx),
        afterUnaudit: (ctx) => this.inventory.reverseAudit(ctx),
      };
      if (meta.form === 'bc_split') {
        hooks.beforeAudit = (ctx) => this.inventory.validateBarcodeSplit(ctx);
        hooks.afterAudit = (ctx) => this.inventory.applyBarcodeSplit(ctx);
        hooks.afterUnaudit = (ctx) => this.inventory.reverseBarcodeSplit(ctx);
      }
      if (meta.form === 'bc_msl_record') {
        hooks.beforeAudit = (ctx) => this.inventory.validateMslRecord(ctx);
        hooks.afterAudit = (ctx) => this.inventory.applyMslRecord(ctx);
        hooks.afterUnaudit = (ctx) => this.inventory.reverseMslRecord(ctx);
      }
      this.registry.registerBill({
        meta,
        hooks,
        ...(meta.form === 'scm_count_gain' || meta.form === 'scm_count_loss' ? { stateMachine: NO_UNAUDIT_STATE_MACHINE } : {}),
      });
    }
  }

  async onApplicationBootstrap(): Promise<void> {
    await this.scheduler.register({
      handler: 'scm_msl_timeout_v1',
      name: '卷盘 MSL 超时冻结',
      intervalSec: 300,
      fn: () => this.inventory.runMslTimeoutCheck(),
    });
  }
}
