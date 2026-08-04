import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getThemeStyles } from '../../lib/themeStyles';
import { fmtDate } from '../../lib/utils';
import { TemplateSelector, TEMPLATE_LIST, type TemplateType } from '../documents/TemplateSelector';
import { DocumentForm, type SaleItem } from '../documents/DocumentForm';
import { DEFAULT_DEPOSIT_CONTRACT, type DepositContractData } from '../documents/depositContract';
import { DocumentPreview } from '../documents/DocumentPreview';

const nfc = (str: string) => (str ? str.normalize('NFC') : '');

const monthsBetweenLabel = (startIso: string, endIso: string): string => {
  const a = startIso?.split('-'), b = endIso?.split('-');
  if (!a || !b || a.length !== 3 || b.length !== 3) return '';
  const months =
    (parseInt(b[0], 10) - parseInt(a[0], 10)) * 12
    + (parseInt(b[1], 10) - parseInt(a[1], 10));
  if (isNaN(months) || months <= 0) return '';
  return months % 12 === 0 && months >= 12
    ? `${months / 12} năm`
    : `${months} tháng`;
};

export const DocumentTemplateView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const styles = getThemeStyles(isLight);

  const [selectedTemplate, setSelectedTemplate] = useState<TemplateType>('lease_mb');

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

  const [lhFloors, setLhFloors] = useState('01');
  const [lhLandArea, setLhLandArea] = useState('80');
  const [lhHouseArea, setLhHouseArea] = useState('75');
  const [lhHandoverDate, setLhHandoverDate] = useState('2026-04-23');
  const [lhPaymentDay, setLhPaymentDay] = useState('05');

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
  const [constWarrantyMonths, setConstWarrantyMonths] = useState('06');

  const [constItems, setConstItems] = useState([
    { id: '1', name: 'Sửa chữa tường (vữa, sơn)', unit: 'm²', quantity: 36.5, price: 6000000, note: 'Vẽ lại tường, bả vữa, sơn lại' },
    { id: '2', name: 'Thay thế gạch lát nền', unit: 'm²', quantity: 36.5, price: 6000000, note: 'Thay gạch lát sàn mới' },
    { id: '3', name: 'Lắp đặt hệ thống điện (đi dây, ổ cắm)', unit: 'm', quantity: 18, price: 2600000, note: 'Đi lại hệ thống điện' },
    { id: '4', name: 'Sửa chữa cửa (sơn lại, thay bản lề)', unit: 'Cái', quantity: 2, price: 5000000, note: 'Sơn cửa, thay bản lề' },
    { id: '5', name: 'Sửa chữa mái tôn (vệ sinh, sơn lại)', unit: 'm²', quantity: 45, price: 2200000, note: 'Sơn lại mái tôn' },
    { id: '6', name: 'Sơn tường ngoài', unit: 'm²', quantity: 68, price: 1000000, note: 'Sơn lại tường ngoài nhà' },
    { id: '7', name: 'Vệ sinh tổng thể', unit: 'Mỗi', quantity: 1, price: 5000000, note: 'Dọn dẹp vệ sinh toàn bộ nhà' },
    { id: '8', name: 'Lắp đặt trần thạch cao', unit: 'm²', quantity: 45, price: 280000, note: 'Lắp trần thạch cao cho các phòng' },
    { id: '9', name: 'Lắp đặt hệ thống chiếu sáng hiện đại', unit: 'Cái', quantity: 15, price: 1000000, note: 'Lắp đèn chiếu sáng LED hiện đại' },
    { id: '10', name: 'Thay thế cửa cuốn, cửa nhựa', unit: 'Cái', quantity: 1, price: 1500000, note: 'Thay mới cửa cuốn, cửa nhựa' },
    { id: '11', name: 'Thay thế cửa nhôm, cửa kính hư hỏng tại ban công', unit: 'Cái', quantity: 10, price: 2200000, note: 'Thay cửa hư hỏng' },
    { id: '12', name: 'Chống thấm, sửa chữa sân thượng và mái che', unit: 'm²', quantity: 40, price: 700000, note: 'Chống thấm, sửa mái, không đục phá kết cấu' },
    { id: '13', name: 'Cải tạo, ốp lát lại nhà vệ sinh tầng trệt', unit: 'm²', quantity: 36.5, price: 1600000, note: 'Ốp lát, thay thiết bị, không thay đổi tường chịu lực' },
    { id: '14', name: 'Cải tạo, ốp lát lại nhà vệ sinh các tầng 1', unit: 'm²', quantity: 36.5, price: 1600000, note: 'Cải tạo hoàn thiện, giữ nguyên kết cấu' },
    { id: '15', name: 'Cải tạo, ốp lát lại nhà vệ sinh các tầng 2', unit: 'm²', quantity: 36.5, price: 1600000, note: 'Cải tạo hoàn thiện, giữ nguyên kết cấu' },
    { id: '16', name: 'Sơn bả lại trần nhà phòng khách và các tầng', unit: 'm²', quantity: 36, price: 450000, note: 'Hoàn thiện sơn bả trần' },
    { id: '17', name: 'Lắp đặt bổ sung đèn LED chiếu sáng trong nhà', unit: 'Cái', quantity: 4, price: 850000, note: 'Bổ sung đèn LED tiết kiệm điện' },
    { id: '18', name: 'Lát gạch hoàn thiện ban công, lô gia', unit: 'm²', quantity: 50, price: 500000, note: 'Lát gạch hoàn thiện khu vực ban công' },
    { id: '19', name: 'Sửa chữa, thay mới tủ bếp, mặt bàn bếp', unit: 'Bộ', quantity: 5, price: 4600000, note: 'Thay tủ bếp, mặt bàn, không can thiệp kết cấu' },
    { id: '20', name: 'Sửa chữa, sơn mới lan can và tay vịn cầu thang', unit: 'm', quantity: 30, price: 500000, note: 'Sơn sửa lan can, tay vịn, đảm bảo an toàn' },
  ]);

  const handleAddConstItem = () => {
    setConstItems([
      ...constItems,
      { id: Date.now().toString(), name: 'Hạng mục mới', unit: 'm²', quantity: 1, price: 1000000, note: 'Ghi chú công việc' }
    ]);
  };

  const [saleContractDate, setSaleContractDate] = useState('2026-04-09');
  const [saleBuyerName, setSaleBuyerName] = useState('LÊ THỊ CẢNH');
  const [saleBuyerAddress, setSaleBuyerAddress] = useState('Kỳ Anh, Hà Tĩnh');
  const [saleSellerName, setSaleSellerName] = useState('PHẠM HỒNG ĐỨC');
  const [saleSellerCccd, setSaleSellerCccd] = useState('0720 7700 0901');
  const [saleSellerCccdDate, setSaleSellerCccdDate] = useState('25/05/2023');
  const [deposit, setDeposit] = useState<DepositContractData>(DEFAULT_DEPOSIT_CONTRACT);

  const [saleSellerCccdPlace, setSaleSellerCccdPlace] = useState('CCS QLHC về TTXH');
  const [salePayMethod, setSalePayMethod] = useState<'cash' | 'transfer'>('transfer');
  const [saleBankOwner, setSaleBankOwner] = useState('PHẠM HỒNG ĐỨC');
  const [saleBankAccNo, setSaleBankAccNo] = useState('1023456789');
  const [saleBankName, setSaleBankName] = useState('Vietcombank');
  const [saleBankBranch, setSaleBankBranch] = useState('Chi nhánh Hà Tĩnh');
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

  const [payMethodType, setPayMethodType] = useState<'cash' | 'transfer'>('cash');
  const [payCashName, setPayCashName] = useState('PHẠM HỒNG ĐỨC');
  const [payCashCccd, setPayCashCccd] = useState('0720 7700 0901');
  const [payCashCccdDate, setPayCashCccdDate] = useState('25/05/2023');
  const [payCashCccdPlace, setPayCashCccdPlace] = useState('CCS QLHC về TTXH');

  const [payBankOwner, setPayBankOwner] = useState('PHẠM HỒNG ĐỨC');
  const [payBankAccNo, setPayBankAccNo] = useState('1023456789');
  const [payBankName, setPayBankName] = useState('Vietcombank');
  const [payBankBranch, setPayBankBranch] = useState('Chi nhánh Hà Tĩnh');

  const [payStages, setPayStages] = useState<any[]>([
    { id: '1', stageName: 'Đợt 1 (Đợt đầu tiên)', amount: '93.600.000', status: 'paid', note: 'Đã thanh toán đợt đầu' },
    { id: '2', stageName: 'Đợt 2 (Đợt này)', amount: '500.000.000', status: 'current', note: 'Thanh toán đợt này trước khi nhận hàng' }
  ]);

  const handleAddPayStage = () => {
    const nextIdx = payStages.length + 1;
    setPayStages([
      ...payStages,
      { id: Date.now().toString(), stageName: `Đợt ${nextIdx}`, amount: '100.000.000', status: 'current', note: 'Đề nghị thanh toán' }
    ]);
  };

  const currentTplInfo = TEMPLATE_LIST.find(t => t.id === selectedTemplate) || TEMPLATE_LIST[0];

  const constDurationMonths = monthsBetweenLabel(constStartDate, constEndDate) || 'theo thỏa thuận';
  const lhTermLabel = monthsBetweenLabel(mbStartDate, mbEndDate) || 'theo thỏa thuận';

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

    if (selectedTemplate === 'deposit') {
      const d = deposit;
      const taxLabel = (side: string) => (side === 'A' ? 'bên A' : 'bên B');
      return `
        <div class="text-center no-indent">
          <div class="font-bold text-[13pt] uppercase no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
          <div class="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
          <div style="text-align: center; margin: 4px 0;" class="no-indent">
            <span style="border-bottom: 2px solid #000; width: 140px; display: inline-block;"></span>
          </div>
        </div>
        <div class="text-center pt-2 pb-2 no-indent">
          <h1>HỢP ĐỒNG ĐẶT CỌC</h1>
          <p class="font-italic text-[11pt] no-indent">(V/v chuyển nhượng QSDĐ và tài sản gắn liền với đất)</p>
        </div>
        <p class="clause-p">Chúng tôi gồm có:</p>

        <p class="font-bold no-indent">I. BÊN MUA: (Gọi tắt là bên A)</p>
        <p class="clause-p">- ${nfc(d.buyerTitle)}: <strong>${nfc(d.buyerName)}</strong> &nbsp;|&nbsp; Sinh năm: ${nfc(d.buyerBirthYear)}</p>
        <p class="clause-p">- CCCD số: <strong>${nfc(d.buyerCccd)}</strong> &nbsp;|&nbsp; Cấp ngày: ${nfc(d.buyerCccdDate)} &nbsp;|&nbsp; Cấp tại: ${nfc(d.buyerCccdPlace)}</p>
        <p class="clause-p">- HKTT: ${nfc(d.buyerAddress)}</p>

        <p class="font-bold no-indent pt-2">II. BÊN BÁN: (Gọi tắt là bên B)</p>
        <p class="clause-p">- ${nfc(d.sellerTitle)}: <strong>${nfc(d.sellerName)}</strong> &nbsp;|&nbsp; Sinh năm: ${nfc(d.sellerBirthYear)}</p>
        <p class="clause-p">- CCCD số: <strong>${nfc(d.sellerCccd)}</strong> &nbsp;|&nbsp; Cấp ngày: ${nfc(d.sellerCccdDate)} &nbsp;|&nbsp; Cấp tại: ${nfc(d.sellerCccdPlace)}</p>
        <p class="clause-p">- HKTT: ${nfc(d.sellerAddress)}</p>

        <p class="clause-p pt-2">Hai bên đồng ý và thống nhất thỏa thuận như sau:</p>

        <h2>III. ĐỐI TƯỢNG CỦA HỢP ĐỒNG</h2>
        <p class="clause-p">Bên B đồng ý bán cho bên A phần đất và tài sản trên đất:</p>
        <p class="clause-p">- Thửa đất số: <strong>${nfc(d.parcelNo)}</strong> &nbsp;|&nbsp; Tờ bản đồ số: <strong>${nfc(d.mapSheetNo)}</strong></p>
        <p class="clause-p">- Diện tích: <strong>${nfc(d.area)} m²</strong> (Bằng chữ: ${nfc(d.areaInWords)}).</p>
        <p class="clause-p">- Địa chỉ thửa đất: ${nfc(d.parcelAddress)}</p>
        <p class="clause-p">- Loại đất: Đất ở tại đô thị: <strong>${nfc(d.urbanResidentialArea)} m²</strong> &nbsp;|&nbsp; Đất trồng cây lâu năm: <strong>${nfc(d.perennialCropArea)} m²</strong></p>
        <p class="clause-p">- Giấy CNQSDĐ số <strong>${nfc(d.certificateNo)}</strong>, vào sổ cấp GCN số: <strong>${nfc(d.certificateBookNo)}</strong> do ${nfc(d.certificateIssuer)} cấp ngày ${nfc(d.certificateDate)}.</p>

        <h2>IV. GIÁ CẢ VÀ PHƯƠNG THỨC THANH TOÁN</h2>
        <p class="clause-p">- Giá chuyển nhượng: <strong>${nfc(d.transferPrice)}đ</strong> (${nfc(d.transferPriceInWords)})</p>
        <p class="clause-p">- Hình thức thanh toán:</p>
        <p class="clause-p">- Lần 1: Bên A đặt cọc cho bên B số tiền <strong>${nfc(d.deposit1)} đồng</strong> (Bằng chữ: ${nfc(d.deposit1InWords)}) ngay khi ký hợp đồng này.</p>
        <p class="clause-p">- Lần 2: Bên A sẽ tiếp tục thanh toán cho bên B số tiền <strong>${nfc(d.payment2)} đồng</strong> (Bằng chữ: ${nfc(d.payment2InWords)})</p>
        <p class="clause-p">- Các khoản phí, lệ phí: thuế thu nhập cá nhân ${taxLabel(d.incomeTaxBy)} chịu, ${taxLabel(d.registrationTaxBy)} chịu thuế trước bạ sang tên.</p>

        <h2>V. THỎA THUẬN CHUNG</h2>
        <p class="clause-p">Bên B cam kết phần đất chuyển nhượng có nguồn gốc hợp pháp, hiện tại không tranh chấp, không thế chấp, không cho tặng, không góp vốn, không có đồng sở hữu nào khác, chưa sang nhượng cho bất kỳ ai và không bị kê biên để thi hành án.</p>
        <p class="clause-p">Nếu xảy ra sai phạm các vấn đề trên làm ảnh hưởng tới việc chuyển nhượng QSDĐ thì bên B chịu hoàn toàn trách nhiệm trước pháp luật.</p>
        <p class="clause-p">- Nếu bên B đổi ý không bán đất cho bên A nữa với bất kỳ lý do gì, hoặc thực hiện sai hẹn theo thời gian thỏa thuận thì bên B phải trả lại tiền cọc cho bên A và bồi thường cho bên A số tiền gấp 2 lần số tiền mà bên B đã nhận cọc.</p>
        <p class="clause-p">- Nếu bên A đổi ý không mua đất của bên B nữa với bất kỳ lý do gì, hoặc thực hiện sai hẹn theo thời gian thỏa thuận thì bên A sẽ mất toàn bộ số tiền đã đặt cọc cho bên B.</p>
        <p class="clause-p">- Trong thời gian thực hiện hợp đồng mà có những tranh chấp về ranh đất, diện tích đất không đúng theo sổ đất, dính quy hoạch thì bên B phải trả lại cho bên A số tiền đã nhận cọc.</p>
        <p class="clause-p">- Trong thời gian thực hiện hợp đồng bên A được quyền bán lại cho bên thứ 3, bên B có trách nhiệm thay mặt bên A ký bán cho bên thứ 3, số tiền chênh lệch bên A được hưởng.</p>

        <h2>VI. PHƯƠNG THỨC GIẢI QUYẾT TRANH CHẤP</h2>
        <p class="clause-p">- Trong quá trình thực hiện hợp đồng mà phát sinh tranh chấp, các bên cùng nhau thương lượng giải quyết trên nguyên tắc tôn trọng quyền lợi của nhau. Trong trường hợp không giải quyết được thì một trong hai bên có quyền khởi kiện để yêu cầu Tòa án có thẩm quyền giải quyết theo quy định của pháp luật. Mọi tranh chấp sẽ được phán xử theo quy định của luật pháp của Việt Nam.</p>

        <h2>VII. ĐIỀU KHOẢN CUỐI CÙNG</h2>
        <p class="clause-p">- Hai bên công nhận đã hiểu rõ quyền, nghĩa vụ và lợi ích hợp pháp của mình, ý nghĩa và hậu quả pháp lý của việc giao kết Hợp đồng này.</p>
        <p class="clause-p">- Hai bên cam kết thực hiện đúng các điều khoản trong hợp đồng.</p>
        <p class="clause-p">- Hai bên đã tự đọc hợp đồng, đã hiểu và đồng ý tất cả các điều khoản ghi trong hợp đồng và ký vào hợp đồng này trước sự có mặt của người làm chứng.</p>
        <p class="clause-p">Hợp đồng đặt cọc này được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.</p>

        <p class="clause-p text-right font-italic pt-3">${nfc(d.signPlace)}, ngày ${fmtDate(d.signDate)}</p>

        <table class="sig-table font-serif">
          <tbody>
            <tr>
              <td style="width: 33%;">
                <div class="font-bold uppercase">BÊN A</div>
                <div class="font-italic text-[11pt]">(Ký, ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(d.buyerName)}</div>
              </td>
              <td style="width: 34%;">
                <div class="font-bold uppercase">NGƯỜI LÀM CHỨNG</div>
                <div class="font-italic text-[11pt]">(Ký, ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">&nbsp;</div>
              </td>
              <td style="width: 33%;">
                <div class="font-bold uppercase">BÊN B</div>
                <div class="font-italic text-[11pt]">(Ký, ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(d.sellerName)}</div>
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
          <div style="text-align: center; margin: 4px 0;" class="no-indent">
            <span style="border-bottom: 2px solid #000; width: 140px; display: inline-block;"></span>
          </div>
        </div>
        <div class="text-center pt-2 pb-2 no-indent">
          <h1>HỢP ĐỒNG THUÊ NHÀ</h1>
        </div>
        <p class="clause-p">- Căn cứ Bộ luật Dân sự số 91/2015/QH13 ngày 24/11/2015;</p>
        <p class="clause-p">- Căn cứ Luật Thương mại số 36/2005/QH11 ngày 14 tháng 06 năm 2005;</p>
        <p class="clause-p">- Căn cứ vào nhu cầu và sự thỏa thuận của các bên tham gia Hợp đồng;</p>
        <p class="clause-p">Hôm nay, ngày ${fmtDate(mbContractDate)}, các Bên gồm:</p>

        <p class="font-bold no-indent">BÊN CHO THUÊ (BÊN A):</p>
        <p class="clause-p">- Ông/bà: <strong>${nfc(mbPartyAName)}</strong></p>
        <p class="clause-p">- CCCD số: <strong>${mbPartyACccd}</strong> | Ngày cấp: ${mbPartyACccdDate} | Nơi cấp: Cục Cảnh sát QLHC về TTXH.</p>
        <p class="clause-p">- Nơi ĐKTT: ${nfc(mbPartyAAddress)}.</p>
        <p class="font-bold no-indent pt-2">BÊN THUÊ (BÊN B):</p>
        <p class="clause-p">- Ông/bà: <strong>${nfc(mbPartyBName)}</strong></p>
        <p class="clause-p">- CCCD số: <strong>${mbPartyBCccd}</strong> | Ngày cấp: ${mbPartyBCccdDate} | Nơi cấp: Cục Cảnh sát QLHC về TTXH.</p>
        <p class="clause-p">- Nơi ĐKTT: ${nfc(mbPartyBAddress)}.</p>
        <p class="clause-p">Bên A và Bên B sau đây gọi chung là “Hai Bên” hoặc “Các Bên”.</p>
        <p class="clause-p">Sau khi thảo luận, Hai Bên thống nhất đi đến ký kết Hợp đồng thuê nhà (“Hợp Đồng”) với các điều khoản và điều kiện dưới đây:</p>

        <h2>Điều 1: Nhà ở và các tài sản cho thuê kèm theo nhà ở</h2>
        <p class="clause-p">1.1. Bên A đồng ý cho Bên B thuê và Bên B cũng đồng ý thuê quyền sử dụng đất và một căn nhà <strong>${nfc(lhFloors)}</strong> tầng gắn liền với quyền sử dụng đất tại địa chỉ: <strong>${nfc(mbLocation)}</strong> để sử dụng làm nơi để ở.</p>
        <p class="clause-p">- Diện tích quyền sử dụng đất: <strong>${nfc(lhLandArea)} m²</strong>;</p>
        <p class="clause-p">- Diện tích căn nhà: <strong>${nfc(lhHouseArea)} m²</strong>;</p>
        <p class="clause-p">1.2. Bên A cam kết quyền sử dụng đất và căn nhà gắn liền trên đất trên là tài sản sở hữu hợp pháp của Bên A. Mọi tranh chấp phát sinh từ tài sản cho thuê trên Bên A hoàn toàn chịu trách nhiệm trước pháp luật.</p>

        <h2>Điều 2: Bàn giao và sử dụng diện tích thuê</h2>
        <p class="clause-p">2.1. Thời điểm Bên A bàn giao tài sản thuê vào ngày <strong>${fmtDate(lhHandoverDate)}</strong>;</p>
        <p class="clause-p">2.2. Bên B được toàn quyền sử dụng tài sản thuê kể từ thời điểm được Bên A bàn giao từ thời điểm quy định tại Mục 2.1 trên đây.</p>

        <h2>Điều 3: Thời hạn thuê</h2>
        <p class="clause-p">3.1. Bên A cam kết cho Bên B thuê tài sản thuê với thời hạn là <strong>${lhTermLabel}</strong> kể từ ngày bàn giao Tài sản thuê;</p>
        <p class="clause-p">3.2. Hết thời hạn thuê nêu trên nếu Bên B có nhu cầu tiếp tục sử dụng thì Bên A phải ưu tiên cho Bên B tiếp tục thuê.</p>

        <h2>Điều 4: Đặt cọc tiền thuê nhà</h2>
        <p class="clause-p">4.1. Bên B sẽ giao cho Bên A một khoản tiền là <strong>${mbDepositAmount} VNĐ</strong> ngay sau khi ký hợp đồng này. Số tiền này là tiền đặt cọc để đảm bảo thực hiện Hợp đồng cho thuê nhà.</p>
        <p class="clause-p">4.2. Nếu Bên B đơn phương chấm dứt hợp đồng mà không thực hiện nghĩa vụ báo trước tới Bên A thì Bên A sẽ không phải hoàn trả lại Bên B số tiền đặt cọc này.</p>
        <p class="clause-p">Nếu Bên A đơn phương chấm dứt hợp đồng mà không thực hiện nghĩa vụ báo trước tới Bên B thì Bên A sẽ phải hoàn trả lại Bên B số tiền đặt cọc và phải bồi thường thêm một khoản bằng chính tiền đặt cọc.</p>
        <p class="clause-p">4.3. Tiền đặt cọc của Bên B sẽ không được dùng để thanh toán tiền thuê. Nếu Bên B vi phạm Hợp Đồng làm phát sinh thiệt hại cho Bên A thì Bên A có quyền khấu trừ tiền đặt cọc để bù đắp các chi phí khắc phục thiệt hại phát sinh. Mức chi phí bù đắp thiệt hại sẽ được Các Bên thống nhất bằng văn bản.</p>
        <p class="clause-p">4.4. Vào thời điểm kết thúc thời hạn thuê hoặc kể từ ngày chấm dứt Hợp đồng, Bên A sẽ hoàn lại cho Bên B số tiền đặt cọc sau khi đã khấu trừ khoản tiền chi phí để khắc phục thiệt hại (nếu có).</p>

        <h2>Điều 5: Tiền thuê nhà</h2>
        <p class="clause-p">5.1. Tiền thuê nhà đối với diện tích thuê nêu tại Mục 1.1 Điều 1 là: <strong>${mbMonthlyPrice} VNĐ/tháng</strong>.</p>
        <p class="clause-p">5.2. Tiền thuê nhà không bao gồm chi phí khác như tiền điện, nước, vệ sinh... Khoản tiền này sẽ do Bên B trả theo khối lượng, công suất sử dụng thực tế của Bên B hàng tháng, được tính theo đơn giá của nhà nước.</p>

        <h2>Điều 6: Phương thức thanh toán tiền thuê nhà</h2>
        <p class="clause-p">Tiền thuê nhà được thanh toán theo 01 (một) tháng/lần vào ngày <strong>${nfc(lhPaymentDay)}</strong> hàng tháng.</p>
        <p class="clause-p">Các chi phí khác được Bên B tự thanh toán với các cơ quan, đơn vị có liên quan khi được yêu cầu.</p>
        <p class="clause-p">Việc thanh toán tiền thuê nhà được thực hiện bằng đồng tiền Việt Nam theo hình thức trả trực tiếp bằng tiền mặt.</p>

        <h2>Điều 7: Quyền và nghĩa vụ của bên cho thuê nhà</h2>
        <p class="clause-p"><strong>7.1. Quyền lợi</strong></p>
        <p class="clause-p">- Yêu cầu Bên B thanh toán tiền thuê và chi phí khác đầy đủ, đúng hạn theo thoả thuận trong Hợp Đồng;</p>
        <p class="clause-p">- Yêu cầu Bên B phải sửa chữa phần hư hỏng, thiệt hại do lỗi của Bên B gây ra.</p>
        <p class="clause-p"><strong>7.2. Nghĩa vụ</strong></p>
        <p class="clause-p">- Bàn giao diện tích thuê cho Bên B theo đúng thời gian quy định trong Hợp đồng;</p>
        <p class="clause-p">- Đảm bảo việc cho thuê theo Hợp đồng này là đúng quy định của pháp luật;</p>
        <p class="clause-p">- Đảm bảo cho Bên B thực hiện quyền sử dụng diện tích thuê một cách độc lập và liên tục trong suốt thời hạn thuê, trừ trường hợp vi phạm pháp luật và/hoặc các quy định của Hợp đồng này;</p>
        <p class="clause-p">- Không xâm phạm trái phép đến tài sản của Bên B trong phần diện tích thuê. Nếu Bên A có những hành vi vi phạm gây thiệt hại cho Bên B trong thời gian thuê thì Bên A phải bồi thường;</p>
        <p class="clause-p">- Tuân thủ các nghĩa vụ khác theo thoả thuận tại Hợp đồng này hoặc/và các văn bản kèm theo Hợp đồng này; hoặc/và theo quy định của pháp luật Việt Nam.</p>

        <h2>Điều 8: Quyền và nghĩa vụ của bên thuê nhà</h2>
        <p class="clause-p"><strong>8.1. Quyền lợi</strong></p>
        <p class="clause-p">- Nhận bàn giao diện tích thuê theo đúng thoả thuận trong Hợp đồng;</p>
        <p class="clause-p">- Được sử dụng phần diện tích thuê làm nơi ở và các hoạt động hợp pháp khác;</p>
        <p class="clause-p">- Yêu cầu Bên A sửa chữa kịp thời những hư hỏng không phải do lỗi của Bên B trong phần diện tích thuê để bảo đảm an toàn;</p>
        <p class="clause-p">- Được tháo dỡ và đem ra khỏi phần diện tích thuê các tài sản, trang thiết bị của Bên B đã lắp đặt trong phần diện tích thuê khi hết thời hạn thuê hoặc đơn phương chấm dứt hợp đồng.</p>
        <p class="clause-p"><strong>8.2. Nghĩa vụ</strong></p>
        <p class="clause-p">- Sử dụng diện tích thuê đúng mục đích đã thỏa thuận, giữ gìn nhà ở và có trách nhiệm trong việc sửa chữa những hư hỏng do mình gây ra;</p>
        <p class="clause-p">- Thanh toán tiền đặt cọc, tiền thuê đầy đủ, đúng thời hạn đã thỏa thuận;</p>
        <p class="clause-p">- Trả lại diện tích thuê cho Bên A khi hết thời hạn thuê hoặc chấm dứt Hợp đồng thuê;</p>
        <p class="clause-p">- Mọi việc sửa chữa, cải tạo, lắp đặt bổ sung các trang thiết bị làm ảnh hưởng đến kết cấu của căn phòng, Bên B phải có văn bản thông báo cho Bên A và chỉ được tiến hành các công việc này sau khi có sự đồng ý bằng văn bản của Bên A;</p>
        <p class="clause-p">- Tuân thủ một cách chặt chẽ quy định tại Hợp đồng này và các quy định của pháp luật Việt Nam.</p>

        <h2>Điều 9: Đơn phương chấm dứt hợp đồng thuê nhà</h2>
        <p class="clause-p">Trong trường hợp một trong Hai Bên muốn đơn phương chấm dứt Hợp đồng trước hạn thì phải thông báo bằng văn bản cho bên kia trước 30 (ba mươi) ngày so với ngày mong muốn chấm dứt.</p>
        <p class="clause-p">Nếu một trong Hai Bên không thực hiện nghĩa vụ thông báo cho Bên kia thì sẽ phải bồi thường cho bên đó một khoản tiền thuê tương đương với thời gian không thông báo và các thiệt hại khác phát sinh do việc chấm dứt Hợp đồng trái quy định.</p>

        <h2>Điều 10: Điều khoản thi hành</h2>
        <p class="clause-p">- Hợp đồng này có hiệu lực kể từ ngày hai bên cùng ký kết;</p>
        <p class="clause-p">- Các Bên cam kết thực hiện nghiêm chỉnh và đầy đủ các thoả thuận trong Hợp đồng này trên tinh thần hợp tác, thiện chí;</p>
        <p class="clause-p">- Mọi sửa đổi, bổ sung đối với bất kỳ điều khoản nào của Hợp đồng phải được lập thành văn bản, có đầy đủ chữ ký của mỗi Bên. Văn bản sửa đổi bổ sung Hợp đồng có giá trị pháp lý như Hợp đồng, là một phần không tách rời của Hợp đồng này;</p>
        <p class="clause-p">- Hợp đồng được lập thành 02 (hai) bản có giá trị như nhau, mỗi Bên giữ 01 (một) bản để thực hiện.</p>

        <table class="sig-table font-serif">
          <tbody>
            <tr>
              <td>
                <div class="font-bold uppercase">BÊN CHO THUÊ</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(mbPartyAName)}</div>
              </td>
              <td>
                <div class="font-bold uppercase">BÊN THUÊ</div>
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
            <div>- CCCD số: <strong>${nfc(constPartyACccd)}</strong> &nbsp;|&nbsp; Địa chỉ: ${nfc(constPartyAAddress)}</div>
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
        <p class="clause-p"><strong>1. Địa điểm thi công:</strong></p>
        <p class="clause-p">Bên B nhận thi công/sửa chữa nhà ở dân dụng tại địa chỉ: <strong>${nfc(constSiteAddress)}</strong>.</p>
        <p class="clause-p"><strong>2. Phạm vi công việc mà Bên B đảm nhận:</strong></p>
        <p class="clause-p">Bên B nhận thực hiện toàn bộ phần nhân công (hoặc cả nhân công + vật liệu, tùy thỏa thuận) cho các hạng mục sau:</p>
        <p class="clause-p">- Sửa chữa/tân trang phần tường: trát, bả, sơn lại toàn bộ các mảng tường bị hư hỏng.</p>
        <p class="clause-p">- Thay thế hoặc lát lại gạch nền, sàn theo mẫu Bên A đã lựa chọn.</p>
        <p class="clause-p">- Thi công hệ thống điện nước: đi lại đường dây điện, thay ổ cắm, công tắc, thay đường ống cấp – thoát nước hỏng.</p>
        <p class="clause-p">- Sửa chữa, thay mới cửa, mái tôn, lan can, cầu thang (nếu có).</p>
        <p class="clause-p">- Các hạng mục khác theo phụ lục kèm theo hợp đồng (nếu có).</p>
        <p class="clause-p"><strong>3. Chất lượng &amp; tiêu chuẩn kỹ thuật:</strong></p>
        <p class="clause-p">- Công việc thi công/sửa chữa phải đảm bảo đúng quy trình xây dựng dân dụng, an toàn lao động và tiêu chuẩn chất lượng theo thỏa thuận.</p>
        <p class="clause-p">- Vật liệu (nếu Bên B cung cấp) phải đúng chủng loại, nhãn hiệu và chất lượng theo cam kết với Bên A.</p>

        <h2>Điều 2: Thời gian và tiến độ thực hiện</h2>
        <p class="clause-p">- Ngày khởi công: <strong>${fmtDate(constStartDate)}</strong>.</p>
        <p class="clause-p">- Ngày hoàn thành dự kiến: <strong>${fmtDate(constEndDate)}</strong>.</p>
        <p class="clause-p">- Tổng thời gian thực hiện dự kiến: <strong>${constDurationMonths}</strong> (không tính Thứ 7, Chủ nhật).</p>
        <p class="clause-p">Trường hợp bất khả kháng (thiên tai, dịch bệnh, thay đổi thiết kế theo yêu cầu Bên A), hai bên sẽ điều chỉnh tiến độ bằng văn bản.</p>

        <h2>Điều 3: Giá trị hợp đồng và phương thức thanh toán</h2>
        <p class="clause-p">- Tổng giá trị hợp đồng: <strong>${constTotalPrice} VNĐ</strong>.</p>
        <p class="clause-p">- Phương thức thanh toán:</p>
        <p class="clause-p">- Đợt 1: Bên A thanh toán cho Bên B số tiền là: <strong>${constDepositStage1} VNĐ</strong>.</p>
        <p class="clause-p">- Đợt 2: Số tiền còn lại là <strong>${constStage2Amount} VNĐ</strong> sẽ được Bên A thanh toán toàn bộ trước khi bàn giao hoàn thiện công trình.</p>

        <h2>Điều 4: Quyền và nghĩa vụ của các bên</h2>
        <p class="clause-p"><strong>1. Quyền và nghĩa vụ của Bên A:</strong></p>
        <p class="clause-p"><em>a. Quyền lợi:</em></p>
        <p class="clause-p">- Yêu cầu Bên B thi công đúng tiến độ, đúng chất lượng, đúng thiết kế/hạng mục đã thỏa thuận.</p>
        <p class="clause-p">- Giám sát, kiểm tra quá trình thi công; có quyền tạm ngừng hoặc từ chối nghiệm thu nếu công trình không đạt yêu cầu.</p>
        <p class="clause-p">- Yêu cầu thay đổi vật liệu, biện pháp thi công nếu phát hiện không phù hợp (khi đó hai bên phải lập biên bản điều chỉnh).</p>
        <p class="clause-p"><em>b. Nghĩa vụ:</em></p>
        <p class="clause-p">- Bàn giao mặt bằng thi công sạch sẽ, an toàn, đúng thời gian.</p>
        <p class="clause-p">- Thanh toán đúng hạn, đủ số tiền theo tiến độ hợp đồng.</p>
        <p class="clause-p">- Cung cấp điện, nước sinh hoạt/tạm thời phục vụ thi công (nếu có thỏa thuận).</p>
        <p class="clause-p">- Phối hợp giải quyết các vấn đề phát sinh liên quan đến hàng xóm, chính quyền địa phương trong quá trình thi công.</p>
        <p class="clause-p"><strong>2. Quyền và nghĩa vụ của Bên B:</strong></p>
        <p class="clause-p"><em>a. Quyền lợi:</em></p>
        <p class="clause-p">- Nhận đủ và đúng hạn số tiền theo hợp đồng.</p>
        <p class="clause-p">- Được quyền tạm ngừng thi công nếu Bên A không thực hiện nghĩa vụ thanh toán theo thỏa thuận (sau khi đã có văn bản thông báo).</p>
        <p class="clause-p"><em>b. Nghĩa vụ:</em></p>
        <p class="clause-p">- Thi công đúng thiết kế, đúng quy chuẩn xây dựng, đảm bảo chất lượng và an toàn lao động.</p>
        <p class="clause-p">- Chịu trách nhiệm về nhân công, phương tiện, máy móc, thiết bị phục vụ thi công.</p>
        <p class="clause-p">- Không tự ý thay đổi vật liệu, chủng loại, thiết kế nếu chưa có sự đồng ý bằng văn bản của Bên A.</p>
        <p class="clause-p">- Giữ gìn vệ sinh, an toàn khu vực thi công; hạn chế tiếng ồn, bụi bẩn gây ảnh hưởng đến môi trường và hàng xóm.</p>
        <p class="clause-p">- Sửa chữa, khắc phục các hư hỏng, sai sót trong quá trình thi công do lỗi của Bên B.</p>
        <p class="clause-p">- Thực hiện bảo hành công trình trong thời gian đã cam kết tại Điều 5.</p>

        <h2>Điều 5: Nghiệm thu, bàn giao và bảo hành</h2>
        <p class="clause-p">- Hai bên tiến hành nghiệm thu theo từng giai đoạn và nghiệm thu tổng thể khi công trình hoàn thành.</p>
        <p class="clause-p">- Thời gian bảo hành: <strong>${nfc(constWarrantyMonths)} tháng</strong> kể từ ngày bàn giao. Bảo hành chỉ áp dụng với lỗi kỹ thuật trong quá trình thi công, không áp dụng cho hao mòn tự nhiên hoặc tác động bên ngoài (ngập nước, hỏa hoạn, thiên tai, tự ý thay đổi kết cấu công trình...).</p>
        <p class="clause-p">- Trong thời gian bảo hành, Bên B có trách nhiệm sửa chữa, khắc phục miễn phí các lỗi do thi công.</p>

        <h2>Điều 6: Điều khoản chung</h2>
        <p class="clause-p">- Hợp đồng có hiệu lực từ ngày ký.</p>
        <p class="clause-p">- Mọi sửa đổi, bổ sung phải được lập thành văn bản và có chữ ký của hai bên.</p>
        <p class="clause-p">- Trường hợp phát sinh tranh chấp, hai bên cùng thương lượng; nếu không giải quyết được sẽ đưa ra Tòa án có thẩm quyền.</p>
        <p class="clause-p">- Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>
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
          <div style="text-align: center; margin: 4px 0;" class="no-indent">
            <span style="border-bottom: 2px solid #000; width: 140px; display: inline-block;"></span>
          </div>
        </div>

        <div class="text-center pt-3 pb-2 no-indent">
          <h1>BẢNG DỰ TOÁN HẠNG MỤC CÔNG VIỆC THI CÔNG</h1>
          <p class="font-italic text-[11pt] no-indent">(Đính kèm Hợp đồng thi công nhà ở ngày ${fmtDate(constContractDate)})</p>
        </div>

        <p class="clause-p"><strong>Chủ Đầu Tư (Bên A):</strong> ${nfc(constPartyAName)}</p>
        <p class="clause-p"><strong>Nhà Thầu Thi Công (Bên B):</strong> ${nfc(constPartyBName)}</p>
        <p class="clause-p"><strong>Công trình / Địa điểm:</strong> ${nfc(constSiteAddress)}</p>

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

        <table class="sig-table font-serif">
          <tbody>
            <tr>
              <td>
                <div class="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
                <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
                <div style="height: 70px;"></div>
                <div class="font-bold uppercase">${nfc(constPartyAName)}</div>
              </td>
              <td>
                <div class="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
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
        <p class="clause-p">- CCCD số: <strong>${nfc(saleSellerCccd)}</strong> &nbsp;|&nbsp; Ngày cấp: <strong>${nfc(saleSellerCccdDate)}</strong> &nbsp;|&nbsp; Nơi cấp: <strong>${nfc(saleSellerCccdPlace)}</strong></p>

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
        <p class="clause-p">Bên A thanh toán cho Bên B theo hình thức <strong>${salePayMethod === 'cash' ? 'tiền mặt' : 'chuyển khoản'}</strong>, thông tin cụ thể như sau:</p>
        ${salePayMethod === 'cash' ? `
        <p class="clause-p" style="margin-left: 24px;">– Người nhận tiền: <strong>${nfc(saleSellerName)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– CCCD số: <strong>${nfc(saleSellerCccd)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Ngày cấp: <strong>${saleSellerCccdDate}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Nơi cấp: <strong>${nfc(saleSellerCccdPlace)}</strong></p>
        ` : `
        <p class="clause-p" style="margin-left: 24px;">– Chủ tài khoản: <strong>${nfc(saleBankOwner || saleSellerName)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Số tài khoản: <strong>${nfc(saleBankAccNo)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Ngân hàng: <strong>${nfc(saleBankName)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Chi nhánh: <strong>${nfc(saleBankBranch)}</strong></p>
        `}

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

    const isSale = selectedTemplate === 'payment_request_sale';
    const buyerName = isSale ? saleBuyerName : constPartyAName;
    const sellerName = isSale ? saleSellerName : constPartyBName;
    const contractDateStr = isSale ? saleContractDate : constContractDate;
    const totalAmountStr = isSale ? totalSaleAmount.toLocaleString('vi-VN') : constTotalPrice;
    const docTypeTitle = isSale ? 'Hợp đồng mua bán hàng hóa' : 'Hợp đồng thi công nhà ở dân dụng';

    const stagesHtml = payStages.map((st) => {
      let actionText = '';
      if (st.status === 'paid') {
        actionText = `Bà/Ông ${nfc(buyerName)} đã thanh toán số tiền là:`;
      } else if (st.status === 'current') {
        actionText = `Bà/Ông ${nfc(buyerName)} thanh toán số tiền đợt này là:`;
      } else {
        actionText = `Số tiền các đợt thanh toán tiếp theo:`;
      }
      return `
        <p class="clause-p" style="margin-left: 24px; text-align: justify;">
          + <strong>${nfc(st.stageName)}:</strong> ${actionText} <strong>${st.amount} đồng</strong> ${st.note ? `<span class="font-italic">(${nfc(st.note)})</span>` : ''}
        </p>
      `;
    }).join('');

    let infoHtml = '';
    if (payMethodType === 'cash') {
      const name = payCashName || sellerName;
      const cccd = payCashCccd || (isSale ? saleSellerCccd : constPartyBCccd);
      const cccdDate = payCashCccdDate || (isSale ? saleSellerCccdDate : '03/03/2022');
      const cccdPlace = payCashCccdPlace || 'CCS QLHC về TTXH';

      infoHtml = `
        <p class="clause-p" style="margin-left: 24px;">– Họ & tên: <strong>${nfc(name)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– CCCD số: <strong>${nfc(cccd)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Ngày cấp: <strong>${nfc(cccdDate)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Nơi cấp: <strong>${nfc(cccdPlace)}</strong></p>
      `;
    } else {
      const owner = payBankOwner || sellerName;
      infoHtml = `
        <p class="clause-p" style="margin-left: 24px;">– Họ tên chủ tài khoản: <strong>${nfc(owner)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Số tài khoản: <strong>${nfc(payBankAccNo)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Ngân hàng: <strong>${nfc(payBankName)}</strong></p>
        <p class="clause-p" style="margin-left: 24px;">– Chi nhánh: <strong>${nfc(payBankBranch)}</strong></p>
      `;
    }

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

      <p class="clause-p">Kính gửi: <strong>Bà/Ông ${nfc(buyerName)}</strong></p>

      <p class="clause-p">Căn cứ ${docTypeTitle} ký ngày: <strong>${fmtDate(contractDateStr)}</strong> giữa Bà/Ông ${nfc(buyerName)} và Ông/Bà ${nfc(sellerName)}, tôi xin đề nghị thanh toán theo các nội dung sau:</p>

      <p class="clause-p"><strong>1. Giá trị hợp đồng:</strong> <strong>${totalAmountStr} đồng</strong></p>
      <p class="clause-p" style="margin-left: 24px;">(Bằng chữ: ${isSale ? 'Năm trăm chín mươi ba triệu sáu trăm nghìn đồng' : 'Một tỷ không trăm lẻ ba triệu bảy trăm ngàn đồng'})</p>

      <p class="clause-p"><strong>2. Thời hạn thanh toán:</strong></p>
      ${stagesHtml}

      <p class="clause-p"><strong>3. Thông tin thanh toán (${payMethodType === 'cash' ? 'Thanh toán tiền mặt' : 'Thanh toán chuyển khoản'}):</strong></p>
      ${infoHtml}

      <p class="clause-p pt-3">Kính mong Bà/Ông ${nfc(buyerName)} sắp xếp thanh toán số tiền nêu trên theo đúng tiến độ đã thỏa thuận trong hợp đồng.</p>

      <p class="clause-p">Trân trọng!</p>

      <table class="sig-table font-serif">
        <tbody>
          <tr>
            <td style="width: 50%;"></td>
            <td style="width: 50%; text-align: center;">
              <div class="font-bold uppercase">Người đề nghị thanh toán</div>
              <div class="font-italic text-[11pt]">(Ký và ghi rõ họ tên)</div>
              <div style="height: 70px;"></div>
              <div class="font-bold uppercase">${nfc(payMethodType === 'cash' ? (payCashName || sellerName) : (payBankOwner || sellerName))}</div>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  };

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">

      <TemplateSelector
        styles={styles}
        isLight={isLight}
        selectedTemplate={selectedTemplate}
        setSelectedTemplate={setSelectedTemplate}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
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
            lhFloors={lhFloors} setLhFloors={setLhFloors}
            lhLandArea={lhLandArea} setLhLandArea={setLhLandArea}
            lhHouseArea={lhHouseArea} setLhHouseArea={setLhHouseArea}
            lhHandoverDate={lhHandoverDate} setLhHandoverDate={setLhHandoverDate}
            lhPaymentDay={lhPaymentDay} setLhPaymentDay={setLhPaymentDay}
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
            constWarrantyMonths={constWarrantyMonths} setConstWarrantyMonths={setConstWarrantyMonths}
            constItems={constItems} setConstItems={setConstItems}
            handleAddConstItem={handleAddConstItem}
            saleContractDate={saleContractDate} setSaleContractDate={setSaleContractDate}
            saleBuyerName={saleBuyerName} setSaleBuyerName={setSaleBuyerName}
            saleBuyerAddress={saleBuyerAddress} setSaleBuyerAddress={setSaleBuyerAddress}
            saleSellerName={saleSellerName} setSaleSellerName={setSaleSellerName}
            saleSellerCccd={saleSellerCccd} setSaleSellerCccd={setSaleSellerCccd}
            saleSellerCccdDate={saleSellerCccdDate} setSaleSellerCccdDate={setSaleSellerCccdDate}
            saleSellerCccdPlace={saleSellerCccdPlace} setSaleSellerCccdPlace={setSaleSellerCccdPlace}
            salePayMethod={salePayMethod} setSalePayMethod={setSalePayMethod}
            saleBankOwner={saleBankOwner} setSaleBankOwner={setSaleBankOwner}
            saleBankAccNo={saleBankAccNo} setSaleBankAccNo={setSaleBankAccNo}
            saleBankName={saleBankName} setSaleBankName={setSaleBankName}
            saleBankBranch={saleBankBranch} setSaleBankBranch={setSaleBankBranch}
            saleStartDate={saleStartDate} setSaleStartDate={setSaleStartDate}
            saleEndDate={saleEndDate} setSaleEndDate={setSaleEndDate}
            salePaymentStage1={salePaymentStage1} setSalePaymentStage1={setSalePaymentStage1}
            saleItems={saleItems} setSaleItems={setSaleItems}
            handleAddSaleItem={handleAddSaleItem}
            payMethodType={payMethodType} setPayMethodType={setPayMethodType}
            payCashName={payCashName} setPayCashName={setPayCashName}
            payCashCccd={payCashCccd} setPayCashCccd={setPayCashCccd}
            payCashCccdDate={payCashCccdDate} setPayCashCccdDate={setPayCashCccdDate}
            payCashCccdPlace={payCashCccdPlace} setPayCashCccdPlace={setPayCashCccdPlace}
            payBankOwner={payBankOwner} setPayBankOwner={setPayBankOwner}
            payBankAccNo={payBankAccNo} setPayBankAccNo={setPayBankAccNo}
            payBankName={payBankName} setPayBankName={setPayBankName}
            payBankBranch={payBankBranch} setPayBankBranch={setPayBankBranch}
            deposit={deposit} setDeposit={setDeposit}
            payStages={payStages} setPayStages={setPayStages}
            handleAddPayStage={handleAddPayStage}
          />
        </div>

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
