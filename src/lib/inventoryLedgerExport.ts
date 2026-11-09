import { buildMultiSheetXlsx, buildXlsx, columnLetter, escapeXml, type XlsxCell, type XlsxSheet, type XlsxStyle } from './xlsxWriter';
import { computeItemRow, computeInventorySummary, type InventoryItem } from './inventory';
import { computeReceivableItemRow, computeReceivableSummary, type ReceivableItem } from './debt';
import { NUM_FMT_ACCOUNTING } from './reports/sheetStyles';
import { fmtDate, todayIso } from './utils';

export type InventoryLedgerTab = 'inventory' | 'receivables' | 'payables';

export const INVENTORY_LEDGER_TABS: readonly InventoryLedgerTab[] = ['inventory', 'receivables', 'payables'];

export interface InventoryLedgerData {
  items: InventoryItem[];
  receivables: ReceivableItem[];
  payables: ReceivableItem[];
}

export interface InventoryExportContext {
  customerName?: string;
  recordDate?: string;
  categoryName: string;
}

export const INVENTORY_LEDGER_TITLES: Record<InventoryLedgerTab, string> = {
  inventory: 'BẢNG KIỂM KÊ VÀ ĐỊNH GIÁ HÀNG TỒN KHO',
  receivables: 'BẢNG TỔNG HỢP CÔNG NỢ PHẢI THU',
  payables: 'BẢNG TỔNG HỢP CÔNG NỢ PHẢI TRẢ',
};

const SHEET_NAMES: Record<InventoryLedgerTab, string> = {
  inventory: 'HÀNG TỒN KHO',
  receivables: 'CÔNG NỢ PHẢI THU',
  payables: 'CÔNG NỢ PHẢI TRẢ',
};

const FILE_SLUGS: Record<InventoryLedgerTab, string> = {
  inventory: 'Kiem_Ke_HTK',
  receivables: 'Cong_No_Phai_Thu',
  payables: 'Cong_No_Phai_Tra',
};

const DEBT_PARTY_LABELS: Record<Exclude<InventoryLedgerTab, 'inventory'>, { code: string; name: string; count: string }> = {
  receivables: { code: 'Mã khách hàng', name: 'Tên khách hàng', count: 'khách hàng' },
  payables: { code: 'Mã nhà cung cấp', name: 'Tên nhà cung cấp', count: 'nhà cung cấp' },
};

const HEADER_FILL = 'F1F5F9';
const TOTAL_FILL = 'E2E8F0';
const HEADER_ROW_1 = 4;
const FIRST_DATA_ROW = 6;

const ST = {
  title: { bold: true, align: 'center', vAlign: 'center' } satisfies XlsxStyle,
  subtitle: { italic: true, align: 'center' } satisfies XlsxStyle,
  header: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL, border: true, wrap: true } satisfies XlsxStyle,
  code: { bold: true, align: 'center', border: true } satisfies XlsxStyle,
  text: { align: 'left', border: true } satisfies XlsxStyle,
  center: { align: 'center', border: true } satisfies XlsxStyle,
  number: { align: 'right', numFmt: NUM_FMT_ACCOUNTING, border: true } satisfies XlsxStyle,
  numberStrong: { bold: true, align: 'right', numFmt: NUM_FMT_ACCOUNTING, border: true } satisfies XlsxStyle,
  totalLabel: { bold: true, align: 'center', fill: TOTAL_FILL, border: true } satisfies XlsxStyle,
  totalText: { bold: true, align: 'left', fill: TOTAL_FILL, border: true } satisfies XlsxStyle,
  totalNumber: { bold: true, align: 'right', numFmt: NUM_FMT_ACCOUNTING, fill: TOTAL_FILL, border: true } satisfies XlsxStyle,
};

function recordDateText(ctx: InventoryExportContext): string {
  return fmtDate(ctx.recordDate || todayIso());
}

function subtitleText(ctx: InventoryExportContext, dateLabel: string): string {
  return [
    ctx.customerName ? `Khách hàng: ${ctx.customerName}` : '',
    `${dateLabel}: ${recordDateText(ctx)}`,
  ].filter(Boolean).join(' | ');
}

function formulaCell(formula: string, value: number, style: XlsxStyle = ST.number): XlsxCell {
  return { value, numeric: true, formula, style };
}

function numberCell(value: number, style: XlsxStyle = ST.number): XlsxCell {
  return { value, numeric: true, style };
}

function sumCell(col: number, lastDataRow: number, value: number): XlsxCell {
  const letter = columnLetter(col);
  const formula = lastDataRow >= FIRST_DATA_ROW ? `SUM(${letter}${FIRST_DATA_ROW}:${letter}${lastDataRow})` : '0';
  return formulaCell(formula, value, ST.totalNumber);
}

function headerBlock(width: number, title: string, subtitle: string, groups: { label: string; span: number }[], subLabels: string[]) {
  const lastCol = columnLetter(width - 1);
  const rows: XlsxCell[][] = [
    [{ value: title, style: ST.title }],
    [{ value: subtitle, style: ST.subtitle }],
    [],
  ];
  const merges = [`A1:${lastCol}1`, `A2:${lastCol}2`];
  const row1: XlsxCell[] = [];
  const row2: XlsxCell[] = [];
  let col = 0;
  for (const group of groups) {
    const from = columnLetter(col);
    const to = columnLetter(col + group.span - 1);
    if (group.span === 1) {
      merges.push(`${from}${HEADER_ROW_1}:${from}${HEADER_ROW_1 + 1}`);
      row1.push({ value: group.label, style: ST.header });
      row2.push({ value: '', style: ST.header });
    } else {
      merges.push(`${from}${HEADER_ROW_1}:${to}${HEADER_ROW_1}`);
      row1.push({ value: group.label, style: ST.header });
      for (let i = 1; i < group.span; i++) row1.push({ value: '', style: ST.header });
      for (let i = 0; i < group.span; i++) row2.push({ value: subLabels.shift() ?? '', style: ST.header });
    }
    col += group.span;
  }
  rows.push(row1, row2);
  return { rows, merges };
}

export function buildInventorySheet(items: InventoryItem[], ctx: InventoryExportContext): XlsxSheet {
  const summary = computeInventorySummary(items);
  const { rows, merges } = headerBlock(
    12,
    INVENTORY_LEDGER_TITLES.inventory,
    subtitleText(ctx, 'Ngày kiểm kê'),
    [
      { label: 'Mã hàng', span: 1 },
      { label: 'Tên sản phẩm', span: 1 },
      { label: 'ĐVT', span: 1 },
      { label: 'Đơn giá (VND)', span: 1 },
      { label: 'ĐẦU KỲ', span: 2 },
      { label: 'NHẬP KHO', span: 2 },
      { label: 'XUẤT KHO', span: 2 },
      { label: 'CUỐI KỲ', span: 2 },
    ],
    ['Số lượng', 'Giá trị (VND)', 'Số lượng', 'Giá trị (VND)', 'Số lượng', 'Giá trị (VND)', 'Số lượng', 'Giá trị (VND)'],
  );

  items.forEach((raw, index) => {
    const r = computeItemRow(raw);
    const n = FIRST_DATA_ROW + index;
    rows.push([
      { value: r.code, style: ST.code },
      { value: r.name, style: ST.text },
      { value: r.unit, style: ST.center },
      numberCell(r.unitPrice),
      numberCell(r.beginningQty),
      formulaCell(`E${n}*D${n}`, r.beginningValue),
      numberCell(r.importQty),
      formulaCell(`G${n}*D${n}`, r.importValue),
      numberCell(r.exportQty),
      formulaCell(`I${n}*D${n}`, r.exportValue),
      formulaCell(`E${n}+G${n}-I${n}`, r.endingQty, ST.numberStrong),
      formulaCell(`K${n}*D${n}`, r.endingValue, ST.numberStrong),
    ]);
  });

  const lastDataRow = FIRST_DATA_ROW + items.length - 1;
  const totalRow = rows.length + 1;
  merges.push(`A${totalRow}:B${totalRow}`);
  rows.push([
    { value: 'TỔNG CỘNG', style: ST.totalLabel },
    { value: '', style: ST.totalLabel },
    { value: `${summary.totalItems} mặt hàng`, style: ST.totalText },
    { value: '', style: ST.totalNumber },
    sumCell(4, lastDataRow, summary.totalBeginningQty),
    sumCell(5, lastDataRow, summary.totalBeginningValue),
    sumCell(6, lastDataRow, summary.totalImportQty),
    sumCell(7, lastDataRow, summary.totalImportValue),
    sumCell(8, lastDataRow, summary.totalExportQty),
    sumCell(9, lastDataRow, summary.totalExportValue),
    sumCell(10, lastDataRow, summary.totalEndingQty),
    sumCell(11, lastDataRow, summary.totalEndingValue),
  ]);

  return {
    name: SHEET_NAMES.inventory,
    rows,
    merges,
    colWidths: [12, 34, 9, 15, 12, 18, 12, 18, 12, 18, 12, 20],
  };
}

export function buildDebtSheet(
  debts: ReceivableItem[],
  ctx: InventoryExportContext,
  tab: Exclude<InventoryLedgerTab, 'inventory'>,
): XlsxSheet {
  const summary = computeReceivableSummary(debts);
  const party = DEBT_PARTY_LABELS[tab];
  const { rows, merges } = headerBlock(
    8,
    INVENTORY_LEDGER_TITLES[tab],
    subtitleText(ctx, 'Ngày đối soát'),
    [
      { label: party.code, span: 1 },
      { label: party.name, span: 1 },
      { label: 'SỐ DƯ ĐẦU KỲ', span: 2 },
      { label: 'PHÁT SINH TRONG KỲ', span: 2 },
      { label: 'SỐ DƯ CUỐI KỲ', span: 2 },
    ],
    ['Nợ (VND)', 'Có (VND)', 'Nợ (VND)', 'Có (VND)', 'Nợ (VND)', 'Có (VND)'],
  );

  debts.forEach((raw, index) => {
    const c = computeReceivableItemRow(raw);
    const n = FIRST_DATA_ROW + index;
    rows.push([
      { value: c.code, style: ST.code },
      { value: c.name, style: ST.text },
      numberCell(c.beginningDebit),
      numberCell(c.beginningCredit),
      numberCell(c.occurredDebit),
      numberCell(c.occurredCredit),
      formulaCell(`MAX(0,C${n}-D${n}+E${n}-F${n})`, c.endingDebit, ST.numberStrong),
      formulaCell(`MAX(0,D${n}-C${n}+F${n}-E${n})`, c.endingCredit, ST.numberStrong),
    ]);
  });

  const lastDataRow = FIRST_DATA_ROW + debts.length - 1;
  rows.push([
    { value: 'TỔNG CỘNG', style: ST.totalLabel },
    { value: `${summary.totalItems} ${party.count}`, style: ST.totalText },
    sumCell(2, lastDataRow, summary.totalBeginningDebit),
    sumCell(3, lastDataRow, summary.totalBeginningCredit),
    sumCell(4, lastDataRow, summary.totalOccurredDebit),
    sumCell(5, lastDataRow, summary.totalOccurredCredit),
    sumCell(6, lastDataRow, summary.totalEndingDebit),
    sumCell(7, lastDataRow, summary.totalEndingCredit),
  ]);

  return {
    name: SHEET_NAMES[tab],
    rows,
    merges,
    colWidths: [16, 40, 18, 18, 18, 18, 20, 20],
  };
}

export function buildInventoryLedgerSheet(tab: InventoryLedgerTab, data: InventoryLedgerData, ctx: InventoryExportContext): XlsxSheet {
  if (tab === 'inventory') return buildInventorySheet(data.items, ctx);
  return buildDebtSheet(tab === 'receivables' ? data.receivables : data.payables, ctx, tab);
}

export function buildInventoryLedgerTabXlsx(tab: InventoryLedgerTab, data: InventoryLedgerData, ctx: InventoryExportContext): Uint8Array {
  return buildXlsx(buildInventoryLedgerSheet(tab, data, ctx));
}

export function buildInventoryLedgerWorkbookXlsx(data: InventoryLedgerData, ctx: InventoryExportContext): Uint8Array {
  return buildMultiSheetXlsx(INVENTORY_LEDGER_TABS.map(tab => buildInventoryLedgerSheet(tab, data, ctx)));
}

export function inventoryLedgerFileName(tab: InventoryLedgerTab | 'all', ctx: InventoryExportContext, ext: 'xlsx'): string {
  const slug = tab === 'all' ? 'Kiem_Ke_HTK_Va_Cong_No' : FILE_SLUGS[tab];
  const category = tab === 'inventory' || tab === 'all' ? `_${ctx.categoryName.trim().replace(/\s+/g, '_')}` : '';
  return `${slug}${category}_${ctx.recordDate || todayIso()}.${ext}`;
}

function htmlNumber(value: number): string {
  if (!value) return '-';
  const text = Math.abs(value).toLocaleString('vi-VN');
  return value < 0 ? `(${text})` : text;
}

const esc = (value: string) => escapeXml(value ?? '');

function numTd(value: number, strong = false): string {
  return `<td class="num${strong ? ' strong' : ''}">${htmlNumber(value)}</td>`;
}

function inventoryTableHtml(items: InventoryItem[]): string {
  const summary = computeInventorySummary(items);
  const body = items.map(raw => {
    const r = computeItemRow(raw);
    return `<tr>
      <td class="center strong">${esc(r.code)}</td>
      <td>${esc(r.name)}</td>
      <td class="center">${esc(r.unit)}</td>
      ${numTd(r.unitPrice)}
      ${numTd(r.beginningQty)}${numTd(r.beginningValue)}
      ${numTd(r.importQty)}${numTd(r.importValue)}
      ${numTd(r.exportQty)}${numTd(r.exportValue)}
      ${numTd(r.endingQty, true)}${numTd(r.endingValue, true)}
    </tr>`;
  }).join('');
  return `<table>
    <colgroup>
      <col style="width:6%"><col style="width:23%"><col style="width:4.5%"><col style="width:8%">
      <col style="width:5.5%"><col style="width:9%"><col style="width:5.5%"><col style="width:9%">
      <col style="width:5.5%"><col style="width:9%"><col style="width:5.5%"><col style="width:9.5%">
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">Mã hàng</th><th rowspan="2">Tên sản phẩm</th><th rowspan="2">ĐVT</th><th rowspan="2">Đơn giá (VND)</th>
        <th colspan="2">ĐẦU KỲ</th><th colspan="2">NHẬP KHO</th><th colspan="2">XUẤT KHO</th><th colspan="2">CUỐI KỲ</th>
      </tr>
      <tr>
        <th>Số lượng</th><th>Giá trị (VND)</th><th>Số lượng</th><th>Giá trị (VND)</th>
        <th>Số lượng</th><th>Giá trị (VND)</th><th>Số lượng</th><th>Giá trị (VND)</th>
      </tr>
    </thead>
    <tbody>
      ${body}
      <tr class="total">
        <td colspan="2" class="center">TỔNG CỘNG</td>
        <td colspan="2">${summary.totalItems} mặt hàng</td>
        ${numTd(summary.totalBeginningQty)}${numTd(summary.totalBeginningValue)}
        ${numTd(summary.totalImportQty)}${numTd(summary.totalImportValue)}
        ${numTd(summary.totalExportQty)}${numTd(summary.totalExportValue)}
        ${numTd(summary.totalEndingQty)}${numTd(summary.totalEndingValue)}
      </tr>
    </tbody>
  </table>`;
}

function debtTableHtml(debts: ReceivableItem[], tab: Exclude<InventoryLedgerTab, 'inventory'>): string {
  const summary = computeReceivableSummary(debts);
  const party = DEBT_PARTY_LABELS[tab];
  const body = debts.map(raw => {
    const c = computeReceivableItemRow(raw);
    return `<tr>
      <td class="center strong">${esc(c.code)}</td>
      <td>${esc(c.name)}</td>
      ${numTd(c.beginningDebit)}${numTd(c.beginningCredit)}
      ${numTd(c.occurredDebit)}${numTd(c.occurredCredit)}
      ${numTd(c.endingDebit, true)}${numTd(c.endingCredit, true)}
    </tr>`;
  }).join('');
  return `<table>
    <colgroup>
      <col style="width:10%"><col style="width:24%">
      <col style="width:11%"><col style="width:11%"><col style="width:11%"><col style="width:11%"><col style="width:11%"><col style="width:11%">
    </colgroup>
    <thead>
      <tr>
        <th rowspan="2">${party.code}</th><th rowspan="2">${party.name}</th>
        <th colspan="2">SỐ DƯ ĐẦU KỲ</th><th colspan="2">PHÁT SINH TRONG KỲ</th><th colspan="2">SỐ DƯ CUỐI KỲ</th>
      </tr>
      <tr><th>Nợ (VND)</th><th>Có (VND)</th><th>Nợ (VND)</th><th>Có (VND)</th><th>Nợ (VND)</th><th>Có (VND)</th></tr>
    </thead>
    <tbody>
      ${body}
      <tr class="total">
        <td class="center">TỔNG CỘNG</td>
        <td>${summary.totalItems} ${party.count}</td>
        ${numTd(summary.totalBeginningDebit)}${numTd(summary.totalBeginningCredit)}
        ${numTd(summary.totalOccurredDebit)}${numTd(summary.totalOccurredCredit)}
        ${numTd(summary.totalEndingDebit)}${numTd(summary.totalEndingCredit)}
      </tr>
    </tbody>
  </table>`;
}

export function buildInventoryLedgerDocHtml(tab: InventoryLedgerTab, data: InventoryLedgerData, ctx: InventoryExportContext): string {
  const orientation = tab === 'inventory' ? 'landscape' : 'portrait';
  const table = tab === 'inventory'
    ? inventoryTableHtml(data.items)
    : debtTableHtml(tab === 'receivables' ? data.receivables : data.payables, tab);
  const dateLabel = tab === 'inventory' ? 'Ngày kiểm kê' : 'Ngày đối soát';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title></title>
  <style>
    @page { size: A4 ${orientation}; margin: 12mm 15mm; }
    @media print { html, body { margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
    body { font-family: "Times New Roman", Times, serif; font-size: 9pt; color: #000; margin: 0; }
    .title { text-align: center; font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 0 0 4px; }
    .meta { text-align: center; font-size: 10pt; margin-bottom: 8px; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    thead { display: table-header-group; }
    tr { page-break-inside: avoid; break-inside: avoid; }
    th, td { border: 1px solid #000; padding: 3px 4px; vertical-align: middle; overflow-wrap: anywhere; }
    th { background: #f1f5f9; font-weight: bold; text-align: center; font-size: 8.5pt; }
    td.num { text-align: right; white-space: nowrap; font-variant-numeric: tabular-nums; }
    td.center { text-align: center; }
    .strong { font-weight: bold; }
    tr.total td { background: #e2e8f0; font-weight: bold; }
    .signature { display: flex; justify-content: flex-end; margin-top: 18px; page-break-inside: avoid; break-inside: avoid; }
    .sig-box { width: 40%; text-align: center; }
    .sig-title { font-weight: bold; text-transform: uppercase; }
    .sig-note { font-style: italic; font-size: 8.5pt; }
    .sig-space { height: 60px; }
  </style>
</head>
<body>
  <div class="title">${INVENTORY_LEDGER_TITLES[tab]}</div>
  <div class="meta">${ctx.customerName ? `<strong>Khách hàng:</strong> ${esc(ctx.customerName)} | ` : ''}<strong>${dateLabel}:</strong> ${recordDateText(ctx)}</div>
  ${table}
  <div class="signature">
    <div class="sig-box">
      <div class="sig-title">Người lập bảng</div>
      <div class="sig-note">(Ký và ghi rõ họ tên)</div>
      <div class="sig-space"></div>
    </div>
  </div>
</body>
</html>`;
}
