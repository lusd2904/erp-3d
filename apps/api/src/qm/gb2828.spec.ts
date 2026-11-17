import {
  resolveGb2828Sample,
  validateGb2828Dataset,
  type Gb2828CodeRow,
  type Gb2828TableRow,
} from './gb2828';

const codeRows: Gb2828CodeRow[] = [
  { batch_from: 1, batch_to: 5, level_i: 'A', level_ii: 'A', level_iii: 'B', level_s1: 'A', level_s2: 'A', level_s3: 'A', level_s4: 'A' },
  { batch_from: 6, batch_to: 15, level_i: 'B', level_ii: 'B', level_iii: 'C', level_s1: 'A', level_s2: 'B', level_s3: 'B', level_s4: 'B' },
];

const tableRows: Gb2828TableRow[] = [
  { table_type: 'NORMAL', code: 'A', aql: 1, sample_qty: null, ac: null, re: null, arrow: 'DOWN' },
  { table_type: 'NORMAL', code: 'B', aql: 1, sample_qty: 8, ac: 0, re: 1, arrow: 'NONE' },
];

describe('GB/T 2828.1 导入与查询逻辑', () => {
  it('校验版本行后按箭头方向取得第一个有效方案', () => {
    expect(() => validateGb2828Dataset(codeRows, tableRows)).not.toThrow();
    expect(resolveGb2828Sample(7, 'A', 'NORMAL', 1, tableRows)).toEqual({
      version: 7,
      code: 'B',
      table_type: 'NORMAL',
      aql: 1,
      sample_qty: 8,
      ac: 0,
      re: 1,
    });
  });

  it('拒绝重叠批量区间与不能到达有效样本的箭头', () => {
    expect(() => validateGb2828Dataset([codeRows[0], { ...codeRows[1], batch_from: 5 }], tableRows)).toThrow('不能重叠');
    expect(() => validateGb2828Dataset(codeRows, [tableRows[0]])).toThrow('未指向有效抽样方案');
  });

  it('不把缺少正式国标数据当成默认方案', () => {
    expect(() => resolveGb2828Sample(1, 'A', 'NORMAL', 2.5, tableRows)).toThrow('没有 NORMAL/A/AQL 2.5 的方案');
  });
});
