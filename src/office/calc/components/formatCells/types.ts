import type { Borders, CellStyle } from '../../model/workbook';

export type FormatCellsTabId = 'number' | 'alignment' | 'font' | 'border' | 'fill' | 'protection';

export interface FormatCellsDraft {
  numFmt?: string;
  hAlign?: CellStyle['hAlign'];
  vAlign?: CellStyle['vAlign'];
  wrap?: boolean;
  shrink?: boolean;
  indent?: number;
  rotation?: number;
  fontFamily?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  fill?: string;
  borders?: Borders;
  unlocked?: boolean;
}

export type BorderLineStyleKey = 'none' | 'thin' | 'medium' | 'thick' | 'double' | 'dotted' | 'dashed' | 'hair';

export interface BorderLineState {
  style: BorderLineStyleKey;
  color: string;
}
