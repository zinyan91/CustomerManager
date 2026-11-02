import { ERRORS, fail, flatten, toNumber, type Value } from './values';
import { dateArg, num1, numberList, type Fn } from './functions';

const optional = (a: Value[], i: number, otherwise: number): number => (a[i] === undefined ? otherwise : num1(a, i));

/** Future value with Excel's signs: money paid out is negative. */
function futureValue(rate: number, nper: number, pmt: number, pv: number, type: number): number {
  if (rate === 0) return -(pv + pmt * nper);
  const growth = (1 + rate) ** nper;
  return -(pv * growth + (pmt * (1 + rate * type) * (growth - 1)) / rate);
}

function payment(rate: number, nper: number, pv: number, fv: number, type: number): number {
  if (nper === 0) fail(ERRORS.num);
  if (rate === 0) return -(pv + fv) / nper;
  const growth = (1 + rate) ** nper;
  return -(rate * (pv * growth + fv)) / ((1 + rate * type) * (growth - 1));
}

/** The interest part of payment number `per`. */
function interestPart(rate: number, per: number, nper: number, pv: number, fv: number, type: number): number {
  if (per < 1 || per > nper) fail(ERRORS.num);
  const pmt = payment(rate, nper, pv, fv, type);
  if (type === 1) return per === 1 ? 0 : (futureValue(rate, per - 2, pmt, pv, 1) - pmt) * rate;
  return futureValue(rate, per - 1, pmt, pv, 0) * rate;
}

/** Newton's method on a function with a numerical derivative; null when it does not settle. */
function solve(f: (x: number) => number, guess: number): number | null {
  let x = guess;
  for (let i = 0; i < 100; i += 1) {
    const y = f(x);
    const slope = (f(x + 1e-7) - y) / 1e-7;
    if (!Number.isFinite(y) || !Number.isFinite(slope) || slope === 0) return null;
    const next = x - y / slope;
    if (!Number.isFinite(next) || next <= -1) return null;
    if (Math.abs(next - x) < 1e-12) return next;
    x = next;
  }
  return null;
}

function cumulative(a: Value[], part: (rate: number, per: number, nper: number, pv: number, type: number) => number): number {
  const [rate, nper, pv, start, end, type] = [num1(a), num1(a, 1), num1(a, 2), Math.trunc(num1(a, 3)), Math.trunc(num1(a, 4)), num1(a, 5)];
  if (rate <= 0 || nper <= 0 || pv <= 0 || start < 1 || end < start || end > nper || (type !== 0 && type !== 1)) fail(ERRORS.num);
  let total = 0;
  for (let per = start; per <= end; per += 1) total += part(rate, per, nper, pv, type);
  return total;
}

/** Cash flows with their dates, for XNPV and XIRR. */
function dated(values: Value, dates: Value): Array<[number, number]> {
  const v = flatten([values]);
  const d = flatten([dates]);
  if (v.length !== d.length) fail(ERRORS.num);
  const out = v.map((x, i): [number, number] => [toNumber(x), Math.trunc(dateArg(d[i]))]);
  if (out.some(([, day]) => day < out[0][1])) fail(ERRORS.num);
  return out;
}

export const FINANCE_FUNCTIONS: Record<string, Fn> = {
  NPER: (a) => {
    const [rate, pmt, pv] = [num1(a), num1(a, 1), num1(a, 2)];
    const fv = optional(a, 3, 0);
    const type = optional(a, 4, 0);
    if (rate === 0) return pmt === 0 ? fail(ERRORS.num) : -(pv + fv) / pmt;
    const due = pmt * (1 + rate * type);
    const ratio = (due - fv * rate) / (pv * rate + due);
    return ratio <= 0 ? fail(ERRORS.num) : Math.log(ratio) / Math.log(1 + rate);
  },
  RATE: (a) => {
    const [nper, pmt, pv] = [num1(a), num1(a, 1), num1(a, 2)];
    const fv = optional(a, 3, 0);
    const type = optional(a, 4, 0);
    const found = solve((r) => (r === 0 ? pv + pmt * nper + fv : pv * (1 + r) ** nper + (pmt * (1 + r * type) * ((1 + r) ** nper - 1)) / r + fv), optional(a, 5, 0.1));
    return found ?? fail(ERRORS.num);
  },
  IPMT: (a) => interestPart(num1(a), num1(a, 1), num1(a, 2), num1(a, 3), optional(a, 4, 0), optional(a, 5, 0)),
  PPMT: (a) => {
    const [rate, per, nper, pv] = [num1(a), num1(a, 1), num1(a, 2), num1(a, 3)];
    const fv = optional(a, 4, 0);
    const type = optional(a, 5, 0);
    return payment(rate, nper, pv, fv, type) - interestPart(rate, per, nper, pv, fv, type);
  },
  CUMIPMT: (a) => cumulative(a, (rate, per, nper, pv, type) => interestPart(rate, per, nper, pv, 0, type)),
  CUMPRINC: (a) => cumulative(a, (rate, per, nper, pv, type) => payment(rate, nper, pv, 0, type) - interestPart(rate, per, nper, pv, 0, type)),
  SLN: (a) => {
    const life = num1(a, 2);
    return life === 0 ? fail(ERRORS.div0) : (num1(a) - num1(a, 1)) / life;
  },
  SYD: (a) => {
    const [cost, salvage, life, per] = [num1(a), num1(a, 1), num1(a, 2), num1(a, 3)];
    if (life <= 0 || per < 1 || per > life) fail(ERRORS.num);
    return ((cost - salvage) * (life - per + 1) * 2) / (life * (life + 1));
  },
  DDB: (a) => {
    const [cost, salvage, life, period] = [num1(a), num1(a, 1), num1(a, 2), Math.trunc(num1(a, 3))];
    const factor = optional(a, 4, 2);
    if (cost < 0 || salvage < 0 || life <= 0 || period < 1 || period > life || factor <= 0) fail(ERRORS.num);
    let spent = 0;
    let current = 0;
    for (let i = 1; i <= period; i += 1) {
      current = Math.max(0, Math.min((cost - spent) * (factor / life), cost - salvage - spent));
      spent += current;
    }
    return current;
  },
  DB: (a) => {
    const [cost, salvage, life, period] = [num1(a), num1(a, 1), num1(a, 2), Math.trunc(num1(a, 3))];
    const months = Math.trunc(optional(a, 4, 12));
    if (cost <= 0 || salvage < 0 || life <= 0 || period < 1 || period > life + 1 || months < 1 || months > 12) fail(ERRORS.num);
    const rate = Math.round((1 - (salvage / cost) ** (1 / life)) * 1000) / 1000;
    let spent = 0;
    let current = 0;
    for (let i = 1; i <= period; i += 1) {
      current = i === 1 ? (cost * rate * months) / 12 : i === life + 1 ? ((cost - spent) * rate * (12 - months)) / 12 : (cost - spent) * rate;
      spent += current;
    }
    return current;
  },
  EFFECT: (a) => {
    const [nominal, periods] = [num1(a), Math.trunc(num1(a, 1))];
    return nominal <= 0 || periods < 1 ? fail(ERRORS.num) : (1 + nominal / periods) ** periods - 1;
  },
  NOMINAL: (a) => {
    const [effective, periods] = [num1(a), Math.trunc(num1(a, 1))];
    return effective <= 0 || periods < 1 ? fail(ERRORS.num) : periods * ((1 + effective) ** (1 / periods) - 1);
  },
  FVSCHEDULE: (a) => numberList(a[1]).reduce((t, r) => t * (1 + r), num1(a)),
  XNPV: (a) => {
    const rate = num1(a);
    if (rate <= -1) fail(ERRORS.num);
    const flows = dated(a[1], a[2]);
    return flows.reduce((t, [v, day]) => t + v / (1 + rate) ** ((day - flows[0][1]) / 365), 0);
  },
  XIRR: (a) => {
    const flows = dated(a[0], a[1]);
    if (!flows.some(([v]) => v > 0) || !flows.some(([v]) => v < 0)) fail(ERRORS.num);
    const found = solve((r) => flows.reduce((t, [v, day]) => t + v / (1 + r) ** ((day - flows[0][1]) / 365), 0), optional(a, 2, 0.1));
    return found ?? fail(ERRORS.num);
  },
  MIRR: (a) => {
    const flows = numberList(a[0]);
    const [financeRate, reinvestRate] = [num1(a, 1), num1(a, 2)];
    const n = flows.length;
    const negative = flows.reduce((t, v, i) => (v < 0 ? t + v / (1 + financeRate) ** i : t), 0);
    const positive = flows.reduce((t, v, i) => (v > 0 ? t + v * (1 + reinvestRate) ** (n - 1 - i) : t), 0);
    if (negative === 0 || positive === 0 || n < 2) fail(ERRORS.div0);
    return (-positive / negative) ** (1 / (n - 1)) - 1;
  },
  ISPMT: (a) => {
    const [rate, per, nper, pv] = [num1(a), num1(a, 1), num1(a, 2), num1(a, 3)];
    return nper === 0 ? fail(ERRORS.div0) : -pv * rate * (1 - per / nper);
  },
};
