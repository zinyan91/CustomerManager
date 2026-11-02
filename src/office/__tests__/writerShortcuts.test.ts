import { describe, expect, it } from 'vitest';
import { WORD_KEYS } from '../writer/editor/wordKeys';

describe("Word's keys for text", () => {
  it('align, space lines, list and indent the way Word does', () => {
    expect(WORD_KEYS['Mod-e']).toEqual({ type: 'align', value: 'center' });
    expect(WORD_KEYS['Mod-l']).toEqual({ type: 'align', value: 'left' });
    expect(WORD_KEYS['Mod-r']).toEqual({ type: 'align', value: 'right' });
    expect(WORD_KEYS['Mod-j']).toEqual({ type: 'align', value: 'justify' });
    expect(WORD_KEYS['Mod-1']).toEqual({ type: 'lineHeight', value: '1' });
    expect(WORD_KEYS['Mod-5']).toEqual({ type: 'lineHeight', value: '1.5' });
    expect(WORD_KEYS['Mod-2']).toEqual({ type: 'lineHeight', value: '2' });
    expect(WORD_KEYS['Mod-Shift-l']).toEqual({ type: 'bulletList' });
    expect(WORD_KEYS['Mod-m']).toEqual({ type: 'indent' });
    expect(WORD_KEYS['Mod-Shift-m']).toEqual({ type: 'outdent' });
  });

  it('clear formatting, make a paragraph normal, and size text', () => {
    expect(WORD_KEYS['Mod-Space']).toEqual({ type: 'clearFormatting' });
    expect(WORD_KEYS['Mod-Shift-n']).toEqual({ type: 'normal' });
    expect(WORD_KEYS['Mod-]']).toEqual({ type: 'fontSize', direction: 1 });
    expect(WORD_KEYS['Mod-[']).toEqual({ type: 'fontSize', direction: -1 });
    expect(WORD_KEYS['Mod-Shift->']).toEqual({ type: 'fontSize', direction: 1 });
  });

  it('puts subscript on Ctrl+= and superscript on Ctrl+Shift+=, not zoom', () => {
    expect(WORD_KEYS['Mod-=']).toEqual({ type: 'subscript' });
    expect(WORD_KEYS['Mod-Shift-=']).toEqual({ type: 'superscript' });
  });
});
