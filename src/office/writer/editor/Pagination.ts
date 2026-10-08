import { Extension } from '@tiptap/core';
import type { Node as PmNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { paginate, samePagination, type MeasuredBlock, type PaginationResult } from '../utils/pagination';
import { fillPageTemplate } from '../utils/pageSetup';

/** What the page view draws, in CSS pixels; set by WriterEditor from the page setup. */
export interface PageLayout {
  contentHeight: number;
  pageWidth: number;
  marginTop: number;
  marginBottom: number;
  marginLeft: number;
  /** Grey space between two sheets. */
  gap: number;
  headerText: string;
  footerText: string;
  pageNumbers: boolean;
  pageTemplate: string;
}

export interface PaginationOptions {
  onPaginate: (result: PaginationResult) => void;
}

interface PluginState {
  result: PaginationResult;
  layout: PageLayout | null;
  decorations: DecorationSet;
}

export const paginationKey = new PluginKey<PluginState>('felixPagination');

type Meta = { result: PaginationResult } | { layout: PageLayout };

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pagination: {
      setPageLayout: (layout: PageLayout) => ReturnType;
    };
  }
}

const INITIAL: PaginationResult = { breaks: [], pageCount: 1, pageOfBlock: [], unitPositions: [] };

/** The footer of the page that ends here, the grey gap, and the header of the next page. */
function pageGap(layout: PageLayout, endingPage: number, pageCount: number, filler: number): HTMLElement {
  const gap = document.createElement('div');
  gap.className = 'writer-page-gap';
  gap.contentEditable = 'false';
  gap.setAttribute('aria-hidden', 'true');
  gap.style.height = `${filler + layout.marginBottom + layout.gap + layout.marginTop}px`;
  gap.style.marginLeft = `-${layout.marginLeft}px`;
  gap.style.width = `${layout.pageWidth}px`;
  gap.style.setProperty('--page-filler', `${filler}px`);
  gap.style.setProperty('--page-margin-bottom', `${layout.marginBottom}px`);
  gap.style.setProperty('--page-gap', `${layout.gap}px`);
  gap.style.setProperty('--page-margin-top', `${layout.marginTop}px`);

  gap.append(pageBand('writer-page-footer', footerText(layout, endingPage + 1, pageCount)));
  const sheetGap = document.createElement('div');
  sheetGap.className = 'writer-page-gap-band';
  gap.append(sheetGap);
  gap.append(pageBand('writer-page-header', layout.headerText));
  return gap;
}

/** The same gap as a table row, for a break between two rows of a table. */
function pageGapRow(layout: PageLayout, endingPage: number, pageCount: number, filler: number, columns: number): HTMLElement {
  const row = document.createElement('tr');
  row.className = 'writer-page-gap-row';
  row.contentEditable = 'false';
  const cell = document.createElement('td');
  cell.colSpan = Math.max(1, columns);
  cell.append(pageGap(layout, endingPage, pageCount, filler));
  row.append(cell);
  return row;
}

/** A copy of the table's header row(s), drawn at the top of a page the table runs onto. */
function repeatedHeader(view: EditorView, tablePos: number): HTMLElement | null {
  const tbody = (view.nodeDOM(tablePos) as HTMLElement | null)?.querySelector?.('table')?.tBodies[0];
  const original = tbody ? Array.from(tbody.children).find((tr) => !tr.classList.contains('writer-page-gap-row') && !tr.classList.contains('writer-repeat-header')) : null;
  if (!original) return null;
  const copy = original.cloneNode(true) as HTMLElement;
  copy.classList.add('writer-repeat-header');
  copy.contentEditable = 'false';
  copy.setAttribute('aria-hidden', 'true');
  return copy;
}

function pageBand(className: string, text: string): HTMLElement {
  const band = document.createElement('div');
  band.className = className;
  band.textContent = text;
  return band;
}

export function footerText(layout: Pick<PageLayout, 'footerText' | 'pageNumbers' | 'pageTemplate'>, page: number, pages: number): string {
  const parts = [layout.footerText.trim()];
  if (layout.pageNumbers) parts.push(fillPageTemplate(layout.pageTemplate, page, pages));
  return parts.filter(Boolean).join('    ');
}

function buildDecorations(doc: PmNode, result: PaginationResult, layout: PageLayout | null): DecorationSet {
  if (!layout || result.breaks.length === 0) return DecorationSet.empty;
  const decorations: Decoration[] = [];
  result.breaks.forEach((brk, i) => {
    if (brk.pos === undefined || brk.pos > doc.content.size) return;
    decorations.push(
      Decoration.widget(
        brk.pos,
        () =>
          brk.row
            ? pageGapRow(layout, i, result.pageCount, brk.filler, brk.row.columns)
            : pageGap(layout, i, result.pageCount, brk.filler),
        {
          // Before the repeated header, which sits at side -1.
          side: -2,
          ignoreSelection: true,
          key: `gap-${i}-${brk.row ? 'r' : 'b'}-${Math.round(brk.filler)}-${result.pageCount}-${layout.headerText}-${layout.footerText}-${layout.pageNumbers}`,
        },
      ),
    );
    const tablePos = brk.row?.tablePos;
    if (tablePos !== undefined && brk.row?.repeat) {
      decorations.push(
        Decoration.widget(brk.pos, (view) => repeatedHeader(view, tablePos) ?? document.createElement('tr'), {
          side: -1,
          ignoreSelection: true,
          key: `head-${i}-${tablePos}-${Math.round(brk.row.repeat)}`,
        }),
      );
    }
  });
  return DecorationSet.create(doc, decorations);
}

/** Layout y of an element, unaffected by the zoom transform (offsetTop ignores it). */
function layoutTop(element: HTMLElement): number {
  let y = 0;
  for (let node: HTMLElement | null = element; node; node = node.offsetParent as HTMLElement | null) y += node.offsetTop;
  return y;
}

interface Unit {
  element: HTMLElement;
  /** Element whose bottom ends the last unit of a table: the table's wrapper. */
  end: HTMLElement;
  meta: Omit<MeasuredBlock, 'height' | 'row'> & {
    row?: { columns: number; tablePos?: number; /** The table's header rows, as [index of its first unit, count]. */ headerUnits?: readonly [number, number] };
  };
}

/** How many leading rows of a table hold only header cells. */
function leadingHeaderRows(table: PmNode): number {
  let count = 0;
  while (count < table.childCount) {
    const row = table.child(count);
    let allHeaders = row.childCount > 0;
    row.forEach((cell) => {
      if (cell.type.name !== 'tableHeader') allHeaders = false;
    });
    if (!allHeaders) break;
    count += 1;
  }
  return count;
}

/** Top-level blocks, with each table cut into its rows. */
function collectUnits(view: EditorView): Unit[] {
  const units: Unit[] = [];
  view.state.doc.forEach((node, offset) => {
    const dom = view.nodeDOM(offset);
    if (!(dom instanceof HTMLElement)) return;
    const breakAfter = node.type.name === 'pageBreak';
    if (node.type.name !== 'table') {
      units.push({ element: dom, end: dom, meta: { breakAfter, pos: offset } });
      return;
    }
    const tbody = dom.querySelector('table')?.tBodies[0];
    const rows = tbody ? Array.from(tbody.children).filter((tr): tr is HTMLElement => tr instanceof HTMLElement && tr.tagName === 'TR' && !tr.classList.contains('writer-page-gap-row') && !tr.classList.contains('writer-repeat-header')) : [];
    if (rows.length === 0 || rows.length !== node.childCount) {
      units.push({ element: dom, end: dom, meta: { pos: offset } });
      return;
    }
    let columns = 0;
    node.firstChild?.forEach((cell) => {
      columns += Number(cell.attrs.colspan ?? 1) || 1;
    });
    // Leading rows made only of header cells repeat on each page the table runs onto.
    const headerRows = leadingHeaderRows(node);
    const first = units.length;
    node.forEach((_row, rowOffset, index) => {
      units.push({
        element: rows[index],
        end: dom,
        meta:
          index === 0
            ? { pos: offset }
            : { pos: offset + 1 + rowOffset, row: { columns: Math.max(1, columns), ...(index >= headerRows && headerRows > 0 ? { tablePos: offset, headerUnits: [first, headerRows] as const } : {}) } },
      });
    });
  });
  return units;
}

/**
 * Measures each unit as the distance from its top to the next unit's top, so
 * collapsed margins count as the browser lays them out (and as print will).
 *
 * The page gaps already drawn are taken out of the layout while measuring
 * (`writer-measuring` hides them): the result then depends only on the
 * document, never on where the last run put its gaps, so a run cannot undo
 * what the previous one did and the view settles.
 */
function measure(view: EditorView, contentHeight: number): MeasuredBlock[] {
  view.dom.classList.add('writer-measuring');
  try {
    const units = collectUnits(view);
    const tops = units.map((unit) => layoutTop(unit.element));
    const heights = units.map((unit, i) => {
      const isLast = i === units.length - 1;
      const bottom = isLast
        ? layoutTop(unit.end) + unit.end.offsetHeight + parseFloat(getComputedStyle(unit.end).marginBottom || '0')
        : tops[i + 1];
      return Math.max(0, bottom - tops[i]);
    });
    return units.map((unit, i) => {
      const { row, ...rest } = unit.meta;
      if (!row) return { ...rest, height: heights[i] };
      const { headerUnits, ...plain } = row;
      // Header rows that would take half a page or more are not repeated.
      const repeat = headerUnits ? heights.slice(headerUnits[0], headerUnits[0] + headerUnits[1]).reduce((a, b) => a + b, 0) : 0;
      return { ...rest, height: heights[i], row: repeat > 0 && repeat < contentHeight / 2 ? { ...plain, repeat } : { columns: plain.columns } };
    });
  } finally {
    view.dom.classList.remove('writer-measuring');
  }
}

/**
 * The page view: grey gaps with footer and header drawn between sheets
 * wherever the content of a page runs out, recomputed after every change
 * and whenever the content's size changes (fonts or images loading).
 */
export const Pagination = Extension.create<PaginationOptions>({
  name: 'pagination',

  addOptions() {
    return { onPaginate: () => {} };
  },

  addCommands() {
    return {
      setPageLayout:
        (layout) =>
        ({ tr }) => {
          tr.setMeta(paginationKey, { layout } satisfies Meta);
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;
    return [
      new Plugin<PluginState>({
        key: paginationKey,
        state: {
          init: () => ({ result: INITIAL, layout: null, decorations: DecorationSet.empty }),
          apply(tr, value) {
            const meta = tr.getMeta(paginationKey) as Meta | undefined;
            if (meta && 'layout' in meta) {
              return { ...value, layout: meta.layout, decorations: buildDecorations(tr.doc, value.result, meta.layout) };
            }
            if (meta && 'result' in meta) {
              return { ...value, result: meta.result, decorations: buildDecorations(tr.doc, meta.result, value.layout) };
            }
            return tr.docChanged ? { ...value, decorations: value.decorations.map(tr.mapping, tr.doc) } : value;
          },
        },
        props: {
          decorations: (state) => paginationKey.getState(state)?.decorations,
        },
        view(view) {
          let frame = 0;
          const schedule = () => {
            cancelAnimationFrame(frame);
            frame = requestAnimationFrame(() => {
              const state = paginationKey.getState(view.state);
              if (!state?.layout || view.isDestroyed) return;
              const result = paginate(measure(view, state.layout.contentHeight), state.layout.contentHeight);
              if (!samePagination(result, state.result)) {
                view.dispatch(view.state.tr.setMeta(paginationKey, { result } satisfies Meta).setMeta('addToHistory', false));
              }
              options.onPaginate(result);
            });
          };
          const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
          observer?.observe(view.dom);
          schedule();
          return {
            update: (_view, previous) => {
              if (view.state.doc !== previous.doc || paginationKey.getState(view.state) !== paginationKey.getState(previous)) {
                schedule();
              }
            },
            destroy: () => {
              cancelAnimationFrame(frame);
              observer?.disconnect();
            },
          };
        },
      }),
    ];
  },
});
