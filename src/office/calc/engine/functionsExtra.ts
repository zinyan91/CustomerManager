import {
  betaI, betaInverse, betaPdf, chiCdf, chiInverse, chiPdf, fCdf, fInverse, fPdf, gammaCdf, gammaInverse, gammaPdf, normalInverse, tCdf, tInverse, tPdf,
} from './distributions';
import { flag, num1, numbersOf, scalar, stdev, type Fn } from './functions';
import { lnGamma, normalCdf } from './functionsStats';
import { ERRORS, fail, isError, isRange, toNumber, type Value } from './values';

const needNum = (ok: boolean): void => {
  if (!ok) fail(ERRORS.num);
};

const probability = (p: number): number => {
  needNum(p > 0 && p < 1);
  return p;
};

const degrees = (a: Value[], i: number): number => {
  const df = Math.trunc(num1(a, i));
  needNum(df >= 1);
  return df;
};

/** The 32-bit-safe integer a bit function takes: whole, not negative, under 2^48. */
function bitsArg(a: Value[], i: number): number {
  const n = num1(a, i);
  needNum(n >= 0 && n === Math.trunc(n) && n < 2 ** 48);
  return n;
}

const bitwise =
  (op: (x: bigint, y: bigint) => bigint): Fn =>
  (a) => Number(op(BigInt(bitsArg(a, 0)), BigInt(bitsArg(a, 1))));

function shift(a: Value[], left: boolean): number {
  const n = bitsArg(a, 0);
  const amount = Math.trunc(num1(a, 1));
  needNum(Math.abs(amount) <= 53);
  const toLeft = left ? amount >= 0 : amount < 0;
  const result = toLeft ? BigInt(n) << BigInt(Math.abs(amount)) : BigInt(n) >> BigInt(Math.abs(amount));
  needNum(result < 2n ** 48n);
  return Number(result);
}

const BASE_BITS = { 8: 30, 16: 40 } as const;

/** BIN2OCT and BIN2HEX: BIN2DEC's two's complement reading of ten bits, written in another base. */
const fromBinary =
  (radix: 8 | 16): Fn =>
  (a) => {
    const raw = scalar(a[0] ?? null);
    const digits = typeof raw === 'number' ? String(raw) : String(raw ?? '');
    if (!/^[01]{1,10}$/.test(digits)) return fail(ERRORS.num);
    let n = parseInt(digits, 2);
    if (digits.length === 10 && digits[0] === '1') n -= 1024;
    const places = a[1] === undefined ? 0 : Math.trunc(num1(a, 1));
    const text = (n < 0 ? n + 2 ** BASE_BITS[radix] : n).toString(radix).toUpperCase();
    if (n >= 0 && a[1] !== undefined) {
      needNum(places >= text.length && places <= 10);
      return text.padStart(places, '0');
    }
    return text;
  };

/** The numbers of the A-functions: text counts as 0, TRUE as 1 and FALSE as 0 inside a range. */
function withText(args: Value[]): number[] {
  const out: number[] = [];
  for (const arg of args) {
    if (isRange(arg)) {
      for (const row of arg.values)
        for (const cell of row) {
          if (isError(cell)) fail(cell);
          if (typeof cell === 'number') out.push(cell);
          else if (typeof cell === 'boolean') out.push(cell ? 1 : 0);
          else if (typeof cell === 'string') out.push(0);
        }
    } else if (arg !== null) out.push(toNumber(arg));
  }
  return out;
}

function variance(values: number[], sample: boolean): number {
  const divisor = values.length - (sample ? 1 : 0);
  if (divisor <= 0) return fail(ERRORS.div0);
  const mean = values.reduce((t, v) => t + v, 0) / values.length;
  return values.reduce((t, v) => t + (v - mean) ** 2, 0) / divisor;
}

const cdfOrPdf = (a: Value[], i: number, cdf: () => number, pdf: () => number): number => (flag(a, i) ? cdf() : pdf());

/** A and B bounds of BETA.DIST/BETA.INV, 0 and 1 when left out. */
function betaBounds(a: Value[], at: number): [number, number] {
  const low = a[at] === undefined ? 0 : num1(a, at);
  const high = a[at + 1] === undefined ? 1 : num1(a, at + 1);
  needNum(high > low);
  return [low, high];
}

export const EXTRA_FUNCTIONS: Record<string, Fn> = {
  BITAND: bitwise((x, y) => x & y),
  BITOR: bitwise((x, y) => x | y),
  BITXOR: bitwise((x, y) => x ^ y),
  BITLSHIFT: (a) => shift(a, true),
  BITRSHIFT: (a) => shift(a, false),
  BIN2OCT: fromBinary(8),
  BIN2HEX: fromBinary(16),

  COT: (a) => (num1(a) === 0 ? fail(ERRORS.div0) : 1 / Math.tan(num1(a))),
  COTH: (a) => (num1(a) === 0 ? fail(ERRORS.div0) : 1 / Math.tanh(num1(a))),
  SEC: (a) => 1 / Math.cos(num1(a)),
  SECH: (a) => 1 / Math.cosh(num1(a)),
  CSC: (a) => (num1(a) === 0 ? fail(ERRORS.div0) : 1 / Math.sin(num1(a))),
  CSCH: (a) => (num1(a) === 0 ? fail(ERRORS.div0) : 1 / Math.sinh(num1(a))),
  ACOT: (a) => Math.atan(1 / (num1(a) === 0 ? Infinity : num1(a))) + (num1(a) < 0 ? Math.PI : 0),
  ACOTH: (a) => {
    needNum(Math.abs(num1(a)) > 1);
    return 0.5 * Math.log((num1(a) + 1) / (num1(a) - 1));
  },
  SQRTPI: (a) => (num1(a) < 0 ? fail(ERRORS.num) : Math.sqrt(num1(a) * Math.PI)),
  FACTDOUBLE: (a) => {
    const n = Math.trunc(num1(a));
    needNum(n >= -1);
    let product = 1;
    for (let k = n; k > 1; k -= 2) product *= k;
    return product;
  },
  DELTA: (a) => (num1(a) === (a[1] === undefined ? 0 : num1(a, 1)) ? 1 : 0),
  GESTEP: (a) => (num1(a) >= (a[1] === undefined ? 0 : num1(a, 1)) ? 1 : 0),
  COMBINA: (a) => {
    const n = Math.trunc(num1(a));
    const k = Math.trunc(num1(a, 1));
    needNum(n >= 0 && k >= 0 && (n > 0 || k === 0));
    if (n === 0) return 1;
    return Math.round(Math.exp(lnGamma(n + k) - lnGamma(k + 1) - lnGamma(n)));
  },
  GAMMA: (a) => {
    const x = num1(a);
    needNum(!(x <= 0 && x === Math.trunc(x)));
    if (x > 0) return Math.exp(lnGamma(x));
    // Reflection for a negative non-integer.
    return Math.PI / (Math.sin(Math.PI * x) * Math.exp(lnGamma(1 - x)));
  },
  FISHER: (a) => {
    needNum(Math.abs(num1(a)) < 1);
    return Math.atanh(num1(a));
  },
  FISHERINV: (a) => Math.tanh(num1(a)),
  PHI: (a) => Math.exp(-0.5 * num1(a) ** 2) / Math.sqrt(2 * Math.PI),
  GAUSS: (a) => normalCdf(num1(a)) - 0.5,
  RRI: (a) => {
    const periods = num1(a);
    needNum(periods > 0);
    const [present, future] = [num1(a, 1), num1(a, 2)];
    if (present === 0) return fail(ERRORS.num);
    const ratio = future / present;
    needNum(ratio >= 0);
    return ratio ** (1 / periods) - 1;
  },
  SERIESSUM: (a) => {
    const [x, n, m] = [num1(a), num1(a, 1), num1(a, 2)];
    const coefficients = numbersOf([a[3] ?? null]);
    return coefficients.reduce((total, c, i) => total + c * x ** (n + i * m), 0);
  },

  STDEVA: (a) => Math.sqrt(variance(withText(a), true)),
  STDEVPA: (a) => Math.sqrt(variance(withText(a), false)),
  VARA: (a) => variance(withText(a), true),
  VARPA: (a) => variance(withText(a), false),

  'T.DIST': (a) => {
    const [x, df] = [num1(a), degrees(a, 1)];
    return cdfOrPdf(a, 2, () => tCdf(x, df), () => tPdf(x, df));
  },
  'T.DIST.RT': (a) => 1 - tCdf(num1(a), degrees(a, 1)),
  'T.DIST.2T': (a) => {
    const [x, df] = [num1(a), degrees(a, 1)];
    needNum(x >= 0);
    return 2 * (1 - tCdf(x, df));
  },
  'T.INV': (a) => tInverse(probability(num1(a)), degrees(a, 1)),
  'T.INV.2T': (a) => tInverse(1 - probability(num1(a)) / 2, degrees(a, 1)),
  TDIST: (a) => {
    const [x, df, tails] = [num1(a), degrees(a, 1), Math.trunc(num1(a, 2))];
    needNum(x >= 0 && (tails === 1 || tails === 2));
    return tails * (1 - tCdf(x, df));
  },
  TINV: (a) => tInverse(1 - probability(num1(a)) / 2, degrees(a, 1)),

  'CHISQ.DIST': (a) => {
    const [x, df] = [num1(a), degrees(a, 1)];
    needNum(x >= 0);
    return cdfOrPdf(a, 2, () => chiCdf(x, df), () => chiPdf(x, df));
  },
  'CHISQ.DIST.RT': (a) => {
    needNum(num1(a) >= 0);
    return 1 - chiCdf(num1(a), degrees(a, 1));
  },
  'CHISQ.INV': (a) => chiInverse(probability(num1(a)), degrees(a, 1)),
  'CHISQ.INV.RT': (a) => chiInverse(1 - probability(num1(a)), degrees(a, 1)),
  CHIDIST: (a) => {
    needNum(num1(a) >= 0);
    return 1 - chiCdf(num1(a), degrees(a, 1));
  },
  CHIINV: (a) => chiInverse(1 - probability(num1(a)), degrees(a, 1)),

  'F.DIST': (a) => {
    const [x, d1, d2] = [num1(a), degrees(a, 1), degrees(a, 2)];
    needNum(x >= 0);
    return cdfOrPdf(a, 3, () => fCdf(x, d1, d2), () => fPdf(x, d1, d2));
  },
  'F.DIST.RT': (a) => {
    needNum(num1(a) >= 0);
    return 1 - fCdf(num1(a), degrees(a, 1), degrees(a, 2));
  },
  'F.INV': (a) => fInverse(probability(num1(a)), degrees(a, 1), degrees(a, 2)),
  'F.INV.RT': (a) => fInverse(1 - probability(num1(a)), degrees(a, 1), degrees(a, 2)),
  FDIST: (a) => {
    needNum(num1(a) >= 0);
    return 1 - fCdf(num1(a), degrees(a, 1), degrees(a, 2));
  },
  FINV: (a) => fInverse(1 - probability(num1(a)), degrees(a, 1), degrees(a, 2)),

  'GAMMA.DIST': (a) => {
    const [x, alpha, beta] = [num1(a), num1(a, 1), num1(a, 2)];
    needNum(x >= 0 && alpha > 0 && beta > 0);
    return cdfOrPdf(a, 3, () => gammaCdf(x, alpha, beta), () => gammaPdf(x, alpha, beta));
  },
  'GAMMA.INV': (a) => {
    const [alpha, beta] = [num1(a, 1), num1(a, 2)];
    needNum(alpha > 0 && beta > 0 && num1(a) >= 0 && num1(a) < 1);
    return num1(a) === 0 ? 0 : gammaInverse(num1(a), alpha, beta);
  },
  'BETA.DIST': (a) => {
    const [x, alpha, beta] = [num1(a), num1(a, 1), num1(a, 2)];
    const [low, high] = betaBounds(a, 4);
    needNum(alpha > 0 && beta > 0 && x >= low && x <= high);
    const t = (x - low) / (high - low);
    return cdfOrPdf(a, 3, () => betaI(t, alpha, beta), () => betaPdf(t, alpha, beta) / (high - low));
  },
  'BETA.INV': (a) => {
    const [alpha, beta] = [num1(a, 1), num1(a, 2)];
    const [low, high] = betaBounds(a, 3);
    needNum(alpha > 0 && beta > 0 && num1(a) > 0 && num1(a) < 1);
    return low + betaInverse(num1(a), alpha, beta) * (high - low);
  },
  BETADIST: (a) => {
    const [x, alpha, beta] = [num1(a), num1(a, 1), num1(a, 2)];
    const [low, high] = betaBounds(a, 3);
    needNum(alpha > 0 && beta > 0 && x >= low && x <= high);
    return betaI((x - low) / (high - low), alpha, beta);
  },
  BETAINV: (a) => {
    const [alpha, beta] = [num1(a, 1), num1(a, 2)];
    const [low, high] = betaBounds(a, 3);
    needNum(alpha > 0 && beta > 0 && num1(a) > 0 && num1(a) < 1);
    return low + betaInverse(num1(a), alpha, beta) * (high - low);
  },
  'WEIBULL.DIST': (a) => {
    const [x, alpha, beta] = [num1(a), num1(a, 1), num1(a, 2)];
    needNum(x >= 0 && alpha > 0 && beta > 0);
    return cdfOrPdf(a, 3, () => 1 - Math.exp(-((x / beta) ** alpha)), () => (alpha / beta ** alpha) * x ** (alpha - 1) * Math.exp(-((x / beta) ** alpha)));
  },
  'LOGNORM.DIST': (a) => {
    const [x, mean, sd] = [num1(a), num1(a, 1), num1(a, 2)];
    needNum(x > 0 && sd > 0);
    const z = (Math.log(x) - mean) / sd;
    return cdfOrPdf(a, 3, () => normalCdf(z), () => Math.exp(-0.5 * z * z) / (x * sd * Math.sqrt(2 * Math.PI)));
  },
  'LOGNORM.INV': (a) => {
    const [mean, sd] = [num1(a, 1), num1(a, 2)];
    needNum(sd > 0);
    return Math.exp(mean + sd * normalInverse(probability(num1(a))));
  },
  LOGNORMDIST: (a) => {
    const [x, mean, sd] = [num1(a), num1(a, 1), num1(a, 2)];
    needNum(x > 0 && sd > 0);
    return normalCdf((Math.log(x) - mean) / sd);
  },
  LOGINV: (a) => {
    const [mean, sd] = [num1(a, 1), num1(a, 2)];
    needNum(sd > 0);
    return Math.exp(mean + sd * normalInverse(probability(num1(a))));
  },
  'CONFIDENCE.NORM': (a) => {
    const [alpha, sd, size] = [num1(a), num1(a, 1), Math.trunc(num1(a, 2))];
    needNum(alpha > 0 && alpha < 1 && sd > 0 && size >= 1);
    return (-normalInverse(alpha / 2) * sd) / Math.sqrt(size);
  },
  'CONFIDENCE.T': (a) => {
    const [alpha, sd, size] = [num1(a), num1(a, 1), Math.trunc(num1(a, 2))];
    needNum(alpha > 0 && alpha < 1 && sd > 0 && size >= 1);
    if (size === 1) return fail(ERRORS.div0);
    return (tInverse(1 - alpha / 2, size - 1) * sd) / Math.sqrt(size);
  },
  'Z.TEST': (a) => {
    const values = numbersOf([a[0] ?? null]);
    if (values.length === 0) return fail(ERRORS.na);
    const x = num1(a, 1);
    const sigma = a[2] === undefined ? stdev(values, true) : num1(a, 2);
    if (!(sigma > 0)) return fail(ERRORS.div0);
    const mean = values.reduce((t, v) => t + v, 0) / values.length;
    return 1 - normalCdf((mean - x) / (sigma / Math.sqrt(values.length)));
  },
};

/** Names kept for older workbooks: the same function as the one they point at. */
export const EXTRA_ALIASES: Record<string, string> = {
  CONFIDENCE: 'CONFIDENCE.NORM',
  ZTEST: 'Z.TEST',
  WEIBULL: 'WEIBULL.DIST',
  GAMMADIST: 'GAMMA.DIST',
  GAMMAINV: 'GAMMA.INV',
};

