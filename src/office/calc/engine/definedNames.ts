import { columnName, type RangePos } from './cellRef';

const NAME_SHAPE = /^[A-Za-z_\\][A-Za-z0-9_.\\]*$/;
const CELL_LIKE = /^\$?[A-Za-z]{1,3}\$?\d{1,7}$/;
const R1C1_LIKE = /^[RrCc](\d*)([Cc]?\d*)$/;

/** Excel's rules for a name: letters, digits, underscores and dots, not starting with a digit, not a cell address, not TRUE or FALSE. */
export function isValidName(name: string): boolean {
  if (name.length === 0 || name.length > 255) return false;
  if (!NAME_SHAPE.test(name) || CELL_LIKE.test(name) || R1C1_LIKE.test(name)) return false;
  return !/^(true|false)$/i.test(name);
}

const PLAIN_SHEET = /^[A-Za-z_][A-Za-z0-9_.]*$/;

/** A range as a fixed address with its sheet, the way a name stores it: 'Data sheet'!$A$1:$B$5. */
export function absoluteAddress(sheet: string, range: RangePos): string {
  const prefix = PLAIN_SHEET.test(sheet) ? sheet : `'${sheet.replace(/'/g, "''")}'`;
  const cell = (row: number, col: number) => `$${columnName(col)}$${row + 1}`;
  const single = range.r1 === range.r2 && range.c1 === range.c2;
  return `${prefix}!${cell(range.r1, range.c1)}${single ? '' : `:${cell(range.r2, range.c2)}`}`;
}
