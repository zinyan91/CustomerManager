import { FileText } from 'lucide-react';
import type { DocTemplate, DossierCommon } from '../types';
import { VHTT_STYLES } from './vhttStyles';

export interface Bm02Specific {
  centerName?: string;
  centerCode?: string;
  docPlace?: string;
  docDate?: string;
  disbursementTime?: string;
  customerName?: string;
  cif?: string;
  regNo?: string;
  amount?: string;
  amountWords?: string;
  purpose?: string;
  paymentItem?: string;
  invoiceDoc?: string;
  invoiceValue?: string;
  fundedAmount?: string;
  currentFundAmount?: string;
  benAccNo?: string;
  benAccOwner?: string;
  benBank?: string;
  tkvCif?: string;
}

export const defaultBm02Specific: Bm02Specific = {
  centerName: '',
  centerCode: '',
  docPlace: '',
  docDate: '',
  disbursementTime: '',
  customerName: '',
  cif: '',
  regNo: '',
  amount: '',
  amountWords: '',
  purpose: '',
  paymentItem: '',
  invoiceDoc: '',
  invoiceValue: '',
  fundedAmount: '',
  currentFundAmount: '',
  benAccNo: '',
  benAccOwner: '',
  benBank: '',
  tkvCif: '',
};

function formatBm02Date(place?: string, dateStr?: string): string {
  if (!place && !dateStr) return '…………….., ngày……tháng ……..năm…….';
  const p = place || '……………..';
  if (!dateStr) return `${p}, ngày……tháng ……..năm…….`;
  const parts = dateStr.split('-');
  if (parts.length !== 3) return `${p}, ngày ${dateStr}`;
  return `${p}, ngày ${parts[2]} tháng ${parts[1]} năm ${parts[0]}`;
}

export function buildBm02Html(common?: DossierCommon, specific?: Bm02Specific): string {
  const s = specific || defaultBm02Specific;
  const centerName = s.centerName || '……………………';
  const centerCode = s.centerCode || '…………………….';
  const dateLine = formatBm02Date(s.docPlace, s.docDate || common?.contractDate);
  const timeText = s.disbursementTime ? `(LẦN ${s.disbursementTime})` : '(LẦN ….)';
  const customerName = s.customerName || common?.partyA?.name || '……………………………………………..';
  const cif = s.cif || common?.partyA?.cif || '……………………………….';
  const regNo = s.regNo || common?.partyA?.cccd || '……………………';
  const rawAmount = s.amount || common?.totalAmount || '';
  const amountDisplay = rawAmount ? `${rawAmount} đồng` : '………………… đồng';
  const wordsDisplay = s.amountWords || (rawAmount ? `${rawAmount} đồng` : '………… đồng');
  const purpose = s.purpose || '…………………………………………………………..';

  const paymentItem = s.paymentItem || '…';
  const invoiceDoc = s.invoiceDoc || '…';
  const invoiceValue = s.invoiceValue || '…';
  const fundedAmount = s.fundedAmount || '&nbsp;';
  const currentFundAmount = s.currentFundAmount || (rawAmount ? `${rawAmount} VNĐ` : '…');
  const benAccNo = s.benAccNo || '………';
  const benAccOwner = s.benAccOwner || '……';
  const benBank = s.benBank || '…………………';
  const tkvCif = s.tkvCif ? ` ${s.tkvCif}` : '.................';

  return `
${VHTT_STYLES}
<div class="vhtt-doc" data-vhtt-form="BM02">
<table class="table-borderless">
<tbody>
  <tr>
    <td><p class="p-left empty-p">&nbsp;</p><p class="p-left empty-p">&nbsp;</p><p class="p-left">Tên TTKD: ${centerName}</p><p class="p-left">Mã TTKD: ${centerCode}</p></td>
    <td><p class="p-left">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p><p class="p-center">Độc lập – Tự do – Hạnh phúc</p><p class="p-center">--------</p><p class="p-right"><em>${dateLine}</em></p></td>
  </tr>
</tbody>
</table>

<p class="p-center"><strong>TỜ TRÌNH GIẢI NGÂN</strong></p>
<p class="p-center"><em>${timeText}</em></p>
<p class="p-left" style="margin-left:15.2pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">I.</span><u><strong>THÔNG TIN </strong></u><u><strong>KHÁCH HÀNG</strong></u>:</p>
<p class="p-left" style="margin-left:28.4pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">1.</span>Tên Khách hàng: ${customerName} CIF: ${cif}</p>
<p class="p-left" style="margin-left:28.4pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">2.</span>CNĐKKD/CNĐKDN: ${regNo}</p>
<p class="p-left" style="margin-left:28.4pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">3.</span>Nhu cầu khách hàng của lần giải ngân này:</p>
<p class="p-left">Đề nghị Vietbank giải ngân với các nội dung như sau: </p>
<p class="p-left" style="margin-left:42.5pt; text-indent:-14.2pt;"><span class="li-num" style="width:14.2pt">-</span>Số tiền: ${amountDisplay} (Số tiền bằng chữ: ${wordsDisplay}) </p>
<p class="p-left" style="margin-left:42.5pt; text-indent:-14.2pt;"><span class="li-num" style="width:14.2pt">-</span>Mục đích: ${purpose}</p>
<table class="table-bordered">
<tbody>
  <tr>
    <td style="width: 6%; background: #DEEAF6;"><p class="p-center"><strong>STT</strong></p></td>
    <td style="width: 20%; background: #DEEAF6;"><p class="p-center"><strong>Khoản mục thanh toán</strong></p></td>
    <td style="width: 14%; background: #DEEAF6;"><p class="p-center"><strong>Số - ngày Hóa đơn/Hợp đồng</strong></p></td>
    <td style="width: 14%; background: #DEEAF6;"><p class="p-center"><strong>Trị giá Hóa đơn/Hợp đồng</strong></p></td>
    <td style="width: 13%; background: #DEEAF6;"><p class="p-center"><strong>Số tiền </strong><strong>đã </strong><strong>tài trợ </strong></p></td>
    <td style="width: 13%; background: #DEEAF6;"><p class="p-center"><strong>Số tiền tài trợ lần này</strong></p></td>
    <td style="width: 20%; background: #DEEAF6;"><p class="p-center"><strong>Bên thụ hưởng</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center">1</p></td>
    <td><p class="p-center">${paymentItem}</p></td>
    <td><p class="p-center">${invoiceDoc}</p></td>
    <td><p class="p-center">${invoiceValue}</p></td>
    <td><p class="p-center">${fundedAmount}</p></td>
    <td><p class="p-center">${currentFundAmount}</p></td>
    <td><p class="p-left">Số tài khoản: ${benAccNo}</p><p class="p-left">Chủ tài khoản: ${benAccOwner}</p><p class="p-center">Tại: ${benBank}</p></td>
  </tr>
  <tr>
    <td><p class="p-center">2</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center">…</p></td>
  </tr>
  <tr>
    <td><p class="p-center">3</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center"><strong>Tổng cộng</strong></p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-right empty-p">&nbsp;</p></td>
    <td><p class="p-right empty-p">&nbsp;</p></td>
    <td><p class="p-right empty-p">&nbsp;</p></td>
  </tr>
</tbody>
</table>

<p class="p-left" style="margin-left:25.1pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">-</span>Tỷ trọng doanh thu của các ngành nghề kinh doanh của Khách hàng:</p>
<p class="p-left">+ Ngành nghề: …….. /% doanh thu theo BCTC gần nhất</p>
<p class="p-left">+ Ngành nghề: …….. /% doanh thu theo BCTC gần nhất</p>
<p class="p-left" style="margin-left:20.8pt; text-indent:-20.8pt;"><span class="li-num" style="width:20.8pt">II.</span><u><strong>SƠ LƯỢC KHOẢN CẤP TÍN DỤNG VÀ ĐỀ XUẤT GIẢI NGÂN</strong></u></p>
<p class="p-left" style="margin-left:28.4pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">1.</span><strong>Sơ lược khoản cấp tín dụng</strong><strong>:</strong></p>
<p class="p-left" style="margin-left:35.5pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">a.</span><u><strong>Quan hệ tín dụng của khách hàng tại Vietbank và các Tổ chức tín dụng khác: </strong></u></p>
<p class="p-left">Theo thông tin hệ thống Vietbank và CIC ngày…../…../……:</p>
<p class="p-left">☐ Không phát sinh nợ từ nhóm 2 trở lên.</p>
<p class="p-left">☐ Có phát sinh nợ (từ nhóm 2 trở lên).</p>
<p class="p-left"><em><strong>Lưu ý:</strong></em><em> Trường hợp có phát sinh nợ từ nhóm 2 </em><em>tại thời điểm giải ngân</em><em>, </em><em>TTKD</em><em> </em><em>nêu thông tin liên quan về việc phê duyệt giải ngân, ví dụ như đã được phê duyệt giải ngân theo</em><em> Văn bản/Biên bản họp/Thông báo kết quả phê duyệt cấp tín dụng/giải ngân </em><em>số …</em><em> </em><em>ngày</em><em> </em><em>.</em><em>.</em><em>./</em><em>.</em><em>../…</em><em>…</em></p>
<p class="p-left empty-p">&nbsp;</p>
<p class="p-left"><br/></p>
<p class="p-left" style="margin-left:35.5pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">b.</span><u><strong>Hạn mức tín dụng</strong></u><u><strong>:</strong></u></p>
<p class="p-left"><strong>Tổng mức cấp tín dụng tối đa:</strong><strong> ……………..</strong><strong> đồng</strong></p>
<table class="table-bordered">
<tbody>
  <tr>
    <td style="width: 5%; background: #DEEAF6;"><p class="p-center"><strong>STT</strong></p></td>
    <td style="width: 18%; background: #DEEAF6;"><p class="p-center"><strong>Số </strong><strong>Commitment </strong></p></td>
    <td style="width: 18%; background: #DEEAF6;"><p class="p-center"><strong>Hạn mức tín dụng</strong></p><p class="p-center"><strong>được cấp</strong></p></td>
    <td style="width: 20%; background: #DEEAF6;"><p class="p-center"><strong>Hạn mức tín dụng</strong></p><p class="p-center"><strong>đã sử dụng/Dư nợ</strong></p></td>
    <td style="width: 20%; background: #DEEAF6;"><p class="p-center"><strong>Hạn mức tín dụng</strong></p><p class="p-center"><strong>khả dụ</strong><strong>ng </strong></p></td>
    <td style="width: 18%; background: #DEEAF6;"><p class="p-center"><strong>Ngày hết hạn</strong><strong> CMT</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>1</strong></p></td>
    <td colspan="5"><p class="p-left"><strong>Hạn mức tuần hoàn</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center">1.1</p></td>
    <td><p class="p-left">Số CMT</p></td>
    <td><p class="p-left">…………... </p></td>
    <td><p class="p-left"><strong>……… = (1) + (2) + (3)</strong></p><p class="p-left"><strong>Trong đó:</strong></p><p class="p-left"><strong>(1)</strong> Cho vay: ………… </p><p class="p-left"><strong>(2)</strong> Bảo lãnh: </p><p class="p-left">- BL…: ……...</p><p class="p-left">- BL…: … </p><p class="p-left">- Các BL còn lại: ……… </p><p class="p-left"><strong>(3)</strong> CTD khác: ……….</p></td>
    <td><p class="p-left"><strong>…………… Trong đó:</strong></p><p class="p-left"><strong>(1)</strong> Cho vay: ………… </p><p class="p-left"><strong>(2)</strong> Bảo lãnh: </p><p class="p-left">- BL …: …….... </p><p class="p-left">- BL …: … </p><p class="p-left">- Các BL còn lại: …….. </p><p class="p-left"><strong>(3)</strong> CTD khác: …………</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center">1.2</p></td>
    <td><p class="p-left">…………</p></td>
    <td><p class="p-left">……………</p></td>
    <td><p class="p-left">…………………..</p></td>
    <td><p class="p-left">……………………..</p></td>
    <td><p class="p-left">……………..</p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>2</strong></p></td>
    <td colspan="5"><p class="p-left"><strong>Hạn mức từng lần</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center">2.1</p></td>
    <td><p class="p-left">Số CMT</p></td>
    <td><p class="p-left">……………</p></td>
    <td><p class="p-left">…………………..</p></td>
    <td><p class="p-left">……………………..</p></td>
    <td><p class="p-left">……………..</p></td>
  </tr>
  <tr>
    <td><p class="p-center">2.2</p></td>
    <td><p class="p-left">…………</p></td>
    <td><p class="p-left">……………</p></td>
    <td><p class="p-left">…………………..</p></td>
    <td><p class="p-left">……………………..</p></td>
    <td><p class="p-left">……………..</p></td>
  </tr>
  <tr>
    <td colspan="2"><p class="p-center"><strong>Tổng cộng</strong></p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left">Số tiền quy đổi VND <br/>(Tỷ giá quy đổi…..)</p></td>
  </tr>
</tbody>
</table>

<p class="p-left" style="margin-left:35.5pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">c.</span><u><strong>Tài sản bảo đảm</strong></u><strong>:</strong></p>
<p class="p-right"><em>ĐVT: ………..</em></p>
<table class="table-bordered">
<tbody>
  <tr>
    <td style="width: 5%; background: #DEEAF6;"><p class="p-center"><strong>STT</strong></p></td>
    <td style="width: 12%; background: #DEEAF6;"><p class="p-center"><strong>Mã TSBĐ </strong><strong>(</strong><strong>FBE</strong><strong>)</strong></p></td>
    <td style="width: 14%; background: #DEEAF6;"><p class="p-center"><strong>Tên </strong><strong>TSBĐ</strong></p></td>
    <td style="width: 11%; background: #DEEAF6;"><p class="p-center"><strong>Giá trị (FBE)</strong></p></td>
    <td style="width: 10%; background: #DEEAF6;"><p class="p-center"><strong>Giá trị (AVM)</strong></p></td>
    <td style="width: 8%; background: #DEEAF6;"><p class="p-center"><strong>Tỷ lệ LTV </strong></p></td>
    <td style="width: 12%; background: #DEEAF6;"><p class="p-center"><strong>Giá trị</strong><strong> TS khả dụng</strong></p></td>
    <td style="width: 7%; background: #DEEAF6;"><p class="p-center"><strong>Tình trạ</strong><strong>ng</strong></p></td>
    <td style="width: 10%; background: #DEEAF6;"><p class="p-center"><strong>Ngày hết hạn </strong><strong>ĐGTS</strong></p></td>
    <td style="width: 11%; background: #DEEAF6;"><p class="p-center"><strong>Ngày hết hạn </strong><strong>BH</strong><strong>TS</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>1</strong></p></td>
    <td><p class="p-left">COL…1</p></td>
    <td><p class="p-left">Thửa  xxx, tờ bản đồ yyy</p></td>
    <td><p class="p-center">…</p></td>
    <td><p class="p-center">…</p></td>
    <td><p class="p-center">..%</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center">Đang trong kho</p></td>
    <td><p class="p-center">01/06/2024</p></td>
    <td><p class="p-center">Không phải mua BH</p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>2</strong></p></td>
    <td><p class="p-left">COL…2</p></td>
    <td><p class="p-left">Xe Ô tô BKS 51XX - 12345</p></td>
    <td><p class="p-center">…</p></td>
    <td><p class="p-center">…</p></td>
    <td><p class="p-center">..%</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center">Đang trong kho</p></td>
    <td><p class="p-center">01/08/2024</p></td>
    <td><p class="p-center">10/08/2024</p></td>
  </tr>
  <tr>
    <td colspan="3"><p class="p-center"><strong>Tổng cộng</strong></p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left">…</p></td>
    <td><p class="p-left">…</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
  </tr>
</tbody>
</table>

<p class="p-left">*<u><em><strong>Ghi chú</strong></em></u><strong>:</strong> </p>
<p class="p-left"><em>Trường hợp thời điểm giải ngân nếu giá trị TSBĐ có biến động giảm (căn cứ theo KQĐG hoặc thông tin từ chương trình định giá AVM) thì </em><em>TTKD</em><em> cập nhật phần “Giá trị TS khả dụng” giảm tương ứng để đảm bảo kiểm soát tỷ lệ LTV theo đúng phê duyệt.</em></p>
<p class="p-left"><em>T</em><em>rường hợp </em><em>có KQĐG</em><em> và/hoặc mua Bảo hiểm (nếu có)</em><em> mới</em><em> thì </em><em>TTKD</em><em> cập nhật lại theo KQĐG và/hoặc HS Bảo hiểm mới nhất để đảm bảo phù hợp theo Quy định và/hoặc Phê duyệt/Sản phẩm</em><em><strong> </strong></em><em>hiệu lực từng thời kỳ</em><em>.</em></p>
<p class="p-left" style="margin-left:35.5pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">d.</span><u><strong>Tình hình thực hiện các phê duyệt</strong></u><u><strong> (nêu rõ các điều kiện phê duyệt chưa thực hiện)</strong></u><strong>:</strong></p>
<table class="table-bordered">
<tbody>
  <tr>
    <td style="width: 5%; background: #DEEAF6;"><p class="p-center"><strong>STT</strong></p></td>
    <td style="width: 43%; background: #DEEAF6;"><p class="p-center"><strong>Nội dung phê duyệt</strong></p></td>
    <td style="width: 7%; background: #DEEAF6;"><p class="p-center"><strong>H</strong><strong>oàn thành</strong></p></td>
    <td style="width: 7%; background: #DEEAF6;"><p class="p-center"><strong>Ch</strong><strong>ưa </strong><strong>hoàn thành</strong></p></td>
    <td style="width: 9%; background: #DEEAF6;"><p class="p-center"><strong>Ch</strong><strong>ưa đến hạn thực hiện</strong></p></td>
    <td style="width: 12%; background: #DEEAF6;"><p class="p-center"><strong>Ngày phải hoàn thành</strong></p></td>
    <td style="width: 17%; background: #DEEAF6;"><p class="p-left"><strong>Lý do không/</strong><strong> </strong><strong>chưa thực hiện </strong><strong>v</strong><strong>à</strong><strong> Hướng khắc phục</strong></p></td>
  </tr>
  <tr>
    <td colspan="7"><p class="p-left"><strong>Văn bản/Biên bản họp/Thông báo kết quả phê duyệt cấp tín dụng số</strong><strong>… ngày .../.../……</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>a</strong></p></td>
    <td><p class="p-left"><strong>Điều kiện trước giải ngân</strong></p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-left">-….</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-left">- ….</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>b</strong></p></td>
    <td><p class="p-left"><strong>Điều kiện sau giải ngân</strong></p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-left">- Điều kiện dòng tiền</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-left">- ….</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>c</strong></p></td>
    <td><p class="p-left"><strong>Các điều kiện khác theo phê duyệt</strong></p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-left">- ….</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center">☐</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
    <td><p class="p-center empty-p">&nbsp;</p></td>
  </tr>
</tbody>
</table>

<p class="p-left"><strong>Nhận xét:</strong>  ☐ Đã thực hiện đầy đủ                ☐ Chưa thực hiện đầy đủ</p>
<p class="p-left" style="margin-left:35.5pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">e.</span><u><strong>Các nội dung khác</strong></u><u><strong> (nếu có)</strong></u><strong>: </strong><em>(Tùy hồ sơ cụ thể </em><em>TTKD</em><em> cần trình bày bổ sung chi tiết/diễn giải thêm cho các nội dung phía trên hoặc nội dung khác)</em></p>
<p class="p-left" style="margin-left:28.4pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">2.</span><u><strong>Đ</strong></u><u><strong>ề x</strong></u><u><strong>uất</strong></u><u><strong> giải ngân</strong></u><strong>: </strong></p>
<p class="p-left" style="margin-left:35.5pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">a.</span><strong>Cho vay</strong></p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Số tiền đề nghị giải ngân: ……………..đồng <em>(Bằng chữ: ……………..</em><em>đồng</em><em>)</em></p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Mục đích vay: </p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Mã mục đích: </p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Thời hạn vay: </p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Lãi suất cho vay và phí áp dụng lần này: </p>
<p class="p-left" style="margin-left:36pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">i.</span><strong>Biên độ cho vay:</strong></p>
<table class="table-bordered">
<tbody>
  <tr>
    <td style="width: 26%; background: #DEEAF6;"><p class="p-center"><strong>HSRR tại thời điểm phê duyệt</strong></p></td>
    <td style="width: 24%; background: #DEEAF6;"><p class="p-center"><strong>HSRR tại thời điểm giải ngân</strong></p></td>
    <td style="width: 24%; background: #DEEAF6;"><p class="p-center"><strong>Biên độ vay theo phê duyệt</strong></p></td>
    <td style="width: 26%; background: #DEEAF6;"><p class="p-center"><strong>Biên độ vay tại thời điểm giải ngân</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center">…….%</p></td>
    <td><p class="p-center">…….%</p></td>
    <td><p class="p-center">…….%</p></td>
    <td><p class="p-center">…….%</p></td>
  </tr>
</tbody>
</table>

<p class="p-left" style="margin-left:36pt; text-indent:-20.8pt;"><span class="li-num" style="width:20.8pt">ii.</span><strong>Mức cộng trừ (+/-) LSCV </strong></p>
<table class="table-bordered">
<tbody>
  <tr>
    <td style="width: 8%; background: #DEEAF6;"><p class="p-center"><strong>STT</strong></p></td>
    <td style="width: 51%; background: #DEEAF6;"><p class="p-center"><strong>Tiêu chí</strong></p></td>
    <td style="width: 20%; background: #DEEAF6;"><p class="p-center"><strong>LSCV ưu đãi (%/năm)</strong></p></td>
    <td style="width: 20%; background: #DEEAF6;"><p class="p-center"><strong>LSCV sau ưu đãi</strong><strong> </strong><strong>(%/năm)</strong></p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>1</strong></p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>2</strong></p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>3</strong></p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
  </tr>
  <tr>
    <td><p class="p-center"><strong>4</strong></p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
    <td><p class="p-left empty-p">&nbsp;</p></td>
  </tr>
</tbody>
</table>

<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>Lãi suất: ……%/năm <em>(</em><em>Ghi rõ Chương trình/Gói Lãi suất ưu đãi tham gia/Phê duyệt lãi suất áp dụng đồng thời ghi rõ tình hình thực hiện theo các điều kiện khi tham gia Chương trình/Gói lãi suất (nếu có))</em><em>.</em></p>
<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>Phí trả nợ trước hạn/Phí khác (nếu có): ………. (<em>theo quy định Vietbank/nội dung khác được cấp thẩm quyền phê duyệt).</em></p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Phương thức giải ngân:         </p>
<p class="p-left">  ☐   Tiền mặt                     </p>
<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>Bên nhận tiền:</p>
<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>Họ tên:</p>
<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>CCCD/CC/Hộ chiếu: </p>
<p class="p-left">  ☐   Chuyển khoản/Chuyển khoản và phong tỏa/Chuyển khoản và mở TTK và phong tỏa1 theo Biên bản thỏa thuận số … ngày …/…/….: </p>
<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>Bên thụ hưởng: </p>
<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>Số tài khoản: </p>
<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>Ngân hàng thụ hưởng: </p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Phương thức trả nợ: </p>
<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>Trả gốc:</p>
<p class="p-left">☐ Không ân hạn☐ Ân hạntháng</p>
<p class="p-left">☐ Cuối kỳ☐ Định kỳ ngày ……. hàng tháng</p>
<p class="p-left">Số kỳ trả nợ:</p>
<p class="p-left">Kỳ trả nợ đầu tiên vào ngày: </p>
<p class="p-left">Kỳ trả nợ cuối cùng sẽ được trả vào ngày đáo hạn của khoản vay.</p>
<p class="p-left">Số tiền trả mỗi kỳ là: ………… đồng, Số tiền trả kỳ cuối: ……………đồng</p>
<p class="p-left" style="margin-left:57.3pt; text-indent:-18pt;"><span class="li-num" style="width:18pt">+</span>Trả lãi:</p>
<p class="p-left">☐ Không ân hạn☐ Ân hạntháng</p>
<p class="p-left">☐ Cuối kỳ☐ Định kỳ ngày ……. hàng tháng</p>
<p class="p-left">Kỳ trả lãi đầu tiên vào ngày: </p>
<p class="p-left">Kỳ trả lãi cuối cùng sẽ được trả vào ngày đáo hạn của khoản vay. </p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Số tài khoản trích tiền thu nợ tự động của KH:</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Số tài khoản trích tiền thu phí/ký quỹ (nếu có):</p>
<p class="p-left" style="margin-left:35.5pt; text-indent:-15.2pt;"><span class="li-num" style="width:15.2pt">b.</span><strong>Bảo lãnh:</strong></p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Loại bảo lãnh: …………………………………………………………………</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Trị giá bảo lãnh: …………………đồng (Bằng chữ: ………………………).</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Thời hạn bảo lãnh: ……………………………………………………………</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Mục đích bảo lãnh: ……………………………………………………………</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Bên thụ hưởng: …………………………………………………………………</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Giấy đăng ký kinh doanh số: …………………………………………………</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Địa chỉ bên thụ hưởng: ………………………………………………………</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Mẫu thư bảo lãnh: …………………………………………………………….</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Ngôn ngữ: ……………………………………………………………………..</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Phí bảo lãnh: ………………………………………………………………….</p>
<p class="p-left" style="margin-left:35.5pt; text-indent:-14.1pt;"><span class="li-num" style="width:14.1pt">+</span>Phí bảo lãnh: ………………………………………………………………</p>
<p class="p-left"><em>(Ghi rõ Văn bản áp dụng và Công thức tính phí phù hợp theo quy định tại Văn bản đang áp dụng)</em></p>
<p class="p-left" style="margin-left:35.5pt; text-indent:-14.1pt;"><span class="li-num" style="width:14.1pt">+</span>Phí thư bảo lãnh theo mẫu của KH (nếu có): ……………………………</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Biện pháp đảm bảo: …………………………………………………………</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Tỷ lệ ký quỹ: …………………………………………………………………..</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Số tài khoản trích tiền thu phí/ký quỹ (nếu có):</p>
<p class="p-left" style="margin-left:21.3pt; text-indent:-21.3pt;"><span class="li-num" style="width:21.3pt">-</span>Đề nghị khác (nếu có): ………………………………………………………</p>
<p class="p-left"><strong>Đánh giá về hồ sơ giải ngân:</strong></p>
<p class="p-left">☐ Đầy đủ và hợp lệ.</p>
<p class="p-left">☐ Chưa đầy đủ và hợp lệ.</p>
<p class="p-left"><em>Lý do: ……………………..……………………………………..……………………………………..………………</em></p>
<p class="p-left"><em>……………………..……………………………………..……………………………………..……………………………………..……………………………………..……………………………………..………………………………</em></p>
<p class="p-left">Kính trình.</p>
<table class="table-bordered" style="page-break-inside: avoid; margin-top: 10pt;">
<tbody>
  <tr>
    <td style="width: 33%; background: #DEEAF6;"><p class="p-center"><strong>CBBH</strong></p></td>
    <td style="width: 31%; background: #DEEAF6;"><p class="p-center"><strong>CKS.CBBH</strong></p></td>
    <td style="width: 36%; background: #DEEAF6;"><p class="p-center"><u><strong>PHÊ DUYỆT CỦA TĐV/CẤP CÓ THẨM QUYỀN</strong></u></p></td>
  </tr>
  <tr>
    <td><p class="p-left">☐  Đồng ý: ……………………</p><p class="p-left">☐  Không đồng ý: ……………</p><p class="p-right"><em> (Ký, ghi rõ họ tên)</em></p><p class="p-right empty-p">&nbsp;</p><p class="p-right empty-p">&nbsp;</p><p class="p-right empty-p">&nbsp;</p><p class="p-right empty-p">&nbsp;</p><p class="p-right empty-p">&nbsp;</p><p class="p-left"><em>Mã CIF quản lý TKV:${tkvCif}</em></p></td>
    <td><p class="p-left">☐  Đồng ý: …………………</p><p class="p-left">☐  Không đồng ý: …………</p><p class="p-right"><em> (Ký, ghi rõ họ tên)</em></p></td>
    <td><p class="p-left">☐  Đồng ý: ……………………..</p><p class="p-left">☐  Không đồng ý: ………………</p><p class="p-right">.<em>…………, ngày……tháng …..năm </em></p><p class="p-right"><em>(Ký, ghi rõ họ tên, chức danh)</em></p></td>
  </tr>
</tbody>
</table>

<p class="p-left empty-p">&nbsp;</p>
<p class="p-left empty-p">&nbsp;</p>
<div class="vhtt-footer">
  <span class="vhtt-footer-left"><em>BM02_........./2026/TB-TGĐ_Tờ trình giải ngân</em></span>
  <span class="vhtt-footer-right"><em>Trang 1/3</em></span>
</div>
`.trim();
}

export const bm02ToTrinhGiaiNganTemplate: DocTemplate<Bm02Specific> = {
  id: 'bm02_to_trinh_giai_ngan',
  label: 'BM02 - Tờ trình giải ngân',
  icon: FileText,
  specificDefaults: defaultBm02Specific,
  buildHtml: buildBm02Html,
};
