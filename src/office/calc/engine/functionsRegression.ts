import { block, flag, num1, type Fn } from './functions';
import { ERRORS, fail, isError, isRange, type RangeValue, type Scalar, type Value } from './values';

type Matrix = number[][];

/** The numbers of a block, in rows; any cell that is not a number makes the call #VALUE!. */
function numbersOfBlock(value: Value | undefined): Matrix {
  if (value === undefined) return fail(ERRORS.value);
  const rows: Scalar[][] = isRange(value) ? value.values : [[value]];
  return rows.map((row) =>
    row.map((cell) => {
      if (isError(cell)) return fail(cell);
      if (typeof cell !== 'number') return fail(ERRORS.value);
      return cell;
    }),
  );
}

interface Observations {
  y: number[];
  /** One row per observation, one column per variable. */
  x: Matrix;
  /** Whether the known values ran along a row, which decides how new x values are read. */
  rowWise: boolean;
}

/** The known y and x as observations. y is one column or one row; x runs the same way, or is 1, 2, 3… when left out. */
function observations(a: Value[]): Observations {
  const yBlock = numbersOfBlock(a[0]);
  const rowWise = yBlock.length === 1 && yBlock[0].length > 1;
  if (yBlock.length > 1 && yBlock[0].length > 1) fail(ERRORS.ref);
  const y = rowWise ? yBlock[0] : yBlock.map((row) => row[0]);
  const n = y.length;
  if (a[1] === undefined || (isRange(a[1]) && a[1].rows * a[1].cols === 0)) return { y, x: y.map((_v, i) => [i + 1]), rowWise };
  const xBlock = numbersOfBlock(a[1]);
  let x: Matrix;
  if (rowWise) {
    if (xBlock[0].length !== n) fail(ERRORS.ref);
    x = y.map((_v, i) => xBlock.map((row) => row[i]));
  } else {
    if (xBlock.length !== n) fail(ERRORS.ref);
    x = xBlock;
  }
  return { y, x, rowWise };
}

/** Solves A·X = B for a square A by Gauss-Jordan elimination with pivoting; null when A is singular. */
function inverse(m: Matrix): Matrix | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_v, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col += 1) {
    let pivot = col;
    for (let r = col + 1; r < n; r += 1) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-300) return null;
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const divisor = a[col][col];
    for (let c = 0; c < 2 * n; c += 1) a[col][c] /= divisor;
    for (let r = 0; r < n; r += 1) {
      if (r === col) continue;
      const factor = a[r][col];
      if (factor !== 0) for (let c = 0; c < 2 * n; c += 1) a[r][c] -= factor * a[col][c];
    }
  }
  return a.map((row) => row.slice(n));
}

interface Fit {
  /** Coefficients of the variables in order, then the intercept when one was fitted. */
  coefficients: number[];
  withIntercept: boolean;
  /** (X'X)^-1, for the standard errors. */
  inverse: Matrix;
  n: number;
  predicted: number[];
}

function fit(y: number[], x: Matrix, withIntercept: boolean): Fit {
  const design = x.map((row) => (withIntercept ? [...row, 1] : row));
  const k = design[0]?.length ?? 0;
  const n = y.length;
  if (n === 0 || k === 0) fail(ERRORS.value);
  const normal: Matrix = Array.from({ length: k }, (_v, i) => Array.from({ length: k }, (_w, j) => design.reduce((t, row) => t + row[i] * row[j], 0)));
  const inv = inverse(normal);
  if (!inv) return fail(ERRORS.num);
  const xty = Array.from({ length: k }, (_v, i) => design.reduce((t, row, r) => t + row[i] * y[r], 0));
  const coefficients = inv.map((row) => row.reduce((t, v, j) => t + v * xty[j], 0));
  const predicted = design.map((row) => row.reduce((t, v, j) => t + v * coefficients[j], 0));
  return { coefficients, withIntercept, inverse: inv, n, predicted };
}

/** LINEST's table: coefficients in reverse order and the intercept last; with `stats`, four more rows. */
function linestTable(y: number[], x: Matrix, withIntercept: boolean, stats: boolean, exponentiate: boolean): RangeValue {
  const result = fit(y, x, withIntercept);
  const variables = x[0].length;
  const slopes = result.coefficients.slice(0, variables).reverse();
  const intercept = withIntercept ? result.coefficients[variables] : 0;
  const shown = (v: number): number => (exponentiate ? Math.exp(v) : v);
  const columns = variables + 1;
  const first: Scalar[] = [...slopes.map(shown), shown(intercept)];
  if (!stats) return block([first]);

  const n = result.n;
  const parameters = variables + (withIntercept ? 1 : 0);
  const df = n - parameters;
  const rawResidual = y.reduce((t, v, i) => t + (v - result.predicted[i]) ** 2, 0);
  const mean = y.reduce((t, v) => t + v, 0) / n;
  const total = withIntercept ? y.reduce((t, v) => t + (v - mean) ** 2, 0) : y.reduce((t, v) => t + v * v, 0);
  // A fit that is exact up to rounding has no residual, as in Excel.
  const residual = rawResidual <= total * 1e-18 ? 0 : rawResidual;
  const regressionSS = total - residual;
  const sey = df > 0 ? Math.sqrt(residual / df) : 0;
  const se = result.inverse.map((row, i) => Math.sqrt(Math.max(0, row[i])) * sey);
  const seSlopes = se.slice(0, variables).reverse();
  const row2: Scalar[] = [...seSlopes, withIntercept ? se[variables] : ERRORS.na];
  const pad = (cells: Scalar[]): Scalar[] => [...cells, ...Array.from({ length: columns - cells.length }, () => ERRORS.na as Scalar)];
  const r2 = total === 0 ? 1 : regressionSS / total;
  const f = df > 0 && residual > 0 ? regressionSS / variables / (residual / df) : ERRORS.num;
  return block([first, row2, pad([r2, sey]), pad([f, df]), pad([regressionSS, residual])]);
}

function prediction(a: Value[], exponentiate: boolean): Value {
  const { y: rawY, x, rowWise } = observations(a);
  const y = exponentiate ? rawY.map((v) => (v > 0 ? Math.log(v) : fail(ERRORS.num))) : rawY;
  const withIntercept = flag(a, 3, true);
  const result = fit(y, x, withIntercept);
  const variables = x[0].length;
  const at = (row: number[]): number => {
    const value = row.reduce((t, v, j) => t + v * result.coefficients[j], 0) + (withIntercept ? result.coefficients[variables] : 0);
    return exponentiate ? Math.exp(value) : value;
  };
  if (a[2] === undefined) return block(rowWise ? [x.map(at)] : x.map((row) => [at(row)]));
  const fresh = numbersOfBlock(a[2]);
  if (rowWise) {
    if (fresh.length !== variables) fail(ERRORS.ref);
    return block([fresh[0].map((_v, i) => at(fresh.map((row) => row[i])))]);
  }
  if (fresh[0].length !== variables) fail(ERRORS.ref);
  return block(fresh.map((row) => [at(row)]));
}

function regressionCall(a: Value[], exponentiate: boolean): Value {
  const { y: rawY, x } = observations(a);
  const y = exponentiate ? rawY.map((v) => (v > 0 ? Math.log(v) : fail(ERRORS.num))) : rawY;
  return linestTable(y, x, flag(a, 2, true), flag(a, 3, false), exponentiate);
}

/** Cuts a list into rows of `width`, filling the last row with a pad value. */
function wrap(a: Value[], byRows: boolean): Value {
  const source = a[0];
  const cells: Scalar[] = isRange(source) ? source.values.flat() : [source ?? null];
  if (isRange(source) && source.rows > 1 && source.cols > 1) fail(ERRORS.value);
  const size = Math.trunc(num1(a, 1));
  if (!(size >= 1)) fail(ERRORS.num);
  const padding: Scalar = a[2] === undefined ? ERRORS.na : isRange(a[2]) ? (a[2].values[0]?.[0] ?? null) : a[2];
  const lines = Math.ceil(cells.length / size);
  const grid: Scalar[][] = Array.from({ length: lines }, (_v, r) => Array.from({ length: size }, (_w, c) => (r * size + c < cells.length ? cells[r * size + c] : padding)));
  if (byRows) return block(grid);
  return block(Array.from({ length: size }, (_v, r) => grid.map((line) => line[r])));
}

export const REGRESSION_FUNCTIONS: Record<string, Fn> = {
  LINEST: (a) => regressionCall(a, false),
  LOGEST: (a) => regressionCall(a, true),
  TREND: (a) => prediction(a, false),
  GROWTH: (a) => prediction(a, true),
  WRAPROWS: (a) => wrap(a, true),
  WRAPCOLS: (a) => wrap(a, false),
};
