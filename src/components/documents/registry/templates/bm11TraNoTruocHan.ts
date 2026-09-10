import { Clock } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import { VHTT_STYLES } from './vhttStyles';

export interface Bm11Specific {
  // Cơ quan & Ngày tháng
  branchName?: string;
  docPlace?: string;
  docDate?: string;

  // Khách hàng
  customerName?: string;
  cccd?: string;
  cccdDate?: string;
  cccdPlace?: string;
  address?: string;
  phone?: string;
  cif?: string;

  // Tài khoản trích
  accNo1?: string;
  accType1?: string;
  accNote1?: string;
  accNo2?: string;
  accType2?: string;
  accNote2?: string;

  // Khoản vay trả trước hạn
  contractNo?: string;
  gnnNo?: string;
  loanAccNo?: string;
  principalAmount?: string;
  interestAmount?: string;
}

export const defaultBm11Specific: Bm11Specific = {
  branchName: '',
  docPlace: '',
  docDate: '',
  customerName: '',
  cccd: '',
  cccdDate: '',
  cccdPlace: '',
  address: '',
  phone: '',
  cif: '',
  accNo1: '',
  accType1: 'Tài khoản thanh toán',
  accNote1: '',
  accNo2: '',
  accType2: '',
  accNote2: '',
  contractNo: '',
  gnnNo: '',
  loanAccNo: '',
  principalAmount: '',
  interestAmount: '',
};

function formatBm11Date(place?: string, dateStr?: string): string {
  if (!place && !dateStr) return '…………….., ngày……tháng ……..năm…….';
  const p = place || '……………..';
  if (!dateStr) return `${p}, ngày……tháng ……..năm…….`;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return `${p}, ngày ${dateStr}`;
  return `${p}, ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
}

export function buildBm11Html(common?: DossierCommon, specific?: Bm11Specific): string {
  const s = specific || defaultBm11Specific;
  const dateLine = formatBm11Date(s.docPlace, s.docDate || common?.contractDate);
  const branchText = s.branchName ? `Ngân hàng TMCP Việt Nam Thương Tín (Vietbank) <strong>– </strong>CN/PGD ${s.branchName}` : 'Ngân hàng TMCP Việt Nam Thương Tín (Vietbank) <strong>– </strong>CN/PGD ……';

  const customerName = s.customerName || common?.partyA?.name || '……………………………………………………………………………………………….…..';
  const cccd = s.cccd || common?.partyA?.cccd || '…………………….';
  const cccdDate = s.cccdDate || common?.partyA?.cccdDate || '…./……/……';
  const cccdPlace = s.cccdPlace || common?.partyA?.cccdPlace || '…………………';
  const address = s.address || common?.partyA?.address || '…………………………………………………………';
  const phone = s.phone || '…………………………………….';
  const cif = s.cif || common?.partyA?.cif || '…………………………………………..';

  const accNo1 = s.accNo1 || common?.bank?.accNo || '000000666888';
  const accType1 = s.accType1 || 'Tài khoản tiền gửi';
  const accNote1 = s.accNote1 || '&nbsp;';

  const accNo2 = s.accNo2 || '000000777999';
  const accType2 = s.accType2 || 'Tài khoản thanh toán';
  const accNote2 = s.accNote2 || '&nbsp;';

  const contractNo = s.contractNo || '&nbsp;';
  const gnnNo = s.gnnNo || '&nbsp;';
  const loanAccNo = s.loanAccNo || '&nbsp;';
  const principalAmount = s.principalAmount || '&nbsp;';
  const interestAmount = s.interestAmount || '&nbsp;';

  return `
${VHTT_STYLES}
<div class="vhtt-doc">
<p class="p-center"><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
<p class="p-center"><strong>Độc</strong><strong> </strong><strong>lập</strong><strong> – </strong><strong>Tự</strong><strong> do – </strong><strong>Hạnh</strong><strong> </strong><strong>phúc</strong></p>
<p class="p-right empty-p">&nbsp;</p>
<p class="p-right"><em>${dateLine}</em></p>
<p class="p-center"><strong>GIẤY ĐỀ NGHỊ TRẢ NỢ TRƯỚC HẠN</strong></p>
<p class="p-center"><u><em>Kính</em></u><u><em> </em></u><u><em>gửi</em></u><em>:</em> ${branchText}</p>
<p class="p-center empty-p">&nbsp;</p>
<p class="p-left"><u><strong>THÔNG TIN </strong></u><u><strong>KHÁCH HÀNG</strong></u>:</p>
<p class="p-left">Tên Khách hàng: ${customerName}</p>
<p class="p-left">CCCD/CMND/CNĐKKD/CNĐKDN: ${cccd} Ngày cấp: ${cccdDate} Nơi cấp: ${cccdPlace}</p>
<p class="p-left">Địa chỉ: ${address} Số điện thoại: ${phone}</p>
<p class="p-left"><u><strong>NHU CẦU </strong></u><u><strong>KHÁCH HÀNG</strong></u><u><strong>:</strong></u></p>
<p class="p-left">Đề nghị Vietbank trích từ Tài khoản thanh toán (TKTT) và/hoặc tất toán Sổ tiết kiệm/Tài khoản tiền gửi như sau:</p>
<table class="table-bordered">
<tbody>
  <tr>
    <td><p class="p-center">S<strong>TT</strong></p></td>
    <td><p class="p-center"><strong>Số</strong><strong> </strong><strong>tài</strong><strong> </strong><strong>khoản</strong></p></td>
    <td><p class="p-center"><strong>Loại</strong><strong> </strong><strong>tài</strong><strong> </strong><strong>khoản</strong></p></td>
    <td><p class="p-center"><strong>Ghi</strong><strong> </strong><strong>chú</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center">1</p></td>
    <td><p class="p-left">${accNo1}</p></td>
    <td><p class="p-left">${accType1}</p></td>
    <td><p class="p-center">${accNote1}</p></td>
  </tr>
  <tr>
    <td><p class="p-center">2</p></td>
    <td><p class="p-left">${accNo2}</p></td>
    <td><p class="p-left">${accType2}</p></td>
    <td><p class="p-center">${accNote2}</p></td>
  </tr>
</tbody>
</table>

<p class="p-left empty-p">&nbsp;</p>
<p class="p-left">để thu nợ trước hạn cho (các) khoản vay cụ thể như sau: </p>
<p class="p-right"><em>Đ</em><em>ơn</em><em> </em><em>vị</em><em> </em><em>tính</em><em>: </em><em>đồng</em></p>
<table class="table-bordered">
<tbody>
  <tr>
    <td><p class="p-center"><strong>STT</strong></p></td>
    <td><p class="p-center"><strong>Hợp</strong><strong> </strong><strong>đồng</strong><strong> </strong><strong>tín</strong><strong> </strong><strong>dụng</strong></p></td>
    <td><p class="p-center"><strong>Giấy</strong><strong> </strong><strong>nhận</strong><strong> </strong><strong>nợ</strong></p></td>
    <td><p class="p-center"><strong>Số</strong><strong> </strong><strong>tài</strong><strong> </strong><strong>khoản</strong><strong> </strong><strong>vay</strong></p></td>
    <td><p class="p-center"><strong>Số</strong><strong> </strong><strong>tiền</strong><strong> </strong><strong>gốc</strong></p></td>
    <td><p class="p-center"><strong>Số</strong><strong> </strong><strong>tiền</strong><strong> </strong><strong>lãi</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center">1</p></td>
    <td><p class="p-left">${contractNo}</p></td>
    <td><p class="p-left">${gnnNo}</p></td>
    <td><p class="p-center">${loanAccNo}</p></td>
    <td><p class="p-center">${principalAmount}</p></td>
    <td><p class="p-center">${interestAmount}</p></td>
  </tr>
  <tr>
    <td><p class="p-center">2</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center">…</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td colspan="3"><p class="p-left">Tổng cộng</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
</tbody>
</table>

<p class="p-left">Nội dung khác:</p>
<p class="p-left">⃞ Tôi/Chúng tôi đề nghị trả nợ gốc trước hạn các kỳ của lịch trả nợ tương ứng:</p>
<p class="p-left">Giấy nhận nợ Số ……….... ngày …../….../……: Từ kỳ ….(…./…./20….)  đến kỳ ….(…./…./20….)</p>
<p class="p-left">Giấy nhận nợ Số ……….... ngày …../….../……: Từ kỳ ….(…./…./20….)  đến kỳ ….(…./…./20….)</p>
<p class="p-left">⃞ Khác (*) ………….............................................................................................................................................</p>
<p class="p-left">Ngoài ra, Tôi/Chúng tôi chấp nhận thanh toán các khoản phí, phạt trả nợ trước hạn theo quy định của Vietbank.</p>
<p class="p-left">Tôi/Chúng tôi cam kết:</p>
<p class="p-left">- Những thông tin được trình bày trong Giấy đề nghị này là đúng sự thật; được lập hoàn toàn tự nguyện, không bị lừa dối, ép buộc.</p>
<p class="p-left">- Tôi/Chúng tôi đã đọc lại Giấy đề nghị này, đồng ý toàn bộ nội dung nêu trên và cam kết chịu trách nhiệm trước Vietbank và pháp luật về tính chính xác và nội dung Giấy đề nghị này, đồng thời không có bất kỳ khiếu nại, khiếu kiện nào.</p>
<p class="p-left">Trân trọng.</p>
<table class="table-borderless sig-table" style="page-break-inside: avoid; margin-top: 10pt;">
<tbody>
  <tr>
    <td style="width: 50%;"></td>
    <td style="width: 50%; text-align: center;">
      <p class="p-center"><strong>NGƯỜI ĐỀ NGHỊ</strong></p>
      <p class="p-center"><em>(Ký, ghi rõ họ tên và đóng dấu (nếu có))</em></p>
      <div style="height: 60px;"></div>
    </td>
  </tr>
</tbody>
</table>

<p class="p-left">(*) Người đề nghị ghi rõ các nội dung khác liên quan đến việc thu nợ (nếu có)</p>
<p class="p-left"><u><strong>PHẦN XÁC NHẬN CỦA NGÂN HÀNG</strong></u></p>
<p class="p-left">Mã CIF: ${cif}</p>
<p class="p-left">Xác nhận thu nợ theo đề nghị của khách hàng</p>
<p class="p-left">Mức phí /phạt liên quan (**):....................................</p>
<p class="p-left">+ Phí phạt trả nợ trước hạn: </p>
<p class="p-left">+ Phí ……………………….</p>
<p class="p-left empty-p">&nbsp;</p>
<table class="table-borderless" style="page-break-inside: avoid; margin-top: 10pt;">
<tbody>
  <tr>
    <td style="width: 33%; text-align: center;"><p class="p-center"><strong>GIAO DỊCH VIÊN</strong></p><div style="height: 45px;"></div></td>
    <td style="width: 33%; text-align: center;"><p class="p-center"><strong>CẤP KIỂM SOÁT</strong></p><div style="height: 45px;"></div></td>
    <td style="width: 34%; text-align: center;"><p class="p-center"><strong>TRƯỞNG ĐƠN VỊ</strong></p><div style="height: 45px;"></div></td>
  </tr>
</tbody>
</table>

<p class="p-left"><em> (**) : Ghi rõ mức phí / phạt áp dụng phù hợp qui định / phê duyệt của cấp có thẩm quyền.</em></p>

<div class="vhtt-footer">
  <span class="vhtt-footer-left"><em>BM11_.............../2026/TB-TGĐ_Giấy đề nghị trả nợ trước hạn vay CC TG. CCTG VB</em></span>
  <span class="vhtt-footer-right"><em>Trang 1/1</em></span>
</div>
</div>
`.trim();
}

export const bm11TraNoTruocHanTemplate: DocTemplate<Bm11Specific> = {
  id: 'bm11_tra_no_truoc_han',
  label: 'BM11 - Giấy đề nghị trả nợ trước hạn',
  icon: Clock,
  specificDefaults: defaultBm11Specific,
  buildHtml: buildBm11Html,
};
