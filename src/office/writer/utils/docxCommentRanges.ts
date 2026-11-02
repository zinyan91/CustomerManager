const MARK = '⁣';

const run = (text: string): string => `<w:r><w:t xml:space="preserve">${MARK}${text}${MARK}</w:t></w:r>`;

/** mammoth drops where a comment starts and ends, so each is replaced by a marker run it keeps. */
export function markCommentRanges(documentXml: string): string {
  if (!documentXml.includes('<w:commentRangeStart')) return documentXml;
  return documentXml
    .replace(/<w:commentRangeStart\b[^>]*\bw:id="(\d+)"[^>]*\/>/g, (_m, id: string) => run(`[c:${id}]`))
    .replace(/<w:commentRangeEnd\b[^>]*\bw:id="(\d+)"[^>]*\/>/g, (_m, id: string) => run(`[/c:${id}]`));
}

const VOID = new Set(['br', 'hr', 'img']);

/** Whether every tag opened in the HTML is closed in it, so it can sit inside a span of its own. */
export function isBalanced(html: string): boolean {
  const open: string[] = [];
  for (const tag of html.matchAll(/<(\/?)([a-z][a-z0-9]*)\b[^>]*?(\/?)>/gi)) {
    const name = tag[2].toLowerCase();
    if (tag[3] === '/' || VOID.has(name)) continue;
    if (tag[1] === '') open.push(name);
    else if (open.pop() !== name) return false;
  }
  return open.length === 0;
}

const BLOCK = /<\/?(?:p|li|ul|ol|table|tr|td|th|h[1-6]|div|blockquote)\b/i;

export interface RangedComment {
  html: string;
  /** The ids of the comments that now sit on their text, so that no point marker is made for them. */
  placed: Set<string>;
}

/**
 * Wraps the text between a comment's start and end markers in a span holding the comment. A range that crosses a
 * paragraph or cuts through a tag keeps no range: the comment stays at its reference.
 */
export function wrapCommentRanges(html: string, comments: Map<string, string>, escape: (text: string) => string): RangedComment {
  const placed = new Set<string>();
  const wrapped = html.replace(new RegExp(`${MARK}\\[c:(\\d+)\\]${MARK}([\\s\\S]*?)${MARK}\\[/c:\\1\\]${MARK}`, 'g'), (_whole: string, id: string, inner: string) => {
    const text = comments.get(id);
    if (!text || BLOCK.test(inner) || !isBalanced(inner) || inner.replace(/<[^>]+>/g, '').trim() === '') return inner;
    placed.add(id);
    return `<span data-comment-range="${escape(text)}" title="${escape(text)}">${inner}</span>`;
  });
  return { html: wrapped.replace(new RegExp(`${MARK}\\[/?c:\\d+\\]${MARK}`, 'g'), ''), placed };
}
