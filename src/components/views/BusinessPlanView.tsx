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
    <div className="space-y-3 text-xs pb-4">
      <Toast toast={notification} onDismiss={() => setNotification(null)} />

      {/* Sub-tab navigation */}
      <div className="flex border-b border-line gap-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('sheet')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeSubTab === 'sheet'
              ? 'border-accent text-accent bg-accent-soft/30'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Bảng Phương án & Hạn mức
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('toi')}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeSubTab === 'toi'
              ? 'border-accent text-accent bg-accent-soft/30'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Dự phóng Thu nhập TOI (Tín dụng VNĐ)
        </button>
      </div>

      {activeSubTab === 'toi' ? (
        <Suspense fallback={<TabFallback />}>
          <ToiLoanCalcSection />
        </Suspense>
      ) : (
        <>
          <div className={`${UI.containerCardBg} rounded-xl p-4 border border-line shadow-sm space-y-4`}>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line pb-3">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-accent uppercase">BẢNG TÍNH HẠN MỨC</h2>
                  <p className="text-[11px] text-ink-faint">
                    Thẩm định phương án kinh doanh & nhu cầu vốn lưu động
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={exportSheets}
                  className="bg-accent hover:opacity-90 text-accent-ink text-xs px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all shadow-xs"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Xuất Excel Tờ trình (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Financial Health KPI Header */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-panel-muted rounded-lg p-3 border border-line space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Doanh thu kế hoạch năm</div>
                <div className="font-mono font-bold text-sm text-accent">{fmtNumber(result.plan.revenueAnnual)} {UNIT_LABEL[unit]}</div>
                <div className="text-[11px] text-ink-faint">Quy mô doanh thu dự kiến</div>
              </div>

              <div className="bg-panel-muted rounded-lg p-3 border border-line space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Lợi nhuận ròng kế hoạch</div>
                <div className="font-mono font-bold text-sm text-pos">{fmtNumber(result.plan.profitAfterTax)} {UNIT_LABEL[unit]}</div>
                <div className="text-[11px] text-ink-faint">Lợi nhuận sau thuế năm</div>
              </div>

              <div className="bg-panel-muted rounded-lg p-3 border border-line space-y-0.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Hạn mức đề xuất cấp</div>
                <div className="font-mono font-bold text-sm text-warn">
                  {fmtNumber(result.limit ? result.limit.plan.avgWorkingCapitalNeed : result.eachTime ? result.eachTime.recommended : 0)} {UNIT_LABEL[unit]}
                </div>
                <div className="text-[11px] text-ink-faint">Nhu cầu vốn lưu động bình quân</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
              <label className="block col-span-2">
                <span className={labelCls}>Loại hồ sơ</span>
                <select value={input.kind}
                  onChange={e => patch({ kind: e.target.value as BusinessPlanInput['kind'] })}
                  className={controlCls}>
                  <option value="limit">Cấp hạn mức tín dụng</option>
                  <option value="each_time">Cho vay từng lần</option>
                </select>
              </label>

              <label className="block">
                <span className={labelCls}>Năm thực hiện</span>
                <input type="text" inputMode="numeric" value={input.actualYear || ''}
                  onChange={e => patch({ actualYear: parseInt(e.target.value, 10) || 0 })}
                  className={`${controlCls} font-mono text-right`} />
              </label>

              <label className="block">
                <span className={labelCls}>Năm kế hoạch</span>
                <input type="text" inputMode="numeric" value={input.planYear || ''}
                  onChange={e => patch({ planYear: parseInt(e.target.value, 10) || 0 })}
                  className={`${controlCls} font-mono text-right`} />
              </label>

              <label className="block">
                <span className={labelCls}>Hệ số dự phóng</span>
                <input type="text" inputMode="decimal"
                  value={growthFactorStr ?? (input.growthFactor ? String(input.growthFactor) : '')}
                  onChange={e => handleGrowthFactorChange(e.target.value)}
                  onBlur={() => setGrowthFactorStr(null)}
                  className={`${controlCls} font-mono text-right`} />
              </label>

              <label className="block">
                <span className={labelCls}>Thời điểm cân đối</span>
                <DateInput value={input.balanceSheetDate}
                  onChange={v => patch({ balanceSheetDate: v })}
                  className={`${controlCls} font-mono`} />
              </label>

              <div>
                <span className={labelCls}>Đơn vị</span>
                <div className="flex gap-1">
                  {(['million', 'vnd'] as MoneyUnit[]).map(x => (
                    <button key={x} type="button" onClick={() => setUnit(x)}
                      className={`flex-1 px-2 py-2 rounded-md text-[11px] font-bold border transition-colors ${
                        unit === x ? 'bg-accent text-accent-ink border-accent' : 'bg-panel-muted text-ink-muted border-line'
                      }`}>
                      {UNIT_LABEL[x]}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-line">
              <p className="text-[11px] text-ink-faint">
                Ô chữ xanh là ô nhập · ô nền xám là công thức · cột kế hoạch tự nhân hệ số, gõ đè được từng dòng
              </p>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={reset}
                  className="flex items-center gap-1.5 px-2.5 py-2 rounded-md border border-line text-ink-muted text-[11px] font-semibold hover:border-accent hover:text-accent">
                  <RotateCcw className="w-3.5 h-3.5" /> Làm mới
                </button>
                <button type="button" onClick={exportSheets}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-accent text-accent-ink text-[11px] font-bold hover:opacity-90">
                  <FileDown className="w-3.5 h-3.5" />
                  Xuất {input.kind === 'limit' ? '3' : '2'} phụ lục
                </button>
              </div>
            </div>
          </div>

          <BusinessPlanSheet input={input} result={result} unit={unit} onChange={patch} />

          <div className={`${UI.containerCardBg} rounded-lg border p-3`}>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.09em] text-accent mb-2">
              Cơ sở xác định — in ra phụ lục kết quả kinh doanh
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {BASIS_FIELDS.map(({ key, label }) => (
                <label key={key} className="block">
                  <span className={labelCls}>{label}</span>
                  <textarea
                    rows={2}
                    value={input.basis[key] || ''}
                    onChange={e => patch({ basis: { ...input.basis, [key]: e.target.value } })}
                    placeholder="Bỏ trống thì phụ lục tự ghi tỷ trọng trên doanh thu"
                    className={controlCls}
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
