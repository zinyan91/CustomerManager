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
  const stage1PaidNum = parseFloat(salePaymentStage1.replace(/\D/g, '')) || 0;
  const stage2RemainingNum = Math.max(0, totalSaleAmount - stage1PaidNum);

  // Generate Document HTML based on active template
  const currentTplInfo = TEMPLATE_LIST.find(t => t.id === selectedTemplate) || TEMPLATE_LIST[0];

  const generateDocHtml = () => {
    if (selectedTemplate === 'lease_mb' || selectedTemplate === 'lease_house') {
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
      <div class="text-center pt-2 pb-2 no-indent">
        <h1>HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG</h1>
        <p class="font-italic text-[11pt] no-indent">Căn cứ vào nhu cầu và khả năng hợp tác của hai bên. Hôm nay, ngày ${fmtDate(constContractDate)}, chúng tôi gồm có:</p>
      </div>

      <p class="font-bold no-indent">BÊN THUÊ THI CÔNG XÂY DỰNG (BÊN A):</p>
      <p class="clause-p">- Bà: <strong>${nfc(constPartyAName)}</strong></p>
      <p class="clause-p">- CCCD số: <strong>${constPartyACccd}</strong> | Ngày cấp: 29/11/2021 | Nơi cấp: Cục Cảnh sát QLHC về TTXH</p>
      <p class="clause-p">- Nơi ĐKTT: ${nfc(constPartyAAddress)}</p>

      <p class="font-bold no-indent pt-2">BÊN NHẬN THI CÔNG XÂY DỰNG (BÊN B):</p>
      <p class="clause-p">- Bà: <strong>${nfc(constPartyBName)}</strong></p>
      <p class="clause-p">- STK/CCCD số: <strong>${constPartyBCccd}</strong> | Ngày cấp: 03/03/2022 | Nơi cấp: Cục Cảnh sát QLHC về TTXH</p>

      <p class="clause-p pt-2">Hai bên thỏa thuận ký hợp đồng với các điều khoản như sau:</p>

      <h2>ĐIỀU 1: NỘI DUNG VÀ PHẠM VI CÔNG VIỆC</h2>
      <p class="clause-p"><strong>1. Địa điểm thi công:</strong> Bên B nhận thi công/sửa chữa nhà ở dân dụng tại địa chỉ: <strong>${nfc(constSiteAddress)}</strong>.</p>
      <p class="clause-p"><strong>2. Phạm vi công việc:</strong> Bên B nhận thực hiện toàn bộ phần nhân công (hoặc cả nhân công + vật liệu) cho các hạng mục:</p>
      <p class="clause-p">- Sửa chữa/tân trang phần tường: trát, bả, sơn lại toàn bộ các mảng tường bị hư hỏng.</p>
      <p class="clause-p">- Thay thế hoặc lát lại gạch nền, sàn theo mẫu Bên A đã lựa chọn.</p>
      <p class="clause-p">- Thi công hệ thống điện nước: đi lại đường dây điện, thay ổ cắm, công tắc, thay đường ống cấp – thoát nước hỏng.</p>
      <p class="clause-p">- Sửa chữa, thay mới cửa, mái tôn, lan can, cầu thang (nếu có).</p>
      <p class="clause-p"><strong>3. Chất lượng & tiêu chuẩn kỹ thuật:</strong> Đảm bảo quy trình xây dựng dân dụng, an toàn lao động và đúng chủng loại vật liệu cam kết.</p>

      <h2>ĐIỀU 2: THỜI GIAN VÀ TIẾN ĐỘ THỰC HIỆN</h2>
      <p class="clause-p">- Ngày khởi công: <strong>${fmtDate(constStartDate)}</strong></p>
      <p class="clause-p">- Ngày hoàn thành dự kiến: <strong>${fmtDate(constEndDate)}</strong></p>
      <p class="clause-p">- Tổng thời gian thực hiện dự kiến: 2 tháng (không tính Thứ 7, Chủ nhật).</p>

      <h2>ĐIỀU 3: GIÁ TRỊ HỢP ĐỒNG VÀ PHƯƠNG THỨC THANH TOÁN</h2>
      <p class="clause-p">- Tổng giá trị hợp đồng: <strong>${constTotalPrice} VNĐ</strong> (Bằng chữ: Một tỷ không trăm lẻ ba triệu bảy trăm ngàn đồng).</p>
      <p class="clause-p">- Phương thức thanh toán:</p>
      <p class="clause-p">&nbsp;&nbsp;+ Đợt 1: Bên A thanh toán cho Bên B số tiền là: <strong>${constDepositStage1} VNĐ</strong>.</p>
      <p class="clause-p">&nbsp;&nbsp;+ Đợt 2: Số tiền còn lại (<strong>${constStage2Amount} VNĐ</strong>) sẽ được Bên A thanh toán toàn bộ trước khi bàn giao hoàn thiện công trình.</p>

      <h2>ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA CÁC BÊN</h2>
      <p class="clause-p"><strong>1. Bên A:</strong> Bàn giao mặt bằng, giám sát chất lượng và thanh toán đúng tiến độ.</p>
      <p class="clause-p"><strong>2. Bên B:</strong> Thi công đúng thiết kế, đảm bảo an toàn lao động, giữ gìn vệ sinh và bảo hành công trình.</p>

      <h2>ĐIỀU 5: NGHIỆM THU, BÀN GIAO VÀ BẢO HÀNH</h2>
      <p class="clause-p">- Thời gian bảo hành: 06 tháng kể từ ngày bàn giao công trình.</p>

      <h2>ĐIỀU 6: ĐIỀU KHOẢN CHUNG</h2>
      <p class="clause-p">- Hợp đồng có hiệu lực từ ngày ký và được lập thành 02 bản có giá trị pháp lý như nhau.</p>

      <table class="sig-table font-serif">
        <tbody>
          <tr>
            <td>
              <div class="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
              <div class="font-italic text-[11pt]">(Ký, ghi rõ họ tên)</div>
              <div style="height: 70px;"></div>
              <div class="font-bold uppercase">${nfc(constPartyAName)}</div>
            </td>
            <td>
              <div class="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
              <div class="font-italic text-[11pt]">(Ký, ghi rõ họ tên)</div>
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
          <h1>HỢP ĐỒNG MUA BÁN HÀNG HÓA</h1>
          <p class="font-italic text-[11pt] no-indent">(Số: 09042026/HĐMB-MỸ PHẨM)</p>
        </div>
        <p class="clause-p">Hôm nay, ngày ${fmtDate(saleContractDate)}, giữa Bên Mua <strong>${nfc(saleBuyerName)}</strong> và Bên Bán <strong>${nfc(saleSellerName)}</strong> (CCCD: ${saleSellerCccd}).</p>
        <h2>ĐIỀU 1: DANH MỤC HÀNG HÓA MUA BÁN</h2>
        <table class="table-doc">
          <thead>
            <tr>
              <th style="width: 5%;">STT</th>
              <th style="width: 40%;">Tên Sản Phẩm / Vật Tư</th>
              <th style="width: 10%;">ĐVT</th>
              <th style="width: 10%;">SL</th>
              <th style="width: 17%;">Đơn Giá (VNĐ)</th>
              <th style="width: 18%;">Thành Tiền (VNĐ)</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRowsHtml}
            <tr>
              <td colSpan="5" class="text-bold text-center">TỔNG CỘNG GIÁ TRỊ HỢP ĐỒNG</td>
              <td class="text-right font-bold text-[13pt]">${totalSaleAmount.toLocaleString('vi-VN')} VNĐ</td>
            </tr>
          </tbody>
        </table>
        <h2>ĐIỀU 2: THANH TOÁN & GIAO HÀNG</h2>
        <p class="clause-p">1. Đợt 1 đặt cọc: <strong>${salePaymentStage1} VNĐ</strong>. Đợt 2 còn lại: <strong>${stage2RemainingNum.toLocaleString('vi-VN')} VNĐ</strong>.</p>
        <p class="clause-p">2. Thời gian giao nhận từ <strong>${fmtDate(saleStartDate)}</strong> đến <strong>${fmtDate(saleEndDate)}</strong>.</p>
        <table class="sig-table font-serif">
          <tbody>
            <tr>
              <td>
                <div class="font-bold uppercase">BÊN MUA (BÊN A)</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(saleBuyerName)}</div>
              </td>
              <td>
                <div class="font-bold uppercase">BÊN BÁN (BÊN B)</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(saleSellerName)}</div>
              </td>
            </tr>
          </tbody>
        </table>
      `;
    }

    return `
      <div class="text-center no-indent">
        <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
      </div>
      <div class="text-center pt-2 pb-2 no-indent">
        <h1>GIẤY ĐỀ NGHỊ THANH TOÁN</h1>
      </div>
      <p class="clause-p">Kính gửi: Bà Lê Thị Cảnh.</p>
      <p class="clause-p">Đề nghị thanh toán hợp đồng mua bán mỹ phẩm đợt 2 số tiền: <strong>500.000.000 VNĐ</strong>.</p>
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

      {/* ── DYNAMIC FORM INPUTS ── */}
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

      {/* ── DOCUMENT PREVIEW & EXPORT ── */}
      <DocumentPreview
        styles={styles}
        isLight={isLight}
        docTitle={currentTplInfo.label}
        docFilename={currentTplInfo.id}
        docHtml={generateDocHtml()}
      />
    </div>
  );
};
