import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { Workbook } from '../calc/model/workbook';
import { exportXlsx, importXlsx, patternFill } from '../calc/services/xlsxService';
import { borderCss, diagonalBackground } from '../calc/utils/borderLines';

describe('border styles, indent and rotation', () => {
  it('draws an edge as its width, line and colour', () => {
    expect(borderCss(true, '#000')).toBe('1px solid #000');
    expect(borderCss({ style: 'thick', color: '#ff0000' }, '#000')).toBe('3px solid #ff0000');
    expect(borderCss({ style: 'double' }, '#000')).toBe('3px double #000');
    expect(borderCss({ style: 'dashed' }, '#000')).toBe('1px dashed #000');
    expect(borderCss(undefined, '#000')).toBeUndefined();
  });

  it('puts thick and double borders only on the edges of the selection that ask for them', () => {
    const c = new CalcController();
    c.selectRange({ r1: 0, c1: 0, r2: 1, c2: 1 });
    c.setBorders('thickOutside');
    const edges = (r: number, col: number) => c.wb.styleOf(c.wb.getCell(0, r, col)?.style ?? 0).borders;
    expect(edges(0, 0)).toEqual({ top: { style: 'thick' }, left: { style: 'thick' } });
    expect(edges(1, 1)).toEqual({ bottom: { style: 'thick' }, right: { style: 'thick' } });
    c.setBorders('doubleBottom');
    expect(edges(1, 0)?.bottom).toEqual({ style: 'double' });
    expect(edges(0, 0)?.bottom).toBeUndefined();
  });

  it('steps the indent and turns the text, and keeps all of it through an .xlsx', async () => {
    const c = new CalcController();
    c.wb.putCell(0, 0, 0, { raw: 'a', style: 0 });
    c.wb.putCell(0, 0, 1, { raw: 'b', style: 0 });
    c.select(0, 0);
    c.changeIndent(2);
    c.setBorders('thickBottom');
    c.select(0, 1);
    c.setRotation(-45);
    const buffer = await (await exportXlsx(c.wb)).arrayBuffer();
    const back = new Workbook();
    back.loadData(await importXlsx(buffer));
    const style = (col: number) => back.styleOf(back.getCell(0, 0, col)?.style ?? 0);
    expect(style(0)).toMatchObject({ indent: 2, hAlign: 'left', borders: { bottom: { style: 'thick' } } });
    expect(style(1).rotation).toBe(-45);
    c.select(0, 0);
    c.changeIndent(-5);
    expect(c.wb.styleOf(c.wb.getCell(0, 0, 0)?.style ?? 0).indent).toBeUndefined();
  });
});

describe('dotted fills and hidden sheets', () => {
  it('draws a pattern fill as the colour it averages to', () => {
    expect(patternFill('darkGray', '#000000', undefined)).toBe('#404040');
    expect(patternFill('lightGray', '#ff0000', '#ffffff')).toBe('#ffbfbf');
    expect(patternFill('solid', '#000000', undefined)).toBeNull();
  });

  it('hides a sheet from the tabs, refuses to hide the last one, and keeps it hidden through an .xlsx', async () => {
    const c = new CalcController();
    c.addSheet();
    expect(c.wb.sheets).toHaveLength(2);
    c.switchSheet(0);
    expect(c.setSheetHidden(0, true)).toBe(true);
    expect(c.active).toBe(1);
    expect(c.setSheetHidden(1, true)).toBe(false);
    const back = new CalcController();
    back.load(await importXlsx(await (await exportXlsx(c.wb)).arrayBuffer()));
    expect(back.wb.sheets.map((s) => !!s.hidden)).toEqual([true, false]);
    expect(back.active).toBe(1);
    expect(back.setSheetHidden(0, false)).toBe(true);
    expect(back.wb.sheets[0].hidden).toBeUndefined();
  });
});

describe('icon sets of four and five', () => {
  it('splits the range into equal parts and round-trips the set', async () => {
    const c = new CalcController();
    [0, 3, 6, 9].forEach((v, r) => c.wb.putCell(0, r, 0, { raw: String(v), style: 0 }));
    c.selectRange({ r1: 0, c1: 0, r2: 3, c2: 0 });
    c.addConditionalRule({ kind: 'icons', set: 'arrows4' });
    expect([0, 1, 2, 3].map((r) => c.wb.cfAt(0, r, 0)?.icon?.color)).toEqual(['#e74c3c', '#e67e22', '#f1c40f', '#27ae60']);
    const back = new CalcController();
    back.load(await importXlsx(await (await exportXlsx(c.wb)).arrayBuffer()));
    expect(back.wb.sheets[0].cf.map((rule) => (rule.kind === 'icons' ? rule.set : null))).toEqual(['arrows4']);
  });
});

describe('icon sets', () => {
  it('gives the lowest, middle and top third of the values their own icon, and keeps the set through an .xlsx', async () => {
    const c = new CalcController();
    [1, 5, 9].forEach((v, r) => c.wb.putCell(0, r, 0, { raw: String(v), style: 0 }));
    c.selectRange({ r1: 0, c1: 0, r2: 2, c2: 0 });
    c.addConditionalRule({ kind: 'icons', set: 'arrows' });
    expect([0, 1, 2].map((r) => c.wb.cfAt(0, r, 0)?.icon?.glyph)).toEqual(['\u25BC', '\u25B6', '\u25B2']);
    expect(c.wb.cfAt(0, 2, 0)?.icon?.color).toBe('#27ae60');
    const back = new CalcController();
    back.load(await importXlsx(await (await exportXlsx(c.wb)).arrayBuffer()));
    expect(back.wb.sheets[0].cf.map((rule) => [rule.kind, rule.kind === 'icons' ? rule.set : null])).toEqual([['icons', 'arrows']]);
  });
});

describe('shrink to fit and diagonal borders', () => {
  it('toggles the diagonals, draws them as gradients and keeps both through an .xlsx', async () => {
    const c = new CalcController();
    c.wb.putCell(0, 0, 0, { raw: 'a', style: 0 });
    c.wb.putCell(0, 0, 1, { raw: 'b', style: 0 });
    c.select(0, 0);
    c.applyStyle({ shrink: true });
    c.setBorders('diagonalDown');
    c.select(0, 1);
    c.setBorders('diagonalUp');
    const style = (ctl: CalcController, col: number) => ctl.wb.styleOf(ctl.wb.getCell(0, 0, col)?.style ?? 0);
    expect(diagonalBackground(style(c, 0).borders, '#000')).toContain('to top right');
    const back = new CalcController();
    back.load(await importXlsx(await (await exportXlsx(c.wb)).arrayBuffer()));
    expect(style(back, 0)).toMatchObject({ shrink: true, borders: { diagonalDown: true } });
    expect(style(back, 1).borders).toEqual({ diagonalUp: true });
    c.select(0, 1);
    c.setBorders('diagonalUp');
    expect(style(c, 1).borders).toBeUndefined();
  });
});
