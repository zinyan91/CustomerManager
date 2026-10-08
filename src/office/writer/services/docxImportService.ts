import { officeMessages } from '../../i18n';
import { readDocxDefaults, type DocxDefaults } from '../utils/docxDefaults';
import { classesToInlineStyle, extractRunStyles } from '../utils/docxRunStyles';
import { applyDrawingMarkers, markDrawings } from '../utils/docxDrawings';
import { boxRules, boxTextBoxes, markTextBoxes } from '../utils/docxTextBoxes';
import { cellColumns, tableGridWidths } from '../utils/docxTableGrid';

export interface ImportedDocument {
  /** HTML in the editor's vocabulary, ready for `setContent`. */
  html: string;
  /** The file name without its extension. */
  title: string;
  /** Page and base text a .docx declares; empty for other formats. */
  pageDefaults: DocxDefaults;
}

const ALIGNMENTS = ['center', 'right', 'justify'] as const;
type Alignment = (typeof ALIGNMENTS)[number];

/** Word calls justified text "both". */
function alignmentOf(value: unknown): Alignment | null {
  if (value === 'center' || value === 'right') return value;
  if (value === 'both' || value === 'justify' || value === 'distribute') return 'justify';
  return null;
}

/**
 * mammoth maps paragraphs to HTML by style name and has no notion of
 * alignment, so an aligned paragraph's style name is prefixed with its
 * alignment before mapping, and these rules turn the prefix into a class
 * (later rewritten to `text-align`). Paragraphs in a list are left alone: the
 * list rules match on numbering, which a renamed style would not disturb, but
 * a catch-all rule here would win over them.
 */
function styleMap(): string[] {
  const rules: string[] = ['u => u', 's => s', 'strike => s'];
  for (const align of ALIGNMENTS) {
    rules.push(`p[style-name^='align-${align}|Title'] => h1.align-${align}:fresh`);
    for (let level = 1; level <= 6; level += 1) {
      rules.push(`p[style-name^='align-${align}|Heading ${level}'] => h${level}.align-${align}:fresh`);
      rules.push(`p[style-name^='align-${align}|heading ${level}'] => h${level}.align-${align}:fresh`);
    }
    rules.push(...boxRules([align]).slice(1));
    rules.push(`p[style-name^='align-${align}|'] => p.align-${align}:fresh`);
  }
  rules.push(...boxRules([]));
  rules.push(`p[style-name='Title'] => h1:fresh`);
  return rules;
}

interface MammothApi {
  convertToHtml(
    input: { arrayBuffer: ArrayBuffer },
    options: {
      styleMap: string[];
      ignoreEmptyParagraphs: boolean;
      transformDocument: (document: unknown) => unknown;
    },
  ): Promise<{ value: string }>;
  transforms: { paragraph(fn: (paragraph: MammothParagraph) => MammothParagraph): (document: unknown) => unknown };
}

interface MammothParagraph {
  type: 'paragraph';
  alignment?: string;
  numbering?: unknown;
  styleName?: string | null;
  styleId?: string | null;
}

/**
 * Opens a .docx (through mammoth, loaded on first use), a .txt or an .html
 * file as editor HTML. What a DOCX keeps is listed to the user on the home
 * screen (home.importNote): text, headings, lists, tables, images, links and
 * paragraph alignment; fonts, colours, text boxes and floating positions are
 * dropped by mammoth.
 */
export async function importDocument(file: File): Promise<ImportedDocument> {
  const dot = file.name.lastIndexOf('.');
  const ext = dot >= 0 ? file.name.slice(dot).toLowerCase() : '';
  const title = dot > 0 ? file.name.slice(0, dot) : file.name;

  if (ext === '.docx') {
    const { html, defaults } = await convertDocx(await file.arrayBuffer());
    return { html, title, pageDefaults: defaults };
  }
  if (ext === '.txt' || ext === '.md') {
    return { html: textToHtml(await file.text()), title, pageDefaults: {} };
  }
  if (ext === '.html' || ext === '.htm') {
    return { html: bodyOf(await file.text()), title, pageDefaults: {} };
  }
  throw new Error(officeMessages().writer.errors.unsupported);
}

export async function docxToHtml(data: ArrayBuffer): Promise<string> {
  return (await convertDocx(data)).html;
}

export async function convertDocx(data: ArrayBuffer): Promise<{ html: string; defaults: DocxDefaults }> {
  // mammoth's typings omit `transforms` and `transformDocument`, which its code has.
  const mammoth = (await import('mammoth')).default as unknown as MammothApi;
  const parts = await readParts(data);
  // Pictures carry their size and side in their description, which mammoth passes on as alt text.
  const marked = markDrawings(parts.documentXml);
  // A text box with a frame keeps it, as a one-cell table (see docxTextBoxes.ts).
  const boxes = markTextBoxes(marked, parts.stylesXml);
  const runs = extractRunStyles(boxes.documentXml, boxes.stylesXml);
  // With run styles or drawing marks added, mammoth reads the rewritten package instead of the file as given.
  const source = runs.css.size > 0 || runs.documentXml !== parts.documentXml || runs.stylesXml !== parts.stylesXml ? await rewritePackage(data, runs.documentXml, runs.stylesXml) : data;
  // mammoth's browser build reads an ArrayBuffer, its Node build (the tests) a Buffer.
  const NodeBuffer = (globalThis as { Buffer?: { from(data: ArrayBuffer): unknown } }).Buffer;
  const input = NodeBuffer ? { buffer: NodeBuffer.from(source) } : { arrayBuffer: source };
  const result = await mammoth.convertToHtml(
    input as { arrayBuffer: ArrayBuffer },
    {
      styleMap: [...styleMap(), ...runs.rules],
      ignoreEmptyParagraphs: false,
      transformDocument: mammoth.transforms.paragraph((paragraph: MammothParagraph) => {
        const align = alignmentOf(paragraph.alignment);
        if (!align || paragraph.numbering) return paragraph;
        return { ...paragraph, styleName: `align-${align}|${paragraph.styleName ?? 'Normal'}`, styleId: null };
      }),
    },
  );
  const html = classesToInlineStyle(applyDrawingMarkers(normaliseMammothHtml(result.value)), runs.css);
  return {
    // Widths first: the boxes add tables the file's table grids know nothing of.
    html: boxTextBoxes(applyTableWidths(html, parts.documentXml)),
    defaults: readDocxDefaults(parts.documentXml, parts.stylesXml, parts.themeXml),
  };
}

/**
 * mammoth's HTML in the editor's terms: `class="align-center"` (from the style
 * map) becomes the inline style the editor reads, and a Word check box, which
 * mammoth writes as an <input> the editor would drop, becomes ☐ or ☒.
 */
export function normaliseMammothHtml(html: string): string {
  return html
    .replace(/ class="align-(center|right|justify)"/g, ' style="text-align: $1"')
    .replace(/<input type="checkbox" checked(?:="checked")? ?\/?>/g, '☒')
    .replace(/<input type="checkbox" ?\/?>/g, '☐');
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** One paragraph per line; blank lines stay as empty paragraphs. */
export function textToHtml(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  return lines.map((line) => (line ? `<p>${escapeHtml(line)}</p>` : '<p></p>')).join('');
}

/** The body of a full HTML page, or the text as given when it has none. */
export function bodyOf(html: string): string {
  const match = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html);
  return match ? match[1] : html;
}

async function readParts(data: ArrayBuffer): Promise<{ documentXml: string; stylesXml: string; themeXml: string }> {
  try {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(data);
    return {
      documentXml: (await zip.file('word/document.xml')?.async('string')) ?? '',
      stylesXml: (await zip.file('word/styles.xml')?.async('string')) ?? '',
      themeXml: (await zip.file('word/theme/theme1.xml')?.async('string')) ?? '',
    };
  } catch {
    // Not a readable package: mammoth reports it in its own words.
    return { documentXml: '', stylesXml: '', themeXml: '' };
  }
}

async function rewritePackage(data: ArrayBuffer, documentXml: string, stylesXml: string): Promise<ArrayBuffer> {
  const { default: JSZip } = await import('jszip');
  const zip = await JSZip.loadAsync(data);
  zip.file('word/document.xml', documentXml);
  // A package without a styles part stays without one: an empty file would not parse.
  if (stylesXml) zip.file('word/styles.xml', stylesXml);
  return zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });
}

/**
 * Gives each table cell the width of the grid columns it covers (as the
 * `data-colwidth` the editor's table cell reads), so a form keeps its
 * proportions. Needs a DOM; without one, or without a grid, the HTML is
 * returned as it came.
 */
export function applyTableWidths(html: string, documentXml: string): string {
  if (!documentXml || typeof DOMParser === 'undefined') return html;
  const grids = tableGridWidths(documentXml);
  const parsed = new DOMParser().parseFromString(`<body>${html}</body>`, 'text/html');
  const tables = [...parsed.querySelectorAll('table')];
  if (tables.length !== grids.length) return html;
  tables.forEach((table, index) => {
    const grid = grids[index];
    if (grid.length === 0) return;
    const rows = [...table.rows].filter((row) => row.closest('table') === table);
    const spans = rows.map((row) =>
      [...row.cells].map((cell) => ({ colspan: cell.colSpan || 1, rowspan: cell.rowSpan || 1 })),
    );
    cellColumns(spans).forEach((rowCells, r) => {
      rowCells.forEach((columns, c) => {
        const widths = columns.map((column) => grid[column]);
        if (widths.every((w) => w > 0)) rows[r].cells[c].setAttribute('data-colwidth', widths.join(','));
      });
    });
  });
  return parsed.body.innerHTML;
}
