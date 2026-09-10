import React from 'react';
import { Receipt, ChevronRight } from 'lucide-react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtMoney, fmtRate, fmtDate } from '../../lib/utils';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { kunnPrincipal } from '../../lib/loanMath';

const DEBT_GROUP_COLORS: Record<number, string> = {
  1: 'bg-pos-soft  text-pos border border-pos/30 ',
  2: 'bg-warn-soft  text-warn border border-warn/30 ',
  3: 'bg-warn-soft  text-warn  border border-warn/30 ',
  4: 'bg-neg-soft  text-neg border border-neg/30 ',
  5: 'bg-neg-soft text-neg border border-neg/30  font-extrabold animate-pulse',
};

const DEBT_GROUP_LABELS: Record<number, string> = {
  1: 'Nhóm 1 (Đủ tiêu chuẩn)',
  2: 'Nhóm 2 (Cần chú ý)',
  3: 'Nhóm 3 (Dưới tiêu chuẩn)',
  4: 'Nhóm 4 (Nghi ngờ)',
  5: 'Nhóm 5 (Có khả năng mất vốn)',
};

interface KunnTableProps {
  filteredContracts: LoanContract[];
  selectedContract: LoanContract | null;
  handleSelectContract: (c: LoanContract) => void;
  allSchedulesMap: Record<number, RepaymentSchedule[]>;
  getAutoDebtGroupInfo: (schs?: RepaymentSchedule[]) => { debtGroup: number; maxOverdueDays: number };
  getMasterHdtdNumber: (c: LoanContract) => string;
  isSettled?: (c: LoanContract) => boolean;
  getEffectiveBalanceForContract: (c: LoanContract) => number;
  settledCount?: number;
  hiddenCount?: number;
  showSettled?: boolean;
  onToggleShowSettled?: (v: boolean) => void;
}

export const KunnTable: React.FC<KunnTableProps> = ({
  filteredContracts,
  selectedContract,
  handleSelectContract,
  allSchedulesMap,
  getAutoDebtGroupInfo,
  getMasterHdtdNumber,
  isSettled,
  getEffectiveBalanceForContract,
  settledCount = 0,
  hiddenCount = 0,
  showSettled = true,
  onToggleShowSettled,
}) => {
  const rows = filteredContracts;

  return (
    <div className="rounded-2xl overflow-hidden border border-line/65 bg-panel/85 backdrop-blur-xl shadow-xs specular-card animate-in fade-in duration-150">
      <div className="p-3.5 sm:p-4 border-b border-line/60 flex flex-wrap items-center justify-between gap-3 bg-surface/75 backdrop-blur-md">
        <span className="font-bold flex items-center space-x-2 text-xs text-ink">
          <div className="p-1.5 rounded-lg bg-warn-soft text-warn shrink-0 shadow-2xs">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="uppercase tracking-wider text-[11px]">DANH SÁCH GIẤY NHẬN NỢ (KUNN) — {rows.length} KHOẢN VAY</span>
        </span>
        {settledCount > 0 && onToggleShowSettled ? (
          <div className="flex items-center bg-surface p-1 rounded-xl border border-line/70 shadow-2xs">
            <button
              type="button"
              onClick={() => onToggleShowSettled(true)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${showSettled
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-faint hover:text-ink'}`}
            >
              Tất cả
            </button>
            <button
              type="button"
              onClick={() => onToggleShowSettled(false)}
              className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${!showSettled
                ? 'bg-accent text-accent-ink shadow-xs'
                : 'text-ink-faint hover:text-ink'}`}
            >
              Đang vay
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-ink-faint font-medium">Nhấp vào dòng để xem chi tiết / cập nhật HĐTD</span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse font-app">
          <thead className="sticky top-0 z-10 bg-surface/95 backdrop-blur-md border-b border-line/80 text-[10px] uppercase font-bold tracking-[0.11em] text-ink-faint">
            <tr>
              <th className="px-4 py-3.5 whitespace-nowrap">SỐ KUNN (GNN)</th>
              <th className="px-4 py-3.5 whitespace-nowrap">SỐ HĐTD GỐC</th>
              <th className="px-4 py-3.5 whitespace-nowrap text-right">SỐ TIỀN NHẬN NỢ</th>
              <th className="px-4 py-3.5 whitespace-nowrap text-right">DƯ NỢ HIỆN HỮU</th>
              <th className="px-4 py-3.5 whitespace-nowrap">LÃI SUẤT AP</th>
              <th className="px-4 py-3.5 whitespace-nowrap text-center">NGÀY GIẢI NGÂN</th>
              <th className="px-4 py-3.5 whitespace-nowrap text-center">NGÀY KẾT THÚC</th>
              <th className="px-4 py-3.5 whitespace-nowrap">PHƯƠNG THỨC VAY</th>
              <th className="px-4 py-3.5 whitespace-nowrap text-center">NHÓM NỢ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/40">
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="text-center p-12 text-ink-faint">
                {hiddenCount > 0
                  ? `${hiddenCount} khoản đã tất toán đang ẩn. Bấm "Tất cả" để xem lại.`
                  : 'Chưa có Giấy Nhận Nợ nào trong bộ lọc HĐTD này. Nhấn "Tạo HĐTD mới" để nhập khoản vay.'}
              </td></tr>
            ) : rows.map(c => {
              const isSelected = selectedContract?.Id === c.Id;
              const cSchedules = allSchedulesMap[c.Id] || [];
              const daTatToan = (isSettled && isSettled(c)) || c.IsSettled === true;
              const autoDebt = daTatToan ? { debtGroup: 1, maxOverdueDays: 0 } : getAutoDebtGroupInfo(cSchedules);
              // Nhóm hiệu lực = cao hơn giữa nhóm lưu và nhóm tự tính từ ngày quá hạn.
              // Không hạ tụt nhóm banker chủ động nâng khi chỉ quá hạn nhẹ.
              const effectiveDg = daTatToan ? 1 : Math.max(c.DebtGroup ?? 1, autoDebt.debtGroup);
              const masterNo = getMasterHdtdNumber(c);
              return (
                <tr key={c.Id}
                  onClick={() => handleSelectContract(c)}
                  className={`cursor-pointer transition-colors duration-150 ${isSelected
                    ? 'bg-accent-soft/70 border-l-2 border-l-accent font-semibold'
                    : 'hover:bg-accent/[0.04]'
                  }`}>
                  <td className="px-4 py-3.5 font-mono text-accent font-bold whitespace-nowrap">
                    <div className="flex items-center space-x-1.5">
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-accent" />}
                      <span>{c.ContractNumber}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-accent font-semibold whitespace-nowrap text-[11px]">
                    {masterNo}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-pos whitespace-nowrap">
                    {fmtMoney(kunnPrincipal(c))}
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono font-bold text-warn whitespace-nowrap">
                    {fmtMoney(getEffectiveBalanceForContract(c))}
                  </td>
                  <td className="px-4 py-3.5 text-accent font-mono font-bold whitespace-nowrap">{fmtRate(getEffectiveActiveRate(c))}</td>
                  <td className="px-4 py-3.5 text-center font-mono text-ink-faint whitespace-nowrap">{fmtDate(c.DisbursementDate || c.ContractStartDate)}</td>
                  <td className="px-4 py-3.5 text-center font-mono text-ink-faint whitespace-nowrap">{fmtDate(c.KunnDueDate || c.ContractEndDate)}</td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-surface border border-line/70 text-ink-muted shadow-2xs">
                      {c.LoanMethod || (c.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần')}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap text-center">
                    {isSettled && isSettled(c) ? (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pos-soft text-pos border border-pos/30 shadow-2xs">
                        ✓ ĐÃ TẤT TOÁN
                      </span>
                    ) : (
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shadow-2xs ${DEBT_GROUP_COLORS[effectiveDg]}`}>
                        {DEBT_GROUP_LABELS[effectiveDg]}
                        {autoDebt.maxOverdueDays > 0 && (
                          <span className="ml-1 text-[9px] font-mono opacity-90">({autoDebt.maxOverdueDays}d quá hạn)</span>
                        )}
                      </span>
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
