import type {
  FileChild,
  IParagraphOptions,
  IRunOptions,
  ParagraphChild,
  Paragraph as ParagraphType,
  Table as TableType,
} from 'docx';
import { injectKeptParts } from '../utils/docxKeptParts';
import { columnWidthsOf } from '../utils/docxTableGrid';
import { inlineText, type DocMark, type DocNode } from '../utils/docJson';
import { decodeDataUrlImage, fitWidth } from '../utils/imageData';
import {
  mmToTwips,
  pageDimensionsMm,
  pageGeometryPx,
  parsePageSetup,
  splitPageTemplate,
  type PageSetup,
} from '../utils/pageSetup';

type Docx = typeof import('docx');

/** Writer's defaults, the same in the editor stylesheet (writer.css) and in Word. */
export const DEFAULT_FONT = 'Arial';
export const DEFAULT_FONT_SIZE_PT = 11;
/** One indent step: 1.27 cm, Word's default tab. */
export const INDENT_STEP_TWIPS = 720;
const TWIPS_PER_CM = 567;
const EMU_PER_PX = 9525;

/** A paragraph's own spacing in twips, or nothing when the styles' will do. A list item sits tight unless it says otherwise. */
function spacingOf(lineHeight: number, inList: boolean, before: number | null, after: number | null) {
  const spacing = {
    ...(lineHeight > 0 ? { line: Math.round(240 * lineHeight) } : {}),
    ...(before !== null ? { before: Math.round(before * 20) } : {}),
    ...(after !== null ? { after: Math.round(after * 20) } : inList ? { after: 0 } : {}),
  };
  return Object.keys(spacing).length ? spacing : undefined;
}

export interface DocxExportOptions {
  title: string;
  pageSetup: PageSetup;
  /** "Trang {page} / {pages}" in the current language. */
  pageTemplate: string;
  /** Heading of the generated table of contents. */
  tocTitle: string;
}

/**
 * Writes the editor's document as a real .docx: paragraph styles, character
 * formatting, lists, tables with merged cells, images, page breaks, a table
 * of contents field, and the page setup with its header, footer and page
 * numbers. The `docx` library loads on first use.
 */
export async function exportDocx(doc: DocNode, options: DocxExportOptions): Promise<Blob> {
  const docx = await import('docx');
  const writer = new DocxWriter(docx, options);
  const children = writer.blocks(doc.content ?? []);
  // Normalised, so a setup saved by an older version (no base font or size) still exports.
  const pageSetup = parsePageSetup(options.pageSetup);
  const { width, height } = pageDimensionsMm(pageSetup);

  const footerChildren: ParagraphChild[] = [];
  // A header or footer kept from the imported file is written as it was, not remade from its text.
  if (!pageSetup.keptFooter && pageSetup.footerText.trim()) footerChildren.push(new docx.TextRun(pageSetup.footerText));
  if (!pageSetup.keptFooter && pageSetup.pageNumbers) {
    if (footerChildren.length) footerChildren.push(new docx.TextRun({ text: '    ' }));
    for (const part of splitPageTemplate(options.pageTemplate)) {
      footerChildren.push(
        'field' in part
          ? new docx.TextRun({ children: [part.field === 'page' ? docx.PageNumber.CURRENT : docx.PageNumber.TOTAL_PAGES] })
          : new docx.TextRun(part.text),
      );
    }
  }

  const document = new docx.Document({
    title: options.title,
    creator: 'Felix Office',
    features: { updateFields: writer.hasTableOfContents },
    footnotes: writer.footnotes,
    comments: { children: writer.comments },
    styles: {
      default: {
        // The page view's own spacing: what the document sets (1.15 lines and 8 pt after in a new one).
        document: {
          run: { font: pageSetup.baseFont || DEFAULT_FONT, size: Math.round(pageSetup.baseSize * 2) },
          paragraph: { spacing: { after: Math.round(pageSetup.spaceAfter * 20), line: Math.round(pageSetup.lineHeight * 240) } },
        },
        ...headingStyles(),
      },
    },
    numbering: { config: numberingConfig(docx, writer.orderedLists) },
    sections: [
      {
        properties: {
          page: {
            // Word expects the portrait width/height and swaps them itself for landscape.
            size: {
              width: mmToTwips(pageSetup.orientation === 'landscape' ? height : width),
              height: mmToTwips(pageSetup.orientation === 'landscape' ? width : height),
              orientation:
                pageSetup.orientation === 'landscape' ? docx.PageOrientation.LANDSCAPE : docx.PageOrientation.PORTRAIT,
            },
            margin: {
              top: mmToTwips(pageSetup.margins.top),
              bottom: mmToTwips(pageSetup.margins.bottom),
              left: mmToTwips(pageSetup.margins.left),
              right: mmToTwips(pageSetup.margins.right),
              header: mmToTwips(pageSetup.headerDistance ?? Math.min(12.5, pageSetup.margins.top / 2)),
              footer: mmToTwips(pageSetup.footerDistance ?? Math.min(12.5, pageSetup.margins.bottom / 2)),
            },
          },
          ...(pageSetup.columns > 1 ? { column: { count: pageSetup.columns, space: mmToTwips(pageSetup.columnGap) } } : {}),
        },
        headers: !pageSetup.keptHeader && pageSetup.headerText.trim()
          ? {
              default: new docx.Header({
                children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, text: pageSetup.headerText })],
              }),
            }
          : undefined,
        footers: footerChildren.length
          ? {
              default: new docx.Footer({
                children: [new docx.Paragraph({ alignment: docx.AlignmentType.CENTER, children: footerChildren })],
              }),
            }
          : undefined,
        children: children.length ? children : [new docx.Paragraph('')],
      },
    ],
  });

  return injectKeptParts(await docx.Packer.toBlob(document), { header: pageSetup.keptHeader, footer: pageSetup.keptFooter });
}

const BULLETS = ['●', '○', '■'];
const ORDERED_FORMATS = ['DECIMAL', 'LOWER_LETTER', 'LOWER_ROMAN'] as const;

/** The number formats a list can be set to, by the HTML list `type`. */
const FORMAT_OF_TYPE = { '1': 'DECIMAL', a: 'LOWER_LETTER', A: 'UPPER_LETTER', i: 'LOWER_ROMAN', I: 'UPPER_ROMAN' } as const;

interface OrderedList {
  reference: string;
  /** What a level is set to; the levels left out count in the order 1, a, i. */
  levels: Map<number, { type: keyof typeof FORMAT_OF_TYPE; start: number }>;
}

function numberingConfig(docx: Docx, ordered: OrderedList[]) {
  const levels = (isOrdered: boolean, set?: OrderedList['levels']) =>
    Array.from({ length: 9 }, (_, level) => {
      const own = set?.get(level);
      return {
        level,
        format: isOrdered ? docx.LevelFormat[own ? FORMAT_OF_TYPE[own.type] : ORDERED_FORMATS[level % 3]] : docx.LevelFormat.BULLET,
        text: isOrdered ? `%${level + 1}.` : BULLETS[level % 3],
        ...(own ? { start: own.start } : {}),
        alignment: docx.AlignmentType.LEFT,
        style: { paragraph: { indent: { left: INDENT_STEP_TWIPS * (level + 1), hanging: 360 } } },
      };
    });
  return [{ reference: 'felix-bullet', levels: levels(false) }, ...ordered.map((list) => ({ reference: list.reference, levels: levels(true, list.levels) }))];
}

interface ListContext {
  reference: string;
  level: number;
  instance: number;
}

class DocxWriter {
  hasTableOfContents = false;
  /** The next number for a tracked change; they must be unique in the document. */
  revisions = 1;
  /** Notes by number, in the order their references come. */
  footnotes: Record<number, { children: ParagraphType[] }> = {};
  /** Comments in the order their markers come; a Word comment is numbered from 0. */
  comments: Array<{ id: number; author: string; initials: string; date: Date; children: ParagraphType[] }> = [];
  /** Each numbered list of the document, with the format and first number of its levels. */
  orderedLists: OrderedList[] = [];
  private readonly contentWidthPx: number;

  private readonly docx: Docx;
  private readonly options: DocxExportOptions;

  constructor(docx: Docx, options: DocxExportOptions) {
    this.docx = docx;
    this.options = options;
    this.contentWidthPx = pageGeometryPx(options.pageSetup).contentWidth;
  }

  /** A floating picture waits here for the paragraph it is anchored in (the one after it). */
  private floating: DocNode | null = null;

  blocks(nodes: DocNode[], list?: ListContext, extra: Partial<IParagraphOptions> = {}): FileChild[] {
    const out: FileChild[] = [];
    for (const node of nodes) {
      if (node.type === 'image' && (node.attrs?.float === 'left' || node.attrs?.float === 'right' || node.attrs?.float === 'front')) {
        // A picture already waiting has no paragraph to wrap: it goes in as a block of its own.
        if (this.floating) out.push(...this.block(this.floating, list, extra));
        this.floating = node;
        continue;
      }
      if (this.floating && node.type !== 'paragraph' && node.type !== 'heading') {
        const lonely = this.floating;
        this.floating = null;
        out.push(...this.block(lonely, list, extra));
      }
      out.push(...this.block(node, list, extra));
    }
    if (this.floating) {
      const lonely = this.floating;
      this.floating = null;
      out.push(...this.block(lonely, list, extra));
    }
    return out;
  }

  private block(node: DocNode, list: ListContext | undefined, extra: Partial<IParagraphOptions>): FileChild[] {
    const { docx } = this;
    switch (node.type) {
      case 'paragraph':
        return [this.paragraph(node, list, extra)];
      case 'heading': {
        const level = Math.min(6, Math.max(1, Number(node.attrs?.level ?? 1)));
        return [this.paragraph(node, list, { ...extra, heading: docx.HeadingLevel[HEADING_LEVELS[level - 1]] })];
      }
      case 'blockquote':
        return this.blocks(node.content ?? [], list, {
          ...extra,
          indent: { left: INDENT_STEP_TWIPS },
          border: { left: { style: docx.BorderStyle.SINGLE, size: 12, color: 'BBBBBB', space: 8 } },
        });
      case 'codeBlock':
        return inlineText(node)
          .split('\n')
          .map(
            (line) =>
              new docx.Paragraph({
                ...extra,
                shading: { type: docx.ShadingType.CLEAR, fill: 'F3F4F6', color: 'auto' },
                children: [new docx.TextRun({ text: line, font: 'Courier New' })],
              }),
          );
      case 'bulletList':
      case 'orderedList': {
        const ordered = node.type === 'orderedList';
        const level = list ? Math.min(8, list.level + 1) : 0;
        let reference = 'felix-bullet';
        if (ordered) {
          // A numbered list inside another one is a level of its parent's numbering; any other starts its own, at its own number.
          const parent = list ? this.orderedLists.find((candidate) => candidate.reference === list.reference) : undefined;
          const target = parent ?? { reference: `felix-ordered-${this.orderedLists.length + 1}`, levels: new Map() };
          if (!parent) this.orderedLists.push(target);
          const type = node.attrs?.type as keyof typeof FORMAT_OF_TYPE | null | undefined;
          const start = Number(node.attrs?.start ?? 1);
          if ((type && type in FORMAT_OF_TYPE) || start !== 1) target.levels.set(level, { type: type && type in FORMAT_OF_TYPE ? type : (['1', 'a', 'i'] as const)[level % 3], start: Number.isFinite(start) ? start : 1 });
          reference = target.reference;
        }
        const context: ListContext = { reference, level, instance: 0 };
        return (node.content ?? []).flatMap((item) => this.blocks(item.content ?? [], context, extra));
      }
      case 'taskList':
        return (node.content ?? []).flatMap((item) => {
          const [first, ...rest] = item.content ?? [];
          const box = item.attrs?.checked ? '☒ ' : '☐ ';
          const indent = { left: INDENT_STEP_TWIPS * ((list?.level ?? -1) + 2), hanging: 360 };
          const head = first ? [this.paragraph(first, undefined, { ...extra, indent }, box)] : [];
          return [...head, ...this.blocks(rest, list, { ...extra, indent })];
        });
      case 'horizontalRule':
        return [
          new docx.Paragraph({
            ...extra,
            border: { bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: '999999', space: 1 } },
          }),
        ];
      case 'pageBreak':
        return [new docx.Paragraph({ children: [new docx.PageBreak()] })];
      case 'image':
        return [new docx.Paragraph({ ...extra, alignment: alignmentOf(docx, node.attrs?.align), children: this.image(node) })];
      case 'table':
        return [this.table(node)];
      case 'tableOfContents':
        this.hasTableOfContents = true;
        return [
          new docx.Paragraph({ heading: docx.HeadingLevel.TITLE, text: this.options.tocTitle }),
          new docx.TableOfContents(this.options.tocTitle, { hyperlink: true, headingStyleRange: '1-3' }),
        ];
      default:
        // Unknown block: keep its text rather than drop it.
        return node.content ? this.blocks(node.content, list, extra) : [];
    }
  }

  private paragraph(
    node: DocNode,
    list: ListContext | undefined,
    extra: Partial<IParagraphOptions>,
    prefix = '',
  ): ParagraphType {
    const { docx } = this;
    const attrs = node.attrs ?? {};
    const indentSteps = Number(attrs.indent ?? 0);
    const lineHeight = Number(attrs.lineHeight ?? 0);
    const firstLine = Number(attrs.firstLine ?? 0);
    const spaceBefore = attrs.spaceBefore === null || attrs.spaceBefore === undefined ? null : Number(attrs.spaceBefore);
    const spaceAfter = attrs.spaceAfter === null || attrs.spaceAfter === undefined ? null : Number(attrs.spaceAfter);
    const indent = {
      ...extra.indent,
      ...(indentSteps > 0 && !list ? { left: INDENT_STEP_TWIPS * indentSteps } : {}),
      ...(firstLine > 0 && !list ? { firstLine: Math.round(firstLine * TWIPS_PER_CM) } : {}),
    };
    const children = this.inline(node.content ?? []);
    if (prefix) children.unshift(new docx.TextRun(prefix));
    if (this.floating) {
      children.unshift(...this.image(this.floating, true));
      this.floating = null;
    }
    const markSize = Number(attrs.markSize ?? 0);
    return new docx.Paragraph({
      ...extra,
      ...(markSize > 0 && (node.content ?? []).length === 0 ? { run: { size: Math.round(markSize * 2) } } : {}),
      alignment: alignmentOf(docx, attrs.textAlign),
      numbering: list ? { reference: list.reference, level: list.level, instance: list.instance } : undefined,
      indent: Object.keys(indent).length ? indent : undefined,
      // Spacing comes from the styles (8 pt after, as in the page view); a list item sits tight, as there.
      spacing: spacingOf(lineHeight, list !== null && list !== undefined, spaceBefore, spaceAfter),
      children,
    });
  }

  private inline(nodes: DocNode[]): ParagraphChild[] {
    const { docx } = this;
    const out: ParagraphChild[] = [];
    // A comment on a stretch of text: its range opens at the first run that carries it and closes after the last.
    let open: { text: string; id: number } | null = null;
    const closeRange = () => {
      if (!open) return;
      out.push(new docx.CommentRangeEnd(open.id), new docx.TextRun({ children: [new docx.CommentReference(open.id)] }));
      open = null;
    };
    for (const node of nodes) {
      const onText = node.type === 'text' ? node.marks?.find((mark) => mark.type === 'commentRange') : undefined;
      const wanted = onText ? String(onText.attrs?.text ?? '') : null;
      if (open && open.text !== wanted) closeRange();
      if (onText && !open && wanted) {
        const id = this.comments.length;
        this.comments.push({ id, author: 'Felix Office', initials: 'FO', date: new Date(), children: [new docx.Paragraph({ children: [new docx.TextRun(wanted)] })] });
        out.push(new docx.CommentRangeStart(id));
        open = { text: wanted, id };
      }
      if (node.type === 'hardBreak') {
        out.push(new docx.TextRun({ break: 1 }));
        continue;
      }
      if (node.type === 'image') {
        out.push(...this.image(node));
        continue;
      }
      if (node.type === 'comment') {
        const id = this.comments.length;
        this.comments.push({ id, author: 'Felix Office', initials: 'FO', date: new Date(), children: [new docx.Paragraph({ children: [new docx.TextRun(String(node.attrs?.text ?? ''))] })] });
        out.push(new docx.CommentRangeStart(id), new docx.CommentRangeEnd(id), new docx.TextRun({ children: [new docx.CommentReference(id)] }));
        continue;
      }
      if (node.type === 'footnote') {
        const id = Object.keys(this.footnotes).length + 1;
        this.footnotes[id] = { children: [new docx.Paragraph({ children: [new docx.TextRun(String(node.attrs?.text ?? ''))] })] };
        out.push(new docx.FootnoteReferenceRun(id));
        continue;
      }
      if (node.type === 'image') {
        // A picture in the paragraph: beside the text, or anchored to it when it floats.
        const float = node.attrs?.float;
        out.push(...this.image(node, float === 'left' || float === 'right' || float === 'front'));
        continue;
      }
      if (node.type === 'tab') {
        out.push(new docx.TextRun({ children: [new docx.Tab()] }));
        continue;
      }
      if (node.type !== 'text' || !node.text) continue;
      const inserted = node.marks?.find((mark) => mark.type === 'insertion');
      const deleted = node.marks?.find((mark) => mark.type === 'deletion');
      const change = inserted ?? deleted;
      if (change) {
        const revision = { id: this.revisions++, author: String(change.attrs?.author || 'Felix Office'), date: `${String(change.attrs?.date || new Date().toISOString().slice(0, 16))}:00Z` };
        const run = { text: node.text, ...runOptions(docx, node.marks ?? []), ...revision };
        out.push(inserted ? new docx.InsertedTextRun(run) : new docx.DeletedTextRun(run));
        continue;
      }
      const link = node.marks?.find((mark) => mark.type === 'link');
      const href = typeof link?.attrs?.href === 'string' ? link.attrs.href : '';
      if (href && /^(https?:|mailto:)/i.test(href)) {
        out.push(
          new docx.ExternalHyperlink({
            link: href,
            children: [new docx.TextRun({ text: node.text, ...runOptions(docx, node.marks ?? []), style: 'Hyperlink' })],
          }),
        );
      } else {
        out.push(new docx.TextRun({ text: node.text, ...runOptions(docx, node.marks ?? []) }));
      }
    }
    closeRange();
    return out;
  }

  private image(node: DocNode, anchored = false): ParagraphChild[] {
    const { docx } = this;
    const decoded = decodeDataUrlImage(String(node.attrs?.src ?? ''));
    if (!decoded) return [];
    const wantedWidth = Number(node.attrs?.width) || decoded.width;
    const wantedHeight = Number(node.attrs?.width)
      ? Math.round((decoded.height * wantedWidth) / decoded.width)
      : decoded.height;
    const size = fitWidth(wantedWidth, wantedHeight, this.contentWidthPx);
    return [
      new docx.ImageRun({
        type: decoded.type,
        data: decoded.bytes,
        transformation: size,
        altText: { name: 'image', description: String(node.attrs?.alt ?? ''), title: String(node.attrs?.title ?? '') },
        ...(anchored && node.attrs?.float === 'front'
          ? {
              floating: {
                horizontalPosition: { relative: docx.HorizontalPositionRelativeFrom.COLUMN, offset: Math.round(Number(node.attrs?.dx ?? 0) * EMU_PER_PX) },
                verticalPosition: { relative: docx.VerticalPositionRelativeFrom.PARAGRAPH, offset: Math.round(Number(node.attrs?.dy ?? 0) * EMU_PER_PX) },
                wrap: { type: docx.TextWrappingType.NONE },
                allowOverlap: true,
              },
            }
          : anchored
          ? {
              floating: {
                horizontalPosition: {
                  relative: docx.HorizontalPositionRelativeFrom.COLUMN,
                  align: node.attrs?.float === 'right' ? docx.HorizontalPositionAlign.RIGHT : docx.HorizontalPositionAlign.LEFT,
                },
                verticalPosition: { relative: docx.VerticalPositionRelativeFrom.PARAGRAPH, offset: 0 },
                wrap: { type: docx.TextWrappingType.SQUARE, side: docx.TextWrappingSide.BOTH_SIDES },
                // EMU: about 4 pt above and below, 10 pt between the picture and the text.
                margins: { top: 50800, bottom: 76200, left: node.attrs?.float === 'right' ? 127000 : 0, right: node.attrs?.float === 'right' ? 0 : 127000 },
              },
            }
          : {}),
      }),
    ];
  }

  private table(node: DocNode): TableType {
    const { docx } = this;
    const rows = node.content ?? [];
    const own = node.attrs?.borders as string | null | undefined;
    const border =
      own === 'none'
        ? { style: docx.BorderStyle.NONE, size: 0, color: 'auto' }
        : { style: docx.BorderStyle.SINGLE, size: 4, color: own && /^#[0-9a-f]{6}$/i.test(own) ? own.slice(1).toUpperCase() : '999999' };
    // With every column's width known (an imported form, or columns the user resized) the grid is written out and fixed; without, Word sizes the columns by their text.
    const grid = columnWidthsOf(
      rows.map((row) => (row.content ?? []).map((cell) => ({ colspan: Number(cell.attrs?.colspan ?? 1) || 1, rowspan: Number(cell.attrs?.rowspan ?? 1) || 1, widths: Array.isArray(cell.attrs?.colwidth) ? (cell.attrs.colwidth as unknown[]).map(Number) : [] }))),
    );
    const total = grid ? grid.reduce((sum, width) => sum + width, 0) : 0;
    const scale = grid && total > this.contentWidthPx ? this.contentWidthPx / total : 1;
    const columnWidths = grid?.map((width) => Math.max(1, Math.round(width * scale * 15)));
    return new docx.Table({
      ...(columnWidths
        ? { width: { size: columnWidths.reduce((sum, width) => sum + width, 0), type: docx.WidthType.DXA }, columnWidths, layout: docx.TableLayoutType.FIXED }
        : { width: { size: 100, type: docx.WidthType.PERCENTAGE } }),
      // Word's own cell margins, so that the text sits as far from the lines as in a table Word made.
      margins: { marginUnitType: docx.WidthType.DXA, top: 0, bottom: 0, left: 108, right: 108 },
      borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
      rows: rows.map(
        (row) =>
          new docx.TableRow({
            ...(Number(row.attrs?.rowHeight) > 0 ? { height: { value: Math.round(Number(row.attrs?.rowHeight) * 15), rule: docx.HeightRule.ATLEAST } } : {}),
            tableHeader: (row.content ?? []).every((cell) => cell.type === 'tableHeader'),
            children: (row.content ?? []).map((cell) => {
              const content = this.blocks(cell.content ?? []).filter(
                (child): child is ParagraphType | TableType =>
                  child instanceof docx.Paragraph || child instanceof docx.Table,
              );
              const widths = Array.isArray(cell.attrs?.colwidth) ? (cell.attrs.colwidth as unknown[]).map(Number) : [];
              const widthPx = widths.reduce((sum, w) => sum + (Number.isFinite(w) ? w : 0), 0) * scale;
              return new docx.TableCell({
                columnSpan: Number(cell.attrs?.colspan ?? 1) || 1,
                rowSpan: Number(cell.attrs?.rowspan ?? 1) || 1,
                width: widthPx > 0 ? { size: Math.round(widthPx * 15), type: docx.WidthType.DXA } : undefined,
                shading: cellShading(docx, cell),
                ...(cell.attrs?.valign === 'center' ? { verticalAlign: docx.VerticalAlign.CENTER } : cell.attrs?.valign === 'bottom' ? { verticalAlign: docx.VerticalAlign.BOTTOM } : {}),
                children: content.length ? content : [new docx.Paragraph('')],
              });
            }),
          }),
      ),
    });
  }
}

/** A cell's fill: the colour it was given, or the light grey of a header cell. */
function cellShading(docx: typeof import('docx'), cell: DocNode) {
  const own = typeof cell.attrs?.background === 'string' ? /^#?([0-9a-f]{6})$/i.exec(cell.attrs.background)?.[1] : undefined;
  if (own) return { type: docx.ShadingType.CLEAR, fill: own.toUpperCase(), color: 'auto' };
  return cell.type === 'tableHeader' ? { type: docx.ShadingType.CLEAR, fill: 'F3F4F6', color: 'auto' } : undefined;
}

/** Heading styles that look as they do in the page view (contentCss.ts): light, in size steps, greyer as they go down. */
function headingStyles() {
  const level = (size: number, before: number, color: string, italics = false) => ({
    run: { size: size * 2, bold: false, italics, color },
    paragraph: { spacing: { before: before * 20, after: 160 }, keepNext: true },
  });
  return {
    heading1: level(20, 14, '1F2328'),
    heading2: level(16, 12, '1F2328'),
    heading3: level(14, 10, '434343'),
    heading4: level(12, 0, '666666'),
    heading5: level(11, 0, '666666'),
    heading6: level(11, 0, '666666', true),
  };
}

const HEADING_LEVELS = ['HEADING_1', 'HEADING_2', 'HEADING_3', 'HEADING_4', 'HEADING_5', 'HEADING_6'] as const;

function alignmentOf(docx: Docx, value: unknown) {
  switch (value) {
    case 'center':
      return docx.AlignmentType.CENTER;
    case 'right':
      return docx.AlignmentType.RIGHT;
    case 'justify':
      return docx.AlignmentType.JUSTIFIED;
    default:
      return undefined;
  }
}

function runOptions(docx: Docx, marks: DocMark[]): IRunOptions {
  const has = (type: string) => marks.some((mark) => mark.type === type);
  const style = marks.find((mark) => mark.type === 'textStyle')?.attrs ?? {};
  const highlight = marks.find((mark) => mark.type === 'highlight')?.attrs;
  const color = toHex(style.color);
  const background = toHex(highlight?.color ?? style.backgroundColor) ?? (highlight ? 'FFF59D' : undefined);
  const size = fontSizeHalfPoints(style.fontSize);
  const font = typeof style.fontFamily === 'string' ? firstFontFamily(style.fontFamily) : undefined;
  return {
    bold: has('bold') || undefined,
    italics: has('italic') || undefined,
    underline: has('underline') || has('link') ? {} : undefined,
    strike: has('strike') || undefined,
    subScript: has('subscript') || undefined,
    superScript: has('superscript') || undefined,
    color: color ?? (has('link') ? '1155CC' : undefined),
    size,
    font: has('code') ? 'Courier New' : font,
    shading: background ? { type: docx.ShadingType.CLEAR, fill: background, color: 'auto' } : undefined,
  };
}

/** "#1a2b3c", "#abc" or "rgb(1, 2, 3)" as Word's "1A2B3C"; undefined otherwise. */
export function toHex(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const v = value.trim();
  let match = /^#([0-9a-f]{6})$/i.exec(v);
  if (match) return match[1].toUpperCase();
  match = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(v);
  if (match) return `${match[1]}${match[1]}${match[2]}${match[2]}${match[3]}${match[3]}`.toUpperCase();
  const rgb = /^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i.exec(v);
  if (rgb) {
    return rgb
      .slice(1, 4)
      .map((n) => Math.min(255, Number(n)).toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  }
  return undefined;
}

/** "12pt" or "16px" as Word's half-points; undefined when unset or unreadable. */
export function fontSizeHalfPoints(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = /^([\d.]+)\s*(pt|px)?$/i.exec(value.trim());
  if (!match) return undefined;
  const number = Number(match[1]);
  if (!Number.isFinite(number) || number <= 0) return undefined;
  const points = match[2]?.toLowerCase() === 'px' ? number * 0.75 : number;
  return Math.round(points * 2);
}

/** The first family of a CSS font stack, without quotes. */
export function firstFontFamily(stack: string): string | undefined {
  const first = stack.split(',')[0]?.trim().replace(/^['"]|['"]$/g, '');
  return first || undefined;
}
