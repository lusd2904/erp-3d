import {
  BillMeta,
  BillStatusCode,
  CHILD_COMMON_COLUMNS,
  ENTRY_COMMON_COLUMNS,
  EntityMeta,
  ErrorCodes,
  FieldLockRule,
  FieldMeta,
  FINANCE_RESERVED_COLUMNS,
  HEADER_COMMON_COLUMNS,
  StateMachineConfig,
  toDec,
} from '@erp3d/shared';
import { BizError } from '../../common/biz-error';
import type { Row } from '../engine.types';

/** 表头系统只读列 */
export const HEADER_SYS_READONLY = [
  'id',
  'status',
  'close_status',
  'cancel_status',
  'forbid_status',
  'wf_instance_id',
  'creator_id',
  'created_at',
  'modifier_id',
  'modified_at',
  'auditor_id',
  'audited_at',
  'closer_id',
  'closed_at',
  'canceller_id',
  'cancelled_at',
  'cancel_prev_status',
  'src_system',
  'version',
] as const;

/** 表头公共可写列 */
export const HEADER_WRITABLE_COMMON = [
  'org_id',
  'bill_no',
  'bill_type_id',
  'bill_date',
  'biz_date',
  'remark',
] as const;

/** 分录公共可写列 */
export const ENTRY_WRITABLE_COMMON = [
  'material_id',
  'aux_prop_id',
  'unit_id',
  'qty',
  'base_unit_id',
  'base_qty',
  'lot_no',
  'mto_no',
] as const;

/** 分录来源追踪列（只在新增分录时接受） */
export const ENTRY_SRC_COLS = [
  'src_form',
  'src_bill_id',
  'src_entry_id',
  'src_rule',
] as const;

/** 分录系统只读列 */
export const ENTRY_SYS_READONLY = [
  'id',
  'bill_id',
  'line_no',
  'biz_close',
  'biz_freeze',
  'biz_terminate',
] as const;

/**
 * 获取单据头表全量列名（按顺序去重）
 */
export function headerColumns(meta: BillMeta): string[] {
  const common: string[] = [...HEADER_COMMON_COLUMNS];
  if (meta.options?.financeReserved) {
    common.push(...FINANCE_RESERVED_COLUMNS);
  }
  const custom = meta.header.map((f) => f.key);
  return Array.from(new Set([...common, ...custom]));
}

/**
 * 获取主分录表全量列名（按顺序去重）
 */
export function entryColumns(e: EntityMeta): string[] {
  const common: string[] = [...ENTRY_COMMON_COLUMNS];
  if (e.rowStatusField) {
    common.push(e.rowStatusField);
  }
  const custom = e.fields.map((f) => f.key);
  return Array.from(new Set([...common, ...custom]));
}

/**
 * 获取子分录表全量列名（按顺序去重）
 */
export function childColumns(c: EntityMeta): string[] {
  const common: string[] = [...CHILD_COMMON_COLUMNS];
  const custom = c.fields.map((f) => f.key);
  return Array.from(new Set([...common, ...custom]));
}

/**
 * 查找指定实体上的字段元数据定义
 */
export function fieldOf(
  meta: BillMeta,
  entity: 'header' | 'entry' | string,
  key: string,
): FieldMeta | undefined {
  if (entity === 'header') {
    return meta.header.find((f) => f.key === key);
  }
  if (entity === 'entry') {
    return meta.entry?.fields.find((f) => f.key === key);
  }
  return meta.entry?.children?.find((ch) => ch.key === entity)?.fields.find((f) => f.key === key);
}

/** 高精度数值类型集合 */
export const numericTypes = new Set<string>(['decimal', 'qty', 'price', 'amount', 'rate']);

/**
 * 获取当前本地格式化时间字符串 ('YYYY-MM-DD HH:mm:ss.SSS')
 */
export function nowStr(d: Date = new Date()): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const date = pad(d.getDate());
  const hours = pad(d.getHours());
  const minutes = pad(d.getMinutes());
  const seconds = pad(d.getSeconds());
  const ms = pad(d.getMilliseconds(), 3);
  return `${year}-${month}-${date} ${hours}:${minutes}:${seconds}.${ms}`;
}

/**
 * 获取当前本地格式化日期字符串 ('YYYY-MM-DD')
 */
export function todayStr(d: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getFullYear();
  const month = pad(d.getMonth() + 1);
  const date = pad(d.getDate());
  return `${year}-${month}-${date}`;
}

/**
 * 数据类型强制转换与清洗
 */
export function coerceValue(f: FieldMeta | undefined, key: string, v: unknown): unknown {
  if (v === null || v === undefined || v === '') {
    return null;
  }
  const isNumeric = f ? numericTypes.has(f.type) : key === 'qty' || key === 'base_qty';
  if (isNumeric) {
    try {
      return toDec(v).toFixed();
    } catch {
      throw new BizError(ErrorCodes.BIZ_FIELD_INVALID, `${f?.name ?? key} 不是有效数字`);
    }
  }
  if (f?.type === 'int') {
    const n = Math.trunc(Number(v));
    if (isNaN(n)) {
      throw new BizError(ErrorCodes.BIZ_FIELD_INVALID, `${f?.name ?? key} 不是有效整数`);
    }
    return n;
  }
  const isIdOrRef = f ? f.type === 'bigint' || f.type === 'ref' : key.endsWith('_id');
  if (isIdOrRef) {
    const n = Number(v);
    if (isNaN(n)) {
      throw new BizError(ErrorCodes.BIZ_FIELD_INVALID, `${f?.name ?? key} 不是有效整数`);
    }
    return n;
  }
  if (f?.type === 'bool') {
    return v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0;
  }
  if (f?.type === 'json') {
    return typeof v === 'string' ? v : JSON.stringify(v);
  }
  if (f?.type === 'enum') {
    const strVal = String(v);
    if (f.enum && !f.enum.some((e) => e.value === strVal)) {
      throw new BizError(ErrorCodes.BIZ_FIELD_INVALID, `${f?.name ?? key} 的值无效`);
    }
    return strVal;
  }
  if (f?.type === 'date') {
    if (v instanceof Date) return todayStr(v);
    return String(v).slice(0, 10);
  }
  if (f?.type === 'datetime') {
    if (v instanceof Date) return nowStr(v);
    return String(v).replace('T', ' ').replace('Z', '').trim();
  }
  return String(v);
}

/**
 * 校验字段值是否为空（数值 0 视为空，用于必录校验）
 */
export function isEmpty(f: FieldMeta | undefined, v: unknown): boolean {
  if (v === null || v === undefined || v === '') return true;
  if (f && numericTypes.has(f.type)) {
    try {
      return toDec(v).isZero();
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * 递归获取单据下的所有实体元数据（主分录及子分录）
 */
export function allEntityMetas(meta: BillMeta): EntityMeta[] {
  const out: EntityMeta[] = [];
  if (meta.entry) {
    out.push(meta.entry);
    for (const ch of meta.entry.children ?? []) {
      out.push(ch);
    }
  }
  return out;
}

/**
 * 计算单据运行时锁定字段列表（黑名单）
 */
export function computeLockedFields(
  meta: BillMeta,
  sm: StateMachineConfig,
  header: Row,
  fp: { readonly: Set<string> },
): { header: string[] | '*'; entry: string[] | '*' } {
  // 单据作废或关闭时整单全部字段锁定
  if (header.cancel_status === 'B' || header.close_status === 'B') {
    return { header: '*', entry: '*' };
  }

  const status = (header.status as BillStatusCode) || 'DRAFT';
  const rule: FieldLockRule = sm.fieldLock[status] ?? { header: '*', entry: '*' };

  let headerLocked: string[] | '*';
  if (Array.isArray(rule.header) && rule.header.length === 0) {
    headerLocked = '*';
  } else {
    const headerEditable = Array.from(
      new Set([...HEADER_WRITABLE_COMMON, ...meta.header.filter((f) => !f.readonly).map((f) => f.key)]),
    );
    const notInWhite = rule.header === '*' ? [] : headerEditable.filter((k) => !rule.header.includes(k));
    const metaReadonly = meta.header.filter((f) => f.readonly).map((f) => f.key);
    const permReadonly = Array.from(fp.readonly)
      .filter((k) => k.startsWith('header.'))
      .map((k) => k.replace(/^header\./, ''));

    headerLocked = Array.from(
      new Set([...notInWhite, ...metaReadonly, ...permReadonly, ...HEADER_SYS_READONLY]),
    );
  }

  let entryLocked: string[] | '*';
  if (Array.isArray(rule.entry) && rule.entry.length === 0) {
    entryLocked = '*';
  } else {
    const entryFields = meta.entry?.fields ?? [];
    const entryEditable = Array.from(
      new Set([...ENTRY_WRITABLE_COMMON, ...entryFields.filter((f) => !f.readonly).map((f) => f.key)]),
    );
    const notInWhite = rule.entry === '*' ? [] : entryEditable.filter((k) => !rule.entry.includes(k));
    const metaReadonly = entryFields.filter((f) => f.readonly).map((f) => f.key);
    const permReadonly = Array.from(fp.readonly)
      .filter((k) => k.startsWith('entry.'))
      .map((k) => k.replace(/^entry\./, ''));
    const extraAlwaysLocked = [
      ...ENTRY_SYS_READONLY,
      ...ENTRY_SRC_COLS,
      ...(meta.entry?.rowStatusField ? [meta.entry.rowStatusField] : []),
    ];

    entryLocked = Array.from(
      new Set([...notInWhite, ...metaReadonly, ...permReadonly, ...extraAlwaysLocked]),
    );
  }

  return { header: headerLocked, entry: entryLocked };
}
