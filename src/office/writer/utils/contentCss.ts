/**
 * How a Writer document looks on paper, as one stylesheet shared by the
 * editor (injected under `.writer-content`) and the printed page, so what is
 * seen is what prints. The paper is white and the text dark in both themes,
 * as in Word and Google Docs: this is the document, not the app's chrome.
 */
export const DEFAULT_FONT_STACK = "Arial, 'Noto Sans', Helvetica, sans-serif";
export const DEFAULT_FONT_SIZE = '11pt';

/** The custom properties that carry a document's base font and size to its stylesheet. */
export function baseTextVars(setup: { baseFont: string; baseSize: number; spaceAfter?: number; lineHeight?: number; columns?: number; columnGap?: number }): Record<string, string> {
  return {
    '--writer-font': setup.baseFont ? `'${setup.baseFont}', ${DEFAULT_FONT_STACK}` : DEFAULT_FONT_STACK,
    '--writer-size': `${setup.baseSize}pt`,
    '--writer-after': `${setup.spaceAfter ?? 8}pt`,
    '--writer-line': String(setup.lineHeight ?? 1.15),
    '--writer-columns': String(setup.columns ?? 1),
    '--writer-gap': `${setup.columnGap ?? 12.7}mm`,
  };
}

export function contentCss(scope: string): string {
  const s = (selector: string) =>
    selector
      .split(',')
      .map((part) => `${scope} ${part.trim()}`.trim())
      .join(', ');
  return `
${scope} { font-family: var(--writer-font, ${DEFAULT_FONT_STACK}); font-size: var(--writer-size, ${DEFAULT_FONT_SIZE}); line-height: var(--writer-line, 1.15); color: #1f2328; }
${s('p, h1, h2, h3, h4, h5, h6, blockquote, ul, ol, pre, table, hr, figure')} { margin: 0 0 var(--writer-after, 8pt); }
${s('p')} { min-height: calc(1em * var(--writer-line, 1.15)); }
${s('p[data-mark-size]:empty, p[data-mark-size]:has(> br:only-child)')} { font-size: var(--mark-size); }
${scope} { counter-reset: wr-footnote; column-count: var(--writer-columns, 1); column-gap: var(--writer-gap, 12.7mm); }
${s('sup[data-footnote]')} { counter-increment: wr-footnote; color: #1155cc; cursor: pointer; }
${s('sup[data-footnote]')}::after { content: counter(wr-footnote); }
${s('ins[data-track]')} { color: #1a7f37; text-decoration: underline; background: rgba(46, 160, 67, 0.12); }
${s('del[data-track]')} { color: #cf222e; text-decoration: line-through; background: rgba(248, 81, 73, 0.10); }
${s('span[data-comment-range]')} { background: #fff3b0; border-bottom: 1px solid #d4a017; cursor: pointer; }
${s('span[data-comment]')} { display: inline-block; width: 0.9em; height: 0.9em; margin: 0 1pt; vertical-align: text-top; background: #fde68a; border: 1px solid #d4a017; border-radius: 2pt 2pt 2pt 0; cursor: pointer; }
${s('h1')} { font-size: 20pt; font-weight: 400; margin-top: 14pt; }
${s('h2')} { font-size: 16pt; font-weight: 400; margin-top: 12pt; }
${s('h3')} { font-size: 14pt; font-weight: 400; color: #434343; margin-top: 10pt; }
${s('h4')} { font-size: 12pt; font-weight: 400; color: #666666; }
${s('h5, h6')} { font-size: 11pt; font-weight: 400; color: #666666; }
${s('h6')} { font-style: italic; }
${s('ul, ol')} { padding-left: 36pt; }
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
${s('table[data-borders="none"] td, table[data-borders="none"] th')} { border-color: transparent; }
${s('td, th')} { border: 1px solid var(--wr-border, #999999); padding: 3pt 5pt; vertical-align: top; word-wrap: break-word; }
${s('th')} { background: #f3f4f6; font-weight: 700; text-align: left; }
${s('td > p, th > p')} { margin: 0; }
${s('span[data-tab]')} { display: inline-block; width: 36pt; }
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
