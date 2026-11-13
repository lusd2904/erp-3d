import { Injectable } from '@nestjs/common';
import {
  BillMeta,
  ErrorCodes,
  RowError,
  toDec,
  Decimal,
} from '@erp3d/shared';
import { DbService, ident } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { BizError } from '../../common/biz-error';
import { currentUser, SYSTEM_USER } from '../../common/request-context';
import { PermService } from '../../core/perm.service';
import { CodingService } from '../../core/coding/coding.service';
import { OpLogService } from '../../core/oplog.service';
import { BillEngineRegistry } from '../bill-engine.registry';
import { BillStore } from '../store/bill-store';
import { LinkService } from './link.service';
import { WritebackService } from './writeback.service';
import type { Row, BillHookContext } from '../engine.types';
import {
  HEADER_WRITABLE_COMMON,
  ENTRY_WRITABLE_COMMON,
  ENTRY_SRC_COLS,
  coerceValue,
  isEmpty,
  fieldOf,
  nowStr,
  todayStr,
  computeLockedFields,
} from '../meta/meta-util';

function isValueDiff(f: any, a: unknown, b: unknown): boolean {
  if ((a === null || a === undefined || a === '') && (b === null || b === undefined || b === '')) {
    return false;
  }
  if (a === null || a === undefined || a === '' || b === null || b === undefined || b === '') {
    return true;
  }
  const isNumeric = f && ['decimal', 'qty', 'price', 'amount', 'rate'].includes(f.type);
  if (isNumeric) {
    try {
      return !toDec(a).eq(toDec(b));
    } catch {
      return String(a) !== String(b);
    }
  }
  return String(a) !== String(b);
}

/**
 * 校验单据必录字段。
 */
export function validateRequired(meta: BillMeta, header: Row, entries: Row[]): RowError[] {
  const errors: RowError[] = [];
  for (const f of meta.header) {
    if (f.required && isEmpty(f, header[f.key])) {
      errors.push({ entity: 'header', field: f.key, msg: `${f.name}必录` });
    }
  }

  if (meta.entry) {
    entries.forEach((e, idx) => {
      const lineNo = e.line_no ?? idx + 1;
      for (const f of meta.entry!.fields) {
        if (f.required && isEmpty(f, e[f.key])) {
          errors.push({ entity: 'entry', row: lineNo, field: f.key, msg: `${f.name}必录` });
        }
      }
      if (meta.entry!.children) {
        for (const child of meta.entry!.children) {
          const childRows = Array.isArray(e[child.key]) ? e[child.key] : [];
          childRows.forEach((cr: Row, cIdx: number) => {
            const seq = cr.seq ?? cIdx + 1;
            for (const cf of child.fields) {
              if (cf.required && isEmpty(cf, cr[cf.key])) {
                errors.push({
                  entity: child.key,
                  row: lineNo,
                  field: cf.key,
                  msg: `${child.name}第${seq}行${cf.name}必录`,
                });
              }
            }
          });
        }
      }
    });
  }
  return errors;
}

/**
 * 单据保存服务：处理新增、暂存、修改保存、清洗、权限控制、状态锁、版本乐观锁与链路反写。
 */
@Injectable()
export class BillSaveService {
  constructor(
    private readonly db: DbService,
    private readonly registry: BillEngineRegistry,
    private readonly store: BillStore,
    private readonly perm: PermService,
    private readonly coding: CodingService,
    private readonly link: LinkService,
    private readonly writeback: WritebackService,
    private readonly oplog: OpLogService,
  ) {}

  /**
   * 暴露公开校验方法，供审核提交复用。
   */
  validateRequired(meta: BillMeta, header: Row, entries: Row[]): RowError[] {
    return validateRequired(meta, header, entries);
  }

  /**
   * 保存或暂存单据（自动加入或开启事务）。
   */
  async save(
    form: string,
    id: number | null,
    body: { header?: Row; entries?: Row[]; version?: number },
    mode: 'draft' | 'save' = 'save',
  ): Promise<number> {
    return this.db.tx(async () => {
      const user = currentUser() ?? SYSTEM_USER;
      const reg = this.registry.get(form);
      const meta = reg.meta;

      let old: Row | undefined;
      if (!id) {
        await this.perm.assert(user, form, 'new', meta.name);
      } else {
        await this.perm.assert(user, form, 'edit', meta.name);
        old = await this.store.mustHeader(form, id, { forUpdate: true });
        if (body.version === undefined || body.version === null) {
          throw new BizError(ErrorCodes.SYS_VALIDATION, '缺少 version');
        }
        if (Number(old.version) !== Number(body.version)) {
          throw new BizError(ErrorCodes.BIZ_VERSION_CONFLICT, '单据已被他人修改，请刷新后重试');
        }

        // 状态校验
        if (old.cancel_status === 'B' || old.close_status === 'B') {
          throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, '已作废或已关闭的单据不允许修改');
        }
        if (mode === 'draft' && old.status !== 'DRAFT') {
          throw new BizError(ErrorCodes.BIZ_STATE_NOT_ALLOWED, '只有暂存状态的单据可以暂存');
        }
        if (meta.options?.sod?.editByCreatorOnly && old.creator_id && Number(old.creator_id) !== user.id) {
          throw new BizError(ErrorCodes.BIZ_SOD_VIOLATION, '只有制单人可以修改本单据');
        }
      }

      // 字段权限清洗
      const fp = await this.perm.fieldPerms(user, form);
      const cleanedHeader: Row = {};
      const rawHeader = body.header ?? {};

      // 表头只接受公共可写列 + 元数据非 readonly 且不在只读权限列表的键
      const allowedHeaderKeys = new Set<string>();
      for (const k of HEADER_WRITABLE_COMMON) allowedHeaderKeys.add(k);
      for (const f of meta.header) {
        if (!f.readonly && !fp.readonly.has(`header.${f.key}`) && !fp.readonly.has(f.key)) {
          allowedHeaderKeys.add(f.key);
        }
      }

      for (const k of allowedHeaderKeys) {
        if (rawHeader[k] !== undefined) {
          const f = fieldOf(meta, 'header', k);
          cleanedHeader[k] = coerceValue(f, k, rawHeader[k]);
        }
      }

      // 分录字段清洗
      const allowedEntryKeys = new Set<string>();
      for (const k of ENTRY_WRITABLE_COMMON) allowedEntryKeys.add(k);
      if (meta.entry) {
        for (const f of meta.entry.fields) {
          if (!f.readonly && !fp.readonly.has(`entry.${f.key}`) && !fp.readonly.has(f.key)) {
            allowedEntryKeys.add(f.key);
          }
        }
      }

      let oldEntries: Row[] = [];
      const oldEntriesMap = new Map<number, Row>();
      if (id) {
        oldEntries = await this.store.entries(form, id);
        for (const oe of oldEntries) {
          oldEntriesMap.set(Number(oe.id), oe);
        }
      }

      let cleanedEntries: Row[] = [];
      if (body.entries !== undefined) {
        cleanedEntries = body.entries.map((rawEntry) => {
          const isExisting = rawEntry.id && oldEntriesMap.has(Number(rawEntry.id));
          const cleanedRow: Row = {};
          if (rawEntry.id) cleanedRow.id = Number(rawEntry.id);

          for (const k of allowedEntryKeys) {
            if (rawEntry[k] !== undefined) {
              const f = fieldOf(meta, 'entry', k);
              cleanedRow[k] = coerceValue(f, k, rawEntry[k]);
            }
          }

          // 新增行额外接受来源单据字段
          if (!isExisting) {
            for (const sc of ENTRY_SRC_COLS) {
              if (rawEntry[sc] !== undefined) {
                cleanedRow[sc] = rawEntry[sc] !== null ? String(rawEntry[sc]) : null;
              }
            }
          } else {
            const oldRow = oldEntriesMap.get(Number(rawEntry.id))!;
            for (const sc of ENTRY_SRC_COLS) {
              cleanedRow[sc] = oldRow[sc];
            }
          }

          // 子分录清洗
          if (meta.entry?.children) {
            for (const child of meta.entry.children) {
              if (rawEntry[child.key] !== undefined && Array.isArray(rawEntry[child.key])) {
                cleanedRow[child.key] = rawEntry[child.key].map((rc: Row, cIdx: number) => {
                  const cleanedChild: Row = {};
                  if (rc.id) cleanedChild.id = Number(rc.id);
                  cleanedChild.seq = rc.seq ? Number(rc.seq) : cIdx + 1;
                  for (const cf of child.fields) {
                    if (rc[cf.key] !== undefined) {
                      cleanedChild[cf.key] = coerceValue(cf, cf.key, rc[cf.key]);
                    }
                  }
                  return cleanedChild;
                });
              }
            }
          }
          return cleanedRow;
        });
      }

      // 修改时的字段锁定检查
      if (id && old) {
        const locked = computeLockedFields(meta, reg.sm, old, fp);
        const lockErrors: RowError[] = [];

        if (locked.header === '*') {
          for (const k of Object.keys(cleanedHeader)) {
            const f = fieldOf(meta, 'header', k);
            const oldV = coerceValue(f, k, old[k]);
            const newV = cleanedHeader[k];
            if (isValueDiff(f, oldV, newV)) {
              lockErrors.push({ entity: 'header', field: k, msg: '当前状态不允许修改' });
            }
          }
        } else if (Array.isArray(locked.header)) {
          for (const k of locked.header) {
            if (cleanedHeader[k] !== undefined) {
              const f = fieldOf(meta, 'header', k);
              const oldV = coerceValue(f, k, old[k]);
              const newV = cleanedHeader[k];
              if (isValueDiff(f, oldV, newV)) {
                lockErrors.push({ entity: 'header', field: k, msg: '当前状态不允许修改' });
              }
            }
          }
        }

        if (body.entries !== undefined) {
          if (locked.entry === '*') {
            if (body.entries.length !== oldEntries.length) {
              lockErrors.push({ entity: 'entry', msg: '当前状态不允许增删分录' });
            } else {
              for (let i = 0; i < oldEntries.length; i++) {
                const oldE = oldEntries[i];
                const newE = cleanedEntries[i];
                for (const k of Object.keys(newE)) {
                  if (k === 'id' || k === 'bill_id' || k === 'line_no') continue;
                  const f = fieldOf(meta, 'entry', k);
                  const oldV = coerceValue(f, k, oldE[k]);
                  const newV = newE[k];
                  if (isValueDiff(f, oldV, newV)) {
                    lockErrors.push({ entity: 'entry', row: i + 1, field: k, msg: '当前状态不允许修改分录' });
                  }
                }
              }
            }
          } else if (Array.isArray(locked.entry)) {
            for (let i = 0; i < cleanedEntries.length; i++) {
              const newE = cleanedEntries[i];
              const oldE = oldEntries.find((oe) => oe.id && Number(oe.id) === Number(newE.id));
              if (oldE) {
                for (const k of locked.entry) {
                  if (newE[k] !== undefined) {
                    const f = fieldOf(meta, 'entry', k);
                    const oldV = coerceValue(f, k, oldE[k]);
                    const newV = newE[k];
                    if (isValueDiff(f, oldV, newV)) {
                      lockErrors.push({ entity: 'entry', row: i + 1, field: k, msg: '当前状态不允许修改该分录字段' });
                    }
                  }
                }
              }
            }
          }
        }

        if (lockErrors.length > 0) {
          throw new BizError(ErrorCodes.BIZ_FIELD_LOCKED, '当前状态下部分字段不允许修改', { errors: lockErrors });
        }
      }

      // 数据组装
      const billId = id ?? nextId();
      let finalHeader: Row;
      if (!id) {
        finalHeader = {
          ...cleanedHeader,
          id: billId,
          org_id: cleanedHeader.org_id ?? user.orgId,
          status: mode === 'draft' ? 'DRAFT' : 'CREATED',
          creator_id: user.id,
          bill_date: cleanedHeader.bill_date ?? todayStr(),
        };
      } else {
        const newStatus = old!.status === 'DRAFT' && mode === 'save' ? 'CREATED' : old!.status;
        finalHeader = {
          ...old,
          ...cleanedHeader,
          status: newStatus,
        };
      }

      let finalEntries: Row[];
      if (id && body.entries === undefined) {
        finalEntries = oldEntries;
      } else {
        finalEntries = cleanedEntries.map((e, idx) => {
          const lineNo = idx + 1;
          const isNew = !e.id || !oldEntriesMap.has(Number(e.id));
          const entryId = isNew ? nextId() : Number(e.id);
          const oldE = isNew ? null : oldEntriesMap.get(Number(e.id));
          const rowStatusInitial = reg.sm.rowStatus?.initial;

          let baseQty = e.base_qty;
          const qty = e.qty;
          if (
            (baseQty === null || baseQty === undefined || toDec(baseQty).isZero()) &&
            qty !== undefined &&
            !toDec(qty).isZero()
          ) {
            baseQty = toDec(qty).toFixed();
          }

          const assembled: Row = {
            ...(oldE ?? {}),
            ...e,
            id: entryId,
            bill_id: billId,
            line_no: lineNo,
            base_qty: baseQty !== undefined ? toDec(baseQty).toFixed() : isNew ? '0' : oldE?.base_qty,
            biz_close: isNew ? 'A' : oldE?.biz_close ?? 'A',
            biz_freeze: isNew ? 'A' : oldE?.biz_freeze ?? 'A',
            biz_terminate: isNew ? 'A' : oldE?.biz_terminate ?? 'A',
            ...(isNew && reg.sm.rowStatus?.field ? { [reg.sm.rowStatus.field]: rowStatusInitial } : {}),
          };

          // 递归组装子分录
          if (meta.entry?.children) {
            for (const child of meta.entry.children) {
              if (e[child.key] !== undefined && Array.isArray(e[child.key])) {
                const oldChildren = oldE?.[child.key] ?? [];
                const oldChildMap = new Map(oldChildren.map((c: Row) => [Number(c.id), c]));
                assembled[child.key] = e[child.key].map((cr: Row, cIdx: number) => {
                  const isChildNew = !cr.id || !oldChildMap.has(Number(cr.id));
                  return {
                    ...(isChildNew ? {} : (oldChildMap.get(Number(cr.id)) ?? {})),
                    ...cr,
                    id: isChildNew ? nextId() : Number(cr.id),
                    bill_id: billId,
                    entry_id: entryId,
                    seq: cIdx + 1,
                  };
                });
              } else if (oldE) {
                assembled[child.key] = oldE[child.key] ?? [];
              } else {
                assembled[child.key] = [];
              }
            }
          }
          return assembled;
        });
      }

      // 自动分配单据编码
      if (!finalHeader.bill_no) {
        finalHeader.bill_no = await this.coding.generate(form, finalHeader, finalHeader.bill_type_id);
      }

      // 保存前业务钩子
      const hookCtx: BillHookContext = {
        form,
        billId,
        header: finalHeader,
        entries: finalEntries,
        user,
        db: this.db,
        op: 'save',
      };
      await reg.hooks.beforeOp?.('save', hookCtx);
      await reg.hooks.beforeSave?.(hookCtx, mode);

      finalHeader = hookCtx.header;
      finalEntries = hookCtx.entries;

      // 必录与唯一校验
      if (mode === 'save') {
        const reqErrors = this.validateRequired(meta, finalHeader, finalEntries);
        if (reqErrors.length > 0) {
          throw new BizError(ErrorCodes.BIZ_REQUIRED, '必录项未填写', { errors: reqErrors });
        }
        for (const f of meta.header) {
          if (f.unique && finalHeader[f.key] !== undefined && finalHeader[f.key] !== null && finalHeader[f.key] !== '') {
            const dup = await this.db.one(
              `SELECT id FROM ${ident(meta.table)} WHERE org_id = ? AND ${ident(f.key)} = ? AND id <> ? LIMIT 1`,
              [finalHeader.org_id, finalHeader[f.key], billId],
            );
            if (dup) {
              throw new BizError(ErrorCodes.BIZ_DUPLICATE, `${f.name}「${finalHeader[f.key]}」在组织内已存在`);
            }
          }
        }
      }

      // 写库持久化
      if (!id) {
        await this.store.insertRow(meta.table, finalHeader);
      } else {
        const patch = {
          ...finalHeader,
          modifier_id: user.id,
          modified_at: nowStr(),
          version: Number(old!.version) + 1,
        };
        const affected = await this.store.updateRow(meta.table, billId, patch, {
          sql: 'version = ?',
          params: [old!.version],
        });
        if (affected === 0) {
          throw new BizError(ErrorCodes.BIZ_VERSION_CONFLICT, '单据已被他人修改，请刷新后重试');
        }
      }

      // 分录及子分录持久化
      if (meta.entry) {
        const entryTable = meta.entry.table;
        if (id) {
          const currentEntryIds = new Set(finalEntries.map((e) => Number(e.id)));
          const deletedEntries = oldEntries.filter((oe) => !currentEntryIds.has(Number(oe.id)));
          if (deletedEntries.length > 0) {
            const delIds = deletedEntries.map((oe) => Number(oe.id));
            if (meta.entry.children) {
              for (const child of meta.entry.children) {
                await this.db.exec(
                  `DELETE FROM ${ident(child.table)} WHERE entry_id IN (${delIds.map(() => '?').join(',')})`,
                  delIds,
                );
              }
            }
            await this.db.exec(
              `DELETE FROM ${ident(entryTable)} WHERE id IN (${delIds.map(() => '?').join(',')})`,
              delIds,
            );
          }
        }

        for (const e of finalEntries) {
          const isExisting = id && oldEntriesMap.has(Number(e.id));
          const rowToSave = { ...e };
          if (meta.entry.children) {
            for (const child of meta.entry.children) {
              delete rowToSave[child.key];
            }
          }

          if (isExisting) {
            await this.store.updateRow(entryTable, e.id, rowToSave);
          } else {
            await this.store.insertRow(entryTable, rowToSave);
          }

          // 子分录落库
          if (meta.entry.children) {
            for (const child of meta.entry.children) {
              const childTable = child.table;
              const childRows: Row[] = Array.isArray(e[child.key]) ? e[child.key] : [];
              const oldChildren: Row[] = isExisting ? oldEntriesMap.get(Number(e.id))?.[child.key] ?? [] : [];
              const curChildIds = new Set(childRows.map((cr: Row) => Number(cr.id)));
              const delChildren = oldChildren.filter((oc) => !curChildIds.has(Number(oc.id)));

              if (delChildren.length > 0) {
                const delCIds = delChildren.map((oc) => Number(oc.id));
                await this.db.exec(
                  `DELETE FROM ${ident(childTable)} WHERE id IN (${delCIds.map(() => '?').join(',')})`,
                  delCIds,
                );
              }

              for (const cr of childRows) {
                const isChildExisting = isExisting && oldChildren.some((oc) => Number(oc.id) === Number(cr.id));
                if (isChildExisting) {
                  await this.store.updateRow(childTable, cr.id, cr);
                } else {
                  await this.store.insertRow(childTable, cr);
                }
              }
            }
          }
        }
      }

      // 重建链路关联
      await this.link.rebuildForTarget(form, billId);

      // 保存期反写
      if (
        finalHeader.status !== 'DRAFT' &&
        finalHeader.cancel_status === 'A' &&
        (finalHeader.status === 'CREATED' || finalHeader.status === 'REAUDIT')
      ) {
        await this.writeback.reverse(form, billId, 'save');
        await this.writeback.apply(form, billId, 'save');
      }

      // 保存后业务钩子与日志
      hookCtx.entries = await this.store.entries(form, billId);
      await reg.hooks.afterSave?.(hookCtx, mode);
      await reg.hooks.afterOp?.('save', hookCtx);

      await this.oplog.log({
        objectCode: form,
        subsystem: meta.subsystem,
        op: mode === 'draft' ? '暂存' : '保存',
        billId,
        billNo: finalHeader.bill_no,
      });

      return billId;
    });
  }
}
