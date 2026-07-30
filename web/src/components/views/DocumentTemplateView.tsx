import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { formatMoneyInput, fmtDate } from '../../lib/utils';
import {
  FileText, Download, Printer, CheckCircle, Sparkles, Building, User, Calendar, DollarSign, ListChecks, Plus, Trash2, CreditCard
} from 'lucide-react';

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
          margin: 25mm 20mm 20mm 30mm; /* Lề trên 2.5cm, lề dưới 2cm, lề phải 2cm, lề trái 3cm chuẩn Nghị định 30 */
        }
        div.WordSection1 { page: WordSection1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.5; color: #000000; }
        h1 { text-align: center; font-size: 16pt; font-weight: bold; text-transform: uppercase; margin-top: 12pt; margin-bottom: 12pt; }
        h2 { text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin-top: 10pt; margin-bottom: 10pt; }
        p { margin-bottom: 6pt; text-align: justify; text-indent: 1.27cm; line-height: 1.5; }
        .no-indent { text-indent: 0 !important; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .font-italic { font-style: italic; }
        .table-doc { border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; }
        .table-doc th, .table-doc td { border: 1px solid #000; padding: 6pt 8pt; font-size: 12pt; }
        .sig-block { width: 100%; margin-top: 25pt; page-break-inside: avoid; }
        .sig-col { width: 50%; text-align: center; vertical-align: top; }
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
  // FORM STATE 3: HỢP ĐỒNG MUA BÁN HÀNG HÓA (ĐA MẶT HÀNG)
  // ──────────────────────────────────────────────────────────────────────────
  const [saleContractDate, setSaleContractDate] = useState('2026-04-10');
  const [saleSellerName, setSaleSellerName] = useState('CÔNG TY TNHH VẬT LIỆU XÂY DỰNG AN PHÁT');
  const [saleSellerTaxCode, setSaleSellerTaxCode] = useState('0315894021');
  const [saleSellerBank, setSaleSellerBank] = useState('19034567890012 - Techcombank Chi nhánh Sài Gòn');

  const [saleBuyerName, setSaleBuyerName] = useState('ÔNG TRẦN VĂN MINH');
  const [saleBuyerCccd, setSaleBuyerCccd] = useState('0790 8501 9283');

  // Multi-item array for Sales Contract
  const [saleItems, setSaleItems] = useState<SaleItem[]>([
    { id: '1', name: 'Thép cuộn D6 CB300-V', unit: 'Tấn', quantity: 15, price: 17500000 },
    { id: '2', name: 'Xi măng Hà Tiên 1 PCB40', unit: 'Bao', quantity: 200, price: 95000 },
    { id: '3', name: 'Gạch lát nền Ceramic 60x60', unit: 'm²', quantity: 120, price: 280000 },
  ]);

  const handleAddSaleItem = () => {
    const newItem: SaleItem = {
      id: Date.now().toString(),
      name: 'Mặt hàng mới',
      unit: 'Cái',
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

  // ──────────────────────────────────────────────────────────────────────────
  // FORM STATE 5: GIẤY ĐỀ NGHỊ THANH TOÁN (FILE WORD ĐỘC LẬP)
  // ──────────────────────────────────────────────────────────────────────────
  const [prDate, setPrDate] = useState('2026-03-20');
  const [prRecipient, setPrRecipient] = useState('Bà Lý Thị Thùy Dung');
  const [prContractRef, setPrContractRef] = useState('Căn cứ Hợp đồng thi công nhà ở dân dụng ký ngày 18/03/2026 giữa Bà Lý Thị Thùy Dung và Bà Đỗ Thị Lan Anh');
  const [prTotalContractValue, setPrTotalContractValue] = useState('1.003.700.000');
  const [prStage1Paid, setPrStage1Paid] = useState('53.700.000');
  const [prStage2Request, setPrStage2Request] = useState('950.000.000');
  const [prRequesterName, setPrRequesterName] = useState('ĐỖ THỊ LAN ANH');
  const [prRequesterCccd, setPrRequesterCccd] = useState('0343 0300 4676');

  // Quick fill sample data
  const handleQuickFill = () => {
    if (selectedTemplate === 'lease_mb') {
      setMbContractDate('2026-04-23');
      setMbPartyAName('ĐỖ THỊ HIẾU');
      setMbPartyACccd('0791 7802 5859');
      setMbPartyBName('NGÔ NHỊ ĐẠT');
      setMbPartyBCccd('0343 0300 4676');
      setMbMonthlyPrice('55.000.000');
      setMbDepositAmount('72.000.000');
    } else if (selectedTemplate === 'construction') {
      setConstPartyAName('LÝ THỊ THÙY DUNG');
      setConstPartyBName('ĐỖ THỊ LAN ANH');
      setConstTotalPrice('1.003.700.000');
      setConstStage2Amount('950.000.000');
    }
  };

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
        .doc-preview-sheet p {
          text-align: justify;
          text-indent: 1.27cm;
          margin-bottom: 6pt;
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
          <p className="text-xs text-slate-400 mt-0.5">
            Nhập liệu các biến số linh hoạt - Tự động điền câu văn mẫu chuẩn pháp lý - Live Preview & Xuất Word / PDF
          </p>
        </div>

        {/* Template Options Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleQuickFill}
            className="flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-3 py-1.5 rounded-xl transition-all shadow-sm"
            title="Tự động điền dữ liệu mẫu"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Điền Mẫu Nhanh</span>
          </button>
        </div>
      </div>

      {/* ── TEMPLATE SELECTOR CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3 print:hidden">
        <button
          onClick={() => setSelectedTemplate('lease_mb')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            selectedTemplate === 'lease_mb'
              ? 'bg-sky-600 text-white font-bold shadow-md border-sky-500 scale-[1.01]'
              : `${containerCardBg} hover:border-sky-500`
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-xs uppercase">
            <Building className="w-4 h-4 shrink-0" />
            <span className="truncate">1. HĐ Thuê Mặt Bằng</span>
          </div>
          <p className={`text-[11px] mt-1.5 ${selectedTemplate === 'lease_mb' ? 'text-sky-100' : 'text-slate-400'}`}>
            Đầy đủ 9 điều khoản chuẩn
          </p>
        </button>

        <button
          onClick={() => setSelectedTemplate('construction')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            selectedTemplate === 'construction'
              ? 'bg-sky-600 text-white font-bold shadow-md border-sky-500 scale-[1.01]'
              : `${containerCardBg} hover:border-sky-500`
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-xs uppercase">
            <ListChecks className="w-4 h-4 shrink-0" />
            <span className="truncate">2. HĐ Thi Công Nhà Ở</span>
          </div>
          <p className={`text-[11px] mt-1.5 ${selectedTemplate === 'construction' ? 'text-sky-100' : 'text-slate-400'}`}>
            Thi công & bảo hành nhà
          </p>
        </button>

        <button
          onClick={() => setSelectedTemplate('sale_contract')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            selectedTemplate === 'sale_contract'
              ? 'bg-sky-600 text-white font-bold shadow-md border-sky-500 scale-[1.01]'
              : `${containerCardBg} hover:border-sky-500`
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-xs uppercase">
            <DollarSign className="w-4 h-4 shrink-0" />
            <span className="truncate">3. HĐ Mua Bán Hàng Hóa</span>
          </div>
          <p className={`text-[11px] mt-1.5 ${selectedTemplate === 'sale_contract' ? 'text-sky-100' : 'text-slate-400'}`}>
            Đa mặt hàng (Thêm/Xóa)
          </p>
        </button>

        <button
          onClick={() => setSelectedTemplate('lease_house')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            selectedTemplate === 'lease_house'
              ? 'bg-sky-600 text-white font-bold shadow-md border-sky-500 scale-[1.01]'
              : `${containerCardBg} hover:border-sky-500`
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-xs uppercase">
            <User className="w-4 h-4 shrink-0" />
            <span className="truncate">4. HĐ Thuê Nhà Ở</span>
          </div>
          <p className={`text-[11px] mt-1.5 ${selectedTemplate === 'lease_house' ? 'text-sky-100' : 'text-slate-400'}`}>
            Cho thuê nhà nguyên căn
          </p>
        </button>

        <button
          onClick={() => setSelectedTemplate('payment_request')}
          className={`p-3.5 rounded-2xl border text-left transition-all ${
            selectedTemplate === 'payment_request'
              ? 'bg-emerald-600 text-white font-bold shadow-md border-emerald-500 scale-[1.01]'
              : `${containerCardBg} hover:border-emerald-500`
          }`}
        >
          <div className="flex items-center space-x-2 font-bold text-xs uppercase">
            <CreditCard className="w-4 h-4 shrink-0" />
            <span className="truncate">5. Đề Nghị Thanh Toán</span>
          </div>
          <p className={`text-[11px] mt-1.5 ${selectedTemplate === 'payment_request' ? 'text-emerald-100' : 'text-slate-400'}`}>
            File Word độc lập
          </p>
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
                <input
                  type="date"
                  value={mbContractDate}
                  onChange={e => setMbContractDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                />
              </div>

              {/* BÊN A */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px] flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>BÊN A (BÊN CHO THUÊ MẶT BẰNG)</span>
                </div>
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
                  <label className="block text-[11px] font-medium mb-0.5">Nơi ĐKTT (Địa chỉ bên A)</label>
                  <input
                    type="text"
                    value={mbPartyAAddress}
                    onChange={e => setMbPartyAAddress(e.target.value)}
                    className={`w-full rounded-lg p-2 border ${inputStyle}`}
                  />
                </div>
              </div>

              {/* BÊN B */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px] flex items-center space-x-1.5">
                  <User className="w-3.5 h-3.5" />
                  <span>BÊN B (BÊN THUÊ MẶT BẰNG)</span>
                </div>
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
                  <label className="block text-[11px] font-medium mb-0.5">Nơi ĐKTT (Địa chỉ bên B)</label>
                  <input
                    type="text"
                    value={mbPartyBAddress}
                    onChange={e => setMbPartyBAddress(e.target.value)}
                    className={`w-full rounded-lg p-2 border ${inputStyle}`}
                  />
                </div>
              </div>

              {/* ĐIỀU KHOẢN MẶT BẰNG & GIÁ CẢ */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-amber-500 uppercase text-[11px] flex items-center space-x-1.5">
                  <Building className="w-3.5 h-3.5" />
                  <span>THÔNG TIN MẶT BẰNG & GIÁ CẢ THUÊ</span>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Địa chỉ mặt bằng thuê</label>
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
                    <input
                      type="date"
                      value={mbStartDate}
                      onChange={e => setMbStartDate(e.target.value)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Ngày kết thúc thuê</label>
                    <input
                      type="date"
                      value={mbEndDate}
                      onChange={e => setMbEndDate(e.target.value)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Đơn giá thuê (VNĐ/tháng)</label>
                    <input
                      type="text"
                      value={mbMonthlyPrice}
                      onChange={e => setMbMonthlyPrice(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Tiền ký quỹ (VNĐ)</label>
                    <input
                      type="text"
                      value={mbDepositAmount}
                      onChange={e => setMbDepositAmount(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-sky-600 dark:text-sky-400 border ${inputStyle}`}
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
                <input
                  type="date"
                  value={constContractDate}
                  onChange={e => setConstContractDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                />
              </div>

              {/* BÊN A THI CÔNG */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px]">
                  BÊN A (THUÊ THI CÔNG XÂY DỰNG)
                </div>
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
                    <label className="block text-[11px] font-medium mb-0.5">Địa chỉ bên A</label>
                    <input
                      type="text"
                      value={constPartyAAddress}
                      onChange={e => setConstPartyAAddress(e.target.value)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                </div>
              </div>

              {/* BÊN B THI CÔNG */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">
                  BÊN B (NHẬN THI CÔNG XÂY DỰNG)
                </div>
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

              {/* ĐỊA ĐIỂM & TIẾN ĐỘ THI CÔNG */}
              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-amber-500 uppercase text-[11px]">
                  CÔNG TRÌNH THI CÔNG & GIÁ TRỊ HỢP ĐỒNG
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Địa chỉ thi công công trình</label>
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
                    <input
                      type="date"
                      value={constStartDate}
                      onChange={e => setConstStartDate(e.target.value)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Ngày hoàn thành dự kiến</label>
                    <input
                      type="date"
                      value={constEndDate}
                      onChange={e => setConstEndDate(e.target.value)}
                      className={`w-full rounded-lg p-2 border ${inputStyle}`}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Tổng giá trị hợp đồng (VNĐ)</label>
                    <input
                      type="text"
                      value={constTotalPrice}
                      onChange={e => setConstTotalPrice(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Số tiền cọc đợt 1 (VNĐ)</label>
                    <input
                      type="text"
                      value={constDepositStage1}
                      onChange={e => setConstDepositStage1(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-sky-600 dark:text-sky-400 border ${inputStyle}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Đợt 2 đề nghị thanh toán (VNĐ)</label>
                  <input
                    type="text"
                    value={constStage2Amount}
                    onChange={e => setConstStage2Amount(formatMoneyInput(e.target.value))}
                    className={`w-full rounded-lg p-2 font-mono font-bold text-rose-500 border ${inputStyle}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* FORM BIẾN SỐ 3: HỢP ĐỒNG MUA BÁN HÀNG HÓA (ĐA MẶT HÀNG) */}
          {selectedTemplate === 'sale_contract' && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-medium mb-1">Ngày lập hợp đồng mua bán</label>
                <input
                  type="date"
                  value={saleContractDate}
                  onChange={e => setSaleContractDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                />
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px]">BÊN BÁN</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Tên công ty / Bên Bán</label>
                  <input
                    type="text"
                    value={saleSellerName}
                    onChange={e => setSaleSellerName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Mã số thuế / CCCD</label>
                  <input
                    type="text"
                    value={saleSellerTaxCode}
                    onChange={e => setSaleSellerTaxCode(e.target.value)}
                    className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Địa chỉ ngân hàng thanh toán</label>
                  <input
                    type="text"
                    value={saleSellerBank}
                    onChange={e => setSaleSellerBank(e.target.value)}
                    className={`w-full rounded-lg p-2 border ${inputStyle}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">BÊN MUA</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ tên / Bên Mua</label>
                  <input
                    type="text"
                    value={saleBuyerName}
                    onChange={e => setSaleBuyerName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Mã số thuế / CCCD</label>
                  <input
                    type="text"
                    value={saleBuyerCccd}
                    onChange={e => setSaleBuyerCccd(e.target.value)}
                    className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                  />
                </div>
              </div>

              {/* BẢNG ĐA MẶT HÀNG MUA BÁN */}
              <div className={`p-3.5 rounded-xl border space-y-3 ${sectionBoxBg}`}>
                <div className="flex items-center justify-between border-b pb-2 border-slate-200 dark:border-slate-800">
                  <span className="font-bold text-amber-500 uppercase text-[11px]">DANH SÁCH MẶT HÀNG MUA BÁN ({saleItems.length} MẶT HÀNG)</span>
                  <button
                    type="button"
                    onClick={handleAddSaleItem}
                    className="flex items-center space-x-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-[11px] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm Mặt Hàng</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {saleItems.map((item, index) => (
                    <div key={item.id} className={`p-3 rounded-lg border space-y-2 ${isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-slate-400">Mặt hàng #{index + 1}</span>
                        {saleItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveSaleItem(item.id)}
                            className="text-rose-500 hover:text-rose-600 p-1"
                            title="Xóa mặt hàng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium mb-0.5 text-slate-400">Tên sản phẩm / hàng hóa</label>
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
                          <label className="block text-[10px] font-medium mb-0.5 text-slate-400">Đơn giá (VNĐ)</label>
                          <input
                            type="text"
                            value={item.price.toLocaleString('vi-VN')}
                            onChange={e => handleUpdateSaleItem(item.id, 'price', parseFloat(e.target.value.replace(/\D/g, '')) || 0)}
                            className={`w-full rounded-md p-1.5 font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs border ${inputStyle}`}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`p-2.5 rounded-lg border flex items-center justify-between font-semibold ${isLight ? 'bg-amber-50 border-amber-200' : 'bg-slate-900 border-slate-800'}`}>
                  <span className="text-slate-500">TỔNG CỘNG TẤT CẢ MẶT HÀNG:</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">{totalSaleAmount.toLocaleString('vi-VN')} VNĐ</span>
                </div>
              </div>
            </div>
          )}

          {/* FORM BIẾN SỐ 4: HỢP ĐỒNG THUÊ NHÀ Ở */}
          {selectedTemplate === 'lease_house' && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-medium mb-1">Ngày hợp đồng thuê nhà</label>
                <input
                  type="date"
                  value={mbContractDate}
                  onChange={e => setMbContractDate(e.target.value)}
                  className={`w-full rounded-xl p-2.5 font-semibold border ${inputStyle}`}
                />
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-sky-600 dark:text-sky-400 uppercase text-[11px]">BÊN CHO THUÊ (BÊN A)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Chủ Nhà</label>
                  <input
                    type="text"
                    value={mbPartyAName}
                    onChange={e => setMbPartyAName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                  <input
                    type="text"
                    value={mbPartyACccd}
                    onChange={e => setMbPartyACccd(e.target.value)}
                    className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                  />
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-emerald-600 dark:text-emerald-400 uppercase text-[11px]">BÊN THUÊ NHÀ (BÊN B)</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Họ & Tên Người Thuê</label>
                  <input
                    type="text"
                    value={mbPartyBName}
                    onChange={e => setMbPartyBName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold uppercase border ${inputStyle}`}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">CCCD Số</label>
                  <input
                    type="text"
                    value={mbPartyBCccd}
                    onChange={e => setMbPartyBCccd(e.target.value)}
                    className={`w-full rounded-lg p-2 font-mono border ${inputStyle}`}
                  />
                </div>
              </div>
            </div>
          )}

          {/* FORM BIẾN SỐ 5: GIẤY ĐỀ NGHỊ THANH TOÁN (FILE WORD ĐỘC LẬP) */}
          {selectedTemplate === 'payment_request' && (
            <div className="space-y-3.5">
              <div>
                <label className="block font-medium mb-1">Ngày lập đề nghị thanh toán</label>
                <input
                  type="date"
                  value={prDate}
                  onChange={e => setPrDate(e.target.value)}
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
                    className={`w-full rounded-lg p-2 font-mono font-bold text-sky-600 dark:text-sky-400 border ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Đợt 1 đã thanh toán (VNĐ)</label>
                    <input
                      type="text"
                      value={prStage1Paid}
                      onChange={e => setPrStage1Paid(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-slate-600 dark:text-slate-300 border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Đợt 2 đề nghị trả (VNĐ)</label>
                    <input
                      type="text"
                      value={prStage2Request}
                      onChange={e => setPrStage2Request(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 border ${inputStyle}`}
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
                title="Xuất văn bản thành file Word (.doc / .docx) giữ nguyên định dạng"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất File Word (.doc)</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex items-center space-x-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                title="In trực tiếp hoặc Lưu file PDF chuẩn khổ A4"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>In / Xuất PDF</span>
              </button>
            </div>
          </div>

          {/* LIVE PREVIEW A4 PAPER SHEET WITH COMPLETE UNTRUNCATED TEXT */}
          <div
            id="document-preview-container"
            className="doc-preview-sheet bg-white text-slate-950 p-10 sm:p-14 rounded-2xl border border-slate-200 shadow-2xl space-y-4 max-w-[210mm] mx-auto transition-all"
          >
            {/* ── PREVIEW 1: HỢP ĐỒNG THUÊ MẶT BẰNG FULL TEXT (ĐẦY ĐỦ 9 ĐIỀU) ── */}
            {selectedTemplate === 'lease_mb' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-[13pt] uppercase tracking-normal">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt]">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-center pt-3 pb-1">
                  <h1 className="text-[16pt] font-bold uppercase tracking-wide">HỢP ĐỒNG THUÊ MẶT BẰNG KINH DOANH</h1>
                  <p className="italic text-[13pt] text-slate-800 mt-1 no-indent text-center">
                    Hôm nay, ngày {fmtDate(mbContractDate)} tại địa điểm cho thuê, chúng tôi gồm có:
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN CHO THUÊ MẶT BẰNG (Sau đây gọi tắt là Bên A):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>• Họ và tên: <strong className="uppercase">{nfc(mbPartyAName)}</strong></div>
                    <div>• CCCD số: <strong>{nfc(mbPartyACccd)}</strong> | Ngày cấp: {nfc(mbPartyACccdDate)} | Nơi cấp: {nfc(mbPartyACccdPlace)}</div>
                    <div>• Nơi đăng ký HKTT: {nfc(mbPartyAAddress)}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN THUÊ MẶT BẰNG (Sau đây gọi tắt là Bên B):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>• Họ và tên: <strong className="uppercase">{nfc(mbPartyBName)}</strong></div>
                    <div>• CCCD số: <strong>{nfc(mbPartyBCccd)}</strong> | Ngày cấp: {nfc(mbPartyBCccdDate)} | Nơi cấp: {nfc(mbPartyBCccdPlace)}</div>
                    <div>• Nơi đăng ký HKTT: {nfc(mbPartyBAddress)}</div>
                  </div>
                </div>

                <p className="text-justify">
                  Hai bên cùng tự nguyện thỏa thuận và nhất trí ký kết Hợp đồng thuê mặt bằng kinh doanh với các điều khoản chi tiết như sau:
                </p>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 1: ĐỐI TƯỢNG VÀ MỤC ĐÍCH THUÊ</div>
                  <p className="text-justify">1.1. Bên A đồng ý cho Bên B thuê và Bên B đồng ý thuê mặt bằng tại địa chỉ: <strong>{nfc(mbLocation)}</strong>.</p>
                  <p className="text-justify">1.2. Mục đích thuê: Sử dụng làm địa điểm hoạt động sản xuất kinh doanh hợp pháp theo quy định của pháp luật. Khi chuyển đổi mục đích hoạt động thì phải thông báo cho Bên A bằng văn bản.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 2: THỜI HẠN HỢP ĐỒNG, GIÁ CẢ VÀ PHƯƠNG THỨC THANH TOÁN</div>
                  <p className="text-justify">2.1. Thời hạn có hiệu lực của hợp đồng này là 01 năm kể từ ngày <strong>{fmtDate(mbStartDate)}</strong> đến hết ngày <strong>{fmtDate(mbEndDate)}</strong>.</p>
                  <p className="text-justify">2.2. Đơn giá thuê: <strong>{mbMonthlyPrice} VNĐ/tháng</strong> (Đơn giá nêu trong hợp đồng này đã bao gồm thuế VAT).</p>
                  <p className="text-justify">2.3. Phương thức thanh toán: Bên B thanh toán tiền cho Bên A mỗi tháng một lần bằng tiền mặt hoặc chuyển khoản trong vòng 10 ngày đầu của mỗi tháng. Nếu nộp chậm quá 01 tháng Bên A có quyền tính thêm lãi phạt chậm nộp.</p>
                  <p className="text-justify">2.4. Tiền ký quỹ: Bên B đồng ý chuyển số tiền <strong>{mbDepositAmount} VNĐ</strong> vào tài khoản ngân hàng cho Bên A trong vòng 01 tuần kể từ ngày ký hợp đồng. Số tiền này sẽ được trả lại cho Bên B khi hai bên thanh lý hợp đồng.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CỦA BÊN A</div>
                  <p className="text-justify">3.1. Bàn giao mặt bằng thuê đúng thời gian quy định cho Bên B.</p>
                  <p className="text-justify">3.2. Bảo đảm quyền sử dụng trọn vẹn và hợp pháp của Bên B đối với khu vực thuê trong suốt thời gian hiệu lực hợp đồng.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 4: QUYỀN VÀ NGHĨA VỤ CỦA BÊN B</div>
                  <p className="text-justify">4.1. Chịu trách nhiệm trước pháp luật về tính hợp pháp của hoạt động sản xuất kinh doanh. Nghiêm cấm lợi dụng hợp đồng để chứa chấp hàng giả, hàng lậu.</p>
                  <p className="text-justify">4.2. Thanh toán đầy đủ tiền điện, nước, internet và thực hiện nghĩa vụ thuế đối với Nhà nước.</p>
                  <p className="text-justify">4.3. Không được phép thế chấp, cho thuê lại hoặc chuyển nhượng mặt bằng thuê cho bên thứ ba vì bất kỳ lý do nào.</p>
                  <p className="text-justify">4.4. Đảm bảo an toàn phòng cháy chữa cháy (PCCC) và an ninh trật tự chung tại khu vực thuê.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 5: CHẤM DỨT HỢP ĐỒNG</div>
                  <p className="text-justify">Hợp đồng này được chấm dứt khi hết thời hạn thuê, khu vực bị giải tỏa theo quyết định của cơ quan nhà nước có thẩm quyền hoặc các trường hợp bất khả kháng theo quy định pháp luật.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 6: NGHĨA VỤ SAU KHI CHẤM DỨT HỢP ĐỒNG</div>
                  <p className="text-justify">Khi chấm dứt hợp đồng, Bên B có trách nhiệm bàn giao lại nguyên hiện trạng mặt bằng cho Bên A trong vòng 15 ngày và thanh toán toàn bộ chi phí tồn đọng.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 7: TRANH CHẤP VÀ GIẢI QUYẾT TRANH CHẤP</div>
                  <p className="text-justify">Mọi tranh phát sinh từ việc thực hiện hợp đồng trước hết sẽ được thương lượng hòa giải. Nếu không giải quyết được sẽ đưa ra Tòa án có thẩm quyền phán quyết.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 8: ĐIỀU KHOẢN CHUNG</div>
                  <p className="text-justify">Hợp đồng này được lập thành 02 (hai) bản gốc có giá trị pháp lý như nhau, mỗi bên giữ 01 bản để thực hiện.</p>
                </div>

                <div className="pt-8 grid grid-cols-2 text-center gap-4 border-t border-slate-300 font-serif">
                  <div>
                    <div className="font-bold uppercase text-[13pt]">ĐẠI DIỆN BÊN A</div>
                    <div className="italic text-[11pt] text-slate-700">(Ký và ghi rõ họ tên)</div>
                    <div className="h-24"></div>
                    <div className="font-bold uppercase text-[13pt]">{nfc(mbPartyAName)}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[13pt]">ĐẠI DIỆN BÊN B</div>
                    <div className="italic text-[11pt] text-slate-700">(Ký và ghi rõ họ tên)</div>
                    <div className="h-24"></div>
                    <div className="font-bold uppercase text-[13pt]">{nfc(mbPartyBName)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW 2: HỢP ĐỒNG THI CÔNG NHÀ Ở FULL TEXT (ĐẦY ĐỦ ĐIỀU KHOẢN) ── */}
            {selectedTemplate === 'construction' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-[13pt] uppercase tracking-normal">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt]">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-center pt-3 pb-1">
                  <h1 className="text-[16pt] font-bold uppercase tracking-wide">HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG</h1>
                  <p className="italic text-[13pt] text-slate-800 mt-1 no-indent text-center">
                    Căn cứ vào nhu cầu và khả năng hợp tác của hai bên. Hôm nay, ngày {fmtDate(constContractDate)}, chúng tôi gồm có:
                  </p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN THUÊ THI CÔNG XÂY DỰNG (Bên A):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>• Bà: <strong className="uppercase">{nfc(constPartyAName)}</strong></div>
                    <div>• CCCD số: <strong>{nfc(constPartyACccd)}</strong> | Địa chỉ: {nfc(constPartyAAddress)}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN NHẬN THI CÔNG XÂY DỰNG (Bên B):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>• Bà: <strong className="uppercase">{nfc(constPartyBName)}</strong></div>
                    <div>• CCCD số: <strong>{nfc(constPartyBCccd)}</strong></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">Điều 1: Nội dung và phạm vi công việc</div>
                  <p className="text-justify">1. Địa điểm thi công: {nfc(constSiteAddress)}.</p>
                  <p className="text-justify">2. Phạm vi công việc: Sửa chữa/tân trang phần tường (trát, bả, sơn lại), thay thế hoặc lát lại gạch nền/sàn, thi công đường dây điện nước, sửa chữa thay mới cửa mái tôn lan can theo thiết kế.</p>
                  <p className="text-justify">3. Chất lượng & tiêu chuẩn kỹ thuật: Đúng quy trình xây dựng dân dụng, an toàn lao động và vật liệu đảm bảo chất lượng theo thỏa thuận.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">Điều 2: Thời gian và tiến độ thực hiện</div>
                  <p className="text-justify">- Ngày khởi công: Ngày {fmtDate(constStartDate)}</p>
                  <p className="text-justify">- Ngày hoàn thành dự kiến: Ngày {fmtDate(constEndDate)}</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">Điều 3. Giá trị hợp đồng và phương thức thanh toán</div>
                  <p className="text-justify">- Tổng giá trị hợp đồng: <strong>{constTotalPrice} VNĐ</strong>.</p>
                  <p className="text-justify">- Đợt 1 (Thanh toán trước): <strong>{constDepositStage1} VNĐ</strong>.</p>
                  <p className="text-justify">- Đợt 2 (Số tiền còn lại): Thanh toán trước khi bàn giao hoàn thiện công trình là <strong>{constStage2Amount} VNĐ</strong>.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">Điều 4: Quyền và nghĩa vụ của các bên</div>
                  <p className="text-justify">1. Quyền & nghĩa vụ Bên A: Giám sát kiểm tra quá trình thi công, bàn giao mặt bằng sạch sẽ an toàn và thanh toán đúng hạn.</p>
                  <p className="text-justify">2. Quyền & nghĩa vụ Bên B: Thi công đúng thiết kế, quy chuẩn xây dựng, đảm bảo an toàn lao động, giữ gìn vệ sinh môi trường và bảo hành công trình.</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">Điều 5. Nghiệm thu, bàn giao và bảo hành</div>
                  <p className="text-justify">Thời gian bảo hành là 06 tháng kể từ ngày bàn giao đối với các lỗi kỹ thuật phát sinh trong quá trình thi công.</p>
                </div>

                <div className="pt-8 grid grid-cols-2 text-center gap-4 border-t border-slate-300 font-serif">
                  <div>
                    <div className="font-bold uppercase text-[13pt]">BÊN THUÊ THI CÔNG (BÊN A)</div>
                    <div className="italic text-[11pt] text-slate-700">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold uppercase text-[13pt]">{nfc(constPartyAName)}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[13pt]">BÊN NHẬN THI CÔNG (BÊN B)</div>
                    <div className="italic text-[11pt] text-slate-700">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold uppercase text-[13pt]">{nfc(constPartyBName)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW 3: HỢP ĐỒNG MUA BÁN HÀNG HÓA (ĐA MẶT HÀNG CHI TIẾT) ── */}
            {selectedTemplate === 'sale_contract' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-[13pt] uppercase tracking-normal">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt]">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-center pt-3 pb-1">
                  <h1 className="text-[16pt] font-bold uppercase tracking-wide">HỢP ĐỒNG MUA BÁN HÀNG HÓA</h1>
                  <p className="italic text-[13pt] text-slate-800 mt-1 no-indent text-center">Ngày {fmtDate(saleContractDate)}</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN BÁN (BÊN A): {nfc(saleSellerName)}</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>• Mã số thuế: {nfc(saleSellerTaxCode)}</div>
                    <div>• Tài khoản nhận tiền: {nfc(saleSellerBank)}</div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN MUA (BÊN B): {nfc(saleBuyerName)}</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>• CCCD/MST: {nfc(saleBuyerCccd)}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 1: DANH MỤC HÀNG HÓA MUA BÁN CHI TIẾT</div>
                  <table className="w-full border-collapse border border-black text-[12pt] my-2">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-2 font-bold text-center w-12">STT</th>
                        <th className="border border-black p-2 font-bold">TÊN HÀNG HÓA / SẢN PHẨM</th>
                        <th className="border border-black p-2 font-bold text-center w-16">ĐVT</th>
                        <th className="border border-black p-2 font-bold text-center w-20">SỐ LƯỢNG</th>
                        <th className="border border-black p-2 font-bold text-right">ĐƠN GIÁ (VNĐ)</th>
                        <th className="border border-black p-2 font-bold text-right">THÀNH TIỀN (VNĐ)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {saleItems.map((item, idx) => (
                        <tr key={item.id}>
                          <td className="border border-black p-2 text-center">{idx + 1}</td>
                          <td className="border border-black p-2 font-bold">{nfc(item.name)}</td>
                          <td className="border border-black p-2 text-center">{item.unit}</td>
                          <td className="border border-black p-2 text-center font-mono">{item.quantity}</td>
                          <td className="border border-black p-2 text-right font-mono">{item.price.toLocaleString('vi-VN')}</td>
                          <td className="border border-black p-2 text-right font-mono font-bold">
                            {(item.quantity * item.price).toLocaleString('vi-VN')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="font-bold bg-slate-100">
                        <td colSpan={5} className="border border-black p-2 text-center uppercase">TỔNG CỘNG TIỀN HÀNG THANH TOÁN</td>
                        <td className="border border-black p-2 text-right font-mono text-emerald-700">{totalSaleAmount.toLocaleString('vi-VN')} VNĐ</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU 2: PHƯƠNG THỨC GIAO HÀNG VÀ THANH TOÁN</div>
                  <p className="text-justify">2.1. Phương thức thanh toán: Chuyển khoản ngân hàng vào tài khoản Bên A.</p>
                  <p className="text-justify">2.2. Giao nhận: Bên A bàn giao đầy đủ số lượng và chất lượng hàng hóa cho Bên B tại địa điểm đã thỏa thuận.</p>
                </div>

                <div className="pt-8 grid grid-cols-2 text-center gap-4 border-t border-slate-300 font-serif">
                  <div>
                    <div className="font-bold uppercase text-[13pt]">ĐẠI DIỆN BÊN BÁN</div>
                    <div className="italic text-[11pt] text-slate-700">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold uppercase text-[13pt]">{nfc(saleSellerName)}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[13pt]">ĐẠI DIỆN BÊN MUA</div>
                    <div className="italic text-[11pt] text-slate-700">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold uppercase text-[13pt]">{nfc(saleBuyerName)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW 4: HỢP ĐỒNG THUÊ NHÀ Ở DÂN DỤNG ── */}
            {selectedTemplate === 'lease_house' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-[13pt] uppercase tracking-normal">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt]">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-center pt-3 pb-1">
                  <h1 className="text-[16pt] font-bold uppercase tracking-wide">HỢP ĐỒNG THUÊ NHÀ Ở DÂN DỤNG</h1>
                  <p className="italic text-[13pt] text-slate-800 mt-1 no-indent text-center">Ngày {fmtDate(mbContractDate)}</p>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN CHO THUÊ NHÀ (BÊN A):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>• Chủ nhà: <strong className="uppercase">{nfc(mbPartyAName)}</strong></div>
                    <div>• CCCD: <strong>{nfc(mbPartyACccd)}</strong></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold uppercase text-[13pt] no-indent">BÊN THUÊ NHÀ (BÊN B):</div>
                  <div className="pl-6 space-y-0.5 no-indent">
                    <div>• Người thuê: <strong className="uppercase">{nfc(mbPartyBName)}</strong></div>
                    <div>• CCCD: <strong>{nfc(mbPartyBCccd)}</strong></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-[13pt] no-indent">ĐIỀU KHOẢN CHÍNH HỢP ĐỒNG</div>
                  <p className="text-justify">1.1. Giá thuê nhà: <strong>{mbMonthlyPrice} VNĐ/tháng</strong>.</p>
                  <p className="text-justify">1.2. Tiền cọc giữ nhà: <strong>{mbDepositAmount} VNĐ</strong>.</p>
                </div>

                <div className="pt-8 grid grid-cols-2 text-center gap-4 border-t border-slate-300 font-serif">
                  <div>
                    <div className="font-bold uppercase text-[13pt]">CHỦ NHÀ (BÊN A)</div>
                    <div className="italic text-[11pt] text-slate-700">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold uppercase text-[13pt]">{nfc(mbPartyAName)}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase text-[13pt]">NGƯỜI THUÊ (BÊN B)</div>
                    <div className="italic text-[11pt] text-slate-700">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold uppercase text-[13pt]">{nfc(mbPartyBName)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW 5: GIẤY ĐỀ NGHỊ THANH TOÁN (FILE WORD ĐỘC LẬP) ── */}
            {selectedTemplate === 'payment_request' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-[13pt] uppercase tracking-normal">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-[13pt]">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="flex justify-center my-1">
                    <div className="w-36 border-b-2 border-slate-900"></div>
                  </div>
                </div>

                <div className="text-right italic text-[12pt] text-slate-700 pt-2 no-indent">
                  Ngày {fmtDate(prDate)}
                </div>

                <div className="text-center pt-2 pb-2">
                  <h1 className="text-[17pt] font-bold uppercase tracking-wide">GIẤY ĐỀ NGHỊ THANH TOÁN</h1>
                </div>

                <p className="no-indent font-bold">
                  Kính gửi: <span className="uppercase">{nfc(prRecipient)}</span>
                </p>

                <p className="text-justify">
                  - {nfc(prContractRef)}.
                </p>
                <p className="text-justify">
                  - Nay tôi kính đề nghị <strong>{nfc(prRecipient)}</strong> thanh toán cho tôi phần còn lại của hợp đồng thi công nhà ở nêu trên, với nội dung cụ thể như sau:
                </p>

                <div className="space-y-2 pl-4 no-indent">
                  <div>
                    <strong>1. Giá trị hợp đồng:</strong> <span className="font-bold text-emerald-700">{prTotalContractValue} VNĐ</span>
                  </div>
                  <div>
                    <strong>2. Thời hạn & Tiến độ thanh toán:</strong>
                    <div className="pl-4 space-y-1 mt-1">
                      <div>+ Đợt 1: Đã thanh toán với số tiền đợt đầu tiên là: <strong>{prStage1Paid} VNĐ</strong></div>
                      <div>+ Đợt 2: Đề nghị thanh toán số tiền đợt 2 là: <strong className="text-rose-600 font-mono text-[14pt]">{prStage2Request} VNĐ</strong></div>
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

                <p className="text-justify pt-2">
                  Trân trọng cảm ơn!
                </p>

                <div className="pt-8 grid grid-cols-2 text-center gap-4 border-t border-slate-300 font-serif">
                  <div></div>
                  <div>
                    <div className="font-bold uppercase text-[13pt]">NGƯỜI ĐỀ NGHỊ THANH TOÁN</div>
                    <div className="italic text-[11pt] text-slate-700">(Ký và ghi rõ họ tên)</div>
                    <div className="h-24"></div>
                    <div className="font-bold uppercase text-[13pt]">{nfc(prRequesterName)}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
