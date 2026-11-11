import { buildMultiSheetXlsx, columnLetter, MIME_XLSX, type XlsxCell, type XlsxSheet, type XlsxStyle } from '../xlsxWriter';
import { downloadBytes } from '../xlsExport';
import { todayIso } from '../utils';
import type { CustomerPortfolioExportParams } from '../customerPortfolioExport';
import { reportRowHeights } from './sheetStyles';
import type { DebtGroupFilter } from './debtGroup';
import { TONE_XLSX_FILL } from './portfolioTone';
import {
  buildLoanPortfolioTables,
  PORTFOLIO_FROZEN_COLUMNS,
  type PortfolioCell,
  type PortfolioColKind,
  type PortfolioTable,
} from './loanPortfolioTables';

const NUM_FMT_ACCOUNTING = '#,##0;(#,##0);"-"';
const NUM_FMT_AMOUNT = '#,##0.00;(#,##0.00);"-"';
const HEADER_FILL = 'E2E8F0';
const TOTAL_FILL = 'CBD5E1';

const header = (align: XlsxStyle['align']): XlsxStyle =>
  ({ bold: true, align, vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true });

function headerStyle(kind: PortfolioColKind): XlsxStyle {
  if (kind === 'text') return header('left');
  if (kind === 'money' || kind === 'amount') return header('right');
  return header('center');
}

function bodyStyle(kind: PortfolioColKind): XlsxStyle {
  if (kind === 'money') return { align: 'right', vAlign: 'center', numFmt: NUM_FMT_ACCOUNTING, border: true };
  if (kind === 'amount') return { align: 'right', vAlign: 'center', numFmt: NUM_FMT_AMOUNT, border: true };
  if (kind === 'text') return { align: 'left', vAlign: 'center', border: true };
  return { align: 'center', vAlign: 'center', border: true };
}

function bodyCell(kind: PortfolioColKind, cell: PortfolioCell): XlsxCell {
  const base = bodyStyle(kind);
  const style = cell.tone ? { ...base, fill: TONE_XLSX_FILL[cell.tone] } : base;
  const numeric = kind === 'money' || kind === 'amount';
  return numeric ? { value: cell.value, numeric: true, style } : { value: cell.value, style };
}

export function portfolioTableSheet(table: PortfolioTable): XlsxSheet {
  const rows: XlsxCell[][] = [table.columns.map(c => ({ value: c.header, style: headerStyle(c.kind) }))];
  for (const row of table.rows) rows.push(row.map((cell, i) => bodyCell(table.columns[i].kind, cell)));

  const totalLabel: XlsxStyle = { bold: true, align: 'center', vAlign: 'center', fill: TOTAL_FILL, border: true };
  rows.push(table.columns.map((c, i) => {
    if (i === 0) return { value: 'TỔNG CỘNG', style: totalLabel };
    const total = table.totals[i];
    if (total === null) return { value: '', style: totalLabel };
    const numFmt = c.kind === 'amount' ? NUM_FMT_AMOUNT : NUM_FMT_ACCOUNTING;
    return { value: total, numeric: true, style: { ...totalLabel, align: 'right', numFmt } };
  }));

  const firstSum = table.columns.findIndex(c => c.sum);
  const mergeTo = firstSum > 1 ? firstSum : 1;
  return {
    name: table.sheetName,
    rows,
    colWidths: table.columns.map(c => c.width),
    merges: mergeTo > 1 ? [`A${rows.length}:${columnLetter(mergeTo - 1)}${rows.length}`] : [],
    rowHeights: reportRowHeights(rows.length),
    freeze: { rows: 1, cols: PORTFOLIO_FROZEN_COLUMNS },
  };
}

export function buildLoanPortfolioWorkbook(tables: PortfolioTable[]): Uint8Array {
  return buildMultiSheetXlsx(tables.map(portfolioTableSheet));
}

const FILE_SUFFIX: Record<DebtGroupFilter, string> = {
  all: '',
  group1: '_Nhom_1',
  group2to5: '_Nhom_2-5',
};

export function loanPortfolioFileName(today: string, filter: DebtGroupFilter): string {
  return `Danh_Muc_Dang_Vay${FILE_SUFFIX[filter]}_${today}.xlsx`;
}

export function exportLoanPortfolioExcel(params: CustomerPortfolioExportParams, filter: DebtGroupFilter): void {
  const today = params.todayStr || todayIso();
  const bytes = buildLoanPortfolioWorkbook(buildLoanPortfolioTables({ ...params, todayStr: today }, filter));
  downloadBytes(bytes, loanPortfolioFileName(today, filter), MIME_XLSX);
}
