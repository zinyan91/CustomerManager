import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { formatMoneyInput, fmtDate } from '../../lib/utils';
import {
  FileText, Download, Printer, CheckCircle, Building, User, Calendar, DollarSign, ListChecks, Plus, Trash2, CreditCard
} from 'lucide-react';
import { DateInput } from '../DateInput';

// Helper: Normalize decomposed Vietnamese Unicode characters (NFD -> NFC)
const nfc = (str: string) => (str ? str.normalize('NFC') : '');

// Interface for Sale Item in Multi-Item Table
interface SaleItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  price: number;
}

// Helper: Format Word HTML for export (.doc) according to Decree 30/2020/ND-CP
function exportToWordDoc(filename: string, docHtml: string) {
  const wordDocumentHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <title>${filename}</title>
      <!--[if gte mso 9]>
      <xml>
        <w:WordDocument>
          <w:View>Print</w:View>
          <w:Zoom>100</w:Zoom>
          <w:DoNotOptimizeForBrowser/>
        </w:WordDocument>
      </xml>
      <![endif]-->
      <style>
        @page WordSection1 {
          size: 210mm 297mm; /* A4 */
          margin: 25mm 20mm 20mm 30mm; /* Lề trên 2.5cm, lề dưới 2.0cm, lề phải 2.0cm, lề trái 3.0cm chuẩn NĐ 30 */
        }
        div.WordSection1 { page: WordSection1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; color: #000000; }
        h1 { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-top: 14pt; margin-bottom: 12pt; }
        h2 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 10pt; margin-bottom: 10pt; }
        p.clause-p { margin-top: 3pt; margin-bottom: 6pt; text-align: justify; text-indent: 1.27cm; line-height: 1.5; }
        .no-indent { text-indent: 0 !important; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-italic { font-style: italic; }
        .table-doc { border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; }
        .table-doc th, .table-doc td { border: 1px solid #000; padding: 6pt 8pt; font-size: 12pt; }
        .sig-table { width: 100%; margin-top: 30pt; border-collapse: collapse; border: none; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
        .sig-table td { width: 50%; text-align: center; vertical-align: top; border: none; padding: 0; }
      </style>
    </head>
    <body>
      <div class="WordSection1">
        ${docHtml}
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([wordDocumentHtml], { type: 'application/msword;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.doc`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// Helper: Open Clean PDF Print Window for Document ONLY (No Web UI)
function exportToPDFOnly(filename: string, docHtml: string) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const pdfHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>${filename}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 25mm 20mm 20mm 30mm; /* Lề chuẩn NĐ 30: Trên 2.5cm, Dưới 2.0cm, Phải 2.0cm, Trái 3.0cm */
        }
        body {
          font-family: 'Times New Roman', Times, serif;
          font-size: 13pt;
          line-height: 1.5;
          color: #000000;
          margin: 0;
          padding: 0;
        }
        h1 { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-top: 14pt; margin-bottom: 12pt; }
        h2 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 10pt; margin-bottom: 10pt; }
        p.clause-p { margin-top: 3pt; margin-bottom: 6pt; text-align: justify; text-indent: 1.27cm; line-height: 1.5; }
        .no-indent { text-indent: 0 !important; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .table-doc { border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; }
        .table-doc th, .table-doc td { border: 1px solid #000; padding: 6pt 8pt; font-size: 12pt; }
        .sig-table { width: 100%; margin-top: 30pt; border-collapse: collapse; border: none; }
        .sig-table td { width: 50%; text-align: center; vertical-align: top; border: none; padding: 0; }
      </style>
    </head>
    <body>
      ${docHtml}
      <script>
        window.onload = function() {
          window.print();
        };
      </script>
    </body>
    </html>
  `;

  printWindow.document.write(pdfHtml);
  printWindow.document.close();
}

export const DocumentTemplateView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const [selectedTemplate, setSelectedTemplate] = useState<
    'lease_mb' | 'construction' | 'sale_contract' | 'lease_house' | 'payment_request'
  >('lease_mb');

  // ──────────────────────────────────────────────────────────────────────────
  // FORM STATE 1: HỢP ĐỒNG THUÊ MẶT BẰNG
  // ──────────────────────────────────────────────────────────────────────────
  const [mbContractDate, setMbContractDate] = useState('2026-04-23');
  const [mbPartyAName, setMbPartyAName] = useState('ĐỖ THỊ HIẾU');
  const [mbPartyACccd, setMbPartyACccd] = useState('0791 7802 5859');
  const [mbPartyACccdDate, setMbPartyACccdDate] = useState('29/11/2021');
  const mbPartyACccdPlace = 'Cục Cảnh sát QLHC về TTXH';
  const [mbPartyAAddress, setMbPartyAAddress] = useState('233/3/1 Đường Vĩnh Viễn, Phường 4, Quận 10, Tp.HCM');
  
  const [mbPartyBName, setMbPartyBName] = useState('NGÔ NHỊ ĐẠT');
  const [mbPartyBCccd, setMbPartyBCccd] = useState('0343 0300 4676');
  const [mbPartyBCccdDate, setMbPartyBCccdDate] = useState('03/03/2022');
  const mbPartyBCccdPlace = 'Cục Cảnh sát QLHC về TTXH';
  const [mbPartyBAddress, setMbPartyBAddress] = useState('Bình Đường, An Bình, Tp. Dĩ An, Bình Dương');

  const [mbLocation, setMbLocation] = useState('1 phần thửa đất số 45 Tờ bản đồ số 9, Địa chỉ 478/34 Hòa Hảo, Phường 5, Quận 10, Tp.HCM');
  const [mbStartDate, setMbStartDate] = useState('2026-04-23');
  const [mbEndDate, setMbEndDate] = useState('2027-04-22');
  const [mbMonthlyPrice, setMbMonthlyPrice] = useState('55.000.000');
  const [mbDepositAmount, setMbDepositAmount] = useState('72.000.000');

  // ──────────────────────────────────────────────────────────────────────────
  // FORM STATE 2: HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG
  // ──────────────────────────────────────────────────────────────────────────
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

  // ──────────────────────────────────────────────────────────────────────────
  // FORM STATE 3: HỢP ĐỒNG MUA BÁN HÀNG HÓA (NGÔN TỪ NGUYÊN VĂN EXCEL)
  // ──────────────────────────────────────────────────────────────────────────
  const [saleContractDate, setSaleContractDate] = useState('2026-04-09');
  const [saleBuyerName, setSaleBuyerName] = useState('LÊ THỊ CẢNH');
  const [saleBuyerAddress, setSaleBuyerAddress] = useState('Kỳ Anh, Hà Tĩnh');

  const [saleSellerName, setSaleSellerName] = useState('PHẠM HỒNG ĐỨC');
  const [saleSellerCccd, setSaleSellerCccd] = useState('0720 7700 0901');
  const [saleSellerCccdDate, setSaleSellerCccdDate] = useState('25/05/2023');
  const saleSellerCccdPlace = 'CCS QLHC về TTXH';

  const [saleStartDate, setSaleStartDate] = useState('2026-04-09');
  const [saleEndDate, setSaleEndDate] = useState('2026-05-09');

  const [salePaymentStage1, setSalePaymentStage1] = useState('93.600.000');

  // 13 Nguyên văn mặt hàng từ file Excel 1. HĐMB
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
    const newItem: SaleItem = {
      id: Date.now().toString(),
      name: 'Mặt hàng mới',
      unit: 'Chai',
      quantity: 1,
      price: 100000
    };
    setSaleItems([...saleItems, newItem]);
  };

  const handleRemoveSaleItem = (id: string) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter(item => item.id !== id));
    }
  };

  const handleUpdateSaleItem = (id: string, field: keyof SaleItem, value: any) => {
    setSaleItems(saleItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const totalSaleAmount = saleItems.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const stage1PaidNum = parseFloat(salePaymentStage1.replace(/\D/g, '')) || 0;
  const stage2RemainingNum = Math.max(0, totalSaleAmount - stage1PaidNum);

  // ──────────────────────────────────────────────────────────────────────────
  // FORM STATE 4: HỢP ĐỒNG THUÊ NHÀ Ở DÂN DỤNG NGUYÊN VĂN
  // ──────────────────────────────────────────────────────────────────────────
  const [houseContractDate, setHouseContractDate] = useState('2026-04-15');
  const [housePartyAName, setHousePartyAName] = useState('ÔNG NGUYỄN VĂN THÀNH');
  const [housePartyACccd, setHousePartyACccd] = useState('0790 7500 1234');
  const [housePartyAAddress, setHousePartyAAddress] = useState('123 Lê Hồng Phong, Phường 2, Quận 10, Tp.HCM');

  const [housePartyBName, setHousePartyBName] = useState('BÀ PHẠM THỊ THU HÀ');
  const [housePartyBCccd, setHousePartyBCccd] = useState('0340 8800 5678');
  const [housePartyBAddress, setHousePartyBAddress] = useState('45 Nguyễn Trãi, Phường 3, Quận 5, Tp.HCM');

  const [houseAddress, setHouseAddress] = useState('Căn nhà nguyên căn số 478/34 Hòa Hảo, Phường 5, Quận 10, Tp.HCM');
  const [houseStartDate, setHouseStartDate] = useState('2026-04-15');
  const [houseEndDate, setHouseEndDate] = useState('2027-04-14');
  const [houseMonthlyPrice, setHouseMonthlyPrice] = useState('15.000.000');
  const [houseDepositAmount, setHouseDepositAmount] = useState('30.000.000');

  // ──────────────────────────────────────────────────────────────────────────
  // FORM STATE 5: GIẤY ĐỀ NGHỊ THANH TOÁN (FILE WORD ĐỘC LẬP)
  // ──────────────────────────────────────────────────────────────────────────
  const [prDate, setPrDate] = useState('2026-04-09');
  const [prRecipient, setPrRecipient] = useState('Bà Lê Thị Cảnh');
  const [prContractRef, setPrContractRef] = useState('Căn cứ hợp đồng mua bán hàng hóa ký ngày 09/04/2026 giữa Bà Lê Thị Cảnh và Ông Phạm Hồng Đức');
  const [prTotalContractValue, setPrTotalContractValue] = useState('593.600.000');
  const [prStage1Paid, setPrStage1Paid] = useState('93.600.000');
  const [prStage2Request, setPrStage2Request] = useState('500.000.000');
  const [prRequesterName, setPrRequesterName] = useState('PHẠM HỒNG ĐỨC');
  const [prRequesterCccd, setPrRequesterCccd] = useState('0720 7700 0901');

  // Dynamic Theme Classes
  const containerCardBg = isLight
    ? 'bg-white border-slate-200 text-slate-900 shadow-sm'
    : 'bg-slate-900 border-slate-800 text-slate-100 shadow-xl';

  const sectionBoxBg = isLight
    ? 'bg-slate-50 border-slate-200 text-slate-900'
    : 'bg-slate-950 border-slate-800 text-slate-100';

  const inputStyle = isLight
    ? 'bg-white border-slate-300 text-slate-900 focus:border-sky-500'
    : 'bg-slate-950 border-slate-800 text-slate-200 focus:border-sky-500';

  return (
    <div className="space-y-4 text-xs max-w-7xl mx-auto pb-10 transition-colors duration-200 print:p-0 print:max-w-none">
      {/* CSS PRINT & LEGAL FORMATTING MEDIA STYLING */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; font-size: 13pt !important; font-family: 'Times New Roman', Times, serif !important; }
          .print\\:hidden { display: none !important; }
          aside, header { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          .doc-preview-sheet { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; max-width: none !important; }
          @page { size: portrait; margin: 25mm 20mm 20mm 30mm; }
        }
        .doc-preview-sheet {
          font-family: 'Times New Roman', Times, serif !important;
          font-size: 13pt !important;
          line-height: 1.5 !important;
          color: #0f172a !important;
        }
        .doc-preview-sheet p.clause-p {
          text-align: justify !important;
          text-indent: 1.27cm !important;
          margin-top: 3pt !important;
          margin-bottom: 6pt !important;
          line-height: 1.5 !important;
        }
        .doc-preview-sheet .no-indent {
          text-indent: 0 !important;
        }
      `}</style>

      {/* ── HEADER TITLE & TEMPLATE SELECTOR ── */}
      <div className={`${containerCardBg} p-4 rounded-2xl border flex flex-wrap items-center justify-between gap-3 print:hidden`}>
        <div>
          <h2 className="text-base font-bold uppercase tracking-tight flex items-center space-x-2 text-sky-500">
            <FileText className="w-5 h-5" />
            <span>SOẠN THẢO & QUẢN LÝ BIỂU MẪU VĂN BẢN HỢP ĐỒNG</span>
          </h2>

        </div>
      </div>

      {/* ── TEMPLATE SELECTOR CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
        <button
          onClick={() => setSelectedTemplate('lease_mb')}
          className={`p-3.5 rounded-2xl border text-center transition-all ${
            selectedTemplate === 'lease_mb'
              ? 'bg-sky-600 text-white font-bold shadow-md border-sky-500 scale-[1.01]'
              : `${containerCardBg} hover:border-sky-500`
          }`}
        >
          <div className="flex items-center justify-center space-x-2 font-bold text-xs uppercase">
            <Building className="w-4 h-4 shrink-0" />
            <span>1. HĐ Thuê Mặt Bằng</span>
          </div>
        </button>

        <button
          onClick={() => setSelectedTemplate('construction')}
          className={`p-3.5 rounded-2xl border text-center transition-all ${
            selectedTemplate === 'construction'
              ? 'bg-sky-600 text-white font-bold shadow-md border-sky-500 scale-[1.01]'
              : `${containerCardBg} hover:border-sky-500`
          }`}
        >
          <div className="flex items-center justify-center space-x-2 font-bold text-xs uppercase">
            <ListChecks className="w-4 h-4 shrink-0" />
            <span>2. HĐ Thi Công Nhà Ở</span>
          </div>
        </button>

        <button
          onClick={() => setSelectedTemplate('sale_contract')}
          className={`p-3.5 rounded-2xl border text-center transition-all ${
            selectedTemplate === 'sale_contract'
              ? 'bg-sky-600 text-white font-bold shadow-md border-sky-500 scale-[1.01]'
              : `${containerCardBg} hover:border-sky-500`
          }`}
        >
          <div className="flex items-center justify-center space-x-2 font-bold text-xs uppercase">
            <DollarSign className="w-4 h-4 shrink-0" />
            <span>3. HĐ Mua Bán Hàng Hóa</span>
          </div>
        </button>

        <button
          onClick={() => setSelectedTemplate('lease_house')}
          className={`p-3.5 rounded-2xl border text-center transition-all ${
            selectedTemplate === 'lease_house'
              ? 'bg-sky-600 text-white font-bold shadow-md border-sky-500 scale-[1.01]'
              : `${containerCardBg} hover:border-sky-500`
          }`}
        >
          <div className="flex items-center justify-center space-x-2 font-bold text-xs uppercase">
            <User className="w-4 h-4 shrink-0" />
            <span>4. HĐ Thuê Nhà Ở</span>
          </div>
        </button>

        <button
          onClick={() => setSelectedTemplate('payment_request')}
          className={`p-3.5 rounded-2xl border text-center transition-all ${
            selectedTemplate === 'payment_request'
              ? 'bg-emerald-600 text-white font-bold shadow-md border-emerald-500 scale-[1.01]'
              : `${containerCardBg} hover:border-emerald-500`
          }`}
        >
          <div className="flex items-center justify-center space-x-2 font-bold text-xs uppercase">
            <CreditCard className="w-4 h-4 shrink-0" />
            <span>5. Đề Nghị Thanh Toán</span>
          </div>
        </button>
      </div>

      {/* ── SPLIT VIEW LAYOUT: LEFT INPUT FORM + RIGHT LIVE PREVIEW ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* ────────────────────────────────────────────────────────────────────────── */}
        {/* LEFT COLUMN: KHUNG NHẬP LIỆU BIẾN SỐ (FORM INPUTS) */}
        {/* ────────────────────────────────────────────────────────────────────────── */}
        <div className={`lg:col-span-5 ${containerCardBg} rounded-2xl p-5 border space-y-4 print:hidden`}>
          <div className="text-xs font-bold text-sky-500 uppercase tracking-wider flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
            <span className="flex items-center space-x-2">
              <Calendar className="w-4 h-4" />
              <span>KHUNG NHẬP THÔNG TIN VĂN BẢN</span>
            </span>
            <span className="text-[11px] text-emerald-500 font-semibold flex items-center space-x-1">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Live Preview Auto Sync</span>
            </span>
          </div>

          {/* FORM BIẾN SỐ 1: HỢP ĐỒNG THUÊ MẶT BẰNG */}
          {selectedTemplate === 'lease_mb' && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-medium mb-1">Ngày lập hợp đồng</label>
                <DateInput
                  value={mbContractDate}
                  onChange={val => setMbContractDate(val)}
                  className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                />
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px]">BÊN A (BÊN CHO THUÊ MẶT BẰNG)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Bên A *</label>
                  <input
                    type="text"
                    value={mbPartyAName}
                    onChange={e => setMbPartyAName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                    <input
                      type="text"
                      value={mbPartyACccd}
                      onChange={e => setMbPartyACccd(e.target.value)}
                      className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Ngày cấp</label>
                    <input
                      type="text"
                      value={mbPartyACccdDate}
                      onChange={e => setMbPartyACccdDate(e.target.value)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Nơi ĐKTT</label>
                  <input
                    type="text"
                    value={mbPartyAAddress}
                    onChange={e => setMbPartyAAddress(e.target.value)}
                    className={`w-full rounded-lg p-2 border ${inputStyle}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">BÊN B (BÊN THUÊ MẶT BẰNG)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Bên B *</label>
                  <input
                    type="text"
                    value={mbPartyBName}
                    onChange={e => setMbPartyBName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                    <input
                      type="text"
                      value={mbPartyBCccd}
                      onChange={e => setMbPartyBCccd(e.target.value)}
                      className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Ngày cấp</label>
                    <input
                      type="text"
                      value={mbPartyBCccdDate}
                      onChange={e => setMbPartyBCccdDate(e.target.value)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Nơi ĐKTT</label>
                  <input
                    type="text"
                    value={mbPartyBAddress}
                    onChange={e => setMbPartyBAddress(e.target.value)}
                    className={`w-full rounded-lg p-2 border ${inputStyle}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-amber-500 uppercase text-[11px]">MẶT BẰNG & GIÁ CẢ</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Địa chỉ mặt bằng</label>
                  <textarea
                    rows={2}
                    value={mbLocation}
                    onChange={e => setMbLocation(e.target.value)}
                    className={`w-full rounded-lg p-2 border text-xs ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Ngày bắt đầu thuê</label>
                    <DateInput
                      value={mbStartDate}
                      onChange={val => setMbStartDate(val)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Ngày kết thúc thuê</label>
                    <DateInput
                      value={mbEndDate}
                      onChange={val => setMbEndDate(val)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Đơn giá thuê (VNĐ)</label>
                    <input
                      type="text"
                      value={mbMonthlyPrice}
                      onChange={e => setMbMonthlyPrice(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-emerald-600 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Tiền ký quỹ (VNĐ)</label>
                    <input
                      type="text"
                      value={mbDepositAmount}
                      onChange={e => setMbDepositAmount(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-sky-600 border ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORM BIẾN SỐ 2: HỢP ĐỒNG THI CÔNG NHÀ Ở */}
          {selectedTemplate === 'construction' && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-medium mb-1">Ngày lập hợp đồng thi công</label>
                <DateInput
                  value={constContractDate}
                  onChange={val => setConstContractDate(val)}
                  className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                />
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px]">BÊN A (THUÊ THI CÔNG)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Bên A *</label>
                  <input
                    type="text"
                    value={constPartyAName}
                    onChange={e => setConstPartyAName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                    <input
                      type="text"
                      value={constPartyACccd}
                      onChange={e => setConstPartyACccd(e.target.value)}
                      className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Địa chỉ Bên A</label>
                    <input
                      type="text"
                      value={constPartyAAddress}
                      onChange={e => setConstPartyAAddress(e.target.value)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">BÊN B (NHẬN THI CÔNG)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Bên B *</label>
                  <input
                    type="text"
                    value={constPartyBName}
                    onChange={e => setConstPartyBName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                  <input
                    type="text"
                    value={constPartyBCccd}
                    onChange={e => setConstPartyBCccd(e.target.value)}
                    className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-amber-500 uppercase text-[11px]">CÔNG TRÌNH & GIÁ TRỊ</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Địa chỉ công trình</label>
                  <textarea
                    rows={2}
                    value={constSiteAddress}
                    onChange={e => setConstSiteAddress(e.target.value)}
                    className={`w-full rounded-lg p-2 border text-xs ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Ngày khởi công</label>
                    <DateInput
                      value={constStartDate}
                      onChange={val => setConstStartDate(val)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Ngày hoàn thành</label>
                    <DateInput
                      value={constEndDate}
                      onChange={val => setConstEndDate(val)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Tổng giá trị (VNĐ)</label>
                    <input
                      type="text"
                      value={constTotalPrice}
                      onChange={e => setConstTotalPrice(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-emerald-600 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Đợt 1 cọc (VNĐ)</label>
                    <input
                      type="text"
                      value={constDepositStage1}
                      onChange={e => {
                        const val = formatMoneyInput(e.target.value);
                        setConstDepositStage1(val);
                        const totalNum = parseFloat(constTotalPrice.replace(/\D/g, '')) || 0;
                        const depNum = parseFloat(val.replace(/\D/g, '')) || 0;
                        setConstStage2Amount((totalNum - depNum).toLocaleString('vi-VN'));
                      }}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-sky-600 border ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORM BIẾN SỐ 3: HỢP ĐỒNG MUA BÁN HÀNG HÓA */}
          {selectedTemplate === 'sale_contract' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium mb-1">Ngày hợp đồng</label>
                  <DateInput
                    value={saleContractDate}
                    onChange={val => setSaleContractDate(val)}
                    className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Ngày bắt đầu</label>
                  <DateInput
                    value={saleStartDate}
                    onChange={val => setSaleStartDate(val)}
                    className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Ngày kết thúc</label>
                  <DateInput
                    value={saleEndDate}
                    onChange={val => setSaleEndDate(val)}
                    className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                  />
                </div>
              </div>

              {/* BÊN MUA (BÊN A) */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px]">BÊN MUA (BÊN A)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Bên Mua *</label>
                  <input
                    type="text"
                    value={saleBuyerName}
                    onChange={e => setSaleBuyerName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Địa chỉ Bên Mua</label>
                  <input
                    type="text"
                    value={saleBuyerAddress}
                    onChange={e => setSaleBuyerAddress(e.target.value)}
                    className={`w-full rounded-lg p-2 border ${inputStyle}`}
                  />
                </div>
              </div>

              {/* BÊN BÁN (BÊN B) */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">BÊN BÁN (BÊN B)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Bên Bán *</label>
                  <input
                    type="text"
                    value={saleSellerName}
                    onChange={e => setSaleSellerName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                    <input
                      type="text"
                      value={saleSellerCccd}
                      onChange={e => setSaleSellerCccd(e.target.value)}
                      className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Ngày cấp</label>
                    <input
                      type="text"
                      value={saleSellerCccdDate}
                      onChange={e => setSaleSellerCccdDate(e.target.value)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>

              {/* THANH TOÁN LẦN 1 & LẦN 2 */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-amber-500 uppercase text-[11px]">TIẾN ĐỘ THANH TOÁN HỢP ĐỒNG</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Thanh toán Lần 1 (VNĐ)</label>
                    <input
                      type="text"
                      value={salePaymentStage1}
                      onChange={e => setSalePaymentStage1(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-emerald-600 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Thanh toán Lần 2 (VNĐ)</label>
                    <input
                      type="text"
                      readOnly
                      value={stage2RemainingNum.toLocaleString('vi-VN')}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-rose-500 border bg-slate-100 dark:bg-slate-900`}
                    />
                  </div>
                </div>
              </div>

              {/* BẢNG ĐA MẶT HÀNG MUA BÁN */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${sectionBoxBg}`}>
                <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-amber-500 uppercase text-[11px]">DANH SÁCH HÀNG HÓA MUA BÁN ({saleItems.length} MẶT HÀNG)</span>
                  <button
                    type="button"
                    onClick={handleAddSaleItem}
                    className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Mặt Hàng</span>
                  </button>
                </div>

                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {saleItems.map((item, index) => (
                    <div key={item.id} className={`p-3 rounded-lg border space-y-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-400">#STT {index + 1}</span>
                        {saleItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSaleItem(item.id)}
                            className="text-rose-500 hover:text-rose-600 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium mb-0.5 text-slate-400">Tên Hàng Hóa</label>
                        <input
                          type="text"
                          value={item.name}
                          onChange={e => handleUpdateSaleItem(item.id, 'name', e.target.value)}
                          className={`w-full rounded-md p-1.5 font-semibold text-xs border ${inputStyle}`}
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium mb-0.5 text-slate-400">ĐVT</label>
                          <input
                            type="text"
                            value={item.unit}
                            onChange={e => handleUpdateSaleItem(item.id, 'unit', e.target.value)}
                            className={`w-full rounded-md p-1.5 text-xs border ${inputStyle}`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium mb-0.5 text-slate-400">Số lượng</label>
                          <input
                            type="number"
                            min={1}
                            value={item.quantity}
                            onChange={e => handleUpdateSaleItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            className={`w-full rounded-md p-1.5 font-mono text-xs border ${inputStyle}`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium mb-0.5 text-slate-400">Đơn Giá (VNĐ)</label>
                          <input
                            type="text"
                            value={item.price.toLocaleString('vi-VN')}
                            onChange={e => handleUpdateSaleItem(item.id, 'price', parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
                            className={`w-full rounded-md p-1.5 font-mono font-bold text-emerald-600 text-xs border ${inputStyle}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center justify-between font-semibold ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className="text-slate-500">TỔNG GIÁ TRỊ THANH TOÁN:</span>
                  <span className="font-mono font-bold text-emerald-600 text-sm">{totalSaleAmount.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>
            </div>
          )}

          {/* FORM BIẾN SỐ 4: HỢP ĐỒNG THUÊ NHÀ Ở DÂN DỤNG */}
          {selectedTemplate === 'lease_house' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-medium mb-1">Ngày lập hợp đồng</label>
                  <DateInput
                    value={houseContractDate}
                    onChange={val => setHouseContractDate(val)}
                    className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Ngày bắt đầu</label>
                  <DateInput
                    value={houseStartDate}
                    onChange={val => setHouseStartDate(val)}
                    className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Ngày kết thúc</label>
                  <DateInput
                    value={houseEndDate}
                    onChange={val => setHouseEndDate(val)}
                    className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px]">BÊN CHO THUÊ NHÀ (BÊN A)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Chủ Nhà *</label>
                  <input
                    type="text"
                    value={housePartyAName}
                    onChange={e => setHousePartyAName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                  <input
                    type="text"
                    value={housePartyACccd}
                    onChange={e => setHousePartyACccd(e.target.value)}
                    className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Địa chỉ Bên A</label>
                  <input
                    type="text"
                    value={housePartyAAddress}
                    onChange={e => setHousePartyAAddress(e.target.value)}
                    className={`w-full rounded-lg p-2 border ${inputStyle}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">BÊN THUÊ NHÀ (BÊN B)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Người Thuê *</label>
                  <input
                    type="text"
                    value={housePartyBName}
                    onChange={e => setHousePartyBName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                  <input
                    type="text"
                    value={housePartyBCccd}
                    onChange={e => setHousePartyBCccd(e.target.value)}
                    className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Địa chỉ Bên B</label>
                  <input
                    type="text"
                    value={housePartyBAddress}
                    onChange={e => setHousePartyBAddress(e.target.value)}
                    className={`w-full rounded-lg p-2 border ${inputStyle}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-amber-500 uppercase text-[11px]">THÔNG TIN CĂN NHÀ THUÊ</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Địa chỉ căn nhà thuê</label>
                  <textarea
                    rows={2}
                    value={houseAddress}
                    onChange={e => setHouseAddress(e.target.value)}
                    className={`w-full rounded-lg p-2 border text-xs ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Giá thuê (VNĐ/tháng)</label>
                    <input
                      type="text"
                      value={houseMonthlyPrice}
                      onChange={e => setHouseMonthlyPrice(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-emerald-600 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Tiền đặt cọc (VNĐ)</label>
                    <input
                      type="text"
                      value={houseDepositAmount}
                      onChange={e => setHouseDepositAmount(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-sky-600 border ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FORM BIẾN SỐ 5: GIẤY ĐỀ NGHỊ THANH TOÁN */}
          {selectedTemplate === 'payment_request' && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-medium mb-1">Ngày lập đề nghị thanh toán</label>
                <DateInput
                  value={prDate}
                  onChange={val => setPrDate(val)}
                  className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                />
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">NƠI NHẬN & CĂN CỨ HỢP ĐỒNG</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Kính gửi (Bên thanh toán) *</label>
                  <input
                    type="text"
                    value={prRecipient}
                    onChange={e => setPrRecipient(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Căn cứ hợp đồng</label>
                  <textarea
                    rows={2}
                    value={prContractRef}
                    onChange={e => setPrContractRef(e.target.value)}
                    className={`w-full rounded-lg p-2 border text-xs ${inputStyle}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px]">GIÁ TRỊ THANH TOÁN</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">1. Tổng giá trị hợp đồng (VNĐ)</label>
                  <input
                    type="text"
                    value={prTotalContractValue}
                    onChange={e => setPrTotalContractValue(formatMoneyInput(e.target.value))}
                    className={`w-full rounded-lg p-2 font-mono font-bold text-sky-600 border ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Đợt 1 đã thanh toán (VNĐ)</label>
                    <input
                      type="text"
                      value={prStage1Paid}
                      onChange={e => setPrStage1Paid(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Đợt 2 đề nghị trả (VNĐ)</label>
                    <input
                      type="text"
                      value={prStage2Request}
                      onChange={e => setPrStage2Request(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-emerald-600 border ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-amber-500 uppercase text-[11px]">THÔNG TIN NGƯỜI ĐỀ NGHỊ</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên người đề nghị *</label>
                  <input
                    type="text"
                    value={prRequesterName}
                    onChange={e => setPrRequesterName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                  <input
                    type="text"
                    value={prRequesterCccd}
                    onChange={e => setPrRequesterCccd(e.target.value)}
                    className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ────────────────────────────────────────────────────────────────────────── */}
        {/* RIGHT COLUMN: LIVE PREVIEW & EXPORT TOOLBAR */}
        {/* ────────────────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-3">
          {/* Action Export Buttons */}
          <div className={`${containerCardBg} p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 print:hidden`}>
            <span className="font-bold text-xs uppercase flex items-center space-x-2 text-sky-500">
              <FileText className="w-4 h-4" />
              <span>KHUNG LIVE PREVIEW VĂN BẢN</span>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  const previewElem = document.getElementById('document-preview-container');
                  if (previewElem) {
                    exportToWordDoc(`Van_Ban_${selectedTemplate}_${mbContractDate}`, previewElem.innerHTML);
                  }
                }}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất File Word (.doc)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  const previewElem = document.getElementById('document-preview-container');
                  if (previewElem) {
                    exportToPDFOnly(`Van_Ban_${selectedTemplate}_${mbContractDate}`, previewElem.innerHTML);
                  }
                }}
                className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Xuất File PDF (.pdf)</span>
              </button>
            </div>
          </div>

          {/* LIVE PREVIEW A4 PAPER SHEET WITH NGUYÊN VĂN CONTRACT TEXT */}
          <div
            id="document-preview-container"
            className="doc-preview-sheet bg-white text-slate-950 p-10 sm:p-14 rounded-2xl border border-slate-200 shadow-2xl space-y-4 max-w-[210mm] mx-auto transition-all"
          >
            {/* ── PREVIEW 1: HỢP ĐỒNG THUÊ MẶT BẰNG ── */}
            {selectedTemplate === 'lease_mb' && (
              <div className="space-y-4">
                <div className="text-center space-y-1 no-indent">
                  <div className="font-bold text-[13pt] uppercase tracking-normal no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1 no-indent">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-center pt-3 pb-1 no-indent">
                  <h1 className="text-[16pt] font-bold uppercase tracking-wide no-indent">HỢP ĐỒNG THUÊ MẶT BẰNG KINH DOANH</h1>
                </div>

                <div className="space-y-1 no-indent">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN CHO THUÊ MẶT BẰNG (Sau đây gọi tắt là Bên A):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>- Họ và tên: <strong className="uppercase">{nfc(mbPartyAName)}</strong></div>
                    <div>- CCCD số: <strong>{nfc(mbPartyACccd)}</strong> | Ngày cấp: {nfc(mbPartyACccdDate)} | Nơi cấp: {nfc(mbPartyACccdPlace)}</div>
                    <div>- Nơi đăng ký HKTT: {nfc(mbPartyAAddress)}</div>
                  </div>
                </div>

                <div className="space-y-1 no-indent">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN THUÊ MẶT BẰNG (Sau đây gọi tắt là Bên B):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>- Họ và tên: <strong className="uppercase">{nfc(mbPartyBName)}</strong></div>
                    <div>- CCCD số: <strong>{nfc(mbPartyBCccd)}</strong> | Ngày cấp: {nfc(mbPartyBCccdDate)} | Nơi cấp: {nfc(mbPartyBCccdPlace)}</div>
                    <div>- Nơi đăng ký HKTT: {nfc(mbPartyBAddress)}</div>
                  </div>
                </div>

                <p className="clause-p">
                  Hai bên cùng tự nguyện thỏa thuận và nhất trí ký kết Hợp đồng thuê mặt bằng kinh doanh với các điều khoản chi tiết như sau:
                </p>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 1: ĐỐI TƯỢNG VÀ MỤC ĐÍCH THUÊ</div>
                  <p className="clause-p">1.1. Bên A đồng ý cho Bên B thuê và Bên B đồng ý thuê mặt bằng tại địa chỉ: <strong>{nfc(mbLocation)}</strong>.</p>
                  <p className="clause-p">1.2. Mục đích thuê: Sử dụng làm địa điểm hoạt động sản xuất kinh doanh hợp pháp theo quy định của pháp luật.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 2: THỜI HẠN HỢP ĐỒNG, GIÁ CẢ VÀ PHƯƠNG THỨC THANH TOÁN</div>
                  <p className="clause-p">2.1. Thời hạn thuê là 01 năm kể từ ngày <strong>{fmtDate(mbStartDate)}</strong> đến hết ngày <strong>{fmtDate(mbEndDate)}</strong>.</p>
                  <p className="clause-p">2.2. Đơn giá thuê: <strong>{mbMonthlyPrice} VNĐ/tháng</strong>.</p>
                  <p className="clause-p">2.3. Phương thức thanh toán: Bên B thanh toán tiền cho Bên A mỗi tháng một lần trong vòng 10 ngày đầu của mỗi tháng.</p>
                  <p className="clause-p">2.4. Tiền ký quỹ: Số tiền <strong>{mbDepositAmount} VNĐ</strong> được chuyển cho Bên A trong vòng 01 tuần kể từ ngày ký hợp đồng.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</div>
                  <p className="clause-p">3.1. Bàn giao mặt bằng thuê đúng thời gian quy định cho Bên B.</p>
                  <p className="clause-p">3.2. Bảo đảm quyền sử dụng trọn vẹn và hợp pháp cho Bên B.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</div>
                  <p className="clause-p">4.1. Chịu trách nhiệm trước pháp luật về tính hợp pháp của hoạt động sản xuất kinh doanh.</p>
                  <p className="clause-p">4.2. Thanh toán đầy đủ tiền điện, nước, internet và thực hiện nghĩa vụ thuế.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 5: ĐIỀU KHOẢN CHUNG</div>
                  <p className="clause-p">Hợp đồng được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản.</p>
                </div>

                <table className="sig-table font-serif" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '30pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>ĐẠI DIỆN BÊN A</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2pt', color: '#334155' }}>(Ký và ghi rõ họ tên)</div>
                        <div style={{ height: '80px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>{nfc(mbPartyAName)}</div>
                      </td>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>ĐẠI DIỆN BÊN B</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2pt', color: '#334155' }}>(Ký và ghi rõ họ tên)</div>
                        <div style={{ height: '80px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>{nfc(mbPartyBName)}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PREVIEW 2: HỢP ĐỒNG THI CÔNG NHÀ Ở ── */}
            {selectedTemplate === 'construction' && (
              <div className="space-y-4">
                <div className="text-center space-y-1 no-indent">
                  <div className="font-bold text-[13pt] uppercase tracking-normal no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1 no-indent">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-center pt-3 pb-1 no-indent">
                  <h1 className="text-[16pt] font-bold uppercase tracking-wide no-indent">HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG</h1>
                </div>

                <p className="clause-p">
                  Căn cứ vào nhu cầu và khả năng hợp tác của hai bên. Hôm nay, ngày {fmtDate(constContractDate)}, chúng tôi gồm có:
                </p>

                <div className="space-y-1 no-indent">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN THUÊ THI CÔNG XÂY DỰNG: (Sau đây gọi tắt là Bên A)</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>- Bà: <strong className="uppercase">{nfc(constPartyAName)}</strong></div>
                    <div>- CCCD số: <strong>{nfc(constPartyACccd)}</strong> | Địa chỉ: {nfc(constPartyAAddress)}</div>
                  </div>
                </div>

                <div className="space-y-1 no-indent">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN NHẬN THI CÔNG XÂY DỰNG: (Sau đây gọi tắt là Bên B)</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>- Bà: <strong className="uppercase">{nfc(constPartyBName)}</strong></div>
                    <div>- CCCD số: <strong>{nfc(constPartyBCccd)}</strong></div>
                  </div>
                </div>

                <p className="clause-p">
                  Hai bên thỏa thuận ký hợp đồng với các điều khoản như sau:
                </p>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">Điều 1: Nội dung và phạm vi công việc</div>
                  <p className="clause-p">1. Địa điểm thi công: Bên B nhận thi công/sửa chữa nhà ở dân dụng tại địa chỉ: <strong>{nfc(constSiteAddress)}</strong>.</p>
                  <p className="clause-p">2. Phạm vi công việc: Sửa chữa/tân trang phần tường, lát gạch nền sàn, đi lại đường dây điện nước, thay mới cửa mái tôn lan can.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">Điều 2: Thời gian và tiến độ thực hiện</div>
                  <p className="clause-p">- Ngày khởi công: Ngày <strong>{fmtDate(constStartDate)}</strong> đến ngày <strong>{fmtDate(constEndDate)}</strong>.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">Điều 3. Giá trị hợp đồng và phương thức thanh toán</div>
                  <p className="clause-p">- Tổng giá trị hợp đồng: <strong>{constTotalPrice} VNĐ</strong>.</p>
                  <p className="clause-p">- Đợt 1: <strong>{constDepositStage1} VNĐ</strong>. Đợt 2: <strong>{constStage2Amount} VNĐ</strong>.</p>
                </div>

                <table className="sig-table font-serif" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '30pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>BÊN THUÊ THI CÔNG (BÊN A)</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2pt', color: '#334155' }}>(Ký và ghi rõ họ tên)</div>
                        <div style={{ height: '80px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>{nfc(constPartyAName)}</div>
                      </td>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>BÊN NHẬN THI CÔNG (BÊN B)</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2pt', color: '#334155' }}>(Ký và ghi rõ họ tên)</div>
                        <div style={{ height: '80px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>{nfc(constPartyBName)}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PREVIEW 3: HỢP ĐỒNG MUA BÁN HÀNG HÓA NGUYÊN VĂN FULL TEXT 8 ĐIỀU ── */}
            {selectedTemplate === 'sale_contract' && (
              <div className="space-y-4">
                <div className="text-center space-y-1 no-indent">
                  <div className="font-bold text-[13pt] uppercase tracking-normal no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1 no-indent">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-center pt-3 pb-1 no-indent">
                  <h1 className="text-[16pt] font-bold uppercase tracking-wide no-indent">HỢP ĐỒNG MUA BÁN HÀNG HOÁ</h1>
                </div>

                <p className="clause-p">
                  Hôm nay, ngày {fmtDate(saleContractDate)}, chúng tôi gồm có:
                </p>

                <div className="space-y-1 no-indent">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN MUA: (Sau đây gọi tắt là Bên A)</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>- Họ tên: <strong className="uppercase">{nfc(saleBuyerName)}</strong></div>
                    <div>- Địa chỉ: {nfc(saleBuyerAddress)}</div>
                  </div>
                </div>

                <div className="space-y-1 no-indent">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN BÁN: (Sau đây gọi tắt là Bên B)</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>- Họ tên: <strong className="uppercase">{nfc(saleSellerName)}</strong></div>
                    <div>- CCCD số: <strong>{nfc(saleSellerCccd)}</strong> | Ngày cấp: {nfc(saleSellerCccdDate)} | Nơi cấp: {nfc(saleSellerCccdPlace)}</div>
                  </div>
                </div>

                <p className="clause-p">
                  Hai bên A và B thống nhất thoả thuận nội dung Hợp đồng như sau:
                </p>

                {/* ĐIỀU 1: BẢNG DANH MỤC HÀNG HÓA 13 MẶT HÀNG NGUYÊN VĂN FILE EXCEL */}
                <div className="space-y-2">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 1: ĐỐI TƯỢNG VÀ GIÁ CẢ</div>
                  <table className="w-full border-collapse border border-black text-[11pt] my-2">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-1.5 font-bold text-center w-10">STT</th>
                        <th className="border border-black p-1.5 font-bold">Tên Hàng Hóa</th>
                        <th className="border border-black p-1.5 font-bold text-center w-14">ĐVT</th>
                        <th className="border border-black p-1.5 font-bold text-center w-16">Số lượng</th>
                        <th className="border border-black p-1.5 font-bold text-right">Đơn Giá</th>
                        <th className="border border-black p-1.5 font-bold text-right">Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                          <td className="border border-black p-1.5 font-bold">{nfc(item.name)}</td>
                          <td className="border border-black p-1.5 text-center">{item.unit}</td>
                          <td className="border border-black p-1.5 text-center font-mono">{item.quantity}</td>
                          <td className="border border-black p-1.5 text-right font-mono">{item.price.toLocaleString('vi-VN')}</td>
                          <td className="border border-black p-1.5 text-right font-mono font-bold">
                            {(item.quantity * item.price).toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-slate-100">
                        <td colSpan={5} className="border border-black p-1.5 text-center uppercase">Tổng cộng</td>
                        <td className="border border-black p-1.5 text-right font-mono text-emerald-700">{totalSaleAmount.toLocaleString('vi-VN')} VNĐ</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 2: THỜI HẠN HỢP ĐỒNG</div>
                  <p className="clause-p">– Thời hạn Hợp đồng là: 01 tháng kể từ ngày <strong>{fmtDate(saleStartDate)}</strong> đến ngày <strong>{fmtDate(saleEndDate)}</strong>.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 3: THỜI HẠN VÀ PHƯƠNG THỨC THANH TOÁN</div>
                  <p className="clause-p">– Tổng số tiền Bên Mua phải thanh toán cho Bên Bán là: <strong>{totalSaleAmount.toLocaleString('vi-VN')} đồng</strong>.</p>
                  <div className="font-bold text-[12pt] no-indent">1. Thời hạn thanh toán:</div>
                  <p className="clause-p">Mỗi một lô hàng khi Bên B xuất ra cho Bên A thì Bên A sẽ thanh toán như sau:</p>
                  <p className="clause-p">– Lần 1: Bên A thanh toán cho Bên B số tiền là: <strong>{salePaymentStage1} đồng</strong>.</p>
                  <p className="clause-p">– Lần 2: Số tiền còn lại là <strong>{stage2RemainingNum.toLocaleString('vi-VN')} đồng</strong> sẽ được Bên A thanh toán toàn bộ trước khi nhận hàng dựa trên phiếu đề nghị thanh toán.</p>
                  <div className="font-bold text-[12pt] no-indent">2. Phương thức thanh toán:</div>
                  <p className="clause-p">Thanh toán bằng tiền mặt hoặc chuyển khoản.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 4: THỜI ĐIỂM VÀ ĐỊA ĐIỂM CHUYỂN GIAO TÀI SẢN</div>
                  <p className="clause-p">Bên bán chuyển giao tài sản cho Bên mua trong thời hạn 30 ngày kể từ ngày ký kết hợp đồng.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 5: NGHĨA VỤ CỦA BÊN BÁN</div>
                  <p className="clause-p">- Bên Bán chịu trách nhiệm về số lượng, chất lượng đối với toàn bộ các sản phẩm do Bên Bán cung cấp.</p>
                  <p className="clause-p">- Bên Bán có nghĩa vụ cung cấp mọi chỉ dẫn cần thiết đối với việc bảo quản, sử dụng hàng hoá theo quy định của Hợp đồng này cho Bên mua.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 6: NGHĨA VỤ CỦA BÊN MUA</div>
                  <p className="clause-p">- Bên mua có nghĩa vụ thanh toán toàn bộ chi phí vận chuyển.</p>
                  <p className="clause-p">- Tổ chức tiếp nhận nhanh, an toàn, dứt điểm cho từng lô hàng.</p>
                  <p className="clause-p">- Thanh toán theo quy định tại Điều 3 Hợp đồng này.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 7: CÁC TRƯỜNG HỢP CHẤM DỨT HỢP ĐỒNG</div>
                  <p className="clause-p">Hợp đồng này sẽ được chấm dứt trong các trường hợp sau:</p>
                  <p className="clause-p">- Khi các Bên thực hiện xong các quyền và nghĩa vụ quy định trong Hợp đồng này.</p>
                  <p className="clause-p">- Khi một Bên vi phạm hợp đồng dẫn đến Hợp đồng không thể thực hiện được thì phía Bên kia có quyền đơn phương chấm dứt hợp đồng.</p>
                  <p className="clause-p">- Hợp đồng có thể được chấm dứt do sự thỏa thuận của các Bên.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 8: HIỆU LỰC THI HÀNH</div>
                  <p className="clause-p">- Hợp đồng này có hiệu lực kể từ ngày ký, và chỉ được coi là kết thúc khi các Bên đã hoàn thành các nghĩa vụ của mình trong Hợp đồng.</p>
                  <p className="clause-p">- Trong trường hợp một Bên muốn sửa đổi các điều khoản trong hợp đồng thì phải thông báo cho Bên kia biết trước ít nhất là 03 ngày và cùng nhau thoả thuận lại những điểm cần thay đổi với sự đồng ý của hai Bên.</p>
                  <p className="clause-p">- Hợp đồng này được lập thành 02 bản, mỗi Bên giữ 01 bản, các bản có giá trị pháp lý như nhau.</p>
                </div>

                {/* SIGNATURE TABLE */}
                <table className="sig-table font-serif" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '30pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>ĐẠI DIỆN BÊN BÁN</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2pt', color: '#334155' }}>(Ký và ghi rõ họ tên)</div>
                        <div style={{ height: '80px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>{nfc(saleSellerName)}</div>
                      </td>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>ĐẠI DIỆN BÊN MUA</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2pt', color: '#334155' }}>(Ký và ghi rõ họ tên)</div>
                        <div style={{ height: '80px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>{nfc(saleBuyerName)}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PREVIEW 4: HỢP ĐỒNG THUÊ NHÀ Ở DÂN DỤNG NGUYÊN VĂN FULL TEXT 7 ĐIỀU ── */}
            {selectedTemplate === 'lease_house' && (
              <div className="space-y-4">
                <div className="text-center space-y-1 no-indent">
                  <div className="font-bold text-[13pt] uppercase tracking-normal no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1 no-indent">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-center pt-3 pb-1 no-indent">
                  <h1 className="text-[16pt] font-bold uppercase tracking-wide no-indent">HỢP ĐỒNG THUÊ NHÀ Ở DÂN DỤNG</h1>
                </div>

                <p className="clause-p">
                  Căn cứ Bộ Luật Dân sự nước Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam. Hôm nay, ngày {fmtDate(houseContractDate)}, tại căn nhà cho thuê, chúng tôi gồm có:
                </p>

                <div className="space-y-1 no-indent">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN CHO THUÊ NHÀ (BÊN A):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>- Họ tên: <strong className="uppercase">{nfc(housePartyAName)}</strong></div>
                    <div>- CCCD số: <strong>{nfc(housePartyACccd)}</strong></div>
                    <div>- Địa chỉ: {nfc(housePartyAAddress)}</div>
                  </div>
                </div>

                <div className="space-y-1 no-indent">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN THUÊ NHÀ (BÊN B):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>- Họ tên: <strong className="uppercase">{nfc(housePartyBName)}</strong></div>
                    <div>- CCCD số: <strong>{nfc(housePartyBCccd)}</strong></div>
                    <div>- Địa chỉ: {nfc(housePartyBAddress)}</div>
                  </div>
                </div>

                <p className="clause-p">
                  Hai bên cùng tự nguyện thỏa thuận và nhất trí ký kết hợp đồng thuê nhà ở dân dụng với các điều khoản như sau:
                </p>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 1: ĐỐI TƯỢNG VÀ MỤC ĐÍCH THUÊ NHÀ</div>
                  <p className="clause-p">1.1. Bên A đồng ý cho Bên B thuê căn nhà ở dân dụng tại địa chỉ: <strong>{nfc(houseAddress)}</strong>.</p>
                  <p className="clause-p">1.2. Mục đích thuê: Dùng để ở và sinh hoạt gia đình hợp pháp.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 2: THỜI HẠN HỢP ĐỒNG VÀ GIÁ CẢ THANH TOÁN</div>
                  <p className="clause-p">2.1. Thời hạn thuê nhà là 01 (một) năm kể từ ngày <strong>{fmtDate(houseStartDate)}</strong> đến ngày <strong>{fmtDate(houseEndDate)}</strong>.</p>
                  <p className="clause-p">2.2. Giá thuê nhà: <strong>{houseMonthlyPrice} VNĐ/tháng</strong>. Phương thức thanh toán: Thanh toán tiền thuê nhà 01 tháng một lần trong vòng 05 ngày đầu mỗi tháng.</p>
                  <p className="clause-p">2.3. Tiền đặt cọc: Bên B giao cho Bên A số tiền đặt cọc là <strong>{houseDepositAmount} VNĐ</strong> để đảm bảo thực hiện hợp đồng. Số tiền này sẽ hoàn trả sau khi thanh lý hợp đồng.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</div>
                  <p className="clause-p">3.1. Bàn giao nhà ở và trang thiết bị gắn liền cho Bên B đúng thời hạn.</p>
                  <p className="clause-p">3.2. Bảo đảm quyền sử dụng nhà trọn vẹn và độc lập cho Bên B trong suốt thời gian thuê.</p>
                  <p className="clause-p">3.3. Nhận đủ tiền thuê nhà đúng thời hạn theo thỏa thuận.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</div>
                  <p className="clause-p">4.1. Sử dụng nhà đúng mục đích thuê, giữ gìn nhà ở và có trách nhiệm sửa chữa các hư hỏng do mình gây ra.</p>
                  <p className="clause-p">4.2. Thanh toán đầy đủ các chi phí điện, nước, rác sinh hoạt, internet và dịch vụ phát sinh trong quá trình ở.</p>
                  <p className="clause-p">4.3. Không được tự ý sửa đổi kết cấu nhà hoặc cho bên thứ ba thuê lại khi chưa có sự đồng ý bằng văn bản của Bên A.</p>
                  <p className="clause-p">4.4. Chấp hành các quy định về an ninh trật tự, tạm trú tạm vắng và phòng cháy chữa cháy tại địa phương.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 5: ĐƠN PHƯƠNG CHẤM DỨT HỢP ĐỒNG</div>
                  <p className="clause-p">Trường hợp một trong hai bên muốn chấm dứt hợp đồng trước thời hạn phải thông báo cho bên kia biết trước ít nhất 30 ngày.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 6: GIẢI QUYẾT TRANH CHẤP</div>
                  <p className="clause-p">Mọi tranh chấp phát sinh trong quá trình thực hiện hợp đồng sẽ được hai bên cùng nhau bàn bạc giải quyết trên tinh thần hợp tác. Nếu không tự giải quyết được sẽ đưa ra Tòa án có thẩm quyền phán quyết.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent mt-3">ĐIỀU 7: ĐIỀU KHOẢN THI HÀNH</div>
                  <p className="clause-p">Hợp đồng này có hiệu lực kể từ ngày ký, được lập thành 02 bản có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.</p>
                </div>

                {/* SIGNATURE TABLE */}
                <table className="sig-table font-serif" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '30pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>CHỦ NHÀ (BÊN A)</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2pt', color: '#334155' }}>(Ký và ghi rõ họ tên)</div>
                        <div style={{ height: '80px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>{nfc(housePartyAName)}</div>
                      </td>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>NGƯỜI THUÊ (BÊN B)</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2pt', color: '#334155' }}>(Ký và ghi rõ họ tên)</div>
                        <div style={{ height: '80px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>{nfc(housePartyBName)}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {/* ── PREVIEW 5: GIẤY ĐỀ NGHỊ THANH TOÁN ── */}
            {selectedTemplate === 'payment_request' && (
              <div className="space-y-4">
                <div className="text-center space-y-1 no-indent">
                  <div className="font-bold text-[13pt] uppercase tracking-normal no-indent">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt] no-indent">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1 no-indent">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-right italic text-[12pt] text-slate-700 pt-2 no-indent">
                  Ngày {fmtDate(prDate)}
                </div>

                <div className="text-center pt-2 pb-2 no-indent">
                  <h1 className="text-[17pt] font-bold uppercase tracking-wide no-indent">GIẤY ĐỀ NGHỊ THANH TOÁN</h1>
                </div>

                <p className="no-indent font-bold">
                  Kính gửi: <span className="uppercase">{nfc(prRecipient)}</span>
                </p>

                <p className="clause-p">
                  - {nfc(prContractRef)}.
                </p>

                <p className="clause-p">
                  - Tôi xin đề nghị thanh toán theo các nội dung sau:
                </p>

                <div className="space-y-2 pl-4 no-indent">
                  <div>
                    <strong>1. Giá trị hợp đồng:</strong> <span className="font-bold text-emerald-700">{prTotalContractValue} VNĐ</span>
                  </div>
                  <div>
                    <strong>2. Thời hạn & Tiến độ thanh toán:</strong>
                    <div className="pl-4 space-y-1 mt-1">
                      <div>+ Đã thanh toán đợt đầu tiên là: <strong>{prStage1Paid} VNĐ</strong></div>
                      <div>+ Đề nghị thanh toán số tiền đợt này là: <strong className="text-rose-600 font-mono text-[14pt]">{prStage2Request} VNĐ</strong> trước khi nhận hàng</div>
                    </div>
                  </div>

                  <div>
                    <strong>3. Thông tin người đề nghị thanh toán:</strong>
                    <div className="pl-4 space-y-0.5 mt-1">
                      <div>- Họ & Tên: <strong className="uppercase">{nfc(prRequesterName)}</strong></div>
                      <div>- CCCD số: <strong>{nfc(prRequesterCccd)}</strong></div>
                    </div>
                  </div>
                </div>

                <p className="clause-p pt-2">
                  Trân trọng cảm ơn!
                </p>

                <table className="sig-table font-serif" style={{ width: '100%', borderCollapse: 'collapse', border: 'none', marginTop: '30pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '50%', border: 'none' }}></td>
                      <td style={{ width: '50%', textAlign: 'center', verticalAlign: 'top', border: 'none', padding: '0' }}>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>NGƯỜI ĐỀ NGHỊ THANH TOÁN</div>
                        <div style={{ fontStyle: 'italic', fontSize: '11pt', marginTop: '2pt', color: '#334155' }}>(Ký và ghi rõ họ tên)</div>
                        <div style={{ height: '80px' }}></div>
                        <div style={{ fontWeight: 'bold', textTransform: 'uppercase', fontSize: '13pt' }}>{nfc(prRequesterName)}</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
