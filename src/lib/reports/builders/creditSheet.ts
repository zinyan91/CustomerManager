import type { XlsxSheet } from '../../xlsxWriter';
import { fmtDate } from '../../utils';
import { dueBucketOf, daysLeftOf, matchesBucket, DUE_BUCKET_LABELS, type DueBucketFilter } from '../dueBucket';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';
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
    const bucket = dueBucketOf(r.endDate, ctx.todayIso);
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
      textCell(DUE_BUCKET_LABELS[bucket], ST.center),
      moneyCell(r.granted),
      moneyCell(r.used),
      moneyCell(r.available),
    ];
  });

  return {
    name: 'HDTD',
    rows: [headerRow(COT), ...body],
    colWidths: [5, 10, 26, 16, 14, 14, 13, 15, 9, 13, 16, 16, 16],
  };
}
