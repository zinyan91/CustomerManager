/**
 * Column widths of every table in a .docx, in CSS pixels, in document order
 * (a nested table follows the table that holds it, as `querySelectorAll('table')`
 * lists them). mammoth drops these widths, and without them a 14-column form
 * becomes 14 equal slivers.
 */
const TWIPS_PER_PX = 15;

export function tableGridWidths(documentXml: string): number[][] {
  const tables: number[][] = [];
  for (const start of documentXml.matchAll(/<w:tbl[ >]/g)) {
    const grid = /<w:tblGrid>([\s\S]*?)<\/w:tblGrid>/.exec(documentXml.slice(start.index));
    const widths = grid
      ? [...grid[1].matchAll(/<w:gridCol\b[^>]*\bw:w="(\d+)"/g)].map((m) => Math.round(Number(m[1]) / TWIPS_PER_PX))
      : [];
    tables.push(widths);
  }
  return tables;
}

export interface CellSpan {
  colspan: number;
  rowspan: number;
}

/**
 * For each cell of a table (rows of spans, as HTML presents them: cells hidden
 * by a row span are absent), the grid columns it covers.
 */
export function cellColumns(rows: CellSpan[][]): number[][][] {
  // carried[c]: how many of the next rows column c is still covered by a cell from above.
  const carried: number[] = [];
  return rows.map((row) => {
    const covered = carried.map((n) => n > 0);
    let column = 0;
    const cells = row.map((cell) => {
      while (covered[column]) column += 1;
      const columns = Array.from({ length: cell.colspan }, (_, i) => column + i);
      column += cell.colspan;
      return columns;
    });
    // This row used up one row of every span that came from above.
    covered.forEach((was, c) => {
      if (was) carried[c] -= 1;
    });
    // Spans that began in this row count from the next row.
    cells.forEach((columns, i) => {
      if (row[i].rowspan > 1) columns.forEach((c) => (carried[c] = row[i].rowspan - 1));
    });
    return cells;
  });
}
