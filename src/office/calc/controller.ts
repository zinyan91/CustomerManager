import { CHART_MIN_HEIGHT, CHART_MIN_WIDTH, currentRegion, type ChartObject, type ChartType } from './engine/chartData';
import type { CfRule } from './engine/conditional';
import { functionOpening } from './engine/functionCatalog';
import { cellKey, columnName, keyCol, keyRow, MAX_COLS, MAX_ROWS, parseRange, type CellPos, type RangePos } from './engine/cellRef';
import { interpretEntry, parseTsv } from './engine/entry';
import { parseFormula, shiftFormula } from './engine/parser';
import { compareValues, isError, type Scalar } from './engine/values';
import type { FilterCondition } from './engine/filterCondition';
import { buildSummary, type SummaryConfig, type SummaryFn, type SummaryLabels } from './engine/summary';
import { acceptsEntry, validationAt, type Validation, type ValidationRule } from './engine/validation';
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
  type FilterState,
  type ImageObject,
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
}

export type BorderPreset = 'all' | 'outside' | 'none' | 'top' | 'bottom' | 'left' | 'right';

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
  /** The style the format painter will paint, while it is armed. */
  painter: CellStyle | null = null;
  /** The chart that is selected (not a cell), if any. */
  selectedChart: string | null = null;
  /** Bumped on any change a view should repaint for. */
  version = 0;
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

  private emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  // ----- Selection

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
    return this.anchor;
  }

  /** The merged block a cell belongs to, if any. */
  mergeAt(row: number, col: number): RangePos | undefined {
    return this.wb.sheets[this.active].merges.find((m) => within(m, row, col));
  }

  select(row: number, col: number): void {
    this.commitEdit(null);
    this.selectedChart = null;
    this.anchor = { row: clamp(row, 0, MAX_ROWS - 1), col: clamp(col, 0, MAX_COLS - 1) };
    this.focus = this.anchor;
    this.emit();
  }

  extendTo(row: number, col: number): void {
    this.focus = { row: clamp(row, 0, MAX_ROWS - 1), col: clamp(col, 0, MAX_COLS - 1) };
    this.emit();
  }

  selectRange(range: RangePos): void {
    this.commitEdit(null);
    this.anchor = { row: range.r1, col: range.c1 };
    this.focus = { row: range.r2, col: range.c2 };
    this.emit();
  }

  /** Arrow-key movement; from a merged cell it leaves the merge. */
  move(dRow: number, dCol: number, extend = false): void {
    const from = extend ? this.focus : this.anchor;
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
    this.selectRange(used ?? { r1: 0, c1: 0, r2: 0, c2: 0 });
  }

  // ----- Typing

  rawOfActive(): string {
    return this.wb.getCell(this.active, this.anchor.row, this.anchor.col)?.raw ?? '';
  }

  startEdit(initialText?: string): void {
    if (this.protectedBlocks()) return;
    const { row, col } = this.anchor;
    this.editing = {
      row,
      col,
      text: initialText ?? this.rawOfActive(),
      enterMode: initialText !== undefined,
    };
    this.emit();
  }

  setEditText(text: string): void {
    if (!this.editing) return;
    this.editing = { ...this.editing, text };
    this.emit();
  }

  /** Stores what is being typed and moves the cursor as Enter, Tab or an arrow would. */
  commitEdit(then: 'down' | 'up' | 'right' | 'left' | null): void {
    const editing = this.editing;
    if (!editing) return;
    this.editing = null;
    const existing = this.wb.getCell(this.active, editing.row, editing.col);
    const style = this.wb.styleOf(existing?.style ?? 0);
    if ((existing?.raw ?? '') !== editing.text) {
      const rule = validationAt(this.wb.sheets[this.active].validations, editing.row, editing.col);
      if (rule && !acceptsEntry(rule.rule, editing.text, this.validationItems(rule))) {
        // Refused: the cell keeps what it had, and the screen says why.
        this.onReject?.(rule.error);
        this.emit();
        return;
      }
      const entry = interpretEntry(editing.text, style.numFmt);
      const styleId = entry.numFmt ? this.wb.styleId({ ...style, numFmt: entry.numFmt }) : (existing?.style ?? 0);
      this.apply([{ row: editing.row, col: editing.col, after: { raw: entry.raw, style: styleId } }]);
    }
    if (then) {
      this.anchor = { row: editing.row, col: editing.col };
      this.focus = this.anchor;
      const d = { down: [1, 0], up: [-1, 0], right: [0, 1], left: [0, -1] }[then];
      this.move(d[0], d[1]);
    } else this.emit();
  }

  /** Told when a typed entry is refused by data validation, with the rule's own message if it has one. */
  onReject: ((message: string | undefined) => void) | null = null;
  /** Gọi khi một thay đổi bị chặn vì trang tính đang được bảo vệ. */
  onProtected: (() => void) | null = null;

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
    if (!this.editing) return;
    this.editing = null;
    this.emit();
  }

  // ----- Changing cells and history

  /** Sets cells (undefined clears one) as one undoable step. */
  apply(edits: Array<{ row: number; col: number; after: Cell | undefined }>, sheet = this.active): void {
    if (this.wb.sheets[sheet]?.protected) {
      this.onProtected?.();
      return;
    }
    const changes: Change[] = [];
    for (const { row, col, after } of edits) {
      if (row < 0 || col < 0 || row >= MAX_ROWS || col >= MAX_COLS) continue;
      const before = this.wb.getCell(sheet, row, col);
      const same = (before?.raw ?? '') === (after?.raw ?? '') && (before?.style ?? 0) === (after?.style ?? 0);
      if (!same) changes.push({ sheet, row, col, before, after });
    }
    if (changes.length === 0) return;
    for (const c of changes) this.wb.putCell(c.sheet, c.row, c.col, c.after);
    this.pushHistory({ kind: 'cells', changes });
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
    this.redoStack.push(entry);
    this.emit();
  }

  redo(): void {
    this.cancelEdit();
    const entry = this.redoStack.pop();
    if (!entry) return;
    this.replay(entry, 'redo');
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
    if (!allowProtected && this.protectedBlocks()) return;
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
    if (!this.sheetProtected) return false;
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
    const { r1, c1, r2, c2 } = this.selection;
    const out: Array<{ row: number; col: number }> = [];
    for (let r = r1; r <= r2; r += 1) for (let c = c1; c <= c2; c += 1) out.push({ row: r, col: c });
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

  // ----- Formatting

  /** The style of the active cell. */
  activeStyle(): CellStyle {
    return this.wb.styleOf(this.wb.getCell(this.active, this.anchor.row, this.anchor.col)?.style ?? 0);
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
    this.restyle((style) => ({ ...style, ...patch }));
  }

  /** Bold, italic, underline or strike on or off, by what the active cell has. */
  toggleStyle(key: 'bold' | 'italic' | 'underline' | 'strike'): void {
    const turnOn = !this.activeStyle()[key];
    this.applyStyle({ [key]: turnOn });
  }

  setNumFmt(code: string): void {
    this.applyStyle({ numFmt: code === 'General' ? undefined : code });
  }

  setBorders(preset: BorderPreset): void {
    const { r1, c1, r2, c2 } = this.selection;
    this.restyle((style, row, col) => {
      const borders: Borders = { ...style.borders };
      const edge = { top: row === r1, bottom: row === r2, left: col === c1, right: col === c2 };
      switch (preset) {
        case 'none':
          return { ...style, borders: undefined };
        case 'all':
          return { ...style, borders: { top: true, right: true, bottom: true, left: true } };
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

  isMerged(): boolean {
    const r = this.selection;
    return this.wb.sheets[this.active].merges.some((m) => m.r1 <= r.r2 && m.r2 >= r.r1 && m.c1 <= r.c2 && m.c2 >= r.c1);
  }

  /** A header row and banded rows with thin borders over the selection. */
  formatAsTable(): void {
    const { r1 } = this.selection;
    this.restyle((style, row) => {
      const header = row === r1;
      const banded = !header && (row - r1) % 2 === 0;
      return {
        ...style,
        bold: header ? true : style.bold,
        color: header ? '#ffffff' : style.color,
        fill: header ? '#0f766e' : banded ? '#e6f4f1' : undefined,
        borders: { top: true, right: true, bottom: true, left: true },
      };
    });
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
  addChart(type: ChartType): boolean {
    this.commitEdit(null);
    const range = this.chartRange();
    if (!range) return false;
    const sheet = this.wb.sheets[this.active];
    const id = `ch${Date.now().toString(36)}${(cfCounter += 1).toString(36)}`;
    this.structural(() => {
      sheet.charts.push({ id, type, range, title: '', row: range.r1, col: range.c2 + 2, dx: 0, dy: 0, width: 420, height: 270 });
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

  /** Removes the rules that touch the selection, or every rule on the sheet. */
  clearConditional(scope: 'selection' | 'sheet'): void {
    const sheet = this.wb.sheets[this.active];
    const sel = this.selection;
    const touches = (r: CfRule['range']) => r.r1 <= sel.r2 && r.r2 >= sel.r1 && r.c1 <= sel.c2 && r.c2 >= sel.c1;
    if (sheet.cf.length === 0 || (scope === 'selection' && !sheet.cf.some((rule) => touches(rule.range)))) return;
    this.structural(() => {
      sheet.cf = scope === 'sheet' ? [] : sheet.cf.filter((rule) => !touches(rule.range));
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

  private rangeText(range: RangePos): string {
    const lines: string[] = [];
    for (let r = range.r1; r <= range.r2; r += 1) {
      const cols: string[] = [];
      for (let c = range.c1; c <= range.c2; c += 1) cols.push(this.wb.displayAt(this.active, r, c));
      lines.push(cols.join('\t'));
    }
    return lines.join('\n');
  }

  /** Remembers the selection for pasting inside the app and returns its text for the system clipboard. */
  copy(cut = false): string {
    const range = this.selection;
    const cells: Clipboard['cells'] = [];
    for (let r = range.r1; r <= range.r2; r += 1) {
      const row: Array<Cell | undefined> = [];
      for (let c = range.c1; c <= range.c2; c += 1) row.push(this.wb.getCell(this.active, r, c));
      cells.push(row);
    }
    const text = this.rangeText(range);
    this.clipboard = { range, cells, cut, text, sheet: this.active };
    this.emit();
    return text;
  }

  get copiedRange(): RangePos | null {
    return this.clipboard && this.clipboard.sheet === this.active ? this.clipboard.range : null;
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
      // A single cell fills a larger selection.
      const rows = height === 1 && width === 1 ? target.r2 - target.r1 + 1 : height;
      const cols = height === 1 && width === 1 ? target.c2 - target.c1 + 1 : width;
      for (let r = 0; r < rows; r += 1)
        for (let c = 0; c < cols; c += 1) {
          const source = clip.cells[r % height][c % width];
          const row = target.r1 + r;
          const col = target.c1 + c;
          if (!source) edits.push({ row, col, after: undefined });
          else {
            const dRow = row - (clip.range.r1 + (r % height));
            const dCol = col - (clip.range.c1 + (c % width));
            edits.push({ row, col, after: { raw: source.raw.startsWith('=') ? shiftFormula(source.raw, dRow, dCol) : source.raw, style: source.style } });
          }
        }
      if (clip.cut) {
        for (let r = clip.range.r1; r <= clip.range.r2; r += 1)
          for (let c = clip.range.c1; c <= clip.range.c2; c += 1)
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

  private sortRows(range: RangePos, byColumn: number, ascending: boolean): void {
    const { r1, c1, r2, c2 } = range;
    if (r1 === r2) return;
    const sheet = this.active;
    const rows = Array.from({ length: r2 - r1 + 1 }, (_, i) => r1 + i);
    const keyOf = (r: number): Scalar => this.wb.valueAt(sheet, r, c1 + byColumn);
    const sorted = [...rows].sort((a, b) => {
      const ka = keyOf(a);
      const kb = keyOf(b);
      if (ka === null || isError(ka)) return kb === null || isError(kb) ? a - b : 1;
      if (kb === null || isError(kb)) return -1;
      const order = compareValues(ka, kb);
      return (ascending ? order : -order) || a - b;
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
    const sheet = this.wb.sheets[this.active];
    const config = sheet.summary;
    if (!config) return false;
    const sourceIndex = this.wb.sheetIndex(config.sheet);
    if (sourceIndex < 0) return false;
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
    this.structural(() => {
      const header = this.wb.styleId({ bold: true, fill: '#e2e8f0' });
      const old = sheet.cells;
      sheet.cells = new Map();
      for (const cell of built.cells) {
        const key = cellKey(cell.row, cell.col);
        sheet.cells.set(key, { raw: cell.raw, style: old.get(key)?.style ?? (cell.header ? header : 0) });
      }
      sheet.summary = { ...config, source };
      this.selectedChart = null;
      this.wb.touch();
    });
    return true;
  }

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
      sheet.filter = { ...filter, excluded: next };
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
    const { r1, r2 } = this.selection;
    this.structural(() => this.wb.editStructure(this.active, { axis: 'row', at: r1, count: r2 - r1 + 1, mode: 'insert' }));
  }

  deleteRows(): void {
    const { r1, r2 } = this.selection;
    this.structural(() => this.wb.editStructure(this.active, { axis: 'row', at: r1, count: r2 - r1 + 1, mode: 'delete' }));
  }

  insertColumns(): void {
    const { c1, c2 } = this.selection;
    this.structural(() => this.wb.editStructure(this.active, { axis: 'col', at: c1, count: c2 - c1 + 1, mode: 'insert' }));
  }

  deleteColumns(): void {
    const { c1, c2 } = this.selection;
    this.structural(() => this.wb.editStructure(this.active, { axis: 'col', at: c1, count: c2 - c1 + 1, mode: 'delete' }));
  }

  /** Rows and columns frozen on the active sheet. */
  get frozen(): { rows: number; cols: number } {
    const freeze = this.wb.sheets[this.active].freeze;
    return { rows: freeze?.rows ?? 0, cols: freeze?.cols ?? 0 };
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
    if ((sheet.rowHeights.get(row) ?? ROW_HEIGHT) === next) return;
    this.structural(() => {
      if (next === ROW_HEIGHT) sheet.rowHeights.delete(row);
      else sheet.rowHeights.set(row, next);
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
      this.wb.touch();
    });
  }

  switchSheet(index: number): void {
    if (index === this.active || index < 0 || index >= this.wb.sheets.length) return;
    this.commitEdit(null);
    this.active = index;
    this.selectedChart = null;
    this.anchor = this.focus = { row: 0, col: 0 };
    this.emit();
  }

  /** Replaces the whole workbook (opening a file) and forgets the history. */
  load(data: WorkbookData): void {
    this.wb.loadData(data);
    this.active = 0;
    this.selectedChart = null;
    this.anchor = this.focus = { row: 0, col: 0 };
    this.editing = null;
    this.undoStack = [];
    this.redoStack = [];
    this.clipboard = null;
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
