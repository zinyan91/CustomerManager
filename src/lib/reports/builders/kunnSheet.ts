import type { XlsxSheet } from '../../xlsxWriter';
import type { RepaymentSchedule } from '../../../types';
import { fmtDate } from '../../utils';
import { dueBucketOf, daysLeftOf, matchesBucket, DUE_BUCKET_LABELS, type DueBucketFilter } from '../dueBucket';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';
import { liveDebtGroup } from './dueSheet';
import type { ReportLoadContext } from '../types';

export interface KunnSheetRow {
  cif: string;
  customerName: string;
  kunnNumber: string;
  creditContractNumber: string | null;
  loanMethod: string | null;
  disbursementDate: string | null;
  kunnDueDate: string | null;
  loanAmount: number | null;
  outstanding: number | null;
  interestRate: number | null;
  storedDebtGroup?: number;
  overdueSchedules: RepaymentSchedule[];
}

const COT = [
  'STT', 'Mã CIF', 'Họ tên KH', 'Số KUNN', 'Số HĐTD gốc', 'Phương thức vay',
  'Ngày giải ngân', 'Ngày đáo hạn KUNN', 'Số ngày', 'Trạng thái',
  'Số tiền nhận nợ', 'Dư nợ hiện hữu', 'Lãi suất', 'Nhóm nợ',
];

export function buildKunnSheet(
  rows: KunnSheetRow[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): XlsxSheet {
  const loc = rows.filter(r => matchesBucket(dueBucketOf(r.kunnDueDate, ctx.todayIso), filter));

  const body = loc.map((r, i) => {
    const bucket = dueBucketOf(r.kunnDueDate, ctx.todayIso);
    return [
      numCell(i + 1),
      textCell(r.cif, ST.center),
      textCell(r.customerName),
      textCell(r.kunnNumber, ST.center),
      textCell(r.creditContractNumber, ST.center),
      textCell(r.loanMethod),
      textCell(r.disbursementDate ? fmtDate(r.disbursementDate) : '', ST.center),
      textCell(r.kunnDueDate ? fmtDate(r.kunnDueDate) : '', ST.center),
      numCell(daysLeftOf(r.kunnDueDate, ctx.todayIso)),
      textCell(DUE_BUCKET_LABELS[bucket], ST.center),
      moneyCell(r.loanAmount),
      moneyCell(r.outstanding),
      numCell(r.interestRate),
      numCell(liveDebtGroup(r.storedDebtGroup, r.overdueSchedules, ctx.todayIso)),
    ];
  });

  return {
    name: 'KUNN',
    rows: [headerRow(COT), ...body],
    colWidths: [5, 10, 26, 16, 16, 14, 13, 15, 9, 13, 16, 16, 9, 9],
  };
}
