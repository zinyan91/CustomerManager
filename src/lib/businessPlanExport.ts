import type { BusinessPlanInput, BusinessPlanResult } from './businessPlan';

export type CellAlign = 'left' | 'center' | 'right';

export interface ExportCell {
  text: string;
  align?: CellAlign;
  bold?: boolean;
  numFormat?: string;
}

export type ExportRow = ExportCell[];

export interface ExportSheet {
  fileBase: string;
  header: string[];
  rows: ExportRow[];
}

export interface ExportContext {
  customerCif: string;
  balanceSheetDate: string;
  actualYear: number;
  planYear: number;
  basis?: Partial<Record<BasisKey, string | null>>;
}

export type BasisKey =
  | 'revenue' | 'cogs' | 'staff' | 'premises' | 'utilities'
  | 'interest' | 'depreciation' | 'other' | 'tax' | 'profit';

const FMT_MONEY = '#,##0';
const FMT_ONE_DECIMAL = '#,##0.0';
const FMT_PERCENT = '0%';
const MILLION = 1_000_000;

function text(value: string, align: CellAlign = 'left'): ExportCell {
  return { text: value, align };
}

function label(value: string): ExportCell {
  return { text: value, align: 'left', bold: true };
}

function money(value: number, bold = false): ExportCell {
  return { text: String(Math.round(value)), align: 'right', bold, numFormat: FMT_MONEY };
}

function millions(value: number, bold = false): ExportCell {
  return { text: String(Math.round(value / MILLION * 100) / 100), align: 'right', bold, numFormat: FMT_MONEY };
}

function ratio(value: number): ExportCell {
  return { text: String(Math.round(value * 10) / 10), align: 'right', numFormat: FMT_ONE_DECIMAL };
}

function percent(value: number): ExportCell {
  return { text: String(Math.round(value * 10000) / 10000), align: 'right', numFormat: FMT_PERCENT };
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
    rows: [
      [text('1', 'center'), label('Tài sản ngắn hạn'), money(b.currentAssets, true),
        label('Nợ phải trả'), money(b.totalLiabilities, true)],
      [text('2', 'center'), text('Tiền, tương đương tiền'), money(s.cash),
        text('Nợ ngắn hạn'), money(s.shortTermDebt)],
      [text('3', 'center'), text('Hàng tồn kho'), money(s.inventory),
        text('…'), money(s.otherShortTermDebt)],
      [text('4', 'center'), text('Các khoản phải thu'), money(s.receivables),
        text('Nợ dài hạn'), money(s.longTermDebt)],
      [text('5', 'center'), text('Tài sản ngắn hạn khác'), money(s.otherCurrentAssets),
        text('…'), money(s.otherLongTermDebt)],
      [text('6', 'center'), label('Tài sản dài hạn'), money(b.longTermAssets, true),
        label('Vốn chủ sở hữu'), money(b.ownEquity, true)],
      [text('7', 'center'), text('Các khoản phải thu dài hạn'), money(s.longTermReceivables),
        text('Vốn góp'), money(0)],
      [text('8', 'center'), text('Tài sản cố định'), money(s.fixedAssets),
        text('Nguồn kinh phí & quỹ khác'), money(0)],
      [text('9', 'center'), text('Tài sản dài hạn khác'), money(s.otherLongTermAssets),
        text('…'), money(0)],
      [text('10', 'center'), label('Tổng tài sản'), money(b.totalAssets, true),
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
    stt: string, name: string, monthly: number, annual: number, basis: string, bold = false
  ): ExportRow => [
    text(stt, 'center'),
    bold ? label(name) : text(name),
    money(monthly, bold),
    money(annual, bold),
    text(basis),
  ];

  return {
    fileBase: 'KET QUA KINH DOANH',
    header: ['STT', 'Chỉ tiêu', 'Giá trị hàng tháng', 'Giá trị hàng năm', 'Cơ sở xác định'],
    rows: [
      line('a', 'Doanh thu', m.revenue, rev, basisOr(ctx, 'revenue', ''), true),
      line('b', 'Tổng chi phí', m.costs.total, c.total,
        basisOr(ctx, 'cogs', shareOfRevenueText(c.total, rev)), true),
      line('b1', 'Chi phí 1: Chi phí giá vốn', m.costs.cogs, c.cogs,
        shareOfRevenueText(c.cogs, rev)),
      line('b2', 'Chi phí 2: Chi phí nhân công', m.costs.staff, c.staff,
        basisOr(ctx, 'staff', '')),
      line('b3', 'Chi phí 3: Chi phí thuê mặt bằng', m.costs.premises, c.premises,
        basisOr(ctx, 'premises', '')),
      line('b4', 'Chi phí 4: Chi phí điện nước', m.costs.utilities, c.utilities,
        basisOr(ctx, 'utilities', '')),
      line('b5', 'Chi phí 5: Chi phí lãi vay', m.costs.interest, c.interest,
        basisOr(ctx, 'interest', shareOfRevenueText(c.interest, rev))),
      line('b6', 'Chi phí 6: Chi phí khác', m.costs.depreciation, c.depreciation,
        basisOr(ctx, 'depreciation', shareOfRevenueText(c.depreciation, rev))),
      line('b7', 'Chi phí 7:…', m.costs.other, c.other,
        basisOr(ctx, 'other', shareOfRevenueText(c.other, rev))),
      line('c', 'Lợi nhuận', m.profitBeforeTax, p.profitBeforeTax,
        basisOr(ctx, 'profit', shareOfRevenueText(p.profitBeforeTax, rev)), true),
      line('d', 'Thuế (nếu có)', m.tax, p.tax, basisOr(ctx, 'tax', '')),
      line('e', 'Lợi nhuận sau thuế', m.profitAfterTax, p.profitAfterTax,
        shareOfRevenueText(p.profitAfterTax, rev), true),
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
    stt: string, name: string, unit: string, actual: number, plan: number, showChange = true
  ): ExportRow => [
    text(stt, 'center'), text(name), text(unit, 'center'),
    millions(actual), millions(plan),
    showChange ? percent(changeOf(actual, plan)) : text(''),
  ];

  const group = (stt: string, name: string): ExportRow => [
    text(stt, 'center'), label(name), text(''), text(''), text(''), text(''),
  ];

  return {
    fileBase: 'CapHanMucTinDung',
    header: ['STT', 'Khoảng mục', 'Đvt',
      `Kỳ thực hiện năm ${ctx.actualYear}`, `Năm kế hoạch ${ctx.planYear}`, 'Tăng/giảm\u00a0'],
    rows: [
      group('b', 'Phương án kết quả kinh doanh'),
      row('1', 'Doanh thu thuần (DTT)', 'trđ', a.revenueAnnual, p.revenueAnnual),
      row('2', 'Giá vốn hàng bán', 'trđ', a.costs.cogs, p.costs.cogs),
      row('3', 'Khấu hao', 'trđ', a.costs.depreciation, p.costs.depreciation),
      row('4', 'Lãi vay (các khoản vay tài trợ cho SXKD)', 'trđ', a.costs.interest, p.costs.interest),
      row('5', 'Lợi nhuận trước thuế (LNTT)', 'trđ', a.profitBeforeTax, p.profitBeforeTax),
      row('6', 'Lợi nhuận sau thuế (LNST)', 'trđ', a.profitAfterTax, p.profitAfterTax),
      row('7', 'Tài sản lưu động ', 'trđ', a.currentAssets, p.currentAssets),
      group('c', 'Tính toán nhu cầu cấp tín dụng'),
      row('1', 'Tổng nhu cầu vốn bằng tiền (c1 = b1 - b3 - b4 - b5)', 'trđ',
        la.cashNeed, lp.cashNeed, false),
      [text('2', 'center'), text('Vòng quay vốn lưu động (c2 = b1 / b7)'), text('vòng', 'center'),
        ratio(la.turnover), ratio(lp.turnover), text('')],
      row('3', 'Nhu cầu vốn lưu động bình quân 1 vòng (c3 = c1/c2)', 'trđ',
        la.avgWorkingCapitalNeed, lp.avgWorkingCapitalNeed, false),
      row('4', 'Đề nghị cấp HMTD tại Vietbank', 'trđ', la.requested, lp.requested, false),
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

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function cellHtml(cell: ExportCell): string {
  const styles = [`text-align:${cell.align || 'left'}`];
  if (cell.bold) styles.push('font-weight:bold');
  if (cell.numFormat) styles.push(`mso-number-format:'${cell.numFormat}'`);
  return `<td style="${styles.join(';')}">${escapeHtml(cell.text)}</td>`;
}

export function sheetToXlsHtml(sheet: ExportSheet): string {
  const header = sheet.header.map(h => `<th>${escapeHtml(h)}</th>`).join('');
  const body = sheet.rows
    .map(row => `<tr>${row.map(cellHtml).join('')}</tr>`)
    .join('');

  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"/>
<style>
  table { border-collapse: collapse; }
  td, th { border: 1px solid #94a3b8; padding: 6px 8px; font-family: Arial, sans-serif; font-size: 11pt; }
  th { background-color: #e2e8f0; font-weight: bold; text-align: center; }
</style></head>
<body>
<table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table>
</body></html>`;
}
