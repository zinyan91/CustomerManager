import type { XlsxSheet } from '../../xlsxWriter';
import type { RepaymentSchedule } from '../../../types';
import { getAutoDebtGroupInfo } from '../../loanMath';
import { fmtDate } from '../../utils';
import { dueBucketOf, daysLeftOf, matchesBucket, dueStatusLabel, type DueBucketFilter } from '../dueBucket';
import { ST, headerRow, textCell, moneyCell, numCell, totalRow, sumOf } from '../sheetStyles';
import type { ReportLoadContext } from '../types';

export interface DueSheetRow {
  cif: string;
  customerName: string;
  kunnNumber: string;
  periodNumber: number | null;
  dueDate: string | null;
  principal: number | null;
  interest: number | null;
  total: number | null;
  outstanding: number | null;
  storedDebtGroup?: number;
  overdueSchedules: RepaymentSchedule[];
}

const COT = [
  'STT', 'Mã CIF', 'Họ tên KH', 'Số KUNN', 'Kỳ số', 'Ngày đến hạn',
  'Số ngày', 'Trạng thái', 'Gốc kỳ', 'Lãi kỳ', 'Tổng kỳ',
  'Dư nợ hiện hữu', 'Nhóm nợ',
];

export function liveDebtGroup(
  stored: number | undefined,
  overdueSchedules: RepaymentSchedule[],
  todayIso: string
): number {
  const tuTinh = getAutoDebtGroupInfo(overdueSchedules, todayIso).debtGroup;
  return Math.max(stored ?? 1, tuTinh);
}

export function buildDueSheet(
  rows: DueSheetRow[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): XlsxSheet {
  const loc = rows.filter(r => matchesBucket(dueBucketOf(r.dueDate, ctx.todayIso), filter));

  const body = loc.map((r, i) => {
    return [
      numCell(i + 1),
      textCell(r.cif, ST.center),
      textCell(r.customerName),
      textCell(r.kunnNumber, ST.center),
      numCell(r.periodNumber),
      textCell(r.dueDate ? fmtDate(r.dueDate) : '', ST.center),
      numCell(daysLeftOf(r.dueDate, ctx.todayIso)),
      textCell(dueStatusLabel(r.dueDate, ctx.todayIso), ST.center),
      moneyCell(r.principal),
      moneyCell(r.interest),
      moneyCell(r.total),
      moneyCell(r.outstanding),
      numCell(liveDebtGroup(r.storedDebtGroup, r.overdueSchedules, ctx.todayIso)),
    ];
  });

  return {
    name: 'No due',
    rows: [
      headerRow(COT),
      ...body,
      totalRow(COT.length, {
        8: sumOf(loc.map(r => r.principal)),
        9: sumOf(loc.map(r => r.interest)),
        10: sumOf(loc.map(r => r.total)),
      }),
    ],
    colWidths: [5, 10, 26, 16, 7, 13, 9, 13, 15, 13, 15, 16, 9],
  };
}
