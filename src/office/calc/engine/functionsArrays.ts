import { ERRORS, fail, isError, type RangeValue, type Scalar, type Value } from './values';
import { block, num1, table, transposed, type Fn } from './functions';

const MAX_CELLS = 100_000;

const rowsOf = (value: Value): Scalar[][] => table(value).values;

/** TOCOL/TOROW's second argument: 1 skips blanks, 2 errors, 3 both. */
function kept(values: Scalar[], ignore: number): Scalar[] {
  return values.filter((v) => !((ignore === 1 || ignore === 3) && (v === null || v === '')) && !((ignore === 2 || ignore === 3) && isError(v)));
}

/** A count from the arguments, negative for "from the end"; the default is "all". */
function amount(a: Value[], i: number, all: number): number {
  return a[i] === undefined ? all : Math.trunc(num1(a, i));
}

function slice(lines: Scalar[][], count: number): Scalar[][] {
  if (count === 0) fail(ERRORS.value);
  const n = Math.min(Math.abs(count), lines.length);
  return count > 0 ? lines.slice(0, n) : lines.slice(lines.length - n);
}

function stack(blocks: RangeValue[], vertical: boolean): RangeValue {
  const size = Math.max(...blocks.map((b) => (vertical ? b.cols : b.rows)));
  const out: Scalar[][] = [];
  if (vertical) {
    for (const b of blocks) for (const row of b.values) out.push(Array.from({ length: size }, (_c, j) => row[j] ?? ERRORS.na));
  } else {
    for (let r = 0; r < size; r += 1) out.push(blocks.flatMap((b) => Array.from({ length: b.cols }, (_c, j) => b.values[r]?.[j] ?? ERRORS.na)));
  }
  return block(out);
}

export const ARRAY_FUNCTIONS: Record<string, Fn> = {
  TOCOL: (a) => {
    const rows = rowsOf(a[0]);
    const byColumn = a[2] !== undefined && num1(a, 2) !== 0;
    const values = kept((byColumn ? transposed(rows) : rows).flat(), a[1] === undefined ? 0 : Math.trunc(num1(a, 1)));
    return values.length ? block(values.map((v) => [v])) : fail(ERRORS.na);
  },
  TOROW: (a) => {
    const rows = rowsOf(a[0]);
    const byColumn = a[2] !== undefined && num1(a, 2) !== 0;
    const values = kept((byColumn ? transposed(rows) : rows).flat(), a[1] === undefined ? 0 : Math.trunc(num1(a, 1)));
    return values.length ? block([values]) : fail(ERRORS.na);
  },
  TAKE: (a) => {
    const rows = rowsOf(a[0]);
    const taken = a[1] === undefined ? rows : slice(rows, amount(a, 1, rows.length));
    const cols = amount(a, 2, rows[0].length);
    return block(a[2] === undefined ? taken : transposed(slice(transposed(taken), cols)));
  },
  DROP: (a) => {
    const rows = rowsOf(a[0]);
    const drop = (lines: Scalar[][], n: number) => (n >= 0 ? lines.slice(n) : lines.slice(0, lines.length + n));
    const kept = drop(rows, amount(a, 1, 0));
    if (kept.length === 0) fail(ERRORS.value);
    const result = a[2] === undefined ? kept : transposed(drop(transposed(kept), amount(a, 2, 0)));
    return result.length && result[0].length ? block(result) : fail(ERRORS.value);
  },
  CHOOSECOLS: (a) => {
    const rows = rowsOf(a[0]);
    const width = rows[0].length;
    const picks = a.slice(1).map((v) => Math.trunc(num1([v], 0)));
    if (picks.some((p) => p === 0 || Math.abs(p) > width)) fail(ERRORS.value);
    return block(rows.map((row) => picks.map((p) => row[p > 0 ? p - 1 : width + p])));
  },
  CHOOSEROWS: (a) => {
    const rows = rowsOf(a[0]);
    const picks = a.slice(1).map((v) => Math.trunc(num1([v], 0)));
    if (picks.some((p) => p === 0 || Math.abs(p) > rows.length)) fail(ERRORS.value);
    return block(picks.map((p) => rows[p > 0 ? p - 1 : rows.length + p]));
  },
  VSTACK: (a) => stack(a.map(table), true),
  HSTACK: (a) => stack(a.map(table), false),
  EXPAND: (a) => {
    const rows = rowsOf(a[0]);
    const [height, width] = [amount(a, 1, rows.length), amount(a, 2, rows[0].length)];
    if (height < rows.length || width < rows[0].length) fail(ERRORS.value);
    if (height * width > MAX_CELLS) fail(ERRORS.num);
    const pad: Scalar = a[3] === undefined ? ERRORS.na : (a[3] as Scalar);
    return block(Array.from({ length: height }, (_r, i) => Array.from({ length: width }, (_c, j) => rows[i]?.[j] ?? pad)));
  },
  RANDARRAY: (a) => {
    const [height, width] = [amount(a, 0, 1), amount(a, 1, 1)];
    const [min, max] = [a[2] === undefined ? 0 : num1(a, 2), a[3] === undefined ? 1 : num1(a, 3)];
    const whole = a[4] !== undefined && num1(a, 4) !== 0;
    if (height < 1 || width < 1 || height * width > MAX_CELLS || min > max) fail(ERRORS.value);
    const one = () => (whole ? Math.ceil(min) + Math.floor(Math.random() * (Math.floor(max) - Math.ceil(min) + 1)) : min + Math.random() * (max - min));
    return block(Array.from({ length: height }, () => Array.from({ length: width }, one)));
  },
};
