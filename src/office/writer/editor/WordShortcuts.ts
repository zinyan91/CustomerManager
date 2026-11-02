import { Extension } from '@tiptap/core';
import { fontSizePtOf, stepFontSize } from '../../shared/formatOptions';
import { WORD_KEYS, type WordAction } from './wordKeys';

export interface WordShortcutsOptions {
  /** The size, in points, of text that has none of its own. */
  baseSize: () => number;
}

/**
 * Word's keys for text: alignment, line spacing, lists, indent, clearing
 * formatting, font size and sub/superscript. They take precedence over the
 * starter kit's own bindings where the two differ (Ctrl+Shift+L is a bullet
 * list here, left alignment in the alignment extension).
 */
export const WordShortcuts = Extension.create<WordShortcutsOptions>({
  name: 'wordShortcuts',
  priority: 1000,

  addOptions() {
    return { baseSize: () => 11 };
  },

  addKeyboardShortcuts() {
    const run = (action: WordAction): boolean => {
      const { editor } = this;
      switch (action.type) {
        case 'align':
          return editor.commands.setTextAlign(action.value);
        case 'lineHeight':
          return editor.commands.setLineHeight(action.value);
        case 'bulletList':
          return editor.commands.toggleBulletList();
        case 'orderedList':
          return editor.commands.toggleOrderedList();
        case 'indent':
          return editor.commands.indent();
        case 'outdent':
          return editor.commands.outdent();
        case 'normal':
          return editor.chain().focus().clearNodes().unsetAllMarks().run();
        case 'clearFormatting':
          return editor.chain().focus().unsetAllMarks().run();
        case 'fontSize': {
          const current = fontSizePtOf(editor.getAttributes('textStyle').fontSize as string | undefined) ?? this.options.baseSize();
          return editor.chain().focus().setFontSize(`${stepFontSize(current, action.direction)}pt`).run();
        }
        case 'subscript':
          return editor.commands.toggleSubscript();
        case 'superscript':
          return editor.commands.toggleSuperscript();
      }
    };
    return Object.fromEntries(Object.entries(WORD_KEYS).map(([key, action]) => [key, () => run(action)]));
  },
});
