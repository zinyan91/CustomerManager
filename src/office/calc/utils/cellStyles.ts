import type { CellStyle } from '../model/workbook';

/** The named looks of the Styles gallery: Normal clears, the rest replace the cell's style. */
export type NamedStyle =
  // Good, Bad and Neutral
  | 'normal'
  | 'bad'
  | 'good'
  | 'neutral'
  // Data and Model
  | 'calculation'
  | 'check'
  | 'explanatory'
  | 'followedHyperlink'
  | 'hyperlink'
  | 'input'
  | 'linkedCell'
  | 'note'
  | 'output'
  | 'warning'
  // Titles and Headings
  | 'heading'
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'title'
  | 'total'
  // Themed Cell Styles
  | 'accent1_20'
  | 'accent2_20'
  | 'accent3_20'
  | 'accent4_20'
  | 'accent5_20'
  | 'accent6_20'
  | 'accent1_40'
  | 'accent2_40'
  | 'accent3_40'
  | 'accent4_40'
  | 'accent5_40'
  | 'accent6_40'
  | 'accent1_60'
  | 'accent2_60'
  | 'accent3_60'
  | 'accent4_60'
  | 'accent5_60'
  | 'accent6_60'
  | 'accent1'
  | 'accent2'
  | 'accent3'
  | 'accent4'
  | 'accent5'
  | 'accent6'
  // Number Format
  | 'comma'
  | 'comma0'
  | 'currency'
  | 'currency0'
  | 'percent';

const BOX = { top: true, right: true, bottom: true, left: true };

export const NAMED_STYLES: Record<NamedStyle, CellStyle> = {
  // Good, Bad and Neutral
  normal: {},
  bad: { fill: '#ffc7ce', color: '#9c0006' },
  good: { fill: '#c6efce', color: '#006100' },
  neutral: { fill: '#ffeb9c', color: '#9c5700' },

  // Data and Model
  calculation: { fill: '#f2f2f2', color: '#fa7d00', bold: true, borders: BOX },
  check: { fill: '#a5a5a5', color: '#ffffff', bold: true, borders: BOX },
  explanatory: { color: '#7f7f7f', italic: true },
  followedHyperlink: { color: '#800080', underline: true },
  hyperlink: { color: '#0000ff', underline: true },
  input: { fill: '#ffcc99', color: '#3f3f76', borders: BOX },
  linkedCell: { color: '#fa7d00', borders: { bottom: true } },
  note: { fill: '#ffffcc', borders: BOX },
  output: { fill: '#f2f2f2', bold: true, borders: BOX },
  warning: { color: '#ff0000' },

  // Titles and Headings
  heading: { bold: true, fontSize: 13, borders: { bottom: true } },
  heading1: { bold: true, fontSize: 15, color: '#1f4e79', borders: { bottom: true } },
  heading2: { bold: true, fontSize: 13, color: '#1f4e79', borders: { bottom: true } },
  heading3: { bold: true, fontSize: 11, color: '#1f4e79', borders: { bottom: true } },
  heading4: { bold: true, fontSize: 11, color: '#1f4e79' },
  title: { bold: true, fontSize: 18, color: '#1f4e79' },
  total: { bold: true, borders: { top: true, bottom: true } },

  // Themed 20%
  accent1_20: { fill: '#d9e1f2', color: '#000000' },
  accent2_20: { fill: '#fce4d6', color: '#000000' },
  accent3_20: { fill: '#ededed', color: '#000000' },
  accent4_20: { fill: '#fff2cc', color: '#000000' },
  accent5_20: { fill: '#deebf7', color: '#000000' },
  accent6_20: { fill: '#e2efda', color: '#000000' },

  // Themed 40%
  accent1_40: { fill: '#b4c6e7', color: '#000000' },
  accent2_40: { fill: '#f8cbad', color: '#000000' },
  accent3_40: { fill: '#dbdbdb', color: '#000000' },
  accent4_40: { fill: '#ffe699', color: '#000000' },
  accent5_40: { fill: '#bdd7ee', color: '#000000' },
  accent6_40: { fill: '#c6e0b4', color: '#000000' },

  // Themed 60%
  accent1_60: { fill: '#8ea9db', color: '#ffffff' },
  accent2_60: { fill: '#f4b084', color: '#ffffff' },
  accent3_60: { fill: '#c9c9c9', color: '#000000' },
  accent4_60: { fill: '#ffd966', color: '#000000' },
  accent5_60: { fill: '#9bc2e6', color: '#ffffff' },
  accent6_60: { fill: '#a9d08e', color: '#ffffff' },

  // Themed Solid
  accent1: { fill: '#4472c4', color: '#ffffff' },
  accent2: { fill: '#ed7d31', color: '#ffffff' },
  accent3: { fill: '#a5a5a5', color: '#ffffff' },
  accent4: { fill: '#ffc000', color: '#ffffff' },
  accent5: { fill: '#5b9bd5', color: '#ffffff' },
  accent6: { fill: '#70ad47', color: '#ffffff' },

  // Number Format
  comma: { numFmt: '#,##0.00' },
  comma0: { numFmt: '#,##0' },
  currency: { numFmt: '$#,##0.00' },
  currency0: { numFmt: '$#,##0' },
  percent: { numFmt: '0.00%' },
};
