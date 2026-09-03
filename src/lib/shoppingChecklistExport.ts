import { buildMultiSheetXlsx, type XlsxCell, type XlsxSheet } from './xlsxWriter';
import { downloadBytes } from './xlsExport';

const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
import {
  type ShoppingPreset,
  computeFloorTotal,
  computeItemAmount,
  computePresetTotal,
  computeRoomTotal,
  countPresetItems,
} from './shoppingChecklist';
import { fmtDate, todayIso } from './utils';
import { moneyToVietnameseWords } from './numberToWords';

const BRAND_FILL = '1E3A8A'; // Dark navy
const FLOOR_FILL = 'E2E8F0'; // Slate 200
const ROOM_FILL = 'F1F5F9'; // Slate 100
const SUMMARY_FILL = 'FEF3C7'; // Amber 100
const HEADER_FILL = '3B82F6'; // Blue 500

export function exportShoppingChecklistToExcel(preset: ShoppingPreset, filename?: string): void {
  const grandTotal = computePresetTotal(preset);
  const totalItems = countPresetItems(preset);

  // --- SHEET 1: CHI TIẾT VẬT DỤNG ---
  const detailRows: XlsxCell[][] = [];

  // Title Row
  detailRows.push([
    {
      value: 'DANH SÁCH CHI TIẾT CÁC VẬT DỤNG CẦN MUA',
      style: { bold: true, align: 'center', fill: BRAND_FILL },
    },
  ]);
  detailRows.push([
    {
      value: `Bản dựng: ${preset.name} | Ngày xuất: ${fmtDate(todayIso())} | Tổng số lượng: ${totalItems} món`,
      style: { italic: true, align: 'center' },
    },
  ]);
  detailRows.push([]);

  // Table Column Headers
  detailRows.push([
    { value: 'STT', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Hạng mục / Tên vật dụng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'ĐVT', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Số lượng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Đơn giá (VNĐ)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Thành tiền (VNĐ)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Ghi chú', style: { bold: true, align: 'center', fill: HEADER_FILL } },
  ]);

  let globalItemIndex = 1;

  preset.floors.forEach((floor, fIdx) => {
    const floorTotal = computeFloorTotal(floor);

    // Floor Banner Row
    detailRows.push([
      { value: `${fIdx + 1}`, style: { bold: true, align: 'center', fill: FLOOR_FILL } },
      { value: floor.name.toUpperCase(), style: { bold: true, align: 'left', fill: FLOOR_FILL } },
      { value: '', style: { fill: FLOOR_FILL } },
      { value: '', style: { fill: FLOOR_FILL } },
      { value: 'Tổng tầng:', style: { bold: true, align: 'right', fill: FLOOR_FILL } },
      {
        value: floorTotal,
        numeric: true,
        style: { bold: true, align: 'right', numFmt: '#,##0', fill: FLOOR_FILL },
      },
      { value: '', style: { fill: FLOOR_FILL } },
    ]);

    floor.rooms.forEach(room => {
      const roomTotal = computeRoomTotal(room);

      // Room Subheader Row
      detailRows.push([
        { value: '', style: { fill: ROOM_FILL } },
        { value: room.name, style: { bold: true, italic: true, align: 'left', fill: ROOM_FILL } },
        { value: '', style: { fill: ROOM_FILL } },
        { value: '', style: { fill: ROOM_FILL } },
        { value: 'Cộng phòng:', style: { italic: true, align: 'right', fill: ROOM_FILL } },
        {
          value: roomTotal,
          numeric: true,
          style: { bold: true, align: 'right', numFmt: '#,##0', fill: ROOM_FILL },
        },
        { value: '', style: { fill: ROOM_FILL } },
      ]);

      // Items in Room
      room.items.forEach(it => {
        const amt = computeItemAmount(it);
        detailRows.push([
          { value: globalItemIndex++, style: { align: 'center' } },
          { value: it.name, style: { align: 'left' } },
          { value: it.unit || 'Bộ/Cái', style: { align: 'center' } },
          { value: it.quantity, numeric: true, style: { align: 'right', numFmt: '#,##0.##' } },
          { value: it.unitPrice, numeric: true, style: { align: 'right', numFmt: '#,##0' } },
          { value: amt, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
          { value: it.note || '', style: { italic: true, align: 'left' } },
        ]);
      });
    });
  });

  // Grand Total Row
  detailRows.push([
    { value: 'TỔNG CỘNG', style: { bold: true, align: 'center', fill: SUMMARY_FILL } },
    { value: `Toàn bộ ${preset.floors.length} tầng, ${totalItems} hạng mục`, style: { bold: true, fill: SUMMARY_FILL } },
    { value: '', style: { fill: SUMMARY_FILL } },
    { value: '', style: { fill: SUMMARY_FILL } },
    { value: '', style: { fill: SUMMARY_FILL } },
    {
      value: grandTotal,
      numeric: true,
      style: { bold: true, align: 'right', numFmt: '#,##0', fill: SUMMARY_FILL },
    },
    { value: '', style: { fill: SUMMARY_FILL } },
  ]);

  // --- SHEET 2: TỔNG HỢP THEO TẦNG ---
  const summaryRows: XlsxCell[][] = [];

  summaryRows.push([
    {
      value: 'BẢNG TỔNG HỢP CHI PHÍ THEO TẦNG',
      style: { bold: true, align: 'center', fill: BRAND_FILL },
    },
  ]);
  summaryRows.push([
    {
      value: `Bản dựng: ${preset.name} | Ngày xuất: ${fmtDate(todayIso())}`,
      style: { italic: true, align: 'center' },
    },
  ]);
  summaryRows.push([]);

  summaryRows.push([
    { value: 'STT', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Tầng / Khu vực', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Số lượng phòng', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Số hạng mục', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Tổng chi phí (VNĐ)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
    { value: 'Tỷ trọng (%)', style: { bold: true, align: 'center', fill: HEADER_FILL } },
  ]);

  preset.floors.forEach((f, idx) => {
    const fTot = computeFloorTotal(f);
    const fItems = f.rooms.reduce((s, r) => s + r.items.length, 0);
    const pct = grandTotal > 0 ? (fTot / grandTotal) * 100 : 0;

    summaryRows.push([
      { value: idx + 1, style: { align: 'center' } },
      { value: f.name, style: { bold: true, align: 'left' } },
      { value: f.rooms.length, numeric: true, style: { align: 'center' } },
      { value: fItems, numeric: true, style: { align: 'center' } },
      { value: fTot, numeric: true, style: { bold: true, align: 'right', numFmt: '#,##0' } },
      { value: `${pct.toFixed(2)}%`, style: { align: 'right' } },
    ]);
  });

  summaryRows.push([
    { value: 'TỔNG CỘNG', style: { bold: true, align: 'center', fill: SUMMARY_FILL } },
    { value: '', style: { fill: SUMMARY_FILL } },
    {
      value: preset.floors.reduce((s, f) => s + f.rooms.length, 0),
      numeric: true,
      style: { bold: true, align: 'center', fill: SUMMARY_FILL },
    },
    { value: totalItems, numeric: true, style: { bold: true, align: 'center', fill: SUMMARY_FILL } },
    {
      value: grandTotal,
      numeric: true,
      style: { bold: true, align: 'right', numFmt: '#,##0', fill: SUMMARY_FILL },
    },
    { value: '100.00%', style: { bold: true, align: 'right', fill: SUMMARY_FILL } },
  ]);

  const sheets: XlsxSheet[] = [
    {
      name: 'Chi Tiết Vật Dụng',
      rows: detailRows,
      colWidths: [8, 42, 12, 12, 18, 20, 25],
    },
    {
      name: 'Tổng Hợp Chi Phí',
      rows: summaryRows,
      colWidths: [8, 38, 16, 16, 22, 14],
    },
  ];

  const bytes = buildMultiSheetXlsx(sheets);
  const outName = filename || `DANH_SACH_VAT_DUNG_${todayIso().replace(/-/g, '')}.xlsx`;
  downloadBytes(bytes, outName, MIME_XLSX);
}

export function exportShoppingChecklistToPdf(preset: ShoppingPreset): boolean {
  const grandTotal = computePresetTotal(preset);
  const totalItems = countPresetItems(preset);

  let globalIdx = 1;
  const floorsDetailHtml = preset.floors
    .map((floor, fIdx) => {
      const fTot = computeFloorTotal(floor);
      const roomsHtml = floor.rooms
        .map(room => {
          const rTot = computeRoomTotal(room);
          const itemsRows = room.items
            .map(it => {
              const amt = computeItemAmount(it);
              return `
                <tr>
                  <td style="text-align: center;">${globalIdx++}</td>
                  <td>${it.name}</td>
                  <td style="text-align: center;">${it.unit || 'Bộ/Cái'}</td>
                  <td style="text-align: right;">${it.quantity.toLocaleString('vi-VN')}</td>
                  <td style="text-align: right;">${it.unitPrice.toLocaleString('vi-VN')}</td>
                  <td style="text-align: right; font-weight: bold;">${amt.toLocaleString('vi-VN')}</td>
                  <td style="font-size: 10pt; color: #555;">${it.note || ''}</td>
                </tr>
              `;
            })
            .join('');

          return `
            <tr style="background-color: #f8fafc; font-weight: bold;">
              <td colspan="4" style="padding-left: 12px; color: #1e3a8a;">${room.name}</td>
              <td style="text-align: right; font-style: italic; font-size: 10pt;">Cộng phòng:</td>
              <td style="text-align: right; color: #1e3a8a;">${rTot.toLocaleString('vi-VN')}</td>
              <td></td>
            </tr>
            ${itemsRows}
          `;
        })
        .join('');

      return `
        <tr style="background-color: #e2e8f0; font-weight: bold; font-size: 11pt;">
          <td style="text-align: center;">${fIdx + 1}</td>
          <td colspan="4" style="color: #0f172a;">${floor.name.toUpperCase()}</td>
          <td style="text-align: right; color: #0f172a;">${fTot.toLocaleString('vi-VN')}</td>
          <td></td>
        </tr>
        ${roomsHtml}
      `;
    })
    .join('');

  const summaryRowsHtml = preset.floors
    .map((f, idx) => {
      const fTot = computeFloorTotal(f);
      const fItems = f.rooms.reduce((s, r) => s + r.items.length, 0);
      const pct = grandTotal > 0 ? (fTot / grandTotal) * 100 : 0;
      return `
        <tr>
          <td style="text-align: center;">${idx + 1}</td>
          <td style="font-weight: bold;">${f.name}</td>
          <td style="text-align: center;">${f.rooms.length}</td>
          <td style="text-align: center;">${fItems}</td>
          <td style="text-align: right; font-weight: bold;">${fTot.toLocaleString('vi-VN')} đ</td>
          <td style="text-align: right;">${pct.toFixed(2)}%</td>
        </tr>
      `;
    })
    .join('');

  const html = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="utf-8">
      <title>DANH SÁCH CHI TIẾT CÁC VẬT DỤNG CẦN MUA</title>
      <style>
        @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 11pt;
          color: #111;
          margin: 0;
          padding: 10px;
        }
        .header-top {
          display: flex;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .national-motto {
          text-align: center;
          font-size: 11.5pt;
        }
        .national-motto strong { text-transform: uppercase; }
        .doc-title {
          text-align: center;
          margin: 15px 0 6px 0;
          font-size: 16pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #0f172a;
        }
        .doc-subtitle {
          text-align: center;
          font-style: italic;
          font-size: 10.5pt;
          margin-bottom: 18px;
          color: #475569;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 18px;
          font-size: 10.5pt;
        }
        th, td {
          border: 1px solid #94a3b8;
          padding: 5px 7px;
          vertical-align: middle;
        }
        th {
          background-color: #f1f5f9;
          font-weight: bold;
          text-align: center;
        }
        .total-row {
          background-color: #fef3c7;
          font-weight: bold;
          font-size: 11pt;
        }
        .section-heading {
          font-weight: bold;
          font-size: 12pt;
          text-transform: uppercase;
          margin: 18px 0 8px 0;
          color: #1e3a8a;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 3px;
        }
        .sig-block {
          display: flex;
          justify-content: space-between;
          margin-top: 35px;
          page-break-inside: avoid;
        }
        .sig-col {
          width: 45%;
          text-align: center;
        }
        .sig-space {
          height: 65px;
        }
      </style>
    </head>
    <body>
      <div class="national-motto">
        <strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong><br>
        <strong>Độc lập - Tự do - Hạnh phúc</strong><br>
        <span>----------o0o----------</span>
      </div>

      <div class="doc-title">DANH SÁCH CHI TIẾT CÁC VẬT DỤNG CẦN MUA</div>
      <div class="doc-subtitle">Dự án / Bản dựng: <strong>${preset.name}</strong> &nbsp;|&nbsp; Ngày lập: ${fmtDate(todayIso())}</div>

      <div class="section-heading">I. BẢNG TỔNG HỢP CHI PHÍ THEO TẦNG</div>
      <table>
        <thead>
          <tr>
            <th style="width: 6%;">STT</th>
            <th style="width: 40%;">Tầng / Khu vực</th>
            <th style="width: 14%;">Số phòng</th>
            <th style="width: 14%;">Số hạng mục</th>
            <th style="width: 16%;">Tổng chi phí</th>
            <th style="width: 10%;">Tỷ trọng</th>
          </tr>
        </thead>
        <tbody>
          ${summaryRowsHtml}
          <tr class="total-row">
            <td style="text-align: center;">Σ</td>
            <td style="font-weight: bold;">TỔNG CỘNG TOÀN BỘ CÔNG TRÌNH</td>
            <td style="text-align: center;">${preset.floors.reduce((s, f) => s + f.rooms.length, 0)}</td>
            <td style="text-align: center;">${totalItems}</td>
            <td style="text-align: right; color: #b91c1c;">${grandTotal.toLocaleString('vi-VN')} đ</td>
            <td style="text-align: right;">100.00%</td>
          </tr>
        </tbody>
      </table>
      <div style="font-style: italic; margin-bottom: 20px;">
        (Bằng chữ: <strong>${moneyToVietnameseWords(grandTotal)}</strong>)
      </div>

      <div class="section-heading" style="page-break-before: auto;">II. BẢNG CHI TIẾT VẬT DỤNG THEO TỪNG TẦNG & PHÒNG</div>
      <table>
        <thead>
          <tr>
            <th style="width: 5%;">STT</th>
            <th style="width: 38%;">Hạng mục / Tên vật dụng</th>
            <th style="width: 8%;">ĐVT</th>
            <th style="width: 8%;">SL</th>
            <th style="width: 17%;">Đơn giá (VNĐ)</th>
            <th style="width: 18%;">Thành tiền (VNĐ)</th>
            <th style="width: 6%;">Ghi chú</th>
          </tr>
        </thead>
        <tbody>
          ${floorsDetailHtml}
          <tr class="total-row">
            <td colspan="5" style="text-align: right; font-weight: bold;">TỔNG CỘNG TOÀN BỘ VẬT DỤNG:</td>
            <td style="text-align: right; color: #b91c1c; font-weight: bold;">${grandTotal.toLocaleString('vi-VN')} đ</td>
            <td></td>
          </tr>
        </tbody>
      </table>

      <div class="sig-block">
        <div class="sig-col">
          <strong>NGƯỜI LẬP BẢNG</strong><br>
          <span style="font-style: italic; font-size: 10pt;">(Ký và ghi rõ họ tên)</span>
          <div class="sig-space"></div>
        </div>
        <div class="sig-col">
          <strong>CHỦ ĐẦU TƯ / DUYỆT BẢNG</strong><br>
          <span style="font-style: italic; font-size: 10pt;">(Ký và ghi rõ họ tên)</span>
          <div class="sig-space"></div>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWin = window.open('', '_blank', 'width=950,height=800');
  if (!printWin) return false;
  printWin.document.open();
  printWin.document.write(html);
  printWin.document.close();
  printWin.focus();
  setTimeout(() => {
    printWin.print();
  }, 350);
  return true;
}
