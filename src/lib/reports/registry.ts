import { buildMultiSheetXlsx, sanitizeSheetName, type XlsxSheet } from '../xlsxWriter';
import type { CustomerPortfolioExportParams } from '../customerPortfolioExport';
import { buildPortfolioSheet } from './builders/portfolioSheet';
import { buildDueSheet, type DueSheetRow } from './builders/dueSheet';
import { buildKunnSheet, type KunnSheetRow } from './builders/kunnSheet';
import { buildCreditSheet, type CreditSheetRow } from './builders/creditSheet';
import { buildCollateralSheet, type CollateralSheetRow } from './builders/collateralSheet';
import { loadCollateralRows, loadCreditRows, loadDueRows, loadKunnRows, loadPortfolioParams } from './loaders';
import type { ReportDef, ReportId } from './types';

const DANH_MUC_RONG: CustomerPortfolioExportParams = {
  customers: [],
  contracts: [],
  creditContracts: [],
  collaterals: [],
};

export const REPORTS: ReportDef[] = [
  {
    id: 'portfolio',
    name: 'Danh mục đang vay',
    shortName: 'Danh mục',
    sheetName: 'Danh muc dang vay',
    supportsDueFilter: false,
    dueFieldLabel: '—',
    load: loadPortfolioParams,
    buildSheet: (data, _filter, ctx) =>
      buildPortfolioSheet((data.rows[0] as CustomerPortfolioExportParams | undefined) ?? DANH_MUC_RONG, ctx),
  },
  {
    id: 'due',
    name: 'Báo cáo nợ due',
    shortName: 'Nợ due',
    sheetName: 'No due',
    supportsDueFilter: true,
    dueFieldLabel: 'Ngày đến hạn kỳ trả',
    load: loadDueRows,
    buildSheet: (data, filter, ctx) => buildDueSheet(data.rows as DueSheetRow[], filter, ctx),
  },
  {
    id: 'kunn',
    name: 'Danh sách KUNN',
    shortName: 'KUNN',
    sheetName: 'KUNN',
    supportsDueFilter: true,
    dueFieldLabel: 'Ngày đáo hạn KUNN',
    load: loadKunnRows,
    buildSheet: (data, filter, ctx) => buildKunnSheet(data.rows as KunnSheetRow[], filter, ctx),
  },
  {
    id: 'credit',
    name: 'Danh sách HĐTD',
    shortName: 'HĐTD',
    sheetName: 'HDTD',
    supportsDueFilter: true,
    dueFieldLabel: 'Ngày hết hiệu lực HĐ',
    load: loadCreditRows,
    buildSheet: (data, filter, ctx) => buildCreditSheet(data.rows as CreditSheetRow[], filter, ctx),
  },
  {
    id: 'collateral',
    name: 'Tài sản bảo đảm',
    shortName: 'Tài sản',
    sheetName: 'Tai san bao dam',
    supportsDueFilter: true,
    dueFieldLabel: 'Ngày hết hiệu lực chứng thư',
    load: loadCollateralRows,
    buildSheet: (data, filter, ctx) => buildCollateralSheet(data.rows as CollateralSheetRow[], filter, ctx),
  },
];

export function reportById(id: ReportId): ReportDef | undefined {
  return REPORTS.find(r => r.id === id);
}

export function buildReportWorkbook(sheets: XlsxSheet[]): Uint8Array {
  if (sheets.length === 0) {
    throw new Error('Khong co sheet nao de xuat');
  }
  const antoan = sheets.map(s => ({ ...s, name: sanitizeSheetName(s.name) }));
  return buildMultiSheetXlsx(antoan);
}
