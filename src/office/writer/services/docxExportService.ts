import type {
  FileChild,
  IParagraphOptions,
  IRunOptions,
  ParagraphChild,
  Paragraph as ParagraphType,
  Table as TableType,
} from 'docx';
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
  if (pageSetup.footerText.trim()) footerChildren.push(new docx.TextRun(pageSetup.footerText));
  if (pageSetup.pageNumbers) {
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
    styles: {
      default: {
        document: { run: { font: pageSetup.baseFont || DEFAULT_FONT, size: Math.round(pageSetup.baseSize * 2) } },
      },
    },
    numbering: { config: numberingConfig(docx) },
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
              header: mmToTwips(Math.min(12.5, pageSetup.margins.top / 2)),
              footer: mmToTwips(Math.min(12.5, pageSetup.margins.bottom / 2)),
            },
          },
        },
        headers: pageSetup.headerText.trim()
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

  return docx.Packer.toBlob(document);
}

const BULLETS = ['●', '○', '■'];
const ORDERED_FORMATS = ['DECIMAL', 'LOWER_LETTER', 'LOWER_ROMAN'] as const;

function numberingConfig(docx: Docx) {
  const levels = (ordered: boolean) =>
    Array.from({ length: 9 }, (_, level) => ({
      level,
      format: ordered ? docx.LevelFormat[ORDERED_FORMATS[level % 3]] : docx.LevelFormat.BULLET,
      text: ordered ? `%${level + 1}.` : BULLETS[level % 3],
      alignment: docx.AlignmentType.LEFT,
      style: { paragraph: { indent: { left: INDENT_STEP_TWIPS * (level + 1), hanging: 360 } } },
    }));
  return [
    { reference: 'felix-bullet', levels: levels(false) },
    { reference: 'felix-ordered', levels: levels(true) },
  ];
}

interface ListContext {
  reference: 'felix-bullet' | 'felix-ordered';
  level: number;
  instance: number;
}

class DocxWriter {
  hasTableOfContents = false;
  private orderedInstances = 0;
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
      if (node.type === 'image' && (node.attrs?.float === 'left' || node.attrs?.float === 'right')) {
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
        const context: ListContext = {
          reference: ordered ? 'felix-ordered' : 'felix-bullet',
          level,
          // A new top-level numbered list restarts at 1; a nested one continues its parent's.
          instance: ordered ? (list?.reference === 'felix-ordered' ? list.instance : ++this.orderedInstances) : 0,
        };
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
    const children = this.inline(node.content ?? []);
    if (prefix) children.unshift(new docx.TextRun(prefix));
    if (this.floating) {
      children.unshift(...this.image(this.floating, true));
      this.floating = null;
    }
    return new docx.Paragraph({
      ...extra,
      alignment: alignmentOf(docx, attrs.textAlign),
      numbering: list ? { reference: list.reference, level: list.level, instance: list.instance } : undefined,
      indent: indentSteps > 0 && !list ? { left: INDENT_STEP_TWIPS * indentSteps } : extra.indent,
      spacing: lineHeight > 0 ? { line: Math.round(240 * lineHeight), after: 120 } : { after: 120 },
      children,
    });
  }

  private inline(nodes: DocNode[]): ParagraphChild[] {
    const { docx } = this;
    const out: ParagraphChild[] = [];
    for (const node of nodes) {
      if (node.type === 'hardBreak') {
        out.push(new docx.TextRun({ break: 1 }));
        continue;
      }
      if (node.type === 'image') {
        out.push(...this.image(node));
        continue;
      }
      if (node.type !== 'text' || !node.text) continue;
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
        ...(anchored
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
    const border = { style: docx.BorderStyle.SINGLE, size: 4, color: '999999' };
    return new docx.Table({
      width: { size: 100, type: docx.WidthType.PERCENTAGE },
      borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
      rows: rows.map(
        (row) =>
          new docx.TableRow({
            tableHeader: (row.content ?? []).every((cell) => cell.type === 'tableHeader'),
            children: (row.content ?? []).map((cell) => {
              const content = this.blocks(cell.content ?? []).filter(
                (child): child is ParagraphType | TableType =>
                  child instanceof docx.Paragraph || child instanceof docx.Table,
              );
              const widths = Array.isArray(cell.attrs?.colwidth) ? (cell.attrs.colwidth as unknown[]).map(Number) : [];
              const widthPx = widths.reduce((sum, w) => sum + (Number.isFinite(w) ? w : 0), 0);
              return new docx.TableCell({
                columnSpan: Number(cell.attrs?.colspan ?? 1) || 1,
                rowSpan: Number(cell.attrs?.rowspan ?? 1) || 1,
                width: widthPx > 0 ? { size: Math.round(widthPx * 15), type: docx.WidthType.DXA } : undefined,
                shading:
                  cell.type === 'tableHeader' ? { type: docx.ShadingType.CLEAR, fill: 'F3F4F6', color: 'auto' } : undefined,
                children: content.length ? content : [new docx.Paragraph('')],
              });
            }),
          }),
      ),
    });
  }
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
