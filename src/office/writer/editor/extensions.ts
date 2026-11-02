import type { AnyExtension } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TextStyleKit } from '@tiptap/extension-text-style';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { CharacterCount, Placeholder } from '@tiptap/extensions';
import { ParagraphFormat } from './ParagraphFormat';
import { PageBreak } from './PageBreak';
import { TableOfContents } from './TableOfContents';
import { FindReplace } from './FindReplace';
import { WordShortcuts } from './WordShortcuts';
import { TableBorders, TableCellStyle, TableLayoutAttributes } from './TableCellStyle';
import { Footnote } from './Footnote';
import { Tab } from './Tab';
import { Comment, CommentRange } from './Comment';
import { TrackChanges } from './TrackChanges';
import { Pagination } from './Pagination';
import type { PaginationResult } from '../utils/pagination';

/** An image that remembers the width it was given, in CSS pixels. */
const SizedImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const value = Number(element.getAttribute('width') ?? parseFloat(element.style.width));
          return Number.isFinite(value) && value > 0 ? Math.round(value) : null;
        },
        renderHTML: (attributes) => (attributes.width ? { width: attributes.width } : {}),
      },
      // Text wraps round a picture that floats to one side, as in Word's "Square" wrapping.
      float: {
        default: null,
        parseHTML: (element) => {
          const value = element.getAttribute('data-float');
          return value === 'left' || value === 'right' || value === 'front' ? value : null;
        },
        renderHTML: (attributes) => {
          if (!attributes.float) return {};
          // In front of the text: drawn at its offset from the paragraph after it, taking no room of its own.
          if (attributes.float === 'front') {
            const dx = Number(attributes.dx ?? 0);
            const dy = Number(attributes.dy ?? 0);
            const h = Number(attributes.h ?? 0);
            return { 'data-float': 'front', style: `position: relative; display: block; left: ${dx}px; top: ${dy}px; margin: 0 0 -${h}px 0; z-index: 1; pointer-events: none` };
          }
          return { 'data-float': attributes.float };
        },
      },
      dx: { default: null, parseHTML: (element) => (element.getAttribute('data-dx') === null ? null : Number(element.getAttribute('data-dx'))), renderHTML: () => ({}) },
      dy: { default: null, parseHTML: (element) => (element.getAttribute('data-dy') === null ? null : Number(element.getAttribute('data-dy'))), renderHTML: () => ({}) },
      h: { default: null, parseHTML: (element) => (element.getAttribute('data-h') === null ? null : Number(element.getAttribute('data-h'))), renderHTML: () => ({}) },
    };
  },
});

export interface WriterExtensionOptions {
  placeholder: () => string;
  tocTitle: () => string;
  tocEmpty: () => string;
  onPaginate: (result: PaginationResult) => void;
  /** The size of text that has none of its own, in points. */
  baseSize: () => number;
  /** Asks for the text of a footnote, starting from the given one; null leaves it be. */
  askFootnote: (current: string) => string | null;
  /** The same for a comment. */
  askComment: (current: string) => string | null;
  /** Who a tracked change is written under. */
  author: () => string;
}

/** Everything Writer's editor can do; WriterEditor is the only user. */
export function writerExtensions(options: WriterExtensionOptions): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3, 4, 5, 6] },
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https' },
      // Undo history is kept per document; a fresh editor starts a fresh history.
      undoRedo: { depth: 200 },
    }),
    TextStyleKit,
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    SizedImage.configure({ inline: true, allowBase64: true }),
    TableKit.configure({ table: { resizable: true, cellMinWidth: 40 } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    CharacterCount,
    Placeholder.configure({ placeholder: () => options.placeholder() }),
    ParagraphFormat,
    TableCellStyle,
    TableLayoutAttributes,
    TableBorders,
    Tab,
    Footnote.configure({ ask: options.askFootnote }),
    Comment.configure({ ask: options.askComment }),
    CommentRange,
    TrackChanges.configure({ author: options.author }),
    WordShortcuts.configure({ baseSize: options.baseSize }),
    PageBreak,
    TableOfContents.configure({ title: options.tocTitle, empty: options.tocEmpty }),
    FindReplace,
    Pagination.configure({ onPaginate: options.onPaginate }),
  ];
}
