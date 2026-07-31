import React from 'react';
import { Receipt, ChevronRight } from 'lucide-react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtMoney, fmtRate, fmtDate, getEffectiveActiveRate } from '../../lib/utils';

const DEBT_GROUP_COLORS: Record<number, string> = {
  1: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20',
  2: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20',
  3: 'bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-200 dark:border-orange-500/20',
  4: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-500/20',
  5: 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-800 font-extrabold animate-pulse',
};

const DEBT_GROUP_LABELS: Record<number, string> = {
  1: 'Nhóm 1 (Đủ tiêu chuẩn)',
  2: 'Nhóm 2 (Cần chú ý)',
  3: 'Nhóm 3 (Dưới tiêu chuẩn)',
  4: 'Nhóm 4 (Nghi ngờ)',
  5: 'Nhóm 5 (Có khả năng mất vốn)',
};

interface KunnTableProps {
  isLight: boolean;
  containerCardBg: string;
  tableHeaderStyle: string;
  filteredContracts: LoanContract[];
  selectedContract: LoanContract | null;
  handleSelectContract: (c: LoanContract) => void;
  allSchedulesMap: Record<number, RepaymentSchedule[]>;
  getAutoDebtGroupInfo: (schs?: RepaymentSchedule[]) => { debtGroup: number; maxOverdueDays: number };
  getMasterHdtdNumber: (c: LoanContract) => string;
  getEffectiveBalanceForContract: (c: LoanContract) => number;
}

export const KunnTable: React.FC<KunnTableProps> = ({
  isLight,
  containerCardBg,
  tableHeaderStyle,
  filteredContracts,
  selectedContract,
  handleSelectContract,
  allSchedulesMap,
  getAutoDebtGroupInfo,
  getMasterHdtdNumber,
  getEffectiveBalanceForContract,
}) => {
  return (
    <div className={`${containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
      <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
        <span className="font-bold flex items-center space-x-2 text-xs">
          <Receipt className="w-4 h-4 text-amber-500" />
          <span>DANH SÁCH GIẤY NHẬN NỢ (KUNN) — {filteredContracts.length} KHOẢN VAY</span>
        </span>
        <span className="text-[11px] text-slate-400">Nhấp vào dòng để xem chi tiết / cập nhật HĐTD</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className={tableHeaderStyle}>
            <tr>
              <th className="p-3 whitespace-nowrap">SỐ KUNN (GNN)</th>
              <th className="p-3 whitespace-nowrap">SỐ HĐTD GỐC</th>
              <th className="p-3 whitespace-nowrap text-right">SỐ TIỀN NHẬN NỢ</th>
              <th className="p-3 whitespace-nowrap text-right">DƯ NỢ HIỆN HỮU</th>
              <th className="p-3 whitespace-nowrap">LÃI SUẤT AP</th>
              <th className="p-3 whitespace-nowrap">NGÀY GIẢI NGÂN</th>
              <th className="p-3 whitespace-nowrap">NGÀY KẾT THÚC</th>
              <th className="p-3 whitespace-nowrap">PHƯƠNG THỨC VAY</th>
              <th className="p-3 whitespace-nowrap">NHÓM NỢ</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
            {filteredContracts.length === 0 ? (
              <tr><td colSpan={9} className="text-center p-8 text-slate-400">
                Chưa có Giấy Nhận Nợ nào trong bộ lọc HĐTD này. Nhấn "Tạo HĐTD mới" để nhập khoản vay.
              </td></tr>
            ) : filteredContracts.map(c => {
              const isSelected = selectedContract?.Id === c.Id;
              const cSchedules = allSchedulesMap[c.Id] || [];
              const autoDebt = getAutoDebtGroupInfo(cSchedules);
              const effectiveDg = autoDebt.maxOverdueDays > 0 ? autoDebt.debtGroup : (c.DebtGroup || 1);
              const masterNo = getMasterHdtdNumber(c);
              return (
                <tr key={c.Id}
                  onClick={() => handleSelectContract(c)}
                  className={`cursor-pointer transition-colors ${isSelected
                    ? 'bg-sky-50 dark:bg-sky-950/50 border-l-4 border-l-sky-500 font-semibold'
                    : isLight ? 'hover:bg-slate-50' : 'hover:bg-slate-800/30'
                  }`}>
                  <td className="p-3 font-mono text-sky-600 dark:text-sky-400 font-bold whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-sky-500" />}
                      <span>{c.ContractNumber}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-purple-600 dark:text-purple-400 font-semibold whitespace-nowrap text-[11px]">
                    {masterNo}
                  </td>
                  <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                    {fmtMoney(c.LoanAmount || c.ContractAmount)}
                  </td>
                  <td className="p-3 text-right font-bold text-amber-600 dark:text-amber-400 whitespace-nowrap">
                    {fmtMoney(getEffectiveBalanceForContract(c))}
                  </td>
                  <td className="p-3 text-sky-600 dark:text-sky-300 font-mono font-bold whitespace-nowrap">{fmtRate(getEffectiveActiveRate(c))}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtDate(c.DisbursementDate || c.ContractStartDate)}</td>
                  <td className="p-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{fmtDate(c.KunnDueDate || c.ContractEndDate)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-200 dark:border-sky-500/20">
                      {c.LoanMethod || (c.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần')}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${DEBT_GROUP_COLORS[effectiveDg]}`}>
                      {DEBT_GROUP_LABELS[effectiveDg]}
                      {autoDebt.maxOverdueDays > 0 && (
                        <span className="ml-1 text-[9px] font-mono opacity-90">({autoDebt.maxOverdueDays}d quá hạn)</span>
                      )}
                    </span>
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
