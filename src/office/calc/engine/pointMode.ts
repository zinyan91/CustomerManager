import { cellName, parseRange, rangeName, type RangePos } from './cellRef';

export interface Slot {
  from: number;
  to: number;
}

function insideText(text: string, caret: number): boolean {
  let open = false;
  for (let i = 0; i < caret; i += 1) if (text[i] === '"') open = !open;
  return open;
}

/**
 * Where a cell the user points at goes in a formula being typed: the span of the reference pointed at a moment
 * ago, else a gap at the caret when what comes before it asks for a value (`=`, an operator, `(` or `,`).
 */
export function pointSlot(text: string, caret: number, pointing: Slot | null): Slot | null {
  if (pointing && pointing.to <= text.length) return pointing;
  if (!text.startsWith('=') || insideText(text, caret)) return null;
  if (/[A-Za-z0-9_.]/.test(text[caret] ?? '')) return null;
  const before = text.slice(0, caret).trimEnd();
  if (before === '' || !/[=+\-*/^&<>(,;]$/.test(before)) return null;
  return { from: caret, to: caret };
}

/** A reference as it is written in a formula: `A1` for one cell, `A1:B3` for a block, with the sheet when it is another. */
export function referenceText(range: RangePos, sheet: string | null): string {
  const single = range.r1 === range.r2 && range.c1 === range.c2;
  const body = single ? cellName(range.r1, range.c1) : rangeName(range);
  if (!sheet) return body;
  return /^[A-Za-z_][A-Za-z0-9_.]*$/.test(sheet) ? `${sheet}!${body}` : `'${sheet.replace(/'/g, "''")}'!${body}`;
}

/** The text with the slot replaced by a reference. */
export function insertReference(text: string, slot: Slot, reference: string): { text: string; slot: Slot } {
  return { text: `${text.slice(0, slot.from)}${reference}${text.slice(slot.to)}`, slot: { from: slot.from, to: slot.from + reference.length } };
}

export interface FormulaReference {
  from: number;
  to: number;
  sheet: string | null;
  range: RangePos;
  /** Which colour it is drawn in, in the order the references appear. */
  color: number;
}

const REFERENCE = /(?<![A-Za-z0-9_.$])(?:((?:'(?:[^']|'')+'|[A-Za-z_][A-Za-z0-9_.]*))!)?(\$?[A-Za-z]{1,3}\$?\d+(?::\$?[A-Za-z]{1,3}\$?\d+)?)(?![A-Za-z0-9_.(!])/g;

/** The cell references of a formula, outside text, with where each is written: what is coloured while it is edited. */
export function referencesIn(text: string): FormulaReference[] {
  if (!text.startsWith('=')) return [];
  const strings = Array.from(text.matchAll(/"(?:[^"]|"")*"/g), (m) => [m.index, m.index + m[0].length] as const);
  const out: FormulaReference[] = [];
  for (const found of text.matchAll(REFERENCE)) {
    if (strings.some(([a, b]) => found.index >= a && found.index < b)) continue;
    const range = parseRange(found[2].replace(/\$/g, '').toUpperCase());
    if (!range) continue;
    const sheet = found[1] ? (found[1].startsWith("'") ? found[1].slice(1, -1).replace(/''/g, "'") : found[1]) : null;
    out.push({ from: found.index, to: found.index + found[0].length, sheet, range, color: out.length });
  }
  return out;
}

/** The colours references are drawn in, as Excel cycles them. */
export const REFERENCE_COLORS = ['#2563eb', '#dc2626', '#7c3aed', '#16a34a', '#ea580c', '#0891b2'] as const;
