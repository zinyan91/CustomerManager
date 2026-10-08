import { columnName } from './cellRef';
import { matchesCriteria } from './criteria';
import { partsFromSerial, serialFromDate, serialFromParts } from './dates';
import { formatValue } from './numberFormat';
import {
  ERRORS,
  compareValues,
  fail,
  flatten,
  isError,
  isRange,
  parseNumber,
  toBoolean,
  toNumber,
  toText,
  type RangeValue,
  type Scalar,
  type Value,
} from './values';

export interface FunctionContext {
  now(): Date;
  /** Row and column of the cell being evaluated. */
  row: number;
  col: number;
}

type Fn = (args: Value[], ctx: FunctionContext) => Value;

const table = (value: Value): RangeValue =>
  isRange(value) ? value : { kind: 'range', rows: 1, cols: 1, values: [[value]] };

/** Numbers in a SUM-like call: in ranges only real numbers count; typed-in arguments are coerced. */
function numbersOf(args: Value[]): number[] {
  const out: number[] = [];
  for (const arg of args) {
    if (isRange(arg)) {
      for (const row of arg.values)
        for (const cell of row) {
          if (isError(cell)) fail(cell);
          if (typeof cell === 'number') out.push(cell);
        }
    } else if (arg !== null) out.push(toNumber(arg));
  }
  return out;
}

const scalar = (value: Value): Scalar => {
  if (!isRange(value)) return value;
  if (value.rows === 1 && value.cols === 1) return value.values[0][0];
  return fail(ERRORS.value);
};

function round(n: number, digits: number, mode: 'half' | 'up' | 'down'): number {
  const factor = 10 ** Math.trunc(digits);
  const scaled = n * factor;
  const done = mode === 'half' ? Math.sign(scaled) * Math.round(Math.abs(scaled) + 1e-12) : mode === 'up' ? Math.sign(scaled) * Math.ceil(Math.abs(scaled) - 1e-12) : Math.trunc(scaled + Math.sign(scaled) * 1e-12);
  return done / factor;
}

function median(values: number[]): number {
  if (values.length === 0) fail(ERRORS.num);
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function stdev(values: number[], sample: boolean): number {
  const n = values.length;
  if (n < (sample ? 2 : 1)) fail(ERRORS.div0);
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const ss = values.reduce((a, b) => a + (b - mean) ** 2, 0);
  return Math.sqrt(ss / (sample ? n - 1 : n));
}

/** Pairs a criteria range with its criteria for SUMIFS-style calls. */
function matchingCells(pairs: Value[]): boolean[][] {
  const first = table(pairs[0]);
  const hits = first.values.map((row) => row.map(() => true));
  for (let p = 0; p < pairs.length; p += 2) {
    const range = table(pairs[p]);
    const criteria = scalar(pairs[p + 1]);
    if (range.rows !== first.rows || range.cols !== first.cols) fail(ERRORS.value);
    range.values.forEach((row, r) => row.forEach((cell, c) => (hits[r][c] &&= matchesCriteria(cell, criteria))));
  }
  return hits;
}

/** MAXIFS and MINIFS: the largest or smallest number among the cells whose criteria all hold; 0 when none do, as in Excel. */
function extremeIfs(args: Value[], pick: (...n: number[]) => number): number {
  const values = table(args[0]);
  const hits = matchingCells(args.slice(1));
  const picked: number[] = [];
  hits.forEach((row, r) => row.forEach((hit, c) => hit && typeof values.values[r][c] === 'number' && picked.push(values.values[r][c] as number)));
  return picked.length ? picked.reduce((x, y) => pick(x, y)) : 0;
}

function lookupIndex(needle: Scalar, haystack: Scalar[], exact: boolean): number {
  if (exact) return haystack.findIndex((v) => v !== null && !isError(v) && typeof v === typeof needle && compareValues(v, needle) === 0);
  let found = -1;
  for (let i = 0; i < haystack.length; i += 1) {
    const v = haystack[i];
    if (v === null || isError(v) || typeof v !== typeof needle) continue;
    if (compareValues(v, needle) <= 0) found = i;
    else break;
  }
  return found;
}

const text1 = (args: Value[], i = 0) => toText(scalar(args[i] ?? null));
const num1 = (args: Value[], i = 0) => toNumber(scalar(args[i] ?? null));

function dateArg(value: Value): number {
  const n = toNumber(scalar(value));
  if (n < 0) fail(ERRORS.num);
  return n;
}

function mathFn(f: (n: number) => number): Fn {
  return (args) => {
    const r = f(num1(args));
    if (!Number.isFinite(r)) fail(ERRORS.num);
    return r;
  };
}

export const FUNCTIONS: Record<string, Fn> = {
  // ----- Math
  SUM: (a) => numbersOf(a).reduce((x, y) => x + y, 0),
  PRODUCT: (a) => numbersOf(a).reduce((x, y) => x * y, 1),
  AVERAGE: (a) => {
    const n = numbersOf(a);
    return n.length ? n.reduce((x, y) => x + y, 0) / n.length : fail(ERRORS.div0);
  },
  MIN: (a) => {
    const n = numbersOf(a);
    return n.length ? Math.min(...n) : 0;
  },
  MAX: (a) => {
    const n = numbersOf(a);
    return n.length ? Math.max(...n) : 0;
  },
  MEDIAN: (a) => median(numbersOf(a)),
  STDEV: (a) => stdev(numbersOf(a), true),
  STDEVP: (a) => stdev(numbersOf(a), false),
  COUNT: (a) => flatten(a).filter((v) => typeof v === 'number').length,
  COUNTA: (a) => flatten(a).filter((v) => v !== null && v !== '').length,
  COUNTBLANK: (a) => flatten(a).filter((v) => v === null || v === '').length,
  ABS: mathFn(Math.abs),
  SQRT: (a) => (num1(a) < 0 ? fail(ERRORS.num) : Math.sqrt(num1(a))),
  EXP: mathFn(Math.exp),
  LN: (a) => (num1(a) <= 0 ? fail(ERRORS.num) : Math.log(num1(a))),
  LOG10: (a) => (num1(a) <= 0 ? fail(ERRORS.num) : Math.log10(num1(a))),
  LOG: (a) => (num1(a) <= 0 ? fail(ERRORS.num) : Math.log(num1(a)) / Math.log(a[1] === undefined ? 10 : num1(a, 1))),
  SIGN: (a) => Math.sign(num1(a)),
  INT: (a) => Math.floor(num1(a)),
  TRUNC: (a) => round(num1(a), a[1] === undefined ? 0 : num1(a, 1), 'down'),
  ROUND: (a) => round(num1(a), num1(a, 1), 'half'),
  ROUNDUP: (a) => round(num1(a), num1(a, 1), 'up'),
  ROUNDDOWN: (a) => round(num1(a), num1(a, 1), 'down'),
  CEILING: (a) => {
    const sig = num1(a, 1);
    return sig === 0 ? 0 : Math.ceil(num1(a) / sig) * sig;
  },
  FLOOR: (a) => {
    const sig = num1(a, 1);
    return sig === 0 ? fail(ERRORS.div0) : Math.floor(num1(a) / sig) * sig;
  },
  MOD: (a) => {
    const d = num1(a, 1);
    if (d === 0) fail(ERRORS.div0);
    const n = num1(a);
    return n - d * Math.floor(n / d);
  },
  POWER: (a) => {
    const r = num1(a) ** num1(a, 1);
    return Number.isFinite(r) ? r : fail(ERRORS.num);
  },
  PI: () => Math.PI,
  RAND: () => Math.random(),
  RANDBETWEEN: (a) => {
    const lo = Math.ceil(num1(a));
    const hi = Math.floor(num1(a, 1));
    return hi < lo ? fail(ERRORS.num) : lo + Math.floor(Math.random() * (hi - lo + 1));
  },
  SUMPRODUCT: (a) => {
    const ranges = a.map(table);
    const { rows, cols } = ranges[0];
    if (ranges.some((r) => r.rows !== rows || r.cols !== cols)) fail(ERRORS.value);
    let total = 0;
    for (let r = 0; r < rows; r += 1)
      for (let c = 0; c < cols; c += 1) total += ranges.reduce((p, range) => p * (typeof range.values[r][c] === 'number' ? (range.values[r][c] as number) : 0), 1);
    return total;
  },

  // ----- Conditional
  SUMIF: (a) => {
    const range = table(a[0]);
    const sum = a[2] === undefined ? range : table(a[2]);
    let total = 0;
    range.values.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!matchesCriteria(cell, scalar(a[1]))) return;
        const v = sum.values[r]?.[c];
        if (typeof v === 'number') total += v;
      }),
    );
    return total;
  },
  COUNTIF: (a) => table(a[0]).values.flat().filter((cell) => matchesCriteria(cell, scalar(a[1]))).length,
  AVERAGEIF: (a) => {
    const range = table(a[0]);
    const avg = a[2] === undefined ? range : table(a[2]);
    const picked: number[] = [];
    range.values.forEach((row, r) =>
      row.forEach((cell, c) => {
        const v = avg.values[r]?.[c];
        if (matchesCriteria(cell, scalar(a[1])) && typeof v === 'number') picked.push(v);
      }),
    );
    return picked.length ? picked.reduce((x, y) => x + y, 0) / picked.length : fail(ERRORS.div0);
  },
  SUMIFS: (a) => {
    const sum = table(a[0]);
    const hits = matchingCells(a.slice(1));
    let total = 0;
    hits.forEach((row, r) => row.forEach((hit, c) => hit && typeof sum.values[r][c] === 'number' && (total += sum.values[r][c] as number)));
    return total;
  },
  COUNTIFS: (a) => matchingCells(a).flat().filter(Boolean).length,
  MAXIFS: (a) => extremeIfs(a, Math.max),
  MINIFS: (a) => extremeIfs(a, Math.min),
  AVERAGEIFS: (a) => {
    const avg = table(a[0]);
    const hits = matchingCells(a.slice(1));
    const picked: number[] = [];
    hits.forEach((row, r) => row.forEach((hit, c) => hit && typeof avg.values[r][c] === 'number' && picked.push(avg.values[r][c] as number)));
    return picked.length ? picked.reduce((x, y) => x + y, 0) / picked.length : fail(ERRORS.div0);
  },

  // ----- Logic
  AND: (a) => flatten(a).filter((v) => v !== null).every((v) => toBoolean(v)),
  OR: (a) => flatten(a).filter((v) => v !== null).some((v) => toBoolean(v)),
  NOT: (a) => !toBoolean(scalar(a[0])),
  XOR: (a) => flatten(a).filter((v) => toBoolean(v)).length % 2 === 1,
  TRUE: () => true,
  FALSE: () => false,
  ISBLANK: (a) => scalar(a[0]) === null,
  ISNUMBER: (a) => typeof scalar(a[0]) === 'number',
  ISTEXT: (a) => typeof scalar(a[0]) === 'string',
  ISERROR: (a) => isError(scalar(a[0])),
  ISNA: (a) => scalar(a[0]) === ERRORS.na,
  ISLOGICAL: (a) => typeof scalar(a[0]) === 'boolean',
  NA: () => fail(ERRORS.na),

  // ----- Text
  CONCATENATE: (a) => flatten(a).map(toText).join(''),
  CONCAT: (a) => flatten(a).map(toText).join(''),
  TEXTJOIN: (a) => {
    const skipEmpty = toBoolean(scalar(a[1]));
    return flatten(a.slice(2))
      .filter((v) => !(skipEmpty && (v === null || v === '')))
      .map(toText)
      .join(text1(a));
  },
  LEN: (a) => text1(a).length,
  LEFT: (a) => text1(a).slice(0, a[1] === undefined ? 1 : Math.max(0, num1(a, 1))),
  RIGHT: (a) => {
    const t = text1(a);
    const n = a[1] === undefined ? 1 : Math.max(0, num1(a, 1));
    return n === 0 ? '' : t.slice(-n);
  },
  MID: (a) => {
    const start = num1(a, 1);
    const length = num1(a, 2);
    if (start < 1 || length < 0) fail(ERRORS.value);
    return text1(a).slice(start - 1, start - 1 + length);
  },
  UPPER: (a) => text1(a).toLocaleUpperCase(),
  LOWER: (a) => text1(a).toLocaleLowerCase(),
  PROPER: (a) => text1(a).toLocaleLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toLocaleUpperCase()),
  TRIM: (a) => text1(a).trim().replace(/\s+/g, ' '),
  REPT: (a) => text1(a).repeat(Math.max(0, num1(a, 1))),
  EXACT: (a) => text1(a) === text1(a, 1),
  SUBSTITUTE: (a) => {
    const [source, from, to] = [text1(a), text1(a, 1), text1(a, 2)];
    if (from === '') return source;
    if (a[3] === undefined) return source.split(from).join(to);
    const which = num1(a, 3);
    let seen = 0;
    let out = '';
    let i = 0;
    while (i < source.length) {
      if (source.startsWith(from, i)) {
        seen += 1;
        if (seen === which) {
          out += to;
          i += from.length;
          continue;
        }
        out += from;
        i += from.length;
        continue;
      }
      out += source[i];
      i += 1;
    }
    return out;
  },
  FIND: (a) => {
    const at = text1(a, 1).indexOf(text1(a), a[2] === undefined ? 0 : num1(a, 2) - 1);
    return at < 0 ? fail(ERRORS.value) : at + 1;
  },
  SEARCH: (a) => {
    const at = text1(a, 1).toLocaleLowerCase().indexOf(text1(a).toLocaleLowerCase(), a[2] === undefined ? 0 : num1(a, 2) - 1);
    return at < 0 ? fail(ERRORS.value) : at + 1;
  },
  VALUE: (a) => {
    const v = scalar(a[0]);
    if (typeof v === 'number') return v;
    const n = parseNumber(toText(v));
    return n === null ? fail(ERRORS.value) : n;
  },
  TEXT: (a) => formatValue(scalar(a[0]), text1(a, 1)),
  CHAR: (a) => String.fromCharCode(num1(a)),
  CODE: (a) => text1(a).charCodeAt(0) || fail(ERRORS.value),

  // ----- Lookup
  VLOOKUP: (a) => {
    const data = table(a[1]);
    const col = num1(a, 2);
    if (col < 1 || col > data.cols) fail(ERRORS.ref);
    const exact = a[3] !== undefined && !toBoolean(scalar(a[3]));
    const at = lookupIndex(scalar(a[0]), data.values.map((row) => row[0]), exact);
    return at < 0 ? fail(ERRORS.na) : data.values[at][col - 1];
  },
  HLOOKUP: (a) => {
    const data = table(a[1]);
    const row = num1(a, 2);
    if (row < 1 || row > data.rows) fail(ERRORS.ref);
    const exact = a[3] !== undefined && !toBoolean(scalar(a[3]));
    const at = lookupIndex(scalar(a[0]), data.values[0], exact);
    return at < 0 ? fail(ERRORS.na) : data.values[row - 1][at];
  },
  MATCH: (a) => {
    const flat = flatten([a[1]]);
    const type = a[2] === undefined ? 1 : num1(a, 2);
    const needle = scalar(a[0]);
    if (type === 0) {
      const at = lookupIndex(needle, flat, true);
      return at < 0 ? fail(ERRORS.na) : at + 1;
    }
    if (type > 0) {
      const at = lookupIndex(needle, flat, false);
      return at < 0 ? fail(ERRORS.na) : at + 1;
    }
    let found = -1;
    flat.forEach((v, i) => {
      if (v !== null && !isError(v) && typeof v === typeof needle && compareValues(v, needle) >= 0) found = i;
    });
    return found < 0 ? fail(ERRORS.na) : found + 1;
  },
  INDEX: (a) => {
    const data = table(a[0]);
    let row = a[1] === undefined ? 1 : num1(a, 1);
    let col = a[2] === undefined ? 1 : num1(a, 2);
    if (data.rows === 1 && a[2] === undefined) [row, col] = [1, row];
    if (row < 1 || col < 1 || row > data.rows || col > data.cols) fail(ERRORS.ref);
    return data.values[row - 1][col - 1];
  },
  ROW: (a, ctx) => (a[0] === undefined ? ctx.row + 1 : fail(ERRORS.value)),
  COLUMN: (a, ctx) => (a[0] === undefined ? ctx.col + 1 : fail(ERRORS.value)),
  ROWS: (a) => table(a[0]).rows,
  COLUMNS: (a) => table(a[0]).cols,

  // ----- Date
  TODAY: (_a, ctx) => Math.floor(serialFromDate(ctx.now())),
  NOW: (_a, ctx) => serialFromDate(ctx.now()),
  DATE: (a) => {
    const [y, m, d] = [num1(a), num1(a, 1), num1(a, 2)];
    const base = new Date(Date.UTC(y, m - 1, d));
    return serialFromParts(base.getUTCFullYear(), base.getUTCMonth() + 1, base.getUTCDate());
  },
  YEAR: (a) => partsFromSerial(dateArg(a[0])).year,
  MONTH: (a) => partsFromSerial(dateArg(a[0])).month,
  DAY: (a) => partsFromSerial(dateArg(a[0])).day,
  WEEKDAY: (a) => partsFromSerial(dateArg(a[0])).weekday + 1,
  HOUR: (a) => partsFromSerial(dateArg(a[0])).hour,
  MINUTE: (a) => partsFromSerial(dateArg(a[0])).minute,
  SECOND: (a) => partsFromSerial(dateArg(a[0])).second,
  DAYS: (a) => Math.trunc(dateArg(a[0])) - Math.trunc(dateArg(a[1])),
};


// ----- More: statistics, finance, dates, text and lookups

/** The numbers of a range or list, in order; text and blanks are skipped. */
const numberList = (value: Value): number[] => numbersOf([value]);

function sortedNumbers(value: Value): number[] {
  return numberList(value).sort((x, y) => x - y);
}

/** Excel's PERCENTILE.INC: linear between the closest ranks. */
function percentile(sorted: number[], k: number): number {
  if (sorted.length === 0 || k < 0 || k > 1) fail(ERRORS.num);
  const position = k * (sorted.length - 1);
  const low = Math.floor(position);
  const high = Math.ceil(position);
  return sorted[low] + (sorted[high] - sorted[low]) * (position - low);
}

/** Pairs of numbers from two ranges of the same size; a pair with a non-number in it is dropped. */
function pairsOf(ys: Value, xs: Value): Array<[number, number]> {
  const a = flatten([ys]);
  const b = flatten([xs]);
  if (a.length !== b.length) fail(ERRORS.na);
  const out: Array<[number, number]> = [];
  a.forEach((y, i) => {
    if (typeof y === 'number' && typeof b[i] === 'number') out.push([y, b[i] as number]);
  });
  if (out.length < 2) fail(ERRORS.div0);
  return out;
}

function regression(ys: Value, xs: Value): { slope: number; intercept: number; r: number } {
  const pairs = pairsOf(ys, xs);
  const n = pairs.length;
  const meanY = pairs.reduce((t, [y]) => t + y, 0) / n;
  const meanX = pairs.reduce((t, [, x]) => t + x, 0) / n;
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (const [y, x] of pairs) {
    sxy += (x - meanX) * (y - meanY);
    sxx += (x - meanX) ** 2;
    syy += (y - meanY) ** 2;
  }
  if (sxx === 0 || syy === 0) fail(ERRORS.div0);
  return { slope: sxy / sxx, intercept: meanY - (sxy / sxx) * meanX, r: sxy / Math.sqrt(sxx * syy) };
}

const gcd = (x: number, y: number): number => (y === 0 ? Math.abs(x) : gcd(y, x % y));

/** Payment per period of a loan or annuity (Excel's PMT, with its signs). */
function payment(rate: number, nper: number, pv: number, fv: number, type: number): number {
  if (nper === 0) fail(ERRORS.num);
  if (rate === 0) return -(pv + fv) / nper;
  const growth = (1 + rate) ** nper;
  return -(rate * (pv * growth + fv)) / ((1 + rate * type) * (growth - 1));
}

/** The serial of a date `months` later, the day clamped to the end of a shorter month. */
function addMonths(serial: number, months: number): number {
  const { year, month, day } = partsFromSerial(Math.trunc(serial));
  const total = year * 12 + (month - 1) + Math.trunc(months);
  const y = Math.floor(total / 12);
  const m = (total % 12 + 12) % 12;
  const last = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return serialFromParts(y, m + 1, Math.min(day, last));
}

function datedif(start: number, end: number, unit: string): number {
  if (end < start) fail(ERRORS.num);
  const a = partsFromSerial(start);
  const b = partsFromSerial(end);
  const wholeMonths = (b.year - a.year) * 12 + (b.month - a.month) - (b.day < a.day ? 1 : 0);
  switch (unit.toUpperCase()) {
    case 'Y':
      return Math.floor(wholeMonths / 12);
    case 'M':
      return wholeMonths;
    case 'D':
      return end - start;
    case 'YM':
      return ((wholeMonths % 12) + 12) % 12;
    case 'MD': {
      if (b.day >= a.day) return b.day - a.day;
      const previousMonthLength = new Date(Date.UTC(b.year, b.month - 1, 0)).getUTCDate();
      return previousMonthLength - a.day + b.day;
    }
    case 'YD': {
      const sameYear = serialFromParts(b.year, a.month, Math.min(a.day, new Date(Date.UTC(b.year, a.month, 0)).getUTCDate()));
      return sameYear <= end ? end - sameYear : end - serialFromParts(b.year - 1, a.month, Math.min(a.day, new Date(Date.UTC(b.year - 1, a.month, 0)).getUTCDate()));
    }
    default:
      return fail(ERRORS.num);
  }
}

const isWorkday = (serial: number) => {
  const day = partsFromSerial(serial).weekday;
  return day >= 1 && day <= 5;
};

/** The position XLOOKUP / XMATCH find: exact, or (mode -1 / 1) the next smaller / larger when there is none. */
function findPosition(needle: Scalar, haystack: Scalar[], mode: number, fromEnd: boolean): number {
  const order = haystack.map((_v, i) => i);
  if (fromEnd) order.reverse();
  for (const i of order) {
    const v = haystack[i];
    if (v !== null && !isError(v) && typeof v === typeof needle && compareValues(v, needle) === 0) return i;
  }
  if (mode === 0) return -1;
  let best = -1;
  haystack.forEach((v, i) => {
    if (v === null || isError(v) || typeof v !== typeof needle) return;
    const c = compareValues(v, needle);
    if (mode < 0 ? c < 0 : c > 0) {
      if (best < 0 || (mode < 0 ? compareValues(v, haystack[best]) > 0 : compareValues(v, haystack[best]) < 0)) best = i;
    }
  });
  return best;
}

const MORE: Record<string, Fn> = {
  // Statistics
  LARGE: (a) => {
    const sorted = sortedNumbers(a[0]).reverse();
    const k = num1(a, 1);
    return k >= 1 && k <= sorted.length ? sorted[Math.trunc(k) - 1] : fail(ERRORS.num);
  },
  SMALL: (a) => {
    const sorted = sortedNumbers(a[0]);
    const k = num1(a, 1);
    return k >= 1 && k <= sorted.length ? sorted[Math.trunc(k) - 1] : fail(ERRORS.num);
  },
  RANK: (a) => {
    const x = num1(a);
    const values = numberList(a[1]);
    if (!values.includes(x)) fail(ERRORS.na);
    const ascending = a[2] !== undefined && num1(a, 2) !== 0;
    return 1 + values.filter((v) => (ascending ? v < x : v > x)).length;
  },
  MODE: (a) => {
    const counts = new Map<number, number>();
    for (const v of numbersOf(a)) counts.set(v, (counts.get(v) ?? 0) + 1);
    let best: number | null = null;
    let most = 1;
    for (const [v, n] of counts)
      if (n > most) {
        best = v;
        most = n;
      }
    return best ?? fail(ERRORS.na);
  },
  VAR: (a) => stdev(numbersOf(a), true) ** 2,
  VARP: (a) => stdev(numbersOf(a), false) ** 2,
  PERCENTILE: (a) => percentile(sortedNumbers(a[0]), num1(a, 1)),
  QUARTILE: (a) => {
    const q = Math.trunc(num1(a, 1));
    return q >= 0 && q <= 4 ? percentile(sortedNumbers(a[0]), q / 4) : fail(ERRORS.num);
  },
  SUMSQ: (a) => numbersOf(a).reduce((t, v) => t + v * v, 0),
  CORREL: (a) => regression(a[0], a[1]).r,
  SLOPE: (a) => regression(a[0], a[1]).slope,
  INTERCEPT: (a) => regression(a[0], a[1]).intercept,
  FORECAST: (a) => {
    const { slope, intercept } = regression(a[1], a[2]);
    return intercept + slope * num1(a);
  },

  // Math
  ISODD: (a) => Math.abs(Math.trunc(num1(a))) % 2 === 1,
  ISEVEN: (a) => Math.abs(Math.trunc(num1(a))) % 2 === 0,
  GCD: (a) => numbersOf(a).reduce((t, v) => gcd(t, Math.trunc(v)), 0),
  LCM: (a) => numbersOf(a).reduce((t, v) => (t === 0 || v === 0 ? 0 : Math.abs(t * Math.trunc(v)) / gcd(t, Math.trunc(v))), 1),
  FACT: (a) => {
    const n = Math.trunc(num1(a));
    if (n < 0 || n > 170) fail(ERRORS.num);
    let r = 1;
    for (let i = 2; i <= n; i += 1) r *= i;
    return r;
  },
  COMBIN: (a) => {
    const n = Math.trunc(num1(a));
    const k = Math.trunc(num1(a, 1));
    if (n < 0 || k < 0 || k > n) fail(ERRORS.num);
    let r = 1;
    for (let i = 1; i <= Math.min(k, n - k); i += 1) r = (r * (n - i + 1)) / i;
    return Math.round(r);
  },

  // Finance
  PMT: (a) => payment(num1(a), num1(a, 1), num1(a, 2), a[3] === undefined ? 0 : num1(a, 3), a[4] === undefined ? 0 : num1(a, 4)),
  FV: (a) => {
    const [rate, nper, pmt] = [num1(a), num1(a, 1), num1(a, 2)];
    const pv = a[3] === undefined ? 0 : num1(a, 3);
    const type = a[4] === undefined ? 0 : num1(a, 4);
    if (rate === 0) return -(pv + pmt * nper);
    const growth = (1 + rate) ** nper;
    return -(pv * growth + (pmt * (1 + rate * type) * (growth - 1)) / rate);
  },
  PV: (a) => {
    const [rate, nper, pmt] = [num1(a), num1(a, 1), num1(a, 2)];
    const fv = a[3] === undefined ? 0 : num1(a, 3);
    const type = a[4] === undefined ? 0 : num1(a, 4);
    if (rate === 0) return -(fv + pmt * nper);
    const growth = (1 + rate) ** nper;
    return -(fv + (pmt * (1 + rate * type) * (growth - 1)) / rate) / growth;
  },
  NPV: (a) => {
    const rate = num1(a);
    return numbersOf(a.slice(1)).reduce((t, v, i) => t + v / (1 + rate) ** (i + 1), 0);
  },
  IRR: (a) => {
    const flows = numberList(a[0]);
    if (!flows.some((v) => v > 0) || !flows.some((v) => v < 0)) fail(ERRORS.num);
    const value = (r: number) => flows.reduce((t, v, i) => t + v / (1 + r) ** i, 0);
    let rate = a[1] === undefined ? 0.1 : num1(a, 1);
    for (let i = 0; i < 100; i += 1) {
      const f = value(rate);
      const df = (value(rate + 1e-6) - f) / 1e-6;
      if (df === 0 || !Number.isFinite(df)) break;
      const next = rate - f / df;
      if (!Number.isFinite(next) || next <= -1) break;
      if (Math.abs(next - rate) < 1e-10) return next;
      rate = next;
    }
    return fail(ERRORS.num);
  },

  // Dates
  EDATE: (a) => addMonths(dateArg(a[0]), num1(a, 1)),
  EOMONTH: (a) => {
    const moved = partsFromSerial(addMonths(dateArg(a[0]), num1(a, 1)));
    return serialFromParts(moved.year, moved.month, new Date(Date.UTC(moved.year, moved.month, 0)).getUTCDate());
  },
  DATEDIF: (a) => datedif(Math.trunc(dateArg(a[0])), Math.trunc(dateArg(a[1])), text1(a, 2)),
  NETWORKDAYS: (a) => {
    const start = Math.trunc(dateArg(a[0]));
    const end = Math.trunc(dateArg(a[1]));
    const [from, to, sign] = start <= end ? [start, end, 1] : [end, start, -1];
    let count = 0;
    for (let d = from; d <= to; d += 1) if (isWorkday(d)) count += 1;
    return count * sign;
  },
  WORKDAY: (a) => {
    let date = Math.trunc(dateArg(a[0]));
    let left = Math.trunc(num1(a, 1));
    const step = left < 0 ? -1 : 1;
    left = Math.abs(left);
    while (left > 0) {
      date += step;
      if (isWorkday(date)) left -= 1;
    }
    return date;
  },

  // Text
  REPLACE: (a) => {
    const [at, length] = [Math.trunc(num1(a, 1)), Math.trunc(num1(a, 2))];
    if (at < 1 || length < 0) fail(ERRORS.value);
    const t = text1(a);
    return t.slice(0, at - 1) + text1(a, 3) + t.slice(at - 1 + length);
  },
  TEXTBEFORE: (a) => {
    const t = text1(a);
    const at = t.indexOf(text1(a, 1));
    return at < 0 ? fail(ERRORS.na) : t.slice(0, at);
  },
  TEXTAFTER: (a) => {
    const t = text1(a);
    const delimiter = text1(a, 1);
    const at = t.indexOf(delimiter);
    return at < 0 ? fail(ERRORS.na) : t.slice(at + delimiter.length);
  },
  // eslint-disable-next-line no-control-regex
  CLEAN: (a) => text1(a).replace(/[\u0000-\u001f]/g, ''),
  T: (a) => {
    const v = scalar(a[0]);
    return typeof v === 'string' ? v : '';
  },
  HYPERLINK: (a) => (a[1] === undefined ? text1(a) : toText(scalar(a[1]))),
  ADDRESS: (a) => {
    const [row, col] = [Math.trunc(num1(a)), Math.trunc(num1(a, 1))];
    if (row < 1 || col < 1) fail(ERRORS.value);
    const mode = a[2] === undefined ? 1 : Math.trunc(num1(a, 2));
    return `${mode === 1 || mode === 3 ? '$' : ''}${columnName(col - 1)}${mode === 1 || mode === 2 ? '$' : ''}${row}`;
  },

  // Lookup
  XMATCH: (a) => {
    const at = findPosition(scalar(a[0]), flatten([a[1]]), a[2] === undefined ? 0 : num1(a, 2), a[3] !== undefined && num1(a, 3) < 0);
    return at < 0 ? fail(ERRORS.na) : at + 1;
  },
  XLOOKUP: (a) => {
    const lookup = table(a[1]);
    const results = table(a[2]);
    const vertical = lookup.cols === 1;
    const at = findPosition(scalar(a[0]), flatten([a[1]]), a[4] === undefined ? 0 : num1(a, 4), a[5] !== undefined && num1(a, 5) < 0);
    if (at < 0) return a[3] === undefined ? fail(ERRORS.na) : a[3];
    if (vertical) {
      if (at >= results.rows) fail(ERRORS.ref);
      return results.cols === 1 ? results.values[at][0] : { kind: 'range', rows: 1, cols: results.cols, values: [results.values[at]] };
    }
    if (at >= results.cols) fail(ERRORS.ref);
    return results.rows === 1 ? results.values[0][at] : { kind: 'range', rows: results.rows, cols: 1, values: results.values.map((row) => [row[at]]) };
  },
  LOOKUP: (a) => {
    const vector = flatten([a[1]]);
    const at = lookupIndex(scalar(a[0]), vector, false);
    if (at < 0) fail(ERRORS.na);
    const results = a[2] === undefined ? vector : flatten([a[2]]);
    return at < results.length ? results[at] : fail(ERRORS.ref);
  },
};

Object.assign(FUNCTIONS, MORE);

// ----- Arrays (the workbook spills what they return into the cells beside the formula)

/** The most cells an array function makes. */
const MAX_ARRAY_CELLS = 100_000;

const block = (values: Scalar[][]): RangeValue => ({ kind: 'range', rows: values.length, cols: values[0]?.length ?? 0, values });

const transposed = (values: Scalar[][]): Scalar[][] => (values[0] ?? []).map((_x, c) => values.map((row) => row[c]));

/** The same rows twice are one: text compares without regard to case. */
const rowKey = (row: Scalar[]): string =>
  JSON.stringify(row.map((v) => (typeof v === 'string' ? v.toLowerCase() : isError(v) ? v.code : v)));

/** Orders two values, `direction` 1 up or -1 down; blanks go last either way, as in Excel. */
function compareForSort(a: Scalar, b: Scalar, direction = 1): number {
  const blankA = a === null || a === '';
  const blankB = b === null || b === '';
  if (blankA || blankB) return blankA === blankB ? 0 : blankA ? 1 : -1;
  return direction * compareValues(a, b);
}

const flag = (a: Value[], i: number, otherwise = false): boolean => (a[i] === undefined ? otherwise : toBoolean(scalar(a[i])));

const ARRAYS: Record<string, Fn> = {
  SEQUENCE: (a) => {
    const rows = Math.trunc(num1(a));
    const cols = a[1] === undefined ? 1 : Math.trunc(num1(a, 1));
    const start = a[2] === undefined ? 1 : num1(a, 2);
    const step = a[3] === undefined ? 1 : num1(a, 3);
    if (rows < 1 || cols < 1 || rows * cols > MAX_ARRAY_CELLS) fail(ERRORS.num);
    return block(Array.from({ length: rows }, (_r, r) => Array.from({ length: cols }, (_c, c) => start + (r * cols + c) * step)));
  },
  TRANSPOSE: (a) => block(transposed(table(a[0]).values)),
  UNIQUE: (a) => {
    const byColumn = flag(a, 1);
    const once = flag(a, 2);
    const lines = byColumn ? transposed(table(a[0]).values) : table(a[0]).values;
    const counts = new Map<string, number>();
    for (const line of lines) counts.set(rowKey(line), (counts.get(rowKey(line)) ?? 0) + 1);
    const seen = new Set<string>();
    const kept: Scalar[][] = [];
    for (const line of lines) {
      const key = rowKey(line);
      if (seen.has(key)) continue;
      seen.add(key);
      if (!once || counts.get(key) === 1) kept.push(line);
    }
    if (kept.length === 0) fail(ERRORS.na);
    return block(byColumn ? transposed(kept) : kept);
  },
  SORT: (a) => {
    const byColumn = flag(a, 3);
    const lines = byColumn ? transposed(table(a[0]).values) : table(a[0]).values;
    const index = a[1] === undefined ? 1 : Math.trunc(num1(a, 1));
    const direction = a[2] === undefined ? 1 : num1(a, 2) < 0 ? -1 : 1;
    if (index < 1 || index > (lines[0]?.length ?? 0)) fail(ERRORS.value);
    const sorted = lines
      .map((line, i) => ({ line, i }))
      .sort((x, y) => compareForSort(x.line[index - 1], y.line[index - 1], direction) || x.i - y.i)
      .map((item) => item.line);
    return block(byColumn ? transposed(sorted) : sorted);
  },
  SORTBY: (a) => {
    const lines = table(a[0]).values;
    const keys = flatten([a[1]]);
    if (keys.length !== lines.length) fail(ERRORS.value);
    const direction = a[2] === undefined ? 1 : num1(a, 2) < 0 ? -1 : 1;
    return block(
      lines
        .map((line, i) => ({ line, key: keys[i], i }))
        .sort((x, y) => compareForSort(x.key, y.key, direction) || x.i - y.i)
        .map((item) => item.line),
    );
  },
  FILTER: (a) => {
    const data = table(a[0]);
    const include = flatten([a[1]]);
    const byColumn = data.rows === 1 && data.cols > 1 && include.length === data.cols;
    const lines = byColumn ? transposed(data.values) : data.values;
    if (include.length !== lines.length) fail(ERRORS.value);
    const kept = lines.filter((_line, i) => {
      const v = include[i];
      if (isError(v)) fail(v);
      return v !== null && v !== '' && (typeof v === 'number' ? v !== 0 : toBoolean(v));
    });
    if (kept.length === 0) return a[2] === undefined ? fail(ERRORS.na) : a[2];
    return block(byColumn ? transposed(kept) : kept);
  },
};

Object.assign(FUNCTIONS, ARRAYS);
