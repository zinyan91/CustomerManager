/**
 * Word's keyboard shortcuts for text, as a table from a ProseMirror key name to
 * what it asks for. Kept apart from the editor so that the table can be
 * checked without one; `WordShortcuts` turns each entry into a command.
 */
export type WordAction =
  | { type: 'align'; value: 'left' | 'center' | 'right' | 'justify' }
  | { type: 'lineHeight'; value: string }
  | { type: 'bulletList' }
  | { type: 'orderedList' }
  | { type: 'indent' }
  | { type: 'outdent' }
  | { type: 'normal' }
  | { type: 'clearFormatting' }
  | { type: 'fontSize'; direction: 1 | -1 }
  | { type: 'subscript' }
  | { type: 'superscript' };

export const WORD_KEYS: Record<string, WordAction> = {
  'Mod-e': { type: 'align', value: 'center' },
  'Mod-l': { type: 'align', value: 'left' },
  'Mod-r': { type: 'align', value: 'right' },
  'Mod-j': { type: 'align', value: 'justify' },
  'Mod-1': { type: 'lineHeight', value: '1' },
  'Mod-2': { type: 'lineHeight', value: '2' },
  'Mod-5': { type: 'lineHeight', value: '1.5' },
  'Mod-Shift-l': { type: 'bulletList' },
  'Mod-m': { type: 'indent' },
  'Mod-Shift-m': { type: 'outdent' },
  'Mod-Shift-n': { type: 'normal' },
  'Mod-Space': { type: 'clearFormatting' },
  'Mod-Shift-.': { type: 'fontSize', direction: 1 },
  'Mod-Shift->': { type: 'fontSize', direction: 1 },
  'Mod-]': { type: 'fontSize', direction: 1 },
  'Mod-Shift-,': { type: 'fontSize', direction: -1 },
  'Mod-Shift-<': { type: 'fontSize', direction: -1 },
  'Mod-[': { type: 'fontSize', direction: -1 },
  'Mod-=': { type: 'subscript' },
  'Mod-Shift-=': { type: 'superscript' },
  'Mod-Shift-+': { type: 'superscript' },
};
