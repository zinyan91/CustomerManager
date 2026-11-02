import { parseFormula, type Node } from './parser';
import type { RangePos } from './cellRef';

export interface Precedent {
  /** The sheet named in the reference; null for the formula's own sheet. */
  sheet: string | null;
  range: RangePos;
}

function walk(node: Node, out: Precedent[]): void {
  switch (node.t) {
    case 'ref':
      out.push({ sheet: node.sheet, range: { r1: node.row, c1: node.col, r2: node.row, c2: node.col } });
      return;
    case 'range':
      out.push({
        sheet: node.sheet,
        range: { r1: Math.min(node.from.row, node.to.row), c1: Math.min(node.from.col, node.to.col), r2: Math.max(node.from.row, node.to.row), c2: Math.max(node.from.col, node.to.col) },
      });
      return;
    case 'call':
      node.args.forEach((arg) => walk(arg, out));
      return;
    case 'bin':
      walk(node.l, out);
      walk(node.r, out);
      return;
    case 'un':
    case 'pct':
      walk(node.e, out);
      return;
    default:
  }
}

/** The cells and ranges a formula text refers to directly; none for text that is not a formula or does not parse. */
export function precedentsOf(raw: string): Precedent[] {
  if (!raw.startsWith('=')) return [];
  try {
    const out: Precedent[] = [];
    walk(parseFormula(raw), out);
    return out;
  } catch {
    return [];
  }
}

/** True when the range overlaps any of `targets`. */
export const rangeHolds = (range: RangePos, targets: RangePos[]) => targets.some((t) => range.r1 <= t.r2 && range.r2 >= t.r1 && range.c1 <= t.c2 && range.c2 >= t.c1);
