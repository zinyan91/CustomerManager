import { buildXlsx, type XlsxCell, type XlsxSheet, type XlsxStyle } from './xlsxWriter';
import {
  computeStatementItem, computeStatementSummary, computeRetailInvoiceItem, computeRetailInvoiceSummary, getComputedBankAccText,
  type StatementItem, type StatementSellerInfo, type RetailInvoiceItem, type RetailInvoiceHeader,
} from './statement';
import { fmtDate, todayIso } from './utils';
import { formatMoneyWith, formatQuantityWith } from './formatSettings';

export function buildPurchaseStatementXlsx(
  items: StatementItem[],
  info: StatementSellerInfo
): Uint8Array {
  const summary = computeStatementSummary(items);
  const isTransfer = info.paymentMethod !== 'cash';
  const stkText = getComputedBankAccText(info);
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

  rows.push([]);

  rows.push([{ value: `Bên bán hàng: ${info.sellerName || ''}`, style: { bold: true } }]);
  merges.push('A7:I7');

  rows.push([{ value: isTransfer ? `Thông tin chuyển khoản: ${stkText}` : `Địa chỉ: ${info.sellerAddress || ''}` }]);
  merges.push('A8:I8');

  rows.push([]);

  rows.push([{ value: `Bên mua hàng: ${info.buyerName || ''}`, style: { bold: true } }]);
  merges.push('A10:I10');

  rows.push([{ value: `Địa chỉ: ${info.buyerAddress || ''}` }]);
  merges.push('A11:I11');

  rows.push([]);

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
  if (isTransfer) merges.push('C14:D14');

  rows.push([
    { value: '', style: bHeaderStyle },
    { value: 'Tên người bán', style: bHeaderStyle },
    { value: isTransfer ? 'Thông tin chuyển khoản' : 'Địa chỉ', style: bHeaderStyle },
    { value: isTransfer ? '' : 'Hình thức\nthanh toán', style: bHeaderStyle },
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
    if (isTransfer) {
      merges.push(`C${startRow}:D${endRow}`);
    } else {
      merges.push(`C${startRow}:C${endRow}`);
      merges.push(`D${startRow}:D${endRow}`);
    }
  }

  const bCellStyle: XlsxStyle = { border: true };
  const bCenterStyle: XlsxStyle = { align: 'center', vAlign: 'center', border: true };
  const bValignStyle: XlsxStyle = { vAlign: 'center', wrap: true, border: true };

  items.forEach((it, idx) => {
    const c = computeStatementItem(it);
    rows.push([
      { value: idx === 0 ? (c.dateStr || '…../…../20…') : '', style: bCenterStyle },
      { value: idx === 0 ? (info.sellerName || '') : '', style: bValignStyle },
      { value: idx === 0 ? (isTransfer ? stkText : (info.sellerAddress || '')) : '', style: bValignStyle },
      { value: idx === 0 && !isTransfer ? stkText : '', style: bValignStyle },
      { value: c.itemName, style: { bold: true, border: true } },
      { value: c.qty, numeric: true, style: { align: 'right', numFmt: '#,##0', border: true } },
      { value: c.unitPrice, numeric: true, style: { align: 'right', numFmt: '#,##0', border: true } },
      { value: c.amount, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0', border: true } },
      { value: c.note || '', style: bCellStyle },
    ]);
  });

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

  rows.push([]);

  const dateRowIndex = totalRowIndex + 2;
  rows.push([
    { value: '' }, { value: '' }, { value: '' }, { value: '' }, { value: '' },
    { value: 'Tp. HCM, ngày ….. tháng …... năm 20…', style: { align: 'center' } },
    { value: '' }, { value: '' }, { value: '' },
  ]);
  merges.push(`F${dateRowIndex}:H${dateRowIndex}`);

  rows.push([]);

  const sigTitleRowIndex = dateRowIndex + 2;
  rows.push([
    { value: 'Bên bán hàng', style: { bold: true, align: 'center' } },
    { value: '' }, { value: '' }, { value: '' }, { value: '' },
    { value: 'Bên mua hàng', style: { bold: true, align: 'center' } },
    { value: '' }, { value: '' }, { value: '' },
  ]);
  merges.push(`A${sigTitleRowIndex}:C${sigTitleRowIndex}`);
  merges.push(`F${sigTitleRowIndex}:H${sigTitleRowIndex}`);

  rows.push([]); rows.push([]); rows.push([]); rows.push([]); rows.push([]);

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
  const isTransfer = info.paymentMethod !== 'cash';
  const stkText = getComputedBankAccText(info);

  const itemRows = items.map((it, idx) => {
    const c = computeStatementItem(it);
    return `
      <tr>
        <td class="text-center font-mono">${idx === 0 ? (c.dateStr || '&hellip;') : ''}</td>
        <td>${idx === 0 ? (info.sellerName || '') : ''}</td>
        ${isTransfer
          ? `<td colspan="2">${idx === 0 ? stkText : ''}</td>`
          : `<td>${idx === 0 ? (info.sellerAddress || '') : ''}</td><td>${idx === 0 ? stkText : ''}</td>`}
        <td class="font-bold">${c.itemName}</td>
        <td class="text-center font-mono">${c.unit || 'Cái'}</td>
        <td class="text-right font-mono">${formatQuantityWith(c.qty)}</td>
        <td class="text-right font-mono">${formatMoneyWith(c.unitPrice)}</td>
        <td class="text-right font-mono font-bold">${formatMoneyWith(c.amount)}</td>
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
        * { box-sizing: border-box; }
        @page { size: A4 landscape; margin: 10mm 12mm; }
        @media print {
          html, body {
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          table { page-break-inside: auto; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
          .sig-table { page-break-inside: avoid; }
        }
        body {
          font-family: 'Times New Roman', Times, serif, sans-serif;
          font-size: 13px;
          color: #000000;
          margin: 0;
          padding: 0;
          line-height: 1.35;
        }
        .nation-header { text-align: center; font-weight: bold; margin-bottom: 8px; font-size: 14px; }
        .doc-title { text-align: center; font-size: 18px; font-weight: bold; text-transform: uppercase; margin-bottom: 12px; }
        .party-box { margin-bottom: 12px; font-size: 13px; line-height: 1.5; }
        table.doc-table {
          width: 100%;
          table-layout: fixed;
          border-collapse: collapse;
          margin-top: 10px;
          font-size: 12px;
          line-height: 1.35;
          word-break: break-word;
          overflow-wrap: break-word;
        }
        th {
          background-color: #ffffff;
          color: #000000;
          font-weight: bold;
          border: 1px solid #000000;
          padding: 6px 4px;
          text-align: center;
          vertical-align: middle;
        }
        td {
          border: 1px solid #000000;
          padding: 5px 4px;
          vertical-align: middle;
        }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-mono { font-family: 'Courier New', Courier, monospace; }
        .sig-table {
          width: 100%;
          border-collapse: collapse;
          border: none;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sig-table td {
          width: 50%;
          border: none;
          text-align: center;
          vertical-align: top;
          padding: 0;
        }
      </style>
    </head>
    <body>
      <div class="nation-header">
        CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br/>
        <small style="font-weight: normal; font-style: italic;">Độc lập - Tự do - Hạnh phúc</small><br/>
        <span style="font-size:12px;">*************</span>
      </div>

      <div class="doc-title">BẢNG KÊ MUA BÁN HÀNG HÓA DỊCH VỤ</div>

      <div class="party-box">
        <strong>Bên bán hàng:</strong> ${info.sellerName || '....................................'}<br/>
        ${isTransfer
          ? `<strong>Thông tin chuyển khoản:</strong> ${stkText}<br/>`
          : `<strong>Địa chỉ:</strong> ${info.sellerAddress || '....................................'}<br/>`}
        <br/>
        <strong>Bên mua hàng:</strong> ${info.buyerName || '....................................'}<br/>
        <strong>Địa chỉ:</strong> ${info.buyerAddress || '....................................'}
      </div>

      <table class="doc-table">
        <colgroup>
          <col style="width: 8%;"/>
          <col style="width: 11%;"/>
          <col style="width: 15%;"/>
          <col style="width: 14%;"/>
          <col style="width: 16%;"/>
          <col style="width: 4.5%;"/>
          <col style="width: 6.5%;"/>
          <col style="width: 8.5%;"/>
          <col style="width: 10.5%;"/>
          <col style="width: 6%;"/>
        </colgroup>
        <thead>
          <tr>
            <th rowspan="2">Ngày, tháng, năm</th>
            <th colspan="3">Người bán</th>
            <th colspan="5">Hàng hóa mua vào</th>
            <th rowspan="2">Ghi chú</th>
          </tr>
          <tr>
            <th>Tên người bán</th>
            ${isTransfer
              ? '<th colspan="2">Thông tin chuyển khoản</th>'
              : '<th>Địa chỉ</th><th>Hình thức thanh toán</th>'}
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
            <td class="text-right font-mono font-bold">${formatMoneyWith(summary.totalAmount)}</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <table class="sig-table">
        <tr>
          <td>
            <strong>BÊN BÁN HÀNG</strong><br/>
            <small style="font-style: italic;">(Ký và ghi rõ họ tên)</small>
            <div style="height: 70px;"></div>
          </td>
          <td>
            <strong>BÊN MUA HÀNG</strong><br/>
            <small style="font-style: italic;">(Ký và ghi rõ họ tên)</small>
            <div style="height: 70px;"></div>
          </td>
        </tr>
      </table>
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
        @page { size: A4 portrait; margin: 15mm 15mm 15mm 20mm; }
        body { font-family: 'Times New Roman', Times, serif, sans-serif; font-size: 13px; color: #000000; margin: 0; padding: 0; }
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


