import type { Customer, LoanContract, CreditContract, Collateral, PledgeBundle } from '../types';
import { pledgePortfolioRows } from './pledgePortfolio';
import { buildMultiSheetXlsx, type XlsxCell, type XlsxSheet, type XlsxStyle, MIME_XLSX } from './xlsxWriter';
import { downloadBytes } from './xlsExport';
import { fmtDate, todayIso } from './utils';
import { kunnPrincipal, outstandingOf } from './loanMath';
import { getEffectiveActiveRate } from './rateResolution';
import { collateralValue, appraisalExpiryDate, assetClassLabel } from './collateralMath';
import { resolveMasterHdtdNumber } from './creditContract';
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
const HEADER_FILL = 'F1F5F9'; // Light Slate
const TOTAL_FILL = 'E2E8F0'; // Slate 200

const styleHeaderCenter: XlsxStyle = { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true };
const styleHeaderLeft: XlsxStyle = { bold: true, align: 'left', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true };
const styleHeaderRight: XlsxStyle = { bold: true, align: 'right', vAlign: 'center', fill: HEADER_FILL, wrap: true, border: true };

const styleCenter: XlsxStyle = { align: 'center', vAlign: 'center', border: true };
const styleLeft: XlsxStyle = { align: 'left', vAlign: 'center', border: true };
const styleNumRight: XlsxStyle = { align: 'right', vAlign: 'center', numFmt: NUM_FMT_ACCOUNTING, border: true };
const styleRateCenter: XlsxStyle = { align: 'center', vAlign: 'center', border: true };

const styleTotalLabel: XlsxStyle = { bold: true, align: 'right', vAlign: 'center', fill: TOTAL_FILL, border: true };
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
  const customerMap = new Map<number, Customer>(customers.map(c => [c.Id, c]));

  // Lọc toàn bộ KUNN đang lưu nợ (trừ đã tất toán)
  const activeKunns = contracts.filter(k => isKunnActiveDebt(k, paidPrincipalMap));

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

  if (pledge) result.push(...pledgePortfolioRows(pledge, customers));

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

/**
 * Tạo Workbook Excel đa sheet đầy đủ theo quy chuẩn AGENTS.md
 */
export function generateCustomerPortfolioWorkbook(
  params: CustomerPortfolioExportParams
): Uint8Array {
  const today = params.todayStr || todayIso();
  const portfolioData = buildActivePortfolioData(params);

  // ==========================================
  // SHEET 1: DANH MỤC TỔNG HỢP KHÁCH HÀNG & KHOẢN VAY
  // ==========================================
  const sheet1Headers: XlsxCell[] = [
    { value: 'STT', style: styleHeaderCenter },
    { value: 'Mã CIF KH', style: styleHeaderCenter },
    { value: 'Mã CIF KHLQ', style: styleHeaderCenter },
    { value: 'Họ tên KH', style: styleHeaderLeft },
    { value: 'Họ tên KHLQ', style: styleHeaderLeft },
    { value: 'Phương thức vay', style: styleHeaderLeft },
    { value: 'Số KUNN (GNN)', style: styleHeaderCenter },
    { value: 'Số HĐTD gốc', style: styleHeaderCenter },
    { value: 'Tổng mức cấp (VNĐ)', style: styleHeaderRight },
    { value: 'Số tiền nhận nợ (VNĐ)', style: styleHeaderRight },
    { value: 'Dư nợ hiện hữu (VNĐ)', style: styleHeaderRight },
    { value: 'Lãi suất (%/năm)', style: styleHeaderCenter },
    { value: 'Ngày giải ngân', style: styleHeaderCenter },
    { value: 'Thời hạn GNN', style: styleHeaderCenter },
    { value: 'Ngày kết thúc GNN', style: styleHeaderCenter },
    { value: 'Ngày ký HĐTD', style: styleHeaderCenter },
    { value: 'Thời hạn HĐTD', style: styleHeaderCenter },
    { value: 'Ngày kết thúc HĐTD', style: styleHeaderCenter },
    { value: 'Mã TSBĐ', style: styleHeaderLeft },
    { value: 'Địa chỉ TSBĐ', style: styleHeaderLeft },
    { value: 'Giá trị định giá (VNĐ)', style: styleHeaderRight },
    { value: 'Loại TSBĐ', style: styleHeaderLeft },
    { value: 'Ngày định giá', style: styleHeaderCenter },
    { value: 'Hiệu lực định giá', style: styleHeaderCenter },
    { value: 'Ngày kết thúc định giá', style: styleHeaderCenter },
    { value: 'Số ngày còn lại', style: styleHeaderCenter },
  ];

  let sumGranted = 0;
  let sumPrincipal = 0;
  let sumBalance = 0;
  let sumColValSheet1 = 0;

  const sheet1Rows: XlsxCell[][] = [sheet1Headers];

  portfolioData.forEach((item, idx) => {
    sumGranted += item.grantedLimit;
    sumPrincipal += item.principalAmount;
    sumBalance += item.currentBalance;

    const totalColVal = item.matchedCollaterals.reduce((acc, c) => acc + collateralValue(c), 0);
    sumColValSheet1 += totalColVal;

    const assetCodes = item.matchedCollaterals.map(c => c.AssetCode || 'TSBĐ').join('; ') || '—';
    const addresses = item.matchedCollaterals.map(c => c.Address).filter(Boolean).join('; ') || '—';
    const assetTypes = item.matchedCollaterals.map(c => assetClassLabel(c.AssetType)).filter(Boolean).join('; ') || '—';
    const appraisalDates = item.matchedCollaterals.map(c => fmtDate(c.AppraisalDate)).filter(x => x !== '—').join('; ') || '—';
    const appraisalTenors = item.matchedCollaterals.map(c => c.AppraisalTenorMonths ? `${c.AppraisalTenorMonths} tháng` : '12 tháng').join('; ') || '—';

    // Tìm TSBĐ có ngày hết hạn gần nhất
    let nearestExpiry = '—';
    let nearestStatus = '—';
    if (item.matchedCollaterals.length > 0) {
      const parsedExp = item.matchedCollaterals.map(c => formatAppraisalDaysRemaining(c, today));
      nearestExpiry = parsedExp[0].expiryDate;
      nearestStatus = parsedExp[0].daysRemainingLabel;
    }

    sheet1Rows.push([
      { value: idx + 1, style: styleCenter },
      { value: item.customer.CifKh || '—', style: styleCenter },
      { value: item.customer.CifKhlq || '—', style: styleCenter },
      { value: item.customer.FullName || '—', style: styleLeft },
      { value: item.customer.SpouseName || '—', style: styleLeft },
      { value: item.kunn.LoanMethod || (item.kunn.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần'), style: styleLeft },
      { value: item.kunn.ContractNumber, style: styleCenter },
      { value: item.masterHdtdNumber, style: styleCenter },
      { value: item.grantedLimit, numeric: true, style: styleNumRight },
      { value: item.principalAmount, numeric: true, style: styleNumRight },
      { value: item.currentBalance, numeric: true, style: styleNumRight },
      { value: `${item.interestRatePercent.toFixed(2)}%`, style: styleRateCenter },
      { value: fmtDate(item.disbursementDate), style: styleCenter },
      { value: item.kunnTenor, style: styleCenter },
      { value: fmtDate(item.kunnDueDate), style: styleCenter },
      { value: fmtDate(item.hdtdStartDate), style: styleCenter },
      { value: item.hdtdTenor, style: styleCenter },
      { value: fmtDate(item.hdtdEndDate), style: styleCenter },
      { value: assetCodes, style: styleLeft },
      { value: addresses, style: styleLeft },
      { value: totalColVal, numeric: true, style: styleNumRight },
      { value: assetTypes, style: styleLeft },
      { value: appraisalDates, style: styleCenter },
      { value: appraisalTenors, style: styleCenter },
      { value: nearestExpiry, style: styleCenter },
      { value: nearestStatus, style: styleCenter },
    ]);
  });

  // HÀNG TỔNG CỘNG CHO SHEET 1: Thẳng hàng 100% các cột số tiền theo AGENTS.md
  sheet1Rows.push([
    { value: 'TỔNG CỘNG', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: sumGranted, numeric: true, style: styleTotalNum },
    { value: sumPrincipal, numeric: true, style: styleTotalNum },
    { value: sumBalance, numeric: true, style: styleTotalNum },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: sumColValSheet1, numeric: true, style: styleTotalNum },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
  ]);

  const sheet1: XlsxSheet = {
    name: 'Danh_Muc_Tin_Dung',
    rows: sheet1Rows,
    colWidths: [6, 14, 14, 26, 26, 20, 22, 22, 20, 20, 20, 14, 15, 14, 15, 15, 14, 15, 18, 32, 20, 18, 15, 15, 18, 18],
  };

  // ==========================================
  // SHEET 2: CHI TIẾT MA TRẬN KUNN - TSBĐ
  // ==========================================
  const sheet2Headers: XlsxCell[] = [
    { value: 'STT', style: styleHeaderCenter },
    { value: 'Mã CIF KH', style: styleHeaderCenter },
    { value: 'Mã CIF KHLQ', style: styleHeaderCenter },
    { value: 'Họ tên KH', style: styleHeaderLeft },
    { value: 'Họ tên KHLQ', style: styleHeaderLeft },
    { value: 'Phương thức vay', style: styleHeaderLeft },
    { value: 'Số KUNN', style: styleHeaderCenter },
    { value: 'Số HĐTD gốc', style: styleHeaderCenter },
    { value: 'Tổng mức cấp (VNĐ)', style: styleHeaderRight },
    { value: 'Số tiền nhận nợ (VNĐ)', style: styleHeaderRight },
    { value: 'Dư nợ hiện hữu (VNĐ)', style: styleHeaderRight },
    { value: 'Lãi suất (%/năm)', style: styleHeaderCenter },
    { value: 'Ngày giải ngân', style: styleHeaderCenter },
    { value: 'Thời hạn GNN', style: styleHeaderCenter },
    { value: 'Ngày kết thúc GNN', style: styleHeaderCenter },
    { value: 'Ngày ký HĐTD', style: styleHeaderCenter },
    { value: 'Thời hạn HĐTD', style: styleHeaderCenter },
    { value: 'Ngày kết thúc HĐTD', style: styleHeaderCenter },
    { value: 'Mã TSBĐ', style: styleHeaderCenter },
    { value: 'Địa chỉ TSBĐ', style: styleHeaderLeft },
    { value: 'Giá trị định giá (VNĐ)', style: styleHeaderRight },
    { value: 'Loại TSBĐ', style: styleHeaderLeft },
    { value: 'Ngày định giá', style: styleHeaderCenter },
    { value: 'Hiệu lực ĐG', style: styleHeaderCenter },
    { value: 'Ngày kết thúc ĐG', style: styleHeaderCenter },
    { value: 'Số ngày còn lại', style: styleHeaderCenter },
  ];

  const sheet2Rows: XlsxCell[][] = [sheet2Headers];
  let matrixStt = 1;
  let sumColValSheet2 = 0;

  portfolioData.forEach((item) => {
    if (item.matchedCollaterals.length === 0) {
      sheet2Rows.push([
        { value: matrixStt++, style: styleCenter },
        { value: item.customer.CifKh || '—', style: styleCenter },
        { value: item.customer.CifKhlq || '—', style: styleCenter },
        { value: item.customer.FullName || '—', style: styleLeft },
        { value: item.customer.SpouseName || '—', style: styleLeft },
        { value: item.kunn.LoanMethod || (item.kunn.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần'), style: styleLeft },
        { value: item.kunn.ContractNumber, style: styleCenter },
        { value: item.masterHdtdNumber, style: styleCenter },
        { value: item.grantedLimit, numeric: true, style: styleNumRight },
        { value: item.principalAmount, numeric: true, style: styleNumRight },
        { value: item.currentBalance, numeric: true, style: styleNumRight },
        { value: `${item.interestRatePercent.toFixed(2)}%`, style: styleRateCenter },
        { value: fmtDate(item.disbursementDate), style: styleCenter },
        { value: item.kunnTenor, style: styleCenter },
        { value: fmtDate(item.kunnDueDate), style: styleCenter },
        { value: fmtDate(item.hdtdStartDate), style: styleCenter },
        { value: item.hdtdTenor, style: styleCenter },
        { value: fmtDate(item.hdtdEndDate), style: styleCenter },
        { value: '—', style: styleCenter },
        { value: '—', style: styleLeft },
        { value: 0, numeric: true, style: styleNumRight },
        { value: '—', style: styleLeft },
        { value: '—', style: styleCenter },
        { value: '—', style: styleCenter },
        { value: '—', style: styleCenter },
        { value: '—', style: styleCenter },
      ]);
    } else {
      item.matchedCollaterals.forEach((col) => {
        const val = collateralValue(col);
        sumColValSheet2 += val;
        const appraisal = formatAppraisalDaysRemaining(col, today);

        sheet2Rows.push([
          { value: matrixStt++, style: styleCenter },
          { value: item.customer.CifKh || '—', style: styleCenter },
          { value: item.customer.CifKhlq || '—', style: styleCenter },
          { value: item.customer.FullName || '—', style: styleLeft },
          { value: item.customer.SpouseName || '—', style: styleLeft },
          { value: item.kunn.LoanMethod || (item.kunn.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần'), style: styleLeft },
          { value: item.kunn.ContractNumber, style: styleCenter },
          { value: item.masterHdtdNumber, style: styleCenter },
          { value: item.grantedLimit, numeric: true, style: styleNumRight },
          { value: item.principalAmount, numeric: true, style: styleNumRight },
          { value: item.currentBalance, numeric: true, style: styleNumRight },
          { value: `${item.interestRatePercent.toFixed(2)}%`, style: styleRateCenter },
          { value: fmtDate(item.disbursementDate), style: styleCenter },
          { value: item.kunnTenor, style: styleCenter },
          { value: fmtDate(item.kunnDueDate), style: styleCenter },
          { value: fmtDate(item.hdtdStartDate), style: styleCenter },
          { value: item.hdtdTenor, style: styleCenter },
          { value: fmtDate(item.hdtdEndDate), style: styleCenter },
          { value: col.AssetCode || '—', style: styleCenter },
          { value: col.Address || '—', style: styleLeft },
          { value: val, numeric: true, style: styleNumRight },
          { value: assetClassLabel(col.AssetType), style: styleLeft },
          { value: fmtDate(col.AppraisalDate), style: styleCenter },
          { value: col.AppraisalTenorMonths ? `${col.AppraisalTenorMonths} tháng` : '12 tháng', style: styleCenter },
          { value: appraisal.expiryDate, style: styleCenter },
          { value: appraisal.daysRemainingLabel, style: styleCenter },
        ]);
      });
    }
  });

  // HÀNG TỔNG CỘNG CHO SHEET 2
  sheet2Rows.push([
    { value: 'TỔNG CỘNG', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: sumColValSheet2, numeric: true, style: styleTotalNum },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
    { value: '', style: styleTotalLabel },
  ]);

  const sheet2: XlsxSheet = {
    name: 'Chi_Tiet_KUNN_TSBD',
    rows: sheet2Rows,
    colWidths: [6, 14, 14, 26, 26, 20, 22, 22, 20, 20, 20, 14, 15, 14, 15, 15, 14, 15, 18, 32, 22, 20, 15, 14, 18, 18],
  };

  return buildMultiSheetXlsx([sheet1, sheet2]);
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

