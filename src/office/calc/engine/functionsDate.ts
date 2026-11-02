import { parseDateText, partsFromSerial, serialFromParts } from './dates';
import { ERRORS, fail, flatten, toNumber, type Value } from './values';
import { dateArg, num1, scalar, text1, type Fn } from './functions';

const DAY = 86_400;

/** Holidays as a list of whole-day serials. */
const holidays = (value: Value | undefined): Set<number> =>
  new Set(value === undefined ? [] : flatten([value]).filter((v) => typeof v === 'number').map((v) => Math.trunc(v as number)));

/** WEEKDAY's types: 1 Sunday is 1, 2 Monday is 1, 3 Monday is 0, 11-17 the week starts on Monday ... Sunday. */
function weekdayOf(serial: number, type: number): number {
  const day = partsFromSerial(Math.trunc(serial)).weekday;
  if (type === 1) return day + 1;
  if (type === 2) return ((day + 6) % 7) + 1;
  if (type === 3) return (day + 6) % 7;
  if (type >= 11 && type <= 17) return ((day - (type - 10) % 7 + 7) % 7) + 1;
  return fail(ERRORS.num);
}

const isLeap = (year: number): boolean => (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
const lastOfFebruary = (year: number, month: number, day: number): boolean => month === 2 && day === (isLeap(year) ? 29 : 28);

/** Days between two dates on a 360-day year, the US (NASD) way or the European way. */
function days360(start: number, end: number, european: boolean): number {
  const a = partsFromSerial(Math.trunc(start));
  const b = partsFromSerial(Math.trunc(end));
  let [d1, d2] = [a.day, b.day];
  if (european) {
    if (d1 === 31) d1 = 30;
    if (d2 === 31) d2 = 30;
  } else {
    if (lastOfFebruary(a.year, a.month, a.day) && lastOfFebruary(b.year, b.month, b.day)) d2 = 30;
    if (lastOfFebruary(a.year, a.month, a.day)) d1 = 30;
    if (d2 === 31 && d1 >= 30) d2 = 30;
    if (d1 === 31) d1 = 30;
  }
  return (b.year - a.year) * 360 + (b.month - a.month) * 30 + (d2 - d1);
}

function yearFraction(start: number, end: number, basis: number): number {
  const [from, to] = start <= end ? [Math.trunc(start), Math.trunc(end)] : [Math.trunc(end), Math.trunc(start)];
  const days = to - from;
  switch (basis) {
    case 0:
      return days360(from, to, false) / 360;
    case 4:
      return days360(from, to, true) / 360;
    case 2:
      return days / 360;
    case 3:
      return days / 365;
    case 1: {
      const y1 = partsFromSerial(from).year;
      const y2 = partsFromSerial(to).year;
      if (y1 === y2) return days / (isLeap(y1) ? 366 : 365);
      let total = 0;
      for (let y = y1; y <= y2; y += 1) total += isLeap(y) ? 366 : 365;
      return days / (total / (y2 - y1 + 1));
    }
    default:
      return fail(ERRORS.num);
  }
}

/** The week of the year: `type` is WEEKDAY's, or 21 for ISO weeks. */
function weekNumber(serial: number, type: number): number {
  if (type === 21) return isoWeek(serial);
  const startDay = type === 1 ? 0 : type === 2 ? 1 : type >= 11 && type <= 17 ? (type - 10) % 7 : fail(ERRORS.num);
  const { year } = partsFromSerial(Math.trunc(serial));
  const jan1 = serialFromParts(year, 1, 1);
  const offset = (partsFromSerial(jan1).weekday - startDay + 7) % 7;
  return Math.floor((Math.trunc(serial) - jan1 + offset) / 7) + 1;
}

function isoWeek(serial: number): number {
  const day = Math.trunc(serial);
  const weekday = (partsFromSerial(day).weekday + 6) % 7;
  const thursday = day - weekday + 3;
  const year = partsFromSerial(thursday).year;
  return Math.floor((thursday - serialFromParts(year, 1, 1)) / 7) + 1;
}

/** NETWORKDAYS.INTL's weekend: a number 1-7 or 11-17, or seven 0/1 characters starting on Monday. */
function weekendDays(value: Value | undefined): Set<number> {
  if (value === undefined) return new Set([0, 6]);
  const v = scalar(value);
  if (typeof v === 'string' && /^[01]{7}$/.test(v)) return new Set([...v].flatMap((ch, i) => (ch === '1' ? [(i + 1) % 7] : [])));
  const n = Math.trunc(toNumber(v));
  if (n === 1) return new Set([6, 0]);
  if (n >= 2 && n <= 7) return new Set([n - 2, n - 1]);
  if (n >= 11 && n <= 17) return new Set([n - 11]);
  return fail(ERRORS.num);
}

function countWorkdays(start: number, end: number, weekend: Set<number>, off: Set<number>): number {
  const [from, to, sign] = start <= end ? [start, end, 1] : [end, start, -1];
  let count = 0;
  for (let d = from; d <= to; d += 1) if (!weekend.has(partsFromSerial(d).weekday) && !off.has(d)) count += 1;
  return count * sign;
}

function addWorkdays(start: number, days: number, weekend: Set<number>, off: Set<number>): number {
  let date = start;
  let left = Math.abs(days);
  const step = days < 0 ? -1 : 1;
  while (left > 0) {
    date += step;
    if (!weekend.has(partsFromSerial(date).weekday) && !off.has(date)) left -= 1;
  }
  return date;
}

const SATURDAY_SUNDAY = new Set([0, 6]);

function timeText(text: string): number | null {
  const m = /^\s*(\d{1,2}):(\d{2})(?::(\d{2}(?:\.\d+)?))?\s*(AM|PM)?\s*$/i.exec(text);
  if (!m) return null;
  let hour = Number(m[1]);
  const [minute, second] = [Number(m[2]), Number(m[3] ?? 0)];
  if (m[4]) {
    if (hour < 1 || hour > 12) return null;
    hour = (hour % 12) + (m[4].toUpperCase() === 'PM' ? 12 : 0);
  }
  return hour > 23 || minute > 59 || second >= 60 ? null : (hour * 3600 + minute * 60 + second) / DAY;
}

export const DATE_FUNCTIONS: Record<string, Fn> = {
  WEEKDAY: (a) => weekdayOf(dateArg(a[0]), a[1] === undefined ? 1 : Math.trunc(num1(a, 1))),
  HOUR: (a) => partsFromSerial(dateArg(a[0]), true).hour,
  MINUTE: (a) => partsFromSerial(dateArg(a[0]), true).minute,
  SECOND: (a) => partsFromSerial(dateArg(a[0]), true).second,
  DATEVALUE: (a) => {
    const text = text1(a).trim();
    const date = parseDateText(text.replace(/\s+\d{1,2}:\d{2}.*$/, ''));
    return date ?? fail(ERRORS.value);
  },
  TIME: (a) => {
    const total = Math.trunc(num1(a)) * 3600 + Math.trunc(num1(a, 1)) * 60 + Math.trunc(num1(a, 2));
    if (total < 0) fail(ERRORS.num);
    return (total % DAY) / DAY;
  },
  TIMEVALUE: (a) => timeText(text1(a)) ?? fail(ERRORS.value),
  YEARFRAC: (a) => yearFraction(dateArg(a[0]), dateArg(a[1]), a[2] === undefined ? 0 : Math.trunc(num1(a, 2))),
  DAYS360: (a) => days360(dateArg(a[0]), dateArg(a[1]), a[2] !== undefined && toNumber(scalar(a[2])) !== 0),
  WEEKNUM: (a) => weekNumber(dateArg(a[0]), a[1] === undefined ? 1 : Math.trunc(num1(a, 1))),
  ISOWEEKNUM: (a) => isoWeek(dateArg(a[0])),
  NETWORKDAYS: (a) => countWorkdays(Math.trunc(dateArg(a[0])), Math.trunc(dateArg(a[1])), SATURDAY_SUNDAY, holidays(a[2])),
  WORKDAY: (a) => addWorkdays(Math.trunc(dateArg(a[0])), Math.trunc(num1(a, 1)), SATURDAY_SUNDAY, holidays(a[2])),
  'NETWORKDAYS.INTL': (a) => countWorkdays(Math.trunc(dateArg(a[0])), Math.trunc(dateArg(a[1])), weekendDays(a[2]), holidays(a[3])),
  'WORKDAY.INTL': (a) => addWorkdays(Math.trunc(dateArg(a[0])), Math.trunc(num1(a, 1)), weekendDays(a[2]), holidays(a[3])),
};
