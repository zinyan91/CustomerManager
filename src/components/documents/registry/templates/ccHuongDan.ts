import { BookOpen } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import { VHTT_STYLES } from './vhttStyles';
import { bm04LogoDataUri } from '../../../../lib/bm04Logo';

export interface CcHuongDanSpecific {
  ttkdName?: string;
  docDateStr?: string;
}

export const defaultCcHuongDanSpecific: CcHuongDanSpecific = {
  ttkdName: 'TTKD NGUYỄN ẢNH THỦ',
  docDateStr: '2026',
};

export function buildCcHuongDanHtml(
  common: DossierCommon,
  s: CcHuongDanSpecific = defaultCcHuongDanSpecific
): string {
  const card = common?.creditCard;
  const ttkdName = card?.ttkdName || s.ttkdName || 'TTKD NGUYỄN ẢNH THỦ';

  return `
${VHTT_STYLES}
<div class="vhtt-doc">
  <table class="table-borderless" style="width: 100%; margin-bottom: 8pt;">
    <tbody>
      <tr>
        <td style="width: 45%; vertical-align: top; text-align: left;">
          <img src="${bm04LogoDataUri()}" alt="Vietbank" style="height: 32pt; width: auto; object-fit: contain; margin-bottom: 4pt; display: block;" />
          <p style="margin: 0; font-weight: bold; font-size: 10.5pt;">${ttkdName}</p>
        </td>
        <td style="width: 55%; vertical-align: top; text-align: center;">
          <p style="margin: 0; font-weight: bold; font-size: 11pt;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
          <p style="margin: 0; font-weight: bold; font-size: 11pt;"><u>Độc lập – Tự do - Hạnh phúc</u></p>
        </td>
      </tr>
    </tbody>
  </table>

  <div style="text-align: center; margin: 10pt 0 12pt 0;">
    <h1 style="font-size: 13pt; font-weight: bold; margin: 0; text-transform: uppercase;">
      HƯỚNG DẪN ĐIỀN PHIẾU YÊU CẦU PHÁT HÀNH THẺ TÍN DỤNG
    </h1>
    <p class="p-center" style="font-size: 10.5pt; font-style: italic; margin: 3pt 0 0 0;">
      (Tài liệu hướng dẫn nghiệp vụ dành cho Trung tâm Kinh doanh thực hiện phát hành thẻ trên hệ thống CMS)
    </p>
  </div>

  <p style="font-weight: bold; font-size: 11pt; margin: 8pt 0 4pt 0;">
    I. THÔNG TIN CHUNG VỀ ĐƠN VỊ PHÁT HÀNH
  </p>
  <ul style="margin: 2pt 0 6pt 20pt; padding: 0; line-height: 1.5; font-size: 10.5pt;">
    <li><strong>Mã TTKD:</strong> Mã Trung tâm kinh doanh phát hành thẻ theo bảng mã chi nhánh Vietbank.</li>
    <li><strong>TTKD:</strong> Tên Trung tâm kinh doanh phát hành thẻ (Ví dụ: <em>${ttkdName}</em>).</li>
  </ul>

  <p style="font-weight: bold; font-size: 11pt; margin: 8pt 0 4pt 0;">
    II. HƯỚNG DẪN CHI TIẾT TỪNG MỤC TRÊN PHIẾU YÊU CẦU
  </p>

  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 8pt; font-size: 10pt;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="width: 8%; border: 1px solid #000; padding: 3pt;">Mục</th>
        <th style="width: 32%; border: 1px solid #000; padding: 3pt;">Nội dung trường thông tin</th>
        <th style="width: 60%; border: 1px solid #000; padding: 3pt;">Quy chuẩn & Hướng dẫn điền dữ liệu</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">1</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Mã KH của thẻ chính (Cust ID/ CIF)</td>
        <td style="border: 1px solid #000; padding: 3pt;">Chỉ điền mã Customer ID / CIF của chủ thẻ chính trên hệ thống ngân hàng.</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold; vertical-align: top;">2</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold; vertical-align: top;">
          Mã HS giấy đề nghị phát hành thẻ kiêm HĐ sử dụng thẻ (Application No.)
        </td>
        <td style="border: 1px solid #000; padding: 3pt;">
          <p style="margin: 1pt 0;">Mã hồ sơ ghi theo quy ước: <strong>Mã TTKD / năm / số hồ sơ</strong></p>
          <p style="margin: 1pt 0;">- <em>Hồ sơ thẻ chính:</em> Ví dụ Chi nhánh Cần Thơ đề nghị: <strong>0900/2026/001</strong>.</p>
          <p style="margin: 1pt 0;">- <em>Phát hành thêm thẻ chính dùng chung hạn mức:</em></p>
          <ul style="margin: 1pt 0 2pt 18pt; padding: 0;">
            <li>Thẻ chính 01: Mã hồ sơ thẻ chính /1 (Ví dụ: <strong>0900/2026/001/1</strong>)</li>
            <li>Thẻ chính 02: Mã hồ sơ thẻ chính /2 (Ví dụ: <strong>0900/2026/001/2</strong>)</li>
          </ul>
          <p style="margin: 1pt 0;">- <em>Hồ sơ thẻ phụ:</em></p>
          <ul style="margin: 1pt 0 2pt 18pt; padding: 0;">
            <li>Thẻ phụ 01: Mã hồ sơ thẻ chính/S1 (Ví dụ: <strong>0900/2026/001/S1</strong>)</li>
            <li>Thẻ phụ 02: Mã hồ sơ thẻ chính/S2 (Ví dụ: <strong>0900/2026/001/S2</strong>)</li>
          </ul>
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">3</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Tên KH (Cust name)</td>
        <td style="border: 1px solid #000; padding: 3pt;">Điền in hoa tên chủ thẻ chính và tên chủ thẻ phụ (nếu có phát hành thẻ phụ).</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">4</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Loại Thẻ (Product plan)</td>
        <td style="border: 1px solid #000; padding: 3pt;">
          Chọn gói thẻ theo quy định (Visa MyStyle, Visa Luxury, Napas Chuẩn, Mastercard Platinum/Stand). Điền loại thẻ tương ứng cho từng thẻ phát hành.
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">5</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Mã phí thẻ tín dụng (Fee Interest Profile)</td>
        <td style="border: 1px solid #000; padding: 3pt;">
          Tham khảo Thông báo Triển khai các chương trình ưu đãi phát hành thẻ tín dụng của Bộ phận Thẻ & Giải pháp thanh toán - Phòng Sản phẩm - Khối Bán lẻ ban hành theo từng đối tượng (Thông thường, CIH/Gia An/Hoa Lâm, CBNV).
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">6</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Số thẻ chính (khi mở thẻ phụ)</td>
        <td style="border: 1px solid #000; padding: 3pt;">
          Chỉ điền khi đã có thẻ chính trước đó, điền đúng số thẻ của loại thẻ mở cho thẻ phụ lần này (Ví dụ: Thẻ phụ Mastercard thì điền đúng số thẻ chính Mastercard: <em>524190******5678</em>).
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">7 & 8</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">SĐT di động & Email KH</td>
        <td style="border: 1px solid #000; padding: 3pt;">Điền đầy đủ số điện thoại di động và địa chỉ email của chủ thẻ chính và chủ thẻ phụ.</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">9</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Collateral Desc (Số TK Masterline)</td>
        <td style="border: 1px solid #000; padding: 3pt;">Điền số tài khoản Masterline (Số tài khoản commitment đã tạo trên FBE) của thẻ chính.</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">10</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Hạn mức Thẻ được cấp (Collater Value)</td>
        <td style="border: 1px solid #000; padding: 3pt;">
          Điền đúng hạn mức thẻ của thẻ chính và thẻ phụ, đảm bảo tổng không vượt quá hạn mức thẻ tín dụng được duyệt trên tờ trình cấp hạn mức.
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">11</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Mã hồ sơ cấp hạn mức trên CLM</td>
        <td style="border: 1px solid #000; padding: 3pt;">
          Điền mã hồ sơ thẻ CLM của thẻ chính. <em>(Trường hợp phát hành thêm thẻ chung hạn mức đã cấp không có mã CLM thì ghi: "Phát hành thêm thẻ sử dụng chung hạn mức với số thẻ...")</em>.
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">12</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Mã chính sách thẻ (Credit policy)</td>
        <td style="border: 1px solid #000; padding: 3pt;">
          Tham khảo Phụ lục 02 Quyết định 1017/2025/QĐ-TGĐ và các văn bản sửa đổi, bổ sung theo từng thời kỳ (Ví dụ: <em>A2_KHCN_TSBD_BDS</em>).
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">13</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Mã CIF Sale Officer</td>
        <td style="border: 1px solid #000; padding: 3pt;">Điền mã CIF của Chuyên viên / Nhân viên Kinh doanh trực tiếp quản lý hồ sơ thẻ.</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">14 & 15</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Mã CIF & Tên Sale Support</td>
        <td style="border: 1px solid #000; padding: 3pt;">
          Điền mã CIF và Họ tên in hoa không dấu của CBNV/Lãnh đạo Vietbank giới thiệu hồ sơ thẻ (theo Phụ lục 01 Thông báo số 2596/2024/TB-TGĐ ngày 09/07/2024).
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">16</td>
        <td style="border: 1px solid #000; padding: 3pt; font-weight: bold;">Checker (Loại quà tặng)</td>
        <td style="border: 1px solid #000; padding: 3pt;">TTKD ghi rõ loại quà tặng khách hàng lựa chọn theo chương trình khuyến mãi hiện hành.</td>
      </tr>
    </tbody>
  </table>

  <p style="font-weight: bold; font-size: 11pt; margin: 8pt 0 4pt 0;">
    III. DANH MỤC HỒ SƠ QUY ĐỊNH UPLOAD LÊN HỆ THỐNG CMS
  </p>

  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 8pt; font-size: 10pt;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="width: 8%; border: 1px solid #000; padding: 3pt;">STT</th>
        <th style="width: 62%; border: 1px solid #000; padding: 3pt;">Loại chứng từ</th>
        <th style="width: 30%; border: 1px solid #000; padding: 3pt;">Hình thức lưu trữ trên CMS</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">1</td>
        <td style="border: 1px solid #000; padding: 3pt;">Giấy đề nghị kiêm hợp đồng phát hành và sử dụng thẻ tín dụng</td>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">Bản scan màu</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center;">2</td>
        <td style="border: 1px solid #000; padding: 3pt;">Phiếu yêu cầu phát hành thẻ tín dụng</td>
        <td style="border: 1px solid #000; padding: 3pt; text-align: center; font-weight: bold;">Bản scan màu</td>
      </tr>
    </tbody>
  </table>

  <div class="vhtt-footer" style="margin-top: auto; padding-top: 6pt;">
    <span class="vhtt-footer-left"><em>Tài liệu hướng dẫn nghiệp vụ thẻ tín dụng Vietbank</em></span>
    <span class="vhtt-footer-right"><em>Trang 1/1</em></span>
  </div>
</div>
`.trim();
}

export const ccHuongDanTemplate: DocTemplate<CcHuongDanSpecific> = {
  id: 'cc_huong_dan',
  label: 'Hướng dẫn điền Phiếu yêu cầu',
  icon: BookOpen,
  specificDefaults: defaultCcHuongDanSpecific,
  buildHtml: buildCcHuongDanHtml,
};
