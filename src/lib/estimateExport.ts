import {
  buildXlsx,
  type XlsxCell,
  type XlsxSheet,
  type XlsxStyle,
  sanitizeSheetName,
} from './xlsxWriter';

export interface EstimateItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
  note?: string;
}

export interface EstimateData {
  sheetTitle?: string;
  items: EstimateItem[];
  loanAmount?: number;
  unitPrice?: number;
  creatorTitle?: string;
  creatorName?: string;
  siteAddress?: string;
  contractDate?: string;
  partyAName?: string;
  partyBName?: string;
  orientation?: 'landscape' | 'portrait';
}

export interface EstimatePreset {
  id: string;
  label: string;
  title: string;
  loanAmount: number;
  unitPrice: number;
  items: EstimateItem[];
}

export const ESTIMATE_PRESETS: Record<string, EstimatePreset> = {
  sua_chua_nha: {
    id: 'sua_chua_nha',
    label: 'Sửa chữa nhà (19 hạng mục - 1.078.500.000đ)',
    title: 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT',
    loanAmount: 960000000,
    unitPrice: 6000000,
    items: [
      { id: '1', name: 'Sửa chữa tường (vữa, sơn)', unit: 'm²', quantity: 40.5, price: 6000000, note: 'Vẽ lại tường, bả vữa, sơn lại' },
      { id: '2', name: 'Thay thế gạch lát nền', unit: 'm²', quantity: 40.5, price: 6000000, note: 'Thay gạch lát sàn mới' },
      { id: '3', name: 'Lắp đặt hệ thống điện (đi dây, ổ cắm)', unit: 'm', quantity: 12, price: 2600000, note: 'Đi lại hệ thống điện' },
      { id: '4', name: 'Sửa chữa cửa (sơn lại, thay bản lề)', unit: 'Cái', quantity: 2, price: 5000000, note: 'Sơn cửa, thay bản lề' },
      { id: '5', name: 'Sửa chữa mái tôn (vệ sinh, sơn lại)', unit: 'm²', quantity: 45, price: 2200000, note: 'Sơn lại mái tôn' },
      { id: '6', name: 'Sơn tường ngoài', unit: 'm²', quantity: 30, price: 1000000, note: 'Sơn lại tường ngoài nhà' },
      { id: '7', name: 'Vệ sinh tổng thể', unit: 'Mỗi lần', quantity: 1, price: 5000000, note: 'Dọn dẹp vệ sinh toàn bộ nhà' },
      { id: '8', name: 'Lắp đặt trần thạch cao', unit: 'm²', quantity: 45, price: 280000, note: 'Lắp trần thạch cao cho các phòng' },
      { id: '9', name: 'Lắp đặt hệ thống chiếu sáng hiện đại', unit: 'Cái', quantity: 15, price: 1000000, note: 'Lắp đèn chiếu sáng LED hiện đại' },
      { id: '10', name: 'Thay thế cửa cuốn, cửa nhựa', unit: 'Cái', quantity: 1, price: 1500000, note: 'Thay mới cửa cuốn, cửa nhựa' },
      { id: '11', name: 'Thay thế cửa nhôm, cửa kính hư hỏng tại ban công', unit: 'Cái', quantity: 10, price: 2200000, note: 'Thay cửa hư hỏng' },
      { id: '12', name: 'Chống thấm, sửa chữa sân thượng và mái che', unit: 'm²', quantity: 40, price: 700000, note: 'Chống thấm, sửa mái, không đục phá kết cấu' },
      { id: '13', name: 'Cải tạo, ốp lát lại nhà vệ sinh tầng trệt', unit: 'm²', quantity: 40.5, price: 3200000, note: 'Ốp lát, thay thiết bị, không thay đổi tường chịu lực' },
      { id: '14', name: 'Cải tạo, ốp lát lại nhà vệ sinh các tầng 1', unit: 'm²', quantity: 37.5, price: 3200000, note: 'Cải tạo hoàn thiện, giữ nguyên kết cấu' },
      { id: '15', name: 'Sơn bả lại trần nhà phòng khách và các tầng', unit: 'm²', quantity: 36, price: 450000, note: 'Hoàn thiện sơn bả trần' },
      { id: '16', name: 'Lắp đặt bổ sung đèn LED chiếu sáng trong nhà', unit: 'Cái', quantity: 4, price: 850000, note: 'Bổ sung đèn LED tiết kiệm điện' },
      { id: '17', name: 'Lát gạch hoàn thiện ban công, lô gia', unit: 'm²', quantity: 50, price: 500000, note: 'Lát gạch hoàn thiện khu vực ban công' },
      { id: '18', name: 'Sửa chữa, thay mới tủ bếp, mặt bàn bếp', unit: 'Bộ', quantity: 5, price: 4600000, note: 'Thay tủ bếp, mặt bàn, không can thiệp kết cấu' },
      { id: '19', name: 'Sửa chữa, sơn mới lan can và tay vịn cầu thang', unit: 'm', quantity: 30, price: 700000, note: 'Sơn sửa lan can, tay vịn, đảm bảo an toàn' },
    ],
  },
  xay_nha_moi: {
    id: 'xay_nha_moi',
    label: 'Xây nhà mới (29 hạng mục - 1.239.250.000đ)',
    title: 'BẢNG DỰ TOÁN CÔNG TRÌNH XÂY NHÀ MỚI CHI TIẾT',
    loanAmount: 300000000,
    unitPrice: 0,
    items: [
      { id: '1', name: 'Sửa chữa tường (vữa, sơn)', unit: 'm²', quantity: 35, price: 2500000, note: 'Vẽ lại tường, bả vữa, sơn lại' },
      { id: '2', name: 'Thay thế gạch lát nền', unit: 'm²', quantity: 35, price: 2500000, note: 'Thay gạch lát sàn mới' },
      { id: '3', name: 'Lắp đặt hệ thống điện (đi dây, ổ cắm)', unit: 'm', quantity: 50, price: 1200000, note: 'Đi lại hệ thống điện' },
      { id: '4', name: 'Sửa chữa cửa (sơn lại, thay bản lề)', unit: 'Cái', quantity: 3, price: 5000000, note: 'Sơn cửa, thay bản lề' },
      { id: '5', name: 'Sửa chữa mái tôn (vệ sinh, sơn lại)', unit: 'm²', quantity: 50, price: 2200000, note: 'Sơn lại mái tôn' },
      { id: '6', name: 'Thay mới hệ thống cấp thoát nước', unit: 'm', quantity: 40, price: 3000000, note: 'Thay đường ống cấp thoát nước' },
      { id: '7', name: 'Sửa chữa hệ thống cấp nước nóng', unit: 'm', quantity: 40, price: 2500000, note: 'Sửa lại hệ thống nước nóng' },
      { id: '8', name: 'Sơn tường ngoài', unit: 'm²', quantity: 50, price: 1000000, note: 'Sơn lại tường ngoài nhà' },
      { id: '9', name: 'Thay thế kính cửa sổ', unit: 'm²', quantity: 50, price: 3000000, note: 'Thay kính cửa sổ' },
      { id: '10', name: 'Vệ sinh tổng thể', unit: 'Mỗi lần', quantity: 2, price: 5000000, note: 'Dọn dẹp vệ sinh toàn bộ nhà' },
      { id: '11', name: 'Lắp đặt trần thạch cao', unit: 'm²', quantity: 30, price: 200000, note: 'Lắp trần thạch cao cho các phòng' },
      { id: '12', name: 'Lắp đặt hệ thống chiếu sáng hiện đại', unit: 'Cái', quantity: 15, price: 1000000, note: 'Lắp đèn chiếu sáng LED hiện đại' },
      { id: '13', name: 'Thay thế cửa cuốn, cửa nhựa', unit: 'Cái', quantity: 2, price: 1500000, note: 'Thay mới cửa cuốn, cửa nhựa' },
      { id: '14', name: 'Đào đất, đào móng', unit: 'm³', quantity: 30, price: 350000, note: 'Đào đất, đào móng xây dựng' },
      { id: '15', name: 'Lót sân (gạch, bê tông)', unit: 'm²', quantity: 40, price: 550000, note: 'Lót sân, đường đi' },
      { id: '16', name: 'Xây dựng hàng rào (gạch, bê tông)', unit: 'm', quantity: 30, price: 700000, note: 'Xây hàng rào bằng gạch, bê tông' },
      { id: '17', name: 'Thay thế cửa nhôm, cửa kính hư hỏng tại ban công', unit: 'Cái', quantity: 10, price: 2200000, note: 'Thay cửa hư hỏng, không thay đổi kích thước ô chờ' },
      { id: '18', name: 'Chống thấm, sửa chữa sân thượng và mái che', unit: 'm²', quantity: 40, price: 700000, note: 'Chống thấm, sửa mái, không đục phá kết cấu' },
      { id: '19', name: 'Cải tạo, ốp lát lại nhà vệ sinh tầng trệt', unit: 'm²', quantity: 75, price: 700000, note: 'Ốp lát, thay thiết bị, không thay đổi tường chịu lực' },
      { id: '20', name: 'Cải tạo, ốp lát lại nhà vệ sinh các tầng 1', unit: 'm²', quantity: 75, price: 600000, note: 'Cải tạo hoàn thiện, giữ nguyên kết cấu' },
      { id: '21', name: 'Cải tạo, ốp lát lại nhà vệ sinh các tầng 2', unit: 'm²', quantity: 75, price: 600000, note: 'Cải tạo hoàn thiện, giữ nguyên kết cấu' },
      { id: '22', name: 'Cải tạo, ốp lát lại nhà vệ sinh các tầng 3', unit: 'm²', quantity: 75, price: 600000, note: 'Cải tạo hoàn thiện, giữ nguyên kết cấu' },
      { id: '23', name: 'Sơn bả lại trần nhà phòng khách và các tầng', unit: 'm²', quantity: 75, price: 250000, note: 'Hoàn thiện sơn bả trần' },
      { id: '24', name: 'Lắp đặt bổ sung đèn LED chiếu sáng trong nhà', unit: 'Cái', quantity: 20, price: 500000, note: 'Bổ sung đèn LED tiết kiệm điện' },
      { id: '25', name: 'Bổ sung ổ cắm, công tắc, thiết bị điện', unit: 'Cái', quantity: 20, price: 500000, note: 'Bổ sung ổ cắm, công tắc cho các phòng' },
      { id: '26', name: 'Lát gạch hoàn thiện ban công, lô gia', unit: 'm²', quantity: 50, price: 500000, note: 'Lát gạch hoàn thiện khu vực ban công' },
      { id: '27', name: 'Thi công trần thạch cao hành lang, ban công', unit: 'm²', quantity: 50, price: 350000, note: 'Trần thạch cao trang trí, che MEP' },
      { id: '28', name: 'Sửa chữa, thay mới tủ bếp, mặt bàn bếp', unit: 'Bộ', quantity: 5, price: 4600000, note: 'Thay tủ bếp, mặt bàn, không can thiệp kết cấu' },
      { id: '29', name: 'Sửa chữa, sơn mới lan can và tay vịn cầu thang', unit: 'm', quantity: 60, price: 500000, note: 'Sơn sửa lan can, tay vịn, đảm bảo an toàn' },
    ],
  },
  tan_ngoc: {
    id: 'tan_ngoc',
    label: 'Tấn Ngọc - Cải tạo KD (17 hạng mục - 3.226.500.000đ)',
    title: 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT',
    loanAmount: 3000000000,
    unitPrice: 5000000,
    items: [
      { id: '1', name: 'Sơn sửa toàn bộ công trình', unit: 'm²', quantity: 750, price: 250000, note: 'Nội + ngoại' },
      { id: '2', name: 'Ốp lát nền, tường', unit: 'm²', quantity: 320, price: 600000, note: '' },
      { id: '3', name: 'Trần thạch cao + trang trí', unit: 'm²', quantity: 200, price: 450000, note: '' },
      { id: '4', name: 'Cải tạo hệ thống điện', unit: 'gói', quantity: 1, price: 54000000, note: 'Đi lại toàn bộ' },
      { id: '5', name: 'Cải tạo hệ thống nước', unit: 'gói', quantity: 1, price: 140000000, note: '' },
      { id: '6', name: 'Thay mới cửa các loại', unit: 'bộ', quantity: 25, price: 8000000, note: '' },
      { id: '7', name: 'Cải tạo nhà vệ sinh', unit: 'm²', quantity: 200, price: 1600000, note: '' },
      { id: '8', name: 'Chống thấm tổng thể', unit: 'm²', quantity: 300, price: 400000, note: '' },
      { id: '9', name: 'Hệ thống chiếu sáng', unit: 'bộ', quantity: 50, price: 1500000, note: '' },
      { id: '10', name: 'Cải tạo bếp, khu kinh doanh', unit: 'gói', quantity: 1, price: 50000000, note: '' },
      { id: '11', name: 'Nội thất rời', unit: 'gói', quantity: 1, price: 800000000, note: '' },
      { id: '12', name: 'Thiết bị điện máy', unit: 'gói', quantity: 1, price: 500000000, note: '' },
      { id: '13', name: 'Mặt tiền, bảng hiệu', unit: 'gói', quantity: 1, price: 200000000, note: '' },
      { id: '14', name: 'Trang trí nội thất', unit: 'gói', quantity: 1, price: 80000000, note: '' },
      { id: '15', name: 'Nhân công tổng hợp', unit: 'gói', quantity: 1, price: 120000000, note: '' },
      { id: '16', name: 'Chi phí quản lý, vận chuyển', unit: 'gói', quantity: 1, price: 48000000, note: '' },
      { id: '17', name: 'Dự phòng phát sinh', unit: 'gói', quantity: 1, price: 50000000, note: '' },
    ],
  },
  nha_tro: {
    id: 'nha_tro',
    label: 'Nhà trọ (13 hạng mục - 2.350.750.000đ)',
    title: 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT - NHÀ TRỌ',
    loanAmount: 2000000000,
    unitPrice: 0,
    items: [
      { id: '1', name: 'Sơn sửa', unit: 'm²', quantity: 250, price: 200000, note: '' },
      { id: '2', name: 'Nền', unit: 'm²', quantity: 75, price: 350000, note: '' },
      { id: '3', name: 'Trần', unit: 'm²', quantity: 75, price: 300000, note: '' },
      { id: '4', name: 'WC', unit: 'm²', quantity: 60, price: 1200000, note: '' },
      { id: '5', name: 'Điện nước', unit: 'gói', quantity: 1, price: 120000000, note: '' },
      { id: '6', name: 'Cửa', unit: 'bộ', quantity: 12, price: 5000000, note: '' },
      { id: '7', name: 'Ngăn phòng', unit: 'm²', quantity: 120, price: 300000, note: '' },
      { id: '8', name: 'Nội thất cơ bản', unit: 'phòng', quantity: 6, price: 15000000, note: '' },
      { id: '9', name: 'Nội thất full phòng', unit: 'phòng', quantity: 6, price: 80000000, note: '' },
      { id: '10', name: 'Thiết bị (máy lạnh, tủ…)', unit: 'phòng', quantity: 6, price: 50000000, note: '' },
      { id: '11', name: 'Trang bị vận hành', unit: 'gói', quantity: 1, price: 400000000, note: '' },
      { id: '12', name: 'Chi phí setup kinh doanh', unit: 'gói', quantity: 1, price: 300000000, note: '' },
      { id: '13', name: 'Dự phòng', unit: 'gói', quantity: 1, price: 394000000, note: '' },
    ],
  },
};

export function buildEstimateDocHtml(data: EstimateData): string {
  const isLandscape = data.orientation !== 'portrait';
  const title = data.sheetTitle || 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT';
  const items = data.items || [];
  const total = items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const loan = data.loanAmount !== undefined && data.loanAmount > 0 ? data.loanAmount : Math.round(total * 0.8);
  const own = Math.max(0, total - loan);
  const loanPct = total > 0 ? ((loan / total) * 100).toFixed(2) + '%' : '0.00%';
  const ownPct = total > 0 ? ((own / total) * 100).toFixed(2) + '%' : '0.00%';
  const unitPrice = data.unitPrice || 0;
  const creatorTitle = data.creatorTitle || 'Người lập';
  const creatorName = data.creatorName || '';

  const colWidths = isLandscape
    ? { stt: '4%', name: '41%', unit: '6%', qty: '6%', price: '10.5%', total: '12.5%', note: '20%' }
    : { stt: '4%', name: '42%', unit: '6.5%', qty: '6.5%', price: '11%', total: '13%', note: '17%' };

  const rowsHtml = items.map((it, idx) => `
    <tr style="page-break-inside: avoid;">
      <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: center; white-space: nowrap;">${idx + 1}</td>
      <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: left;">${it.name}</td>
      <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: center; white-space: nowrap;">${it.unit}</td>
      <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: right; white-space: nowrap;">${it.quantity}</td>
      <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: right; white-space: nowrap;">${it.price.toLocaleString('vi-VN')}</td>
      <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: right; white-space: nowrap; font-weight: 500;">${(it.quantity * it.price).toLocaleString('vi-VN')}</td>
      <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: left;">${it.note || ''}</td>
    </tr>
  `).join('');

  return `
<style>
  @page {
    size: A4 ${isLandscape ? 'landscape' : 'portrait'};
    margin: ${isLandscape ? '8mm 12mm 8mm 12mm' : '12mm 15mm 12mm 15mm'} !important;
  }
  body {
    margin: 0;
    padding: 0;
    background: transparent;
  }
  .vhtt-doc {
    font-family: 'Times New Roman', Times, serif !important;
    font-size: 10.5pt !important;
    line-height: 1.25 !important;
    color: #000000 !important;
    width: 100% !important;
    max-width: ${isLandscape ? '277mm' : '190mm'} !important;
    margin: 0 auto !important;
    box-sizing: border-box !important;
    background: #ffffff !important;
    padding: ${isLandscape ? '6mm 8mm' : '10mm 12mm'} !important;
  }
  .vhtt-doc h1 {
    font-size: 13pt !important;
    font-weight: bold !important;
    text-transform: uppercase !important;
    text-align: center !important;
    margin: 2pt 0 10pt 0 !important;
  }
  .table-bordered {
    width: 100% !important;
    border-collapse: collapse !important;
    margin-bottom: 6pt !important;
    font-size: 9.5pt !important;
  }
  .table-bordered th, .table-bordered td {
    border: 1px solid #000000 !important;
    padding: 2.5pt 4pt !important;
    vertical-align: middle !important;
  }
  .table-bordered thead tr {
    background-color: #f2f2f2 !important;
    font-weight: bold !important;
    text-align: center !important;
  }
  @media print {
    body { background: #ffffff !important; margin: 0 !important; padding: 0 !important; }
    .vhtt-doc {
      width: 100% !important;
      max-width: none !important;
      padding: 0 !important;
    }
  }
</style>
<div class="vhtt-doc font-serif" style="color: #000; line-height: 1.25;">
  <div style="text-align: center; margin-bottom: 10pt;">
    <h1 style="font-size: 13pt; font-weight: bold; margin: 2pt 0; text-transform: uppercase;">
      ${title}
    </h1>
  </div>

  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 6pt; font-size: 9.5pt;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="width: ${colWidths.stt}; border: 1px solid #000; padding: 2.5pt 4pt;">STT</th>
        <th style="width: ${colWidths.name}; border: 1px solid #000; padding: 2.5pt 4pt;">Tên Hạng Mục</th>
        <th style="width: ${colWidths.unit}; border: 1px solid #000; padding: 2.5pt 4pt;">Đơn Vị Tính</th>
        <th style="width: ${colWidths.qty}; border: 1px solid #000; padding: 2.5pt 4pt;">Số Lượng</th>
        <th style="width: ${colWidths.price}; border: 1px solid #000; padding: 2.5pt 4pt;">Đơn Giá</th>
        <th style="width: ${colWidths.total}; border: 1px solid #000; padding: 2.5pt 4pt;">Thành Tiền</th>
        <th style="width: ${colWidths.note}; border: 1px solid #000; padding: 2.5pt 4pt;">Ghi Chú</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
      <tr style="font-weight: bold; page-break-inside: avoid;">
        <td colspan="5" style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: left;">Tổng cộng</td>
        <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: right; white-space: nowrap;">${total.toLocaleString('vi-VN')}</td>
        <td style="border: 1px solid #000; padding: 2.5pt 4pt;"></td>
      </tr>
      <tr style="font-weight: bold; page-break-inside: avoid;">
        <td colspan="5" style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: left;">Vốn vay</td>
        <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: right; white-space: nowrap;">${loan.toLocaleString('vi-VN')}</td>
        <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: right; white-space: nowrap;">${loanPct}</td>
      </tr>
      <tr style="font-weight: bold; page-break-inside: avoid;">
        <td colspan="5" style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: left;">Vốn tự có</td>
        <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: right; white-space: nowrap;">${own.toLocaleString('vi-VN')}</td>
        <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: right; white-space: nowrap;">${ownPct}</td>
      </tr>
      ${unitPrice > 0 ? `
      <tr style="font-weight: bold; page-break-inside: avoid;">
        <td colspan="5" style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: left;">Đơn giá</td>
        <td style="border: 1px solid #000; padding: 2.5pt 4pt; text-align: right; white-space: nowrap;">${unitPrice.toLocaleString('vi-VN')}</td>
        <td style="border: 1px solid #000; padding: 2.5pt 4pt;"></td>
      </tr>` : ''}
    </tbody>
  </table>

  <div style="margin-top: 10pt; display: flex; justify-content: flex-end; page-break-inside: avoid;">
    <div style="width: 240px; text-align: center;">
      <p style="font-weight: bold; margin: 2pt 0; font-size: 10pt;">${creatorTitle}</p>
      <div style="height: 55px;"></div>
      ${creatorName ? `<p style="font-weight: bold; margin: 2pt 0;">${creatorName}</p>` : ''}
    </div>
  </div>
</div>
  `.trim();
}

export function buildEstimateXlsx(data: EstimateData): Uint8Array {
  const title = data.sheetTitle || 'BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT';
  const items = data.items || [];
  const rows: XlsxCell[][] = [];
  const merges: string[] = [];

  const titleStyle: XlsxStyle = { bold: true, align: 'center', vAlign: 'center' };
  const thStyle: XlsxStyle = { bold: true, align: 'center', vAlign: 'center', border: true, fill: 'F2F2F2' };
  const cCenter: XlsxStyle = { align: 'center', vAlign: 'center', border: true };
  const cLeft: XlsxStyle = { align: 'left', vAlign: 'center', border: true };
  const cRight: XlsxStyle = { align: 'right', vAlign: 'center', border: true };
  const cNum: XlsxStyle = { align: 'right', vAlign: 'center', border: true, numFmt: '#,##0' };
  const cBoldLeft: XlsxStyle = { bold: true, align: 'left', vAlign: 'center', border: true };
  const cBoldNum: XlsxStyle = { bold: true, align: 'right', vAlign: 'center', border: true, numFmt: '#,##0' };
  const cBoldPct: XlsxStyle = { bold: true, align: 'right', vAlign: 'center', border: true, numFmt: '0.00%' };
  const cEmptyBorder: XlsxStyle = { border: true };

  // Row 1: Tiêu đề
  rows.push([
    { value: title, style: titleStyle },
    { value: '', style: titleStyle },
    { value: '', style: titleStyle },
    { value: '', style: titleStyle },
    { value: '', style: titleStyle },
    { value: '', style: titleStyle },
    { value: '', style: titleStyle },
  ]);
  merges.push('A1:G1');

  // Row 2: Trống
  rows.push([]);

  // Row 3: Header
  rows.push([
    { value: 'STT', style: thStyle },
    { value: 'Tên Hạng Mục', style: thStyle },
    { value: 'Đơn Vị Tính', style: thStyle },
    { value: 'Số Lượng', style: thStyle },
    { value: 'Đơn Giá', style: thStyle },
    { value: 'Thành Tiền', style: thStyle },
    { value: 'Ghi Chú', style: thStyle },
  ]);

  // Data rows (Bắt đầu từ hàng 4, index 3 trong 0-based, row số 4 trong Excel)
  const startRow = 4;
  items.forEach((it, idx) => {
    const rIdx = startRow + idx;
    rows.push([
      { value: idx + 1, numeric: true, style: cCenter },
      { value: it.name, style: cLeft },
      { value: it.unit, style: cCenter },
      { value: it.quantity, numeric: true, style: cRight },
      { value: it.price, numeric: true, style: cNum },
      {
        value: it.quantity * it.price,
        numeric: true,
        formula: `D${rIdx}*E${rIdx}`,
        style: cNum,
      },
      { value: it.note || '', style: cLeft },
    ]);
  });

  const lastDataRow = startRow + items.length - 1;
  const totalRow = lastDataRow + 1;
  const computedTotal = items.reduce((s, i) => s + i.quantity * i.price, 0);

  // Row: Tổng cộng
  rows.push([
    { value: 'Tổng cộng', style: cBoldLeft },
    { value: '', style: cEmptyBorder },
    { value: '', style: cEmptyBorder },
    { value: '', style: cEmptyBorder },
    { value: '', style: cEmptyBorder },
    {
      value: computedTotal,
      numeric: true,
      formula: items.length > 0 ? `SUM(F${startRow}:F${lastDataRow})` : '0',
      style: cBoldNum,
    },
    { value: '', style: cEmptyBorder },
  ]);
  merges.push(`A${totalRow}:E${totalRow}`);

  // Row: Vốn vay
  const loanRow = totalRow + 1;
  const loanVal = data.loanAmount !== undefined && data.loanAmount > 0
    ? data.loanAmount
    : Math.round(computedTotal * 0.8);
  const loanPctVal = computedTotal > 0 ? loanVal / computedTotal : 0;

  rows.push([
    { value: 'Vốn vay', style: cBoldLeft },
    { value: '', style: cEmptyBorder },
    { value: '', style: cEmptyBorder },
    { value: '', style: cEmptyBorder },
    { value: '', style: cEmptyBorder },
    { value: loanVal, numeric: true, style: cBoldNum },
    {
      value: loanPctVal,
      numeric: true,
      formula: `F${loanRow}/F${totalRow}`,
      style: cBoldPct,
    },
  ]);
  merges.push(`A${loanRow}:E${loanRow}`);

  // Row: Vốn tự có
  const ownRow = loanRow + 1;
  const ownVal = Math.max(0, computedTotal - loanVal);
  const ownPctVal = computedTotal > 0 ? ownVal / computedTotal : 0;

  rows.push([
    { value: 'Vốn tự có', style: cBoldLeft },
    { value: '', style: cEmptyBorder },
    { value: '', style: cEmptyBorder },
    { value: '', style: cEmptyBorder },
    { value: '', style: cEmptyBorder },
    {
      value: ownVal,
      numeric: true,
      formula: `F${totalRow}-F${loanRow}`,
      style: cBoldNum,
    },
    {
      value: ownPctVal,
      numeric: true,
      formula: `F${ownRow}/F${totalRow}`,
      style: cBoldPct,
    },
  ]);
  merges.push(`A${ownRow}:E${ownRow}`);

  // Row: Đơn giá (nếu có)
  let nextRow = ownRow + 1;
  if (data.unitPrice && data.unitPrice > 0) {
    rows.push([
      { value: 'Đơn giá', style: cBoldLeft },
      { value: '', style: cEmptyBorder },
      { value: '', style: cEmptyBorder },
      { value: '', style: cEmptyBorder },
      { value: '', style: cEmptyBorder },
      { value: data.unitPrice, numeric: true, style: cBoldNum },
      { value: '', style: cEmptyBorder },
    ]);
    merges.push(`A${nextRow}:E${nextRow}`);
    nextRow++;
  }

  // Dòng trống
  rows.push([]);
  nextRow++;

  // Row: Người lập
  const sigRow = nextRow;
  rows.push([
    { value: '' },
    { value: '' },
    { value: '' },
    { value: '' },
    { value: data.creatorTitle || 'Người lập', style: { bold: true, align: 'center' } },
    { value: '' },
    { value: '' },
  ]);
  merges.push(`E${sigRow}:G${sigRow}`);

  if (data.creatorName) {
    rows.push([]);
    rows.push([]);
    rows.push([
      { value: '' },
      { value: '' },
      { value: '' },
      { value: '' },
      { value: data.creatorName, style: { bold: true, align: 'center' } },
      { value: '' },
      { value: '' },
    ]);
    merges.push(`E${sigRow + 3}:G${sigRow + 3}`);
  }

  const sheet: XlsxSheet = {
    name: sanitizeSheetName('DU_TOAN_CHI_TIET'),
    rows,
    colWidths: [6, 46, 10, 9, 13, 15, 38],
    merges,
  };

  return buildXlsx(sheet);
}
