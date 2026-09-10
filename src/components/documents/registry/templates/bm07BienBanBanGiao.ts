import { FileCheck } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import { VHTT_STYLES } from './vhttStyles';

export interface Bm07DocItem {
  stt: string;
  name: string;
  quantity: string;
  isOriginal: boolean;
  isCopy: boolean;
  note: string;
}

export interface Bm07Specific {
  // 1. Bên giao (Khách hàng / Doanh nghiệp)
  repName?: string;
  repPosition?: string;
  repCccd?: string;
  repCccdDate?: string;
  repCccdPlace?: string;
  companyName?: string;
  regDocDate?: string;

  // 2. Bên nhận (Vietbank)
  bankBranch?: string;
  bankPgd?: string;
  bankStaffName?: string;
  bankStaffPosition?: string;
  bankDept?: string;
  bankTeam?: string;

  // Ngày tháng & Địa điểm
  docPlace?: string;
  docDate?: string;

  // 3. Danh mục hồ sơ chứng từ
  items?: Bm07DocItem[];
}

export const defaultBm07Items: Bm07DocItem[] = [
  { stt: '1', name: 'Hợp đồng tín dụng số ………………… ngày ………', quantity: '01', isOriginal: true, isCopy: false, note: '' },
  { stt: '2', name: 'Hợp đồng bảo đảm số ………………… ngày ………..', quantity: '01', isOriginal: true, isCopy: false, note: '' },
  { stt: '3', name: 'Cam kết thế chấp ngày ………………', quantity: '01', isOriginal: true, isCopy: false, note: '' },
  { stt: '4', name: 'Giấy đề nghị phát hành Bảo lãnh …………… ngày ………', quantity: '', isOriginal: false, isCopy: false, note: '' },
];

export const defaultBm07Specific: Bm07Specific = {
  repName: '',
  repPosition: '',
  repCccd: '',
  repCccdDate: '',
  repCccdPlace: '',
  companyName: '',
  regDocDate: '',

  bankBranch: '',
  bankPgd: '',
  bankStaffName: '',
  bankStaffPosition: '',
  bankDept: '',
  bankTeam: '',

  docPlace: 'TP. Hồ Chí Minh',
  docDate: '',

  items: defaultBm07Items,
};

export function buildBm07Html(common: DossierCommon, s: Bm07Specific = defaultBm07Specific): string {
  // Đồng bộ với common nếu trường specific còn trống
  const repName = s.repName || common?.partyA?.name || '…………………………………………';
  const repPos = s.repPosition || '…………………………………………';
  const repCccd = s.repCccd || common?.partyA?.cccd || '…………………';
  const repCccdDate = s.repCccdDate || '……….';
  const repCccdPlace = s.repCccdPlace || '………………………………………………';
  const company = s.companyName || common?.partyA?.name || '……………………………………………………………………………………..';
  const regDocDate = s.regDocDate || '………………………';

  const branch = s.bankBranch || common?.bank?.branch || '……';
  const pgd = s.bankPgd ? ` - PGD ${s.bankPgd}` : '';
  const bankStaff = s.bankStaffName || '…………………………………………………………………………………………';
  const bankPos = s.bankStaffPosition || '……………………………...';
  const bankDept = s.bankDept || '……..………………………';
  const bankTeam = s.bankTeam || '……………………';

  // Format ngày tháng
  let dateText = 'ngày …. tháng …. năm ……….';
  if (s.docDate) {
    const parts = s.docDate.split('-');
    if (parts.length === 3) {
      dateText = `ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
    }
  }

  const items = s.items && s.items.length > 0 ? s.items : defaultBm07Items;

  const itemRowsHtml = items.map((item, index) => {
    const stt = item.stt || String(index + 1);
    const origBox = item.isOriginal ? '☑' : '☐';
    const copyBox = item.isCopy ? '☑' : '☐';

    return `
      <tr>
        <td style="text-align: center; width: 5%;">${stt}</td>
        <td style="text-align: left; width: 45%;">${item.name}</td>
        <td style="text-align: center; width: 10%;">${item.quantity || ''}</td>
        <td style="text-align: center; width: 10%; font-size: 12pt;">${origBox}</td>
        <td style="text-align: center; width: 10%; font-size: 12pt;">${copyBox}</td>
        <td style="text-align: left; width: 20%;">${item.note || ''}</td>
      </tr>
    `;
  }).join('');

  return `
${VHTT_STYLES}
<div class="vhtt-doc">
<p class="p-center" style="font-size: 13pt; margin-bottom: 2pt;"><strong>BIÊN BẢN BÀN GIAO HỒ SƠ, CHỨNG TỪ</strong></p>
<p class="p-center" style="font-style: italic; margin-top: 0; margin-bottom: 8pt;">(áp dụng khi giao nhận hồ sơ cấp tín dụng với khách hàng)</p>

<p class="p-justify" style="margin-top: 6pt;"><strong>1. BÊN GIAO: ĐẠI DIỆN KHÁCH HÀNG</strong></p>
<p class="p-justify">Ông/Bà: <strong>${repName}</strong>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Chức vụ: <strong>${repPos}</strong></p>
<p class="p-justify">CCCD/CC/Hộ Chiếu số: <strong>${repCccd}</strong>&nbsp;&nbsp;&nbsp;&nbsp;Ngày cấp: <strong>${repCccdDate}</strong>&nbsp;&nbsp;&nbsp;&nbsp;Nơi cấp: <strong>${repCccdPlace}</strong></p>
<p class="p-justify">Là đại diện công ty: <strong>${company}</strong></p>
<p class="p-justify">Theo Giấy đề nghị v/v Đăng ký Nhân viên thực hiện giao nhận hồ sơ, chứng từ ngày <strong>${regDocDate}</strong> đã được Vietbank xác nhận.</p>

<p class="p-justify" style="margin-top: 6pt;"><strong>2. BÊN NHẬN: NGÂN HÀNG TMCP VIỆT NAM THƯƠNG TÍN – CN ${branch}${pgd} (Vietbank)</strong></p>
<p class="p-justify">Ông/Bà: <strong>${bankStaff}</strong></p>
<p class="p-justify">Chức vụ: <strong>${bankPos}</strong>&nbsp;&nbsp;&nbsp;&nbsp;TTKD/Phòng: <strong>${bankDept}</strong>&nbsp;&nbsp;&nbsp;&nbsp;Bộ phận: <strong>${bankTeam}</strong></p>

<p class="p-justify" style="margin-top: 6pt;"><strong>3. NỘI DUNG THỰC HIỆN: BÀN GIAO HỒ SƠ KHÁCH HÀNG ĐÃ KÝ, ĐÓNG DẤU</strong></p>

<table class="table-bordered" style="width: 100%; margin-top: 4pt; margin-bottom: 8pt;">
  <thead>
    <tr style="background-color: #f2f2f2;">
      <th style="width: 5%; text-align: center;">STT</th>
      <th style="width: 45%; text-align: center;">Tên hồ sơ, chứng từ</th>
      <th style="width: 10%; text-align: center;">Số lượng</th>
      <th style="width: 10%; text-align: center;">Bản chính</th>
      <th style="width: 10%; text-align: center;">Bản sao</th>
      <th style="width: 20%; text-align: center;">Ghi chú</th>
    </tr>
    <tr>
      <td colspan="6" style="text-align: left; font-weight: bold; background-color: #fafafa; padding-left: 8pt;">Văn kiện tín dụng</td>
    </tr>
  </thead>
  <tbody>
    ${itemRowsHtml}
  </tbody>
</table>

<table class="table-borderless sig-table" style="page-break-inside: avoid; margin-top: 10pt; width: 100%;">
  <tbody>
    <tr>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <p class="p-center">${dateText}</p>
        <p class="p-center"><strong>BÊN GIAO</strong></p>
        <p class="p-center"><em>(Đại diện Khách hàng)</em></p>
        <div style="height: 60px;"></div>
      </td>
      <td style="width: 50%; text-align: center; vertical-align: top;">
        <p class="p-center">${dateText}</p>
        <p class="p-center"><strong>BÊN NHẬN</strong></p>
        <p class="p-center"><em>(Đại diện Vietbank)</em></p>
        <div style="height: 60px;"></div>
      </td>
    </tr>
  </tbody>
</table>

<div class="vhtt-footer" style="margin-top: auto;">
  <span class="vhtt-footer-left"><em>BM07_......../2026/TB-TGĐ_Biên bản giao nhận hồ sơ, chứng từ</em></span>
  <span class="vhtt-footer-right"><em>Trang 1/1</em></span>
</div>
</div>
`.trim();
}

export const bm07BienBanBanGiaoTemplate: DocTemplate<Bm07Specific> = {
  id: 'bm07_bien_ban_ban_giao',
  label: 'BM07 - Biên bản bàn giao hồ sơ, chứng từ',
  icon: FileCheck,
  specificDefaults: defaultBm07Specific,
  buildHtml: buildBm07Html,
};
