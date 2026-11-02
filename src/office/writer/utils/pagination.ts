/**
 * Where the page view breaks pages, from the measured height of each unit. A
 * unit is a top-level block, or one row of a table (a table is split between
 * its rows, as Word does). Units are never split further: a paragraph, image
 * or row that does not fit in what is left of a page moves whole to the next
 * one. A unit taller than a whole page starts where it is and runs on; the
 * count adds the pages it covers.
 */
/** A footnote as the page it falls on shows it: its number in the document and its text. */
export interface PageNote {
  n: number;
  text: string;
}

/** Space the notes of a page take above its separator rule, in CSS pixels. */
export const NOTE_RULE_HEIGHT = 8;

export interface MeasuredBlock {
  /** Outer height in CSS pixels, margins included. */
  height: number;
  /** Footnotes referenced in this unit and the height they need at the foot of the page it lands on. */
  notes?: PageNote[];
  reserve?: number;
  /** A manual page break: the next block starts a new page. */
  breakAfter?: boolean;
  /** Document position where a break before this unit is drawn. */
  pos?: number;
  /**
   * Set for a table row after the first: the break is drawn between rows,
   * across this many columns. When the table has header rows, `repeat` is
   * their height and `tablePos` the table's position: each new page the table
   * runs onto starts with a copy of them, which takes `repeat` of its room.
   */
  row?: { columns: number; repeat?: number; tablePos?: number };
}

export interface PageBreak {
  /** Index of the unit that starts the new page. */
  beforeIndex: number;
  /** Where to draw the break, and whether it falls between table rows. */
  pos?: number;
  row?: { columns: number; repeat?: number; tablePos?: number };
  /** Empty space left at the bottom of the page that ends here, in CSS pixels. */
  filler: number;
  /** The footnotes that page shows at its foot. */
  notes?: PageNote[];
}

/** A unit laid out in a column after the first: where, as the page it is on and its offset from the top of the page's text area. */
export interface ColumnPlacement {
  index: number;
  page: number;
  column: number;
  y: number;
}

export interface PaginationResult {
  breaks: PageBreak[];
  /** The footnotes of the last page. */
  lastNotes?: PageNote[];
  /** Several columns only: the units that sit in the second column or later. The first column flows as in one column. */
  columns?: ColumnPlacement[];
  pageCount: number;
  /** Index of the page (0-based) each unit starts on. */
  pageOfBlock: number[];
  /** Document position of each unit, to find the page a cursor is on. */
  unitPositions: number[];
}

export function paginate(blocks: readonly MeasuredBlock[], contentHeight: number): PaginationResult {
  const breaks: PageBreak[] = [];
  const pageOfBlock: number[] = [];
  if (!(contentHeight > 0)) {
    return { breaks, pageCount: 1, pageOfBlock: blocks.map(() => 0), unitPositions: blocks.map((b) => b.pos ?? 0) };
  }

  let page = 0;
  let used = 0;
  let reserved = 0;
  let pageNotes: PageNote[] = [];
  let pendingManualBreak = false;

  blocks.forEach((block, index) => {
    const height = Math.max(0, block.height);
    const extra = Math.max(0, block.reserve ?? 0);
    // What the page's notes need once this unit's join them, with the rule above them.
    const needed = reserved + extra > 0 ? reserved + extra + NOTE_RULE_HEIGHT : 0;
    // A block taller than a page can never fit, so moving it would only leave
    // the page before it empty: it starts where it is and runs on.
    const oversized = height > contentHeight;
    const doesNotFit = used > 0 && !oversized && used + height + needed > contentHeight + 0.5;
    if (index > 0 && (pendingManualBreak || doesNotFit)) {
      const pagesUsed = Math.max(1, Math.ceil(used / contentHeight));
      breaks.push({
        beforeIndex: index,
        filler: Math.max(0, pagesUsed * contentHeight - used),
        pos: block.pos,
        row: block.row,
        ...(pageNotes.length > 0 ? { notes: pageNotes } : {}),
      });
      pageNotes = [];
      reserved = 0;
      page += pagesUsed;
      // A table that runs on repeats its header rows at the top of the new page.
      used = block.row?.repeat ?? 0;
    }
    pendingManualBreak = block.breakAfter === true;
    pageOfBlock.push(page);
    used += height;
    reserved += extra;
    if (block.notes) pageNotes.push(...block.notes);
  });

  const lastPageSpan = used > contentHeight ? Math.ceil(used / contentHeight) : 1;
  return { breaks, ...(pageNotes.length > 0 ? { lastNotes: pageNotes } : {}), pageCount: page + lastPageSpan, pageOfBlock, unitPositions: blocks.map((b) => b.pos ?? 0) };
}

/**
 * The same for a page of several columns: a page is `columns` columns of `contentHeight`, filled one after the
 * other, and a unit that does not fit what is left of a column starts the next (the next page after the last).
 * Units are whole blocks (a table is not cut). The filler of a page is what its first column leaves, since only
 * that column is in the flow; the others are placed over it.
 */
export function paginateColumns(blocks: readonly MeasuredBlock[], contentHeight: number, columns: number): PaginationResult {
  const breaks: PageBreak[] = [];
  const placed: ColumnPlacement[] = [];
  const pageOfBlock: number[] = [];
  const unitPositions = blocks.map((b) => b.pos ?? 0);
  if (!(contentHeight > 0) || columns < 2) return { ...paginate(blocks, contentHeight), unitPositions };

  let page = 0;
  let column = 0;
  const used = Array.from({ length: columns }, () => 0);
  let reserved = 0;
  let pageNotes: PageNote[] = [];
  let pendingManualBreak = false;

  blocks.forEach((block, index) => {
    const height = Math.max(0, block.height);
    const oversized = height > contentHeight;
    const extra = Math.max(0, block.reserve ?? 0);
    // The notes of a page run across it at the foot: what they need must leave every column room, or the page is full.
    const needed = reserved + extra > 0 ? reserved + extra + NOTE_RULE_HEIGHT : 0;
    const doesNotFit = used[column] > 0 && !oversized && used[column] + height + needed > contentHeight + 0.5;
    const target = index > 0 && doesNotFit ? column + 1 : column;
    const notesCrowdColumns = extra > 0 && target < columns && used.some((u, k) => k !== target && u > 0 && u + needed > contentHeight + 0.5);
    column = index > 0 && (pendingManualBreak || notesCrowdColumns) ? columns : target;
    if (column >= columns) {
      const pagesUsed = Math.max(1, Math.ceil(used[0] / contentHeight));
      breaks.push({ beforeIndex: index, filler: Math.max(0, pagesUsed * contentHeight - used[0]), pos: block.pos, ...(pageNotes.length > 0 ? { notes: pageNotes } : {}) });
      page += pagesUsed;
      column = 0;
      used.fill(0);
      reserved = 0;
      pageNotes = [];
    }
    pendingManualBreak = block.breakAfter === true;
    pageOfBlock.push(page);
    if (column > 0) placed.push({ index, page, column, y: used[column] });
    used[column] += height;
    reserved += extra;
    if (block.notes) pageNotes.push(...block.notes);
  });

  const lastPageSpan = used[0] > contentHeight ? Math.ceil(used[0] / contentHeight) : 1;
  return { breaks, columns: placed, ...(pageNotes.length > 0 ? { lastNotes: pageNotes } : {}), pageCount: page + lastPageSpan, pageOfBlock, unitPositions };
}

/** Two results that would draw the same page view. */
export function samePagination(a: PaginationResult, b: PaginationResult): boolean {
  if (a.pageCount !== b.pageCount || a.breaks.length !== b.breaks.length) return false;
  const ac = a.columns ?? [];
  const bc = b.columns ?? [];
  if (ac.length !== bc.length || ac.some((p, i) => p.index !== bc[i].index || p.column !== bc[i].column || p.page !== bc[i].page || Math.abs(p.y - bc[i].y) >= 1)) return false;
  const notes = (list?: PageNote[]) => (list ?? []).map((note) => `${note.n}:${note.text}`).join('|');
  if (notes(a.lastNotes) !== notes(b.lastNotes)) return false;
  return a.breaks.every(
    (brk, i) => brk.beforeIndex === b.breaks[i].beforeIndex && brk.pos === b.breaks[i].pos && Math.abs(brk.filler - b.breaks[i].filler) < 1 && notes(brk.notes) === notes(b.breaks[i].notes),
  );
}

/** The page (1-based) a document position is on. */
export function pageAt(result: PaginationResult, position: number): number {
  let unit = 0;
  result.unitPositions.forEach((start, index) => {
    if (start <= position) unit = index;
  });
  return (result.pageOfBlock[unit] ?? 0) + 1;
}
