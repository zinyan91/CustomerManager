import type { XlsxSheet } from '../../xlsxWriter';
import { fmtDate } from '../../utils';
import { dueBucketOf, daysLeftOf, matchesBucket, dueStatusLabel, type DueBucketFilter } from '../dueBucket';
import { ST, headerRow, textCell, moneyCell, numCell, totalRow, sumOf } from '../sheetStyles';
import type { ReportLoadContext } from '../types';

export interface CreditSheetRow {
  cif: string;
  customerName: string;
  hdtdNumber: string;
  approvalCode: string | null;
  loanMethod: string | null;
  startDate: string | null;
  endDate: string | null;
  granted: number | null;
  used: number | null;
  available: number | null;
}

const COT = [
  'STT', 'Mã CIF', 'Họ tên KH', 'Số HĐTD', 'Mã phê duyệt', 'Phương thức vay',
  'Ngày hiệu lực', 'Ngày hết hiệu lực', 'Số ngày', 'Trạng thái',
  'Mức cấp', 'Đã sử dụng', 'Còn khả dụng',
];

export function buildCreditSheet(
  rows: CreditSheetRow[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): XlsxSheet {
  const loc = rows.filter(r => matchesBucket(dueBucketOf(r.endDate, ctx.todayIso), filter));

  const body = loc.map((r, i) => {
    return [
      numCell(i + 1),
      textCell(r.cif, ST.center),
      textCell(r.customerName),
      textCell(r.hdtdNumber, ST.center),
      textCell(r.approvalCode, ST.center),
      textCell(r.loanMethod),
      textCell(r.startDate ? fmtDate(r.startDate) : '', ST.center),
      textCell(r.endDate ? fmtDate(r.endDate) : '', ST.center),
      numCell(daysLeftOf(r.endDate, ctx.todayIso)),
      textCell(dueStatusLabel(r.endDate, ctx.todayIso), ST.center),
      moneyCell(r.granted),
      moneyCell(r.used),
      moneyCell(r.available),
    ];
  });

  return {
    name: 'HDTD',
    rows: [
      headerRow(COT),
      ...body,
      totalRow(COT.length, {
        10: sumOf(loc.map(r => r.granted)),
        11: sumOf(loc.map(r => r.used)),
        12: sumOf(loc.map(r => r.available)),
      }),
    ],
    colWidths: [5, 10, 26, 16, 14, 14, 13, 15, 9, 13, 16, 16, 16],
  };
}
