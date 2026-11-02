import { MAX_COLS, MAX_ROWS, parseRange } from './cellRef';
import { power, type FunctionContext } from './functions';
import { FUNCTIONS } from './functionTable';
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
  /** How many rows and columns a sheet holds data in; a whole column or row is read only that far. */
  extent?(sheet: string): { rows: number; cols: number };
  /** Whether the row is hidden, for SUBTOTAL and AGGREGATE: by a filter, and with `includeManual` by hand as well. */
  rowHidden?(sheet: string, row: number, includeManual: boolean): boolean;
  /** Whether the cell holds a SUBTOTAL or AGGREGATE, which another SUBTOTAL or AGGREGATE leaves out. */
  isSubtotalAt?(sheet: string, row: number, col: number): boolean;
  /** What a cell holds as typed, for FORMULATEXT and ISFORMULA. */
  rawAt?(sheet: string, row: number, col: number): string;
  /** The position of a sheet in the workbook, 0-based; -1 when there is none. */
  sheetIndex?(name: string): number;
  sheetCount?(): number;
  /** What a defined name refers to, as a formula tree; null when there is no such name. */
  nameTree?(name: string): Node | null;
  /** How many defined names deep the evaluation is, so that names that refer to each other stop. */
  nameDepth?: number;
  /** Names bound by LET, in upper case. */
  vars?: ReadonlyMap<string, Value>;
}

function scalarOf(value: Value): Scalar {
  if (!isRange(value)) return value;
  if (value.rows === 1 && value.cols === 1) return value.values[0][0];
  return fail(ERRORS.value);
}

/** The far corner of a range, held back to the sheet's data when it runs to the last row or column. */
function clampToData(node: Extract<Node, { t: 'range' }>, ctx: EvalContext, sheet: string): [number, number] {
  const r2 = Math.max(node.from.row, node.to.row);
  const c2 = Math.max(node.from.col, node.to.col);
  const extent = ctx.extent?.(sheet);
  if (!extent) return [r2, c2];
  const [r1, c1] = [Math.min(node.from.row, node.to.row), Math.min(node.from.col, node.to.col)];
  return [r2 === MAX_ROWS - 1 ? Math.max(r1, Math.min(r2, extent.rows - 1)) : r2, c2 === MAX_COLS - 1 ? Math.max(c1, Math.min(c2, extent.cols - 1)) : c2];
}

function rangeOf(node: Extract<Node, { t: 'range' }>, ctx: EvalContext): RangeValue {
  const sheet = node.sheet ?? ctx.sheet;
  if (!ctx.sheetExists(sheet)) fail(ERRORS.ref);
  const [r1, c1] = [Math.min(node.from.row, node.to.row), Math.min(node.from.col, node.to.col)];
  const [r2, c2] = clampToData(node, ctx, sheet);
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
  'ISERR', 'ISNA', 'ISLOGICAL', 'ISNONTEXT', 'N', 'SIN', 'COS', 'TAN', 'ASIN', 'ACOS', 'ATAN', 'ATAN2', 'DEGREES', 'RADIANS', 'EVEN', 'ODD',
  'QUOTIENT', 'MROUND', 'UNICODE', 'CODE', 'CHAR', 'NUMBERVALUE', 'DOLLAR', 'FIXED', 'DATEVALUE', 'HOUR', 'MINUTE', 'SECOND', 'EOMONTH',
  'LN', 'LOG10', 'LOG', 'ROMAN', 'DEC2BIN', 'DEC2HEX', 'BIN2DEC', 'HEX2DEC', 'FACT', 'COMBIN', 'GCD', 'LCM', 'REPT', 'SEARCH', 'FIND',
]);

/** Functions that look at an error instead of passing it on. */
const ERROR_TOLERANT = new Set(['ISERROR', 'ISERR', 'ISNA', 'ISNUMBER', 'ISTEXT', 'ISBLANK', 'ISLOGICAL', 'ISNONTEXT', 'TYPE', 'ERROR.TYPE']);

const AGGREGATE_FUNCTIONS: Record<number, string> = {
  1: 'AVERAGE', 2: 'COUNT', 3: 'COUNTA', 4: 'MAX', 5: 'MIN', 6: 'PRODUCT', 7: 'STDEV', 8: 'STDEVP', 9: 'SUM', 10: 'VAR', 11: 'VARP', 12: 'MEDIAN', 13: 'MODE',
  14: 'LARGE', 15: 'SMALL', 16: 'PERCENTILE', 17: 'QUARTILE', 18: 'PERCENTILE.EXC', 19: 'QUARTILE.EXC',
};

const ERROR_PASSING = new Set(['XLOOKUP', 'XMATCH', 'MATCH', 'VLOOKUP', 'HLOOKUP', 'LOOKUP', 'INDEX']);
const SUBTOTAL_FUNCTIONS: Record<number, string> = { 1: 'AVERAGE', 2: 'COUNT', 3: 'COUNTA', 4: 'MAX', 5: 'MIN', 6: 'PRODUCT', 7: 'STDEV', 8: 'STDEVP', 9: 'SUM', 10: 'VAR', 11: 'VARP' };

const vector = (numbers: number[], horizontal: boolean): RangeValue =>
  horizontal ? { kind: 'range', rows: 1, cols: numbers.length, values: [numbers] } : { kind: 'range', rows: numbers.length, cols: 1, values: numbers.map((n) => [n]) };

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
    case '^':
      return power(toNumber(left), toNumber(right));
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
    case 'array':
      return { kind: 'range', rows: node.v.length, cols: node.v[0].length, values: node.v };
    case 'name': {
      const bound = ctx.vars?.get(node.v.toUpperCase());
      if (bound !== undefined) return bound;
      if (node.v === '') return null;
      const tree = ctx.nameTree?.(node.v);
      if (!tree || (ctx.nameDepth ?? 0) > 20) return fail(ERRORS.name);
      return evaluateNode(tree, { ...ctx, nameDepth: (ctx.nameDepth ?? 0) + 1 });
    }
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

/** The rows of a value, a lone value being one row of one. */
function gridOf(value: Value): Scalar[][] {
  return isRange(value) ? value.values : [[value]];
}

/** A LAMBDA written in place as an argument: its parameter names and its body. */
function lambdaOf(node: Node | undefined): { params: string[]; body: Node } {
  if (node?.t !== 'call' || node.name !== 'LAMBDA' || node.args.length === 0) return fail(ERRORS.value);
  const params = node.args.slice(0, -1).map((arg) => (arg.t === 'name' && arg.v !== '' ? arg.v.toUpperCase() : fail(ERRORS.value)));
  return { params, body: node.args[node.args.length - 1] };
}

function applyLambda(lambda: { params: string[]; body: Node }, values: Value[], ctx: EvalContext): Value {
  const scope = new Map(ctx.vars ?? []);
  lambda.params.forEach((param, i) => scope.set(param, values[i] ?? null));
  return evaluateNode(lambda.body, { ...ctx, vars: scope });
}

/** The one value a lambda's answer is, for the functions that put each answer in a cell. */
function oneOf(value: Value): Scalar {
  if (!isRange(value)) return value;
  return value.rows * value.cols === 1 ? value.values[0][0] : fail(ERRORS.calc);
}

/** The block with the cells that hold a SUBTOTAL or AGGREGATE blanked, so that a total over totals does not count twice. */
function withoutSubtotals(block: RangeValue, node: Extract<Node, { t: 'range' }>, ctx: EvalContext): RangeValue {
  if (!ctx.isSubtotalAt) return block;
  const sheet = node.sheet ?? ctx.sheet;
  const top = Math.min(node.from.row, node.to.row);
  const left = Math.min(node.from.col, node.to.col);
  return { ...block, values: block.values.map((row, i) => row.map((value, j) => (ctx.isSubtotalAt!(sheet, top + i, left + j) ? null : value))) };
}

/** The first cell a reference argument points at, through a defined name too; null when it is not a reference. */
function referenceOf(node: Node | undefined, ctx: EvalContext): { sheet: string; row: number; col: number } | null {
  if (!node) return null;
  if (node.t === 'ref') return { sheet: node.sheet ?? ctx.sheet, row: node.row, col: node.col };
  if (node.t === 'range') return { sheet: node.sheet ?? ctx.sheet, row: Math.min(node.from.row, node.to.row), col: Math.min(node.from.col, node.to.col) };
  if (node.t === 'name' && !ctx.vars?.has(node.v.toUpperCase())) {
    const tree = ctx.nameTree?.(node.v);
    return tree && (ctx.nameDepth ?? 0) <= 20 ? referenceOf(tree, { ...ctx, nameDepth: (ctx.nameDepth ?? 0) + 1 }) : null;
  }
  return null;
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
    case 'ISREF':
    case 'ISFORMULA':
    case 'FORMULATEXT': {
      const target = referenceOf(args[0], ctx);
      if (name === 'ISREF') {
        if (target) return true;
        // INDEX, OFFSET and INDIRECT hand back a reference when they are given one.
        const first = args[0];
        if (first?.t !== 'call' || !['INDEX', 'OFFSET', 'INDIRECT'].includes(first.name)) return false;
        if (first.name === 'INDEX' && referenceOf(first.args[0], ctx) === null) return false;
        try {
          ev(first);
          return true;
        } catch (error) {
          if (error instanceof EvalAbort) return false;
          throw error;
        }
      }
      if (!target) return name === 'ISFORMULA' ? fail(ERRORS.value) : fail(ERRORS.na);
      const raw = ctx.rawAt?.(target.sheet, target.row, target.col) ?? '';
      const isFormula = raw.startsWith('=') && raw.length > 1;
      if (name === 'ISFORMULA') return isFormula;
      return isFormula ? raw : fail(ERRORS.na);
    }
    case 'SHEET': {
      if (args.length === 0) return (ctx.sheetIndex?.(ctx.sheet) ?? 0) + 1;
      const target = referenceOf(args[0], ctx);
      if (target) return (ctx.sheetIndex?.(target.sheet) ?? 0) + 1;
      const label = scalarOf(ev(args[0]));
      const found = typeof label === 'string' ? (ctx.sheetIndex?.(label) ?? -1) : -1;
      return found >= 0 ? found + 1 : fail(ERRORS.na);
    }
    case 'SHEETS': {
      if (args.length === 0) return ctx.sheetCount?.() ?? 1;
      return referenceOf(args[0], ctx) ? 1 : fail(ERRORS.value);
    }
    case 'ROWS':
    case 'COLUMNS': {
      const target = args[0];
      if (target?.t !== 'range') return FUNCTIONS[name](args.map(ev), ctx);
      return name === 'ROWS' ? Math.abs(target.to.row - target.from.row) + 1 : Math.abs(target.to.col - target.from.col) + 1;
    }
    case 'ROW':
    case 'COLUMN': {
      const horizontal = name === 'COLUMN';
      const target = args[0];
      if (!target) return (horizontal ? ctx.col : ctx.row) + 1;
      if (target.t === 'ref') return (horizontal ? target.col : target.row) + 1;
      if (target.t !== 'range') return fail(ERRORS.value);
      const [clampedRow, clampedCol] = clampToData(target, ctx, target.sheet ?? ctx.sheet);
      const [lo, hi] = horizontal ? [Math.min(target.from.col, target.to.col), clampedCol] : [Math.min(target.from.row, target.to.row), clampedRow];
      const numbers = Array.from({ length: hi - lo + 1 }, (_v, i) => lo + i + 1);
      return numbers.length === 1 ? numbers[0] : vector(numbers, horizontal);
    }
    case 'SUBTOTAL': {
      const number = Math.trunc(toNumber(scalarOf(ev(args[0] ?? { t: 'name', v: '' }))));
      const function_ = SUBTOTAL_FUNCTIONS[number % 100];
      const skipByHand = number >= 100;
      if (!function_ || args.length < 2) return fail(ERRORS.value);
      // Rows a filter hides do not count, as in Excel.
      const parts = args.slice(1).map((arg): Value => {
        if (arg.t === 'ref' && ctx.isSubtotalAt?.(arg.sheet ?? ctx.sheet, arg.row, arg.col)) return null;
        if (arg.t !== 'range') return ev(arg);
        const full = withoutSubtotals(rangeOf(arg, ctx), arg, ctx);
        const sheet = arg.sheet ?? ctx.sheet;
        const top = Math.min(arg.from.row, arg.to.row);
        const values = full.values.filter((_row, i) => !ctx.rowHidden?.(sheet, top + i, skipByHand));
        return { kind: 'range', rows: values.length, cols: full.cols, values };
      });
      return FUNCTIONS[function_](parts, ctx);
    }
    case 'AGGREGATE': {
      const target = AGGREGATE_FUNCTIONS[Math.trunc(toNumber(scalarOf(ev(args[0] ?? { t: 'name', v: '' }))))];
      const options = Math.trunc(toNumber(scalarOf(ev(args[1] ?? { t: 'name', v: '' }))));
      if (!target || !FUNCTIONS[target] || args.length < 3 || options < 0 || options > 7) return fail(ERRORS.value);
      const skipHidden = options === 1 || options === 3 || options === 5 || options === 7;
      const skipErrors = options >= 2 && options !== 4 && options !== 5;
      const strip = (given: Value, node: Node): Value => {
        if (!isRange(given)) return given;
        const value = options <= 3 && node.t === 'range' ? withoutSubtotals(given, node, ctx) : given;
        const sheet = node.t === 'range' ? (node.sheet ?? ctx.sheet) : ctx.sheet;
        const top = node.t === 'range' ? Math.min(node.from.row, node.to.row) : 0;
        const rows = skipHidden && node.t === 'range' ? value.values.filter((_row, i) => !ctx.rowHidden?.(sheet, top + i, true)) : value.values;
        const kept = skipErrors ? rows.map((row) => row.filter((cell) => !isError(cell))) : rows;
        return { kind: 'range', rows: kept.length, cols: kept[0]?.length ?? 0, values: kept };
      };
      const parts = [strip(ev(args[2]), args[2]), ...args.slice(3).map(ev)];
      return FUNCTIONS[target](parts, ctx);
    }
    case 'BYROW':
    case 'BYCOL': {
      const grid = gridOf(ev(args[0] ?? { t: 'name', v: '' }));
      const lambda = lambdaOf(args[1]);
      if (name === 'BYROW') return { kind: 'range', rows: grid.length, cols: 1, values: grid.map((row) => [oneOf(applyLambda(lambda, [{ kind: 'range', rows: 1, cols: row.length, values: [row] }], ctx))]) };
      const columns = (grid[0] ?? []).map((_x, c) => grid.map((row) => row[c]));
      return { kind: 'range', rows: 1, cols: columns.length, values: [columns.map((col) => oneOf(applyLambda(lambda, [{ kind: 'range', rows: col.length, cols: 1, values: col.map((v) => [v]) }], ctx)))] };
    }
    case 'MAP': {
      if (args.length < 2) return fail(ERRORS.value);
      const grids = args.slice(0, -1).map((arg) => gridOf(ev(arg)));
      const lambda = lambdaOf(args[args.length - 1]);
      const [shape] = grids;
      if (grids.some((g) => g.length !== shape.length || (g[0]?.length ?? 0) !== (shape[0]?.length ?? 0))) return fail(ERRORS.na);
      return { kind: 'range', rows: shape.length, cols: shape[0]?.length ?? 0, values: shape.map((row, r) => row.map((_v, c) => oneOf(applyLambda(lambda, grids.map((g) => g[r][c]), ctx)))) };
    }
    case 'REDUCE':
    case 'SCAN': {
      if (args.length !== 3) return fail(ERRORS.value);
      let accumulator: Value = ev(args[0]);
      const grid = gridOf(ev(args[1]));
      const lambda = lambdaOf(args[2]);
      const steps: Scalar[][] = grid.map(() => []);
      grid.forEach((row, r) =>
        row.forEach((value) => {
          accumulator = applyLambda(lambda, [accumulator, value], ctx);
          steps[r].push(name === 'SCAN' ? oneOf(accumulator) : null);
        }),
      );
      return name === 'REDUCE' ? accumulator : { kind: 'range', rows: grid.length, cols: grid[0]?.length ?? 0, values: steps };
    }
    case 'MAKEARRAY': {
      if (args.length !== 3) return fail(ERRORS.value);
      const rows = Math.trunc(toNumber(scalarOf(ev(args[0]))));
      const cols = Math.trunc(toNumber(scalarOf(ev(args[1]))));
      if (!(rows >= 1 && cols >= 1 && rows * cols <= 100_000)) return fail(ERRORS.value);
      const lambda = lambdaOf(args[2]);
      return { kind: 'range', rows, cols, values: Array.from({ length: rows }, (_x, r) => Array.from({ length: cols }, (_y, c) => oneOf(applyLambda(lambda, [r + 1, c + 1], ctx)))) };
    }
    case 'LET': {
      if (args.length < 3 || args.length % 2 === 0) return fail(ERRORS.value);
      const scope = new Map(ctx.vars ?? []);
      const inner: EvalContext = { ...ctx, vars: scope };
      for (let i = 0; i + 1 < args.length; i += 2) {
        const label = args[i];
        if (label.t !== 'name' || label.v === '') return fail(ERRORS.name);
        scope.set(label.v.toUpperCase(), evaluateNode(args[i + 1], inner));
      }
      return evaluateNode(args[args.length - 1], inner);
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
  const evaluated = ERROR_TOLERANT.has(name)
    ? args.map((arg) => {
        try {
          return ev(arg);
        } catch (error) {
          if (error instanceof EvalAbort) return error.error;
          throw error;
        }
      })
    : args.map(ev);
  // A lookup over something that is already an error is that error, not "not found".
  if (ERROR_PASSING.has(name)) for (const arg of evaluated) if (isError(arg)) fail(arg);
  // A call with fewer arguments than the function needs reaches for one that is not there: Excel refuses such a formula, here it is #VALUE!.
  const call = (items: Value[]): Value => {
    try {
      return fn(items, ctx);
    } catch (error) {
      if (error instanceof TypeError) return fail(ERRORS.value);
      throw error;
    }
  };
  if (ELEMENTWISE.has(name) && evaluated.some(isBlock)) {
    return broadcastMany(evaluated, (items) => {
      const result = call(items);
      return isRange(result) ? (result.values[0]?.[0] ?? null) : result;
    });
  }
  return call(evaluated);
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
