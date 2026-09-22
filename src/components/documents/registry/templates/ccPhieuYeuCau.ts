import { CreditCard } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import { VHTT_STYLES } from './vhttStyles';
import { bm04LogoDataUri } from '../../../../lib/bm04Logo';

export interface CcPhieuYeuCauSpecific {
  productPlan?: string;
  feeIntProfile?: string;
  applicationNo?: string;
  customerName?: string;
  cif?: string;
  phone?: string;
  email?: string;
  cardLimit?: string;
  creditPolicy?: string;
  saleOfficerCif?: string;
  saleSupportCif?: string;
  saleSupportName?: string;
  docDateStr?: string;
}

export const defaultCcPhieuYeuCauSpecific: CcPhieuYeuCauSpecific = {
  productPlan: '',
  feeIntProfile: '',
  applicationNo: '',
  customerName: 'LÊ NGỌC QUẾ HÂN',
  cif: '005216683',
  phone: '0342 925 572',
  email: '',
  cardLimit: '30,000,000',
  creditPolicy: 'A1_KHCN_TSBĐ_BDS',
  saleOfficerCif: '005247611',
  saleSupportCif: '005218997',
  saleSupportName: 'NGUYỄN THỊ XUÂN NHƯ',
  docDateStr: 'Ngày …... tháng …… năm 2026',
};

export function buildCcPhieuYeuCauHtml(
  common: DossierCommon,
  s: CcPhieuYeuCauSpecific = defaultCcPhieuYeuCauSpecific
): string {
  const card = common?.creditCard;
  const custName = (common?.partyA?.name || s.customerName || 'LÊ NGỌC QUẾ HÂN').toUpperCase();
  const cif = common?.partyA?.cif || s.cif || '005216683';
  const phone = common?.partyA?.phone || s.phone || '0342 925 572';
  const email = s.email || '';
  const cards = card?.cards && card.cards.length > 0 ? card.cards : null;
  const productPlan = cards
    ? cards.map(c => c.productPlan).filter(Boolean).join('<br/>')
    : (card?.productPlan || s.productPlan || 'MS - VISA_TIN DUNG MYSTYLE<br/>NPC_STAND - NP TIN DUNG NOI DIA CHUAN<br/>MCCR_PL - MASTERCARD CREDIT PLATINUM');
  const feeIntProfile = cards
    ? cards.map(c => c.feeIntProfile).filter(Boolean).join('<br/>')
    : (card?.feeIntProfile || s.feeIntProfile || 'MS_PREL2_VISA_MS 33% MIEN PHI TN 1 NAM<br/>NPC_PRFL1_NAPAS TIN DUNG 18% THU PHI TN<br/>MCCP_PRF05_MCCR_PL 33% MIEN PHI PH, TN 1 NAM');
  const cardLimit = card?.cardLimit || s.cardLimit || '30,000,000';
  const creditPolicy = card?.creditPolicy || s.creditPolicy || 'A1_KHCN_TSBĐ_BDS';
  const saleOfficerCif = card?.saleOfficerCif || s.saleOfficerCif || '005247611';
  const saleSupportCif = card?.saleSupportCif || s.saleSupportCif || '005218997';
  const saleSupportName = card?.saleSupportName || s.saleSupportName || 'NGUYỄN THỊ XUÂN NHƯ';
  const docDateStr = card?.docDateStr ? `Ngày …... tháng …… năm ${card.docDateStr}` : (s.docDateStr || 'Ngày …... tháng …… năm 2026');
  const ttkdName = card?.ttkdName || 'TTKD Nguyễn Ảnh Thủ';

  return `
${VHTT_STYLES}
<div class="vhtt-doc">
  <table class="table-borderless" style="width: 100%; margin-bottom: 8pt;">
    <tbody>
      <tr>
        <td style="width: 50%; vertical-align: top; text-align: left;">
          <img src="${bm04LogoDataUri()}" alt="Vietbank" style="height: 32pt; width: auto; object-fit: contain; display: block;" />
        </td>
        <td style="width: 50%; vertical-align: middle; text-align: right;">
          <p style="margin: 0; font-size: 10pt; font-weight: bold; color: #475569; text-transform: uppercase;">${ttkdName}</p>
        </td>
      </tr>
    </tbody>
  </table>

  <div style="text-align: center; margin-bottom: 12pt;">
    <h1 style="font-size: 13pt; font-weight: bold; margin: 0; text-transform: uppercase;">
      PHIẾU YÊU CẦU PHÁT HÀNH THẺ TÍN DỤNG
    </h1>
  </div>

  <p style="margin: 4pt 0 8pt 0; text-align: justify; line-height: 1.35;">
    <strong>${ttkdName}</strong>. Kính đề nghị Phòng Vận hành thẻ và Ngân hàng số – Khối Vận hành, phát hành thẻ tín dụng (thực hiện nhập liệu tạo thẻ và duyệt thẻ) trên hệ thống CMS theo thông tin TTKD xác nhận như sau:
  </p>

  <p style="font-weight: bold; font-size: 11pt; margin: 6pt 0 3pt 0;">THÔNG TIN HỒ SƠ</p>

  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 8pt;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="width: 6%; border: 1px solid #000; padding: 3pt;">Stt</th>
        <th style="width: 44%; border: 1px solid #000; padding: 3pt;">Thông tin Hồ sơ phát hành thẻ tín dụng</th>
        <th style="width: 25%; border: 1px solid #000; padding: 3pt;">Thẻ chính</th>
        <th style="width: 25%; border: 1px solid #000; padding: 3pt;">Thẻ phụ</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">1</td>
        <td style="border: 1px solid #000; padding: 3pt;">Mã KH của thẻ chính (Cust ID/ CIF)</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt; font-weight: bold;">${cif}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">2</td>
        <td style="border: 1px solid #000; padding: 3pt;">
          Mã HS giấy đề nghị phát hành thẻ kiêm hợp đồng sử dụng thẻ tín dụng (Application No.)
        </td>
        <td style="border: 1px solid #000; padding: 3pt;">${s.applicationNo || ''}</td>
        <td style="border: 1px solid #000; padding: 3pt;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">3</td>
        <td style="border: 1px solid #000; padding: 3pt;">Tên KH (Cust name)</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">${custName}</td>
        <td style="border: 1px solid #000; padding: 3pt;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">4</td>
        <td style="border: 1px solid #000; padding: 3pt;">Loại Thẻ (Product plan)</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt; font-weight: bold; color: #0f172a;">${productPlan}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">5</td>
        <td style="border: 1px solid #000; padding: 3pt;">Mã phí thẻ tín dụng (Fee Interest Profile)</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt; font-weight: bold; color: #0f172a;">${feeIntProfile}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">6</td>
        <td style="border: 1px solid #000; padding: 3pt;">Số thẻ chính (trường hợp đề nghị phát hành thẻ phụ)</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">7</td>
        <td style="border: 1px solid #000; padding: 3pt;">Số điện thoại di động KH</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">${phone}</td>
        <td style="border: 1px solid #000; padding: 3pt;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">8</td>
        <td style="border: 1px solid #000; padding: 3pt;">Địa chỉ mail KH</td>
        <td style="border: 1px solid #000; padding: 3pt;">${email}</td>
        <td style="border: 1px solid #000; padding: 3pt;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">9</td>
        <td style="border: 1px solid #000; padding: 3pt;">Collateral Desc (Số tài khoản Masterline)</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">10</td>
        <td style="border: 1px solid #000; padding: 3pt;">Hạn mức Thẻ được cấp (Collater Value)</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">${cardLimit}</td>
        <td style="border: 1px solid #000; padding: 3pt;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">11</td>
        <td style="border: 1px solid #000; padding: 3pt;">Mã hồ sơ cấp hạn mức thẻ tín dụng trên CLM</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt;"></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">12</td>
        <td style="border: 1px solid #000; padding: 3pt;">Mã chính sách thẻ tín dụng (Credit policy)</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt; font-weight: bold;">${creditPolicy}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">13</td>
        <td style="border: 1px solid #000; padding: 3pt;">Mã CIF Sale Officer</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt; font-weight: bold;">${saleOfficerCif}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">14</td>
        <td style="border: 1px solid #000; padding: 3pt;">Mã Sale Support CIF</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt; font-weight: bold;">${saleSupportCif}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">15</td>
        <td style="border: 1px solid #000; padding: 3pt;">Sale Support Name</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt; font-weight: bold;">${saleSupportName}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">16</td>
        <td style="border: 1px solid #000; padding: 3pt;">Checker (Loại quà tặng)</td>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt;"></td>
      </tr>
    </tbody>
  </table>

  <p style="font-weight: bold; font-size: 11pt; margin: 8pt 0 3pt 0;">HỒ SƠ UPLOAD LÊN CMS:</p>
  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 8pt;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="width: 8%; border: 1px solid #000; padding: 3pt;">STT</th>
        <th style="width: 62%; border: 1px solid #000; padding: 3pt;">Loại chứng từ</th>
        <th style="width: 30%; border: 1px solid #000; padding: 3pt;">Ghi chú</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">1</td>
        <td style="border: 1px solid #000; padding: 3pt;">Giấy đề nghị kiêm hợp đồng phát hành và sử dụng thẻ tín dụng</td>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">Bản scan màu</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">2</td>
        <td style="border: 1px solid #000; padding: 3pt;">Phiếu yêu cầu phát hành thẻ tín dụng.</td>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">Bản scan màu</td>
      </tr>
    </tbody>
  </table>

  <table class="table-borderless sig-table" style="width: 100%; margin-top: 10pt; margin-bottom: 12pt; page-break-inside: avoid;">
    <tbody>
      <tr>
        <td colspan="2" style="text-align: right; font-style: italic; padding-bottom: 4pt;">
          ${docDateStr}
        </td>
      </tr>
      <tr>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          <p style="margin: 0; font-weight: bold;">NHÂN SỰ YÊU CẦU</p>
          <p style="margin: 0; font-style: italic; font-size: 9.5pt;">(Ký, ghi rõ chức danh, Họ tên)</p>
          <div style="height: 55px;"></div>
        </td>
        <td style="width: 50%; text-align: center; vertical-align: top;">
          <p style="margin: 0; font-weight: bold;">CẤP KIỂM SOÁT</p>
          <p style="margin: 0; font-style: italic; font-size: 9.5pt;">(Ký, ghi rõ chức danh, Họ tên)</p>
          <div style="height: 55px;"></div>
        </td>
      </tr>
    </tbody>
  </table>

  <div class="vhtt-footer" style="margin-top: auto; padding-top: 4pt;">
    <span class="vhtt-footer-left"><em>04. BM01_........2026.QĐ-TGĐ_Phiếu yêu cầu phát hành thẻ tín dụng</em></span>
    <span class="vhtt-footer-right"><em>Trang 1/1</em></span>
  </div>
</div>
`.trim();
}

export const ccPhieuYeuCauTemplate: DocTemplate<CcPhieuYeuCauSpecific> = {
  id: 'cc_phieu_yeu_cau',
  label: 'Phiếu yêu cầu phát hành thẻ',
  icon: CreditCard,
  specificDefaults: defaultCcPhieuYeuCauSpecific,
  buildHtml: buildCcPhieuYeuCauHtml,
};
