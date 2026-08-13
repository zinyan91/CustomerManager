import { buildXlsx, MIME_XLSX, type XlsxCell, type XlsxSheet } from './xlsxWriter';
import { downloadBytes } from './xlsExport';
import type { LoanScheduleRow } from './calcMath';

export interface ExportScheduleFormulaOptions {
  filename?: string;
  title?: string;
  loanAmount: number;
  tenorMonths: number;
  annualRate: number;
  repayMethod: 'equal_principal' | 'bullet';
  disbursementDateStr: string;
  scheduleRows: LoanScheduleRow[];
}

export function buildScheduleWithFormulasXlsx(opts: ExportScheduleFormulaOptions): Uint8Array {
  const HEADER_FILL = 'DCE6F1';
  const PARAM_LABEL_FILL = 'F1F5F9';
  const FOOTER_FILL = 'E0F2FE';

  const title = opts.title || 'BẢNG LỊCH THU NỢ KHOẢN VAY (CÔNG THỨC ĐỘNG)';
  const rows: XlsxCell[][] = [];

  // Row 1: Title
  rows.push([
    {
      value: title,
      style: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL },
    },
  ]);

  // Row 2: Empty
  rows.push([]);

  // Row 3: Loan Amount (B3) & Tenor (D3)
  rows.push([
    { value: 'Số tiền vay (VNĐ):', style: { bold: true, fill: PARAM_LABEL_FILL, align: 'left' } },
    { value: opts.loanAmount, numeric: true, style: { numFmt: '#,##0', bold: true } }, // Cell B3
    { value: 'Thời hạn vay (tháng):', style: { bold: true, fill: PARAM_LABEL_FILL, align: 'left' } },
    { value: opts.tenorMonths, numeric: true, style: { bold: true, align: 'center' } }, // Cell D3
  ]);

  // Row 4: Interest Rate (B4) & Repay Method (D4)
  rows.push([
    { value: 'Lãi suất (%/năm):', style: { bold: true, fill: PARAM_LABEL_FILL, align: 'left' } },
    { value: opts.annualRate, numeric: true, style: { numFmt: '0.00', bold: true } }, // Cell B4
    { value: 'Phương thức trả gốc:', style: { bold: true, fill: PARAM_LABEL_FILL, align: 'left' } },
    { value: opts.repayMethod === 'equal_principal' ? 'Gốc trả đều hàng tháng' : 'Gốc trả cuối kỳ (Bullet)', style: { align: 'left' } },
  ]);

  // Row 5: Disbursement Date (B5)
  rows.push([
    { value: 'Ngày giải ngân:', style: { bold: true, fill: PARAM_LABEL_FILL, align: 'left' } },
    { value: opts.disbursementDateStr, style: { align: 'left' } },
  ]);

  // Row 6 & 7: Empty
  rows.push([]);
  rows.push([]);

  // Row 8: Table Headers
  const headers = [
    'KỲ',
    'NGÀY BẮT ĐẦU',
    'NGÀY ĐẾN HẠN',
    'SỐ NGÀY',
    'LS ÁP DỤNG (%)',
    'DƯ NỢ ĐẦU KỲ (VNĐ)',
    'GỐC TRẢ (VNĐ)',
    'LÃI THƯỜNG (VNĐ)',
    'TỔNG TRẢ TRONG KỲ (VNĐ)',
    'DƯ NỢ CUỐI KỲ (VNĐ)',
  ];

  rows.push(
    headers.map(h => ({
      value: h,
      style: {
        bold: true,
        align: 'center',
        vAlign: 'center',
        wrap: true,
        fill: HEADER_FILL,
      },
    }))
  );

  // Table Data Rows start at Row 9
  const startRowIdx = 9;
  const numRows = opts.scheduleRows.length;

  opts.scheduleRows.forEach((r, idx) => {
    const rowNum = startRowIdx + idx; // 1-indexed row number in Excel
    const isFirst = idx === 0;

    // Formulas
    const beginningFormula = isFirst ? '=$B$3' : `=J${rowNum - 1}`;
    
    let principalFormula = '';
    if (opts.repayMethod === 'equal_principal') {
      principalFormula = `=ROUND($B$3/$D$3, 0)`;
    } else {
      principalFormula = `=IF(A${rowNum}=$D$3, F${rowNum}, 0)`;
    }

    // Prepayment handling
    if (r.prepayment > 0) {
      principalFormula = `${principalFormula}+${r.prepayment}`;
    }

    const interestFormula = `=ROUND(F${rowNum}*(E${rowNum}/100)*(D${rowNum}/365), 0)`;
    const totalPayFormula = `=G${rowNum}+H${rowNum}`;
    const endingFormula = `=MAX(0, F${rowNum}-G${rowNum})`;

    rows.push([
      // A: Period
      { value: r.period, numeric: true, style: { align: 'center' } },
      // B: Start Date
      { value: r.startDate, style: { align: 'center' } },
      // C: Due Date
      { value: r.dueDate, style: { align: 'center' } },
      // D: Days
      { value: r.days, numeric: true, style: { align: 'center' } },
      // E: Rate
      { value: r.rateAnnual, numeric: true, style: { align: 'center', numFmt: '0.00' } },
      // F: Beginning Balance
      { value: r.beginningBalance, numeric: true, formula: beginningFormula, style: { align: 'right', numFmt: '#,##0' } },
      // G: Principal
      { value: r.principal + (r.prepayment || 0), numeric: true, formula: principalFormula, style: { align: 'right', numFmt: '#,##0', bold: true } },
      // H: Interest
      { value: r.interest, numeric: true, formula: interestFormula, style: { align: 'right', numFmt: '#,##0', bold: true } },
      // I: Total Payment
      { value: r.totalPayment, numeric: true, formula: totalPayFormula, style: { align: 'right', numFmt: '#,##0', bold: true } },
      // J: Ending Balance
      { value: r.endingBalance, numeric: true, formula: endingFormula, style: { align: 'right', numFmt: '#,##0' } },
    ]);
  });

  // Footer Row
  const endRowIdx = startRowIdx + numRows - 1;
  rows.push([
    { value: 'TỔNG CỘNG LỊCH THU NỢ', style: { bold: true, align: 'center', fill: FOOTER_FILL } },
    { value: '', style: { fill: FOOTER_FILL } },
    { value: '', style: { fill: FOOTER_FILL } },
    { value: '', style: { fill: FOOTER_FILL } },
    { value: '', style: { fill: FOOTER_FILL } },
    { value: '', style: { fill: FOOTER_FILL } },
    { value: opts.scheduleRows.reduce((a, b) => a + b.principal + (b.prepayment || 0), 0), numeric: true, formula: `=SUM(G${startRowIdx}:G${endRowIdx})`, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: opts.scheduleRows.reduce((a, b) => a + b.interest, 0), numeric: true, formula: `=SUM(H${startRowIdx}:H${endRowIdx})`, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: opts.scheduleRows.reduce((a, b) => a + b.totalPayment, 0), numeric: true, formula: `=SUM(I${startRowIdx}:I${endRowIdx})`, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: '', style: { fill: FOOTER_FILL } },
  ]);

  const merges = [
    'A1:J1',
    `A${endRowIdx + 1}:F${endRowIdx + 1}`,
  ];

  const colWidths = [8, 14, 14, 10, 14, 20, 20, 20, 22, 20];

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
