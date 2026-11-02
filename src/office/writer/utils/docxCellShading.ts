/**
 * The fill of every table cell in a .docx, table by table in document order (a nested table follows the one
 * that holds it) and cell by cell as HTML presents them: a cell continuing a vertical merge is absent.
 * mammoth drops cell shading, which forms and tables lean on.
 */
export function cellFills(documentXml: string): Array<Array<string | null>> {
  const tables: Array<Array<string | null>> = [];
  const open: number[] = [];
  const cells: Array<{ table: number; fill: string | null; continued: boolean; inProperties: boolean }> = [];
  for (const match of documentXml.matchAll(/<w:tbl[ >]|<\/w:tbl>|<w:tc[ >]|<\/w:tc>|<\/w:tcPr>|<w:shd\b[^>]*>|<w:vMerge\b[^>]*>/g)) {
    const token = match[0];
    if (token.startsWith('<w:tbl')) {
      tables.push([]);
      open.push(tables.length - 1);
    } else if (token === '</w:tbl>') open.pop();
    else if (token.startsWith('<w:tc ') || token === '<w:tc>') cells.push({ table: open[open.length - 1] ?? 0, fill: null, continued: false, inProperties: true });
    else if (token === '</w:tcPr>') {
      const cell = cells[cells.length - 1];
      if (cell) cell.inProperties = false;
    } else if (token === '</w:tc>') {
      const cell = cells.pop();
      if (cell && !cell.continued) tables[cell.table]?.push(cell.fill);
    } else {
      const cell = cells[cells.length - 1];
      if (!cell?.inProperties) continue;
      if (token.startsWith('<w:shd')) {
        const fill = /\bw:fill="([0-9A-Fa-f]{6})"/.exec(token)?.[1];
        if (fill) cell.fill = `#${fill.toLowerCase()}`;
      } else if (!/\bw:val="restart"/.test(token)) cell.continued = true;
    }
  }
  return tables;
}

/** The HTML with each cell's fill as the attribute the editor reads; as it came when the table counts differ. */
export function applyCellShading(html: string, documentXml: string): string {
  if (!documentXml) return html;
  const fills = cellFills(documentXml);
  if (!fills.some((table) => table.some(Boolean))) return html;
  // Walk the tags: tables in the order they open, and in each the cells that open directly in it.
  const counts: number[] = [];
  const open: number[] = [];
  const marks: Array<{ at: number; table: number; cell: number }> = [];
  for (const match of html.matchAll(/<table[ >]|<\/table>|<t[dh](?=[ >])/g)) {
    if (match[0].startsWith('<table')) {
      counts.push(0);
      open.push(counts.length - 1);
    } else if (match[0] === '</table>') open.pop();
    else {
      const table = open[open.length - 1];
      if (table === undefined) continue;
      marks.push({ at: match.index + match[0].length, table, cell: counts[table] });
      counts[table] += 1;
    }
  }
  if (counts.length !== fills.length || counts.some((n, i) => n !== fills[i].length)) return html;
  let out = html;
  for (const { at, table, cell } of [...marks].reverse()) {
    const fill = fills[table][cell];
    if (fill) out = `${out.slice(0, at)} data-background="${fill}"${out.slice(at)}`;
  }
  return out;
}
