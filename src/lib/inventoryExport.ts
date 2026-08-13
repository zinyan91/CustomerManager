import { buildMultiSheetXlsx, buildXlsx, type XlsxCell, type XlsxSheet, type XlsxStyle } from './xlsxWriter';
import { computeItemRow, computeInventorySummary, type InventoryItem } from './inventory';
import { computeReceivableItemRow, computeReceivableSummary, type ReceivableItem } from './debt';
import {
  computeStatementItem, computeStatementSummary, computeRetailInvoiceItem, computeRetailInvoiceSummary, getComputedBankAccText,
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
  const merges: string[] = [];

  // Row 1: Quốc hiệu
  rows.push([{ value: 'CÔNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM', style: { bold: true, align: 'center' } }]);
  merges.push('A1:I1');

  // Row 2: Tiêu ngữ
  rows.push([{ value: 'Độc lập - Tự do - Hạnh Phúc', style: { bold: true, align: 'center' } }]);
  merges.push('A2:I2');

  // Row 3: Dấu sao
  rows.push([{ value: '*************', style: { align: 'center' } }]);
  merges.push('A3:I3');

  // Row 4: Trống
  rows.push([]);

  // Row 5: Tiêu đề Bảng kê
  rows.push([{ value: 'BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ', style: { bold: true, align: 'center' } }]);
  merges.push('A5:I5');

  // Row 6: Trống
  rows.push([]);

  // Row 7: Bên bán hàng
  rows.push([{ value: `Bên bán hàng: ${info.sellerName || ''}`, style: { bold: true } }]);
  merges.push('A7:I7');

  // Row 8: CMND/CCCD Bên bán (chỉ CMND/CCCD số)
  rows.push([{ value: `CMND/CCCD số: ${info.sellerIdCard || ''}` }]);
  merges.push('A8:I8');

  // Row 9: Trống
  rows.push([]);

  // Row 10: Bên mua hàng
  rows.push([{ value: `Bên mua hàng: ${info.buyerName || ''}`, style: { bold: true } }]);
  merges.push('A10:I10');

  // Row 11: CMND/CCCD Bên mua
  rows.push([{ value: `CMND/CCCD số: ${info.buyerIdCard || ''}` }]);
  merges.push('A11:I11');

  // Row 12: Trống
  rows.push([]);

  // Table Header Row 1 (Row 13 in Excel)
  const bHeaderStyle: XlsxStyle = { bold: true, align: 'center', vAlign: 'center', border: true };
  rows.push([
    { value: 'Ngày, tháng,\nnăm', style: bHeaderStyle },
    { value: 'Người bán', style: bHeaderStyle },
    { value: '', style: bHeaderStyle },
    { value: '', style: bHeaderStyle },
    { value: 'Hàng hóa mua vào', style: bHeaderStyle },
    { value: '', style: bHeaderStyle },
    { value: '', style: bHeaderStyle },
    { value: '', style: bHeaderStyle },
    { value: 'Ghi chú', style: bHeaderStyle },
  ]);
  merges.push('A13:A14');
  merges.push('B13:D13');
  merges.push('E13:H13');
  merges.push('I13:I14');

  // Table Header Row 2 (Row 14 in Excel)
  rows.push([
    { value: '', style: bHeaderStyle },
    { value: 'Tên người bán', style: bHeaderStyle },
    { value: 'Địa chỉ', style: bHeaderStyle },
    { value: 'Số CMND/CCCD/\nSTK', style: bHeaderStyle },
    { value: 'Tên hàng hóa, dịch vụ', style: bHeaderStyle },
    { value: 'Số lượng\n(kg)', style: bHeaderStyle },
    { value: 'Đơn giá\n(kg)', style: bHeaderStyle },
    { value: 'Thành tiền', style: bHeaderStyle },
    { value: '', style: bHeaderStyle },
  ]);

  const n = Math.max(1, items.length);
  const startRow = 15;
  const endRow = startRow + n - 1;

  if (items.length > 0) {
    merges.push(`A${startRow}:A${endRow}`);
    merges.push(`B${startRow}:B${endRow}`);
    merges.push(`C${startRow}:C${endRow}`);
    merges.push(`D${startRow}:D${endRow}`);
  }

  const stkText = getComputedBankAccText(info);

  const bCellStyle: XlsxStyle = { border: true };
  const bCenterStyle: XlsxStyle = { align: 'center', vAlign: 'center', border: true };
  const bValignStyle: XlsxStyle = { vAlign: 'center', border: true };

  items.forEach((it, idx) => {
    const c = computeStatementItem(it);
    rows.push([
      { value: idx === 0 ? (c.dateStr || '…../…../2024') : '', style: bCenterStyle },
      { value: idx === 0 ? (info.sellerName || '') : '', style: bValignStyle },
      { value: idx === 0 ? (info.sellerAddress || '') : '', style: bValignStyle },
      { value: idx === 0 ? stkText : '', style: bValignStyle },
      { value: c.itemName, style: { bold: true, border: true } },
      { value: c.qty, numeric: true, style: { align: 'right', numFmt: '#,##0', border: true } },
      { value: c.unitPrice, numeric: true, style: { align: 'right', numFmt: '#,##0', border: true } },
      { value: c.amount, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', border: true } },
      { value: c.note || '', style: bCellStyle },
    ]);
  });

  // Total Summary Row IMMEDIATELY after endRow (NO empty row before Total)
  const totalRowIndex = endRow + 1;
  const bTotalStyle: XlsxStyle = { bold: true, border: true };

  rows.push([
    { value: ' Tổng cộng', style: { bold: true, align: 'left', border: true } },
    { value: '', style: bTotalStyle },
    { value: '', style: bTotalStyle },
    { value: '', style: bTotalStyle },
    { value: '', style: bTotalStyle },
    { value: '', style: bTotalStyle },
    { value: '', style: bTotalStyle },
    { value: summary.totalAmount, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', border: true } },
    { value: '', style: bTotalStyle },
  ]);
  merges.push(`A${totalRowIndex}:G${totalRowIndex}`);

  // Empty row (Row totalRowIndex + 1)
  rows.push([]);

  // Date Footer Row (Row totalRowIndex + 2)
  const dateRowIndex = totalRowIndex + 2;
  rows.push([
    { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '' },
    { value: 'Tp. HCM, ngày ….. tháng …... năm 2024', style: { align: 'center' } },
    { value: '' }, { value: '' }, { value: '' },
  ]);
  merges.push(`F${dateRowIndex}:H${dateRowIndex}`);

  // Empty row (Row dateRowIndex + 1)
  rows.push([]);

  // Signature titles Row (Row dateRowIndex + 2)
  const sigTitleRowIndex = dateRowIndex + 2;
  rows.push([
    { value: 'Bên bán hàng', style: { bold: true, align: 'center' } },
    { value: '' }, { value: '' }, { value: '' }, { value: '' },
    { value: 'Bên mua hàng', style: { bold: true, align: 'center' } },
    { value: '' }, { value: '' }, { value: '' },
  ]);
  merges.push(`A${sigTitleRowIndex}:C${sigTitleRowIndex}`);
  merges.push(`F${sigTitleRowIndex}:H${sigTitleRowIndex}`);

  // 5 empty rows for signature space
  rows.push([]); rows.push([]); rows.push([]); rows.push([]); rows.push([]);

  // Signature names Row
  const sigNameRowIndex = sigTitleRowIndex + 6;
  rows.push([
    { value: (info.sellerName || '').toUpperCase(), style: { bold: true, align: 'center' } },
    { value: '' }, { value: '' }, { value: '' }, { value: '' },
    { value: (info.buyerName || '').toUpperCase(), style: { bold: true, align: 'center' } },
    { value: '' }, { value: '' }, { value: '' },
  ]);
  merges.push(`A${sigNameRowIndex}:C${sigNameRowIndex}`);
  merges.push(`F${sigNameRowIndex}:H${sigNameRowIndex}`);

  const sheet: XlsxSheet = {
    name: 'Bảng 1',
    rows,
    colWidths: [14, 20, 18, 30, 28, 14, 16, 20, 14],
    merges,
  };

  return buildXlsx(sheet);
}

export function buildPurchaseStatementDocHtml(
  items: StatementItem[],
  info: StatementSellerInfo
): string {
  const summary = computeStatementSummary(items);
  const n = items.length;
  const sellerIdText = getComputedBankAccText(info);

  const itemRows = items.map((it, idx) => {
    const c = computeStatementItem(it);
    return `
      <tr>
        ${idx === 0 ? `
          <td rowspan="${n}" class="text-center">${c.dateStr || '…../…../2024'}</td>
          <td rowspan="${n}">${info.sellerName || ''}</td>
          <td rowspan="${n}">${info.sellerAddress || ''}</td>
          <td rowspan="${n}">${sellerIdText}</td>
        ` : ''}
        <td class="font-bold">${c.itemName}</td>
        <td class="text-center">${c.unit || 'Cái'}</td>
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
        .nation-header { text-align: center; font-weight: bold; margin-bottom: 10px; font-size: 14px; }
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
        <small style="font-weight: normal; font-style: italic;">Độc lập - Tự do - Hạnh phúc</small><br/>
        <span style="font-size:11px;">*************</span>
      </div>

      <div class="doc-title">BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ</div>

      <div class="party-box">
        <strong>Bên bán hàng:</strong> ${info.sellerName || '....................................'}<br/>
        ${info.paymentMethod === 'transfer' 
          ? `<strong>Thông tin chuyển khoản:</strong> ${getComputedBankAccText(info)}<br/>` 
          : `<strong>CMND/CCCD số:</strong> ${info.sellerIdCard || '....................................'}<br/>`}
        <br/>
        <strong>Bên mua hàng:</strong> ${info.buyerName || '....................................'}<br/>
        <strong>CMND/CCCD số:</strong> ${info.buyerIdCard || '....................................'}
      </div>

      <table>
        <thead>
          <tr>
            <th rowspan="2">Ngày, tháng, năm</th>
            <th colspan="3">Người bán</th>
            <th colspan="5">Hàng hóa mua vào</th>
            <th rowspan="2">Ghi chú</th>
          </tr>
          <tr>
            <th>Tên người bán</th>
            <th>Địa chỉ</th>
            <th>${info.paymentMethod === 'cash' ? 'Số CMND/CCCD' : 'Thông tin STK / Ngân hàng'}</th>
            <th>Tên hàng hóa, dịch vụ</th>
            <th>ĐVT</th>
            <th>Số lượng (kg)</th>
            <th>Đơn giá (kg)</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          ${itemRows}
          <tr style="font-weight: bold;">
            <td colspan="8" class="text-center">Tổng cộng</td>
            <td class="text-right font-mono font-bold">${summary.totalAmount.toLocaleString('vi-VN')}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="sig-grid">
        <div class="sig-box">
          <strong>BÊN BÁN HÀNG</strong><br/>
          <small style="font-style: italic;">(Ký và ghi rõ họ tên)</small>
          <div style="height: 65px;"></div>
          <strong>${(info.sellerName || '').toUpperCase()}</strong>
        </div>
        <div class="sig-box">
          <strong>BÊN MUA HÀNG</strong><br/>
          <small style="font-style: italic;">(Ký và ghi rõ họ tên)</small>
          <div style="height: 65px;"></div>
          <strong>${(info.buyerName || '').toUpperCase()}</strong>
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
  const merges: string[] = [];

  // Row 1: Title
  rows.push([{ value: (header.shopName || 'HÓA ĐƠN BÁN LẺ').toUpperCase(), style: { bold: true, align: 'center' } }]);
  merges.push('A1:F1');

  // Row 2: Empty
  rows.push([]);

  // Row 3: Buyer name
  rows.push([{ value: `Họ tên người mua hàng: ${header.buyerName || ''}`, style: { bold: true } }]);
  merges.push('A3:F3');

  // Row 4: Address
  rows.push([{ value: `Địa chỉ: ${header.buyerAddress || ''}` }]);
  merges.push('A4:F4');

  // Row 5: Empty
  rows.push([]);

  // Row 6: Headers
  const invHeaderStyle: XlsxStyle = { bold: true, align: 'center', border: true };
  rows.push([
    { value: 'STT', style: invHeaderStyle },
    { value: 'Tên hàng hóa', style: invHeaderStyle },
    { value: 'ĐVT', style: invHeaderStyle },
    { value: 'Số lượng', style: invHeaderStyle },
    { value: 'Đơn giá', style: invHeaderStyle },
    { value: 'Thành tiền', style: invHeaderStyle },
  ]);

  items.forEach((it, idx) => {
    const c = computeRetailInvoiceItem(it);
    rows.push([
      { value: idx + 1, numeric: true, style: { align: 'center', border: true } },
      { value: c.itemName, style: { bold: true, border: true } },
      { value: c.unit, style: { align: 'center', border: true } },
      { value: c.qty, numeric: true, style: { align: 'right', numFmt: '#,##0', border: true } },
      { value: c.unitPrice, numeric: true, style: { align: 'right', numFmt: '#,##0', border: true } },
      { value: c.amount, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', border: true } },
    ]);
  });

  // Empty placeholder rows matching Excel
  const bEmptyStyle: XlsxStyle = { border: true };
  for (let i = items.length + 1; i <= 10; i++) {
    rows.push([
      { value: i, numeric: true, style: { align: 'center', border: true } },
      { value: '', style: bEmptyStyle },
      { value: '', style: bEmptyStyle },
      { value: '', style: bEmptyStyle },
      { value: '', style: bEmptyStyle },
      { value: 0, numeric: true, style: { align: 'right', numFmt: '#,##0', border: true } },
    ]);
  }

  const startRowIndex = 7;
  const totalRowIndex = startRowIndex + Math.max(10, items.length);

  // Total Summary Row
  const bTotStyle: XlsxStyle = { bold: true, border: true };
  rows.push([
    { value: '', style: bTotStyle },
    { value: 'TỔNG CỘNG', style: { bold: true, align: 'left', border: true } },
    { value: '', style: bTotStyle },
    { value: '', style: bTotStyle },
    { value: '', style: bTotStyle },
    { value: summary.totalAmount, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', border: true } },
  ]);
  merges.push(`B${totalRowIndex}:E${totalRowIndex}`);

  // Date & Signature Rows
  rows.push([]); rows.push([]); rows.push([]);
  const dateRowIndex = totalRowIndex + 4;
  rows.push([
    { value: '' }, { value: '' }, { value: '' },
    { value: '…., Ngày …. Tháng …. Năm ….', style: { align: 'center' } },
    { value: '' }, { value: '' },
  ]);
  merges.push(`D${dateRowIndex}:F${dateRowIndex}`);

  const sigTitleRowIndex = dateRowIndex + 1;
  rows.push([
    { value: 'KHÁCH HÀNG', style: { bold: true, align: 'center' } },
    { value: '' }, { value: '' },
    { value: 'NGƯỜI BÁN HÀNG', style: { bold: true, align: 'center' } },
    { value: '' }, { value: '' },
  ]);
  merges.push(`A${sigTitleRowIndex}:B${sigTitleRowIndex}`);
  merges.push(`D${sigTitleRowIndex}:F${sigTitleRowIndex}`);

  const sheet: XlsxSheet = {
    name: 'Sheet1 (5)',
    rows,
    colWidths: [8, 36, 12, 14, 18, 22],
    merges,
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
            <td colspan="5" class="text-center">TỔNG CỘNG</td>
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


