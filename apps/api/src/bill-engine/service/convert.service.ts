import { Injectable } from '@nestjs/common';
import {
  ErrorCodes,
  RowError,
  toDec,
  Decimal,
  compileExpr,
} from '@erp3d/shared';
import { DbService } from '../../db/db.service';
import { BizError } from '../../common/biz-error';
import { currentUser, SYSTEM_USER } from '../../common/request-context';
import { PermService } from '../../core/perm.service';
import { BillEngineRegistry } from '../bill-engine.registry';
import { BillStore } from '../store/bill-store';
import { BillSaveService } from './bill-save.service';
import type { Row, BillDraft } from '../engine.types';

function resolvePath(path: string, e: Row, h: Row): unknown {
  if (path.startsWith('head.')) {
    return h[path.slice(5)];
  }
  if (path.startsWith('entry.')) {
    return e[path.slice(6)];
  }
  return path in e ? e[path] : h[path];
}

/**
 * L4 下推转换服务：负责根据转换规则将源单据选单转换、分组合单并生成下游草稿或直接落单。
 */
@Injectable()
export class ConvertService {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
    private readonly store: BillStore,
    private readonly perm: PermService,
    private readonly saveSvc: BillSaveService,
  ) {}

  /**
   * 执行下推选单转换。
   */
  async push(
    ruleCode: string,
    req: {
      entries: { entryId: number; qty?: string | number }[];
      save?: boolean;
      billTypeId?: number;
    },
  ): Promise<{ tgtForm: string; drafts: BillDraft[]; billIds: number[] }> {
    const rule = this.registry.getConvert(ruleCode);
    const user = currentUser() ?? SYSTEM_USER;

    await this.perm.assert(user, rule.srcForm, 'push', this.registry.get(rule.srcForm).meta.name);
    if (req.save) {
      await this.perm.assert(user, rule.tgtForm, 'new', this.registry.get(rule.tgtForm).meta.name);
    }

    if (!req.entries || req.entries.length === 0) {
      throw new BizError(ErrorCodes.SYS_VALIDATION, '请选择要下推的分录');
    }

    const entryIds = req.entries.map((e) => Number(e.entryId));
    const srcEntries = await this.store.entriesByIds(rule.srcForm, entryIds);
    if (srcEntries.length !== entryIds.length) {
      throw new BizError(ErrorCodes.BIZ_SRC_NOT_AVAILABLE, '部分源单分录不存在');
    }

    const srcEntryMap = new Map(srcEntries.map((e) => [Number(e.id), e]));
    const srcBillIds = Array.from(new Set(srcEntries.map((e) => Number(e.bill_id))));
    const srcHeaderMap = new Map<number, Row>();
    for (const bid of srcBillIds) {
      const h = await this.store.mustHeader(rule.srcForm, bid);
      srcHeaderMap.set(bid, h);
    }

    // 预载单据类型用于校验与映射
    const billTypeRows = await this.db.q<{ id: number; object_code: string; code: string }>(
      'SELECT id, object_code, code FROM sys_bill_type',
    );
    const billTypeById = new Map(billTypeRows.map((r) => [Number(r.id), r]));
    const targetBillTypeByCode = new Map(
      billTypeRows.filter((r) => r.object_code === rule.tgtForm).map((r) => [r.code, Number(r.id)]),
    );

    const rowErrors: RowError[] = [];
    const validRows: { e: Row; h: Row; avail: Decimal; qty: Decimal }[] = [];
    const srcStatusAllowed = new Set(rule.srcStatus ?? ['AUDITED']);

    // 逐行前置状态与数量校验
    for (const reqItem of req.entries) {
      const e = srcEntryMap.get(Number(reqItem.entryId))!;
      const h = srcHeaderMap.get(Number(e.bill_id))!;
      const lineNo = e.line_no;
      let hasRowError = false;

      if (!srcStatusAllowed.has(h.status)) {
        rowErrors.push({ entity: 'entry', row: lineNo, msg: `源单状态为${h.status}，不允许下推` });
        hasRowError = true;
      }
      if (h.cancel_status !== 'A') {
        rowErrors.push({ entity: 'entry', row: lineNo, msg: '源单已作废' });
        hasRowError = true;
      }
      if (h.close_status !== 'A') {
        rowErrors.push({ entity: 'entry', row: lineNo, msg: '源单已关闭' });
        hasRowError = true;
      }
      if (e.biz_close !== 'A') {
        rowErrors.push({ entity: 'entry', row: lineNo, msg: '分录已关闭' });
        hasRowError = true;
      }
      if (e.biz_terminate !== 'A') {
        rowErrors.push({ entity: 'entry', row: lineNo, msg: '分录已终止' });
        hasRowError = true;
      }

      if (rule.allowSrcBillTypes && rule.allowSrcBillTypes.length > 0) {
        const bt = h.bill_type_id ? billTypeById.get(Number(h.bill_type_id)) : null;
        if (!bt || !rule.allowSrcBillTypes.includes(bt.code)) {
          rowErrors.push({ entity: 'entry', row: lineNo, msg: '源单单据类型不满足下推要求' });
          hasRowError = true;
        }
      }

      const srcQty = toDec(e[rule.srcQtyField]);
      const linkedQty = rule.srcLinkField ? toDec(e[rule.srcLinkField]) : new Decimal(0);
      const avail = srcQty.minus(linkedQty);
      const requestedQty =
        reqItem.qty !== undefined && reqItem.qty !== null && reqItem.qty !== ''
          ? toDec(reqItem.qty)
          : avail;

      if (requestedQty.lte(0)) {
        rowErrors.push({ entity: 'entry', row: lineNo, msg: '可下推数量为 0' });
        hasRowError = true;
      } else if (rule.srcLinkField && requestedQty.gt(avail)) {
        throw new BizError(
          ErrorCodes.BIZ_OVER_LIMIT,
          `第${lineNo}行本次数量 ${requestedQty.toFixed()} 超过可下推数量 ${avail.toFixed()}`,
        );
      }

      if (rule.filterExpr) {
        const vars = { ...e, entry: e, head: h, avail: avail.toFixed(), qty: requestedQty.toFixed() };
        const ok = compileExpr(rule.filterExpr).evalBool(vars);
        if (!ok) {
          rowErrors.push({ entity: 'entry', row: lineNo, msg: rule.filterMsg ?? '不满足下推条件' });
          hasRowError = true;
        }
      }

      if (!hasRowError) {
        validRows.push({ e, h, avail, qty: requestedQty });
      }
    }

    if (rowErrors.length > 0) {
      throw new BizError(ErrorCodes.BIZ_SRC_NOT_AVAILABLE, '所选分录不能下推', { errors: rowErrors });
    }

    // 分组合单
    const groupByKeys = rule.groupBy ?? ['head.id'];
    const groups = new Map<string, { e: Row; h: Row; avail: Decimal; qty: Decimal }[]>();

    for (const item of validRows) {
      const groupKey = groupByKeys.map((k) => String(resolvePath(k, item.e, item.h) ?? '')).join('|');
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(item);
    }

    // 逐组组装目标草稿
    const drafts: BillDraft[] = [];
    const commonCols = ['material_id', 'aux_prop_id', 'unit_id', 'base_unit_id', 'lot_no', 'mto_no'];

    for (const groupRows of groups.values()) {
      const header: Row = {};

      for (const item of rule.header) {
        const tgtKey = item.tgt;
        const agg = item.agg ?? 'first';
        const vals: any[] = [];

        for (const r of groupRows) {
          let val: any;
          if (item.const !== undefined) {
            val = item.const;
          } else if (item.src) {
            val = resolvePath(item.src, r.e, r.h);
          } else if (item.expr) {
            const vars = { ...r.e, entry: r.e, head: r.h, avail: r.avail.toFixed(), qty: r.qty.toFixed() };
            val = compileExpr(item.expr).eval(vars);
          }
          vals.push(val);
        }

        if (agg === 'first') {
          header[tgtKey] = vals[0];
        } else if (agg === 'sum') {
          let s = new Decimal(0);
          for (const v of vals) s = s.plus(toDec(v));
          header[tgtKey] = s.toFixed();
        } else if (agg === 'max') {
          let m = toDec(vals[0]);
          for (let i = 1; i < vals.length; i++) {
            const d = toDec(vals[i]);
            if (d.gt(m)) m = d;
          }
          header[tgtKey] = m.toFixed();
        } else if (agg === 'min') {
          let m = toDec(vals[0]);
          for (let i = 1; i < vals.length; i++) {
            const d = toDec(vals[i]);
            if (d.lt(m)) m = d;
          }
          header[tgtKey] = m.toFixed();
        } else if (agg === 'concat') {
          const uniqueVals = Array.from(
            new Set(vals.filter((v) => v !== null && v !== undefined && v !== '').map(String)),
          );
          header[tgtKey] = uniqueVals.join(',');
        }
      }

      let billTypeId = req.billTypeId ?? null;
      if (!billTypeId && rule.billTypeMap) {
        const firstH = groupRows[0].h;
        const srcBt = firstH.bill_type_id ? billTypeById.get(Number(firstH.bill_type_id)) : null;
        if (srcBt && rule.billTypeMap[srcBt.code]) {
          const tgtBtCode = rule.billTypeMap[srcBt.code];
          billTypeId = targetBillTypeByCode.get(tgtBtCode) ?? null;
        }
      }
      if (billTypeId) header.bill_type_id = billTypeId;

      const entries: Row[] = [];
      for (const r of groupRows) {
        const e = r.e;
        const h = r.h;
        const qty = r.qty;
        const entryRow: Row = {};

        for (const col of commonCols) {
          if (e[col] !== undefined) entryRow[col] = e[col];
        }

        for (const item of rule.entry) {
          let val: any;
          if (item.const !== undefined) {
            val = item.const;
          } else if (item.src) {
            val = resolvePath(item.src, e, h);
          } else if (item.expr) {
            const vars = { ...e, entry: e, head: h, avail: r.avail.toFixed(), qty: qty.toFixed() };
            val = compileExpr(item.expr).eval(vars);
          }
          entryRow[item.tgt] = val;
        }

        const tgtQtyField = rule.tgtQtyField ?? 'qty';
        entryRow[tgtQtyField] = qty.toFixed();
        entryRow.qty = qty.toFixed();
        entryRow.base_qty = qty.toFixed();
        entryRow.src_form = rule.srcForm;
        entryRow.src_bill_id = e.bill_id;
        entryRow.src_entry_id = e.id;
        entryRow.src_rule = rule.code;
        entries.push(entryRow);
      }

      drafts.push({ header, entries });
    }

    const billIds: number[] = [];
    if (req.save) {
      await this.db.tx(async () => {
        for (const draft of drafts) {
          const bid = await this.saveSvc.save(rule.tgtForm, null, draft, 'save');
          billIds.push(bid);
        }
      });
    }

    return { tgtForm: rule.tgtForm, drafts, billIds };
  }
}
