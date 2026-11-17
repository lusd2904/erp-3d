import { BizError } from '../common/biz-error';

export const GB2828_LEVEL_COLUMNS = {
  I: 'level_i',
  II: 'level_ii',
  III: 'level_iii',
  'S-1': 'level_s1',
  'S-2': 'level_s2',
  'S-3': 'level_s3',
  'S-4': 'level_s4',
} as const;

export const GB2828_CODE_ORDER = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R'];

export type Gb2828Level = keyof typeof GB2828_LEVEL_COLUMNS;
export type Gb2828Strictness = 'NORMAL' | 'TIGHTENED' | 'REDUCED';
export type Gb2828Arrow = 'NONE' | 'DOWN' | 'UP';

export interface Gb2828CodeRow {
  batch_from: string | number;
  batch_to: string | number;
  level_i: string;
  level_ii: string;
  level_iii: string;
  level_s1: string;
  level_s2: string;
  level_s3: string;
  level_s4: string;
}

export interface Gb2828TableRow {
  table_type: Gb2828Strictness;
  code: string;
  aql: string | number;
  sample_qty: number | null;
  ac: number | null;
  re: number | null;
  arrow: Gb2828Arrow;
}

export interface Gb2828Sample {
  version: number;
  code: string;
  table_type: Gb2828Strictness;
  aql: number;
  sample_qty: number;
  ac: number;
  re: number;
}

export function validateGb2828Dataset(codes: Gb2828CodeRow[], tables: Gb2828TableRow[]): void {
  if (!codes.length || !tables.length) {
    throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '字码表和抽样方案表都必须包含数据');
  }

  const seenIntervals = new Set<string>();
  const sortedCodes = [...codes].sort((a, b) => Number(a.batch_from) - Number(b.batch_from));
  for (let index = 0; index < sortedCodes.length; index++) {
    const row = sortedCodes[index];
    const from = Number(row.batch_from);
    const to = Number(row.batch_to);
    const key = `${from}:${to}`;
    if (!Number.isFinite(from) || !Number.isFinite(to) || from < 1 || to < from || seenIntervals.has(key)) {
      throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '批量区间无效或重复');
    }
    if (index > 0 && from <= Number(sortedCodes[index - 1].batch_to)) {
      throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '批量区间不能重叠');
    }
    seenIntervals.add(key);
    for (const level of Object.keys(GB2828_LEVEL_COLUMNS) as Gb2828Level[]) {
      const code = row[GB2828_LEVEL_COLUMNS[level]];
      if (!GB2828_CODE_ORDER.includes(code)) {
        throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', `检验水平 ${level} 的样本量字码无效`);
      }
    }
  }

  const seenTableKeys = new Set<string>();
  for (const row of tables) {
    const aql = Number(row.aql);
    const key = `${row.table_type}:${row.code}:${aql}`;
    if (!['NORMAL', 'TIGHTENED', 'REDUCED'].includes(row.table_type) ||
        !GB2828_CODE_ORDER.includes(row.code) || !Number.isFinite(aql) || aql <= 0 || seenTableKeys.has(key)) {
      throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '抽样方案行类型、字码、AQL 无效或重复');
    }
    if (!['NONE', 'DOWN', 'UP'].includes(row.arrow)) {
      throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '抽样方案箭头必须为 NONE、DOWN 或 UP');
    }
    const values = [row.sample_qty, row.ac, row.re];
    if (row.arrow === 'NONE') {
      if (values.some((value) => value === null || !Number.isInteger(value) || Number(value) < 0) || Number(row.ac) >= Number(row.re)) {
        throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '无箭头行必须提供有效的样本量、Ac 和 Re');
      }
    } else if (values.some((value) => value !== null)) {
      throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '箭头行的样本量、Ac、Re 必须留空');
    }
    seenTableKeys.add(key);
  }

  for (const row of tables.filter((candidate) => candidate.arrow !== 'NONE')) {
    const targetCode = nextArrowCode(row.code, row.arrow);
    let resolved = false;
    let code = targetCode;
    while (code) {
      const target = tables.find((candidate) => candidate.table_type === row.table_type && Number(candidate.aql) === Number(row.aql) && candidate.code === code);
      if (target?.arrow === 'NONE') {
        resolved = true;
        break;
      }
      code = target ? nextArrowCode(target.code, target.arrow) : nextArrowCode(code, row.arrow);
    }
    if (!resolved) {
      throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', `字码 ${row.code} 的箭头未指向有效抽样方案`);
    }
  }
}

function nextArrowCode(code: string, arrow: Gb2828Arrow): string | null {
  const index = GB2828_CODE_ORDER.indexOf(code);
  const target = arrow === 'DOWN' ? index + 1 : arrow === 'UP' ? index - 1 : -1;
  return target >= 0 && target < GB2828_CODE_ORDER.length ? GB2828_CODE_ORDER[target] : null;
}

export function resolveGb2828Sample(
  version: number,
  initialCode: string,
  tableType: Gb2828Strictness,
  aql: number,
  rows: Gb2828TableRow[],
): Gb2828Sample {
  let code = initialCode;
  const visited = new Set<string>();
  while (code) {
    if (visited.has(code)) {
      throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '抽样方案箭头形成循环');
    }
    visited.add(code);
    const row = rows.find((candidate) => candidate.table_type === tableType && candidate.code === code && Number(candidate.aql) === aql);
    if (!row) throw new BizError('BIZ_QM_GB2828_NO_PLAN', `国标数据集中没有 ${tableType}/${code}/AQL ${aql} 的方案`);
    if (row.arrow === 'NONE') {
      if (row.sample_qty === null || row.ac === null || row.re === null) {
        throw new BizError('BIZ_QM_GB2828_INVALID_DATASET', '无箭头抽样方案缺少样本量、Ac 或 Re');
      }
      return { version, code, table_type: tableType, aql, sample_qty: row.sample_qty, ac: row.ac, re: row.re };
    }
    const target = nextArrowCode(code, row.arrow);
    if (!target) throw new BizError('BIZ_QM_GB2828_NO_PLAN', `字码 ${code} 的箭头超出国标字码范围`);
    code = target;
  }
  throw new BizError('BIZ_QM_GB2828_NO_PLAN', '没有匹配的国标抽样方案');
}
