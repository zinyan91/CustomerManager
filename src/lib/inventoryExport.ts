import { buildMultiSheetXlsx, buildXlsx, type XlsxCell, type XlsxSheet } from './xlsxWriter';
import { computeItemRow, computeInventorySummary, type InventoryItem } from './inventory';
import { computeReceivableItemRow, computeReceivableSummary, type ReceivableItem } from './debt';
import {
  computeStatementItem, computeStatementSummary, computeRetailInvoiceItem, computeRetailInvoiceSummary,
  type StatementItem, type StatementSellerInfo, type RetailInvoiceItem, type RetailInvoiceHeader,
} from './statement';
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

export function buildPurchaseStatementXlsx(
  items: StatementItem[],
  info: StatementSellerInfo
): Uint8Array {
  const summary = computeStatementSummary(items);
  const rows: XlsxCell[][] = [];

  rows.push([{ value: 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', style: { bold: true, align: 'center' } }]);
  rows.push([{ value: 'Độc lập - Tự do - Hạnh Phúc', style: { bold: true, align: 'center' } }]);
  rows.push([]);
  rows.push([{ value: 'BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ', style: { bold: true, align: 'center' } }]);
  rows.push([]);

  rows.push([{ value: `Bên bán hàng: ${info.sellerName || ''}`, style: { bold: true } }]);
  rows.push([{ value: `Địa chỉ: ${info.sellerAddress || ''}` }]);
  rows.push([{ value: `CMND/CCCD/STK: ${info.sellerIdCard || ''} ${info.sellerBankAcc || ''}` }]);
  rows.push([{ value: `Bên mua hàng: ${info.buyerName || ''}`, style: { bold: true } }]);
  rows.push([{ value: `CMND/CCCD số: ${info.buyerIdCard || ''}` }]);
  rows.push([]);

  // Headers
  rows.push([
    { value: 'Ngày tháng', style: { bold: true, align: 'center' } },
    { value: 'Tên người bán', style: { bold: true, align: 'center' } },
    { value: 'Địa chỉ', style: { bold: true, align: 'center' } },
    { value: 'Số CMND/STK', style: { bold: true, align: 'center' } },
    { value: 'Tên hàng hóa, dịch vụ', style: { bold: true, align: 'center' } },
    { value: 'ĐVT', style: { bold: true, align: 'center' } },
    { value: 'Số lượng', style: { bold: true, align: 'center' } },
    { value: 'Đơn giá (VND)', style: { bold: true, align: 'center' } },
    { value: 'Thành tiền (VND)', style: { bold: true, align: 'center' } },
    { value: 'Ghi chú', style: { bold: true, align: 'center' } },
  ]);

  items.forEach(it => {
    const c = computeStatementItem(it);
    rows.push([
      { value: c.dateStr || '' },
      { value: info.sellerName || '' },
      { value: info.sellerAddress || '' },
      { value: info.sellerIdCard || '' },
      { value: c.itemName, style: { bold: true } },
      { value: c.unit, style: { align: 'center' } },
      { value: c.qty, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: c.unitPrice, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: c.amount, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
      { value: c.note || '' },
    ]);
  });

  // Summary Row
  rows.push([
    { value: 'TỔNG CỘNG', style: { bold: true, align: 'center' } },
    { value: '' },
    { value: '' },
    { value: '' },
    { value: `${summary.totalItems} mặt hàng`, style: { bold: true } },
    { value: '' },
    { value: summary.totalQty, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
    { value: '' },
    { value: summary.totalAmount, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
    { value: '' },
  ]);

  const sheet: XlsxSheet = {
    name: 'BẢNG KÊ MUA BÁN',
    rows,
    colWidths: [14, 24, 24, 20, 30, 10, 14, 18, 20, 16],
  };

  return buildXlsx(sheet);
}

export function buildPurchaseStatementDocHtml(
  items: StatementItem[],
  info: StatementSellerInfo
): string {
  const summary = computeStatementSummary(items);
  const itemRows = items.map(it => {
    const c = computeStatementItem(it);
    return `
      <tr>
        <td class="text-center">${c.dateStr || ''}</td>
        <td>${info.sellerName || ''}</td>
        <td>${info.sellerAddress || ''}</td>
        <td>${info.sellerIdCard || ''} ${info.sellerBankAcc ? `<br/><small>${info.sellerBankAcc}</small>` : ''}</td>
        <td class="font-bold">${c.itemName}</td>
        <td class="text-center">${c.unit}</td>
        <td class="text-right font-mono">${c.qty.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${c.unitPrice.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono font-bold">${c.amount.toLocaleString('vi-VN')}</td>
        <td>${c.note || ''}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Bảng kê mua bán hàng hóa dịch vụ</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: 'Times New Roman', Times, serif, sans-serif; font-size: 13px; color: #000000; margin: 0; padding: 15px; }
        .nation-header { text-align: center; font-weight: bold; margin-bottom: 15px; font-size: 14px; }
        .doc-title { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 15px; }
        .party-box { margin-bottom: 15px; font-size: 13px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background-color: #ffffff; color: #000000; font-weight: bold; border: 1px solid #000000; padding: 6px 4px; text-align: center; }
        td { border: 1px solid #000000; padding: 6px 4px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'Courier New', monospace; }
        .sig-grid { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; }
        .sig-box { width: 40%; text-align: center; }
      </style>
    </head>
    <body>
      <div class="nation-header">
        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>
        <small style="font-weight: normal; font-style: italic;">Độc lập - Tự do - Hạnh phúc</small>
      </div>

      <div class="doc-title">BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ</div>

      <div class="party-box">
        <strong>Bên bán hàng:</strong> ${info.sellerName || '....................................'}<br/>
        <strong>Địa chỉ:</strong> ${info.sellerAddress || '....................................'}<br/>
        <strong>CMND/CCCD/STK:</strong> ${info.sellerIdCard || ''} ${info.sellerBankAcc || ''}<br/>
        <strong>Bên mua hàng:</strong> ${info.buyerName || '....................................'}<br/>
        <strong>CMND/CCCD số:</strong> ${info.buyerIdCard || '....................................'}
      </div>

      <table>
        <thead>
          <tr>
            <th>Ngày tháng</th>
            <th>Tên người bán</th>
            <th>Địa chỉ</th>
            <th>Số CMND/STK</th>
            <th>Tên hàng hóa, dịch vụ</th>
            <th>ĐVT</th>
            <th>Số lượng</th>
            <th>Đơn giá (VND)</th>
            <th>Thành tiền (VND)</th>
            <th>Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          <tr style="font-weight: bold;">
            <td colspan="4" class="text-center">TỔNG CỘNG</td>
            <td>${summary.totalItems} mặt hàng</td>
            <td></td>
            <td class="text-right font-mono">${summary.totalQty.toLocaleString('vi-VN')}</td>
            <td></td>
            <td class="text-right font-mono font-bold">${summary.totalAmount.toLocaleString('vi-VN')}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="sig-grid">
        <div class="sig-box">
          <strong>BÊN BÁN HÀNG</strong><br/>
          <small style="font-style: italic;">(Ký và ghi rõ họ tên)</small>
          <div style="height: 60px;"></div>
          <strong>${info.sellerName || ''}</strong>
        </div>
        <div class="sig-box">
          <strong>BÊN MUA HÀNG</strong><br/>
          <small style="font-style: italic;">(Ký và ghi rõ họ tên)</small>
          <div style="height: 60px;"></div>
          <strong>${info.buyerName || ''}</strong>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function buildRetailInvoiceXlsx(
  items: RetailInvoiceItem[],
  header: RetailInvoiceHeader
): Uint8Array {
  const summary = computeRetailInvoiceSummary(items);
  const rows: XlsxCell[][] = [];

  rows.push([{ value: (header.shopName || 'HÓA ĐƠN BÁN LẺ').toUpperCase(), style: { bold: true, align: 'center' } }]);
  rows.push([]);
  rows.push([{ value: `Họ tên người mua hàng: ${header.buyerName || ''}`, style: { bold: true } }]);
  rows.push([{ value: `Địa chỉ: ${header.buyerAddress || ''}` }]);
  rows.push([{ value: `Ngày lập: ${header.invoiceDateStr || fmtDate(todayIso())}` }]);
  rows.push([]);

  rows.push([
    { value: 'STT', style: { bold: true, align: 'center' } },
    { value: 'Tên hàng hóa', style: { bold: true, align: 'center' } },
    { value: 'ĐVT', style: { bold: true, align: 'center' } },
    { value: 'Số lượng', style: { bold: true, align: 'center' } },
    { value: 'Đơn giá', style: { bold: true, align: 'center' } },
    { value: 'Thành tiền', style: { bold: true, align: 'center' } },
  ]);

  items.forEach((it, idx) => {
    const c = computeRetailInvoiceItem(it);
    rows.push([
      { value: idx + 1, numeric: true, style: { align: 'center' } },
      { value: c.itemName, style: { bold: true } },
      { value: c.unit, style: { align: 'center' } },
      { value: c.qty, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: c.unitPrice, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
      { value: c.amount, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
    ]);
  });

  rows.push([
    { value: 'TỔNG CỘNG', style: { bold: true, align: 'center' } },
    { value: `${summary.totalItems} sản phẩm`, style: { bold: true } },
    { value: '' },
    { value: summary.totalQty, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
    { value: '' },
    { value: summary.totalAmount, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
  ]);

  const sheet: XlsxSheet = {
    name: 'HÓA ĐƠN BÁN LẺ',
    rows,
    colWidths: [8, 36, 12, 14, 18, 22],
  };

  return buildXlsx(sheet);
}

export function buildRetailInvoiceDocHtml(
  items: RetailInvoiceItem[],
  header: RetailInvoiceHeader
): string {
  const summary = computeRetailInvoiceSummary(items);
  const rowsHtml = items.map((it, idx) => {
    const c = computeRetailInvoiceItem(it);
    return `
      <tr>
        <td class="text-center">${idx + 1}</td>
        <td class="font-bold">${c.itemName}</td>
        <td class="text-center">${c.unit}</td>
        <td class="text-right font-mono">${c.qty.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${c.unitPrice.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono font-bold">${c.amount.toLocaleString('vi-VN')}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8"/>
      <title>Hóa đơn bán lẻ - ${header.shopName || ''}</title>
      <style>
        @page { size: A4 portrait; margin: 15mm; }
        body { font-family: 'Times New Roman', Times, serif, sans-serif; font-size: 13px; color: #000000; margin: 0; padding: 20px; }
        .shop-name { text-align: center; font-size: 20px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
        .doc-subtitle { text-align: center; font-size: 16px; font-weight: bold; margin-bottom: 20px; }
        .info-block { margin-bottom: 15px; font-size: 13px; line-height: 1.6; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th { background-color: #ffffff; color: #000000; font-weight: bold; border: 1px solid #000000; padding: 7px 5px; text-align: center; }
        td { border: 1px solid #000000; padding: 6px 5px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'Courier New', monospace; }
        .sig-grid { display: flex; justify-content: space-between; margin-top: 35px; page-break-inside: avoid; }
        .sig-box { width: 45%; text-align: center; }
      </style>
    </head>
    <body>
      <div class="shop-name">${header.shopName || 'CỬA HÀNG BÁN LẺ'}</div>
      <div class="doc-subtitle">HÓA ĐƠN BÁN LẺ</div>

      <div class="info-block">
        <strong>Họ tên người mua hàng:</strong> ${header.buyerName || '....................................'}<br/>
        <strong>Địa chỉ:</strong> ${header.buyerAddress || '....................................'}<br/>
        <strong>Ngày lập:</strong> ${header.invoiceDateStr || fmtDate(todayIso())}
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 40px;">STT</th>
            <th>Tên hàng hóa</th>
            <th style="width: 60px;">ĐVT</th>
            <th style="width: 70px;">Số lượng</th>
            <th style="width: 100px;">Đơn giá</th>
            <th style="width: 120px;">Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
          <tr style="font-weight: bold;">
            <td colspan="3" class="text-center">TỔNG CỘNG</td>
            <td class="text-right font-mono">${summary.totalQty.toLocaleString('vi-VN')}</td>
            <td></td>
            <td class="text-right font-mono font-bold">${summary.totalAmount.toLocaleString('vi-VN')}</td>
          </tr>
        </tbody>
      </table>

      <div class="sig-grid">
        <div class="sig-box">
          <strong>KHÁCH HÀNG</strong><br/>
          <small style="font-style: italic;">(Ký và ghi rõ họ tên)</small>
          <div style="height: 60px;"></div>
          <strong>${header.buyerName || ''}</strong>
        </div>
        <div class="sig-box">
          <strong>NGƯỜI BÁN HÀNG</strong><br/>
          <small style="font-style: italic;">(Ký và ghi rõ họ tên)</small>
          <div style="height: 60px;"></div>
        </div>
      </div>
    </body>
    </html>
  `;
}


