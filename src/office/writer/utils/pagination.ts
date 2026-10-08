/**
 * Where the page view breaks pages, from the measured height of each unit. A
 * unit is a top-level block, or one row of a table (a table is split between
 * its rows, as Word does). Units are never split further: a paragraph, image
 * or row that does not fit in what is left of a page moves whole to the next
 * one. A unit taller than a whole page starts where it is and runs on; the
 * count adds the pages it covers.
 */
export interface MeasuredBlock {
  /** Outer height in CSS pixels, margins included. */
  height: number;
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
}

export interface PaginationResult {
  breaks: PageBreak[];
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
  let pendingManualBreak = false;

  blocks.forEach((block, index) => {
    const height = Math.max(0, block.height);
    // A block taller than a page can never fit, so moving it would only leave
    // the page before it empty: it starts where it is and runs on.
    const oversized = height > contentHeight;
    const doesNotFit = used > 0 && !oversized && used + height > contentHeight + 0.5;
    if (index > 0 && (pendingManualBreak || doesNotFit)) {
      const pagesUsed = Math.max(1, Math.ceil(used / contentHeight));
      breaks.push({
        beforeIndex: index,
        filler: Math.max(0, pagesUsed * contentHeight - used),
        pos: block.pos,
        row: block.row,
      });
      page += pagesUsed;
      // A table that runs on repeats its header rows at the top of the new page.
      used = block.row?.repeat ?? 0;
    }
    pendingManualBreak = block.breakAfter === true;
    pageOfBlock.push(page);
    used += height;
  });

  const lastPageSpan = used > contentHeight ? Math.ceil(used / contentHeight) : 1;
  return { breaks, pageCount: page + lastPageSpan, pageOfBlock, unitPositions: blocks.map((b) => b.pos ?? 0) };
}

/** Two results that would draw the same page view. */
export function samePagination(a: PaginationResult, b: PaginationResult): boolean {
  if (a.pageCount !== b.pageCount || a.breaks.length !== b.breaks.length) return false;
  return a.breaks.every(
    (brk, i) => brk.beforeIndex === b.breaks[i].beforeIndex && brk.pos === b.breaks[i].pos && Math.abs(brk.filler - b.breaks[i].filler) < 1,
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
