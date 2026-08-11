import { buildXlsx, type XlsxCell, type XlsxSheet } from './xlsxWriter';
import { computeItemRow, computeInventorySummary, type InventoryItem } from './inventory';
import { fmtDate, todayIso } from './utils';

export interface InventoryExportContext {
  customerName?: string;
  recordDate?: string;
  categoryName: string;
}

const HEADER_FILL = 'DCE6F1';
const FOOTER_FILL = 'E0F2FE';

export function buildInventoryXlsx(
  items: InventoryItem[],
  ctx: InventoryExportContext
): Uint8Array {
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
    `Danh mục: ${ctx.categoryName}`,
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
    { value: 'CUỐI KỲ', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
    { value: 'Giá trị 1 sản phẩm', style: { bold: true, align: 'center', fill: HEADER_FILL } },
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
    { value: 'Số lượng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Giá trị (VND)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: '', style: { fill: HEADER_FILL } },
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
    { value: summary.totalEndingQty, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: summary.totalEndingValue, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', fill: FOOTER_FILL } },
    { value: '', style: { fill: FOOTER_FILL } },
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
      { value: r.endingQty, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
      { value: r.endingValue, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
      { value: r.unitPrice, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
    ]);
  });

  const sheet: XlsxSheet = {
    name: 'Hàng tồn kho',
    rows: xlsxRows,
    colWidths: [14, 30, 10, 14, 18, 14, 18, 14, 18, 14, 18, 18],
  };

  return buildXlsx(sheet);
}

export function buildInventoryDocHtml(
  items: InventoryItem[],
  ctx: InventoryExportContext
): string {
  const summary = computeInventorySummary(items);

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
        <td class="text-right font-mono font-bold text-pos">${r.endingQty.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono font-bold text-pos">${r.endingValue.toLocaleString('vi-VN')}</td>
        <td class="text-right font-mono">${r.unitPrice.toLocaleString('vi-VN')}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Bảng kiểm kê hàng tồn kho - ${ctx.categoryName}</title>
      <style>
        @page { size: A4 landscape; margin: 12mm; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; font-size: 11px; color: #0f172a; margin: 0; padding: 15px; }
        .header-title { text-align: center; font-size: 16px; font-weight: bold; color: #0284c7; text-transform: uppercase; margin-bottom: 5px; }
        .meta-line { text-align: center; font-size: 11px; color: #475569; margin-bottom: 15px; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 10px; }
        th { background-color: #0284c7; color: #ffffff; font-weight: bold; border: 1px solid #0369a1; padding: 6px 4px; text-align: center; }
        td { border: 1px solid #cbd5e1; padding: 5px 4px; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: monospace; }
        .bg-sum { background-color: #e0f2fe; font-weight: bold; color: #0369a1; }
        .signature-grid { display: flex; justify-content: space-between; margin-top: 30px; page-break-inside: avoid; }
        .sig-box { width: 45%; text-align: center; }
        .sig-title { font-weight: bold; text-transform: uppercase; font-size: 11px; }
        .sig-space { height: 60px; }
      </style>
    </head>
    <body>
      <div class="header-title">BẢNG KIỂM KÊ VÀ ĐỊNH GIÁ HÀNG TỒN KHO</div>
      <div class="meta-line">
        <strong>Danh mục:</strong> ${ctx.categoryName}
        ${ctx.customerName ? ` | <strong>Khách hàng:</strong> ${ctx.customerName}` : ''}
        | <strong>Ngày kiểm kê:</strong> ${fmtDate(ctx.recordDate || todayIso())}
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
            <th colspan="2">CUỐI KỲ</th>
            <th rowspan="2">Giá trị 1 sản phẩm (VND)</th>
          </tr>
          <tr>
            <th>Số lượng</th>
            <th>Giá trị (VND)</th>
            <th>Số lượng</th>
            <th>Giá trị (VND)</th>
            <th>Số lượng</th>
            <th>Giá trị (VND)</th>
            <th>Số lượng</th>
            <th>Giá trị (VND)</th>
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
            <td class="text-right font-mono">${summary.totalEndingQty.toLocaleString('vi-VN')}</td>
            <td class="text-right font-mono">${summary.totalEndingValue.toLocaleString('vi-VN')}</td>
            <td></td>
          </tr>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="signature-grid">
        <div class="sig-box">
          <div class="sig-title">CÁN BỘ THẨM ĐỊNH</div>
          <div style="font-size:10px;color:#64748b;">(Ký và ghi rõ họ tên)</div>
          <div class="sig-space"></div>
        </div>
        <div class="sig-box">
          <div class="sig-title">KHÁCH HÀNG / TRƯỞNG CƠ SỞ</div>
          <div style="font-size:10px;color:#64748b;">(Ký, đóng dấu nếu có)</div>
          <div class="sig-space"></div>
        </div>
      </div>
    </body>
    </html>
  `;
}
