import React, { useState, useEffect } from 'react';
import { Calendar } from 'lucide-react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtDate, fmtMoney, fmtRate } from '../../lib/utils';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import {
  paidPrincipalOf, computeSchedulePenalty, isScheduleFullySettled, schedulePaymentStatus,
} from '../../lib/loanMath';
import { formatSegmentsLabel, type RateSegment } from '../../lib/rateResolution';
import { PeriodDetailCard } from './PeriodDetailCard';

interface ScheduleTabProps {
  isLight: boolean;
  containerCardBg: string;
  tableHeaderStyle: string;
  tableRowHover: string;
  contracts: LoanContract[];
  selectedContract: LoanContract | null;
  handleSelectContract: (c: LoanContract) => void;
  schedules: RepaymentSchedule[];
  allSchedulesMap: Record<number, RepaymentSchedule[]>;
  periodRateSegments: Record<number, RateSegment[]>;
  openPaymentModal: (s: RepaymentSchedule) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  isLight, containerCardBg, tableHeaderStyle, tableRowHover,
  contracts, selectedContract, handleSelectContract,
  schedules, allSchedulesMap, periodRateSegments, openPaymentModal,
}) => {
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);

  // Auto-select initial schedule period when contract or schedules change
  useEffect(() => {
    if (schedules && schedules.length > 0) {
      // Prefer selecting first overdue schedule, or first unpaid, or first overall
      const overdueOrUnpaid = schedules.find(s => !isScheduleFullySettled(s)) || schedules[0];
      setSelectedScheduleId(overdueOrUnpaid.Id);
    } else {
      setSelectedScheduleId(null);
    }
  }, [selectedContract?.Id, schedules]);

  const getPenaltyForSchedule = (s: RepaymentSchedule) => {
    if (isScheduleFullySettled(s)) return s.OverdueInterestAmount || 0;
    return computeSchedulePenalty(
      s,
      getEffectiveActiveRate(selectedContract, s.DueDate)
    ).principalPenalty;
  };

  const totalPenaltySum = schedules.reduce((a, s) => a + getPenaltyForSchedule(s), 0);

  const selectedScheduleObj = schedules.find(s => s.Id === selectedScheduleId) || null;

  return (
    <div className="space-y-4">
      {/* Contract Selection Box */}
      <div className={`${containerCardBg} rounded-2xl p-4 border`}>
        <div className="font-bold mb-3 flex items-center space-x-2 text-xs">
          <Calendar className="w-4 h-4 text-sky-500" />
          <span>CHỌN HỢP ĐỒNG TÍN DỤNG ĐỂ XEM / TẠO LỊCH THU NỢ</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {contracts.map(c => (
            <button key={c.Id} onClick={() => handleSelectContract(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${selectedContract?.Id === c.Id
                ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                : isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-sky-700'
                }`}>
              {c.ContractNumber} ({fmtMoney(c.LoanAmount || c.ContractAmount)})
            </button>
          ))}
        </div>

        {selectedContract && (
          <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span>Số tiền KUNN: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{fmtMoney(selectedContract.LoanAmount || selectedContract.ContractAmount)}</strong></span>
              <span>Lãi suất hiện hành: <strong className="text-rose-600 dark:text-rose-400 font-mono">{fmtRate(getEffectiveActiveRate(selectedContract))}</strong></span>
              <span>Thời hạn KUNN: <strong className="text-sky-600 dark:text-sky-400">{selectedContract.KunnTenor || `${selectedContract.LoanTenorMonths || 12} tháng`}</strong></span>
              <span>Phương thức gốc: <strong className="text-purple-600 dark:text-purple-400">{selectedContract.PrincipalRepaymentMethod || 'Gốc trả cuối kỳ'}</strong></span>
              <span>Ngày giải ngân: <strong className="text-amber-600 dark:text-amber-400 font-mono">{fmtDate(selectedContract.DisbursementDate || selectedContract.ContractStartDate)}</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Main Schedule Table Box */}
      <div className={`${containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
        <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
          <span className="font-bold text-xs">
            LỊCH THU NỢ {selectedContract ? `— ${selectedContract.ContractNumber}` : ''} ({schedules.length} kỳ)
          </span>
          {schedules.length > 0 && (
            <div className="text-[11px] text-slate-500 flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Đã TT: {schedules.filter(isScheduleFullySettled).length} kỳ</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                <span>Chờ TT: {schedules.filter(s => !isScheduleFullySettled(s)).length} kỳ</span>
              </span>
            </div>
          )}
        </div>

        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 ${tableHeaderStyle}`}>
              <tr>
                <th className="p-3 text-center w-10">SELECT</th>
                <th className="p-3 text-center whitespace-nowrap">REPAYMENT</th>
                <th className="p-3 text-center whitespace-nowrap">STATUS</th>
                <th className="p-3 whitespace-nowrap">DUE DATE</th>
                <th className="p-3 text-center whitespace-nowrap text-rose-500">DAYS OVERDUE</th>
                <th className="p-3 text-right whitespace-nowrap">REPAYMENT DUE</th>
                <th className="p-3 text-right whitespace-nowrap text-rose-500">REPAYMENT UNPAID</th>
                <th className="p-3 whitespace-nowrap">PAYMENT / CAPITALIZATION DATE</th>
                <th className="p-3 text-center whitespace-nowrap">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
              {!selectedContract ? (
                <tr><td colSpan={9} className="text-center p-8 text-slate-400">Chọn một HĐTD để xem lịch thu nợ</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={9} className="text-center p-8 text-slate-400">
                  Chưa có lịch thu nợ. Nhấn "TẠO LỊCH THU NỢ TỰ ĐỘNG" để tính toán.
                </td></tr>
              ) : schedules.map(s => {
                let autoOverdue = 0;
                if (!isScheduleFullySettled(s) && s.DueDate) {
                  const parts = s.DueDate.split('-');
                  if (parts.length === 3) {
                    const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    due.setHours(0, 0, 0, 0);
                    const diff = today.getTime() - due.getTime();
                    if (diff > 0) autoOverdue = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  }
                }

                const daThuDu = isScheduleFullySettled(s);
                const paymentStat = schedulePaymentStatus(s);
                const effectiveOverdueDays = daThuDu
                  ? (s.OverdueDays || 0)
                  : ((s.OverdueDays && s.OverdueDays > 0) ? s.OverdueDays : autoOverdue);
                const penaltyAmount = s.OverdueInterestAmount ?? getPenaltyForSchedule(s);
                const isOverdue = effectiveOverdueDays > 0;
                const repaymentDueTotal = (s.PrincipalAmount || 0) + (s.InterestAmount || 0) + penaltyAmount;
                const paidTotal = paidPrincipalOf(s) + (daThuDu ? (s.InterestAmount || 0) : paymentStat.collectedInterest) + (daThuDu ? penaltyAmount : 0);
                const repaymentUnpaidTotal = Math.max(0, repaymentDueTotal - paidTotal);

                const isSelectedRow = selectedScheduleId === s.Id;

                return (
                  <tr
                    key={s.Id}
                    onClick={() => setSelectedScheduleId(s.Id)}
                    className={`cursor-pointer transition-colors ${
                      isSelectedRow
                        ? isLight
                          ? 'bg-sky-100/90 font-semibold text-slate-900 border-l-4 border-sky-600'
                          : 'bg-sky-950/60 font-semibold text-white border-l-4 border-sky-500'
                        : daThuDu
                        ? 'bg-emerald-50/40 dark:bg-emerald-950/10'
                        : isOverdue
                        ? 'bg-rose-50/50 dark:bg-rose-950/30'
                        : tableRowHover
                    }`}
                  >
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="radio"
                        name="selectedSchedulePeriod"
                        checked={isSelectedRow}
                        onChange={() => setSelectedScheduleId(s.Id)}
                        className="w-4 h-4 text-sky-600 focus:ring-sky-500 border-slate-300 cursor-pointer"
                      />
                    </td>
                    <td className="p-3 text-center font-bold font-mono text-sm">{s.PeriodNumber}</td>
                    <td className="p-3 text-center">
                      {daThuDu ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          Paid
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-600 text-white border border-rose-500">
                          Overdue
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-medium">{fmtDate(s.DueDate)}</td>
                    <td className="p-3 text-center font-mono font-bold">
                      {effectiveOverdueDays > 0 ? (
                        <span className="text-rose-600 dark:text-rose-400 font-extrabold">
                          {effectiveOverdueDays}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">0</span>
                      )}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-slate-800 dark:text-slate-200">
                      {repaymentDueTotal.toLocaleString('vi-VN')}
                    </td>
                    <td className="p-3 text-right font-mono font-bold text-rose-600 dark:text-rose-400">
                      {repaymentUnpaidTotal > 0 ? repaymentUnpaidTotal.toLocaleString('vi-VN') : '0'}
                    </td>
                    <td className="p-3 font-mono font-medium text-slate-600 dark:text-slate-300">
                      {daThuDu ? fmtDate(s.PaymentDate) : (s.PaymentDate ? fmtDate(s.PaymentDate) : '—')}
                    </td>
                    <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openPaymentModal(s);
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-sm border ${s.IsPaid
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500 shadow-sky-600/20'
                          }`}>
                        <span>⚙️ Ghi nhận TT / Sửa</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {schedules.length > 0 && (
              <tfoot className={`border-t sticky bottom-0 font-bold ${tableHeaderStyle}`}>
                <tr>
                  <td className="p-3 text-center" colSpan={5}>TỔNG CỘNG LỊCH THU NỢ</td>
                  <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono">
                    {(schedules.reduce((a, s) => a + (s.PrincipalAmount || 0) + (s.InterestAmount || 0), 0) + totalPenaltySum).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono">
                    {schedules.reduce((a, s) => {
                      const penalty = getPenaltyForSchedule(s);
                      const due = (s.PrincipalAmount || 0) + (s.InterestAmount || 0) + penalty;
                      const isPaid = isScheduleFullySettled(s);
                      const pStat = schedulePaymentStatus(s);
                      const paid = paidPrincipalOf(s) + (isPaid ? (s.InterestAmount || 0) : pStat.collectedInterest) + (isPaid ? penalty : 0);
                      return a + Math.max(0, due - paid);
                    }, 0).toLocaleString('vi-VN')}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Breakdown detail component for the selected period */}
        {selectedContract && (
          <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40">
            <PeriodDetailCard
              isLight={isLight}
              selectedContract={selectedContract}
              selectedSchedule={selectedScheduleObj}
            />
          </div>
        )}
      </div>
    </div>
  );
};
