import { partsFromSerial } from './dates';
import type { FormatSection, FormatToken } from './formatCode';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const pad = (n: number, width: number): string => String(n).padStart(width, '0');

type Clock = Extract<FormatToken, { k: 'date' | 'elapsed' }>;
const isClock = (t: FormatToken): t is Clock => t.k === 'date' || t.k === 'elapsed';
const unitOf = (t: Clock): string => (t.k === 'elapsed' ? t.unit : t.raw[0].toLowerCase());

/** Whether an m is minutes: it follows an hour or comes before seconds. */
function isMinute(clocks: Clock[], at: number): boolean {
  const before = clocks[at - 1];
  const after = clocks[at + 1];
  return (before !== undefined && unitOf(before) === 'h') || (after !== undefined && unitOf(after) === 's');
}

/** A date or time serial under one section of a format code. */
export function renderDate(serial: number, section: FormatSection): string {
  const { tokens } = section;
  const clocks = tokens.filter(isClock);
  const showsSeconds = clocks.some((t) => unitOf(t) === 's');
  const decimals = tokens.find((t): t is Extract<FormatToken, { k: 'frac' }> => t.k === 'frac')?.digits ?? 0;
  const twelve = clocks.some((t) => t.k === 'date' && /^(am\/pm|a\/p)$/i.test(t.raw));

  // Seconds are rounded to what the code shows; hours and minutes only drop what is left over.
  const scale = 86_400 * 10 ** decimals;
  const exact = showsSeconds ? Math.round(serial * scale) / scale : serial;
  const parts = partsFromSerial(exact, showsSeconds && decimals === 0);
  const totalSeconds = Math.floor(exact * 86_400 + 1e-6);
  const fraction = Math.round((exact * 86_400 - Math.floor(exact * 86_400 + 1e-9)) * 10 ** decimals);

  let clockIndex = -1;
  let out = '';
  for (const t of tokens) {
    if (t.k === 'lit') out += t.text;
    else if (t.k === 'frac') out += `.${pad(Math.max(0, fraction), t.digits)}`;
    else if (t.k === 'elapsed') {
      clockIndex += 1;
      const value = t.unit === 'h' ? Math.floor(totalSeconds / 3600) : t.unit === 'm' ? Math.floor(totalSeconds / 60) : totalSeconds;
      out += pad(value, t.width);
    } else if (t.k === 'date') {
      clockIndex += 1;
      const raw = t.raw.toLowerCase();
      switch (raw) {
        case 'yyyy':
          out += pad(parts.year, 4);
          break;
        case 'yy':
        case 'y':
          out += pad(parts.year % 100, 2);
          break;
        case 'mmmmm':
          out += MONTHS[parts.month - 1][0];
          break;
        case 'mmmm':
          out += MONTHS[parts.month - 1];
          break;
        case 'mmm':
          out += MONTHS[parts.month - 1].slice(0, 3);
          break;
        case 'mm':
        case 'm': {
          const value = isMinute(clocks, clockIndex) ? parts.minute : parts.month;
          out += raw === 'mm' ? pad(value, 2) : String(value);
          break;
        }
        case 'dddd':
          out += DAYS[parts.weekday];
          break;
        case 'ddd':
          out += DAYS[parts.weekday].slice(0, 3);
          break;
        case 'dd':
          out += pad(parts.day, 2);
          break;
        case 'd':
          out += String(parts.day);
          break;
        case 'hh':
        case 'h': {
          const hour = twelve ? parts.hour % 12 || 12 : parts.hour;
          out += raw === 'hh' ? pad(hour, 2) : String(hour);
          break;
        }
        case 'ss':
          out += pad(parts.second, 2);
          break;
        case 's':
          out += String(parts.second);
          break;
        default: {
          const pm = parts.hour >= 12;
          const long = raw === 'am/pm';
          const text = long ? (pm ? 'PM' : 'AM') : pm ? 'P' : 'A';
          out += t.raw === t.raw.toLowerCase() ? text.toLowerCase() : text;
        }
      }
    }
  }
  return out;
}
