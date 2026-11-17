import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import Decimal from 'decimal.js';
import { BizError } from '../../common/biz-error';
import { currentUser, SYSTEM_USER } from '../../common/request-context';
import type { BillHookContext, Row } from '../../bill-engine/engine.types';
import { BillOpService } from '../../bill-engine/service/bill-op.service';
import { DbService } from '../../db/db.service';
import { nowStr } from '../../bill-engine/meta/meta-util';
import { nextId } from '../../db/snowflake';

const ZERO_DATE = '1970-01-01';
const DIMENSION_FIELDS = [
  'org_id', 'material_id', 'aux_prop_id', 'lot_no', 'prod_date', 'exp_date', 'bom_id', 'mto_no',
  'stock_status_id', 'owner_type', 'owner_id', 'keeper_type', 'keeper_id', 'warehouse_id', 'location_id',
] as const;

export interface InventoryDimension {
  org_id: number;
  material_id: number;
  aux_prop_id: number;
  lot_no: string;
  prod_date: string;
  exp_date: string;
  bom_id: number;
  mto_no: string;
  stock_status_id: number;
  owner_type: string;
  owner_id: number;
  keeper_type: string;
  keeper_id: number;
  warehouse_id: number;
  location_id: number;
}

export interface InventoryMovement {
  entry_id: number;
  direction: 'IN' | 'OUT';
  base_qty: string;
  dimension: InventoryDimension;
}

interface LockedInventory {
  id: number;
  dim_hash: string;
  qty: string;
  base_qty: string;
  lock_qty: string;
  version: number;
}

function intOrZero(value: unknown): number {
  return value === null || value === undefined || value === '' ? 0 : Number(value);
}

function dateOrDefault(value: unknown): string {
  if (!value) return ZERO_DATE;
  return String(value).slice(0, 10);
}

export function inventoryDimension(orgId: number, row: Row): InventoryDimension {
  return {
    org_id: intOrZero(orgId),
    material_id: intOrZero(row.material_id),
    aux_prop_id: intOrZero(row.aux_prop_id),
    lot_no: String(row.lot_no ?? ''),
    prod_date: dateOrDefault(row.prod_date),
    exp_date: dateOrDefault(row.exp_date),
    bom_id: intOrZero(row.bom_id),
    mto_no: String(row.mto_no ?? ''),
    stock_status_id: intOrZero(row.stock_status_id),
    owner_type: String(row.owner_type ?? ''),
    owner_id: intOrZero(row.owner_id),
    keeper_type: String(row.keeper_type ?? ''),
    keeper_id: intOrZero(row.keeper_id),
    warehouse_id: intOrZero(row.warehouse_id ?? row.wh_id),
    location_id: intOrZero(row.location_id ?? row.loc_id),
  };
}

export function inventoryDimensionHash(dimension: InventoryDimension): string {
  const canonical = DIMENSION_FIELDS.map((key) => `${key}:${String(dimension[key])}`).join('|');
  return createHash('sha256').update(canonical).digest('hex');
}

function qtyOf(row: Row): Decimal {
  const value = row.base_qty ?? row.qty;
  const qty = new Decimal(value ?? 0);
  if (!qty.isFinite() || qty.lte(0)) throw new BizError('BIZ_INV_QTY_INVALID', '库存数量必须大于零');
  return qty;
}

export function buildInventoryMovements(form: string, orgId: number, header: Row, entries: Row[]): InventoryMovement[] {
  const movements: InventoryMovement[] = [];
  if (form === 'scm_status_convert' || form === 'scm_lot_adjust') {
    const groups = new Map<string, { before: Row[]; after: Row[] }>();
    for (const row of entries) {
      const groupNo = String(row.group_no ?? '');
      if (!groupNo || !['BEFORE', 'AFTER'].includes(String(row.convert_type))) {
        throw new BizError('BIZ_INV_CONVERSION_INVALID', '转换单每行必须有转换分组和 BEFORE/AFTER 类型');
      }
      const group = groups.get(groupNo) ?? { before: [], after: [] };
      (row.convert_type === 'BEFORE' ? group.before : group.after).push(row);
      groups.set(groupNo, group);
    }
    for (const [groupNo, group] of groups) {
      const beforeQty = Decimal.sum(...group.before.map((row) => qtyOf(row)));
      const afterQty = Decimal.sum(...group.after.map((row) => qtyOf(row)));
      if (!group.before.length || !group.after.length || !beforeQty.eq(afterQty)) {
        throw new BizError('BIZ_INV_CONVERSION_QTY_MISMATCH', `转换分组 ${groupNo} 的转换前后基本数量必须相等`);
      }
      for (const row of group.before) movements.push({ entry_id: Number(row.id), direction: 'OUT', base_qty: qtyOf(row).toFixed(), dimension: inventoryDimension(orgId, row) });
      for (const row of group.after) movements.push({ entry_id: Number(row.id), direction: 'IN', base_qty: qtyOf(row).toFixed(), dimension: inventoryDimension(orgId, row) });
    }
    return movements;
  }

  for (const row of entries) {
    const qty = qtyOf(row).toFixed();
    const entryId = Number(row.id);
    if (!Number.isSafeInteger(entryId) || entryId <= 0 || !Number(row.material_id)) {
      throw new BizError('BIZ_INV_ENTRY_INVALID', '库存分录缺少有效分录编号或物料');
    }
    const dimension = inventoryDimension(orgId, row);
    if (form === 'scm_other_out' || form === 'scm_count_loss') {
      movements.push({ entry_id: entryId, direction: 'OUT', base_qty: qty, dimension });
    } else if (form === 'scm_transfer') {
      const out = { ...dimension, warehouse_id: intOrZero(row.out_warehouse_id ?? header.out_warehouse_id), location_id: intOrZero(row.out_location_id), owner_id: intOrZero(row.out_owner_id ?? dimension.owner_id) };
      const into = { ...dimension, warehouse_id: intOrZero(row.in_warehouse_id ?? header.in_warehouse_id), location_id: intOrZero(row.in_location_id), owner_id: intOrZero(row.in_owner_id ?? dimension.owner_id) };
      if (!out.warehouse_id || !into.warehouse_id) throw new BizError('BIZ_INV_TRANSFER_INVALID', '调拨单必须指定调出仓库和调入仓库');
      movements.push({ entry_id: entryId, direction: 'OUT', base_qty: qty, dimension: out });
      movements.push({ entry_id: entryId, direction: 'IN', base_qty: qty, dimension: into });
    } else if (form === 'scm_init_stock' || form === 'scm_other_in' || form === 'scm_count_gain') {
      movements.push({ entry_id: entryId, direction: 'IN', base_qty: qty, dimension });
    } else {
      throw new BizError('BIZ_INV_FORM_UNSUPPORTED', `库存服务不支持单据 ${form}`);
    }
  }
  return movements;
}

@Injectable()
export class InventoryService {
  constructor(private readonly db: DbService, private readonly billOp: BillOpService) {}

  async validateAudit(ctx: BillHookContext): Promise<void> {
    if (ctx.form === 'scm_status_convert' || ctx.form === 'scm_lot_adjust') {
      buildInventoryMovements(ctx.form, ctx.user.orgId, ctx.header, ctx.entries);
      return;
    }
    for (const entry of ctx.entries) {
      qtyOf(entry);
      if (!Number(entry.material_id)) throw new BizError('BIZ_INV_ENTRY_INVALID', `第 ${entry.line_no} 行缺少物料`);
    }
  }

  async applyAudit(ctx: BillHookContext): Promise<void> {
    if (!this.db.inTx) throw new BizError('BIZ_INV_TX_REQUIRED', '库存审核必须加入单据引擎事务');
    const movements = buildInventoryMovements(ctx.form, ctx.user.orgId, ctx.header, ctx.entries);
    const auditBatch = await this.openAuditBatch(ctx.form, ctx.billId, ctx.user.orgId);
    await this.applyMovements(ctx, auditBatch, movements, false);
    await this.db.exec("UPDATE scm_inv_batch SET status = 'APPLIED' WHERE form = ? AND bill_id = ? AND audit_batch = ?", [ctx.form, ctx.billId, auditBatch]);
  }

  async reverseAudit(ctx: BillHookContext): Promise<void> {
    if (!this.db.inTx) throw new BizError('BIZ_INV_TX_REQUIRED', '库存反审核必须加入单据引擎事务');
    const batch = await this.db.one<{ audit_batch: number }>(
      "SELECT audit_batch FROM scm_inv_batch WHERE form = ? AND bill_id = ? AND status = 'APPLIED' ORDER BY audit_batch DESC LIMIT 1 FOR UPDATE",
      [ctx.form, ctx.billId],
    );
    if (!batch) throw new BizError('BIZ_INV_BATCH_NOT_FOUND', '找不到可反审核的库存批次');
    const original = await this.db.q<any>(
      "SELECT * FROM scm_inv_txn WHERE form = ? AND bill_id = ? AND audit_batch = ? AND direction IN ('IN', 'OUT') ORDER BY id FOR UPDATE",
      [ctx.form, ctx.billId, batch.audit_batch],
    );
    if (!original.length) throw new BizError('BIZ_INV_BATCH_EMPTY', '库存审核批次没有流水，无法反审核');
    const movements = original.map((row) => ({
      entry_id: Number(row.entry_id),
      direction: row.direction === 'IN' ? 'OUT' as const : 'IN' as const,
      base_qty: String(row.base_qty),
      dimension: null,
      inventory_id: Number(row.inventory_id),
      reversal_of: Number(row.id),
      reversal_direction: row.direction === 'IN' ? 'REV_OUT' as const : 'REV_IN' as const,
    }));
    await this.applyMovements(ctx, batch.audit_batch, movements as any, true);
    await this.db.exec("UPDATE scm_inv_batch SET status = 'REVERSED', reversed_at = NOW(3), reversed_by = ? WHERE form = ? AND bill_id = ? AND audit_batch = ? AND status = 'APPLIED'", [ctx.user.id, ctx.form, ctx.billId, batch.audit_batch]);
  }

  async getInventory(dimension: InventoryDimension) {
    const hash = inventoryDimensionHash(dimension);
    return (await this.db.one<any>('SELECT * FROM scm_inventory WHERE dim_hash = ?', [hash])) ?? null;
  }

  async queryInventory(input: { orgId: number; materialId?: number; warehouseId?: number; stockStatusId?: number; lotNo?: string; page?: number; size?: number }) {
    const page = Math.max(1, Math.floor(Number(input.page ?? 1)));
    const size = Math.min(500, Math.max(1, Math.floor(Number(input.size ?? 50))));
    const where = ['org_id = ?'];
    const params: unknown[] = [input.orgId];
    const filters: [string, number | undefined][] = [
      ['material_id', input.materialId], ['warehouse_id', input.warehouseId], ['stock_status_id', input.stockStatusId],
    ];
    for (const [key, value] of filters) {
      if (value !== undefined) {
        if (!Number.isSafeInteger(value) || value <= 0) throw new BizError('BIZ_INV_QUERY_INVALID', `库存查询条件 ${key} 无效`);
        where.push(`${key} = ?`);
        params.push(value);
      }
    }
    if (input.lotNo) { where.push('lot_no = ?'); params.push(input.lotNo); }
    const filter = where.join(' AND ');
    const rows = await this.db.q<any>(
      `SELECT * FROM scm_inventory WHERE ${filter} ORDER BY material_id, lot_no, warehouse_id LIMIT ? OFFSET ?`,
      [...params, size, (page - 1) * size],
    );
    const total = await this.db.one<{ total: number }>(`SELECT COUNT(*) AS total FROM scm_inventory WHERE ${filter}`, params);
    return { rows, total: Number(total?.total ?? 0), page, size };
  }

  async scanBarcode(input: { barcode: string; form: string; billId: number; entryId?: number; device?: string }, userId: number, orgId: number) {
    if (!input.barcode?.trim()) throw new BizError('BIZ_BC_BARCODE_REQUIRED', '条码不能为空');
    const barcode = await this.db.one<any>('SELECT * FROM bc_barcode_master WHERE org_id = ? AND barcode = ?', [orgId, input.barcode.trim()]);
    if (!barcode) throw new BizError('BIZ_BC_BARCODE_NOT_FOUND', '条码不存在');
    if (barcode.msl_status === 'TIMEOUT_FROZEN') throw new BizError('BIZ_BC_MSL_FROZEN', '卷盘 MSL 已超时冻结，不能使用');
    if (!Number.isSafeInteger(input.billId) || input.billId <= 0 || !input.form || input.form.length > 50) {
      throw new BizError('BIZ_BC_SCAN_CONTEXT_INVALID', '扫描记录必须关联有效单据');
    }
    await this.db.tx(async () => {
      await this.db.exec(
        'INSERT INTO bc_scan_log (id, org_id, barcode, form, bill_id, entry_id, op, user_id, device, at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))',
        [nextId(), orgId, barcode.barcode, input.form, input.billId, input.entryId ?? null, 'SCAN', userId, input.device ?? null],
      );
    });
    return barcode;
  }

  async validateBarcodeSplit(ctx: BillHookContext): Promise<void> {
    const parent = await this.db.one<any>('SELECT * FROM bc_barcode_master WHERE org_id = ? AND barcode = ? FOR UPDATE', [ctx.user.orgId, ctx.header.parent_barcode]);
    if (!parent || parent.status !== 'IN' || parent.msl_status === 'TIMEOUT_FROZEN' || parent.msl_status === 'BAKING') {
      throw new BizError('BIZ_BC_SPLIT_PARENT_INVALID', '主条码不存在、已出库或当前 MSL 状态不可拆分');
    }
    const requested = Decimal.sum(...ctx.entries.map((entry) => new Decimal(entry.child_base_qty ?? entry.child_qty ?? 0)));
    const requestedQty = Decimal.sum(...ctx.entries.map((entry) => new Decimal(entry.child_qty ?? 0)));
    if (requested.lte(0) || requested.gt(parent.base_qty) || requestedQty.lte(0) || requestedQty.gt(parent.qty)) {
      throw new BizError('BIZ_BC_SPLIT_QTY_INVALID', '子条码数量之和必须大于零且不超过主条码数量');
    }
    for (const entry of ctx.entries) {
      const qty = new Decimal(entry.child_base_qty ?? entry.child_qty ?? 0);
      const unitQty = new Decimal(entry.child_qty ?? 0);
      if (!qty.isFinite() || qty.lte(0) || !unitQty.isFinite() || unitQty.lte(0)) {
        throw new BizError('BIZ_BC_SPLIT_QTY_INVALID', `第 ${entry.line_no} 行子条码数量无效`);
      }
    }
  }

  async applyBarcodeSplit(ctx: BillHookContext): Promise<void> {
    const parent = await this.db.one<any>('SELECT * FROM bc_barcode_master WHERE org_id = ? AND barcode = ? FOR UPDATE', [ctx.user.orgId, ctx.header.parent_barcode]);
    if (!parent || parent.status !== 'IN') throw new BizError('BIZ_BC_SPLIT_PARENT_INVALID', '主条码已不可用');
    const total = Decimal.sum(...ctx.entries.map((entry) => new Decimal(entry.child_base_qty ?? entry.child_qty ?? 0)));
    const totalQty = Decimal.sum(...ctx.entries.map((entry) => new Decimal(entry.child_qty ?? 0)));
    const parentQty = new Decimal(parent.qty).minus(totalQty);
    const parentBaseQty = new Decimal(parent.base_qty).minus(total);
    if (parentQty.lt(0) || parentBaseQty.lt(0)) throw new BizError('BIZ_BC_SPLIT_QTY_INVALID', '拆分数量超过主条码剩余数量');
    const updated = await this.db.exec(
      'UPDATE bc_barcode_master SET qty = ?, base_qty = ?, version = version + 1, modified_at = NOW(3) WHERE id = ? AND version = ? AND base_qty >= ?',
      [parentQty.toFixed(), parentBaseQty.toFixed(), parent.id, parent.version, total.toFixed()],
    );
    if (!updated.affectedRows) throw new BizError('BIZ_BC_SPLIT_CONFLICT', '主条码已被其他操作修改');

    for (const entry of ctx.entries) {
      const qty = new Decimal(entry.child_qty).toFixed();
      const baseQty = new Decimal(entry.child_base_qty).toFixed();
      const childBarcode = `${parent.barcode}-${ctx.billId}-${entry.line_no}`;
      await this.db.exec(
        `INSERT INTO bc_barcode_master (
          id, org_id, barcode, material_id, aux_prop_id, lot_no, prod_date, exp_date, warehouse_id, location_id,
          stock_status_id, owner_type, owner_id, qty, base_unit_id, base_qty, status, reel_id, mpn, date_code,
          msl_level, msl_status, opened_at, last_open_at, floor_life_h, exposed_min, bake_count, last_bake_at,
          parent_barcode, src_form, src_bill_id, src_entry_id, version, created_at, modified_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'bc_split', ?, ?, 0, NOW(3), NOW(3))`,
        [
          nextId(), parent.org_id, childBarcode, parent.material_id, parent.aux_prop_id, parent.lot_no, parent.prod_date, parent.exp_date,
          parent.warehouse_id, parent.location_id, parent.stock_status_id, parent.owner_type, parent.owner_id, qty, parent.base_unit_id,
          baseQty, parent.reel_id, parent.mpn, parent.date_code, parent.msl_level, parent.msl_status, parent.opened_at, parent.last_open_at,
          parent.floor_life_h, parent.exposed_min, parent.bake_count, parent.last_bake_at, parent.barcode, ctx.billId, entry.id,
        ],
      );
      await this.db.exec('UPDATE bc_split_entry SET child_barcode = ? WHERE id = ?', [childBarcode, entry.id]);
    }
  }

  async reverseBarcodeSplit(ctx: BillHookContext): Promise<void> {
    const parent = await this.db.one<any>('SELECT * FROM bc_barcode_master WHERE org_id = ? AND barcode = ? FOR UPDATE', [ctx.user.orgId, ctx.header.parent_barcode]);
    if (!parent) throw new BizError('BIZ_BC_SPLIT_PARENT_INVALID', '主条码不存在');
    const children = await this.db.q<any>(
      `SELECT e.child_barcode, e.child_qty, e.child_base_qty, b.id, b.status, b.qty, b.base_qty, b.version,
              (SELECT COUNT(*) FROM bc_scan_log s WHERE s.org_id = b.org_id AND s.barcode = b.barcode) AS scan_count
         FROM bc_split_entry e JOIN bc_barcode_master b ON b.org_id = ? AND b.barcode = e.child_barcode
        WHERE e.bill_id = ? ORDER BY b.id FOR UPDATE`,
      [ctx.user.orgId, ctx.billId],
    );
    const total = Decimal.sum(...children.map((child) => new Decimal(child.child_base_qty)));
    const totalQty = Decimal.sum(...children.map((child) => new Decimal(child.child_qty)));
    for (const child of children) {
      if (Number(child.scan_count) > 0 || !new Decimal(child.qty).eq(child.child_qty) || !new Decimal(child.base_qty).eq(child.child_base_qty)) {
        throw new BizError('BIZ_BC_SPLIT_HAS_USAGE', `子条码 ${child.child_barcode} 已被使用，不能反审核拆分单`);
      }
      const changed = await this.db.exec(
        "UPDATE bc_barcode_master SET status = 'CANCELLED', qty = 0, base_qty = 0, version = version + 1, modified_at = NOW(3) WHERE id = ? AND status = 'IN' AND version = ?",
        [child.id, child.version],
      );
      if (!changed.affectedRows) throw new BizError('BIZ_BC_SPLIT_HAS_USAGE', `子条码 ${child.child_barcode} 已被使用，不能反审核拆分单`);
    }
    await this.db.exec(
      'UPDATE bc_barcode_master SET qty = qty + ?, base_qty = base_qty + ?, version = version + 1, modified_at = NOW(3) WHERE id = ?',
      [totalQty.toFixed(), total.toFixed(), parent.id],
    );
  }

  async validateMslRecord(ctx: BillHookContext): Promise<void> {
    const allowedFrom: Record<string, string> = { OPEN: 'SEALED', BACK_TO_CABINET: 'OPENED', BAKE_START: 'TIMEOUT_FROZEN', BAKE_FINISH: 'BAKING' };
    for (const entry of ctx.entries) {
      const row = await this.db.one<any>('SELECT * FROM bc_barcode_master WHERE org_id = ? AND barcode = ? FOR UPDATE', [ctx.user.orgId, entry.barcode]);
      if (!row || !row.msl_level || row.msl_status !== allowedFrom[String(entry.event)]) {
        throw new BizError('BIZ_BC_MSL_STATE_INVALID', `卷盘 ${entry.barcode} 的 MSL 状态不允许执行该事件`);
      }
      if (entry.event === 'BAKE_FINISH' && (Number(entry.temp) <= 0 || Number(entry.hours) <= 0)) {
        throw new BizError('BIZ_BC_BAKE_INVALID', '烘烤完成必须录入正数温度和时长');
      }
      const snapshot = {
        msl_status: row.msl_status,
        opened_at: row.opened_at,
        last_open_at: row.last_open_at,
        exposed_min: row.exposed_min,
        bake_count: row.bake_count,
        last_bake_at: row.last_bake_at,
        stock_status_id: row.stock_status_id,
      };
      await ctx.db.exec('UPDATE bc_msl_record_entry SET prior_state_json = ? WHERE id = ?', [JSON.stringify(snapshot), entry.id]);
    }
  }

  async applyMslRecord(ctx: BillHookContext): Promise<void> {
    for (const entry of ctx.entries) {
      const row = await this.db.one<any>('SELECT * FROM bc_barcode_master WHERE org_id = ? AND barcode = ? FOR UPDATE', [ctx.user.orgId, entry.barcode]);
      if (!row) throw new BizError('BIZ_BC_BARCODE_NOT_FOUND', '卷盘条码不存在');
      let conversionId: number | null = null;
      if (entry.event === 'OPEN') {
        await this.db.exec("UPDATE bc_barcode_master SET msl_status = 'OPENED', opened_at = COALESCE(opened_at, NOW(3)), last_open_at = NOW(3), version = version + 1, modified_at = NOW(3) WHERE id = ?", [row.id]);
      } else if (entry.event === 'BACK_TO_CABINET') {
        const elapsed = await this.db.one<{ mins: number }>('SELECT GREATEST(0, TIMESTAMPDIFF(MINUTE, ?, NOW(3))) AS mins', [row.last_open_at]);
        const exposed = new Decimal(row.exposed_min).plus(Number(elapsed?.mins ?? 0));
        await this.db.exec("UPDATE bc_barcode_master SET msl_status = 'SEALED', exposed_min = ?, last_open_at = NULL, version = version + 1, modified_at = NOW(3) WHERE id = ?", [exposed.toFixed(), row.id]);
      } else if (entry.event === 'BAKE_START') {
        await this.db.exec("UPDATE bc_barcode_master SET msl_status = 'BAKING', version = version + 1, modified_at = NOW(3) WHERE id = ?", [row.id]);
      } else if (entry.event === 'BAKE_FINISH') {
        const availableId = await this.resolveStockStatus('AVAILABLE');
        conversionId = await this.createStatusConversion(ctx.user.orgId, [{ from: row, toStatusId: availableId, qty: row.base_qty, sourceEntryId: Number(entry.id) }], `MSL 烘烤解冻：${entry.barcode}`);
        await this.db.exec("UPDATE bc_barcode_master SET msl_status = 'SEALED', stock_status_id = ?, exposed_min = 0, bake_count = bake_count + 1, last_bake_at = NOW(3), version = version + 1, modified_at = NOW(3) WHERE id = ?", [availableId, row.id]);
      }
      await this.db.exec('UPDATE bc_msl_record_entry SET convert_bill_id = ? WHERE id = ?', [conversionId, entry.id]);
      await this.insertMslLog(ctx.user.orgId, entry.barcode, String(entry.event), ctx.user.id, entry.temp, entry.hours);
    }
  }

  async reverseMslRecord(ctx: BillHookContext): Promise<void> {
    for (const entry of [...ctx.entries].reverse()) {
      await this.reverseStatusConversion(Number(entry.convert_bill_id));
      const row = await this.db.one<any>('SELECT id FROM bc_barcode_master WHERE org_id = ? AND barcode = ? FOR UPDATE', [ctx.user.orgId, entry.barcode]);
      if (!row) throw new BizError('BIZ_BC_BARCODE_NOT_FOUND', '卷盘条码不存在');
      const snapshot = typeof entry.prior_state_json === 'string' ? JSON.parse(entry.prior_state_json) : entry.prior_state_json;
      if (!snapshot) throw new BizError('BIZ_BC_MSL_SNAPSHOT_MISSING', 'MSL 事件缺少反审核快照');
      await ctx.db.exec(
        'UPDATE bc_barcode_master SET msl_status = ?, opened_at = ?, last_open_at = ?, exposed_min = ?, bake_count = ?, last_bake_at = ?, stock_status_id = ?, version = version + 1, modified_at = NOW(3) WHERE id = ?',
        [snapshot.msl_status, snapshot.opened_at, snapshot.last_open_at, snapshot.exposed_min, snapshot.bake_count, snapshot.last_bake_at, snapshot.stock_status_id, row.id],
      );
      await this.insertMslLog(ctx.user.orgId, entry.barcode, `UNDO_${entry.event}`, ctx.user.id, entry.temp, entry.hours);
    }
  }

  async mslRemainingLife(orgId: number, barcode: string) {
    const row = await this.db.one<any>(
      `SELECT *, CASE WHEN msl_status = 'OPENED' AND last_open_at IS NOT NULL
          THEN GREATEST(0, TIMESTAMPDIFF(MINUTE, last_open_at, NOW(3))) ELSE 0 END AS current_open_min
         FROM bc_barcode_master WHERE org_id = ? AND barcode = ?`,
      [orgId, barcode],
    );
    if (!row) throw new BizError('BIZ_BC_BARCODE_NOT_FOUND', '卷盘条码不存在');
    const exposed = new Decimal(row.exposed_min ?? 0).plus(Number(row.current_open_min ?? 0));
    const limit = row.floor_life_h === null ? null : new Decimal(row.floor_life_h).times(60);
    return {
      barcode: row.barcode,
      mslStatus: row.msl_status,
      exposedMinutes: exposed.toFixed(),
      remainingMinutes: limit ? Decimal.max(0, limit.minus(exposed)).toFixed() : null,
    };
  }

  async runMslTimeoutCheck(): Promise<string> {
    let frozenCount = 0;
    await this.db.tx(async () => {
      const rows = await this.db.q<any>(
        `SELECT *, exposed_min + GREATEST(0, TIMESTAMPDIFF(MINUTE, last_open_at, NOW(3))) AS current_exposed_min
           FROM bc_barcode_master
          WHERE msl_level IS NOT NULL AND msl_status = 'OPENED' AND floor_life_h > 0
            AND last_open_at IS NOT NULL
            AND exposed_min + GREATEST(0, TIMESTAMPDIFF(MINUTE, last_open_at, NOW(3))) >= floor_life_h * 60
          ORDER BY id LIMIT 100 FOR UPDATE SKIP LOCKED`,
      );
      const frozenId = rows.length ? await this.resolveStockStatus('FROZEN') : 0;
      for (const row of rows) {
        if (!Number(row.stock_status_id) || !Number(row.warehouse_id) || !Number(row.base_qty)) continue;
        await this.createStatusConversion( Number(row.org_id), [{ from: row, toStatusId: frozenId, qty: row.base_qty, sourceEntryId: Number(row.id) }], `MSL 超时冻结：${row.barcode}`);
        const updated = await this.db.exec(
          "UPDATE bc_barcode_master SET msl_status = 'TIMEOUT_FROZEN', stock_status_id = ?, exposed_min = ?, last_open_at = NULL, version = version + 1, modified_at = NOW(3) WHERE id = ? AND msl_status = 'OPENED' AND version = ?",
          [frozenId, row.current_exposed_min, row.id, row.version],
        );
        if (updated.affectedRows) {
          await this.insertMslLog(Number(row.org_id), row.barcode, 'TIMEOUT_FROZEN', 0, null, null);
          frozenCount++;
        }
      }
    });
    return `已冻结 ${frozenCount} 个超时卷盘`;
  }

  async checkFifo(input: { barcode: string; materialId: number; warehouseId: number; orgId: number }) {
    const candidates = await this.db.q<any>(
      `SELECT b.barcode, b.lot_no, b.qty, COALESCE(l.in_date, DATE(b.created_at)) AS fifo_date
         FROM bc_barcode_master b
         LEFT JOIN scm_lot_master l ON l.org_id = b.org_id AND l.material_id = b.material_id AND l.lot_no = b.lot_no
        WHERE b.org_id = ? AND b.material_id = ? AND b.warehouse_id = ? AND b.qty > 0
          AND b.status = 'IN' AND b.msl_status <> 'TIMEOUT_FROZEN'
        ORDER BY fifo_date, b.barcode`,
      [input.orgId, input.materialId, input.warehouseId],
    );
    const first = candidates[0];
    if (first && first.barcode !== input.barcode) {
      throw new BizError('BIZ_INV_FIFO_VIOLATION', `应先使用较早入库卷盘 ${first.barcode}`);
    }
    return { valid: true, firstBarcode: first?.barcode ?? null };
  }

  async getMslRemainingLife(orgId: number, barcode: string) {
    return this.mslRemainingLife(orgId, barcode);
  }

  async createStatusConversion(orgId: number, groups: { from: Row; toStatusId: number; qty: string | number; sourceEntryId: number }[], remark: string): Promise<number | null> {
    if (!groups.length) return null;
    const entries: Row[] = [];
    for (const group of groups) {
      const qty = new Decimal(group.qty);
      if (!qty.isFinite() || qty.lte(0)) throw new BizError('BIZ_INV_QTY_INVALID', 'D46 转换数量必须大于零');
      const groupNo = String(group.sourceEntryId);
      const common = {
        material_id: Number(group.from.material_id),
        aux_prop_id: intOrZero(group.from.aux_prop_id),
        qty: qty.toFixed(),
        base_qty: qty.toFixed(),
        lot_no: group.from.lot_no ?? '',
        mto_no: group.from.mto_no ?? '',
        warehouse_id: intOrZero(group.from.warehouse_id ?? group.from.wh_id),
        location_id: intOrZero(group.from.location_id ?? group.from.loc_id),
        prod_date: dateOrDefault(group.from.prod_date),
        exp_date: dateOrDefault(group.from.exp_date),
        owner_type: group.from.owner_type ?? '',
        owner_id: intOrZero(group.from.owner_id),
        keeper_type: group.from.keeper_type ?? '',
        keeper_id: intOrZero(group.from.keeper_id),
        bom_id: intOrZero(group.from.bom_id),
        group_no: groupNo,
      };
      entries.push({ ...common, convert_type: 'BEFORE', stock_status_id: Number(group.from.stock_status_id) });
      entries.push({ ...common, convert_type: 'AFTER', stock_status_id: group.toStatusId });
    }

    const bill = await this.billOp.save('scm_status_convert', null, {
      header: { org_id: orgId, bill_date: nowStr(), biz_date: nowStr(), biz_type: 'INSPECT', remark },
      entries,
    });
    const billId = Number(bill.header.id);
    await this.billOp.execOp('scm_status_convert', billId, 'submit');
    await this.billOp.execOp('scm_status_convert', billId, 'audit');
    return billId;
  }

  async resolveStockStatus(code: 'FROZEN' | 'AVAILABLE' | 'RETURN_FROZEN' | 'SCRAP' | 'NG' | 'PENDING'): Promise<number> {
    const row = await this.db.one<{ id: number }>(
      "SELECT id FROM scm_stock_status WHERE code = ? AND forbid_status = 'A' LIMIT 1",
      [code],
    );
    if (!row) throw new BizError('BIZ_INV_STATUS_INVALID', `未配置有效库存状态 ${code}`);
    return Number(row.id);
  }

  async reverseStatusConversion(billId: number | null | undefined): Promise<void> {
    if (!billId) return;
    const header = await this.db.one<{ status: string; cancel_status: string }>(
      'SELECT status, cancel_status FROM scm_status_convert WHERE id = ? FOR UPDATE',
      [billId],
    );
    if (!header || header.status !== 'AUDITED' || header.cancel_status !== 'A') return;
    await this.billOp.execOp('scm_status_convert', billId, 'unaudit');
  }

  private async openAuditBatch(form: string, billId: number, orgId: number): Promise<number> {
    const previous = await this.db.one<{ audit_batch: number }>(
      'SELECT COALESCE(MAX(audit_batch), 0) AS audit_batch FROM scm_inv_batch WHERE form = ? AND bill_id = ? FOR UPDATE',
      [form, billId],
    );
    const auditBatch = Number(previous?.audit_batch ?? 0) + 1;
    await this.db.exec(
      "INSERT INTO scm_inv_batch (id, org_id, form, bill_id, audit_batch, status, operator_id, audited_at) VALUES (?, ?, ?, ?, ?, 'PROCESSING', ?, NOW(3))",
      [nextId(), orgId, form, billId, auditBatch, currentUser()?.id ?? SYSTEM_USER.id],
    );
    return auditBatch;
  }

  private async insertMslLog(orgId: number, barcode: string, event: string, userId: number, temp: unknown, hours: unknown): Promise<void> {
    await this.db.exec(
      'INSERT INTO bc_msl_log (id, org_id, barcode, event, at, user_id, temp, hours) VALUES (?, ?, ?, ?, NOW(3), ?, ?, ?)',
      [nextId(), orgId, barcode, event, userId, temp ?? null, hours ?? null],
    );
  }

  private async applyMovements(ctx: BillHookContext, auditBatch: number, movements: any[], reversing: boolean): Promise<void> {
    const prepared = movements.map((movement) => ({
      ...movement,
      hash: movement.dimension ? inventoryDimensionHash(movement.dimension) : null,
      quantity: new Decimal(movement.base_qty),
      effectDirection: movement.reversal_direction ?? movement.direction,
    }));
    const hashes = [...new Set(prepared.map((movement) => movement.hash).filter(Boolean))].sort() as string[];
    const inventoryIds = [...new Set(prepared.map((movement) => Number(movement.inventory_id)).filter((id) => Number.isSafeInteger(id) && id > 0))].sort((a, b) => a - b);

    for (const movement of prepared.filter((item) => item.dimension).sort((a, b) => a.hash.localeCompare(b.hash))) {
      const d = movement.dimension as InventoryDimension;
      await this.db.exec(
        `INSERT INTO scm_inventory (
          id, ${DIMENSION_FIELDS.map((field) => `\`${field}\``).join(', ')}, dim_hash, qty, base_qty, lock_qty, version, created_at, modified_at
        ) VALUES (?, ${DIMENSION_FIELDS.map(() => '?').join(', ')}, ?, 0, 0, 0, 0, NOW(3), NOW(3))
        ON DUPLICATE KEY UPDATE id = id`,
        [nextId(), ...DIMENSION_FIELDS.map((field) => (d as any)[field]), movement.hash],
      );
    }

    const lockPredicates: string[] = [];
    const lockParams: unknown[] = [];
    if (hashes.length) {
      lockPredicates.push(`dim_hash IN (${hashes.map(() => '?').join(',')})`);
      lockParams.push(...hashes);
    }
    if (inventoryIds.length) {
      lockPredicates.push(`id IN (${inventoryIds.map(() => '?').join(',')})`);
      lockParams.push(...inventoryIds);
    }
    const lockedRows = lockPredicates.length
      ? await this.db.q<LockedInventory>(`SELECT id, dim_hash, qty, base_qty, lock_qty, version FROM scm_inventory WHERE ${lockPredicates.join(' OR ')} ORDER BY dim_hash FOR UPDATE`, lockParams)
      : [];
    const lockedByHash = new Map(lockedRows.map((row) => [row.dim_hash, row]));
    const byId = new Map(lockedRows.map((row) => [Number(row.id), row]));
    const order = prepared.sort((a, b) => {
      const ah = a.hash ?? byId.get(a.inventory_id)?.dim_hash ?? '';
      const bh = b.hash ?? byId.get(b.inventory_id)?.dim_hash ?? '';
      return ah.localeCompare(bh) || a.entry_id - b.entry_id;
    });

    for (const movement of order) {
      const inventory = movement.hash ? lockedByHash.get(movement.hash) : byId.get(movement.inventory_id);
      if (!inventory) throw new BizError('BIZ_INV_ROW_NOT_FOUND', '库存维度行不存在');
      const isIn = movement.effectDirection === 'IN' || movement.effectDirection === 'REV_IN';
      const current = new Decimal(inventory.base_qty);
      const lockQty = new Decimal(inventory.lock_qty);
      const next = isIn ? current.plus(movement.quantity) : current.minus(movement.quantity);
      if (!isIn && current.minus(lockQty).lt(movement.quantity)) {
        throw new BizError('BIZ_INV_INSUFFICIENT', `物料 ${movement.dimension?.material_id ?? ''} 可用库存不足`);
      }
      const updated = await this.db.exec(
        `UPDATE scm_inventory SET qty = ?, base_qty = ?, version = version + 1, modified_at = NOW(3)
          WHERE id = ? AND version = ?${isIn ? '' : ' AND base_qty - lock_qty >= ?'}`,
        isIn
          ? [next.toFixed(), next.toFixed(), inventory.id, inventory.version]
          : [next.toFixed(), next.toFixed(), inventory.id, inventory.version, movement.quantity.toFixed()],
      );
      if (!updated.affectedRows) throw new BizError('BIZ_INV_CONFLICT', '库存已被其他事务更新，请刷新后重试');

      const direction = movement.effectDirection;
      await this.db.exec(
        `INSERT INTO scm_inv_txn (
          id, org_id, inventory_id, form, bill_id, entry_id, direction, base_qty, balance_after,
          audit_batch, reversal_of, op, operator_id, at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
        [
          nextId(), ctx.user.orgId, inventory.id, ctx.form, ctx.billId, movement.entry_id, direction,
          movement.quantity.toFixed(), next.toFixed(), auditBatch, movement.reversal_of ?? null,
          reversing ? 'UNAUDIT' : 'AUDIT', ctx.user.id,
        ],
      );
      inventory.qty = next.toFixed();
      inventory.base_qty = next.toFixed();
      inventory.version = Number(inventory.version) + 1;
    }
  }
}
