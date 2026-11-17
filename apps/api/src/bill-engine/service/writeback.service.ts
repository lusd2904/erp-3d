import { Injectable } from '@nestjs/common';
import {
  ErrorCodes,
  WritebackRuleConfig,
  compileExpr,
  toDec,
  Decimal,
} from '@erp3d/shared';
import { DbService, ident } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { BizError } from '../../common/biz-error';
import { currentUser, SYSTEM_USER } from '../../common/request-context';
import { BillEngineRegistry } from '../bill-engine.registry';
import { BillStore } from '../store/bill-store';
import type { Row } from '../engine.types';

interface WritebackItem {
  rule: WritebackRuleConfig;
  srcTable: string;
  srcEntryId: number;
  tgtEntryId: number;
  delta: Decimal;
  tgtEntry: Row;
}

/**
 * L4 反写服务：负责在单据保存、审核或业务事件发生时，回写上游单据的执行进度与累计数量，
 * 并执行超额控制与自动整单/分录业务关闭。
 */
@Injectable()
export class WritebackService {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
    private readonly store: BillStore,
  ) {}

  /**
   * 应用反写规则（在调用方事务内执行）。
   */
  async apply(
    tgtForm: string,
    tgtBillId: number,
    event: string,
    opts?: { entryIds?: number[] },
  ): Promise<void> {
    const rules = this.registry.writebacksFor(tgtForm, event);
    if (!rules || rules.length === 0) return;

    const tgtHeader = await this.store.header(tgtForm, tgtBillId);
    if (!tgtHeader) return;

    let tgtEntries = await this.store.entries(tgtForm, tgtBillId);
    if (opts?.entryIds && opts.entryIds.length > 0) {
      const allowedSet = new Set(opts.entryIds.map(Number));
      tgtEntries = tgtEntries.filter((e) => allowedSet.has(Number(e.id)));
    }
    if (tgtEntries.length === 0) return;

    // 收集待反写分录项
    const items: WritebackItem[] = [];
    for (const rule of rules) {
      for (const e of tgtEntries) {
        if (
          e.src_form === rule.srcForm &&
          e.src_entry_id &&
          (!rule.convertRule || e.src_rule === rule.convertRule)
        ) {
          const exprStr = rule.tgtValue ?? 'base_qty';
          const value = compileExpr(exprStr).evalDec({ ...e, entry: e, head: tgtHeader });
          const delta = rule.mode === 'sub' ? value.neg() : value;
          if (value.isZero() && rule.mode !== 'overwrite') {
            continue;
          }
          const srcMeta = this.registry.get(rule.srcForm).meta;
          if (!srcMeta.entry) {
            throw new BizError(ErrorCodes.BIZ_UNKNOWN_FORM, `上游单据「${rule.srcForm}」缺少分录元数据`);
          }
          items.push({
            rule,
            srcTable: srcMeta.entry.table,
            srcEntryId: Number(e.src_entry_id),
            tgtEntryId: Number(e.id),
            delta,
            tgtEntry: e,
          });
        }
      }
    }
    if (items.length === 0) return;

    // 按 (上游分录表名, srcEntryId) 升序排序，防死锁加锁
    items.sort((a, b) => {
      if (a.srcTable !== b.srcTable) {
        return a.srcTable < b.srcTable ? -1 : 1;
      }
      return a.srcEntryId - b.srcEntryId;
    });

    const byTable = new Map<string, number[]>();
    for (const it of items) {
      let arr = byTable.get(it.srcTable);
      if (!arr) {
        arr = [];
        byTable.set(it.srcTable, arr);
      }
      if (!arr.includes(it.srcEntryId)) {
        arr.push(it.srcEntryId);
      }
    }

    const sortedTables = Array.from(byTable.keys()).sort();
    const srcRowMap = new Map<string, Map<number, Row>>();

    for (const tbl of sortedTables) {
      const ids = byTable.get(tbl)!.sort((a, b) => a - b);
      const placeholders = ids.map(() => '?').join(',');
      const lockedRows = await this.db.q<Row>(
        `SELECT * FROM ${ident(tbl)} WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
        ids,
      );
      const tableMap = new Map<number, Row>();
      for (const r of lockedRows) {
        tableMap.set(Number(r.id), r);
      }
      srcRowMap.set(tbl, tableMap);
    }

    // 校验上游行是否存在
    for (const it of items) {
      if (!srcRowMap.get(it.srcTable)?.has(it.srcEntryId)) {
        throw new BizError(ErrorCodes.BIZ_SRC_NOT_AVAILABLE, '源单分录不存在');
      }
    }

    const user = currentUser() ?? SYSTEM_USER;
    const srcHeaderCache = new Map<string, Row>();
    const affectedHeads = new Map<string, { form: string; billId: number; closeScope: 'ALL' | 'ANY' }>();

    // 逐项执行反写并进行超额校验
    for (const it of items) {
      const { rule, srcTable, srcEntryId, tgtEntryId, delta } = it;
      const row = srcRowMap.get(srcTable)!.get(srcEntryId)!;
      const srcField = rule.srcField;
      const oldVal = row[srcField];
      const oldDec = toDec(oldVal);
      let newDec: Decimal;

      if (rule.mode === 'overwrite') {
        await this.db.exec(
          `UPDATE ${ident(srcTable)} SET ${ident(srcField)} = ? WHERE id = ?`,
          [delta.toFixed(), srcEntryId],
        );
        newDec = delta;
        row[srcField] = newDec.toFixed();
      } else {
        await this.db.exec(
          `UPDATE ${ident(srcTable)} SET ${ident(srcField)} = ${ident(srcField)} + ? WHERE id = ?`,
          [delta.toFixed(), srcEntryId],
        );
        newDec = oldDec.plus(delta);
        row[srcField] = newDec.toFixed();
      }

      // 获取并缓存上游头表
      const headerCacheKey = `${rule.srcForm}:${row.bill_id}`;
      let srcHeader = srcHeaderCache.get(headerCacheKey);
      if (!srcHeader) {
        const h = await this.store.header(rule.srcForm, Number(row.bill_id));
        if (h) {
          srcHeader = h;
          srcHeaderCache.set(headerCacheKey, h);
        }
      }

      // 超额控制校验
      if (rule.overCtrl !== 'ALLOW' && newDec.gt(oldDec)) {
        let limit: Decimal | undefined;
        if (rule.overExpr) {
          limit = compileExpr(rule.overExpr).evalDec({ ...row, entry: row, head: srcHeader });
        } else {
          const cRuleCode = rule.convertRule ?? it.tgtEntry.src_rule;
          if (cRuleCode) {
            try {
              const cRule = this.registry.getConvert(cRuleCode);
              if (cRule?.srcQtyField && row[cRule.srcQtyField] !== undefined) {
                limit = toDec(row[cRule.srcQtyField]);
              }
            } catch {
              // 转换规则不存在或停用时不控
            }
          }
        }

        if (limit !== undefined) {
          const srcMeta = this.registry.get(rule.srcForm).meta;
          const fMeta = srcMeta.entry?.fields.find((f) => f.key === srcField);
          const fieldName = fMeta?.name ?? srcField;
          const billNoStr = srcHeader?.bill_no ?? '';
          const defaultMsg = `${srcMeta.name}「${billNoStr}」第${row.line_no}行${fieldName}将超出上限：本次 ${delta.toFixed()}，累计 ${newDec.toFixed()}，上限 ${limit.toFixed()}`;
          if (rule.overCtrl === 'FORBID') {
            if (newDec.gt(limit)) {
              throw new BizError(ErrorCodes.BIZ_OVER_LIMIT, rule.overMsg ?? defaultMsg);
            }
          } else if (rule.overCtrl === 'ONCE') {
            if (oldDec.gte(limit)) {
              throw new BizError(ErrorCodes.BIZ_OVER_LIMIT, rule.overMsg ?? defaultMsg);
            }
          }
        }
      }

      // 登记反写日志
      await this.db.exec(
        `INSERT INTO sys_writeback_log (id, rule_code, event, src_form, src_bill_id, src_entry_id, src_field, tgt_form, tgt_bill_id, tgt_entry_id, mode, delta, old_value, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3))`,
        [
          nextId(),
          rule.code,
          event,
          rule.srcForm,
          row.bill_id,
          srcEntryId,
          srcField,
          tgtForm,
          tgtBillId,
          tgtEntryId,
          rule.mode,
          delta.toFixed(),
          rule.mode === 'overwrite' ? (oldVal !== null && oldVal !== undefined ? toDec(oldVal).toFixed() : null) : null,
          user.id,
        ],
      );

      // 行自动业务关闭
      if (rule.closeExpr) {
        const shouldClose = compileExpr(rule.closeExpr).evalBool({ ...row, entry: row, head: srcHeader });
        const targetClose = shouldClose ? 'B' : 'A';
        if (row.biz_close !== targetClose) {
          await this.db.exec(
            `UPDATE ${ident(srcTable)} SET biz_close = ? WHERE id = ?`,
            [targetClose, srcEntryId],
          );
          row.biz_close = targetClose;
        }
      }

      if (rule.closeScope === 'ALL' || rule.closeScope === 'ANY') {
        affectedHeads.set(headerCacheKey, {
          form: rule.srcForm,
          billId: Number(row.bill_id),
          closeScope: rule.closeScope,
        });
      }
    }

    // 重算涉及的上游单据头自动关闭状态
    const sortedHeads = Array.from(affectedHeads.values()).sort((a, b) => a.billId - b.billId);
    for (const hInfo of sortedHeads) {
      const srcMeta = this.registry.get(hInfo.form).meta;
      const entryTable = srcMeta.entry!.table;
      const headTable = srcMeta.table;
      const entries = await this.db.q<{ biz_close: string }>(
        `SELECT biz_close FROM ${ident(entryTable)} WHERE bill_id = ?`,
        [hInfo.billId],
      );
      let needClose = false;
      if (hInfo.closeScope === 'ALL') {
        needClose = entries.length > 0 && entries.every((e) => e.biz_close === 'B');
      } else if (hInfo.closeScope === 'ANY') {
        needClose = entries.some((e) => e.biz_close === 'B');
      }

      const curH = await this.store.header(hInfo.form, hInfo.billId, { forUpdate: true });
      if (curH) {
        if (needClose && curH.close_status === 'A') {
          await this.db.exec(
            `UPDATE ${ident(headTable)} SET close_status = 'B', closed_at = NOW(3), closer_id = NULL WHERE id = ?`,
            [hInfo.billId],
          );
        } else if (!needClose && curH.close_status === 'B' && (curH.closer_id === null || curH.closer_id === undefined)) {
          await this.db.exec(
            `UPDATE ${ident(headTable)} SET close_status = 'A', closed_at = NULL WHERE id = ?`,
            [hInfo.billId],
          );
        }
      }
    }
  }

  /**
   * 冲回/反向恢复反写（在调用方事务内执行）。
   */
  async reverse(
    tgtForm: string,
    tgtBillId: number,
    event: string,
    opts?: { entryIds?: number[] },
  ): Promise<void> {
    let sql = 'SELECT * FROM sys_writeback_log WHERE tgt_form = ? AND tgt_bill_id = ? AND event = ?';
    const params: unknown[] = [tgtForm, tgtBillId, event];
    if (opts?.entryIds && opts.entryIds.length > 0) {
      sql += ` AND tgt_entry_id IN (${opts.entryIds.map(() => '?').join(',')})`;
      params.push(...opts.entryIds.map(Number));
    }
    sql += ' ORDER BY id DESC';

    const logs = await this.db.q<any>(sql, params);
    if (!logs || logs.length === 0) return;

    // 按上游分录表升序加锁
    const byTable = new Map<string, number[]>();
    for (const log of logs) {
      const reg = this.registry.get(log.src_form);
      const tbl = reg.meta.entry!.table;
      let arr = byTable.get(tbl);
      if (!arr) {
        arr = [];
        byTable.set(tbl, arr);
      }
      const eid = Number(log.src_entry_id);
      if (!arr.includes(eid)) arr.push(eid);
    }

    const sortedTables = Array.from(byTable.keys()).sort();
    const srcRowMap = new Map<string, Map<number, Row>>();

    for (const tbl of sortedTables) {
      const ids = byTable.get(tbl)!.sort((a, b) => a - b);
      const placeholders = ids.map(() => '?').join(',');
      const lockedRows = await this.db.q<Row>(
        `SELECT * FROM ${ident(tbl)} WHERE id IN (${placeholders}) ORDER BY id FOR UPDATE`,
        ids,
      );
      const tableMap = new Map<number, Row>();
      for (const r of lockedRows) {
        tableMap.set(Number(r.id), r);
      }
      srcRowMap.set(tbl, tableMap);
    }

    const srcHeaderCache = new Map<string, Row>();
    const affectedHeads = new Map<string, { form: string; billId: number; closeScope: 'ALL' | 'ANY' }>();

    for (const log of logs) {
      const rule = this.registry.writebackByCode(log.rule_code);
      const reg = this.registry.get(log.src_form);
      const srcTable = reg.meta.entry!.table;
      const srcEntryId = Number(log.src_entry_id);
      const row = srcRowMap.get(srcTable)?.get(srcEntryId);
      if (!row) continue;

      const srcField = log.src_field;
      if (log.mode === 'overwrite') {
        const oldVal = log.old_value !== null && log.old_value !== undefined ? toDec(log.old_value).toFixed() : '0';
        await this.db.exec(
          `UPDATE ${ident(srcTable)} SET ${ident(srcField)} = ? WHERE id = ?`,
          [oldVal, srcEntryId],
        );
        row[srcField] = oldVal;
      } else {
        const deltaDec = toDec(log.delta);
        await this.db.exec(
          `UPDATE ${ident(srcTable)} SET ${ident(srcField)} = ${ident(srcField)} - ? WHERE id = ?`,
          [deltaDec.toFixed(), srcEntryId],
        );
        row[srcField] = toDec(row[srcField]).minus(deltaDec).toFixed();
      }

      const headerCacheKey = `${log.src_form}:${row.bill_id}`;
      let srcHeader = srcHeaderCache.get(headerCacheKey);
      if (!srcHeader) {
        const h = await this.store.header(log.src_form, Number(row.bill_id));
        if (h) {
          srcHeader = h;
          srcHeaderCache.set(headerCacheKey, h);
        }
      }

      if (rule?.closeExpr) {
        const shouldClose = compileExpr(rule.closeExpr).evalBool({ ...row, entry: row, head: srcHeader });
        const targetClose = shouldClose ? 'B' : 'A';
        if (row.biz_close !== targetClose) {
          await this.db.exec(
            `UPDATE ${ident(srcTable)} SET biz_close = ? WHERE id = ?`,
            [targetClose, srcEntryId],
          );
          row.biz_close = targetClose;
        }
      }

      if (rule?.closeScope === 'ALL' || rule?.closeScope === 'ANY') {
        affectedHeads.set(headerCacheKey, {
          form: log.src_form,
          billId: Number(row.bill_id),
          closeScope: rule.closeScope,
        });
      }
    }

    // 重算上游头关闭状态
    const sortedHeads = Array.from(affectedHeads.values()).sort((a, b) => a.billId - b.billId);
    for (const hInfo of sortedHeads) {
      const srcMeta = this.registry.get(hInfo.form).meta;
      const entryTable = srcMeta.entry!.table;
      const headTable = srcMeta.table;
      const entries = await this.db.q<{ biz_close: string }>(
        `SELECT biz_close FROM ${ident(entryTable)} WHERE bill_id = ?`,
        [hInfo.billId],
      );
      let needClose = false;
      if (hInfo.closeScope === 'ALL') {
        needClose = entries.length > 0 && entries.every((e) => e.biz_close === 'B');
      } else if (hInfo.closeScope === 'ANY') {
        needClose = entries.some((e) => e.biz_close === 'B');
      }

      const curH = await this.store.header(hInfo.form, hInfo.billId, { forUpdate: true });
      if (curH) {
        if (needClose && curH.close_status === 'A') {
          await this.db.exec(
            `UPDATE ${ident(headTable)} SET close_status = 'B', closed_at = NOW(3), closer_id = NULL WHERE id = ?`,
            [hInfo.billId],
          );
        } else if (!needClose && curH.close_status === 'B' && (curH.closer_id === null || curH.closer_id === undefined)) {
          await this.db.exec(
            `UPDATE ${ident(headTable)} SET close_status = 'A', closed_at = NULL WHERE id = ?`,
            [hInfo.billId],
          );
        }
      }
    }

    // 清理反写日志
    const logIds = logs.map((l) => l.id);
    await this.db.exec(
      `DELETE FROM sys_writeback_log WHERE id IN (${logIds.map(() => '?').join(',')})`,
      logIds,
    );
  }

  /**
   * 检查指定单据事件是否存有反写日志。
   */
  async hasLogs(tgtForm: string, tgtBillId: number, event: string): Promise<boolean> {
    const row = await this.db.one(
      'SELECT 1 FROM sys_writeback_log WHERE tgt_form = ? AND tgt_bill_id = ? AND event = ? LIMIT 1',
      [tgtForm, tgtBillId, event],
    );
    return !!row;
  }
}
