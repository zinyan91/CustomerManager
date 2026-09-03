import React from 'react';
import { Printer, CheckCircle2, AlertCircle } from 'lucide-react';
import type { B01aStatement } from '../../types/corporateFinancial';
import { checkB01aBalance } from '../../lib/corporateFinancialFormulas';
import { printStatementHtml } from '../../lib/corporateFinancialExport';
import { parseMoneyDecimalInput } from '../../lib/utils';
import { UI } from '../../lib/uiClasses';

interface B01aFinancialPositionTabProps {
  statement: B01aStatement;
  onChange: (updated: B01aStatement) => void;
}

export const B01aFinancialPositionTab: React.FC<B01aFinancialPositionTabProps> = ({
  statement,
  onChange,
}) => {
  const balanceInfo = checkB01aBalance(statement);

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
      'BÁO CÁO TÌNH HÌNH TÀI CHÍNH',
      'B 01a - DNNVV',
      `Tại ngày 31 tháng 12 năm ${statement.periodYear}`,
      'Số cuối năm',
      'Số đầu năm',
      statement,
      statement.items
    );
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top action bar and Balance Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-line/65 bg-surface/80 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2">
          {balanceInfo.isBalancedCurrent ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Cân đối kế toán khớp (Tổng tài sản = Tổng nguồn vốn)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>
                Chưa cân đối: Lệch {Math.abs(balanceInfo.diffCurrent).toLocaleString('vi-VN')} VNĐ
                {balanceInfo.diffCurrent > 0 ? ' (Tài sản > Nguồn vốn)' : ' (Tài sản < Nguồn vốn)'}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-line bg-panel hover:bg-surface text-ink text-xs font-medium cursor-pointer shadow-2xs transition-all"
          >
            <Printer className="w-3.5 h-3.5 text-accent" />
            <span>In / PDF Mẫu B01a</span>
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto rounded-xl border border-line/65 bg-surface/90 shadow-xs">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr className="bg-panel/90 border-b border-line text-ink font-bold">
              <th className="p-2.5 text-left w-[42%]">Chỉ tiêu (Theo TT 133/2016/TT-BTC)</th>
              <th className="p-2.5 text-center w-[8%]">Mã số</th>
              <th className="p-2.5 text-center w-[10%]">Thuyết minh</th>
              <th className="p-2.5 text-right w-[20%]">Số cuối năm ({statement.periodYear})</th>
              <th className="p-2.5 text-right w-[20%]">Số đầu năm ({statement.periodYear - 1})</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {statement.items.map(it => {
              const isBold = it.isHeader || it.isFormula;
              const isTotalRow = it.code === '270' || it.code === '440';
              const indentPadding = (it.indent || 0) * 16;

              return (
                <tr
                  key={it.id}
                  className={`hover:bg-accent-soft/30 transition-colors ${
                    isTotalRow
                      ? 'bg-accent/10 font-extrabold text-accent'
                      : it.isHeader
                      ? 'bg-surface font-bold text-ink'
                      : it.isFormula
                      ? 'bg-surface/50 font-semibold text-ink'
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
                    {it.isFormula || it.isHeader ? (
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
                    {it.isFormula || it.isHeader ? (
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
