import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { getThemeStyles } from '../../lib/themeStyles';
import { Calculator, Layers, TrendingUp, TrendingDown } from 'lucide-react';
import { Tool1LoanScheduleCalc } from '../calculator/Tool1LoanScheduleCalc';
import { Tool2StkSingleCalc } from '../calculator/Tool2StkSingleCalc';
import { Tool3StkMultiCycleCalc } from '../calculator/Tool3StkMultiCycleCalc';
import { Tool4RateReductionCalc } from '../calculator/Tool4RateReductionCalc';

export const CalculatorView: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const styles = getThemeStyles(isLight);

  const [activeTool, setActiveTool] = useState<'loan' | 'stk_single' | 'stk_multi' | 'rate_reduction'>('rate_reduction');

  return (
    <div className="space-y-4 text-xs transition-colors duration-200">
      {/* Tool Navigation Bar */}
      <div className={`${styles.containerCardBg} rounded-2xl p-2 border flex flex-wrap items-center gap-2`}>
        {[
          { id: 'loan' as const, label: '1. Tính Lịch Thu Nợ Khoản Vay', icon: Calculator },
          { id: 'stk_single' as const, label: '2. Tính Lãi Gửi Tiết Kiệm STK', icon: Layers },
          { id: 'stk_multi' as const, label: '3. Dự Phỏng Tái Tục STK Nhiều Vòng', icon: TrendingUp },
          { id: 'rate_reduction' as const, label: '4. Tính Giảm Lãi Suất Vay', icon: TrendingDown },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTool(id)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
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
    </div>
  );
};
