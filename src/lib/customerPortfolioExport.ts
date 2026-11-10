import type { Customer, LoanContract, CreditContract, Collateral, PledgeBundle } from '../types';
import { pledgePortfolioRows } from './pledgePortfolio';
import { buildMultiSheetXlsx, columnLetter, type XlsxCell, type XlsxSheet, type XlsxStyle, MIME_XLSX } from './xlsxWriter';
import { buildDepositPortfolioData, type DepositRowData } from './depositPortfolio';
import { downloadBytes } from './xlsExport';
import { fmtDate, todayIso } from './utils';
import { kunnPrincipal, outstandingOf } from './loanMath';
import { getEffectiveActiveRate } from './rateResolution';
import { collateralValue, appraisalExpiryDate, assetClassLabel } from './collateralMath';
import { isKunnOfClosedHdtd, resolveMasterHdtdNumber } from './creditContract';
import { archivedCustomerIdSet, filterActiveCustomers, isCustomerArchived } from './customerStatus';
import { reportRowHeights } from './reports/sheetStyles';
import { diffDays } from './calcMath';
import {
  fetchCustomersAPI,
  fetchCollateralsAPI,
  fetchContractsAPI,
  fetchAllCreditContractsAPI,
  fetchPaidPrincipalForContractsAPI,
  fetchAllPledgeLoanBundlesAPI,
} from './api';

export interface CustomerPortfolioExportParams {
  customers: Customer[];
  contracts: LoanContract[];
  creditContracts: CreditContract[];
  collaterals: Collateral[];
  paidPrincipalMap?: Record<number, number>;
  todayStr?: string;
  pledge?: PledgeBundle;
}

export interface PortfolioKunnRowData {
  customer: Customer;
  kunn: LoanContract;
  creditContract: CreditContract | null;
  matchedCollaterals: Collateral[];
  masterHdtdNumber: string;
  grantedLimit: number;
  principalAmount: number;
  currentBalance: number;
  interestRatePercent: number;
  disbursementDate: string;
  kunnTenor: string;
  kunnDueDate: string;
  hdtdStartDate: string;
  hdtdTenor: string;
  hdtdEndDate: string;
}

const NUM_FMT_ACCOUNTING = '#,##0;(#,##0);"-"';
const HEADER_FILL = 'E2E8F0';
const TOTAL_FILL = 'CBD5E1';

const styleHeaderCenter: XlsxStyle = { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true };
const styleHeaderLeft: XlsxStyle = { bold: true, align: 'left', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true };
const styleHeaderRight: XlsxStyle = { bold: true, align: 'right', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true };

const styleCenter: XlsxStyle = { align: 'center', vAlign: 'center', border: true };
const styleLeft: XlsxStyle = { align: 'left', vAlign: 'center', border: true };
const styleNumRight: XlsxStyle = { align: 'right', vAlign: 'center', numFmt: NUM_FMT_ACCOUNTING, border: true };
const styleRateCenter: XlsxStyle = { align: 'center', vAlign: 'center', border: true };

const styleTotalLabel: XlsxStyle = { bold: true, align: 'center', vAlign: 'center', fill: TOTAL_FILL, border: true };
const styleTotalNum: XlsxStyle = { bold: true, align: 'right', vAlign: 'center', fill: TOTAL_FILL, numFmt: NUM_FMT_ACCOUNTING, border: true };

/**
 * Kiểm tra KUNN có đang lưu nợ hay không (loại bỏ hoàn toàn khoản vay đã tất toán hoặc dư nợ 0)
 */
export function isKunnActiveDebt(
  k: LoanContract,
  paidPrincipalMap?: Record<number, number>
): boolean {
  if (k.IsSettled === true) return false;
  const paid = paidPrincipalMap?.[k.Id];
  const balance = paid !== undefined ? outstandingOf(k, paid) : (k.CurrentBalance ?? kunnPrincipal(k));
  return balance > 0;
}

/**
 * Tìm HĐTD gốc tương ứng với KUNN
 */
export function findMatchedCreditContract(
  kunn: LoanContract,
  creditContracts: CreditContract[]
): CreditContract | null {
  if (kunn.CreditContractId) {
    const byId = creditContracts.find(cc => cc.Id === kunn.CreditContractId);
    if (byId) return byId;
  }
  const masterNo = resolveMasterHdtdNumber(kunn, creditContracts);
  if (masterNo) {
    const byNo = creditContracts.find(
      cc => cc.HdtdNumber.trim() === masterNo.trim() && cc.CustomerId === kunn.CustomerId
    );
    if (byNo) return byNo;
  }
  return null;
}

/**
 * Tìm TSBĐ thế chấp cho KUNN / HĐTD
 */
export function findMatchedCollaterals(
  kunn: LoanContract,
  creditContract: CreditContract | null,
  allCollaterals: Collateral[]
): Collateral[] {
  const customerCollaterals = allCollaterals.filter(c => c.CustomerId === kunn.CustomerId);
  if (customerCollaterals.length === 0) return [];

  // 1. Kiểm tra CollateralIds trên HĐTD
  const ccIds = (creditContract?.CollateralIds || '')
    .split(',')
    .map(x => parseInt(x.trim(), 10))
    .filter(x => !isNaN(x) && x > 0);
  if (ccIds.length > 0) {
    const matched = customerCollaterals.filter(c => ccIds.includes(c.Id));
    if (matched.length > 0) return matched;
  }

  // 2. Kiểm tra CollateralId / CollateralIds trên KUNN
  const kunnIds = (kunn.CollateralIds || '')
    .split(',')
    .map(x => parseInt(x.trim(), 10))
    .filter(x => !isNaN(x) && x > 0);
  if (kunn.CollateralId) kunnIds.push(kunn.CollateralId);

  if (kunnIds.length > 0) {
    const matched = customerCollaterals.filter(c => kunnIds.includes(c.Id));
    if (matched.length > 0) return matched;
  }

  // 3. Mặc định lấy toàn bộ TSBĐ của khách hàng đó
  return customerCollaterals;
}

/**
 * Lọc và tổng hợp danh sách các khách hàng đang có dư nợ (loại trừ đã tất toán)
 */
export function buildActivePortfolioData({
  customers,
  contracts,
  creditContracts,
  collaterals,
  paidPrincipalMap,
  pledge,
}: CustomerPortfolioExportParams): PortfolioKunnRowData[] {
  const result: PortfolioKunnRowData[] = [];
  const archivedIds = archivedCustomerIdSet(customers);
  const activeCustomers = filterActiveCustomers(customers);
  const customerMap = new Map<number, Customer>(activeCustomers.map(c => [c.Id, c]));

  // Lọc toàn bộ KUNN đang lưu nợ (trừ đã tất toán, HĐTD đã đóng, hoặc KH đã lưu trữ)
  const activeKunns = contracts.filter(
    k =>
      !archivedIds.has(k.CustomerId) &&
      !isCustomerArchived(k.customer) &&
      !isKunnOfClosedHdtd(k, creditContracts) &&
      isKunnActiveDebt(k, paidPrincipalMap)
  );

  for (const k of activeKunns) {
    const customer = customerMap.get(k.CustomerId);
    if (!customer) continue;

    const cc = findMatchedCreditContract(k, creditContracts);
    const matchedCols = findMatchedCollaterals(k, cc, collaterals);

    const masterHdtdNumber = cc?.HdtdNumber || resolveMasterHdtdNumber(k, creditContracts) || '—';
    const grantedLimit = cc?.ContractAmount ?? k.CreditLimitAmount ?? k.ContractAmount ?? kunnPrincipal(k);
    const principalAmount = kunnPrincipal(k);
    const paid = paidPrincipalMap?.[k.Id];
    const currentBalance = paid !== undefined ? outstandingOf(k, paid) : (k.CurrentBalance ?? principalAmount);
    const interestRatePercent = Number((getEffectiveActiveRate(k) * 100).toFixed(2));

    const disbursementDate = k.DisbursementDate || k.ContractStartDate || '—';
    const kunnTenor = k.KunnTenor || (k.LoanTenorMonths ? `${k.LoanTenorMonths} tháng` : '—');
    const kunnDueDate = k.KunnDueDate || k.ContractEndDate || '—';

    const hdtdStartDate = cc?.ContractStartDate || '—';
    const hdtdTenor = cc?.LoanTenorMonths ? `${cc.LoanTenorMonths} tháng` : '—';
    const hdtdEndDate = cc?.ContractEndDate || '—';

    result.push({
      customer,
      kunn: k,
      creditContract: cc,
      matchedCollaterals: matchedCols,
      masterHdtdNumber,
      grantedLimit,
      principalAmount,
      currentBalance,
      interestRatePercent,
      disbursementDate,
      kunnTenor,
      kunnDueDate,
      hdtdStartDate,
      hdtdTenor,
      hdtdEndDate,
    });
  }

  if (pledge) result.push(...pledgePortfolioRows(pledge, activeCustomers));

  // Sắp xếp theo tên khách hàng rồi đến số KUNN
  result.sort((a, b) => {
    const cmpName = a.customer.FullName.localeCompare(b.customer.FullName, 'vi');
    if (cmpName !== 0) return cmpName;
    return a.kunn.ContractNumber.localeCompare(b.kunn.ContractNumber, 'vi');
  });

  return result;
}

/**
 * Tính toán chuỗi hiển thị số ngày còn lại của định giá TSBĐ
 */
export function formatAppraisalDaysRemaining(
  col: Collateral,
  today: string
): { expiryDate: string; daysRemainingLabel: string } {
  const expiry = appraisalExpiryDate(col);
  if (!expiry) {
    return { expiryDate: '—', daysRemainingLabel: 'Chưa có ngày ĐG' };
  }

  const days = diffDays(today, expiry);
  if (expiry < today) {
    const overdueDays = Math.abs(diffDays(expiry, today));
    return {
      expiryDate: fmtDate(expiry),
      daysRemainingLabel: `Quá hạn ${overdueDays} ngày`,
    };
  }

  return {
    expiryDate: fmtDate(expiry),
    daysRemainingLabel: `Còn ${days} ngày`,
  };
}

type ColKind = 'text' | 'center' | 'money' | 'rate' | 'amount';

/** Một cột của sheet: tiêu đề, độ rộng, kiểu ô, cách lấy giá trị và có cộng dòng TỔNG CỘNG hay không. */
interface SheetCol<T> {
  header: string;
  width: number;
  kind: ColKind;
  get: (row: T) => string | number;
  sum?: boolean;
}

const NUM_FMT_AMOUNT = '#,##0.00;(#,##0.00);"-"';

function headerStyle(kind: ColKind): XlsxStyle {
  if (kind === 'text') return styleHeaderLeft;
  if (kind === 'money' || kind === 'amount') return styleHeaderRight;
  return styleHeaderCenter;
}

function bodyCell(kind: ColKind, value: string | number): XlsxCell {
  if (kind === 'money') return { value, numeric: true, style: styleNumRight };
  if (kind === 'amount') return { value, numeric: true, style: { ...styleNumRight, numFmt: NUM_FMT_AMOUNT } };
  if (kind === 'text') return { value, style: styleLeft };
  if (kind === 'rate') return { value, style: styleRateCenter };
  return { value, style: styleCenter };
}

/**
 * Dựng một sheet bảng: hàng tiêu đề, các dòng dữ liệu, hàng TỔNG CỘNG cuối bảng.
 * Ô "TỔNG CỘNG" gộp từ cột A tới cột ngay trước cột cộng đầu tiên, để số tiền thẳng cột.
 */
function buildTableSheet<T>(name: string, cols: SheetCol<T>[], items: T[]): XlsxSheet {
  const rows: XlsxCell[][] = [cols.map(c => ({ value: c.header, style: headerStyle(c.kind) }))];
  for (const item of items) rows.push(cols.map(c => bodyCell(c.kind, c.get(item))));

  const firstSum = cols.findIndex(c => c.sum);
  rows.push(cols.map((c, i) => {
    if (i === 0) return { value: 'TỔNG CỘNG', style: styleTotalLabel };
    if (!c.sum) return { value: '', style: styleTotalLabel };
    const total = items.reduce((acc, item) => acc + Number(c.get(item) || 0), 0);
    const style = c.kind === 'amount' ? { ...styleTotalNum, numFmt: NUM_FMT_AMOUNT } : styleTotalNum;
    return { value: total, numeric: true, style };
  }));

  const mergeTo = firstSum > 1 ? firstSum : 1;
  return {
    name,
    rows,
    colWidths: cols.map(c => c.width),
    merges: mergeTo > 1 ? [`A${rows.length}:${columnLetter(mergeTo - 1)}${rows.length}`] : [],
    rowHeights: reportRowHeights(rows.length),
  };
}

const loanMethodOf = (r: PortfolioKunnRowData) =>
  r.kunn.LoanMethod || (r.kunn.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần');
const rateText = (r: PortfolioKunnRowData) => `${r.interestRatePercent.toFixed(2)}%`;
const joinOr = (parts: string[]) => parts.filter(Boolean).join('; ') || '—';

/** Các cột khách hàng + khoản vay dùng chung cho sheet tổng hợp và sheet ma trận. */
const LOAN_COLS: SheetCol<PortfolioKunnRowData>[] = [
  { header: 'Mã CIF KH', width: 14, kind: 'center', get: r => r.customer.CifKh || '—' },
  { header: 'Họ tên KH', width: 28, kind: 'text', get: r => r.customer.FullName || '—' },
  { header: 'Phương thức vay', width: 22, kind: 'text', get: loanMethodOf },
  { header: 'Số KUNN (GNN)', width: 22, kind: 'center', get: r => r.kunn.ContractNumber },
  { header: 'Số HĐTD gốc', width: 22, kind: 'center', get: r => r.masterHdtdNumber },
];

const AMOUNT_COLS = (sum: boolean): SheetCol<PortfolioKunnRowData>[] => [
  { header: 'Tổng mức cấp (VNĐ)', width: 20, kind: 'money', get: r => r.grantedLimit, sum },
  { header: 'Số tiền nhận nợ (VNĐ)', width: 20, kind: 'money', get: r => r.principalAmount, sum },
  { header: 'Dư nợ hiện hữu (VNĐ)', width: 20, kind: 'money', get: r => r.currentBalance, sum },
  { header: 'Lãi suất (%/năm)', width: 15, kind: 'rate', get: rateText },
  { header: 'Ngày giải ngân', width: 16, kind: 'center', get: r => fmtDate(r.disbursementDate) },
  { header: 'Thời hạn GNN', width: 15, kind: 'center', get: r => r.kunnTenor },
  { header: 'Ngày kết thúc GNN', width: 16, kind: 'center', get: r => fmtDate(r.kunnDueDate) },
  { header: 'Ngày ký HĐTD', width: 16, kind: 'center', get: r => fmtDate(r.hdtdStartDate) },
  { header: 'Thời hạn HĐTD', width: 15, kind: 'center', get: r => r.hdtdTenor },
  { header: 'Ngày kết thúc HĐTD', width: 16, kind: 'center', get: r => fmtDate(r.hdtdEndDate) },
];

const withStt = <T,>(cols: SheetCol<T & { stt: number }>[]): SheetCol<T & { stt: number }>[] => [
  { header: 'STT', width: 6, kind: 'center', get: r => r.stt },
  ...cols,
];

function securedSummarySheet(data: PortfolioKunnRowData[], today: string): XlsxSheet {
  type Row = PortfolioKunnRowData & { stt: number };
  const nearest = (r: Row) =>
    r.matchedCollaterals.length > 0 ? formatAppraisalDaysRemaining(r.matchedCollaterals[0], today) : null;
  const cols = withStt<PortfolioKunnRowData>([
    ...LOAN_COLS,
    ...AMOUNT_COLS(true),
    { header: 'Mã TSBĐ', width: 18, kind: 'text', get: r => joinOr(r.matchedCollaterals.map(c => c.AssetCode || 'TSBĐ')) },
    { header: 'Địa chỉ TSBĐ', width: 34, kind: 'text', get: r => joinOr(r.matchedCollaterals.map(c => c.Address || '')) },
    { header: 'Giá trị định giá (VNĐ)', width: 20, kind: 'money', sum: true,
      get: r => r.matchedCollaterals.reduce((acc, c) => acc + collateralValue(c), 0) },
    { header: 'Loại TSBĐ', width: 20, kind: 'text', get: r => joinOr(r.matchedCollaterals.map(c => assetClassLabel(c.AssetType) || '')) },
    { header: 'Ngày định giá', width: 16, kind: 'center',
      get: r => joinOr(r.matchedCollaterals.map(c => fmtDate(c.AppraisalDate)).filter(x => x !== '—')) },
    { header: 'Hiệu lực định giá', width: 16, kind: 'center',
      get: r => joinOr(r.matchedCollaterals.map(c => `${c.AppraisalTenorMonths || 12} tháng`)) },
    { header: 'Ngày kết thúc định giá', width: 18, kind: 'center', get: r => nearest(r)?.expiryDate ?? '—' },
    { header: 'Số ngày còn lại', width: 18, kind: 'center', get: r => nearest(r)?.daysRemainingLabel ?? '—' },
  ]);
  return buildTableSheet('Vay_Co_TSBD', cols, data.map((r, i): Row => ({ ...r, stt: i + 1 })));
}

function securedMatrixSheet(data: PortfolioKunnRowData[], today: string): XlsxSheet {
  type Row = PortfolioKunnRowData & { stt: number; col: Collateral | null };
  const expanded: Row[] = [];
  for (const r of data) {
    const cols = r.matchedCollaterals.length > 0 ? r.matchedCollaterals : [null];
    for (const col of cols) expanded.push({ ...r, col, stt: expanded.length + 1 });
  }
  const appraisal = (r: Row) => (r.col ? formatAppraisalDaysRemaining(r.col, today) : null);
  const cols = withStt<PortfolioKunnRowData & { col: Collateral | null }>([
    ...LOAN_COLS,
    ...AMOUNT_COLS(false),
    { header: 'Mã TSBĐ', width: 18, kind: 'center', get: r => r.col?.AssetCode || '—' },
    { header: 'Địa chỉ TSBĐ', width: 34, kind: 'text', get: r => r.col?.Address || '—' },
    { header: 'Giá trị định giá (VNĐ)', width: 22, kind: 'money', sum: true, get: r => (r.col ? collateralValue(r.col) : 0) },
    { header: 'Loại TSBĐ', width: 20, kind: 'text', get: r => (r.col ? assetClassLabel(r.col.AssetType) : '—') },
    { header: 'Ngày định giá', width: 16, kind: 'center', get: r => (r.col ? fmtDate(r.col.AppraisalDate) : '—') },
    { header: 'Hiệu lực ĐG', width: 15, kind: 'center', get: r => (r.col ? `${r.col.AppraisalTenorMonths || 12} tháng` : '—') },
    { header: 'Ngày kết thúc ĐG', width: 18, kind: 'center', get: r => appraisal(r)?.expiryDate ?? '—' },
    { header: 'Số ngày còn lại', width: 18, kind: 'center', get: r => appraisal(r)?.daysRemainingLabel ?? '—' },
  ]);
  return buildTableSheet('Chi_Tiet_KUNN_TSBD', cols, expanded);
}

function pledgeLoanSheet(data: PortfolioKunnRowData[]): XlsxSheet {
  type Row = PortfolioKunnRowData & { stt: number };
  const cols = withStt<PortfolioKunnRowData>([
    { header: 'Mã CIF KH', width: 14, kind: 'center', get: r => r.customer.CifKh || '—' },
    { header: 'Họ tên KH', width: 28, kind: 'text', get: r => r.customer.FullName || '—' },
    { header: 'Số HĐ cầm cố', width: 22, kind: 'center', get: r => r.kunn.ContractNumber },
    { header: 'Số tiền vay (VNĐ)', width: 20, kind: 'money', get: r => r.principalAmount, sum: true },
    { header: 'Dư nợ hiện hữu (VNĐ)', width: 20, kind: 'money', get: r => r.currentBalance, sum: true },
    { header: 'Lãi suất (%/năm)', width: 15, kind: 'rate', get: rateText },
    { header: 'Ngày giải ngân', width: 16, kind: 'center', get: r => fmtDate(r.disbursementDate) },
    { header: 'Thời hạn', width: 14, kind: 'center', get: r => r.kunnTenor },
    { header: 'Ngày đáo hạn', width: 16, kind: 'center', get: r => fmtDate(r.kunnDueDate) },
    { header: 'Sổ tiết kiệm cầm cố', width: 26, kind: 'text', get: r => joinOr(r.matchedCollaterals.map(c => c.AssetCode || '')) },
    { header: 'Giá trị sổ cầm cố (VNĐ)', width: 22, kind: 'money', sum: true,
      get: r => r.matchedCollaterals.reduce((acc, c) => acc + collateralValue(c), 0) },
  ]);
  return buildTableSheet('Vay_Cam_Co', cols, data.map((r, i): Row => ({ ...r, stt: i + 1 })));
}

function depositSheet(data: DepositRowData[]): XlsxSheet {
  type Row = DepositRowData & { stt: number };
  const cols = withStt<DepositRowData>([
    { header: 'Mã CIF KH', width: 14, kind: 'center', get: r => r.customer.CifKh || '—' },
    { header: 'Họ tên KH', width: 28, kind: 'text', get: r => r.customer.FullName || '—' },
    { header: 'Số sổ / CCTG', width: 20, kind: 'center', get: r => r.book.BookNumber },
    { header: 'Loại tiền gửi', width: 24, kind: 'text', get: r => r.depositTypeLabel },
    { header: 'Loại tiền', width: 10, kind: 'center', get: r => r.book.Currency || 'VND' },
    { header: 'Số tiền gửi (nguyên tệ)', width: 20, kind: 'amount', get: r => r.book.Amount },
    { header: 'Quy đổi VNĐ', width: 20, kind: 'money', get: r => r.amountVnd, sum: true },
    { header: 'Lãi suất (%/năm)', width: 15, kind: 'rate',
      get: r => (r.book.InterestRate === null ? '—' : `${r.book.InterestRate.toFixed(2)}%`) },
    { header: 'Ngày mở', width: 14, kind: 'center', get: r => fmtDate(r.book.OpenDate) },
    { header: 'Kỳ hạn', width: 12, kind: 'center', get: r => r.tenorLabel },
    { header: 'Ngày đáo hạn', width: 14, kind: 'center', get: r => fmtDate(r.maturityDate) },
    { header: 'Phương thức lãnh lãi', width: 20, kind: 'text', get: r => r.interestPaymentLabel },
    { header: 'Đang cầm cố cho HĐ', width: 24, kind: 'text', get: r => joinOr(r.pledgedContracts) },
  ]);
  return buildTableSheet('Huy_Dong', cols, data.map((r, i): Row => ({ ...r, stt: i + 1 })));
}

/**
 * Workbook danh mục đang vay, tách bốn sheet:
 * vay có TSBĐ (tổng hợp và ma trận KUNN – TSBĐ), vay cầm cố sổ tiết kiệm, và huy động (mọi sổ đang mở).
 */
export function generateCustomerPortfolioWorkbook(
  params: CustomerPortfolioExportParams
): Uint8Array {
  const today = params.todayStr || todayIso();
  const secured = buildActivePortfolioData({ ...params, pledge: undefined });
  const activeCustomers = filterActiveCustomers(params.customers);
  const pledgeRows = params.pledge ? pledgePortfolioRows(params.pledge, activeCustomers) : [];
  pledgeRows.sort((a, b) => a.customer.FullName.localeCompare(b.customer.FullName, 'vi')
    || a.kunn.ContractNumber.localeCompare(b.kunn.ContractNumber, 'vi'));
  const deposits = params.pledge ? buildDepositPortfolioData(params.pledge, params.customers) : [];

  return buildMultiSheetXlsx([
    securedSummarySheet(secured, today),
    securedMatrixSheet(secured, today),
    pledgeLoanSheet(pledgeRows),
    depositSheet(deposits),
  ]);
}

/**
 * Hàm hành động xuất file Excel và tải trực tiếp về máy người dùng
 */
export function exportActiveCustomerPortfolioExcel(params: CustomerPortfolioExportParams): void {
  const bytes = generateCustomerPortfolioWorkbook(params);
  const today = params.todayStr || todayIso();
  const filename = `Danh_Sach_Khach_Hang_Dang_Vay_${today}.xlsx`;
  downloadBytes(bytes, filename, MIME_XLSX);
}

/**
 * Tải toàn bộ dữ liệu từ CSDL Supabase và tự động kích hoạt xuất file Excel
 */
export async function downloadActiveCustomerPortfolioReport(
  onLoadingChange?: (loading: boolean) => void,
  onNotify?: (type: 'success' | 'error', message: string) => void
): Promise<void> {
  try {
    onLoadingChange?.(true);
    const [customers, collaterals, contracts, creditContracts, pledge] = await Promise.all([
      fetchCustomersAPI(),
      fetchCollateralsAPI(),
      fetchContractsAPI(),
      fetchAllCreditContractsAPI(),
      fetchAllPledgeLoanBundlesAPI(),
    ]);

    const activeContractIds = contracts.filter(c => !c.IsSettled).map(c => c.Id);
    let paidPrincipalMap: Record<number, number> = {};
    if (activeContractIds.length > 0) {
      try {
        paidPrincipalMap = await fetchPaidPrincipalForContractsAPI(activeContractIds);
      } catch (err) {
        console.warn('fetchPaidPrincipalForContractsAPI error, fallback to CurrentBalance:', err);
      }
    }

    exportActiveCustomerPortfolioExcel({
      customers,
      contracts,
      creditContracts,
      collaterals,
      paidPrincipalMap,
      pledge,
    });

    onNotify?.('success', '✓ Đã xuất thành công danh sách khách hàng đang vay ra file Excel!');
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    onNotify?.('error', `Không thể xuất báo cáo: ${msg}`);
  } finally {
    onLoadingChange?.(false);
  }
}

