import { utf8, escapeXml, zipStore, XML_DECL } from './ooxml';

export const MIME_DOCX =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export const DOCX_FONT = 'Times New Roman';
export const DOCX_BASE_SIZE = 26;
export const DOCX_TABLE_SIZE = 24;
export const DOCX_LINE = 360;

export const PAGE_WIDTH = 11906;
export const PAGE_HEIGHT = 16838;
export const MARGIN_TOP = 1417;
export const MARGIN_RIGHT = 1134;
export const MARGIN_BOTTOM = 1134;
export const MARGIN_LEFT = 1701;
export const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

export const CLAUSE_INDENT = 720;
export const ITEM_INDENT = 280;
export const SIG_SPACE_AFTER = 1500;

export type DocxAlign = 'left' | 'center' | 'right' | 'justify';

export interface DocxRun {
  text: string;
  bold?: boolean;
  italic?: boolean;
  size?: number;
  letterSpacing?: number;
  lineBreak?: boolean;
}

export interface DocxParagraph {
  kind: 'p';
  runs: DocxRun[];
  align?: DocxAlign;
  firstLine?: number;
  left?: number;
  before?: number;
  after?: number;
  line?: number;
  spacer?: boolean;
}

export interface DocxCell {
  paragraphs: DocxParagraph[];
  span?: number;
  widthPct?: number;
}

export interface DocxTable {
  kind: 'table';
  rows: DocxCell[][];
  bordered: boolean;
}

export type DocxBlock = DocxParagraph | DocxTable;

interface InlineCtx {
  bold?: boolean;
  italic?: boolean;
  size?: number;
  upper?: boolean;
  letterSpacing?: number;
}

interface BlockCtx extends InlineCtx {
  align?: DocxAlign;
  firstLine?: number;
  left?: number;
}

function pxToTwips(px: number): number {
  return Math.round(px * 15);
}

function ptToTwips(pt: number): number {
  return Math.round(pt * 20);
}

function tailwindSpacing(step: number): number {
  return pxToTwips(step * 4);
}

function styleOf(el: Element): Record<string, string> {
  const raw = el.getAttribute('style') || '';
  const out: Record<string, string> = {};
  for (const part of raw.split(';')) {
    const at = part.indexOf(':');
    if (at < 0) continue;
    out[part.slice(0, at).trim().toLowerCase()] = part.slice(at + 1).trim();
  }
  return out;
}

function alignFromValue(value: string): DocxAlign | undefined {
  if (value === 'center' || value === 'right' || value === 'left') return value;
  if (value === 'justify') return 'justify';
  return undefined;
}

function inlineCtxOf(el: Element, ctx: InlineCtx): InlineCtx {
  const next: InlineCtx = { ...ctx };
  const tag = el.tagName.toLowerCase();
  if (tag === 'strong' || tag === 'b' || tag === 'th') next.bold = true;
  if (tag === 'em' || tag === 'i') next.italic = true;

  for (const cls of Array.from(el.classList)) {
    if (cls === 'font-bold' || cls === 'text-bold') next.bold = true;
    if (cls === 'font-italic') next.italic = true;
    if (cls === 'uppercase') next.upper = true;
    const size = /^text-\[(\d+(?:\.\d+)?)pt\]$/.exec(cls);
    if (size) next.size = Math.round(parseFloat(size[1]) * 2);
  }

  const css = styleOf(el);
  if (css['letter-spacing']) {
    const px = parseFloat(css['letter-spacing']);
    if (isFinite(px)) next.letterSpacing = pxToTwips(px);
  }
  if (css['font-weight'] === 'bold') next.bold = true;
  if (css['font-style'] === 'italic') next.italic = true;
  return next;
}

function normalizeText(text: string, upper?: boolean): string {
  const collapsed = text.replace(/[^\S\u00a0]+/g, ' ');
  return upper ? collapsed.toLocaleUpperCase('vi-VN') : collapsed;
}

function collectRuns(node: Node, ctx: InlineCtx, runs: DocxRun[]): void {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      const text = normalizeText(child.nodeValue || '', ctx.upper);
      if (text !== '') {
        runs.push({
          text,
          bold: ctx.bold,
          italic: ctx.italic,
          size: ctx.size,
          letterSpacing: ctx.letterSpacing,
        });
      }
      continue;
    }
    if (child.nodeType !== 1) continue;
    const el = child as Element;
    if (el.tagName.toLowerCase() === 'br') {
      runs.push({ text: '', lineBreak: true });
      continue;
    }
    collectRuns(el, inlineCtxOf(el, ctx), runs);
  }
}

function trimRuns(runs: DocxRun[]): DocxRun[] {
  const out = runs.slice();
  while (out.length > 0 && !out[0].lineBreak && out[0].text.trim() === '') out.shift();
  while (out.length > 0) {
    const last = out[out.length - 1];
    if (last.lineBreak || last.text.trim() === '') out.pop();
    else break;
  }
  if (out.length > 0) {
    out[0] = { ...out[0], text: out[0].text.replace(/^ +/, '') };
    const at = out.length - 1;
    out[at] = { ...out[at], text: out[at].text.replace(/ +$/, '') };
  }
  return out;
}

function blockCtxOf(el: Element, ctx: BlockCtx): BlockCtx {
  const next: BlockCtx = { ...ctx, ...inlineCtxOf(el, ctx) };
  for (const cls of Array.from(el.classList)) {
    if (cls === 'text-center') next.align = 'center';
    if (cls === 'text-right') next.align = 'right';
    if (cls === 'text-left') next.align = 'left';
    if (cls === 'text-justify') next.align = 'justify';
    if (cls === 'no-indent') next.firstLine = 0;
    const pl = /^pl-(\d+(?:\.\d+)?)$/.exec(cls);
    if (pl) next.left = (next.left || 0) + tailwindSpacing(parseFloat(pl[1]));
  }
  const css = styleOf(el);
  if (css['text-align']) next.align = alignFromValue(css['text-align']) || next.align;
  if (css['margin-left']) {
    const px = parseFloat(css['margin-left']);
    if (isFinite(px)) next.left = pxToTwips(px);
  }
  if (css['text-indent']) {
    const px = parseFloat(css['text-indent']);
    if (isFinite(px)) next.firstLine = pxToTwips(px);
  }
  return next;
}

function extraSpacing(el: Element): { before: number; after: number } {
  let before = 0;
  let after = 0;
  for (const cls of Array.from(el.classList)) {
    const pt = /^pt-(\d+(?:\.\d+)?)$/.exec(cls);
    if (pt) before += tailwindSpacing(parseFloat(pt[1]));
    const pb = /^pb-(\d+(?:\.\d+)?)$/.exec(cls);
    if (pb) after += tailwindSpacing(parseFloat(pb[1]));
  }
  const margin = styleOf(el)['margin'];
  if (margin) {
    const parts = margin.split(/\s+/).map(v => parseFloat(v));
    if (parts.length > 0 && isFinite(parts[0])) before += pxToTwips(parts[0]);
    const bottom = parts.length >= 3 ? parts[2] : parts[0];
    if (isFinite(bottom)) after += pxToTwips(bottom);
  }
  return { before, after };
}

const BLOCK_TAGS = new Set(['h1', 'h2', 'h3', 'p', 'div', 'table', 'ul', 'ol', 'li']);

function baseParagraph(tag: string, el: Element): DocxParagraph {
  if (tag === 'h1') {
    return { kind: 'p', runs: [], align: 'center', before: ptToTwips(14), after: ptToTwips(12), line: DOCX_LINE };
  }
  if (tag === 'h2' || tag === 'h3') {
    return { kind: 'p', runs: [], align: 'left', before: ptToTwips(12), after: ptToTwips(6), line: DOCX_LINE };
  }
  const p: DocxParagraph = {
    kind: 'p',
    runs: [],
    before: ptToTwips(3),
    after: ptToTwips(6),
    line: DOCX_LINE,
  };
  if (el.classList.contains('clause-p')) {
    p.align = 'justify';
    p.firstLine = CLAUSE_INDENT;
    p.before = ptToTwips(4);
  }
  if (el.classList.contains('item-p')) {
    p.align = 'justify';
    p.left = ITEM_INDENT;
    p.firstLine = 0;
    p.before = ptToTwips(2);
    p.after = ptToTwips(2);
  }
  return p;
}

function headingCtx(tag: string, ctx: BlockCtx): BlockCtx {
  if (tag === 'h1') return { ...ctx, bold: true, upper: true, size: 32 };
  if (tag === 'h2' || tag === 'h3') return { ...ctx, bold: true, upper: true, size: DOCX_BASE_SIZE };
  return ctx;
}

function paragraphFrom(el: Element, ctx: BlockCtx): DocxParagraph {
  const tag = el.tagName.toLowerCase();
  const merged = headingCtx(tag, blockCtxOf(el, ctx));
  const p = baseParagraph(tag, el);
  const extra = extraSpacing(el);

  if (merged.align) p.align = merged.align;
  if (merged.firstLine !== undefined) p.firstLine = merged.firstLine;
  if (merged.left !== undefined) p.left = merged.left;
  p.before = (p.before || 0) + extra.before;
  p.after = (p.after || 0) + extra.after;

  const runs: DocxRun[] = [];
  collectRuns(el, merged, runs);
  p.runs = trimRuns(runs);
  return p;
}

function tableFrom(el: Element, ctx: BlockCtx): DocxTable {
  const bordered = el.classList.contains('table-doc');
  const tableCtx = blockCtxOf(el, ctx);
  const rows: DocxCell[][] = [];

  for (const tr of Array.from(el.querySelectorAll('tr'))) {
    const cells: DocxCell[] = [];
    for (const cellEl of Array.from(tr.children)) {
      const tag = cellEl.tagName.toLowerCase();
      if (tag !== 'td' && tag !== 'th') continue;

      const cellCtx = blockCtxOf(cellEl, { ...tableCtx, size: DOCX_TABLE_SIZE, firstLine: 0 });
      if (tag === 'th') {
        cellCtx.bold = true;
        if (!cellCtx.align) cellCtx.align = 'center';
      }

      const paragraphs = cellParagraphs(cellEl, cellCtx);
      const css = styleOf(cellEl);
      const width = /^(\d+(?:\.\d+)?)%$/.exec(css['width'] || '');
      const span = parseInt(cellEl.getAttribute('colspan') || '1', 10);

      cells.push({
        paragraphs,
        span: span > 1 ? span : undefined,
        widthPct: width ? parseFloat(width[1]) : undefined,
      });
    }
    if (cells.length > 0) rows.push(cells);
  }

  return { kind: 'table', rows, bordered };
}

function cellParagraphs(el: Element, ctx: BlockCtx): DocxParagraph[] {
  const blocks = walkBlocks(el, ctx);
  const out = blocks
    .filter((b): b is DocxParagraph => b.kind === 'p')
    .map(p => (p.spacer ? p : { ...p, before: 0, after: 0 }));
  if (out.length === 0) {
    out.push({ kind: 'p', runs: [], align: ctx.align, line: DOCX_LINE, before: 0, after: 0 });
  }
  return out;
}

function walkBlocks(node: Element, ctx: BlockCtx): DocxBlock[] {
  const out: DocxBlock[] = [];
  let pending: DocxRun[] = [];

  const flush = () => {
    const runs = trimRuns(pending);
    pending = [];
    if (runs.length === 0) return;
    out.push({
      kind: 'p',
      runs,
      align: ctx.align,
      firstLine: ctx.firstLine,
      left: ctx.left,
      before: ptToTwips(3),
      after: ptToTwips(6),
      line: DOCX_LINE,
    });
  };

  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === 3) {
      const text = normalizeText(child.nodeValue || '', ctx.upper);
      if (text.trim() !== '') {
        pending.push({ text, bold: ctx.bold, italic: ctx.italic, size: ctx.size });
      }
      continue;
    }
    if (child.nodeType !== 1) continue;

    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (!BLOCK_TAGS.has(tag)) {
      collectRuns(el, inlineCtxOf(el, ctx), pending);
      continue;
    }

    flush();

    if (tag === 'table') {
      out.push(tableFrom(el, ctx));
      continue;
    }

    if (tag === 'div' || tag === 'ul' || tag === 'ol') {
      if (el.classList.contains('sig-space')) {
        out.push({
          kind: 'p',
          runs: [],
          before: 0,
          after: SIG_SPACE_AFTER,
          line: DOCX_LINE,
          spacer: true,
        });
        continue;
      }
      const inner = walkBlocks(el, blockCtxOf(el, ctx));
      const extra = extraSpacing(el);
      const first = inner[0];
      const last = inner[inner.length - 1];
      if (first && first.kind === 'p') first.before = (first.before || 0) + extra.before;
      if (last && last.kind === 'p') last.after = (last.after || 0) + extra.after;
      out.push(...inner);
      continue;
    }

    out.push(paragraphFrom(el, ctx));
  }

  flush();
  return out;
}

export function parseDocumentHtml(html: string): DocxBlock[] {
  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  return walkBlocks(doc.body, {});
}

function runXml(run: DocxRun): string {
  if (run.lineBreak) return '<w:r><w:br/></w:r>';

  const props: string[] = [];
  if (run.bold) props.push('<w:b/><w:bCs/>');
  if (run.italic) props.push('<w:i/><w:iCs/>');
  if (run.letterSpacing) props.push(`<w:spacing w:val="${run.letterSpacing}"/>`);
  if (run.size) props.push(`<w:sz w:val="${run.size}"/><w:szCs w:val="${run.size}"/>`);
  const rPr = props.length > 0 ? `<w:rPr>${props.join('')}</w:rPr>` : '';

  return `<w:r>${rPr}<w:t xml:space="preserve">${escapeXml(run.text)}</w:t></w:r>`;
}

const JC: Record<DocxAlign, string> = {
  left: 'left',
  center: 'center',
  right: 'right',
  justify: 'both',
};

export function paragraphXml(p: DocxParagraph): string {
  const props: string[] = [];

  const spacingParts: string[] = [];
  if (p.before !== undefined) spacingParts.push(`w:before="${p.before}"`);
  if (p.after !== undefined) spacingParts.push(`w:after="${p.after}"`);
  if (p.line !== undefined) spacingParts.push(`w:line="${p.line}" w:lineRule="auto"`);
  if (spacingParts.length > 0) props.push(`<w:spacing ${spacingParts.join(' ')}/>`);

  const indParts: string[] = [];
  if (p.left) indParts.push(`w:left="${p.left}"`);
  if (p.firstLine) indParts.push(`w:firstLine="${p.firstLine}"`);
  if (indParts.length > 0) props.push(`<w:ind ${indParts.join(' ')}/>`);

  if (p.align) props.push(`<w:jc w:val="${JC[p.align]}"/>`);

  const pPr = props.length > 0 ? `<w:pPr>${props.join('')}</w:pPr>` : '';
  return `<w:p>${pPr}${p.runs.map(runXml).join('')}</w:p>`;
}

function gridColumns(table: DocxTable): number[] {
  const first = table.rows[0] || [];
  const spans = first.map(c => c.span || 1);
  const total = spans.reduce((s, n) => s + n, 0) || 1;

  const known = first.every(c => c.widthPct !== undefined);
  if (known && spans.every(n => n === 1)) {
    const sum = first.reduce((s, c) => s + (c.widthPct as number), 0) || 100;
    return first.map(c => Math.round((CONTENT_WIDTH * (c.widthPct as number)) / sum));
  }

  const each = Math.round(CONTENT_WIDTH / total);
  return Array.from({ length: total }, () => each);
}

const CELL_MARGIN =
  '<w:tblCellMar>'
  + '<w:top w:w="60" w:type="dxa"/><w:left w:w="120" w:type="dxa"/>'
  + '<w:bottom w:w="60" w:type="dxa"/><w:right w:w="120" w:type="dxa"/>'
  + '</w:tblCellMar>';

const CELL_BORDERS =
  '<w:tblBorders>'
  + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
    .map(side => `<w:${side} w:val="single" w:sz="8" w:space="0" w:color="000000"/>`)
    .join('')
  + '</w:tblBorders>';

export function tableXml(table: DocxTable): string {
  const grid = gridColumns(table);
  const vAlign = table.bordered ? 'center' : 'top';

  const props = '<w:tblPr>'
    + '<w:tblW w:w="5000" w:type="pct"/>'
    + (table.bordered ? CELL_BORDERS : '')
    + '<w:tblLayout w:type="fixed"/>'
    + CELL_MARGIN
    + '</w:tblPr>';

  const gridXml = `<w:tblGrid>${grid.map(w => `<w:gridCol w:w="${w}"/>`).join('')}</w:tblGrid>`;

  const rowsXml = table.rows.map(row => {
    let at = 0;
    const cells = row.map(cell => {
      const span = cell.span || 1;
      const width = cell.widthPct !== undefined
        ? Math.round(cell.widthPct * 50)
        : Math.round((grid.slice(at, at + span).reduce((s, w) => s + w, 0) / CONTENT_WIDTH) * 5000);
      at += span;

      const tcPr = '<w:tcPr>'
        + `<w:tcW w:w="${width}" w:type="pct"/>`
        + (span > 1 ? `<w:gridSpan w:val="${span}"/>` : '')
        + `<w:vAlign w:val="${vAlign}"/>`
        + '</w:tcPr>';

      return `<w:tc>${tcPr}${cell.paragraphs.map(paragraphXml).join('')}</w:tc>`;
    }).join('');
    return `<w:tr>${cells}</w:tr>`;
  }).join('');

  return `<w:tbl>${props}${gridXml}${rowsXml}</w:tbl>`;
}

const SECT_PR = '<w:sectPr>'
  + `<w:pgSz w:w="${PAGE_WIDTH}" w:h="${PAGE_HEIGHT}"/>`
  + `<w:pgMar w:top="${MARGIN_TOP}" w:right="${MARGIN_RIGHT}"`
  + ` w:bottom="${MARGIN_BOTTOM}" w:left="${MARGIN_LEFT}"`
  + ' w:header="720" w:footer="720" w:gutter="0"/>'
  + '</w:sectPr>';

export function documentXml(blocks: DocxBlock[]): string {
  const body = blocks.map(block => (
    block.kind === 'table'
      ? tableXml(block) + '<w:p/>'
      : paragraphXml(block)
  )).join('');

  return XML_DECL
    + '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    + `<w:body>${body}${SECT_PR}</w:body>`
    + '</w:document>';
}

const STYLES_XML = XML_DECL
  + '<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
  + '<w:docDefaults><w:rPrDefault><w:rPr>'
  + `<w:rFonts w:ascii="${DOCX_FONT}" w:hAnsi="${DOCX_FONT}" w:cs="${DOCX_FONT}"/>`
  + `<w:sz w:val="${DOCX_BASE_SIZE}"/><w:szCs w:val="${DOCX_BASE_SIZE}"/>`
  + '<w:color w:val="000000"/>'
  + '</w:rPr></w:rPrDefault>'
  + '<w:pPrDefault><w:pPr>'
  + `<w:spacing w:before="60" w:after="120" w:line="${DOCX_LINE}" w:lineRule="auto"/>`
  + '</w:pPr></w:pPrDefault></w:docDefaults>'
  + '<w:style w:type="paragraph" w:default="1" w:styleId="Normal">'
  + '<w:name w:val="Normal"/><w:qFormat/></w:style>'
  + '</w:styles>';

const CONTENT_TYPES = XML_DECL
  + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/word/document.xml"'
  + ' ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
  + '<Override PartName="/word/styles.xml"'
  + ' ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>'
  + '</Types>';

const ROOT_RELS = XML_DECL
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1"'
  + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"'
  + ' Target="word/document.xml"/>'
  + '</Relationships>';

const DOCUMENT_RELS = XML_DECL
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1"'
  + ' Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"'
  + ' Target="styles.xml"/>'
  + '</Relationships>';

export function buildDocx(blocks: DocxBlock[]): Uint8Array {
  return zipStore([
    { name: '[Content_Types].xml', data: utf8(CONTENT_TYPES) },
    { name: '_rels/.rels', data: utf8(ROOT_RELS) },
    { name: 'word/document.xml', data: utf8(documentXml(blocks)) },
    { name: 'word/_rels/document.xml.rels', data: utf8(DOCUMENT_RELS) },
    { name: 'word/styles.xml', data: utf8(STYLES_XML) },
  ]);
}

export function htmlToDocx(html: string): Uint8Array {
  return buildDocx(parseDocumentHtml(html));
}
