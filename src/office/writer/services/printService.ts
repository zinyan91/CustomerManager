import { printBlob } from '../../shared/files';
import { baseTextVars, contentCss, cssString } from '../utils/contentCss';
import { escapeHtml } from './docxImportService';
import { docHeadings, type DocNode } from '../utils/docJson';
import { pageDimensionsMm, splitPageTemplate, type PageSetup } from '../utils/pageSetup';

export interface PrintOptions {
  title: string;
  pageSetup: PageSetup;
  /** "Trang {page} / {pages}" in the current language. */
  pageTemplate: string;
  tocTitle: string;
}

/**
 * The document as a standalone page for the browser's print dialog, where
 * "Save as PDF" gives a PDF with real, selectable text. Paper size and margins
 * come from @page; the header, footer and page numbers from @page margin
 * boxes, which Chromium draws (since 131). Pure: it only builds the string.
 */
export function buildPrintHtml(bodyHtml: string, doc: DocNode, options: PrintOptions): string {
  const { pageSetup } = options;
  const { width, height } = pageDimensionsMm(pageSetup);
  const { top, right, bottom, left } = pageSetup.margins;

  const footerParts: string[] = [];
  if (pageSetup.footerText.trim()) footerParts.push(cssString(`${pageSetup.footerText}    `));
  if (pageSetup.pageNumbers) {
    for (const part of splitPageTemplate(options.pageTemplate)) {
      footerParts.push('field' in part ? `counter(${part.field})` : cssString(part.text));
    }
  }
  const marginBoxStyle = "font-family: Arial, 'Noto Sans', sans-serif; font-size: 9pt; color: #555555;";
  const headerBox = pageSetup.headerText.trim()
    ? `@top-center { content: ${cssString(pageSetup.headerText)}; ${marginBoxStyle} }`
    : '';
  const footerBox = footerParts.length ? `@bottom-center { content: ${footerParts.join(' ')}; ${marginBoxStyle} }` : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(options.title)}</title>
<style>
@page { size: ${width}mm ${height}mm; margin: ${top}mm ${right}mm ${bottom}mm ${left}mm; ${headerBox} ${footerBox} }
html, body { margin: 0; padding: 0; background: #ffffff; }
* { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
${contentCss('.writer-content')}
.writer-content { ${Object.entries(baseTextVars(pageSetup)).map(([k, v]) => `${k}: ${v};`).join(' ')} }
</style></head>
<body><div class="writer-content">${headerRowsToThead(fillTableOfContents(bodyHtml, doc, options.tocTitle))}</div></body></html>`;
}

const CELL_TEXT = String.raw`(?:(?!<\/?(?:tr|td|th)[\s>])[\s\S])*`;
const HEADER_ROWS = new RegExp(String.raw`(<tbody>)((?:<tr[^>]*>(?:<th[\s>][^>]*>${CELL_TEXT}<\/th>)+<\/tr>)+)`, 'g');

/**
 * Leading rows made only of header cells go into a `<thead>`, which the print
 * engine repeats at the top of every page the table runs onto.
 */
export function headerRowsToThead(html: string): string {
  return html.replace(HEADER_ROWS, (_all, _tbody, rows: string) => `<thead>${rows}</thead><tbody>`);
}

/** The editor's table-of-contents node carries no entries in its HTML; print writes them in. */
export function fillTableOfContents(bodyHtml: string, doc: DocNode, tocTitle: string): string {
  if (!bodyHtml.includes('data-type="table-of-contents"')) return bodyHtml;
  const entries = docHeadings(doc)
    .map((h) => `<li data-level="${h.level}">${escapeHtml(h.text)}</li>`)
    .join('');
  const toc = `<nav data-type="table-of-contents"><p class="toc-title">${escapeHtml(tocTitle)}</p><ol>${entries}</ol></nav>`;
  return bodyHtml.replace(/<nav data-type="table-of-contents"[^>]*>[\s\S]*?<\/nav>/g, toc);
}

export function printDocument(bodyHtml: string, doc: DocNode, options: PrintOptions): void {
  const html = buildPrintHtml(bodyHtml, doc, options);
  printBlob(new Blob([html], { type: 'text/html;charset=utf-8' }));
}
