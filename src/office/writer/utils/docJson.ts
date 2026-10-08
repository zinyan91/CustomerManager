/**
 * The editor's document as plain JSON (ProseMirror's `toJSON()` shape), and
 * the questions the rest of Writer asks of it without loading the editor:
 * its text, its statistics, its headings.
 */
export interface DocMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface DocNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: DocNode[];
  text?: string;
  marks?: DocMark[];
}

export const EMPTY_DOC: DocNode = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Blocks whose text ends a line in plain-text output and in statistics. */
const TEXT_BLOCKS = new Set(['paragraph', 'heading', 'codeBlock']);

/** Plain text, one line per paragraph, list items and table cells included. */
export function docToPlainText(doc: DocNode): string {
  const lines: string[] = [];
  const walk = (node: DocNode) => {
    if (TEXT_BLOCKS.has(node.type)) {
      lines.push(inlineText(node));
      return;
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return lines.join('\n');
}

export function inlineText(node: DocNode): string {
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  return (node.content ?? []).map(inlineText).join('');
}

export interface DocStats {
  words: number;
  chars: number;
  charsNoSpaces: number;
  paragraphs: number;
}

export function docStats(doc: DocNode): DocStats {
  let words = 0;
  let chars = 0;
  let charsNoSpaces = 0;
  let paragraphs = 0;
  const walk = (node: DocNode) => {
    if (TEXT_BLOCKS.has(node.type)) {
      const text = inlineText(node);
      if (text.trim()) paragraphs += 1;
      words += countWords(text);
      chars += text.replace(/\n/g, '').length;
      charsNoSpaces += text.replace(/\s/g, '').length;
      return;
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return { words, chars, charsNoSpaces, paragraphs };
}

/** Whitespace-separated words, so Vietnamese counts syllables the way Word does. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export interface HeadingEntry {
  level: number;
  text: string;
  /** Index among all headings, for scrolling to it. */
  index: number;
}

/** Headings of level 1 to `maxLevel`, in document order, skipping empty ones. */
export function docHeadings(doc: DocNode, maxLevel = 3): HeadingEntry[] {
  const headings: HeadingEntry[] = [];
  let index = 0;
  const walk = (node: DocNode) => {
    if (node.type === 'heading') {
      const level = Number(node.attrs?.level ?? 1);
      const text = inlineText(node).trim();
      if (level <= maxLevel && text) headings.push({ level, text, index });
      index += 1;
      return;
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return headings;
}

/** The first non-empty line, for naming a draft that was never given a title. */
export function firstLine(doc: DocNode, maxLength = 80): string {
  const line = docToPlainText(doc)
    .split('\n')
    .map((l) => l.trim())
    .find(Boolean);
  if (!line) return '';
  return line.length > maxLength ? `${line.slice(0, maxLength - 1)}…` : line;
}

/** A stored document, or an empty one when what is stored is not a document. */
export function parseDocJson(value: unknown): DocNode {
  if (value && typeof value === 'object' && (value as DocNode).type === 'doc') return value as DocNode;
  return EMPTY_DOC;
}
