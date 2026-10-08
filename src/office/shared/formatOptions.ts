/**
 * The choices the ribbon offers. Fonts are ones Windows, macOS and most
 * phones already have (nothing is downloaded, so the app stays offline), each
 * with fallbacks; Noto Sans is the app's own font and covers Vietnamese.
 */
export interface FontChoice {
  label: string;
  /** CSS font-family stack stored on the text. */
  value: string;
}

export const FONT_CHOICES: readonly FontChoice[] = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Times New Roman', value: "'Times New Roman', Times, serif" },
  { label: 'Calibri', value: 'Calibri, Carlito, sans-serif' },
  { label: 'Cambria', value: 'Cambria, Caladea, serif' },
  { label: 'Georgia', value: 'Georgia, serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, sans-serif' },
  { label: 'Segoe UI', value: "'Segoe UI', system-ui, sans-serif" },
  { label: 'Noto Sans', value: "'Noto Sans', sans-serif" },
  { label: 'Courier New', value: "'Courier New', Courier, monospace" },
];

export const FONT_SIZES_PT = [8, 9, 10, 10.5, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32, 36, 48, 60, 72] as const;

/** Text colours: Google Docs' palette, first row greys. */
export const TEXT_COLORS = [
  '#000000', '#434343', '#666666', '#999999', '#cccccc', '#ffffff',
  '#980000', '#ff0000', '#ff9900', '#ffff00', '#00ff00', '#00ffff',
  '#4a86e8', '#0000ff', '#9900ff', '#ff00ff', '#1155cc', '#38761d',
] as const;

export const HIGHLIGHT_COLORS = [
  '#fff59d', '#ffe0b2', '#ffcdd2', '#f8bbd0', '#e1bee7', '#c5cae9',
  '#bbdefb', '#b2ebf2', '#c8e6c9', '#dcedc8', '#f0f4c3', '#e0e0e0',
] as const;

export const SPECIAL_CHARACTERS = [
  '©', '®', '™', '§', '¶', '†', '‡', '•', '…', '–', '—', '«', '»', '“', '”', '‘', '’',
  '€', '£', '¥', '₫', '$', '¢', '°', '±', '×', '÷', '≈', '≠', '≤', '≥', '∞', '√', '∑',
  'π', 'α', 'β', 'γ', 'Δ', 'Ω', 'µ', '½', '¼', '¾', '²', '³', '←', '→', '↑', '↓', '↔',
  '✓', '✔', '✗', '☐', '☒', '★', '☆', '♥', '☎', '✉',
] as const;

/** The label of a stored font stack, or null when it is not one of ours. */
export function fontLabelOf(stack: string | null | undefined): string | null {
  if (!stack) return null;
  const first = stack.split(',')[0].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  return FONT_CHOICES.find((choice) => choice.label.toLowerCase() === first)?.label ?? stack.split(',')[0].replace(/['"]/g, '').trim();
}

/** "12pt" → 12; "16px" → 12; null when unset. */
export function fontSizePtOf(value: string | null | undefined): number | null {
  if (!value) return null;
  const match = /^([\d.]+)\s*(pt|px)?$/i.exec(value.trim());
  if (!match) return null;
  const n = Number(match[1]);
  return match[2]?.toLowerCase() === 'px' ? Math.round(n * 0.75 * 2) / 2 : n;
}

/** The next size up or down the list, for the A+ / A− buttons. */
export function stepFontSize(current: number, direction: 1 | -1): number {
  const sizes = FONT_SIZES_PT as readonly number[];
  if (direction > 0) return sizes.find((s) => s > current) ?? Math.min(400, current + 12);
  return [...sizes].reverse().find((s) => s < current) ?? Math.max(1, current - 1);
}
