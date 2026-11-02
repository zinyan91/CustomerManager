/**
 * The space around a paragraph and its line spacing that come from a style rather than from the paragraph: its
 * paragraph style, or the style of the table it is in (a form's "Table Grid" sets no space after and a single
 * line for every paragraph in its tables). mammoth drops them, and a form made of tables comes out much taller.
 */
export interface StyleSpacing {
  /** Points. */
  before: number | null;
  after: number | null;
  /** A multiple of the line. */
  lineHeight: number | null;
}

export interface StyleSpacings {
  paragraph: Map<string, StyleSpacing>;
  table: Map<string, StyleSpacing>;
  /** The id of the default paragraph style. */
  defaultParagraph: string | null;
  /** What a paragraph gets when nothing names a value: the document defaults, then the default paragraph style. */
  defaults: StyleSpacing;
}

const NONE: StyleSpacing = { before: null, after: null, lineHeight: null };

function attribute(tag: string, name: string): number | null {
  const match = new RegExp(`\\bw:${name}="(-?\\d+)"`).exec(tag);
  return match ? Number(match[1]) : null;
}

/** The spacing a block of properties sets, as `paragraphFormat` reads it. */
export function spacingOf(properties: string): StyleSpacing {
  const spacing = /<w:spacing\b[^>]*>/.exec(properties)?.[0] ?? '';
  const line = attribute(spacing, 'line');
  const rule = /\bw:lineRule="(\w+)"/.exec(spacing)?.[1];
  const before = attribute(spacing, 'before');
  const after = attribute(spacing, 'after');
  return {
    before: before !== null && before >= 0 && before <= 4000 ? before / 20 : null,
    after: after !== null && after >= 0 && after <= 4000 ? after / 20 : null,
    lineHeight: line !== null && (rule === undefined || rule === 'auto') && line >= 120 && line <= 1200 ? Math.round((line / 240) * 100) / 100 : null,
  };
}

const over = (top: StyleSpacing, below: StyleSpacing): StyleSpacing => ({
  before: top.before ?? below.before,
  after: top.after ?? below.after,
  lineHeight: top.lineHeight ?? below.lineHeight,
});

export function readStyleSpacings(stylesXml: string): StyleSpacings {
  const own = new Map<string, { type: string; spacing: StyleSpacing; basedOn: string | null }>();
  let defaultParagraph: string | null = null;
  for (const found of stylesXml.matchAll(/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/g)) {
    const type = /\bw:type="(\w+)"/.exec(found[1])?.[1] ?? '';
    const id = /\bw:styleId="([^"]+)"/.exec(found[1])?.[1];
    if (!id || (type !== 'paragraph' && type !== 'table')) continue;
    if (type === 'paragraph' && /\bw:default="1"/.test(found[1])) defaultParagraph = id;
    // A table style's conditional formatting (first row, banding) is not what every paragraph gets.
    const body = found[2].split('<w:tblStylePr')[0];
    const properties = /<w:pPr>([\s\S]*?)<\/w:pPr>/.exec(body)?.[1] ?? '';
    own.set(id, { type, spacing: spacingOf(properties), basedOn: /<w:basedOn\b[^>]*\bw:val="([^"]+)"/.exec(body)?.[1] ?? null });
  }
  const resolved = new Map<string, StyleSpacing>();
  const resolve = (id: string, depth = 0): StyleSpacing => {
    const known = resolved.get(id);
    if (known) return known;
    const style = own.get(id);
    if (!style || depth > 8) return NONE;
    const spacing = style.basedOn ? over(style.spacing, resolve(style.basedOn, depth + 1)) : style.spacing;
    resolved.set(id, spacing);
    return spacing;
  };
  const docDefaults = spacingOf(/<w:pPrDefault>([\s\S]*?)<\/w:pPrDefault>/.exec(stylesXml)?.[1] ?? '');
  const paragraph = new Map<string, StyleSpacing>();
  const table = new Map<string, StyleSpacing>();
  for (const [id, style] of own) (style.type === 'paragraph' ? paragraph : table).set(id, resolve(id));
  const base = over(defaultParagraph ? (paragraph.get(defaultParagraph) ?? NONE) : NONE, docDefaults);
  return { paragraph, table, defaultParagraph, defaults: { before: base.before ?? 0, after: base.after ?? 0, lineHeight: base.lineHeight ?? 1 } };
}

/** The table style each stretch of the document is in, innermost last: [start, end, style id]. */
export function tableStyleRanges(documentXml: string): Array<[number, number, string | null]> {
  const ranges: Array<[number, number, string | null]> = [];
  const open: number[] = [];
  for (const found of documentXml.matchAll(/<w:tbl>|<w:tbl\s[^>]*>|<\/w:tbl>/g)) {
    if (found[0] === '</w:tbl>') {
      const index = open.pop();
      if (index !== undefined) ranges[index][1] = found.index + found[0].length;
    } else {
      const properties = /<w:tblPr>([\s\S]*?)<\/w:tblPr>/.exec(documentXml.slice(found.index, found.index + 4000))?.[1] ?? '';
      ranges.push([found.index, documentXml.length, /<w:tblStyle\b[^>]*\bw:val="([^"]+)"/.exec(properties)?.[1] ?? null]);
      open.push(ranges.length - 1);
    }
  }
  return ranges;
}

/**
 * The spacing a paragraph inherits when it does not set its own, and only where that differs from what the
 * document gives every paragraph: its paragraph style, else the table it is in.
 */
export function inheritedSpacing(styles: StyleSpacings, paragraphStyle: string | null, tableStyle: string | null): StyleSpacing {
  // A heading is spaced by the editor's own heading styles.
  if (paragraphStyle && /^(heading\d|title|subtitle)/i.test(paragraphStyle)) return NONE;
  const own = paragraphStyle && paragraphStyle !== styles.defaultParagraph ? (styles.paragraph.get(paragraphStyle) ?? NONE) : NONE;
  const fromTable = tableStyle ? (styles.table.get(tableStyle) ?? NONE) : NONE;
  const merged = over(own, fromTable);
  const same = (value: number | null, standard: number | null): number | null => (value === standard ? null : value);
  return { before: same(merged.before, styles.defaults.before), after: same(merged.after, styles.defaults.after), lineHeight: same(merged.lineHeight, styles.defaults.lineHeight) };
}
