import type { Scalar } from './values';
import { isError, parseNumber } from './values';

/** A column filter by a condition, as Excel's "Text Filters" and "Number Filters". */
export type FilterOp =
  | 'contains'
  | 'notContains'
  | 'beginsWith'
  | 'endsWith'
  | 'equals'
  | 'notEquals'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between';

export interface FilterCondition {
  op: FilterOp;
  a: string;
  /** The upper bound of `between`. */
  b?: string;
}

export const TEXT_OPS: FilterOp[] = ['contains', 'notContains', 'beginsWith', 'endsWith', 'equals', 'notEquals'];
export const NUMBER_OPS: FilterOp[] = ['gt', 'gte', 'lt', 'lte', 'between'];

const isNumberOp = (op: FilterOp) => NUMBER_OPS.includes(op);

/** The number a filter box holds, accepting a decimal comma; null for anything else. */
function numberOf(text: string): number | null {
  return parseNumber(text.trim().replace(',', '.'));
}

/** True when a cell with this value and shown text passes the condition. A condition with no usable operand lets everything through. */
export function matchesCondition(condition: FilterCondition, value: Scalar, shown: string): boolean {
  if (isNumberOp(condition.op)) {
    const a = numberOf(condition.a);
    const b = condition.op === 'between' ? numberOf(condition.b ?? '') : null;
    if (a === null || (condition.op === 'between' && b === null)) return true;
    if (typeof value !== 'number' || isError(value)) return false;
    switch (condition.op) {
      case 'gt':
        return value > a;
      case 'gte':
        return value >= a;
      case 'lt':
        return value < a;
      case 'lte':
        return value <= a;
      default:
        return value >= Math.min(a, b as number) && value <= Math.max(a, b as number);
    }
  }
  if (condition.a === '') return true;
  const text = shown.toLocaleLowerCase();
  const needle = condition.a.toLocaleLowerCase();
  switch (condition.op) {
    case 'contains':
      return text.includes(needle);
    case 'notContains':
      return !text.includes(needle);
    case 'beginsWith':
      return text.startsWith(needle);
    case 'endsWith':
      return text.endsWith(needle);
    case 'equals':
      return text === needle;
    default:
      return text !== needle;
  }
}
