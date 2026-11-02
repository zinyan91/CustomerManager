import type { CalcController } from './controller';
import type { RangePos } from './engine/cellRef';
import type { GridAction } from './shortcuts';

export interface GridEnv {
  /** How many rows and columns the grid draws: a whole column or row is selected as far as these. */
  rowCount: number;
  colCount: number;
  /** The cells that hold something, or null on an empty sheet. */
  used: RangePos | null;
  /** How many rows and columns fit on the screen, for Alt+Page Up and Page Down. */
  pageRows?: number;
  pageCols?: number;
  /** The actions only the screen can do (a dialog, a view option); true when it did. */
  screen(action: GridAction): boolean;
}

/** Whole columns are selected: from the first row down at least the 1000 rows a column header covers (the grid grows its row count as the cursor moves, so comparing with it misses). */
const wholeColumns = (c: CalcController, env: GridEnv): boolean => c.selection.r1 === 0 && c.selection.r2 >= Math.min(env.rowCount, 1000) - 1;

/** Runs what a shortcut asked for on the controller; false when this action is not one it can do. */
export function runGridAction(controller: CalcController, action: GridAction, env: GridEnv): boolean {
  switch (action.type) {
    case 'sheet':
      controller.switchSheet(controller.active + action.delta);
      return true;
    case 'selectColumn':
      controller.selectColumns(env.rowCount);
      return true;
    case 'selectRow':
      controller.selectRows(env.colCount);
      return true;
    case 'selectAll':
      controller.selectAll();
      return true;
    case 'region':
      controller.selectRegion();
      return true;
    case 'extend':
      if (action.to === 'rowStart') controller.extendTo(controller.focus.row, 0);
      else if (action.to === 'sheetStart') controller.extendTo(0, 0);
      else controller.extendTo(env.used?.r2 ?? 0, env.used?.c2 ?? 0);
      return true;
    case 'insertDate':
      controller.insertNow('date');
      return true;
    case 'insertTime':
      controller.insertNow('time');
      return true;
    case 'copyFromAbove':
      controller.copyFromAbove(action.values);
      return true;
    case 'format':
      controller.setNumFmt(action.code);
      return true;
    case 'style':
      controller.toggleStyle(action.key);
      return true;
    case 'toggleFilter':
      controller.toggleFilter();
      return true;
    case 'formatAsTable':
      controller.formatAsTable();
      return true;
    case 'autoSum':
      controller.autoSum();
      return true;
    case 'border':
      controller.setBorders(action.preset);
      return true;
    case 'newSheet':
      controller.addSheet();
      return true;
    case 'chart':
      controller.addChart('column');
      return true;
    case 'extendMode':
      controller.toggleExtendMode();
      return true;
    case 'namesFromSelection':
      return controller.namesFromSelection() > 0;
    case 'differences':
      controller.selectDifferences(action.by);
      return true;
    case 'flashFill':
      return controller.flashFill();
    case 'precedents':
      controller.selectPrecedents();
      return true;
    case 'dependents':
      controller.selectDependents();
      return true;
    case 'visibleCells':
      controller.selectVisibleCells();
      return true;
    case 'notedCells':
      controller.selectNotedCells();
      return true;
    case 'recalculate':
      controller.recalculate();
      return true;
    case 'repeat':
      // Ctrl+Y redoes when there is something to redo; F4 always repeats.
      if (controller.canRedo && action.fromCtrlY) {
        controller.redo();
        return true;
      }
      return controller.repeatLast();
    case 'screen':
      controller.move(action.axis === 'row' ? (env.pageRows ?? 20) * action.delta : 0, action.axis === 'col' ? (env.pageCols ?? 8) * action.delta : 0);
      return true;
    case 'insertCells':
      if (wholeColumns(controller, env)) controller.insertColumns();
      else controller.insertRows();
      return true;
    case 'deleteCells':
      if (wholeColumns(controller, env)) controller.deleteColumns();
      else controller.deleteRows();
      return true;
    case 'group':
      controller.groupLines(wholeColumns(controller, env) ? 'col' : 'row', action.delta);
      return true;
    case 'hide':
      if (action.axis === 'row') controller.hideRows();
      else controller.hideColumns();
      return true;
    case 'unhide':
      if (action.axis === 'row') controller.unhideRows();
      else controller.unhideColumns();
      return true;
    default:
      return env.screen(action);
  }
}
