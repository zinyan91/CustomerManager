import type { SummaryConfig } from '../engine/summary';
import type { Validation } from '../engine/validation';
import { adjustFormula, type Edit } from '../engine/adjust';
import type { ChartObject } from '../engine/chartData';
import { computeStats, evaluateRules, shiftRange, type CfResult, type CfRule, type CfStats } from '../engine/conditional';
import { cellKey, keyCol, keyRow, MAX_COLS, MAX_ROWS, type RangePos } from '../engine/cellRef';
import { ELEMENTWISE, evaluateFormulaValue, type EvalContext } from '../engine/evaluate';
import { matchesCondition, type FilterCondition } from '../engine/filterCondition';
import { formatValue } from '../engine/numberFormat';
import { parseFormula, type Node } from '../engine/parser';
import { ERRORS, isRange, parseNumber, type RangeValue, type Scalar } from '../engine/values';

export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

export interface Borders {
  top?: boolean;
  right?: boolean;
  bottom?: boolean;
  left?: boolean;
}

export interface CellStyle {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  fill?: string;
  hAlign?: HAlign;
  vAlign?: VAlign;
  wrap?: boolean;
  numFmt?: string;
  borders?: Borders;
}

export interface Cell {
  /** What was typed: text, a number, or a formula starting with "=". */
  raw: string;
  /** Index into the workbook's style table; 0 is the default. */
  style: number;
}

/** A picture floating over the grid, placed like a chart: in a cell, and how far into it, at 100%. */
export interface ImageObject {
  id: string;
  /** A PNG, JPEG or GIF data URL. */
  src: string;
  alt: string;
  row: number;
  col: number;
  dx: number;
  dy: number;
  width: number;
  height: number;
}

/**
 * An AutoFilter: its first row holds the headers and the rows below are the
 * records. A record is hidden when, in any column, its shown text is one of
 * that column's `excluded` values.
 */
export interface FilterState {
  range: RangePos;
  excluded: Record<number, string[]>;
  /** A condition per column (contains, greater than...), alongside the checklist. */
  conditions?: Record<number, FilterCondition>;
}

export type PaperSize = 'A3' | 'A4' | 'A5' | 'Letter' | 'Legal';

/** Lề giấy tính bằng milimét. */
export interface PageMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export const MARGIN_PRESETS = {
  normal: { top: 19, right: 18, bottom: 19, left: 18 },
  wide: { top: 25.4, right: 25.4, bottom: 25.4, left: 25.4 },
  narrow: { top: 19, right: 6.4, bottom: 19, left: 6.4 },
} as const satisfies Record<string, PageMargins>;

/** Cách in một trang tính. */
export interface PageSetup {
  orientation: 'portrait' | 'landscape';
  paper: PaperSize;
  margins: PageMargins;
  /** Phần trăm, 10 đến 400. */
  scale: number;
  /** Chỉ in vùng này; vắng thì in toàn bộ vùng đã dùng. */
  printArea?: RangePos;
  /** In đường kẻ ô và tiêu đề hàng cột. */
  gridlines: boolean;
  headings: boolean;
}

export const DEFAULT_PAGE_SETUP: PageSetup = {
  orientation: 'portrait',
  paper: 'A4',
  margins: { ...MARGIN_PRESETS.normal },
  scale: 100,
  gridlines: false,
  headings: false,
};

/** Ghi chú gắn vào một ô. */
export interface CellComment {
  text: string;
  author: string;
  at: number;
}

export interface Sheet {
  name: string;
  cells: Map<number, Cell>;
  /** Pixel widths of columns that are not the default. */
  colWidths: Map<number, number>;
  /** Pixel heights of rows that are not the default. */
  rowHeights: Map<number, number>;
  merges: RangePos[];
  /** Conditional formatting rules, first rule first. */
  cf: CfRule[];
  charts: ChartObject[];
  /** Absent in sheets built before pictures existed. */
  images?: ImageObject[];
  filter?: FilterState;
  /** Rows and columns kept in view while the rest scrolls; absent or 0 for none. */
  freeze?: { rows: number; cols: number };
  /** Set on a sheet made by Insert ▸ Summarise data: how to make it again. */
  summary?: SummaryConfig;
  /** What may be typed into blocks of cells; the last rule that holds a cell wins. */
  validations?: Validation[];
  /** Cách in; vắng thì dùng mặc định. */
  pageSetup?: PageSetup;
  /** Ghi chú theo ô (khóa như `cells`). */
  comments?: Map<number, CellComment>;
  /** Trang tính đang được bảo vệ: không sửa được ô, định dạng hay cấu trúc. */
  protected?: boolean;
}

export const pageSetupOf = (sheet: Pick<Sheet, 'pageSetup'>): PageSetup => ({
  ...DEFAULT_PAGE_SETUP,
  ...sheet.pageSetup,
  margins: { ...DEFAULT_PAGE_SETUP.margins, ...sheet.pageSetup?.margins },
});

const NO_ROWS: ReadonlySet<number> = new Set();

export const DEFAULT_COL_WIDTH = 100;
export const ROW_HEIGHT = 24;

export const rowHeightOf = (sheet: Pick<Sheet, 'rowHeights'>, row: number): number => sheet.rowHeights.get(row) ?? ROW_HEIGHT;

/** Plain JSON for the whole workbook: undo snapshots and drafts. */
export interface WorkbookData {
  styles: CellStyle[];
  sheets: Array<{
    name: string;
    cells: Array<[number, string, number]>;
    colWidths: Array<[number, number]>;
    /** Absent in drafts saved before row heights could be set. */
    rowHeights?: Array<[number, number]>;
    merges: RangePos[];
    /** Absent in drafts saved before conditional formatting existed. */
    cf?: CfRule[];
    charts?: ChartObject[];
    images?: ImageObject[];
    filter?: FilterState;
    freeze?: { rows: number; cols: number };
    summary?: SummaryConfig;
    validations?: Validation[];
    pageSetup?: PageSetup;
    comments?: Array<[number, CellComment]>;
    protected?: boolean;
  }>;
}

const styleKey = (style: CellStyle): string => {
  const entries = Object.entries(style)
    .filter(([, v]) => v !== undefined && v !== false && v !== '')
    .map(([k, v]) => [k, k === 'borders' ? Object.fromEntries(Object.entries(v as object).filter(([, b]) => b)) : v] as const)
    .filter(([k, v]) => k !== 'borders' || Object.keys(v as object).length > 0)
    .sort(([a], [b]) => (a < b ? -1 : 1));
  return JSON.stringify(entries);
};

/** The style with empty parts removed, so equal styles compare equal. */
export function cleanStyle(style: CellStyle): CellStyle {
  return Object.fromEntries(JSON.parse(styleKey(style))) as CellStyle;
}

export function newSheet(name: string): Sheet {
  return { name, cells: new Map(), colWidths: new Map(), rowHeights: new Map(), merges: [], cf: [], charts: [] };
}

/** The value a typed constant means: a number, TRUE/FALSE, or text ("'" forces text). */
export function constantValue(raw: string): Scalar {
  if (raw === '') return null;
  if (raw.startsWith("'")) return raw.slice(1);
  const n = parseNumber(raw);
  if (n !== null && !/%$/.test(raw.trim())) return n;
  const upper = raw.toUpperCase();
  if (upper === 'TRUE') return true;
  if (upper === 'FALSE') return false;
  return raw;
}

/** Functions that make a block of cells whatever they are given. */
const BLOCK_FUNCTIONS = new Set(['UNIQUE', 'SORT', 'SORTBY', 'FILTER', 'SEQUENCE', 'TRANSPOSE', 'OFFSET', 'INDIRECT', 'XLOOKUP']);
/** Functions that hand a block on from the branch they pick. */
const PASS_THROUGH = new Set(['IF', 'IFS', 'IFERROR', 'IFNA', 'CHOOSE', 'SWITCH']);

function producesBlock(node: Node): boolean {
  switch (node.t) {
    case 'range':
      return true;
    case 'call':
      return BLOCK_FUNCTIONS.has(node.name) || ((PASS_THROUGH.has(node.name) || ELEMENTWISE.has(node.name)) && node.args.some(producesBlock));
    case 'bin':
      return producesBlock(node.l) || producesBlock(node.r);
    case 'un':
    case 'pct':
      return producesBlock(node.e);
    default:
      return false;
  }
}

const blockShape = new Map<string, boolean>();

/** Whether a formula's shape can make a block of cells; only those spill. A formula that only sums a range does not. */
export function mayReturnBlock(raw: string): boolean {
  if (!raw.startsWith('=') || raw.length < 2) return false;
  const known = blockShape.get(raw);
  if (known !== undefined) return known;
  let result = false;
  try {
    result = producesBlock(parseFormula(raw));
  } catch {
    result = false;
  }
  if (blockShape.size > 5000) blockShape.clear();
  blockShape.set(raw, result);
  return result;
}

export class Workbook {
  sheets: Sheet[] = [newSheet('Sheet1')];
  private styles: CellStyle[] = [{}];
  private styleIds = new Map<string, number>([['[]', 0]]);
  private cache = new Map<string, Scalar>();
  private cfCache = new Map<string, CfStats>();
  private hiddenCache = new Map<number, { version: number; rows: Set<number> }>();
  private evaluating = new Set<string>();
  /** Formulas whose result is a block of cells, with the block, while the cache is valid. */
  private spills = new Map<string, { row: number; col: number; range: RangeValue }>();
  private candidateCache = new Map<number, { version: number; keys: number[] }>();
  /** Bumped on every change so views know to repaint. */
  version = 0;
  /** Fixed during a test for TODAY/NOW. */
  now: () => Date = () => new Date();

  // ----- Styles

  styleOf(id: number): CellStyle {
    return this.styles[id] ?? this.styles[0];
  }

  /** The id of a style, adding it to the table if new. */
  styleId(style: CellStyle): number {
    const key = styleKey(style);
    const known = this.styleIds.get(key);
    if (known !== undefined) return known;
    const id = this.styles.length;
    this.styles.push(cleanStyle(style));
    this.styleIds.set(key, id);
    return id;
  }

  // ----- Cells

  sheetIndex(name: string): number {
    return this.sheets.findIndex((s) => s.name.toLowerCase() === name.toLowerCase());
  }

  getCell(sheet: number, row: number, col: number): Cell | undefined {
    return this.sheets[sheet]?.cells.get(cellKey(row, col));
  }

  /** Puts a cell, or removes it when it is empty and unstyled. */
  putCell(sheet: number, row: number, col: number, cell: Cell | undefined): void {
    const cells = this.sheets[sheet].cells;
    const key = cellKey(row, col);
    if (!cell || (cell.raw === '' && cell.style === 0)) cells.delete(key);
    else cells.set(key, cell);
    this.touch();
  }

  touch(): void {
    this.version += 1;
    this.cache.clear();
    this.spills.clear();
    this.cfCache.clear();
  }

  /** The rows the sheet's filter hides; empty when it has none or nothing is excluded. */
  hiddenRows(sheetIndex: number): ReadonlySet<number> {
    const filter = this.sheets[sheetIndex]?.filter;
    const columns = filter ? Object.entries(filter.excluded).filter(([, values]) => values.length > 0) : [];
    const conditions = filter ? Object.entries(filter.conditions ?? {}) : [];
    if (!filter || (columns.length === 0 && conditions.length === 0)) return NO_ROWS;
    const cached = this.hiddenCache.get(sheetIndex);
    if (cached && cached.version === this.version) return cached.rows;
    const rows = new Set<number>();
    for (let r = filter.range.r1 + 1; r <= filter.range.r2; r += 1) {
      if (
        columns.some(([col, values]) => values.includes(this.displayAt(sheetIndex, r, Number(col)))) ||
        conditions.some(([col, condition]) => !matchesCondition(condition, this.valueAt(sheetIndex, r, Number(col)), this.displayAt(sheetIndex, r, Number(col))))
      ) {
        rows.add(r);
      }
    }
    this.hiddenCache.set(sheetIndex, { version: this.version, rows });
    return rows;
  }

  /** Smallest range holding every cell with something in it, or null for an empty sheet. */
  usedRange(sheet: number): RangePos | null {
    let range: RangePos | null = null;
    for (const key of this.sheets[sheet].cells.keys()) {
      const row = keyRow(key);
      const col = keyCol(key);
      range = range
        ? { r1: Math.min(range.r1, row), c1: Math.min(range.c1, col), r2: Math.max(range.r2, row), c2: Math.max(range.c2, col) }
        : { r1: row, c1: col, r2: row, c2: col };
    }
    // A block a formula spills over belongs to the sheet's data as well.
    for (const spill of this.spillRegions(sheet)) {
      const end = { r2: spill.row + spill.range.rows - 1, c2: spill.col + spill.range.cols - 1 };
      range = range
        ? { r1: Math.min(range.r1, spill.row), c1: Math.min(range.c1, spill.col), r2: Math.max(range.r2, end.r2), c2: Math.max(range.c2, end.c2) }
        : { r1: spill.row, c1: spill.col, ...end };
    }
    return range;
  }

  // ----- Values

  private context(sheetName: string, row: number, col: number): EvalContext {
    return {
      sheet: sheetName,
      row,
      col,
      now: this.now,
      sheetExists: (name) => this.sheetIndex(name) >= 0,
      valueAt: (name, r, c) => this.valueAt(this.sheetIndex(name), r, c),
    };
  }

  /** Formulas that may return a block of cells: the ones that use a function which can. */
  private spillCandidates(sheet: number): number[] {
    const cached = this.candidateCache.get(sheet);
    if (cached && cached.version === this.version) return cached.keys;
    const keys: number[] = [];
    for (const [key, cell] of this.sheets[sheet]?.cells ?? []) if (mayReturnBlock(cell.raw)) keys.push(key);
    keys.sort((a, b) => a - b);
    this.candidateCache.set(sheet, { version: this.version, keys });
    return keys;
  }

  /** Whether a block of `range`'s size, spilling from a cell, has room: on the sheet, and over empty cells only. */
  private spillBlocked(sheet: number, row: number, col: number, range: RangeValue): boolean {
    if (row + range.rows > MAX_ROWS || col + range.cols > MAX_COLS) return true;
    for (let r = 0; r < range.rows; r += 1)
      for (let c = 0; c < range.cols; c += 1) {
        if (r === 0 && c === 0) continue;
        if ((this.getCell(sheet, row + r, col + c)?.raw ?? '') !== '') return true;
      }
    return false;
  }

  /** The value an empty cell takes from a formula spilling over it, with the style of that formula's cell. */
  spillCellAt(sheet: number, row: number, col: number): { value: Scalar; style: number; origin: { row: number; col: number } } | null {
    if ((this.getCell(sheet, row, col)?.raw ?? '') !== '') return null;
    for (const key of this.spillCandidates(sheet)) {
      const originRow = keyRow(key);
      const originCol = keyCol(key);
      if (originRow > row || originCol > col || (originRow === row && originCol === col)) continue;
      const id = `${sheet}:${key}`;
      if (this.evaluating.has(id)) continue;
      this.valueAt(sheet, originRow, originCol);
      const spill = this.spills.get(id);
      if (spill && row < originRow + spill.range.rows && col < originCol + spill.range.cols) {
        return { value: spill.range.values[row - originRow][col - originCol], style: this.getCell(sheet, originRow, originCol)?.style ?? 0, origin: { row: originRow, col: originCol } };
      }
    }
    return null;
  }

  /** Every block of cells a formula on the sheet spills over now, for saving them as values. */
  spillRegions(sheet: number): Array<{ row: number; col: number; range: RangeValue; style: number }> {
    const out: Array<{ row: number; col: number; range: RangeValue; style: number }> = [];
    for (const key of this.spillCandidates(sheet)) {
      this.valueAt(sheet, keyRow(key), keyCol(key));
      const spill = this.spills.get(`${sheet}:${key}`);
      if (spill) out.push({ ...spill, style: this.getCell(sheet, spill.row, spill.col)?.style ?? 0 });
    }
    return out;
  }

  /** What a cell holds once its formula is worked out. */
  valueAt(sheet: number, row: number, col: number): Scalar {
    const cell = this.getCell(sheet, row, col);
    if (!cell || cell.raw === '') return this.spillCellAt(sheet, row, col)?.value ?? null;
    if (!cell.raw.startsWith('=') || cell.raw.length < 2) return constantValue(cell.raw);
    const key = `${sheet}:${cellKey(row, col)}`;
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    if (this.evaluating.has(key)) return ERRORS.circular;
    this.evaluating.add(key);
    try {
      const full = evaluateFormulaValue(cell.raw, this.context(this.sheets[sheet].name, row, col));
      let value: Scalar;
      if (!isRange(full)) value = full;
      else if (full.rows * full.cols > 1 && mayReturnBlock(cell.raw)) {
        if (this.spillBlocked(sheet, row, col, full)) value = ERRORS.spill;
        else {
          this.spills.set(key, { row, col, range: full });
          value = full.values[0][0];
        }
      } else value = full.values[0]?.[0] ?? null;
      this.cache.set(key, value);
      return value;
    } finally {
      this.evaluating.delete(key);
    }
  }

  /** The text the grid shows for a cell. */
  displayAt(sheet: number, row: number, col: number): string {
    const cell = this.getCell(sheet, row, col);
    if (!cell || cell.raw === '') {
      const spilled = this.spillCellAt(sheet, row, col);
      if (spilled) return formatValue(spilled.value, this.styleOf(spilled.style).numFmt);
      if (!cell) return '';
    }
    return formatValue(this.valueAt(sheet, row, col), this.styleOf(cell!.style).numFmt);
  }

  // ----- Conditional formatting

  /** What the rules do to a cell, or null when none applies. */
  cfAt(sheet: number, row: number, col: number): CfResult | null {
    const rules = this.sheets[sheet]?.cf;
    if (!rules || rules.length === 0) return null;
    return evaluateRules(rules, row, col, this.valueAt(sheet, row, col), (rule) => {
      const key = `${sheet}:${rule.id}`;
      let stats = this.cfCache.get(key);
      if (!stats) {
        stats = computeStats(rule, (r, c) => this.valueAt(sheet, r, c));
        this.cfCache.set(key, stats);
      }
      return stats;
    });
  }

  // ----- Structure

  /** Insert or delete rows or columns, moving cells and keeping formulas pointing at the same data. */
  editStructure(sheetIndex: number, edit: Edit): void {
    const sheet = this.sheets[sheetIndex];
    const axisOf = (key: number) => (edit.axis === 'row' ? keyRow(key) : keyCol(key));
    const moved = new Map<number, Cell>();
    for (const [key, cell] of sheet.cells) {
      const at = axisOf(key);
      let next = at;
      if (edit.mode === 'insert') {
        if (at >= edit.at) next = at + edit.count;
      } else if (at >= edit.at && at < edit.at + edit.count) continue;
      else if (at >= edit.at + edit.count) next = at - edit.count;
      const row = edit.axis === 'row' ? next : keyRow(key);
      const col = edit.axis === 'col' ? next : keyCol(key);
      moved.set(cellKey(row, col), cell);
    }
    sheet.cells = moved;
    if (sheet.comments?.size) {
      const movedComments = new Map<number, CellComment>();
      for (const [key, comment] of sheet.comments) {
        const at = axisOf(key);
        let next = at;
        if (edit.mode === 'insert') {
          if (at >= edit.at) next = at + edit.count;
        } else if (at >= edit.at && at < edit.at + edit.count) continue;
        else if (at >= edit.at + edit.count) next = at - edit.count;
        movedComments.set(cellKey(edit.axis === 'row' ? next : keyRow(key), edit.axis === 'col' ? next : keyCol(key)), comment);
      }
      sheet.comments = movedComments;
    }

    if (edit.axis === 'col') {
      const widths = new Map<number, number>();
      for (const [col, width] of sheet.colWidths) {
        if (edit.mode === 'insert') widths.set(col >= edit.at ? col + edit.count : col, width);
        else if (col < edit.at) widths.set(col, width);
        else if (col >= edit.at + edit.count) widths.set(col - edit.count, width);
      }
      sheet.colWidths = widths;
    } else {
      const heights = new Map<number, number>();
      for (const [row, height] of sheet.rowHeights) {
        if (edit.mode === 'insert') heights.set(row >= edit.at ? row + edit.count : row, height);
        else if (row < edit.at) heights.set(row, height);
        else if (row >= edit.at + edit.count) heights.set(row - edit.count, height);
      }
      sheet.rowHeights = heights;
    }

    sheet.merges = sheet.merges.flatMap((m) => {
      const lo = edit.axis === 'row' ? m.r1 : m.c1;
      const hi = edit.axis === 'row' ? m.r2 : m.c2;
      let nlo = lo;
      let nhi = hi;
      if (edit.mode === 'insert') {
        if (lo >= edit.at) nlo += edit.count;
        if (hi >= edit.at) nhi += edit.count;
      } else {
        const end = edit.at + edit.count;
        nlo = lo >= edit.at && lo < end ? edit.at : lo >= end ? lo - edit.count : lo;
        nhi = hi >= edit.at && hi < end ? edit.at - 1 : hi >= end ? hi - edit.count : hi;
        if (nhi < nlo) return [];
      }
      const next = edit.axis === 'row' ? { ...m, r1: nlo, r2: nhi } : { ...m, c1: nlo, c2: nhi };
      return next.r1 === next.r2 && next.c1 === next.c2 ? [] : [next];
    });

    sheet.cf = sheet.cf.flatMap((rule) => {
      const range = shiftRange(rule.range, edit.axis, edit.at, edit.count, edit.mode);
      return range ? [{ ...rule, range }] : [];
    });

    if (sheet.validations) {
      sheet.validations = sheet.validations.flatMap((validation) => {
        const range = shiftRange(validation.range, edit.axis, edit.at, edit.count, edit.mode);
        return range ? [{ ...validation, range }] : [];
      });
      if (sheet.validations.length === 0) delete sheet.validations;
    }

    sheet.charts = sheet.charts.flatMap((chart) => {
      const range = shiftRange(chart.range, edit.axis, edit.at, edit.count, edit.mode);
      if (!range) return [];
      const place = (value: number) =>
        edit.mode === 'insert'
          ? value >= edit.at
            ? value + edit.count
            : value
          : value >= edit.at + edit.count
            ? value - edit.count
            : value >= edit.at
              ? edit.at
              : value;
      return [edit.axis === 'row' ? { ...chart, range, row: place(chart.row) } : { ...chart, range, col: place(chart.col) }];
    });

    sheet.images = (sheet.images ?? []).map((image) => {
      const value = edit.axis === 'row' ? image.row : image.col;
      const moved =
        edit.mode === 'insert' ? (value >= edit.at ? value + edit.count : value) : value >= edit.at + edit.count ? value - edit.count : value >= edit.at ? edit.at : value;
      return edit.axis === 'row' ? { ...image, row: moved } : { ...image, col: moved };
    });

    if (sheet.filter) {
      const range = shiftRange(sheet.filter.range, edit.axis, edit.at, edit.count, edit.mode);
      if (!range) delete sheet.filter;
      else {
        const moveColumn = (col: number): number | null => {
          if (edit.axis !== 'col') return col;
          if (edit.mode === 'insert') return col >= edit.at ? col + edit.count : col;
          if (col >= edit.at && col < edit.at + edit.count) return null;
          return col >= edit.at + edit.count ? col - edit.count : col;
        };
        const excluded: Record<number, string[]> = {};
        for (const [col, values] of Object.entries(sheet.filter.excluded)) {
          const at = moveColumn(Number(col));
          if (at !== null) excluded[at] = values;
        }
        const conditions: Record<number, FilterCondition> = {};
        for (const [col, condition] of Object.entries(sheet.filter.conditions ?? {})) {
          const at = moveColumn(Number(col));
          if (at !== null) conditions[at] = condition;
        }
        sheet.filter = { range, excluded, ...(Object.keys(conditions).length ? { conditions } : {}) };
      }
    }

    // Formulas anywhere that point into this sheet follow the move.
    for (const other of this.sheets) {
      for (const [key, cell] of other.cells) {
        if (!cell.raw.startsWith('=')) continue;
        const adjusted = adjustFormula(cell.raw, other.name, sheet.name, edit);
        if (adjusted !== cell.raw) other.cells.set(key, { ...cell, raw: adjusted });
      }
    }
    this.touch();
  }

  // ----- Snapshots (undo, drafts)

  toData(): WorkbookData {
    return {
      styles: this.styles.map((s) => ({ ...s, borders: s.borders ? { ...s.borders } : undefined })),
      sheets: this.sheets.map((sheet) => ({
        name: sheet.name,
        cells: [...sheet.cells].map(([key, cell]) => [key, cell.raw, cell.style]),
        colWidths: [...sheet.colWidths],
        ...(sheet.rowHeights.size ? { rowHeights: [...sheet.rowHeights] } : {}),
        merges: sheet.merges.map((m) => ({ ...m })),
        cf: structuredClone(sheet.cf),
        charts: structuredClone(sheet.charts),
        // Copied one level deep: the data URLs are shared, not duplicated into every undo snapshot.
        ...(sheet.images?.length ? { images: sheet.images.map((image) => ({ ...image })) } : {}),
        ...(sheet.filter ? { filter: structuredClone(sheet.filter) } : {}),
        ...(sheet.freeze && (sheet.freeze.rows > 0 || sheet.freeze.cols > 0) ? { freeze: { ...sheet.freeze } } : {}),
        ...(sheet.summary ? { summary: structuredClone(sheet.summary) } : {}),
        ...(sheet.validations?.length ? { validations: structuredClone(sheet.validations) } : {}),
        ...(sheet.pageSetup ? { pageSetup: structuredClone(sheet.pageSetup) } : {}),
        ...(sheet.comments?.size ? { comments: [...sheet.comments].map(([key, comment]) => [key, { ...comment }] as [number, CellComment]) } : {}),
        ...(sheet.protected ? { protected: true } : {}),
      })),
    };
  }

  loadData(data: WorkbookData): void {
    this.styles = data.styles.length ? data.styles.map((s) => ({ ...s })) : [{}];
    this.styleIds = new Map(this.styles.map((s, i) => [styleKey(s), i]));
    this.sheets = data.sheets.length
      ? data.sheets.map((sheet) => ({
          name: sheet.name,
          cells: new Map(sheet.cells.map(([key, raw, style]) => [key, { raw, style }])),
          colWidths: new Map(sheet.colWidths),
          rowHeights: new Map(sheet.rowHeights ?? []),
          merges: sheet.merges.map((m) => ({ ...m })),
          cf: sheet.cf ? structuredClone(sheet.cf) : [],
          charts: sheet.charts ? structuredClone(sheet.charts) : [],
          ...(sheet.images?.length ? { images: sheet.images.map((image) => ({ ...image })) } : {}),
          ...(sheet.filter ? { filter: structuredClone(sheet.filter) } : {}),
          ...(sheet.freeze ? { freeze: { rows: Math.max(0, Math.floor(sheet.freeze.rows) || 0), cols: Math.max(0, Math.floor(sheet.freeze.cols) || 0) } } : {}),
          ...(sheet.summary ? { summary: structuredClone(sheet.summary) } : {}),
          ...(sheet.validations?.length ? { validations: structuredClone(sheet.validations) } : {}),
          ...(sheet.pageSetup ? { pageSetup: structuredClone(sheet.pageSetup) } : {}),
          ...(sheet.comments?.length ? { comments: new Map(sheet.comments.map(([key, comment]) => [key, { ...comment }])) } : {}),
          ...(sheet.protected ? { protected: true } : {}),
        }))
      : [newSheet('Sheet1')];
    this.touch();
  }
}
