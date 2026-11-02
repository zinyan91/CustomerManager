const REFERENCE = /(\$?)([A-Za-z]{1,3})(\$?)(\d{1,7})/g;

interface Found {
  start: number;
  end: number;
  absCol: boolean;
  absRow: boolean;
  col: string;
  row: string;
}

/** The cell references in a formula as typed, skipping text in quotes and names that merely contain one (LOG10, Sheet1). */
function referencesIn(text: string): Found[] {
  const found: Found[] = [];
  let quoted = false;
  const quotes = new Set<number>();
  for (let i = 0; i < text.length; i += 1) {
    if (text[i] === '"') quoted = !quoted;
    else if (quoted) quotes.add(i);
  }
  for (const m of text.matchAll(REFERENCE)) {
    const start = m.index;
    const end = start + m[0].length;
    if (quotes.has(start)) continue;
    const before = text[start - 1] ?? '';
    const after = text[end] ?? '';
    if (/[A-Za-z0-9_.]/.test(before) || /[A-Za-z0-9_(]/.test(after)) continue;
    found.push({ start, end, absCol: m[1] === '$', col: m[2], absRow: m[3] === '$', row: m[4] });
  }
  return found;
}

/** F4's order: A1, $A$1, A$1, $A1, and back to A1. */
const CYCLE: Array<[boolean, boolean]> = [
  [false, false],
  [true, true],
  [false, true],
  [true, false],
];

/**
 * What F4 does while a formula is being edited: the reference at the caret (or
 * the ones inside the selection; both ends of A1:B2) takes the next absolute
 * form. Null when there is no reference there.
 */
export function cycleReference(text: string, from: number, to: number): { text: string; from: number; to: number } | null {
  const all = referencesIn(text);
  const hit = all.map((r, i) => ({ r, i })).filter(({ r }) => (from === to ? from >= r.start && from <= r.end : r.end > from && r.start < to));
  if (hit.length === 0) return null;
  // A reference joined to its neighbours by ":" moves with them.
  let first = hit[0].i;
  let last = hit[hit.length - 1].i;
  while (first > 0 && text[all[first - 1].end] === ':' && all[first - 1].end + 1 === all[first].start) first -= 1;
  while (last < all.length - 1 && text[all[last].end] === ':' && all[last].end + 1 === all[last + 1].start) last += 1;
  const group = all.slice(first, last + 1);
  const current = CYCLE.findIndex(([col, row]) => col === group[0].absCol && row === group[0].absRow);
  const [absCol, absRow] = CYCLE[(current + 1) % CYCLE.length];

  let out = '';
  let cursor = 0;
  for (const r of group) {
    out += text.slice(cursor, r.start) + `${absCol ? '$' : ''}${r.col}${absRow ? '$' : ''}${r.row}`;
    cursor = r.end;
  }
  out += text.slice(cursor);
  const start = group[0].start;
  const length = out.length - text.length + (group[group.length - 1].end - group[0].start);
  return { text: out, from: start, to: start + length };
}
