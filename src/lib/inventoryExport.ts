import { buildMultiSheetXlsx, buildXlsx, type XlsxCell, type XlsxSheet } from './xlsxWriter';
import { computeItemRow, computeInventorySummary, type InventoryItem } from './inventory';
import { computeReceivableItemRow, computeReceivableSummary, type ReceivableItem } from './debt';
import { fmtDate, todayIso } from './utils';

export interface InventoryExportContext {
  customerName?: string;
  recordDate?: string;
  categoryName: string;
}

const HEADER_FILL = 'DCE6F1';
const HEADER_CUOI_KY_FILL = 'DCFCE7';
const FOOTER_FILL = 'E0F2FE';
const FOOTER_CUOI_KY_FILL = 'BBF7D0';
const CELL_CUOI_KY_FILL = 'F0FDF4';

export function buildInventorySheet(
  items: InventoryItem[],
  ctx: InventoryExportContext
): XlsxSheet {
  const summary = computeInventorySummary(items);
  const xlsxRows: XlsxCell[][] = [];

  // Title Row
  xlsxRows.push([
    {
      value: 'BẢNG KIỂM KÊ VÀ ĐỊNH GIÁ HÀNG TỒN KHO',
      style: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL },
    },
  ]);

  // Subtitle
  const subText = [
    ctx.customerName ? `Khách hàng: ${ctx.customerName}` : '',
    `Ngày kiểm kê: ${fmtDate(ctx.recordDate || todayIso())}`,
  ].filter(Boolean).join(' | ');

  xlsxRows.push([{ value: subText, style: { italic: true, align: 'center' } }]);
  xlsxRows.push([]);

  // Table Header Row 1
  xlsxRows.push([
    { value: 'Mã hàng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Tên sản phẩm', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'ĐVT', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'ĐẦU KỲ', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
    { value: 'NHẬP KHO', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
    { value: 'XUẤT KHO', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
    { value: 'CUỐI KỲ', style: { bold: true, align: 'center', fill: HEADER_CUOI_KY_FILL } },
    { value: '', style: { fill: HEADER_CUOI_KY_FILL } },
  ]);

  // Table Header Row 2
  xlsxRows.push([
    { value: '', style: { fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
    { value: 'Số lượng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Giá trị (VND)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Số lượng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Giá trị (VND)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Số lượng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Giá trị (VND)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Số lượng', style: { bold: true, align: 'center', fill: HEADER_CUOI_KY_FILL } },
    { value: 'Giá trị (VND)', style: { bold: true, align: 'center', fill: HEADER_CUOI_KY_FILL } },
  ]);

  // Summary Row (TỔNG CỘNG)
  xlsxRows.push([
    { value: 'TỔNG CỘNG', style: { bold: true, align: 'center', fill: FOOTER_FILL } },
    { value: `${summary.totalItems} mặt hàng`, style: { bold: true, align: 'left', fill: FOOTER_FILL } },
    { value: '', style: { fill: FOOTER_FILL } },
    { value: summary.totalBeginningQty, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalBeginningValue, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalImportQty, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalImportValue, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalExportQty, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalExportValue, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalEndingQty, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_CUOI_KY_FILL } },
    { value: summary.totalEndingValue, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_CUOI_KY_FILL } },
  ]);

  // Item Data Rows
  items.forEach(rawItem => {
    const r = computeItemRow(rawItem);
    xlsxRows.push([
      { value: r.code, style: { bold: true, align: 'center' } },
      { value: r.name, style: { align: 'left' } },
      { value: r.unit, style: { align: 'center' } },
      { value: r.beginningQty, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: r.beginningValue, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: r.importQty, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: r.importValue, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: r.exportQty, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: r.exportValue, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: r.endingQty, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: CELL_CUOI_KY_FILL } },
      { value: r.endingValue, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: CELL_CUOI_KY_FILL } },
    ]);
  });

  return {
    name: 'HÀNG TỒN KHO',
    rows: xlsxRows,
    colWidths: [14, 32, 10, 14, 18, 14, 18, 14, 18, 16, 20],
  };
}

export function buildReceivableSheet(
  receivables: ReceivableItem[],
  ctx: InventoryExportContext
): XlsxSheet {
  const summary = computeReceivableSummary(receivables);
  const xlsxRows: XlsxCell[][] = [];

  xlsxRows.push([
    {
      value: 'BẢNG TỔNG HỢP CÔNG NỢ PHẢI THU (TK 131)',
      style: { bold: true, align: 'center', vAlign: 'center', fill: HEADER_FILL },
    },
  ]);

  const subText = [
    ctx.customerName ? `Khách hàng: ${ctx.customerName}` : '',
    `Ngày đối soát: ${fmtDate(ctx.recordDate || todayIso())}`,
  ].filter(Boolean).join(' | ');

  xlsxRows.push([{ value: subText, style: { italic: true, align: 'center' } }]);
  xlsxRows.push([]);

  // Header Row 1
  xlsxRows.push([
    { value: 'Mã khách hàng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Tên khách hàng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'SỐ DƯ ĐẦU KỲ', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
    { value: 'PHÁT SINH TRONG KỲ', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
    { value: 'SỐ DƯ CUỐI KỲ', style: { bold: true, align: 'center', fill: HEADER_CUOI_KY_FILL } },
    { value: '', style: { fill: HEADER_CUOI_KY_FILL } },
  ]);

  // Header Row 2
  xlsxRows.push([
    { value: '', style: { fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
    { value: 'Nợ (VND)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Có (VND)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Nợ (VND)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Có (VND)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Nợ (VND)', style: { bold: true, align: 'center', fill: HEADER_CUOI_KY_FILL } },
    { value: 'Có (VND)', style: { bold: true, align: 'center', fill: HEADER_CUOI_KY_FILL } },
  ]);

  // Summary Row
  xlsxRows.push([
    { value: 'TỔNG CỘNG', style: { bold: true, align: 'center', fill: FOOTER_FILL } },
    { value: `${summary.totalItems} khách hàng`, style: { bold: true, align: 'left', fill: FOOTER_FILL } },
    { value: summary.totalBeginningDebit, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalBeginningCredit, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalOccurredDebit, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalOccurredCredit, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalEndingDebit, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_CUOI_KY_FILL } },
    { value: summary.totalEndingCredit, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_CUOI_KY_FILL } },
  ]);

  receivables.forEach(it => {
    const c = computeReceivableItemRow(it);
    xlsxRows.push([
      { value: c.code, style: { bold: true, align: 'center' } },
      { value: c.name, style: { align: 'left' } },
      { value: c.beginningDebit, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: c.beginningCredit, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: c.occurredDebit, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: c.occurredCredit, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: c.endingDebit, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: CELL_CUOI_KY_FILL } },
      { value: c.endingCredit, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: CELL_CUOI_KY_FILL } },
    ]);
  });

  return {
    name: 'CÔNG NỢ PHẢI THU',
    rows: xlsxRows,
    colWidths: [18, 36, 18, 18, 18, 18, 20, 20],
  };
}

export function buildInventoryXlsx(
  items: InventoryItem[],
  ctx: InventoryExportContext
): Uint8Array {
  const sheet = buildInventorySheet(items, ctx);
  return buildXlsx(sheet);
}

export function buildFullInventoryAndDebtXlsx(
  items: InventoryItem[],
  receivables: ReceivableItem[],
  ctx: InventoryExportContext
): Uint8Array {
  const invSheet = buildInventorySheet(items, ctx);
  const recSheet = buildReceivableSheet(receivables, ctx);
  return buildMultiSheetXlsx([invSheet, recSheet]);
}

export function buildInventoryDocHtml(
  items: InventoryItem[],
  ctx: InventoryExportContext,
  receivables?: ReceivableItem[]
): string {
  const summary = computeInventorySummary(items);
  const recSummary = receivables ? computeReceivableSummary(receivables) : null;

  const rowsHtml = items.map(rawItem => {
    const r = computeItemRow(rawItem);
    return `
      <tr>
        <td class="text-center font-bold">${r.code}</td>
        <td>${r.name}</td>
        <td class="text-center">${r.unit}</td>
        <td class="text-right font-mono">${r.beginningQty.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${r.beginningValue.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${r.importQty.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${r.importValue.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${r.exportQty.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${r.exportValue.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono font-bold bg-pos-cell">${r.endingQty.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono font-bold bg-pos-cell">${r.endingValue.toLocaleString('vi-VN')}</td>
      </tr>
    `;
  }).join('');

  let recSectionHtml = '';
  if (receivables && recSummary) {
    const recRows = receivables.map(it => {
      const c = computeReceivableItemRow(it);
      return `
        <tr>
          <td class="text-center font-bold">${c.code}</td>
          <td>${c.name}</td>
          <td class="text-right font-mono">${c.beginningDebit.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono">${c.beginningCredit.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono">${c.occurredDebit.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono">${c.occurredCredit.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono font-bold bg-pos-cell">${c.endingDebit.toLocaleString('vi-VN')}</td>
          <td class="text-right font-mono font-bold bg-pos-cell">${c.endingCredit.toLocaleString('vi-VN')}</td>
        </tr>
      `;
    }).join('');

    recSectionHtml = `
      <div style="page-break-before: always;"></div>
      <div class="header-title">BẢNG TỔNG HỢP CÔNG NỢ PHẢI THU (TK 131)</div>
      <div class="meta-line">
        ${ctx.customerName ? `<strong>Khách hàng:</strong> ${ctx.customerName} | ` : ''}<strong>Ngày kiểm kê:</strong> ${fmtDate(ctx.recordDate || todayIso())}
      </div>
      <table>
        <thead>
          <tr>
            <th rowspan="2">Mã KH</th>
            <th rowspan="2">Tên khách hàng</th>
            <th colspan="2">SỐ DƯ ĐẦU KỲ</th>
            <th colspan="2">PHÁT SINH TRONG KỲ</th>
            <th colspan="2" class="th-cuoi-ky">SỐ DƯ CUỐI KỲ</th>
          </tr>
          <tr>
            <th>Nợ (VND)</th>
            <th>Có (VND)</th>
            <th>Nợ (VND)</th>
            <th>Có (VND)</th>
            <th class="th-cuoi-ky">Nợ (VND)</th>
            <th class="th-cuoi-ky">Có (VND)</th>
          </tr>
        </thead>
        <tbody>
          <tr class="bg-sum">
            <td class="text-center">TỔNG CỘNG</td>
            <td>${recSummary.totalItems} khách hàng</td>
            <td class="text-right font-mono">${recSummary.totalBeginningDebit.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono">${recSummary.totalBeginningCredit.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono">${recSummary.totalOccurredDebit.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono">${recSummary.totalOccurredCredit.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono bg-sum-cuoi-ky">${recSummary.totalEndingDebit.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono bg-sum-cuoi-ky">${recSummary.totalEndingCredit.toLocaleString('vi-VN')}</td>
          </tr>
          ${recRows}
        </tbody>
      </table>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Bảng kiểm kê hàng tồn kho & công nợ</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 15px; }
        .header-title { text-align: center; font-size: 16px; font-weight: bold; color: #0284c7; text-transform: uppercase; margin-bottom: 5px; }
        .meta-line { text-align: center; font-size: 11px; color: #475569; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        th { background-color: #0284c7; color: #ffffff; font-weight: bold; border: 1px solid #0369a1; padding: 6px 4px; text-align: center; }
        th.th-cuoi-ky { background-color: #16a34a; border-color: #15803d; }
        td { border: 1px solid #cbd5e1; padding: 5px 4px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: monospace; }
        .bg-sum { background-color: #e0f2fe; font-weight: bold; color: #0369a1; }
        .bg-sum-cuoi-ky { background-color: #dcfce7; color: #15803d; }
        .bg-pos-cell { background-color: #f0fdf4; color: #16a34a; }
        .signature-grid { display: flex; justify-content: flex-end; margin-top: 30px; page-break-inside: avoid; }
        .sig-box { width: 40%; text-align: center; }
        .sig-title { font-weight: bold; text-transform: uppercase; font-size: 11px; }
        .sig-space { height: 65px; }
      </style>
    </head>
    <body>
      <div class="header-title">BẢNG KIỂM KÊ VÀ ĐỊNH GIÁ HÀNG TỒN KHO</div>
      <div class="meta-line">
        ${ctx.customerName ? `<strong>Khách hàng:</strong> ${ctx.customerName} | ` : ''}<strong>Ngày kiểm kê:</strong> ${fmtDate(ctx.recordDate || todayIso())}
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="2">Mã hàng</th>
            <th rowspan="2">Tên sản phẩm</th>
            <th rowspan="2">ĐVT</th>
            <th colspan="2">ĐẦU KỲ</th>
            <th colspan="2">NHẬP KHO</th>
            <th colspan="2">XUẤT KHO</th>
            <th colspan="2" class="th-cuoi-ky">CUỐI KỲ</th>
          </tr>
          <tr>
            <th>Số lượng</th>
            <th>Giá trị (VND)</th>
            <th>Số lượng</th>
            <th>Giá trị (VND)</th>
            <th>Số lượng</th>
            <th>Giá trị (VND)</th>
            <th class="th-cuoi-ky">Số lượng</th>
            <th class="th-cuoi-ky">Giá trị (VND)</th>
          </tr>
        </thead>
        <tbody>
          <tr class="bg-sum">
            <td class="text-center">TỔNG CỘNG</td>
            <td>${summary.totalItems} mặt hàng</td>
            <td></td>
            <td class="text-right font-mono">${summary.totalBeginningQty.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono">${summary.totalBeginningValue.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono">${summary.totalImportQty.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono">${summary.totalImportValue.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono">${summary.totalExportQty.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono">${summary.totalExportValue.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono bg-sum-cuoi-ky">${summary.totalEndingQty.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono bg-sum-cuoi-ky">${summary.totalEndingValue.toLocaleString('vi-VN')}</td>
          </tr>
          ${rowsHtml}
        </tbody>
      </table>

      ${recSectionHtml}

      <div class="signature-grid">
        <div class="sig-box">
          <div class="sig-title">NGƯỜI LẬP BẢNG</div>
          <div style="font-size:10px;color:#64748b;">(Ký và ghi rõ họ tên)</div>
          <div class="sig-space"></div>
        </div>
      </div>
    </body>
    </html>
  `;
}
