import { useEditorState, type Editor } from '@tiptap/react';
import { searchState } from './FindReplace';

/** What the ribbon shows as pressed or selected at the cursor. */
export interface WriterFormatState {
  canUndo: boolean;
  canRedo: boolean;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  subscript: boolean;
  superscript: boolean;
  code: boolean;
  link: boolean;
  fontFamily: string | null;
  fontSize: string | null;
  color: string | null;
  highlight: string | null;
  /** 0 for a normal paragraph, 1–6 for a heading. */
  headingLevel: number;
  blockquote: boolean;
  codeBlock: boolean;
  align: 'left' | 'center' | 'right' | 'justify';
  bulletList: boolean;
  orderedList: boolean;
  taskList: boolean;
  lineHeight: string | null;
  inTable: boolean;
  canMergeCells: boolean;
  canSplitCell: boolean;
  imageSelected: boolean;
  imageWidth: number | null;
  imageFloat: 'left' | 'right' | null;
  findMatches: number;
  findCurrent: number;
}

const EMPTY: WriterFormatState = {
  canUndo: false,
  canRedo: false,
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  subscript: false,
  superscript: false,
  code: false,
  link: false,
  fontFamily: null,
  fontSize: null,
  color: null,
  highlight: null,
  headingLevel: 0,
  blockquote: false,
  codeBlock: false,
  align: 'left',
  bulletList: false,
  orderedList: false,
  taskList: false,
  lineHeight: null,
  inTable: false,
  canMergeCells: false,
  canSplitCell: false,
  imageSelected: false,
  imageWidth: null,
  imageFloat: null,
  findMatches: 0,
  findCurrent: -1,
};

function read(editor: Editor): WriterFormatState {
  const style = editor.getAttributes('textStyle');
  const block = editor.isActive('heading') ? editor.getAttributes('heading') : editor.getAttributes('paragraph');
  const align = (['center', 'right', 'justify'] as const).find((a) => editor.isActive({ textAlign: a })) ?? 'left';
  const search = searchState(editor.state);
  return {
    canUndo: editor.can().undo(),
    canRedo: editor.can().redo(),
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    subscript: editor.isActive('subscript'),
    superscript: editor.isActive('superscript'),
    code: editor.isActive('code'),
    link: editor.isActive('link'),
    fontFamily: (style.fontFamily as string | undefined) ?? null,
    fontSize: (style.fontSize as string | undefined) ?? null,
    color: (style.color as string | undefined) ?? null,
    highlight: (editor.getAttributes('highlight').color as string | undefined) ?? null,
    headingLevel: editor.isActive('heading') ? Number(editor.getAttributes('heading').level) : 0,
    blockquote: editor.isActive('blockquote'),
    codeBlock: editor.isActive('codeBlock'),
    align,
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    taskList: editor.isActive('taskList'),
    lineHeight: (block.lineHeight as string | null | undefined) ?? null,
    inTable: editor.isActive('table'),
    canMergeCells: editor.can().mergeCells(),
    canSplitCell: editor.can().splitCell(),
    imageSelected: editor.isActive('image'),
    imageWidth: editor.isActive('image') ? ((editor.getAttributes('image').width as number | null) ?? null) : null,
    imageFloat: editor.isActive('image') ? ((editor.getAttributes('image').float as 'left' | 'right' | null) ?? null) : null,
    findMatches: search.matches.length,
    findCurrent: search.current,
  };
}

/** Re-renders its caller only when one of these values changes. */
export function useWriterState(editor: Editor | null): WriterFormatState {
  return (
    useEditorState({
      editor,
      selector: ({ editor: instance }) => (instance ? read(instance) : EMPTY),
    }) ?? EMPTY
  );
}
