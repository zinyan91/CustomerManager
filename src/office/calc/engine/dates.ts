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

/** The parts of a serial. The clock parts are rounded to the nearest whole second, as HOUR, MINUTE and SECOND do in Excel. */
export function partsFromSerial(serial: number, wholeSeconds = false): DateParts {
  // Excel counts 1900 as a leap year: day 60 is 29 February, day 0 is "January 0".
  if (serial >= 0 && serial < 61) {
    const day = Math.floor(serial);
    const clock = calendarParts(serial - day, wholeSeconds);
    const time = { hour: clock.hour, minute: clock.minute, second: clock.second };
    if (day === 0) return { year: 1900, month: 1, day: 0, weekday: 6, ...time };
    if (day === 60) return { year: 1900, month: 2, day: 29, weekday: 3, ...time };
    return { ...calendarParts(day + 1, false), ...time, weekday: (day + 6) % 7 };
  }
  return calendarParts(serial, wholeSeconds);
}

function calendarParts(serial: number, wholeSeconds: boolean): DateParts {
  const ms = wholeSeconds ? Math.round(serial * 86_400) * 1000 : Math.round(serial * DAY_MS);
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
  const serial = (Date.UTC(year, month - 1, day) - EPOCH_UTC) / DAY_MS;
  // Before 1 March 1900 Excel's days are one fewer than the calendar's (it has a 29 February 1900).
  return serial >= 2 && serial < 61 ? serial - 1 : serial;
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
