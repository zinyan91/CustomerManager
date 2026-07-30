import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getThemeStyles } from '../../lib/themeStyles';
import { fmtDate } from '../../lib/utils';
import { TemplateSelector, TEMPLATE_LIST, type TemplateType } from '../documents/TemplateSelector';
import { DocumentForm, type SaleItem } from '../documents/DocumentForm';
import { DocumentPreview } from '../documents/DocumentPreview';

const nfc = (str: string) => (str ? str.normalize('NFC') : '');

export const DocumentTemplateView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const styles = getThemeStyles(isLight);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('lease_mb');

  // FORM STATE 1: HỢP ĐỒNG THUÊ MẶT BẰNG
  const [mbContractDate, setMbContractDate] = useState('2026-04-23');
  const [mbPartyAName, setMbPartyAName] = useState('ĐỖ THỊ HIẾU');
  const [mbPartyACccd, setMbPartyACccd] = useState('0791 7802 5859');
  const [mbPartyACccdDate, setMbPartyACccdDate] = useState('29/11/2021');
  const [mbPartyAAddress, setMbPartyAAddress] = useState('233/3/1 Đường Vĩnh Viễn, Phường 4, Quận 10, Tp.HCM');
  const [mbPartyBName, setMbPartyBName] = useState('NGÔ NHỊ ĐẠT');
  const [mbPartyBCccd, setMbPartyBCccd] = useState('0343 0300 4676');
  const [mbPartyBCccdDate, setMbPartyBCccdDate] = useState('03/03/2022');
  const [mbPartyBAddress, setMbPartyBAddress] = useState('Bình Đường, An Bình, Tp. Dĩ An, Bình Dương');
  const [mbLocation, setMbLocation] = useState('1 phần thửa đất số 45 Tờ bản đồ số 9, Địa chỉ 478/34 Hòa Hảo, Phường 5, Quận 10, Tp.HCM');
  const [mbStartDate, setMbStartDate] = useState('2026-04-23');
  const [mbEndDate, setMbEndDate] = useState('2027-04-22');
  const [mbMonthlyPrice, setMbMonthlyPrice] = useState('55.000.000');
  const [mbDepositAmount, setMbDepositAmount] = useState('72.000.000');

  // FORM STATE 2: HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG
  const [constContractDate, setConstContractDate] = useState('2026-03-18');
  const [constPartyAName, setConstPartyAName] = useState('LÝ THỊ THÙY DUNG');
  const [constPartyACccd, setConstPartyACccd] = useState('0791 7802 5859');
  const [constPartyAAddress, setConstPartyAAddress] = useState('233/3/1 Đường Vĩnh Viễn, Phường 4, Quận 10, Tp.HCM');
  const [constPartyBName, setConstPartyBName] = useState('ĐỖ THỊ LAN ANH');
  const [constPartyBCccd, setConstPartyBCccd] = useState('0343 0300 4676');
  const [constSiteAddress, setConstSiteAddress] = useState('1 phần thửa đất số 45 Tờ bản đồ số 9 (BĐĐC) Địa chỉ 478/34 Hòa Hảo, Phường 5, Quận 10, Tp.HCM');
  const [constStartDate, setConstStartDate] = useState('2026-03-20');
  const [constEndDate, setConstEndDate] = useState('2026-05-20');
  const [constTotalPrice, setConstTotalPrice] = useState('1.003.700.000');
  const [constDepositStage1, setConstDepositStage1] = useState('53.700.000');
  const [constStage2Amount, setConstStage2Amount] = useState('950.000.000');

  // FORM STATE 3: HỢP ĐỒNG MUA BÁN HÀNG HÓA
  const [saleContractDate, setSaleContractDate] = useState('2026-04-09');
  const [saleBuyerName, setSaleBuyerName] = useState('LÊ THỊ CẢNH');
  const [saleBuyerAddress, setSaleBuyerAddress] = useState('Kỳ Anh, Hà Tĩnh');
  const [saleSellerName, setSaleSellerName] = useState('PHẠM HỒNG ĐỨC');
  const [saleSellerCccd, setSaleSellerCccd] = useState('0720 7700 0901');
  const [saleSellerCccdDate, setSaleSellerCccdDate] = useState('25/05/2023');
  const [saleStartDate, setSaleStartDate] = useState('2026-04-09');
  const [saleEndDate, setSaleEndDate] = useState('2026-05-09');
  const [salePaymentStage1, setSalePaymentStage1] = useState('93.600.000');

  const [saleItems, setSaleItems] = useState<SaleItem[]>([
    { id: '1', name: 'Dầu gội phục hồi', unit: 'Chai', quantity: 100, price: 250000 },
    { id: '2', name: 'Dầu xả chuyên dụng', unit: 'Chai', quantity: 120, price: 250000 },
    { id: '3', name: 'Thuốc nhuộm tóc', unit: 'Tuýp', quantity: 120, price: 120000 },
    { id: '4', name: 'Thuốc uốn tóc', unit: 'Lọ', quantity: 100, price: 150000 },
    { id: '5', name: 'Thuốc duỗi tóc', unit: 'Lọ', quantity: 120, price: 180000 },
    { id: '6', name: 'Hấp dầu / kem ủ tóc', unit: 'Hũ', quantity: 250, price: 350000 },
    { id: '7', name: 'Serum dưỡng tóc', unit: 'Chai', quantity: 250, price: 450000 },
    { id: '8', name: 'Gôm xịt tóc', unit: 'Chai', quantity: 260, price: 120000 },
    { id: '9', name: 'Lược chải tóc chuyên dụng', unit: 'Cái', quantity: 260, price: 50000 },
    { id: '10', name: 'Sữa rửa mặt dưỡng ẩm', unit: 'Tuýp', quantity: 170, price: 200000 },
    { id: '11', name: 'Toner làm dịu da', unit: 'Chai', quantity: 200, price: 380000 },
    { id: '12', name: 'Serum dưỡng trắng da', unit: 'Chai', quantity: 230, price: 380000 },
    { id: '13', name: 'Mặt nạ giấy dưỡng da', unit: 'Hộp', quantity: 230, price: 200000 },
  ]);

  const handleAddSaleItem = () => {
    setSaleItems([
      ...saleItems,
      { id: Date.now().toString(), name: 'Mặt hàng mới', unit: 'Chai', quantity: 1, price: 100000 }
    ]);
  };

  const totalSaleAmount = saleItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);

  // Generate Document HTML based on active template (EXACT ORIGINAL TEMPLATE TEXT)
  const currentTplInfo = TEMPLATE_LIST.find(t => t.id === selectedTemplate) || TEMPLATE_LIST[0];

  const generateDocHtml = () => {
    if (selectedTemplate === 'lease_mb') {
      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div style="text-align: center; margin: 4px 0;" class="no-indent">
            <span style="border-bottom: 2px solid #000; width: 140px; display: inline-block;"></span>
          </div>
        </div>
        <div class="text-center pt-2 pb-2 no-indent">
          <h1>HỢP ĐỒNG THUÊ MẶT BẰNG KINH DOANH</h1>
          <p class="font-italic text-[11pt] no-indent">(Số: 23042026/HĐMB)</p>
        </div>
        <p class="clause-p">Hôm nay, ngày ${fmtDate(mbContractDate)}, tại địa chỉ ${nfc(mbLocation)}, chúng tôi gồm có:</p>
        <p class="font-bold no-indent">BÊN CHO THUÊ (BÊN A):</p>
        <p class="clause-p">- Họ và tên: <strong>${nfc(mbPartyAName)}</strong> | CCCD số: <strong>${mbPartyACccd}</strong> do Cục Cảnh sát QLHC về TTXH cấp ngày ${mbPartyACccdDate}.</p>
        <p class="clause-p">- Địa chỉ thường trú: ${nfc(mbPartyAAddress)}.</p>
        <p class="font-bold no-indent pt-2">BÊN THUÊ (BÊN B):</p>
        <p class="clause-p">- Họ và tên: <strong>${nfc(mbPartyBName)}</strong> | CCCD số: <strong>${mbPartyBCccd}</strong> do Cục Cảnh sát QLHC về TTXH cấp ngày ${mbPartyBCccdDate}.</p>
        <p class="clause-p">- Địa chỉ thường trú: ${nfc(mbPartyBAddress)}.</p>
        <h2>ĐIỀU 1: NỘI DUNG HỢP ĐỒNG</h2>
        <p class="clause-p">Bên A đồng ý cho Bên B thuê mặt bằng kinh doanh tại địa chỉ: <strong>${nfc(mbLocation)}</strong>.</p>
        <p class="clause-p">Thời hạn thuê là 12 tháng kể từ ngày <strong>${fmtDate(mbStartDate)}</strong> đến hết ngày <strong>${fmtDate(mbEndDate)}</strong>.</p>
        <h2>ĐIỀU 2: GIÁ THUÊ VÀ ĐẶT CỌC</h2>
        <p class="clause-p">1. Giá thuê mặt bằng là: <strong>${mbMonthlyPrice} VNĐ/tháng</strong> (Bằng chữ: Năm mươi lăm triệu đồng mỗi tháng).</p>
        <p class="clause-p">2. Tiền đặt cọc bảo đảm thực hiện hợp đồng là: <strong>${mbDepositAmount} VNĐ</strong>.</p>
        <table class="sig-table font-serif">
          <tbody>
            <tr>
              <td>
                <div class="font-bold uppercase">BÊN CHO THUÊ (BÊN A)</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(mbPartyAName)}</div>
              </td>
              <td>
                <div class="font-bold uppercase">BÊN THUÊ (BÊN B)</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(mbPartyBName)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (selectedTemplate === 'construction') {
      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div style="text-align: center; margin: 4px 0;" class="no-indent">
            <span style="border-bottom: 2px solid #000; width: 140px; display: inline-block;"></span>
          </div>
        </div>
        <div class="text-center pt-3 pb-1 no-indent">
          <h1>HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG</h1>
        </div>
        <p class="clause-p">Căn cứ vào nhu cầu và khả năng hợp tác của hai bên. Hôm nay, ngày ${fmtDate(constContractDate)}, chúng tôi gồm có:</p>
        <div class="space-y-1 no-indent">
          <div class="font-bold uppercase text-[13pt] no-indent">BÊN THUÊ THI CÔNG XÂY DỰNG: (Sau đây gọi tắt là Bên A)</div>
          <div class="pl-6 space-y-0.5 no-indent">
            <div>- Bà: <strong class="uppercase">${nfc(constPartyAName)}</strong></div>
            <div>- CCCD số: <strong>${nfc(constPartyACccd)}</strong> | Địa chỉ: ${nfc(constPartyAAddress)}</div>
          </div>
        </div>
        <div class="space-y-1 no-indent pt-2">
          <div class="font-bold uppercase text-[13pt] no-indent">BÊN NHẬN THI CÔNG XÂY DỰNG: (Sau đây gọi tắt là Bên B)</div>
          <div class="pl-6 space-y-0.5 no-indent">
            <div>- Bà: <strong class="uppercase">${nfc(constPartyBName)}</strong></div>
            <div>- CCCD số: <strong>${nfc(constPartyBCccd)}</strong></div>
          </div>
        </div>
        <p class="clause-p pt-2">Hai bên thỏa thuận ký hợp đồng với các điều khoản như sau:</p>
        <h2>Điều 1: Nội dung và phạm vi công việc</h2>
        <p class="clause-p">1. Địa điểm thi công: Bên B nhận thi công/sửa chữa nhà ở dân dụng tại địa chỉ: <strong>${nfc(constSiteAddress)}</strong>.</p>
        <p class="clause-p">2. Phạm vi công việc: Sửa chữa/tân trang phần tường, lát gạch nền sàn, đi lại đường dây điện nước, thay mới cửa mái tôn lan can.</p>
        <h2>Điều 2: Thời gian và tiến độ thực hiện</h2>
        <p class="clause-p">- Ngày khởi công: Ngày <strong>${fmtDate(constStartDate)}</strong> đến ngày <strong>${fmtDate(constEndDate)}</strong>.</p>
        <h2>Điều 3. Giá trị hợp đồng và phương thức thanh toán</h2>
        <p class="clause-p">- Tổng giá trị hợp đồng: <strong>${constTotalPrice} VNĐ</strong>.</p>
        <p class="clause-p">- Đợt 1: <strong>${constDepositStage1} VNĐ</strong>. Đợt 2: <strong>${constStage2Amount} VNĐ</strong>.</p>
        <table class="sig-table font-serif">
          <tbody>
            <tr>
              <td>
                <div class="font-bold uppercase">BÊN THUÊ THI CÔNG (BÊN A)</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(constPartyAName)}</div>
              </td>
              <td>
                <div class="font-bold uppercase">BÊN NHẬN THI CÔNG (BÊN B)</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(constPartyBName)}</div>
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
          <td>${nfc(item.name)}</td>
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
          <div style="text-align: center; margin: 4px 0;" class="no-indent">
            <span style="border-bottom: 2px solid #000; width: 140px; display: inline-block;"></span>
          </div>
        </div>
        <div class="text-center pt-2 pb-2 no-indent">
          <h1>HỢP ĐỒNG MUA BÁN HÀNG HOÁ</h1>
        </div>

        <p class="clause-p">Hôm nay, ngày 9 tháng 4 năm 2026, chúng tôi gồm có:</p>
        
        <p class="font-bold no-indent">BÊN MUA: (Sau đây gọi tắt là Bên A)</p>
        <p class="clause-p">- Họ tên: <strong>${nfc(saleBuyerName)}</strong></p>
        <p class="clause-p">- Địa chỉ: <strong>${nfc(saleBuyerAddress)}</strong></p>

        <p class="font-bold no-indent pt-2">BÊN BÁN: (Sau đây gọi tắt là Bên B)</p>
        <p class="clause-p">- Họ tên: <strong>${nfc(saleSellerName)}</strong></p>
        <p class="clause-p">- CCCD số: <strong>${nfc(saleSellerCccd)}</strong> &nbsp;|&nbsp; Ngày cấp: <strong>${nfc(saleSellerCccdDate)}</strong> &nbsp;|&nbsp; Nơi cấp: CCS QLHC về TTXH</p>

        <p class="clause-p pt-2">Hai bên A và B thống nhất thoả thuận nội dung Hợp đồng như sau:</p>

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
        <p class="clause-p">– Thời hạn Hợp đồng là: 01 tháng kể từ ngày 09/04/2026 đến ngày 09/05/2026</p>

        <h2>ĐIỀU 3: THỜI HẠN VÀ PHƯƠNG THỨC THANH TOÁN</h2>
        <p class="clause-p">– Tổng số tiền Bên Mua phải thanh toán cho Bên Bán là: <strong>${totalSaleAmount.toLocaleString('vi-VN')} đồng</strong></p>
        <p class="clause-p">(Bằng chữ: Năm trăm chín mươi ba triệu sáu trăm nghìn đồng)</p>
        <p class="clause-p"><strong>1. Thời hạn thanh toán:</strong></p>
        <p class="clause-p">Mỗi một lô hàng khi Bên B xuất ra cho Bên A thì Bên A sẽ thanh toán như sau:</p>
        <p class="clause-p">– Lần 1: Bên A thanh toán cho Bên B số tiền là: <strong>${salePaymentStage1} đồng</strong></p>
        <p class="clause-p">– Lần 2: Số tiền còn lại sẽ được Bên A thanh toán toàn bộ trước khi nhận hàng dựa trên phiếu đề nghị thanh toán</p>
        <p class="clause-p"><strong>2. Phương thức thanh toán:</strong> Thanh toán bằng tiền mặt hoặc chuyển khoản.</p>

        <h2>ĐIỀU 4: THỜI ĐIỂM VÀ ĐỊA ĐIỂM CHUYỂN GIAO TÀI SẢN</h2>
        <p class="clause-p">Bên bán chuyển giao tài sản cho Bên mua trong thời hạn 30 ngày kể từ ngày ký kết hợp đồng.</p>

        <h2>ĐIỀU 5: NGHĨA VỤ CỦA BÊN BÁN</h2>
        <p class="clause-p">- Bên Bán chịu trách nhiệm về số lượng, chất lượng đối với toàn bộ các sản phẩm do Bên Bán cung cấp.</p>
        <p class="clause-p">- Bên Bán có nghĩa vụ cung cấp mọi chỉ dẫn cần thiết đối với việc bảo quản, sử dụng hàng hoá theo quy định của Hợp đồng này cho Bên mua.</p>

        <h2>ĐIỀU 6: NGHĨA VỤ CỦA BÊN MUA</h2>
        <p class="clause-p">- Bên mua có nghĩa vụ thanh toán toàn bộ chi phí vận chuyển</p>
        <p class="clause-p">- Tổ chức tiếp nhận nhanh, an toàn, dứt điểm cho từng lô hàng.</p>
        <p class="clause-p">- Thanh toán theo quy định tại Điều 7 Hợp đồng này.</p>

        <h2>ĐIỀU 7: CÁC TRƯỜNG HỢP CHẤM DỨT HỢP ĐỒNG</h2>
        <p class="clause-p">Hợp đồng này sẽ được chấm dứt trong các trường hợp sau:</p>
        <p class="clause-p">- Khi các Bên thực hiện xong các quyền và nghĩa vụ quy định trong Hợp đồng này.</p>
        <p class="clause-p">- Khi một Bên vi phạm hợp đồng dẫn đến Hợp đồng không thể thực hiện được thì phía Bên kia có quyền đơn phương chấm dứt hợp đồng.</p>
        <p class="clause-p">- Hợp đồng có thể được chấm dứt do sự thỏa thuận của các Bên.</p>

        <h2>ĐIỀU 8: HIỆU LỰC THI HÀNH</h2>
        <p class="clause-p">- Hợp đồng này có hiệu lực kể từ ngày ký, và chỉ được coi là kết thúc khi các Bên đã hoàn thành các nghĩa vụ của mình trong Hợp đồng.</p>
        <p class="clause-p">- Trong trường hợp một Bên muốn sửa đổi các điều khoản trong hợp đồng thì phải thông báo cho Bên kia biết trước ít nhất là 03 ngày và cùng nhau thoả thuận lại những điểm cần thay đổi với sự đồng ý của hai Bên.</p>
        <p class="clause-p">- Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, các bản có giá trị pháp lý như nhau.</p>

        <table class="sig-table font-serif">
          <tbody>
            <tr>
              <td>
                <div class="font-bold uppercase">ĐẠI DIỆN BÊN BÁN</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(saleSellerName)}</div>
              </td>
              <td>
                <div class="font-bold uppercase">ĐẠI DIỆN BÊN MUA</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(saleBuyerName)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    if (selectedTemplate === 'payment_request_sale') {
      const remainingNum = Math.max(0, totalSaleAmount - (parseFloat(salePaymentStage1.replace(/\D/g, '')) || 0));

      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div style="text-align: center; margin: 4px 0;" class="no-indent">
            <span style="border-bottom: 2px solid #000; width: 140px; display: inline-block;"></span>
          </div>
        </div>

        <div class="text-right font-italic text-[12pt] pt-2 pb-2 no-indent">
          ........, Ngày .... Tháng .... Năm 2026
        </div>

        <div class="text-center pt-2 pb-2 no-indent">
          <h1>GIẤY ĐỀ NGHỊ THANH TOÁN</h1>
        </div>

        <p class="clause-p">Kính gửi: <strong>Bà ${nfc(saleBuyerName)}</strong></p>

        <p class="clause-p">Căn cứ hợp đồng mua bán hàng hóa ký ngày: <strong>${fmtDate(saleContractDate)}</strong> giữa Bà ${nfc(saleBuyerName)} và Ông ${nfc(saleSellerName)}, tôi xin đề nghị thanh toán theo các nội dung sau:</p>

        <p class="clause-p"><strong>1. Giá trị hợp đồng:</strong> <strong>${totalSaleAmount.toLocaleString('vi-VN')} đồng</strong></p>
        <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;(Bằng chữ: Năm trăm chín mươi ba triệu sáu trăm nghìn đồng)</p>

        <p class="clause-p"><strong>2. Thời hạn thanh toán:</strong></p>
        <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;+ Bà Cảnh đã thanh toán cho tôi với số tiền đợt đầu tiên là: <strong>${salePaymentStage1} đồng</strong></p>
        <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;+ Bà Cảnh thanh toán cho tôi số tiền còn lại của hợp đồng đợt này là: <strong>${remainingNum.toLocaleString('vi-VN')} đồng</strong> trước khi nhận hàng</p>

        <p class="clause-p"><strong>3. Thông tin thanh toán:</strong></p>
        <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;– Họ & tên: <strong>${nfc(saleSellerName)}</strong></p>
        <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;– CCCD số: <strong>${nfc(saleSellerCccd)}</strong> &nbsp;&nbsp;&nbsp;&nbsp;– Ngày cấp: <strong>${nfc(saleSellerCccdDate)}</strong> &nbsp;&nbsp;&nbsp;&nbsp;– Nơi cấp: <strong>CCS QLHC về TTXH</strong></p>

        <p class="clause-p pt-3">Kính mong Bà Cảnh sắp xếp thanh toán số tiền nêu trên trước khi nhận hàng, theo đúng tiến độ đã thỏa thuận trong hợp đồng.</p>

        <p class="clause-p">Trân trọng!</p>

        <table class="sig-table font-serif">
          <tbody>
            <tr>
              <td style="width: 50%;"></td>
              <td style="width: 50%; text-align: center;">
                <div class="font-bold uppercase">Người đề nghị thanh toán</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(saleSellerName)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    // Default: payment_request_const (HĐ Thi công nhà ở)
    return `
      <div class="text-center no-indent">
        <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
        <div style="text-align: center; margin: 4px 0;" class="no-indent">
          <span style="border-bottom: 2px solid #000; width: 140px; display: inline-block;"></span>
        </div>
      </div>

      <div class="text-right font-italic text-[12pt] pt-2 pb-2 no-indent">
        ........, Ngày .... Tháng .... Năm 2026
      </div>

      <div class="text-center pt-2 pb-2 no-indent">
        <h1>GIẤY ĐỀ NGHỊ THANH TOÁN</h1>
      </div>

      <p class="clause-p">Kính gửi: <strong>Bà ${nfc(constPartyAName)}</strong></p>

      <p class="clause-p">- Căn cứ hợp đồng thi công nhà ở dân dụng ký ngày <strong>${fmtDate(constContractDate)}</strong> giữa Bà ${nfc(constPartyAName)} và Bà ${nfc(constPartyBName)}</p>
      <p class="clause-p">- Nay tôi kính đề nghị Bà ${nfc(constPartyAName)} thanh toán cho tôi phần còn lại của hợp đồng thi công nhà ở nêu trên, với nội dung cụ thể như sau:</p>

      <p class="clause-p"><strong>1. Giá trị hợp đồng:</strong> <strong>${constTotalPrice} đồng</strong></p>
      <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;(Bằng chữ: Một tỷ không trăm lẻ ba triệu bảy trăm ngàn)</p>

      <p class="clause-p"><strong>2. Thời hạn thanh toán:</strong></p>
      <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;+ Đợt 1: Bà Dung đã thanh toán cho tôi với số tiền đợt đầu tiên là: <strong>${constDepositStage1} đồng</strong></p>
      <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;+ Đợt 2: Đề nghị bà Dung thanh toán cho tôi số tiền đợt 2 là: <strong>${constStage2Amount} đồng</strong></p>

      <p class="clause-p"><strong>3. Thông tin thanh toán:</strong></p>
      <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;- Họ & Tên: <strong>${nfc(constPartyBName)}</strong></p>
      <p class="clause-p">&nbsp;&nbsp;&nbsp;&nbsp;- CCCD số: <strong>${nfc(constPartyBCccd)}</strong> &nbsp;&nbsp;&nbsp;&nbsp;- Ngày cấp: <strong>03/03/2022</strong> &nbsp;&nbsp;&nbsp;&nbsp;- Nơi cấp: <strong>Cục Cảnh Sát QLHC</strong></p>

      <p class="clause-p pt-3">Trân trọng cảm ơn!</p>

      <table class="sig-table font-serif">
        <tbody>
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: center;">
              <div class="font-bold uppercase">Người đề nghị thanh toán</div>
              <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
              <div style="height: 70px;"></div>
              <div class="font-bold uppercase">${nfc(constPartyBName)}</div>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  };

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      {/* ── TEMPLATE SELECTOR ── */}
      <TemplateSelector
        styles={styles}
        isLight={isLight}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
      />

      {/* ── 2-COLUMN SIDE-BY-SIDE LAYOUT: FORM LEFT (5 cols), PREVIEW RIGHT (7 cols) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-5 space-y-4">
          <DocumentForm
            styles={styles}
            selectedTemplate={selectedTemplate}
            mbContractDate={mbContractDate} setMbContractDate={setMbContractDate}
            mbPartyAName={mbPartyAName} setMbPartyAName={setMbPartyAName}
            mbPartyACccd={mbPartyACccd} setMbPartyACccd={setMbPartyACccd}
            mbPartyACccdDate={mbPartyACccdDate} setMbPartyACccdDate={setMbPartyACccdDate}
            mbPartyAAddress={mbPartyAAddress} setMbPartyAAddress={setMbPartyAAddress}
            mbPartyBName={mbPartyBName} setMbPartyBName={setMbPartyBName}
            mbPartyBCccd={mbPartyBCccd} setMbPartyBCccd={setMbPartyBCccd}
            mbPartyBCccdDate={mbPartyBCccdDate} setMbPartyBCccdDate={setMbPartyBCccdDate}
            mbPartyBAddress={mbPartyBAddress} setMbPartyBAddress={setMbPartyBAddress}
            mbLocation={mbLocation} setMbLocation={setMbLocation}
            mbStartDate={mbStartDate} setMbStartDate={setMbStartDate}
            mbEndDate={mbEndDate} setMbEndDate={setMbEndDate}
            mbMonthlyPrice={mbMonthlyPrice} setMbMonthlyPrice={setMbMonthlyPrice}
            mbDepositAmount={mbDepositAmount} setMbDepositAmount={setMbDepositAmount}
            constContractDate={constContractDate} setConstContractDate={setConstContractDate}
            constPartyAName={constPartyAName} setConstPartyAName={setConstPartyAName}
            constPartyACccd={constPartyACccd} setConstPartyACccd={setConstPartyACccd}
            constPartyAAddress={constPartyAAddress} setConstPartyAAddress={setConstPartyAAddress}
            constPartyBName={constPartyBName} setConstPartyBName={setConstPartyBName}
            constPartyBCccd={constPartyBCccd} setConstPartyBCccd={setConstPartyBCccd}
            constSiteAddress={constSiteAddress} setConstSiteAddress={setConstSiteAddress}
            constStartDate={constStartDate} setConstStartDate={setConstStartDate}
            constEndDate={constEndDate} setConstEndDate={setConstEndDate}
            constTotalPrice={constTotalPrice} setConstTotalPrice={setConstTotalPrice}
            constDepositStage1={constDepositStage1} setConstDepositStage1={setConstDepositStage1}
            constStage2Amount={constStage2Amount} setConstStage2Amount={setConstStage2Amount}
            saleContractDate={saleContractDate} setSaleContractDate={setSaleContractDate}
            saleBuyerName={saleBuyerName} setSaleBuyerName={setSaleBuyerName}
            saleBuyerAddress={saleBuyerAddress} setSaleBuyerAddress={setSaleBuyerAddress}
            saleSellerName={saleSellerName} setSaleSellerName={setSaleSellerName}
            saleSellerCccd={saleSellerCccd} setSaleSellerCccd={setSaleSellerCccd}
            saleSellerCccdDate={saleSellerCccdDate} setSaleSellerCccdDate={setSaleSellerCccdDate}
            saleStartDate={saleStartDate} setSaleStartDate={setSaleStartDate}
            saleEndDate={saleEndDate} setSaleEndDate={setSaleEndDate}
            salePaymentStage1={salePaymentStage1} setSalePaymentStage1={setSalePaymentStage1}
            saleItems={saleItems} setSaleItems={setSaleItems}
            handleAddSaleItem={handleAddSaleItem}
          />
        </div>

        {/* Right Column: Live Document Preview */}
        <div className="lg:col-span-7">
          <DocumentPreview
            styles={styles}
            isLight={isLight}
            docTitle={currentTplInfo.label}
            docFilename={currentTplInfo.id}
            docHtml={generateDocHtml()}
          />
        </div>
      </div>
    </div>
  );
};
