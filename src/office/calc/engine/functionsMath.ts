import { ERRORS, fail, flatten, isRange, type Value } from './values';
import { num1, numbersOf, scalar, text1, type Fn } from './functions';
import { erf, erfcTail } from './functionsStats';

const finite =
  (f: (n: number) => number): Fn =>
  (a) => {
    const r = f(num1(a));
    return Number.isFinite(r) ? r : fail(ERRORS.num);
  };

/** Pairs of numbers from two equally sized ranges, for the sums of squares. */
function pairs(first: Value, second: Value): Array<[number, number]> {
  const x = flatten([first]);
  const y = flatten([second]);
  if (x.length !== y.length) fail(ERRORS.na);
  const out: Array<[number, number]> = [];
  x.forEach((v, i) => {
    if (typeof v === 'number' && typeof y[i] === 'number') out.push([v, y[i] as number]);
  });
  return out;
}

/** Rounds half away from zero to a multiple. */
const toMultiple = (n: number, step: number): number => {
  const q = n / step;
  return Math.sign(q) * Math.floor(Math.abs(q) + 0.5 + 1e-12) * step;
};

const BASE_BITS = { 2: 10, 8: 30, 16: 40 } as const;
const DIGITS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** DEC2BIN, DEC2OCT, DEC2HEX: negative numbers are two's complement in 10, 30 or 40 bits. */
const fromDecimal =
  (radix: 2 | 8 | 16): Fn =>
  (a) => {
    const n = Math.trunc(num1(a));
    const limit = 2 ** (BASE_BITS[radix] - 1);
    if (n < -limit || n >= limit) fail(ERRORS.num);
    const text = (n < 0 ? n + 2 ** BASE_BITS[radix] : n).toString(radix).toUpperCase();
    if (a[1] === undefined || n < 0) return text;
    const places = Math.trunc(num1(a, 1));
    return places < text.length || places > 10 ? fail(ERRORS.num) : text.padStart(places, '0');
  };

/** BIN2DEC, OCT2DEC, HEX2DEC: a value with its top bit set is negative. */
const toDecimal =
  (radix: 2 | 8 | 16): Fn =>
  (a) => {
    const text = text1(a).trim().toUpperCase();
    if (text.length === 0 || text.length > 10 || [...text].some((ch) => DIGITS.indexOf(ch) < 0 || DIGITS.indexOf(ch) >= radix)) return fail(ERRORS.num);
    const value = parseInt(text, radix);
    const bits = BASE_BITS[radix];
    return value >= 2 ** (bits - 1) ? value - 2 ** bits : value;
  };

const ROMAN_PARTS: Array<[number, string]> = [
  [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
];

/** ln Γ(x) for x > 0: Stirling's series, after shifting x up to where it converges fast. */
function logGamma(x: number): number {
  let shift = 0;
  let y = x;
  while (y < 15) {
    shift += Math.log(y);
    y += 1;
  }
  const inv = 1 / y;
  const inv2 = inv * inv;
  const series = inv * (1 / 12 - inv2 * (1 / 360 - inv2 * (1 / 1260 - inv2 * (1 / 1680 - inv2 * (1 / 1188)))));
  return (y - 0.5) * Math.log(y) - y + 0.5 * Math.log(2 * Math.PI) + series - shift;
}

export const MATH_FUNCTIONS: Record<string, Fn> = {
  GAMMALN: (a) => (num1(a) <= 0 ? fail(ERRORS.num) : logGamma(num1(a))),
  'GAMMALN.PRECISE': (a) => (num1(a) <= 0 ? fail(ERRORS.num) : logGamma(num1(a))),
  ERF: (a) => (a[1] === undefined ? erf(num1(a)) : erf(num1(a, 1)) - erf(num1(a))),
  ERFC: (a) => (num1(a) >= 2 ? erfcTail(num1(a)) : 1 - erf(num1(a))),
  PERMUT: (a) => {
    const [n, k] = [Math.trunc(num1(a)), Math.trunc(num1(a, 1))];
    if (n < 0 || k < 0 || k > n) return fail(ERRORS.num);
    let result = 1;
    for (let i = 0; i < k; i += 1) result *= n - i;
    return result;
  },
  SIN: finite(Math.sin),
  COS: finite(Math.cos),
  TAN: finite(Math.tan),
  ASIN: finite(Math.asin),
  ACOS: finite(Math.acos),
  ATAN: finite(Math.atan),
  SINH: finite(Math.sinh),
  COSH: finite(Math.cosh),
  TANH: finite(Math.tanh),
  ASINH: finite(Math.asinh),
  ACOSH: finite(Math.acosh),
  ATANH: finite(Math.atanh),
  ATAN2: (a) => {
    const [x, y] = [num1(a), num1(a, 1)];
    return x === 0 && y === 0 ? fail(ERRORS.div0) : Math.atan2(y, x);
  },
  DEGREES: finite((n) => (n * 180) / Math.PI),
  RADIANS: finite((n) => (n * Math.PI) / 180),
  QUOTIENT: (a) => {
    const d = num1(a, 1);
    return d === 0 ? fail(ERRORS.div0) : Math.trunc(num1(a) / d);
  },
  EVEN: (a) => {
    const n = num1(a);
    const up = Math.ceil(Math.abs(n));
    return Math.sign(n) * (up % 2 === 0 ? up : up + 1);
  },
  ODD: (a) => {
    const n = num1(a);
    const up = Math.ceil(Math.abs(n));
    return (n < 0 ? -1 : 1) * (up % 2 === 1 ? up : up + 1);
  },
  MROUND: (a) => {
    const [n, step] = [num1(a), num1(a, 1)];
    if (step === 0) return 0;
    return n * step < 0 ? fail(ERRORS.num) : toMultiple(n, step);
  },
  'CEILING.MATH': (a) => {
    const n = num1(a);
    const step = a[1] === undefined ? 1 : Math.abs(num1(a, 1));
    if (step === 0) return 0;
    const towardZero = n < 0 && a[2] !== undefined && num1(a, 2) !== 0;
    return (towardZero ? Math.floor(n / step) : Math.ceil(n / step)) * step;
  },
  'FLOOR.MATH': (a) => {
    const n = num1(a);
    const step = a[1] === undefined ? 1 : Math.abs(num1(a, 1));
    if (step === 0) return 0;
    const towardZero = n < 0 && a[2] !== undefined && num1(a, 2) !== 0;
    return (towardZero ? Math.ceil(n / step) : Math.floor(n / step)) * step;
  },
  SUMX2MY2: (a) => pairs(a[0], a[1]).reduce((t, [x, y]) => t + x * x - y * y, 0),
  SUMX2PY2: (a) => pairs(a[0], a[1]).reduce((t, [x, y]) => t + x * x + y * y, 0),
  SUMXMY2: (a) => pairs(a[0], a[1]).reduce((t, [x, y]) => t + (x - y) ** 2, 0),
  MULTINOMIAL: (a) => {
    const values = numbersOf(a).map(Math.trunc);
    if (values.some((v) => v < 0)) fail(ERRORS.num);
    const total = values.reduce((t, v) => t + v, 0);
    let r = 1;
    let running = 0;
    for (const v of values) {
      for (let i = 1; i <= v; i += 1) r = (r * (running + i)) / i;
      running += v;
    }
    return total > 170 ? fail(ERRORS.num) : Math.round(r);
  },
  DEC2BIN: fromDecimal(2),
  DEC2OCT: fromDecimal(8),
  DEC2HEX: fromDecimal(16),
  BIN2DEC: toDecimal(2),
  OCT2DEC: toDecimal(8),
  HEX2DEC: toDecimal(16),
  BASE: (a) => {
    const [n, radix] = [Math.trunc(num1(a)), Math.trunc(num1(a, 1))];
    if (n < 0 || radix < 2 || radix > 36) fail(ERRORS.num);
    const text = n.toString(radix).toUpperCase();
    return a[2] === undefined ? text : text.padStart(Math.trunc(num1(a, 2)), '0');
  },
  DECIMAL: (a) => {
    const text = text1(a).trim().toUpperCase();
    const radix = Math.trunc(num1(a, 1));
    if (radix < 2 || radix > 36 || text === '' || [...text].some((ch) => DIGITS.indexOf(ch) < 0 || DIGITS.indexOf(ch) >= radix)) return fail(ERRORS.num);
    return parseInt(text, radix);
  },
  ROMAN: (a) => {
    let n = Math.trunc(num1(a));
    if (n < 0 || n > 3999) fail(ERRORS.value);
    let out = '';
    for (const [value, symbol] of ROMAN_PARTS)
      while (n >= value) {
        out += symbol;
        n -= value;
      }
    return out;
  },
  ARABIC: (a) => {
    const text = text1(a).trim().toUpperCase();
    if (!/^[MDCLXVI]*$/.test(text)) fail(ERRORS.value);
    const value = (ch: string) => ROMAN_PARTS.find(([, symbol]) => symbol === ch)?.[0] ?? 0;
    let total = 0;
    for (let i = 0; i < text.length; i += 1) total += value(text[i]) < value(text[i + 1] ?? '') ? -value(text[i]) : value(text[i]);
    return total;
  },
  // Matrices
  MMULT: (a) => {
    const [x, y] = [matrix(a[0]), matrix(a[1])];
    if (x[0].length !== y.length) fail(ERRORS.value);
    return toBlock(x.map((row) => y[0].map((_c, j) => row.reduce((t, v, k) => t + v * y[k][j], 0))));
  },
  MDETERM: (a) => {
    const m = matrix(a[0]);
    if (m.length !== m[0].length) fail(ERRORS.value);
    return determinant(m);
  },
  MINVERSE: (a) => {
    const m = matrix(a[0]);
    if (m.length !== m[0].length) fail(ERRORS.value);
    const inverse = invert(m);
    return inverse ? toBlock(inverse) : fail(ERRORS.num);
  },
  MUNIT: (a) => {
    const n = Math.trunc(num1(a));
    if (n < 1 || n > 200) fail(ERRORS.value);
    return toBlock(Array.from({ length: n }, (_r, i) => Array.from({ length: n }, (_c, j) => (i === j ? 1 : 0))));
  },
};

function matrix(value: Value): number[][] {
  const rows = isRange(value) ? value.values : [[scalar(value)]];
  return rows.map((row) => row.map((cell) => (typeof cell === 'number' ? cell : fail(ERRORS.value))));
}

const toBlock = (values: number[][]) => ({ kind: 'range' as const, rows: values.length, cols: values[0].length, values });

function determinant(m: number[][]): number {
  const a = m.map((row) => [...row]);
  let det = 1;
  for (let c = 0; c < a.length; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < a.length; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[pivot][c])) pivot = r;
    if (a[pivot][c] === 0) return 0;
    if (pivot !== c) {
      [a[pivot], a[c]] = [a[c], a[pivot]];
      det = -det;
    }
    det *= a[c][c];
    for (let r = c + 1; r < a.length; r += 1) {
      const f = a[r][c] / a[c][c];
      for (let k = c; k < a.length; k += 1) a[r][k] -= f * a[c][k];
    }
  }
  return det;
}

function invert(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_x, j) => (i === j ? 1 : 0))]);
  for (let c = 0; c < n; c += 1) {
    let pivot = c;
    for (let r = c + 1; r < n; r += 1) if (Math.abs(a[r][c]) > Math.abs(a[pivot][c])) pivot = r;
    if (Math.abs(a[pivot][c]) < 1e-14) return null;
    [a[pivot], a[c]] = [a[c], a[pivot]];
    const d = a[c][c];
    for (let k = 0; k < 2 * n; k += 1) a[c][k] /= d;
    for (let r = 0; r < n; r += 1) {
      if (r === c) continue;
      const f = a[r][c];
      for (let k = 0; k < 2 * n; k += 1) a[r][k] -= f * a[c][k];
    }
  }
  return a.map((row) => row.slice(n));
}
