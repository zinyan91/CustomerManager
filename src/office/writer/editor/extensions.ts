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
          return value === 'left' || value === 'right' ? value : null;
        },
        renderHTML: (attributes) => (attributes.float ? { 'data-float': attributes.float } : {}),
      },
    };
  },
});

export interface WriterExtensionOptions {
  placeholder: () => string;
  tocTitle: () => string;
  tocEmpty: () => string;
  onPaginate: (result: PaginationResult) => void;
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
    SizedImage.configure({ inline: false, allowBase64: true }),
    TableKit.configure({ table: { resizable: true, cellMinWidth: 40 } }),
    TaskList,
    TaskItem.configure({ nested: true }),
    CharacterCount,
    Placeholder.configure({ placeholder: () => options.placeholder() }),
    ParagraphFormat,
    PageBreak,
    TableOfContents.configure({ title: options.tocTitle, empty: options.tocEmpty }),
    FindReplace,
    Pagination.configure({ onPaginate: options.onPaginate }),
  ];
}
