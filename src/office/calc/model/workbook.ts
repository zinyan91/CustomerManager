import type { SummaryConfig } from '../engine/summary';
import type { Validation } from '../engine/validation';
import { adjustFormula, type Edit } from '../engine/adjust';
import type { ChartObject } from '../engine/chartData';
import { computeStats, evaluateRules, shiftRange, type CfResult, type CfRule, type CfStats } from '../engine/conditional';
import { isValidName } from '../engine/definedNames';
import { cellKey, keyCol, keyRow, MAX_COLS, MAX_ROWS, type RangePos } from '../engine/cellRef';
import { ELEMENTWISE, evaluateFormulaValue, type EvalContext } from '../engine/evaluate';
import { matchesCondition, type FilterCondition } from '../engine/filterCondition';
import { formatValue, hasZeroSection } from '../engine/numberFormat';
import { parseFormula, type Node } from '../engine/parser';
import { ERRORS, isRange, parseNumber, type RangeValue, type Scalar } from '../engine/values';

export type HAlign = 'left' | 'center' | 'right';
export type VAlign = 'top' | 'middle' | 'bottom';

export type BorderLineStyle = 'hair' | 'thin' | 'dotted' | 'dashed' | 'medium' | 'thick' | 'double';

/** One edge of a cell: `true` is a thin line in the ink colour, a line says more (a thick or double one, in a colour). */
export interface BorderLine {
  style: BorderLineStyle;
  color?: string;
}

export interface Borders {
  top?: boolean | BorderLine;
  right?: boolean | BorderLine;
  bottom?: boolean | BorderLine;
  left?: boolean | BorderLine;
  /** The diagonals across the cell: from bottom-left to top-right, and from top-left to bottom-right. */
  diagonalUp?: boolean | BorderLine;
  diagonalDown?: boolean | BorderLine;
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
  /** Text is made smaller until it fits the cell width (Excel's Shrink to fit). */
  shrink?: boolean;
  /** Indent from the aligned edge, in Excel's steps (0 to 15). */
  indent?: number;
  /** Text turned this many degrees counter-clockwise, -90 to 90. */
  rotation?: number;
  numFmt?: string;
  borders?: Borders;
  /** Cells are locked until a protected sheet is told otherwise: this one may be changed even then. */
  unlocked?: boolean;
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
  /** Rows a file had hidden under its filter, whose criteria are not known: they stay hidden until the filter is changed. */
  imported?: number[];
}

/** A tiny line or column chart of a range, drawn inside one cell (Insert > Sparklines). */
export interface Sparkline {
  type: 'line' | 'column';
  source: RangePos;
  row: number;
  col: number;
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
  rowHeights?: Map<number, number>;
  /** The colour of the sheet's tab, as #rrggbb. */
  tabColor?: string;
  /** Left out of the tabs (Hide in the tab menu); formulas still read it. */
  hidden?: boolean;
  /** Web addresses cells link to (Ctrl+K), by cell key. */
  links?: Map<number, string>;
  /** Rows and columns the user hid (Ctrl+9, Ctrl+0); a filter hides rows of its own. */
  rowsHidden?: Set<number>;
  /** Outline level (1 to 7) of the rows and columns that are grouped, as Data > Group makes them. */
  rowLevels?: Map<number, number>;
  colLevels?: Map<number, number>;
  sparklines?: Sparkline[];
  colsHidden?: Set<number>;
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
  /** Cells that hold zero show nothing (Excel's "show a zero in cells that have a zero value", turned off). */
  hideZeros?: boolean;
}

export const pageSetupOf = (sheet: Pick<Sheet, 'pageSetup'>): PageSetup => ({
  ...DEFAULT_PAGE_SETUP,
  ...sheet.pageSetup,
  margins: { ...DEFAULT_PAGE_SETUP.margins, ...sheet.pageSetup?.margins },
});

const NO_ROWS: ReadonlySet<number> = new Set();

export const DEFAULT_COL_WIDTH = 100;
export const ROW_HEIGHT = 24;

export const rowHeightOf = (sheet: Pick<Sheet, 'rowHeights'>, row: number): number => sheet.rowHeights?.get(row) ?? ROW_HEIGHT;

/** Plain JSON for the whole workbook: undo snapshots and drafts. */
export interface WorkbookData {
  /** Defined names: the name and what it refers to. Absent in drafts saved before names existed. */
  names?: Array<[string, string]>;
  styles: CellStyle[];
  sheets: Array<{
    name: string;
    cells: Array<[number, string, number]>;
    colWidths: Array<[number, number]>;
    /** Absent in drafts saved before row heights could be set. */
    rowHeights?: Array<[number, number]>;
    tabColor?: string;
    hidden?: boolean;
    links?: Array<[number, string]>;
    rowsHidden?: number[];
    rowLevels?: Array<[number, number]>;
    sparklines?: Sparkline[];
    colLevels?: Array<[number, number]>;
    colsHidden?: number[];
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
    hideZeros?: boolean;
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
const BLOCK_FUNCTIONS = new Set([
  'UNIQUE', 'SORT', 'SORTBY', 'FILTER', 'SEQUENCE', 'TRANSPOSE', 'OFFSET', 'INDIRECT', 'XLOOKUP', 'INDEX', 'ROW', 'COLUMN', 'TOCOL', 'TOROW', 'TAKE', 'DROP',
  'BYROW', 'BYCOL', 'MAP', 'REDUCE', 'SCAN', 'MAKEARRAY', 'LINEST', 'LOGEST', 'TREND', 'GROWTH', 'WRAPROWS', 'WRAPCOLS', 'CHOOSECOLS', 'CHOOSEROWS', 'VSTACK', 'HSTACK', 'EXPAND', 'RANDARRAY', 'FREQUENCY', 'TEXTSPLIT', 'MMULT', 'MINVERSE', 'MUNIT',
]);
/** Functions that hand a block on from the branch they pick. */
const PASS_THROUGH = new Set(['IF', 'IFS', 'IFERROR', 'IFNA', 'CHOOSE', 'SWITCH', 'LET']);

function producesBlock(node: Node): boolean {
  switch (node.t) {
    case 'range':
    case 'array':
      return true;
    case 'name':
      return node.v !== '';
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

  /** The rows that take no room: the ones the user hid and the ones the filter hides. */
  hiddenRows(sheetIndex: number): ReadonlySet<number> {
    const manual = this.sheets[sheetIndex]?.rowsHidden;
    const filtered = this.filteredRows(sheetIndex);
    if (!manual?.size) return filtered;
    return new Set([...manual, ...filtered]);
  }

  hiddenCols(sheetIndex: number): ReadonlySet<number> {
    return this.sheets[sheetIndex]?.colsHidden ?? NO_ROWS;
  }

  /** The rows the sheet's filter hides; empty when it has none or nothing is excluded. */
  filteredRows(sheetIndex: number): ReadonlySet<number> {
    const filter = this.sheets[sheetIndex]?.filter;
    const columns = filter ? Object.entries(filter.excluded).filter(([, values]) => values.length > 0) : [];
    const conditions = filter ? Object.entries(filter.conditions ?? {}) : [];
    if (!filter || (columns.length === 0 && conditions.length === 0 && !filter.imported?.length)) return NO_ROWS;
    const cached = this.hiddenCache.get(sheetIndex);
    if (cached && cached.version === this.version) return cached.rows;
    const rows = new Set<number>(filter.imported ?? []);
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

  private extentCache = new Map<number, { version: number; rows: number; cols: number }>();

  /** Rows and columns up to the last cell holding something, spills not counted (they are computed from the very formulas that ask). */
  private extentOf(sheet: number): { rows: number; cols: number } {
    if (!this.sheets[sheet]) return { rows: 0, cols: 0 };
    const cached = this.extentCache.get(sheet);
    if (cached && cached.version === this.version) return cached;
    let rows = 0;
    let cols = 0;
    for (const key of this.sheets[sheet].cells.keys()) {
      rows = Math.max(rows, keyRow(key) + 1);
      cols = Math.max(cols, keyCol(key) + 1);
    }
    const entry = { version: this.version, rows, cols };
    this.extentCache.set(sheet, entry);
    return entry;
  }

  // ----- Values

  private context(sheetName: string, row: number, col: number): EvalContext {
    return {
      sheet: sheetName,
      row,
      col,
      now: this.now,
      sheetExists: (name) => this.sheetIndex(name) >= 0,
      sheetIndex: (name) => this.sheetIndex(name),
      sheetCount: () => this.sheets.length,
      isSubtotalAt: (name, r, c) => /(?:^|[^A-Za-z0-9_.])(?:SUBTOTAL|AGGREGATE)\s*\(/i.test(this.getCell(this.sheetIndex(name), r, c)?.raw ?? ''),
      rawAt: (name, r, c) => this.getCell(this.sheetIndex(name), r, c)?.raw ?? '',
      extent: (name) => this.extentOf(this.sheetIndex(name)),
      nameTree: (name) => this.nameTree(name),
      valueAt: (name, r, c) => this.valueAt(this.sheetIndex(name), r, c),
      rowHidden: (name, r, includeManual) => (includeManual ? this.hiddenRows(this.sheetIndex(name)) : this.filteredRows(this.sheetIndex(name))).has(r),
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
    const value = this.valueAt(sheet, row, col);
    const numFmt = this.styleOf(cell!.style).numFmt;
    if (value === 0 && this.sheets[sheet]?.hideZeros && !hasZeroSection(numFmt)) return '';
    return formatValue(value, numFmt);
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
    // What hangs on a cell moves with it.
    const follow = <T,>(attached: Map<number, T> | undefined): Map<number, T> | undefined => {
      if (!attached) return attached;
      const next = new Map<number, T>();
      for (const [key, value] of attached) {
        const at = axisOf(key);
        let to: number | null = at;
        if (edit.mode === 'insert') to = at >= edit.at ? at + edit.count : at;
        else if (at >= edit.at && at < edit.at + edit.count) to = null;
        else if (at >= edit.at + edit.count) to = at - edit.count;
        if (to === null) continue;
        next.set(cellKey(edit.axis === 'row' ? to : keyRow(key), edit.axis === 'col' ? to : keyCol(key)), value);
      }
      return next;
    };
    sheet.links = follow(sheet.links);
    sheet.comments = follow(sheet.comments);

    if (edit.axis === 'col') {
      const widths = new Map<number, number>();
      for (const [col, width] of sheet.colWidths) {
        if (edit.mode === 'insert') widths.set(col >= edit.at ? col + edit.count : col, width);
        else if (col < edit.at) widths.set(col, width);
        else if (col >= edit.at + edit.count) widths.set(col - edit.count, width);
      }
      sheet.colWidths = widths;
    }
    const shiftIndex = (index: number): number | null => {
      if (edit.mode === 'insert') return index >= edit.at ? index + edit.count : index;
      if (index < edit.at) return index;
      return index >= edit.at + edit.count ? index - edit.count : null;
    };
    if (edit.axis === 'row' && sheet.rowHeights) {
      const heights = new Map<number, number>();
      for (const [row, height] of sheet.rowHeights ?? []) {
        const to = shiftIndex(row);
        if (to !== null) heights.set(to, height);
      }
      sheet.rowHeights = heights;
    }
    if (sheet.sparklines) {
      sheet.sparklines = sheet.sparklines.flatMap((s) => {
        const source = shiftRange(s.source, edit.axis, edit.at, edit.count, edit.mode);
        const at = shiftIndex(edit.axis === 'row' ? s.row : s.col);
        if (!source || at === null) return [];
        return [{ ...s, source, row: edit.axis === 'row' ? at : s.row, col: edit.axis === 'col' ? at : s.col }];
      });
    }
    const levelKey = edit.axis === 'row' ? 'rowLevels' : 'colLevels';
    if (sheet[levelKey]) sheet[levelKey] = new Map([...sheet[levelKey]!].flatMap(([index, level]) => { const to = shiftIndex(index); return to === null ? [] : [[to, level] as [number, number]]; }));
    const hiddenKey = edit.axis === 'row' ? 'rowsHidden' : 'colsHidden';
    if (sheet[hiddenKey]) sheet[hiddenKey] = new Set([...sheet[hiddenKey]!].flatMap((index) => shiftIndex(index) ?? []));

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

    if (sheet.pageSetup?.printArea) {
      const { printArea, ...rest } = sheet.pageSetup;
      const area = shiftRange(printArea, edit.axis, edit.at, edit.count, edit.mode);
      sheet.pageSetup = area ? { ...rest, printArea: area } : rest;
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
        const imported = edit.axis === 'row' ? (sheet.filter.imported ?? []).flatMap((row) => shiftIndex(row) ?? []) : sheet.filter.imported;
        sheet.filter = { range, excluded, ...(Object.keys(conditions).length ? { conditions } : {}), ...(imported?.length ? { imported } : {}) };
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
    // A name that points at moved cells moves with them.
    for (const [key, entry] of this.names) {
      const adjusted = adjustFormula(`=${entry.refersTo}`, '', sheet.name, edit).replace(/^=/, '');
      if (adjusted !== entry.refersTo) this.names.set(key, { ...entry, refersTo: adjusted });
    }
    this.touch();
  }

  // ----- Names

  /** Names given to ranges or values, under their upper-case spelling; each holds what it refers to as a formula without the "=". */
  names = new Map<string, { name: string; refersTo: string }>();
  private nameTrees = new Map<string, Node | null>();

  /** Gives a name to what `refersTo` says (an address, or any formula); false when the name is not allowed or the text is not a formula. */
  setName(name: string, refersTo: string): boolean {
    const text = refersTo.trim().replace(/^=/, '');
    if (!isValidName(name) || text === '' || this.treeOf(text) === null) return false;
    this.names.set(name.toUpperCase(), { name, refersTo: text });
    this.touch();
    return true;
  }

  deleteName(name: string): void {
    if (this.names.delete(name.toUpperCase())) this.touch();
  }

  /** What a name refers to as a formula tree, or null when there is no such name. */
  nameTree(name: string): Node | null {
    const entry = this.names.get(name.toUpperCase());
    return entry ? this.treeOf(entry.refersTo) : null;
  }

  private treeOf(text: string): Node | null {
    let tree = this.nameTrees.get(text);
    if (tree === undefined) {
      try {
        tree = parseFormula(text);
      } catch {
        tree = null;
      }
      if (this.nameTrees.size > 500) this.nameTrees.clear();
      this.nameTrees.set(text, tree);
    }
    return tree;
  }

  // ----- Snapshots (undo, drafts)

  toData(): WorkbookData {
    return {
      ...(this.names.size ? { names: [...this.names.values()].map(({ name, refersTo }): [string, string] => [name, refersTo]) } : {}),
      styles: this.styles.map((s) => ({ ...s, borders: s.borders ? { ...s.borders } : undefined })),
      sheets: this.sheets.map((sheet) => ({
        name: sheet.name,
        cells: [...sheet.cells].map(([key, cell]) => [key, cell.raw, cell.style]),
        colWidths: [...sheet.colWidths],
        ...(sheet.rowHeights?.size ? { rowHeights: [...sheet.rowHeights] } : {}),
        ...(sheet.tabColor ? { tabColor: sheet.tabColor } : {}),
        ...(sheet.hidden ? { hidden: true } : {}),
        ...(sheet.links?.size ? { links: [...sheet.links] } : {}),
        ...(sheet.rowsHidden?.size ? { rowsHidden: [...sheet.rowsHidden] } : {}),
        ...(sheet.sparklines?.length ? { sparklines: structuredClone(sheet.sparklines) } : {}),
        ...(sheet.rowLevels?.size ? { rowLevels: [...sheet.rowLevels] } : {}),
        ...(sheet.colLevels?.size ? { colLevels: [...sheet.colLevels] } : {}),
        ...(sheet.colsHidden?.size ? { colsHidden: [...sheet.colsHidden] } : {}),
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
        ...(sheet.hideZeros ? { hideZeros: true } : {}),
      })),
    };
  }

  loadData(data: WorkbookData): void {
    this.names = new Map((data.names ?? []).map(([name, refersTo]) => [name.toUpperCase(), { name, refersTo }]));
    this.styles = data.styles.length ? data.styles.map((s) => ({ ...s })) : [{}];
    this.styleIds = new Map(this.styles.map((s, i) => [styleKey(s), i]));
    this.sheets = data.sheets.length
      ? data.sheets.map((sheet) => ({
          name: sheet.name,
          cells: new Map(sheet.cells.map(([key, raw, style]) => [key, { raw, style }])),
          colWidths: new Map(sheet.colWidths),
          ...(sheet.rowHeights?.length ? { rowHeights: new Map(sheet.rowHeights) } : {}),
          ...(sheet.tabColor ? { tabColor: sheet.tabColor } : {}),
          ...(sheet.hidden ? { hidden: true } : {}),
          ...(sheet.links?.length ? { links: new Map(sheet.links) } : {}),
          ...(sheet.rowsHidden?.length ? { rowsHidden: new Set(sheet.rowsHidden) } : {}),
          ...(sheet.sparklines?.length ? { sparklines: structuredClone(sheet.sparklines) } : {}),
          ...(sheet.rowLevels?.length ? { rowLevels: new Map(sheet.rowLevels) } : {}),
          ...(sheet.colLevels?.length ? { colLevels: new Map(sheet.colLevels) } : {}),
          ...(sheet.colsHidden?.length ? { colsHidden: new Set(sheet.colsHidden) } : {}),
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
          ...(sheet.hideZeros ? { hideZeros: true } : {}),
        }))
      : [newSheet('Sheet1')];
    this.touch();
  }
}
