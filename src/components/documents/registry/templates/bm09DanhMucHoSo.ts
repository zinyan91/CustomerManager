import { FolderTree } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import { VHTT_STYLES } from './vhttStyles';

export type Bm09DocType = 'original' | 'compare' | 'certified_copy' | 'other';

export interface Bm09Item {
  id: string;
  stt: string;
  docName: string;
  docDate: string;
  docType: Bm09DocType;
  quantity: string;
  note: string;
}

export interface Bm09Section {
  partIndex: number;
  partTitle: string;
  items: Bm09Item[];
}

export interface Bm09Specific {
  customerName?: string;
  cif?: string;
  docDate?: string;
  sections?: Bm09Section[];
}

export const DEFAULT_BM09_SECTIONS: Bm09Section[] = [
  {
    partIndex: 1,
    partTitle: 'HỒ SƠ PHÁP LÝ',
    items: [
      { id: 'p1-1', stt: '1', docName: 'CCCD / Hộ chiếu / ĐKKD', docDate: '', docType: 'certified_copy', quantity: '01', note: '' },
      { id: 'p1-2', stt: '2', docName: 'Giấy xác nhận tình trạng hôn nhân / ĐKKH', docDate: '', docType: 'certified_copy', quantity: '01', note: '' },
    ],
  },
  {
    partIndex: 2,
    partTitle: 'HỒ SƠ CẤP TÍN DỤNG',
    items: [
      { id: 'p2-1', stt: '1', docName: 'Giấy đề nghị cấp tín dụng kiêm phương án vay vốn', docDate: '', docType: 'original', quantity: '01', note: '' },
      { id: 'p2-2', stt: '2', docName: 'Thông báo phê duyệt cấp tín dụng', docDate: '', docType: 'original', quantity: '01', note: '' },
      { id: 'p2-3', stt: '3', docName: 'Hợp đồng tín dụng / Khế ước nhận nợ', docDate: '', docType: 'original', quantity: '01', note: '' },
    ],
  },
  {
    partIndex: 3,
    partTitle: 'HỒ SƠ TÀI SẢN BẢO ĐẢM',
    items: [
      { id: 'p3-1', stt: '1', docName: 'Hợp đồng thế chấp / Cầm cố tài sản', docDate: '', docType: 'original', quantity: '01', note: '' },
      { id: 'p3-2', stt: '2', docName: 'Giấy chứng nhận QSDĐ / Sổ tiết kiệm / CCTG', docDate: '', docType: 'original', quantity: '01', note: '' },
      { id: 'p3-3', stt: '3', docName: 'Đơn yêu cầu đăng ký biện pháp bảo đảm', docDate: '', docType: 'original', quantity: '01', note: '' },
    ],
  },
  {
    partIndex: 4,
    partTitle: 'HỒ SƠ GIẢI NGÂN',
    items: [
      { id: 'p4-1', stt: '1', docName: 'Giấy đề nghị giải ngân (BM01)', docDate: '', docType: 'original', quantity: '01', note: '' },
      { id: 'p4-2', stt: '2', docName: 'Chứng từ chứng minh mục đích sử dụng vốn (HĐMB, Hóa đơn...)', docDate: '', docType: 'certified_copy', quantity: '01', note: '' },
    ],
  },
  {
    partIndex: 5,
    partTitle: 'HỒ SƠ TÀI CHÍNH',
    items: [
      { id: 'p5-1', stt: '1', docName: 'Chứng từ nguồn thu / Sao kê tài khoản', docDate: '', docType: 'compare', quantity: '01', note: '' },
    ],
  },
  {
    partIndex: 6,
    partTitle: 'HỒ SƠ KIỂM TRA SAU CHO VAY',
    items: [
      { id: 'p6-1', stt: '1', docName: 'Biên bản kiểm tra sau cho vay', docDate: '', docType: 'original', quantity: '01', note: '' },
    ],
  },
  {
    partIndex: 7,
    partTitle: 'HỒ SƠ KHÁC',
    items: [],
  },
];

export const defaultBm09Specific: Bm09Specific = {
  customerName: '',
  cif: '',
  docDate: '',
  sections: DEFAULT_BM09_SECTIONS,
};

export function buildBm09Html(common: DossierCommon, s: Bm09Specific = defaultBm09Specific): string {
  const custName = (s.customerName || common?.partyA?.name || '………………………………').toUpperCase();
  const cif = s.cif || common?.partyA?.cif || '……………………';

  // Format ngày tháng
  let dateText = '…….ngày ……tháng……năm……….';
  if (s.docDate) {
    const parts = s.docDate.split('-');
    if (parts.length === 3) {
      dateText = `ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
    }
  }

  const sections = s.sections && s.sections.length > 0 ? s.sections : DEFAULT_BM09_SECTIONS;

  const rowsHtml = sections.map(sec => {
    const headerRow = `
      <tr style="background-color: #f2f2f2; font-weight: bold;">
        <td style="text-align: center; width: 5%;">PHẦN ${sec.partIndex}</td>
        <td colspan="8" style="text-align: left; padding-left: 8pt;">${sec.partTitle}</td>
      </tr>
    `;

    const itemRows = sec.items.map((item, idx) => {
      const stt = item.stt || String(idx + 1);
      const isOrig = item.docType === 'original' ? '☑' : '';
      const isComp = item.docType === 'compare' ? '☑' : '';
      const isCert = item.docType === 'certified_copy' ? '☑' : '';
      const isOther = item.docType === 'other' ? '☑' : '';

      return `
        <tr>
          <td style="text-align: center;">${stt}</td>
          <td style="text-align: left;">${item.docName}</td>
          <td style="text-align: center;">${item.docDate}</td>
          <td style="text-align: center; font-size: 11pt;">${isOrig}</td>
          <td style="text-align: center; font-size: 11pt;">${isComp}</td>
          <td style="text-align: center; font-size: 11pt;">${isCert}</td>
          <td style="text-align: center; font-size: 11pt;">${isOther}</td>
          <td style="text-align: center;">${item.quantity || ''}</td>
          <td style="text-align: left;">${item.note || ''}</td>
        </tr>
      `;
    }).join('');

    return headerRow + itemRows;
  }).join('');

  return `
${VHTT_STYLES}
<div class="vhtt-doc">
<p class="p-center" style="font-size: 13pt; margin-bottom: 10pt;">
  <strong>DANH MỤC HỒ SƠ TÍN DỤNG KH: ${custName}&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;MÃ CIF: ${cif}</strong>
</p>

<table class="table-bordered" style="width: 100%; margin-top: 4pt; margin-bottom: 8pt;">
  <thead>
    <tr style="background-color: #e6e6e6; text-align: center; vertical-align: middle;">
      <th rowspan="2" style="width: 5%;">STT</th>
      <th rowspan="2" style="width: 38%;">Tên chứng từ</th>
      <th rowspan="2" style="width: 11%;">Ngày chứng từ</th>
      <th colspan="4" style="width: 24%;">Loại chứng từ</th>
      <th rowspan="2" style="width: 8%;">Số lượng bản</th>
      <th rowspan="2" style="width: 14%;">GHI CHÚ</th>
    </tr>
    <tr style="background-color: #f2f2f2; text-align: center; vertical-align: middle; font-size: 8.5pt;">
      <th style="width: 6%;">Bản chính/Gốc</th>
      <th style="width: 6%;">Bản đối chiếu</th>
      <th style="width: 6%;">Bản sao y chứng thực</th>
      <th style="width: 6%;">Khác</th>
    </tr>
  </thead>
  <tbody>
    ${rowsHtml}
  </tbody>
</table>

<p class="p-right" style="margin-top: 10pt; margin-bottom: 4pt; font-style: italic;">${dateText}</p>

<table class="table-borderless sig-table" style="page-break-inside: avoid; margin-top: 6pt; width: 100%;">
  <tbody>
    <tr>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <p class="p-center"><strong>NGƯỜI LẬP</strong></p>
        <p class="p-center"><em>(ký và ghi rõ họ tên)</em></p>
        <div style="height: 65px;"></div>
      </td>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <p class="p-center"><strong>CẤP KIỂM SOÁT</strong></p>
        <p class="p-center"><em>(ký và ghi rõ họ tên)</em></p>
        <div style="height: 65px;"></div>
      </td>
    </tr>
  </tbody>
</table>

<div class="vhtt-footer" style="margin-top: auto;">
  <span class="vhtt-footer-left"><em>BM09_........./2026/TB-TGĐ_Danh mục hồ sơ tín dụng</em></span>
  <span class="vhtt-footer-right"><em>Trang 1/1</em></span>
</div>
</div>
`.trim();
}

export const bm09DanhMucHoSoTemplate: DocTemplate<Bm09Specific> = {
  id: 'bm09_danh_muc_ho_so',
  label: 'BM09 - Danh mục hồ sơ tín dụng / Trang bìa',
  icon: FolderTree,
  specificDefaults: defaultBm09Specific,
  buildHtml: buildBm09Html,
};
