import type { XlsxSheet } from '../../xlsxWriter';
import {
  buildActivePortfolioData,
  type CustomerPortfolioExportParams,
} from '../../customerPortfolioExport';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';
import type { ReportLoadContext } from '../types';

const COT = [
  'STT', 'Mã CIF KH', 'Họ tên KH', 'Phương thức vay', 'Số KUNN (GNN)',
  'Số HĐTD gốc', 'Tổng mức cấp (VNĐ)', 'Số tiền nhận nợ (VNĐ)',
  'Dư nợ hiện hữu (VNĐ)', 'Lãi suất (%/năm)',
];

export function buildPortfolioSheet(
  params: CustomerPortfolioExportParams,
  ctx: ReportLoadContext
): XlsxSheet {
  const data = buildActivePortfolioData({ ...params, todayStr: ctx.todayIso });

  const body = data.map((r, i) => [
    numCell(i + 1),
    textCell(r.customer.CifKh, ST.center),
    textCell(r.customer.FullName),
    textCell(r.kunn.LoanMethod),
    textCell(r.kunn.ContractNumber, ST.center),
    textCell(r.masterHdtdNumber, ST.center),
    moneyCell(r.grantedLimit),
    moneyCell(r.principalAmount),
    moneyCell(r.currentBalance),
    numCell(r.interestRatePercent),
  ]);

  return {
    name: 'Danh muc dang vay',
    rows: [headerRow(COT), ...body],
    colWidths: [5, 12, 26, 14, 16, 16, 18, 18, 18, 11],
  };
}
