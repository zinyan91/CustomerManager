import { buildXlsx, MIME_XLSX, type XlsxCell, type XlsxSheet, type XlsxStyle } from './xlsxWriter';
import { downloadBytes } from './xlsExport';
import { parseAnyDate, toIsoDate } from './utils';
import type { EstimateLine } from './settlementEstimate';

export interface EstimateExportRow {
  contractNumber: string;
  loanMethod: string;
  principal: number;
  rateAnnualPercent: number;
  disbursementDate: string;
  interestFromDate: string;
  settlementDate: string;
  line: EstimateLine;
}

const NUM = '#,##0;(#,##0);"-"';
const RATE = '0.00';
const DATE = 'dd/mm/yyyy';
const HEADER_FILL = 'E2E8F0';
const TOTAL_FILL = 'CBD5E1';

const head: XlsxStyle = { bold: true, align: 'center', vAlign: 'center', wrap: true, fill: HEADER_FILL, border: true };
const text: XlsxStyle = { vAlign: 'center', border: true };
const center: XlsxStyle = { align: 'center', vAlign: 'center', border: true };
const num: XlsxStyle = { align: 'right', vAlign: 'center', numFmt: NUM, border: true };
const rate: XlsxStyle = { align: 'right', vAlign: 'center', numFmt: RATE, border: true };
const date: XlsxStyle = { align: 'center', vAlign: 'center', numFmt: DATE, border: true };
const totalLabel: XlsxStyle = { bold: true, align: 'center', vAlign: 'center', fill: TOTAL_FILL, border: true };
const totalNum: XlsxStyle = { ...num, bold: true, fill: TOTAL_FILL };

const HEADERS = [
  'STT', 'Số KUNN', 'Hình thức vay', 'Dư nợ gốc (VND)', 'Lãi suất (%/năm)', 'Ngày giải ngân',
  'Ngày trả lãi gần nhất', 'Ngày tất toán', 'Số ngày tính lãi', 'Lãi dồn tích', 'Phí trả trước (%)',
  'Phí trả trước', 'Tổng tất toán',
];
const WIDTHS = [6, 20, 24, 18, 12, 14, 14, 14, 11, 16, 12, 16, 18];

export function excelDateSerial(value: string): number | null {
  const iso = toIsoDate(value);
  const p = iso ? parseAnyDate(iso) : null;
  if (!p) return null;
  return Math.round((Date.UTC(p.year, p.month - 1, p.day) - Date.UTC(1899, 11, 30)) / 86400000);
}

const dateCell = (value: string): XlsxCell => {
  const serial = excelDateSerial(value);
  return serial === null ? { value: '', style: date } : { value: serial, numeric: true, style: date };
};

export function buildSettlementEstimateSheet(rows: EstimateExportRow[]): XlsxSheet {
  const ready = rows.filter(r => r.line.error === null);
  if (ready.length === 0) throw new Error('Chưa có khoản nào đủ dữ liệu để xuất.');

  const out: XlsxCell[][] = [HEADERS.map(h => ({ value: h, style: head }))];
  ready.forEach((r, i) => {
    const n = i + 2;
    out.push([
      { value: i + 1, numeric: true, style: center },
      { value: r.contractNumber || '', style: center },
      { value: r.loanMethod, style: text },
      { value: r.line.principal, numeric: true, style: num },
      { value: r.rateAnnualPercent, numeric: true, style: rate },
      dateCell(r.disbursementDate),
      dateCell(r.interestFromDate),
      dateCell(r.settlementDate),
      { value: r.line.accruedDays, numeric: true, formula: `H${n}-IF(G${n}="",F${n},G${n})`, style: center },
      { value: r.line.accruedInterest, numeric: true, formula: `ROUND(D${n}*E${n}/100*I${n}/365,0)`, style: num },
      { value: r.line.penaltyPercent, numeric: true, style: rate },
      { value: r.line.penaltyFee, numeric: true, formula: `ROUND(D${n}*K${n}/100,0)`, style: num },
      { value: r.line.total, numeric: true, formula: `D${n}+J${n}+L${n}`, style: { ...num, bold: true } },
    ]);
  });

  const last = ready.length + 1;
  const t = last + 1;
  const sum = (col: string, value: number): XlsxCell =>
    ({ value, numeric: true, formula: `SUM(${col}2:${col}${last})`, style: totalNum });
  const totals = ready.reduce(
    (acc, r) => ({
      principal: acc.principal + r.line.principal,
      interest: acc.interest + r.line.accruedInterest,
      fee: acc.fee + r.line.penaltyFee,
      total: acc.total + r.line.total,
    }),
    { principal: 0, interest: 0, fee: 0, total: 0 },
  );
  out.push([
    { value: 'TỔNG CỘNG', style: totalLabel },
    { value: '', style: totalLabel },
    { value: '', style: totalLabel },
    sum('D', totals.principal),
    ...['E', 'F', 'G', 'H', 'I'].map(() => ({ value: '', style: totalLabel })),
    sum('J', totals.interest),
    { value: '', style: totalLabel },
    sum('L', totals.fee),
    sum('M', totals.total),
  ]);

  return {
    name: 'Uoc_Tinh_Tat_Toan',
    rows: out,
    colWidths: WIDTHS,
    merges: [`A${t}:C${t}`],
    freeze: { rows: 1, cols: 0 },
  };
}

export function exportSettlementEstimateExcel(rows: EstimateExportRow[], today: string): void {
  const bytes = buildXlsx(buildSettlementEstimateSheet(rows));
  downloadBytes(bytes, `Uoc_Tinh_Tat_Toan_${today}.xlsx`, MIME_XLSX);
}
