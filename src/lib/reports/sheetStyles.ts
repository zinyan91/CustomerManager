import { columnLetter, type XlsxCell, type XlsxStyle } from '../xlsxWriter';

const HEADER_FILL = 'E2E8F0';
export const NUM_FMT_ACCOUNTING = '#,##0;(#,##0);"-"';

export const ST = {
  headerCenter: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true } as XlsxStyle,
  headerLeft: { bold: true, align: 'left', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true } as XlsxStyle,
  headerRight: { bold: true, align: 'right', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true } as XlsxStyle,
  center: { align: 'center', vAlign: 'center', border: true } as XlsxStyle,
  left: { align: 'left', vAlign: 'center', border: true } as XlsxStyle,
  money: { align: 'right', vAlign: 'center', numFmt: NUM_FMT_ACCOUNTING, border: true } as XlsxStyle,
  title: { bold: true, align: 'center', vAlign: 'center' } as XlsxStyle,
};

export function headerRow(labels: string[]): XlsxCell[] {
  return labels.map(label => ({ value: label, style: ST.headerCenter }));
}

export function textCell(value: string | null | undefined, style: XlsxStyle = ST.left): XlsxCell {
  return { value: value ?? '', style };
}

export function moneyCell(value: number | null | undefined): XlsxCell {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { value: '', style: ST.money };
  }
  return { value, numeric: true, style: ST.money };
}

export function numCell(value: number | null | undefined, style: XlsxStyle = ST.center): XlsxCell {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return { value: '', style };
  }
  return { value, numeric: true, style };
}

const TOTAL_FILL = 'CBD5E1';

export const ST_TOTAL = {
  label: { bold: true, align: 'center', vAlign: 'center', fill: TOTAL_FILL, border: true } as XlsxStyle,
  blank: { fill: TOTAL_FILL, border: true } as XlsxStyle,
  money: { bold: true, align: 'right', vAlign: 'center', numFmt: NUM_FMT_ACCOUNTING, fill: TOTAL_FILL, border: true } as XlsxStyle,
};

export function sumOf(values: (number | null | undefined)[]): number {
  let tong = 0;
  for (const v of values) {
    if (v !== null && v !== undefined && !Number.isNaN(v)) tong += v;
  }
  return tong;
}

export function totalRow(width: number, sums: Record<number, number>): XlsxCell[] {
  return Array.from({ length: width }, (_, i) => {
    if (i === 0) return { value: 'TỔNG CỘNG', style: ST_TOTAL.label };
    if (i in sums) return { value: sums[i], numeric: true, style: ST_TOTAL.money };
    return { value: '', style: ST_TOTAL.blank };
  });
}

export function totalMerges(rowCount: number, sums: Record<number, number>): string[] {
  const sumCols = Object.keys(sums).map(Number).filter(n => !Number.isNaN(n) && n > 0);
  if (sumCols.length === 0) return [];
  const firstSumCol = Math.min(...sumCols);
  if (firstSumCol <= 1) return [];
  return [`A${rowCount}:${columnLetter(firstSumCol - 1)}${rowCount}`];
}

export function reportRowHeights(rowCount: number, hasTotalRow = true): Record<number, number> {
  const heights: Record<number, number> = { 1: 28 };
  for (let r = 2; r <= rowCount; r++) {
    heights[r] = hasTotalRow && r === rowCount ? 24 : 21;
  }
  return heights;
}
