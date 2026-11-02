import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Workbook } from '../calc/model/workbook';
import { importXlsx } from '../calc/services/xlsxService';

/**
 * A workbook made by Microsoft Excel itself (30 number formats over ten values,
 * formulas, a hidden row and column, a row height, a merge, a name), and the text
 * Excel showed in each cell. The file is read here and must show the same.
 */
async function load(): Promise<Workbook> {
  const bytes = readFileSync('src/office/__tests__/fixtures/excel-made.xlsx');
  const wb = new Workbook();
  wb.loadData(await importXlsx(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)));
  return wb;
}

/** Cells where Excel's own answer depends on its column width (it shows ##### when a date does not fit). */
const isHashes = (text: string): boolean => /^#+$/.test(text.trim());

/** Excel's short date (code 14) and date with time (22) follow the computer's region; this file was made on a US one, and Calc writes them day first. */
const FOLLOWS_REGION = new Set(['dd/mm/yyyy', 'dd/mm/yyyy hh:mm']);

describe('opening a file Excel made', () => {
  it('shows every cell as Excel does', async () => {
    const wb = await load();
    const shown = JSON.parse(readFileSync('src/office/__tests__/fixtures/excel-made.json', 'utf8')) as Array<[number, number, string]>;
    const wrong = shown
      .filter(([r, c, text]) => !isHashes(text) && !FOLLOWS_REGION.has(wb.styleOf(wb.getCell(0, r - 1, c - 1)?.style ?? 0).numFmt ?? '') && wb.displayAt(0, r - 1, c - 1).trim() !== text.trim())
      .map(([r, c, text]) => `R${r}C${c}: Excel [${text}] here [${wb.displayAt(0, r - 1, c - 1)}] under ${wb.styleOf(wb.getCell(0, r - 1, c - 1)?.style ?? 0).numFmt}`);
    expect(wrong).toEqual([]);
  });

  it('keeps hidden rows and columns, a row height, a merge and a name', async () => {
    const sheet = (await load()).sheets[0];
    expect([...(sheet.rowsHidden ?? [])]).toEqual([41]);
    expect([...(sheet.colsHidden ?? [])]).toEqual([11]);
    expect(sheet.rowHeights?.get(42)).toBe(48);
    expect(sheet.merges).toEqual([{ r1: 43, c1: 0, r2: 43, c2: 2 }]);
    expect((await load()).names.get('RATE')?.refersTo).toBe('Data!$A$1');
  });
});
