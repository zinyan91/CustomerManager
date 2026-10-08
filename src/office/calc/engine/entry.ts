import { parseDateText } from './dates';
import { parseNumber } from './values';

export interface Entry {
  raw: string;
  /** A number format the typed text implies (a date, a percentage), when the cell has none yet. */
  numFmt?: string;
}

/**
 * What typing `text` into a cell stores, as Excel does: a formula stays a
 * formula, a date becomes its serial number with a date format, "12%" becomes
 * 0.12 with a percent format, and a leading apostrophe forces text.
 */
export function interpretEntry(text: string, currentFormat: string | undefined): Entry {
  const hasFormat = currentFormat !== undefined && currentFormat !== 'General';
  if (text.startsWith('=') && text.trim().length > 1) return { raw: text.trim() };
  if (text.startsWith("'")) return { raw: text };
  const trimmed = text.trim();
  const date = parseDateText(trimmed);
  if (date !== null) return { raw: String(date), numFmt: hasFormat ? undefined : 'dd/mm/yyyy' };
  if (/^[+-]?(\d+\.?\d*|\.\d+)%$/.test(trimmed)) {
    const n = parseNumber(trimmed);
    if (n !== null) {
      const decimals = (/\.(\d+)%$/.exec(trimmed)?.[1].length ?? 0);
      return { raw: String(Number((n).toPrecision(15))), numFmt: hasFormat ? undefined : decimals > 0 ? `0.${'0'.repeat(decimals)}%` : '0%' };
    }
  }
  if (parseNumber(trimmed) !== null) return { raw: trimmed };
  const upper = trimmed.toUpperCase();
  if (upper === 'TRUE' || upper === 'FALSE') return { raw: upper };
  return { raw: text };
}

/** Tab-separated text → rows of cells (a trailing newline does not make an empty row). */
export function parseTsv(text: string): string[][] {
  const normalised = text.replace(/\r\n?/g, '\n').replace(/\n$/, '');
  return normalised.split('\n').map((line) => line.split('\t'));
}
