import type { Collateral } from '../../types';
import {
  buildActivePortfolioData,
  formatAppraisalDaysRemaining,
  type CustomerPortfolioExportParams,
  type PortfolioKunnRowData,
} from '../customerPortfolioExport';
import { pledgePortfolioRows } from '../pledgePortfolio';
import { buildDepositPortfolioData, type DepositRowData } from '../depositPortfolio';
import { filterActiveCustomers } from '../customerStatus';
import { appraisalExpiryDate, assetClassLabel, collateralValue } from '../collateralMath';
import { fmtDate, todayIso } from '../utils';
import { matchesDebtGroup, type DebtGroupFilter } from './debtGroup';
import { appraisalTone, hdtdEndTone, kunnDueTone, toneOfDate, type PortfolioTone } from './portfolioTone';

export type PortfolioColKind = 'text' | 'center' | 'money' | 'rate' | 'amount';

export interface PortfolioColumn {
  header: string;
  width: number;
  kind: PortfolioColKind;
  sum: boolean;
}

export interface PortfolioCell {
  value: string | number;
  tone: PortfolioTone | null;
}

export type PortfolioTableId = 'secured' | 'matrix' | 'pledge' | 'deposit';

export interface PortfolioTable {
  id: PortfolioTableId;
  title: string;
  sheetName: string;
  columns: PortfolioColumn[];
  rows: PortfolioCell[][];
  totals: (number | null)[];
}

export const PORTFOLIO_FROZEN_COLUMNS = 3;

interface ColDef<T> {
  header: string;
  width: number;
  kind: PortfolioColKind;
  get: (row: T) => string | number;
  sum?: boolean;
  tone?: (row: T) => PortfolioTone | null;
}

type Numbered<T> = T & { stt: number };

function toTable<T>(id: PortfolioTableId, title: string, sheetName: string, cols: ColDef<Numbered<T>>[], items: T[]): PortfolioTable {
  const numbered = items.map((item, i) => ({ ...item, stt: i + 1 }));
  return {
    id,
    title,
    sheetName,
    columns: cols.map(c => ({ header: c.header, width: c.width, kind: c.kind, sum: Boolean(c.sum) })),
    rows: numbered.map(row => cols.map(c => ({ value: c.get(row), tone: c.tone?.(row) ?? null }))),
    totals: cols.map(c => (c.sum ? numbered.reduce((acc, row) => acc + Number(c.get(row) || 0), 0) : null)),
  };
}

const kunnTone = toneOfDate(kunnDueTone);
const hdtdTone = toneOfDate(hdtdEndTone);
const collateralTone = toneOfDate(appraisalTone);

const loanMethodOf = (r: PortfolioKunnRowData) =>
  r.kunn.LoanMethod || (r.kunn.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần');
const rateText = (r: PortfolioKunnRowData) => `${r.interestRatePercent.toFixed(2)}%`;
const joinOr = (parts: string[]) => parts.filter(Boolean).join('; ') || '—';
const booksValue = (r: PortfolioKunnRowData) => r.matchedCollaterals.reduce((acc, c) => acc + collateralValue(c), 0);

function customerCols<T extends { customer: { CifKh?: string | null; FullName: string } }>(): ColDef<Numbered<T>>[] {
  return [
    { header: 'STT', width: 6, kind: 'center', get: r => r.stt },
    { header: 'Mã CIF KH', width: 14, kind: 'center', get: r => r.customer.CifKh || '—' },
    { header: 'Họ tên KH', width: 28, kind: 'text', get: r => r.customer.FullName || '—' },
  ];
}

const debtGroupCol = <T extends PortfolioKunnRowData>(): ColDef<T> =>
  ({ header: 'Nhóm nợ', width: 10, kind: 'center', get: r => r.debtGroup });

function loanCols<T extends PortfolioKunnRowData>(today: string, sum: boolean): ColDef<T>[] {
  return [
    { header: 'Phương thức vay', width: 22, kind: 'text', get: loanMethodOf },
    { header: 'Số KUNN (GNN)', width: 22, kind: 'center', get: r => r.kunn.ContractNumber },
    { header: 'Số HĐTD gốc', width: 22, kind: 'center', get: r => r.masterHdtdNumber },
    { header: 'Tổng mức cấp (VNĐ)', width: 20, kind: 'money', get: r => r.grantedLimit, sum },
    { header: 'Số tiền nhận nợ (VNĐ)', width: 20, kind: 'money', get: r => r.principalAmount, sum },
    { header: 'Dư nợ hiện hữu (VNĐ)', width: 20, kind: 'money', get: r => r.currentBalance, sum },
    { header: 'Lãi suất (%/năm)', width: 15, kind: 'rate', get: rateText },
    { header: 'Ngày giải ngân', width: 16, kind: 'center', get: r => fmtDate(r.disbursementDate) },
    { header: 'Thời hạn GNN', width: 15, kind: 'center', get: r => r.kunnTenor },
    { header: 'Ngày kết thúc GNN', width: 16, kind: 'center', get: r => fmtDate(r.kunnDueDate),
      tone: r => kunnTone(r.kunnDueDate, today) },
    { header: 'Ngày ký HĐTD', width: 16, kind: 'center', get: r => fmtDate(r.hdtdStartDate) },
    { header: 'Thời hạn HĐTD', width: 15, kind: 'center', get: r => r.hdtdTenor },
    { header: 'Ngày kết thúc HĐTD', width: 16, kind: 'center', get: r => fmtDate(r.hdtdEndDate),
      tone: r => hdtdTone(r.hdtdEndDate, today) },
  ];
}

function appraisalCols<T>(today: string, pick: (row: T) => Collateral | null): ColDef<T>[] {
  const info = (row: T) => {
    const c = pick(row);
    return c ? formatAppraisalDaysRemaining(c, today) : null;
  };
  const tone = (row: T) => {
    const c = pick(row);
    return c ? collateralTone(appraisalExpiryDate(c), today) : null;
  };
  return [
    { header: 'Ngày kết thúc định giá', width: 18, kind: 'center', get: r => info(r)?.expiryDate ?? '—', tone },
    { header: 'Số ngày còn lại', width: 18, kind: 'center', get: r => info(r)?.daysRemainingLabel ?? '—', tone },
  ];
}

function securedTable(data: PortfolioKunnRowData[], today: string): PortfolioTable {
  type Row = Numbered<PortfolioKunnRowData>;
  return toTable<PortfolioKunnRowData>('secured', 'Vay có TSBĐ', 'Vay_Co_TSBD', [
    ...customerCols<PortfolioKunnRowData>(),
    debtGroupCol<Row>(),
    ...loanCols<Row>(today, true),
    { header: 'Mã TSBĐ', width: 18, kind: 'text', get: r => joinOr(r.matchedCollaterals.map(c => c.AssetCode || 'TSBĐ')) },
    { header: 'Địa chỉ TSBĐ', width: 34, kind: 'text', get: r => joinOr(r.matchedCollaterals.map(c => c.Address || '')) },
    { header: 'Giá trị định giá (VNĐ)', width: 20, kind: 'money', sum: true, get: booksValue },
    { header: 'Loại TSBĐ', width: 20, kind: 'text', get: r => joinOr(r.matchedCollaterals.map(c => assetClassLabel(c.AssetType) || '')) },
    { header: 'Ngày định giá', width: 16, kind: 'center',
      get: r => joinOr(r.matchedCollaterals.map(c => fmtDate(c.AppraisalDate)).filter(x => x !== '—')) },
    { header: 'Hiệu lực định giá', width: 16, kind: 'center',
      get: r => joinOr(r.matchedCollaterals.map(c => `${c.AppraisalTenorMonths || 12} tháng`)) },
    ...appraisalCols<Row>(today, r => r.matchedCollaterals[0] ?? null),
  ], data);
}

function matrixTable(data: PortfolioKunnRowData[], today: string): PortfolioTable {
  type Item = PortfolioKunnRowData & { col: Collateral | null };
  type Row = Numbered<Item>;
  const expanded: Item[] = data.flatMap(r =>
    (r.matchedCollaterals.length > 0 ? r.matchedCollaterals : [null]).map(col => ({ ...r, col })));
  return toTable<Item>('matrix', 'Chi tiết KUNN – TSBĐ', 'Chi_Tiet_KUNN_TSBD', [
    ...customerCols<Item>(),
    debtGroupCol<Row>(),
    ...loanCols<Row>(today, false),
    { header: 'Mã TSBĐ', width: 18, kind: 'center', get: r => r.col?.AssetCode || '—' },
    { header: 'Địa chỉ TSBĐ', width: 34, kind: 'text', get: r => r.col?.Address || '—' },
    { header: 'Giá trị định giá (VNĐ)', width: 22, kind: 'money', sum: true, get: r => (r.col ? collateralValue(r.col) : 0) },
    { header: 'Loại TSBĐ', width: 20, kind: 'text', get: r => (r.col ? assetClassLabel(r.col.AssetType) : '—') },
    { header: 'Ngày định giá', width: 16, kind: 'center', get: r => (r.col ? fmtDate(r.col.AppraisalDate) : '—') },
    { header: 'Hiệu lực ĐG', width: 15, kind: 'center', get: r => (r.col ? `${r.col.AppraisalTenorMonths || 12} tháng` : '—') },
    ...appraisalCols<Row>(today, r => r.col),
  ], expanded);
}

function pledgeTable(data: PortfolioKunnRowData[], today: string): PortfolioTable {
  type Row = Numbered<PortfolioKunnRowData>;
  return toTable<PortfolioKunnRowData>('pledge', 'Vay cầm cố', 'Vay_Cam_Co', [
    ...customerCols<PortfolioKunnRowData>(),
    debtGroupCol<Row>(),
    { header: 'Số HĐ cầm cố', width: 22, kind: 'center', get: r => r.kunn.ContractNumber },
    { header: 'Số tiền vay (VNĐ)', width: 20, kind: 'money', get: r => r.principalAmount, sum: true },
    { header: 'Dư nợ hiện hữu (VNĐ)', width: 20, kind: 'money', get: r => r.currentBalance, sum: true },
    { header: 'Lãi suất (%/năm)', width: 15, kind: 'rate', get: rateText },
    { header: 'Ngày giải ngân', width: 16, kind: 'center', get: r => fmtDate(r.disbursementDate) },
    { header: 'Thời hạn', width: 14, kind: 'center', get: r => r.kunnTenor },
    { header: 'Ngày đáo hạn', width: 16, kind: 'center', get: r => fmtDate(r.kunnDueDate),
      tone: r => kunnTone(r.kunnDueDate, today) },
    { header: 'Sổ tiết kiệm cầm cố', width: 26, kind: 'text', get: r => joinOr(r.matchedCollaterals.map(c => c.AssetCode || '')) },
    { header: 'Giá trị sổ cầm cố (VNĐ)', width: 22, kind: 'money', sum: true, get: booksValue },
  ], data);
}

function depositTable(data: DepositRowData[]): PortfolioTable {
  return toTable<DepositRowData>('deposit', 'Huy động', 'Huy_Dong', [
    ...customerCols<DepositRowData>(),
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
  ], data);
}

const byCustomerThenContract = (a: PortfolioKunnRowData, b: PortfolioKunnRowData) =>
  a.customer.FullName.localeCompare(b.customer.FullName, 'vi')
  || a.kunn.ContractNumber.localeCompare(b.kunn.ContractNumber, 'vi');

export function buildLoanPortfolioTables(
  params: CustomerPortfolioExportParams,
  filter: DebtGroupFilter = 'all',
): PortfolioTable[] {
  const today = params.todayStr || todayIso();
  const inGroup = (r: PortfolioKunnRowData) => matchesDebtGroup(r.debtGroup, filter);
  const secured = buildActivePortfolioData({ ...params, todayStr: today, pledge: undefined }).filter(inGroup);
  const pledgeRows = params.pledge
    ? pledgePortfolioRows(params.pledge, filterActiveCustomers(params.customers), today).filter(inGroup).sort(byCustomerThenContract)
    : [];
  const tables = [
    securedTable(secured, today),
    matrixTable(secured, today),
    pledgeTable(pledgeRows, today),
  ];
  if (filter === 'all') {
    tables.push(depositTable(params.pledge ? buildDepositPortfolioData(params.pledge, params.customers) : []));
  }
  return tables;
}
