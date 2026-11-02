/**
 * The borders of every table in a .docx, table by table in document order (a nested table follows the one that
 * holds it). mammoth drops them, and a form leans on them: a grid of black lines, or a layout table with none.
 * Each table is `none` or the colour of its lines.
 */
export type TableBorder = 'none' | string;

const EDGES = ['top', 'left', 'start', 'bottom', 'right', 'end', 'insideH', 'insideV'];

/** What a block of borders draws: nothing, or the colour of its first visible line (black when that is automatic). */
function visibleColour(block: string): TableBorder | null {
  let seen = false;
  let colour: string | null = null;
  for (const edge of EDGES) {
    const tag = new RegExp(`<w:${edge}\\b[^>]*>`).exec(block)?.[0];
    if (!tag) continue;
    const value = /\bw:val="(\w+)"/.exec(tag)?.[1] ?? 'single';
    if (value === 'nil' || value === 'none') continue;
    seen = true;
    const given = /\bw:color="([0-9A-Fa-f]{6})"/.exec(tag)?.[1];
    if (given && colour === null) colour = `#${given.toLowerCase()}`;
  }
  return seen ? (colour ?? '#000000') : null;
}

function styleBorders(stylesXml: string, styleId: string, depth = 0): TableBorder | null {
  if (!stylesXml || !styleId || depth > 4) return null;
  const style = new RegExp(`<w:style\\b[^>]*\\bw:styleId="${styleId}"[^>]*>([\\s\\S]*?)</w:style>`).exec(stylesXml)?.[1];
  if (!style) return null;
  const own = /<w:tblBorders>([\s\S]*?)<\/w:tblBorders>/.exec(style)?.[1];
  if (own !== undefined) return visibleColour(own) ?? 'none';
  const parent = /<w:basedOn\b[^>]*\bw:val="([^"]+)"/.exec(style)?.[1];
  return parent ? styleBorders(stylesXml, parent, depth + 1) : null;
}

export function tableBorders(documentXml: string, stylesXml = ''): TableBorder[] {
  const out: TableBorder[] = [];
  const open: number[] = [];
  const own = new Map<number, TableBorder | null>();
  for (const match of documentXml.matchAll(/<w:tbl>|<w:tbl\s[^>]*>|<\/w:tbl>|<w:tblPr>[\s\S]*?<\/w:tblPr>|<w:tcBorders>[\s\S]*?<\/w:tcBorders>/g)) {
    const token = match[0];
    if (token === '</w:tbl>') {
      open.pop();
    } else if (token.startsWith('<w:tbl>') || token.startsWith('<w:tbl ')) {
      out.push('none');
      open.push(out.length - 1);
    } else if (token.startsWith('<w:tblPr>')) {
      const table = open[open.length - 1];
      if (table === undefined || own.has(table)) continue;
      const borders = /<w:tblBorders>([\s\S]*?)<\/w:tblBorders>/.exec(token)?.[1];
      const styleId = /<w:tblStyle\b[^>]*\bw:val="([^"]+)"/.exec(token)?.[1] ?? '';
      const found = borders !== undefined ? (visibleColour(borders) ?? 'none') : styleBorders(stylesXml, styleId);
      own.set(table, found);
      if (found) out[table] = found;
    } else {
      // A cell that draws its own line gives a table that has none at table level its lines.
      const table = open[open.length - 1];
      const found = visibleColour(token);
      if (table !== undefined && found && out[table] === 'none') out[table] = found;
    }
  }
  return out;
}

/** The HTML with each table's border as the attribute the editor reads; as it came when the count of tables differs. */
export function applyTableBorders(html: string, documentXml: string, stylesXml = ''): string {
  if (!documentXml) return html;
  const borders = tableBorders(documentXml, stylesXml);
  if (borders.length === 0 || (html.match(/<table(?=[ >])/g) ?? []).length !== borders.length) return html;
  let index = -1;
  return html.replace(/<table(?=[ >])/g, (tag) => {
    index += 1;
    const border = borders[index];
    // The editor's own grey is what a table has when it says nothing.
    return border === undefined || border === '#999999' ? tag : `${tag} data-borders="${border}"`;
  });
}
