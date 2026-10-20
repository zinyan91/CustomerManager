import React, { useState, useMemo } from 'react';
import {
  Hammer,
  Plus,
  Trash2,
  FileSpreadsheet,
  Printer,
  RotateCcw,
  Eye,
  Edit3,
  Layers,
  Check,
} from 'lucide-react';
import {
  ESTIMATE_PRESETS,
  buildEstimateDocHtml,
  buildEstimateXlsx,
  type EstimateItem,
} from '../../lib/estimateExport';
import { downloadBytes } from '../../lib/xlsExport';
import { MIME_XLSX } from '../../lib/xlsxWriter';
import { printHtmlDoc } from '../../lib/printHtmlDoc';
import { todayIso, fmtNumber } from '../../lib/utils';
import { useToast, Toast } from '../Toast';

export const ConstructionEstimateView: React.FC = () => {
  const { toast, show, dismiss } = useToast();

  // Preset mặc định: Sửa chữa nhà
  const defaultPreset = ESTIMATE_PRESETS.sua_chua_nha;

  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [selectedPresetId, setSelectedPresetId] = useState<string>('sua_chua_nha');

  // Thông tin công trình & Bên liên quan
  const [sheetTitle, setSheetTitle] = useState(defaultPreset.title);
  const [partyAName, setPartyAName] = useState('');
  const [partyBName, setPartyBName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [contractDate, setContractDate] = useState(todayIso());
  const [creatorTitle, setCreatorTitle] = useState('Người lập');
  const [creatorName, setCreatorName] = useState('');

  // Danh sách hạng mục
  const [items, setItems] = useState<EstimateItem[]>(defaultPreset.items);

  // Vốn vay ngân hàng
  const [customLoanAmount, setCustomLoanAmount] = useState<number | null>(null);

  // Tính tổng dự toán
  const totalAmount = useMemo(() => {
    return items.reduce((sum, it) => sum + (it.quantity * it.price), 0);
  }, [items]);

  // Vốn vay (mặc định 80% tổng dự toán hoặc số tiền người dùng tùy chỉnh)
  const loanAmount = useMemo(() => {
    if (customLoanAmount !== null && customLoanAmount > 0) return customLoanAmount;
    return Math.round(totalAmount * 0.8);
  }, [totalAmount, customLoanAmount]);

  const ownCapital = Math.max(0, totalAmount - loanAmount);
  const loanPct = totalAmount > 0 ? ((loanAmount / totalAmount) * 100).toFixed(1) : '0.0';
  const ownPct = totalAmount > 0 ? ((ownCapital / totalAmount) * 100).toFixed(1) : '0.0';

  // Áp dụng mẫu Preset
  const handleSelectPreset = (presetKey: string) => {
    const preset = ESTIMATE_PRESETS[presetKey];
    if (!preset) return;
    setSelectedPresetId(presetKey);
    setSheetTitle(preset.title);
    setItems(preset.items.map(it => ({ ...it })));
    setCustomLoanAmount(preset.loanAmount);
    show('success', `Đã tải mẫu dự toán: ${preset.label.split('(')[0].trim()}`);
  };

  // Thêm dòng mới
  const handleAddItem = () => {
    const newItem: EstimateItem = {
      id: String(Date.now()),
      name: 'Hạng mục thi công mới',
      unit: 'm²',
      quantity: 1,
      price: 1000000,
      note: '',
    };
    setItems(prev => [...prev, newItem]);
  };

  // Xóa dòng
  const handleRemoveItem = (index: number) => {
    setItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Chỉnh sửa dòng
  const handleItemChange = (index: number, field: keyof EstimateItem, value: any) => {
    setItems(prev => {
      const clone = [...prev];
      clone[index] = {
        ...clone[index],
        [field]: field === 'quantity' || field === 'price' ? Number(value) || 0 : value,
      };
      return clone;
    });
  };

  // Dữ liệu gói gọn để xuất
  const estimateData = useMemo(() => ({
    sheetTitle,
    items,
    loanAmount,
    unitPrice: 0,
    creatorTitle,
    creatorName: creatorName || partyAName,
    siteAddress,
    contractDate,
    partyAName,
    partyBName,
    orientation: 'landscape' as const,
  }), [sheetTitle, items, loanAmount, creatorTitle, creatorName, partyAName, siteAddress, contractDate, partyBName]);

  // Xuất file Excel (.xlsx)
  const handleExportExcel = () => {
    try {
      const bytes = buildEstimateXlsx(estimateData);
      const safeName = (partyBName || partyAName || 'Cong_Trinh').trim().replace(/\s+/g, '_');
      const fileName = `BANG_DU_TOAN_CHI_TIET_${safeName}_${contractDate}.xlsx`;
      downloadBytes(bytes, fileName, MIME_XLSX);
      show('success', `Đã xuất bảng dự toán ra file Excel: ${fileName}`);
    } catch (e: any) {
      show('error', `Lỗi khi xuất Excel: ${e?.message || 'Không thể tạo file'}`);
    }
  };

  // In ấn / Xuất PDF
  const handlePrint = () => {
    try {
      const html = buildEstimateDocHtml(estimateData);
      printHtmlDoc(html, sheetTitle);
    } catch (e: any) {
      show('error', `Lỗi in ấn: ${e?.message || 'Không thể tạo bản in'}`);
    }
  };

  // Bản xem trước HTML
  const previewHtml = useMemo(() => {
    return buildEstimateDocHtml(estimateData);
  }, [estimateData]);

  return (
    <div data-workspace-page className="w-full space-y-0 font-app animate-in fade-in duration-150 pb-8 text-ink">
      <Toast toast={toast} onDismiss={dismiss} />

      {/* Thanh công cụ chính: Mẫu Preset & Các nút Thao tác */}
      <div data-workspace-panel className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 p-3.5 rounded-2xl border border-line bg-panel shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 shrink-0">
            <Hammer size={18} />
          </div>
          <div>
            <h1 className="text-sm sm:text-base font-bold text-ink">
              Bảng Dự Toán Thi Công Sửa Chữa
            </h1>
            <p className="text-[11px] text-ink-muted">
              Lập bảng dự toán chi tiết công trình, bóc tách khối lượng và kết xuất Excel / Bản in A4 ngang
            </p>
          </div>
        </div>

        {/* Nhóm nút hành động */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Chuyển đổi Nhập liệu / Xem trước */}
          <div className="flex items-center bg-surface p-0.5 rounded-lg border border-line shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('editor')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'editor'
                  ? 'bg-panel text-ink shadow-2xs font-bold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Edit3 size={13} />
              <span>Chỉnh sửa</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('preview')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'preview'
                  ? 'bg-panel text-ink shadow-2xs font-bold'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              <Eye size={13} />
              <span>Xem bản in</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-600/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="Xuất biểu mẫu Excel (.xlsx)"
          >
            <FileSpreadsheet size={14} />
            <span>Xuất Excel</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-panel hover:bg-surface text-ink text-xs font-semibold transition-all cursor-pointer shadow-2xs"
            title="In ấn hoặc lưu file PDF A4 ngang"
          >
            <Printer size={14} className="text-ink-muted" />
            <span>In / PDF</span>
          </button>
        </div>
      </div>

      {/* Dải chọn mẫu Preset nhanh */}
      <div data-workspace-panel className="flex items-center gap-2 p-2.5 rounded-xl border border-line bg-panel/70 overflow-x-auto no-scrollbar">
        <span className="text-[11px] font-bold text-ink-muted shrink-0 px-1 flex items-center gap-1.5">
          <Layers size={13} />
          Mẫu sẵn:
        </span>
        {Object.entries(ESTIMATE_PRESETS).map(([key, p]) => {
          const isSelected = selectedPresetId === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleSelectPreset(key)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all cursor-pointer border flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/40 font-bold shadow-2xs'
                  : 'bg-surface/60 text-ink-muted hover:text-ink hover:bg-surface border-line'
              }`}
            >
              {isSelected && <Check size={12} className="text-orange-600 dark:text-orange-400" />}
              <span>{p.label.split('(')[0].trim()}</span>
            </button>
          );
        })}
      </div>

      {activeTab === 'editor' ? (
        <div className="space-y-0">
          {/* Khối Thông tin chung */}
          <div data-workspace-panel className="p-4 rounded-2xl border border-line bg-panel space-y-3 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink pb-2 border-b border-line/70">
              1. Thông Tin Công Trình & Các Bên Liên Quan
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block mb-1 text-[11px] font-semibold text-ink-muted">
                  Tiêu đề bảng dự toán
                </label>
                <input
                  type="text"
                  value={sheetTitle}
                  onChange={e => setSheetTitle(e.target.value)}
                  className="w-full rounded-xl p-2.5 border border-line bg-surface focus:border-ink-muted text-xs text-ink outline-hidden"
                  placeholder="BẢNG DỰ TOÁN CÔNG TRÌNH SỬA CHỮA CHI TIẾT"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-semibold text-ink-muted">
                  Địa điểm thi công / Công trình
                </label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={e => setSiteAddress(e.target.value)}
                  className="w-full rounded-xl p-2.5 border border-line bg-surface focus:border-ink-muted text-xs text-ink outline-hidden"
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/TP"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-semibold text-ink-muted">
                  Chủ đầu tư (Bên A)
                </label>
                <input
                  type="text"
                  value={partyAName}
                  onChange={e => setPartyAName(e.target.value)}
                  className="w-full rounded-xl p-2.5 border border-line bg-surface focus:border-ink-muted text-xs text-ink font-semibold outline-hidden"
                  placeholder="Họ và tên chủ đầu tư"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-semibold text-ink-muted">
                  Đơn vị thi công / Nhà thầu (Bên B)
                </label>
                <input
                  type="text"
                  value={partyBName}
                  onChange={e => setPartyBName(e.target.value)}
                  className="w-full rounded-xl p-2.5 border border-line bg-surface focus:border-ink-muted text-xs text-ink font-semibold outline-hidden"
                  placeholder="Tên nhà thầu thi công hoặc tổ đội thợ"
                />
              </div>

              <div>
                <label className="block mb-1 text-[11px] font-semibold text-ink-muted">
                  Ngày lập bảng
                </label>
                <input
                  type="date"
                  value={contractDate}
                  onChange={e => setContractDate(e.target.value)}
                  className="w-full rounded-xl p-2.5 border border-line bg-surface focus:border-ink-muted text-xs text-ink outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block mb-1 text-[11px] font-semibold text-ink-muted">
                    Chức danh người lập
                  </label>
                  <input
                    type="text"
                    value={creatorTitle}
                    onChange={e => setCreatorTitle(e.target.value)}
                    className="w-full rounded-xl p-2.5 border border-line bg-surface focus:border-ink-muted text-xs text-ink outline-hidden"
                    placeholder="Người lập biểu"
                  />
                </div>
                <div>
                  <label className="block mb-1 text-[11px] font-semibold text-ink-muted">
                    Tên người lập biểu
                  </label>
                  <input
                    type="text"
                    value={creatorName}
                    onChange={e => setCreatorName(e.target.value)}
                    className="w-full rounded-xl p-2.5 border border-line bg-surface focus:border-ink-muted text-xs text-ink outline-hidden"
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bảng Hạng Mục Thi Công Chi Tiết */}
          <div data-workspace-panel className="p-4 rounded-2xl border border-line bg-panel space-y-3 shadow-2xs">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-line/70">
              <h2 className="text-xs font-bold uppercase tracking-wider text-ink">
                2. Bảng Kê Chi Tiết Khối Lượng Hạng Mục Công Việc ({items.length} hạng mục)
              </h2>
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-surface-elevated text-ink text-xs font-semibold transition-all cursor-pointer shadow-2xs"
              >
                <Plus size={13} className="text-accent" />
                <span>Thêm hạng mục</span>
              </button>
            </div>

            <div data-workspace-panel className="border border-line rounded-xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                <table className="w-full border-collapse text-left text-xs font-app">
                  <thead className="bg-surface/80 border-b border-line sticky top-0 z-10">
                    <tr>
                      <th className="p-2.5 text-center font-bold text-ink-muted w-10">STT</th>
                      <th className="p-2.5 font-bold text-ink-muted min-w-[200px]">Nội dung công việc</th>
                      <th className="p-2.5 text-center font-bold text-ink-muted w-20">ĐVT</th>
                      <th className="p-2.5 text-right font-bold text-ink-muted w-24">Khối lượng</th>
                      <th className="p-2.5 text-right font-bold text-ink-muted w-32">Đơn giá (VNĐ)</th>
                      <th className="p-2.5 text-right font-bold text-ink-muted w-36">Thành tiền (VNĐ)</th>
                      <th className="p-2.5 font-bold text-ink-muted min-w-[140px]">Ghi chú</th>
                      <th className="p-2.5 text-center font-bold text-ink-muted w-10">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line/60">
                    {items.map((it, idx) => {
                      const amount = it.quantity * it.price;
                      return (
                        <tr key={it.id || idx} className="hover:bg-surface/50 transition-colors">
                          <td className="p-2 text-center text-ink-muted font-medium">{idx + 1}</td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={it.name}
                              onChange={e => handleItemChange(idx, 'name', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-accent rounded-md px-1.5 py-1 text-xs text-ink font-medium"
                              placeholder="Tên hạng mục..."
                            />
                          </td>
                          <td className="p-2 text-center">
                            <input
                              type="text"
                              value={it.unit}
                              onChange={e => handleItemChange(idx, 'unit', e.target.value)}
                              className="w-full text-center bg-transparent border-0 focus:ring-1 focus:ring-accent rounded-md px-1 py-1 text-xs text-ink"
                              placeholder="m²"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="any"
                              value={it.quantity}
                              onChange={e => handleItemChange(idx, 'quantity', e.target.value)}
                              className="w-full text-right bg-transparent border-0 focus:ring-1 focus:ring-accent rounded-md px-1 py-1 text-xs text-ink font-mono"
                            />
                          </td>
                          <td className="p-2 text-right">
                            <input
                              type="number"
                              step="1000"
                              value={it.price}
                              onChange={e => handleItemChange(idx, 'price', e.target.value)}
                              className="w-full text-right bg-transparent border-0 focus:ring-1 focus:ring-accent rounded-md px-1 py-1 text-xs text-ink font-mono font-medium"
                            />
                          </td>
                          <td className="p-2 text-right font-bold text-ink font-mono">
                            {fmtNumber(amount)} đ
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              value={it.note || ''}
                              onChange={e => handleItemChange(idx, 'note', e.target.value)}
                              className="w-full bg-transparent border-0 focus:ring-1 focus:ring-accent rounded-md px-1.5 py-1 text-xs text-ink-muted"
                              placeholder="Ghi chú thi công..."
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-ink-faint hover:text-rose-500 rounded-md transition-colors cursor-pointer"
                              title="Xóa dòng"
                            >
                              <Trash2 size={13} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {items.length === 0 && (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-ink-muted text-xs">
                          Chưa có hạng mục nào. Nhấn "+ Thêm hạng mục" hoặc chọn một Mẫu sẵn ở trên.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  {/* Hàng TỔNG CỘNG bắt buộc là hàng cuối cùng của bảng tính theo chuẩn AGENTS.md */}
                  <tfoot className="bg-surface/90 border-t-2 border-line font-bold">
                    <tr>
                      <td colSpan={5} className="p-3 text-right uppercase tracking-wider text-ink font-bold">
                        TỔNG CỘNG DỰ TOÁN:
                      </td>
                      <td className="p-3 text-right text-sm font-bold text-ink font-mono text-emerald-600 dark:text-emerald-400">
                        {fmtNumber(totalAmount)} đ
                      </td>
                      <td colSpan={2} className="p-3 text-xs text-ink-muted">
                        (Đã bao gồm vật tư & nhân công)
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* Cơ cấu nguồn vốn & Vốn vay ngân hàng */}
          <div data-workspace-panel className="p-4 rounded-2xl border border-line bg-panel space-y-3 shadow-2xs">
            <h2 className="text-xs font-bold uppercase tracking-wider text-ink pb-2 border-b border-line/70">
              3. Cơ Cấu Nguồn Vốn & Tài Trợ Tín Dụng
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div data-workspace-panel className="p-3 rounded-xl border border-line bg-surface">
                <span className="text-[11px] font-semibold text-ink-muted block mb-1">
                  Tổng mức đầu tư công trình
                </span>
                <span className="text-base font-bold text-ink font-mono">
                  {fmtNumber(totalAmount)} đ
                </span>
                <span className="text-[11px] text-ink-muted block mt-1">100% dự toán</span>
              </div>

              <div data-workspace-panel className="p-3 rounded-xl border border-line bg-surface">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-semibold text-ink-muted">
                    Vốn ngân hàng cho vay ({loanPct}%)
                  </span>
                  {customLoanAmount !== null && (
                    <button
                      type="button"
                      onClick={() => setCustomLoanAmount(null)}
                      className="text-[10px] text-accent hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw size={10} />
                      Chuẩn 80%
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  step="1000000"
                  value={loanAmount}
                  onChange={e => setCustomLoanAmount(Number(e.target.value) || 0)}
                  className="w-full text-base font-bold text-blue-600 dark:text-blue-400 font-mono bg-transparent border-0 border-b border-line focus:ring-0 p-0"
                />
                <span className="text-[11px] text-ink-muted block mt-1">
                  Mức đề nghị cấp tín dụng
                </span>
              </div>

              <div data-workspace-panel className="p-3 rounded-xl border border-line bg-surface">
                <span className="text-[11px] font-semibold text-ink-muted block mb-1">
                  Vốn tự có đối ứng ({ownPct}%)
                </span>
                <span className="text-base font-bold text-ink font-mono text-amber-600 dark:text-amber-400">
                  {fmtNumber(ownCapital)} đ
                </span>
                <span className="text-[11px] text-ink-muted block mt-1">
                  Vốn tự tích lũy của khách hàng
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Tab Xem trước văn bản in */
        <div data-workspace-panel className="p-4 rounded-2xl border border-line bg-panel space-y-3 shadow-2xs">
          <div className="flex items-center justify-between pb-2 border-b border-line/70">
            <span className="text-xs font-bold text-ink uppercase tracking-wider">
              Bản In Xem Trước Khổ A4 Ngang (Quy Chuẩn In Ấn & Báo Cáo)
            </span>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-surface hover:bg-panel text-ink text-xs font-semibold cursor-pointer shadow-2xs"
            >
              <Printer size={13} />
              <span>In bản này</span>
            </button>
          </div>

          <div className="border border-line rounded-xl p-4 bg-white text-black overflow-x-auto shadow-inner min-h-[500px]">
            <div
              dangerouslySetInnerHTML={{ __html: previewHtml }}
              className="preview-content"
            />
          </div>
        </div>
      )}
    </div>
  );
};
