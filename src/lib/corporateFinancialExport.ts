import { buildMultiSheetXlsx, type XlsxCell, type XlsxSheet } from './xlsxWriter';
import { downloadBytes } from './xlsExport';
import { printHtmlDoc } from './printHtmlDoc';
import type {
  B01aStatement,
  B01bStatement,
  B02Statement,
  FinancialLineItem,
} from '../types/corporateFinancial';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const HEADER_FILL = 'F1F5F9'; // Light slate / gray

function fmtVnd(num: number): string {
  if (num === 0) return '-';
  if (num < 0) return `(${Math.abs(num).toLocaleString('vi-VN')})`;
  return num.toLocaleString('vi-VN');
}

function buildSheetRows(
  title: string,
  formCode: string,
  subTitle: string,
  col4Header: string,
  col5Header: string,
  statement: { companyName: string; taxCode: string; address: string; periodYear: number },
  items: FinancialLineItem[]
): XlsxCell[][] {
  const rows: XlsxCell[][] = [];

  // 1. Góc trên bên trái: Thông tin doanh nghiệp | Góc trên bên phải: Cơ sở ban hành
  rows.push([
    { value: `Doanh nghiệp: ${statement.companyName || '................................'}`, style: { bold: true } },
    { value: '' },
    { value: '' },
    { value: `Mẫu số ${formCode}`, style: { bold: true, align: 'right' } },
    { value: '' },
  ]);
  rows.push([
    { value: `Địa chỉ: ${statement.address || '................................'}` },
    { value: '' },
    { value: '' },
    { value: '(Ban hành theo Thông tư số 133/2016/TT-BTC', style: { italic: true, align: 'right' } },
    { value: '' },
  ]);
  rows.push([
    { value: `Mã số thuế: ${statement.taxCode || '................................'}` },
    { value: '' },
    { value: '' },
    { value: 'ngày 26/8/2016 của Bộ Tài chính)', style: { italic: true, align: 'right' } },
    { value: '' },
  ]);
  rows.push([]);

  // 2. Tiêu đề biểu mẫu ở giữa
  rows.push([
    { value: '' },
    { value: '' },
    { value: title.toUpperCase(), style: { bold: true, align: 'center' } },
    { value: '' },
    { value: '' },
  ]);

  if (subTitle) {
    rows.push([
      { value: '' },
      { value: '' },
      { value: subTitle, style: { italic: true, align: 'center' } },
      { value: '' },
      { value: '' },
    ]);
  }

  // Đơn vị tính
  rows.push([
    { value: '' },
    { value: '' },
    { value: '' },
    { value: 'Đơn vị tính: Đồng Việt Nam (VND)', style: { italic: true, align: 'right' } },
    { value: '' },
  ]);

  // 3. Tiêu đề các cột chuẩn Bộ Tài chính
  rows.push([
    { value: 'CHỈ TIÊU', style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
    { value: 'Mã số', style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
    { value: 'Thuyết minh', style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
    { value: col4Header, style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
    { value: col5Header, style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
  ]);

  // Hàng số thứ tự cột chuẩn
  rows.push([
    { value: '1', style: { align: 'center', fill: HEADER_FILL, border: true, italic: true } },
    { value: '2', style: { align: 'center', fill: HEADER_FILL, border: true, italic: true } },
    { value: '3', style: { align: 'center', fill: HEADER_FILL, border: true, italic: true } },
    { value: '4', style: { align: 'center', fill: HEADER_FILL, border: true, italic: true } },
    { value: '5', style: { align: 'center', fill: HEADER_FILL, border: true, italic: true } },
  ]);

  // 4. Các dòng số liệu
  items.forEach(it => {
    const isBold = Boolean(it.isHeader || it.isFormula);
    const indentSpace = '   '.repeat(it.indent || 0);

    rows.push([
      {
        value: indentSpace + it.name,
        style: {
          bold: isBold,
          align: 'left',
          border: true,
        },
      },
      {
        value: it.code,
        style: {
          bold: isBold,
          align: 'center',
          border: true,
        },
      },
      {
        value: it.note || '',
        style: {
          align: 'center',
          border: true,
        },
      },
      {
        value: it.currentPeriod,
        numeric: true,
        style: {
          bold: isBold,
          align: 'right',
          numFmt: '#,##0;(#,##0);"-"',
          border: true,
        },
      },
      {
        value: it.previousPeriod,
        numeric: true,
        style: {
          bold: isBold,
          align: 'right',
          numFmt: '#,##0;(#,##0);"-"',
          border: true,
        },
      },
    ]);
  });

  // 5. Chân trang chữ ký chuẩn Bộ Tài chính
  rows.push([]);
  rows.push([
    { value: '' },
    { value: '' },
    { value: '' },
    { value: 'Lập, ngày ..... tháng ..... năm .....', style: { italic: true, align: 'center' } },
    { value: '' },
  ]);
  rows.push([
    { value: 'NGƯỜI LẬP BIỂU', style: { bold: true, align: 'center' } },
    { value: '' },
    { value: 'KẾ TOÁN TRƯỞNG', style: { bold: true, align: 'center' } },
    { value: '' },
    { value: 'GIÁM ĐỐC', style: { bold: true, align: 'center' } },
  ]);
  rows.push([
    { value: '(Ký, họ tên)', style: { italic: true, align: 'center' } },
    { value: '' },
    { value: '(Ký, họ tên)', style: { italic: true, align: 'center' } },
    { value: '' },
    { value: '(Ký, họ tên, đóng dấu)', style: { italic: true, align: 'center' } },
  ]);
  rows.push([]);
  rows.push([]);
  rows.push([
    { value: 'Ghi chú:', style: { italic: true, bold: true } },
  ]);
  rows.push([
    { value: '(*) Những chỉ tiêu không có số liệu được miễn trình bày nhưng không được thay đổi thứ tự các chỉ tiêu.', style: { italic: true } },
  ]);
  rows.push([
    { value: 'Đối với người nộp thuế lập BCTC bằng máy vi tính có thể thiết kế mẫu biểu nhưng phải đảm bảo đủ các nội dung theo quy định.', style: { italic: true } },
  ]);

  return rows;
}

export function exportCorporateFinancialToExcel(
  b01a: B01aStatement,
  b02: B02Statement,
  b01b: B01bStatement
): void {
  const colWidths = [45, 10, 14, 22, 22];

  const sheet1: XlsxSheet = {
    name: 'B01a_THTC',
    colWidths,
    rows: buildSheetRows(
      'BÁO CÁO TÌNH HÌNH TÀI CHÍNH',
      'B 01a - DNNVV',
      `Tại ngày 31 tháng 12 năm ${b01a.periodYear}\n(Áp dụng cho doanh nghiệp đáp ứng giả định hoạt động liên tục)`,
      `Số cuối năm (${b01a.periodYear})`,
      `Số đầu năm (${b01a.periodYear - 1})`,
      b01a,
      b01a.items
    ),
  };

  const sheet2: XlsxSheet = {
    name: 'B02_KQKD',
    colWidths,
    rows: buildSheetRows(
      'BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH',
      'B 02 - DNNVV',
      `Năm ${b02.periodYear}`,
      `Năm nay (${b02.periodYear})`,
      `Năm trước (${b02.periodYear - 1})`,
      b02,
      b02.items
    ),
  };

  const sheet3: XlsxSheet = {
    name: 'B01b_CDKT',
    colWidths,
    rows: buildSheetRows(
      'BÁO CÁO TÌNH HÌNH TÀI CHÍNH (THEO TÍNH THANH KHOẢN GIẢM DẦN)',
      'B 01b - DNNVV',
      `Tại ngày 31 tháng 12 năm ${b01b.periodYear}\n(Áp dụng cho doanh nghiệp đáp ứng giả định hoạt động liên tục)`,
      `Số cuối năm (${b01b.periodYear})`,
      `Số đầu năm (${b01b.periodYear - 1})`,
      b01b,
      b01b.items
    ),
  };

  const bytes = buildMultiSheetXlsx([sheet1, sheet2, sheet3]);
  const safeName = (b01a.companyName || 'Doanh_Nghiep').replace(/[^a-zA-Z0-9\u00C0-\u1EF9]/g, '_');
  downloadBytes(bytes, `BCTC_TT133_${safeName}_${b01a.periodYear}.xlsx`, MIME_XLSX);
}

// Print and PDF generation according to Circular 133/2016/TT-BTC
export function printStatementHtml(
  title: string,
  formCode: string,
  subPeriod: string,
  col4Name: string,
  col5Name: string,
  statement: { companyName: string; taxCode: string; address: string; periodYear: number },
  items: FinancialLineItem[]
): boolean {
  const rowsHtml = items
    .map(it => {
      const isBold = it.isHeader || it.isFormula;
      const isTotalRow = it.code === '270' || it.code === '440' || it.code === '200' || it.code === '500';
      const rowStyle = isTotalRow
        ? 'font-weight: bold; background: #e2e8f0;'
        : isBold
        ? 'font-weight: bold; background: #f8fafc;'
        : '';
      const indentPadding = (it.indent || 0) * 16;

      return `
        <tr style="${rowStyle}">
          <td style="padding-left: ${indentPadding + 6}px; text-align: left;">${it.name}</td>
          <td style="text-align: center; font-family: monospace;">${it.code}</td>
          <td style="text-align: center;">${it.note || ''}</td>
          <td style="text-align: right; padding-right: 6px; font-variant-numeric: tabular-nums;">${fmtVnd(it.currentPeriod)}</td>
          <td style="text-align: right; padding-right: 6px; font-variant-numeric: tabular-nums;">${fmtVnd(it.previousPeriod)}</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title></title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm 12mm 15mm;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 15mm 12mm 15mm;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        body {
          font-family: "Times New Roman", Times, serif;
          font-size: 8.5pt;
          color: #000;
          margin: 0;
          padding: 0;
          line-height: 1.25;
          background: #fff;
        }
        .header-grid {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
        }
        .company-info {
          font-size: 9pt;
          line-height: 1.35;
          width: 58%;
        }
        .form-info {
          text-align: right;
          font-size: 8.5pt;
          line-height: 1.35;
          width: 42%;
        }
        .doc-title {
          text-align: center;
          margin: 10px 0 16px 0;
        }
        .doc-title h1 {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0;
        }
        .doc-title .sub-date {
          font-size: 9.5pt;
          font-style: italic;
          margin-top: 3px;
        }
        .doc-title .sub-condition {
          font-size: 8.5pt;
          font-style: italic;
          margin-top: 2px;
        }
        .doc-unit {
          text-align: right;
          font-size: 8.5pt;
          font-style: italic;
          margin-bottom: 6px;
        }
        table.fin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          table-layout: fixed;
        }
        table.fin-table th, table.fin-table td {
          border: 1px solid #000;
          padding: 3.5px 4px;
          vertical-align: middle;
        }
        table.fin-table th {
          background: #f1f5f9;
          font-weight: bold;
          text-align: center;
        }
        table.fin-table thead tr:first-child th {
          font-size: 8.5pt;
        }
        .sig-block {
          margin-top: 20px;
          page-break-inside: avoid;
        }
        .sig-date {
          text-align: right;
          font-style: italic;
          font-size: 9pt;
          margin-bottom: 8px;
          padding-right: 25px;
        }
        .sig-section {
          display: flex;
          justify-content: space-between;
        }
        .sig-col {
          text-align: center;
          width: 31%;
          font-size: 9pt;
        }
        .sig-col strong {
          display: block;
          font-size: 9pt;
        }
        .sig-col em {
          font-size: 8pt;
          font-style: italic;
          display: block;
          margin-top: 2px;
        }
        .sig-space {
          height: 60px;
        }
        .footer-note {
          margin-top: 18px;
          font-size: 7.5pt;
          font-style: italic;
          line-height: 1.35;
          page-break-inside: avoid;
        }
      </style>
    </head>
    <body>
      <!-- 1. Header -->
      <div class="header-grid">
        <div class="company-info">
          <strong>Doanh nghiệp:</strong> ${statement.companyName || '................................................'}<br>
          <strong>Địa chỉ:</strong> ${statement.address || '................................................'}<br>
          <strong>Mã số thuế:</strong> ${statement.taxCode || '................................................'}
        </div>
        <div class="form-info">
          <strong>Mẫu số ${formCode}</strong><br>
          <em>(Ban hành theo Thông tư số 133/2016/TT-BTC<br>ngày 26/8/2016 của Bộ Tài chính)</em>
        </div>
      </div>

      <!-- 2. Tiêu đề chuẩn Bộ Tài chính -->
      <div class="doc-title">
        <h1>${title}</h1>
        <div class="sub-date">${subPeriod}</div>
        ${formCode.includes('B 01') ? '<div class="sub-condition">(Áp dụng cho doanh nghiệp đáp ứng giả định hoạt động liên tục)</div>' : ''}
      </div>

      <div class="doc-unit">
        Đơn vị tính: Đồng Việt Nam (VND)
      </div>

      <!-- 3. Bảng số liệu -->
      <table class="fin-table">
        <colgroup>
          <col style="width: 48%;" />
          <col style="width: 8%;" />
          <col style="width: 10%;" />
          <col style="width: 17%;" />
          <col style="width: 17%;" />
        </colgroup>
        <thead>
          <tr>
            <th>CHỈ TIÊU</th>
            <th>Mã số</th>
            <th>Thuyết minh</th>
            <th>${col4Name}</th>
            <th>${col5Name}</th>
          </tr>
          <tr style="font-size: 7.5pt; font-style: italic;">
            <th>1</th>
            <th>2</th>
            <th>3</th>
            <th>4</th>
            <th>5</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <!-- 4. Khối chữ ký chuẩn Bộ Tài chính -->
      <div class="sig-block">
        <div class="sig-date">
          Lập, ngày ..... tháng ..... năm .....
        </div>
        <div class="sig-section">
          <div class="sig-col">
            <strong>NGƯỜI LẬP BIỂU</strong>
            <em>(Ký, họ tên)</em>
            <div class="sig-space"></div>
          </div>
          <div class="sig-col">
            <strong>KẾ TOÁN TRƯỞNG</strong>
            <em>(Ký, họ tên)</em>
            <div class="sig-space"></div>
          </div>
          <div class="sig-col">
            <strong>GIÁM ĐỐC</strong>
            <em>(Ký, họ tên, đóng dấu)</em>
            <div class="sig-space"></div>
          </div>
        </div>

        <!-- Ghi chú chuẩn Thông tư 133 -->
        <div class="footer-note">
          <strong>Ghi chú:</strong><br>
          (*) Những chỉ tiêu không có số liệu được miễn trình bày nhưng không được thay đổi thứ tự các chỉ tiêu.<br>
          Đối với người nộp thuế lập BCTC bằng máy vi tính có thể thiết kế mẫu biểu nhưng phải đảm bảo đủ các nội dung theo quy định.
        </div>
      </div>
    </body>
    </html>
  `;

  return printHtmlDoc(html, `${formCode.replace(/\s+/g, '_')}_${(statement.companyName || 'BCTC').replace(/\s+/g, '_')}`);
}
