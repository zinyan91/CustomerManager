import { ERRORS, fail, isError, isRange, toNumber, type Value } from './values';
import { block, num1, numberList, numbersOf, pairsOf, regression, scalar, sortedNumbers, stdev, type Fn } from './functions';

/** Numbers as MAXA and AVERAGEA read them: in a range text counts as 0 and TRUE as 1, blanks are skipped. */
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
    } else out.push(toNumber(scalar(arg)));
  }
  return out;
}

const mean = (values: number[]): number => values.reduce((t, v) => t + v, 0) / values.length;

/** The standardised moment used by SKEW and KURT: Σ((x − mean) / s)^power. */
function moment(values: number[], power: number): number {
  const s = stdev(values, true);
  if (s === 0) fail(ERRORS.div0);
  const m = mean(values);
  return values.reduce((t, v) => t + ((v - m) / s) ** power, 0);
}

// ----- Normal distribution

const SQRT2 = Math.SQRT2;

/** erfc(x) for x > 0 by its continued fraction (accurate where the series is not). */
export function erfcTail(x: number): number {
  let t = x;
  for (let k = 120; k >= 1; k -= 1) t = x + k / 2 / t;
  return Math.exp(-x * x) / (Math.sqrt(Math.PI) * t);
}

export function erf(x: number): number {
  const ax = Math.abs(x);
  if (ax >= 2) return Math.sign(x) * (1 - erfcTail(ax));
  let term = x;
  let sum = x;
  for (let n = 1; n < 100; n += 1) {
    term *= (-x * x) / n;
    const add = term / (2 * n + 1);
    sum += add;
    if (Math.abs(add) < 1e-17 * Math.abs(sum)) break;
  }
  return (2 / Math.sqrt(Math.PI)) * sum;
}

/** The standard normal cumulative distribution. */
export function normalCdf(z: number): number {
  return z < -2 * SQRT2 ? 0.5 * erfcTail(-z / SQRT2) : z > 2 * SQRT2 ? 1 - 0.5 * erfcTail(z / SQRT2) : 0.5 * (1 + erf(z / SQRT2));
}

const normalPdf = (z: number): number => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

/** The standard normal quantile: Acklam's approximation, refined once to full precision. */
export function normalInverse(p: number): number {
  if (!(p > 0 && p < 1)) fail(ERRORS.num);
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  let x: number;
  if (p < 0.02425) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= 1 - 0.02425) {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const e = normalCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/** ln Γ(x), Lanczos approximation (g = 7). */
export function lnGamma(x: number): number {
  const g = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const y = x - 1;
  let sum = g[0];
  for (let i = 1; i < 9; i += 1) sum += g[i] / (y + i);
  const t = y + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (y + 0.5) * Math.log(t) - t + Math.log(sum);
}

function binomialPmf(k: number, n: number, p: number): number {
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

const cumulativeFlag = (a: Value[], i: number): boolean => {
  const v = scalar(a[i]);
  return typeof v === 'boolean' ? v : toNumber(v) !== 0;
};

export const STATS_FUNCTIONS: Record<string, Fn> = {
  AVERAGEA: (a) => {
    const values = withText(a);
    return values.length ? mean(values) : fail(ERRORS.div0);
  },
  MAXA: (a) => {
    const values = withText(a);
    return values.length ? Math.max(...values) : 0;
  },
  MINA: (a) => {
    const values = withText(a);
    return values.length ? Math.min(...values) : 0;
  },
  GEOMEAN: (a) => {
    const values = numbersOf(a);
    if (values.length === 0 || values.some((v) => v <= 0)) fail(ERRORS.num);
    return Math.exp(mean(values.map(Math.log)));
  },
  HARMEAN: (a) => {
    const values = numbersOf(a);
    if (values.length === 0 || values.some((v) => v <= 0)) fail(ERRORS.num);
    return values.length / values.reduce((t, v) => t + 1 / v, 0);
  },
  DEVSQ: (a) => {
    const values = numbersOf(a);
    if (values.length === 0) fail(ERRORS.num);
    const m = mean(values);
    return values.reduce((t, v) => t + (v - m) ** 2, 0);
  },
  AVEDEV: (a) => {
    const values = numbersOf(a);
    if (values.length === 0) fail(ERRORS.num);
    const m = mean(values);
    return mean(values.map((v) => Math.abs(v - m)));
  },
  SKEW: (a) => {
    const values = numbersOf(a);
    const n = values.length;
    if (n < 3) fail(ERRORS.div0);
    return (n / ((n - 1) * (n - 2))) * moment(values, 3);
  },
  KURT: (a) => {
    const values = numbersOf(a);
    const n = values.length;
    if (n < 4) fail(ERRORS.div0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * moment(values, 4) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  },
  RSQ: (a) => regression(a[0], a[1]).r ** 2,
  STEYX: (a) => {
    const pairs = pairsOf(a[0], a[1]);
    if (pairs.length < 3) fail(ERRORS.div0);
    const { slope, intercept } = regression(a[0], a[1]);
    return Math.sqrt(pairs.reduce((t, [y, x]) => t + (y - (intercept + slope * x)) ** 2, 0) / (pairs.length - 2));
  },
  'COVARIANCE.P': (a) => covariance(a, false),
  'COVARIANCE.S': (a) => covariance(a, true),
  TRIMMEAN: (a) => {
    const sorted = sortedNumbers(a[0]);
    const share = num1(a, 1);
    if (sorted.length === 0 || share < 0 || share >= 1) fail(ERRORS.num);
    const cut = Math.floor((sorted.length * share) / 2);
    return mean(sorted.slice(cut, sorted.length - cut));
  },
  PERCENTRANK: (a) => {
    const sorted = sortedNumbers(a[0]);
    const x = num1(a, 1);
    const digits = a[2] === undefined ? 3 : Math.trunc(num1(a, 2));
    if (digits < 1) fail(ERRORS.num);
    const n = sorted.length;
    if (n === 0 || x < sorted[0] || x > sorted[n - 1]) fail(ERRORS.na);
    let rank: number;
    const below = sorted.filter((v) => v < x).length;
    if (sorted.includes(x)) rank = n === 1 ? 1 : below / (n - 1);
    else {
      const lo = sorted[below - 1];
      const hi = sorted[below];
      rank = (sorted.lastIndexOf(lo) + (x - lo) / (hi - lo)) / (n - 1);
    }
    const scale = 10 ** digits;
    return Math.floor(rank * scale + 1e-9) / scale;
  },
  'RANK.AVG': (a) => {
    const x = num1(a);
    const values = numberList(a[1]);
    const ascending = a[2] !== undefined && num1(a, 2) !== 0;
    if (!values.includes(x)) fail(ERRORS.na);
    const better = values.filter((v) => (ascending ? v < x : v > x)).length;
    const same = values.filter((v) => v === x).length;
    return better + (same + 1) / 2;
  },
  'PERCENTILE.EXC': (a) => {
    const sorted = sortedNumbers(a[0]);
    const k = num1(a, 1);
    const position = k * (sorted.length + 1);
    if (position < 1 || position > sorted.length) fail(ERRORS.num);
    const low = Math.floor(position);
    return sorted[low - 1] + ((sorted[Math.min(low, sorted.length - 1)] - sorted[low - 1]) * (position - low));
  },
  'QUARTILE.EXC': (a) => {
    const q = Math.trunc(num1(a, 1));
    const sorted = sortedNumbers(a[0]);
    const position = (q / 4) * (sorted.length + 1);
    if (q < 1 || q > 3 || position < 1 || position > sorted.length) fail(ERRORS.num);
    const low = Math.floor(position);
    return sorted[low - 1] + ((sorted[Math.min(low, sorted.length - 1)] - sorted[low - 1]) * (position - low));
  },
  FREQUENCY: (a) => {
    const data = numberList(a[0]);
    const bins = numberList(a[1]);
    const counts = bins.map((bin) => {
      const lower = Math.max(-Infinity, ...bins.filter((b) => b < bin));
      return data.filter((v) => v > lower && v <= bin).length;
    });
    counts.push(bins.length ? data.filter((v) => v > Math.max(...bins)).length : data.length);
    return block(counts.map((n) => [n]));
  },
  // Distributions
  'NORM.S.DIST': (a) => (cumulativeFlag(a, 1) ? normalCdf(num1(a)) : normalPdf(num1(a))),
  'NORM.DIST': (a) => {
    const [x, m, s] = [num1(a), num1(a, 1), num1(a, 2)];
    if (s <= 0) fail(ERRORS.num);
    return cumulativeFlag(a, 3) ? normalCdf((x - m) / s) : normalPdf((x - m) / s) / s;
  },
  'NORM.S.INV': (a) => normalInverse(num1(a)),
  'NORM.INV': (a) => {
    const [p, m, s] = [num1(a), num1(a, 1), num1(a, 2)];
    if (s <= 0) fail(ERRORS.num);
    return m + s * normalInverse(p);
  },
  STANDARDIZE: (a) => {
    const s = num1(a, 2);
    return s <= 0 ? fail(ERRORS.num) : (num1(a) - num1(a, 1)) / s;
  },
  'BINOM.DIST': (a) => {
    const [k, n, p] = [Math.trunc(num1(a)), Math.trunc(num1(a, 1)), num1(a, 2)];
    if (k < 0 || k > n || n < 0 || p < 0 || p > 1) fail(ERRORS.num);
    if (!cumulativeFlag(a, 3)) return binomialPmf(k, n, p);
    let total = 0;
    for (let i = 0; i <= k; i += 1) total += binomialPmf(i, n, p);
    return Math.min(1, total);
  },
  'POISSON.DIST': (a) => {
    const [k, mu] = [Math.trunc(num1(a)), num1(a, 1)];
    if (k < 0 || mu < 0) fail(ERRORS.num);
    const pmf = (i: number) => (mu === 0 ? (i === 0 ? 1 : 0) : Math.exp(-mu + i * Math.log(mu) - lnGamma(i + 1)));
    if (!cumulativeFlag(a, 2)) return pmf(k);
    let total = 0;
    for (let i = 0; i <= k; i += 1) total += pmf(i);
    return Math.min(1, total);
  },
  'EXPON.DIST': (a) => {
    const [x, lambda] = [num1(a), num1(a, 1)];
    if (x < 0 || lambda <= 0) fail(ERRORS.num);
    return cumulativeFlag(a, 2) ? 1 - Math.exp(-lambda * x) : lambda * Math.exp(-lambda * x);
  },
};

function covariance(a: Value[], sample: boolean): number {
  const pairs = pairsOf(a[0], a[1]);
  const n = pairs.length;
  if (n < (sample ? 2 : 1)) fail(ERRORS.div0);
  const mx = mean(pairs.map(([, x]) => x));
  const my = mean(pairs.map(([y]) => y));
  return pairs.reduce((t, [y, x]) => t + (x - mx) * (y - my), 0) / (sample ? n - 1 : n);
}
