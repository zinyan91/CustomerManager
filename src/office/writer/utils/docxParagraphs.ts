/**
 * mammoth drops a paragraph's indent and line spacing. They are carried through it as a marker run put at
 * the start of the paragraph in the document XML, and turned back into the editor's styles in the HTML.
 */
import { markerParts, type ListMarker } from './docxNumbering';
import { inheritedSpacing, tableStyleRanges, type StyleSpacings } from './docxStyleSpacing';

const MARK = '⁣';
const INDENT_STEP_TWIPS = 720;
const MAX_INDENT = 8;
const MARKER = new RegExp(`${MARK}\\[([^\\]]*)\\]${MARK}`, 'g');

function attribute(tag: string, names: string[]): number | null {
  for (const name of names) {
    const match = new RegExp(`\\bw:${name}="(-?\\d+)"`).exec(tag);
    if (match) return Number(match[1]);
  }
  return null;
}

export interface ParagraphFormat {
  /** Left indent in steps of half an inch. */
  indent: number;
  /** Line spacing as a multiple of one line. */
  lineHeight: number | null;
  /** Space above and below, in points. */
  before: number | null;
  after: number | null;
  /** How far the first line is pushed in, in centimetres. */
  firstLine: number | null;
  /** Font size of the paragraph mark in points: what the line of an empty paragraph is as tall as. */
  markSize: number | null;
}

/** What a paragraph's own properties say about how it is set. */
export function paragraphFormat(properties: string): ParagraphFormat {
  const inList = /<w:numPr>/.test(properties);
  const ind = /<w:ind\b[^>]*>/.exec(properties)?.[0] ?? '';
  const left = attribute(ind, ['left', 'start']);
  const spacing = /<w:spacing\b[^>]*>/.exec(properties)?.[0] ?? '';
  const line = attribute(spacing, ['line']);
  const rule = /\bw:lineRule="(\w+)"/.exec(spacing)?.[1];
  const multiple = line !== null && (rule === undefined || rule === 'auto') && line >= 120 && line <= 1200 ? Math.round((line / 240) * 100) / 100 : null;
  const before = attribute(spacing, ['before']);
  const after = attribute(spacing, ['after']);
  const firstLine = attribute(ind, ['firstLine']);
  const markProperties = /<w:rPr>([\s\S]*?)<\/w:rPr>/.exec(properties)?.[1] ?? '';
  const markHalfPoints = attribute(/<w:sz\b[^>]*>/.exec(markProperties)?.[0] ?? '', ['val']);
  return {
    indent: !inList && left !== null && left > 0 ? Math.min(MAX_INDENT, Math.max(1, Math.round(left / INDENT_STEP_TWIPS))) : 0,
    lineHeight: multiple,
    before: before !== null && before >= 0 && before <= 4000 ? before / 20 : null,
    after: after !== null && after >= 0 && after <= 4000 ? after / 20 : null,
    firstLine: !inList && firstLine !== null && firstLine > 0 ? Math.round((firstLine / 567) * 100) / 100 : null,
    markSize: markHalfPoints !== null && markHalfPoints >= 2 && markHalfPoints <= 400 ? markHalfPoints / 2 : null,
  };
}

/** The document with a marker run in front of every paragraph that has an indent or a line spacing of its own. */
export function markParagraphFormat(documentXml: string, lists: ReadonlyMap<number, ListMarker> = new Map(), styles?: StyleSpacings): string {
  let index = -1;
  const tables = styles ? tableStyleRanges(documentXml) : [];
  return documentXml.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g, (paragraph, offset: number) => {
    index += 1;
    // A text box holds paragraphs inside a paragraph, which this match would cut short.
    const opens = (paragraph.match(/<w:p[\s>]/g) ?? []).length;
    if (opens !== 1) return paragraph;
    const properties = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(paragraph);
    const own = paragraphFormat(properties?.[1] ?? '');
    // What the paragraph's style, or the table it is in, says where the paragraph itself says nothing.
    const inTable = styles ? tables.filter(([from, to]) => offset >= from && offset < to).pop() : undefined;
    const inherited = styles
      ? inheritedSpacing(styles, /<w:pStyle\b[^>]*\bw:val="([^"]+)"/.exec(properties?.[1] ?? '')?.[1] ?? null, inTable?.[2] ?? null)
      : { before: null, after: null, lineHeight: null };
    const { indent, firstLine } = own;
    // Only an empty paragraph is as tall as its mark.
    const isEmpty = !/<w:(?:t|drawing|pict|br|tab|object)[ >/]/.test(paragraph.replace(/<w:pPr>[\s\S]*?<\/w:pPr>/, ''));
    const markSize = isEmpty ? own.markSize : null;
    const lineHeight = own.lineHeight ?? inherited.lineHeight;
    const before = own.before ?? inherited.before;
    const after = own.after ?? inherited.after;
    const list = lists.get(index);
    if (indent === 0 && lineHeight === null && before === null && after === null && firstLine === null && markSize === null && !list) return paragraph;
    const parts = [
      list ? markerParts(list) : '',
      indent > 0 ? `i=${indent}` : '',
      lineHeight !== null ? `l=${lineHeight}` : '',
      before !== null ? `b=${before}` : '',
      after !== null ? `a=${after}` : '',
      firstLine !== null ? `f=${firstLine}` : '',
      markSize !== null ? `z=${markSize}` : '',
    ]
      .filter(Boolean)
      .join(';');
    const run = `<w:r><w:t xml:space="preserve">${MARK}[${parts}]${MARK}</w:t></w:r>`;
    return properties ? paragraph.replace('</w:pPr>', `</w:pPr>${run}`) : paragraph.replace(/^<w:p\b[^>]*>/, (open) => `${open}${run}`);
  });
}

/** The editor's styles from the markers at the start of paragraphs; markers anywhere else are dropped. A list item takes none: its spacing is the list's. */
export function applyParagraphMarkers(html: string): string {
  const placed = html.replace(new RegExp(`<(p|h[1-6])([^>]*)>${MARK}\\[([^\\]]*)\\]${MARK}`, 'g'), (_match, tag: string, attrs: string, parts: string) => {
    const styles: string[] = [];
    let markSize = '';
    for (const part of parts.split(';')) {
      const [key, value] = part.split('=');
      if (key === 'i') styles.push(`margin-left: ${(Number(value) * 1.27).toFixed(2)}cm`);
      else if (key === 'l') styles.push(`line-height: ${value}`);
      else if (key === 'b') styles.push(`margin-top: ${value}pt`);
      else if (key === 'a') styles.push(`margin-bottom: ${value}pt`);
      else if (key === 'f') styles.push(`text-indent: ${value}cm`);
      else if (key === 'z' && Number(value) > 0) markSize = ` data-mark-size="${Number(value)}"`;
    }
    const existing = /\sstyle="([^"]*)"/.exec(attrs);
    const merged = [existing?.[1].trim().replace(/;$/, ''), ...styles].filter(Boolean).join('; ');
    const rest = attrs.replace(/\sstyle="[^"]*"/, '');
    return `<${tag}${rest}${markSize} style="${merged}">`;
  });
  return placed.replace(MARKER, '');
}
