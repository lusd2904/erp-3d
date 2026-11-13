import { Injectable } from '@nestjs/common';
import { DbService, ident } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { PermService } from '../../core/perm.service';
import { currentUser, SYSTEM_USER } from '../../common/request-context';
import { BillEngineRegistry } from '../bill-engine.registry';
import { BillStore } from '../store/bill-store';

/**
 * 单据链路服务：维护单据上下游关联关系（sys_bill_link）及上下查跟踪
 */
@Injectable()
export class LinkService {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
    private readonly store: BillStore,
    private readonly perm: PermService,
  ) {}

  /**
   * 重构指定单据作为下游目标时的关联链路记录
   */
  async rebuildForTarget(form: string, billId: number): Promise<void> {
    await this.removeForTarget(form, billId);
    const entries = await this.store.entries(form, billId);

    for (const row of entries) {
      if (
        row.src_entry_id !== null &&
        row.src_entry_id !== undefined &&
        String(row.src_entry_id).trim() !== ''
      ) {
        await this.db.exec(
          `INSERT INTO sys_bill_link (id, src_form, src_bill_id, src_entry_id, tgt_form, tgt_bill_id, tgt_entry_id, base_qty, rule_code, flow_instance_no) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            nextId(),
            row.src_form,
            row.src_bill_id,
            row.src_entry_id,
            form,
            billId,
            row.id,
            row.base_qty ?? 0,
            row.src_rule ?? null,
            null,
          ],
        );
      }
    }
  }

  /**
   * 清除指定单据作为目标单的链路记录
   */
  async removeForTarget(form: string, billId: number): Promise<void> {
    await this.db.exec('DELETE FROM sys_bill_link WHERE tgt_form = ? AND tgt_bill_id = ?', [
      form,
      billId,
    ]);
  }

  /**
   * 查询指定单据的下游有效单据（未作废且未删除）
   */
  async validDownstream(
    form: string,
    billId: number,
  ): Promise<{ form: string; billId: number; billNo: string }[]> {
    const links = await this.db.q<{ tgt_form: string; tgt_bill_id: number }>(
      'SELECT DISTINCT tgt_form, tgt_bill_id FROM sys_bill_link WHERE src_form = ? AND src_bill_id = ?',
      [form, billId],
    );
    if (!links.length) return [];

    const byForm = new Map<string, number[]>();
    for (const l of links) {
      const tgtForm = l.tgt_form;
      const tgtBillId = Number(l.tgt_bill_id);
      if (!byForm.has(tgtForm)) byForm.set(tgtForm, []);
      byForm.get(tgtForm)!.push(tgtBillId);
    }

    const result: { form: string; billId: number; billNo: string }[] = [];
    for (const [tgtForm, tgtBillIds] of byForm) {
      if (!this.registry.has(tgtForm)) {
        for (const bid of tgtBillIds) {
          result.push({ form: tgtForm, billId: bid, billNo: '' });
        }
        continue;
      }

      const reg = this.registry.get(tgtForm);
      const table = reg.meta.table;
      const rows = await this.db.q<{ id: number; bill_no: string }>(
        `SELECT id, bill_no FROM ${ident(table)} WHERE id IN (${tgtBillIds.map(() => '?').join(', ')}) AND cancel_status = 'A'`,
        tgtBillIds,
      );
      for (const r of rows) {
        result.push({ form: tgtForm, billId: Number(r.id), billNo: r.bill_no });
      }
    }
    return result;
  }

  /**
   * 查询单据上下查关联明细（up：上查来源；down：下查派生）
   */
  async query(form: string, billId: number, dir: 'up' | 'down' = 'down'): Promise<any[]> {
    const reg = this.registry.get(form);
    const user = currentUser() ?? SYSTEM_USER;
    await this.perm.assert(user, form, 'view', reg.meta.name);

    let rows: any[];
    if (dir === 'up') {
      rows = await this.db.q(
        'SELECT id, src_form, src_bill_id, src_entry_id, tgt_form, tgt_bill_id, tgt_entry_id, base_qty, rule_code FROM sys_bill_link WHERE tgt_form = ? AND tgt_bill_id = ? ORDER BY id',
        [form, billId],
      );
    } else {
      rows = await this.db.q(
        'SELECT id, src_form, src_bill_id, src_entry_id, tgt_form, tgt_bill_id, tgt_entry_id, base_qty, rule_code FROM sys_bill_link WHERE src_form = ? AND src_bill_id = ? ORDER BY id',
        [form, billId],
      );
    }

    if (!rows.length) return [];

    const byForm = new Map<string, number[]>();
    for (const r of rows) {
      const otherForm = dir === 'up' ? r.src_form : r.tgt_form;
      const otherBillId = Number(dir === 'up' ? r.src_bill_id : r.tgt_bill_id);
      if (!byForm.has(otherForm)) byForm.set(otherForm, []);
      byForm.get(otherForm)!.push(otherBillId);
    }

    const billMap = new Map<string, Map<number, { bill_no: string; status: string; cancel_status: string }>>();
    for (const [f, ids] of byForm) {
      billMap.set(f, await this.store.billNoMap(f, ids));
    }

    return rows.map((r) => {
      const otherForm = dir === 'up' ? r.src_form : r.tgt_form;
      const otherBillId = Number(dir === 'up' ? r.src_bill_id : r.tgt_bill_id);
      const entryId = Number(dir === 'up' ? r.src_entry_id : r.tgt_entry_id) || null;
      const linkedEntryId = Number(dir === 'up' ? r.tgt_entry_id : r.src_entry_id) || null;
      const otherReg = this.registry.has(otherForm) ? this.registry.get(otherForm) : null;
      const info = billMap.get(otherForm)?.get(otherBillId);

      return {
        form: otherForm,
        formName: otherReg ? otherReg.meta.name : otherForm,
        billId: otherBillId,
        billNo: info?.bill_no ?? '',
        status: info?.status ?? '',
        cancelStatus: info?.cancel_status ?? '',
        entryId,
        linkedEntryId,
        qty: String(r.base_qty ?? '0'),
        ruleCode: r.rule_code ?? null,
      };
    });
  }
}
