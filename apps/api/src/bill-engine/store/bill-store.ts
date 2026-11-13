import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { DbService, ident } from '../../db/db.service';
import { BizError } from '../../common/biz-error';
import { BillEngineRegistry } from '../bill-engine.registry';
import { Row } from '../engine.types';

/**
 * 单据动态表存储层：提供单据头、主分录、子分录的原生 SQL 增删改查
 */
@Injectable()
export class BillStore {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
  ) {}

  /**
   * 查询单据头表数据
   */
  async header(form: string, id: number, opts?: { forUpdate?: boolean }): Promise<Row | undefined> {
    const reg = this.registry.get(form);
    const sql = `SELECT * FROM ${ident(reg.meta.table)} WHERE id = ?${opts?.forUpdate ? ' FOR UPDATE' : ''}`;
    return this.db.one<Row>(sql, [id]);
  }

  /**
   * 必须查出单据头，不存在抛出 BIZ_BILL_NOT_FOUND
   */
  async mustHeader(form: string, id: number, opts?: { forUpdate?: boolean }): Promise<Row> {
    const reg = this.registry.get(form);
    const h = await this.header(form, id, opts);
    if (!h) {
      throw new BizError(ErrorCodes.BIZ_BILL_NOT_FOUND, `${reg.meta.name}不存在或已删除`);
    }
    return h;
  }

  /**
   * 查询主分录行，并自动装配子分录至 row[child.key]
   */
  async entries(
    form: string,
    billId: number,
    opts?: { forUpdate?: boolean; ids?: number[] },
  ): Promise<Row[]> {
    const reg = this.registry.get(form);
    if (!reg.meta.entry) {
      return [];
    }

    const entryTable = reg.meta.entry.table;
    const whereParts: string[] = ['bill_id = ?'];
    const params: unknown[] = [billId];

    if (opts?.ids && opts.ids.length > 0) {
      whereParts.push(`id IN (${opts.ids.map(() => '?').join(', ')})`);
      params.push(...opts.ids);
    }

    const orderClause = opts?.forUpdate ? 'ORDER BY id FOR UPDATE' : 'ORDER BY line_no, id';
    const sql = `SELECT * FROM ${ident(entryTable)} WHERE ${whereParts.join(' AND ')} ${orderClause}`;
    let rows = await this.db.q<Row>(sql, params);

    // 行锁模式下按主键锁行后在内存按行号稳定排序
    if (opts?.forUpdate) {
      rows.sort(
        (a, b) => (Number(a.line_no) || 0) - (Number(b.line_no) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0),
      );
    }

    // 查询并组装子分录
    const children = reg.meta.entry.children ?? [];
    for (const child of children) {
      const childRows = await this.db.q<Row>(
        `SELECT * FROM ${ident(child.table)} WHERE bill_id = ? ORDER BY entry_id, seq, id`,
        [billId],
      );
      const childMap = new Map<number, Row[]>();
      for (const cr of childRows) {
        const eid = Number(cr.entry_id);
        if (!childMap.has(eid)) {
          childMap.set(eid, []);
        }
        childMap.get(eid)!.push(cr);
      }
      for (const r of rows) {
        r[child.key] = childMap.get(Number(r.id)) ?? [];
      }
    }

    return rows;
  }

  /**
   * 按分录 ID 列表批量查询分录（不挂载子分录）
   */
  async entriesByIds(form: string, ids: number[], opts?: { forUpdate?: boolean }): Promise<Row[]> {
    if (!ids || ids.length === 0) return [];
    const reg = this.registry.get(form);
    if (!reg.meta.entry) return [];

    const sql = `SELECT * FROM ${ident(reg.meta.entry.table)} WHERE id IN (${ids.map(() => '?').join(', ')}) ORDER BY id${opts?.forUpdate ? ' FOR UPDATE' : ''}`;
    return this.db.q<Row>(sql, ids);
  }

  /**
   * 动态插入行
   */
  async insertRow(table: string, row: Row): Promise<number> {
    const keys = Object.keys(row);
    if (keys.length === 0) return 0;

    const cols = keys.map((k) => ident(k)).join(', ');
    const placeholders = keys.map(() => '?').join(', ');
    const vals = keys.map((k) => {
      const v = row[k];
      return v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v;
    });

    const sql = `INSERT INTO ${ident(table)} (${cols}) VALUES (${placeholders})`;
    const r = await this.db.exec(sql, vals);
    return r.insertId;
  }

  /**
   * 动态更新行
   */
  async updateRow(
    table: string,
    id: number,
    patch: Row,
    extraWhere?: { sql: string; params: unknown[] },
  ): Promise<number> {
    const keys = Object.keys(patch);
    if (keys.length === 0) return 1;

    const setClause = keys.map((k) => `${ident(k)} = ?`).join(', ');
    const vals = keys.map((k) => {
      const v = patch[k];
      return v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v;
    });

    let sql = `UPDATE ${ident(table)} SET ${setClause} WHERE id = ?`;
    const params = [...vals, id];

    if (extraWhere?.sql) {
      sql += ` AND (${extraWhere.sql})`;
      params.push(...(extraWhere.params ?? []));
    }

    const r = await this.db.exec(sql, params);
    return r.affectedRows;
  }

  /**
   * 物理删除整张单据（子分录、主分录、表头）
   */
  async deleteBill(form: string, id: number): Promise<void> {
    const reg = this.registry.get(form);
    if (reg.meta.entry) {
      for (const child of reg.meta.entry.children ?? []) {
        await this.db.exec(`DELETE FROM ${ident(child.table)} WHERE bill_id = ?`, [id]);
      }
      await this.db.exec(`DELETE FROM ${ident(reg.meta.entry.table)} WHERE bill_id = ?`, [id]);
    }
    await this.db.exec(`DELETE FROM ${ident(reg.meta.table)} WHERE id = ?`, [id]);
  }

  /**
   * 批量查询单据编号及状态映射
   */
  async billNoMap(
    form: string,
    ids: number[],
  ): Promise<Map<number, { bill_no: string; status: string; cancel_status: string }>> {
    const map = new Map<number, { bill_no: string; status: string; cancel_status: string }>();
    if (!this.registry.has(form) || !ids || ids.length === 0) {
      return map;
    }

    const reg = this.registry.get(form);
    const uniqueIds = Array.from(new Set(ids));
    const rows = await this.db.q<{ id: number; bill_no: string; status: string; cancel_status: string }>(
      `SELECT id, bill_no, status, cancel_status FROM ${ident(reg.meta.table)} WHERE id IN (${uniqueIds.map(() => '?').join(', ')})`,
      uniqueIds,
    );

    for (const r of rows) {
      map.set(Number(r.id), {
        bill_no: r.bill_no,
        status: r.status,
        cancel_status: r.cancel_status,
      });
    }
    return map;
  }
}
