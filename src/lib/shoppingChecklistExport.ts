import { buildMultiSheetXlsx, type XlsxCell, type XlsxSheet } from './xlsxWriter';
import { downloadBytes } from './xlsExport';
import { printHtmlDoc } from './printHtmlDoc';

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
  const totalRooms = preset.floors.reduce((s, f) => s + f.rooms.length, 0);

  let globalIdx = 1;

  // Build each room's compact table for the 2-column flow
  const roomsBlocksHtml = preset.floors
    .map(floor => {
      return floor.rooms
        .map(room => {
          const rTot = computeRoomTotal(room);
          const itemsRows = room.items
            .map(it => {
              const amt = computeItemAmount(it);
              return `
                <tr>
                  <td class="td-stt">${globalIdx++}</td>
                  <td class="td-name">${it.name}</td>
                  <td class="td-unit">${it.unit || 'Bộ/Cái'}</td>
                  <td class="td-qty">${it.quantity.toLocaleString('vi-VN')}</td>
                  <td class="td-price">${it.unitPrice.toLocaleString('vi-VN')}</td>
                  <td class="td-amt">${amt.toLocaleString('vi-VN')}</td>
                </tr>
              `;
            })
            .join('');

          return `
            <div class="room-box">
              <table class="item-table">
                <colgroup>
                  <col style="width: 5.5%;" />
                  <col style="width: 47.5%;" />
                  <col style="width: 7%;" />
                  <col style="width: 5%;" />
                  <col style="width: 17%;" />
                  <col style="width: 18%;" />
                </colgroup>
                <thead>
                  <tr class="room-title-row">
                    <th colspan="6">
                      <div class="room-title-flex">
                        <span>${floor.name.toUpperCase()} – ${room.name.toUpperCase()}</span>
                        <span class="room-sum">Cộng: ${rTot.toLocaleString('vi-VN')} đ</span>
                      </div>
                    </th>
                  </tr>
                  <tr class="col-head-row">
                    <th class="th-stt">STT</th>
                    <th class="th-name">HẠNG MỤC / VẬT DỤNG</th>
                    <th class="th-unit">ĐVT</th>
                    <th class="th-qty">SL</th>
                    <th class="th-price">ĐƠN GIÁ</th>
                    <th class="th-amt">THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsRows}
                </tbody>
              </table>
            </div>
          `;
        })
        .join('');
    })
    .join('');

  // 2-row horizontal summary table
  const summaryColsHeader = preset.floors
    .map(f => `<th style="border: 1px solid #cbd5e1; padding: 1.5px 3px;">${f.name}</th>`)
    .join('');

  const summaryColsData = preset.floors
    .map(f => {
      const fTot = computeFloorTotal(f);
      const pct = grandTotal > 0 ? ((fTot / grandTotal) * 100).toFixed(1) : '0';
      return `
        <td style="border: 1px solid #cbd5e1; padding: 1.5px 3px; text-align: right;">
          <strong>${fTot.toLocaleString('vi-VN')} đ</strong>
          <span style="color: #64748b; font-size: 7pt;">(${pct}%)</span>
        </td>
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
          size: A4 landscape;
          margin: 0;
        }
        @media print {
          @page {
            size: A4 landscape;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 4mm 6mm !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
        body {
          font-family: Arial, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, sans-serif;
          font-size: 7.5pt;
          color: #0f172a;
          margin: 0;
          padding: 4mm 6mm;
          line-height: 1.15;
          background: #fff;
        }
        .top-banner {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          border-bottom: 2px solid #1e3a8a;
          padding-bottom: 2px;
          margin-bottom: 3px;
        }
        .doc-title {
          font-size: 13pt;
          font-weight: 800;
          text-transform: uppercase;
          color: #1e3a8a;
          letter-spacing: 0.3px;
          margin: 0;
        }
        .doc-sub {
          font-size: 8pt;
          color: #475569;
          margin-top: 1px;
        }
        .doc-total-tag {
          font-size: 11pt;
          font-weight: 800;
          color: #b91c1c;
        }
        .summary-grid {
          width: 100%;
          border-collapse: collapse;
          font-size: 7.2pt;
          margin-bottom: 2px;
        }
        .summary-grid th {
          background: #f1f5f9;
          color: #334155;
          font-weight: 700;
          text-align: center;
        }
        .summary-words {
          font-size: 7.2pt;
          font-style: italic;
          color: #475569;
          margin-bottom: 4px;
        }
        .two-cols-wrapper {
          column-count: 2;
          column-gap: 5mm;
          column-fill: auto;
        }
        .room-box {
          break-inside: auto;
          margin-bottom: 3px;
        }
        .item-table {
          width: 100%;
          border-collapse: collapse;
          table-layout: fixed;
          font-size: 7.2pt;
          margin-bottom: 2px;
        }
        .item-table th, .item-table td {
          border: 1px solid #cbd5e1;
          padding: 1.5px 3px;
          vertical-align: middle;
          line-height: 1.15;
        }
        .room-title-row th {
          background: #1e3a8a !important;
          color: #ffffff !important;
          font-size: 7.5pt;
          font-weight: 700;
          padding: 2px 4px;
        }
        .room-title-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .room-sum {
          color: #fef08a !important;
          font-weight: 700;
        }
        .col-head-row th {
          background: #f1f5f9 !important;
          color: #334155 !important;
          font-size: 6.8pt;
          font-weight: 700;
          padding: 1.5px 2px;
          white-space: nowrap;
        }
        .th-stt { text-align: center; }
        .th-name { text-align: left; padding-left: 4px; }
        .th-unit { text-align: center; }
        .th-qty { text-align: right; padding-right: 3px; }
        .th-price { text-align: right; padding-right: 4px; }
        .th-amt { text-align: right; padding-right: 4px; }

        .td-stt {
          text-align: center;
          color: #64748b;
          font-size: 7pt;
          white-space: nowrap;
        }
        .td-name {
          text-align: left;
          font-weight: 500;
          color: #0f172a;
          white-space: normal;
          word-break: break-word;
          padding-left: 4px;
        }
        .td-unit {
          text-align: center;
          color: #64748b;
          font-size: 7pt;
          white-space: nowrap;
        }
        .td-qty {
          text-align: right;
          font-weight: 600;
          color: #0f172a;
          padding-right: 3px;
          white-space: nowrap;
        }
        .td-price {
          text-align: right;
          color: #334155;
          padding-right: 4px;
          white-space: nowrap;
        }
        .td-amt {
          text-align: right;
          font-weight: 700;
          color: #0f172a;
          padding-right: 4px;
          white-space: nowrap;
        }
        .sig-row {
          display: flex;
          justify-content: space-between;
          margin-top: 8px;
          break-inside: avoid;
          page-break-inside: avoid;
        }
        .sig-col {
          width: 45%;
          text-align: center;
          font-size: 7.5pt;
        }
        .sig-space {
          height: 35px;
        }
      </style>
    </head>
    <body>
      <!-- Top Title Banner -->
      <div class="top-banner">
        <div>
          <h1 class="doc-title">DANH SÁCH CHI TIẾT CÁC VẬT DỤNG CẦN MUA</h1>
          <div class="doc-sub">
            Công trình / Bản dựng: <strong>${preset.name}</strong> • Quy mô: <strong>${preset.floors.length} tầng</strong>, <strong>${totalRooms} phòng</strong>, <strong>${totalItems} hạng mục</strong>
          </div>
        </div>
        <div style="text-align: right; white-space: nowrap;">
          <div style="font-size: 7pt; color: #64748b;">Ngày lập: ${fmtDate(todayIso())}</div>
          <div class="doc-total-tag">TỔNG DỰ TOÁN: ${grandTotal.toLocaleString('vi-VN')} VNĐ</div>
        </div>
      </div>

      <!-- Compact 2-Row Summary Table -->
      <table class="summary-grid">
        <thead>
          <tr>
            <th style="border: 1px solid #cbd5e1; padding: 1.5px 4px; text-align: left; width: 105px;">TỔNG HỢP THEO TẦNG</th>
            ${summaryColsHeader}
            <th style="border: 1px solid #cbd5e1; padding: 1.5px 4px; background: #fef3c7; color: #b91c1c;">TỔNG CỘNG</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="border: 1px solid #cbd5e1; padding: 1.5px 4px; font-weight: bold;">Chi phí & Tỷ trọng:</td>
            ${summaryColsData}
            <td style="border: 1px solid #cbd5e1; padding: 1.5px 4px; text-align: right; font-weight: 800; background: #fef3c7; color: #b91c1c;">
              ${grandTotal.toLocaleString('vi-VN')} VNĐ
            </td>
          </tr>
        </tbody>
      </table>
      <div class="summary-words">
        (Bằng chữ: <strong>${moneyToVietnameseWords(grandTotal)}</strong>)
      </div>

      <!-- Two-Column Side-by-Side Checklist (Matching Excel Layout) -->
      <div class="two-cols-wrapper">
        ${roomsBlocksHtml}
      </div>

      <!-- Signature Section -->
      <div class="sig-row">
        <div class="sig-col">
          <strong>NGƯỜI LẬP BẢNG</strong><br>
          <span style="font-style: italic; color: #64748b;">(Ký và ghi rõ họ tên)</span>
          <div class="sig-space"></div>
        </div>
        <div class="sig-col">
          <strong>CHỦ ĐẦU TƯ / DUYỆT BẢNG</strong><br>
          <span style="font-style: italic; color: #64748b;">(Ký và ghi rõ họ tên)</span>
          <div class="sig-space"></div>
        </div>
      </div>
    </body>
    </html>
  `;

  return printHtmlDoc(html, `Du_Toan_Vat_Dung_${preset.name.replace(/\s+/g, '_')}`);
}
