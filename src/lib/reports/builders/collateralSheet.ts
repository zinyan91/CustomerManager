import type { XlsxSheet } from '../../xlsxWriter';
import { fmtDate } from '../../utils';
import { dueBucketOf, daysLeftOf, matchesBucket, DUE_BUCKET_LABELS, type DueBucketFilter } from '../dueBucket';
import { ST, headerRow, textCell, moneyCell, numCell } from '../sheetStyles';
import type { ReportLoadContext } from '../types';

export interface CollateralSheetRow {
  cif: string;
  customerName: string;
  assetCode: string | null;
  assetType: string | null;
  address: string | null;
  appraisalDate: string | null;
  tenorMonths: number | null;
  expiryDate: string | null;
  appraisedValue: number | null;
  ltvPercent: number | null;
  maxLoan: number | null;
}

const COT = [
  'STT', 'Mã CIF', 'Họ tên KH', 'Mã tài sản', 'Loại tài sản', 'Địa chỉ',
  'Ngày định giá', 'Hiệu lực (tháng)', 'Ngày hết hiệu lực', 'Số ngày',
  'Trạng thái', 'Giá trị định giá', 'LTV (%)', 'Hạn mức tối đa',
];

export function buildCollateralSheet(
  rows: CollateralSheetRow[],
  filter: DueBucketFilter,
  ctx: ReportLoadContext
): XlsxSheet {
  const loc = rows.filter(r => matchesBucket(dueBucketOf(r.expiryDate, ctx.todayIso), filter));

  const body = loc.map((r, i) => {
    const bucket = dueBucketOf(r.expiryDate, ctx.todayIso);
    return [
      numCell(i + 1),
      textCell(r.cif, ST.center),
      textCell(r.customerName),
      textCell(r.assetCode, ST.center),
      textCell(r.assetType),
      textCell(r.address),
      textCell(r.appraisalDate ? fmtDate(r.appraisalDate) : '', ST.center),
      numCell(r.tenorMonths),
      textCell(r.expiryDate ? fmtDate(r.expiryDate) : '', ST.center),
      numCell(daysLeftOf(r.expiryDate, ctx.todayIso)),
      textCell(DUE_BUCKET_LABELS[bucket], ST.center),
      moneyCell(r.appraisedValue),
      numCell(r.ltvPercent),
      moneyCell(r.maxLoan),
    ];
  });

  return {
    name: 'Tai san bao dam',
    rows: [headerRow(COT), ...body],
    colWidths: [5, 10, 26, 14, 18, 30, 13, 13, 15, 9, 13, 18, 9, 18],
  };
}
