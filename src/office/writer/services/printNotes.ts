import { paginate, type MeasuredBlock, type PageNote } from '../utils/pagination';
import { NOTES_CSS, renderNotes } from '../utils/footnotesDom';

export const PRINT_PAGE_CLASS = 'writer-print-page';
export const FALLBACK_NOTES_CLASS = 'writer-fallback-notes';

/** What the notes' printed pages need, from the page setup (CSS pixels). */
export interface PrintGeometry {
  contentWidth: number;
  contentHeight: number;
}

export const PRINT_NOTES_CSS = `${NOTES_CSS}
.${PRINT_PAGE_CLASS} { display: flow-root; position: relative; overflow: hidden; break-after: page; }
.${PRINT_PAGE_CLASS}:last-of-type { break-after: auto; }
.${PRINT_PAGE_CLASS} > .writer-notes { position: absolute; left: 0; right: 0; bottom: 0; background: #ffffff; }
.${PRINT_PAGE_CLASS} div[data-type="page-break"] { break-after: auto; }
`;

/**
 * Footnotes at the foot of each printed page. The print engine cannot place them there, so the pages are cut here:
 * the blocks are measured at the page's width, dealt out with each page leaving room for its notes, and each page
 * becomes a box as tall as the text area, its notes pinned to the bottom. Returns false, leaving the document as
 * it is (with the notes listed after the text), when a block is taller than a page.
 */
export function layoutPrintNotes(doc: Document, geometry: PrintGeometry): boolean {
  const root = doc.querySelector<HTMLElement>('.writer-content');
  if (!root || !root.querySelector('sup[data-footnote]')) return false;
  root.style.width = `${geometry.contentWidth}px`;
  root.querySelector(`.${FALLBACK_NOTES_CLASS}`)?.remove();
  // The document is another window's, so `instanceof HTMLElement` would say no.
  const units = Array.from(root.children) as HTMLElement[];
  const probe = doc.createElement('div');
  probe.style.cssText = `position:absolute;visibility:hidden;left:0;top:0;width:${geometry.contentWidth}px;font-size:9pt;line-height:1.25`;
  root.append(probe);
  const win = doc.defaultView;
  const tops = units.map((unit) => unit.getBoundingClientRect().top + (win?.scrollY ?? 0));
  let counted = 0;
  const blocks: MeasuredBlock[] = units.map((unit, i) => {
    const bottom = i === units.length - 1 ? unit.getBoundingClientRect().bottom + (win?.scrollY ?? 0) + parseFloat(win?.getComputedStyle(unit).marginBottom ?? '0') : tops[i + 1];
    const block: MeasuredBlock = { height: Math.max(0, bottom - tops[i]), pos: i, breakAfter: unit.matches('div[data-type="page-break"]') };
    const sups = unit.querySelectorAll('sup[data-footnote]');
    if (sups.length > 0) {
      const notes: PageNote[] = Array.from(sups, (sup) => ({ n: (counted += 1), text: sup.getAttribute('data-footnote') ?? '' }));
      probe.replaceChildren(renderNotes(notes, false, doc));
      block.notes = notes;
      block.reserve = probe.offsetHeight;
    }
    return block;
  });
  probe.remove();
  if (blocks.some((b) => b.height > geometry.contentHeight)) return false;

  const result = paginate(blocks, geometry.contentHeight);
  const starts = [0, ...result.breaks.map((b) => b.beforeIndex)];
  const pageNotes = [...result.breaks.map((b) => b.notes ?? []), result.lastNotes ?? []];
  const pages = starts.map((from, p) => {
    const page = doc.createElement('div');
    page.className = PRINT_PAGE_CLASS;
    page.style.height = `${geometry.contentHeight}px`;
    units.slice(from, starts[p + 1] ?? units.length).forEach((unit) => page.append(unit));
    if (pageNotes[p].length > 0) page.append(renderNotes(pageNotes[p], true, doc));
    return page;
  });
  root.replaceChildren(...pages);
  return true;
}
