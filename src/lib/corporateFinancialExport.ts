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
const HEADER_FILL = 'E2E8F0'; // Slate 200

function fmtVnd(num: number): string {
  if (num === 0) return '-';
  if (num < 0) return `(${Math.abs(num).toLocaleString('vi-VN')})`;
  return num.toLocaleString('vi-VN');
}

function buildSheetRows(
  title: string,
  formCode: string,
  statement: { companyName: string; taxCode: string; address: string; periodYear: number },
  items: FinancialLineItem[]
): XlsxCell[][] {
  const rows: XlsxCell[][] = [];

  // Header info
  rows.push([
    { value: statement.companyName, style: { bold: true } },
    { value: '' }, { value: '' }, { value: '' },
    { value: `Mẫu số ${formCode}`, style: { bold: true, align: 'right' } },
  ]);
  rows.push([
    { value: `Mã số thuế: ${statement.taxCode}` },
    { value: '' }, { value: '' }, { value: '' },
    { value: '(Ban hành theo TT số 133/2016/TT-BTC', style: { italic: true, align: 'right' } },
  ]);
  rows.push([
    { value: `Địa chỉ: ${statement.address}` },
    { value: '' }, { value: '' }, { value: '' },
    { value: 'ngày 26/08/2016 của Bộ Tài chính)', style: { italic: true, align: 'right' } },
  ]);
  rows.push([]);

  // Title
  rows.push([
    { value: '' },
    { value: title.toUpperCase(), style: { bold: true, align: 'center' } },
  ]);
  rows.push([
    { value: '' },
    { value: `Năm tài chính: ${statement.periodYear}`, style: { italic: true, align: 'center' } },
  ]);
  rows.push([
    { value: '' },
    { value: 'Đơn vị tính: Đồng Việt Nam (VNĐ)', style: { italic: true, align: 'center' } },
  ]);
  rows.push([]);

  // Table header
  rows.push([
    { value: 'CHỈ TIÊU', style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
    { value: 'MÃ SỐ', style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
    { value: 'THUYẾT MINH', style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
    { value: `SỐ CUỐI NĂM (${statement.periodYear})`, style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
    { value: `SỐ ĐẦU NĂM (${statement.periodYear - 1})`, style: { bold: true, align: 'center', fill: HEADER_FILL, border: true } },
  ]);

  // Data rows
  items.forEach(it => {
    const isBold = Boolean(it.isHeader || it.isFormula);
    const indentSpace = '  '.repeat(it.indent || 0);

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

  // Signatures
  rows.push([]);
  rows.push([
    { value: 'NGƯỜI LẬP BIỂU', style: { bold: true, align: 'center' } },
    { value: '' },
    { value: 'KẾ TOÁN TRƯỞNG', style: { bold: true, align: 'center' } },
    { value: '' },
    { value: 'GIÁM ĐỐC / ĐẠI DIỆN PHÁP LUẬT', style: { bold: true, align: 'center' } },
  ]);
  rows.push([
    { value: '(Ký, họ tên)', style: { italic: true, align: 'center' } },
    { value: '' },
    { value: '(Ký, họ tên)', style: { italic: true, align: 'center' } },
    { value: '' },
    { value: '(Ký, họ tên, đóng dấu)', style: { italic: true, align: 'center' } },
  ]);

  return rows;
}

export function exportCorporateFinancialToExcel(
  b01a: B01aStatement,
  b02: B02Statement,
  b01b: B01bStatement
): void {
  const colWidths = [42, 10, 14, 22, 22];

  const sheet1: XlsxSheet = {
    name: 'B01a_THTC',
    colWidths,
    rows: buildSheetRows('Báo cáo tình hình tài chính', 'B01a - DNNVV', b01a, b01a.items),
  };

  const sheet2: XlsxSheet = {
    name: 'B02_KQKD',
    colWidths,
    rows: buildSheetRows('Báo cáo kết quả hoạt động kinh doanh', 'B02 - DNNVV', b02, b02.items),
  };

  const sheet3: XlsxSheet = {
    name: 'B01b_CDKT',
    colWidths,
    rows: buildSheetRows('Báo cáo tình hình tài chính (Theo thanh khoản)', 'B01b - DNNVV', b01b, b01b.items),
  };

  const bytes = buildMultiSheetXlsx([sheet1, sheet2, sheet3]);
  const safeName = (b01a.companyName || 'Doanh_Nghiep').replace(/\s+/g, '_');
  downloadBytes(bytes, `BCTC_TT133_${safeName}_${b01a.periodYear}.xlsx`, MIME_XLSX);
}

// Print and PDF generation for Corporate Financial Statements
export function printStatementHtml(
  title: string,
  formCode: string,
  statement: { companyName: string; taxCode: string; address: string; periodYear: number },
  items: FinancialLineItem[]
): boolean {
  const rowsHtml = items
    .map(it => {
      const isBold = it.isHeader || it.isFormula;
      const rowStyle = isBold ? 'font-weight: bold; background: #f8fafc;' : '';
      const indentPadding = (it.indent || 0) * 16;

      return `
        <tr style="${rowStyle}">
          <td style="padding-left: ${indentPadding + 6}px; text-align: left;">${it.name}</td>
          <td style="text-align: center;">${it.code}</td>
          <td style="text-align: center;">${it.note || ''}</td>
          <td style="text-align: right; padding-right: 6px;">${fmtVnd(it.currentPeriod)}</td>
          <td style="text-align: right; padding-right: 6px;">${fmtVnd(it.previousPeriod)}</td>
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
          margin: 0;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 8mm 10mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 8pt;
          color: #000;
          margin: 0;
          padding: 8mm 10mm;
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
          font-size: 8pt;
          line-height: 1.3;
        }
        .form-info {
          text-align: right;
          font-size: 8pt;
        }
        .doc-title {
          text-align: center;
          margin: 8px 0 16px 0;
        }
        .doc-title h1 {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          margin: 0;
        }
        .doc-title .sub {
          font-size: 8.5pt;
          font-style: italic;
          margin-top: 3px;
        }
        table.fin-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 8pt;
          table-layout: fixed;
        }
        table.fin-table th, table.fin-table td {
          border: 1px solid #000;
          padding: 3px 4px;
          vertical-align: middle;
        }
        table.fin-table th {
          background: #f1f5f9;
          font-weight: bold;
          text-align: center;
        }
        .sig-section {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          page-break-inside: avoid;
        }
        .sig-col {
          text-align: center;
          width: 30%;
          font-size: 8.5pt;
        }
        .sig-space {
          height: 50px;
        }
      </style>
    </head>
    <body>
      <div class="header-grid">
        <div class="company-info">
          <strong>${statement.companyName}</strong><br>
          Mã số thuế: ${statement.taxCode}<br>
          Địa chỉ: ${statement.address}
        </div>
        <div class="form-info">
          <strong>Mẫu số ${formCode}</strong><br>
          <em>(Ban hành theo TT số 133/2016/TT-BTC<br>ngày 26/08/2016 của Bộ Tài chính)</em>
        </div>
      </div>

      <div class="doc-title">
        <h1>${title}</h1>
        <div class="sub">Năm tài chính: ${statement.periodYear}</div>
        <div class="sub">Đơn vị tính: Đồng Việt Nam (VNĐ)</div>
      </div>

      <table class="fin-table">
        <colgroup>
          <col style="width: 46%;" />
          <col style="width: 8%;" />
          <col style="width: 10%;" />
          <col style="width: 18%;" />
          <col style="width: 18%;" />
        </colgroup>
        <thead>
          <tr>
            <th>CHỈ TIÊU</th>
            <th>MÃ SỐ</th>
            <th>THUYẾT MINH</th>
            <th>SỐ CUỐI NĂM</th>
            <th>SỐ ĐẦU NĂM</th>
          </tr>
          <tr style="font-size: 7pt; color: #475569;">
            <th>(1)</th>
            <th>(2)</th>
            <th>(3)</th>
            <th>(4)</th>
            <th>(5)</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="sig-section">
        <div class="sig-col">
          <strong>NGƯỜI LẬP BIỂU</strong><br>
          <span style="font-style: italic; font-size: 7.5pt;">(Ký, ghi rõ họ tên)</span>
          <div class="sig-space"></div>
        </div>
        <div class="sig-col">
          <strong>KẾ TOÁN TRƯỞNG</strong><br>
          <span style="font-style: italic; font-size: 7.5pt;">(Ký, ghi rõ họ tên)</span>
          <div class="sig-space"></div>
        </div>
        <div class="sig-col">
          <strong>GIÁM ĐỐC / ĐẠI DIỆN PHÁP LUẬT</strong><br>
          <span style="font-style: italic; font-size: 7.5pt;">(Ký, họ tên, đóng dấu)</span>
          <div class="sig-space"></div>
        </div>
      </div>
    </body>
    </html>
  `;

  return printHtmlDoc(html, `${formCode}_${statement.companyName.replace(/\s+/g, '_')}`);
}
