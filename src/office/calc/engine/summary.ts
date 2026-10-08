import { cellName, columnName, type RangePos } from './cellRef';
import { compareValues, isError, type Scalar } from './values';

/**
 * A PivotTable-style summary of a table, written as ordinary cells: one row
 * per distinct value of a "rows" column, optionally one column per distinct
 * value of a "columns" column, each cell a SUMIFS-family formula over the
 * source. The table is as live as any formulas (change a number and the
 * summary follows) but the list of categories is fixed when it is made.
 */
export type SummaryFn = 'sum' | 'count' | 'average' | 'max' | 'min';
export const SUMMARY_FUNCTIONS: SummaryFn[] = ['sum', 'count', 'average', 'max', 'min'];

export interface SummarySpec {
  /** The sheet the source is on, for the references in the formulas. */
  sheet: string;
  /** The source, header row included. */
  source: RangePos;
  /** Column indices (sheet columns, not offsets) of the categories down the side, across the top (if any) and the numbers. */
  rowColumn: number;
  columnColumn: number | null;
  valueColumn: number;
  fn: SummaryFn;
}

/**
 * What a summary sheet remembers about how it was made, so it can be made
 * again from the data as it is now (refresh). The source is named by its
 * sheet, which a rename must carry along.
 */
export interface SummaryConfig {
  sheet: string;
  source: RangePos;
  rowColumn: number;
  columnColumn: number | null;
  valueColumn: number;
  fn: SummaryFn;
  /** The corner and total labels, in the language the summary was made in. */
  corner: string;
  total: string;
}

export interface SummaryLabels {
  /** The name of the sheet the summary goes on (made unique by the controller). */
  sheetName: string;
  /** What the function is called in the table's corner, such as "Sum of Sales". */
  corner: string;
  total: string;
}

export interface SummaryCell {
  /** Offsets from the summary's top-left cell. */
  row: number;
  col: number;
  raw: string;
  header?: boolean;
}

export interface Summary {
  cells: SummaryCell[];
  rows: number;
  cols: number;
}

export const MAX_SUMMARY_ROWS = 200;
export const MAX_SUMMARY_COLUMNS = 50;

export class SummaryTooLargeError extends Error {
  readonly axis: 'rows' | 'columns';
  readonly count: number;

  constructor(axis: 'rows' | 'columns', count: number) {
    super(`Too many ${axis}: ${count}`);
    this.axis = axis;
    this.count = count;
  }
}

/** The categories of a column, each once, in order, with the text a label cell holds. Blank cells are not a category. */
export function distinctCategories(
  source: RangePos,
  column: number,
  valueAt: (row: number, col: number) => Scalar,
  displayAt: (row: number, col: number) => string,
): Array<{ raw: string; value: Scalar }> {
  const seen = new Map<string, { raw: string; value: Scalar }>();
  for (let r = source.r1 + 1; r <= source.r2; r += 1) {
    const value = valueAt(r, column);
    if (value === null || value === '' || isError(value)) continue;
    const shown = displayAt(r, column);
    const key = typeof value === 'string' ? `s:${value.toLowerCase()}` : `v:${String(value)}`;
    if (seen.has(key)) continue;
    // A label is typed text or a number; text that would read as a formula or a number is stored as text.
    const raw = typeof value === 'number' ? String(value) : typeof value === 'boolean' ? (value ? 'TRUE' : 'FALSE') : /^[=+\-@']/.test(shown) || !Number.isNaN(Number(shown.replace(',', '.'))) ? `'${shown}` : shown;
    seen.set(key, { raw, value });
  }
  return [...seen.values()].sort((a, b) => {
    if (typeof a.value === typeof b.value) return compareValues(a.value, b.value);
    return typeof a.value === 'number' ? -1 : 1;
  });
}

const absolute = (sheet: string, range: RangePos, column: number): string => {
  const col = columnName(column);
  const quoted = `'${sheet.replace(/'/g, "''")}'`;
  return `${quoted}!$${col}$${range.r1 + 2}:$${col}$${range.r2 + 1}`;
};

/** The cells of the summary, to be placed with its top-left cell at `origin`; none of them is evaluated here. */
export function buildSummary(
  spec: SummarySpec,
  origin: { row: number; col: number },
  valueAt: (row: number, col: number) => Scalar,
  displayAt: (row: number, col: number) => string,
  labels: SummaryLabels,
): Summary {
  const { source, fn } = spec;
  const down = distinctCategories(source, spec.rowColumn, valueAt, displayAt);
  const across = spec.columnColumn === null ? [] : distinctCategories(source, spec.columnColumn, valueAt, displayAt);
  if (down.length > MAX_SUMMARY_ROWS) throw new SummaryTooLargeError('rows', down.length);
  if (across.length > MAX_SUMMARY_COLUMNS) throw new SummaryTooLargeError('columns', across.length);

  const values = absolute(spec.sheet, source, spec.valueColumn);
  const rowRange = absolute(spec.sheet, source, spec.rowColumn);
  const colRange = spec.columnColumn === null ? '' : absolute(spec.sheet, source, spec.columnColumn);
  const at = (row: number, col: number) => cellName(origin.row + row, origin.col + col);
  /** A label as a criterion: text is prefixed with "=" so one that starts with an operator (such as "=1+1" or ">5") is matched as itself. */
  const criterion = (label: { value: Scalar }, ref: string) => (typeof label.value === 'string' ? `"="&${ref}` : ref);

  /** The summary of the numbers where every given criterion (range, value pairs) holds. */
  const aggregate = (pairs: string): string => {
    switch (fn) {
      case 'sum':
        return `=SUMIFS(${values},${pairs})`;
      case 'count':
        return `=COUNTIFS(${pairs})`;
      case 'average':
        return `=IFERROR(AVERAGEIFS(${values},${pairs}),"")`;
      case 'max':
        return `=IF(COUNTIFS(${pairs})=0,"",MAXIFS(${values},${pairs}))`;
      default:
        return `=IF(COUNTIFS(${pairs})=0,"",MINIFS(${values},${pairs}))`;
    }
  };
  // Totals cover the rows the table shows: those with a category in every field used.
  const present = `${rowRange},"<>"${spec.columnColumn === null ? '' : `,${colRange},"<>"`}`;

  const cells: SummaryCell[] = [];
  const put = (row: number, col: number, raw: string, header = false) => cells.push({ row, col, raw, header });
  // The last column holds the totals of each row; with no "columns" field it is the only value column.
  const lastCol = across.length + 1;
  const lastRow = down.length + 1;

  if (spec.columnColumn === null) {
    put(0, 0, displayAt(source.r1, spec.rowColumn), true);
    put(0, 1, labels.corner, true);
  } else {
    put(0, 0, labels.corner, true);
    across.forEach((label, j) => put(0, j + 1, label.raw, true));
    put(0, lastCol, labels.total, true);
  }

  down.forEach((label, i) => {
    const row = i + 1;
    const rowPair = `${rowRange},${criterion(label, at(row, 0))}`;
    put(row, 0, label.raw, true);
    across.forEach((head, j) => put(row, j + 1, aggregate(`${rowPair},${colRange},${criterion(head, at(0, j + 1))}`)));
    put(row, spec.columnColumn === null ? 1 : lastCol, aggregate(spec.columnColumn === null ? rowPair : `${rowPair},${colRange},"<>"`));
  });

  put(lastRow, 0, labels.total, true);
  across.forEach((head, j) => put(lastRow, j + 1, aggregate(`${colRange},${criterion(head, at(0, j + 1))},${rowRange},"<>"`)));
  put(lastRow, spec.columnColumn === null ? 1 : lastCol, aggregate(present));

  return { cells, rows: lastRow + 1, cols: (spec.columnColumn === null ? 1 : lastCol) + 1 };
}
