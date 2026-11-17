import { Module, OnModuleInit } from '@nestjs/common';
import { BillEngineRegistry } from '../bill-engine/bill-engine.registry';
import type { BillHookContext, BillHooks, Row } from '../bill-engine/engine.types';
import { STD_STATE_MACHINE } from '../bill-engine/state/std-state-machine';
import { BizError } from '../common/biz-error';
import { ScmModule } from '../scm/scm.module';
import { InventoryService } from '../scm/services/inventory.service';
import { QM_BILL_METAS } from './metas/quality.meta';
import { QualityController } from './quality.controller';
import { QualityService } from './quality.service';

const DECISION_STOCK_STATUS: Record<string, 'AVAILABLE' | 'RETURN_FROZEN' | 'SCRAP' | 'NG' | 'PENDING' | null> = {
  ACCEPT: 'AVAILABLE',
  CONCESSION: 'AVAILABLE',
  RETURN: 'RETURN_FROZEN',
  SCRAP: 'SCRAP',
  NG: 'NG',
  REWORK: 'PENDING',
  REPAIR: 'PENDING',
  HOLD: null,
};

export const QM_INSPECT_STATE_MACHINE = {
  ...STD_STATE_MACHINE,
  code: 'QM_INSPECT',
  name: '检验单状态机',
  rowStatus: {
    entity: 'entry' as const,
    field: 'qc_status',
    initial: 'PLANNED',
    states: [
      { code: 'PLANNED', name: '计划' },
      { code: 'STARTED', name: '质检开始' },
      { code: 'COMPLETED', name: '质检完成' },
    ],
    transitions: [
      { op: 'start_inspect', name: '开始检验', from: ['PLANNED'], to: 'STARTED', direction: 'forward' as const },
      { op: 'finish_inspect', name: '质检完成', from: ['STARTED'], to: 'COMPLETED', direction: 'forward' as const },
      { op: 'unfinish_inspect', name: '撤销质检完成', from: ['COMPLETED'], to: 'PLANNED', direction: 'backward' as const },
    ],
  },
};

@Module({
  imports: [ScmModule],
  controllers: [QualityController],
  providers: [QualityService],
  exports: [QualityService],
})
export class QmModule implements OnModuleInit {
  constructor(private readonly registry: BillEngineRegistry, private readonly inventory: InventoryService) {}

  onModuleInit(): void {
    for (const meta of QM_BILL_METAS) {
      const hooks: BillHooks = {};
      if (meta.form === 'qm_stock_req') {
        hooks.beforeAudit = (ctx) => this.validateStockRequest(ctx);
        hooks.afterAudit = (ctx) => this.freezeStockRequest(ctx);
        hooks.afterUnaudit = (ctx) => this.unfreezeStockRequest(ctx);
      }
      if (meta.form === 'qm_inspect') {
        hooks.beforeAudit = (ctx) => this.validateInspection(ctx);
        hooks.afterAudit = (ctx) => this.applyInspectionDecision(ctx);
        hooks.afterUnaudit = (ctx) => this.undoInspectionDecision(ctx);
      }
      if (meta.form === 'qm_defect_handle') {
        hooks.beforeAudit = (ctx) => this.validateDefectHandle(ctx);
        hooks.afterAudit = (ctx) => this.completeDefectHandle(ctx);
        hooks.afterUnaudit = (ctx) => this.undoDefectHandle(ctx);
      }
      this.registry.registerBill({
        meta,
        hooks,
        ...(meta.form === 'qm_inspect' ? { stateMachine: QM_INSPECT_STATE_MACHINE } : {}),
      });
    }
  }

  private async validateStockRequest(ctx: BillHookContext): Promise<void> {
    for (const entry of ctx.entries) {
      if (!Number(entry.material_id) || !Number(entry.stock_status_id) || !Number(entry.warehouse_id)) {
        throw new BizError('BIZ_QM_STOCK_REQ_INVALID', `第 ${entry.line_no} 行缺少物料、库存状态或仓库`);
      }
      if (Number(entry.base_qty ?? entry.qty) <= 0) throw new BizError('BIZ_QM_STOCK_REQ_INVALID', `第 ${entry.line_no} 行请检数量必须大于零`);
    }
    await this.inventory.resolveStockStatus('FROZEN');
  }

  private async freezeStockRequest(ctx: BillHookContext): Promise<void> {
    const frozenId = await this.inventory.resolveStockStatus('FROZEN');
    const groups = ctx.entries.map((entry) => ({
      from: entry,
      toStatusId: frozenId,
      qty: entry.base_qty ?? entry.qty,
      sourceEntryId: Number(entry.id),
    }));
    const convertBillId = await this.inventory.createStatusConversion(ctx.user.orgId, groups, `库存请检冻结：${ctx.header.bill_no}`);
    if (!convertBillId) return;
    await ctx.db.exec('UPDATE qm_stock_req SET convert_bill_id = ? WHERE id = ?', [convertBillId, ctx.billId]);
    const converted = await ctx.db.q<{ id: number; group_no: string }>('SELECT id, group_no FROM scm_status_convert_entry WHERE bill_id = ?', [convertBillId]);
    for (const row of converted) {
      await ctx.db.exec('UPDATE qm_stock_req_entry SET frozen = 1, frozen_convert_entry_id = ? WHERE id = ?', [row.id, Number(row.group_no)]);
    }
  }

  private async unfreezeStockRequest(ctx: BillHookContext): Promise<void> {
    await this.inventory.reverseStatusConversion(Number(ctx.header.convert_bill_id));
    await ctx.db.exec('UPDATE qm_stock_req SET convert_bill_id = NULL WHERE id = ?', [ctx.billId]);
    await ctx.db.exec('UPDATE qm_stock_req_entry SET frozen = 0, frozen_convert_entry_id = NULL WHERE bill_id = ?', [ctx.billId]);
  }

  private async validateInspection(ctx: BillHookContext): Promise<void> {
    for (const entry of ctx.entries) {
      const decisions = (entry.decisions ?? []) as Row[];
      if (!decisions.length) continue;
      const decided = decisions.reduce((sum, row) => sum + Number(row.base_qty ?? row.qty ?? 0), 0);
      if (decided > Number(entry.base_qty ?? entry.inspect_qty ?? entry.qty)) {
        throw new BizError('BIZ_QM_DECISION_OVER_INSPECT', `第 ${entry.line_no} 行决策数量不能超过检验数量`);
      }
      if (ctx.header.biz_type === 'STOCK' || ctx.header.biz_type === 'OQC_SHIP') {
        for (const decision of decisions) {
          const stockStatus = DECISION_STOCK_STATUS[String(decision.decision)];
          if (stockStatus) await this.inventory.resolveStockStatus(stockStatus);
        }
      }
    }
  }

  private async applyInspectionDecision(ctx: BillHookContext): Promise<void> {
    if (!['STOCK', 'OQC_SHIP'].includes(String(ctx.header.biz_type))) return;
    const groups: { from: Row; toStatusId: number; qty: string | number; sourceEntryId: number }[] = [];
    for (const entry of ctx.entries) {
      if (!Number(entry.stock_status_id) || !Number(entry.warehouse_id)) continue;
      for (const decision of (entry.decisions ?? []) as Row[]) {
        const target = DECISION_STOCK_STATUS[String(decision.decision)];
        if (!target) continue;
        groups.push({
          from: entry,
          toStatusId: await this.inventory.resolveStockStatus(target),
          qty: decision.base_qty ?? decision.qty,
          sourceEntryId: Number(decision.id ?? entry.id),
        });
      }
    }
    if (!groups.length) return;
    const convertBillId = await this.inventory.createStatusConversion(ctx.user.orgId, groups, `检验结果转换：${ctx.header.bill_no}`);
    if (convertBillId) await ctx.db.exec('UPDATE qm_inspect SET convert_bill_id = ? WHERE id = ?', [convertBillId, ctx.billId]);
  }

  private async undoInspectionDecision(ctx: BillHookContext): Promise<void> {
    await this.inventory.reverseStatusConversion(Number(ctx.header.convert_bill_id));
    await ctx.db.exec('UPDATE qm_inspect SET convert_bill_id = NULL WHERE id = ?', [ctx.billId]);
  }

  private async validateDefectHandle(ctx: BillHookContext): Promise<void> {
    if (Number(ctx.header.auto_convert_stock) !== 1) return;
    for (const entry of ctx.entries) {
      if (!Number(entry.src_inspect_entry_id) || Number(entry.base_qty ?? entry.qty) <= 0) {
        throw new BizError('BIZ_QM_DEFECT_HANDLE_INVALID', `第 ${entry.line_no} 行来源检验分录或处理数量无效`);
      }
    }
  }

  private async completeDefectHandle(ctx: BillHookContext): Promise<void> {
    await ctx.db.exec("UPDATE qm_defect_handle SET handle_status = 'COMPLETED' WHERE id = ?", [ctx.billId]);
    await ctx.db.exec("UPDATE qm_defect_handle_entry SET handle_status = 'COMPLETED' WHERE bill_id = ?", [ctx.billId]);
    if (Number(ctx.header.auto_convert_stock) !== 1) return;
    const groups: { from: Row; toStatusId: number; qty: string | number; sourceEntryId: number }[] = [];
    for (const entry of ctx.entries) {
      const source = await ctx.db.one<any>('SELECT * FROM qm_inspect_entry WHERE id = ? FOR UPDATE', [entry.src_inspect_entry_id]);
      if (!source?.warehouse_id || !source?.stock_status_id) continue;
      const target = DECISION_STOCK_STATUS[String(entry.handle)];
      if (!target) continue;
      groups.push({
        from: source,
        toStatusId: await this.inventory.resolveStockStatus(target),
        qty: entry.base_qty ?? entry.qty,
        sourceEntryId: Number(entry.id),
      });
    }
    const convertBillId = await this.inventory.createStatusConversion(ctx.user.orgId, groups, `不良品处理状态转换：${ctx.header.bill_no}`);
    if (convertBillId) await ctx.db.exec('UPDATE qm_defect_handle SET convert_bill_id = ? WHERE id = ?', [convertBillId, ctx.billId]);
  }

  private async undoDefectHandle(ctx: BillHookContext): Promise<void> {
    await this.inventory.reverseStatusConversion(Number(ctx.header.convert_bill_id));
    await ctx.db.exec("UPDATE qm_defect_handle SET handle_status = 'IN_PROGRESS', convert_bill_id = NULL WHERE id = ?", [ctx.billId]);
    await ctx.db.exec("UPDATE qm_defect_handle_entry SET handle_status = 'IN_PROGRESS' WHERE bill_id = ?", [ctx.billId]);
  }
}
