import React, { lazy, Suspense } from 'react';
import { ClipboardList, FileDown, RotateCcw, Loader2 } from 'lucide-react';
import { type BusinessPlanInput } from '../../lib/businessPlan';
import { UI } from '../../lib/uiClasses';
import { DateInput } from '../DateInput';
import { Toast } from '../Toast';
import { BusinessPlanSheet } from '../businessPlan/BusinessPlanSheet';
import { UNIT_LABEL, type MoneyUnit } from '../businessPlan/units';
import { fmtNumber } from '../../lib/utils';
import {
  useBusinessPlanController,
  BASIS_FIELDS,
} from '../../hooks/useBusinessPlanController';

const ToiLoanCalcSection = lazy(() => import('../businessPlan/ToiLoanCalcSection').then(m => ({ default: m.ToiLoanCalcSection })));

const TabFallback = () => (
  <div className="flex items-center justify-center p-8 text-ink-muted">
    <Loader2 className="w-5 h-5 animate-spin text-accent mr-2" />
    <span className="text-xs">Đang tải phân hệ TOI...</span>
  </div>
);

export const BusinessPlanView: React.FC = () => {
  const {
    input,
    unit,
    setUnit,
    activeSubTab,
    setActiveSubTab,
    notification,
    setNotification,
    growthFactorStr,
    setGrowthFactorStr,
    result,
    patch,
    exportSheets,
    reset,
    handleGrowthFactorChange,
  } = useBusinessPlanController();

  const labelCls = `block mb-1 text-[10px] uppercase tracking-wide ${UI.labelStyle}`;
  const controlCls = `w-full rounded-md p-2 text-xs border ${UI.inputStyle}`;

  return (
    <div className="space-y-4 text-xs pb-4 font-app">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Sub-tab navigation pill capsule */}
      <div className="inline-flex p-1 rounded-2xl bg-panel/85 border border-line/65 backdrop-blur-xl shadow-xs gap-1.5">
        <button
          type="button"
          onClick={() => setActiveSubTab('sheet')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${activeSubTab === 'sheet'
            ? 'bg-accent text-accent-ink shadow-xs'
            : 'text-ink-muted hover:text-ink hover:bg-surface'
            }`}
        >
          Bảng Phương án & Hạn mức
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('toi')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-2xs ${activeSubTab === 'toi'
            ? 'bg-accent text-accent-ink shadow-xs'
            : 'text-ink-muted hover:text-ink hover:bg-surface'
            }`}
        >
          Dự phóng Thu nhập TOI
        </button>
      </div>

      {activeSubTab === 'toi' ? (
        <Suspense fallback={<TabFallback />}>
          <ToiLoanCalcSection />
        </Suspense>
      ) : (
        <>
          <div className={`${UI.containerCardBg} rounded-2xl p-5 border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card space-y-4 animate-in fade-in duration-150`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-accent-soft text-accent shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-bold tracking-wider text-accent uppercase">BẢNG TÍNH HẠN MỨC</h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportSheets}
                  className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3.5 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Xuất Excel Tờ trình (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Financial Health KPI Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-xl p-3.5 border border-line/60 bg-surface/75 backdrop-blur-md space-y-1 specular-card interactive-card">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Doanh thu kế hoạch năm</div>
                <div className="font-mono font-bold text-base text-accent">{fmtNumber(result.plan.revenueAnnual)} {UNIT_LABEL[unit]}</div>
              </div>

              <div className="rounded-xl p-3.5 border border-line/60 bg-surface/75 backdrop-blur-md space-y-1 specular-card interactive-card">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Lợi nhuận ròng kế hoạch</div>
                <div className="font-mono font-bold text-base text-pos">{fmtNumber(result.plan.profitAfterTax)} {UNIT_LABEL[unit]}</div>
              </div>

              <div className="rounded-xl p-3.5 border border-line/60 bg-surface/75 backdrop-blur-md space-y-1 specular-card interactive-card">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Hạn mức đề xuất cấp</div>
                <div className="font-mono font-bold text-base text-warn">
                  {fmtNumber(result.limit ? result.limit.plan.avgWorkingCapitalNeed : result.eachTime ? result.eachTime.recommended : 0)} {UNIT_LABEL[unit]}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-7 gap-2.5 items-end">
              <label className="block col-span-2">
                <span className={labelCls}>Loại hồ sơ</span>
                <select value={input.kind}
                  onChange={e => patch({ kind: e.target.value as BusinessPlanInput['kind'] })}
                  className={`${controlCls} rounded-xl`}>
                  <option value="limit">Cấp hạn mức tín dụng</option>
                  <option value="each_time">Cho vay từng lần</option>
                </select>
              </label>

              <label className="block">
                <span className={labelCls}>Năm thực hiện</span>
                <input type="text" inputMode="numeric" value={input.actualYear || ''}
                  onChange={e => patch({ actualYear: parseInt(e.target.value, 10) || 0 })}
                  className={`${controlCls} rounded-xl font-mono text-right`} />
              </label>

              <label className="block">
                <span className={labelCls}>Năm kế hoạch</span>
                <input type="text" inputMode="numeric" value={input.planYear || ''}
                  onChange={e => patch({ planYear: parseInt(e.target.value, 10) || 0 })}
                  className={`${controlCls} rounded-xl font-mono text-right`} />
              </label>

              <label className="block">
                <span className={labelCls}>Hệ số dự phóng</span>
                <input type="text" inputMode="decimal"
                  value={growthFactorStr ?? (input.growthFactor ? String(input.growthFactor) : '')}
                  onChange={e => handleGrowthFactorChange(e.target.value)}
                  onBlur={() => setGrowthFactorStr(null)}
                  className={`${controlCls} rounded-xl font-mono text-right`} />
              </label>

              <label className="block">
                <span className={labelCls}>Thời điểm cân đối</span>
                <DateInput value={input.balanceSheetDate}
                  onChange={v => patch({ balanceSheetDate: v })}
                  className={`${controlCls} rounded-xl font-mono`} />
              </label>

              <div>
                <span className={labelCls}>Đơn vị</span>
                <div className="flex gap-1">
                  {(['million', 'vnd'] as MoneyUnit[]).map(x => (
                    <button key={x} type="button" onClick={() => setUnit(x)}
                      className={`flex-1 px-2 py-2 rounded-xl text-[11px] font-bold border transition-colors cursor-pointer shadow-2xs ${unit === x ? 'bg-accent text-accent-ink border-accent' : 'bg-surface/80 text-ink-muted border-line/70 hover:bg-surface'
                        }`}>
                      {UNIT_LABEL[x]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-line/60">
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={reset}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-line/70 text-ink-muted text-[11px] font-semibold hover:border-accent hover:text-accent cursor-pointer bg-surface/60 hover:bg-surface transition-colors">
                  <RotateCcw className="w-3.5 h-3.5" /> Làm mới
                </button>
                <button type="button" onClick={exportSheets}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent text-accent-ink text-[11px] font-bold hover:opacity-90 cursor-pointer shadow-xs">
                  <FileDown className="w-3.5 h-3.5" />
                  Xuất {input.kind === 'limit' ? '3' : '2'} phụ lục
                </button>
              </div>
            </div>
          </div>

          <BusinessPlanSheet input={input} result={result} unit={unit} onChange={patch} />

          <div className={`${UI.containerCardBg} rounded-2xl border border-line/65 p-4 sm:p-5 bg-panel/85 backdrop-blur-xl shadow-xs specular-card`}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.09em] text-accent mb-2">
              Cơ sở xác định — in ra phụ lục kết quả kinh doanh
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BASIS_FIELDS.map(({ key, label }) => (
                <label key={key} className="block">
                  <span className={labelCls}>{label}</span>
                  <textarea
                    rows={2}
                    value={input.basis[key] || ''}
                    onChange={e => patch({ basis: { ...input.basis, [key]: e.target.value } })}
                    placeholder="Bỏ trống thì phụ lục tự ghi tỷ trọng trên doanh thu"
                    className={`${controlCls} rounded-xl`}
                  />
                </label>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
