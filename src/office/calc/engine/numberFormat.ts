import { partsFromSerial } from './dates';
import { formatGeneral, isError, type Scalar } from './values';

/**
 * Number formats, the common subset of Excel's codes: General, 0 / 0.00 /
 * #,##0.00 with literal text around them, percent, dates and times, "@" for
 * text, and up to three sections (positive;negative;zero).
 */
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const FORMAT_PRESETS = {
  general: 'General',
  number: '0.00',
  thousands: '#,##0',
  currency: '#,##0.00 "₫"',
  currencyUsd: '"$"#,##0.00',
  percent: '0%',
  percent2: '0.00%',
  date: 'dd/mm/yyyy',
  dateLong: 'dd mmmm yyyy',
  time: 'hh:mm:ss',
  text: '@',
} as const;

/** Splits on ';' outside quotes. */
function sections(code: string): string[] {
  const out: string[] = [];
  let current = '';
  let quoted = false;
  for (const ch of code) {
    if (ch === '"') quoted = !quoted;
    if (ch === ';' && !quoted) {
      out.push(current);
      current = '';
    } else current += ch;
  }
  out.push(current);
  return out;
}

/** True when the section is a date or time (y, d, h, s or m outside quotes and brackets). */
export function isDateFormat(code: string): boolean {
  const stripped = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '');
  return /[ydhs]/i.test(stripped) || (/m/i.test(stripped) && !/[0#]/.test(stripped));
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function formatDate(serial: number, code: string): string {
  const p = partsFromSerial(serial);
  const twelve = /AM\/PM|A\/P/i.test(code);
  let out = '';
  let i = 0;
  const lower = code;
  while (i < lower.length) {
    const rest = lower.slice(i);
    const quoted = /^"([^"]*)"/.exec(rest);
    if (quoted) {
      out += quoted[1];
      i += quoted[0].length;
      continue;
    }
    if (rest[0] === '\\') {
      out += rest[1] ?? '';
      i += 2;
      continue;
    }
    const token = /^(yyyy|yy|mmmm|mmm|mm|m|dddd|ddd|dd|d|hh|h|ss|s|AM\/PM|A\/P)/i.exec(rest)?.[0];
    if (!token) {
      out += rest[0];
      i += 1;
      continue;
    }
    i += token.length;
    const t = token.toLowerCase();
    // "m" after an hour or before seconds means minutes, otherwise month.
    const before = out.length === 0 ? '' : lower.slice(0, i - token.length).toLowerCase();
    const after = lower.slice(i).toLowerCase();
    const isMinute = (t === 'mm' || t === 'm') && (/h[^a-z]*$/.test(before) || /^[^a-z]*s/.test(after));
    switch (t) {
      case 'yyyy':
        out += pad(p.year, 4);
        break;
      case 'yy':
        out += pad(p.year % 100, 2);
        break;
      case 'mmmm':
        out += MONTHS_LONG[p.month - 1];
        break;
      case 'mmm':
        out += MONTHS_LONG[p.month - 1].slice(0, 3);
        break;
      case 'mm':
        out += isMinute ? pad(p.minute, 2) : pad(p.month, 2);
        break;
      case 'm':
        out += isMinute ? String(p.minute) : String(p.month);
        break;
      case 'dddd':
        out += DAYS_LONG[p.weekday];
        break;
      case 'ddd':
        out += DAYS_LONG[p.weekday].slice(0, 3);
        break;
      case 'dd':
        out += pad(p.day, 2);
        break;
      case 'd':
        out += String(p.day);
        break;
      case 'hh':
        out += pad(twelve ? p.hour % 12 || 12 : p.hour, 2);
        break;
      case 'h':
        out += String(twelve ? p.hour % 12 || 12 : p.hour);
        break;
      case 'ss':
        out += pad(p.second, 2);
        break;
      case 's':
        out += String(p.second);
        break;
      default:
        out += p.hour >= 12 ? (t === 'am/pm' ? 'PM' : 'P') : t === 'am/pm' ? 'AM' : 'A';
    }
  }
  return out;
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatNumber(value: number, section: string, negativeSection: boolean): string {
  // Literal text and the digit pattern are separated by scanning the section.
  let prefix = '';
  let suffix = '';
  let pattern = '';
  let seenPattern = false;
  let percent = false;
  for (let i = 0; i < section.length; i += 1) {
    const ch = section[i];
    if (ch === '"') {
      const end = section.indexOf('"', i + 1);
      const text = section.slice(i + 1, end < 0 ? section.length : end);
      if (seenPattern) suffix += text;
      else prefix += text;
      i = end < 0 ? section.length : end;
    } else if (ch === '\\') {
      const text = section[i + 1] ?? '';
      if (seenPattern) suffix += text;
      else prefix += text;
      i += 1;
    } else if ('0#?.,'.includes(ch)) {
      if (seenPattern && suffix) suffix += ch;
      else {
        pattern += ch;
        seenPattern = true;
      }
    } else if (ch === '%') {
      percent = true;
      if (seenPattern) suffix += ch;
      else prefix += ch;
    } else if (ch === '_' || ch === '*') {
      i += 1;
    } else if (ch === '[') {
      const end = section.indexOf(']', i);
      i = end < 0 ? section.length : end;
    } else if (seenPattern) suffix += ch;
    else prefix += ch;
  }

  const scaled = percent ? value * 100 : value;
  const [wholePattern, fractionPattern = ''] = pattern.split('.');
  const decimals = fractionPattern.replace(/,/g, '').length;
  const grouped = /[0#?],[0#?]/.test(wholePattern);
  const rounded = Math.abs(scaled).toFixed(Math.min(20, decimals));
  let [whole, fraction = ''] = rounded.split('.');
  whole = whole.padStart((wholePattern.match(/0/g) ?? []).length, '0');
  if (whole === '0' && decimals > 0 && !wholePattern.includes('0')) whole = '';
  if (grouped) whole = groupThousands(whole);
  // '#' decimal places drop trailing zeros; '0' ones stay.
  const minFraction = (fractionPattern.match(/0/g) ?? []).length;
  while (fraction.length > minFraction && fraction.endsWith('0')) fraction = fraction.slice(0, -1);
  const number = fraction ? `${whole}.${fraction}` : whole;
  const isZero = Number(rounded) === 0;
  const sign = scaled < 0 && !negativeSection && !isZero ? '-' : '';
  return `${sign}${prefix}${number}${suffix}`;
}

/** The text a cell shows for `value` under `code`. */
export function formatValue(value: Scalar, code: string | undefined): string {
  if (isError(value)) return value.code;
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (!code || code === 'General') return typeof value === 'number' ? formatGeneral(value) : value;
  const parts = sections(code);
  if (typeof value === 'string') {
    const textSection = parts[3] ?? (parts.length === 1 && parts[0].includes('@') ? parts[0] : null);
    return textSection ? textSection.replace(/"([^"]*)"/g, '$1').replace(/@/g, value) : value;
  }
  const section = value < 0 && parts[1] !== undefined ? parts[1] : value === 0 && parts[2] !== undefined ? parts[2] : parts[0];
  const negativeSection = value < 0 && parts[1] !== undefined;
  if (section.trim() === 'General') return formatGeneral(value);
  if (isDateFormat(section)) return value < 0 ? '#NUM!' : formatDate(value, section);
  return formatNumber(value, section, negativeSection);
}

/** A format code for a number of decimals, keeping the thousands grouping and percent. */
export function withDecimals(code: string | undefined, delta: 1 | -1): string {
  const current = code && code !== 'General' ? code : '0';
  const m = /^([^0#]*)([0#,]*)(?:\.([0#]*))?(.*)$/.exec(current);
  if (!m) return current;
  const [, prefix, whole, fraction = '', suffix] = m;
  const digits = Math.max(0, Math.min(10, fraction.length + delta));
  if (code === undefined || code === 'General') {
    return digits > 0 ? `0.${'0'.repeat(digits)}` : '0';
  }
  return `${prefix}${whole || '0'}${digits > 0 ? `.${'0'.repeat(digits)}` : ''}${suffix}`;
}
