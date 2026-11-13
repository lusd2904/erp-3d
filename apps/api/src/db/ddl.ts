/**
 * 幂等 DDL 工具：迁移脚本只用这些函数建表 / 加列 / 加索引，重复执行安全。
 * MySQL 8 不支持 ADD COLUMN IF NOT EXISTS，这里查 information_schema 判断。
 */
import type { QueryRunner } from 'typeorm';
import type { BillMeta, EntityMeta, FieldMeta } from '@erp3d/shared';

export interface ColumnDef {
  name: string;
  def: string; // 例如 'VARCHAR(50) NOT NULL'
}
export interface IndexDef {
  name: string;
  cols: string[];
  unique?: boolean;
}
export interface TableDef {
  name: string;
  comment: string;
  columns: ColumnDef[];
  indexes?: IndexDef[];
  /** 主键列，默认 id */
  pk?: string[];
}

export const c = (name: string, def: string): ColumnDef => ({ name, def });
export const idx = (name: string, cols: string[], unique = false): IndexDef => ({ name, cols, unique });

type Q = Pick<QueryRunner, 'query'>;

async function existingColumns(qr: Q, table: string): Promise<Set<string>> {
  const rows: any[] = await qr.query(
    'SELECT COLUMN_NAME AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table],
  );
  return new Set(rows.map((r) => r.n));
}

async function existingIndexes(qr: Q, table: string): Promise<Set<string>> {
  const rows: any[] = await qr.query(
    'SELECT DISTINCT INDEX_NAME AS n FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table],
  );
  return new Set(rows.map((r) => r.n));
}

export async function tableExists(qr: Q, table: string): Promise<boolean> {
  const rows: any[] = await qr.query(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?',
    [table],
  );
  return rows.length > 0;
}

/** 建表；表已存在时补齐缺少的列和索引（不删列、不改列类型） */
export async function ensureTable(qr: Q, t: TableDef): Promise<void> {
  const pk = t.pk ?? ['id'];
  if (!(await tableExists(qr, t.name))) {
    const parts = t.columns.map((col) => `\`${col.name}\` ${col.def}`);
    parts.push(`PRIMARY KEY (${pk.map((p) => `\`${p}\``).join(', ')})`);
    for (const i of t.indexes ?? []) {
      parts.push(`${i.unique ? 'UNIQUE ' : ''}KEY \`${i.name}\` (${i.cols.map((x) => `\`${x}\``).join(', ')})`);
    }
    await qr.query(
      `CREATE TABLE IF NOT EXISTS \`${t.name}\` (\n  ${parts.join(',\n  ')}\n) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT=${quote(t.comment)}`,
    );
    return;
  }
  const cols = await existingColumns(qr, t.name);
  for (const col of t.columns) {
    if (!cols.has(col.name)) await qr.query(`ALTER TABLE \`${t.name}\` ADD COLUMN \`${col.name}\` ${col.def}`);
  }
  const idxs = await existingIndexes(qr, t.name);
  for (const i of t.indexes ?? []) {
    if (!idxs.has(i.name)) {
      await qr.query(
        `ALTER TABLE \`${t.name}\` ADD ${i.unique ? 'UNIQUE ' : ''}INDEX \`${i.name}\` (${i.cols.map((x) => `\`${x}\``).join(', ')})`,
      );
    }
  }
}

export async function addColumnIfMissing(qr: Q, table: string, col: ColumnDef) {
  const cols = await existingColumns(qr, table);
  if (!cols.has(col.name)) await qr.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col.name}\` ${col.def}`);
}

export async function addIndexIfMissing(qr: Q, table: string, i: IndexDef) {
  const idxs = await existingIndexes(qr, table);
  if (!idxs.has(i.name)) {
    await qr.query(`ALTER TABLE \`${table}\` ADD ${i.unique ? 'UNIQUE ' : ''}INDEX \`${i.name}\` (${i.cols.map((x) => `\`${x}\``).join(', ')})`);
  }
}

export function quote(s: string): string {
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

/** 幂等写入种子数据：按唯一键 INSERT ... ON DUPLICATE KEY UPDATE（update 为空时只插入不覆盖） */
export async function upsert(qr: Q, table: string, rows: Record<string, unknown>[], updateCols: string[] = []) {
  for (const row of rows) {
    const keys = Object.keys(row);
    const sql =
      `INSERT INTO \`${table}\` (${keys.map((k) => `\`${k}\``).join(', ')}) VALUES (${keys.map(() => '?').join(', ')}) ` +
      `ON DUPLICATE KEY UPDATE ${updateCols.length ? updateCols.map((k) => `\`${k}\` = VALUES(\`${k}\`)`).join(', ') : `\`${keys[0]}\` = \`${keys[0]}\``}`;
    await qr.query(
      sql,
      keys.map((k) => {
        const v = row[k];
        return v !== null && typeof v === 'object' && !(v instanceof Date) ? JSON.stringify(v) : v;
      }),
    );
  }
}

// ---------- 单据表：由元数据生成 ----------

const DEC = 'DECIMAL(23,10)';

export function columnSql(f: FieldMeta): string {
  const numeric = ['decimal', 'qty', 'price', 'amount', 'rate'].includes(f.type);
  const base: Record<string, string> = {
    string: `VARCHAR(${f.length ?? 100})`,
    text: 'TEXT',
    int: 'INT',
    bigint: 'BIGINT',
    ref: 'BIGINT',
    decimal: DEC, qty: DEC, price: DEC, amount: DEC, rate: DEC,
    date: 'DATE',
    datetime: 'DATETIME(3)',
    bool: 'TINYINT(1)',
    enum: `VARCHAR(${f.length ?? 20})`,
    json: 'JSON',
  };
  let def = base[f.type];
  if (!def) throw new Error(`未知字段类型 ${(f as any).type}`);
  const hasDefault = f.default !== undefined && f.default !== null && !['text', 'json'].includes(f.type);
  if (hasDefault) {
    const dv = typeof f.default === 'boolean' ? (f.default ? '1' : '0') : quote(String(f.default));
    def += numeric || f.type === 'bool' ? ` NOT NULL DEFAULT ${dv}` : ` NULL DEFAULT ${dv}`;
  } else if (numeric || f.type === 'bool') {
    def += ' NOT NULL DEFAULT 0';
  } else {
    def += ' NULL';
  }
  return def + ` COMMENT ${quote(f.name)}`;
}

export function headerCommonColumns(financeReserved: boolean): ColumnDef[] {
  const cols = [
    c('id', "BIGINT NOT NULL COMMENT 'id(雪花)'"),
    c('org_id', "BIGINT NOT NULL DEFAULT 1 COMMENT '组织'"),
    c('bill_no', "VARCHAR(50) NOT NULL COMMENT '单据编号'"),
    c('bill_type_id', "BIGINT NULL COMMENT '单据类型'"),
    c('bill_date', "DATE NULL COMMENT '单据日期'"),
    c('biz_date', "DATE NULL COMMENT '业务日期'"),
    c('status', "VARCHAR(10) NOT NULL DEFAULT 'DRAFT' COMMENT '单据状态 DRAFT/CREATED/AUDITING/AUDITED/REAUDIT'"),
    c('close_status', "CHAR(1) NOT NULL DEFAULT 'A' COMMENT '关闭 A正常 B关闭'"),
    c('cancel_status', "CHAR(1) NOT NULL DEFAULT 'A' COMMENT '作废 A正常 B作废'"),
    c('forbid_status', "CHAR(1) NOT NULL DEFAULT 'A' COMMENT '禁用 A启用 B禁用'"),
    c('wf_instance_id', "BIGINT NULL COMMENT '审批流实例'"),
    c('creator_id', "BIGINT NULL COMMENT '创建人'"),
    c('created_at', "DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) COMMENT '创建时间'"),
    c('modifier_id', "BIGINT NULL COMMENT '修改人'"),
    c('modified_at', "DATETIME(3) NULL COMMENT '修改时间'"),
    c('auditor_id', "BIGINT NULL COMMENT '审核人'"),
    c('audited_at', "DATETIME(3) NULL COMMENT '审核时间'"),
    c('closer_id', "BIGINT NULL COMMENT '关闭人'"),
    c('closed_at', "DATETIME(3) NULL COMMENT '关闭时间'"),
    c('canceller_id', "BIGINT NULL COMMENT '作废人'"),
    c('cancelled_at', "DATETIME(3) NULL COMMENT '作废时间'"),
    c('cancel_prev_status', "VARCHAR(10) NULL COMMENT '作废前状态'"),
    c('remark', "VARCHAR(500) NULL COMMENT '备注'"),
    c('src_system', "VARCHAR(30) NULL COMMENT '来源系统(迁移/集成)'"),
    c('version', "INT NOT NULL DEFAULT 0 COMMENT '乐观锁版本'"),
  ];
  if (financeReserved) {
    cols.push(
      c('acct_org_id', "BIGINT NULL COMMENT '核算组织(财务预留)'"),
      c('currency_id', "BIGINT NULL COMMENT '币别(财务预留)'"),
      c('owner_type', "VARCHAR(20) NULL COMMENT '货主类型(财务预留)'"),
      c('owner_id', "BIGINT NULL COMMENT '货主(财务预留)'"),
      c('settle_org_id', "BIGINT NULL COMMENT '结算组织(财务预留)'"),
      c('cost_center_id', "BIGINT NULL COMMENT '成本中心(财务预留)'"),
      c('stock_category_id', "BIGINT NULL COMMENT '存货类别(财务预留)'"),
      c('io_direction', "VARCHAR(10) NULL COMMENT '出入库方向(财务预留)'"),
      c('ar_ap_generated', "TINYINT(1) NOT NULL DEFAULT 0 COMMENT '已生成应收应付(财务预留)'"),
      c('budget_org_id', "BIGINT NULL COMMENT '预算组织(财务预留)'"),
    );
  }
  return cols;
}

export function entryCommonColumns(): ColumnDef[] {
  return [
    c('id', "BIGINT NOT NULL COMMENT 'id'"),
    c('bill_id', "BIGINT NOT NULL COMMENT '单据头id'"),
    c('line_no', "INT NOT NULL COMMENT '行号'"),
    c('material_id', "BIGINT NULL COMMENT '物料'"),
    c('aux_prop_id', "BIGINT NULL COMMENT '辅助属性'"),
    c('unit_id', "BIGINT NULL COMMENT '单位'"),
    c('qty', `${DEC} NOT NULL DEFAULT 0 COMMENT '数量'`),
    c('base_unit_id', "BIGINT NULL COMMENT '基本单位'"),
    c('base_qty', `${DEC} NOT NULL DEFAULT 0 COMMENT '基本单位数量'`),
    c('lot_no', "VARCHAR(64) NULL COMMENT '批号'"),
    c('mto_no', "VARCHAR(64) NULL COMMENT '计划跟踪号'"),
    c('src_form', "VARCHAR(50) NULL COMMENT '源单对象'"),
    c('src_bill_id', "BIGINT NULL COMMENT '源单id'"),
    c('src_entry_id', "BIGINT NULL COMMENT '源单分录id'"),
    c('src_rule', "VARCHAR(80) NULL COMMENT '转换规则'"),
    c('biz_close', "CHAR(1) NOT NULL DEFAULT 'A' COMMENT '业务关闭 A/B'"),
    c('biz_freeze', "CHAR(1) NOT NULL DEFAULT 'A' COMMENT '业务冻结 A/B'"),
    c('biz_terminate', "CHAR(1) NOT NULL DEFAULT 'A' COMMENT '业务终止 A/B'"),
  ];
}

function fieldIndexes(table: string, fields: FieldMeta[]): IndexDef[] {
  return fields.filter((f) => f.index || f.type === 'ref').map((f) => idx(`ix_${f.key}`, [f.key]));
}

export function billTableDefs(meta: BillMeta): TableDef[] {
  const defs: TableDef[] = [];
  const headerCols = [...headerCommonColumns(!!meta.options?.financeReserved)];
  const commonNames = new Set(headerCols.map((x) => x.name));
  for (const f of meta.header) if (!commonNames.has(f.key)) headerCols.push(c(f.key, columnSql(f)));
  defs.push({
    name: meta.table,
    comment: meta.name,
    columns: headerCols,
    indexes: [
      idx('uk_org_bill_no', ['org_id', 'bill_no'], true),
      idx('ix_status', ['status']),
      idx('ix_bill_date', ['bill_date']),
      idx('ix_creator', ['creator_id']),
      ...fieldIndexes(meta.table, meta.header.filter((f) => !commonNames.has(f.key))),
    ],
  });
  if (meta.entry) defs.push(...entityDefs(meta.entry, false));
  return defs;
}

function entityDefs(e: EntityMeta, isChild: boolean): TableDef[] {
  const out: TableDef[] = [];
  const cols = isChild
    ? [
        c('id', "BIGINT NOT NULL COMMENT 'id'"),
        c('bill_id', "BIGINT NOT NULL COMMENT '单据头id'"),
        c('entry_id', "BIGINT NOT NULL COMMENT '分录id'"),
        c('seq', "INT NOT NULL DEFAULT 0 COMMENT '序号'"),
      ]
    : entryCommonColumns();
  const names = new Set(cols.map((x) => x.name));
  if (e.rowStatusField && !names.has(e.rowStatusField)) {
    cols.push(c(e.rowStatusField, "VARCHAR(20) NULL COMMENT '行业务状态'"));
    names.add(e.rowStatusField);
  }
  for (const f of e.fields) if (!names.has(f.key)) cols.push(c(f.key, columnSql(f)));
  const indexes = isChild
    ? [idx('ix_bill', ['bill_id']), idx('ix_entry', ['entry_id'])]
    : [idx('ix_bill', ['bill_id']), idx('ix_material', ['material_id']), idx('ix_src_entry', ['src_entry_id'])];
  if (e.rowStatusField) indexes.push(idx('ix_row_status', [e.rowStatusField]));
  out.push({ name: e.table, comment: e.name, columns: cols, indexes: [...indexes, ...fieldIndexes(e.table, e.fields.filter((f) => !['material_id', 'unit_id', 'base_unit_id', 'aux_prop_id', 'src_bill_id', 'src_entry_id'].includes(f.key)))] });
  for (const ch of e.children ?? []) out.push(...entityDefs(ch, true));
  return out;
}

/** 按元数据建单据表（头、分录、子分录），幂等 */
export async function ensureBillTables(qr: Q, meta: BillMeta) {
  for (const t of billTableDefs(meta)) await ensureTable(qr, t);
}
