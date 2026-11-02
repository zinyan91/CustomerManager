/**
 * Row heights and the vertical alignment of cells in a .docx, table by table in document order, as the HTML
 * presents them (a cell continuing a vertical merge is absent). mammoth drops both, and a form leans on them:
 * a row made tall for a photo or a signature, text centred in its box.
 */
export interface TableProps {
  /** Minimum height of each row in twips, or null. */
  rows: Array<number | null>;
  /** Vertical alignment of each cell. */
  cells: Array<'center' | 'bottom' | null>;
}

export function tableProps(documentXml: string): TableProps[] {
  const tables: TableProps[] = [];
  const open: number[] = [];
  const rows: Array<{ table: number; index: number }> = [];
  const cells: Array<{ table: number; align: 'center' | 'bottom' | null; continued: boolean; inProperties: boolean }> = [];
  const pattern = /<w:tbl[ >]|<\/w:tbl>|<w:tr[ >]|<\/w:tr>|<w:trHeight\b[^>]*>|<w:tc[ >]|<\/w:tc>|<\/w:tcPr>|<w:vAlign\b[^>]*>|<w:vMerge\b[^>]*>/g;
  for (const match of documentXml.matchAll(pattern)) {
    const token = match[0];
    if (token.startsWith('<w:tbl')) {
      tables.push({ rows: [], cells: [] });
      open.push(tables.length - 1);
    } else if (token === '</w:tbl>') open.pop();
    else if (token.startsWith('<w:trHeight')) {
      const row = rows[rows.length - 1];
      const height = /\bw:val="(\d+)"/.exec(token)?.[1];
      if (row && height) tables[row.table].rows[row.index] = Number(height);
    } else if (token.startsWith('<w:tr ') || token === '<w:tr>') {
      const table = open[open.length - 1] ?? 0;
      rows.push({ table, index: tables[table]?.rows.length ?? 0 });
      tables[table]?.rows.push(null);
    } else if (token === '</w:tr>') rows.pop();
    else if (token.startsWith('<w:tc ') || token === '<w:tc>') cells.push({ table: open[open.length - 1] ?? 0, align: null, continued: false, inProperties: true });
    else if (token === '</w:tcPr>') {
      const cell = cells[cells.length - 1];
      if (cell) cell.inProperties = false;
    } else if (token === '</w:tc>') {
      const cell = cells.pop();
      if (cell && !cell.continued) tables[cell.table]?.cells.push(cell.align);
    } else {
      const cell = cells[cells.length - 1];
      if (!cell?.inProperties) continue;
      if (token.startsWith('<w:vAlign')) {
        const value = /\bw:val="(\w+)"/.exec(token)?.[1];
        if (value === 'center' || value === 'bottom') cell.align = value;
      } else if (!/\bw:val="restart"/.test(token)) cell.continued = true;
    }
  }
  return tables;
}

const TWIPS_PER_PX = 15;

/** The HTML with each row's height and each cell's alignment as the attributes the editor reads; as it came when the counts differ. */
export function applyTableProps(html: string, documentXml: string): string {
  if (!documentXml) return html;
  const props = tableProps(documentXml);
  if (!props.some((t) => t.rows.some(Boolean) || t.cells.some(Boolean))) return html;
  const rowCounts: number[] = [];
  const cellCounts: number[] = [];
  const open: number[] = [];
  const marks: Array<{ at: number; text: string }> = [];
  for (const match of html.matchAll(/<table[ >]|<\/table>|<tr(?=[ >])|<t[dh](?=[ >])/g)) {
    const token = match[0];
    if (token.startsWith('<table')) {
      rowCounts.push(0);
      cellCounts.push(0);
      open.push(rowCounts.length - 1);
    } else if (token === '</table>') open.pop();
    else {
      const table = open[open.length - 1];
      if (table === undefined) continue;
      const at = (match.index ?? 0) + token.length;
      if (token === '<tr') {
        const height = props[table]?.rows[rowCounts[table]];
        if (height) marks.push({ at, text: ` data-row-height="${Math.round(height / TWIPS_PER_PX)}"` });
        rowCounts[table] += 1;
      } else {
        const align = props[table]?.cells[cellCounts[table]];
        if (align) marks.push({ at, text: ` data-valign="${align}"` });
        cellCounts[table] += 1;
      }
    }
  }
  if (rowCounts.length !== props.length || rowCounts.some((n, i) => n !== props[i].rows.length) || cellCounts.some((n, i) => n !== props[i].cells.length)) return html;
  let out = html;
  for (const { at, text } of [...marks].reverse()) out = out.slice(0, at) + text + out.slice(at);
  return out;
}
