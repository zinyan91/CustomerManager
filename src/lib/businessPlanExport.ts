import type { BasisKey, BusinessPlanInput, BusinessPlanResult } from './businessPlan';
import { buildXlsx, type XlsxSheet } from './xlsxWriter';

export type CellAlign = 'left' | 'center' | 'right';

export interface ExportCell {
  text: string;
  align?: CellAlign;
  bold?: boolean;
  italic?: boolean;
  wrap?: boolean;
  numFormat?: string;
  numeric?: boolean;
}

export type ExportRow = ExportCell[];

export interface ExportSheet {
  fileBase: string;
  header: string[];
  rows: ExportRow[];
  colWidths: number[];
}

export const HEADER_FILL = 'DCE6F1';

export interface ExportContext {
  customerCif: string;
  balanceSheetDate: string;
  actualYear: number;
  planYear: number;
  basis?: Partial<Record<BasisKey, string | null>>;
}

export type { BasisKey };

const FMT_MONEY = '#,##0';
const FMT_ONE_DECIMAL = '#,##0.0';
const FMT_PERCENT = '0%';
const MILLION = 1_000_000;

function text(value: string, align: CellAlign = 'left'): ExportCell {
  return { text: value, align };
}

function sub(value: string): ExportCell {
  return { text: value, align: 'left', italic: true };
}

function label(value: string): ExportCell {
  return { text: value, align: 'left', bold: true };
}

function stt(value: number): ExportCell {
  return { text: String(value), align: 'center', numeric: true };
}

function wrapped(value: string): ExportCell {
  return { text: value, align: 'left', wrap: true };
}

function money(value: number, bold = false): ExportCell {
  return { text: String(Math.round(value)), align: 'right', bold, numFormat: FMT_MONEY, numeric: true };
}

function millions(value: number, bold = false): ExportCell {
  return {
    text: String(Math.round(value / MILLION * 100) / 100),
    align: 'right', bold, numFormat: FMT_MONEY, numeric: true,
  };
}

function ratio(value: number): ExportCell {
  return {
    text: String(Math.round(value * 10) / 10),
    align: 'right', numFormat: FMT_ONE_DECIMAL, numeric: true,
  };
}

function percent(value: number): ExportCell {
  return {
    text: String(Math.round(value * 10000) / 10000),
    align: 'right', numFormat: FMT_PERCENT, numeric: true,
  };
}

function monthYear(isoDate: string): string {
  const parts = (isoDate || '').split('-');
  if (parts.length < 2) return isoDate || '';
  return `${parts[1]}/${parts[0]}`;
}

export function shareOfRevenueText(value: number, revenue: number): string {
  if (!revenue) return '';
  const pct = Math.round(value / revenue * 10000) / 100;
  return `Chiếm ${String(pct).replace('.', ',')}% doanh thu`;
}

function basisOr(ctx: ExportContext, key: BasisKey, fallback: string): string {
  const declared = ctx.basis?.[key];
  if (declared && declared.trim()) return declared.trim();
  return fallback;
}

export function buildFinancialPositionSheet(
  input: BusinessPlanInput, r: BusinessPlanResult, ctx: ExportContext
): ExportSheet {
  const at = `Giá trị tại thời điểm: ${monthYear(ctx.balanceSheetDate)}`;
  const b = r.balance;
  const s = input.balanceSheet;

  return {
    fileBase: 'TINH HINH TAI CHINH',
    header: ['STT', 'Tài sản', at, 'Nguồn vốn', at],
    colWidths: [5, 30, 24, 26, 24],
    rows: [
      [stt(1), label('Tài sản ngắn hạn'), money(b.currentAssets, true),
        label('Nợ phải trả'), money(b.totalLiabilities, true)],
      [stt(2), sub('Tiền, tương đương tiền'), money(s.cash),
        sub('Nợ ngắn hạn'), money(s.shortTermDebt)],
      [stt(3), sub('Hàng tồn kho'), money(s.inventory),
        sub('…'), money(s.otherShortTermDebt)],
      [stt(4), sub('Các khoản phải thu'), money(s.receivables),
        sub('Nợ dài hạn'), money(s.longTermDebt)],
      [stt(5), sub('Tài sản ngắn hạn khác'), money(s.otherCurrentAssets),
        sub('…'), money(s.otherLongTermDebt)],
      [stt(6), label('Tài sản dài hạn'), money(b.longTermAssets, true),
        label('Vốn chủ sở hữu'), money(b.ownEquity, true)],
      [stt(7), sub('Các khoản phải thu dài hạn'), money(s.longTermReceivables),
        sub('Vốn góp'), money(0)],
      [stt(8), sub('Tài sản cố định'), money(s.fixedAssets),
        sub('Nguồn kinh phí & quỹ khác'), money(0)],
      [stt(9), sub('Tài sản dài hạn khác'), money(s.otherLongTermAssets),
        sub('…'), money(0)],
      [stt(10), label('Tổng tài sản'), money(b.totalAssets, true),
        label('Tổng nguồn vốn'), money(b.totalCapital, true)],
    ],
  };
}

export function buildIncomeStatementSheet(r: BusinessPlanResult, ctx: ExportContext): ExportSheet {
  const p = r.actual;
  const c = p.costs;
  const m = p.monthly;
  const rev = p.revenueAnnual;

  const line = (
    ky: string, name: string, monthly: number, annual: number, basis: string,
    kieu: 'thuong' | 'dam' | 'nghieng' = 'thuong'
  ): ExportRow => {
    const bold = kieu === 'dam';
    const italic = kieu === 'nghieng';
    return [
      { text: ky, align: 'center', italic },
      bold ? label(name) : italic ? sub(name) : text(name),
      money(monthly, bold),
      money(annual, bold),
      wrapped(basis),
    ];
  };

  return {
    fileBase: 'KET QUA KINH DOANH',
    header: ['STT', 'Chỉ tiêu', 'Giá trị hàng tháng', 'Giá trị hàng năm', 'Cơ sở xác định'],
    colWidths: [5, 32, 18, 18, 62],
    rows: [
      line('a', 'Doanh thu', m.revenue, rev, basisOr(ctx, 'revenue', '')),
      line('b', 'Tổng chi phí', m.costs.total, c.total,
        basisOr(ctx, 'cogs', shareOfRevenueText(c.total, rev)), 'dam'),
      line('b1', 'Chi phí 1: Chi phí giá vốn', m.costs.cogs, c.cogs,
        shareOfRevenueText(c.cogs, rev), 'nghieng'),
      line('b2', 'Chi phí 2: Chi phí nhân công', m.costs.staff, c.staff,
        basisOr(ctx, 'staff', ''), 'nghieng'),
      line('b3', 'Chi phí 3: Chi phí thuê mặt bằng', m.costs.premises, c.premises,
        basisOr(ctx, 'premises', ''), 'nghieng'),
      line('b4', 'Chi phí 4: Chi phí điện nước', m.costs.utilities, c.utilities,
        basisOr(ctx, 'utilities', ''), 'nghieng'),
      line('b5', 'Chi phí 5: Chi phí lãi vay', m.costs.interest, c.interest,
        basisOr(ctx, 'interest', shareOfRevenueText(c.interest, rev)), 'nghieng'),
      line('b6', 'Chi phí 6: Chi phí khác', m.costs.depreciation, c.depreciation,
        basisOr(ctx, 'depreciation', shareOfRevenueText(c.depreciation, rev)), 'nghieng'),
      line('b7', 'Chi phí 7:…', m.costs.other, c.other,
        basisOr(ctx, 'other', shareOfRevenueText(c.other, rev)), 'nghieng'),
      line('c', 'Lợi nhuận', m.profitBeforeTax, p.profitBeforeTax,
        basisOr(ctx, 'profit', shareOfRevenueText(p.profitBeforeTax, rev)), 'dam'),
      line('d', 'Thuế (nếu có)', m.tax, p.tax, basisOr(ctx, 'tax', '')),
      line('e', 'Lợi nhuận sau thuế', m.profitAfterTax, p.profitAfterTax,
        shareOfRevenueText(p.profitAfterTax, rev), 'dam'),
    ],
  };
}

function changeOf(actual: number, plan: number): number {
  if (!actual) return 0;
  return (plan - actual) / actual;
}

export function buildCreditLimitSheet(r: BusinessPlanResult, ctx: ExportContext): ExportSheet {
  if (!r.limit) throw new Error('Hồ sơ vay từng lần không có phụ lục cấp hạn mức.');

  const a = r.actual;
  const p = r.plan;
  const la = r.limit.actual;
  const lp = r.limit.plan;

  const row = (
    so: number, name: string, unit: string, actual: number, plan: number,
    showChange = true, bold = false
  ): ExportRow => [
    stt(so), bold ? label(name) : text(name), text(unit, 'center'),
    millions(actual, bold), millions(plan, bold),
    showChange ? percent(changeOf(actual, plan)) : text(''),
  ];

  const group = (ky: string, name: string): ExportRow => [
    { text: ky, align: 'center', bold: true }, label(name),
    text(''), text(''), text(''), text(''),
  ];

  return {
    fileBase: 'CapHanMucTinDung',
    colWidths: [5, 46, 7, 20, 20, 12],
    header: ['STT', 'Khoảng mục', 'Đvt',
      `Kỳ thực hiện năm ${ctx.actualYear}`, `Năm kế hoạch ${ctx.planYear}`, 'Tăng/giảm\u00a0'],
    rows: [
      group('b', 'Phương án kết quả kinh doanh'),
      row(1, 'Doanh thu thuần (DTT)', 'trđ', a.revenueAnnual, p.revenueAnnual),
      row(2, 'Giá vốn hàng bán', 'trđ', a.costs.cogs, p.costs.cogs),
      row(3, 'Khấu hao', 'trđ', a.costs.depreciation, p.costs.depreciation),
      row(4, 'Lãi vay (các khoản vay tài trợ cho SXKD)', 'trđ', a.costs.interest, p.costs.interest),
      row(5, 'Lợi nhuận trước thuế (LNTT)', 'trđ', a.profitBeforeTax, p.profitBeforeTax),
      row(6, 'Lợi nhuận sau thuế (LNST)', 'trđ', a.profitAfterTax, p.profitAfterTax),
      row(7, 'Tài sản lưu động ', 'trđ', a.currentAssets, p.currentAssets),
      group('c', 'Tính toán nhu cầu cấp tín dụng'),
      row(1, 'Tổng nhu cầu vốn bằng tiền (c1 = b1 - b3 - b4 - b5)', 'trđ',
        la.cashNeed, lp.cashNeed, false),
      [stt(2), text('Vòng quay vốn lưu động (c2 = b1 / b7)'), text('vòng', 'center'),
        ratio(la.turnover), ratio(lp.turnover), text('')],
      row(3, 'Nhu cầu vốn lưu động bình quân 1 vòng (c3 = c1/c2)', 'trđ',
        la.avgWorkingCapitalNeed, lp.avgWorkingCapitalNeed, false, true),
      row(4, 'Đề nghị cấp HMTD tại Vietbank', 'trđ', la.requested, lp.requested, false, true),
    ],
  };
}

export function buildBusinessPlanSheets(
  input: BusinessPlanInput, r: BusinessPlanResult, ctx: ExportContext
): ExportSheet[] {
  const sheets = [
    buildFinancialPositionSheet(input, r, ctx),
    buildIncomeStatementSheet(r, ctx),
  ];
  if (input.kind === 'limit') sheets.push(buildCreditLimitSheet(r, ctx));
  return sheets;
}

export function sheetToXlsxModel(sheet: ExportSheet): XlsxSheet {
  return {
    name: sheet.fileBase,
    colWidths: sheet.colWidths,
    rows: [
      sheet.header.map(h => ({
        value: h,
        style: {
          bold: true, align: 'center' as const, vAlign: 'center' as const,
          wrap: true, fill: HEADER_FILL,
        },
      })),
      ...sheet.rows.map(row => row.map(cell => ({
        value: cell.numeric ? Number(cell.text) : cell.text,
        numeric: cell.numeric,
        style: {
          bold: cell.bold,
          italic: cell.italic,
          align: cell.align,
          vAlign: 'center' as const,
          wrap: cell.wrap,
          numFmt: cell.numFormat,
        },
      }))),
    ],
  };
}

export function sheetToXlsx(sheet: ExportSheet): Uint8Array {
  return buildXlsx(sheetToXlsxModel(sheet));
}
