import { CHART_MIN_HEIGHT, CHART_MIN_WIDTH, currentRegion, type ChartObject, type ChartType } from './engine/chartData';
import type { CfRule } from './engine/conditional';
import { functionOpening } from './engine/functionCatalog';
import { serialFromDate } from './engine/dates';
import { absoluteAddress, isValidName } from './engine/definedNames';
import { applyFlashFill, learnFlashFill } from './engine/flashFill';
import { precedentsOf, rangeHolds } from './engine/dependencies';
import { cellKey, columnName, keyCol, keyRow, MAX_COLS, MAX_ROWS, parseCell, parseRange, type CellPos, type RangePos } from './engine/cellRef';
import { interpretEntry, parseTsv } from './engine/entry';
import { parseFormula, shiftFormula } from './engine/parser';
import { compareValues, isError, parseNumber, type Scalar } from './engine/values';
import type { FilterCondition } from './engine/filterCondition';
import { goalSeek } from './engine/goalSeek';
import { buildSummary, type SummaryConfig, type SummaryFn, type SummaryLabels } from './engine/summary';
import { acceptsEntry, validationAt, type Validation, type ValidationRule } from './engine/validation';
import { insertReference, pointSlot, referenceText, type Slot } from './engine/pointMode';
import {
  DEFAULT_PAGE_SETUP,
  ROW_HEIGHT,
  Workbook,
  newSheet,
  pageSetupOf,
  type Borders,
  type Cell,
  type CellComment,
  type CellStyle,
  type PageSetup,
  type Sparkline,
  type FilterState,
  type ImageObject,
  type SheetTable,
  type WorkbookData,
} from './model/workbook';

export interface Change {
  sheet: number;
  row: number;
  col: number;
  before: Cell | undefined;
  after: Cell | undefined;
}

type HistoryEntry =
  | { kind: 'cells'; changes: Change[] }
  | { kind: 'data'; before: WorkbookData; after: WorkbookData; beforeActive: number; afterActive: number };

interface Clipboard {
  range: RangePos;
  /** Every block copied (several when the selection had aligned blocks); `range` is the first. */
  ranges: RangePos[];
  /** Where each copied cell came from, for moving its formula. */
  origin: CellPos[][];
  cells: Array<Array<Cell | undefined>>;
  cut: boolean;
  text: string;
  sheet: number;
}

export interface Editing {
  row: number;
  col: number;
  text: string;
  /** True when typing replaced the cell: arrow keys then commit and move, as in Excel's Enter mode. */
  enterMode: boolean;
  /** The span of the formula text a cell pointed at stands in, while the pointing goes on. */
  pointing?: Slot;
  /** The block pointed at, from where it started to where it ends, drawn over the grid. */
  pointAnchor?: CellPos;
  pointFocus?: CellPos;
  /** Where the caret goes after the text changed by pointing. */
  caret?: number;
  /** The sheet the formula is being typed in (null or active when pointing started). */
  sourceSheet?: number;
  /** The sheet currently being pointed to. */
  pointSheet?: number;
}

export type BorderPreset = 'all' | 'outside' | 'none' | 'top' | 'bottom' | 'left' | 'right' | 'thickOutside' | 'thickBottom' | 'doubleBottom' | 'topBottom' | 'diagonalDown' | 'diagonalUp';

const HISTORY_LIMIT = 200;

/** A rule as the ribbon describes it: the range is the selection, the id is made here. */
export type NewCfRule = CfRule extends infer R ? (R extends CfRule ? Omit<R, 'id' | 'range'> : never) : never;

let cfCounter = 0;
const IMAGE_MIN_SIZE = 16;
const newCfId = () => `cf${Date.now().toString(36)}${(cfCounter += 1).toString(36)}`;

/** The rectangle between two cells, corners in any order. */
export const rectOf = (a: CellPos, b: CellPos): RangePos => ({
  r1: Math.min(a.row, b.row),
  c1: Math.min(a.col, b.col),
  r2: Math.max(a.row, b.row),
  c2: Math.max(a.col, b.col),
});

const within = (r: RangePos, row: number, col: number) => row >= r.r1 && row <= r.r2 && col >= r.c1 && col <= r.c2;

/**
 * Everything Calc does to a workbook, without a screen: selection, typing,
 * undo, clipboard, formatting, structure. The grid and the ribbon call it and
 * repaint when `version` changes; tests call it directly.
 */
export class CalcController {
  wb: Workbook;
  active = 0;
  anchor: CellPos = { row: 0, col: 0 };
  focus: CellPos = { row: 0, col: 0 };
  editing: Editing | null = null;
  /** Calculation mode: auto or manual (F9 recalculate). */
  calcMode: 'auto' | 'manual' = 'auto';
  /** True when in manual calc mode and formulas need recalculating. */
  needsRecalc = false;
  /** The style the format painter will paint, while it is armed. */
  painter: CellStyle | null = null;
  /** The chart that is selected (not a cell), if any. */
  selectedChart: string | null = null;
  /** Bumped on any change a view should repaint for. */
  version = 0;
  /** Where typing goes inside a selection of several cells; null means the selection's first cell. */
  cursor: CellPos | null = null;
  /** The clock, so that a test can set the time Ctrl+; writes. */
  now: () => Date = () => new Date();
  private listeners = new Set<() => void>();
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private clipboard: Clipboard | null = null;

  constructor(wb: Workbook = new Workbook()) {
    this.wb = wb;
  }

  // ----- Subscription

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getVersion = (): number => this.version;

  emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  // ----- Selection

  /** Blocks picked earlier with Ctrl+click; the selection proper is the one after them. */
  private earlierBlocks: RangePos[] = [];

  /** Every selected block, the last one being `selection`. */
  get blocks(): RangePos[] {
    return [...this.earlierBlocks, this.selection];
  }

  /** Ctrl+click: keeps what is selected and starts another block at the cell. */
  addBlock(row: number, col: number): void {
    this.commitEdit(null);
    const kept = this.blocks;
    this.select(row, col);
    this.earlierBlocks = kept;
    this.emit();
  }

  /**
   * Ctrl+E: fills the active column from the examples already typed in it, by what the columns to its left
   * (or its right, with none on the left) hold in those rows. Returns false when no recipe fits the examples.
   */
  flashFill(): boolean {
    const { row, col } = this.activeCell;
    const text = (r: number, c: number) => this.wb.displayAt(this.active, r, c);
    const near = [col - 1, col - 2, col - 3].filter((c) => c >= 0);
    const sources = near.some((c) => text(row, c) !== '') ? near : [col + 1, col + 2, col + 3];
    const has = (r: number) => r >= 0 && sources.some((c) => text(r, c) !== '');
    if (!has(row) && !has(row - 1) && !has(row + 1)) return false;
    let top = row;
    while (has(top - 1)) top -= 1;
    let bottom = row;
    while (has(bottom + 1)) bottom += 1;
    const inputsOf = (r: number) => sources.map((c) => text(r, c));
    const examples: Array<{ inputs: string[]; output: string }> = [];
    for (let r = top; r <= bottom; r += 1) {
      const output = text(r, col);
      if (output !== '') examples.push({ inputs: inputsOf(r), output });
    }
    const program = learnFlashFill(examples);
    if (!program) return false;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    for (let r = top; r <= bottom; r += 1) {
      if (text(r, col) !== '') continue;
      const filled = applyFlashFill(program, inputsOf(r));
      if (filled !== null && filled !== '') edits.push({ row: r, col, after: { raw: filled, style: this.wb.getCell(this.active, r, col)?.style ?? 0 } });
    }
    if (edits.length === 0) return false;
    this.apply(edits);
    return true;
  }

  /**
   * Ctrl+ (rows) and Ctrl+Shift+| (columns): selects, inside the selection, the cells that differ from the comparison
   * cell, which is the one in the active cell's column for each row (or in its row for each column). A formula
   * counts as the same when it is the same once moved to the comparison cell, as in Excel. One cell selected means its region.
   */
  selectDifferences(by: 'row' | 'column'): void {
    const { row: ar, col: ac } = this.activeCell;
    let range = this.selection;
    if (range.r1 === range.r2 && range.c1 === range.c2) {
      this.selectRegion();
      range = this.selection;
      this.anchor = { row: ar, col: ac };
    }
    const raw = (r: number, c: number) => this.wb.getCell(this.active, r, c)?.raw ?? '';
    const hits: RangePos[] = [];
    for (let r = range.r1; r <= range.r2; r += 1)
      for (let c = range.c1; c <= range.c2; c += 1) {
        const [cr, cc] = by === 'row' ? [r, ac] : [ar, c];
        if (r === cr && c === cc) continue;
        const own = raw(r, c);
        const moved = own.startsWith('=') ? shiftFormula(own, cr - r, cc - c) : own;
        if (moved !== raw(cr, cc)) hits.push({ r1: r, c1: c, r2: r, c2: c });
      }
    if (hits.length > 0) this.selectBlocks(hits);
  }

  /** Ctrl+[: selects the cells the active cell's formula refers to; when they are on another sheet, goes there. */
  selectPrecedents(): void {
    const { row, col } = this.activeCell;
    const found = precedentsOf(this.wb.getCell(this.active, row, col)?.raw ?? '');
    const here = found.filter((p) => p.sheet === null || this.wb.sheetIndex(p.sheet) === this.active);
    if (here.length > 0) {
      this.selectBlocks(here.map((p) => p.range));
      return;
    }
    const other = found.find((p) => p.sheet !== null && this.wb.sheetIndex(p.sheet) >= 0);
    if (!other) return;
    this.switchSheet(this.wb.sheetIndex(other.sheet!));
    this.selectBlocks(found.filter((p) => p.sheet === other.sheet).map((p) => p.range));
  }

  /** Ctrl+]: selects the formulas of this sheet that refer directly to the selected cells. */
  selectDependents(): void {
    const targets = this.blocks;
    const hits: RangePos[] = [];
    const name = this.wb.sheets[this.active].name;
    this.wb.sheets[this.active].cells.forEach((cell, key) => {
      if (!cell.raw.startsWith('=')) return;
      if (precedentsOf(cell.raw).some((p) => (p.sheet === null || p.sheet.toLowerCase() === name.toLowerCase()) && rangeHolds(p.range, targets))) hits.push({ r1: keyRow(key), c1: keyCol(key), r2: keyRow(key), c2: keyCol(key) });
    });
    if (hits.length > 0) this.selectBlocks(hits.sort((a, b) => a.r1 - b.r1 || a.c1 - b.c1));
  }

  /** Alt+;: narrows the selection to the cells that show, leaving out hidden and filtered rows and hidden columns. */
  selectVisibleCells(): void {
    const rows = this.wb.hiddenRows(this.active);
    const cols = this.wb.hiddenCols(this.active);
    const runs = (from: number, to: number, hidden: ReadonlySet<number>): Array<[number, number]> => {
      const out: Array<[number, number]> = [];
      let start = -1;
      for (let i = from; i <= to + 1; i += 1) {
        const shown = i <= to && !hidden.has(i);
        if (shown && start < 0) start = i;
        if (!shown && start >= 0) {
          out.push([start, i - 1]);
          start = -1;
        }
      }
      return out;
    };
    const pieces = this.blocks.flatMap((b) => runs(b.r1, b.r2, rows).flatMap(([r1, r2]) => runs(b.c1, b.c2, cols).map(([c1, c2]) => ({ r1, c1, r2, c2 }))));
    if (pieces.length > 0) this.selectBlocks(pieces);
  }

  /** Ctrl+Shift+O: the cells with a note, inside the selection (or the whole sheet when only one cell is selected). */
  selectNotedCells(): void {
    const notes = this.wb.sheets[this.active].comments;
    if (!notes?.size) return;
    const single = this.blocks.length === 1 && this.selection.r1 === this.selection.r2 && this.selection.c1 === this.selection.c2;
    const within = (row: number, col: number) => single || this.blocks.some((b) => row >= b.r1 && row <= b.r2 && col >= b.c1 && col <= b.c2);
    const hits = [...notes.keys()].map((key) => ({ row: keyRow(key), col: keyCol(key) })).filter(({ row, col }) => within(row, col));
    if (hits.length > 0) this.selectBlocks(hits.map(({ row, col }) => ({ r1: row, c1: col, r2: row, c2: col })));
  }

  /** Select all cells with formulas */
  selectFormulas(): void {
    const sheet = this.wb.sheets[this.active];
    const hits: RangePos[] = [];
    sheet.cells.forEach((cell, key) => {
      if (cell.raw.startsWith('=')) {
        const r = keyRow(key);
        const c = keyCol(key);
        hits.push({ r1: r, c1: c, r2: r, c2: c });
      }
    });
    if (hits.length > 0) this.selectBlocks(hits);
  }

  /** Select all cells with constants (non-empty, non-formula) */
  selectConstants(): void {
    const sheet = this.wb.sheets[this.active];
    const hits: RangePos[] = [];
    sheet.cells.forEach((cell, key) => {
      if (cell.raw !== '' && !cell.raw.startsWith('=')) {
        const r = keyRow(key);
        const c = keyCol(key);
        hits.push({ r1: r, c1: c, r2: r, c2: c });
      }
    });
    if (hits.length > 0) this.selectBlocks(hits);
  }

  /** Select all cells that are subject to conditional formatting */
  selectConditionalCells(): void {
    const sheet = this.wb.sheets[this.active];
    if (!sheet.cf?.length) return;
    const hits: RangePos[] = [];
    for (const rule of sheet.cf) {
      if (rule.range) {
        hits.push({ ...rule.range });
      }
    }
    if (hits.length > 0) this.selectBlocks(hits);
  }

  /** Select all cells that have data validation rules */
  selectDataValidationCells(): void {
    const sheet = this.wb.sheets[this.active];
    if (!sheet.validations?.length) return;
    const hits: RangePos[] = [];
    for (const v of sheet.validations) {
      if (v.range) {
        hits.push({ ...v.range });
      }
    }
    if (hits.length > 0) this.selectBlocks(hits);
  }

  /** Selects several blocks at once (the last becomes the selection proper). */
  selectBlocks(blocks: RangePos[]): void {
    if (blocks.length === 0) return;
    const last = blocks[blocks.length - 1];
    this.selectRange(last);
    this.earlierBlocks = blocks.slice(0, -1);
    this.emit();
  }

  /** The selection, widened so that it holds every merged cell it touches. */
  get selection(): RangePos {
    let range = rectOf(this.anchor, this.focus);
    for (let changed = true; changed; ) {
      changed = false;
      for (const m of this.wb.sheets[this.active].merges) {
        const touches = m.r1 <= range.r2 && m.r2 >= range.r1 && m.c1 <= range.c2 && m.c2 >= range.c1;
        if (touches && (m.r1 < range.r1 || m.r2 > range.r2 || m.c1 < range.c1 || m.c2 > range.c2)) {
          range = { r1: Math.min(range.r1, m.r1), c1: Math.min(range.c1, m.c1), r2: Math.max(range.r2, m.r2), c2: Math.max(range.c2, m.c2) };
          changed = true;
        }
      }
    }
    return range;
  }

  get activeCell(): CellPos {
    return this.cursor ?? this.anchor;
  }

  /** The merged block a cell belongs to, if any. */
  mergeAt(row: number, col: number): RangePos | undefined {
    return this.wb.sheets[this.active].merges.find((m) => within(m, row, col));
  }

  /** F8: the arrow keys extend the selection until F8 or Esc. */
  extendMode = false;
  /** The column Tab began a run of entries in, which Enter goes back to, as in Excel. */
  private tabReturn: number | null = null;
  /** What F4 does again: the last formatting or row and column command. */
  private lastRepeat: (() => void) | null = null;

  toggleExtendMode(): void {
    this.extendMode = !this.extendMode;
    this.emit();
  }

  /** F4 and Ctrl+Y with nothing to redo: the last formatting or row and column command, on the selection now. */
  repeatLast(): boolean {
    if (!this.lastRepeat) return false;
    this.lastRepeat();
    return true;
  }

  /** F9: every formula is worked out again, which a random number or the time wants. */
  recalculate(): void {
    this.commitEdit(null);
    this.wb.touch();
    this.needsRecalc = false;
    this.emit();
  }

  select(row: number, col: number): void {
    this.commitEdit(null);
    this.extendMode = false;
    this.tabReturn = null;
    this.selectedChart = null;
    this.anchor = { row: clamp(row, 0, MAX_ROWS - 1), col: clamp(col, 0, MAX_COLS - 1) };
    this.focus = this.anchor;
    this.cursor = null;
    this.earlierBlocks = [];
    this.emit();
  }

  extendTo(row: number, col: number): void {
    this.cursor = null;
    this.focus = { row: clamp(row, 0, MAX_ROWS - 1), col: clamp(col, 0, MAX_COLS - 1) };
    this.emit();
  }

  selectRange(range: RangePos): void {
    this.commitEdit(null);
    this.anchor = { row: range.r1, col: range.c1 };
    this.focus = { row: range.r2, col: range.c2 };
    this.cursor = null;
    this.earlierBlocks = [];
    this.emit();
  }

  /** Selects a single column, keeping focus at row 0 so viewport does not jump to bottom. */
  selectColumn(col: number, rowLimit: number): void {
    this.commitEdit(null);
    this.anchor = { row: rowLimit - 1, col };
    this.focus = { row: 0, col };
    this.cursor = null;
    this.earlierBlocks = [];
    this.emit();
  }

  /** Selects a single row, keeping focus at col 0 so viewport does not jump to far right. */
  selectRow(row: number, colLimit: number): void {
    this.commitEdit(null);
    this.anchor = { row, col: colLimit - 1 };
    this.focus = { row, col: 0 };
    this.cursor = null;
    this.earlierBlocks = [];
    this.emit();
  }

  /** Whole columns of the selection, as far down as `rowLimit`. Focus stays at top row. */
  selectColumns(rowLimit: number): void {
    const { c1, c2 } = this.selection;
    this.commitEdit(null);
    this.anchor = { row: rowLimit - 1, col: c2 };
    this.focus = { row: 0, col: c1 };
    this.cursor = null;
    this.earlierBlocks = [];
    this.emit();
  }

  /** Whole rows of the selection, as far right as `colLimit`. Focus stays at leftmost column. */
  selectRows(colLimit: number): void {
    const { r1, r2 } = this.selection;
    this.commitEdit(null);
    this.anchor = { row: r2, col: colLimit - 1 };
    this.focus = { row: r1, col: 0 };
    this.cursor = null;
    this.earlierBlocks = [];
    this.emit();
  }

  /** The block of data around the active cell (Ctrl+Shift+*). */
  selectRegion(): void {
    const { row, col } = this.activeCell;
    this.selectRange(currentRegion(row, col, (r, c) => (this.wb.getCell(this.active, r, c)?.raw ?? '') !== ''));
  }

  /** Enter and Tab (with Shift, the other way) inside a selection of several cells walk through it and wrap; elsewhere they move. */
  advance(dRow: number, dCol: number): void {
    const sel = this.selection;
    const { row, col } = this.activeCell;
    if ((sel.r1 === sel.r2 && sel.c1 === sel.c2) || !within(sel, row, col)) {
      this.move(dRow, dCol);
      return;
    }
    let r = row + dRow;
    let c = col + dCol;
    if (dRow !== 0) {
      if (r > sel.r2) [r, c] = [sel.r1, c + 1];
      else if (r < sel.r1) [r, c] = [sel.r2, c - 1];
      if (c > sel.c2) c = sel.c1;
      else if (c < sel.c1) c = sel.c2;
    } else {
      if (c > sel.c2) [r, c] = [r + 1, sel.c1];
      else if (c < sel.c1) [r, c] = [r - 1, sel.c2];
      if (r > sel.r2) r = sel.r1;
      else if (r < sel.r1) r = sel.r2;
    }
    this.cursor = { row: r, col: c };
    this.emit();
  }

  /** Arrow-key movement; from a merged cell it leaves the merge. */
  move(dRow: number, dCol: number, extend = false): void {
    extend = extend || this.extendMode;
    const from = extend ? this.focus : this.activeCell;
    const m = this.mergeAt(from.row, from.col);
    let row = from.row;
    let col = from.col;
    if (m) {
      row = dRow > 0 ? m.r2 : dRow < 0 ? m.r1 : row;
      col = dCol > 0 ? m.c2 : dCol < 0 ? m.c1 : col;
    }
    row = clamp(row + dRow, 0, MAX_ROWS - 1);
    // Rows a filter hides are stepped over.
    const hidden = this.wb.hiddenRows(this.active);
    if (dRow !== 0 && hidden.size > 0) {
      const step = Math.sign(dRow);
      while (hidden.has(row) && row + step >= 0 && row + step < MAX_ROWS) row += step;
    }
    col = clamp(col + dCol, 0, MAX_COLS - 1);
    if (extend) this.extendTo(row, col);
    else this.select(row, col);
  }

  selectAll(): void {
    const used = this.wb.usedRange(this.active);
    const target = used ?? { r1: 0, c1: 0, r2: 0, c2: 0 };
    this.commitEdit(null);
    this.anchor = { row: target.r2, col: target.c2 };
    this.focus = { row: target.r1, col: target.c1 };
    this.cursor = null;
    this.earlierBlocks = [];
    this.emit();
  }

  // ----- Typing

  rawOfActive(): string {
    const { row, col } = this.activeCell;
    return this.wb.getCell(this.active, row, col)?.raw ?? '';
  }

  startEdit(initialText?: string): void {
    const { row, col } = this.activeCell;
    if (this.readOnly || this.isLocked(row, col)) {
      this.onProtected?.();
      return;
    }
    this.editing = {
      row,
      col,
      text: initialText ?? this.rawOfActive(),
      enterMode: initialText !== undefined,
      sourceSheet: this.active,
    };
    this.emit();
  }

  setEditText(text: string): void {
    if (!this.editing) return;
    this.editing = { ...this.editing, text, pointing: undefined, pointAnchor: undefined, pointFocus: undefined, caret: undefined };
    this.emit();
  }

  /** The text with the caret put at a place, which the editor then moves its caret to. */
  setEditTextAt(text: string, caret: number): void {
    if (!this.editing) return;
    this.editing = { ...this.editing, text, pointing: undefined, pointAnchor: undefined, pointFocus: undefined, caret };
    this.emit();
  }

  /** Whether a cell may be pointed at now, with the caret where it is; if so, the pointing starts. */
  beginPoint(caret: number): boolean {
    const editing = this.editing;
    if (!editing) return false;
    const slot = pointSlot(editing.text, caret, editing.pointing ?? null);
    if (!slot) return false;
    this.editing = { ...editing, pointing: slot, sourceSheet: editing.sourceSheet ?? this.active };
    return true;
  }

  /** The block pointed at goes into the formula in place of what was pointed at before. */
  pointTo(anchor: CellPos, focus: CellPos): void {
    const editing = this.editing;
    if (!editing?.pointing) return;
    const range: RangePos = { r1: Math.min(anchor.row, focus.row), c1: Math.min(anchor.col, focus.col), r2: Math.max(anchor.row, focus.row), c2: Math.max(anchor.col, focus.col) };
    const targetSheet = editing.sourceSheet !== undefined && editing.sourceSheet !== this.active
      ? this.wb.sheets[this.active]?.name ?? null
      : null;
    const next = insertReference(editing.text, editing.pointing, referenceText(range, targetSheet));
    this.editing = { ...editing, text: next.text, pointing: next.slot, pointAnchor: anchor, pointFocus: focus, caret: next.slot.to, pointSheet: this.active };
    this.emit();
  }

  /** An arrow key moves the cell pointed at, starting from the cell being edited; false when nothing may be pointed at. */
  pointMove(direction: 'up' | 'down' | 'left' | 'right', extend: boolean, caret: number): boolean {
    const editing = this.editing;
    if (!editing || !editing.text.startsWith('=') || !(editing.enterMode || editing.pointing) || !this.beginPoint(caret)) return false;
    const current = this.editing!;
    const from = current.pointFocus ?? { row: editing.row, col: editing.col };
    const step = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[direction];
    const focus = { row: clamp(from.row + step[0], 0, MAX_ROWS - 1), col: clamp(from.col + step[1], 0, MAX_COLS - 1) };
    this.pointTo(extend && current.pointAnchor ? current.pointAnchor : focus, focus);
    return true;
  }

  /** Stores what is being typed and moves the cursor as Enter, Tab or an arrow would. */
  commitEdit(then: 'down' | 'up' | 'right' | 'left' | null): void {
    const editing = this.editing;
    if (!editing) return;
    this.editing = null;
    const targetSheet = editing.sourceSheet ?? this.active;
    const existing = this.wb.getCell(targetSheet, editing.row, editing.col);
    const style = this.wb.styleOf(existing?.style ?? 0);
    if ((existing?.raw ?? '') !== editing.text) {
      const rule = validationAt(this.wb.sheets[targetSheet].validations, editing.row, editing.col);
      if (rule && !acceptsEntry(rule.rule, editing.text, this.validationItems(rule))) {
        // Refused: the cell keeps what it had, and the screen says why.
        this.onReject?.(rule.error);
        this.emit();
        return;
      }
      const entry = interpretEntry(editing.text, style.numFmt);
      // A new line in the text turns wrapping on, as in Excel.
      const wrapped = editing.text.includes('\n') && !style.wrap;
      const styleId = entry.numFmt || wrapped ? this.wb.styleId({ ...style, ...(entry.numFmt ? { numFmt: entry.numFmt } : {}), ...(wrapped ? { wrap: true } : {}) }) : (existing?.style ?? 0);
      this.apply([{ row: editing.row, col: editing.col, after: { raw: entry.raw, style: styleId } }], targetSheet);
    }
    if (editing.sourceSheet !== undefined && editing.sourceSheet !== this.active) {
      this.active = editing.sourceSheet;
    }
    if (then) {
      const d = { down: [1, 0], up: [-1, 0], right: [0, 1], left: [0, -1] }[then];
      const sel = this.selection;
      const insideSelection = (sel.r1 !== sel.r2 || sel.c1 !== sel.c2) && within(sel, editing.row, editing.col);
      if (insideSelection) {
        this.cursor = { row: editing.row, col: editing.col };
        this.advance(d[0], d[1]);
      } else {
        // A run of Tabs and then Enter comes back to the column the run began in.
        const runStart = then === 'right' || then === 'left' ? (this.tabReturn ?? editing.col) : null;
        const back = then === 'down' ? this.tabReturn : null;
        this.anchor = { row: editing.row, col: back ?? editing.col };
        this.focus = this.anchor;
        this.cursor = null;
        this.move(d[0], d[1]);
        this.tabReturn = runStart;
      }
    } else this.emit();
  }

  /** Ctrl+Enter: what is typed goes into every selected cell, a formula with its references moved as if filled. */
  commitEditToSelection(): void {
    const editing = this.editing;
    if (!editing) return;
    this.editing = null;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    for (const { row, col } of this.selectedCells()) {
      const existing = this.wb.getCell(this.active, row, col);
      const style = this.wb.styleOf(existing?.style ?? 0);
      const text = editing.text.startsWith('=') ? shiftFormula(editing.text, row - editing.row, col - editing.col) : editing.text;
      const entry = interpretEntry(text, style.numFmt);
      edits.push({ row, col, after: { raw: entry.raw, style: entry.numFmt ? this.wb.styleId({ ...style, numFmt: entry.numFmt }) : (existing?.style ?? 0) } });
    }
    this.apply(edits);
  }

  /** Ctrl+; writes today's date in the active cell, Ctrl+Shift+: the time. */
  insertNow(kind: 'date' | 'time'): void {
    const { row, col } = this.activeCell;
    const serial = serialFromDate(this.now());
    const value = kind === 'date' ? Math.floor(serial) : serial - Math.floor(serial);
    const existing = this.wb.getCell(this.active, row, col);
    const style = this.wb.styleOf(existing?.style ?? 0);
    const styleId = this.wb.styleId({ ...style, numFmt: kind === 'date' ? 'dd/mm/yyyy' : 'hh:mm' });
    this.apply([{ row, col, after: { raw: String(value), style: styleId } }]);
  }

  /** Ctrl+' opens the active cell for editing with the cell above's formula; Ctrl+Shift+" with what it shows. */
  copyFromAbove(values: boolean): void {
    const { row, col } = this.activeCell;
    if (row === 0) return;
    const above = values ? this.wb.displayAt(this.active, row - 1, col) : (this.wb.getCell(this.active, row - 1, col)?.raw ?? '');
    this.editing = { row, col, text: above, enterMode: false };
    this.emit();
  }

  /** Told when a typed entry is refused by data validation, with the rule's own message if it has one. */
  onReject: ((message: string | undefined) => void) | null = null;
  /** Gọi khi một thay đổi bị chặn vì trang tính đang được bảo vệ. */
  onProtected: (() => void) | null = null;
  /** Mở chỉ để xem (bảng tính chung bằng quyền xem): mọi thay đổi bị chặn, kể cả đổi tên trang và cố định ô. */
  readOnly = false;

  // ----- Data validation

  get validations(): readonly Validation[] {
    return this.wb.sheets[this.active].validations ?? [];
  }

  /** The formula of the cell whose block spills over the active cell, when that is where its value comes from. */
  spillFormulaOfActive(): string | null {
    const { row, col } = this.anchor;
    const over = this.wb.spillCellAt(this.active, row, col);
    return over ? (this.wb.getCell(this.active, over.origin.row, over.origin.col)?.raw ?? null) : null;
  }

  /** The rule for a cell on the sheet on show. */
  validationOf(row: number, col: number): Validation | undefined {
    return validationAt(this.wb.sheets[this.active].validations, row, col);
  }

  /** What a list rule offers now: the typed items, or the cells of its range (shown text, no blanks, no repeats). */
  validationItems(validation: Validation): string[] {
    const { rule } = validation;
    if (rule.kind === 'items') return rule.items;
    if (rule.kind !== 'range') return [];
    const bang = rule.ref.lastIndexOf('!');
    const sheetName = bang >= 0 ? rule.ref.slice(0, bang).replace(/^'|'$/g, '').replace(/''/g, "'") : this.wb.sheets[this.active].name;
    const sheetIndex = this.wb.sheetIndex(sheetName);
    const range = parseRange((bang >= 0 ? rule.ref.slice(bang + 1) : rule.ref).replace(/\$/g, ''));
    if (sheetIndex < 0 || !range) return [];
    const seen = new Set<string>();
    const items: string[] = [];
    for (let r = range.r1; r <= range.r2; r += 1)
      for (let c = range.c1; c <= range.c2; c += 1) {
        const text = this.wb.displayAt(sheetIndex, r, c).trim();
        if (text && !seen.has(text.toLowerCase())) {
          seen.add(text.toLowerCase());
          items.push(text);
        }
      }
    return items;
  }

  /** Sets (or, with null, clears) the rule for a block, replacing the rules wholly inside it. One undo step. */
  setValidation(range: RangePos, rule: ValidationRule | null, error?: string): void {
    this.commitEdit(null);
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      const inside = (v: Validation) => v.range.r1 >= range.r1 && v.range.r2 <= range.r2 && v.range.c1 >= range.c1 && v.range.c2 <= range.c2;
      const kept = (sheet.validations ?? []).filter((v) => !inside(v));
      if (rule) kept.push({ range: { ...range }, rule, ...(error ? { error } : {}) });
      if (kept.length > 0) sheet.validations = kept;
      else delete sheet.validations;
      this.wb.touch();
    });
  }

  /** Picks an item from a cell's list: entered as if typed, but never refused. */
  pickListItem(row: number, col: number, item: string): void {
    this.commitEdit(null);
    const existing = this.wb.getCell(this.active, row, col);
    const style = this.wb.styleOf(existing?.style ?? 0);
    const entry = interpretEntry(item, style.numFmt);
    const styleId = entry.numFmt ? this.wb.styleId({ ...style, numFmt: entry.numFmt }) : (existing?.style ?? 0);
    this.apply([{ row, col, after: { raw: entry.raw, style: styleId } }]);
  }

  /** F2: between replacing the cell (arrows commit) and editing it in place (arrows move the caret). */
  toggleEditMode(): void {
    if (!this.editing) return;
    this.editing = { ...this.editing, enterMode: !this.editing.enterMode };
    this.emit();
  }

  cancelEdit(): void {
    const editing = this.editing;
    if (!editing) return;
    this.editing = null;
    if (editing.sourceSheet !== undefined && editing.sourceSheet !== this.active) {
      this.active = editing.sourceSheet;
    }
    this.emit();
  }

  // ----- Changing cells and history

  /** Whether a cell cannot be changed: the sheet is protected and the cell is locked. */
  isLocked(row: number, col: number, sheet = this.active): boolean {
    if (!this.wb.sheets[sheet]?.protected) return false;
    return !this.wb.styleOf(this.wb.getCell(sheet, row, col)?.style ?? 0).unlocked;
  }

  get isProtected(): boolean {
    return this.sheetProtected;
  }

  /** Protects the active sheet or takes the protection off. */
  setProtected(on: boolean): void {
    if (this.sheetProtected !== on) this.toggleProtection();
  }

  /** Locks or unlocks the selected cells; the lock only counts while the sheet is protected. */
  setLocked(locked: boolean): void {
    this.applyStyle({ unlocked: locked ? undefined : true });
  }

  /** Sets cells (undefined clears one) as one undoable step. */
  apply(edits: Array<{ row: number; col: number; after: Cell | undefined }>, sheet = this.active): void {
    if (this.readOnly) {
      this.onProtected?.();
      return;
    }
    const changes: Change[] = [];
    let refused = false;
    for (const { row, col, after } of edits) {
      if (row < 0 || col < 0 || row >= MAX_ROWS || col >= MAX_COLS) continue;
      if (this.isLocked(row, col, sheet)) {
        refused = true;
        continue;
      }
      const before = this.wb.getCell(sheet, row, col);
      const same = (before?.raw ?? '') === (after?.raw ?? '') && (before?.style ?? 0) === (after?.style ?? 0);
      if (!same) changes.push({ sheet, row, col, before, after });
    }
    if (refused) this.onProtected?.();
    if (changes.length === 0) return;
    for (const c of changes) this.wb.putCell(c.sheet, c.row, c.col, c.after);
    this.pushHistory({ kind: 'cells', changes });
    this.keepSummariesCurrent(changes);
    if (this.calcMode === 'manual') this.needsRecalc = true;
    this.emit();
  }

  private pushHistory(entry: HistoryEntry): void {
    this.undoStack.push(entry);
    if (this.undoStack.length > HISTORY_LIMIT) this.undoStack.shift();
    this.redoStack = [];
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): void {
    this.cancelEdit();
    const entry = this.undoStack.pop();
    if (!entry) return;
    this.replay(entry, 'undo');
    if (entry.kind === 'cells') this.keepSummariesCurrent(entry.changes);
    this.redoStack.push(entry);
    this.emit();
  }

  redo(): void {
    this.cancelEdit();
    const entry = this.redoStack.pop();
    if (!entry) return;
    this.replay(entry, 'redo');
    if (entry.kind === 'cells') this.keepSummariesCurrent(entry.changes);
    this.undoStack.push(entry);
    this.emit();
  }

  private replay(entry: HistoryEntry, direction: 'undo' | 'redo'): void {
    if (entry.kind === 'cells') {
      const list = direction === 'undo' ? [...entry.changes].reverse() : entry.changes;
      for (const c of list) this.wb.putCell(c.sheet, c.row, c.col, direction === 'undo' ? c.before : c.after);
      const last = entry.changes[entry.changes.length - 1];
      if (last) {
        this.active = last.sheet;
        this.select(last.row, last.col);
      }
      return;
    }
    this.selectedChart = null;
    this.wb.loadData(direction === 'undo' ? entry.before : entry.after);
    this.active = Math.min(direction === 'undo' ? entry.beforeActive : entry.afterActive, this.wb.sheets.length - 1);
  }

  /** Runs a structural change, remembering the whole workbook either side of it. */
  private structural(change: () => void, allowProtected = false): void {
    if (this.readOnly || !allowProtected) {
      if (this.protectedBlocks()) return;
    }
    const before = this.wb.toData();
    const beforeActive = this.active;
    change();
    this.active = Math.min(this.active, this.wb.sheets.length - 1);
    this.pushHistory({ kind: 'data', before, after: this.wb.toData(), beforeActive, afterActive: this.active });
    this.emit();
  }

  /** Như `structural` nhưng vẫn làm được khi trang tính đang được bảo vệ (thêm, đổi tên, xóa trang tính, cố định, cách in). */
  private structuralAnywhere(change: () => void): void {
    this.structural(change, true);
  }

  /** Trang tính đang xem có được bảo vệ không. */
  get sheetProtected(): boolean {
    return !!this.wb.sheets[this.active]?.protected;
  }

  /** Báo và trả true khi trang tính đang được bảo vệ, để nơi gọi dừng lại. */
  private protectedBlocks(): boolean {
    if (!this.readOnly && !this.sheetProtected) return false;
    this.onProtected?.();
    return true;
  }

  /** Bật hoặc tắt bảo vệ trang tính đang xem (không mật khẩu). */
  toggleProtection(): void {
    const sheet = this.wb.sheets[this.active];
    this.structuralAnywhere(() => {
      if (sheet.protected) delete sheet.protected;
      else sheet.protected = true;
      this.editing = null;
      this.wb.touch();
    });
  }

  // ----- Page setup

  get pageSetup(): PageSetup {
    return pageSetupOf(this.wb.sheets[this.active]);
  }

  /** Đổi một phần cách in của trang tính đang xem; giá trị mặc định không để lại gì thừa. */
  setPageSetup(change: Partial<PageSetup>): void {
    const sheet = this.wb.sheets[this.active];
    const next: PageSetup = { ...pageSetupOf(sheet), ...change };
    next.scale = clamp(Math.round(next.scale), 10, 400);
    if (!next.printArea) delete next.printArea;
    const same = JSON.stringify(next) === JSON.stringify(pageSetupOf(sheet));
    if (same) return;
    this.structuralAnywhere(() => {
      const isDefault = JSON.stringify({ ...next, printArea: undefined }) === JSON.stringify({ ...DEFAULT_PAGE_SETUP, printArea: undefined }) && !next.printArea;
      if (isDefault) delete sheet.pageSetup;
      else sheet.pageSetup = next;
      this.wb.touch();
    });
  }

  /** Đặt vùng in là vùng đang chọn, hoặc bỏ vùng in. */
  setPrintArea(area: RangePos | null): void {
    this.setPageSetup({ printArea: area ?? undefined });
  }

  // ----- Comments

  commentAt(row: number, col: number): CellComment | undefined {
    return this.wb.sheets[this.active]?.comments?.get(cellKey(row, col));
  }

  /** Đặt ghi chú cho ô; chuỗi rỗng là xóa. */
  setComment(row: number, col: number, text: string, author: string): void {
    const sheet = this.wb.sheets[this.active];
    const key = cellKey(row, col);
    const trimmed = text.trim();
    const current = sheet.comments?.get(key);
    if (!trimmed && !current) return;
    if (current && current.text === trimmed) return;
    this.structural(() => {
      if (!trimmed) {
        sheet.comments?.delete(key);
        if (sheet.comments && sheet.comments.size === 0) delete sheet.comments;
      } else {
        sheet.comments = sheet.comments ?? new Map();
        sheet.comments.set(key, { text: trimmed, author: current?.author ?? author, at: Date.now() });
      }
      this.wb.touch();
    });
  }

  /** Các ô có ghi chú của trang tính đang xem, theo thứ tự hàng rồi cột. */
  commentCells(): Array<{ row: number; col: number; comment: CellComment }> {
    const comments = this.wb.sheets[this.active]?.comments;
    if (!comments) return [];
    return [...comments]
      .map(([key, comment]) => ({ row: keyRow(key), col: keyCol(key), comment }))
      .sort((a, b) => a.row - b.row || a.col - b.col);
  }

  // ----- Stacking order of charts and pictures

  /** Đưa biểu đồ hay ảnh lên hoặc xuống trong các đối tượng cùng loại (biểu đồ nằm dưới ảnh). */
  arrangeObject(id: string, where: 'front' | 'back' | 'forward' | 'backward'): void {
    const sheet = this.wb.sheets[this.active];
    const list: Array<{ id: string }> | null = sheet.charts.some((c) => c.id === id) ? sheet.charts : (sheet.images ?? []).some((i) => i.id === id) ? sheet.images! : null;
    if (!list) return;
    const at = list.findIndex((o) => o.id === id);
    const to = where === 'front' ? list.length - 1 : where === 'back' ? 0 : where === 'forward' ? Math.min(list.length - 1, at + 1) : Math.max(0, at - 1);
    if (to === at) return;
    this.structural(() => {
      const [moved] = list.splice(at, 1);
      list.splice(to, 0, moved);
      this.wb.touch();
    });
  }

  /** Chèn lời gọi hàm vào công thức đang gõ, hoặc mở ô đang chọn với công thức mới. */
  insertFunction(name: string): void {
    if (this.protectedBlocks()) return;
    const opening = functionOpening(name);
    const current = this.editing ? this.editing.text : '';
    const text = current.startsWith('=') ? current + opening : `=${opening}`;
    if (this.editing) this.setEditText(text);
    else this.startEdit(text);
  }

  // ----- Clearing

  /** Cells of the selection, for walking it. */
  private selectedCells(): Array<{ row: number; col: number }> {
    const out: Array<{ row: number; col: number }> = [];
    const seen = new Set<number>();
    for (const { r1, c1, r2, c2 } of this.blocks)
      for (let r = r1; r <= r2; r += 1)
        for (let c = c1; c <= c2; c += 1) {
          if (seen.has(r * MAX_COLS + c)) continue;
          seen.add(r * MAX_COLS + c);
          out.push({ row: r, col: c });
        }
    return out;
  }

  clearContents(): void {
    this.apply(
      this.selectedCells().flatMap(({ row, col }) => {
        const cell = this.wb.getCell(this.active, row, col);
        return cell && cell.raw !== '' ? [{ row, col, after: { raw: '', style: cell.style } }] : [];
      }),
    );
  }

  clearFormats(): void {
    this.apply(
      this.selectedCells().flatMap(({ row, col }) => {
        const cell = this.wb.getCell(this.active, row, col);
        return cell && cell.style !== 0 ? [{ row, col, after: { raw: cell.raw, style: 0 } }] : [];
      }),
    );
  }

  clearAll(): void {
    this.apply(this.selectedCells().map(({ row, col }) => ({ row, col, after: undefined })));
  }

  clearComments(): void {
    const sheet = this.wb.sheets[this.active];
    if (!sheet?.comments?.size) return;
    const keys = this.selectedCells().map(({ row, col }) => cellKey(row, col)).filter((key) => sheet.comments!.has(key));
    if (keys.length === 0) return;
    this.structural(() => {
      for (const key of keys) sheet.comments!.delete(key);
      if (sheet.comments!.size === 0) delete sheet.comments;
      this.wb.touch();
    });
  }

  clearHyperlinks(): void {
    const sheet = this.wb.sheets[this.active];
    if (!sheet?.links?.size) return;
    const keys = this.selectedCells().map(({ row, col }) => cellKey(row, col)).filter((key) => sheet.links!.has(key));
    if (keys.length === 0) return;
    this.structural(() => {
      for (const key of keys) sheet.links!.delete(key);
      if (sheet.links!.size === 0) delete sheet.links;
      this.wb.touch();
    });
  }

  // ----- Formatting

  /** The style of the active cell. */
  activeStyle(): CellStyle {
    const { row, col } = this.activeCell;
    return this.wb.styleOf(this.wb.getCell(this.active, row, col)?.style ?? 0);
  }

  /** Changes the style of every selected cell: `change` returns the new style from the old one. */
  restyle(change: (style: CellStyle, row: number, col: number) => CellStyle): void {
    this.apply(
      this.selectedCells().map(({ row, col }) => {
        const cell = this.wb.getCell(this.active, row, col);
        const style = this.wb.styleOf(cell?.style ?? 0);
        return { row, col, after: { raw: cell?.raw ?? '', style: this.wb.styleId(change(style, row, col)) } };
      }),
    );
  }

  applyStyle(patch: Partial<CellStyle>): void {
    this.lastRepeat = () => this.applyStyle(patch);
    this.restyle((style) => ({ ...style, ...patch }));
  }

  /** Bold, italic, underline or strike on or off, by what the active cell has. */
  toggleStyle(key: 'bold' | 'italic' | 'underline' | 'strike'): void {
    const turnOn = !this.activeStyle()[key];
    this.applyStyle({ [key]: turnOn });
  }

  /** Increase or decrease Indent: one step of the aligned edge, left for text with no alignment of its own. */
  changeIndent(delta: number): void {
    const current = this.activeStyle().indent ?? 0;
    const indent = Math.max(0, Math.min(15, current + delta));
    this.applyStyle({ indent: indent || undefined, ...(indent > 0 && !this.activeStyle().hAlign ? { hAlign: 'left' as const } : {}) });
  }

  /** Orientation: the text turned this many degrees counter-clockwise (-90 to 90); 0 or undefined sets it straight. */
  setRotation(degrees: number | undefined): void {
    this.applyStyle({ rotation: degrees ? Math.max(-90, Math.min(90, Math.round(degrees))) : undefined });
  }

  setNumFmt(code: string): void {
    this.applyStyle({ numFmt: code === 'General' ? undefined : code });
  }

  setBorders(preset: BorderPreset): void {
    this.lastRepeat = () => this.setBorders(preset);
    const blocks = this.blocks;
    this.restyle((style, row, col) => {
      const borders: Borders = { ...style.borders };
      const { r1, c1, r2, c2 } = blocks.find((b) => row >= b.r1 && row <= b.r2 && col >= b.c1 && col <= b.c2) ?? this.selection;
      const edge = { top: row === r1, bottom: row === r2, left: col === c1, right: col === c2 };
      switch (preset) {
        case 'none':
          return { ...style, borders: undefined };
        case 'all':
          return { ...style, borders: { top: true, right: true, bottom: true, left: true } };
        case 'thickOutside': {
          const thick = { style: 'thick' as const };
          return { ...style, borders: { ...borders, ...(edge.top ? { top: thick } : {}), ...(edge.bottom ? { bottom: thick } : {}), ...(edge.left ? { left: thick } : {}), ...(edge.right ? { right: thick } : {}) } };
        }
        case 'diagonalDown':
        case 'diagonalUp': {
          const key = preset;
          const next: Borders = { ...borders };
          if (next[key]) delete next[key];
          else next[key] = true;
          return { ...style, borders: Object.keys(next).length ? next : undefined };
        }
        case 'thickBottom':
          return edge.bottom ? { ...style, borders: { ...borders, bottom: { style: 'thick' as const } } } : style;
        case 'doubleBottom':
          return edge.bottom ? { ...style, borders: { ...borders, bottom: { style: 'double' as const } } } : style;
        case 'topBottom':
          return { ...style, borders: { ...borders, ...(edge.top ? { top: true } : {}), ...(edge.bottom ? { bottom: true } : {}) } };
        case 'outside':
          return { ...style, borders: { ...borders, top: borders.top || edge.top, bottom: borders.bottom || edge.bottom, left: borders.left || edge.left, right: borders.right || edge.right } };
        default:
          return edge[preset] ? { ...style, borders: { ...borders, [preset]: true } } : style;
      }
    });
  }

  /** Merges the selection into one cell (keeping the top-left value), or splits a merge. */
  mergeSelection(): void {
    const range = this.selection;
    const sheet = this.wb.sheets[this.active];
    const existing = sheet.merges.filter((m) => m.r1 <= range.r2 && m.r2 >= range.r1 && m.c1 <= range.c2 && m.c2 >= range.c1);
    this.structural(() => {
      sheet.merges = sheet.merges.filter((m) => !existing.includes(m));
      if (existing.length === 0 && (range.r1 !== range.r2 || range.c1 !== range.c2)) {
        sheet.merges.push({ ...range });
        for (let r = range.r1; r <= range.r2; r += 1)
          for (let c = range.c1; c <= range.c2; c += 1) if (r !== range.r1 || c !== range.c1) sheet.cells.delete(cellKey(r, c));
      }
      this.wb.touch();
    });
  }

  /** Merges cells across each row in the selection horizontally. */
  mergeAcross(): void {
    const range = this.selection;
    if (range.c1 === range.c2) return;
    const sheet = this.wb.sheets[this.active];
    const existing = sheet.merges.filter((m) => m.r1 <= range.r2 && m.r2 >= range.r1 && m.c1 <= range.c2 && m.c2 >= range.c1);
    this.structural(() => {
      sheet.merges = sheet.merges.filter((m) => !existing.includes(m));
      for (let r = range.r1; r <= range.r2; r += 1) {
        sheet.merges.push({ r1: r, r2: r, c1: range.c1, c2: range.c2 });
        for (let c = range.c1 + 1; c <= range.c2; c += 1) sheet.cells.delete(cellKey(r, c));
      }
      this.wb.touch();
    });
  }

  /** Splits all merges that intersect the current selection. */
  unmergeSelection(): void {
    const range = this.selection;
    const sheet = this.wb.sheets[this.active];
    const existing = sheet.merges.filter((m) => m.r1 <= range.r2 && m.r2 >= range.r1 && m.c1 <= range.c2 && m.c2 >= range.c1);
    if (existing.length === 0) return;
    this.structural(() => {
      sheet.merges = sheet.merges.filter((m) => !existing.includes(m));
      this.wb.touch();
    });
  }

  isMerged(): boolean {
    const r = this.selection;
    return this.wb.sheets[this.active].merges.some((m) => m.r1 <= r.r2 && m.r2 >= r.r1 && m.c1 <= r.c2 && m.c2 >= r.c1);
  }

  /** Whether the current selection is inside or intersects any formatted table on the active sheet. */
  isTableActive(): boolean {
    const sheet = this.wb.sheets[this.active];
    if (!sheet?.tables || sheet.tables.length === 0) return false;
    const { r1, r2, c1, c2 } = this.selection;
    return sheet.tables.some(
      (t) => Math.max(r1, t.range.r1) <= Math.min(r2, t.range.r2) && Math.max(c1, t.range.c1) <= Math.min(c2, t.range.c2)
    );
  }

  /** The table at the active cell / selection, or null if none. */
  activeTable(): SheetTable | null {
    const sheet = this.wb.sheets[this.active];
    if (!sheet?.tables || sheet.tables.length === 0) return null;
    const { r1, r2, c1, c2 } = this.selection;
    return (
      sheet.tables.find(
        (t) => Math.max(r1, t.range.r1) <= Math.min(r2, t.range.r2) && Math.max(c1, t.range.c1) <= Math.min(c2, t.range.c2)
      ) ?? null
    );
  }

  /** Creates a structured table from a range with optional header row and filter. */
  createTable(range: RangePos, hasHeaders = true): SheetTable {
    const sheet = this.wb.sheets[this.active];
    const finalRange = { ...range };

    this.selectRange(finalRange);

    const tableId = `tbl_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    const tableName = `Table${(sheet.tables?.length ?? 0) + 1}`;
    const table: SheetTable = {
      id: tableId,
      name: tableName,
      range: finalRange,
      headerRow: hasHeaders,
      totalRow: false,
      bandedRows: true,
      firstCol: false,
      lastCol: false,
      bandedCols: false,
    };

    this.structural(() => {
      if (!sheet.tables) sheet.tables = [];
      sheet.tables.push(table);
      if (hasHeaders) {
        for (let c = finalRange.c1; c <= finalRange.c2; c += 1) {
          const existing = this.wb.getCell(this.active, finalRange.r1, c);
          if (!existing || existing.raw.trim() === '') {
            const defaultName = `Column${c - finalRange.c1 + 1}`;
            this.wb.putCell(this.active, finalRange.r1, c, { raw: defaultName, style: existing?.style ?? 0 });
          }
        }
      }
      this.restyle((style, row) => {
        const isHeader = hasHeaders && row === finalRange.r1;
        const banded = !isHeader && ((row - finalRange.r1 - (hasHeaders ? 1 : 0)) % 2 === 0);
        return {
          ...style,
          bold: isHeader ? true : style.bold,
          color: isHeader ? '#ffffff' : style.color,
          fill: isHeader ? '#107c41' : banded ? '#f2f8f4' : undefined,
          borders: { top: true, right: true, bottom: true, left: true },
        };
      });
      if (hasHeaders && !sheet.filter) {
        sheet.filter = { range: finalRange, excluded: {} };
      }
      this.wb.touch();
    });
    this.emit();
    return table;
  }

  /** Converts the selection (or current region) into a structured table with header, banded rows, and filter. */
  formatAsTable(): SheetTable {
    const sel = this.selection;
    const single = sel.r1 === sel.r2 && sel.c1 === sel.c2;
    const filled = (r: number, c: number) => (this.wb.getCell(this.active, r, c)?.raw ?? '') !== '';
    const range = single ? currentRegion(sel.r1, sel.c1, filled) : { ...sel };
    return this.createTable(range, true);
  }

  /** Converts an existing table back into a normal cell range. */
  convertToRange(): void {
    const table = this.activeTable();
    if (!table) return;
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      sheet.tables = sheet.tables?.filter((t) => t.id !== table.id);
      if (sheet.tables && sheet.tables.length === 0) delete sheet.tables;
      this.wb.touch();
    });
    this.emit();
  }

  /** Resizes the active table to a new range. */
  resizeTable(newRange: RangePos): void {
    const table = this.activeTable();
    if (!table) return;
    this.structural(() => {
      table.range = { ...newRange };
      this.wb.touch();
    });
    this.emit();
  }

  /** Updates the configuration of the active table. */
  updateActiveTable(update: Partial<SheetTable>): void {
    const table = this.activeTable();
    if (!table) return;
    this.structural(() => {
      Object.assign(table, update);
      this.wb.touch();
    });
    this.emit();
  }

  // ----- Charts

  /** The block of data a chart over the selection should read: the selection, or the data around a single cell. */
  private chartRange(): RangePos | null {
    const sel = this.selection;
    const single = sel.r1 === sel.r2 && sel.c1 === sel.c2;
    const filled = (r: number, c: number) => (this.wb.getCell(this.active, r, c)?.raw ?? '') !== '';
    const range = single ? currentRegion(sel.r1, sel.c1, filled) : sel;
    for (let r = range.r1; r <= range.r2; r += 1) for (let c = range.c1; c <= range.c2; c += 1) if (filled(r, c)) return range;
    return null;
  }

  /** Puts a chart of the selected data beside it and selects the chart. Returns false when there is no data. */
  addChart(type: ChartType, stacked = false): boolean {
    this.commitEdit(null);
    const range = this.chartRange();
    if (!range) return false;
    const sheet = this.wb.sheets[this.active];
    const id = `ch${Date.now().toString(36)}${(cfCounter += 1).toString(36)}`;
    this.structural(() => {
      sheet.charts.push({ id, type, ...(stacked && (type === 'column' || type === 'bar' || type === 'area') ? { stacked: true } : {}), range, title: '', row: range.r1, col: range.c2 + 2, dx: 0, dy: 0, width: 420, height: 270 });
      this.wb.touch();
    });
    this.selectedChart = id;
    this.emit();
    return true;
  }

  selectChart(id: string | null): void {
    if (this.selectedChart === id) return;
    this.commitEdit(null);
    this.selectedChart = id;
    this.emit();
  }

  private changeChart(id: string, change: (chart: ChartObject) => ChartObject): void {
    const sheet = this.wb.sheets[this.active];
    if (!sheet.charts.some((c) => c.id === id)) return;
    this.structural(() => {
      sheet.charts = sheet.charts.map((c) => (c.id === id ? change(c) : c));
      this.wb.touch();
    });
  }

  /** Puts a picture at the cursor cell, at most 480 px wide, and selects it. */
  addImage(src: string, naturalWidth: number, naturalHeight: number, alt = ''): string {
    this.commitEdit(null);
    const sheet = this.wb.sheets[this.active];
    const id = `im${Date.now().toString(36)}${(cfCounter += 1).toString(36)}`;
    const scale = Math.min(1, 480 / Math.max(1, naturalWidth));
    const width = Math.max(IMAGE_MIN_SIZE, Math.round(naturalWidth * scale));
    const height = Math.max(IMAGE_MIN_SIZE, Math.round(naturalHeight * scale));
    this.structural(() => {
      sheet.images = [...(sheet.images ?? []), { id, src, alt, row: this.selection.r1, col: this.selection.c1, dx: 0, dy: 0, width, height }];
      this.wb.touch();
    });
    this.selectedChart = id;
    this.emit();
    return id;
  }

  /** Applies a change to the chart or picture with this id. */
  private changeObject(id: string, chart: (c: ChartObject) => ChartObject, image: (i: ImageObject) => ImageObject): void {
    const sheet = this.wb.sheets[this.active];
    if (sheet.images?.some((i) => i.id === id)) {
      this.structural(() => {
        sheet.images = (sheet.images ?? []).map((i) => (i.id === id ? image(i) : i));
        this.wb.touch();
      });
    } else this.changeChart(id, chart);
  }

  moveChart(id: string, anchor: { row: number; col: number; dx: number; dy: number }): void {
    this.changeObject(id, (c) => ({ ...c, ...anchor }), (i) => ({ ...i, ...anchor }));
  }

  resizeChart(id: string, width: number, height: number): void {
    this.changeObject(
      id,
      (c) => ({ ...c, width: Math.max(CHART_MIN_WIDTH, Math.round(width)), height: Math.max(CHART_MIN_HEIGHT, Math.round(height)) }),
      (i) => ({ ...i, width: Math.max(IMAGE_MIN_SIZE, Math.round(width)), height: Math.max(IMAGE_MIN_SIZE, Math.round(height)) }),
    );
  }

  setChartTitle(id: string, title: string): void {
    this.changeChart(id, (c) => ({ ...c, title: title.slice(0, 120) }));
  }

  setChartType(id: string, type: ChartType): void {
    this.changeChart(id, (c) => ({ ...c, type }));
  }

  deleteChart(id: string): void {
    const sheet = this.wb.sheets[this.active];
    const isImage = sheet.images?.some((i) => i.id === id);
    if (!isImage && !sheet.charts.some((c) => c.id === id)) return;
    this.structural(() => {
      if (isImage) sheet.images = (sheet.images ?? []).filter((i) => i.id !== id);
      else sheet.charts = sheet.charts.filter((c) => c.id !== id);
      this.wb.touch();
    });
    if (this.selectedChart === id) this.selectedChart = null;
    this.emit();
  }

  // ----- Conditional formatting

  /** Adds a rule over the selection; the newest rule is the first to apply. */
  addConditionalRule(rule: NewCfRule): void {
    const range = { ...this.selection };
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      sheet.cf.unshift({ ...rule, id: newCfId(), range } as CfRule);
      this.wb.touch();
    });
  }

  /** Removes the rules that touch the selection, active table, or every rule on the sheet. */
  clearConditional(scope: 'selection' | 'sheet' | 'table'): void {
    const sheet = this.wb.sheets[this.active];
    if (sheet.cf.length === 0) return;
    if (scope === 'sheet') {
      this.structural(() => {
        sheet.cf = [];
        this.wb.touch();
      });
      return;
    }
    if (scope === 'table') {
      const table = this.activeTable();
      if (!table) return;
      const tr = table.range;
      const touchesTable = (r: CfRule['range']) => r.r1 <= tr.r2 && r.r2 >= tr.r1 && r.c1 <= tr.c2 && r.c2 >= tr.c1;
      if (!sheet.cf.some((rule) => touchesTable(rule.range))) return;
      this.structural(() => {
        sheet.cf = sheet.cf.filter((rule) => !touchesTable(rule.range));
        this.wb.touch();
      });
      return;
    }
    const sel = this.selection;
    const touches = (r: CfRule['range']) => r.r1 <= sel.r2 && r.r2 >= sel.r1 && r.c1 <= sel.c2 && r.c2 >= sel.c1;
    if (!sheet.cf.some((rule) => touches(rule.range))) return;
    this.structural(() => {
      sheet.cf = sheet.cf.filter((rule) => !touches(rule.range));
      this.wb.touch();
    });
  }

  /** Arms the format painter with the active cell's style, or disarms it. */
  togglePainter(): void {
    this.painter = this.painter ? null : { ...this.activeStyle() };
    this.emit();
  }

  /** Paints the armed style onto the selection, once. */
  paintSelection(): void {
    if (!this.painter) return;
    const style = this.painter;
    this.painter = null;
    this.restyle(() => ({ ...style }));
  }

  // ----- Clipboard

  /** Remembers the selection for pasting inside the app and returns its text for the system clipboard. */
  copy(cut = false): string {
    const ranges = this.copyableBlocks();
    const range = ranges[0];
    const cells: Clipboard['cells'] = [];
    const origin: CellPos[][] = [];
    const lines: string[] = [];
    const sideBySide = ranges.length > 1 && ranges.every((b) => b.r1 === range.r1 && b.r2 === range.r2);
    // Blocks side by side are joined along each row, blocks one above another are joined down the columns.
    for (const block of ranges) {
      for (let r = block.r1; r <= block.r2; r += 1) {
        const row: Array<Cell | undefined> = [];
        const from: CellPos[] = [];
        const shown: string[] = [];
        for (let c = block.c1; c <= block.c2; c += 1) {
          row.push(this.wb.getCell(this.active, r, c));
          from.push({ row: r, col: c });
          shown.push(this.wb.displayAt(this.active, r, c));
        }
        if (sideBySide && block !== range) {
          const at = r - block.r1;
          cells[at].push(...row);
          origin[at].push(...from);
          lines[at] += `\t${shown.join('\t')}`;
        } else {
          cells.push(row);
          origin.push(from);
          lines.push(shown.join('	'));
        }
      }
    }
    const text = lines.join('\n');
    this.clipboard = { range, ranges, origin, cells, cut, text, sheet: this.active };
    this.emit();
    return text;
  }

  /**
   * The blocks a copy takes: all of them when they line up (the same rows, or the same columns, which Excel
   * allows), in order, else only the last one.
   */
  private copyableBlocks(): RangePos[] {
    const blocks = this.blocks;
    if (blocks.length === 1) return blocks;
    const sameRows = blocks.every((b) => b.r1 === blocks[0].r1 && b.r2 === blocks[0].r2);
    const sameCols = blocks.every((b) => b.c1 === blocks[0].c1 && b.c2 === blocks[0].c2);
    if (sameRows) return [...blocks].sort((a, b) => a.c1 - b.c1);
    if (sameCols) return [...blocks].sort((a, b) => a.r1 - b.r1);
    return [this.selection];
  }

  get copiedRange(): RangePos | null {
    return this.clipboard && this.clipboard.sheet === this.active ? this.clipboard.range : null;
  }

  get copiedBlocks(): RangePos[] {
    return this.clipboard && this.clipboard.sheet === this.active ? this.clipboard.ranges : [];
  }

  /**
   * Pastes at the selection's top-left. Text that is what this app copied
   * pastes with formulas moved and formats kept; other text is split into
   * cells by tabs and lines.
   */
  paste(text: string): void {
    this.commitEdit(null);
    const target = this.selection;
    const clip = this.clipboard;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];

    if (clip && text.replace(/\r\n/g, '\n').replace(/\n$/, '') === clip.text) {
      const height = clip.cells.length;
      const width = clip.cells[0].length;
      // Pasted into several blocks, each gets its own copy; with one block it is the selection, as before.
      const targets = this.blocks.length > 1 && clip.ranges.length === 1 ? this.blocks : [target];
      let rows = height;
      let cols = width;
      for (const block of targets) {
        // A single cell fills a larger selection.
        rows = height === 1 && width === 1 ? block.r2 - block.r1 + 1 : height;
        cols = height === 1 && width === 1 ? block.c2 - block.c1 + 1 : width;
        for (let r = 0; r < rows; r += 1)
          for (let c = 0; c < cols; c += 1) {
            const source = clip.cells[r % height][c % width];
            const row = block.r1 + r;
            const col = block.c1 + c;
            if (!source) edits.push({ row, col, after: undefined });
            else {
              const from = clip.origin[r % height][c % width];
              edits.push({ row, col, after: { raw: source.raw.startsWith('=') ? shiftFormula(source.raw, row - from.row, col - from.col) : source.raw, style: source.style } });
            }
          }
      }
      if (clip.cut) {
        for (const block of clip.ranges)
          for (let r = block.r1; r <= block.r2; r += 1)
            for (let c = block.c1; c <= block.c2; c += 1)
              if (!edits.some((e) => e.row === r && e.col === c)) edits.push({ row: r, col: c, after: undefined });
        this.clipboard = null;
      }
      this.apply(edits, this.active);
      this.selectRange({ r1: target.r1, c1: target.c1, r2: target.r1 + rows - 1, c2: target.c1 + cols - 1 });
      return;
    }

    const grid = parseTsv(text);
    grid.forEach((line, r) =>
      line.forEach((value, c) => {
        const row = target.r1 + r;
        const col = target.c1 + c;
        const existing = this.wb.getCell(this.active, row, col);
        const style = this.wb.styleOf(existing?.style ?? 0);
        const entry = interpretEntry(value, style.numFmt);
        const styleId = entry.numFmt ? this.wb.styleId({ ...style, numFmt: entry.numFmt }) : (existing?.style ?? 0);
        edits.push({ row, col, after: { raw: entry.raw, style: styleId } });
      }),
    );
    this.apply(edits);
    this.selectRange({ r1: target.r1, c1: target.c1, r2: target.r1 + grid.length - 1, c2: target.c1 + Math.max(...grid.map((l) => l.length)) - 1 });
  }

  /**
   * Paste Special from what was last copied here: only the values (formats of
   * the target stay), only the formulas, only the formats, or everything turned
   * on its side. False when there is nothing to paste or it was cut.
   */
  pasteSpecial(kind: 'values' | 'formulas' | 'formats' | 'transpose'): boolean {
    const clip = this.clipboard;
    if (!clip || clip.cut) return false;
    this.commitEdit(null);
    const target = this.selection;
    const height = clip.cells.length;
    const width = clip.cells[0].length;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    const place = (row: number, col: number, source: Cell | undefined, srcRow: number, srcCol: number) => {
      const existing = this.wb.getCell(this.active, row, col);
      const raw = source?.raw ?? '';
      // Turned on its side, a formula keeps pointing at the cells it pointed at: moving its references along the other axis would send them off the sheet.
      const moved = raw.startsWith('=') && kind !== 'transpose' ? shiftFormula(raw, row - srcRow, col - srcCol) : raw;
      if (kind === 'formats') edits.push({ row, col, after: { raw: existing?.raw ?? '', style: source?.style ?? 0 } });
      else if (kind === 'values') edits.push({ row, col, after: { raw: this.rawOfValue(clip.sheet, srcRow, srcCol), style: existing?.style ?? 0 } });
      else if (kind === 'formulas') edits.push({ row, col, after: { raw: moved, style: existing?.style ?? 0 } });
      else edits.push({ row, col, after: source ? { raw: moved, style: source.style } : undefined });
    };
    for (let r = 0; r < height; r += 1)
      for (let c = 0; c < width; c += 1) {
        const [row, col] = kind === 'transpose' ? [target.r1 + c, target.c1 + r] : [target.r1 + r, target.c1 + c];
        place(row, col, clip.cells[r][c], clip.origin[r][c].row, clip.origin[r][c].col);
      }
    this.apply(edits, this.active);
    const [rows, cols] = kind === 'transpose' ? [width, height] : [height, width];
    this.selectRange({ r1: target.r1, c1: target.c1, r2: target.r1 + rows - 1, c2: target.c1 + cols - 1 });
    return true;
  }

  /** What to store so that a cell holds exactly the value another cell shows now, without the formula behind it. */
  private rawOfValue(sheet: number, row: number, col: number): string {
    const value = this.wb.valueAt(sheet, row, col);
    if (value === null) return '';
    if (isError(value)) return value.code;
    if (typeof value === 'number') return String(value);
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    // Text that would be read as a number, a formula or a flag on its way back in keeps an apostrophe.
    return /^[=+\-@'#]/.test(value) || parseNumber(value) !== null || /^(true|false)$/i.test(value) ? `'${value}` : value;
  }

  // ----- Fill

  /** Copies the top row of the selection down (formulas move with it). */
  fillDown(): void {
    const { r1, c1, r2, c2 } = this.selection;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    for (let c = c1; c <= c2; c += 1) {
      const source = this.wb.getCell(this.active, r1, c);
      for (let r = r1 + 1; r <= r2; r += 1)
        edits.push({ row: r, col: c, after: source ? { raw: source.raw.startsWith('=') ? shiftFormula(source.raw, r - r1, 0) : source.raw, style: source.style } : undefined });
    }
    this.apply(edits);
  }

  fillRight(): void {
    const { r1, c1, r2, c2 } = this.selection;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    for (let r = r1; r <= r2; r += 1) {
      const source = this.wb.getCell(this.active, r, c1);
      for (let c = c1 + 1; c <= c2; c += 1)
        edits.push({ row: r, col: c, after: source ? { raw: source.raw.startsWith('=') ? shiftFormula(source.raw, 0, c - c1) : source.raw, style: source.style } : undefined });
    }
    this.apply(edits);
  }

  fillUp(): void {
    const { r1, c1, r2, c2 } = this.selection;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    for (let c = c1; c <= c2; c += 1) {
      const source = this.wb.getCell(this.active, r2, c);
      for (let r = r1; r < r2; r += 1)
        edits.push({ row: r, col: c, after: source ? { raw: source.raw.startsWith('=') ? shiftFormula(source.raw, r - r2, 0) : source.raw, style: source.style } : undefined });
    }
    this.apply(edits);
  }

  fillLeft(): void {
    const { r1, c1, r2, c2 } = this.selection;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    for (let r = r1; r <= r2; r += 1) {
      const source = this.wb.getCell(this.active, r, c2);
      for (let c = c1; c < c2; c += 1)
        edits.push({ row: r, col: c, after: source ? { raw: source.raw.startsWith('=') ? shiftFormula(source.raw, 0, c - c2) : source.raw, style: source.style } : undefined });
    }
    this.apply(edits);
  }

  /**
   * Extends `source` over `target` (the fill handle): a run of two or more
   * numbers continues as a series, anything else repeats, and formulas move.
   */
  fillSeries(source: RangePos, target: RangePos): void {
    const down = target.r2 > source.r2 || target.r1 < source.r1;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    const lines = down ? source.c2 - source.c1 + 1 : source.r2 - source.r1 + 1;
    for (let line = 0; line < lines; line += 1) {
      const cellAt = (i: number) => (down ? this.wb.getCell(this.active, source.r1 + i, source.c1 + line) : this.wb.getCell(this.active, source.r1 + line, source.c1 + i));
      const length = down ? source.r2 - source.r1 + 1 : source.c2 - source.c1 + 1;
      const numbers = Array.from({ length }, (_, i) => {
        const raw = cellAt(i)?.raw ?? '';
        return /^-?\d+(\.\d+)?$/.test(raw) ? Number(raw) : null;
      });
      const step = length >= 2 && numbers.every((n) => n !== null) ? (numbers[length - 1] as number) - (numbers[length - 2] as number) : null;
      const start = down ? (target.r1 < source.r1 ? target.r1 : source.r2 + 1) : target.c1 < source.c1 ? target.c1 : source.c2 + 1;
      const end = down ? (target.r1 < source.r1 ? source.r1 - 1 : target.r2) : target.c1 < source.c1 ? source.c1 - 1 : target.c2;
      for (let pos = start; pos <= end; pos += 1) {
        const offset = pos - (down ? source.r1 : source.c1);
        const src = cellAt(((offset % length) + length) % length);
        const row = down ? pos : source.r1 + line;
        const col = down ? source.c1 + line : pos;
        if (!src) {
          edits.push({ row, col, after: undefined });
        } else if (step !== null) {
          const last = numbers[length - 1] as number;
          const first = numbers[0] as number;
          const value = offset >= length ? last + step * (offset - length + 1) : first + step * offset;
          edits.push({ row, col, after: { raw: String(Number(value.toPrecision(15))), style: src.style } });
        } else {
          const dRow = row - (down ? source.r1 + (((offset % length) + length) % length) : source.r1 + line);
          const dCol = col - (down ? source.c1 + line : source.c1 + (((offset % length) + length) % length));
          edits.push({ row, col, after: { raw: src.raw.startsWith('=') ? shiftFormula(src.raw, dRow, dCol) : src.raw, style: src.style } });
        }
      }
    }
    this.apply(edits);
    this.selectRange({ r1: Math.min(source.r1, target.r1), c1: Math.min(source.c1, target.c1), r2: Math.max(source.r2, target.r2), c2: Math.max(source.c2, target.c2) });
  }

  // ----- AutoSum

  /** SUM of the numbers above (or to the left of) the cell, or of each column of a selection. */
  autoSum(fn = 'SUM'): void {
    const range = this.selection;
    const sheet = this.active;
    const isNumber = (r: number, c: number) => typeof this.wb.valueAt(sheet, r, c) === 'number';
    if (range.r1 !== range.r2 || range.c1 !== range.c2) {
      const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
      for (let c = range.c1; c <= range.c2; c += 1) {
        let hasNumber = false;
        for (let r = range.r1; r <= range.r2; r += 1) hasNumber ||= isNumber(r, c);
        if (hasNumber) edits.push({ row: range.r2 + 1, col: c, after: { raw: `=${fn}(${columnName(c)}${range.r1 + 1}:${columnName(c)}${range.r2 + 1})`, style: this.wb.getCell(sheet, range.r2 + 1, c)?.style ?? 0 } });
      }
      this.apply(edits);
      return;
    }
    const { row, col } = range.r1 === range.r2 ? { row: range.r1, col: range.c1 } : this.anchor;
    let top = row - 1;
    while (top >= 0 && isNumber(top, col)) top -= 1;
    top += 1;
    let formula: string | null = null;
    if (top < row) formula = `=${fn}(${columnName(col)}${top + 1}:${columnName(col)}${row})`;
    else {
      let left = col - 1;
      while (left >= 0 && isNumber(row, left)) left -= 1;
      left += 1;
      if (left < col) formula = `=${fn}(${columnName(left)}${row + 1}:${columnName(col - 1)}${row + 1})`;
    }
    if (formula) this.apply([{ row, col, after: { raw: formula, style: this.wb.getCell(sheet, row, col)?.style ?? 0 } }]);
    else this.startEdit(`=${fn}()`);
  }

  // ----- Sort

  /** Sorts the selected rows by a column inside it (0 = its first column); blanks go last. */
  sortSelection(byColumn: number, ascending: boolean): void {
    this.sortRows(this.selection, byColumn, ascending);
  }

  /**
   * Data ▸ Sort with several levels: rows are ordered by the first key, ties by the next, and so on;
   * blanks and errors go last whichever way a key runs. A selection of one cell stands for the data around it.
   */
  sortByKeys(keys: Array<{ column: number; ascending: boolean }>, hasHeader: boolean): void {
    const sel = this.selection;
    const single = sel.r1 === sel.r2 && sel.c1 === sel.c2;
    const filled = (r: number, c: number) => (this.wb.getCell(this.active, r, c)?.raw ?? '') !== '';
    const range = single ? currentRegion(sel.r1, sel.c1, filled) : sel;
    this.sortRows({ ...range, r1: hasHeader ? range.r1 + 1 : range.r1 }, keys);
  }

  private sortRows(range: RangePos, byColumn: number | Array<{ column: number; ascending: boolean }>, ascending = true): void {
    const keys = typeof byColumn === 'number' ? [{ column: byColumn, ascending }] : byColumn;
    const { r1, c1, r2, c2 } = range;
    if (r1 >= r2 || keys.length === 0) return;
    const sheet = this.active;
    const rows = Array.from({ length: r2 - r1 + 1 }, (_, i) => r1 + i);
    const missing = (v: Scalar) => v === null || isError(v);
    const sorted = [...rows].sort((a, b) => {
      for (const key of keys) {
        const ka = this.wb.valueAt(sheet, a, c1 + key.column);
        const kb = this.wb.valueAt(sheet, b, c1 + key.column);
        if (missing(ka) || missing(kb)) {
          if (missing(ka) && missing(kb)) continue;
          return missing(ka) ? 1 : -1;
        }
        const order = compareValues(ka, kb);
        if (order !== 0) return key.ascending ? order : -order;
      }
      return a - b;
    });
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    sorted.forEach((from, i) => {
      const to = r1 + i;
      for (let c = c1; c <= c2; c += 1) {
        const cell = this.wb.getCell(sheet, from, c);
        edits.push({ row: to, col: c, after: cell ? { raw: cell.raw.startsWith('=') ? shiftFormula(cell.raw, to - from, 0) : cell.raw, style: cell.style } : undefined });
      }
    });
    this.apply(edits);
  }

  /**
   * Data ▸ Remove Duplicates: of the rows that read the same (by what they show, without regard to case)
   * only the first stays, the rest of the selection moving up. A single cell stands for the block of data
   * around it. Returns how many rows went.
   */
  removeDuplicates(hasHeader: boolean): number {
    const sel = this.selection;
    const single = sel.r1 === sel.r2 && sel.c1 === sel.c2;
    const filled = (r: number, c: number) => (this.wb.getCell(this.active, r, c)?.raw ?? '') !== '';
    const { r1, c1, r2, c2 } = single ? currentRegion(sel.r1, sel.c1, filled) : sel;
    const first = hasHeader ? r1 + 1 : r1;
    const seen = new Set<string>();
    const keep: number[] = [];
    for (let r = first; r <= r2; r += 1) {
      const key = Array.from({ length: c2 - c1 + 1 }, (_v, i) => this.wb.displayAt(this.active, r, c1 + i).toLocaleLowerCase()).join('');
      if (seen.has(key)) continue;
      seen.add(key);
      keep.push(r);
    }
    const removed = r2 - first + 1 - keep.length;
    if (removed <= 0) return 0;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    keep.forEach((from, i) => {
      const to = first + i;
      if (to === from) return;
      for (let c = c1; c <= c2; c += 1) {
        const cell = this.wb.getCell(this.active, from, c);
        edits.push({ row: to, col: c, after: cell ? { raw: cell.raw.startsWith('=') ? shiftFormula(cell.raw, to - from, 0) : cell.raw, style: cell.style } : undefined });
      }
    });
    for (let r = first + keep.length; r <= r2; r += 1) for (let c = c1; c <= c2; c += 1) edits.push({ row: r, col: c, after: undefined });
    this.apply(edits);
    return removed;
  }

  /** Data ▸ Text to Columns: each selected cell is cut at the delimiter into the cells to its right. Returns how many cells were split. */
  textToColumns(delimiter: string): number {
    if (delimiter === '') return 0;
    const { r1, c1, r2 } = this.selection;
    const edits: Array<{ row: number; col: number; after: Cell | undefined }> = [];
    let split = 0;
    for (let r = r1; r <= r2; r += 1) {
      const cell = this.wb.getCell(this.active, r, c1);
      if (!cell || cell.raw === '' || cell.raw.startsWith('=')) continue;
      const parts = (this.wb.valueAt(this.active, r, c1) === null ? cell.raw : this.wb.displayAt(this.active, r, c1)).split(delimiter);
      if (parts.length < 2) continue;
      split += 1;
      parts.forEach((part, i) => {
        const existing = this.wb.getCell(this.active, r, c1 + i);
        const style = this.wb.styleOf(existing?.style ?? 0);
        const entry = interpretEntry(part.trim(), style.numFmt);
        edits.push({ row: r, col: c1 + i, after: { raw: entry.raw, style: entry.numFmt ? this.wb.styleId({ ...style, numFmt: entry.numFmt }) : (existing?.style ?? 0) } });
      });
    }
    this.apply(edits);
    return split;
  }

  // ----- Summary (PivotTable-style)

  /** The table a summary would read, with its header row: the selection, or the data around the cursor. Null when there is none to read. */
  summarySource(): { range: RangePos; headers: string[] } | null {
    const sel = this.selection;
    const single = sel.r1 === sel.r2 && sel.c1 === sel.c2;
    const filled = (r: number, c: number) => (this.wb.getCell(this.active, r, c)?.raw ?? '') !== '';
    const range = single ? currentRegion(sel.r1, sel.c1, filled) : sel;
    return range.r2 > range.r1 ? this.sourceWithHeaders(range) : null;
  }

  private sourceWithHeaders(range: RangePos): { range: RangePos; headers: string[] } {
    const headers: string[] = [];
    for (let c = range.c1; c <= range.c2; c += 1) {
      const text = this.wb.displayAt(this.active, range.r1, c).trim();
      headers.push(text || columnName(c));
    }
    return { range, headers };
  }

  /**
   * Writes a summary of `source` (header row included) on a new sheet, from its
   * top-left cell, in one undo step, and moves there. Throws a
   * `SummaryTooLargeError` when the categories would not fit.
   */
  insertSummary(options: { source: RangePos; rowColumn: number; columnColumn: number | null; valueColumn: number; fn: SummaryFn }, labels: SummaryLabels): void {
    this.commitEdit(null);
    const sheetIndex = this.active;
    const sheetName = this.wb.sheets[sheetIndex].name;
    const summary = buildSummary(
      { sheet: sheetName, ...options },
      { row: 0, col: 0 },
      (r, c) => this.wb.valueAt(sheetIndex, r, c),
      (r, c) => this.wb.displayAt(sheetIndex, r, c),
      labels,
    );
    this.structural(() => {
      let n = 1;
      while (this.wb.sheetIndex(`${labels.sheetName}${n === 1 ? '' : ` ${n}`}`) >= 0) n += 1;
      const sheet = newSheet(`${labels.sheetName}${n === 1 ? '' : ` ${n}`}`);
      const header = this.wb.styleId({ bold: true, fill: '#e2e8f0' });
      for (const cell of summary.cells) {
        const style = cell.header ? header : 0;
        sheet.cells.set(cellKey(cell.row, cell.col), { raw: cell.raw, style });
      }
      sheet.colWidths.set(0, 160);
      sheet.summary = { sheet: sheetName, ...options, corner: labels.corner, total: labels.total };
      this.wb.sheets.push(sheet);
      this.active = this.wb.sheets.length - 1;
      this.selectedChart = null;
      this.anchor = this.focus = { row: 0, col: 0 };
    this.cursor = null;
      this.wb.touch();
    });
  }

  /** How the sheet on show was made, when it is a summary. */
  get summaryConfig(): SummaryConfig | undefined {
    return this.wb.sheets[this.active].summary;
  }

  /**
   * Makes the summary on show again from its data as it is now: new categories
   * appear, vanished ones go, rows added under the source are read. Formats the
   * user gave cells that are still there are kept. One undo step. False when
   * this is not a summary or its source sheet is gone.
   */
  refreshSummary(): boolean {
    this.commitEdit(null);
    const plan = this.planSummary(this.active);
    if (!plan) return false;
    this.structural(() => {
      this.writeSummary(plan);
      this.selectedChart = null;
    });
    return true;
  }

  /** What a summary sheet would hold if made again now, or null when it is not a summary or its data is gone. */
  private planSummary(index: number) {
    const sheet = this.wb.sheets[index];
    const config = sheet?.summary;
    if (!config) return null;
    const sourceIndex = this.wb.sheetIndex(config.sheet);
    if (sourceIndex < 0) return null;
    const { c1, c2 } = config.source;
    const filledRow = (r: number) => {
      for (let c = c1; c <= c2; c += 1) if ((this.wb.getCell(sourceIndex, r, c)?.raw ?? '') !== '') return true;
      return false;
    };
    // The source follows its data downwards.
    let r2 = config.source.r2;
    while (r2 + 1 < MAX_ROWS && filledRow(r2 + 1)) r2 += 1;
    const source = { ...config.source, r2 };
    const built = buildSummary(
      { sheet: config.sheet, source, rowColumn: config.rowColumn, columnColumn: config.columnColumn, valueColumn: config.valueColumn, fn: config.fn },
      { row: 0, col: 0 },
      (r, c) => this.wb.valueAt(sourceIndex, r, c),
      (r, c) => this.wb.displayAt(sourceIndex, r, c),
      { sheetName: sheet.name, corner: config.corner, total: config.total },
    );
    return { sheet, config, source, built };
  }

  private writeSummary(plan: NonNullable<ReturnType<CalcController['planSummary']>>): void {
    const { sheet, config, source, built } = plan;
    const header = this.wb.styleId({ bold: true, fill: '#e2e8f0' });
    const old = sheet.cells;
    sheet.cells = new Map();
    for (const cell of built.cells) {
      const key = cellKey(cell.row, cell.col);
      sheet.cells.set(key, { raw: cell.raw, style: old.get(key)?.style ?? (cell.header ? header : 0) });
    }
    sheet.summary = { ...config, source };
    this.wb.touch();
  }

  /**
   * Keeps every summary in step with its data: when a change to a source sheet brings or takes away a category
   * (or a row under the source), the summary is made again. This is not an undo step of its own: undoing the
   * change brings the summary back with it.
   */
  private keepSummariesCurrent(changed: Change[]): void {
    if (this.refreshing || changed.length === 0) return;
    const touched = new Set(changed.map((c) => this.wb.sheets[c.sheet]?.name));
    this.refreshing = true;
    try {
      this.wb.sheets.forEach((sheet, index) => {
        if (!sheet.summary || !touched.has(sheet.summary.sheet)) return;
        const plan = this.planSummary(index);
        if (!plan) return;
        const same = plan.built.cells.length === sheet.cells.size && plan.built.cells.every((cell) => sheet.cells.get(cellKey(cell.row, cell.col))?.raw === cell.raw);
        if (!same) this.writeSummary(plan);
      });
    } finally {
      this.refreshing = false;
    }
  }

  private refreshing = false;

  // ----- Filter

  get filter(): FilterState | undefined {
    return this.wb.sheets[this.active].filter;
  }

  /** Puts a filter on the selected block (or the data around the cursor), or takes it off. False when there is no data to filter. */
  toggleFilter(): boolean {
    this.commitEdit(null);
    const sheet = this.wb.sheets[this.active];
    if (sheet.filter) {
      this.structural(() => {
        delete sheet.filter;
        this.wb.touch();
      });
      return true;
    }
    const sel = this.selection;
    const single = sel.r1 === sel.r2 && sel.c1 === sel.c2;
    const filled = (r: number, c: number) => (this.wb.getCell(this.active, r, c)?.raw ?? '') !== '';
    const range = single ? currentRegion(sel.r1, sel.c1, filled) : sel;
    if (range.r2 <= range.r1 && range.c2 <= range.c1) return false;
    this.structural(() => {
      sheet.filter = { range: { ...range, r2: Math.max(range.r2, range.r1 + 1) }, excluded: {} };
      this.wb.touch();
    });
    return true;
  }

  /** The distinct texts shown in a filtered column's records, in order, with how many rows each has and whether the filter hides them. */
  filterValues(col: number): Array<{ value: string; count: number; hidden: boolean }> {
    const filter = this.filter;
    if (!filter) return [];
    const counts = new Map<string, { count: number; sample: Scalar }>();
    for (let r = filter.range.r1 + 1; r <= filter.range.r2; r += 1) {
      const shown = this.wb.displayAt(this.active, r, col);
      const entry = counts.get(shown);
      if (entry) entry.count += 1;
      else counts.set(shown, { count: 1, sample: this.wb.valueAt(this.active, r, col) });
    }
    const excluded = new Set(filter.excluded[col] ?? []);
    return [...counts]
      .sort(([, a], [, b]) => {
        if (a.sample === null || isError(a.sample)) return b.sample === null || isError(b.sample) ? 0 : 1;
        if (b.sample === null || isError(b.sample)) return -1;
        return compareValues(a.sample, b.sample);
      })
      .map(([value, { count }]) => ({ value, count, hidden: excluded.has(value) }));
  }

  /** Hides the records whose text in this column is one of `excluded` (none = show them all again). */
  setFilterExcluded(col: number, excluded: string[]): void {
    const sheet = this.wb.sheets[this.active];
    const filter = sheet.filter;
    if (!filter) return;
    const next = { ...filter.excluded };
    if (excluded.length === 0) delete next[col];
    else next[col] = [...excluded];
    this.structural(() => {
      sheet.filter = { range: filter.range, excluded: next, ...(filter.conditions ? { conditions: filter.conditions } : {}) };
      this.wb.touch();
    });
  }

  /** Whether any column of the filter hides records. */
  get filterActive(): boolean {
    const filter = this.filter;
    return !!filter && (Object.keys(filter.excluded).length > 0 || Object.keys(filter.conditions ?? {}).length > 0);
  }

  /** Filters a column by a condition (contains, greater than...); null takes the condition off. */
  setFilterCondition(col: number, condition: FilterCondition | null): void {
    const sheet = this.wb.sheets[this.active];
    const filter = sheet.filter;
    if (!filter) return;
    const next = { ...(filter.conditions ?? {}) };
    if (condition === null) delete next[col];
    else next[col] = { ...condition };
    this.structural(() => {
      sheet.filter = { range: filter.range, excluded: filter.excluded, ...(Object.keys(next).length ? { conditions: next } : {}) };
      this.wb.touch();
    });
  }

  clearFilterCriteria(): void {
    const sheet = this.wb.sheets[this.active];
    if (!sheet.filter || !this.filterActive) return;
    const { range } = sheet.filter;
    this.structural(() => {
      sheet.filter = { range, excluded: {} };
      this.wb.touch();
    });
  }

  reapplyFilter(): void {
    const sheet = this.wb.sheets[this.active];
    if (!sheet.filter) return;
    this.structural(() => {
      this.wb.touch();
    });
  }

  /** Sorts the filter's records (everything under the header row) by a column. */
  sortFilterColumn(col: number, ascending: boolean): void {
    const filter = this.filter;
    if (!filter || col < filter.range.c1 || col > filter.range.c2) return;
    this.sortRows({ ...filter.range, r1: filter.range.r1 + 1 }, col - filter.range.c1, ascending);
  }

  // ----- Find and replace

  findAll(query: string, matchCase: boolean): CellPos[] {
    if (!query) return [];
    const needle = matchCase ? query : query.toLocaleLowerCase();
    const out: CellPos[] = [];
    for (const key of [...this.wb.sheets[this.active].cells.keys()].sort((a, b) => a - b)) {
      const row = keyRow(key);
      const col = keyCol(key);
      const shown = this.wb.displayAt(this.active, row, col);
      const raw = this.wb.getCell(this.active, row, col)?.raw ?? '';
      const hay = (text: string) => (matchCase ? text : text.toLocaleLowerCase());
      if (hay(shown).includes(needle) || hay(raw).includes(needle)) out.push({ row, col });
    }
    return out.sort((a, b) => a.row - b.row || a.col - b.col);
  }

  /** Replaces text inside the raw contents of matching cells; returns how many cells changed. */
  replaceAll(query: string, replacement: string, matchCase: boolean): number {
    if (!query) return 0;
    const pattern = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), matchCase ? 'g' : 'gi');
    const edits = this.findAll(query, matchCase).flatMap(({ row, col }) => {
      const cell = this.wb.getCell(this.active, row, col);
      if (!cell || !pattern.test(cell.raw)) return [];
      pattern.lastIndex = 0;
      return [{ row, col, after: { raw: cell.raw.replace(pattern, () => replacement), style: cell.style } }];
    });
    this.apply(edits);
    return edits.length;
  }

  // ----- Rows, columns, sheets

  insertRows(): void {
    this.lastRepeat = () => this.insertRows();
    const { r1, r2 } = this.selection;
    this.structural(() => this.wb.editStructure(this.active, { axis: 'row', at: r1, count: r2 - r1 + 1, mode: 'insert' }));
  }

  deleteRows(): void {
    this.lastRepeat = () => this.deleteRows();
    const { r1, r2 } = this.selection;
    this.structural(() => this.wb.editStructure(this.active, { axis: 'row', at: r1, count: r2 - r1 + 1, mode: 'delete' }));
  }

  insertColumns(): void {
    this.lastRepeat = () => this.insertColumns();
    const { c1, c2 } = this.selection;
    this.structural(() => this.wb.editStructure(this.active, { axis: 'col', at: c1, count: c2 - c1 + 1, mode: 'insert' }));
  }

  deleteColumns(): void {
    this.lastRepeat = () => this.deleteColumns();
    const { c1, c2 } = this.selection;
    this.structural(() => this.wb.editStructure(this.active, { axis: 'col', at: c1, count: c2 - c1 + 1, mode: 'delete' }));
  }

  /** Rows and columns frozen on the active sheet. */
  get frozen(): { rows: number; cols: number } {
    const freeze = this.wb.sheets[this.active].freeze;
    return { rows: freeze?.rows ?? 0, cols: freeze?.cols ?? 0 };
  }

  get hideZeros(): boolean {
    return !!this.wb.sheets[this.active]?.hideZeros;
  }

  setHideZeros(hide: boolean): void {
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      if (hide) sheet.hideZeros = true;
      else delete sheet.hideZeros;
      this.wb.touch();
    });
  }

  /** Freezes the first `rows` rows and `cols` columns of the active sheet (0, 0 unfreezes). */
  setFreeze(rows: number, cols: number): void {
    const sheet = this.wb.sheets[this.active];
    const next = { rows: clamp(Math.floor(rows), 0, 100), cols: clamp(Math.floor(cols), 0, 50) };
    if (next.rows === this.frozen.rows && next.cols === this.frozen.cols) return;
    this.structuralAnywhere(() => {
      if (next.rows === 0 && next.cols === 0) delete sheet.freeze;
      else sheet.freeze = next;
      this.wb.touch();
    });
  }

  /** Freezes everything above and to the left of the cursor cell, as Excel's "Freeze Panes". */
  freezeAtCursor(): void {
    this.setFreeze(this.selection.r1, this.selection.c1);
  }

  // ----- Links and notes

  /** The address a cell links to. */
  linkAt(row: number, col: number): string | undefined {
    return this.wb.sheets[this.active].links?.get(cellKey(row, col));
  }

  noteAt(row: number, col: number): string | undefined {
    return this.commentAt(row, col)?.text;
  }

  /** Links the selected cells to an address, or takes the link off with null. An empty cell shows the address. */
  setLink(url: string | null): void {
    const sheet = this.wb.sheets[this.active];
    const address = url?.trim() ?? '';
    this.structural(() => {
      sheet.links ??= new Map();
      for (const { row, col } of this.selectedCells()) {
        const key = cellKey(row, col);
        if (address === '') sheet.links.delete(key);
        else {
          sheet.links.set(key, address);
          if (!(sheet.cells.get(key)?.raw ?? '')) sheet.cells.set(key, { raw: address, style: sheet.cells.get(key)?.style ?? 0 });
        }
      }
      this.wb.touch();
    });
  }

  /** Writes a note on the active cell, or takes it off with an empty text. */
  setNote(text: string | null, author = ''): void {
    const { row, col } = this.activeCell;
    this.setComment(row, col, text ?? '', author);
  }

  // ----- Names

  /** Names the selection (or whatever `refersTo` says); false when the name is not allowed. */
  defineName(name: string, refersTo?: string): boolean {
    const target = refersTo ?? absoluteAddress(this.wb.sheets[this.active].name, this.selection);
    const before = this.wb.toData();
    if (!isValidName(name) || !this.wb.setName(name, target)) return false;
    // Taken back through the same snapshot the other structural changes use.
    this.pushHistory({ kind: 'data', before, after: this.wb.toData(), beforeActive: this.active, afterActive: this.active });
    this.emit();
    return true;
  }

  /**
   * Ctrl+Shift+F3: names the cells next to the labels in the selection's top row (when that row is all text),
   * else in its left column, after the labels (spaces and other characters a name cannot hold become `_`).
   * Returns how many names were made.
   */
  namesFromSelection(): number {
    const { r1, c1, r2, c2 } = this.selection;
    const sheet = this.wb.sheets[this.active].name;
    const label = (r: number, c: number) => this.wb.displayAt(this.active, r, c);
    const isText = (r: number, c: number) => label(r, c) !== '' && typeof this.wb.valueAt(this.active, r, c) === 'string';
    const all = (cells: Array<[number, number]>) => cells.length > 0 && cells.every(([r, c]) => isText(r, c));
    const row = (r: number) => Array.from({ length: c2 - c1 + 1 }, (_, i): [number, number] => [r, c1 + i]);
    const column = (c: number) => Array.from({ length: r2 - r1 + 1 }, (_, i): [number, number] => [r1 + i, c]);
    const made: Array<[string, string]> = [];
    const nameOf = (text: string) => {
      const clean = text.trim().replace(/[^\p{L}\p{N}_.]/gu, '_');
      return /^[\p{L}_]/u.test(clean) ? clean : `_${clean}`;
    };
    if (r2 > r1 && all(row(r1))) {
      for (let c = c1; c <= c2; c += 1) made.push([nameOf(label(r1, c)), absoluteAddress(sheet, { r1: r1 + 1, c1: c, r2, c2: c })]);
    } else if (c2 > c1 && all(column(c1))) {
      for (let r = r1; r <= r2; r += 1) made.push([nameOf(label(r, c1)), absoluteAddress(sheet, { r1: r, c1: c1 + 1, r2: r, c2 })]);
    }
    const before = this.wb.toData();
    const count = made.filter(([name, target]) => isValidName(name) && this.wb.setName(name, target)).length;
    if (count > 0) {
      this.pushHistory({ kind: 'data', before, after: this.wb.toData(), beforeActive: this.active, afterActive: this.active });
      this.emit();
    }
    return count;
  }

  deleteName(name: string): void {
    const before = this.wb.toData();
    this.wb.deleteName(name);
    this.pushHistory({ kind: 'data', before, after: this.wb.toData(), beforeActive: this.active, afterActive: this.active });
    this.emit();
  }

  /** Selects the cells a name refers to, on its own sheet; false when it is not a name of a block of cells. */
  goToName(name: string): boolean {
    const tree = this.wb.nameTree(name);
    if (!tree || (tree.t !== 'ref' && tree.t !== 'range')) return false;
    const from = tree.t === 'ref' ? tree : tree.from;
    const to = tree.t === 'ref' ? tree : tree.to;
    const sheet = tree.sheet === null ? this.active : this.wb.sheetIndex(tree.sheet);
    if (sheet < 0) return false;
    this.switchSheet(sheet);
    this.selectRange({ r1: Math.min(from.row, to.row), c1: Math.min(from.col, to.col), r2: Math.max(from.row, to.row), c2: Math.max(from.col, to.col) });
    return true;
  }

  /** Data > Group / Ungroup: one more (or one less) outline level on the selected rows, or columns when axis is col. */
  groupLines(axis: 'row' | 'col', delta: 1 | -1): void {
    const sheet = this.wb.sheets[this.active];
    const [from, to] = axis === 'row' ? [this.selection.r1, this.selection.r2] : [this.selection.c1, this.selection.c2];
    const key = axis === 'row' ? 'rowLevels' : 'colLevels';
    this.structural(() => {
      const levels = (sheet[key] ??= new Map());
      for (let i = from; i <= to; i += 1) {
        const next = Math.max(0, Math.min(7, (levels.get(i) ?? 0) + delta));
        if (next > 0) levels.set(i, next);
        else levels.delete(i);
      }
      if (levels.size === 0) delete sheet[key];
      this.wb.touch();
    });
  }

  /** The group of rows that ends just above `row` (its summary row): its first and last row and level, or null when `row` follows no group. */
  groupAbove(row: number, axis: 'row' | 'col' = 'row'): { from: number; to: number; collapsed: boolean } | null {
    const levels = axis === 'row' ? this.wb.sheets[this.active].rowLevels : this.wb.sheets[this.active].colLevels;
    const level = levels?.get(row - 1) ?? 0;
    if (!levels || level === 0 || (levels.get(row) ?? 0) >= level) return null;
    let from = row - 1;
    while (from > 0 && (levels.get(from - 1) ?? 0) >= level) from -= 1;
    const hidden = axis === 'row' ? this.wb.sheets[this.active].rowsHidden : this.wb.sheets[this.active].colsHidden;
    return { from, to: row - 1, collapsed: !!hidden?.has(row - 1) };
  }

  /** The + or - button of a group: hides its rows, or shows them again. */
  toggleGroupAbove(row: number, axis: 'row' | 'col' = 'row'): void {
    const group = this.groupAbove(row, axis);
    if (!group) return;
    const sheet = this.wb.sheets[this.active];
    const key = axis === 'row' ? 'rowsHidden' : 'colsHidden';
    this.structural(() => {
      const hidden = (sheet[key] ??= new Set());
      for (let r = group.from; r <= group.to; r += 1) {
        if (group.collapsed) hidden.delete(r);
        else hidden.add(r);
      }
      if (hidden.size === 0) delete sheet[key];
      this.wb.touch();
    });
  }

  /** Hides (or shows) the grouped rows or columns of the whole sheet from outline level `level` down: 1 hides all detail, 8 shows it all. */
  showLevel(level: number): void {
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      for (const [levels, hiddenKey] of [[sheet.rowLevels, 'rowsHidden'], [sheet.colLevels, 'colsHidden']] as const) {
        if (!levels) continue;
        const hidden = (sheet[hiddenKey] ??= new Set());
        for (const [index, own] of levels) {
          if (own >= level) hidden.add(index);
          else hidden.delete(index);
        }
        if (hidden.size === 0) delete sheet[hiddenKey];
      }
      this.wb.touch();
    });
  }

  /** Insert > Sparklines: a line, column or winLoss sparkline for each row of the selection, in the cell just right of it. */
  addSparklines(type: 'line' | 'column' | 'winLoss'): boolean {
    const { r1, c1, r2, c2 } = this.selection;
    const sheet = this.wb.sheets[this.active];
    const wide = c2 > c1;
    const made: Sparkline[] = [];
    for (let r = r1; r <= r2; r += 1) {
      const source = wide ? { r1: r, c1, r2: r, c2 } : { r1, c1, r2, c2 };
      if (!wide && r > r1) break;
      made.push({ type, source, row: r, col: wide ? c2 + 1 : c2 + 1 });
    }
    if (made.length === 0) return false;
    this.structural(() => {
      const taken = new Set(made.map((s) => `${s.row},${s.col}`));
      sheet.sparklines = [...(sheet.sparklines ?? []).filter((s) => !taken.has(`${s.row},${s.col}`)), ...made];
      this.wb.touch();
    });
    return true;
  }

  /** Removes the sparklines in the selected cells. */
  clearSparklines(): void {
    const { r1, c1, r2, c2 } = this.selection;
    const sheet = this.wb.sheets[this.active];
    if (!sheet.sparklines?.some((s) => s.row >= r1 && s.row <= r2 && s.col >= c1 && s.col <= c2)) return;
    this.structural(() => {
      sheet.sparklines = sheet.sparklines!.filter((s) => !(s.row >= r1 && s.row <= r2 && s.col >= c1 && s.col <= c2));
      if (sheet.sparklines.length === 0) delete sheet.sparklines;
      this.wb.touch();
    });
  }

  /**
   * What-If Analysis > Goal Seek: sets the number in `changing` so that the formula in `target` gives `wanted`.
   * Returns the number it wrote, or null when no input reaches it (nothing is changed then). One undo step.
   */
  goalSeek(targetAddress: string, wanted: number, changingAddress: string): number | null {
    const target = parseCell(targetAddress);
    const changing = parseCell(changingAddress);
    if (!target || !changing) return null;
    const sheet = this.active;
    const was = this.wb.getCell(sheet, changing.row, changing.col);
    const style = was?.style ?? 0;
    const startValue = Number(this.wb.valueAt(sheet, changing.row, changing.col));
    const found = goalSeek(
      (input) => {
        this.wb.putCell(sheet, changing.row, changing.col, { raw: String(input), style });
        const value = this.wb.valueAt(sheet, target.row, target.col);
        return typeof value === 'number' ? value : null;
      },
      wanted,
      Number.isFinite(startValue) ? startValue : 0,
    );
    this.wb.putCell(sheet, changing.row, changing.col, was);
    if (!found) return null;
    const rounded = Number(found.input.toPrecision(12));
    this.apply([{ row: changing.row, col: changing.col, after: { raw: String(rounded), style } }]);
    return rounded;
  }

  /**
   * Data > Subtotal: under each run of equal values in `groupColumn` of the selected table (its first row is the
   * header) a row "<value> <total label>" holding a SUBTOTAL of `valueColumn`, and a grand total row at the end;
   * the rows of each run become an outline group. Returns how many subtotal rows were added (0 when nothing to do).
   */
  addSubtotals(groupColumn: number, valueColumn: number, fn: 'sum' | 'count' | 'average' | 'max' | 'min', labels: { total: string; grand: string }): number {
    if (this.selection.r1 === this.selection.r2 && this.selection.c1 === this.selection.c2) this.selectRegion();
    const { r1, r2, c1, c2 } = this.selection;
    if (r2 <= r1 || groupColumn < c1 || groupColumn > c2 || valueColumn < c1 || valueColumn > c2) return 0;
    const sheet = this.active;
    const number = { sum: 9, count: 3, average: 1, max: 4, min: 5 }[fn];
    const keyAt = (r: number) => this.wb.displayAt(sheet, r, groupColumn);
    const runs: Array<{ from: number; to: number; key: string }> = [];
    for (let r = r1 + 1; r <= r2; r += 1) {
      const last = runs[runs.length - 1];
      if (last && last.key === keyAt(r)) last.to = r;
      else runs.push({ from: r, to: r, key: keyAt(r) });
    }
    if (runs.length === 0) return 0;
    const column = columnName(valueColumn);
    this.structural(() => {
      const subtotalRows = new Set<number>();
      let shift = 0;
      const place = (at: number, label: string, from: number, to: number) => {
        this.wb.editStructure(sheet, { axis: 'row', at, count: 1, mode: 'insert' });
        this.wb.putCell(sheet, at, groupColumn, { raw: label, style: this.wb.styleId({ bold: true }) });
        this.wb.putCell(sheet, at, valueColumn, { raw: `=SUBTOTAL(${number},${column}${from + 1}:${column}${to + 1})`, style: this.wb.styleId({ bold: true }) });
      };
      // From the bottom up, so the rows above keep their numbers while the ones below move down.
      place(r2 + 1, labels.grand, r1 + 1, r2);
      for (let i = runs.length - 1; i >= 0; i -= 1) {
        const run = runs[i];
        place(run.to + 1, `${run.key} ${labels.total}`, run.from, run.to);
      }
      // Where the rows ended up: each run's subtotal comes right after it.
      runs.forEach((run) => {
        subtotalRows.add(run.to + 1 + shift);
        shift += 1;
      });
      subtotalRows.add(r2 + 1 + shift);
      const target = this.wb.sheets[sheet];
      target.rowLevels ??= new Map();
      for (let r = r1 + 1; r <= r2 + shift; r += 1) if (!subtotalRows.has(r)) target.rowLevels.set(r, 1);
      this.wb.touch();
    });
    return runs.length + 1;
  }

  /** Hides the rows of the selection (Ctrl+9). */
  hideRows(): void {
    const { r1, r2 } = this.selection;
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      sheet.rowsHidden ??= new Set();
      for (let r = r1; r <= r2; r += 1) sheet.rowsHidden.add(r);
      this.wb.touch();
    });
    // The cursor moves off a row that is no longer there.
    this.select(Math.min(r2 + 1, MAX_ROWS - 1), this.anchor.col);
  }

  /** Shows the hidden rows inside the selection (Ctrl+Shift+9). */
  unhideRows(): void {
    const { r1, r2 } = this.selection;
    const sheet = this.wb.sheets[this.active];
    if (![...(sheet.rowsHidden ?? [])].some((r) => r >= r1 && r <= r2)) return;
    this.structural(() => {
      for (let r = r1; r <= r2; r += 1) sheet.rowsHidden?.delete(r);
      this.wb.touch();
    });
  }

  hideColumns(): void {
    const { c1, c2 } = this.selection;
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      sheet.colsHidden ??= new Set();
      for (let c = c1; c <= c2; c += 1) sheet.colsHidden.add(c);
      this.wb.touch();
    });
    this.select(this.anchor.row, Math.min(c2 + 1, MAX_COLS - 1));
  }

  unhideColumns(): void {
    const { c1, c2 } = this.selection;
    const sheet = this.wb.sheets[this.active];
    if (![...(sheet.colsHidden ?? [])].some((c) => c >= c1 && c <= c2)) return;
    this.structural(() => {
      for (let c = c1; c <= c2; c += 1) sheet.colsHidden?.delete(c);
      this.wb.touch();
    });
  }

  /** Sets the height, in pixels, of the rows of the selection. */
  setSelectedRowHeights(height: number): void {
    const { r1, r2 } = this.selection;
    const sheet = this.wb.sheets[this.active];
    const next = clamp(Math.round(height), MIN_ROW_HEIGHT, MAX_ROW_HEIGHT);
    this.structural(() => {
      const heights = (sheet.rowHeights ??= new Map());
      for (let r = r1; r <= r2; r += 1) {
        if (next === ROW_HEIGHT) heights.delete(r);
        else heights.set(r, next);
      }
      this.wb.touch();
    });
  }

  setSingleRowHeight(row: number, height: number): void {
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      sheet.rowHeights ??= new Map();
      sheet.rowHeights.set(row, clamp(Math.round(height), 8, 600));
      this.wb.touch();
    });
  }

  autofitRow(row: number): void {
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      sheet.rowHeights?.delete(row);
      this.wb.touch();
    });
  }

  setColumnWidth(col: number, width: number): void {
    const sheet = this.wb.sheets[this.active];
    this.structural(() => {
      sheet.colWidths.set(col, clamp(Math.round(width), 24, 800));
      this.wb.touch();
    });
  }

  /** Sets a row's height; the default height is stored as no entry, so a reset leaves nothing behind. */
  setRowHeight(row: number, height: number): void {
    const sheet = this.wb.sheets[this.active];
    const next = clamp(Math.round(height), MIN_ROW_HEIGHT, MAX_ROW_HEIGHT);
    if ((sheet.rowHeights?.get(row) ?? ROW_HEIGHT) === next) return;
    this.structural(() => {
      const heights = (sheet.rowHeights ??= new Map());
      if (next === ROW_HEIGHT) heights.delete(row);
      else heights.set(row, next);
      this.wb.touch();
    });
  }

  /** Widens a column to its longest shown text, ignoring merged cells (they span several columns). */
  autofitColumn(col: number): void {
    const sheet = this.wb.sheets[this.active];
    const used = this.wb.usedRange(this.active);
    let longest = 0;
    for (let r = 0; r <= (used?.r2 ?? 0); r += 1) {
      if (sheet.merges.some((m) => r >= m.r1 && r <= m.r2 && col >= m.c1 && col <= m.c2)) continue;
      longest = Math.max(longest, this.wb.displayAt(this.active, r, col).length);
    }
    this.setColumnWidth(col, Math.min(400, Math.max(40, longest * 8 + 16)));
  }

  addSheet(): void {
    this.cancelEdit();
    this.structuralAnywhere(() => {
      let n = this.wb.sheets.length + 1;
      while (this.wb.sheetIndex(`Sheet${n}`) >= 0) n += 1;
      this.wb.sheets.push(newSheet(`Sheet${n}`));
      this.active = this.wb.sheets.length - 1;
      this.selectedChart = null;
    this.anchor = this.focus = { row: 0, col: 0 };
    this.cursor = null;
      this.wb.touch();
    });
  }

  /** A copy of a sheet right after it, named "Name (2)" and so on. */
  duplicateSheet(index: number): void {
    if (index < 0 || index >= this.wb.sheets.length) return;
    this.cancelEdit();
    this.structural(() => {
      const data = this.wb.toData();
      const copy = structuredClone(data.sheets[index]);
      const base = copy.name.replace(/ \(\d+\)$/, '');
      let n = 2;
      let name = `${base} (${n})`;
      while (this.wb.sheetIndex(name) >= 0 || name.length > 31) {
        n += 1;
        name = `${base.slice(0, 31 - String(n).length - 3)} (${n})`;
      }
      copy.name = name;
      data.sheets.splice(index + 1, 0, copy);
      this.wb.loadData(data);
      this.active = index + 1;
      this.selectedChart = null;
      this.anchor = this.focus = { row: 0, col: 0 };
      this.cursor = null;
    });
  }

  /** Moves a sheet one place left (-1) or right (1) among the tabs. */
  moveSheet(index: number, delta: -1 | 1): void {
    const to = index + delta;
    if (index < 0 || to < 0 || to >= this.wb.sheets.length) return;
    this.cancelEdit();
    this.structural(() => {
      const data = this.wb.toData();
      const [moved] = data.sheets.splice(index, 1);
      data.sheets.splice(to, 0, moved);
      const wasActive = this.active === index;
      this.wb.loadData(data);
      if (wasActive) this.active = to;
      else if (this.active === to) this.active = index;
    });
  }

  /** Hide or show a sheet's tab. The last visible sheet cannot be hidden; hiding the active one moves to the next visible. */
  setSheetHidden(index: number, hidden: boolean): boolean {
    const sheets = this.wb.sheets;
    const sheet = sheets[index];
    if (!sheet) return false;
    if (hidden && sheets.filter((s) => !s.hidden).length <= 1) return false;
    this.structural(() => {
      if (hidden) sheet.hidden = true;
      else delete sheet.hidden;
      this.wb.touch();
    });
    if (hidden && this.active === index) {
      const next = sheets.findIndex((s, i) => i > index && !s.hidden);
      this.switchSheet(next >= 0 ? next : sheets.findIndex((s) => !s.hidden));
    }
    return true;
  }

  setTabColor(index: number, color: string | null): void {
    const sheet = this.wb.sheets[index];
    if (!sheet) return;
    this.structural(() => {
      if (color) sheet.tabColor = color;
      else delete sheet.tabColor;
      this.wb.touch();
    });
  }

  renameSheet(index: number, name: string): boolean {
    const trimmed = name.trim().slice(0, 31);
    if (!trimmed || /[\\/?*[\]:]/.test(trimmed)) return false;
    const clash = this.wb.sheetIndex(trimmed);
    if (clash >= 0 && clash !== index) return false;
    const old = this.wb.sheets[index].name;
    if (old === trimmed) return true;
    this.structuralAnywhere(() => {
      this.wb.sheets[index].name = trimmed;
      // A summary reads its data by the name of the sheet it is on.
      for (const other of this.wb.sheets) if (other.summary?.sheet === old) other.summary = { ...other.summary, sheet: trimmed };
      // Formulas that named the sheet follow it.
      const renamed = (formula: string) => {
        try {
          return formula.replace(new RegExp(`(^|[^A-Za-z0-9_'.])(?:'${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'|${old.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})!`, 'g'), (_m, lead: string) => `${lead}${/^[A-Za-z_][A-Za-z0-9_.]*$/.test(trimmed) ? trimmed : `'${trimmed}'`}!`);
        } catch {
          return formula;
        }
      };
      for (const sheet of this.wb.sheets)
        for (const [key, cell] of sheet.cells) if (cell.raw.startsWith('=')) sheet.cells.set(key, { ...cell, raw: renamed(cell.raw) });
      for (const [key, entry] of this.wb.names) this.wb.names.set(key, { ...entry, refersTo: renamed(entry.refersTo).replace(/^=/, '') });
      this.wb.touch();
    });
    return true;
  }

  deleteSheet(index: number): void {
    if (this.wb.sheets.length <= 1) return;
    this.cancelEdit();
    this.structuralAnywhere(() => {
      this.wb.sheets.splice(index, 1);
      this.active = Math.min(this.active, this.wb.sheets.length - 1);
      this.selectedChart = null;
    this.anchor = this.focus = { row: 0, col: 0 };
    this.cursor = null;
      this.wb.touch();
    });
  }

  switchSheet(index: number): void {
    if (index === this.active || index < 0 || index >= this.wb.sheets.length) return;
    if (this.editing && this.editing.text.startsWith('=')) {
      const sourceSheet = this.editing.sourceSheet ?? this.active;
      const caret = this.editing.caret ?? this.editing.text.length;
      const slot = pointSlot(this.editing.text, caret, this.editing.pointing ?? null);
      this.editing = {
        ...this.editing,
        sourceSheet,
        pointing: slot ?? this.editing.pointing,
        pointSheet: index,
      };
      this.active = index;
      this.selectedChart = null;
      this.anchor = this.focus = { row: 0, col: 0 };
      this.cursor = null;
      this.earlierBlocks = [];
      this.emit();
      return;
    }
    this.commitEdit(null);
    this.active = index;
    this.selectedChart = null;
    this.anchor = this.focus = { row: 0, col: 0 };
    this.cursor = null;
    this.earlierBlocks = [];
    this.emit();
  }

  /** Replaces the whole workbook (opening a file) and forgets the history. */
  load(data: WorkbookData): void {
    this.wb.loadData(data);
    this.active = Math.max(0, this.wb.sheets.findIndex((s) => !s.hidden));
    this.selectedChart = null;
    this.anchor = this.focus = { row: 0, col: 0 };
    this.cursor = null;
    this.editing = null;
    this.undoStack = [];
    this.redoStack = [];
    this.clipboard = null;
    this.emit();
  }

  /**
   * Thay nội dung bằng bản đã hợp nhất thay đổi của người khác, giữ nguyên trang tính đang xem (theo tên), vùng chọn và ô đang gõ.
   * Hoàn tác bị xóa: các mục hoàn tác ghi chỉ số định dạng của bảng cũ, áp lại lên bảng mới có thể ra sai định dạng.
   */
  applyRemote(data: WorkbookData): void {
    const name = this.wb.sheets[this.active]?.name;
    this.wb.loadData(data);
    const same = this.wb.sheets.findIndex((sheet) => sheet.name === name);
    this.active = same >= 0 ? same : Math.min(this.active, this.wb.sheets.length - 1);
    const sheet = this.wb.sheets[this.active];
    if (this.selectedChart && !sheet.charts.some((c) => c.id === this.selectedChart) && !sheet.images?.some((i) => i.id === this.selectedChart)) this.selectedChart = null;
    this.undoStack = [];
    this.redoStack = [];
    this.emit();
  }

  /** True if text typed now would be a formula that parses. */
  static isValidFormula(text: string): boolean {
    try {
      parseFormula(text);
      return true;
    } catch {
      return false;
    }
  }
}

const MIN_ROW_HEIGHT = 8;
const MAX_ROW_HEIGHT = 400;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
