import { buildXlsx, MIME_XLSX, type XlsxCell, type XlsxSheet } from './xlsxWriter';
import { downloadBytes } from './xlsExport';
import { fmtDate, fmtMoney } from './utils';
import { roundPrincipalCore } from './loanMath';
import { annuityInstallment, REPAY_METHOD_LABEL } from './calcMath';
import type { LoanScheduleRow, PrepaymentPlanItem, PrincipalRepayMethod } from './calcMath';

const PRINCIPAL_STEP_VND = 10000;
const INSTALLMENT_STEP_VND = 1000;

export interface ExportScheduleFormulaOptions {
  filename?: string;
  title?: string;
  loanAmount: number;
  tenorMonths: number;
  annualRate: number;
  promoMonths: number;
  baseRateAnnual: number;
  marginAnnual: number;
  postPromoRate: number;
  postPromoRateFixed: boolean;
  principalGraceMonths: number;
  repayMethod: PrincipalRepayMethod;
  disbursementDateStr: string;
  firstPaymentDateStr: string;
  prepayments: PrepaymentPlanItem[];
  scheduleRows: LoanScheduleRow[];
}

function clampGraceMonths(graceMonths: number, tenorMonths: number): number {
  if (!Number.isFinite(graceMonths)) return 0;
  return Math.max(0, Math.min(tenorMonths - 1, Math.trunc(graceMonths)));
}

function stepPrincipalPerRow(opts: ExportScheduleFormulaOptions): number[] {
  if (opts.repayMethod === 'bullet') return opts.scheduleRows.map(() => 0);

  const isAnnuity = opts.repayMethod === 'equal_installment';
  const grace = isAnnuity ? 0 : clampGraceMonths(opts.principalGraceMonths, opts.tenorMonths);
  const modeByPeriod = new Map(opts.prepayments.map(p => [Math.trunc(p.period), p.mode]));

  let step = isAnnuity
    ? annuityInstallment(opts.loanAmount, opts.annualRate, opts.tenorMonths)
    : roundPrincipalCore(opts.loanAmount / Math.max(1, opts.tenorMonths - grace));

  return opts.scheduleRows.map(r => {
    const current = step;
    if (r.prepayment > 0 && modeByPeriod.get(r.period) === 'reduce_monthly') {
      const remaining = opts.tenorMonths - Math.max(r.period, grace);
      if (remaining > 0 && r.endingBalance > 0) {
        step = isAnnuity
          ? annuityInstallment(r.endingBalance, opts.annualRate, remaining)
          : roundPrincipalCore(r.endingBalance / remaining);
      }
    }
    return current;
  });
}

export function buildScheduleWithFormulasXlsx(opts: ExportScheduleFormulaOptions): Uint8Array {
  const HEADER_FILL = 'DCE6F1';
  const PARAM_LABEL_FILL = 'F1F5F9';
  const FOOTER_FILL = 'E0F2FE';

  const title = opts.title || 'BẢNG LỊCH THU NỢ KHOẢN VAY (CÔNG THỨC ĐỘNG)';
  const isBullet = opts.repayMethod === 'bullet';
  const isAnnuity = opts.repayMethod === 'equal_installment';
  const grace = isAnnuity ? 0 : clampGraceMonths(opts.principalGraceMonths, opts.tenorMonths);
  const steps = stepPrincipalPerRow(opts);
  const modeByPeriod = new Map(opts.prepayments.map(p => [Math.trunc(p.period), p.mode]));

  const labelStyle = { bold: true, fill: PARAM_LABEL_FILL, align: 'left' as const };
  const moneyStyle = { numFmt: '#,##0', bold: true, align: 'right' as const };
  const rateStyle = { numFmt: '0.00', bold: true, align: 'right' as const };
  const countStyle = { bold: true, align: 'center' as const };
  const textStyle = { align: 'left' as const };

  const rows: XlsxCell[][] = [];

  rows.push([
    { value: title, style: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL } },
  ]);
  rows.push([]);

  rows.push([
    { value: 'Số tiền vay (VNĐ):', style: labelStyle },
    { value: opts.loanAmount, numeric: true, style: moneyStyle },
    { value: 'Thời hạn vay (tháng):', style: labelStyle },
    { value: opts.tenorMonths, numeric: true, style: countStyle },
  ]);

  const promoMonths = isAnnuity ? 0 : opts.promoMonths;

  rows.push([
    { value: promoMonths > 0 ? 'Lãi suất ưu đãi (%/năm):' : 'Lãi suất áp dụng (%/năm):', style: labelStyle },
    { value: opts.annualRate, numeric: true, style: rateStyle },
    { value: 'Số tháng ưu đãi:', style: labelStyle },
    { value: promoMonths, numeric: true, style: countStyle },
  ]);

  rows.push([
    { value: 'Lãi suất cơ sở (%/năm):', style: labelStyle },
    { value: isAnnuity ? opts.annualRate : opts.baseRateAnnual, numeric: true, style: rateStyle },
    { value: 'Biên độ (%/năm):', style: labelStyle },
    { value: isAnnuity ? 0 : opts.marginAnnual, numeric: true, style: rateStyle },
  ]);

  rows.push([
    { value: 'Lãi suất sau ưu đãi (%/năm):', style: labelStyle },
    opts.postPromoRateFixed || isAnnuity
      ? { value: isAnnuity ? opts.annualRate : opts.postPromoRate, numeric: true, style: rateStyle }
      : { value: opts.postPromoRate, numeric: true, formula: '=$B$5+$D$5', style: rateStyle },
    { value: 'Ân hạn gốc (tháng):', style: labelStyle },
    { value: grace, numeric: true, style: countStyle },
  ]);

  rows.push([
    { value: 'Ngày giải ngân:', style: labelStyle },
    { value: fmtDate(opts.disbursementDateStr), style: textStyle },
    { value: 'Ngày bắt đầu trả nợ:', style: labelStyle },
    { value: fmtDate(opts.firstPaymentDateStr), style: textStyle },
  ]);

  const stepLabel = isAnnuity ? 'Số tiền trả đều mỗi kỳ (VNĐ):' : 'Mức gốc đều mỗi kỳ (VNĐ):';
  const stepAnchorFormula = isAnnuity
    ? `=IF($D$3<=0, 0, CEILING(PMT($B$4/100/12, $D$3, -$B$3), ${INSTALLMENT_STEP_VND}))`
    : `=IF($D$3-$D$6<=0, 0, CEILING($B$3/($D$3-$D$6), ${PRINCIPAL_STEP_VND}))`;

  rows.push([
    { value: 'Phương thức trả gốc:', style: labelStyle },
    { value: REPAY_METHOD_LABEL[opts.repayMethod], style: textStyle },
    { value: stepLabel, style: labelStyle },
    isBullet
      ? { value: 0, numeric: true, style: moneyStyle }
      : {
        value: steps.length > 0 ? steps[0] : 0,
        numeric: true,
        formula: stepAnchorFormula,
        style: moneyStyle,
      },
  ]);

  const prepaymentSummary = opts.prepayments.length > 0
    ? opts.prepayments
      .map(p => `Kỳ ${p.period}: ${fmtMoney(p.amount)}`
        + (p.mode === 'reduce_monthly' ? ' (giảm gốc kỳ)' : ' (giảm thời hạn)'))
      .join('; ')
    : 'Không có';
  rows.push([
    { value: 'Trả nợ trước hạn:', style: labelStyle },
    { value: prepaymentSummary, style: textStyle },
  ]);

  rows.push([]);

  const headers = [
    'KỲ',
    'NGÀY BẮT ĐẦU',
    'NGÀY ĐẾN HẠN',
    'SỐ NGÀY',
    'LS ÁP DỤNG (%/năm)',
    'DƯ NỢ ĐẦU KỲ (VNĐ)',
    isAnnuity ? 'SỐ TIỀN TRẢ ĐỀU ÁP DỤNG (VNĐ)' : 'MỨC GỐC ĐỀU ÁP DỤNG (VNĐ)',
    'GỐC THEO LỊCH (VNĐ)',
    'TRẢ TRƯỚC HẠN (VNĐ)',
    'TỔNG GỐC TRẢ (VNĐ)',
    'LÃI THƯỜNG (VNĐ)',
    'TỔNG TRẢ TRONG KỲ (VNĐ)',
    'DƯ NỢ CUỐI KỲ (VNĐ)',
  ];

  rows.push(
    headers.map(h => ({
      value: h,
      style: { bold: true, align: 'center', vAlign: 'center', wrap: true, fill: HEADER_FILL },
    }))
  );

  const startRowIdx = rows.length + 1;
  const numRows = opts.scheduleRows.length;

  opts.scheduleRows.forEach((r, idx) => {
    const n = startRowIdx + idx;
    const prev = n - 1;
    const isFirst = idx === 0;

    const rateFormula = isAnnuity ? '=$B$4' : `=IF($D$4>0, IF(A${n}<=$D$4, $B$4, $B$6), $B$4)`;
    const beginningFormula = isFirst ? '=$B$3' : `=M${prev}`;

    let stepFormula: string;
    if (isFirst) {
      stepFormula = '=$D$8';
    } else if (modeByPeriod.get(opts.scheduleRows[idx - 1].period) !== 'reduce_monthly') {
      stepFormula = `=G${prev}`;
    } else if (isAnnuity) {
      stepFormula = `=IF(AND(I${prev}>0, M${prev}>0, $D$3-A${prev}>0),`
        + ` CEILING(PMT($B$4/100/12, $D$3-A${prev}, -M${prev}), ${INSTALLMENT_STEP_VND}), G${prev})`;
    } else {
      stepFormula = `=IF(AND(I${prev}>0, M${prev}>0, $D$3-MAX(A${prev},$D$6)>0),`
        + ` CEILING(M${prev}/($D$3-MAX(A${prev},$D$6)), ${PRINCIPAL_STEP_VND}), G${prev})`;
    }

    let scheduledFormula: string;
    if (isBullet) {
      scheduledFormula = `=IF(A${n}=$D$3, F${n}, 0)`;
    } else if (isAnnuity) {
      scheduledFormula = `=IF(A${n}=$D$3, F${n}, MIN(F${n}, MAX(0, G${n}-K${n})))`;
    } else {
      scheduledFormula = `=IF(A${n}<=$D$6, 0, IF(A${n}=$D$3, F${n}, MIN(F${n}, G${n})))`;
    }

    const totalPrincipalFormula = `=MIN(F${n}, H${n}+I${n})`;
    const interestFormula = isAnnuity
      ? `=ROUND(F${n}*(E${n}/100)/12, 0)`
      : `=ROUND(F${n}*(E${n}/100)*(D${n}/365), 0)`;
    const totalPayFormula = `=J${n}+K${n}`;
    const endingFormula = `=MAX(0, F${n}-J${n})`;

    rows.push([
      { value: r.period, numeric: true, style: { align: 'center' } },
      { value: fmtDate(r.startDate), style: { align: 'center' } },
      { value: fmtDate(r.dueDate), style: { align: 'center' } },
      { value: r.days, numeric: true, style: { align: 'center' } },
      { value: r.rateAnnual, numeric: true, formula: rateFormula, style: { align: 'center', numFmt: '0.00' } },
      { value: r.beginningBalance, numeric: true, formula: beginningFormula, style: { align: 'right', numFmt: '#,##0' } },
      { value: steps[idx], numeric: true, formula: isBullet ? undefined : stepFormula, style: { align: 'right', numFmt: '#,##0' } },
      { value: r.scheduledPrincipal, numeric: true, formula: scheduledFormula, style: { align: 'right', numFmt: '#,##0' } },
      { value: r.prepayment, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: r.principal, numeric: true, formula: totalPrincipalFormula, style: { align: 'right', numFmt: '#,##0', bold: true } },
      { value: r.interest, numeric: true, formula: interestFormula, style: { align: 'right', numFmt: '#,##0', bold: true } },
      { value: r.totalPayment, numeric: true, formula: totalPayFormula, style: { align: 'right', numFmt: '#,##0', bold: true } },
      { value: r.endingBalance, numeric: true, formula: endingFormula, style: { align: 'right', numFmt: '#,##0' } },
    ]);
  });

  const endRowIdx = startRowIdx + numRows - 1;
  const sumCell = (col: string, total: number): XlsxCell => ({
    value: total,
    numeric: true,
    formula: `=SUM(${col}${startRowIdx}:${col}${endRowIdx})`,
    style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL },
  });
  const blankFooter: XlsxCell = { value: '', style: { fill: FOOTER_FILL } };
  const sumOf = (pick: (r: LoanScheduleRow) => number) => opts.scheduleRows.reduce((a, r) => a + pick(r), 0);

  rows.push([
    { value: 'TỔNG CỘNG LỊCH THU NỢ', style: { bold: true, align: 'center', fill: FOOTER_FILL } },
    blankFooter,
    blankFooter,
    blankFooter,
    blankFooter,
    blankFooter,
    blankFooter,
    sumCell('H', sumOf(r => r.scheduledPrincipal)),
    sumCell('I', sumOf(r => r.prepayment)),
    sumCell('J', sumOf(r => r.principal)),
    sumCell('K', sumOf(r => r.interest)),
    sumCell('L', sumOf(r => r.totalPayment)),
    blankFooter,
  ]);

  const merges = [
    'A1:M1',
    'B9:M9',
    `A${endRowIdx + 1}:G${endRowIdx + 1}`,
  ];

  const colWidths = [8, 14, 14, 10, 14, 20, 18, 18, 18, 20, 20, 22, 20];

  const sheet: XlsxSheet = {
    name: 'LichThuNo_CongThuc',
    rows,
    colWidths,
    merges,
  };

  return buildXlsx(sheet);
}

export function exportScheduleWithFormulas(opts: ExportScheduleFormulaOptions) {
  const bytes = buildScheduleWithFormulasXlsx(opts);
  const fname = opts.filename || `LICH_THU_NO_CONG_THUC_${opts.loanAmount.toLocaleString('vi-VN')}VND.xlsx`;
  downloadBytes(bytes, fname, MIME_XLSX);
}
