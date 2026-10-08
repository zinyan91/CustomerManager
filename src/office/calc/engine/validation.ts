import type { RangePos } from './cellRef';

/**
 * Data validation, as Excel's "Data Validation": what may be typed into a block
 * of cells. A list (typed, or read from a range), or a whole number or decimal
 * compared with one or two limits. Pure, so it is tested in Node.
 */
export type NumberOp = 'between' | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte';
export const NUMBER_OPERATORS: NumberOp[] = ['between', 'eq', 'neq', 'gt', 'gte', 'lt', 'lte'];

export type ValidationRule =
  /** A list typed into the dialog. */
  | { kind: 'items'; items: string[] }
  /** A list read from cells: an A1 range, optionally with a sheet name ("'Danh mục'!A1:A9"). */
  | { kind: 'range'; ref: string }
  | { kind: 'number'; integer: boolean; op: NumberOp; a: number; b?: number };

export interface Validation {
  range: RangePos;
  rule: ValidationRule;
  /** What to say when an entry is refused; the app's own words when absent. */
  error?: string;
}

/** "a, b; c" as a list: split at commas and semicolons, trimmed, no blanks, no repeats. */
export function parseListItems(text: string): string[] {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const part of text.split(/[,;\n]/)) {
    const item = part.trim();
    if (item && !seen.has(item.toLowerCase())) {
      seen.add(item.toLowerCase());
      items.push(item);
    }
  }
  return items;
}

/** A typed number, with "," or "." as the decimal mark; null when it is not one. */
export function entryNumber(text: string): number | null {
  const trimmed = text.trim().replace(/\s/g, '');
  if (!/^[+-]?(?:\d+[.,]?\d*|[.,]\d+)$/.test(trimmed)) return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : null;
}

function compare(op: NumberOp, value: number, a: number, b: number | undefined): boolean {
  switch (op) {
    case 'between':
      return value >= Math.min(a, b ?? a) && value <= Math.max(a, b ?? a);
    case 'eq':
      return value === a;
    case 'neq':
      return value !== a;
    case 'gt':
      return value > a;
    case 'gte':
      return value >= a;
    case 'lt':
      return value < a;
    default:
      return value <= a;
  }
}

/**
 * Whether `text`, as typed, is allowed by `rule`. A blank entry is always
 * allowed (it clears the cell), and so is a formula, whose value Excel checks
 * but this does not. `listValues` is what a range list holds now.
 */
export function acceptsEntry(rule: ValidationRule, text: string, listValues: readonly string[] = []): boolean {
  const entry = text.trim();
  if (entry === '' || entry.startsWith('=')) return true;
  if (rule.kind === 'items') return rule.items.some((item) => item.toLowerCase() === entry.toLowerCase());
  if (rule.kind === 'range') return listValues.some((item) => item.trim().toLowerCase() === entry.toLowerCase());
  const value = entryNumber(entry);
  if (value === null) return false;
  if (rule.integer && !Number.isInteger(value)) return false;
  return compare(rule.op, value, rule.a, rule.b);
}

/** The rule that applies to a cell: the last one added whose range holds it. */
export function validationAt(validations: readonly Validation[] | undefined, row: number, col: number): Validation | undefined {
  if (!validations) return undefined;
  for (let i = validations.length - 1; i >= 0; i -= 1) {
    const { range } = validations[i];
    if (row >= range.r1 && row <= range.r2 && col >= range.c1 && col <= range.c2) return validations[i];
  }
  return undefined;
}

/** Same rule, same message: the test for merging neighbouring blocks and for reading an .xlsx back. */
export const sameValidation = (a: Pick<Validation, 'rule' | 'error'>, b: Pick<Validation, 'rule' | 'error'>): boolean =>
  JSON.stringify([a.rule, a.error ?? '']) === JSON.stringify([b.rule, b.error ?? '']);

/** Single-cell blocks, as an .xlsx lists them, joined into the fewest rectangles of the same rule. */
export function mergeValidations(cells: Validation[]): Validation[] {
  // First down each column...
  const sorted = [...cells].sort((x, y) => x.range.c1 - y.range.c1 || x.range.r1 - y.range.r1);
  const columns: Validation[] = [];
  for (const cell of sorted) {
    const last = columns[columns.length - 1];
    if (last && last.range.c1 === cell.range.c1 && last.range.r2 + 1 === cell.range.r1 && sameValidation(last, cell)) {
      last.range = { ...last.range, r2: cell.range.r2 };
    } else columns.push({ ...cell, range: { ...cell.range } });
  }
  // ...then across columns that cover the same rows.
  columns.sort((x, y) => x.range.r1 - y.range.r1 || x.range.r2 - y.range.r2 || x.range.c1 - y.range.c1);
  const out: Validation[] = [];
  for (const block of columns) {
    const last = out[out.length - 1];
    if (last && last.range.r1 === block.range.r1 && last.range.r2 === block.range.r2 && last.range.c2 + 1 === block.range.c1 && sameValidation(last, block)) {
      last.range = { ...last.range, c2: block.range.c2 };
    } else out.push(block);
  }
  return out;
}
