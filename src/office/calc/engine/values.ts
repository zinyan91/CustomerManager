/**
 * Values a cell can hold and the rules for turning one kind into another, as
 * Excel does: text that looks like a number is a number in arithmetic, TRUE is
 * 1, an empty cell is 0 or "" depending on who asks, and an error in any input
 * is the error out.
 */
export type ErrorCode = '#DIV/0!' | '#REF!' | '#NAME?' | '#VALUE!' | '#N/A' | '#NUM!' | '#CIRC!' | '#SPILL!' | '#ERROR!';

export class CellError {
  readonly code: ErrorCode;
  constructor(code: ErrorCode) {
    this.code = code;
  }
  toString(): string {
    return this.code;
  }
}

export const ERRORS = {
  div0: new CellError('#DIV/0!'),
  ref: new CellError('#REF!'),
  name: new CellError('#NAME?'),
  value: new CellError('#VALUE!'),
  na: new CellError('#N/A'),
  num: new CellError('#NUM!'),
  circular: new CellError('#CIRC!'),
  spill: new CellError('#SPILL!'),
  syntax: new CellError('#ERROR!'),
} as const;

const ERROR_BY_CODE = new Map<string, CellError>(Object.values(ERRORS).map((e) => [e.code, e]));

export function errorFromCode(code: string): CellError | null {
  return ERROR_BY_CODE.get(code.toUpperCase()) ?? null;
}

export type Scalar = number | string | boolean | null | CellError;

/** A block of cells passed to a function; `values[row][col]`. */
export interface RangeValue {
  kind: 'range';
  rows: number;
  cols: number;
  values: Scalar[][];
}

export type Value = Scalar | RangeValue;

export const isError = (value: unknown): value is CellError => value instanceof CellError;
export const isRange = (value: unknown): value is RangeValue =>
  typeof value === 'object' && value !== null && (value as RangeValue).kind === 'range';

/** Thrown inside an evaluation to unwind to the cell and make the error its value. */
export class EvalAbort extends Error {
  readonly error: CellError;
  constructor(error: CellError) {
    super(error.code);
    this.error = error;
  }
}

export function fail(error: CellError): never {
  throw new EvalAbort(error);
}

/** The number a text means, or null. Accepts thousands-free decimals, percent and exponent. */
export function parseNumber(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const percent = trimmed.endsWith('%');
  const body = percent ? trimmed.slice(0, -1).trim() : trimmed;
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(body)) return null;
  const n = Number(body);
  if (!Number.isFinite(n)) return null;
  return percent ? n / 100 : n;
}

/** For arithmetic: empty is 0, TRUE is 1, text must look like a number. */
export function toNumber(value: Scalar): number {
  if (isError(value)) fail(value);
  if (typeof value === 'number') return value;
  if (value === null) return 0;
  if (typeof value === 'boolean') return value ? 1 : 0;
  const n = parseNumber(value);
  if (n === null) fail(ERRORS.value);
  return n;
}

export function toText(value: Scalar): string {
  if (isError(value)) fail(value);
  if (value === null) return '';
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
  if (typeof value === 'number') return formatGeneral(value);
  return value;
}

export function toBoolean(value: Scalar): boolean {
  if (isError(value)) fail(value);
  if (value === null) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  const upper = value.trim().toUpperCase();
  if (upper === 'TRUE') return true;
  if (upper === 'FALSE') return false;
  fail(ERRORS.value);
}

/** Excel's "General": up to 11 significant digits, no trailing zeros. */
export function formatGeneral(n: number): string {
  if (!Number.isFinite(n)) return '#NUM!';
  if (Number.isInteger(n) && Math.abs(n) < 1e11) return String(n);
  const abs = Math.abs(n);
  if (abs >= 1e11 || (abs < 1e-4 && n !== 0)) {
    const [mantissa, exponent] = n.toExponential(5).split('e');
    const trimmed = mantissa.includes('.') ? mantissa.replace(/0+$/, '').replace(/\.$/, '') : mantissa;
    const power = Number(exponent);
    return `${trimmed}E${power < 0 ? '-' : '+'}${String(Math.abs(power)).padStart(2, '0')}`;
  }
  return String(Number(n.toPrecision(11)));
}

/** Type order for comparing unlike values: numbers < text < booleans. */
function rank(value: Scalar): number {
  if (value === null) return 0;
  if (typeof value === 'number') return 1;
  if (typeof value === 'string') return 2;
  return 3;
}

/** -1, 0 or 1; text compares case-insensitively; empty equals 0 and "". */
export function compareValues(a: Scalar, b: Scalar): number {
  if (isError(a)) fail(a);
  if (isError(b)) fail(b);
  if (a === null) a = typeof b === 'string' ? '' : typeof b === 'boolean' ? false : 0;
  if (b === null) b = typeof a === 'string' ? '' : typeof a === 'boolean' ? false : 0;
  const ra = rank(a);
  const rb = rank(b);
  if (ra !== rb) return ra < rb ? -1 : 1;
  if (typeof a === 'string' && typeof b === 'string') {
    const x = a.toLocaleLowerCase();
    const y = b.toLocaleLowerCase();
    return x < y ? -1 : x > y ? 1 : 0;
  }
  const x = Number(a);
  const y = Number(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

/** Every scalar in the arguments, ranges flattened, in reading order. */
export function flatten(args: Value[]): Scalar[] {
  const out: Scalar[] = [];
  for (const arg of args) {
    if (isRange(arg)) for (const row of arg.values) for (const cell of row) out.push(cell);
    else out.push(arg);
  }
  return out;
}
