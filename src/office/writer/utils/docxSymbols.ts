/**
 * Word draws bullets, check marks and arrows with the symbol fonts: a `<w:sym w:font="Wingdings" w:char="F0FC"/>`,
 * or a run in that font whose text is a private-use character. mammoth drops the first and passes the second on as
 * a character no other font has, so both are rewritten to the Unicode character that looks the same.
 */

const WINGDINGS: Record<number, string> = {
  0x21: '✏', 0x28: '☎', 0x4a: '☺', 0x4c: '☹', 0x6c: '●', 0x6e: '■', 0x6f: '□', 0x71: '❑', 0x72: '❒', 0x76: '❖',
  0x9f: '•', 0xa7: '▪', 0xa8: '◻', 0xd8: '➢', 0xe8: '➔', 0xf0: '⇨', 0xfb: '✗', 0xfc: '✓', 0xfd: '☒', 0xfe: '☑',
};

const SYMBOL: Record<number, string> = { 0xb7: '•', 0xa7: '♣', 0xa8: '♦', 0xa9: '♥', 0xaa: '♠', 0xde: '⇒', 0xdc: '⇐', 0xd8: '¬' };

const TABLES: Array<[RegExp, Record<number, string>]> = [
  [/^wingdings$/i, WINGDINGS],
  [/^symbol$/i, SYMBOL],
];

/** The Unicode character a symbol font's character code stands for, or null when it is not one this knows. */
export function symbolCharacter(font: string, code: number): string | null {
  const table = TABLES.find(([name]) => name.test(font.trim()))?.[1];
  return table?.[code & 0xff] ?? null;
}

/** The document with symbol-font characters written as the Unicode characters they stand for. */
export function convertSymbolFonts(documentXml: string): string {
  const symbols = documentXml.replace(/<w:sym\b[^>]*>/g, (tag) => {
    const font = /\bw:font="([^"]*)"/.exec(tag)?.[1] ?? '';
    const char = /\bw:char="([0-9A-Fa-f]+)"/.exec(tag)?.[1];
    const mapped = char ? symbolCharacter(font, parseInt(char, 16)) : null;
    return mapped ? `<w:t xml:space="preserve">${mapped}</w:t>` : tag;
  });
  return symbols.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (run) => {
    const font = /<w:rFonts\b[^>]*\bw:ascii="([^"]*)"/.exec(run)?.[1];
    if (!font || !TABLES.some(([name]) => name.test(font))) return run;
    return run.replace(/(<w:t\b[^>]*>)([^<]*)(<\/w:t>)/g, (_all, open: string, text: string, close: string) => `${open}${[...text].map((ch) => symbolCharacter(font, ch.charCodeAt(0)) ?? ch).join('')}${close}`);
  });
}
