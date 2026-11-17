import { BizError } from '../../common/biz-error';

const DATE_CODE_ERROR = 'BIZ_INV_DATE_CODE_INVALID';

function isoWeekParts(date: Date): { year: number; week: number } {
  const day = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const weekday = day.getUTCDay() || 7;
  day.setUTCDate(day.getUTCDate() + 4 - weekday);
  const year = day.getUTCFullYear();
  const firstThursday = new Date(Date.UTC(year, 0, 4));
  const firstWeekday = firstThursday.getUTCDay() || 7;
  firstThursday.setUTCDate(firstThursday.getUTCDate() + 4 - firstWeekday);
  const week = 1 + Math.round((day.getTime() - firstThursday.getTime()) / 604800000);
  return { year, week };
}

export function isoWeekDateCodeToDate(code: string): string {
  if (!/^\d{4}$/.test(code)) {
    throw new BizError(DATE_CODE_ERROR, '周期码必须为 YYWW 四位数字');
  }
  const year = 2000 + Number(code.slice(0, 2));
  const week = Number(code.slice(2));
  if (week < 1 || week > 53) {
    throw new BizError(DATE_CODE_ERROR, 'ISO 周序必须在 01 至 53 之间');
  }

  const jan4 = new Date(Date.UTC(year, 0, 4));
  const jan4Weekday = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - jan4Weekday + 1 + (week - 1) * 7);
  const actual = isoWeekParts(monday);
  if (actual.year !== year || actual.week !== week) {
    throw new BizError(DATE_CODE_ERROR, `${code} 不是有效的 ISO 年周`);
  }
  return `${monday.getUTCFullYear()}-${String(monday.getUTCMonth() + 1).padStart(2, '0')}-${String(monday.getUTCDate()).padStart(2, '0')}`;
}

export function dateToIsoWeekDateCode(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new BizError(DATE_CODE_ERROR, '生产日期无效');
  }
  const { year, week } = isoWeekParts(date);
  return `${String(year % 100).padStart(2, '0')}${String(week).padStart(2, '0')}`;
}
