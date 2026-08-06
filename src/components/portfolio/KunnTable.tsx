import React from 'react';
import { Receipt, ChevronRight } from 'lucide-react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtMoney, fmtRate, fmtDate } from '../../lib/utils';
import { getEffectiveActiveRate } from '../../lib/rateResolution';

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
  containerCardBg: string;
  tableHeaderStyle: string;
  filteredContracts: LoanContract[];
  selectedContract: LoanContract | null;
  handleSelectContract: (c: LoanContract) => void;
  allSchedulesMap: Record<number, RepaymentSchedule[]>;
  getAutoDebtGroupInfo: (schs?: RepaymentSchedule[]) => { debtGroup: number; maxOverdueDays: number };
  getMasterHdtdNumber: (c: LoanContract) => string;
  isSettled?: (c: LoanContract) => boolean;
  getEffectiveBalanceForContract: (c: LoanContract) => number;
}

export const KunnTable: React.FC<KunnTableProps> = ({
  containerCardBg,
  tableHeaderStyle,
  filteredContracts,
  selectedContract,
  handleSelectContract,
  allSchedulesMap,
  getAutoDebtGroupInfo,
  getMasterHdtdNumber,
  isSettled,
  getEffectiveBalanceForContract,
}) => {
  return (
    <div className={`${containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
      <div className={`p-3 border-b flex items-center justify-between ${'bg-panel-muted border-line'}`}>
        <span className="font-bold flex items-center space-x-2 text-xs">
          <Receipt className="w-4 h-4 text-warn" />
          <span>DANH SÁCH GIẤY NHẬN NỢ (KUNN) — {filteredContracts.length} KHOẢN VAY</span>
        </span>
        <span className="text-[11px] text-ink-faint">Nhấp vào dòng để xem chi tiết / cập nhật HĐTD</span>
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
          <tbody className={`divide-y ${'divide-line'}`}>
            {filteredContracts.length === 0 ? (
              <tr><td colSpan={9} className="text-center p-8 text-ink-faint">
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
                    ? 'bg-accent-soft border-l-2 border-l-accent font-semibold'
                    : 'hover:bg-panel-muted'
                  }`}>
                  <td className="p-3 font-mono text-accent font-bold whitespace-nowrap">
                    <div className="flex items-center space-x-1">
                      {isSelected && <ChevronRight className="w-3.5 h-3.5 text-accent" />}
                      <span>{c.ContractNumber}</span>
                    </div>
                  </td>
                  <td className="p-3 font-mono text-accent font-semibold whitespace-nowrap text-[11px]">
                    {masterNo}
                  </td>
                  <td className="p-3 text-right font-bold text-pos whitespace-nowrap">
                    {fmtMoney(c.LoanAmount || c.ContractAmount)}
                  </td>
                  <td className="p-3 text-right font-bold text-warn whitespace-nowrap">
                    {fmtMoney(getEffectiveBalanceForContract(c))}
                  </td>
                  <td className="p-3 text-accent  font-mono font-bold whitespace-nowrap">{fmtRate(getEffectiveActiveRate(c))}</td>
                  <td className="p-3 text-ink-muted whitespace-nowrap">{fmtDate(c.DisbursementDate || c.ContractStartDate)}</td>
                  <td className="p-3 text-ink-muted whitespace-nowrap">{fmtDate(c.KunnDueDate || c.ContractEndDate)}</td>
                  <td className="p-3 whitespace-nowrap">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent-soft  text-accent  border border-accent/30">
                      {c.LoanMethod || (c.ContractType === 0 ? 'Hạn mức tín dụng' : 'Cho vay từng lần')}
                    </span>
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    {isSettled && isSettled(c) ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pos text-pos border border-pos/30">
                        ✓ ĐÃ TẤT TOÁN
                      </span>
                    ) : (
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${DEBT_GROUP_COLORS[effectiveDg]}`}>
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
