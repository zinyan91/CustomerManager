import type { CalcController } from '../../controller';
import type { FormatCellsTabId } from '../formatCells/types';

export interface RibbonTabCommonProps {
  controller: CalcController;
  sheetFocus: () => void;
  act: (fn: () => void) => () => void;
  onMessage: (msg: string) => void;
  openFormatWithTab: (tab: FormatCellsTabId) => void;
}
