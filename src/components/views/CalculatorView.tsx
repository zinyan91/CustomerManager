import React, { lazy, Suspense } from 'react';
import { UI } from '../../lib/uiClasses';
import { Loader2 } from 'lucide-react';
import { useCalculatorController } from '../../hooks/useCalculatorController';

const Tool1LoanScheduleCalc = lazy(() => import('../calculator/Tool1LoanScheduleCalc').then(m => ({ default: m.Tool1LoanScheduleCalc })));
const Tool2StkSingleCalc = lazy(() => import('../calculator/Tool2StkSingleCalc').then(m => ({ default: m.Tool2StkSingleCalc })));
const Tool3StkMultiCycleCalc = lazy(() => import('../calculator/Tool3StkMultiCycleCalc').then(m => ({ default: m.Tool3StkMultiCycleCalc })));
const Tool4RateReductionCalc = lazy(() => import('../calculator/Tool4RateReductionCalc').then(m => ({ default: m.Tool4RateReductionCalc })));
const Tool5CreditCapacityCalc = lazy(() => import('../calculator/Tool5CreditCapacityCalc').then(m => ({ default: m.Tool5CreditCapacityCalc })));
const Tool6PrepaymentAnalysisCalc = lazy(() => import('../calculator/Tool6PrepaymentAnalysisCalc').then(m => ({ default: m.Tool6PrepaymentAnalysisCalc })));
const Tool7RepaymentMethodCompareCalc = lazy(() => import('../calculator/Tool7RepaymentMethodCompareCalc').then(m => ({ default: m.Tool7RepaymentMethodCompareCalc })));
const Tool8InterestRateConversionCalc = lazy(() => import('../calculator/Tool8InterestRateConversionCalc').then(m => ({ default: m.Tool8InterestRateConversionCalc })));
const Tool9OverduePenaltyCalc = lazy(() => import('../calculator/Tool9OverduePenaltyCalc').then(m => ({ default: m.Tool9OverduePenaltyCalc })));

const ToolFallback = () => (
  <div className="flex items-center justify-center p-12 text-ink-muted bg-panel-muted/40 rounded-xl border border-line">
    <Loader2 className="w-5 h-5 animate-spin text-accent mr-2" />
    <span className="text-xs">Đang tải công cụ tính toán...</span>
  </div>
);

export const CalculatorView: React.FC = () => {
  const styles = UI;
  const {
    activeCategory,
    activeTool,
    setActiveTool,
    currentCategory,
    handleSelectCategory,
    categories,
  } = useCalculatorController();

  return (
    <div className="space-y-4 text-xs transition-colors duration-200 font-app">
      {/* Unified Calculator Cockpit Navigation */}
      <div className={`${styles.containerCardBg} rounded-2xl border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card overflow-hidden animate-in fade-in duration-150`}>
        {/* Major Category Tabs (Tầng trên) */}
        <div className="p-3 sm:px-4 sm:py-3.5 bg-surface/75 backdrop-blur-md flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            {categories.map(({ id, label, icon: Icon, tools }) => {
              const isActive = activeCategory === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => handleSelectCategory(id)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer shadow-2xs ${
                    isActive
                      ? 'bg-accent text-accent-ink shadow-md shadow-accent/25 ring-1 ring-accent/40'
                      : 'bg-surface border border-line/70 text-ink-muted hover:text-ink hover:border-accent/40 hover:bg-surface-elevated'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-accent-ink' : 'text-accent'}`} />
                  <span>{label}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono ml-1 font-bold ${
                    isActive ? 'bg-accent-ink/20 text-accent-ink' : 'bg-accent-soft text-accent border border-accent/20'
                  }`}>
                    {tools.length}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-ink-faint hidden lg:flex items-center gap-1.5 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
            <span>9 module tính toán tài chính & tín dụng ngân hàng</span>
          </div>
        </div>

        {/* Sub-Tools Ribbon (Tầng dưới - gắn liền) */}
        <div className="p-2.5 sm:px-3.5 sm:py-2.5 border-t border-line/60 bg-panel/50 flex items-center gap-2 overflow-x-auto no-scrollbar">
          {currentCategory.tools.map(({ id, label, icon: Icon }) => {
            const isToolActive = activeTool === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTool(id)}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer shrink-0 ${
                  isToolActive
                    ? 'bg-accent-soft border border-accent/40 text-accent font-bold shadow-2xs'
                    : 'text-ink-muted border border-transparent hover:bg-surface/80 hover:text-ink hover:border-line/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 shrink-0 ${isToolActive ? 'text-accent' : 'text-ink-faint'}`} />
                <span>{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Calculator Render Area */}
      <Suspense fallback={<ToolFallback />}>
        {activeTool === 'loan' && <Tool1LoanScheduleCalc styles={styles} />}
        {activeTool === 'stk_single' && <Tool2StkSingleCalc styles={styles} />}
        {activeTool === 'stk_multi' && <Tool3StkMultiCycleCalc styles={styles} />}
        {activeTool === 'rate_reduction' && <Tool4RateReductionCalc styles={styles} />}
        {activeTool === 'credit_capacity' && <Tool5CreditCapacityCalc styles={styles} />}
        {activeTool === 'prepayment_analysis' && <Tool6PrepaymentAnalysisCalc styles={styles} />}
        {activeTool === 'repayment_compare' && <Tool7RepaymentMethodCompareCalc styles={styles} />}
        {activeTool === 'rate_conversion' && <Tool8InterestRateConversionCalc styles={styles} />}
        {activeTool === 'overdue_penalty' && <Tool9OverduePenaltyCalc styles={styles} />}
      </Suspense>
    </div>
  );
};
