import { MAX_COLS, MAX_ROWS } from './cellRef';
import { parseFormula, printFormula, type Node, type RefNode } from './parser';
import { errorFromCode } from './values';

export type Axis = 'row' | 'col';

export interface Edit {
  axis: Axis;
  /** First row or column affected. */
  at: number;
  count: number;
  mode: 'insert' | 'delete';
}

/** Where one coordinate lands, or null when it falls in deleted cells. */
function move(value: number, edit: Edit): number | null {
  if (edit.mode === 'insert') return value >= edit.at ? value + edit.count : value;
  if (value < edit.at) return value;
  if (value >= edit.at + edit.count) return value - edit.count;
  return null;
}

function moveRef(ref: RefNode, edit: Edit): RefNode | null {
  const limit = edit.axis === 'row' ? MAX_ROWS : MAX_COLS;
  const value = move(edit.axis === 'row' ? ref.row : ref.col, edit);
  if (value === null || value >= limit) return null;
  return edit.axis === 'row' ? { ...ref, row: value } : { ...ref, col: value };
}

/**
 * The formula after rows or columns were inserted or deleted in `targetSheet`.
 * `formulaSheet` is the sheet the formula lives in: a reference without a
 * sheet name points there. A reference into deleted cells becomes #REF!; a
 * range loses the deleted part and is #REF! only when nothing is left.
 */
export function adjustFormula(formula: string, formulaSheet: string, targetSheet: string, edit: Edit): string {
  let tree: Node;
  try {
    tree = parseFormula(formula);
  } catch {
    return formula;
  }
  const REF_ERROR: Node = { t: 'err', v: errorFromCode('#REF!')! };
  const points = (sheet: string | null) => (sheet ?? formulaSheet) === targetSheet;

  const walk = (node: Node): Node => {
    switch (node.t) {
      case 'ref': {
        if (!points(node.sheet)) return node;
        return moveRef(node, edit) ?? REF_ERROR;
      }
      case 'range': {
        if (!points(node.sheet)) return node;
        const key = edit.axis === 'row' ? 'row' : 'col';
        const lo = Math.min(node.from[key], node.to[key]);
        const hi = Math.max(node.from[key], node.to[key]);
        let newLo: number | null;
        let newHi: number | null;
        if (edit.mode === 'insert') {
          newLo = move(lo, edit);
          newHi = move(hi, edit);
        } else {
          const end = edit.at + edit.count;
          // Start inside the deleted block moves to where the block began; end inside, to just before it.
          newLo = lo >= edit.at && lo < end ? edit.at : move(lo, edit);
          newHi = hi >= edit.at && hi < end ? edit.at - 1 : move(hi, edit);
          if (newLo === null || newHi === null || newHi < newLo) return REF_ERROR;
        }
        if (newLo === null || newHi === null) return REF_ERROR;
        const first = node.from[key] <= node.to[key] ? node.from : node.to;
        const last = first === node.from ? node.to : node.from;
        return { ...node, from: { ...first, [key]: newLo }, to: { ...last, [key]: newHi } };
      }
      case 'call':
        return { ...node, args: node.args.map(walk) };
      case 'bin':
        return { ...node, l: walk(node.l), r: walk(node.r) };
      case 'un':
      case 'pct':
        return { ...node, e: walk(node.e) };
      default:
        return node;
    }
  };

  return printFormula(walk(tree));
}
