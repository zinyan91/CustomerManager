import type { RangePos } from './cellRef';
import { isError, type Scalar } from './values';

/**
 * Charts read a range: if its first row is text above numbers that row names
 * the series, and if its first column is text beside numbers that column
 * names the categories; the rest are series, one per column.
 */
export type ChartType = 'column' | 'bar' | 'line' | 'pie';

export interface ChartObject {
  id: string;
  type: ChartType;
  range: RangePos;
  title: string;
  /** The cell the chart's top-left corner is in, and how far into that cell, in pixels at 100%. */
  row: number;
  col: number;
  dx: number;
  dy: number;
  width: number;
  height: number;
}

export interface ChartSeries {
  name: string;
  values: Array<number | null>;
}

export interface ChartData {
  categories: string[];
  series: ChartSeries[];
}

export const CHART_MIN_WIDTH = 160;
export const CHART_MIN_HEIGHT = 120;

const isText = (v: Scalar) => typeof v === 'string' && v !== '';
const isNumber = (v: Scalar) => typeof v === 'number';

/** How a chart reads its range: whether there is a header row and a category column, and which columns are series. */
export interface ChartLayout {
  headerRow: boolean;
  categoryColumn: boolean;
  /** Offset of the first data row from the range's first row (0 or 1). */
  first: number;
  /** Offsets from the range's first column of the columns that become series. */
  seriesColumns: number[];
}

export function chartLayout(range: RangePos, valueAt: (row: number, col: number) => Scalar): ChartLayout {
  const rows = range.r2 - range.r1 + 1;
  const cols = range.c2 - range.c1 + 1;
  const at = (r: number, c: number) => valueAt(range.r1 + r, range.c1 + c);

  const rowHasNumbers = (r: number, from: number) => {
    for (let c = from; c < cols; c += 1) if (isNumber(at(r, c))) return true;
    return false;
  };
  const colHasNumbers = (c: number, from: number) => {
    for (let r = from; r < rows; r += 1) if (isNumber(at(r, c))) return true;
    return false;
  };

  // A header row: every cell of the first row is text or empty, and numbers follow below.
  let headerRow = rows > 1;
  for (let c = 0; c < cols; c += 1) if (isNumber(at(0, c)) || isError(at(0, c))) headerRow = false;
  if (headerRow && !(Array.from({ length: cols }, (_, c) => colHasNumbers(c, 1)).some(Boolean))) headerRow = false;

  // A category column: text in the first column beside numbers elsewhere.
  const first = headerRow ? 1 : 0;
  let categoryColumn = cols > 1;
  for (let r = first; r < rows; r += 1) if (isNumber(at(r, 0))) categoryColumn = false;
  if (categoryColumn && !Array.from({ length: rows - first }, (_, i) => rowHasNumbers(first + i, 1)).some(Boolean)) categoryColumn = false;
  if (categoryColumn && !Array.from({ length: rows - first }, (_, i) => isText(at(first + i, 0))).some(Boolean)) categoryColumn = false;

  const seriesColumns: number[] = [];
  for (let c = categoryColumn ? 1 : 0; c < cols; c += 1) if (colHasNumbers(c, first)) seriesColumns.push(c);
  return { headerRow, categoryColumn, first, seriesColumns };
}

export function readChartData(
  range: RangePos,
  valueAt: (row: number, col: number) => Scalar,
  display: (row: number, col: number) => string,
): ChartData {
  const rows = range.r2 - range.r1 + 1;
  const { headerRow, categoryColumn, first, seriesColumns } = chartLayout(range, valueAt);
  const at = (r: number, c: number) => valueAt(range.r1 + r, range.c1 + c);

  const categories: string[] = [];
  for (let r = first; r < rows; r += 1) categories.push(categoryColumn ? display(range.r1 + r, range.c1) : String(r - first + 1));

  const series: ChartSeries[] = [];
  for (const c of seriesColumns) {
    const values: Array<number | null> = [];
    for (let r = first; r < rows; r += 1) {
      const v = at(r, c);
      values.push(typeof v === 'number' ? v : null);
    }
    const name = headerRow ? display(range.r1, range.c1 + c) : '';
    series.push({ name: name || `Series ${series.length + 1}`, values });
  }
  return { categories, series };
}

export interface Scale {
  min: number;
  max: number;
  step: number;
  ticks: number[];
}

/** Axis limits and tick values that fall on round numbers and include 0 for bars. */
export function niceScale(min: number, max: number, approxTicks = 5, includeZero = true): Scale {
  let lo = includeZero ? Math.min(0, min) : min;
  let hi = includeZero ? Math.max(0, max) : max;
  if (lo === hi) {
    hi = lo + 1;
  }
  const rough = (hi - lo) / Math.max(1, approxTicks);
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normal = rough / magnitude;
  const step = (normal <= 1 ? 1 : normal <= 2 ? 2 : normal <= 5 ? 5 : 10) * magnitude;
  lo = Math.floor(lo / step) * step;
  hi = Math.ceil(hi / step) * step;
  const ticks: number[] = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Number(v.toPrecision(12)));
  return { min: lo, max: hi, step, ticks };
}

/** 1500000 → "1.5M", 2500 → "2.5K"; small numbers as they are. */
export function formatTick(value: number): string {
  const abs = Math.abs(value);
  const short = (n: number, suffix: string) => `${Number(n.toPrecision(3))}${suffix}`;
  if (abs >= 1e9) return short(value / 1e9, 'B');
  if (abs >= 1e6) return short(value / 1e6, 'M');
  if (abs >= 1e4) return short(value / 1e3, 'K');
  return String(Number(value.toPrecision(6)));
}

/** The range a chart should read when the user's selection is a single cell: the block of data around it. */
export function currentRegion(
  row: number,
  col: number,
  filled: (row: number, col: number) => boolean,
  limit = 2000,
): RangePos {
  let r1 = row;
  let r2 = row;
  let c1 = col;
  let c2 = col;
  for (let changed = true; changed; ) {
    changed = false;
    const rowFilled = (r: number) => {
      for (let c = c1 - 1; c <= c2 + 1; c += 1) if (c >= 0 && filled(r, c)) return true;
      return false;
    };
    const colFilled = (c: number) => {
      for (let r = r1 - 1; r <= r2 + 1; r += 1) if (r >= 0 && filled(r, c)) return true;
      return false;
    };
    if (r1 > 0 && r2 - r1 < limit && rowFilled(r1 - 1)) {
      r1 -= 1;
      changed = true;
    }
    if (r2 - r1 < limit && rowFilled(r2 + 1)) {
      r2 += 1;
      changed = true;
    }
    if (c1 > 0 && c2 - c1 < limit && colFilled(c1 - 1)) {
      c1 -= 1;
      changed = true;
    }
    if (c2 - c1 < limit && colFilled(c2 + 1)) {
      c2 += 1;
      changed = true;
    }
  }
  return { r1, c1, r2, c2 };
}
