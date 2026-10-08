import { MAX_COLS, MAX_ROWS, parseRange } from './cellRef';
import { FUNCTIONS, type FunctionContext } from './functions';
import { parseFormula, ParseError, type Node } from './parser';
import {
  ERRORS,
  EvalAbort,
  compareValues,
  fail,
  isError,
  isRange,
  toBoolean,
  toNumber,
  toText,
  type RangeValue,
  type Scalar,
  type Value,
} from './values';

export interface EvalContext extends FunctionContext {
  /** The sheet a reference without a sheet name means. */
  sheet: string;
  sheetExists(name: string): boolean;
  /** The value of a cell, evaluating it first if it holds a formula. */
  valueAt(sheet: string, row: number, col: number): Scalar;
}

function scalarOf(value: Value): Scalar {
  if (!isRange(value)) return value;
  if (value.rows === 1 && value.cols === 1) return value.values[0][0];
  return fail(ERRORS.value);
}

function rangeOf(node: Extract<Node, { t: 'range' }>, ctx: EvalContext): RangeValue {
  const sheet = node.sheet ?? ctx.sheet;
  if (!ctx.sheetExists(sheet)) fail(ERRORS.ref);
  const r1 = Math.min(node.from.row, node.to.row);
  const r2 = Math.max(node.from.row, node.to.row);
  const c1 = Math.min(node.from.col, node.to.col);
  const c2 = Math.max(node.from.col, node.to.col);
  const values: Scalar[][] = [];
  for (let r = r1; r <= r2; r += 1) {
    const row: Scalar[] = [];
    for (let c = c1; c <= c2; c += 1) row.push(ctx.valueAt(sheet, r, c));
    values.push(row);
  }
  return { kind: 'range', rows: r2 - r1 + 1, cols: c2 - c1 + 1, values };
}

const isBlock = (value: Value): value is RangeValue => isRange(value) && value.rows * value.cols > 1;

/**
 * A function applied to blocks of cells, element by element, as Excel does: a
 * single value is used against every element, and blocks of different shapes
 * stretch where one of them is one row or column wide (otherwise #N/A). A cell
 * that fails becomes an error in that cell of the result, not in all of it.
 */
function broadcastMany(values: Value[], apply: (items: Scalar[]) => Scalar): RangeValue {
  const blocks = values.map((v) => (isRange(v) ? v : ({ kind: 'range', rows: 1, cols: 1, values: [[v]] } as RangeValue)));
  let rows = 1;
  let cols = 1;
  for (const block of blocks) {
    if (block.rows !== 1) {
      if (rows !== 1 && rows !== block.rows) return fail(ERRORS.na);
      rows = block.rows;
    }
    if (block.cols !== 1) {
      if (cols !== 1 && cols !== block.cols) return fail(ERRORS.na);
      cols = block.cols;
    }
  }
  const out: Scalar[][] = [];
  for (let i = 0; i < rows; i += 1) {
    const line: Scalar[] = [];
    for (let j = 0; j < cols; j += 1) {
      try {
        line.push(apply(blocks.map((b) => b.values[b.rows === 1 ? 0 : i][b.cols === 1 ? 0 : j])));
      } catch (error) {
        if (error instanceof EvalAbort) line.push(error.error);
        else throw error;
      }
    }
    out.push(line);
  }
  return { kind: 'range', rows, cols, values: out };
}

const broadcast = (left: Value, right: Value, apply: (l: Scalar, r: Scalar) => Scalar): RangeValue =>
  broadcastMany([left, right], ([l, r]) => apply(l, r));

/** Functions that take one value at a time and are applied to every element of a block given to them. */
export const ELEMENTWISE = new Set([
  'ABS', 'SQRT', 'INT', 'SIGN', 'EXP', 'LN', 'LOG10', 'ROUND', 'ROUNDUP', 'ROUNDDOWN', 'TRUNC', 'MOD', 'POWER',
  'UPPER', 'LOWER', 'PROPER', 'TRIM', 'LEN', 'LEFT', 'RIGHT', 'MID', 'TEXT', 'VALUE', 'SUBSTITUTE', 'REPLACE',
  'ISNUMBER', 'ISTEXT', 'ISBLANK', 'ISERROR', 'ISODD', 'ISEVEN', 'NOT', 'YEAR', 'MONTH', 'DAY', 'WEEKDAY', 'EDATE',
]);

function binary(op: string, left: Scalar, right: Scalar): Scalar {
  switch (op) {
    case '+':
      return toNumber(left) + toNumber(right);
    case '-':
      return toNumber(left) - toNumber(right);
    case '*':
      return toNumber(left) * toNumber(right);
    case '/': {
      const d = toNumber(right);
      return d === 0 ? fail(ERRORS.div0) : toNumber(left) / d;
    }
    case '^': {
      const r = toNumber(left) ** toNumber(right);
      return Number.isFinite(r) ? r : fail(ERRORS.num);
    }
    case '&':
      return toText(left) + toText(right);
    default: {
      const order = compareValues(left, right);
      switch (op) {
        case '=':
          return order === 0;
        case '<>':
          return order !== 0;
        case '<':
          return order < 0;
        case '>':
          return order > 0;
        case '<=':
          return order <= 0;
        default:
          return order >= 0;
      }
    }
  }
}

export function evaluateNode(node: Node, ctx: EvalContext): Value {
  switch (node.t) {
    case 'num':
    case 'str':
    case 'bool':
      return node.v;
    case 'err':
      return node.v;
    case 'name':
      // An empty argument, or a name we do not know.
      return node.v === '' ? null : fail(ERRORS.name);
    case 'ref': {
      const sheet = node.sheet ?? ctx.sheet;
      if (!ctx.sheetExists(sheet)) fail(ERRORS.ref);
      return ctx.valueAt(sheet, node.row, node.col);
    }
    case 'range':
      return rangeOf(node, ctx);
    case 'un': {
      const inner = evaluateNode(node.e, ctx);
      if (isBlock(inner)) return broadcast(inner, 0, (v) => (node.op === '-' ? -toNumber(v) : toNumber(v)));
      const v = toNumber(scalarOf(inner));
      return node.op === '-' ? -v : v;
    }
    case 'pct': {
      const inner = evaluateNode(node.e, ctx);
      if (isBlock(inner)) return broadcast(inner, 0, (v) => toNumber(v) / 100);
      return toNumber(scalarOf(inner)) / 100;
    }
    case 'bin': {
      const left = evaluateNode(node.l, ctx);
      const right = evaluateNode(node.r, ctx);
      if (isBlock(left) || isBlock(right)) return broadcast(left, right, (l, r) => binary(node.op, l, r));
      return binary(node.op, scalarOf(left), scalarOf(right));
    }
    case 'call':
      return callFunction(node, ctx);
  }
}

/** Functions that must not evaluate every argument: only the branch taken, or the fallback. */
function callFunction(node: Extract<Node, { t: 'call' }>, ctx: EvalContext): Value {
  const { name, args } = node;
  const ev = (n: Node) => evaluateNode(n, ctx);
  switch (name) {
    case 'IF': {
      if (args.length < 2) fail(ERRORS.value);
      const tested = ev(args[0]);
      if (isBlock(tested)) {
        // A block of tests picks element by element, so both branches are worked out.
        const yes = ev(args[1]);
        const no = args[2] === undefined ? false : ev(args[2]);
        return broadcastMany([tested, yes, no], ([t, y, n]) => (toBoolean(t) ? y : n));
      }
      if (toBoolean(scalarOf(tested))) return ev(args[1]);
      return args[2] === undefined ? false : ev(args[2]);
    }
    case 'IFS': {
      for (let i = 0; i + 1 < args.length; i += 2) if (toBoolean(scalarOf(ev(args[i])))) return ev(args[i + 1]);
      return fail(ERRORS.na);
    }
    case 'IFERROR':
    case 'IFNA': {
      if (args.length < 2) fail(ERRORS.value);
      try {
        const v = ev(args[0]);
        if (isBlock(v)) {
          return broadcastMany([v, ev(args[1])], ([x, fallback]) => (isError(x) && (name === 'IFERROR' || x === ERRORS.na) ? fallback : x));
        }
        const s = isRange(v) ? v : v;
        if (isError(s) && (name === 'IFERROR' || s === ERRORS.na)) return ev(args[1]);
        return s;
      } catch (e) {
        if (e instanceof EvalAbort && (name === 'IFERROR' || e.error === ERRORS.na)) return ev(args[1]);
        throw e;
      }
    }
    case 'CHOOSE': {
      const i = toNumber(scalarOf(ev(args[0])));
      if (i < 1 || i >= args.length) fail(ERRORS.value);
      return ev(args[Math.trunc(i)]);
    }
    case 'OFFSET': {
      // The first argument is where to start from, so it must be a reference, not a value.
      const base = args[0];
      if (!base || args.length < 3 || (base.t !== 'ref' && base.t !== 'range')) return fail(ERRORS.value);
      const from = base.t === 'ref' ? base : base.from;
      const to = base.t === 'ref' ? base : base.to;
      const top = Math.min(from.row, to.row);
      const left = Math.min(from.col, to.col);
      const height = args[3] ? toNumber(scalarOf(ev(args[3]))) : Math.abs(to.row - from.row) + 1;
      const width = args[4] ? toNumber(scalarOf(ev(args[4]))) : Math.abs(to.col - from.col) + 1;
      const row = top + Math.trunc(toNumber(scalarOf(ev(args[1]))));
      const col = left + Math.trunc(toNumber(scalarOf(ev(args[2]))));
      if (height < 1 || width < 1 || row < 0 || col < 0 || row + height > MAX_ROWS || col + width > MAX_COLS) return fail(ERRORS.ref);
      const corner = (r: number, c: number): Extract<Node, { t: 'ref' }> => ({ t: 'ref', sheet: base.sheet, row: r, col: c, absRow: false, absCol: false });
      return rangeOf({ t: 'range', sheet: base.sheet, from: corner(row, col), to: corner(row + Math.trunc(height) - 1, col + Math.trunc(width) - 1) }, ctx);
    }
    case 'INDIRECT': {
      // A1-style text only: "B3", "$B$3:C5", "Sheet2!A1" or "'Danh mục'!A1:A9".
      const text = toText(scalarOf(ev(args[0]))).trim();
      const bang = text.lastIndexOf('!');
      const sheet = bang >= 0 ? text.slice(0, bang).replace(/^'|'$/g, '').replace(/''/g, "'") : ctx.sheet;
      const range = parseRange((bang >= 0 ? text.slice(bang + 1) : text).replace(/\$/g, ''));
      if (!range) return fail(ERRORS.ref);
      const corner = (r: number, c: number): Extract<Node, { t: 'ref' }> => ({ t: 'ref', sheet, row: r, col: c, absRow: false, absCol: false });
      return rangeOf({ t: 'range', sheet, from: corner(range.r1, range.c1), to: corner(range.r2, range.c2) }, ctx);
    }
    case 'SWITCH': {
      const subject = scalarOf(ev(args[0]));
      for (let i = 1; i + 1 < args.length; i += 2) if (compareValues(subject, scalarOf(ev(args[i]))) === 0) return ev(args[i + 1]);
      return args.length % 2 === 0 ? ev(args[args.length - 1]) : fail(ERRORS.na);
    }
  }
  const fn = FUNCTIONS[name];
  if (!fn) return fail(ERRORS.name);
  const evaluated = args.map(ev);
  if (ELEMENTWISE.has(name) && evaluated.some(isBlock)) {
    return broadcastMany(evaluated, (items) => {
      const result = fn(items, ctx);
      return isRange(result) ? (result.values[0]?.[0] ?? null) : result;
    });
  }
  return fn(evaluated, ctx);
}

/**
 * The value of a formula's text in a context: a number, text, boolean, or the
 * error it ends in. Never throws.
 */
export function evaluateFormula(formula: string, ctx: EvalContext): Scalar {
  const result = evaluateFormulaValue(formula, ctx);
  if (isRange(result)) return result.values[0]?.[0] ?? null;
  return result;
}

/**
 * Like evaluateFormula, but a formula that ends in a block of cells gives the
 * whole block (the workbook spills it); an error is still a value, never thrown.
 */
export function evaluateFormulaValue(formula: string, ctx: EvalContext): Value {
  try {
    return evaluateNode(parseFormula(formula), ctx);
  } catch (error) {
    if (error instanceof EvalAbort) return error.error;
    if (error instanceof ParseError) return ERRORS.syntax;
    throw error;
  }
}
