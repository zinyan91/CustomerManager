/**
 * Goal Seek: finds the input that makes a formula give a wanted number, by the secant method with a bracketing
 * fallback. `evaluate` runs the sheet with the input set and returns the formula's value (null when it is not a
 * number). Returns null when no input within the search gives the target.
 */
export interface GoalSeekResult {
  input: number;
  value: number;
}

const TOLERANCE = 1e-9;

export function goalSeek(evaluate: (input: number) => number | null, target: number, start: number): GoalSeekResult | null {
  const miss = (x: number) => {
    const v = evaluate(x);
    return v === null || !Number.isFinite(v) ? null : v - target;
  };
  const close = (x: number, d: number): GoalSeekResult | null => (Math.abs(d) <= TOLERANCE * Math.max(1, Math.abs(target)) ? { input: x, value: d + target } : null);

  let x0 = start;
  let d0 = miss(x0);
  if (d0 === null) return null;
  const hit = close(x0, d0);
  if (hit) return hit;
  let x1 = start === 0 ? 1 : start * 1.1 + 1e-3;
  let d1 = miss(x1);
  for (let i = 0; i < 100 && d1 !== null; i += 1) {
    const done = close(x1, d1);
    if (done) return done;
    if (d1 === d0) break;
    const x2 = x1 - (d1 * (x1 - x0)) / (d1 - d0);
    if (!Number.isFinite(x2)) break;
    x0 = x1;
    d0 = d1;
    x1 = x2;
    d1 = miss(x1);
  }
  // The secant steps went astray: look for a sign change over widening ranges and bisect it.
  const centre = Number.isFinite(start) ? start : 0;
  for (let reach = 1; reach <= 1e9; reach *= 10) {
    let lo = centre - reach;
    let dlo = miss(lo);
    const steps = 40;
    for (let k = 1; k <= steps; k += 1) {
      const hi = centre - reach + (2 * reach * k) / steps;
      const dhi = miss(hi);
      if (dlo !== null && dhi !== null && Math.sign(dlo) !== Math.sign(dhi)) {
        let a = lo;
        let b = hi;
        let da = dlo;
        for (let j = 0; j < 200; j += 1) {
          const mid = (a + b) / 2;
          const dm = miss(mid);
          if (dm === null) return null;
          const found = close(mid, dm);
          if (found) return found;
          if (Math.sign(dm) === Math.sign(da)) {
            a = mid;
            da = dm;
          } else b = mid;
        }
        const mid = (a + b) / 2;
        return { input: mid, value: (miss(mid) ?? 0) + target };
      }
      lo = hi;
      dlo = dhi;
    }
  }
  return null;
}
