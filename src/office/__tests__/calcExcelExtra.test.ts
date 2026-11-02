import { describe, expect, it } from 'vitest';
import extra from './fixtures/excel-extra.json';
import regression from './fixtures/excel-regression.json';
import { isError } from '../calc/engine/values';
import { Workbook, newSheet } from '../calc/model/workbook';

/** Bit functions, trigonometry, and the t, chi-square, F, gamma, beta, Weibull and log-normal distributions, as Microsoft Excel answered them. */
describe('statistical and engineering functions against Microsoft Excel', () => {
  const rows = extra.rows as Array<[string, number | string | boolean]>;

  function evaluate(formula: string): unknown {
    const book = new Workbook();
    ['1', '3', '4.5'].forEach((raw, row) => book.putCell(0, row, 0, { raw, style: 0 }));
    book.putCell(0, 0, 3, { raw: formula, style: 0 });
    const value = book.valueAt(0, 0, 3);
    return isError(value) ? value.code : value;
  }

  it.each(rows)('%s', (formula, expected) => {
    const mine = evaluate(formula);
    if (typeof expected === 'number' && typeof mine === 'number') expect(Math.abs(mine - expected)).toBeLessThanOrEqual(1e-9 * Math.max(1, Math.abs(expected)));
    else expect(String(mine)).toBe(String(expected));
  });

  it('answers #VALUE! to a call that is short of arguments instead of failing', () => {
    expect(evaluate('=DAYS(1)')).toBe('#VALUE!');
    expect(evaluate('=TEXTJOIN(",")')).toBe('#VALUE!');
  });
});

describe('regression and wrapping functions against Microsoft Excel', () => {
  const A = [1, 2, 3, 4, 5, 6, 7, 8];
  const B = [2.1, 3.9, 6.2, 7.8, 10.3, 11.9, 4, 6];
  const C = [5, 3, 8, 1, 9, 2, 2, 7];
  const D = [2, 3.1, 5.2, 8.1, 13, 21.5];

  it.each(regression.rows)('$f', ({ f, rows, cols, values }) => {
    const book = new Workbook();
    A.forEach((v, i) => book.putCell(0, i, 0, { raw: String(v), style: 0 }));
    B.forEach((v, i) => book.putCell(0, i, 1, { raw: String(v), style: 0 }));
    C.forEach((v, i) => book.putCell(0, i, 2, { raw: String(v), style: 0 }));
    D.forEach((v, i) => book.putCell(0, i, 3, { raw: String(v), style: 0 }));
    book.putCell(0, 19, 7, { raw: f, style: 0 });
    for (let r = 0; r < rows; r += 1)
      for (let c = 0; c < cols; c += 1) {
        const value = book.valueAt(0, 19 + r, 7 + c);
        const mine = isError(value) ? value.code : value;
        const expected = values[r * cols + c];
        if (typeof expected === 'number' && typeof mine === 'number') expect(Math.abs(mine - expected)).toBeLessThanOrEqual(1e-7 * Math.max(1, Math.abs(expected)));
        else expect(String(mine)).toBe(String(expected));
      }
  });
});

describe('functions about references against Microsoft Excel', () => {
  const cases: Array<[string, number | string | boolean]> = [
    ['=ISFORMULA(B1)', true],
    ['=ISFORMULA(A1)', false],
    ['=FORMULATEXT(B1)', '=A1+1'],
    ['=FORMULATEXT(A1)', '#N/A'],
    ['=FORMULATEXT(B1:B2)', '=A1+1'],
    ['=ISREF(A1)', true],
    ['=ISREF(A1:A3)', true],
    ['=ISREF(5)', false],
    ['=ISREF("A1")', false],
    ['=ISREF(INDEX(A1:A3,2))', true],
    ['=SHEET()', 1],
    ['=SHEETS()', 1],
    ['=SHEET(A1)', 1],
    ['=SHEET("Sheet1")', 1],
    ['=SHEET("zz")', '#N/A'],
  ];

  it.each(cases)('%s', (formula, expected) => {
    const book = new Workbook();
    ['1', '3', '4.5'].forEach((raw, row) => book.putCell(0, row, 0, { raw, style: 0 }));
    book.putCell(0, 0, 1, { raw: '=A1+1', style: 0 });
    book.putCell(0, 0, 3, { raw: formula, style: 0 });
    const value = book.valueAt(0, 0, 3);
    expect(isError(value) ? value.code : value).toBe(expected);
  });

  it('counts the sheets and numbers the one asked about', () => {
    const book = new Workbook();
    book.sheets.push(newSheet('Second'));
    book.putCell(1, 0, 0, { raw: '=SHEET()&"/"&SHEETS()', style: 0 });
    book.putCell(0, 0, 0, { raw: '=SHEET(Second!A1)', style: 0 });
    expect(book.valueAt(1, 0, 0)).toBe('2/2');
    expect(book.valueAt(0, 0, 0)).toBe(2);
  });
});

describe('what real workbooks needed', () => {
  const evaluate = (formulas: string[][]): Workbook => {
    const book = new Workbook();
    formulas.forEach((row, r) => row.forEach((raw, c) => raw !== '' && book.putCell(0, r, c, { raw, style: 0 })));
    return book;
  };
  const show = (book: Workbook, row: number, col: number): unknown => {
    const value = book.valueAt(0, row, col);
    return isError(value) ? value.code : value;
  };

  it('does not count a subtotal twice in another subtotal or an AGGREGATE over everything', () => {
    // Excel: A3 = 4, A4 = 3, A5 = 3; SUBTOTAL(9,A1:A5) = 3, AGGREGATE(9,0,A1:A5) = 3, AGGREGATE(9,4,A1:A5) = 13, SUBTOTAL(9,A3) = 0.
    const book = evaluate([['1', '=SUBTOTAL(9,A1:A5)'], ['2', '=AGGREGATE(9,0,A1:A5)'], ['=SUBTOTAL(9,A1:A2)+1', '=AGGREGATE(9,4,A1:A5)'], ['=AGGREGATE(9,6,A1:A2)', '=SUBTOTAL(9,A3)'], ['=IF(TRUE,SUBTOTAL(9,A1:A2),0)']]);
    expect([show(book, 2, 0), show(book, 3, 0), show(book, 4, 0)]).toEqual([4, 3, 3]);
    expect([show(book, 0, 1), show(book, 1, 1), show(book, 2, 1), show(book, 3, 1)]).toEqual([3, 3, 13, 0]);
  });

  it('reads a reference to a deleted sheet or cell as #REF!, quoted sheet or not', () => {
    const book = evaluate([["='My Sheet'!#REF!", '=Sheet1!#REF!', '=SUM(Sheet1!#REF!)', '=IFERROR(Sheet1!#REF!,5)']]);
    expect([0, 1, 2, 3].map((c) => show(book, 0, c))).toEqual(['#REF!', '#REF!', '#REF!', 5]);
  });

  it('keeps the value Excel stored for a formula that links to another workbook', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { importXlsx } = await import('../calc/services/xlsxService');
    const source = new ExcelJS.Workbook();
    const ws = source.addWorksheet('S');
    ws.getCell('A1').value = { formula: "VLOOKUP(B1,'[2]Luong'!$B$2:$U$31,15,0)", result: 10000000 };
    ws.getCell('A2').value = { formula: 'A1*2', result: 20000000 };
    const buffer = (await source.xlsx.writeBuffer()) as ArrayBuffer;
    const book = new Workbook();
    book.loadData((await importXlsx(buffer)) as never);
    expect(book.getCell(0, 0, 0)?.raw).toBe('10000000');
    expect(show(book, 1, 0)).toBe(20000000);
  });

  it('hides the rows a filter hid in a file, and keeps them out of a SUBTOTAL, until the filter changes', async () => {
    const ExcelJS = (await import('exceljs')).default;
    const { importXlsx } = await import('../calc/services/xlsxService');
    const source = new ExcelJS.Workbook();
    const ws = source.addWorksheet('S');
    ['Kind', 'a', 'b', 'c'].forEach((v, i) => (ws.getCell(`A${i + 1}`).value = v));
    [0, 10, 20, 30].forEach((v, i) => i > 0 && (ws.getCell(`B${i + 1}`).value = v));
    ws.getCell('B1').value = 'N';
    ws.autoFilter = 'A1:B4';
    ws.getRow(3).hidden = true;
    ws.getCell('D1').value = { formula: 'SUBTOTAL(109,B2:B4)', result: 40 };
    ws.getCell('D2').value = { formula: 'SUBTOTAL(9,B2:B4)', result: 40 };
    const buffer = (await source.xlsx.writeBuffer()) as ArrayBuffer;
    const book = new Workbook();
    book.loadData((await importXlsx(buffer)) as never);
    expect(book.hiddenRows(0).has(2)).toBe(true);
    expect(show(book, 0, 3)).toBe(40);
    expect(show(book, 1, 3)).toBe(40);
  });

  it('formats an empty cell as 0 and text that reads as a number or date as that', () => {
    const book = evaluate([['=TEXT(Z9,"DD/MM/YYYY")', '=TEXT("5","0.00")', '=TEXT("2025-03-05","DD/MM/YYYY")', '=TEXT("abc","0.00")']]);
    expect([0, 1, 2, 3].map((c) => show(book, 0, c))).toEqual(['00/01/1900', '5.00', '05/03/2025', 'abc']);
  });
});

describe('a workbook from the real world through import and export', () => {
  async function roundTrip(build: (ws: import('exceljs').Worksheet, book: import('exceljs').Workbook) => void): Promise<Workbook> {
    const ExcelJS = (await import('exceljs')).default;
    const { exportXlsx, importXlsx } = await import('../calc/services/xlsxService');
    const source = new ExcelJS.Workbook();
    build(source.addWorksheet('S'), source);
    const first = new Workbook();
    first.loadData((await importXlsx((await source.xlsx.writeBuffer()) as ArrayBuffer)) as never);
    const out = await (await exportXlsx(first)).arrayBuffer();
    const again = new Workbook();
    again.loadData((await importXlsx(out)) as never);
    return again;
  }

  it('keeps a text that looks like a number as text, so that a bank statement stays what it was', async () => {
    const book = await roundTrip((ws) => {
      ws.getCell('A1').value = '334,495.00';
      ws.getCell('A2').value = '0123';
      ws.getCell('A3').value = 'TRUE';
      ws.getCell('A4').value = ' 12 ';
      ws.getCell('A5').value = 1200;
      ws.getCell('A6').value = { richText: [{ text: '7,000,' }, { text: '000' }] };
    });
    expect([0, 1, 2, 3, 4, 5].map((r) => book.valueAt(0, r, 0))).toEqual(['334,495.00', '0123', 'TRUE', ' 12 ', 1200, '7,000,000']);
  });

  it('drops a defined name that points into another workbook, whose file Excel would call corrupt', async () => {
    const book = await roundTrip((ws, source) => {
      ws.getCell('A1').value = 1;
      source.definedNames.add("'[1]DANH MUC'!$B$8:$M$9", 'External');
      source.definedNames.add('S!$A$1', 'Local');
    });
    expect([...book.names.keys()]).toEqual(['LOCAL']);
  });
});
