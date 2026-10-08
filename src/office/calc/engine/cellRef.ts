/** A1-style addresses. Rows and columns are 0-based inside the program. */
export const MAX_ROWS = 1_048_576;
export const MAX_COLS = 16_384;

export function columnName(index: number): string {
  let name = '';
  let n = index;
  while (n >= 0) {
    name = String.fromCharCode(65 + (n % 26)) + name;
    n = Math.floor(n / 26) - 1;
  }
  return name;
}

export function columnIndex(name: string): number {
  let index = 0;
  for (const ch of name.toUpperCase()) index = index * 26 + (ch.charCodeAt(0) - 64);
  return index - 1;
}

export interface CellPos {
  row: number;
  col: number;
}

export interface RangePos {
  r1: number;
  c1: number;
  r2: number;
  c2: number;
}

export const cellName = (row: number, col: number): string => `${columnName(col)}${row + 1}`;

const CELL = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/;

/** "B3" or "$B$3" → position, or null when it is not an address. */
export function parseCell(text: string): CellPos | null {
  const match = CELL.exec(text.trim());
  if (!match) return null;
  const col = columnIndex(match[1]);
  const row = Number(match[2]) - 1;
  if (col < 0 || col >= MAX_COLS || row < 0 || row >= MAX_ROWS) return null;
  return { row, col };
}

/** "A1:C4" (or a single cell) → a normalised range. */
export function parseRange(text: string): RangePos | null {
  const [a, b] = text.split(':');
  const start = parseCell(a);
  const end = b === undefined ? start : parseCell(b);
  if (!start || !end) return null;
  return {
    r1: Math.min(start.row, end.row),
    c1: Math.min(start.col, end.col),
    r2: Math.max(start.row, end.row),
    c2: Math.max(start.col, end.col),
  };
}

export const rangeName = (range: RangePos): string =>
  range.r1 === range.r2 && range.c1 === range.c2
    ? cellName(range.r1, range.c1)
    : `${cellName(range.r1, range.c1)}:${cellName(range.r2, range.c2)}`;

/** Numeric key for a cell in a sheet's map. */
export const cellKey = (row: number, col: number): number => row * MAX_COLS + col;
export const keyRow = (key: number): number => Math.floor(key / MAX_COLS);
export const keyCol = (key: number): number => key % MAX_COLS;
