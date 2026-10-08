import { describe, expect, it } from 'vitest';
import { cellKey } from '../calc/engine/cellRef';
import { Workbook, newSheet } from '../calc/model/workbook';
import { exportCsv, exportXlsx, importCsv, importXlsx } from '../calc/services/xlsxService';
import { detectDelimiter, parseCsv, toCsv } from '../calc/utils/csv';

describe('csv', () => {
  it('parses quotes, embedded newlines and delimiters', () => {
    expect(parseCsv('a,"b,c","d ""q"""\n1,2,3\r\n')).toEqual([
      ['a', 'b,c', 'd "q"'],
      ['1', '2', '3'],
    ]);
    expect(parseCsv('x;y\n"a\nb";2', ';')).toEqual([
      ['x', 'y'],
      ['a\nb', '2'],
    ]);
    expect(detectDelimiter('a;b;c')).toBe(';');
    expect(detectDelimiter('"a,b";c')).toBe(';');
    expect(detectDelimiter('abc')).toBe(',');
  });

  it('writes fields that need quoting', () => {
    expect(toCsv([['a,b', 'c"d', 'e']])).toBe('"a,b","c""d",e');
  });

  it('imports into a workbook, keeping text that looks like a formula as text', () => {
    const wb = new Workbook();
    wb.loadData(importCsv('Tên,Số\nHà,12\n=A1,x'));
    expect(wb.displayAt(0, 1, 1)).toBe('12');
    expect(wb.displayAt(0, 2, 0)).toBe('=A1');
  });

  it('exports what is shown, with a BOM', async () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: 'Việt', style: 0 });
    wb.putCell(0, 0, 1, { raw: '=1+1', style: 0 });
    const blob = exportCsv(wb, 0);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    expect(new TextDecoder().decode(bytes.slice(3))).toBe('Việt,2');
  });
});

describe('xlsx', () => {
  it('writes a workbook and reads the same thing back', async () => {
    const wb = new Workbook();
    const bold = wb.styleId({ bold: true, color: '#ff0000', fill: '#ffff00', hAlign: 'center', borders: { top: true, bottom: true } });
    const money = wb.styleId({ numFmt: '#,##0.00' });
    const date = wb.styleId({ numFmt: 'dd/mm/yyyy' });
    wb.putCell(0, 0, 0, { raw: 'Tên', style: bold });
    wb.putCell(0, 1, 0, { raw: '1234.5', style: money });
    wb.putCell(0, 2, 0, { raw: '=A2*2', style: money });
    wb.putCell(0, 3, 0, { raw: '45356', style: date });
    wb.putCell(0, 4, 0, { raw: "'007", style: 0 });
    wb.putCell(0, 5, 0, { raw: 'TRUE', style: 0 });
    wb.sheets[0].colWidths.set(0, 140);
    wb.sheets[0].rowHeights.set(1, 48);
    wb.sheets[0].rowHeights.set(9, 36);
    wb.sheets[0].merges.push({ r1: 0, c1: 1, r2: 0, c2: 2 });
    wb.sheets.push({ ...newSheet('Data'), cells: new Map([[cellKey(0, 0), { raw: '=Sheet1!A2+1', style: 0 }]]) });

    const blob = await exportXlsx(wb);
    const loaded = new Workbook();
    loaded.loadData(await importXlsx(await blob.arrayBuffer()));

    expect(loaded.sheets.map((s) => s.name)).toEqual(['Sheet1', 'Data']);
    expect(loaded.displayAt(0, 0, 0)).toBe('Tên');
    expect(loaded.styleOf(loaded.getCell(0, 0, 0)!.style)).toMatchObject({ bold: true, color: '#ff0000', fill: '#ffff00', hAlign: 'center', borders: { top: true, bottom: true } });
    expect(loaded.displayAt(0, 1, 0)).toBe('1,234.50');
    expect(loaded.getCell(0, 2, 0)?.raw).toBe('=A2*2');
    expect(loaded.displayAt(0, 2, 0)).toBe('2,469.00');
    expect(loaded.displayAt(0, 3, 0)).toBe('05/03/2024');
    expect(loaded.displayAt(0, 4, 0)).toBe('007');
    expect(loaded.displayAt(0, 5, 0)).toBe('TRUE');
    expect(loaded.sheets[0].colWidths.get(0)).toBeGreaterThan(120);
    expect(loaded.sheets[0].rowHeights.get(1)).toBe(48);
    // Dòng chỉ có chiều cao, không có ô nào, vẫn giữ
    expect(loaded.sheets[0].rowHeights.get(9)).toBe(36);
    expect(loaded.sheets[0].rowHeights.has(0)).toBe(false);
    expect(loaded.sheets[0].merges).toEqual([{ r1: 0, c1: 1, r2: 0, c2: 2 }]);
    expect(loaded.displayAt(1, 0, 0)).toBe('1235.5');
  });
});

describe('xlsx conditional formatting', () => {
  it('writes the rules and reads them back in the same order', async () => {
    const wb = new Workbook();
    [3, 8, 5, 8].forEach((n, r) => wb.putCell(0, r, 0, { raw: String(n), style: 0 }));
    const range = { r1: 0, c1: 0, r2: 3, c2: 0 };
    wb.sheets[0].cf = [
      { id: 'a', range, kind: 'cell', op: 'gt', a: 6, style: { fill: '#ffc7ce', color: '#9c0006' } },
      { id: 'b', range, kind: 'cell', op: 'between', a: 2, b: 4, style: { bold: true } },
      { id: 'c', range, kind: 'duplicate', style: { fill: '#ffeb9c' } },
      { id: 'd', range, kind: 'top', n: 2, bottom: false, style: { color: '#006100' } },
      { id: 'e', range, kind: 'scale', low: '#f8696b', mid: '#ffeb84', high: '#63be7b' },
      { id: 'f', range, kind: 'bar', color: '#638ec6' },
      { id: 'g', range, kind: 'text', op: 'contains', text: 'ab', style: { bold: true } },
    ];
    const blob = await exportXlsx(wb);
    const loaded = new Workbook();
    loaded.loadData(await importXlsx(await blob.arrayBuffer()));
    const rules = loaded.sheets[0].cf;
    expect(rules.map((r) => r.kind)).toEqual(['cell', 'cell', 'duplicate', 'top', 'scale', 'bar', 'text']);
    expect(rules[0]).toMatchObject({ op: 'gt', a: 6, style: { fill: '#ffc7ce', color: '#9c0006' } });
    expect(rules[1]).toMatchObject({ op: 'between', a: 2, b: 4, style: { bold: true } });
    expect(rules[3]).toMatchObject({ n: 2, bottom: false });
    expect(rules[4]).toMatchObject({ low: '#f8696b', mid: '#ffeb84', high: '#63be7b' });
    expect(rules[5]).toMatchObject({ color: '#638ec6' });
    expect(rules[0].range).toEqual(range);
    expect(loaded.cfAt(0, 1, 0)?.fill).toBe('#ffc7ce');
  });
});


describe('xlsx frozen panes', () => {
  it('writes the frozen rows and columns and reads them back', async () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: 'Tên', style: 0 });
    wb.sheets[0].freeze = { rows: 2, cols: 1 };
    wb.sheets.push(newSheet('Hai'));
    const back = new Workbook();
    back.loadData(await importXlsx(await (await exportXlsx(wb)).arrayBuffer()));
    expect(back.sheets[0].freeze).toEqual({ rows: 2, cols: 1 });
    expect(back.sheets[1].freeze).toBeUndefined();
  });
});

describe('xlsx pictures', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  it('writes a picture into the file and reads it back where it was', async () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: 'x', style: 0 });
    wb.sheets[0].images = [{ id: 'a', src: PNG, alt: '', row: 2, col: 1, dx: 0, dy: 0, width: 120, height: 80 }];
    const back = new Workbook();
    back.loadData(await importXlsx(await (await exportXlsx(wb)).arrayBuffer()));
    const [image] = back.sheets[0].images ?? [];
    expect(image).toMatchObject({ row: 2, col: 1, width: 120, height: 80 });
    expect(image.src.startsWith('data:image/png;base64,')).toBe(true);
  });
});

describe('xlsx charts', () => {
  const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

  function workbookWithCharts() {
    const wb = new Workbook();
    wb.sheets[0].name = 'Doanh thu';
    const rows = [['Tháng', 'Bán', 'Chi'], ['T1', '10', '4'], ['T2', '20', '8'], ['T3', '15', '6']];
    rows.forEach((row, r) => row.forEach((raw, c) => wb.putCell(0, r, c, { raw, style: 0 })));
    wb.sheets[0].charts = [
      { id: 'c1', type: 'column', range: { r1: 0, c1: 0, r2: 3, c2: 2 }, title: 'Tình hình <A&B>', row: 5, col: 1, dx: 8, dy: 4, width: 420, height: 270 },
      { id: 'c2', type: 'pie', range: { r1: 0, c1: 0, r2: 3, c2: 1 }, title: '', row: 5, col: 8, dx: 0, dy: 0, width: 300, height: 240 },
    ];
    return wb;
  }

  it('writes chart parts with their ranges and numbers, and reads the charts back where they were', async () => {
    const buffer = await (await exportXlsx(workbookWithCharts())).arrayBuffer();
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files);
    expect(names.filter((n) => /^xl\/charts\/chart\d+\.xml$/.test(n))).toHaveLength(2);
    const column = await zip.file('xl/charts/chart1.xml')!.async('string');
    expect(column).toContain('<c:barDir val="col"/>');
    expect(column).toContain("'Doanh thu'!$B$2:$B$4");
    expect(column).toContain('Tình hình &lt;A&amp;B&gt;');
    expect(column).toContain('<c:v>20</c:v>');
    expect(await zip.file('[Content_Types].xml')!.async('string')).toContain('/xl/charts/chart1.xml');

    const back = new Workbook();
    back.loadData(await importXlsx(buffer));
    expect(back.sheets[0].charts).toHaveLength(2);
    expect(back.sheets[0].charts[0]).toMatchObject({ type: 'column', title: 'Tình hình <A&B>', range: { r1: 0, c1: 0, r2: 3, c2: 2 }, row: 5, col: 1, dx: 8, dy: 4, width: 420, height: 270 });
    expect(back.sheets[0].charts[1]).toMatchObject({ type: 'pie', range: { r1: 0, c1: 0, r2: 3, c2: 1 }, col: 8 });
    // The cells are still there.
    expect(back.displayAt(0, 2, 1)).toBe('20');
  });

  it('puts charts and pictures of one sheet in the same drawing', async () => {
    const wb = workbookWithCharts();
    wb.sheets[0].images = [{ id: 'i', src: PNG, alt: '', row: 12, col: 0, dx: 0, dy: 0, width: 50, height: 50 }];
    const buffer = await (await exportXlsx(wb)).arrayBuffer();
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(buffer);
    expect(Object.keys(zip.files).filter((n) => /^xl\/drawings\/drawing\d+\.xml$/.test(n))).toHaveLength(1);
    const back = new Workbook();
    back.loadData(await importXlsx(buffer));
    expect(back.sheets[0].charts).toHaveLength(2);
    expect(back.sheets[0].images).toHaveLength(1);
  });

  it('leaves a workbook without charts as ExcelJS wrote it', async () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: '1', style: 0 });
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(await (await exportXlsx(wb)).arrayBuffer());
    expect(Object.keys(zip.files).some((n) => n.startsWith('xl/charts/'))).toBe(false);
  });
});

describe('xlsx filter', () => {
  it('writes the filter range and the hidden rows, and reads the range back', async () => {
    const wb = new Workbook();
    [['H', 'G'], ['a', 'x'], ['b', 'y'], ['c', 'x']].forEach((row, r) => row.forEach((raw, c) => wb.putCell(0, r, c, { raw, style: 0 })));
    wb.sheets[0].filter = { range: { r1: 0, c1: 0, r2: 3, c2: 1 }, excluded: { 1: ['y'] } };
    const buffer = await (await exportXlsx(wb)).arrayBuffer();
    const { default: JSZip } = await import('jszip');
    const sheetXml = await (await JSZip.loadAsync(buffer)).file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheetXml).toContain('<autoFilter ref="A1:B4"');
    expect(sheetXml).toMatch(/<row r="3"[^>]*hidden="1"/);
    expect(sheetXml).not.toMatch(/<row r="2"[^>]*hidden="1"/);
    const back = new Workbook();
    back.loadData(await importXlsx(buffer));
    expect(back.sheets[0].filter).toEqual({ range: { r1: 0, c1: 0, r2: 3, c2: 1 }, excluded: {} });
  });
});

describe('xlsx summary formulas', () => {
  it('keeps the sheet-qualified SUMIFS and MAXIFS formulas of a summary and still computes them', async () => {
    const wb = new Workbook();
    const rows = [
      ['Vùng', 'Số'],
      ['Bắc', '10'],
      ['Nam', '20'],
      ['Bắc', '7'],
    ];
    rows.forEach((row, r) => row.forEach((raw, c) => wb.putCell(0, r, c, { raw, style: 0 })));
    wb.sheets.push(newSheet('Tóm tắt'));
    wb.putCell(1, 0, 0, { raw: 'Bắc', style: 0 });
    wb.putCell(1, 0, 1, { raw: "=SUMIFS('Sheet1'!$B$2:$B$4,'Sheet1'!$A$2:$A$4,\"=\"&A1)", style: 0 });
    wb.putCell(1, 0, 2, { raw: "=MAXIFS('Sheet1'!$B$2:$B$4,'Sheet1'!$A$2:$A$4,\"=\"&A1)", style: 0 });
    const back = new Workbook();
    back.loadData(await importXlsx(await (await exportXlsx(wb)).arrayBuffer()));
    const summary = back.sheets.findIndex((sheet) => sheet.name === 'Tóm tắt');
    expect(back.displayAt(summary, 0, 1)).toBe('17');
    expect(back.displayAt(summary, 0, 2)).toBe('10');
  });
});

describe('xlsx data validation', () => {
  const build = () => {
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: 'Đạt', style: 0 });
    wb.sheets.push(newSheet('Danh mục'));
    wb.putCell(1, 0, 0, { raw: 'Hà Nội', style: 0 });
    wb.putCell(1, 1, 0, { raw: 'Đà Nẵng', style: 0 });
    wb.sheets[0].validations = [
      { range: { r1: 1, c1: 0, r2: 4, c2: 1 }, rule: { kind: 'items', items: ['Đạt', 'Không đạt'] }, error: 'Chọn một mục' },
      { range: { r1: 1, c1: 2, r2: 4, c2: 2 }, rule: { kind: 'range', ref: "'Danh mục'!$A$1:$A$2" } },
      { range: { r1: 1, c1: 3, r2: 4, c2: 3 }, rule: { kind: 'number', integer: true, op: 'between', a: 1, b: 10 } },
      { range: { r1: 1, c1: 4, r2: 4, c2: 4 }, rule: { kind: 'number', integer: false, op: 'gte', a: 0.5 } },
    ];
    return wb;
  };

  it('writes the rules and reads them back as the same blocks', async () => {
    const back = new Workbook();
    back.loadData(await importXlsx(await (await exportXlsx(build())).arrayBuffer()));
    const rules = back.sheets[0].validations ?? [];
    expect(rules.map((v) => v.range)).toEqual([
      { r1: 1, c1: 0, r2: 4, c2: 1 },
      { r1: 1, c1: 2, r2: 4, c2: 2 },
      { r1: 1, c1: 3, r2: 4, c2: 3 },
      { r1: 1, c1: 4, r2: 4, c2: 4 },
    ]);
    expect(rules[0]).toMatchObject({ rule: { kind: 'items', items: ['Đạt', 'Không đạt'] }, error: 'Chọn một mục' });
    expect(rules[1].rule).toEqual({ kind: 'range', ref: "'Danh mục'!$A$1:$A$2" });
    expect(rules[2].rule).toEqual({ kind: 'number', integer: true, op: 'between', a: 1, b: 10 });
    expect(rules[3].rule).toEqual({ kind: 'number', integer: false, op: 'gte', a: 0.5 });
    expect(back.sheets[1].validations).toBeUndefined();
  });

  it('writes real list validation parts a spreadsheet program reads', async () => {
    const { default: JSZip } = await import('jszip');
    const zip = await JSZip.loadAsync(await (await exportXlsx(build())).arrayBuffer());
    const sheetXml = await zip.file('xl/worksheets/sheet1.xml')!.async('string');
    expect(sheetXml).toContain('type="list"');
    expect(sheetXml).toContain('type="whole"');
    expect(sheetXml).toContain('type="decimal"');
    expect(sheetXml).toContain('Đạt,Không đạt');
  });
});

describe('xlsx future functions', () => {
  it('writes them with the _xlfn. prefix Excel needs and reads the prefix off again', async () => {
    const { default: JSZip } = await import('jszip');
    const wb = new Workbook();
    wb.putCell(0, 0, 0, { raw: '1', style: 0 });
    wb.putCell(0, 0, 1, { raw: '=XLOOKUP(1,A1:A1,A1:A1)+IFS(TRUE,1)', style: 0 });
    wb.putCell(0, 0, 2, { raw: '=MAXIFS(A1:A1,A1:A1,">0")&"IFS(x)"', style: 0 });
    const buffer = await (await exportXlsx(wb)).arrayBuffer();
    const xml = await (await JSZip.loadAsync(buffer)).file('xl/worksheets/sheet1.xml')!.async('string');
    expect(xml).toContain('_xlfn.XLOOKUP(1,A1:A1,A1:A1)+_xlfn.IFS(TRUE,1)');
    expect(xml).toContain('_xlfn.MAXIFS(A1:A1,A1:A1,');
    expect(xml).not.toContain('_xlfn.IFS(x)');
    const back = new Workbook();
    back.loadData(await importXlsx(buffer));
    expect(back.sheets[0].cells.get(1)?.raw).toBe('=XLOOKUP(1,A1:A1,A1:A1)+IFS(TRUE,1)');
    expect(back.sheets[0].cells.get(2)?.raw).toBe('=MAXIFS(A1:A1,A1:A1,">0")&"IFS(x)"');
  });
});
