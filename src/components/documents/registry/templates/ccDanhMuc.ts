import { CreditCard } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import { VHTT_STYLES } from './vhttStyles';
import { bm04LogoDataUri } from '../../../../lib/bm04Logo';

export interface CcDanhMucSpecific {
  toTrinhSo?: string;
  docDate?: string;
  nguoiLapName?: string;
  nguoiLapPhone?: string;
  truongDonViName?: string;
  truongDonViPhone?: string;
  isPhoneAppraised?: boolean;
  phoneAppraiseTime?: string;
  phoneAppraiseReason?: string;
}

export const defaultCcDanhMucSpecific: CcDanhMucSpecific = {
  toTrinhSo: '………',
  docDate: '',
  nguoiLapName: 'Lại Dương Công Bằng',
  nguoiLapPhone: '0772.750.714',
  truongDonViName: 'Trần Đại Thời',
  truongDonViPhone: '0932.701.968',
  isPhoneAppraised: false,
  phoneAppraiseTime: '',
  phoneAppraiseReason: 'Tiếp thị trực tiếp',
};

export function buildCcDanhMucHtml(common: DossierCommon, s: CcDanhMucSpecific = defaultCcDanhMucSpecific): string {
  const card = common?.creditCard;
  const toTrinhSo = s.toTrinhSo || '………';
  const nguoiLapName = card?.saleOfficerName || s.nguoiLapName || 'Lại Dương Công Bằng';
  const nguoiLapPhone = card?.saleOfficerPhone || s.nguoiLapPhone || '0772.750.714';
  const truongDonViName = card?.directorName || s.truongDonViName || 'Trần Đại Thời';
  const truongDonViPhone = card?.directorPhone || s.truongDonViPhone || '0932.701.968';
  const isPhoneAppraised = s.isPhoneAppraised ?? false;
  const phoneAppraiseTime = s.phoneAppraiseTime || '…………………';
  const phoneAppraiseReason = s.phoneAppraiseReason || 'Tiếp thị trực tiếp';

  let dateStr = card?.docDateStr || '……/……/2026';
  if (s.docDate) {
    const parts = s.docDate.split('-');
    if (parts.length === 3) {
      dateStr = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }

  return `
${VHTT_STYLES}
<div class="vhtt-doc">
  <table class="table-borderless" style="width: 100%; margin-bottom: 8pt;">
    <tbody>
      <tr>
        <td style="width: 50%; vertical-align: top; text-align: left;">
          <img src="${bm04LogoDataUri()}" alt="Vietbank" style="height: 32pt; width: auto; object-fit: contain; display: block;" />
        </td>
        <td style="width: 50%; vertical-align: middle; text-align: right; font-size: 10pt; font-weight: bold;">
          10160-12700000
        </td>
      </tr>
    </tbody>
  </table>

  <div style="text-align: center; margin-bottom: 12pt;">
    <p class="p-center" style="font-size: 11pt; font-weight: bold; margin: 0;">PHỤ LỤC 01</p>
    <h1 style="font-size: 13pt; font-weight: bold; margin: 4pt 0; text-transform: uppercase;">
      DANH MỤC HỒ SƠ VÀ ĐIỀU KIỆN CẤP HẠN MỨC THẺ TÍN DỤNG
    </h1>
    <p class="p-center" style="font-size: 10.5pt; font-style: italic; margin: 0;">
      (Kèm theo Tờ trình cấp hạn mức thẻ tín dụng số: ${toTrinhSo})
    </p>
  </div>

  <p style="font-weight: bold; font-size: 11pt; margin-top: 6pt; margin-bottom: 3pt;">Hồ sơ khách hàng</p>

  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 6pt;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="width: 16%; border: 1px solid #000; padding: 4pt;">Tiêu chí</th>
        <th colspan="2" style="width: 29%; border: 1px solid #000; padding: 4pt;">Loại chứng từ</th>
        <th style="width: 43%; border: 1px solid #000; padding: 4pt;">Tên chứng từ</th>
        <th style="width: 12%; border: 1px solid #000; padding: 4pt;">Bản gốc/<br/>Bản sao</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td rowspan="5" style="border: 1px solid #000; padding: 4pt; font-weight: bold; text-align: center; vertical-align: middle;">
          Hồ sơ chung
        </td>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt; font-weight: bold;">Giấy đề nghị cấp thẻ</td>
        <td style="border: 1px solid #000; padding: 4pt;">Giấy đề nghị kiêm Hợp đồng phát hành và sử dụng Thẻ tín dụng</td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">Bản gốc</td>
      </tr>
      <tr>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt; font-weight: bold;">Giấy tờ tùy thân</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          ☐ Thẻ căn cước &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ CCCD &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Hộ chiếu
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">Bản sao</td>
      </tr>
      <tr>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt; font-weight: bold;">Giấy tờ chứng minh cư trú</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1.5pt 0;">☐ Thông báo Số định danh cá nhân &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Giấy xác nhận thông tin về cư trú</p>
          <p style="margin: 1.5pt 0;">☐ Thông báo kết quả giải quyết/hủy bỏ đăng ký cư trú</p>
          <p style="margin: 1.5pt 0;">☐ Màn hình trang thông tin cư trú của KH trên Cổng dịch vụ công quốc gia</p>
          <p style="margin: 1.5pt 0;">☐ Xác nhận hộ khẩu tập thể</p>
          <p style="margin: 1.5pt 0;">☐ Sổ tạm trú &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Sao kê TK &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Hóa đơn điện/nước…</p>
          <p style="margin: 1.5pt 0;">☐ Giấy tờ chứng minh sở hữu hợp pháp của KH hoặc người hôn phối/tứ thân phụ mẫu đối với nhà/đất ở tại địa chỉ đang cư trú.</p>
          <p style="margin: 1.5pt 0;">☐ Khác: ……………………………………………………………</p>
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; vertical-align: middle;">Bản sao<br/>Bản gốc</td>
      </tr>
      <tr>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt; font-weight: bold;">Lịch sử tín dụng</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          ☐ CIC vốn vay &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ CIC thẻ tín dụng
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">Bản sao</td>
      </tr>
      <tr>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt; font-weight: bold;">Xếp hạng tín dụng</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          ☐ Bảng chấm điểm xếp hạng tín dụng nội bộ
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">Bản gốc</td>
      </tr>

      <tr>
        <td rowspan="11" style="border: 1px solid #000; padding: 4pt; font-weight: bold; text-align: center; vertical-align: middle;">
          Hồ sơ riêng theo đối tượng KH
        </td>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt; font-weight: bold;">
          Giấy tờ chứng minh chức vụ/<br/>chức danh công việc/<br/>việc làm
        </td>
        <td style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1.5pt 0;">☐ Hợp đồng lao động &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Quyết định biên chế/bổ nhiệm</p>
          <p style="margin: 1.5pt 0;">☐ Xác nhận công tác của cơ quan</p>
          <p style="margin: 1.5pt 0;">☐ Giấy tờ khác (nêu rõ): ………...………...………...………...</p>
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; vertical-align: middle;">Bản sao<br/>Bản gốc</td>
      </tr>
      <tr>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt; font-weight: bold;">Giấy tờ chứng minh thu nhập</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          ☐ Sao kê tài khoản &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Bảng lương &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Xác nhận lương
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">Bản gốc</td>
      </tr>
      <tr>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt; font-weight: bold;">Hồ sơ tài sản bảo đảm</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1.5pt 0;">☐ Chứng từ ký quỹ &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Sổ tiết kiệm cầm cố</p>
          <p style="margin: 1.5pt 0;">☐ Hồ sơ TSĐB và hồ sơ định giá TSĐB</p>
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; vertical-align: middle;">Bản gốc<br/>Bản sao</td>
      </tr>

      <tr>
        <td rowspan="8" style="border: 1px solid #000; padding: 4pt; font-weight: bold; vertical-align: middle; text-align: center;">Giấy tờ khác</td>
        <td style="border: 1px solid #000; padding: 4pt; font-weight: bold;">KH tiền gửi</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          <strong>Sao kê số dư</strong>: &nbsp;&nbsp; ☐ Tiền gửi hiện tại &nbsp;&nbsp;&nbsp;&nbsp; ☐ Tiền gửi BQ &nbsp;&nbsp;&nbsp;&nbsp; ☐ Cầm cố BQ
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">Bản gốc</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; font-weight: bold;">KH tiền vay</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          ☐ Sao kê TK tiền vay &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ☐ Hợp đồng tín dụng
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">Bản sao</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; font-weight: bold;">KH lãnh đạo DN có xếp hạng</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          ☐ Danh sách xếp loại KHDN còn hiệu lực
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">Bản gốc</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; font-weight: bold;">KH tham gia các SP bảo hiểm Vietbank</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1.5pt 0;">☐ Hợp đồng bảo hiểm</p>
          <p style="margin: 1.5pt 0;">☐ Biên lai/Hóa đơn/Phiếu thu/Ủy nhiệm chi/Sao kê tài khoản thanh toán của Vietbank/Màn hình tra cứu thông tin lịch sử đóng phí BH trên Trang Hợp đồng bảo hiểm online của KH/Email xác nhận từ công ty bảo hiểm gửi cho KH: thể hiện thông tin nộp phí BH kỳ hiện tại.</p>
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; vertical-align: middle;">Bản sao</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; font-weight: bold;">KH được lãnh đạo giới thiệu</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1.5pt 0;">☐ Giấy giới thiệu của lãnh đạo (theo mẫu Vietbank)</p>
          <p style="margin: 1.5pt 0;">☐ Email giới thiệu từ Lãnh đạo/Trợ lý của Lãnh đạo (có c/c cho Lãnh đạo)</p>
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; vertical-align: middle;">Bản gốc</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; font-weight: bold;">KH sở hữu thẻ NH khác</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1.5pt 0;">☐ Bản sao (kèm bản chụp) hai mặt của thẻ tín dụng</p>
          <p style="margin: 1.5pt 0;">☐ Khác (ghi rõ loại chứng từ quy định trong chính sách cấp thẻ hiện hành)</p>
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; vertical-align: middle;">Bản sao</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; font-weight: bold;">Khoản cấp tín dụng qua thẻ có mức giá trị vượt quá 400 triệu đồng</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1.5pt 0;">☐ Thông tin mục đích sử dụng vốn khả thi theo Biểu mẫu “Phương án sử dụng vốn khả thi”.</p>
          <p style="margin: 1.5pt 0;">☐ Thông tin người có liên quan theo Biểu mẫu “Danh sách thông tin người có liên quan”.</p>
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; vertical-align: middle;">Bản gốc</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; font-weight: bold;">Khác</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          ☐ Khác (ghi rõ): …………………………………………………………………………
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">……….</td>
      </tr>
    </tbody>
  </table>

  <p style="font-size: 9.5pt; font-style: italic; margin-top: 4pt; margin-bottom: 10pt;">
    <u>Lưu ý</u>: Bản sao là bản sao y chứng thực trong vòng 06 tháng gần nhất hoặc Bản sao đã được nhân viên tiếp nhận hồ sơ ký đối chiếu với Bản chính.
  </p>

  <p style="font-weight: bold; font-size: 11pt; margin-top: 8pt; margin-bottom: 4pt;">
    Điều kiện cấp hạn mức thẻ tín dụng theo chính sách
  </p>

  <table class="table-bordered" style="width: 100%; border-collapse: collapse; margin-bottom: 8pt;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="width: 8%; border: 1px solid #000; padding: 4pt;">Stt</th>
        <th style="width: 72%; border: 1px solid #000; padding: 4pt;">Tiêu chí</th>
        <th style="width: 20%; border: 1px solid #000; padding: 4pt;">Kết quả</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background-color: #fafafa; font-weight: bold;">
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">I</td>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt;">Điều kiện chung</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">i.</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          KH là cá nhân người Việt Nam cư trú hợp pháp tại Việt Nam, có năng lực hành vi dân sự đầy đủ theo quy định của Pháp luật.
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">
          ☒ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">ii.</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          <p style="margin: 1pt 0; font-weight: bold;">Độ tuổi theo quy định:</p>
          <p style="margin: 1pt 0;"><u>KH phát hành thẻ theo hình thức có TSBĐ:</u></p>
          <p style="margin: 1pt 0; padding-left: 8pt;">- KH thực hiện ký quỹ, cầm cố tiền gửi có kỳ hạn/Phong tỏa số dư TG CKH: Từ đủ 18 tuổi trở lên tại thời điểm trình hồ sơ.</p>
          <p style="margin: 1pt 0; padding-left: 8pt;">- KH thế chấp bất động sản: Từ đủ 18 đến 70 tuổi tại thời điểm Xét duyệt cấp hạn mức Thẻ tín dụng.</p>
          <p style="margin: 1pt 0;"><u>KH phát hành thẻ theo hình thức không có TSBĐ:</u></p>
          <p style="margin: 1pt 0; padding-left: 8pt;">- KH QHTG/QHTD/được lãnh đạo giới thiệu: Từ đủ 18 đến 70 tuổi tại thời điểm xét duyệt cấp hạn mức Thẻ tín dụng.</p>
          <p style="margin: 1pt 0; padding-left: 8pt;">- KH còn lại: Từ đủ 18 đến 65 tuổi đối với nam và từ đủ 18 đến 60 tuổi đối với nữ. Độ tuổi tối đa căn cứ theo Lộ trình tăng tuổi nghỉ hưu theo quy định của Bộ luật Lao động.</p>
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; vertical-align: middle; white-space: nowrap;">
          ☒ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">iii.</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          KH có số ĐTDĐ, đang làm việc hoặc cư trú tại Tỉnh/Thành phố nơi có trụ sở Chi nhánh/Phòng giao dịch Vietbank.
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">
          ☒ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">iv.</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          KH không phát sinh nợ nhóm 2 trong vòng 12 tháng gần nhất, nợ nhóm 3 đến nhóm 5 trong 36 tháng gần nhất, không có dư nợ bán cho VAMC/nợ xử lý rủi ro tín dụng trong 36 tháng gần nhất tại Vietbank hoặc các tổ chức tín dụng khác tính đến thời điểm xét duyệt cấp hạn mức Thẻ tín dụng.
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">
          ☒ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">v.</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          KH có thuộc đối tượng hạn chế cấp thẻ tín dụng theo quy định Vietbank?
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">
          ☐ Có &nbsp;&nbsp;&nbsp; ☒ Không
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">vi.</td>
        <td style="border: 1px solid #000; padding: 4pt;">
          KH có thuộc đối tượng không cấp thẻ và không trình ngoại lệ?
        </td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">
          ☐ Có &nbsp;&nbsp;&nbsp; ☒ Không
        </td>
      </tr>

      <tr style="background-color: #fafafa; font-weight: bold;">
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">II</td>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt;">Điều kiện theo chính sách cấp hạn mức thẻ tín dụng</td>
      </tr>
      <tr style="font-weight: bold;">
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">1</td>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt;">KHCN cầm cố tiền gửi có kỳ hạn mở tại Vietbank (có TSBĐ)</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">i.</td>
        <td style="border: 1px solid #000; padding: 4pt;">KH đang gửi tiết kiệm có kỳ hạn gửi từ 01 tháng trở lên tại Vietbank.</td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">☐ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">ii.</td>
        <td style="border: 1px solid #000; padding: 4pt;">Giá trị tiền gửi tiết kiệm của KH từ 10 triệu đồng trở lên.</td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">☐ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">iii.</td>
        <td style="border: 1px solid #000; padding: 4pt;">Đồng ý cho Vietbank phong tỏa số dư tiền gửi của KH bằng với hạn mức Thẻ tín dụng được cấp trong suốt thời gian sử dụng thẻ tín dụng Vietbank.</td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">☐ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt</td>
      </tr>

      <tr style="font-weight: bold;">
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">2</td>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt;">KHCN thế chấp bất động sản (có TSBĐ)</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">i.</td>
        <td style="border: 1px solid #000; padding: 4pt;">KH là người đứng tên khoản vay trên hệ thống corebanking (trường hợp Phát hành thẻ tín dụng kèm theo khoản vay có TSBĐ là BĐS).</td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">☒ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">ii.</td>
        <td style="border: 1px solid #000; padding: 4pt;">KH đã hoàn tất các thủ tục thế chấp TSBĐ theo quy định Vietbank</td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">☒ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt</td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center;">iii.</td>
        <td style="border: 1px solid #000; padding: 4pt;">LTV cho khoản cấp hạn mức thẻ tín dụng 69.6% thỏa quy định hiện hành của Vietbank</td>
        <td style="border: 1px solid #000; padding: 4pt; text-align: center; white-space: nowrap;">☒ Đạt &nbsp;&nbsp;&nbsp; ☐ Chưa đạt</td>
      </tr>
    </tbody>
  </table>

  <table class="table-bordered sig-table" style="width: 100%; border-collapse: collapse; margin-top: 10pt; page-break-inside: avoid;">
    <thead>
      <tr style="background-color: #f2f2f2; text-align: center; font-weight: bold;">
        <th style="width: 45%; border: 1px solid #000; padding: 4pt;">Người lập</th>
        <th colspan="2" style="width: 55%; border: 1px solid #000; padding: 4pt;">Trưởng Đơn vị</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; vertical-align: top; height: 50px;"></td>
        <td style="width: 22%; border: 1px solid #000; padding: 4pt; vertical-align: top; font-weight: bold;">
          Thẩm định qua điện thoại
        </td>
        <td style="width: 33%; border: 1px solid #000; padding: 4pt; vertical-align: top;">
          <p style="margin: 2pt 0;">${isPhoneAppraised ? '☒' : '☐'} Có &nbsp;&nbsp;&nbsp; Thời gian gọi điện: ${phoneAppraiseTime}</p>
          <p style="margin: 2pt 0;">${!isPhoneAppraised ? '☒' : '☐'} Không &nbsp;&nbsp; Lý do: ${phoneAppraiseReason}</p>
        </td>
      </tr>
      <tr>
        <td style="border: 1px solid #000; padding: 4pt; vertical-align: top;">
          <p style="margin: 2pt 0;"><strong>Họ tên:</strong> ${nguoiLapName}</p>
          <p style="margin: 2pt 0;"><strong>Điện thoại:</strong> ${nguoiLapPhone}</p>
          <p style="margin: 2pt 0;"><strong>Ngày:</strong> ${dateStr}</p>
        </td>
        <td colspan="2" style="border: 1px solid #000; padding: 4pt; vertical-align: top;">
          <div style="height: 35px;"></div>
          <p style="margin: 2pt 0;"><strong>Họ tên:</strong> ${truongDonViName}</p>
          <p style="margin: 2pt 0;"><strong>Điện thoại:</strong> ${truongDonViPhone}</p>
          <p style="margin: 2pt 0;"><strong>Ngày:</strong> ${dateStr}</p>
        </td>
      </tr>
    </tbody>
  </table>

  <div style="font-size: 8.5pt; font-style: italic; margin-top: 8pt; line-height: 1.3;">
    <p style="margin: 1pt 0;"><strong>Ghi chú:</strong></p>
    <p style="margin: 1pt 0;">- TTKD chủ động thêm/xóa các dòng, cột tại mẫu biểu đảm bảo đánh giá phù hợp theo từng đối tượng khách hàng.</p>
    <p style="margin: 1pt 0;">- TTKD tick chọn loại hồ sơ và các điều kiện theo quy định của chính sách cấp hạn mức thẻ tín dụng hiện hành.</p>
  </div>

  <div class="vhtt-footer" style="margin-top: auto; padding-top: 4pt;">
    <span class="vhtt-footer-left"><em>BM04_1017_2025.QĐ-TGĐ_PL01_Danh mục hồ sơ và điều kiện cấp hạn mức thẻ tín dụng</em></span>
    <span class="vhtt-footer-right"><em>Trang 1/1</em></span>
  </div>
</div>
`.trim();
}

export const ccDanhMucTemplate: DocTemplate<CcDanhMucSpecific> = {
  id: 'cc_danh_muc',
  label: 'Danh mục hồ sơ và điều kiện',
  icon: CreditCard,
  specificDefaults: defaultCcDanhMucSpecific,
  buildHtml: buildCcDanhMucHtml,
};
