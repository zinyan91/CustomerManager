/**
 * How a Writer document looks on paper, as one stylesheet shared by the
 * editor (injected under `.writer-content`) and the printed page, so what is
 * seen is what prints. The paper is white and the text dark in both themes,
 * as in Word and Google Docs: this is the document, not the app's chrome.
 */
export const DEFAULT_FONT_STACK = "Arial, 'Noto Sans', Helvetica, sans-serif";
export const DEFAULT_FONT_SIZE = '11pt';

/** The custom properties that carry a document's base font and size to its stylesheet. */
export function baseTextVars(setup: { baseFont: string; baseSize: number }): Record<string, string> {
  return {
    '--writer-font': setup.baseFont ? `'${setup.baseFont}', ${DEFAULT_FONT_STACK}` : DEFAULT_FONT_STACK,
    '--writer-size': `${setup.baseSize}pt`,
  };
}

export function contentCss(scope: string): string {
  const s = (selector: string) =>
    selector
      .split(',')
      .map((part) => `${scope} ${part.trim()}`.trim())
      .join(', ');
  return `
${scope} { font-family: var(--writer-font, ${DEFAULT_FONT_STACK}); font-size: var(--writer-size, ${DEFAULT_FONT_SIZE}); line-height: 1.15; color: #1f2328; }
${s('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, pre, table, hr, figure')} { margin: 0 0 8pt; }
${s('p')} { min-height: 1.15em; }
${s('h1')} { font-size: 20pt; font-weight: 400; margin-top: 14pt; }
${s('h2')} { font-size: 16pt; font-weight: 400; margin-top: 12pt; }
${s('h3')} { font-size: 14pt; font-weight: 400; color: #434343; margin-top: 10pt; }
${s('h4')} { font-size: 12pt; font-weight: 400; color: #666666; }
${s('h5, h6')} { font-size: 11pt; font-weight: 400; color: #666666; }
${s('h6')} { font-style: italic; }
${s('ul, ol')} { padding-left: 24pt; }
${s('li > p')} { margin: 0; }
${s('ul[data-type="taskList"]')} { list-style: none; padding-left: 4pt; }
${s('ul[data-type="taskList"] li')} { display: flex; align-items: flex-start; gap: 6pt; }
${s('ul[data-type="taskList"] li > label')} { flex: none; margin-top: 1pt; }
${s('ul[data-type="taskList"] li > div')} { flex: 1; }
${s('ul[data-type="taskList"] li[data-checked="true"] > div')} { text-decoration: line-through; color: #6b7280; }
${s('blockquote')} { border-left: 3pt solid #d0d7de; padding-left: 10pt; color: #57606a; }
${s('pre')} { background: #f3f4f6; padding: 8pt; border-radius: 3pt; font-family: 'Courier New', monospace; font-size: 10pt; white-space: pre-wrap; }
${s('code')} { font-family: 'Courier New', monospace; background: #f3f4f6; padding: 0 2pt; border-radius: 2pt; }
${s('a')} { color: #1155cc; text-decoration: underline; }
${s('hr')} { border: 0; border-top: 1px solid #999999; }
${s('img')} { max-width: 100%; height: auto; }
${s("img[data-float='left']")} { float: left; margin: 4px 14px 6px 0; }
${s("img[data-float='right']")} { float: right; margin: 4px 0 6px 14px; }
${s('mark')} { padding: 0 1pt; border-radius: 1pt; }
${s('table')} { border-collapse: collapse; width: 100%; table-layout: fixed; }
${s('td, th')} { border: 1px solid #999999; padding: 3pt 5pt; vertical-align: top; word-wrap: break-word; }
${s('th')} { background: #f3f4f6; font-weight: 700; text-align: left; }
${s('td > p, th > p')} { margin: 0; }
${s('div[data-type="page-break"]')} { break-after: page; height: 0; margin: 0; }
${s('nav[data-type="table-of-contents"]')} { margin: 0 0 12pt; }
${s('nav[data-type="table-of-contents"] .toc-title')} { font-size: 16pt; margin: 0 0 6pt; }
${s('nav[data-type="table-of-contents"] ol')} { list-style: none; padding: 0; margin: 0; }
${s('nav[data-type="table-of-contents"] li')} { margin: 0 0 3pt; }
${s('nav[data-type="table-of-contents"] li[data-level="2"]')} { padding-left: 14pt; }
${s('nav[data-type="table-of-contents"] li[data-level="3"]')} { padding-left: 28pt; }
`;
}

/** A value made safe inside a CSS string literal. */
export function cssString(text: string): string {
  return `"${text.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ')}"`;
}
