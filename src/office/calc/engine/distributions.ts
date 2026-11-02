import { lnGamma, normalInverse } from './functionsStats';

const EPSILON = 1e-15;
const TINY = 1e-300;

/** The regularised lower incomplete gamma function P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let term = 1 / a;
    let sum = term;
    for (let n = 1; n < 1000; n += 1) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * EPSILON) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  return 1 - gammaQ(a, x);
}

/** The regularised upper incomplete gamma function Q(a, x) = 1 - P(a, x). */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  if (x < a + 1) return 1 - gammaP(a, x);
  let b = x + 1 - a;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPSILON) break;
  }
  return Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

function betaContinuedFraction(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m < 1000; m += 1) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPSILON) break;
  }
  return h;
}

/** The regularised incomplete beta function I_x(a, b). */
export function betaI(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaContinuedFraction(a, b, x)) / a : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** Finds the x in [low, high] where a rising function reaches `target`, to full precision. */
export function invertRising(f: (x: number) => number, target: number, low: number, high: number): number {
  let lo = low;
  let hi = high;
  for (let i = 0; i < 400 && hi - lo > 1e-15 * Math.max(1, Math.abs(hi)); i += 1) {
    const mid = (lo + hi) / 2;
    if (f(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** The upper end of a search: doubles until the function passes the target. */
function bracket(f: (x: number) => number, target: number, start: number): number {
  let high = start;
  for (let i = 0; i < 2000 && f(high) < target; i += 1) high *= 2;
  return high;
}

export const tCdf = (t: number, df: number): number => {
  const x = df / (df + t * t);
  const tail = 0.5 * betaI(x, df / 2, 0.5);
  return t > 0 ? 1 - tail : tail;
};

export const tPdf = (t: number, df: number): number =>
  Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2)) / Math.sqrt(df * Math.PI) * (1 + (t * t) / df) ** (-(df + 1) / 2);

export function tInverse(p: number, df: number): number {
  if (p === 0.5) return 0;
  if (p < 0.5) return -tInverse(1 - p, df);
  return invertRising((t) => tCdf(t, df), p, 0, bracket((t) => tCdf(t, df), p, 1));
}

export const chiCdf = (x: number, df: number): number => gammaP(df / 2, x / 2);
export const chiPdf = (x: number, df: number): number =>
  x === 0 ? (df === 2 ? 0.5 : df < 2 ? Infinity : 0) : Math.exp((df / 2 - 1) * Math.log(x) - x / 2 - (df / 2) * Math.LN2 - lnGamma(df / 2));
export const chiInverse = (p: number, df: number): number => invertRising((x) => chiCdf(x, df), p, 0, bracket((x) => chiCdf(x, df), p, Math.max(1, df)));

export const gammaCdf = (x: number, alpha: number, beta: number): number => gammaP(alpha, x / beta);
export const gammaPdf = (x: number, alpha: number, beta: number): number =>
  x === 0 ? (alpha === 1 ? 1 / beta : alpha < 1 ? Infinity : 0) : Math.exp((alpha - 1) * Math.log(x) - x / beta - alpha * Math.log(beta) - lnGamma(alpha));
export const gammaInverse = (p: number, alpha: number, beta: number): number =>
  invertRising((x) => gammaCdf(x, alpha, beta), p, 0, bracket((x) => gammaCdf(x, alpha, beta), p, Math.max(1, alpha * beta)));

export const fCdf = (x: number, d1: number, d2: number): number => (x <= 0 ? 0 : betaI((d1 * x) / (d1 * x + d2), d1 / 2, d2 / 2));
export const fPdf = (x: number, d1: number, d2: number): number =>
  x < 0 ? 0 : Math.exp(0.5 * (d1 * Math.log(d1 * x) + d2 * Math.log(d2) - (d1 + d2) * Math.log(d1 * x + d2)) - Math.log(x) - (lnGamma(d1 / 2) + lnGamma(d2 / 2) - lnGamma((d1 + d2) / 2)));
export const fInverse = (p: number, d1: number, d2: number): number => invertRising((x) => fCdf(x, d1, d2), p, 0, bracket((x) => fCdf(x, d1, d2), p, 1));

export const betaPdf = (x: number, a: number, b: number): number =>
  x < 0 || x > 1 ? 0 : Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + (a - 1) * Math.log(x) + (b - 1) * Math.log(1 - x));
export const betaInverse = (p: number, a: number, b: number): number => invertRising((x) => betaI(x, a, b), p, 0, 1);

export { normalInverse };
