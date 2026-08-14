import React, { useState, lazy, Suspense } from 'react';
import { UI } from '../../lib/uiClasses';
import {
  Calculator, Layers, TrendingUp, TrendingDown, ShieldCheck, Award, RefreshCw, BarChart2, AlertTriangle, FileText, PiggyBank, Percent, Loader2
} from 'lucide-react';

const Tool1LoanScheduleCalc = lazy(() => import('../calculator/Tool1LoanScheduleCalc').then(m => ({ default: m.Tool1LoanScheduleCalc })));
const Tool2StkSingleCalc = lazy(() => import('../calculator/Tool2StkSingleCalc').then(m => ({ default: m.Tool2StkSingleCalc })));
const Tool3StkMultiCycleCalc = lazy(() => import('../calculator/Tool3StkMultiCycleCalc').then(m => ({ default: m.Tool3StkMultiCycleCalc })));
const Tool4RateReductionCalc = lazy(() => import('../calculator/Tool4RateReductionCalc').then(m => ({ default: m.Tool4RateReductionCalc })));
const Tool5CreditCapacityCalc = lazy(() => import('../calculator/Tool5CreditCapacityCalc').then(m => ({ default: m.Tool5CreditCapacityCalc })));
const Tool6PrepaymentAnalysisCalc = lazy(() => import('../calculator/Tool6PrepaymentAnalysisCalc').then(m => ({ default: m.Tool6PrepaymentAnalysisCalc })));
const Tool7RepaymentMethodCompareCalc = lazy(() => import('../calculator/Tool7RepaymentMethodCompareCalc').then(m => ({ default: m.Tool7RepaymentMethodCompareCalc })));
const Tool8InterestRateConversionCalc = lazy(() => import('../calculator/Tool8InterestRateConversionCalc').then(m => ({ default: m.Tool8InterestRateConversionCalc })));
const Tool9OverduePenaltyCalc = lazy(() => import('../calculator/Tool9OverduePenaltyCalc').then(m => ({ default: m.Tool9OverduePenaltyCalc })));

type ToolId = 'loan' | 'stk_single' | 'stk_multi' | 'rate_reduction' | 'credit_capacity' | 'prepayment_analysis' | 'repayment_compare' | 'rate_conversion' | 'overdue_penalty';

interface ToolCategory {
  id: 'credit' | 'stk' | 'rate';
  label: string;
  icon: React.ElementType;
  tools: { id: ToolId; label: string; icon: React.ElementType }[];
}

const CATEGORIES: ToolCategory[] = [
  {
    id: 'credit',
    label: '1. Khoản Vay & Thu Nợ',
    icon: FileText,
    tools: [
      { id: 'loan', label: '1. Tính Lịch Thu Nợ Khoản Vay', icon: Calculator },
      { id: 'credit_capacity', label: '5. Thẩm Định Hạn Mức (DTI/LTV)', icon: ShieldCheck },
      { id: 'prepayment_analysis', label: '6. Phân Tích Trả Nợ Trước Hạn', icon: Award },
      { id: 'repayment_compare', label: '7. So Sánh Gốc Đều vs Niên Kim', icon: BarChart2 },
    ],
  },
  {
    id: 'stk',
    label: '2. Cho Vay Cầm Cố STK',
    icon: PiggyBank,
    tools: [
      { id: 'stk_single', label: '2. Tính Cầm Cố STK Đơn', icon: Layers },
      { id: 'stk_multi', label: '3. Tính Cầm Cố STK Tái Tục', icon: TrendingUp },
    ],
  },
  {
    id: 'rate',
    label: '3. Lãi Suất & Phạt Quá Hạn',
    icon: Percent,
    tools: [
      { id: 'rate_reduction', label: '4. Tính Giảm Lãi Suất Vay', icon: TrendingDown },
      { id: 'rate_conversion', label: '8. Quy Đổi Lãi Phẳng & EAR', icon: RefreshCw },
      { id: 'overdue_penalty', label: '9. Tính Phạt Chậm Trả Quá Hạn', icon: AlertTriangle },
    ],
  },
];

const ToolFallback = () => (
  <div className="flex items-center justify-center p-12 text-ink-muted bg-panel-muted/40 rounded-xl border border-line">
    <Loader2 className="w-5 h-5 animate-spin text-accent mr-2" />
    <span className="text-xs">Đang tải công cụ tính toán...</span>
  </div>
);

export const CalculatorView: React.FC = () => {
  const styles = UI;

  const [activeCategory, setActiveCategory] = useState<'credit' | 'stk' | 'rate'>('credit');
  const [activeTool, setActiveTool] = useState<ToolId>('loan');

  const currentCategory = CATEGORIES.find(c => c.id === activeCategory) || CATEGORIES[0];

  const handleSelectCategory = (catId: 'credit' | 'stk' | 'rate') => {
    setActiveCategory(catId);
    const cat = CATEGORIES.find(c => c.id === catId);
    if (cat && cat.tools.length > 0) {
      setActiveTool(cat.tools[0].id);
    }
  };

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      {/* Category Tabs Top Bar */}
      <div className={`${styles.containerCardBg} rounded-xl p-2 border border-line shadow-sm flex flex-wrap items-center justify-between gap-3`}>
        <div className="flex items-center gap-2 flex-wrap">
          {CATEGORIES.map(({ id, label, icon: Icon, tools }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleSelectCategory(id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-bold transition-all duration-150 ${
                activeCategory === id
                  ? 'bg-accent text-accent-ink shadow-xs'
                  : 'bg-panel-muted text-ink-muted border border-line hover:text-ink hover:border-line-strong'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-panel-muted/60 text-ink font-mono ml-1">
                {tools.length}
              </span>
            </button>
          ))}
        </div>

        <div className="text-[11px] text-ink-faint hidden md:block font-medium">
          Chọn phân nhóm công cụ nghiệp vụ để tính toán
        </div>
      </div>

      {/* Sub-Tool Selector Bar */}
      <div className={`${styles.containerCardBg} rounded-xl p-2 border border-line shadow-sm flex flex-wrap items-center gap-1.5`}>
        {currentCategory.tools.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTool(id)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all duration-150 ${
              activeTool === id
                ? 'bg-accent-soft border border-accent/40 text-accent font-bold shadow-xs'
                : 'text-ink-muted hover:bg-panel-muted/80 hover:text-ink'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
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
