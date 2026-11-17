import { dateToIsoWeekDateCode, isoWeekDateCodeToDate } from './date-code';

describe('ISO 周期码', () => {
  it('将 YYWW 映射到 ISO 周周一，并可反向显示', () => {
    expect(isoWeekDateCodeToDate('2615')).toBe('2026-04-06');
    expect(dateToIsoWeekDateCode('2026-04-12')).toBe('2615');
  });

  it('拒绝不存在的 ISO 周和格式错误的周期码', () => {
    expect(() => isoWeekDateCodeToDate('2600')).toThrow('ISO 周序');
    expect(() => isoWeekDateCodeToDate('2553')).toThrow('不是有效的 ISO 年周');
    expect(() => isoWeekDateCodeToDate('26A5')).toThrow('YYWW');
  });

  it('正确处理落在上一日历年的 ISO 第 1 周', () => {
    expect(isoWeekDateCodeToDate('2601')).toBe('2025-12-29');
    expect(dateToIsoWeekDateCode('2025-12-31')).toBe('2601');
  });
});
