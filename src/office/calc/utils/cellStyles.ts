import type { CellStyle } from '../model/workbook';

/** The named looks of the Styles gallery: Normal clears, the rest replace the cell's style. */
export type NamedStyle = 'normal' | 'bad' | 'good' | 'neutral' | 'calculation' | 'input' | 'check' | 'heading' | 'total';

const BOX = { top: true, right: true, bottom: true, left: true };

export const NAMED_STYLES: Record<NamedStyle, CellStyle> = {
  normal: {},
  bad: { fill: '#ffc7ce', color: '#9c0006' },
  good: { fill: '#c6efce', color: '#006100' },
  neutral: { fill: '#ffeb9c', color: '#9c5700' },
  calculation: { fill: '#f2f2f2', color: '#fa7d00', bold: true, borders: BOX },
  input: { fill: '#ffcc99', color: '#3f3f76', borders: BOX },
  check: { fill: '#a5a5a5', color: '#ffffff', bold: true, borders: BOX },
  heading: { bold: true, fontSize: 13, borders: { bottom: true } },
  total: { bold: true, borders: { top: true, bottom: true } },
};
