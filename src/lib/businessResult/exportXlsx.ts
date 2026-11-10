import type { KqkdSheet } from '../../types/businessResult';
import { buildXlsx, columnLetter, type XlsxCell, type XlsxStyle } from '../xlsxWriter';
import { NUM_FMT_ACCOUNTING, ST } from '../reports/sheetStyles';
import { cellValue, rowNumbers } from './sheet';

const NUM_FMT_1 = '#,##0.0;(#,##0.0);"-"';
const NUM_FMT_2 = '#,##0.00;(#,##0.00);"-"';
const CALC_FILL = 'F1F5F9';

function numFmtFor(v: number): string {
  const abs = Math.abs(v);
  if (Number.isInteger(abs)) return NUM_FMT_ACCOUNTING;
  return Number.isInteger(abs * 10) ? NUM_FMT_1 : NUM_FMT_2;
}

function numberCell(v: number | null, computed: boolean, sub: boolean): XlsxCell {
  const base: XlsxStyle = { align: 'right', vAlign: 'center', border: true, italic: sub, fill: computed ? CALC_FILL : undefined };
  if (v === null) return { value: '-', style: { ...base, align: 'right' } };
  return { value: v, numeric: true, style: { ...base, numFmt: numFmtFor(v) } };
}

/** Xuất bảng KQKD ra một sheet Excel: số tự tính ghi thành giá trị, ô tô nền xám nhạt. */
export function buildKqkdWorkbook(sheet: KqkdSheet): Uint8Array {
  const width = 3 + sheet.columns.length;
  const last = columnLetter(width - 1);
  const nums = rowNumbers(sheet);

  const blank = (n: number): XlsxCell[] => Array.from({ length: n }, () => ({ value: '' }));
  const titleRow: XlsxCell[] = [{ value: sheet.title, style: { ...ST.title } }, ...blank(width - 1)];
  const half = Math.max(3, Math.floor(width / 2));
  const infoRow: XlsxCell[] = [
    { value: sheet.subtitle, style: { bold: true, align: 'left', vAlign: 'center' } },
    ...blank(half - 1),
    { value: sheet.unitNote, style: { italic: true, bold: true, align: 'right', vAlign: 'center' } },
    ...blank(width - half - 1),
  ];
  const header: XlsxCell[] = [
    { value: 'STT', style: ST.headerCenter },
    { value: 'CHỈ TIÊU', style: ST.headerCenter },
    { value: 'ĐVT', style: ST.headerCenter },
    ...sheet.columns.map(c => ({ value: c.label, style: ST.headerCenter })),
  ];
  const body = sheet.rows.map((r): XlsxCell[] => [
    { value: nums.get(r.id) ?? '', numeric: nums.get(r.id) !== null, style: { ...ST.center, bold: !r.sub } },
    { value: r.sub ? `+ ${r.label}` : r.label, style: { ...ST.left, bold: !r.sub, italic: r.sub } },
    { value: r.unit, style: { ...ST.center, italic: r.sub } },
    ...sheet.columns.map(c => numberCell(cellValue(sheet, r, c), c.kind !== 'value', r.sub)),
  ]);

  const rows = [titleRow, infoRow, header, ...body];
  return buildXlsx({
    name: 'KQKD',
    rows,
    colWidths: [6, 30, 12, ...sheet.columns.map(() => 13)],
    merges: [`A1:${last}1`, `A2:${columnLetter(half - 1)}2`, `${columnLetter(half)}2:${last}2`],
    rowHeights: { 1: 24, 3: 30 },
  });
}
