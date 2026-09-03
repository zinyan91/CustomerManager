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

  // Flatten all items with floor and room metadata
  const allEntries: Array<{
    floorName: string;
    roomName: string;
    item: ShoppingPreset['floors'][0]['rooms'][0]['items'][0];
  }> = [];

  preset.floors.forEach(f => {
    f.rooms.forEach(r => {
      r.items.forEach(it => {
        allEntries.push({
          floorName: f.name,
          roomName: r.name,
          item: it,
        });
      });
    });
  });

  // Render a list of items for one column, grouping by floor/room
  const renderColHtml = (
    entries: typeof allEntries,
    startGlobalIdx: number
  ) => {
    if (entries.length === 0) return '';

    const groups: Array<{
      floorName: string;
      roomName: string;
      items: typeof entries[0]['item'][];
    }> = [];

    let curGroup: typeof groups[0] | null = null;
    entries.forEach(e => {
      if (
        !curGroup ||
        curGroup.floorName !== e.floorName ||
        curGroup.roomName !== e.roomName
      ) {
        curGroup = {
          floorName: e.floorName,
          roomName: e.roomName,
          items: [e.item],
        };
        groups.push(curGroup);
      } else {
        curGroup.items.push(e.item);
      }
    });

    let runningIdx = startGlobalIdx;
    return groups
      .map(g => {
        const groupSubtotal = g.items.reduce(
          (sum, it) => sum + computeItemAmount(it),
          0
        );
        const rowsHtml = g.items
          .map(it => {
            const amt = computeItemAmount(it);
            return `
              <tr>
                <td class="td-stt">${runningIdx++}</td>
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
                      <span>${g.floorName.toUpperCase()} – ${g.roomName.toUpperCase()}</span>
                      <span class="room-sum">Cộng: ${groupSubtotal.toLocaleString('vi-VN')} đ</span>
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
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      })
      .join('');
  };

  // Divide into strictly balanced pages and balanced columns
  const total = allEntries.length;
  interface PagePartition {
    leftEntries: typeof allEntries;
    rightEntries: typeof allEntries;
    startIdxLeft: number;
    startIdxRight: number;
  }

  const pagesData: PagePartition[] = [];

  if (total <= 56) {
    const half = Math.ceil(total / 2);
    pagesData.push({
      leftEntries: allEntries.slice(0, half),
      rightEntries: allEntries.slice(half),
      startIdxLeft: 1,
      startIdxRight: half + 1,
    });
  } else {
    // 2 Pages: Page 1 gets up to 60 items (30 left, 30 right) to guarantee zero overflow
    const p1Total = Math.min(60, Math.ceil((total * 0.55) / 2) * 2);
    const p1Half = p1Total / 2;

    pagesData.push({
      leftEntries: allEntries.slice(0, p1Half),
      rightEntries: allEntries.slice(p1Half, p1Total),
      startIdxLeft: 1,
      startIdxRight: p1Half + 1,
    });

    const p2Entries = allEntries.slice(p1Total);
    const p2Half = Math.ceil(p2Entries.length / 2);

    pagesData.push({
      leftEntries: p2Entries.slice(0, p2Half),
      rightEntries: p2Entries.slice(p2Half),
      startIdxLeft: p1Total + 1,
      startIdxRight: p1Total + p2Half + 1,
    });
  }

  // Build HTML for each page
  const pagesHtml = pagesData
    .map((p, pIdx) => {
      const isFirst = pIdx === 0;
      const isLast = pIdx === pagesData.length - 1;

      const colLeftHtml = renderColHtml(p.leftEntries, p.startIdxLeft);
      const colRightHtml = renderColHtml(p.rightEntries, p.startIdxRight);

      const topSectionHtml = isFirst
        ? `
          <!-- Minimalist Title Header (No subtitle, no date) -->
          <div class="doc-header-simple">
            <h1 class="doc-title">DANH SÁCH CHI TIẾT CÁC VẬT DỤNG CẦN MUA</h1>
          </div>
        `
        : `
          <!-- Secondary Page Header (Clean, minimalist) -->
          <div class="doc-header-simple" style="margin-bottom: 5px; padding-bottom: 3px;">
            <div class="doc-title" style="font-size: 10.5pt;">
              DANH SÁCH CHI TIẾT CÁC VẬT DỤNG CẦN MUA (TIẾP THEO)
            </div>
          </div>
        `;

      const sigHtml = isLast
        ? `
          <!-- Total and Signature (No annotations, no date) -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-top: 8px;">
            <div style="font-size: 8.5pt; font-weight: bold; padding: 3px 6px; border: 1px solid #000; background: #f3f4f6;">
              TỔNG CỘNG: ${grandTotal.toLocaleString('vi-VN')} VNĐ
            </div>
            <div class="sig-box">
              <strong>NGƯỜI LẬP BẢNG</strong><br>
              <span style="font-style: italic; font-size: 7.5pt; color: #333;">(Ký, ghi rõ họ tên)</span>
              <div class="sig-space"></div>
            </div>
          </div>
        `
        : '';

      return `
        <div class="print-page ${isLast ? 'last-page' : ''}">
          ${topSectionHtml}
          <div class="page-cols">
            <div class="col-half">${colLeftHtml}</div>
            <div class="col-half">${colRightHtml}</div>
          </div>
          ${sigHtml}
        </div>
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
          .print-page {
            page-break-after: always;
            break-after: page;
          }
          .print-page.last-page {
            page-break-after: auto;
            break-after: auto;
          }
        }
        body {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 7.5pt;
          color: #000;
          margin: 0;
          padding: 4mm 6mm;
          line-height: 1.15;
          background: #fff;
        }
        .doc-header-simple {
          text-align: center;
          margin-bottom: 5px;
          border-bottom: 1px solid #000;
          padding-bottom: 3px;
        }
        .doc-title {
          font-size: 13pt;
          font-weight: bold;
          text-transform: uppercase;
          color: #000;
          margin: 0;
          letter-spacing: 0.2px;
        }
        .doc-sub {
          font-size: 8pt;
          color: #000;
          margin-top: 2px;
        }
        .page-cols {
          display: flex;
          gap: 5mm;
          align-items: flex-start;
          width: 100%;
        }
        .col-half {
          flex: 1;
          min-width: 0;
        }
        .room-box {
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
          border: 1px solid #000;
          padding: 1.5px 3px;
          vertical-align: middle;
          line-height: 1.15;
        }
        .room-title-row th {
          background: #e5e7eb !important;
          color: #000 !important;
          font-size: 7.5pt;
          font-weight: bold;
          padding: 2px 4px;
          border: 1px solid #000;
        }
        .room-title-flex {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .room-sum {
          color: #000 !important;
          font-weight: bold;
        }
        .col-head-row th {
          background: #f3f4f6 !important;
          color: #000 !important;
          font-size: 6.8pt;
          font-weight: bold;
          padding: 1.5px 2px;
          white-space: nowrap;
          border: 1px solid #000;
        }
        .th-stt { text-align: center; }
        .th-name { text-align: left; padding-left: 4px; }
        .th-unit { text-align: center; }
        .th-qty { text-align: right; padding-right: 3px; }
        .th-price { text-align: right; padding-right: 4px; }
        .th-amt { text-align: right; padding-right: 4px; }

        .td-stt {
          text-align: center;
          color: #000;
          font-size: 7pt;
          white-space: nowrap;
        }
        .td-name {
          text-align: left;
          font-weight: 500;
          color: #000;
          white-space: normal;
          word-break: break-word;
          padding-left: 4px;
        }
        .td-unit {
          text-align: center;
          color: #000;
          font-size: 7pt;
          white-space: nowrap;
        }
        .td-qty {
          text-align: right;
          font-weight: bold;
          color: #000;
          padding-right: 3px;
          white-space: nowrap;
        }
        .td-price {
          text-align: right;
          color: #000;
          padding-right: 4px;
          white-space: nowrap;
        }
        .td-amt {
          text-align: right;
          font-weight: bold;
          color: #000;
          padding-right: 4px;
          white-space: nowrap;
        }
        .sig-container {
          display: flex;
          justify-content: flex-end;
          margin-top: 10px;
          page-break-inside: avoid;
        }
        .sig-box {
          width: 200px;
          text-align: center;
          font-size: 8pt;
          color: #000;
        }
        .sig-space {
          height: 38px;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;

  return printHtmlDoc(html, `Du_Toan_Vat_Dung_${preset.name.replace(/\s+/g, '_')}`);
}
