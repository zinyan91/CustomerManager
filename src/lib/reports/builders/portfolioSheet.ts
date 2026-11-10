import type { XlsxSheet } from '../../xlsxWriter';
import {
  buildActivePortfolioData,
  type CustomerPortfolioExportParams,
} from '../../customerPortfolioExport';
import { ST, headerRow, textCell, moneyCell, numCell, totalRow, totalMerges, reportRowHeights, sumOf } from '../sheetStyles';
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

  const sums = {
    7: sumOf(data.map(r => r.principalAmount)),
    8: sumOf(data.map(r => r.currentBalance)),
  };
  const sheetRows = [
    headerRow(COT),
    ...body,
    totalRow(COT.length, sums),
  ];

  return {
    name: 'Danh muc dang vay',
    rows: sheetRows,
    colWidths: [6, 14, 28, 18, 20, 20, 20, 20, 20, 14],
    merges: totalMerges(sheetRows.length, sums),
    rowHeights: reportRowHeights(sheetRows.length),
  };
}
