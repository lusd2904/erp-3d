import { Module, OnModuleInit } from '@nestjs/common';
import { BillEngineRegistry } from '../bill-engine/bill-engine.registry';
import type { BillHooks } from '../bill-engine/engine.types';
import { NO_UNAUDIT_STATE_MACHINE, STOCK_BILL_METAS } from './metas/stock-bill.meta';
import { ScmController } from './scm.controller';
import { InventoryService } from './services/inventory.service';

@Module({
  controllers: [ScmController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class ScmModule implements OnModuleInit {
  constructor(private readonly registry: BillEngineRegistry, private readonly inventory: InventoryService) {}

  onModuleInit(): void {
    for (const meta of STOCK_BILL_METAS) {
      const hooks: BillHooks = {
        beforeAudit: (ctx) => this.inventory.validateAudit(ctx),
        afterAudit: (ctx) => this.inventory.applyAudit(ctx),
        afterUnaudit: (ctx) => this.inventory.reverseAudit(ctx),
      };
      this.registry.registerBill({
        meta,
        hooks,
        ...(meta.form === 'scm_count_gain' || meta.form === 'scm_count_loss' ? { stateMachine: NO_UNAUDIT_STATE_MACHINE } : {}),
      });
    }
  }
}
