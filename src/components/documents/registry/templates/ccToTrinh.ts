import { CreditCard } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import { VHTT_STYLES } from './vhttStyles';
import { detectCardNetwork } from '../../../../lib/cardFeeProfiles';
import { bm04LogoDataUri } from '../../../../lib/bm04Logo';

export interface CcToTrinhSpecific {
  ttkdName?: string;
  docDateStr?: string;
  customerName?: string;
  cif?: string;
  birthDate?: string;
  age?: string;
  gender?: 'male' | 'female';
  idNumber?: string;
  idDate?: string;
  idPlace?: string;
  address?: string;
  currentAddress?: string;
  phone?: string;
  maritalStatus?: 'married' | 'single' | 'divorced';
  cardProductType?: string;
  proposedLimit?: string;
  officerName?: string;
  officerId?: string;
  officerEmail?: string;
  officerPhone?: string;
  controllerName?: string;
  controllerEmail?: string;
  controllerPhone?: string;
  directorName?: string;
  directorEmail?: string;
  directorPhone?: string;
}

export const defaultCcToTrinhSpecific: CcToTrinhSpecific = {
  ttkdName: 'TTKD NGUYỄN ẢNH THỦ',
  docDateStr: '……….., ngày ….. tháng ….. năm 2026',
  customerName: 'LÊ NGỌC QUẾ HÂN',
  cif: '005236683',
  birthDate: '19/01/1994',
  age: '32',
  gender: 'female',
  idNumber: '0801 9401 3961',
  idDate: '20/08/2021',
  idPlace: 'Cục Cảnh Sát Quản Lý Hành Chính Về Trật Tự Xã Hội',
  address: 'Số nhà 59, Ấp Bình Lợi, Xã Vàm Cỏ, Tỉnh Tây Ninh',
  currentAddress: 'Số nhà 59, Ấp Bình Lợi, Xã Vàm Cỏ, Tỉnh Tây Ninh',
  phone: '0342925572',
  maritalStatus: 'married',
  cardProductType: 'Visa, Napas, Mastercard',
  proposedLimit: '30',
  officerName: 'Lại Dương Công Bằng',
  officerId: '2026-03016',
  officerEmail: 'laiduongcongbang@vietbank.com.vn',
  officerPhone: '0772.750.714',
  controllerName: 'Nguyễn Thanh Tùng',
  controllerEmail: 'nguyenthanhtung@vietbank.com.vn',
  controllerPhone: '0962.764.468',
  directorName: 'Trần Đại Thời',
  directorEmail: 'trandaithoi@vietbank.com.vn',
  directorPhone: '0932.701.968',
};

export function buildCcToTrinhHtml(common: DossierCommon, s: CcToTrinhSpecific = defaultCcToTrinhSpecific): string {
  const card = common?.creditCard;
  const ttkdName = card?.ttkdName || s.ttkdName || 'TTKD NGUYỄN ẢNH THỦ';
  const docDateStr = card?.docDateStr ? `……….., ngày ….. tháng ….. năm ${card.docDateStr}` : (s.docDateStr || '……….., ngày ….. tháng ….. năm 2026');
  const custName = (common?.partyA?.name || s.customerName || 'LÊ NGỌC QUẾ HÂN').toUpperCase();
  const cif = common?.partyA?.cif || s.cif || '005236683';
  const birthDate = common?.partyA?.birthYear || s.birthDate || '19/01/1994';
  const age = s.age || '32';
  const gender = common?.partyA?.gender || s.gender || 'female';
  const isFemale = gender === 'female';
  const isMale = !isFemale;
  const idNum = common?.partyA?.cccd || s.idNumber || '0801 9401 3961';
  const idDate = common?.partyA?.cccdDate || s.idDate || '20/08/2021';
  const idPlace = common?.partyA?.cccdPlace || s.idPlace || 'Cục Cảnh Sát Quản Lý Hành Chính Về Trật Tự Xã Hội';
  const address = common?.partyA?.address || s.address || 'Số nhà 59, Ấp Bình Lợi, Xã Vàm Cỏ, Tỉnh Tây Ninh';
  const currentAddress = common?.partyA?.currentAddress || s.currentAddress || address;
  const phone = common?.partyA?.phone || s.phone || '0342925572';

  const marital = common?.partyA?.maritalStatus || s.maritalStatus || 'married';
  const isMarried = marital === 'married';
  const isSingle = marital === 'single';
  const isDivorced = marital === 'divorced';

  const cards = card?.cards && card.cards.length > 0 ? card.cards : null;
  const cardProductType = cards
    ? Array.from(new Set(cards.map(c => c.network || (c.productPlan ? detectCardNetwork(c.productPlan) : '')).filter(Boolean))).join(', ')
    : (card?.productPlan ? (card.productPlan.includes('<br/>') ? card.productPlan.replace(/<br\s*\/?>/gi, ', ') : card.productPlan) : (s.cardProductType || 'Visa, Napas, Mastercard'));
  const rawLimit = card?.cardLimit ? String(card.cardLimit).replace(/,/g, '') : '';
  const proposedLimit = rawLimit ? (Number(rawLimit) > 1000000 ? String(Math.round(Number(rawLimit) / 1000000)) : rawLimit) : (s.proposedLimit || '30');

  const officerName = card?.saleOfficerName || s.officerName || 'Lại Dương Công Bằng';
  const officerId = card?.saleOfficerId || s.officerId || '2026-03016';
  const officerEmail = card?.saleOfficerEmail || s.officerEmail || 'laiduongcongbang@vietbank.com.vn';
  const officerPhone = card?.saleOfficerPhone || s.officerPhone || '0772.750.714';

  const controllerName = card?.controllerName || s.controllerName || 'Nguyễn Thanh Tùng';
  const controllerEmail = card?.controllerEmail || s.controllerEmail || 'nguyenthanhtung@vietbank.com.vn';
  const controllerPhone = card?.controllerPhone || s.controllerPhone || '0962.764.468';

  const directorName = card?.directorName || s.directorName || 'Trần Đại Thời';
  const directorEmail = card?.directorEmail || s.directorEmail || 'trandaithoi@vietbank.com.vn';
  const directorPhone = card?.directorPhone || s.directorPhone || '0932.701.968';

  return `
${VHTT_STYLES}
<div class="vhtt-doc">
  <table class="table-borderless" style="width: 100%; margin-bottom: 8pt;">
    <tbody>
      <tr>
        <td style="width: 45%; vertical-align: top; text-align: left;">
          <img src="${bm04LogoDataUri()}" alt="Vietbank" style="height: 32pt; width: auto; object-fit: contain; margin-bottom: 4pt; display: block;" />
          <p style="margin: 0; font-weight: bold; font-size: 11pt;">${ttkdName}</p>
        </td>
        <td style="width: 55%; vertical-align: top; text-align: center;">
          <p style="margin: 0; font-weight: bold; font-size: 11pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p style="margin: 0; font-weight: bold; font-size: 11pt;"><u>Độc lập – Tự do - Hạnh phúc</u></p>
          <p style="margin: 3pt 0 0 0; font-style: italic; font-size: 10pt;">${docDateStr}</p>
        </td>
      </tr>
    </tbody>
  </table>

  <div style="text-align: center; margin: 8pt 0 10pt 0;">
    <h1 style="font-size: 13pt; font-weight: bold; margin: 0; text-transform: uppercase;">
      TỜ TRÌNH CẤP HẠN MỨC THẺ TÍN DỤNG
    </h1>
    <p class="p-center" style="font-size: 10.5pt; font-style: italic; margin: 2pt 0;">
      (Áp dụng đối với Khách hàng cá nhân phát hành thẻ tín dụng Vietbank)
    </p>
    <p class="p-center" style="font-size: 11pt; font-weight: bold; margin: 4pt 0;">
      <u>Kính gửi</u>: Giám đốc ${ttkdName}
    </p>
  </div>

  <p style="font-style: italic; margin: 2pt 0;">
    Căn cứ hồ sơ đề nghị cấp hạn mức thẻ tín dụng của KH ${custName} tại ${ttkdName}.
  </p>
  <p style="margin: 2pt 0 6pt 0;">
    ${ttkdName} trình cấp hạn mức thẻ tín dụng như sau:
  </p>

  <p style="font-weight: bold; font-size: 11pt; margin: 4pt 0;">THÔNG TIN KHÁCH HÀNG</p>
  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 8pt;">
    <tbody>
      <tr>
        <td style="width: 20%; border: 1px solid #000; padding: 3pt 4pt;">Họ và tên</td>
        <td style="width: 40%; border: 1px solid #000; padding: 3pt 4pt; font-weight: bold;">${custName}</td>
        <td style="width: 15%; border: 1px solid #000; padding: 3pt 4pt;">Mã KH:</td>
        <td style="width: 25%; border: 1px solid #000; padding: 3pt 4pt;">${cif}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Năm sinh</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">${birthDate}</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Tuổi</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">${age}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Giới tính</td>
        <td colspan="3" style="border: 1px solid #000; padding: 3pt 4pt;">
          ${isMale ? '☒' : '☐'} Nam &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${isFemale ? '☒' : '☐'} Nữ
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Số GTTT</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; font-weight: bold;">${idNum}</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Ngày cấp</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">${idDate}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Nơi cấp</td>
        <td colspan="3" style="border: 1px solid #000; padding: 3pt 4pt;">${idPlace}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Địa chỉ thường trú</td>
        <td colspan="3" style="border: 1px solid #000; padding: 3pt 4pt;">${address}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Địa chỉ nơi ở hiện tại</td>
        <td colspan="3" style="border: 1px solid #000; padding: 3pt 4pt;">${currentAddress}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Điện thoại di động</td>
        <td colspan="3" style="border: 1px solid #000; padding: 3pt 4pt; font-weight: bold;">${phone}</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Tình trạng hôn nhân</td>
        <td colspan="3" style="border: 1px solid #000; padding: 3pt 4pt;">
          ${isMarried ? '☒' : '☐'} Đã lập gia đình &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${isSingle ? '☒' : '☐'} Chưa kết hôn &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${isDivorced ? '☒' : '☐'} Ly hôn/góa
        </td>
      </tr>
    </tbody>
  </table>

  <p style="font-weight: bold; font-size: 11pt; margin: 6pt 0 4pt 0;">
    ĐÁNH GIÁ CỦA TRUNG TÂM KINH DOANH VỀ HỒ SƠ KHÁCH HÀNG
  </p>

  <p style="font-weight: bold; margin: 3pt 0;">Chính sách cấp thẻ tín dụng:</p>
  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 6pt;">
    <thead>
      <tr style="background-color: #f2f2f2; font-weight: bold; text-align: center;">
        <th style="width: 65%; border: 1px solid #000; padding: 3pt 4pt;">Tên đối tượng KH</th>
        <th style="width: 35%; border: 1px solid #000; padding: 3pt 4pt;">Mã chính sách nhập liệu CMS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">
          KHCN thế chấp bất động sản (có TSBĐ) theo công văn số 2630/2024/QĐ-TGĐ ngày 28/06/2024
        </td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; text-align: center; font-weight: bold;">
          A2_KHCN_TSBD_BDS
        </td>
      </tr>
    </tbody>
  </table>

  <p style="font-weight: bold; margin: 4pt 0 2pt 0;">Điều kiện và hồ sơ phát hành thẻ</p>
  <p style="margin: 1pt 0;">☒ Đáp ứng đầy đủ theo QĐ (chi tiết theo danh mục hồ sơ đính kèm).</p>
  <p style="margin: 1pt 0 6pt 0;">☐ Chưa đáp ứng (chi tiết theo danh mục hồ sơ đính kèm).</p>

  <p style="font-weight: bold; margin: 4pt 0 2pt 0;">Thông tin tín dụng tại Vietbank và các TCTD khác</p>
  <div style="border: 1px solid #000; padding: 4pt; margin-bottom: 6pt;">
    <p style="font-weight: bold; margin: 1pt 0;">Thông tin tín dụng tại Vietbank:</p>
    <p style="margin: 1pt 0;">☐ Đã có thẻ tín dụng tại Vietbank &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Hạn mức thẻ: …………………. trđ</p>
    <p style="margin: 1pt 0;">
      ☒ Thông tin khoản vay khác &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Hạn mức vay: <strong>1,460</strong> trđ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Dư nợ: <strong>1,460</strong> trđ
    </p>
    <p style="margin: 1pt 0; padding-left: 175pt;">
      Số tiền phải trả hàng tháng: <strong>21</strong> trđ
    </p>
    <p style="margin: 1pt 0;">
      ☒ Lịch sử tín dụng tại Vietbank: &nbsp;&nbsp; Tốt &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☒ Từng có lịch sử chậm thanh toán &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Chưa tốt
    </p>
  </div>

  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 6pt;">
    <tbody>
      <tr>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt 4pt; font-weight: bold; background-color: #f2f2f2;">
          Xếp hạng tín dụng nội bộ:
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt 4pt;">
          Điểm tín dụng: <strong>96.68</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Xếp hạng: <strong>AAA</strong>
        </td>
      </tr>
      <tr>
        <td colspan="2" style="border: 1px solid #000; padding: 3pt 4pt; font-weight: bold; background-color: #f2f2f2;">
          Thông tin CIC:
        </td>
      </tr>
      <tr>
        <td style="width: 50%; border: 1px solid #000; padding: 3pt 4pt;">Mã CIC: <strong>8031971333</strong></td>
        <td style="width: 50%; border: 1px solid #000; padding: 3pt 4pt;">Ngày tra cứu: <strong>08/04/2026</strong></td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Tình hình quan hệ</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">
          ☐ Không có dư nợ tại TCTD nào &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☒ Có dư nợ tại <strong>03</strong> TCTD
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt; vertical-align: top;">
          <strong>Dư nợ trên CIC</strong><br/>
          - Tổng dư nợ vay: <strong>2,887</strong> trđ<br/>
          - Dư nợ vay có TSBĐ: <strong>2,860</strong> trđ<br/>
          - Dư nợ vay Không TSBĐ: <strong>27</strong> trđ
        </td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; vertical-align: top;">
          - Số lượng thẻ TD tại các TCTD: <strong>01</strong><br/>
          - HM thẻ TD: <strong>111</strong> trđ<br/>
          - Dư nợ thẻ: <strong>92</strong> trđ
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Chất lượng nợ</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">
          ☒ Bình thường &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Đang quá hạn
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt; font-weight: bold;">Nhận xét:</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; font-style: italic;">
          KH không có nợ xấu trong 05 năm gần nhất, không bị chậm thanh toán thẻ tín dụng trong 03 năm gần nhất, không có nợ cần chú ý trong 12 tháng gần nhất, không có dư nợ đã bán cho VAMC
        </td>
      </tr>
    </tbody>
  </table>

  <p style="font-weight: bold; margin: 4pt 0 2pt 0;">
    Thông tin tài chính của chủ thẻ chính <span style="font-weight: normal; font-style: italic;">(đvt: triệu đồng)</span>
  </p>
  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 6pt;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="width: 35%; border: 1px solid #000; padding: 3pt 4pt;">Thu nhập</th>
        <th style="width: 15%; border: 1px solid #000; padding: 3pt 4pt;">Số tiền</th>
        <th style="width: 35%; border: 1px solid #000; padding: 3pt 4pt;">Chi tiêu</th>
        <th style="width: 15%; border: 1px solid #000; padding: 3pt 4pt;">Số tiền</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Từ lương</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; text-align: right; font-weight: bold;">15</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Chi tiêu cố định</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; text-align: right; font-weight: bold;">12</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Kinh doanh</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; text-align: right; font-weight: bold;">54</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Chi trả nợ hiện tại</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; text-align: right; font-weight: bold;">45</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Khác</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; text-align: right;"></td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Chi tiêu khác</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; text-align: right;"></td>
      </tr>
      <tr style="background-color: #fafafa; font-weight: bold;">
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Tổng thu nhập</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; text-align: right;">69</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Tổng chi tiêu</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt; text-align: right;">57</td>
      </tr>
      <tr>
        <td colspan="4" style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1pt 0; font-weight: bold;">Tổng thu nhập khả dụng còn lại có thể trả nợ thẻ tín dụng hàng tháng:</p>
          <p style="margin: 2pt 0;">☒ Đủ khả năng trả nợ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Không đủ khả năng trả nợ</p>
          <p style="margin: 2pt 0; font-weight: bold; text-decoration: underline;"><em>Diễn giải nguồn trả nợ:</em></p>
          <p style="margin: 1pt 0;">- KH hiện đang là giáo viên tiếng Anh tại Công ty TNHH MTV Đầu tư & Phát triển Giáo dục SSG</p>
          <p style="margin: 1pt 0;">- KH còn kinh doanh lò bánh mì tại nhà KH</p>
        </td>
      </tr>
    </tbody>
  </table>

  <p style="font-weight: bold; margin: 4pt 0 2pt 0;">
    Thông tin TSBĐ <span style="font-weight: normal; font-style: italic;">(trong trường hợp cấp thẻ tín dụng theo các chính sách cấp thẻ có TSĐB)</span>
  </p>
  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 6pt;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="border: 1px solid #000; padding: 3pt 2pt;">Loại tài sản</th>
        <th style="border: 1px solid #000; padding: 3pt 2pt;">Hợp đồng thế chấp số</th>
        <th style="border: 1px solid #000; padding: 3pt 2pt;">Giá trị định giá (trđ)</th>
        <th style="border: 1px solid #000; padding: 3pt 2pt;">Hạn mức cấp hiện hữu (trđ)</th>
        <th style="border: 1px solid #000; padding: 3pt 2pt;">Hạn mức cấp lần này (trđ)</th>
        <th style="border: 1px solid #000; padding: 3pt 2pt;">LTV theo QĐ</th>
        <th style="border: 1px solid #000; padding: 3pt 2pt;">LTV đề xuất</th>
      </tr>
    </thead>
    <tbody>
      <tr style="text-align: center;">
        <td style="border: 1px solid #000; padding: 3pt 2pt; font-weight: bold;">BĐS</td>
        <td style="border: 1px solid #000; padding: 3pt 2pt; font-weight: bold;">PNAT.HĐTC.06200623</td>
        <td style="border: 1px solid #000; padding: 3pt 2pt; font-weight: bold;">2,140</td>
        <td style="border: 1px solid #000; padding: 3pt 2pt; font-weight: bold;">1,460</td>
        <td style="border: 1px solid #000; padding: 3pt 2pt; font-weight: bold;">30</td>
        <td style="border: 1px solid #000; padding: 3pt 2pt; font-weight: bold;">70%</td>
        <td style="border: 1px solid #000; padding: 3pt 2pt; font-weight: bold;">69.6%</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt; font-weight: bold;">Tổng giá trị TSBĐ</td>
        <td colspan="6" style="border: 1px solid #000; padding: 3pt 4pt; text-align: right; font-weight: bold;">2,140,000,000 đồng</td>
      </tr>
      <tr>
        <td colspan="7" style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1pt 0; text-decoration: underline;"><u>Nhận xét:</u></p>
          <p style="margin: 1pt 0;">Mục đích sử dụng của BĐS thế chấp: ☐ BĐS kinh doanh &nbsp;&nbsp;&nbsp; ☒ BĐS không kinh doanh &nbsp;&nbsp;&nbsp; ☐ BĐS hỗn hợp</p>
          <p style="margin: 1pt 0;">Tài sản đảm bảo theo chính sách có TSBĐ: ☒ Được nhận &nbsp;&nbsp;&nbsp; ☐ Hạn chế nhận &nbsp;&nbsp;&nbsp; ☐ Không được nhận</p>
          <p style="margin: 1pt 0;">Căn cứ ghi nhận giá trị tài sản: theo thông báo kết quả định giá/chứng thư định giá Số 166293/2025/TBKQDG.BDS-DGTS ngày 13/05/2025 của PHÒNG ĐỊNH GIÁ TÀI SẢN.</p>
        </td>
      </tr>
    </tbody>
  </table>

  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 6pt;">
    <tbody>
      <tr>
        <td style="width: 35%; border: 1px solid #000; padding: 3pt 4pt; font-weight: bold;">Mục đích sử dụng vốn:</td>
        <td style="width: 65%; border: 1px solid #000; padding: 3pt 4pt;">
          ☒ Đúng mục đích tiêu dùng cá nhân &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Không đúng mục đích tiêu dùng cá nhân
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt; font-weight: bold;">
          Phương án sử dụng vốn khả thi (trên 400 triệu đồng):
        </td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">
          ☐ Khả thi &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Không khả thi, lý do: ……………………
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt 4pt; font-weight: bold;">Thông tin khác / Đề xuất ngoại lệ:</td>
        <td style="border: 1px solid #000; padding: 3pt 4pt;">Không phát sinh.</td>
      </tr>
    </tbody>
  </table>

  <table class="table-bordered table-approval" style="width: 100%; border-collapse: collapse; border: 1.5pt solid #000; margin: 6pt 0 8pt 0; page-break-inside: avoid;">
    <tbody>
      <tr>
        <td colspan="3" style="border: 1.5pt solid #000; padding: 3.5pt 5pt; font-weight: bold; text-transform: uppercase;">
          PHÊ DUYỆT CỦA TRUNG TÂM KINH DOANH
        </td>
      </tr>
      <tr>
        <td colspan="3" style="border: 1.5pt solid #000; border-top: 1.5pt solid #000; border-bottom: 1px dotted #000; padding: 3pt 5pt; font-weight: bold;">
          Cán bộ kinh doanh
        </td>
      </tr>
      <tr>
        <td style="width: 18%; border-left: 1.5pt solid #000; border-right: 1px dotted #000; border-bottom: 1px dotted #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 0; font-weight: bold;">Đề xuất:</p>
        </td>
        <td style="width: 44%; border-left: 1px dotted #000; border-right: 1px dotted #000; border-bottom: 1px dotted #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">☒ Thẻ chính (tên KH): <strong>${custName}</strong></p>
          <p style="margin: 1.5pt 0;">☒ Loại thẻ: <strong>${cardProductType}</strong></p>
          <p style="margin: 1.5pt 0;">☐ Hạn mức tối đa theo QĐ:…………………. trđ</p>
          <p style="margin: 1.5pt 0;">☒ Hạn mức đề xuất: <u><strong>${proposedLimit}</strong></u> trđ</p>
        </td>
        <td style="width: 38%; border-left: 1px dotted #000; border-right: 1.5pt solid #000; border-bottom: 1px dotted #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">☐ Thẻ phụ (tên KH): ……………………</p>
          <p style="margin: 1.5pt 0;">☐ Loại thẻ: …………………………</p>
          <p style="margin: 1.5pt 0;">☐ Hạn mức: ……………………… trđ</p>
        </td>
      </tr>
      <tr>
        <td style="border-left: 1.5pt solid #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Họ và tên:</p>
          <p style="margin: 1.5pt 0;">Mã nhân sự:</p>
          <p style="margin: 1.5pt 0;">Email:</p>
          <p style="margin: 1.5pt 0;">Điện thoại:</p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0; font-weight: bold;">${officerName}</p>
          <p style="margin: 1.5pt 0; font-weight: bold;">${officerId}</p>
          <p style="margin: 1.5pt 0;"><a href="mailto:${officerEmail}" style="color: #0044cc; text-decoration: underline; font-weight: bold;">${officerEmail}</a></p>
          <p style="margin: 1.5pt 0; font-weight: bold;">${officerPhone}</p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1.5pt solid #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Ngày: ……/……/202…</p>
          <p style="margin: 1.5pt 0; font-weight: bold;">Ký tên:</p>
          <div style="height: 45px;"></div>
        </td>
      </tr>

      <tr>
        <td colspan="3" style="border: 1.5pt solid #000; border-top: 2pt solid #000; border-bottom: 1px dotted #000; padding: 3pt 5pt; font-weight: bold;">
          Cán bộ thẩm định tín dụng
        </td>
      </tr>
      <tr>
        <td style="border-left: 1.5pt solid #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Họ và tên:</p>
          <p style="margin: 1.5pt 0;">Email:</p>
          <p style="margin: 1.5pt 0;">Điện thoại:</p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p class="empty-p" style="min-height: 40px;"></p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1.5pt solid #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Ngày:</p>
          <p style="margin: 1.5pt 0; font-weight: bold;">Ký tên:</p>
          <div style="height: 45px;"></div>
        </td>
      </tr>

      <tr>
        <td colspan="3" style="border: 1.5pt solid #000; border-top: 2pt solid #000; border-bottom: 1px dotted #000; padding: 3pt 5pt; font-weight: bold;">
          Ý kiến đề xuất của GĐ/PGĐ Kinh doanh/TBP Kinh doanh (nếu có)
        </td>
      </tr>
      <tr>
        <td style="border-left: 1.5pt solid #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Họ và tên:</p>
          <p style="margin: 1.5pt 0;">Email:</p>
          <p style="margin: 1.5pt 0;">Điện thoại:</p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0; font-weight: bold;">${controllerName}</p>
          <p style="margin: 1.5pt 0;"><a href="mailto:${controllerEmail}" style="color: #0044cc; text-decoration: underline; font-weight: bold;">${controllerEmail}</a></p>
          <p style="margin: 1.5pt 0; font-weight: bold;">${controllerPhone}</p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1.5pt solid #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Ngày: ……/……/202…</p>
          <p style="margin: 1.5pt 0; font-weight: bold;">Ký tên:</p>
          <div style="height: 45px;"></div>
        </td>
      </tr>

      <tr>
        <td colspan="3" style="border: 1.5pt solid #000; border-top: 2pt solid #000; border-bottom: 1px dotted #000; padding: 3pt 5pt; font-weight: bold;">
          Ý kiến/Phê duyệt của Trưởng đơn vị (GĐ/PGĐ phụ trách TTKD)
        </td>
      </tr>
      <tr>
        <td colspan="3" style="border-left: 1.5pt solid #000; border-right: 1.5pt solid #000; border-bottom: 1px dotted #000; border-top: 1px dotted #000; padding: 3pt 5pt;">
          <p style="margin: 1.5pt 0;">☐ Đồng ý &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Không đồng ý &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Ý kiến khác:……………………………………..</p>
        </td>
      </tr>
      <tr>
        <td style="border-left: 1.5pt solid #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Họ và tên:</p>
          <p style="margin: 1.5pt 0;">Email:</p>
          <p style="margin: 1.5pt 0;">Điện thoại:</p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0; font-weight: bold;">${directorName}</p>
          <p style="margin: 1.5pt 0;"><a href="mailto:${directorEmail}" style="color: #0044cc; text-decoration: underline; font-weight: bold;">${directorEmail}</a></p>
          <p style="margin: 1.5pt 0; font-weight: bold;">${directorPhone}</p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1.5pt solid #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Ngày: ……/……/202…</p>
          <p style="margin: 1.5pt 0; font-weight: bold;">Ký tên:</p>
          <div style="height: 45px;"></div>
        </td>
      </tr>

      <tr>
        <td colspan="3" style="border: 1.5pt solid #000; border-top: 2pt solid #000; border-bottom: 1px dotted #000; padding: 3pt 5pt; font-weight: bold;">
          Ý kiến/Phê duyệt của cấp có thẩm quyền
        </td>
      </tr>
      <tr>
        <td colspan="3" style="border-left: 1.5pt solid #000; border-right: 1.5pt solid #000; border-bottom: 1px dotted #000; border-top: 1px dotted #000; padding: 3pt 5pt;">
          <p style="margin: 1.5pt 0;">☐ Đồng ý &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Không đồng ý &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Ý kiến khác:……………………………………..</p>
        </td>
      </tr>
      <tr>
        <td style="border-left: 1.5pt solid #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Họ và tên:</p>
          <p style="margin: 1.5pt 0;">Email:</p>
          <p style="margin: 1.5pt 0;">Điện thoại:</p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1px dotted #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p class="empty-p" style="min-height: 40px;"></p>
        </td>
        <td style="border-left: 1px dotted #000; border-right: 1.5pt solid #000; border-bottom: 1.5pt solid #000; border-top: 1px dotted #000; padding: 3pt 5pt; vertical-align: top;">
          <p style="margin: 1.5pt 0;">Ngày:</p>
          <p style="margin: 1.5pt 0; font-weight: bold;">Ký tên:</p>
          <div style="height: 45px;"></div>
        </td>
      </tr>
    </tbody>
  </table>

  <div class="vhtt-footer" style="margin-top: auto; padding-top: 4pt;">
    <span class="vhtt-footer-left"><em>BM04_1017_2025.QĐ-TGĐ_Tờ trình cấp hạn mức thẻ tín dụng</em></span>
    <span class="vhtt-footer-right"><em>Trang 1/1</em></span>
  </div>
</div>
`.trim();
}

export const ccToTrinhTemplate: DocTemplate<CcToTrinhSpecific> = {
  id: 'cc_to_trinh',
  label: 'Tờ trình cấp hạn mức thẻ',
  icon: CreditCard,
  specificDefaults: defaultCcToTrinhSpecific,
  buildHtml: buildCcToTrinhHtml,
};
