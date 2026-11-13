import { Injectable } from '@nestjs/common';
import { ErrorCodes } from '@erp3d/shared';
import { DbService } from '../../db/db.service';
import { nextId } from '../../db/snowflake';
import { BizError } from '../../common/biz-error';

export interface CodingSegment {
  type: 'const' | 'date' | 'field' | 'seq';
  value?: string;
  format?: 'YYYYMMDD' | 'YYMMDD' | 'YYYYMM' | 'YYMM';
  field?: string;
  length?: number;
  reset?: 'DAILY' | 'MONTHLY' | 'YEARLY' | 'NEVER';
}

function formatDateLocal(d: Date, format = 'YYYYMMDD'): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = String(d.getFullYear());
  const yy = year.slice(-2);
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  switch (format) {
    case 'YYYYMMDD': return `${year}${mm}${dd}`;
    case 'YYMMDD': return `${yy}${mm}${dd}`;
    case 'YYYYMM': return `${year}${mm}`;
    case 'YYMM': return `${yy}${mm}`;
    default: return `${year}${mm}${dd}`;
  }
}

@Injectable()
export class CodingService {
  constructor(private db: DbService) {}

  async generate(objectCode: string, header: Record<string, unknown> = {}, billTypeId?: number | null): Promise<string> {
    const rule = await this.selectRule(objectCode, billTypeId);
    const segments: CodingSegment[] = typeof rule.segments_json === 'string'
      ? JSON.parse(rule.segments_json)
      : rule.segments_json;

    const dateVal = header.bill_date ? new Date(String(header.bill_date)) : new Date();
    const renderedParts: string[] = [];
    let seqLength = 5;
    let seqReset = 'NEVER';

    for (const seg of segments) {
      if (seg.type === 'const') {
        renderedParts.push(seg.value || '');
      } else if (seg.type === 'date') {
        renderedParts.push(formatDateLocal(dateVal, seg.format || 'YYYYMMDD'));
      } else if (seg.type === 'field') {
        const val = seg.field ? header[seg.field] : '';
        renderedParts.push(val !== undefined && val !== null ? String(val) : '');
      } else if (seg.type === 'seq') {
        seqLength = seg.length || 5;
        if (seg.reset) seqReset = seg.reset;
      }
    }

    let groupKey = renderedParts.join('');
    if (seqReset === 'DAILY') {
      const dStr = formatDateLocal(dateVal, 'YYYYMMDD');
      if (!groupKey.includes(dStr)) groupKey += `_${dStr}`;
    } else if (seqReset === 'MONTHLY') {
      const mStr = formatDateLocal(dateVal, 'YYYYMM');
      if (!groupKey.includes(mStr)) groupKey += `_${mStr}`;
    } else if (seqReset === 'YEARLY') {
      const yStr = formatDateLocal(dateVal, 'YYYYMMDD').slice(0, 4);
      if (!groupKey.includes(yStr)) groupKey += `_${yStr}`;
    }

    // [人工修正 反重力] 并发下两笔事务可能同时看不到行；用 INSERT ... ON DUPLICATE KEY 占位后再 FOR UPDATE 递增
    const nextNo = await this.db.independent(async (q) => {
      await q(
        `INSERT INTO sys_coding_seq (id, rule_id, group_key, current_no) VALUES (?, ?, ?, 0)
         ON DUPLICATE KEY UPDATE id = id`,
        [nextId(), rule.id, groupKey],
      );
      const rows = await q(
        `SELECT id, current_no FROM sys_coding_seq WHERE rule_id = ? AND group_key = ? FOR UPDATE`,
        [rule.id, groupKey],
      );
      const cur = Number(rows[0].current_no) + 1;
      await q(`UPDATE sys_coding_seq SET current_no = ? WHERE id = ?`, [cur, rows[0].id]);
      return cur;
    });

    const seqStr = String(nextNo).padStart(seqLength, '0');
    return this.assembleFinal(segments, header, dateVal, seqStr);
  }

  async preview(ruleId: number, header: Record<string, unknown> = {}): Promise<string> {
    const rule = await this.db.one<any>('SELECT * FROM sys_coding_rule WHERE id = ?', [ruleId]);
    if (!rule) throw new BizError(ErrorCodes.SYS_NOT_FOUND, '编码规则不存在');
    const segments: CodingSegment[] = typeof rule.segments_json === 'string'
      ? JSON.parse(rule.segments_json)
      : rule.segments_json;

    const dateVal = header.bill_date ? new Date(String(header.bill_date)) : new Date();
    const seqSeg = segments.find((s) => s.type === 'seq');
    const seqStr = '0'.padStart(seqSeg?.length || 5, '0');
    return this.assembleFinal(segments, header, dateVal, seqStr);
  }

  private async selectRule(objectCode: string, billTypeId?: number | null) {
    if (billTypeId) {
      const bt = await this.db.one<{ coding_rule_id: number }>(
        `SELECT coding_rule_id FROM sys_bill_type WHERE id = ? AND forbid = 0`,
        [billTypeId],
      );
      if (bt?.coding_rule_id) {
        const rule = await this.db.one<any>(
          `SELECT * FROM sys_coding_rule WHERE id = ? AND forbid = 0`,
          [bt.coding_rule_id],
        );
        if (rule) return rule;
      }
    }

    const defaultRule = await this.db.one<any>(
      `SELECT * FROM sys_coding_rule WHERE object_code = ? AND is_default = 1 AND forbid = 0 LIMIT 1`,
      [objectCode],
    );
    if (defaultRule) return defaultRule;

    throw new BizError(ErrorCodes.BIZ_CODING, `未找到「${objectCode}」的有效编码规则`);
  }

  private assembleFinal(segments: CodingSegment[], header: Record<string, unknown>, dateVal: Date, seqStr: string): string {
    const res: string[] = [];
    for (const seg of segments) {
      if (seg.type === 'const') {
        res.push(seg.value || '');
      } else if (seg.type === 'date') {
        res.push(formatDateLocal(dateVal, seg.format || 'YYYYMMDD'));
      } else if (seg.type === 'field') {
        const val = seg.field ? header[seg.field] : '';
        res.push(val !== undefined && val !== null ? String(val) : '');
      } else if (seg.type === 'seq') {
        res.push(seqStr);
      }
    }
    return res.join('');
  }
}
