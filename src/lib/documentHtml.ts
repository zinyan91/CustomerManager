import { fmtDate, parseAnyDate } from './utils';
import { moneyTextToWords, moneyToVietnameseWords } from './numberToWords';
import type { TemplateType } from '../components/documents/TemplateSelector';
import type { SaleItem, ConstItem, PaymentStageItem } from '../components/documents/DocumentForm';
import type { DepositContractData } from '../components/documents/depositContract';
import { bm04LogoDataUri } from './bm04Logo';

const nfc = (str?: string) => (str ? str.normalize('NFC') : '');

const titleCaseName = (str: string) =>
  nfc(str).trim().toLowerCase().replace(/(^|\s)(\p{L})/gu, (_, sp, ch) => sp + ch.toUpperCase());

const givenName = (str: string) => {
  const parts = nfc(str).trim().split(/\s+/).filter(Boolean);
  return parts.length ? titleCaseName(parts[parts.length - 1]) : '';
};

function ngayThangNam(iso: string): string {
  const parsed = parseAnyDate(iso);
  if (parsed) {
    return `ngày ${String(parsed.day).padStart(2, '0')} tháng ${String(parsed.month).padStart(2, '0')} năm ${parsed.year}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((iso || '').trim());
  if (!m) return iso || '';
  return `ngày ${m[3]} tháng ${m[2]} năm ${m[1]}`;
}

export function buildGiayCamKetHtml(input: {
  hoTen: string;
  cccd: string;
  ngayCap: string;
  noiCap: string;
  ngayLap: string;
}): string {
  const dateFormatted = input.ngayLap ? ngayThangNam(input.ngayLap) : 'ngày ..... tháng ..... năm 20...';

  return `
    <div data-doc-section="bm04" class="bm04-sheet">
      <div class="bm04-header">
        <img src="${bm04LogoDataUri()}" alt="Vietbank" class="bm04-logo" />
      </div>
      <p class="text-right no-indent bm04-date">TP.HCM, ${dateFormatted}</p>
      <p class="no-indent">&nbsp;</p>
      <p class="text-center no-indent font-bold text-[14pt] bm04-title">GIẤY CAM KẾT</p>
      <p class="no-indent">&nbsp;</p>
      <p class="no-indent font-bold bm04-section-title">BÊN CAM KẾT</p>
      <p class="bm04-name no-indent">Tôi tên là: <strong>${nfc(input.hoTen)}</strong></p>
      <p class="bm04-fill no-indent">Số CCCD/CC: <span>${nfc(input.cccd)}</span><span class="doc-tab"></span>cấp ngày: <span>${nfc(input.ngayCap)}</span><span class="doc-tab"></span>Nơi cấp: <span>${nfc(input.noiCap)}</span></p>
      <p class="no-indent">Nay, Tôi cam kết các nội dung sau:</p>
      <p class="bm04-bullet">Tôi không có tài khoản thanh toán tại bất kỳ tổ chức cung ứng dịch vụ thanh toán nào.</p>
      <p class="bm04-bullet">Tôi cam kết chịu trách nhiệm trước pháp luật về tính chính xác, trung thực của các thông tin, hồ sơ và chứng từ đã cung cấp cho Vietbank.</p>
      <p class="no-indent">&nbsp;</p>
      <table class="bm04-sig">
        <tbody>
          <tr>
            <td>&nbsp;</td>
            <td class="text-center">
              <div class="font-bold">BÊN CAM KẾT</div>
              <div class="font-italic">(Ký, ghi rõ họ tên)</div>
              <div class="sig-space" style="height: 80px;">&nbsp;</div>
              <div class="font-bold">${nfc(input.hoTen) || '&nbsp;'}</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="bm04-footer">
        <span class="font-italic">BM08_........./2026/QĐ-TGĐ_Giấy cam kết</span>
        <span>Trang 1/1</span>
      </div>
    </div>
  `;
}

export interface BuildLeaseRoomParams {
  partyA: {
    name: string;
    birthYear?: string;
    cccd?: string;
    cccdDate?: string;
    cccdPlace?: string;
    address?: string;
  };
  partyB: {
    name: string;
    birthYear?: string;
    cccd?: string;
    cccdDate?: string;
    cccdPlace?: string;
    address?: string;
  };
  contractDate?: string;
  partyAPhone?: string;
  partyBPhone?: string;
  roomNo?: string;
  houseNo?: string;
  location?: string;
  coTenants?: string;
  monthlyPrice?: string;
  purpose?: string;
  termMonths?: string;
}

export function buildLeaseRoomHtml(input: BuildLeaseRoomParams): string {
  const dateFormatted = input.contractDate ? ngayThangNam(input.contractDate) : 'ngày ..... tháng ..... năm 20...';
  const locationText = input.location
    ? `Tại địa chỉ: ${nfc(input.location)}`
    : (input.houseNo ? `Tại địa chỉ: ${nfc(input.houseNo)}` : 'Tại địa chỉ: ................................................................................');

  const formatCoTenants = (raw?: string) => {
    if (!raw || !raw.trim()) {
      return `
        <p class="clause-p no-indent">- ....................................................................................................................................................</p>
        <p class="clause-p no-indent">- ....................................................................................................................................................</p>
        <p class="clause-p no-indent">- ....................................................................................................................................................</p>
      `;
    }
    const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      return `
        <p class="clause-p no-indent">- ....................................................................................................................................................</p>
        <p class="clause-p no-indent">- ....................................................................................................................................................</p>
      `;
    }
    return lines.map(line => `<p class="clause-p no-indent">- ${nfc(line)}</p>`).join('');
  };

  return `
    <div class="text-center no-indent">
      <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="font-bold text-[13pt] no-indent">Độc lập – Tự do – Hạnh phúc</div>
      <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">-----o0o-----</div>
    </div>
    <div class="text-center pt-2 pb-2 no-indent">
      <h1 style="font-size: 16pt; font-weight: bold; text-transform: uppercase;">HỢP ĐỒNG THUÊ PHÒNG TRỌ</h1>
    </div>

    <p class="clause-p no-indent">Hôm nay, ${dateFormatted} ${locationText}</p>
    <p class="clause-p no-indent">Đại diện các bên gồm có:</p>

    <p class="clause-p font-bold uppercase no-indent pt-1">CHỦ NHÀ (BÊN A)</p>
    <p class="clause-p no-indent">- Ông (Bà): <strong>${nfc(input.partyA.name) || '................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm: <strong>${input.partyA.birthYear || '.........'}</strong></p>
    <p class="clause-p no-indent">- CCCD số: <strong>${input.partyA.cccd || '........................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Cấp ngày: <strong>${input.partyA.cccdDate || '.../.../20...'}</strong></p>
    <p class="clause-p no-indent">- Tại: <strong>${nfc(input.partyA.cccdPlace) || '................................................'}</strong></p>
    <p class="clause-p no-indent">- Địa chỉ thường trú: <strong>${nfc(input.partyA.address) || '................................................'}</strong></p>
    <p class="clause-p no-indent">- Điện thoại: <strong>${nfc(input.partyAPhone) || '........................'}</strong></p>

    <p class="clause-p font-bold uppercase no-indent pt-2">NGƯỜI THUÊ (BÊN B)</p>
    <p class="clause-p no-indent">- Ông (Bà): <strong>${nfc(input.partyB.name) || '................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm: <strong>${input.partyB.birthYear || '.........'}</strong></p>
    <p class="clause-p no-indent">- CCCD số: <strong>${input.partyB.cccd || '........................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Cấp ngày: <strong>${input.partyB.cccdDate || '.../.../20...'}</strong></p>
    <p class="clause-p no-indent">- Tại: <strong>${nfc(input.partyB.cccdPlace) || '................................................'}</strong></p>
    <p class="clause-p no-indent">- Địa chỉ thường trú: <strong>${nfc(input.partyB.address) || '................................................'}</strong></p>
    <p class="clause-p no-indent">- Điện thoại: <strong>${nfc(input.partyBPhone) || '........................'}</strong></p>

    <p class="clause-p font-bold no-indent pt-1">Những người cùng thuê phòng:</p>
    ${formatCoTenants(input.coTenants)}

    <p class="clause-p font-italic no-indent pt-2">Sau khi bàn bạc, hai bên đã đi đến thống nhất ký hợp đồng này với những điều khoản như sau:</p>

    <p class="clause-p no-indent"><strong>ĐIỀU I:</strong> Bên A đồng ý cho bên B thuê: <strong>${input.roomNo ? `phòng số ${nfc(input.roomNo)}` : '................................................'}</strong></p>
    <p class="clause-p no-indent">Căn nhà số: <strong>${nfc(input.houseNo || input.location) || '................................................'}</strong> (do bên A làm chủ sở hữu).</p>
    <p class="clause-p no-indent">✓ Giá cho thuê là: <strong>${input.monthlyPrice ? `${input.monthlyPrice} đồng/tháng` : '........................ đồng/tháng'}</strong> (Tiền điện, nước, điện thoại và các nhu cầu khác các bên tự thanh toán nếu có).</p>
    <p class="clause-p no-indent">✓ Mục đích cho thuê: <strong>${nfc(input.purpose) || 'Ở'}</strong></p>
    <p class="clause-p no-indent">✓ Thời hạn hợp đồng cho thuê là: <strong>${input.termMonths ? `${input.termMonths} tháng` : '........................ tháng'}</strong></p>

    <p class="clause-p no-indent pt-2"><strong>ĐIỀU II:</strong> Bên B đồng ý thuê phòng của bên A với những nội dung nêu tại điều I của hợp đồng này.</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU III: TRÁCH NHIỆM CỦA BÊN A</p>
    <p class="clause-p no-indent">- Tạo điều kiện thuận lợi cho bên B được sử dụng diện tích phòng thuê mà không bị gây khó khăn bởi bất cứ ai.</p>
    <p class="clause-p no-indent">- Hỗ trợ bên B lập hồ sơ kê khai đăng ký tạm trú.</p>
    <p class="clause-p no-indent">- Không chịu trách nhiệm về các hành vi dân sự hoặc vi phạm pháp luật của bên B khi sử dụng phòng đã thuê.</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU IV: TRÁCH NHIỆM CỦA BÊN B</p>
    <p class="clause-p no-indent">- Sử dụng diện tích phòng thuê đúng mục đích.</p>
    <p class="clause-p no-indent">- Thanh toán đủ tiền thuê phòng hàng tháng cho bên A vào đúng chu kỳ mỗi tháng.</p>
    <p class="clause-p no-indent">- Không tự ý cho người khác thuê lại hoặc sửa chữa thay đổi kết cấu xây dựng phòng đã thuê.</p>
    <p class="clause-p no-indent">- Bồi thường, sửa chữa hư hao nhà nếu có.</p>
    <p class="clause-p no-indent">- Không dùng phòng thuê để làm việc phạm pháp như tàng trữ vũ khí, chất dễ cháy nổ, hóa chất độc hại, văn hóa phẩm đồi trụy,...</p>
    <p class="clause-p no-indent">- Giữ gìn vệ sinh chung và thực hiện nếp sống văn hóa, văn minh đô thị mà khu phố và chính quyền địa phương vận động.</p>
    <p class="clause-p no-indent">- Thực hiện đăng ký tạm trú, tạm vắng theo quy định của pháp luật.</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU KHOẢN KHÁC</p>
    <p class="clause-p no-indent">- Khi bên A muốn chấm dứt hợp đồng trước thời hạn thì phải báo cho bên B trước ít nhất là 30 ngày và hoàn lại tiền thế chân (Điều kiện hợp đồng đã duy trì từ 6 tháng).</p>
    <p class="clause-p no-indent">- Khi bên B muốn chấm dứt hợp đồng trước thời hạn thì phải báo cho bên A trước ít nhất là 30 ngày và hoàn lại tiền thế chân (Điều kiện hợp đồng đã duy trì từ 6 tháng). Nếu bên B đơn phương hủy hợp đồng hoặc hợp đồng chưa đủ 6 tháng, bên A có quyền từ chối hoàn trả bên B tiền thế chân.</p>
    <p class="clause-p no-indent">- Khi chấm dứt hợp đồng, bên B giao lại phòng cho bên A đúng hiện trạng ban đầu. Trừ những hao mòn theo thời gian hoặc do sử dụng điều kiện bình thường.</p>
    <p class="clause-p no-indent">- Trong quá trình sử dụng phòng thuê, hệ thống điện nước, các thiết bị khác trong phòng nếu có hư hỏng thì bên B có trách nhiệm tự sửa chữa.</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU KHOẢN CHUNG</p>
    <p class="clause-p no-indent">- Hai bên cam kết thực hiện đúng những điều đã ký kết trong hợp đồng này. Nếu bên nào sai phạm gây thiệt hại cho đối tác thì phải chịu trách nhiệm bồi thường kể cả chi phí liên quan đến tòa án nếu có.</p>
    <p class="clause-p no-indent">- Trong quá trình thực hiện hợp đồng, nếu có phát sinh hai bên sẽ cùng bàn bạc lại để đảm bảo công bằng quyền lợi của đôi bên.</p>
    <p class="clause-p no-indent">- Hợp đồng này được lập thành 02 bản, mỗi bên lưu 01 bản để làm cơ sở thực hiện.</p>
    <p class="clause-p no-indent">- Hai bên đã đọc kỹ và hiểu rõ những điều khoản nêu trong hợp đồng và thống nhất ký kết.</p>

    <table class="sig-table font-serif" style="width: 100%; margin-top: 20pt; page-break-inside: avoid;">
      <tbody>
        <tr>
          <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
            <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN B</p>
            <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
            <div class="sig-space" style="height: 80px;">&nbsp;</div>
            <p class="text-center font-bold uppercase no-indent">${nfc(input.partyB.name) || '&nbsp;'}</p>
          </td>
          <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
            <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN A</p>
            <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
            <div class="sig-space" style="height: 80px;">&nbsp;</div>
            <p class="text-center font-bold uppercase no-indent">${nfc(input.partyA.name) || '&nbsp;'}</p>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

export interface BuildLeaseWarehouseParams {
  partyA: {
    name: string;
    birthYear?: string;
    cccd?: string;
    cccdDate?: string;
    cccdPlace?: string;
    address?: string;
  };
  partyB: {
    name: string;
    birthYear?: string;
    cccd?: string;
    cccdDate?: string;
    cccdPlace?: string;
    address?: string;
  };
  area?: string;
  warehouseAddress?: string;
  startDate?: string;
  endDate?: string;
  monthlyPrice?: string;
  paymentDay?: string;
  signPlace?: string;
  signDate?: string;
}

export function buildLeaseWarehouseHtml(input: BuildLeaseWarehouseParams): string {
  const signDateFormatted = input.signDate ? ngayThangNam(input.signDate) : 'ngày ..... tháng ..... năm 20...';
  const placeFormatted = input.signPlace ? `${nfc(input.signPlace)} ` : '';

  return `
    <div class="text-center no-indent">
      <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="font-bold text-[13pt] no-indent">Độc lập – Tự do – Hạnh phúc</div>
      <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">-----o0o-----</div>
    </div>
    <div class="text-center pt-2 pb-2 no-indent">
      <h1 style="font-size: 16pt; font-weight: bold; text-transform: uppercase;">HỢP ĐỒNG THUÊ NHÀ KHO</h1>
    </div>

    <p class="clause-p font-bold uppercase no-indent pt-1">(BÊN A) BÊN CHO THUÊ NHÀ KHO</p>
    <p class="clause-p no-indent">- Họ và tên: <strong>${nfc(input.partyA.name) || '................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm: <strong>${input.partyA.birthYear || '.........'}</strong></p>
    <p class="clause-p no-indent">- CMND/CCCD số: <strong>${input.partyA.cccd || '........................'}</strong> &nbsp;&nbsp; cấp ngày: ${input.partyA.cccdDate || '.../.../20...'} &nbsp;&nbsp; Tại: ${nfc(input.partyA.cccdPlace) || '........................'}</p>
    <p class="clause-p no-indent">- Hộ khẩu thường trú: ${nfc(input.partyA.address) || '................................................'}</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">(BÊN B) BÊN THUÊ NHÀ</p>
    <p class="clause-p no-indent">- Họ và tên: <strong>${nfc(input.partyB.name) || '................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm: <strong>${input.partyB.birthYear || '.........'}</strong></p>
    <p class="clause-p no-indent">- CMND/CCCD số: <strong>${input.partyB.cccd || '........................'}</strong> &nbsp;&nbsp; cấp ngày: ${input.partyB.cccdDate || '.../.../20...'} &nbsp;&nbsp; Tại: ${nfc(input.partyB.cccdPlace) || '........................'}</p>
    <p class="clause-p no-indent">- Hộ khẩu thường trú: ${nfc(input.partyB.address) || '................................................'}</p>

    <p class="clause-p no-indent pt-2">Hai bên thỏa thuận và đồng ý với những nội dung sau:</p>

    <p class="clause-p font-bold no-indent pt-1">ĐIỀU 1:</p>
    <p class="clause-p no-indent">- Bên A đồng ý cho bên B thuê kho với diện tích là: <strong>${input.area ? `${input.area} m²` : '................ m²'}</strong></p>
    <p class="clause-p no-indent">- Địa chỉ: <strong>${nfc(input.warehouseAddress) || '................................................'}</strong></p>
    <p class="clause-p no-indent">- Thời hạn thuê kho kể từ <strong>${fmtDate(input.startDate) || 'ngày ... tháng ... năm ...'}</strong> đến <strong>${fmtDate(input.endDate) || 'ngày ... tháng ... năm ...'}</strong></p>

    <p class="clause-p font-bold no-indent pt-2">ĐIỀU 2:</p>
    <p class="clause-p no-indent">- Tiền thuê kho là: <strong>${input.monthlyPrice ? `${input.monthlyPrice} đ/tháng` : '................ đ/tháng'}</strong> ${input.monthlyPrice ? `(Bằng chữ: ${moneyTextToWords(input.monthlyPrice)})` : ''}</p>
    <p class="clause-p no-indent">- Tiền thuê kho bên B thanh toán cho bên A vào <strong>${input.paymentDay ? `ngày ${input.paymentDay} hàng tháng` : 'ngày ..... hàng tháng'}</strong></p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU 3: TRÁCH NHIỆM BÊN A</p>
    <p class="clause-p no-indent">- Giao nhà kho cho bên B đúng ngày hợp đồng.</p>
    <p class="clause-p no-indent">- Hướng dẫn bên B chấp hành đúng các quy định của địa phương và hoàn tất mọi thủ tục giấy tờ đăng ký cho bên B.</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU 4: TRÁCH NHIỆM BÊN B</p>
    <p class="clause-p no-indent">- Trả tiền thuê kho hàng tháng theo hợp đồng.</p>
    <p class="clause-p no-indent">- Sử dụng đúng theo hợp đồng thuê kho và có trách nhiệm bảo quản cẩn thận, giữ gìn sạch sẽ nơi nhà kho.</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU 5: ĐIỀU KHOẢN CHUNG</p>
    <p class="clause-p no-indent">- Bên A và bên B thực hiện đúng các điều khoản ghi trong hợp đồng.</p>
    <p class="clause-p no-indent">- Hợp đồng được thành lập 02 bản có giá trị ngang nhau, mỗi bên giữ 01 bản.</p>

    <p class="text-right font-italic pt-3 no-indent">${placeFormatted}${signDateFormatted}</p>

    <table class="sig-table font-serif" style="width: 100%; margin-top: 15pt; page-break-inside: avoid;">
      <tbody>
        <tr>
          <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
            <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN A</p>
            <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
            <div class="sig-space" style="height: 80px;">&nbsp;</div>
            <p class="text-center font-bold uppercase no-indent">${nfc(input.partyA.name) || '&nbsp;'}</p>
          </td>
          <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
            <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN B</p>
            <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
            <div class="sig-space" style="height: 80px;">&nbsp;</div>
            <p class="text-center font-bold uppercase no-indent">${nfc(input.partyB.name) || '&nbsp;'}</p>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

export interface BuildLoanContractParams {
  partyA: {
    name: string;
    birthYear?: string;
    cccd?: string;
    cccdDate?: string;
    cccdPlace?: string;
    address?: string;
  };
  partyB: {
    name: string;
    birthYear?: string;
    cccd?: string;
    cccdDate?: string;
    cccdPlace?: string;
    address?: string;
  };
  contractDate?: string;
  location?: string;
  loanAmount?: string;
  loanPurpose?: string;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
}

export function buildLoanContractHtml(input: BuildLoanContractParams): string {
  const dateFormatted = input.contractDate ? ngayThangNam(input.contractDate) : 'ngày … tháng … năm …';
  const locationFormatted = input.location ? nfc(input.location) : '……………………';

  return `
    <div class="text-center no-indent">
      <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
      <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
      <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">-----o0o-----</div>
    </div>
    <div class="text-center pt-2 pb-2 no-indent">
      <h1 style="font-size: 16pt; font-weight: bold; text-transform: uppercase;">GIẤY VAY TIỀN</h1>
    </div>

    <p class="clause-p no-indent">Hôm nay, ${dateFormatted}, tại ${locationFormatted}, chúng tôi gồm:</p>

    <p class="clause-p font-bold uppercase no-indent pt-1">BÊN CHO VAY (BÊN A):</p>
    <p class="clause-p no-indent">- Ông/bà: <strong>${nfc(input.partyA.name) || '................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm: <strong>${input.partyA.birthYear || '.........'}</strong></p>
    <p class="clause-p no-indent">- CCCD số: <strong>${input.partyA.cccd || '........................'}</strong> &nbsp;&nbsp; Cấp ngày: ${input.partyA.cccdDate || '.../.../20...'} &nbsp;&nbsp; Nơi cấp: ${nfc(input.partyA.cccdPlace) || '........................'}</p>
    <p class="clause-p no-indent">- Hộ khẩu thường trú: ${nfc(input.partyA.address) || '................................................'}</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">BÊN VAY (BÊN B):</p>
    <p class="clause-p no-indent">- Ông/bà: <strong>${nfc(input.partyB.name) || '................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Sinh năm: <strong>${input.partyB.birthYear || '.........'}</strong></p>
    <p class="clause-p no-indent">- CCCD số: <strong>${input.partyB.cccd || '........................'}</strong> &nbsp;&nbsp; Cấp ngày: ${input.partyB.cccdDate || '.../.../20...'} &nbsp;&nbsp; Nơi cấp: ${nfc(input.partyB.cccdPlace) || '........................'}</p>
    <p class="clause-p no-indent">- Hộ khẩu thường trú: ${nfc(input.partyB.address) || '................................................'}</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU 1: SỐ TIỀN VAY VÀ MỤC ĐÍCH</p>
    <p class="clause-p no-indent">- Bên A đồng ý cho bên B vay và bên B đồng ý vay số tiền là: <strong>${input.loanAmount ? `${input.loanAmount} VNĐ` : '................................ VNĐ'}</strong></p>
    <p class="clause-p no-indent">(Bằng chữ: <em>${input.loanAmount ? moneyTextToWords(input.loanAmount) : '................................................................'}</em>)</p>
    <p class="clause-p no-indent">- Mục đích vay: <strong>${nfc(input.loanPurpose) || 'Tiêu dùng / Phục vụ sản xuất kinh doanh'}</strong></p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU 2: THỜI HẠN VAY</p>
    <p class="clause-p no-indent">Từ ngày: <strong>${fmtDate(input.startDate) || '……………………..'}</strong> đến ngày: <strong>${fmtDate(input.endDate) || '………………………'}</strong></p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU 3: PHƯƠNG THỨC TRẢ NỢ</p>
    <p class="clause-p no-indent">Hình thức thanh toán: <strong>${input.paymentMethod || 'tiền mặt / chuyển khoản'}</strong></p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU 4: CAM KẾT</p>
    <p class="clause-p no-indent">- Bên B cam kết sử dụng tiền đúng mục đích và thanh toán đầy đủ, đúng hạn.</p>
    <p class="clause-p no-indent">- Hai bên tự chịu trách nhiệm trước pháp luật về nội dung hợp đồng.</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">ĐIỀU 5: HIỆU LỰC</p>
    <p class="clause-p no-indent">- Hợp đồng có hiệu lực từ ngày ký.</p>
    <p class="clause-p no-indent">- Lập thành 02 bản, mỗi bên giữ 01 bản.</p>

    <table class="sig-table font-serif" style="width: 100%; margin-top: 20pt; page-break-inside: avoid;">
      <tbody>
        <tr>
          <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
            <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN A</p>
            <p class="text-center font-italic text-[11pt] no-indent">(Ký, ghi rõ họ tên)</p>
            <div class="sig-space" style="height: 80px;">&nbsp;</div>
            <p class="text-center font-bold uppercase no-indent">${nfc(input.partyA.name) || '&nbsp;'}</p>
          </td>
          <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
            <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN B</p>
            <p class="text-center font-italic text-[11pt] no-indent">(Ký, ghi rõ họ tên)</p>
            <div class="sig-space" style="height: 80px;">&nbsp;</div>
            <p class="text-center font-bold uppercase no-indent">${nfc(input.partyB.name) || '&nbsp;'}</p>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

export interface BuildLeaseLandParams {
  partyA: {
    name: string;
    birthYear?: string;
    cccd?: string;
    cccdDate?: string;
    cccdPlace?: string;
    address?: string;
  };
  partyB: {
    name: string;
    birthYear?: string;
    cccd?: string;
    cccdDate?: string;
    cccdPlace?: string;
    address?: string;
  };
  contractNo?: string;
  contractDate?: string;
  location?: string;
  landArea?: string;
  landAddress?: string;
  termYears?: string;
  startDate?: string;
  endDate?: string;
  purpose?: string;
  rentPricePerYear?: string;
  paymentMethod?: string;
}

export function buildLeaseLandHtml(input: BuildLeaseLandParams): string {
  const dateFormatted = input.contractDate ? ngayThangNam(input.contractDate) : 'ngày … tháng … năm ……';
  const contractNoFormatted = input.contractNo ? input.contractNo : '....………';
  const locationFormatted = input.location ? nfc(input.location) : '................................';

  return `
    <table class="w-full no-border mb-2 font-serif" style="width: 100%; border: none; border-collapse: collapse;">
      <tbody>
        <tr>
          <td style="width: 45%; vertical-align: top; text-align: center; border: none;">
            <div class="font-bold text-[12pt] uppercase no-indent">HỢP ĐỒNG THUÊ ĐẤT</div>
            <div class="text-[11pt] no-indent">Số: ${contractNoFormatted}</div>
          </td>
          <td style="width: 55%; vertical-align: top; text-align: center; border: none;">
            <div class="font-bold text-[12pt] uppercase no-indent">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div class="font-bold text-[12pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
            <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 4px;">----------o0o----------</div>
            <div class="font-italic text-[11pt] no-indent">${dateFormatted}</div>
          </td>
        </tr>
      </tbody>
    </table>

    <div class="text-center pt-2 pb-2 no-indent">
      <h1 style="font-size: 16pt; font-weight: bold; text-transform: uppercase;">HỢP ĐỒNG THUÊ ĐẤT</h1>
    </div>

    <p class="clause-p no-indent">- Căn cứ Luật Đất đai ngày 29 tháng 11 năm 2013;</p>
    <p class="clause-p no-indent">- Căn cứ Nghị định số 43/2014/NĐ-CP ngày 15 tháng 5 năm 2014 của Chính phủ quy định chi tiết thi hành một số điều của Luật Đất đai;</p>
    <p class="clause-p no-indent">- Căn cứ Thông tư số 30/2014/TT-BTNMT ngày 02 tháng 6 năm 2014 của Bộ trưởng Bộ Tài nguyên và Môi trường quy định về hồ sơ giao đất, cho thuê đất, chuyển mục đích sử dụng đất, thu hồi đất;</p>

    <p class="clause-p no-indent pt-1">Hôm nay, ${dateFormatted}, tại ${locationFormatted}, chúng tôi gồm:</p>

    <p class="clause-p font-bold uppercase no-indent pt-1">BÊN CHO THUÊ ĐẤT (BÊN A):</p>
    <p class="clause-p no-indent">- Ông/bà: <strong>${nfc(input.partyA.name) || '................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Năm sinh: <strong>${input.partyA.birthYear || '.........'}</strong></p>
    <p class="clause-p no-indent">- CCCD số: <strong>${input.partyA.cccd || '........................'}</strong> &nbsp;&nbsp; Ngày cấp: ${input.partyA.cccdDate || '.../.../20...'} &nbsp;&nbsp; Nơi cấp: ${nfc(input.partyA.cccdPlace) || '........................'}</p>
    <p class="clause-p no-indent">- Nơi ĐKTT: ${nfc(input.partyA.address) || '................................................'}</p>

    <p class="clause-p font-bold uppercase no-indent pt-2">BÊN THUÊ ĐẤT (BÊN B):</p>
    <p class="clause-p no-indent">- Ông/bà: <strong>${nfc(input.partyB.name) || '................................................'}</strong> &nbsp;&nbsp;&nbsp;&nbsp; Năm sinh: <strong>${input.partyB.birthYear || '.........'}</strong></p>
    <p class="clause-p no-indent">- CCCD số: <strong>${input.partyB.cccd || '........................'}</strong> &nbsp;&nbsp; Ngày cấp: ${input.partyB.cccdDate || '.../.../20...'} &nbsp;&nbsp; Nơi cấp: ${nfc(input.partyB.cccdPlace) || '........................'}</p>
    <p class="clause-p no-indent">- Nơi ĐKTT: ${nfc(input.partyB.address) || '................................................'}</p>

    <p class="clause-p no-indent pt-2">Hai Bên thỏa thuận ký hợp đồng thuê đất với các điều, khoản sau đây:</p>

    <p class="clause-p font-bold no-indent pt-1">Điều 1. Bên cho thuê đất cho Bên thuê đất thuê khu đất như sau:</p>
    <p class="clause-p no-indent">- Diện tích đất: <strong>${input.landArea ? `${input.landArea} m²` : '.............. m²'}</strong>, tại: <strong>${nfc(input.landAddress || input.location) || '................................................'}</strong></p>
    <p class="clause-p no-indent">- Thời hạn thuê đất: <strong>${input.termYears ? `${input.termYears} năm` : '...... năm'}</strong>, kể từ <strong>${fmtDate(input.startDate) || 'ngày ... tháng ... năm ...'}</strong> đến <strong>${fmtDate(input.endDate) || 'ngày ... tháng ... năm ...'}</strong></p>
    <p class="clause-p no-indent">- Mục đích sử dụng đất thuê: <strong>${nfc(input.purpose) || '................................................'}</strong></p>

    <p class="clause-p font-bold no-indent pt-2">Điều 2. Bên thuê đất có trách nhiệm trả tiền thuê đất theo quy định sau:</p>
    <p class="clause-p no-indent">- Giá đất tính tiền thuê đất là: <strong>${input.rentPricePerYear ? `${input.rentPricePerYear} đồng/năm` : '................ đồng/năm'}</strong>${input.rentPricePerYear ? ` (Bằng chữ: ${moneyTextToWords(input.rentPricePerYear)})` : ''}</p>
    <p class="clause-p no-indent">- Tiền thuê đất được tính từ: <strong>${fmtDate(input.startDate) || 'ngày ... tháng ... năm ...'}</strong></p>
    <p class="clause-p no-indent">- Phương thức nộp tiền thuê đất: <strong>${nfc(input.paymentMethod) || '................................................'}</strong></p>
    <p class="clause-p no-indent">- Việc cho thuê đất không làm mất quyền của Nhà nước là đại diện chủ sở hữu đất đai và mọi tài nguyên nằm trong lòng đất.</p>

    <p class="clause-p font-bold no-indent pt-2">Điều 3. Việc sử dụng đất trên khu đất thuê phải phù hợp với mục đích sử dụng đất đã ghi tại Điều 1 của Hợp đồng này.</p>

    <p class="clause-p font-bold no-indent pt-2">Điều 4. Quyền và nghĩa vụ của các bên</p>
    <p class="clause-p no-indent">- Bên cho thuê đất bảo đảm việc sử dụng đất của Bên thuê đất trong thời gian thực hiện hợp đồng, không được chuyển giao quyền sử dụng khu đất trên cho bên thứ ba, chấp hành quyết định thu hồi đất theo quy định của pháp luật về đất đai;</p>
    <p class="clause-p no-indent">- Trong thời gian thực hiện hợp đồng, Bên thuê đất có các quyền và nghĩa vụ theo quy định của pháp luật về đất đai;</p>
    <p class="clause-p no-indent">- Trường hợp Bên thuê đất bị thay đổi do chia tách, sáp nhập, chuyển đổi doanh nghiệp, bán tài sản gắn liền với đất thuê thì tổ chức, cá nhân được hình thành hợp pháp sau khi Bên thuê đất bị thay đổi sẽ thực hiện tiếp quyền và nghĩa vụ của Bên thuê đất trong thời gian còn lại của Hợp đồng này;</p>
    <p class="clause-p no-indent">- Trong thời hạn hợp đồng còn hiệu lực thi hành, nếu Bên thuê đất trả lại toàn bộ hoặc một phần khu đất thuê trước thời hạn thì phải thông báo cho Bên cho thuê đất biết trước ít nhất là 6 tháng. Bên cho thuê đất trả lời cho Bên thuê đất trong thời gian 03 tháng, kể từ ngày nhận được đề nghị của Bên thuê đất. Thời điểm kết thúc hợp đồng tính đến ngày bàn giao mặt bằng.</p>

    <p class="clause-p font-bold no-indent pt-2">Điều 5. Hợp đồng thuê đất chấm dứt trong các trường hợp sau:</p>
    <p class="clause-p no-indent">- Hết thời hạn thuê đất mà không được gia hạn thuê tiếp;</p>
    <p class="clause-p no-indent">- Do đề nghị của một bên hoặc các bên tham gia hợp đồng và được cơ quan nhà nước có thẩm quyền cho thuê đất chấp thuận;</p>
    <p class="clause-p no-indent">- Bên thuê đất bị phá sản hoặc bị phát mại tài sản hoặc giải thể;</p>
    <p class="clause-p no-indent">- Bên thuê đất bị cơ quan nhà nước có thẩm quyền thu hồi đất theo quy định của pháp luật về đất đai.</p>

    <p class="clause-p font-bold no-indent pt-2">Điều 6. Việc giải quyết tài sản gắn liền với đất sau khi kết thúc Hợp đồng này được thực hiện theo quy định của pháp luật.</p>

    <p class="clause-p font-bold no-indent pt-2">Điều 7. Hai Bên cam kết thực hiện đúng quy định của hợp đồng này, nếu Bên nào không thực hiện thì phải bồi thường cho việc vi phạm hợp đồng gây ra theo quy định của pháp luật.</p>

    <p class="clause-p font-bold no-indent pt-2">Điều 8. Hợp đồng này được lập thành 04 bản có giá trị pháp lý như nhau, mỗi Bên giữ 01 bản và gửi đến cơ quan thuế, kho bạc nhà nước nơi thu tiền thuê đất.</p>
    <p class="clause-p no-indent">Hợp đồng này có hiệu lực kể từ ngày ký.</p>

    <table class="sig-table font-serif" style="width: 100%; margin-top: 20pt; page-break-inside: avoid;">
      <tbody>
        <tr>
          <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
            <p class="text-center font-bold uppercase no-indent">BÊN CHO THUÊ ĐẤT</p>
            <p class="text-center font-italic text-[11pt] no-indent">(Ký, ghi rõ họ tên)</p>
            <div class="sig-space" style="height: 80px;">&nbsp;</div>
            <p class="text-center font-bold uppercase no-indent">${nfc(input.partyA.name) || '&nbsp;'}</p>
          </td>
          <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
            <p class="text-center font-bold uppercase no-indent">BÊN THUÊ ĐẤT</p>
            <p class="text-center font-italic text-[11pt] no-indent">(Ký, ghi rõ họ tên)</p>
            <div class="sig-space" style="height: 80px;">&nbsp;</div>
            <p class="text-center font-bold uppercase no-indent">${nfc(input.partyB.name) || '&nbsp;'}</p>
          </td>
        </tr>
      </tbody>
    </table>
  `;
}

export interface DocumentDraft {
  mbContractDate: string;
  mbPartyAName: string;
  mbPartyACccd: string;
  mbPartyACccdDate: string;
  mbPartyAAddress: string;
  mbPartyBName: string;
  mbPartyBCccd: string;
  mbPartyBCccdDate: string;
  mbPartyBAddress: string;
  mbLocation: string;
  mbStartDate: string;
  mbEndDate: string;
  mbMonthlyPrice: string;
  mbDepositAmount: string;
  lhFloors: string;
  lhLandArea: string;
  lhHouseArea: string;
  lhHandoverDate: string;
  lhPaymentDay: string;
  constContractDate: string;
  constPartyAName: string;
  constPartyACccd: string;
  constPartyAAddress: string;
  constPartyBName: string;
  constPartyBCccd: string;
  constSiteAddress: string;
  constStartDate: string;
  constEndDate: string;
  constTotalPrice: string;
  constDepositStage1: string;
  constStage2Amount: string;
  constWarrantyMonths: string;
  constItems: ConstItem[];
  saleContractDate: string;
  saleBuyerName: string;
  saleBuyerAddress: string;
  saleSellerName: string;
  saleSellerCccd: string;
  saleSellerCccdDate: string;
  deposit: DepositContractData;
  saleSellerCccdPlace: string;
  salePayMethod: 'cash' | 'transfer';
  saleBankOwner: string;
  saleBankAccNo: string;
  saleBankName: string;
  saleBankBranch: string;
  salePaymentStage1: string;
  saleItems: SaleItem[];
  payMethodType: 'cash' | 'transfer';
  payCashName: string;
  payCashCccd: string;
  payCashCccdDate: string;
  payCashCccdPlace: string;
  payBankOwner: string;
  payBankAccNo: string;
  payBankName: string;
  payBankBranch: string;
  payStages: PaymentStageItem[];
  saleStartDate?: string;
  saleEndDate?: string;
  recipientTitle?: 'Ông' | 'Bà';
  constDurationMonths: string;
  lhTermLabel: string;
  lrPartyAPhone?: string;
  lrPartyBPhone?: string;
  lrPartyABirthYear?: string;
  lrPartyBBirthYear?: string;
  lrPartyACccdPlace?: string;
  lrPartyBCccdPlace?: string;
  lrRoomNo?: string;
  lrHouseNo?: string;
  lrLocation?: string;
  lrCoTenants?: string;
  lrMonthlyPrice?: string;
  lrPurpose?: string;
  lrTermMonths?: string;
  lwArea?: string;
  lwWarehouseAddress?: string;
  lwPaymentDay?: string;
  lwSignPlace?: string;
  loanAmount?: string;
  loanPurpose?: string;
  loanPaymentMethod?: string;
  landContractNo?: string;
  landArea?: string;
  landAddress?: string;
  landTermYears?: string;
  landRentPricePerYear?: string;
  landPaymentMethod?: string;
}

export function buildDocumentHtml(selectedTemplate: TemplateType, draft: DocumentDraft): string {
  const {
    mbContractDate,
    mbPartyAName,
    mbPartyACccd,
    mbPartyACccdDate,
    mbPartyAAddress,
    mbPartyBName,
    mbPartyBCccd,
    mbPartyBCccdDate,
    mbPartyBAddress,
    mbLocation,
    mbStartDate,
    mbEndDate,
    mbMonthlyPrice,
    mbDepositAmount,
    lhFloors,
    lhLandArea,
    lhHouseArea,
    lhHandoverDate,
    lhPaymentDay,
    constContractDate,
    constPartyAName,
    constPartyACccd,
    constPartyAAddress,
    constPartyBName,
    constPartyBCccd,
    constSiteAddress,
    constStartDate,
    constEndDate,
    constTotalPrice,
    constDepositStage1,
    constStage2Amount,
    constWarrantyMonths,
    constItems,
    saleContractDate,
    saleBuyerName,
    saleBuyerAddress,
    saleSellerName,
    saleSellerCccd,
    saleSellerCccdDate,
    deposit,
    saleSellerCccdPlace,
    salePayMethod,
    saleBankAccNo,
    saleBankName,
    saleBankBranch,
    salePaymentStage1,
    saleItems,
    saleStartDate,
    saleEndDate,
    recipientTitle,
    payMethodType,
    payCashName,
    payCashCccd,
    payCashCccdDate,
    payCashCccdPlace,
    payBankOwner,
    payBankAccNo,
    payBankName,
    payBankBranch,
    payStages,
    constDurationMonths,
    lhTermLabel,
    lrPartyAPhone,
    lrPartyBPhone,
    lrPartyABirthYear,
    lrPartyBBirthYear,
    lrPartyACccdPlace,
    lrPartyBCccdPlace,
    lrRoomNo,
    lrHouseNo,
    lrLocation,
    lrCoTenants,
    lrMonthlyPrice,
    lrPurpose,
    lrTermMonths,
  } = draft;

  const totalSaleAmount = saleItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

    if (selectedTemplate === 'lease_mb') {
      const mbContractNo = mbContractDate
        ? `${fmtDate(mbContractDate).replace(/\//g, '')}/HĐMB`
        : '23042026/HĐMB';

      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">----------o0o----------</div>
        </div>
        <div class="text-center pt-2 pb-2 no-indent">
          <h1>HỢP ĐỒNG THUÊ MẶT BẰNG KINH DOANH</h1>
          <p class="text-center font-italic text-[11pt] no-indent">Số: ${mbContractNo}</p>
        </div>
        <p class="clause-p no-indent">Hôm nay, ngày ${fmtDate(mbContractDate)}, tại địa chỉ ${nfc(mbLocation)}, chúng tôi gồm có:</p>
        <p class="clause-p font-bold uppercase no-indent">BÊN CHO THUÊ (BÊN A):</p>
        <p class="clause-p no-indent">- Họ và tên: <strong>${nfc(mbPartyAName)}</strong> &nbsp;|&nbsp; CCCD số: <strong>${mbPartyACccd}</strong> do Cục Cảnh sát QLHC về TTXH cấp ngày ${mbPartyACccdDate}.</p>
        <p class="clause-p no-indent">- Địa chỉ thường trú: ${nfc(mbPartyAAddress)}.</p>
        <p class="clause-p font-bold uppercase no-indent pt-2">BÊN THUÊ (BÊN B):</p>
        <p class="clause-p no-indent">- Họ và tên: <strong>${nfc(mbPartyBName)}</strong> &nbsp;|&nbsp; CCCD số: <strong>${mbPartyBCccd}</strong> do Cục Cảnh sát QLHC về TTXH cấp ngày ${mbPartyBCccdDate}.</p>
        <p class="clause-p no-indent">- Địa chỉ thường trú: ${nfc(mbPartyBAddress)}.</p>
        <h2>ĐIỀU 1: NỘI DUNG HỢP ĐỒNG</h2>
        <p class="clause-p no-indent">Bên A đồng ý cho Bên B thuê mặt bằng kinh doanh tại địa chỉ: <strong>${nfc(mbLocation)}</strong>.</p>
        <p class="clause-p no-indent">Thời hạn thuê là 12 tháng kể từ ngày <strong>${fmtDate(mbStartDate)}</strong> đến hết ngày <strong>${fmtDate(mbEndDate)}</strong>.</p>
        <h2>ĐIỀU 2: GIÁ THUÊ VÀ ĐẶT CỌC</h2>
        <p class="clause-p no-indent">1. Giá thuê mặt bằng là: <strong>${mbMonthlyPrice} VNĐ/tháng</strong> (Bằng chữ: ${moneyTextToWords(mbMonthlyPrice)} mỗi tháng).</p>
        <p class="clause-p no-indent">2. Tiền đặt cọc bảo đảm thực hiện hợp đồng là: <strong>${mbDepositAmount} VNĐ</strong>.</p>
        <table class="sig-table font-serif" style="width: 100%; margin-top: 20pt;">
          <tbody>
            <tr>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">BÊN CHO THUÊ (BÊN A)</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(mbPartyAName)}</p>
              </td>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">BÊN THUÊ (BÊN B)</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(mbPartyBName)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (selectedTemplate === 'deposit') {
      const d = deposit;
      const taxLabel = (side: string) => (side === 'A' ? 'bên A' : 'bên B');
      const getBirthYearDisplay = (year?: string, cccd?: string) => {
        if (year && year.trim()) return ` &nbsp;|&nbsp; Sinh năm: ${nfc(year.trim())}`;
        if (!cccd) return '';
        const digits = cccd.replace(/\D/g, '');
        if (digits.length === 12) {
          const centuryCode = parseInt(digits[3], 10);
          const yr = parseInt(digits.substring(4, 6), 10);
          if (!isNaN(centuryCode) && !isNaN(yr)) {
            let century = 1900;
            if (centuryCode === 2 || centuryCode === 3) century = 2000;
            else if (centuryCode === 4 || centuryCode === 5) century = 2100;
            return ` &nbsp;|&nbsp; Sinh năm: ${century + yr}`;
          }
        }
        return '';
      };
      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">----------o0o----------</div>
        </div>
        <div class="text-center pt-2 pb-2 no-indent">
          <h1>HỢP ĐỒNG ĐẶT CỌC</h1>
          <p class="text-center font-italic text-[11pt] no-indent">(V/v chuyển nhượng QSDĐ và tài sản gắn liền với đất)</p>
        </div>
        <p class="clause-p no-indent">Chúng tôi gồm có:</p>

        <p class="clause-p font-bold uppercase no-indent">I. BÊN MUA: (Gọi tắt là bên A)</p>
        <p class="clause-p no-indent">- ${nfc(d.buyerTitle)}: <strong>${nfc(d.buyerName)}</strong>${getBirthYearDisplay(d.buyerBirthYear, d.buyerCccd)}</p>
        <p class="clause-p no-indent">- CCCD số: <strong>${nfc(d.buyerCccd)}</strong> &nbsp;|&nbsp; Cấp ngày: ${nfc(d.buyerCccdDate)} &nbsp;|&nbsp; Cấp tại: ${nfc(d.buyerCccdPlace)}</p>
        <p class="clause-p no-indent">- HKTT: ${nfc(d.buyerAddress)}</p>

        <p class="clause-p font-bold uppercase no-indent pt-2">II. BÊN BÁN: (Gọi tắt là bên B)</p>
        <p class="clause-p no-indent">- ${nfc(d.sellerTitle)}: <strong>${nfc(d.sellerName)}</strong>${getBirthYearDisplay(d.sellerBirthYear, d.sellerCccd)}</p>
        <p class="clause-p no-indent">- CCCD số: <strong>${nfc(d.sellerCccd)}</strong> &nbsp;|&nbsp; Cấp ngày: ${nfc(d.sellerCccdDate)} &nbsp;|&nbsp; Cấp tại: ${nfc(d.sellerCccdPlace)}</p>
        <p class="clause-p no-indent">- HKTT: ${nfc(d.sellerAddress)}</p>

        <p class="clause-p no-indent pt-2">Hai bên đồng ý và thống nhất thỏa thuận như sau:</p>

        <h2>III. ĐỐI TƯỢNG CỦA HỢP ĐỒNG</h2>
        <p class="clause-p no-indent">Bên B đồng ý bán cho bên A phần đất và tài sản trên đất:</p>
        <p class="clause-p no-indent">- Thửa đất số: <strong>${nfc(d.parcelNo)}</strong> &nbsp;|&nbsp; Tờ bản đồ số: <strong>${nfc(d.mapSheetNo)}</strong></p>
        <p class="clause-p no-indent">- Diện tích: <strong>${nfc(d.area)} m²</strong> (Bằng chữ: ${nfc(d.areaInWords)}).</p>
        <p class="clause-p no-indent">- Địa chỉ thửa đất: ${nfc(d.parcelAddress)}</p>
        <p class="clause-p no-indent">- Loại đất: Đất ở tại đô thị: <strong>${nfc(d.urbanResidentialArea)} m²</strong> &nbsp;|&nbsp; Đất trồng cây lâu năm: <strong>${nfc(d.perennialCropArea)} m²</strong></p>
        <p class="clause-p no-indent">- Giấy CNQSDĐ số <strong>${nfc(d.certificateNo)}</strong>, vào sổ cấp GCN số: <strong>${nfc(d.certificateBookNo)}</strong> do ${nfc(d.certificateIssuer)} cấp ngày ${nfc(d.certificateDate)}.</p>

        <h2>IV. GIÁ CẢ VÀ PHƯƠNG THỨC THANH TOÁN</h2>
        <p class="clause-p no-indent">- Giá chuyển nhượng: <strong>${nfc(d.transferPrice)}đ</strong> (Bằng chữ: ${moneyTextToWords(d.transferPrice)})</p>
        <p class="clause-p no-indent">- Hình thức thanh toán:</p>
        <p class="clause-p no-indent">- Lần 1: Bên A đặt cọc cho bên B số tiền <strong>${nfc(d.deposit1)} đồng</strong> (Bằng chữ: ${moneyTextToWords(d.deposit1)}) ngay khi ký hợp đồng này.</p>
        <p class="clause-p no-indent">- Lần 2: Bên A sẽ tiếp tục thanh toán cho bên B số tiền <strong>${nfc(d.payment2)} đồng</strong> (Bằng chữ: ${moneyTextToWords(d.payment2)})</p>
        <p class="clause-p no-indent">- Các khoản phí, lệ phí: thuế thu nhập cá nhân ${taxLabel(d.incomeTaxBy)} chịu, ${taxLabel(d.registrationTaxBy)} chịu thuế trước bạ sang tên.</p>

        <h2>V. THỎA THUẬN CHUNG</h2>
        <p class="clause-p no-indent">Bên B cam kết phần đất chuyển nhượng có nguồn gốc hợp pháp, hiện tại không tranh chấp, không thế chấp, không cho tặng, không góp vốn, không có đồng sở hữu nào khác, chưa sang nhượng cho bất kỳ ai và không bị kê biên để thi hành án.</p>
        <p class="clause-p no-indent">Nếu xảy ra sai phạm các vấn đề trên làm ảnh hưởng tới việc chuyển nhượng QSDĐ thì bên B chịu hoàn toàn trách nhiệm trước pháp luật.</p>
        <p class="clause-p no-indent">- Nếu bên B đổi ý không bán đất cho bên A nữa với bất kỳ lý do gì, hoặc thực hiện sai hẹn theo thời gian thỏa thuận thì bên B phải trả lại tiền cọc cho bên A và bồi thường cho bên A số tiền gấp 2 lần số tiền mà bên B đã nhận cọc.</p>
        <p class="clause-p no-indent">- Nếu bên A đổi ý không mua đất của bên B nữa với bất kỳ lý do gì, hoặc thực hiện sai hẹn theo thời gian thỏa thuận thì bên A sẽ mất toàn bộ số tiền đã đặt cọc cho bên B.</p>
        <p class="clause-p no-indent">- Trong thời gian thực hiện hợp đồng mà có những tranh chấp về ranh đất, diện tích đất không đúng theo sổ đất, dính quy hoạch thì bên B phải trả lại cho bên A số tiền đã nhận cọc.</p>
        <p class="clause-p no-indent">- Trong thời gian thực hiện hợp đồng bên A được quyền bán lại cho bên thứ 3, bên B có trách nhiệm thay mặt bên A ký bán cho bên thứ 3, số tiền chênh lệch bên A được hưởng.</p>

        <h2>VI. PHƯƠNG THỨC GIẢI QUYẾT TRANH CHẤP</h2>
        <p class="clause-p no-indent">- Trong quá trình thực hiện hợp đồng mà phát sinh tranh chấp, các bên cùng nhau thương lượng giải quyết trên nguyên tắc tôn trọng quyền lợi của nhau. Trong trường hợp không giải quyết được thì một trong hai bên có quyền khởi kiện để yêu cầu Tòa án có thẩm quyền giải quyết theo quy định của pháp luật. Mọi tranh chấp sẽ được phán xử theo quy định của luật pháp của Việt Nam.</p>

        <h2>VII. ĐIỀU KHOẢN CUỐI CÙNG</h2>
        <p class="clause-p no-indent">- Hai bên công nhận đã hiểu rõ quyền, nghĩa vụ và lợi ích hợp pháp của mình, ý nghĩa và hậu quả pháp lý của việc giao kết Hợp đồng này.</p>
        <p class="clause-p no-indent">- Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng.</p>
        <p class="clause-p no-indent">- Hai bên đã tự đọc hợp đồng, đã hiểu và đồng ý tất cả các điều khoản ghi trong hợp đồng và ký vào hợp đồng này trước sự có mặt của người làm chứng.</p>
        <p class="clause-p no-indent">Hợp đồng đặt cọc này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.</p>

        <p class="text-right font-italic pt-3 no-indent">${nfc(d.signPlace)}, ngày ${fmtDate(d.signDate)}</p>

        <table class="sig-table font-serif" style="width: 100%; table-layout: fixed; margin-top: 20pt;">
          <tbody>
            <tr>
              <td class="text-center" style="width: 33%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">BÊN A</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký, ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent" style="white-space: nowrap;">${nfc(d.buyerName)}</p>
              </td>
              <td class="text-center" style="width: 34%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">NGƯỜI LÀM CHỨNG</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký, ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">&nbsp;</p>
              </td>
              <td class="text-center" style="width: 33%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">BÊN B</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký, ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent" style="white-space: nowrap;">${nfc(d.sellerName)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (selectedTemplate === 'lease_house') {
      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">----------o0o----------</div>
        </div>
        <div class="text-center pt-2 pb-2 no-indent">
          <h1>HỢP ĐỒNG THUÊ NHÀ</h1>
        </div>
        <p class="clause-p no-indent">- Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;</p>
        <p class="clause-p no-indent">- Căn cứ Luật Thương mại số 36/2005/QH11 ngày 14 tháng 06 năm 2005;</p>
        <p class="clause-p no-indent">- Căn cứ vào nhu cầu và sự thỏa thuận của các bên tham gia Hợp đồng;</p>
        <p class="clause-p no-indent">Hôm nay, ngày ${fmtDate(mbContractDate)}, các Bên gồm:</p>

        <p class="clause-p font-bold uppercase no-indent">BÊN CHO THUÊ (BÊN A):</p>
        <p class="clause-p no-indent">- Ông/bà: <strong>${nfc(mbPartyAName)}</strong></p>
        <p class="clause-p no-indent">- CCCD số: <strong>${mbPartyACccd}</strong> &nbsp;|&nbsp; Ngày cấp: ${mbPartyACccdDate} &nbsp;|&nbsp; Nơi cấp: Cục Cảnh sát QLHC về TTXH.</p>
        <p class="clause-p no-indent">- Nơi ĐKTT: ${nfc(mbPartyAAddress)}.</p>
        <p class="clause-p font-bold uppercase no-indent pt-2">BÊN THUÊ (BÊN B):</p>
        <p class="clause-p no-indent">- Ông/bà: <strong>${nfc(mbPartyBName)}</strong></p>
        <p class="clause-p no-indent">- CCCD số: <strong>${mbPartyBCccd}</strong> &nbsp;|&nbsp; Ngày cấp: ${mbPartyBCccdDate} &nbsp;|&nbsp; Nơi cấp: Cục Cảnh sát QLHC về TTXH.</p>
        <p class="clause-p no-indent">- Nơi ĐKTT: ${nfc(mbPartyBAddress)}.</p>
        <p class="clause-p no-indent">Bên A và Bên B sau đây gọi chung là “Hai Bên” hoặc “Các Bên”.</p>
        <p class="clause-p no-indent">Sau khi thảo luận, Hai Bên thống nhất đi đến ký kết Hợp đồng thuê nhà (“Hợp Đồng”) với các điều khoản và điều kiện dưới đây:</p>

        <h2>Điều 1: Nhà ở và các tài sản cho thuê kèm theo nhà ở</h2>
        <p class="clause-p no-indent">1.1. Bên A đồng ý cho Bên B thuê và Bên B cũng đồng ý thuê quyền sử dụng đất và một căn nhà <strong>${nfc(lhFloors)}</strong> tầng gắn liền với quyền sử dụng đất tại địa chỉ: <strong>${nfc(mbLocation)}</strong> để sử dụng làm nơi để ở.</p>
        <p class="clause-p no-indent">- Diện tích quyền sử dụng đất: <strong>${nfc(lhLandArea)} m²</strong>;</p>
        <p class="clause-p no-indent">- Diện tích căn nhà: <strong>${nfc(lhHouseArea)} m²</strong>;</p>
        <p class="clause-p no-indent">1.2. Bên A cam kết quyền sử dụng đất và căn nhà gắn liền trên đất trên là tài sản sở hữu hợp pháp của Bên A. Mọi tranh chấp phát sinh từ tài sản cho thuê trên Bên A hoàn toàn chịu trách nhiệm trước pháp luật.</p>

        <h2>Điều 2: Bàn giao và sử dụng diện tích thuê</h2>
        <p class="clause-p no-indent">2.1. Thời điểm Bên A bàn giao tài sản thuê vào ngày <strong>${fmtDate(lhHandoverDate)}</strong>;</p>
        <p class="clause-p no-indent">2.2. Bên B được toàn quyền sử dụng tài sản thuê kể từ thời điểm được Bên A bàn giao từ thời điểm quy định tại Mục 2.1 trên đây.</p>

        <h2>Điều 3: Thời hạn thuê</h2>
        <p class="clause-p no-indent">3.1. Bên A cam kết cho Bên B thuê tài sản thuê với thời hạn là <strong>${lhTermLabel}</strong> kể từ ngày bàn giao Tài sản thuê;</p>
        <p class="clause-p no-indent">3.2. Hết thời hạn thuê nêu trên nếu Bên B có nhu cầu tiếp tục sử dụng thì Bên A phải ưu tiên cho Bên B tiếp tục thuê.</p>

        <h2>Điều 4: Đặt cọc tiền thuê nhà</h2>
        <p class="clause-p no-indent">4.1. Bên B sẽ giao cho Bên A một khoản tiền là <strong>${mbDepositAmount} VNĐ</strong> ngay sau khi ký hợp đồng này. Số tiền này là tiền đặt cọc để đảm bảo thực hiện Hợp đồng cho thuê nhà.</p>
        <p class="clause-p no-indent">4.2. Nếu Bên B đơn phương chấm dứt hợp đồng mà không thực hiện nghĩa vụ báo trước tới Bên A thì Bên A sẽ không phải hoàn trả lại Bên B số tiền đặt cọc này.</p>
        <p class="clause-p no-indent">Nếu Bên A đơn phương chấm dứt hợp đồng mà không thực hiện nghĩa vụ báo trước tới Bên B thì Bên A sẽ phải hoàn trả lại Bên B số tiền đặt cọc và phải bồi thường thêm một khoản bằng chính tiền đặt cọc.</p>
        <p class="clause-p no-indent">4.3. Tiền đặt cọc của Bên B sẽ không được dùng để thanh toán tiền thuê. Nếu Bên B vi phạm Hợp Đồng làm phát sinh thiệt hại cho Bên A thì Bên A có quyền khấu trừ tiền đặt cọc để bù đắp các chi phí khắc phục thiệt hại phát sinh. Mức chi phí bù đắp thiệt hại sẽ được Các Bên thống nhất bằng văn bản.</p>
        <p class="clause-p no-indent">4.4. Vào thời điểm kết thúc thời hạn thuê hoặc kể từ ngày chấm dứt Hợp đồng, Bên A sẽ hoàn lại cho Bên B số tiền đặt cọc sau khi đã khấu trừ khoản tiền chi phí để khắc phục thiệt hại (nếu có).</p>

        <h2>Điều 5: Tiền thuê nhà</h2>
        <p class="clause-p no-indent">5.1. Tiền thuê nhà đối với diện tích thuê nêu tại Mục 1.1 Điều 1 là: <strong>${mbMonthlyPrice} VNĐ/tháng</strong>.</p>
        <p class="clause-p no-indent">5.2. Tiền thuê nhà không bao gồm chi phí khác như tiền điện, nước, vệ sinh... Khoản tiền này sẽ do Bên B trả theo khối lượng, công suất sử dụng thực tế của Bên B hàng tháng, được tính theo đơn giá của nhà nước.</p>

        <h2>Điều 6: Phương thức thanh toán tiền thuê nhà</h2>
        <p class="clause-p no-indent">Tiền thuê nhà được thanh toán theo 01 (một) tháng/lần vào ngày <strong>${nfc(lhPaymentDay)}</strong> hàng tháng.</p>
        <p class="clause-p no-indent">Các chi phí khác được Bên B tự thanh toán với các cơ quan, đơn vị có liên quan khi được yêu cầu.</p>
        <p class="clause-p no-indent">Việc thanh toán tiền thuê nhà được thực hiện bằng đồng tiền Việt Nam theo hình thức trả trực tiếp bằng tiền mặt.</p>

        <h2>Điều 7: Quyền và nghĩa vụ của bên cho thuê nhà</h2>
        <p class="clause-p no-indent"><strong>7.1. Quyền lợi</strong></p>
        <p class="clause-p no-indent">- Yêu cầu Bên B thanh toán tiền thuê và chi phí khác đầy đủ, đúng hạn theo thoả thuận trong Hợp Đồng;</p>
        <p class="clause-p no-indent">- Yêu cầu Bên B phải sửa chữa phần hư hỏng, thiệt hại do lỗi của Bên B gây ra.</p>
        <p class="clause-p no-indent"><strong>7.2. Nghĩa vụ</strong></p>
        <p class="clause-p no-indent">- Bàn giao diện tích thuê cho Bên B theo đúng thời gian quy định trong Hợp đồng;</p>
        <p class="clause-p no-indent">- Đảm bảo việc cho thuê theo Hợp đồng này là đúng quy định của pháp luật;</p>
        <p class="clause-p no-indent">- Đảm bảo cho Bên B thực hiện quyền sử dụng diện tích thuê một cách độc lập và liên tục trong suốt thời hạn thuê, trừ trường hợp vi phạm pháp luật và/hoặc các quy định của Hợp đồng này;</p>
        <p class="clause-p no-indent">- Không xâm phạm trái phép đến tài sản của Bên B trong phần diện tích thuê. Nếu Bên A có những hành vi vi phạm gây thiệt hại cho Bên B trong thời gian thuê thì Bên A phải bồi thường;</p>
        <p class="clause-p no-indent">- Tuân thủ các nghĩa vụ khác theo thoả thuận tại Hợp đồng này hoặc/và các văn bản kèm theo Hợp đồng này; hoặc/và theo quy định của pháp luật Việt Nam.</p>

        <h2>Điều 8: Quyền và nghĩa vụ của bên thuê nhà</h2>
        <p class="clause-p no-indent"><strong>8.1. Quyền lợi</strong></p>
        <p class="clause-p no-indent">- Nhận bàn giao diện tích thuê theo đúng thoả thuận trong Hợp đồng;</p>
        <p class="clause-p no-indent">- Được sử dụng phần diện tích thuê làm nơi ở và các hoạt động hợp pháp khác;</p>
        <p class="clause-p no-indent">- Yêu cầu Bên A sửa chữa kịp thời những hư hỏng không phải do lỗi của Bên B trong phần diện tích thuê để bảo đảm an toàn;</p>
        <p class="clause-p no-indent">- Được tháo dỡ và đem ra khỏi phần diện tích thuê các tài sản, trang thiết bị của Bên B đã lắp đặt trong phần diện tích thuê khi hết thời hạn thuê hoặc đơn phương chấm dứt hợp đồng.</p>
        <p class="clause-p no-indent"><strong>8.2. Nghĩa vụ</strong></p>
        <p class="clause-p no-indent">- Sử dụng diện tích thuê đúng mục đích đã thỏa thuận, giữ gìn nhà ở và có trách nhiệm trong việc sửa chữa những hư hỏng do mình gây ra;</p>
        <p class="clause-p no-indent">- Thanh toán tiền đặt cọc, tiền thuê đầy đủ, đúng thời hạn đã thỏa thuận;</p>
        <p class="clause-p no-indent">- Trả lại diện tích thuê cho Bên A khi hết thời hạn thuê hoặc chấm dứt Hợp đồng thuê;</p>
        <p class="clause-p no-indent">- Mọi việc sửa chữa, cải tạo, lắp đặt bổ sung các trang thiết bị làm ảnh hưởng đến kết cấu của căn phòng, Bên B phải có văn bản thông báo cho Bên A và chỉ được tiến hành các công việc này sau khi có sự đồng ý bằng văn bản của Bên A;</p>
        <p class="clause-p no-indent">- Tuân thủ một cách chặt chẽ quy định tại Hợp đồng này và các quy định của pháp luật Việt Nam.</p>

        <h2>Điều 9: Đơn phương chấm dứt hợp đồng thuê nhà</h2>
        <p class="clause-p no-indent">Trong trường hợp một trong Hai Bên muốn đơn phương chấm dứt Hợp đồng trước hạn thì phải thông báo bằng văn bản cho bên kia trước 30 (ba mươi) ngày so với ngày mong muốn chấm dứt.</p>
        <p class="clause-p no-indent">Nếu một trong Hai Bên không thực hiện nghĩa vụ thông báo cho Bên kia thì sẽ phải bồi thường cho bên đó một khoản tiền thuê tương đương với thời gian không thông báo và các thiệt hại khác phát sinh do việc chấm dứt Hợp đồng trái quy định.</p>

        <h2>Điều 10: Điều khoản thi hành</h2>
        <p class="clause-p no-indent">- Hợp đồng này có hiệu lực kể từ ngày hai bên cùng ký kết;</p>
        <p class="clause-p no-indent">- Các Bên cam kết thực hiện nghiêm chỉnh và đầy đủ các thoả thuận trong Hợp đồng này trên tinh thần hợp tác, thiện chí;</p>
        <p class="clause-p no-indent">- Mọi sửa đổi, bổ sung đối với bất kỳ điều khoản nào của Hợp đồng phải được lập thành văn bản, có đầy đủ chữ ký của mỗi Bên. Văn bản sửa đổi bổ sung Hợp đồng có giá trị pháp lý như Hợp đồng, là một phần không tách rời của Hợp đồng này;</p>
        <p class="clause-p no-indent">- Hợp đồng được lập thành 02 (hai) bản có giá trị như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.</p>

        <table class="sig-table font-serif" style="width: 100%; margin-top: 20pt;">
          <tbody>
            <tr>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">BÊN CHO THUÊ</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(mbPartyAName)}</p>
              </td>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">BÊN THUÊ</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(mbPartyBName)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (selectedTemplate === 'lease_room') {
      return buildLeaseRoomHtml({
        partyA: {
          name: mbPartyAName,
          birthYear: lrPartyABirthYear,
          cccd: mbPartyACccd,
          cccdDate: mbPartyACccdDate,
          cccdPlace: lrPartyACccdPlace,
          address: mbPartyAAddress,
        },
        partyB: {
          name: mbPartyBName,
          birthYear: lrPartyBBirthYear,
          cccd: mbPartyBCccd,
          cccdDate: mbPartyBCccdDate,
          cccdPlace: lrPartyBCccdPlace,
          address: mbPartyBAddress,
        },
        contractDate: mbContractDate,
        partyAPhone: lrPartyAPhone,
        partyBPhone: lrPartyBPhone,
        roomNo: lrRoomNo,
        houseNo: lrHouseNo || mbLocation,
        location: lrLocation || mbLocation,
        coTenants: lrCoTenants,
        monthlyPrice: lrMonthlyPrice || mbMonthlyPrice,
        purpose: lrPurpose || 'Ở',
        termMonths: lrTermMonths,
      });
    }

    if (selectedTemplate === 'lease_warehouse') {
      return buildLeaseWarehouseHtml({
        partyA: {
          name: mbPartyAName,
          birthYear: lrPartyABirthYear,
          cccd: mbPartyACccd,
          cccdDate: mbPartyACccdDate,
          cccdPlace: lrPartyACccdPlace,
          address: mbPartyAAddress,
        },
        partyB: {
          name: mbPartyBName,
          birthYear: lrPartyBBirthYear,
          cccd: mbPartyBCccd,
          cccdDate: mbPartyBCccdDate,
          cccdPlace: lrPartyBCccdPlace,
          address: mbPartyBAddress,
        },
        area: draft.lwArea,
        warehouseAddress: draft.lwWarehouseAddress || mbLocation,
        startDate: mbStartDate,
        endDate: mbEndDate,
        monthlyPrice: mbMonthlyPrice,
        paymentDay: draft.lwPaymentDay,
        signPlace: draft.lwSignPlace,
        signDate: mbContractDate,
      });
    }

    if (selectedTemplate === 'loan_contract') {
      return buildLoanContractHtml({
        partyA: {
          name: mbPartyAName,
          birthYear: lrPartyABirthYear,
          cccd: mbPartyACccd,
          cccdDate: mbPartyACccdDate,
          cccdPlace: lrPartyACccdPlace,
          address: mbPartyAAddress,
        },
        partyB: {
          name: mbPartyBName,
          birthYear: lrPartyBBirthYear,
          cccd: mbPartyBCccd,
          cccdDate: mbPartyBCccdDate,
          cccdPlace: lrPartyBCccdPlace,
          address: mbPartyBAddress,
        },
        contractDate: mbContractDate,
        location: mbLocation,
        loanAmount: draft.loanAmount || draft.constTotalPrice,
        loanPurpose: draft.loanPurpose,
        startDate: mbStartDate,
        endDate: mbEndDate,
        paymentMethod: draft.loanPaymentMethod,
      });
    }

    if (selectedTemplate === 'lease_land') {
      return buildLeaseLandHtml({
        partyA: {
          name: mbPartyAName,
          birthYear: lrPartyABirthYear,
          cccd: mbPartyACccd,
          cccdDate: mbPartyACccdDate,
          cccdPlace: lrPartyACccdPlace,
          address: mbPartyAAddress,
        },
        partyB: {
          name: mbPartyBName,
          birthYear: lrPartyBBirthYear,
          cccd: mbPartyBCccd,
          cccdDate: mbPartyBCccdDate,
          cccdPlace: lrPartyBCccdPlace,
          address: mbPartyBAddress,
        },
        contractNo: draft.landContractNo,
        contractDate: mbContractDate,
        location: mbLocation,
        landArea: draft.landArea,
        landAddress: draft.landAddress || mbLocation,
        termYears: draft.landTermYears,
        startDate: mbStartDate,
        endDate: mbEndDate,
        purpose: draft.lrPurpose,
        rentPricePerYear: draft.landRentPricePerYear || mbMonthlyPrice,
        paymentMethod: draft.landPaymentMethod,
      });
    }

    if (selectedTemplate === 'construction') {
      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">----------o0o----------</div>
        </div>
        <div class="text-center pt-3 pb-1 no-indent">
          <h1>HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG</h1>
        </div>
        <p class="clause-p no-indent">Căn cứ vào nhu cầu và khả năng hợp tác của hai bên. Hôm nay, ngày ${fmtDate(constContractDate)}, chúng tôi gồm có:</p>

        <p class="clause-p font-bold uppercase no-indent">BÊN THUÊ THI CÔNG XÂY DỰNG (BÊN A):</p>
        <p class="clause-p no-indent">- Họ và tên: <strong>${nfc(constPartyAName)}</strong></p>
        <p class="clause-p no-indent">- CCCD số: <strong>${nfc(constPartyACccd)}</strong> &nbsp;|&nbsp; Địa chỉ: ${nfc(constPartyAAddress)}</p>

        <p class="clause-p font-bold uppercase no-indent pt-2">BÊN NHẬN THI CÔNG XÂY DỰNG (BÊN B):</p>
        <p class="clause-p no-indent">- Họ và tên: <strong>${nfc(constPartyBName)}</strong></p>
        <p class="clause-p no-indent">- CCCD số: <strong>${nfc(constPartyBCccd)}</strong></p>

        <p class="clause-p no-indent pt-2">Hai bên thỏa thuận ký hợp đồng với các điều khoản như sau:</p>
        <h2>Điều 1: Nội dung và phạm vi công việc</h2>
        <p class="clause-p no-indent"><strong>1. Địa điểm thi công:</strong></p>
        <p class="clause-p no-indent">Bên B nhận thi công/sửa chữa nhà ở dân dụng tại địa chỉ: <strong>${nfc(constSiteAddress)}</strong>.</p>
        <p class="clause-p no-indent"><strong>2. Phạm vi công việc mà Bên B đảm nhận:</strong></p>
        <p class="clause-p no-indent">Bên B nhận thực hiện toàn bộ phần nhân công (hoặc cả nhân công + vật liệu, tùy thỏa thuận) cho các hạng mục sau:</p>
        <p class="clause-p no-indent">- Sửa chữa/tân trang phần tường: trát, bả, sơn lại toàn bộ các mảng tường bị hư hỏng.</p>
        <p class="clause-p no-indent">- Thay thế hoặc lát lại gạch nền, sàn theo mẫu Bên A đã lựa chọn.</p>
        <p class="clause-p no-indent">- Thi công hệ thống điện nước: đi lại đường dây điện, thay ổ cắm, công tắc, thay đường ống cấp – thoát nước hỏng.</p>
        <p class="clause-p no-indent">- Sửa chữa, thay mới cửa, mái tôn, lan can, cầu thang (nếu có).</p>
        <p class="clause-p no-indent">- Các hạng mục khác theo phụ lục kèm theo hợp đồng (nếu có).</p>
        <p class="clause-p no-indent"><strong>3. Chất lượng &amp; tiêu chuẩn kỹ thuật:</strong></p>
        <p class="clause-p no-indent">- Công việc thi công/sửa chữa phải đảm bảo đúng quy trình xây dựng dân dụng, an toàn lao động và tiêu chuẩn chất lượng theo thỏa thuận.</p>
        <p class="clause-p no-indent">- Vật liệu (nếu Bên B cung cấp) phải đúng chủng loại, nhãn hiệu và chất lượng theo cam kết với Bên A.</p>

        <h2>Điều 2: Thời gian và tiến độ thực hiện</h2>
        <p class="clause-p no-indent">- Ngày khởi công: <strong>${fmtDate(constStartDate)}</strong>.</p>
        <p class="clause-p no-indent">- Ngày hoàn thành dự kiến: <strong>${fmtDate(constEndDate)}</strong>.</p>
        <p class="clause-p no-indent">- Tổng thời gian thực hiện dự kiến: <strong>${constDurationMonths}</strong> (không tính Thứ 7, Chủ nhật).</p>
        <p class="clause-p no-indent">Trường hợp bất khả kháng (thiên tai, dịch bệnh, thay đổi thiết kế theo yêu cầu Bên A), hai bên sẽ điều chỉnh tiến độ bằng văn bản.</p>

        <h2>Điều 3: Giá trị hợp đồng và phương thức thanh toán</h2>
        <p class="clause-p no-indent">- Tổng giá trị hợp đồng: <strong>${constTotalPrice} VNĐ</strong>.</p>
        <p class="clause-p no-indent">- Phương thức thanh toán:</p>
        <p class="clause-p no-indent">- Đợt 1: Bên A thanh toán cho Bên B số tiền là: <strong>${constDepositStage1} VNĐ</strong>.</p>
        <p class="clause-p no-indent">- Đợt 2: Số tiền còn lại là <strong>${constStage2Amount} VNĐ</strong> sẽ được Bên A thanh toán toàn bộ trước khi bàn giao hoàn thiện công trình.</p>

        <h2>Điều 4: Quyền và nghĩa vụ của các bên</h2>
        <p class="clause-p no-indent"><strong>1. Quyền và nghĩa vụ của Bên A:</strong></p>
        <p class="clause-p no-indent"><em>a. Quyền lợi:</em></p>
        <p class="clause-p no-indent">- Yêu cầu Bên B thi công đúng tiến độ, đúng chất lượng, đúng thiết kế/hạng mục đã thỏa thuận.</p>
        <p class="clause-p no-indent">- Giám sát, kiểm tra quá trình thi công; có quyền tạm ngừng hoặc từ chối nghiệm thu nếu công trình không đạt yêu cầu.</p>
        <p class="clause-p no-indent">- Yêu cầu thay đổi vật liệu, biện pháp thi công nếu phát hiện không phù hợp (khi đó hai bên phải lập biên bản điều chỉnh).</p>
        <p class="clause-p no-indent"><em>b. Nghĩa vụ:</em></p>
        <p class="clause-p no-indent">- Bàn giao mặt bằng thi công sạch sẽ, an toàn, đúng thời gian.</p>
        <p class="clause-p no-indent">- Thanh toán đúng hạn, đủ số tiền theo tiến độ hợp đồng.</p>
        <p class="clause-p no-indent">- Cung cấp điện, nước sinh hoạt/tạm thời phục vụ thi công (nếu có thỏa thuận).</p>
        <p class="clause-p no-indent">- Phối hợp giải quyết các vấn đề phát sinh liên quan đến hàng xóm, chính quyền địa phương trong quá trình thi công.</p>
        <p class="clause-p no-indent"><strong>2. Quyền và nghĩa vụ của Bên B:</strong></p>
        <p class="clause-p no-indent"><em>a. Quyền lợi:</em></p>
        <p class="clause-p no-indent">- Nhận đủ và đúng hạn số tiền theo hợp đồng.</p>
        <p class="clause-p no-indent">- Được quyền tạm ngừng thi công nếu Bên A không thực hiện nghĩa vụ thanh toán theo thỏa thuận (sau khi đã có văn bản thông báo).</p>
        <p class="clause-p no-indent"><em>b. Nghĩa vụ:</em></p>
        <p class="clause-p no-indent">- Thi công đúng thiết kế, đúng quy chuẩn xây dựng, đảm bảo chất lượng và an toàn lao động.</p>
        <p class="clause-p no-indent">- Chịu trách nhiệm về nhân công, phương tiện, máy móc, thiết bị phục vụ thi công.</p>
        <p class="clause-p no-indent">- Không tự ý thay đổi vật liệu, chủng loại, thiết kế nếu chưa có sự đồng ý bằng văn bản của Bên A.</p>
        <p class="clause-p no-indent">- Giữ gìn vệ sinh, an toàn khu vực thi công; hạn chế tiếng ồn, bụi bẩn gây ảnh hưởng đến môi trường và hàng xóm.</p>
        <p class="clause-p no-indent">- Sửa chữa, khắc phục các hư hỏng, sai sót trong quá trình thi công do lỗi của Bên B.</p>
        <p class="clause-p no-indent">- Thực hiện bảo hành công trình trong thời gian đã cam kết tại Điều 5.</p>

        <h2>Điều 5: Nghiệm thu, bàn giao và bảo hành</h2>
        <p class="clause-p no-indent">- Hai bên tiến hành nghiệm thu theo từng giai đoạn và nghiệm thu tổng thể khi công trình hoàn thành.</p>
        <p class="clause-p no-indent">- Thời gian bảo hành: <strong>${nfc(constWarrantyMonths)} tháng</strong> kể từ ngày bàn giao. Bảo hành chỉ áp dụng với lỗi kỹ thuật trong quá trình thi công, không áp dụng cho hao mòn tự nhiên hoặc tác động bên ngoài (ngập nước, hỏa hoạn, thiên tai, tự ý thay đổi kết cấu công trình...).</p>
        <p class="clause-p no-indent">- Trong thời gian bảo hành, Bên B có trách nhiệm sửa chữa, khắc phục miễn phí các lỗi do thi công.</p>

        <h2>Điều 6: Điều khoản chung</h2>
        <p class="clause-p no-indent">- Hợp đồng có hiệu lực từ ngày ký.</p>
        <p class="clause-p no-indent">- Mọi sửa đổi, bổ sung phải được lập thành văn bản và có chữ ký của hai bên.</p>
        <p class="clause-p no-indent">- Trường hợp phát sinh tranh chấp, hai bên cùng thương lượng; nếu không giải quyết được sẽ đưa ra Tòa án có thẩm quyền.</p>
        <p class="clause-p no-indent">- Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>
        <table class="sig-table font-serif" style="width: 100%; margin-top: 20pt;">
          <tbody>
            <tr>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">BÊN THUÊ THI CÔNG (BÊN A)</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(constPartyAName)}</p>
              </td>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">BÊN NHẬN THI CÔNG (BÊN B)</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(constPartyBName)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (selectedTemplate === 'const_estimate') {
      const constRowsHtml = constItems.map((item, idx) => `
        <tr>
          <td class="text-center font-bold">${idx + 1}</td>
          <td>${nfc(item.name)}</td>
          <td class="text-center">${item.unit}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">${item.price.toLocaleString('vi-VN')}</td>
          <td class="text-right font-bold">${(item.quantity * item.price).toLocaleString('vi-VN')}</td>
          <td>${nfc(item.note)}</td>
        </tr>
      `).join('');

      const totalConstCalculated = constItems.reduce((sum, i) => sum + (i.quantity * i.price), 0);

      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">----------o0o----------</div>
        </div>

        <div class="text-center pt-3 pb-2 no-indent">
          <h1>BẢNG DỰ TOÁN HẠNG MỤC CÔNG VIỆC THI CÔNG</h1>
          <p class="text-center font-italic text-[11pt] no-indent">(Đính kèm Hợp đồng thi công nhà ở ngày ${fmtDate(constContractDate)})</p>
        </div>

        <p class="clause-p font-bold uppercase no-indent">Chủ Đầu Tư (Bên A): <strong>${nfc(constPartyAName)}</strong></p>
        <p class="clause-p font-bold uppercase no-indent">Nhà Thầu Thi Công (Bên B): <strong>${nfc(constPartyBName)}</strong></p>
        <p class="clause-p no-indent">Công trình / Địa điểm: ${nfc(constSiteAddress)}</p>

        <table class="table-doc">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 30%;">Hạng mục công việc</th>
              <th style="width: 8%;">Đơn vị</th>
              <th style="width: 10%;">Khối lượng</th>
              <th style="width: 15%;">Đơn giá (VNĐ)</th>
              <th style="width: 16%;">Thành tiền (VNĐ)</th>
              <th style="width: 16%;">Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            ${constRowsHtml}
            <tr>
              <td colSpan="5" class="text-right font-bold">Tổng cộng (tạm tính):</td>
              <td class="text-right font-bold text-[12pt]">${totalConstCalculated.toLocaleString('vi-VN')}</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan="5" class="text-right font-bold">Số tiền vay:</td>
              <td class="text-right font-bold">800.000.000</td>
              <td class="text-right font-bold">96,74%</td>
            </tr>
            <tr>
              <td colSpan="5" class="text-right font-bold">Còn lại:</td>
              <td class="text-right font-bold">203.700.000</td>
              <td class="text-right font-bold">3,26%</td>
            </tr>
          </tbody>
        </table>

        <table class="sig-table font-serif" style="width: 100%; margin-top: 20pt;">
          <tbody>
            <tr>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN A</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(constPartyAName)}</p>
              </td>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN B</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(constPartyBName)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (selectedTemplate === 'sale_contract') {
      const itemsRowsHtml = saleItems.map((item, idx) => `
        <tr>
          <td class="text-center font-bold">${idx + 1}</td>
          <td class="text-left">${nfc(item.name)}</td>
          <td class="text-center">${item.unit}</td>
          <td class="text-center">${item.quantity}</td>
          <td class="text-right">${item.price.toLocaleString('vi-VN')}</td>
          <td class="text-right font-bold">${(item.quantity * item.price).toLocaleString('vi-VN')}</td>
        </tr>
      `).join('');

      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">----------o0o----------</div>
        </div>
        <div class="text-center pt-2 pb-2 no-indent">
          <h1>HỢP ĐỒNG MUA BÁN HÀNG HOÁ</h1>
        </div>

        <p class="clause-p">Hôm nay, ${ngayThangNam(saleContractDate)}, chúng tôi gồm có:</p>

        <p class="clause-p font-bold uppercase no-indent">BÊN MUA (BÊN A):</p>
        <p class="clause-p no-indent">- Họ và tên: <strong>${nfc(saleBuyerName)}</strong></p>
        <p class="clause-p no-indent">- Địa chỉ: ${nfc(saleBuyerAddress)}</p>

        <p class="clause-p font-bold uppercase no-indent pt-1">BÊN BÁN (BÊN B):</p>
        <p class="clause-p no-indent">- Họ và tên: <strong>${nfc(saleSellerName)}</strong></p>
        ${salePayMethod === 'cash' ? `
        <p class="clause-p no-indent">- CCCD số: <strong>${nfc(saleSellerCccd)}</strong> &nbsp;|&nbsp; Ngày cấp: ${nfc(saleSellerCccdDate)} &nbsp;|&nbsp; Nơi cấp: ${nfc(saleSellerCccdPlace)}</p>
        ` : `
        <p class="clause-p no-indent">- Số tài khoản: <strong>${nfc(saleBankAccNo)}</strong></p>
        <p class="clause-p no-indent">- Ngân hàng: <strong>${nfc(saleBankName)}</strong>${saleBankBranch ? ` &nbsp;|&nbsp; Chi nhánh: ${nfc(saleBankBranch)}` : ''}</p>
        `}

        <p class="clause-p pt-1">Hai bên cùng thống nhất ký kết Hợp đồng mua bán hàng hóa với các điều khoản sau đây:</p>

        <h2>ĐIỀU 1: ĐỐI TƯỢNG VÀ GIÁ CẢ</h2>
        <table class="table-doc">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 40%;">Tên Hàng Hóa</th>
              <th style="width: 10%;">ĐVT</th>
              <th style="width: 10%;">Số lượng</th>
              <th style="width: 17%;">Đơn Giá</th>
              <th style="width: 18%;">Thành Tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
            <tr>
              <td colSpan="5" class="text-bold text-center font-bold">Tổng cộng</td>
              <td class="text-right font-bold text-[13pt]">${totalSaleAmount.toLocaleString('vi-VN')}</td>
            </tr>
          </tbody>
        </table>

        <h2>ĐIỀU 2: THỜI HẠN HỢP ĐỒNG</h2>
        <p class="clause-p">Thời hạn thực hiện Hợp đồng kể từ ngày <strong>${fmtDate(saleStartDate || saleContractDate)}</strong> đến ngày <strong>${fmtDate(saleEndDate || saleContractDate)}</strong>.</p>

        <h2>ĐIỀU 3: THỜI HẠN VÀ PHƯƠNG THỨC THANH TOÁN</h2>
        <p class="clause-p"><strong>1. Tổng giá trị thanh toán:</strong> Bên Mua thanh toán cho Bên Bán tổng số tiền là: <strong>${totalSaleAmount.toLocaleString('vi-VN')} đồng</strong> (Bằng chữ: ${moneyToVietnameseWords(totalSaleAmount)}).</p>
        <p class="clause-p"><strong>2. Tiến độ thanh toán:</strong> Mỗi một lô hàng khi Bên B xuất ra cho Bên A thì Bên A sẽ thanh toán như sau:</p>
        <p class="item-p">– Lần 1: Bên A thanh toán cho Bên B số tiền là: <strong>${salePaymentStage1} đồng</strong>.</p>
        <p class="item-p">– Lần 2: Số tiền còn lại sẽ được Bên A thanh toán toàn bộ trước khi nhận hàng dựa trên phiếu đề nghị thanh toán.</p>
        <p class="clause-p"><strong>3. Phương thức thanh toán:</strong> Bên A thanh toán cho Bên B bằng hình thức <strong>${salePayMethod === 'cash' ? 'tiền mặt' : 'chuyển khoản'}</strong>, theo thông tin Bên B đã nêu tại phần đầu Hợp đồng này.</p>

        <h2>ĐIỀU 4: THỜI ĐIỂM VÀ ĐỊA ĐIỂM CHUYỂN GIAO HÀNG HÓA</h2>
        <p class="clause-p">Bên Bán chuyển giao hàng hóa cho Bên Mua trong thời hạn 30 ngày kể từ ngày ký kết hợp đồng.</p>

        <h2>ĐIỀU 5: NGHĨA VỤ CỦA BÊN BÁN</h2>
        <p class="clause-p no-indent">- Bên Bán chịu trách nhiệm về số lượng, chất lượng đối với toàn bộ các sản phẩm do Bên Bán cung cấp.</p>
        <p class="clause-p no-indent">- Bên Bán có nghĩa vụ cung cấp mọi chỉ dẫn cần thiết đối với việc bảo quản, sử dụng hàng hoá theo quy định của Hợp đồng này cho Bên mua.</p>

        <h2>ĐIỀU 6: NGHĨA VỤ CỦA BÊN MUA</h2>
        <p class="clause-p no-indent">- Bên mua có nghĩa vụ thanh toán toàn bộ chi phí vận chuyển.</p>
        <p class="clause-p no-indent">- Tổ chức tiếp nhận nhanh, an toàn, dứt điểm cho từng lô hàng.</p>
        <p class="clause-p no-indent">- Thanh toán đầy đủ theo quy định tại Điều 3 Hợp đồng này.</p>

        <h2>ĐIỀU 7: CÁC TRƯỜNG HỢP CHẤM DỨT HỢP ĐỒNG</h2>
        <p class="clause-p no-indent">- Khi các Bên thực hiện xong các quyền và nghĩa vụ quy định trong Hợp đồng này.</p>
        <p class="clause-p no-indent">- Khi một Bên vi phạm hợp đồng dẫn đến Hợp đồng không thể thực hiện được thì phía Bên kia có quyền đơn phương chấm dứt hợp đồng.</p>
        <p class="clause-p no-indent">- Hợp đồng có thể được chấm dứt do sự thỏa thuận bằng văn bản của các Bên.</p>

        <h2>ĐIỀU 8: HIỆU LỰC THI HÀNH</h2>
        <p class="clause-p no-indent">- Hợp đồng này có hiệu lực kể từ ngày ký, và chỉ được coi là kết thúc khi các Bên đã hoàn thành các nghĩa vụ của mình trong Hợp đồng.</p>
        <p class="clause-p no-indent">- Trong trường hợp một Bên muốn sửa đổi các điều khoản trong hợp đồng thì phải thông báo cho Bên kia biết trước ít nhất là 03 ngày và cùng nhau thoả thuận lại những điểm cần thay đổi với sự đồng ý của hai Bên.</p>
        <p class="clause-p no-indent">- Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, các bản có giá trị pháp lý như nhau.</p>

        <table class="sig-table font-serif" style="width: 100%; margin-top: 20pt;">
          <tbody>
            <tr>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN BÁN</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(saleSellerName)}</p>
              </td>
              <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
                <p class="text-center font-bold uppercase no-indent">ĐẠI DIỆN BÊN MUA</p>
                <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
                <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
                <p class="text-center font-bold uppercase no-indent">${nfc(saleBuyerName)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    const isSale = selectedTemplate === 'payment_request_sale';
    const isBangKe = selectedTemplate === 'payment_request_bang_ke';
    const buyerName = isSale || isBangKe ? saleBuyerName : constPartyAName;
    const sellerName = isSale || isBangKe ? saleSellerName : constPartyBName;
    const contractDateStr = isSale || isBangKe ? saleContractDate : constContractDate;
    const totalAmountStr = isSale
      ? totalSaleAmount.toLocaleString('vi-VN')
      : isBangKe
      ? (totalSaleAmount > 0 ? totalSaleAmount.toLocaleString('vi-VN') : (constTotalPrice || '0'))
      : constTotalPrice;
    const docTypeTitle = isBangKe
      ? 'Bảng kê mua bán hàng hóa'
      : isSale
      ? 'Hợp đồng mua bán hàng hóa'
      : 'Hợp đồng thi công nhà ở dân dụng';
    const docDateAction = isBangKe ? 'lập ngày' : 'ký ngày';
    const docValueLabel = isBangKe ? '1. Giá trị bảng kê' : '1. Giá trị hợp đồng';

    const rTitle = recipientTitle || (buyerName.toLowerCase().includes('thị') ? 'Bà' : 'Ông');

    const displayBankName = (() => {
      const raw = (payBankName || '').trim();
      const insideParen = /\(([^)]+)\)/.exec(raw);
      if (insideParen && insideParen[1].trim()) return insideParen[1].trim();
      return raw.replace(/^(Ngân hàng\s*(TMCP|CP|TNHH)?\s*)/i, '').trim() || raw;
    })();

    const stagesHtml = payStages.length > 0 ? payStages.map((st) => {
      let actionText = '';
      if (st.status === 'paid') {
        actionText = `${rTitle} ${givenName(buyerName)} đã thanh toán số tiền là:`;
      } else if (st.status === 'current') {
        actionText = `${rTitle} ${givenName(buyerName)} thanh toán số tiền đợt này là:`;
      } else {
        actionText = `Số tiền các đợt thanh toán tiếp theo:`;
      }
      const cleanName = nfc(st.stageName).replace(/\s*\([^)]*\)/g, '').trim() || nfc(st.stageName);
      return `
        <p class="clause-p no-indent">
          + <strong>${cleanName}:</strong> ${actionText} <strong>${st.amount} đồng</strong>
        </p>
      `;
    }).join('') : `
      <p class="clause-p no-indent">
        + <strong>Thanh toán một lần:</strong> ${rTitle} ${givenName(buyerName)} thanh toán số tiền là: <strong>${totalAmountStr} đồng</strong>
      </p>
    `;

    let infoHtml = '';
    if (payMethodType === 'cash') {
      const name = payCashName || sellerName;
      const cccd = payCashCccd || (isSale || isBangKe ? saleSellerCccd : constPartyBCccd);
      const cccdDate = payCashCccdDate || (isSale || isBangKe ? saleSellerCccdDate : '03/03/2022');
      const cccdPlace = payCashCccdPlace || 'CCS QLHC về TTXH';

      infoHtml = `
        <p class="clause-p no-indent">– Họ & tên: <strong>${nfc(name)}</strong></p>
        <p class="clause-p no-indent">– CCCD số: <strong>${nfc(cccd)}</strong></p>
        <p class="clause-p no-indent">– Ngày cấp: <strong>${nfc(cccdDate)}</strong></p>
        <p class="clause-p no-indent">– Nơi cấp: <strong>${nfc(cccdPlace)}</strong></p>
      `;
    } else {
      const owner = payBankOwner || sellerName;
      infoHtml = `
        <p class="clause-p no-indent">– Họ tên chủ tài khoản: <strong>${nfc(owner)}</strong></p>
        <p class="clause-p no-indent">– Số tài khoản: <strong>${nfc(payBankAccNo)}</strong></p>
        <p class="clause-p no-indent">– Ngân hàng: <strong>${nfc(displayBankName)}</strong></p>
        <p class="clause-p no-indent">– Chi nhánh: <strong>${nfc(payBankBranch)}</strong></p>
      `;
    }

    return `
      <div class="text-center no-indent">
        <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
        <div class="text-center no-indent font-bold" style="letter-spacing: 1px; margin: 2px 0 6px;">----------o0o----------</div>
      </div>

      <div class="text-right font-italic text-[12pt] pt-2 pb-1 no-indent">
        ........, Ngày .... Tháng .... Năm 2026
      </div>

      <div class="text-center pt-2 pb-2 no-indent">
        <h1>GIẤY ĐỀ NGHỊ THANH TOÁN</h1>
      </div>

      <p class="clause-p no-indent">Kính gửi: <strong>${rTitle} ${nfc(buyerName)}</strong></p>

      <p class="clause-p no-indent">Căn cứ ${docTypeTitle} ${docDateAction} <strong>${fmtDate(contractDateStr)}</strong> giữa ${rTitle} ${titleCaseName(buyerName)} và ${titleCaseName(sellerName)}, tôi xin đề nghị thanh toán theo các nội dung sau:</p>

      <p class="clause-p no-indent font-bold">${docValueLabel}: <strong>${totalAmountStr} đồng</strong></p>
      <p class="clause-p no-indent font-italic pl-4">(Bằng chữ: ${moneyTextToWords(totalAmountStr)})</p>

      <p class="clause-p no-indent font-bold pt-1">2. Thời hạn thanh toán:</p>
      ${stagesHtml}

      <p class="clause-p no-indent font-bold pt-1">3. Thông tin thanh toán (${payMethodType === 'cash' ? 'Thanh toán tiền mặt' : 'Thanh toán chuyển khoản'}):</p>
      ${infoHtml}

      <p class="clause-p no-indent pt-3">Kính mong ${rTitle} ${nfc(buyerName)} sắp xếp thanh toán số tiền nêu trên theo đúng tiến độ đã thỏa thuận${isBangKe ? '' : ' trong hợp đồng'}.</p>

      <p class="clause-p no-indent pt-1">Trân trọng!</p>

      <table class="sig-table font-serif" style="width: 100%; table-layout: fixed; margin-top: 20pt;">
        <tbody>
          <tr>
            <td style="width: 50%;"></td>
            <td class="text-center" style="width: 50%; text-align: center; vertical-align: top;">
              <p class="text-center font-bold uppercase no-indent">NGƯỜI ĐỀ NGHỊ THANH TOÁN</p>
              <p class="text-center font-italic text-[11pt] no-indent">(Ký và ghi rõ họ tên)</p>
              <div class="sig-space">&nbsp;<br />&nbsp;<br />&nbsp;<br />&nbsp;</div>
              <p class="text-center font-bold uppercase no-indent">${nfc(sellerName)}</p>
            </td>
          </tr>
        </tbody>
      </table>
    `;
}
