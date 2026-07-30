import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { formatMoneyInput, fmtDate } from '../../lib/utils';
import {
  FileText, Download, Printer, CheckCircle, Sparkles, Building, User, Calendar, DollarSign, ListChecks
} from 'lucide-react';

// Helper: Format Word HTML for export (.doc)
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
          margin: 20mm 20mm 20mm 20mm;
        }
        div.WordSection1 { page: WordSection1; }
        body { font-family: 'Times New Roman', Times, serif; font-size: 13pt; line-height: 1.4; color: #000000; }
        h1, h2, h3 { text-align: center; font-weight: bold; text-transform: uppercase; margin-bottom: 12pt; }
        p { margin-bottom: 6pt; text-align: justify; text-indent: 24pt; }
        .no-indent { text-indent: 0 !important; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .table-doc { border-collapse: collapse; width: 100%; margin-top: 10pt; margin-bottom: 10pt; }
        .table-doc th, .table-doc td { border: 1px solid #000; padding: 5pt 8pt; font-size: 12pt; }
        .sig-block { width: 100%; margin-top: 30pt; page-break-inside: avoid; }
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

  const [selectedTemplate, setSelectedTemplate] = useState<'lease_mb' | 'construction' | 'sale_contract' | 'lease_house'>('lease_mb');

  // ──────────────────────────────────────────────────────────────────────────
  // FORM STATE: HỢP ĐỒNG THUÊ MẶT BẰNG
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
  // FORM STATE: HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG
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
  // FORM STATE: HỢP ĐỒNG MUA BÁN HÀNG HÓA
  // ──────────────────────────────────────────────────────────────────────────
  const [saleContractDate, setSaleContractDate] = useState('2026-04-10');
  const [saleSellerName, setSaleSellerName] = useState('CÔNG TY TNHH VẬT LIỆU XÂY DỰNG AN PHÁT');
  const [saleSellerTaxCode, setSaleSellerTaxCode] = useState('0315894021');
  const [saleSellerBank, setSaleSellerBank] = useState('19034567890012 - Techcombank Chi nhánh Sài Gòn');

  const [saleBuyerName, setSaleBuyerName] = useState('ÔNG TRẦN VĂN MINH');
  const [saleBuyerCccd, setSaleBuyerCccd] = useState('0790 8501 9283');

  const [saleProductName, setSaleProductName] = useState('Thép cuộn & Xi măng Hà Tiên 1');
  const [saleQuantity, setSaleQuantity] = useState('25');
  const [saleUnitPrice, setSaleUnitPrice] = useState('18.500.000');

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
      {/* CSS PRINT MEDIA STYLING FOR PREVIEW SHEET */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; font-size: 12pt !important; }
          .print\\:hidden { display: none !important; }
          aside, header { display: none !important; }
          main { margin: 0 !important; padding: 0 !important; }
          .doc-preview-sheet { border: none !important; box-shadow: none !important; padding: 0 !important; margin: 0 !important; width: 100% !important; }
          @page { size: portrait; margin: 20mm; }
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 print:hidden">
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
            Thuê mặt bằng kinh doanh, cửa hàng, showroom
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
            Sửa chữa, tân trang & Thi công nhà ở dân dụng
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
            Mua bán hàng hóa & Giấy đề nghị thanh toán
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
            Cho thuê nhà nguyên căn, căn hộ dân dụng
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

          {/* FORM BIẾN SỐ 3: HỢP ĐỒNG MUA BÁN HÀNG HÓA */}
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

              <div className={`p-3.5 rounded-xl border space-y-2.5 ${sectionBoxBg}`}>
                <div className="font-bold text-amber-500 uppercase text-[11px]">HÀNG HÓA MUA BÁN</div>
                <div>
                  <label className="block text-[11px] font-medium mb-0.5">Tên sản phẩm / Hàng hóa</label>
                  <input
                    type="text"
                    value={saleProductName}
                    onChange={e => setSaleProductName(e.target.value)}
                    className={`w-full rounded-lg p-2 font-bold border ${inputStyle}`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Số lượng</label>
                    <input
                      type="number"
                      value={saleQuantity}
                      onChange={e => setSaleQuantity(e.target.value)}
                      className={`w-full rounded-lg p-2 font-bold border ${inputStyle}`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium mb-0.5">Đơn giá (VNĐ)</label>
                    <input
                      type="text"
                      value={saleUnitPrice}
                      onChange={e => setSaleUnitPrice(formatMoneyInput(e.target.value))}
                      className={`w-full rounded-lg p-2 font-mono font-bold text-emerald-600 dark:text-emerald-400 border ${inputStyle}`}
                    />
                  </div>
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
        </div>

        {/* ────────────────────────────────────────────────────────────────────────── */}
        {/* RIGHT COLUMN: LIVE PREVIEW & EXPORT TOOLBAR */}
        {/* ────────────────────────────────────────────────────────────────────────── */}
        <div className="lg:col-span-7 space-y-3">
          {/* Action Export Buttons */}
          <div className={`${containerCardBg} p-3 rounded-2xl border flex flex-wrap items-center justify-between gap-2 print:hidden`}>
            <span className="font-bold text-xs uppercase flex items-center space-x-2 text-sky-500">
              <FileText className="w-4 h-4" />
              <span>KHUNG LIVE PREVIEW VĂN BẢN HỢP ĐỒNG</span>
            </span>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  const previewElem = document.getElementById('document-preview-container');
                  if (previewElem) {
                    exportToWordDoc(`Hop_Dong_${selectedTemplate}_${mbContractDate}`, previewElem.innerHTML);
                  }
                }}
                className="flex items-center space-x-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                title="Xuất văn bản thành file Word (.doc / .docx) giữ nguyên định dạng"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xuất Word (.doc)</span>
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

          {/* LIVE PREVIEW A4 PAPER SHEET */}
          <div
            id="document-preview-container"
            className="doc-preview-sheet bg-white text-slate-950 p-8 sm:p-12 rounded-2xl border border-slate-200 shadow-2xl font-serif text-[13px] leading-relaxed space-y-4 max-w-[210mm] mx-auto transition-all"
          >
            {/* ── PREVIEW 1: HỢP ĐỒNG THUÊ MẶT BẰNG ── */}
            {selectedTemplate === 'lease_mb' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-xs">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="text-xs">----------o0o-----------</div>
                </div>

                <div className="text-center pt-2">
                  <h1 className="text-base font-bold uppercase tracking-wider">HỢP ĐỒNG THUÊ MẶT BẰNG KINH DOANH</h1>
                  <p className="italic text-xs text-slate-600 mt-1">Hôm nay, ngày {fmtDate(mbContractDate)} tại địa điểm cho thuê, chúng tôi gồm có:</p>
                </div>

                {/* BÊN A */}
                <div className="space-y-1">
                  <div className="font-bold uppercase">BÊN CHO THUÊ MẶT BẰNG (Sau đây gọi tắt là Bên A):</div>
                  <div className="pl-4 space-y-0.5">
                    <div>- Họ và tên: <strong className="uppercase">{mbPartyAName}</strong></div>
                    <div>- CCCD số: <strong>{mbPartyACccd}</strong> | Ngày cấp: {mbPartyACccdDate} | Nơi cấp: {mbPartyACccdPlace}</div>
                    <div>- Nơi đăng ký HKTT: {mbPartyAAddress}</div>
                  </div>
                </div>

                {/* BÊN B */}
                <div className="space-y-1">
                  <div className="font-bold uppercase">BÊN THUÊ MẶT BẰNG (Sau đây gọi tắt là Bên B):</div>
                  <div className="pl-4 space-y-0.5">
                    <div>- Họ và tên: <strong className="uppercase">{mbPartyBName}</strong></div>
                    <div>- CCCD số: <strong>{mbPartyBCccd}</strong> | Ngày cấp: {mbPartyBCccdDate} | Nơi cấp: {mbPartyBCccdPlace}</div>
                    <div>- Nơi đăng ký HKTT: {mbPartyBAddress}</div>
                  </div>
                </div>

                <p className="text-justify">
                  Hai bên cùng tự nguyện thỏa thuận và nhất trí ký kết Hợp đồng thuê mặt bằng kinh doanh với các điều khoản chi tiết như sau:
                </p>

                {/* ĐIỀU 1 */}
                <div>
                  <div className="font-bold">ĐIỀU 1: ĐỐI TƯỢNG VÀ MỤC ĐÍCH THUÊ</div>
                  <p className="text-justify pl-2">
                    1.1. Bên A đồng ý cho Bên B thuê và Bên B đồng ý thuê mặt bằng tại địa chỉ: <strong>{mbLocation}</strong>.
                  </p>
                  <p className="text-justify pl-2">
                    1.2. Mục đích thuê: Sử dụng làm địa điểm hoạt động sản xuất kinh doanh hợp pháp theo quy định của pháp luật.
                  </p>
                </div>

                {/* ĐIỀU 2 */}
                <div>
                  <div className="font-bold">ĐIỀU 2: THỜI HẠN HỢP ĐỒNG, ĐƠN GIÁ VÀ THANH TOÁN</div>
                  <p className="text-justify pl-2">
                    2.1. Thời hạn thuê là 01 (một) năm kể từ ngày <strong>{fmtDate(mbStartDate)}</strong> đến hết ngày <strong>{fmtDate(mbEndDate)}</strong>.
                  </p>
                  <p className="text-justify pl-2">
                    2.2. Đơn giá thuê mặt bằng: <strong>{mbMonthlyPrice} VNĐ/tháng</strong> (Bằng chữ: Năm mươi lăm triệu đồng mỗi tháng).
                  </p>
                  <p className="text-justify pl-2">
                    2.3. Phương thức thanh toán: Bên B thanh toán tiền thuê cho Bên A mỗi tháng một lần trong vòng 10 ngày đầu của mỗi tháng.
                  </p>
                  <p className="text-justify pl-2">
                    2.4. Tiền ký quỹ: Bên B chuyển cho Bên A số tiền ký quỹ là <strong>{mbDepositAmount} VNĐ</strong>. Số tiền này sẽ được Bên A hoàn trả cho Bên B sau khi thanh lý hợp đồng.
                  </p>
                </div>

                {/* ĐIỀU 3 */}
                <div>
                  <div className="font-bold">ĐIỀU 3: QUYỀN VÀ NGHĨA VỤ CÁC BÊN</div>
                  <p className="text-justify pl-2">
                    - Bên A cam kết bàn giao mặt bằng đúng thời hạn và bảo đảm quyền sử dụng hợp pháp cho Bên B.
                  </p>
                  <p className="text-justify pl-2">
                    - Bên B chịu trách nhiệm thanh toán tiền điện, nước, internet và tuân thủ các quy định phòng cháy chữa cháy, an toàn môi trường tại địa phương.
                  </p>
                </div>

                {/* SIGNATURE BLOCK */}
                <div className="pt-6 grid grid-cols-2 text-center gap-4 border-t border-slate-300">
                  <div>
                    <div className="font-bold uppercase">ĐẠI DIỆN BÊN A</div>
                    <div className="italic text-xs text-slate-500">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold uppercase">{mbPartyAName}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">ĐẠI DIỆN BÊN B</div>
                    <div className="italic text-xs text-slate-500">(Ký và ghi rõ họ tên)</div>
                    <div className="h-20"></div>
                    <div className="font-bold uppercase">{mbPartyBName}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW 2: HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG ── */}
            {selectedTemplate === 'construction' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-xs">Độc lập - Tự do - Hạnh phúc</div>
                  <div className="text-xs">----------o0o-----------</div>
                </div>

                <div className="text-center pt-2">
                  <h1 className="text-base font-bold uppercase tracking-wider">HỢP ĐỒNG THI CÔNG NHÀ Ở DÂN DỤNG</h1>
                  <p className="italic text-xs text-slate-600 mt-1">Hôm nay, ngày {fmtDate(constContractDate)}, tại công trình thi công, chúng tôi gồm có:</p>
                </div>

                <div>
                  <div className="font-bold uppercase">BÊN THUÊ THI CÔNG XÂY DỰNG (Bên A):</div>
                  <div className="pl-4">
                    <div>- Họ và tên: <strong className="uppercase">{constPartyAName}</strong></div>
                    <div>- CCCD số: <strong>{constPartyACccd}</strong> | Địa chỉ: {constPartyAAddress}</div>
                  </div>
                </div>

                <div>
                  <div className="font-bold uppercase">BÊN NHẬN THI CÔNG XÂY DỰNG (Bên B):</div>
                  <div className="pl-4">
                    <div>- Họ và tên: <strong className="uppercase">{constPartyBName}</strong></div>
                    <div>- CCCD số: <strong>{constPartyBCccd}</strong></div>
                  </div>
                </div>

                <div>
                  <div className="font-bold">ĐIỀU 1: NỘI DUNG VÀ TIẾN ĐỘ THI CÔNG</div>
                  <p className="text-justify pl-2">
                    1.1. Địa điểm thi công: <strong>{constSiteAddress}</strong>.
                  </p>
                  <p className="text-justify pl-2">
                    1.2. Tiến độ thực hiện: Khởi công ngày <strong>{fmtDate(constStartDate)}</strong>, dự kiến hoàn thành ngày <strong>{fmtDate(constEndDate)}</strong>.
                  </p>
                </div>

                <div>
                  <div className="font-bold">ĐIỀU 2: GIÁ TRỊ HỢP ĐỒNG VÀ ĐỀ NGHỊ THANH TOÁN</div>
                  <p className="text-justify pl-2">
                    2.1. Tổng giá trị thi công hợp đồng: <strong>{constTotalPrice} VNĐ</strong>.
                  </p>
                  <p className="text-justify pl-2">
                    2.2. Đợt 1 (Đặt cọc): Bên A đã thanh toán số tiền: <strong>{constDepositStage1} VNĐ</strong>.
                  </p>
                  <p className="text-justify pl-2">
                    2.3. Đợt 2 (Thanh toán phần còn lại theo Giấy đề nghị thanh toán): <strong>{constStage2Amount} VNĐ</strong>.
                  </p>
                </div>

                {/* GIẤY ĐỀ NGHỊ THANH TOÁN KÈM THEO */}
                <div className="border-t border-dashed pt-4 mt-4">
                  <div className="text-center font-bold uppercase text-xs">GIẤY ĐỀ NGHỊ THANH TOÁN (KÈM THEO HỢP ĐỒNG)</div>
                  <p className="mt-2 text-justify">
                    Kính gửi: <strong>Bà {constPartyAName}</strong>.
                  </p>
                  <p className="text-justify">
                    Căn cứ Hợp đồng thi công nhà ở ký ngày {fmtDate(constContractDate)}, tôi đề nghị Bà {constPartyAName} thanh toán số tiền đợt 2 là: <strong>{constStage2Amount} VNĐ</strong> vào tài khoản bên nhận thi công.
                  </p>
                </div>

                <div className="pt-6 grid grid-cols-2 text-center gap-4 border-t border-slate-300">
                  <div>
                    <div className="font-bold uppercase">BÊN THUÊ THI CÔNG (BÊN A)</div>
                    <div className="h-16"></div>
                    <div className="font-bold uppercase">{constPartyAName}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">BÊN NHẬN THI CÔNG (BÊN B)</div>
                    <div className="h-16"></div>
                    <div className="font-bold uppercase">{constPartyBName}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW 3: HỢP ĐỒNG MUA BÁN HÀNG HÓA ── */}
            {selectedTemplate === 'sale_contract' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-xs">Độc lập - Tự do - Hạnh phúc</div>
                </div>

                <div className="text-center pt-2">
                  <h1 className="text-base font-bold uppercase tracking-wider">HỢP ĐỒNG MUA BÁN HÀNG HÓA</h1>
                  <p className="italic text-xs text-slate-600 mt-1">Ngày {fmtDate(saleContractDate)}</p>
                </div>

                <div>
                  <div className="font-bold uppercase">BÊN BÁN: {saleSellerName}</div>
                  <div className="pl-4">
                    <div>- Mã số thuế: {saleSellerTaxCode}</div>
                    <div>- Tài khoản nhận tiền: {saleSellerBank}</div>
                  </div>
                </div>

                <div>
                  <div className="font-bold uppercase">BÊN MUA: {saleBuyerName}</div>
                  <div className="pl-4">
                    <div>- CCCD/MST: {saleBuyerCccd}</div>
                  </div>
                </div>

                <div>
                  <div className="font-bold mb-2">CHI TIẾT HÀNG HÓA MUA BÁN</div>
                  <table className="w-full border-collapse border border-black text-xs">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="border border-black p-2">TÊN HÀNG HÓA</th>
                        <th className="border border-black p-2 text-center">SỐ LƯỢNG</th>
                        <th className="border border-black p-2 text-right">ĐƠN GIÁ</th>
                        <th className="border border-black p-2 text-right">THÀNH TIỀN</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="border border-black p-2 font-bold">{saleProductName}</td>
                        <td className="border border-black p-2 text-center font-mono">{saleQuantity}</td>
                        <td className="border border-black p-2 text-right font-mono">{saleUnitPrice} VNĐ</td>
                        <td className="border border-black p-2 text-right font-mono font-bold">
                          {(parseInt(saleQuantity) * parseFloat(saleUnitPrice.replace(/\D/g, ''))).toLocaleString('vi-VN')} VNĐ
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="pt-6 grid grid-cols-2 text-center gap-4 border-t border-slate-300">
                  <div>
                    <div className="font-bold uppercase">ĐẠI DIỆN BÊN BÁN</div>
                    <div className="h-16"></div>
                    <div className="font-bold uppercase">{saleSellerName}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">ĐẠI DIỆN BÊN MUA</div>
                    <div className="h-16"></div>
                    <div className="font-bold uppercase">{saleBuyerName}</div>
                  </div>
                </div>
              </div>
            )}

            {/* ── PREVIEW 4: HỢP ĐỒNG THUÊ NHÀ Ở DÂN DỤNG ── */}
            {selectedTemplate === 'lease_house' && (
              <div className="space-y-4">
                <div className="text-center space-y-1">
                  <div className="font-bold text-sm uppercase tracking-wide">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                  <div className="font-bold text-xs">Độc lập - Tự do - Hạnh phúc</div>
                </div>

                <div className="text-center pt-2">
                  <h1 className="text-base font-bold uppercase tracking-wider">HỢP ĐỒNG THUÊ NHÀ Ở DÂN DỤNG</h1>
                  <p className="italic text-xs text-slate-600 mt-1">Ngày {fmtDate(mbContractDate)}</p>
                </div>

                <div>
                  <div className="font-bold uppercase">BÊN CHO THUÊ NHÀ (BÊN A):</div>
                  <div className="pl-4">
                    <div>- Chủ nhà: <strong className="uppercase">{mbPartyAName}</strong></div>
                    <div>- CCCD: <strong>{mbPartyACccd}</strong></div>
                  </div>
                </div>

                <div>
                  <div className="font-bold uppercase">BÊN THUÊ NHÀ (BÊN B):</div>
                  <div className="pl-4">
                    <div>- Ngườu thuê: <strong className="uppercase">{mbPartyBName}</strong></div>
                    <div>- CCCD: <strong>{mbPartyBCccd}</strong></div>
                  </div>
                </div>

                <div>
                  <div className="font-bold">ĐIỀU KHOẢN CHÍNH HỢP ĐỒNG</div>
                  <p className="text-justify pl-2">
                    - Giá thuê nhà: <strong>{mbMonthlyPrice} VNĐ/tháng</strong>.
                  </p>
                  <p className="text-justify pl-2">
                    - Tiền cọc giữ nhà: <strong>{mbDepositAmount} VNĐ</strong>.
                  </p>
                </div>

                <div className="pt-6 grid grid-cols-2 text-center gap-4 border-t border-slate-300">
                  <div>
                    <div className="font-bold uppercase">CHỦ NHÀ (BÊN A)</div>
                    <div className="h-16"></div>
                    <div className="font-bold uppercase">{mbPartyAName}</div>
                  </div>
                  <div>
                    <div className="font-bold uppercase">NGƯỜI THUÊ (BÊN B)</div>
                    <div className="h-16"></div>
                    <div className="font-bold uppercase">{mbPartyBName}</div>
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
