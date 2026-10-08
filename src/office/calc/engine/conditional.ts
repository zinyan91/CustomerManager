import type { RangePos } from './cellRef';
import { isError, type Scalar } from './values';

/**
 * Conditional formatting: rules over a range that style a cell by its value.
 * Cell rules (greater than, contains, duplicates, top N) paint a fill, text
 * colour or bold; a colour scale blends two or three colours by where the
 * value sits between the range's smallest and largest; a data bar draws a bar
 * as long as that position.
 */
export interface CfStyle {
  fill?: string;
  color?: string;
  bold?: boolean;
}

interface Base {
  id: string;
  range: RangePos;
}

export type CfRule =
  | (Base & { kind: 'cell'; op: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq' | 'between'; a: number; b?: number; style: CfStyle })
  | (Base & { kind: 'text'; op: 'contains' | 'begins' | 'ends'; text: string; style: CfStyle })
  | (Base & { kind: 'duplicate'; style: CfStyle })
  | (Base & { kind: 'top'; n: number; bottom: boolean; style: CfStyle })
  | (Base & { kind: 'scale'; low: string; mid?: string; high: string })
  | (Base & { kind: 'bar'; color: string });

export interface CfResult extends CfStyle {
  bar?: { fraction: number; color: string };
}

/** What a rule needs to know about its whole range, worked out once per workbook version. */
export interface CfStats {
  min: number;
  max: number;
  /** Texts and numbers that appear more than once (numbers as "n:value"). */
  duplicates: Set<string>;
  /** Value that a top or bottom N rule compares against. */
  threshold: number | null;
}

export const inRange = (r: RangePos, row: number, col: number): boolean => row >= r.r1 && row <= r.r2 && col >= r.c1 && col <= r.c2;

const keyOf = (v: Scalar): string | null =>
  v === null || isError(v) ? null : typeof v === 'number' ? `n:${v}` : typeof v === 'string' ? `s:${v.toLocaleLowerCase()}` : `b:${v}`;

export function computeStats(rule: CfRule, valueAt: (row: number, col: number) => Scalar): CfStats {
  const { r1, c1, r2, c2 } = rule.range;
  const numbers: number[] = [];
  const seen = new Map<string, number>();
  for (let r = r1; r <= r2; r += 1)
    for (let c = c1; c <= c2; c += 1) {
      const v = valueAt(r, c);
      if (typeof v === 'number') numbers.push(v);
      const k = keyOf(v);
      if (k) seen.set(k, (seen.get(k) ?? 0) + 1);
    }
  const duplicates = new Set([...seen].filter(([, n]) => n > 1).map(([k]) => k));
  let threshold: number | null = null;
  if (rule.kind === 'top' && numbers.length > 0) {
    const sorted = [...numbers].sort((a, b) => (rule.bottom ? a - b : b - a));
    threshold = sorted[Math.min(rule.n, sorted.length) - 1] ?? null;
  }
  return {
    min: numbers.length ? Math.min(...numbers) : 0,
    max: numbers.length ? Math.max(...numbers) : 0,
    duplicates,
    threshold,
  };
}

function hex(color: string): [number, number, number] {
  const m = /^#?([0-9a-f]{6})$/i.exec(color);
  const n = m ? parseInt(m[1], 16) : 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** A colour part of the way from `a` to `b` (t from 0 to 1). */
export function blend(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hex(a);
  const [br, bg, bb] = hex(b);
  const mix = (x: number, y: number) => Math.round(x + (y - x) * Math.min(1, Math.max(0, t)));
  return `#${[mix(ar, br), mix(ag, bg), mix(ab, bb)].map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

function matches(rule: CfRule, value: Scalar, stats: CfStats): boolean {
  if (value === null || isError(value)) return false;
  switch (rule.kind) {
    case 'cell': {
      if (typeof value !== 'number') return false;
      switch (rule.op) {
        case 'gt':
          return value > rule.a;
        case 'lt':
          return value < rule.a;
        case 'gte':
          return value >= rule.a;
        case 'lte':
          return value <= rule.a;
        case 'eq':
          return value === rule.a;
        case 'neq':
          return value !== rule.a;
        default:
          return value >= Math.min(rule.a, rule.b ?? rule.a) && value <= Math.max(rule.a, rule.b ?? rule.a);
      }
    }
    case 'text': {
      const text = (typeof value === 'string' ? value : String(value)).toLocaleLowerCase();
      const needle = rule.text.toLocaleLowerCase();
      return rule.op === 'contains' ? text.includes(needle) : rule.op === 'begins' ? text.startsWith(needle) : text.endsWith(needle);
    }
    case 'duplicate':
      return stats.duplicates.has(keyOf(value) ?? '');
    case 'top':
      return typeof value === 'number' && stats.threshold !== null && (rule.bottom ? value <= stats.threshold : value >= stats.threshold);
    default:
      return false;
  }
}

/** The formatting the rules give one cell: the first rule to set a property wins it. */
export function evaluateRules(
  rules: readonly CfRule[],
  row: number,
  col: number,
  value: Scalar,
  statsFor: (rule: CfRule) => CfStats,
): CfResult | null {
  let result: CfResult | null = null;
  for (const rule of rules) {
    if (!inRange(rule.range, row, col)) continue;
    if (rule.kind === 'scale' || rule.kind === 'bar') {
      if (typeof value !== 'number') continue;
      const { min, max } = statsFor(rule);
      const t = max === min ? 0.5 : (value - min) / (max - min);
      result ??= {};
      if (rule.kind === 'bar') result.bar ??= { fraction: max === min ? 1 : Math.max(0.04, t), color: rule.color };
      else if (result.fill === undefined) {
        result.fill = rule.mid ? (t < 0.5 ? blend(rule.low, rule.mid, t * 2) : blend(rule.mid, rule.high, (t - 0.5) * 2)) : blend(rule.low, rule.high, t);
      }
      continue;
    }
    if (!matches(rule, value, statsFor(rule))) continue;
    result ??= {};
    if (result.fill === undefined && rule.style.fill) result.fill = rule.style.fill;
    if (result.color === undefined && rule.style.color) result.color = rule.style.color;
    if (result.bold === undefined && rule.style.bold) result.bold = true;
  }
  return result;
}

/** The rule's range after rows or columns were inserted or deleted, or null when none of it is left. */
export function shiftRange(range: RangePos, axis: 'row' | 'col', at: number, count: number, mode: 'insert' | 'delete'): RangePos | null {
  const lo = axis === 'row' ? range.r1 : range.c1;
  const hi = axis === 'row' ? range.r2 : range.c2;
  let nlo = lo;
  let nhi = hi;
  if (mode === 'insert') {
    if (lo >= at) nlo += count;
    if (hi >= at) nhi += count;
  } else {
    const end = at + count;
    nlo = lo >= at && lo < end ? at : lo >= end ? lo - count : lo;
    nhi = hi >= at && hi < end ? at - 1 : hi >= end ? hi - count : hi;
    if (nhi < nlo) return null;
  }
  return axis === 'row' ? { ...range, r1: nlo, r2: nhi } : { ...range, c1: nlo, c2: nhi };
}

