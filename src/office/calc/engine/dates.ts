/** Excel date serials: days since 1899-12-30 (the 1900 leap-year bug is ignored). */
const EPOCH_UTC = Date.UTC(1899, 11, 30);
const DAY_MS = 86_400_000;

export function serialFromDate(date: Date): number {
  return (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds()) - EPOCH_UTC) / DAY_MS;
}

export interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: number;
}

export function partsFromSerial(serial: number): DateParts {
  const ms = Math.round(serial * DAY_MS);
  const d = new Date(EPOCH_UTC + ms);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    weekday: d.getUTCDay(),
  };
}

export function serialFromParts(year: number, month: number, day: number): number {
  return (Date.UTC(year, month - 1, day) - EPOCH_UTC) / DAY_MS;
}

/** "2024-03-05", "5/3/2024" (day first, as in Vietnam) → serial, or null. */
export function parseDateText(text: string): number | null {
  const t = text.trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  if (m) return validDate(Number(m[1]), Number(m[2]), Number(m[3]));
  m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  if (m) return validDate(Number(m[3]), Number(m[2]), Number(m[1]));
  return null;
}

function validDate(year: number, month: number, day: number): number | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const serial = serialFromParts(year, month, day);
  const parts = partsFromSerial(serial);
  return parts.month === month && parts.day === day ? serial : null;
}
