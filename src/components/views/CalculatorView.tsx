import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getThemeStyles } from '../../lib/themeStyles';
import { Calculator, Layers, TrendingUp, TrendingDown, ShieldCheck, Award, RefreshCw, BarChart2 } from 'lucide-react';
import { Tool1LoanScheduleCalc } from '../calculator/Tool1LoanScheduleCalc';
import { Tool2StkSingleCalc } from '../calculator/Tool2StkSingleCalc';
import { Tool3StkMultiCycleCalc } from '../calculator/Tool3StkMultiCycleCalc';
import { Tool4RateReductionCalc } from '../calculator/Tool4RateReductionCalc';
import { Tool5CreditCapacityCalc } from '../calculator/Tool5CreditCapacityCalc';
import { Tool6PrepaymentAnalysisCalc } from '../calculator/Tool6PrepaymentAnalysisCalc';
import { Tool7RepaymentMethodCompareCalc } from '../calculator/Tool7RepaymentMethodCompareCalc';
import { Tool8InterestRateConversionCalc } from '../calculator/Tool8InterestRateConversionCalc';

export const CalculatorView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const styles = getThemeStyles(isLight);

  const [activeTool, setActiveTool] = useState<
    'loan' | 'stk_single' | 'stk_multi' | 'rate_reduction' | 'credit_capacity' | 'prepayment_analysis' | 'repayment_compare' | 'rate_conversion'
  >('rate_reduction');

  const toolsList = [
    { id: 'loan' as const, label: '1. Tính Lịch Thu Nợ Khoản Vay', icon: Calculator },
    { id: 'stk_single' as const, label: '2. Tính Lãi Gửi Tiết Kiệm STK', icon: Layers },
    { id: 'stk_multi' as const, label: '3. Dự Phỏng Tái Tục STK', icon: TrendingUp },
    { id: 'rate_reduction' as const, label: '4. Tính Giảm Lãi Suất Vay', icon: TrendingDown },
    { id: 'credit_capacity' as const, label: '5. Thẩm Định Hạn Mức (DTI/LTV)', icon: ShieldCheck },
    { id: 'prepayment_analysis' as const, label: '6. Phân Tích Trả Nợ Trước Hạn', icon: Award },
    { id: 'repayment_compare' as const, label: '7. So Sánh Gốc Đều vs Niên Kim', icon: BarChart2 },
    { id: 'rate_conversion' as const, label: '8. Quy Đổi Lãi Phẳng & EAR', icon: RefreshCw },
  ];

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      {/* Tool Navigation Bar */}
      <div className={`${styles.containerCardBg} rounded-2xl p-2 border flex flex-wrap items-center gap-2`}>
        {toolsList.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTool(id)}
            className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTool === id
                ? 'bg-sky-600 text-white shadow-md shadow-sky-600/30'
                : isLight
                  ? 'text-slate-600 hover:bg-slate-100'
                  : 'text-slate-400 hover:bg-slate-800/60'
            }`}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Render Active Calculation Tool */}
      {activeTool === 'loan' && (
        <Tool1LoanScheduleCalc styles={styles} isLight={isLight} />
      )}
      {activeTool === 'stk_single' && (
        <Tool2StkSingleCalc styles={styles} />
      )}
      {activeTool === 'stk_multi' && (
        <Tool3StkMultiCycleCalc styles={styles} isLight={isLight} />
      )}
      {activeTool === 'rate_reduction' && (
        <Tool4RateReductionCalc styles={styles} isLight={isLight} />
      )}
      {activeTool === 'credit_capacity' && (
        <Tool5CreditCapacityCalc styles={styles} isLight={isLight} />
      )}
      {activeTool === 'prepayment_analysis' && (
        <Tool6PrepaymentAnalysisCalc styles={styles} isLight={isLight} />
      )}
      {activeTool === 'repayment_compare' && (
        <Tool7RepaymentMethodCompareCalc styles={styles} isLight={isLight} />
      )}
      {activeTool === 'rate_conversion' && (
        <Tool8InterestRateConversionCalc styles={styles} isLight={isLight} />
      )}
    </div>
  );
};
