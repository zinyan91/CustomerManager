/**
 * How a Word list is numbered: mammoth turns every numbered paragraph into an `ol` item that counts 1, 2, 3 from
 * wherever its list starts, and puts consecutive items of different Word lists in one `ol`. The number format
 * (I., a., 1.), the number each item has and which Word list it belongs to are read from numbering.xml and the
 * paragraphs' `numPr`, carried through mammoth as markers, and written as the `type` and `start` of the lists.
 */
const MARK = '⁣';

export type OrderedType = '1' | 'a' | 'A' | 'i' | 'I';

interface LevelFormat {
  type: OrderedType | null;
  start: number;
}

export interface NumberingDefinitions {
  /** Format and first number of each level of each list, by numId then level. */
  levels: Map<string, Map<number, LevelFormat>>;
}

const FORMATS: Record<string, OrderedType | null> = {
  decimal: '1',
  decimalZero: '1',
  upperRoman: 'I',
  lowerRoman: 'i',
  upperLetter: 'A',
  lowerLetter: 'a',
  bullet: null,
  none: null,
};

function levelOf(block: string, ilvl: number): LevelFormat {
  const level = new RegExp(`<w:lvl\\b[^>]*\\bw:ilvl="${ilvl}"[^>]*>([\\s\\S]*?)</w:lvl>`).exec(block)?.[1] ?? '';
  const fmt = /<w:numFmt\b[^>]*\bw:val="(\w+)"/.exec(level)?.[1] ?? 'decimal';
  const start = Number(/<w:start\b[^>]*\bw:val="(-?\d+)"/.exec(level)?.[1] ?? 1);
  return { type: fmt in FORMATS ? FORMATS[fmt] : '1', start: Number.isFinite(start) ? start : 1 };
}

/** The formats of every numbered list a document defines. */
export function readNumbering(numberingXml: string): NumberingDefinitions {
  const levels = new Map<string, Map<number, LevelFormat>>();
  if (!numberingXml) return { levels };
  const abstracts = new Map<string, string>();
  for (const found of numberingXml.matchAll(/<w:abstractNum\b[^>]*\bw:abstractNumId="(\d+)"[^>]*>([\s\S]*?)<\/w:abstractNum>/g)) abstracts.set(found[1], found[2]);
  for (const found of numberingXml.matchAll(/<w:num\b[^>]*\bw:numId="(\d+)"[^>]*>([\s\S]*?)<\/w:num>/g)) {
    const abstract = abstracts.get(/<w:abstractNumId\b[^>]*\bw:val="(\d+)"/.exec(found[2])?.[1] ?? '');
    if (abstract === undefined) continue;
    const byLevel = new Map<number, LevelFormat>();
    for (let ilvl = 0; ilvl < 9; ilvl += 1) {
      const format = levelOf(abstract, ilvl);
      const override = new RegExp(`<w:lvlOverride\\b[^>]*\\bw:ilvl="${ilvl}"[^>]*>[\\s\\S]*?<w:startOverride\\b[^>]*\\bw:val="(-?\\d+)"`).exec(found[2])?.[1];
      byLevel.set(ilvl, override !== undefined ? { ...format, start: Number(override) } : format);
    }
    levels.set(found[1], byLevel);
  }
  return { levels };
}

export interface ListMarker {
  /** The Word list. */
  numId: string;
  level: number;
  type: OrderedType | null;
  /** The number this item has. */
  number: number;
}

/** The marker text of each numbered paragraph, in document order, by the paragraph's position among all `w:p`. */
export function listMarkers(documentXml: string, numbering: NumberingDefinitions): Map<number, ListMarker> {
  const out = new Map<number, ListMarker>();
  const counters = new Map<string, number[]>();
  let index = -1;
  for (const found of documentXml.matchAll(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g)) {
    index += 1;
    const paragraph = found[0];
    if ((paragraph.match(/<w:p[\s>]/g) ?? []).length !== 1) continue;
    const properties = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(paragraph)?.[1];
    const numPr = properties ? /<w:numPr>([\s\S]*?)<\/w:numPr>/.exec(properties)?.[1] : undefined;
    if (!numPr) continue;
    const numId = /<w:numId\b[^>]*\bw:val="(\d+)"/.exec(numPr)?.[1];
    const level = Number(/<w:ilvl\b[^>]*\bw:val="(\d+)"/.exec(numPr)?.[1] ?? 0);
    if (!numId || numId === '0' || !(level >= 0 && level < 9)) continue;
    const format = numbering.levels.get(numId)?.get(level) ?? { type: '1' as OrderedType, start: 1 };
    const counts = counters.get(numId) ?? [];
    // An item restarts the levels below it, and each level counts from its own first number.
    counts[level] = counts[level] === undefined ? format.start : counts[level] + 1;
    for (let deeper = level + 1; deeper < 9; deeper += 1) counts[deeper] = undefined as unknown as number;
    counters.set(numId, counts);
    out.set(index, { numId, level, type: format.type, number: counts[level] });
  }
  return out;
}

/** The marker part for a paragraph's own marker run. */
export function markerParts(marker: ListMarker): string {
  return [`n=${marker.numId}`, marker.type ? `o=${marker.type}` : '', marker.type ? `s=${marker.number}` : ''].filter(Boolean).join(';');
}

const TAG = new RegExp(`<(ol|ul)\\b[^>]*>|</(?:ol|ul)>|<li\\b[^>]*>(?:${MARK}\\[([^\\]]*)\\]${MARK})?`, 'g');

function partsOf(text: string | undefined): Record<string, string> {
  const parts: Record<string, string> = {};
  for (const part of (text ?? '').split(';')) {
    const [key, value] = part.split('=');
    if (key && value !== undefined) parts[key] = value;
  }
  return parts;
}

interface Frame {
  tag: 'ol' | 'ul';
  /** Index in the output of the tag that opened this list. */
  opened: number;
  numId: string | null;
}

const opening = (tag: 'ol' | 'ul', parts: Record<string, string>): string => {
  if (tag === 'ul') return '<ul>';
  // Decimal is written out too: a list nested in another one would otherwise be lettered, as the editor's own nested lists are.
  const type = parts.o ? ` type="${parts.o}"` : '';
  const start = parts.s && Number(parts.s) !== 1 ? ` start="${Number(parts.s)}"` : '';
  return `<ol${type}${start}>`;
};

/**
 * Splits an `ol` where the Word list changes, and gives each its number format and its first number. Works on
 * mammoth's HTML, where the first item of a list carries the marker of its paragraph.
 */
export function applyListMarkers(html: string): string {
  if (!html.includes('<li')) return html;
  const out: string[] = [];
  const stack: Frame[] = [];
  let last = 0;
  for (const found of html.matchAll(TAG)) {
    out.push(html.slice(last, found.index));
    last = found.index + found[0].length;
    const token = found[0];
    if (found[1]) {
      stack.push({ tag: found[1] as 'ol' | 'ul', opened: out.length, numId: null });
      out.push(token);
    } else if (token.startsWith('</')) {
      stack.pop();
      out.push(token);
    } else {
      const parts = partsOf(found[2]);
      const frame = stack[stack.length - 1];
      out.push(token.replace(new RegExp(`${MARK}\\[[^\\]]*\\]${MARK}`), ''));
      if (!frame) continue;
      if (frame.numId === null) {
        frame.numId = parts.n ?? '';
        out[frame.opened] = opening(frame.tag, parts);
      } else if (parts.n !== undefined && parts.n !== frame.numId && frame.tag === 'ol') {
        // The next item belongs to another Word list: close this list and open its own, before the item.
        const item = out.pop() as string;
        out.push(`</${frame.tag}>`);
        frame.opened = out.length;
        frame.numId = parts.n;
        out.push(opening(frame.tag, parts), item);
      }
    }
  }
  out.push(html.slice(last));
  // mammoth opens a bullet list to hold an item whose level has no item above it; with nothing in it but the list, it is only a wrapper.
  let joined = out.join('');
  const wrapper = /<ul><li>(<ol(?:(?!<ul>|<ol)[\s\S])*?<\/ol>)<\/li><\/ul>/;
  while (wrapper.test(joined)) joined = joined.replace(wrapper, '$1');
  return joined;
}
