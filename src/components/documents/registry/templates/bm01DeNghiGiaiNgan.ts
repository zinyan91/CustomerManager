import { Banknote } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import { VHTT_STYLES } from './vhttStyles';
import { vhttBranchUnit, type VhttBranchType } from './vhttBranch';
import { moneyTextToWords } from '../../../../lib/numberToWords';

export type Bm01CustomerType = 'single' | 'married' | 'org';
export type Bm01DisbursementMethod = 'transfer' | 'cash';
export type Bm01TransferType = 'transfer' | 'freeze' | 'saving_freeze' | 'all';
export type Bm01BranchType = VhttBranchType;

export interface Bm01Specific {
  customerType?: Bm01CustomerType; // 'single' | 'married' | 'org'

  // Cá nhân 1 (Chính / Độc thân)
  name1?: string;
  cif1?: string;
  cccd1?: string;

  // Cá nhân 2 (Vợ / Chồng)
  name2?: string;
  cif2?: string;
  cccd2?: string;

  // Doanh nghiệp / Tổ chức
  orgName?: string;
  orgRegNo?: string;
  repName?: string;
  repPosition?: string;
  authDocNo?: string;
  authDocDate?: string;

  // Kính gửi & Ngày tháng
  branchType?: Bm01BranchType; // 'CN' = Chi nhánh, 'PGD' = Phòng giao dịch; bỏ trống = bản nháp cũ, ghi 'CN/PGD'
  branchName?: string;
  docPlace?: string;
  docDate?: string;

  // Hợp đồng tín dụng
  loanContractNo?: string;
  loanContractDate?: string;

  // Phương thức giải ngân: 'transfer' | 'cash'
  disbursementMethod?: Bm01DisbursementMethod;

  // Chuyển khoản
  transferSubType?: Bm01TransferType;
  agreementNo?: string;
  agreementDate?: string;
  transferAmount?: string;
  transferAmountWords?: string;
  transferAccNo?: string;
  transferAccOwner?: string;
  transferBankName?: string;
  transferBankBranch?: string;
  transferPurpose?: string;

  // Tiền mặt
  cashAmount?: string;
  cashAmountWords?: string;
  cashReceiverName?: string;
  cashReceiverCccd?: string;
  cashPurpose?: string;

  // Tài khoản trích thu phí
  feeAccNo?: string;
}

export const defaultBm01Specific: Bm01Specific = {
  customerType: 'single',
  name1: '',
  cif1: '',
  cccd1: '',
  name2: '',
  cif2: '',
  cccd2: '',
  orgName: '',
  orgRegNo: '',
  repName: '',
  repPosition: '',
  authDocNo: '',
  authDocDate: '',
  branchName: '',
  docPlace: '',
  docDate: '',
  loanContractNo: '',
  loanContractDate: '',
  disbursementMethod: 'transfer',
  transferSubType: 'transfer',
  agreementNo: '',
  agreementDate: '',
  transferAmount: '',
  transferAmountWords: '',
  transferAccNo: '',
  transferAccOwner: '',
  transferBankName: '',
  transferBankBranch: '',
  transferPurpose: '',
  cashAmount: '',
  cashAmountWords: '',
  cashReceiverName: '',
  cashReceiverCccd: '',
  cashPurpose: '',
  feeAccNo: '',
};


function formatAmount(val?: string): string {
  if (!val || !val.trim()) return '____________';
  return val.trim().endsWith('đồng') || val.trim().endsWith('VNĐ') ? val.trim() : `${val.trim()} VNĐ`;
}

function resolveAmountWords(amount?: string, customWords?: string): string {
  if (customWords && customWords.trim()) return customWords.trim();
  if (!amount || !amount.trim()) return '…………';
  return moneyTextToWords(amount);
}

export function buildBm01Html(common?: DossierCommon, specific?: Bm01Specific): string {
  const s: Bm01Specific = { ...defaultBm01Specific, ...(specific || {}) };
  const customerType: Bm01CustomerType = s.customerType || 'single';
  const method: Bm01DisbursementMethod = s.disbursementMethod || 'transfer';

  // Khách hàng 1 (ưu tiên s.name1, fallback common.partyA)
  const name1 = s.name1 || common?.partyA?.name || '';
  const cif1 = s.cif1 || common?.partyA?.cif || '';
  const cccd1 = s.cccd1 || common?.partyA?.cccd || '';

  // Khách hàng 2 (Vợ / Chồng)
  const name2 = s.name2 || '';
  const cif2 = s.cif2 || '';
  const cccd2 = s.cccd2 || '';

  // Tổ chức
  const orgName = s.orgName || '';
  const orgRegNo = s.orgRegNo || '';
  const repName = s.repName || '';
  const repPosition = s.repPosition || '';
  const authDocNo = s.authDocNo || '';
  const authDocDate = s.authDocDate || '';

  // Kính gửi & Ngày tháng
  const donVi = vhttBranchUnit(s.branchType);
  const branchText = s.branchName ? `VIETBANK – ${donVi} ${s.branchName}` : `VIETBANK – ${donVi} ………………`;
  const docDateVal = s.docDate || common?.contractDate || '';
  const placeVal = s.docPlace || '……………..';
  let dateLine = '<em>……………..,</em><em> </em><em>ngày</em><em>……</em><em>tháng</em><em> ……..</em><em>năm</em><em>…….</em>';
  if (docDateVal) {
    const parts = docDateVal.split(/[-/]/);
    if (parts.length === 3) {
      const day = parts[2].length === 2 ? parts[2] : parts[0];
      const month = parts[1];
      const year = parts[0].length === 4 ? parts[0] : parts[2];
      dateLine = `<em>${placeVal}, ngày ${day} tháng ${month} năm ${year}</em>`;
    } else {
      dateLine = `<em>${placeVal}, ngày ${docDateVal}</em>`;
    }
  }

  // Khối thông tin khách hàng tùy biến theo loại KH
  let customerTableHtml = '';
  if (customerType === 'single') {
    // Chỉ hiển thị 1 người duy nhất, ẩn các dòng khác hoàn toàn
    customerTableHtml = `
<table class="table-borderless">
<tbody>
  <tr>
    <td><p class="p-left">Ông/Bà</p></td>
    <td colspan="2"><p class="p-center">:</p></td>
    <td><p class="p-left">${name1 ? `<strong>${name1}</strong>` : '________'}</p></td>
    <td><p class="p-left">CIF: ${cif1 ? `<strong>${cif1}</strong>` : '________'}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">CCCD/CC/Hộ chiếu số</p></td>
    <td colspan="2"><p class="p-center">:</p></td>
    <td><p class="p-left">${cccd1 || '________'}</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
  </tr>
</tbody>
</table>`;
  } else if (customerType === 'married') {
    // Vợ chồng: hiển thị 2 người (KH1 và KH2), ẩn phần tổ chức
    customerTableHtml = `
<table class="table-borderless">
<tbody>
  <tr>
    <td><p class="p-left">Ông/Bà</p></td>
    <td colspan="2"><p class="p-center">:</p></td>
    <td><p class="p-left">${name1 ? `<strong>${name1}</strong>` : '________'}</p></td>
    <td><p class="p-left">CIF: ${cif1 ? `<strong>${cif1}</strong>` : '________'}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">CCCD/CC/Hộ chiếu số</p></td>
    <td colspan="2"><p class="p-center">:</p></td>
    <td><p class="p-left">${cccd1 || '________'}</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Ông/Bà</p></td>
    <td colspan="2"><p class="p-center">:</p></td>
    <td><p class="p-left">${name2 ? `<strong>${name2}</strong>` : '________'}</p></td>
    <td><p class="p-left">CIF: ${cif2 ? `<strong>${cif2}</strong>` : '________'}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">CCCD/CC/Hộ chiếu số</p></td>
    <td colspan="2"><p class="p-center">:</p></td>
    <td><p class="p-left">${cccd2 || '________'}</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
  </tr>
</tbody>
</table>`;
  } else {
    // Doanh nghiệp / Tổ chức
    const authText = authDocNo ? `${authDocNo} ngày ${authDocDate || '________'}` : '________ ngày ________';
    customerTableHtml = `
<table class="table-borderless">
<tbody>
  <tr>
    <td><p class="p-left">Tên tổ chức</p></td>
    <td><p class="p-center">:</p></td>
    <td colspan="4"><p class="p-left">${orgName ? `<strong>${orgName}</strong>` : '________'}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">MSDN/số ĐKKD/GPHĐ số</p></td>
    <td><p class="p-center">:</p></td>
    <td colspan="4"><p class="p-left">${orgRegNo || '________'}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Người đại diện</p></td>
    <td><p class="p-center">:</p></td>
    <td colspan="4"><p class="p-left">${repName || '________'}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Chức vụ</p></td>
    <td><p class="p-center">:</p></td>
    <td colspan="4"><p class="p-left">${repPosition || '________'}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Theo Văn bản uỷ quyền số (nếu có)</p></td>
    <td><p class="p-center">:</p></td>
    <td colspan="4"><p class="p-left">${authText}</p></td>
  </tr>
</tbody>
</table>`;
  }

  // Khối phương thức giải ngân: chỉ hiển thị 1 trong 2
  let disbursementTableHtml = '';
  if (method === 'transfer') {
    const rawAmount = s.transferAmount || common?.totalAmount || '';
    const transferAmountDisplay = formatAmount(rawAmount);
    const transferWordsDisplay = resolveAmountWords(rawAmount, s.transferAmountWords);
    const accNo = s.transferAccNo || '____________';
    const accOwner = s.transferAccOwner || '____________';

    const bankNameRaw = s.transferBankName || '';
    const bankBranchRaw = s.transferBankBranch || '';
    let bankDisplay = '____________';
    if (bankNameRaw && bankBranchRaw) {
      bankDisplay = `${bankNameRaw} - CN ${bankBranchRaw}`;
    } else if (bankNameRaw) {
      bankDisplay = bankNameRaw;
    } else if (bankBranchRaw) {
      bankDisplay = `CN ${bankBranchRaw}`;
    }

    const purpose = s.transferPurpose || '____________';

    let headerTitle = '<strong>Chuyển khoản</strong>';
    const agreementSuffix = s.agreementNo ? ` theo Biên bản thỏa thuận số ${s.agreementNo} ngày ${s.agreementDate || '…/…/….'}` : '';
    if (s.transferSubType === 'freeze') {
      headerTitle = `<strong>Chuyển khoản và phong tỏa</strong>${agreementSuffix || ' theo Biên bản thỏa thuận số … ngày …/…/….'}`;
    } else if (s.transferSubType === 'saving_freeze') {
      headerTitle = `<strong>Chuyển khoản và mở thẻ tiết kiệm và phong tỏa</strong>${agreementSuffix || ' theo Biên bản thỏa thuận số … ngày …/…/….'}`;
    } else if (s.transferSubType === 'all') {
      headerTitle = `<strong>Chuyển khoản </strong>/<strong>Chuyển khoản và phong tỏa</strong>/<strong>Chuyển khoản và mở thẻ tiết kiệm và phong tỏa</strong>${agreementSuffix || ' theo Biên bản thỏa thuận số … ngày …/…/….'}`;
    } else if (agreementSuffix) {
      headerTitle = `<strong>Chuyển khoản</strong>${agreementSuffix}`;
    }

    disbursementTableHtml = `
<table class="table-borderless">
<tbody>
  <tr>
    <td colspan="3"><p class="p-left">${headerTitle}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Số tiền</p></td>
    <td><p class="p-center">:</p></td>
    <td><p class="p-left">${transferAmountDisplay} Bằng chữ: ${transferWordsDisplay}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Số tài khoản</p></td>
    <td><p class="p-center">:</p></td>
    <td><p class="p-left">${accNo}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Chủ tài khoản</p></td>
    <td><p class="p-center">:</p></td>
    <td><p class="p-left">${accOwner}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Tại</p></td>
    <td><p class="p-center">:</p></td>
    <td><p class="p-left">${bankDisplay}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Mục đích</p></td>
    <td><p class="p-center">:</p></td>
    <td><p class="p-left">${purpose}</p></td>
  </tr>
</tbody>
</table>`;
  } else {
    // Nhận tiền mặt (Mặc định lấy thông tin khách hàng, có thể sửa)
    const rawAmount = s.cashAmount || common?.totalAmount || '';
    const cashAmountDisplay = formatAmount(rawAmount);
    const cashWordsDisplay = resolveAmountWords(rawAmount, s.cashAmountWords);
    const receiverName = s.cashReceiverName || '____________';
    const receiverCccd = s.cashReceiverCccd || '____________';
    const cashPurpose = s.cashPurpose || '____________';

    disbursementTableHtml = `
<table class="table-borderless">
<tbody>
  <tr>
    <td colspan="3"><p class="p-left"><strong>Nhận tiền mặt:</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-left">Số tiền</p></td>
    <td><p class="p-center">:</p></td>
    <td><p class="p-left">${cashAmountDisplay} Bằng chữ: ${cashWordsDisplay}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Họ tên người nhận tiền</p></td>
    <td><p class="p-center">:</p></td>
    <td><p class="p-left">${receiverName}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Giấy CCCD/CC/Hộ chiếu</p></td>
    <td><p class="p-center">:</p></td>
    <td><p class="p-left">${receiverCccd}</p></td>
  </tr>
  <tr>
    <td><p class="p-left">Mục đích</p></td>
    <td><p class="p-center">:</p></td>
    <td><p class="p-left">${cashPurpose}</p></td>
  </tr>
</tbody>
</table>`;
  }

  // Tài khoản trích thu phí
  const feeAcc = s.feeAccNo || common?.bank?.accNo || '…………………….';

  return `
${VHTT_STYLES}
<div class="vhtt-doc">
<p class="p-center"><strong>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</strong></p>
<p class="p-center"><strong>Độc</strong><strong> </strong><strong>lập</strong><strong> – </strong><strong>Tự</strong><strong> do – </strong><strong>Hạnh</strong><strong> </strong><strong>phúc</strong></p>
<p class="p-right">${dateLine}</p>
<p class="p-center"><strong>GIẤY ĐỀ NGHỊ GIẢI NGÂN</strong><br/>Kính gửi: ${branchText}</p>

<p class="p-left">Tôi/Chúng tôi là:</p>
${customerTableHtml}

<p class="p-left">Tôi/Chúng tôi đề nghị Vietbank giải ngân theo Hợp đồng tín dụng số ${s.loanContractNo || '………………'} ngày ${s.loanContractDate || '……./……/…………'}; thông tin cụ thể như sau:</p>
${disbursementTableHtml}

<p class="p-left">Tôi/chúng tôi đề nghị Vietbank trích tiền từ tài khoản thanh toán số ${feeAcc} của tôi/chúng tôi để thu các khoản phí phát sinh liên quan đến việc giải ngân tiền cho bên thụ hưởng nêu trên.</p>
<p class="p-left">Tôi/Chúng tôi cam kết:</p>
<p class="p-left">Tôi/Chúng tôi bảo đảm rằng các hồ sơ, chứng từ giải ngân cung cấp cho Vietbank theo phương án vay vốn/giải ngân lần này là xác thực, đầy đủ, hợp pháp, chưa từng được sử dụng để phục vụ việc vay vốn/giải ngân tại bất cứ Tổ chức tín dụng, Chi nhánh Ngân hàng nước ngoài nào và hoàn toàn chịu trách nhiệm về các hồ sơ, chứng từ đã cung cấp cho Vietbank.</p>
<p class="p-left">Tôi/Chúng tôi bảo đảm chỉ sử dụng các hồ sơ, chứng từ giải ngân cung cấp cho lần này để chứng minh duy nhất cho phương án vay vốn/giải ngân tại Vietbank, đồng thời tôi/chúng tôi cam kết không sử dụng các hồ sơ, chứng từ này để phục vụ việc vay vốn/giải ngân tại bất cứ Tổ chức tín dụng, Chi nhánh Ngân hàng nước ngoài nào khác.</p>
<p class="p-left">Phương thức giải ngân bằng tiền mặt/chuyển khoản theo đề nghị trên là phù hợp quy định của pháp luật.</p>
<p class="p-left">Khi Ngân hàng đã chuyển khoản tiền vay vào tài khoản người thụ hưởng (bao gồm tài khoản của bên vay và/hoặc bên thứ ba), hoặc chi trả bằng tiền mặt theo đề nghị này, thì được xem là Ngân hàng đã hoàn tất việc giải ngân; tôi/chúng tôi được xem là đã nhận đủ số tiền giải ngân.</p>
<p class="p-left">Trân trọng,</p>
<table class="table-borderless sig-table" style="page-break-inside: avoid; margin-top: 8pt;">
<tbody>
  <tr>
    <td style="width: 50%;"></td>
    <td style="width: 50%; text-align: center;">
      <p class="p-center"><strong>KHÁCH HÀNG</strong></p>
      <p class="p-center"><em>(Ký, ghi rõ họ tên, và đóng dấu – nếu là tổ chức)</em></p>
      <div style="height: 40px;"></div>
    </td>
  </tr>
</tbody>
</table>

<div class="vhtt-footer">
  <span class="vhtt-footer-left"><em>BM01_....../2026/TB-TGĐ_Giấy đề nghị giải ngân</em></span>
  <span class="vhtt-footer-right"><em>Trang 1/1</em></span>
</div>
</div>
`.trim();
}

export const bm01DeNghiGiaiNganTemplate: DocTemplate<Bm01Specific> = {
  id: 'bm01_de_nghi_giai_ngan',
  label: 'BM01 - Giấy đề nghị giải ngân',
  icon: Banknote,
  specificDefaults: defaultBm01Specific,
  buildHtml: buildBm01Html,
};
