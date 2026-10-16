import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  Building2,
  FileSpreadsheet,
  RotateCcw,
  Save,
  Sparkles,
  Upload,
} from 'lucide-react';
import type {
  CorporateFinancialProfile,
  B01aStatement,
  B02Statement,
  B01bStatement,
} from '../../types/corporateFinancial';
import {
  CORPORATE_FINANCIAL_STORAGE_KEY as STORAGE_KEY,
  createSampleCorporateProfile,
  createEmptyB01a,
  createEmptyB02,
  createEmptyB01b,
} from '../../lib/corporateFinancialDefaults';
import {
  computeB01a,
  computeB02,
  computeB01b,
  computeFinancialRatios,
} from '../../lib/corporateFinancialFormulas';
import { exportCorporateFinancialToExcel } from '../../lib/corporateFinancialExport';
import { setActiveLiveFinancialProfile } from '../../lib/ai/financialContext';
import { B01aFinancialPositionTab } from '../corporateFinancial/B01aFinancialPositionTab';
import { B02IncomeStatementTab } from '../corporateFinancial/B02IncomeStatementTab';
import { B01bBalanceSheetTab } from '../corporateFinancial/B01bBalanceSheetTab';
import { FinancialRatiosCard } from '../corporateFinancial/FinancialRatiosCard';
import { AiChatDialog } from '../ai/AiChatDialog';
import { Toast, type ToastMessage } from '../Toast';
import { UI } from '../../lib/uiClasses';


export const CorporateFinancialView: React.FC = () => {
  const [profile, setProfile] = useState<CorporateFinancialProfile>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // ignore
    }
    return createSampleCorporateProfile();
  });

  const [activeTab, setActiveTab] = useState<'b01a' | 'b02' | 'b01b'>('b01a');
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [toast, setToast] = useState<ToastMessage | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setActiveLiveFinancialProfile(profile);
    return () => {
      setActiveLiveFinancialProfile(null);
    };
  }, [profile]);

  // Compute live statements
  const computedB01a = useMemo(() => computeB01a(profile.b01a), [profile.b01a]);
  const computedB02 = useMemo(() => computeB02(profile.b02), [profile.b02]);
  const computedB01b = useMemo(() => computeB01b(profile.b01b), [profile.b01b]);
  const financialRatios = useMemo(
    () => computeFinancialRatios(computedB01a, computedB02),
    [computedB01a, computedB02]
  );

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const { parseCorporateFinancialExcel } = await import('../../lib/corporateFinancialImport');
      const res = parseCorporateFinancialExcel(buffer);
      setProfile(res.profile);

      const summary = [];
      if (res.matchedItemsCount.b01a > 0) summary.push(`B01a: ${res.matchedItemsCount.b01a} chỉ tiêu`);
      if (res.matchedItemsCount.b02 > 0) summary.push(`B02: ${res.matchedItemsCount.b02} chỉ tiêu`);
      if (res.matchedItemsCount.b01b > 0) summary.push(`B01b: ${res.matchedItemsCount.b01b} chỉ tiêu`);

      showToast(
        'success',
        `Tải lên thành công "${file.name}"! (${summary.join(', ') || 'Đã nạp số liệu'})`
      );
    } catch (err: any) {
      showToast('error', `Lỗi đọc file Excel: ${err?.message || 'Không thể xử lý định dạng file này'}`);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateB01a = (updated: B01aStatement) => {
    const computed = computeB01a(updated);
    setProfile(prev => ({
      ...prev,
      b01a: computed,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateB02 = (updated: B02Statement) => {
    const computed = computeB02(updated);
    setProfile(prev => ({
      ...prev,
      b02: computed,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleUpdateB01b = (updated: B01bStatement) => {
    const computed = computeB01b(updated);
    setProfile(prev => ({
      ...prev,
      b01b: computed,
      updatedAt: new Date().toISOString(),
    }));
  };

  const handleSaveDraft = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
      showToast('success', 'Đã lưu bản nháp Báo cáo tài chính doanh nghiệp thành công!');
    } catch {
      showToast('error', 'Lỗi khi lưu vào bộ nhớ trình duyệt.');
    }
  };

  const handleLoadSample = () => {
    const sample = createSampleCorporateProfile();
    setProfile(sample);
    showToast('success', 'Đã nạp bộ số liệu mẫu Doanh nghiệp SME chuẩn Thông tư 133/2016/TT-BTC!');
  };

  const handleReset = () => {
    const yr = new Date().getFullYear();
    setProfile({
      id: `corp_${Date.now()}`,
      name: 'DOANH NGHIỆP MỚI',
      taxCode: '',
      address: '',
      year: yr,
      updatedAt: new Date().toISOString(),
      b01a: createEmptyB01a(yr),
      b02: createEmptyB02(yr),
      b01b: createEmptyB01b(yr),
    });
    showToast('success', 'Đã làm mới dữ liệu biểu mẫu.');
  };

  const handleExportExcel = () => {
    try {
      exportCorporateFinancialToExcel(computedB01a, computedB02, computedB01b);
      showToast('success', 'Đã xuất trọn bộ 3 biểu mẫu Excel (.xlsx) chuẩn Thông tư 133!');
    } catch (err: any) {
      showToast('error', `Lỗi xuất Excel: ${err?.message || 'Không xác định'}`);
    }
  };

  const handleCompanyFieldChange = (
    field: 'name' | 'taxCode' | 'address' | 'year',
    val: string | number
  ) => {
    setProfile(prev => {
      const nextYear = field === 'year' ? Number(val) : prev.year;
      return {
        ...prev,
        [field]: val,
        b01a: {
          ...prev.b01a,
          companyName: field === 'name' ? String(val) : prev.b01a.companyName,
          taxCode: field === 'taxCode' ? String(val) : prev.b01a.taxCode,
          address: field === 'address' ? String(val) : prev.b01a.address,
          periodYear: nextYear,
        },
        b02: {
          ...prev.b02,
          companyName: field === 'name' ? String(val) : prev.b02.companyName,
          taxCode: field === 'taxCode' ? String(val) : prev.b02.taxCode,
          address: field === 'address' ? String(val) : prev.b02.address,
          periodYear: nextYear,
        },
        b01b: {
          ...prev.b01b,
          companyName: field === 'name' ? String(val) : prev.b01b.companyName,
          taxCode: field === 'taxCode' ? String(val) : prev.b01b.taxCode,
          address: field === 'address' ? String(val) : prev.b01b.address,
          periodYear: nextYear,
        },
      };
    });
  };

  return (
    <div className="space-y-4 text-xs pb-6 font-app">
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Header Info Card */}
      <div className={`${UI.containerCardBg} rounded-2xl p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs space-y-4`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-line/60 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-accent-soft text-accent shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-wide text-accent uppercase">
                BÁO CÁO TÀI CHÍNH DOANH NGHIỆP (THÔNG TƯ 133/2016/TT-BTC)
              </h1>
              <p className="text-xs text-ink-muted mt-0.5">
                Áp dụng cho Doanh nghiệp vừa và nhỏ (DNNVV) — Ban hành ngày 26/08/2016 của Bộ Tài chính
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAiChatOpen((prev) => !prev)}
              aria-pressed={isAiChatOpen}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                isAiChatOpen
                  ? 'border-teal-600 bg-teal-600 text-white dark:bg-teal-500 dark:border-teal-500 dark:text-slate-900 shadow-2xs'
                  : 'border-teal-600/40 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300'
              }`}
              title="Mở Trợ lý AI phân tích Báo cáo tài chính"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Trợ lý AI</span>
            </button>
            <button
              type="button"
              onClick={handleLoadSample}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-accent/40 bg-accent/10 text-accent hover:bg-accent/20 cursor-pointer transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Nạp mẫu SME</span>
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-line bg-surface hover:bg-panel text-ink cursor-pointer transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 text-ink-muted" />
              <span>Làm mới</span>
            </button>
            <button
              type="button"
              onClick={handleSaveDraft}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border border-line bg-surface hover:bg-panel text-ink cursor-pointer transition-all"
            >
              <Save className="w-3.5 h-3.5 text-emerald-600" />
              <span>Lưu nháp</span>
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls,.csv"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-accent/40 bg-accent/15 text-accent hover:bg-accent/25 cursor-pointer transition-all shadow-2xs"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Tải lên Excel</span>
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất Excel (.xlsx)</span>
            </button>
          </div>
        </div>

        {/* Company Profile Form */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Tên Doanh Nghiệp
            </label>
            <input
              type="text"
              value={profile.name}
              onChange={e => handleCompanyFieldChange('name', e.target.value)}
              className={`w-full p-2 text-xs font-medium rounded-lg border ${UI.inputStyle}`}
              placeholder="Nhập tên doanh nghiệp..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Mã Số Thuế
            </label>
            <input
              type="text"
              value={profile.taxCode}
              onChange={e => handleCompanyFieldChange('taxCode', e.target.value)}
              className={`w-full p-2 text-xs font-medium rounded-lg border ${UI.inputStyle}`}
              placeholder="Nhập mã số thuế..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Địa Chỉ Doanh Nghiệp
            </label>
            <input
              type="text"
              value={profile.address}
              onChange={e => handleCompanyFieldChange('address', e.target.value)}
              className={`w-full p-2 text-xs font-medium rounded-lg border ${UI.inputStyle}`}
              placeholder="Nhập địa chỉ trụ sở..."
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1">
              Năm Tài Chính
            </label>
            <input
              type="number"
              value={profile.year}
              onChange={e => handleCompanyFieldChange('year', Number(e.target.value))}
              className={`w-full p-2 text-xs font-mono font-medium rounded-lg border ${UI.inputStyle}`}
            />
          </div>
        </div>
      </div>

      {/* 3 KPI & Phân tích tài chính Cards hiển thị trực quan ngay trên đầu */}
      <FinancialRatiosCard ratios={financialRatios} />

      {/* Tab Navigation Pills cho 3 Biểu mẫu chuẩn TT 133 */}
      <div className="inline-flex p-1 rounded-2xl bg-panel/85 border border-line/65 backdrop-blur-xl shadow-xs gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveTab('b01a')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
            activeTab === 'b01a'
              ? 'bg-accent text-accent-ink shadow-xs'
              : 'text-ink-muted hover:text-ink hover:bg-surface'
          }`}
        >
          1. Báo cáo tình hình tài chính (Mẫu B01a)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('b02')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
            activeTab === 'b02'
              ? 'bg-accent text-accent-ink shadow-xs'
              : 'text-ink-muted hover:text-ink hover:bg-surface'
          }`}
        >
          2. Báo cáo kết quả kinh doanh (Mẫu B02)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('b01b')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${
            activeTab === 'b01b'
              ? 'bg-accent text-accent-ink shadow-xs'
              : 'text-ink-muted hover:text-ink hover:bg-surface'
          }`}
        >
          3. Bảng cân đối kế toán (Mẫu B01b)
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === 'b01a' && (
        <B01aFinancialPositionTab
          statement={computedB01a}
          onChange={handleUpdateB01a}
        />
      )}

      {activeTab === 'b02' && (
        <B02IncomeStatementTab
          statement={computedB02}
          onChange={handleUpdateB02}
        />
      )}

      {activeTab === 'b01b' && (
        <B01bBalanceSheetTab
          statement={computedB01b}
          onChange={handleUpdateB01b}
        />
      )}

      <AiChatDialog
        isOpen={isAiChatOpen}
        onClose={() => setIsAiChatOpen(false)}
        mode="drawer"
        liveFinancialProfile={profile}
      />
    </div>
  );
};
