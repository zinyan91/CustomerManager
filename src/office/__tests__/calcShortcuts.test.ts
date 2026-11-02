import { describe, expect, it } from 'vitest';
import { CalcController } from '../calc/controller';
import { cycleReference } from '../calc/engine/refCycle';
import { runGridAction, type GridEnv } from '../calc/gridActions';
import { gridShortcut, type KeyInput } from '../calc/shortcuts';

const press = (code: string, mods: Partial<Pick<KeyInput, 'ctrl' | 'shift' | 'alt'>> = {}, key = code): KeyInput => ({ key, code, ctrl: false, shift: false, alt: false, ...mods });

describe('which key does what', () => {
  it('maps Excel\'s number-format shortcuts by physical key', () => {
    expect(gridShortcut(press('Digit1', { ctrl: true, shift: true }, '!'))).toEqual({ type: 'format', code: '#,##0.00' });
    expect(gridShortcut(press('Digit5', { ctrl: true, shift: true }, '%'))).toEqual({ type: 'format', code: '0%' });
    expect(gridShortcut(press('Backquote', { ctrl: true, shift: true }, '~'))).toEqual({ type: 'format', code: 'General' });
    expect(gridShortcut(press('Digit2', { ctrl: true }, '2'))).toEqual({ type: 'style', key: 'bold' });
    expect(gridShortcut(press('Digit5', { ctrl: true }, '5'))).toEqual({ type: 'style', key: 'strike' });
  });

  it('maps selection, sheet and insert shortcuts', () => {
    expect(gridShortcut(press('Space', { ctrl: true }, ' '))).toEqual({ type: 'selectColumn' });
    expect(gridShortcut(press('Space', { shift: true }, ' '))).toEqual({ type: 'selectRow' });
    expect(gridShortcut(press('Space', { ctrl: true, shift: true }, ' '))).toEqual({ type: 'selectAll' });
    expect(gridShortcut(press('PageDown', { ctrl: true }))).toEqual({ type: 'sheet', delta: 1 });
    expect(gridShortcut(press('PageUp', { ctrl: true }))).toEqual({ type: 'sheet', delta: -1 });
    expect(gridShortcut(press('Digit8', { ctrl: true, shift: true }, '*'))).toEqual({ type: 'region' });
    expect(gridShortcut(press('Semicolon', { ctrl: true }, ';'))).toEqual({ type: 'insertDate' });
    expect(gridShortcut(press('Semicolon', { ctrl: true, shift: true }, ':'))).toEqual({ type: 'insertTime' });
    expect(gridShortcut(press('Quote', { ctrl: true }, "'"))).toEqual({ type: 'copyFromAbove', values: false });
    expect(gridShortcut(press('Quote', { ctrl: true, shift: true }, '"'))).toEqual({ type: 'copyFromAbove', values: true });
    expect(gridShortcut(press('Equal', { ctrl: true, shift: true }, '+'))).toEqual({ type: 'insertCells' });
    expect(gridShortcut(press('Minus', { ctrl: true }, '-'))).toEqual({ type: 'deleteCells' });
    expect(gridShortcut(press('Equal', { alt: true }, '='))).toEqual({ type: 'autoSum' });
    expect(gridShortcut(press('Home', { shift: true }))).toEqual({ type: 'extend', to: 'rowStart' });
    expect(gridShortcut(press('Home', { ctrl: true, shift: true }))).toEqual({ type: 'extend', to: 'sheetStart' });
  });

  it('leaves plain keys and unknown combinations alone', () => {
    expect(gridShortcut(press('KeyA', {}, 'a'))).toBeNull();
    expect(gridShortcut(press('Digit7', { ctrl: true }, '7'))).toBeNull();
    expect(gridShortcut(press('ArrowDown', { alt: true }))).toBeNull();
  });
});

describe('F4 on a reference being typed', () => {
  it('goes round A1, $A$1, A$1, $A1', () => {
    let text = '=A1+B2';
    const seen: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      const next = cycleReference(text, 2, 2)!;
      text = next.text;
      seen.push(text);
    }
    expect(seen).toEqual(['=$A$1+B2', '=A$1+B2', '=$A1+B2', '=A1+B2']);
  });

  it('moves both ends of a range, and keeps them selected', () => {
    const next = cycleReference('=SUM(A1:B2)', 6, 6)!;
    expect(next.text).toBe('=SUM($A$1:$B$2)');
    expect(next.text.slice(next.from, next.to)).toBe('$A$1:$B$2');
  });

  it('skips names that contain a reference, text in quotes and a caret with nothing under it', () => {
    expect(cycleReference('=LOG10(5)', 4, 4)).toBeNull();
    expect(cycleReference('="A1"', 3, 3)).toBeNull();
    expect(cycleReference('=A1+5', 5, 5)).toBeNull();
    expect(cycleReference('=Sheet1!A1', 8, 8)?.text).toBe('=Sheet1!$A$1');
  });
});

function grid() {
  const controller = new CalcController();
  const env: GridEnv = { rowCount: 300, colCount: 30, used: null, screen: () => false };
  const run = (type: Parameters<typeof runGridAction>[1]) => runGridAction(controller, type, { ...env, used: controller.wb.usedRange(0) });
  const put = (row: number, col: number, text: string) => {
    controller.select(row, col);
    controller.startEdit(text);
    controller.commitEdit(null);
  };
  return { controller, run, put };
}

describe('moving and selecting from the keyboard', () => {
  it('selects the whole column or row of the selection', () => {
    const { controller, run } = grid();
    controller.select(4, 2);
    run({ type: 'selectColumn' });
    expect(controller.selection).toEqual({ r1: 0, c1: 2, r2: 299, c2: 2 });
    controller.select(4, 2);
    run({ type: 'selectRow' });
    expect(controller.selection).toEqual({ r1: 4, c1: 0, r2: 4, c2: 29 });
  });

  it('selects the block of data around the cell', () => {
    const { controller, run, put } = grid();
    put(1, 1, 'a');
    put(1, 2, 'b');
    put(2, 1, 'c');
    put(2, 2, 'd');
    put(8, 8, 'far');
    controller.select(1, 1);
    run({ type: 'region' });
    expect(controller.selection).toEqual({ r1: 1, c1: 1, r2: 2, c2: 2 });
  });

  it('Enter walks through a selection of several cells instead of leaving it, and wraps', () => {
    const { controller } = grid();
    controller.select(0, 0);
    controller.extendTo(1, 1);
    const seen: Array<[number, number]> = [];
    for (let i = 0; i < 5; i += 1) {
      seen.push([controller.activeCell.row, controller.activeCell.col]);
      controller.advance(1, 0);
    }
    expect(seen).toEqual([[0, 0], [1, 0], [0, 1], [1, 1], [0, 0]]);
    expect(controller.selection).toEqual({ r1: 0, c1: 0, r2: 1, c2: 1 });
  });

  it('Tab walks along the rows, and Shift goes back', () => {
    const { controller } = grid();
    controller.select(0, 0);
    controller.extendTo(1, 1);
    controller.advance(0, 1);
    controller.advance(0, 1);
    expect([controller.activeCell.row, controller.activeCell.col]).toEqual([1, 0]);
    controller.advance(0, -1);
    expect([controller.activeCell.row, controller.activeCell.col]).toEqual([0, 1]);
  });

  it('typing into a selection goes where the cursor is, and Enter moves on inside it', () => {
    const { controller } = grid();
    controller.select(0, 0);
    controller.extendTo(2, 0);
    for (const word of ['x', 'y', 'z']) {
      controller.startEdit(word);
      controller.commitEdit('down');
    }
    expect([0, 1, 2].map((r) => controller.wb.getCell(0, r, 0)?.raw)).toEqual(['x', 'y', 'z']);
  });

  it('a single cell still moves with Enter', () => {
    const { controller } = grid();
    controller.select(3, 3);
    controller.advance(1, 0);
    expect(controller.selection).toEqual({ r1: 4, c1: 3, r2: 4, c2: 3 });
  });

  it('Ctrl+Enter writes what was typed into every selected cell, formulas moved as if filled', () => {
    const { controller, put } = grid();
    put(0, 0, '1');
    put(1, 0, '2');
    put(2, 0, '3');
    controller.select(0, 1);
    controller.extendTo(2, 1);
    controller.startEdit('=A1*10');
    controller.commitEditToSelection();
    expect([0, 1, 2].map((r) => controller.wb.valueAt(0, r, 1))).toEqual([10, 20, 30]);
  });
});

describe('typing shortcuts', () => {
  it('Ctrl+; writes today as a date and Ctrl+Shift+: the time as a time', () => {
    const { controller } = grid();
    controller.now = () => new Date(2026, 9, 11, 14, 30, 45);
    controller.select(0, 0);
    controller.insertNow('date');
    controller.select(1, 0);
    controller.insertNow('time');
    expect(controller.wb.displayAt(0, 0, 0)).toBe('11/10/2026');
    expect(controller.wb.displayAt(0, 1, 0)).toBe('14:30');
  });

  it("Ctrl+' opens the cell with the formula above, Ctrl+Shift+\" with the value it shows", () => {
    const { controller, put } = grid();
    put(0, 0, '5');
    put(1, 0, '=A1*2');
    controller.select(2, 0);
    controller.copyFromAbove(false);
    expect(controller.editing?.text).toBe('=A1*2');
    controller.cancelEdit();
    controller.copyFromAbove(true);
    expect(controller.editing?.text).toBe('10');
  });

  it('applies the shortcut formats and styles to the selection', () => {
    const { controller, run, put } = grid();
    put(0, 0, '0.256');
    controller.select(0, 0);
    run({ type: 'format', code: '0%' });
    expect(controller.wb.displayAt(0, 0, 0)).toBe('26%');
    run({ type: 'style', key: 'bold' });
    expect(controller.activeStyle().bold).toBe(true);
  });

  it('Ctrl+PageDown goes to the next sheet and stops at the last', () => {
    const { controller, run } = grid();
    controller.addSheet();
    controller.switchSheet(0);
    run({ type: 'sheet', delta: 1 });
    expect(controller.active).toBe(1);
    run({ type: 'sheet', delta: 1 });
    expect(controller.active).toBe(1);
  });

  it('hands the actions only the screen can do to the screen', () => {
    const { controller } = grid();
    const seen: string[] = [];
    const handled = runGridAction(controller, { type: 'showFormulas' }, { rowCount: 10, colCount: 10, used: null, screen: (a) => (seen.push(a.type), true) });
    expect(handled).toBe(true);
    expect(seen).toEqual(['showFormulas']);
  });
});

describe('paste special', () => {
  const copied = () => {
    const { controller, put } = grid();
    put(0, 0, '5');
    put(0, 1, '=A1*2');
    put(1, 0, 'text');
    controller.select(0, 0);
    controller.applyStyle({ bold: true });
    controller.select(0, 1);
    controller.setNumFmt('0.00');
    controller.select(0, 0);
    controller.extendTo(1, 1);
    controller.copy(false);
    return controller;
  };

  it('pastes only the values, keeping the target\'s own formats', () => {
    const c = copied();
    c.select(5, 0);
    expect(c.pasteSpecial('values')).toBe(true);
    expect(c.wb.getCell(0, 5, 1)?.raw).toBe('10');
    expect(c.wb.getCell(0, 5, 0)?.raw).toBe('5');
    expect(c.wb.styleOf(c.wb.getCell(0, 5, 0)?.style ?? 0).bold).toBeUndefined();
  });

  it('pastes only the formulas, moved to where they land', () => {
    const c = copied();
    c.select(5, 0);
    c.pasteSpecial('formulas');
    expect(c.wb.getCell(0, 5, 1)?.raw).toBe('=A6*2');
    expect(c.wb.styleOf(c.wb.getCell(0, 5, 0)?.style ?? 0).bold).toBeUndefined();
  });

  it('pastes only the formats', () => {
    const c = copied();
    c.select(5, 0);
    c.pasteSpecial('formats');
    expect(c.wb.styleOf(c.wb.getCell(0, 5, 0)?.style ?? 0).bold).toBe(true);
    expect(c.wb.getCell(0, 5, 0)?.raw ?? '').toBe('');
    expect(c.wb.styleOf(c.wb.getCell(0, 5, 1)?.style ?? 0).numFmt).toBe('0.00');
  });

  it('turns rows into columns', () => {
    const c = copied();
    c.select(5, 0);
    c.pasteSpecial('transpose');
    expect(c.wb.getCell(0, 5, 0)?.raw).toBe('5');
    expect(c.wb.getCell(0, 6, 0)?.raw).toBe('=A1*2');
    expect(c.wb.getCell(0, 5, 1)?.raw).toBe('text');
    expect(c.selection).toEqual({ r1: 5, c1: 0, r2: 6, c2: 1 });
  });

  it('keeps text that looks like a number as text when only values are pasted', () => {
    const { controller, put } = grid();
    put(0, 0, "'007");
    controller.select(0, 0);
    controller.copy(false);
    controller.select(3, 0);
    controller.pasteSpecial('values');
    expect(controller.wb.displayAt(0, 3, 0)).toBe('007');
  });

  it('does nothing when nothing was copied, or it was cut', () => {
    const { controller, put } = grid();
    expect(controller.pasteSpecial('values')).toBe(false);
    put(0, 0, '1');
    controller.select(0, 0);
    controller.copy(true);
    expect(controller.pasteSpecial('values')).toBe(false);
  });
});

describe('the rest of Excel\'s shortcuts', () => {
  it('maps the function keys, the border keys and the Alt ones', () => {
    expect(gridShortcut(press('F4', {}, 'F4'))).toEqual({ type: 'repeat' });
    expect(gridShortcut(press('KeyY', { ctrl: true }, 'y'))).toEqual({ type: 'repeat', fromCtrlY: true });
    expect(gridShortcut(press('F8', {}, 'F8'))).toEqual({ type: 'extendMode' });
    expect(gridShortcut(press('F9', {}, 'F9'))).toEqual({ type: 'recalculate' });
    expect(gridShortcut(press('F11', {}, 'F11'))).toEqual({ type: 'chart' });
    expect(gridShortcut(press('F1', { alt: true }, 'F1'))).toEqual({ type: 'chart' });
    expect(gridShortcut(press('F11', { shift: true }, 'F11'))).toEqual({ type: 'newSheet' });
    expect(gridShortcut(press('F1', { alt: true, shift: true }, 'F1'))).toEqual({ type: 'newSheet' });
    expect(gridShortcut(press('End', {}, 'End'))).toEqual({ type: 'endMode' });
    expect(gridShortcut(press('Digit7', { ctrl: true, shift: true }, '&'))).toEqual({ type: 'border', preset: 'outside' });
    expect(gridShortcut(press('Minus', { ctrl: true, shift: true }, '_'))).toEqual({ type: 'border', preset: 'none' });
    expect(gridShortcut(press('Minus', { ctrl: true }, '-'))).toEqual({ type: 'deleteCells' });
    expect(gridShortcut(press('PageDown', { alt: true }))).toEqual({ type: 'screen', axis: 'col', delta: 1 });
    expect(gridShortcut(press('PageUp', { alt: true }))).toEqual({ type: 'screen', axis: 'col', delta: -1 });
  });

  const env: GridEnv = { rowCount: 100, colCount: 26, used: { r1: 0, c1: 0, r2: 9, c2: 3 }, pageRows: 10, pageCols: 4, screen: () => false };

  it('works on several blocks picked with Ctrl+click', () => {
    const c = new CalcController();
    c.select(0, 0);
    c.addBlock(2, 2);
    c.extendTo(3, 3);
    expect(c.blocks).toEqual([{ r1: 0, c1: 0, r2: 0, c2: 0 }, { r1: 2, c1: 2, r2: 3, c2: 3 }]);
    c.applyStyle({ bold: true });
    const bold = (r: number, col: number) => c.wb.styleOf(c.wb.getCell(0, r, col)?.style ?? 0).bold === true;
    expect([bold(0, 0), bold(3, 3), bold(1, 1)]).toEqual([true, true, false]);
    c.select(5, 5);
    expect(c.blocks).toHaveLength(1);
  });

  it('Alt+; keeps the cells that show, Ctrl+Shift+O the ones with a note', () => {
    const c = new CalcController();
    c.selectRange({ r1: 0, c1: 0, r2: 4, c2: 1 });
    c.wb.sheets[0].rowsHidden = new Set([2]);
    c.wb.sheets[0].colsHidden = new Set([1]);
    c.selectVisibleCells();
    expect(c.blocks).toEqual([{ r1: 0, c1: 0, r2: 1, c2: 0 }, { r1: 3, c1: 0, r2: 4, c2: 0 }]);
    c.selectRange({ r1: 0, c1: 0, r2: 0, c2: 0 });
    c.wb.sheets[0].comments = new Map([[1 * 16384 + 3, { text: 'x', author: '', at: 0 }], [4 * 16384 + 1, { text: 'y', author: '', at: 0 }]]);
    c.selectNotedCells();
    expect(c.blocks.map((b) => [b.r1, b.c1])).toEqual([[1, 3], [4, 1]]);
    expect(gridShortcut({ key: ';', code: 'Semicolon', ctrl: false, shift: false, alt: true })).toEqual({ type: 'visibleCells' });
    expect(gridShortcut({ key: 'O', code: 'KeyO', ctrl: true, shift: true, alt: false })).toEqual({ type: 'notedCells' });
  });

  it('Ctrl+[ selects what the formula uses, Ctrl+] the formulas that use the cell', () => {
    const c = new CalcController();
    c.wb.putCell(0, 0, 0, { raw: '1', style: 0 });
    c.wb.putCell(0, 1, 0, { raw: '2', style: 0 });
    c.wb.putCell(0, 0, 2, { raw: '=SUM(A1:A2)+A1', style: 0 });
    c.wb.putCell(0, 3, 3, { raw: '=A2*2', style: 0 });
    c.select(0, 2);
    c.selectPrecedents();
    expect(c.blocks).toEqual([{ r1: 0, c1: 0, r2: 1, c2: 0 }, { r1: 0, c1: 0, r2: 0, c2: 0 }]);
    c.select(1, 0);
    c.selectDependents();
    expect(c.blocks.map((b) => [b.r1, b.c1])).toEqual([[0, 2], [3, 3]]);
    expect(gridShortcut({ key: '[', code: 'BracketLeft', ctrl: true, shift: false, alt: false })).toEqual({ type: 'precedents' });
    expect(gridShortcut({ key: ']', code: 'BracketRight', ctrl: true, shift: false, alt: false })).toEqual({ type: 'dependents' });
  });

  it('Ctrl+Shift+F3 names the data after the labels in the top row, or else the left column', () => {
    const c = new CalcController();
    [['Qty', 'Unit price'], ['2', '5'], ['3', '7']].forEach((row, r) => row.forEach((raw, col) => c.wb.putCell(0, r, col, { raw, style: 0 })));
    c.selectRange({ r1: 0, c1: 0, r2: 2, c2: 1 });
    expect(c.namesFromSelection()).toBe(2);
    expect([...c.wb.names.values()].map((n) => [n.name, n.refersTo])).toEqual([['Qty', 'Sheet1!$A$2:$A$3'], ['Unit_price', 'Sheet1!$B$2:$B$3']]);
    expect(gridShortcut({ key: 'F3', code: 'F3', ctrl: true, shift: true, alt: false })).toEqual({ type: 'namesFromSelection' });
    expect(gridShortcut({ key: 'F3', code: 'F3', ctrl: true, shift: false, alt: false })).toBeNull();
  });

  it('Ctrl+Backslash selects the cells of each row that differ from the one in the active column, Ctrl+Shift+| the same by column', () => {
    const c = new CalcController();
    [['1', '1', '2'], ['5', '5', '5'], ['=A3+1', '=B3+1', '9']].forEach((row, r) => row.forEach((raw, col) => c.wb.putCell(0, r, col, { raw, style: 0 })));
    c.selectRange({ r1: 0, c1: 0, r2: 2, c2: 2 });
    c.selectDifferences('row');
    expect(c.blocks.map((b) => [b.r1, b.c1])).toEqual([[0, 2], [2, 2]]);
    c.selectRange({ r1: 0, c1: 0, r2: 2, c2: 2 });
    c.selectDifferences('column');
    expect(c.blocks.map((b) => [b.r1, b.c1])).toEqual([[1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]]);
    expect(gridShortcut({ key: '\\', code: 'Backslash', ctrl: true, shift: false, alt: false })).toEqual({ type: 'differences', by: 'row' });
    expect(gridShortcut({ key: '|', code: 'Backslash', ctrl: true, shift: true, alt: false })).toEqual({ type: 'differences', by: 'column' });
  });

  it('copies blocks that line up, side by side or one above another, and pastes them together', () => {
    const c = new CalcController();
    [['a', 'b', 'c', 'd'], ['1', '2', '=A2*2', '4'], ['x', 'y', 'z', 'w']].forEach((row, r) => row.forEach((raw, col) => c.wb.putCell(0, r, col, { raw, style: 0 })));
    c.selectRange({ r1: 0, c1: 0, r2: 1, c2: 0 });
    c.selectBlocks([{ r1: 0, c1: 0, r2: 1, c2: 0 }, { r1: 0, c1: 2, r2: 1, c2: 2 }]);
    const text = c.copy();
    expect(text).toBe('a\tc\n1\t2');
    c.select(5, 5);
    c.paste(text);
    expect([c.wb.getCell(0, 5, 5)?.raw, c.wb.getCell(0, 5, 6)?.raw, c.wb.getCell(0, 6, 5)?.raw, c.wb.getCell(0, 6, 6)?.raw]).toEqual(['a', 'c', '1', '=E7*2']);
    c.selectBlocks([{ r1: 0, c1: 3, r2: 0, c2: 3 }, { r1: 2, c1: 3, r2: 2, c2: 3 }]);
    expect(c.copy()).toBe('d\nw');
    c.selectBlocks([{ r1: 0, c1: 0, r2: 0, c2: 0 }, { r1: 2, c1: 2, r2: 2, c2: 2 }]);
    expect(c.copy()).toBe('z');
  });

  it('pastes one copied block into each of several selected blocks', () => {
    const c = new CalcController();
    c.wb.putCell(0, 0, 0, { raw: '7', style: 0 });
    c.wb.putCell(0, 0, 1, { raw: '=A1+1', style: 0 });
    c.selectRange({ r1: 0, c1: 0, r2: 0, c2: 1 });
    const text = c.copy();
    c.selectBlocks([{ r1: 3, c1: 0, r2: 3, c2: 0 }, { r1: 6, c1: 2, r2: 6, c2: 2 }]);
    c.paste(text);
    expect([c.wb.getCell(0, 3, 0)?.raw, c.wb.getCell(0, 3, 1)?.raw, c.wb.getCell(0, 6, 2)?.raw, c.wb.getCell(0, 6, 3)?.raw]).toEqual(['7', '=A4+1', '7', '=C7+1']);
  });

  it('maps F12 to Save As and Shift+F9 to recalculation', () => {
    expect(gridShortcut({ key: 'F12', code: 'F12', ctrl: false, shift: false, alt: false })).toEqual({ type: 'saveAs' });
    expect(gridShortcut({ key: 'F9', code: 'F9', ctrl: false, shift: true, alt: false })).toEqual({ type: 'recalculate' });
  });

  it('repeats the last formatting or row command on the selection it is then', () => {
    const c = new CalcController();
    c.selectRange({ r1: 0, c1: 0, r2: 0, c2: 0 });
    c.applyStyle({ bold: true });
    c.selectRange({ r1: 2, c1: 2, r2: 3, c2: 2 });
    expect(runGridAction(c, { type: 'repeat' }, env)).toBe(true);
    expect(c.wb.styleOf(c.wb.getCell(0, 3, 2)?.style ?? 0).bold).toBe(true);
    c.selectRange({ r1: 1, c1: 0, r2: 1, c2: 0 });
    c.insertRows();
    c.selectRange({ r1: 5, c1: 0, r2: 5, c2: 0 });
    c.wb.putCell(0, 6, 0, { raw: 'below', style: 0 });
    runGridAction(c, { type: 'repeat' }, env);
    expect(c.wb.getCell(0, 7, 0)?.raw).toBe('below');
  });

  it('with Ctrl+Y redoes first, and only repeats when there is nothing to redo', () => {
    const c = new CalcController();
    c.selectRange({ r1: 0, c1: 0, r2: 0, c2: 0 });
    c.applyStyle({ italic: true });
    c.undo();
    expect(runGridAction(c, { type: 'repeat', fromCtrlY: true }, env)).toBe(true);
    expect(c.wb.styleOf(c.wb.getCell(0, 0, 0)?.style ?? 0).italic).toBe(true);
    expect(c.canRedo).toBe(false);
  });

  it('F8 makes the arrows extend the selection until it is turned off', () => {
    const c = new CalcController();
    c.select(0, 0);
    runGridAction(c, { type: 'extendMode' }, env);
    c.move(1, 0);
    c.move(0, 1);
    expect(c.selection).toEqual({ r1: 0, c1: 0, r2: 1, c2: 1 });
    runGridAction(c, { type: 'extendMode' }, env);
    c.move(1, 0);
    expect(c.selection).toEqual({ r1: 1, c1: 0, r2: 1, c2: 0 });
  });

  it('after Tabs, Enter goes back to the column the Tabs began in', () => {
    const c = new CalcController();
    c.select(0, 1);
    c.startEdit('a');
    c.commitEdit('right');
    c.startEdit('b');
    c.commitEdit('right');
    c.startEdit('c');
    c.commitEdit('down');
    expect(c.activeCell).toEqual({ row: 1, col: 1 });
    c.startEdit('d');
    c.commitEdit('down');
    expect(c.activeCell).toEqual({ row: 2, col: 1 });
  });

  it('draws the outline border and removes borders, and Alt+Page Down moves a screen of columns', () => {
    const c = new CalcController();
    c.selectRange({ r1: 1, c1: 1, r2: 2, c2: 2 });
    runGridAction(c, { type: 'border', preset: 'outside' }, env);
    expect(c.wb.styleOf(c.wb.getCell(0, 1, 1)?.style ?? 0).borders).toMatchObject({ top: true, left: true });
    runGridAction(c, { type: 'border', preset: 'none' }, env);
    expect(c.wb.styleOf(c.wb.getCell(0, 1, 1)?.style ?? 0).borders).toBeUndefined();
    c.select(0, 0);
    runGridAction(c, { type: 'screen', axis: 'col', delta: 1 }, env);
    expect(c.activeCell).toEqual({ row: 0, col: 4 });
  });

  it('F11 makes a chart of the selection and Shift+F11 a sheet', () => {
    const c = new CalcController();
    [['a', '1'], ['b', '2']].forEach((row, r) => row.forEach((raw, col) => c.wb.putCell(0, r, col, { raw, style: 0 })));
    c.selectRange({ r1: 0, c1: 0, r2: 1, c2: 1 });
    runGridAction(c, { type: 'chart' }, env);
    expect(c.wb.sheets[0].charts).toHaveLength(1);
    runGridAction(c, { type: 'newSheet' }, env);
    expect(c.wb.sheets).toHaveLength(2);
  });
});
