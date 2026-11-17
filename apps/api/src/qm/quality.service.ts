import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { BizError } from '../common/biz-error';
import type { AuthUser } from '../common/request-context';
import { DbService } from '../db/db.service';
import { nextId } from '../db/snowflake';
import {
  GB2828_LEVEL_COLUMNS,
  type Gb2828CodeRow,
  type Gb2828Level,
  type Gb2828Strictness,
  type Gb2828TableRow,
  resolveGb2828Sample,
  validateGb2828Dataset,
} from './gb2828';

const LEVELS = Object.keys(GB2828_LEVEL_COLUMNS) as Gb2828Level[];
const STRICTNESS: Gb2828Strictness[] = ['NORMAL', 'TIGHTENED', 'REDUCED'];

interface GbImportRequest {
  version: number;
  sourceName: string;
  codeRows: Gb2828CodeRow[];
  tableRows: Gb2828TableRow[];
}

@Injectable()
export class QualityService implements OnApplicationBootstrap {
  private readonly logger = new Logger(QualityService.name);

  constructor(private readonly db: DbService) {}

  async onApplicationBootstrap(): Promise<void> {
    try {
      const installed = await this.ensureConcessionView();
      if (!installed) this.logger.log('让步接收视图等待采购入库表安装后创建');
    } catch (error) {
      this.logger.error(`创建让步接收统计视图失败: ${(error as Error).message}`);
    }
  }

  async importGb2828Dataset(input: GbImportRequest, user: AuthUser) {
    if (!Number.isSafeInteger(input.version) || input.version <= 0) {
      throw new BizError('BIZ_QM_GB2828_VERSION_INVALID', '国标数据版本必须为正整数');
    }
    if (!input.sourceName?.trim() || input.sourceName.length > 128) {
      throw new BizError('BIZ_QM_GB2828_SOURCE_INVALID', '必须填写正式标准来源标识');
    }
    if (!Array.isArray(input.codeRows) || !Array.isArray(input.tableRows) || input.codeRows.length > 2000 || input.tableRows.length > 20000) {
      throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '导入行数无效或超过上限');
    }
    validateGb2828Dataset(input.codeRows, input.tableRows);

    await this.db.tx(async () => {
      const current = await this.db.one<{ dataset_version: number }>(
        "SELECT dataset_version FROM qm_gb2828_dataset WHERE status = 'ACTIVE' FOR UPDATE",
      );
      if (current && input.version <= Number(current.dataset_version)) {
        throw new BizError('BIZ_QM_GB2828_VERSION_INVALID', '新数据集版本必须高于当前激活版本');
      }
      const existing = await this.db.one<{ id: number }>('SELECT id FROM qm_gb2828_dataset WHERE dataset_version = ? FOR UPDATE', [input.version]);
      if (existing) throw new BizError('BIZ_QM_GB2828_VERSION_EXISTS', '该国标数据版本已经导入，版本内容不可覆盖');

      await this.insertCodeRows(input.version, input.codeRows);
      await this.insertTableRows(input.version, input.tableRows);
      await this.db.exec(
        "INSERT INTO qm_gb2828_dataset (id, dataset_version, status, code_row_count, table_row_count, source_name, imported_by, imported_at) VALUES (?, ?, 'INACTIVE', ?, ?, ?, ?, NOW(3))",
        [nextId(), input.version, input.codeRows.length, input.tableRows.length, input.sourceName.trim(), user.id],
      );
      await this.db.exec("UPDATE qm_gb2828_dataset SET status = 'INACTIVE' WHERE status = 'ACTIVE'");
      await this.db.exec("UPDATE qm_gb2828_dataset SET status = 'ACTIVE' WHERE dataset_version = ? AND status = 'INACTIVE'", [input.version]);
    });

    return { version: input.version, codeRows: input.codeRows.length, tableRows: input.tableRows.length, active: true };
  }

  async calculateGb2828Sample(input: { batchQty: number; level: Gb2828Level; strictness: Gb2828Strictness; aql: number }) {
    const batchQty = Number(input.batchQty);
    const aql = Number(input.aql);
    if (!Number.isFinite(batchQty) || batchQty <= 0 || !LEVELS.includes(input.level) || !STRICTNESS.includes(input.strictness) || !Number.isFinite(aql) || aql <= 0) {
      throw new BizError('BIZ_QM_GB2828_INPUT_INVALID', '批量、检验水平、严格度或 AQL 无效');
    }
    const active = await this.db.one<{ dataset_version: number }>("SELECT dataset_version FROM qm_gb2828_dataset WHERE status = 'ACTIVE'");
    if (!active) throw new BizError('BIZ_QM_GB2828_NOT_IMPORTED', 'GB/T 2828.1 正式数据尚未导入');
    const levelColumn = GB2828_LEVEL_COLUMNS[input.level];
    const codeRow = await this.db.one<{ code: string }>(
      `SELECT \`${levelColumn}\` AS code FROM qm_gb2828_code WHERE version = ? AND ? BETWEEN batch_from AND batch_to LIMIT 1`,
      [active.dataset_version, batchQty],
    );
    if (!codeRow?.code) throw new BizError('BIZ_QM_GB2828_NO_CODE', '批量区间没有对应的样本量字码');
    const tableRows = await this.db.q<Gb2828TableRow>(
      'SELECT table_type, code, aql, sample_qty, ac, re, arrow FROM qm_gb2828_table WHERE version = ? AND table_type = ? AND aql = ? ORDER BY code',
      [active.dataset_version, input.strictness, aql],
    );
    return resolveGb2828Sample(Number(active.dataset_version), codeRow.code, input.strictness, aql, tableRows);
  }

  async concessionStatistics(query: { dateFrom?: string; dateTo?: string; materialId?: number; page?: number; size?: number }) {
    const page = Math.max(1, Math.floor(Number(query.page ?? 1)));
    const size = Math.min(500, Math.max(1, Math.floor(Number(query.size ?? 50))));
    const where: string[] = [];
    const params: unknown[] = [];
    if (query.dateFrom) { where.push('bill_date >= ?'); params.push(query.dateFrom); }
    if (query.dateTo) { where.push('bill_date < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(query.dateTo); }
    if (query.materialId) { where.push('material_id = ?'); params.push(query.materialId); }
    const filter = where.length ? ` AND ${where.join(' AND ')}` : '';
    const rows = await this.db.q<any>(
      `SELECT instock_entry_id, bill_id, bill_no, bill_date, material_id, lot_no, concession_qty, base_unit_id
         FROM v_qm_concession_stat WHERE 1 = 1${filter} ORDER BY bill_date DESC, bill_id DESC LIMIT ? OFFSET ?`,
      [...params, size, (page - 1) * size],
    );
    const total = await this.db.one<{ total: number }>(
      `SELECT COUNT(*) AS total FROM v_qm_concession_stat WHERE 1 = 1${filter}`,
      params,
    );
    return { rows, total: Number(total?.total ?? 0), page, size };
  }

  async ensureConcessionView(): Promise<boolean> {
    const tables = await this.db.q<{ table_name: string }>(
      `SELECT TABLE_NAME AS table_name FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE' AND TABLE_NAME IN (?, ?)`,
      ['scm_pur_instock', 'scm_pur_instock_entry'],
    );
    if (tables.length !== 2) return false;
    await this.db.exec(`CREATE OR REPLACE VIEW v_qm_concession_stat AS
      SELECT t.id AS instock_entry_id, h.id AS bill_id, h.bill_no, h.bill_date,
             t.material_id, t.lot_no, t.base_qty AS concession_qty, t.base_unit_id, t.in_type AS decision
        FROM scm_pur_instock_entry t
        JOIN scm_pur_instock h ON h.id = t.bill_id
       WHERE h.status = 'AUDITED' AND h.cancel_status = 'A' AND t.in_type = '让步接收'`);
    return true;
  }

  private async insertCodeRows(version: number, rows: Gb2828CodeRow[]): Promise<void> {
    const columns = ['id', 'batch_from', 'batch_to', 'level_i', 'level_ii', 'level_iii', 'level_s1', 'level_s2', 'level_s3', 'level_s4', 'version'];
    for (let offset = 0; offset < rows.length; offset += 250) {
      const batch = rows.slice(offset, offset + 250);
      const tuple = `(${columns.map(() => '?').join(',')})`;
      const values = batch.flatMap((row) => [
        nextId(), String(row.batch_from), String(row.batch_to), row.level_i, row.level_ii, row.level_iii,
        row.level_s1, row.level_s2, row.level_s3, row.level_s4, version,
      ]);
      await this.db.q(`INSERT INTO qm_gb2828_code (${columns.join(',')}) VALUES ${batch.map(() => tuple).join(',')}`, values);
    }
  }

  private async insertTableRows(version: number, rows: Gb2828TableRow[]): Promise<void> {
    const columns = ['id', 'table_type', 'code', 'aql', 'sample_qty', 'ac', 're', 'arrow', 'version'];
    for (let offset = 0; offset < rows.length; offset += 250) {
      const batch = rows.slice(offset, offset + 250);
      const tuple = `(${columns.map(() => '?').join(',')})`;
      const values = batch.flatMap((row) => [nextId(), row.table_type, row.code, String(row.aql), row.sample_qty, row.ac, row.re, row.arrow, version]);
      await this.db.q(`INSERT INTO qm_gb2828_table (${columns.join(',')}) VALUES ${batch.map(() => tuple).join(',')}`, values);
    }
  }
}
