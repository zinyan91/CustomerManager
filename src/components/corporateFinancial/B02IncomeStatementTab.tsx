import React from 'react';
import { Printer, TrendingUp } from 'lucide-react';
import type { B02Statement } from '../../types/corporateFinancial';
import { printStatementHtml } from '../../lib/corporateFinancialExport';
import { parseMoneyDecimalInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface B02IncomeStatementTabProps {
  statement: B02Statement;
  onChange: (updated: B02Statement) => void;
}

export const B02IncomeStatementTab: React.FC<B02IncomeStatementTabProps> = ({
  statement,
  onChange,
}) => {
  const handleCellChange = (
    id: string,
    field: 'currentPeriod' | 'previousPeriod',
    rawVal: string
  ) => {
    const num = parseMoneyDecimalInput(rawVal);
    const updatedItems = statement.items.map(it => {
      if (it.id === id) {
        return { ...it, [field]: num };
      }
      return it;
    });
    onChange({ ...statement, items: updatedItems });
  };

  const handlePrint = () => {
    printStatementHtml(
      'BÁO CÁO KẾT QUẢ HOẠT ĐỘNG KINH DOANH',
      'B 02 - DNNVV',
      `Năm ${statement.periodYear}`,
      'Năm nay',
      'Năm trước',
      statement,
      statement.items
    );
  };

  const revenueNet = statement.items.find(i => i.code === '10')?.currentPeriod || 0;
  const netProfit = statement.items.find(i => i.code === '60')?.currentPeriod || 0;

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top summary cards */}
      <div data-workspace-panel className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-line/65 bg-surface/80 backdrop-blur-md shadow-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-accent-soft text-accent">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-ink-muted">Doanh thu thuần</div>
              <div className="text-sm font-bold font-mono text-ink">
                {revenueNet.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-ink-muted">đ</span>
              </div>
            </div>
          </div>

          <div className="h-6 w-px bg-line/60" />

          <div>
            <div className="text-[10px] uppercase tracking-wider text-ink-muted">Lợi nhuận sau thuế</div>
            <div className={`text-sm font-bold font-mono ${netProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {netProfit.toLocaleString('vi-VN')} <span className="text-[10px] font-normal text-ink-muted">đ</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-panel hover:bg-surface text-ink text-xs font-medium cursor-pointer shadow-2xs transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-accent" />
            <span>In / PDF Mẫu B02</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div data-workspace-panel className="overflow-x-auto rounded-xl border border-line/65 bg-surface/90 shadow-xs">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-panel/90 border-b border-line text-ink font-bold">
              <th className="p-2.5 text-left w-[42%]">Chỉ tiêu (Theo TT 133/2016/TT-BTC)</th>
              <th className="p-2.5 text-center w-[8%]">Mã số</th>
              <th className="p-2.5 text-center w-[10%]">Thuyết minh</th>
              <th className="p-2.5 text-right w-[20%]">Năm nay ({statement.periodYear})</th>
              <th className="p-2.5 text-right w-[20%]">Năm trước ({statement.periodYear - 1})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {statement.items.map(it => {
              const isBold = it.isHeader || it.isFormula;
              const isNetProfitRow = it.code === '60';
              const indentPadding = (it.indent || 0) * 16;

              return (
                <tr
                  key={it.id}
                  className={`hover:bg-accent-soft/30 transition-colors ${
                    isNetProfitRow
                      ? 'bg-emerald-500/10 font-extrabold text-emerald-700 dark:text-emerald-400'
                      : it.isFormula
                      ? 'bg-surface/60 font-bold text-ink'
                      : 'text-ink-muted'
                  }`}
                >
                  {/* Name */}
                  <td className="p-2" style={{ paddingLeft: `${indentPadding + 8}px` }}>
                    <span className={isBold ? 'text-ink font-bold' : 'text-ink'}>
                      {it.name}
                    </span>
                  </td>

                  {/* Code */}
                  <td className="p-2 text-center font-mono font-medium text-ink-muted">
                    {it.code}
                  </td>

                  {/* Note */}
                  <td className="p-2 text-center text-ink-muted text-[11px]">
                    {it.note || '-'}
                  </td>

                  {/* Current Period */}
                  <td className="p-1.5 text-right">
                    {it.isFormula ? (
                      <div className="px-2 py-1 font-mono font-bold text-ink">
                        {it.currentPeriod !== 0 ? it.currentPeriod.toLocaleString('vi-VN') : '-'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={it.currentPeriod !== 0 ? it.currentPeriod.toLocaleString('vi-VN') : ''}
                        placeholder="0"
                        onChange={e => handleCellChange(it.id, 'currentPeriod', e.target.value)}
                        className={`w-full text-right p-1 text-xs font-mono rounded border ${UI.inputStyle} transition-all focus:border-accent`}
                      />
                    )}
                  </td>

                  {/* Previous Period */}
                  <td className="p-1.5 text-right">
                    {it.isFormula ? (
                      <div className="px-2 py-1 font-mono font-bold text-ink">
                        {it.previousPeriod !== 0 ? it.previousPeriod.toLocaleString('vi-VN') : '-'}
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={it.previousPeriod !== 0 ? it.previousPeriod.toLocaleString('vi-VN') : ''}
                        placeholder="0"
                        onChange={e => handleCellChange(it.id, 'previousPeriod', e.target.value)}
                        className={`w-full text-right p-1 text-xs font-mono rounded border ${UI.inputStyle} transition-all focus:border-accent`}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
