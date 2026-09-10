import { buildXlsx, MIME_XLSX, type XlsxCell, type XlsxSheet, type XlsxStyle } from './xlsxWriter';
import { downloadBytes } from './xlsExport';

export interface Bm12LoanRow {
  stt?: number | string;
  customerName?: string;
  cif?: string;
  tkv?: string;
  fromDate: string; // YYYY-MM-DD
  toDate: string;   // YYYY-MM-DD
  days?: number;
  balance: number;  // Dư nợ
  interestRateAnnual: number; // 0.1525 = 15.25%
  interest?: number;
  penalty?: number;
  note?: string;
}

export interface Bm12ExportOptions {
  filename?: string;
  headerDocNo?: string; // Mặc định BM12_.............../2026/TB-TGĐ_Bản tính thu nợ CCSTK
  customerName?: string;
  cif?: string;
  tkv?: string;
  loans: Bm12LoanRow[];
}

/**
 * Chuyển ngày YYYY-MM-DD sang Excel serial number (gốc 1899-12-30)
 */
export function dateToExcelSerial(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return 0;
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const d = parseInt(parts[2], 10);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return 0;

  const base = Date.UTC(1899, 11, 30);
  const target = Date.UTC(y, m - 1, d);
  return Math.round((target - base) / 86400000);
}

const STYLE_TITLE: XlsxStyle = {
  bold: true,
  align: 'center',
  vAlign: 'center',
  border: false,
};

const STYLE_HEADER: XlsxStyle = {
  bold: true,
  align: 'center',
  vAlign: 'center',
  wrap: true,
  border: true,
};

const STYLE_TEXT_CENTER: XlsxStyle = {
  align: 'center',
  vAlign: 'center',
  border: true,
};

const STYLE_TEXT_LEFT: XlsxStyle = {
  align: 'left',
  vAlign: 'center',
  border: true,
};

const STYLE_DATE: XlsxStyle = {
  align: 'center',
  vAlign: 'center',
  numFmt: 'd/m/yy',
  border: true,
};

const STYLE_NUM_DAYS: XlsxStyle = {
  align: 'center',
  vAlign: 'center',
  border: true,
};

const STYLE_CURRENCY: XlsxStyle = {
  align: 'right',
  vAlign: 'center',
  numFmt: '#,##0',
  border: true,
};

const STYLE_RATE: XlsxStyle = {
  align: 'right',
  vAlign: 'center',
  numFmt: '0.00%',
  border: true,
};

const STYLE_PENALTY: XlsxStyle = {
  align: 'right',
  vAlign: 'center',
  numFmt: '#,##0;(#,##0);"-"',
  border: true,
};

const STYLE_TOTAL_LABEL: XlsxStyle = {
  bold: true,
  align: 'left',
  vAlign: 'center',
  border: true,
};

const STYLE_TOTAL_CURRENCY: XlsxStyle = {
  bold: true,
  align: 'right',
  vAlign: 'center',
  numFmt: '#,##0',
  border: true,
};

const STYLE_TOTAL_PENALTY: XlsxStyle = {
  bold: true,
  align: 'right',
  vAlign: 'center',
  numFmt: '#,##0;(#,##0);"-"',
  border: true,
};

const STYLE_SIG_TITLE: XlsxStyle = {
  bold: true,
  align: 'center',
  vAlign: 'center',
  wrap: true,
  border: false,
};

const STYLE_NOTE: XlsxStyle = {
  italic: true,
  align: 'left',
  vAlign: 'top',
  wrap: true,
  border: false,
};

export function buildBm12Xlsx(opts: Bm12ExportOptions): Uint8Array {
  const rows: XlsxCell[][] = [];
  const merges: string[] = [];

  // Chuẩn hóa danh sách khoản vay
  const loanRows = opts.loans.length > 0 ? opts.loans : [
    {
      stt: 1,
      customerName: opts.customerName || '',
      cif: opts.cif || '',
      tkv: opts.tkv || '',
      fromDate: '2026-05-20',
      toDate: '2026-11-20',
      balance: 0,
      interestRateAnnual: 0.09,
    },
  ];

  // Dòng 1 (r = 1): Mã biểu mẫu
  rows.push([
    {
      value: opts.headerDocNo || 'BM12_.............../2026/TB-TGĐ_Bản tính thu nợ CCSTK',
      style: { italic: true, border: false },
    },
  ]);

  // Dòng 2 (r = 2): Tiêu đề bảng tính (gộp A2:K2)
  rows.push([
    {
      value: 'BẢNG TÍNH THU NỢ KHOẢN VAY CCSTK',
      style: STYLE_TITLE,
    },
  ]);
  merges.push('A2:K2');

  // Dòng 3 (r = 3): Đơn vị tính (L3)
  const row3: XlsxCell[] = Array.from({ length: 11 }, () => ({ value: '', style: { border: false } }));
  row3.push({
    value: 'ĐVT: VND',
    style: { italic: true, align: 'right', border: false },
  });
  rows.push(row3);

  // Dòng 4 (r = 4): Tiêu đề cột
  rows.push([
    { value: 'STT', style: STYLE_HEADER },
    { value: 'TÊN KHÁCH HÀNG', style: STYLE_HEADER },
    { value: 'MÃ KH', style: STYLE_HEADER },
    { value: 'TKV', style: STYLE_HEADER },
    { value: 'Từ ngày', style: STYLE_HEADER },
    { value: 'Đến ngày\r\n(Ngày trả nợ)', style: STYLE_HEADER },
    { value: 'Số ngày', style: STYLE_HEADER },
    { value: 'Dư nợ', style: STYLE_HEADER },
    { value: 'Lãi suất \r\n(%/năm)', style: STYLE_HEADER },
    { value: 'Lãi', style: STYLE_HEADER },
    { value: 'Phạt', style: STYLE_HEADER },
    { value: 'Ghi chú', style: STYLE_HEADER },
  ]);

  const startDataRow = 5;
  const numLoans = loanRows.length;

  loanRows.forEach((loan, idx) => {
    const r = startDataRow + idx;
    const fromSerial = dateToExcelSerial(loan.fromDate);
    const toSerial = dateToExcelSerial(loan.toDate);
    const calculatedDays = loan.days ?? Math.max(0, toSerial - fromSerial);
    const calculatedInterest = loan.interest ?? Math.round((loan.balance * loan.interestRateAnnual * calculatedDays) / 365);
    const penalty = loan.penalty || 0;

    rows.push([
      { value: loan.stt ?? (idx + 1), numeric: typeof (loan.stt ?? (idx + 1)) === 'number', style: STYLE_TEXT_CENTER },
      { value: (loan.customerName || opts.customerName || '').toUpperCase(), style: STYLE_TEXT_LEFT },
      { value: loan.cif || opts.cif || '', style: STYLE_TEXT_CENTER },
      { value: loan.tkv || opts.tkv || '', style: STYLE_TEXT_CENTER },
      { value: fromSerial, numeric: true, style: STYLE_DATE },
      { value: toSerial, numeric: true, style: STYLE_DATE },
      { value: calculatedDays, numeric: true, formula: `F${r}-E${r}`, style: STYLE_NUM_DAYS },
      { value: loan.balance, numeric: true, style: STYLE_CURRENCY },
      { value: loan.interestRateAnnual, numeric: true, style: STYLE_RATE },
      { value: calculatedInterest, numeric: true, formula: `H${r}*I${r}/365*G${r}`, style: STYLE_CURRENCY },
      { value: penalty, numeric: true, style: STYLE_PENALTY },
      { value: loan.note || '', style: STYLE_TEXT_LEFT },
    ]);
  });

  const lastDataRow = startDataRow + numLoans - 1;
  const totalRowIndex = lastDataRow + 1;

  // Dòng Tổng (r = totalRowIndex): Gộp A..C, tính tổng Dư nợ, Lãi, Phạt
  const totalBalanceFormula = numLoans === 1 ? `H${startDataRow}` : `SUM(H${startDataRow}:H${lastDataRow})`;
  const totalInterestFormula = numLoans === 1 ? `J${startDataRow}` : `SUM(J${startDataRow}:J${lastDataRow})`;
  const totalPenaltyFormula = numLoans === 1 ? `K${startDataRow}` : `SUM(K${startDataRow}:K${lastDataRow})`;

  const totalCalculatedBalance = loanRows.reduce((sum, l) => sum + l.balance, 0);
  const totalCalculatedInterest = loanRows.reduce((sum, l) => {
    const days = l.days ?? Math.max(0, dateToExcelSerial(l.toDate) - dateToExcelSerial(l.fromDate));
    return sum + (l.interest ?? Math.round((l.balance * l.interestRateAnnual * days) / 365));
  }, 0);
  const totalCalculatedPenalty = loanRows.reduce((sum, l) => sum + (l.penalty || 0), 0);

  rows.push([
    { value: 'Tổng', style: STYLE_TOTAL_LABEL },
    { value: '', style: STYLE_TOTAL_LABEL },
    { value: '', style: STYLE_TOTAL_LABEL },
    { value: '', style: { border: true } },
    { value: '', style: { border: true } },
    { value: '', style: { border: true } },
    { value: '', style: { border: true } },
    {
      value: totalCalculatedBalance,
      numeric: true,
      formula: totalBalanceFormula,
      style: STYLE_TOTAL_CURRENCY,
    },
    { value: '', style: { border: true } },
    {
      value: totalCalculatedInterest,
      numeric: true,
      formula: totalInterestFormula,
      style: STYLE_TOTAL_CURRENCY,
    },
    {
      value: totalCalculatedPenalty,
      numeric: true,
      formula: totalPenaltyFormula,
      style: STYLE_TOTAL_PENALTY,
    },
    { value: '', style: { border: true } },
  ]);
  merges.push(`A${totalRowIndex}:C${totalRowIndex}`);

  // Dòng Tổng gốc + lãi + phạt (r = totalRowIndex + 1): Gộp A..C và gộp H..K
  const grandTotalRowIndex = totalRowIndex + 1;
  const grandTotalFormula = `H${totalRowIndex}+J${totalRowIndex}+K${totalRowIndex}`;
  const grandTotalCalculated = totalCalculatedBalance + totalCalculatedInterest + totalCalculatedPenalty;

  rows.push([
    { value: 'Tổng gốc + lãi + phạt', style: STYLE_TOTAL_LABEL },
    { value: '', style: STYLE_TOTAL_LABEL },
    { value: '', style: STYLE_TOTAL_LABEL },
    { value: '', style: { border: true } },
    { value: '', style: { border: true } },
    { value: '', style: { border: true } },
    { value: '', style: { border: true } },
    {
      value: grandTotalCalculated,
      numeric: true,
      formula: grandTotalFormula,
      style: STYLE_TOTAL_CURRENCY,
    },
    { value: '', style: STYLE_TOTAL_CURRENCY },
    { value: '', style: STYLE_TOTAL_CURRENCY },
    { value: '', style: STYLE_TOTAL_CURRENCY },
    { value: '', style: { border: true } },
  ]);
  merges.push(`A${grandTotalRowIndex}:C${grandTotalRowIndex}`);
  merges.push(`H${grandTotalRowIndex}:K${grandTotalRowIndex}`);

  // Dòng trống cách quãng
  rows.push([]);

  // Dòng chữ ký (r = grandTotalRowIndex + 2)
  const sigRowIndex = grandTotalRowIndex + 2;
  const sigRow: XlsxCell[] = [
    { value: '', style: { border: false } },
    {
      value: 'LẬP BẢNG\r\n(Ký, ghi rõ họ tên và chức danh)',
      style: STYLE_SIG_TITLE,
    },
    { value: '', style: { border: false } },
    { value: '', style: { border: false } },
    { value: '', style: { border: false } },
    { value: '', style: { border: false } },
    {
      value: 'TRƯỞNG ĐƠN VỊ/NGƯỜI ĐƯỢC ỦY QUYỀN/PHÂN CÔNG\r\n(Ký, ghi rõ họ tên và chức danh)',
      style: STYLE_SIG_TITLE,
    },
    { value: '', style: { border: false } },
    { value: '', style: { border: false } },
    { value: '', style: { border: false } },
    { value: '', style: { border: false } },
    { value: '', style: { border: false } },
  ];
  rows.push(sigRow);
  merges.push(`B${sigRowIndex}:D${sigRowIndex}`);
  merges.push(`G${sigRowIndex}:K${sigRowIndex}`);

  // Thêm khoảng cách dòng cho chữ ký
  rows.push([]);
  rows.push([]);
  rows.push([]);

  // Dòng ghi chú chân bảng
  rows.push([
    {
      value: 'Ghi chú: ĐVKD thực hiện tính toán và hoàn tất bảng tính này căn cứ theo quy định sản phẩm, hồ sơ tín dụng, phê duyệt cấp tín dụng và các phê duyệt ngoại lệ khác (nếu có)',
      style: STYLE_NOTE,
    },
  ]);

  // Chiều rộng cột chuẩn hóa theo BM12 mẫu
  const colWidths = [
    6,  // A: STT
    25, // B: Tên khách hàng
    13, // C: Mã KH
    16, // D: TKV
    13, // E: Từ ngày
    16, // F: Đến ngày
    12, // G: Số ngày
    16, // H: Dư nợ
    13, // I: Lãi suất
    16, // J: Lãi
    12, // K: Phạt
    22, // L: Ghi chú
  ];

  const sheet: XlsxSheet = {
    name: 'Sheet1',
    rows,
    colWidths,
    merges,
  };

  return buildXlsx(sheet);
}

export function exportBm12ToExcel(opts: Bm12ExportOptions): void {
  const bytes = buildBm12Xlsx(opts);
  const safeName = (opts.customerName || 'KHACH_HANG')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .toUpperCase();
  const filename = opts.filename || `BM12_Bang_Tinh_Thu_No_CCSTK_${safeName}.xlsx`;
  downloadBytes(bytes, filename, MIME_XLSX);
}
