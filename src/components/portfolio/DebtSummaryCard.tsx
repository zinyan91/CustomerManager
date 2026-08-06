import React from 'react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import {
  computeSchedulePenalty, overdueDaysOfSchedule, isScheduleFullySettled, schedulePaymentStatus,
} from '../../lib/loanMath';
import { getEffectiveActiveRate } from '../../lib/rateResolution';

interface DebtSummaryCardProps {
  selectedContract: LoanContract;
  schedules: RepaymentSchedule[];
  allSchedulesMap: Record<number, RepaymentSchedule[]>;
}

export const DebtSummaryCard: React.FC<DebtSummaryCardProps> = ({
  selectedContract,
  schedules,
  allSchedulesMap,
}) => {
  const schs = selectedContract ? (allSchedulesMap[selectedContract.Id] || schedules) : schedules;
  if (!selectedContract || schs.length === 0) return null;

  let duePrincipal = 0;
  let paidPrincipal = 0;
  let overduePrincipal = 0;
  let dueInterest = 0;
  let paidInterest = 0;
  let overdueInterest = 0;
  let penaltyPrincipal = 0;
  let penaltyInterest = 0;

  for (const s of schs) {
    const daThuDu = isScheduleFullySettled(s);
    const isPastDue = !daThuDu && overdueDaysOfSchedule(s) > 0;
    const thuDuoc = schedulePaymentStatus(s);

    if (isPastDue || daThuDu) {
      duePrincipal += (s.PrincipalAmount || 0);
      dueInterest += (s.InterestAmount || 0);
    }
    if (daThuDu) {
      paidPrincipal += (s.PrincipalAmount || 0);
      paidInterest += (s.InterestAmount || 0);
    } else if (isPastDue) {
      paidPrincipal += thuDuoc.collectedPrincipal;
      paidInterest += thuDuoc.collectedInterest;
      overduePrincipal += (s.PrincipalAmount || 0);
      overdueInterest += (s.InterestAmount || 0);
      const penalty = computeSchedulePenalty(
        s,
        getEffectiveActiveRate(selectedContract, s.DueDate)
      );
      penaltyPrincipal += penalty.principalPenalty;
      penaltyInterest += penalty.interestPenalty;
    }
  }

  const totalPenalty = penaltyPrincipal + penaltyInterest;

  const totalUrgentPayment = overduePrincipal + overdueInterest + totalPenalty;

  return (
    <div className="mt-4 p-4 rounded-2xl border bg-slate-900/60 dark:bg-slate-950 border-slate-800 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <span className="font-bold text-xs uppercase text-amber-500 tracking-wider">
          📊 BẢNG THỐNG KÊ CHI TIẾT DƯ NỢ & NGHĨA VỤ THANH TOÁN (HĐ: {selectedContract.ContractNumber})
        </span>
        <span className="text-[10px] text-slate-400">Công thức chuẩn Core NHNN (Phạt 150% gốc quá hạn + 10% lãi quá hạn)</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase">NGHĨA VỤ NỢ GỐC</div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Gốc tới due (đến hạn):</span>
            <span className="font-mono font-bold">{duePrincipal.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Gốc đã thanh toán:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{paidPrincipal.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
            <span className="font-bold text-rose-600 dark:text-rose-400">🔴 GỐC QUÁ HẠN:</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{overduePrincipal.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 space-y-1.5">
          <div className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">NGHĨA VỤ NỢ LÃI</div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Lãi tới due (đến hạn):</span>
            <span className="font-mono font-bold">{dueInterest.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Lãi đã thanh toán:</span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{paidInterest.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-slate-200 dark:border-slate-800">
            <span className="font-bold text-rose-600 dark:text-rose-400">🔴 LÃI QUÁ HẠN:</span>
            <span className="font-mono font-bold text-rose-600 dark:text-rose-400">{overdueInterest.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 space-y-1.5">
          <div className="text-[11px] font-bold text-rose-600 dark:text-rose-400 uppercase">LÃI PHẠT CHẬM TRẢ & PHÍ QUÁ HẠN</div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Phạt gốc (150% LS):</span>
            <span className="font-mono font-bold text-rose-600">{Math.round(penaltyPrincipal).toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-500">Phạt lãi (10%/năm):</span>
            <span className="font-mono font-bold text-rose-600">{Math.round(penaltyInterest).toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <div className="flex justify-between text-xs pt-1 border-t border-rose-200 dark:border-rose-800">
            <span className="font-bold text-rose-700 dark:text-rose-300">TỔNG PHẠT CHẬM TRẢ:</span>
            <span className="font-mono font-bold text-rose-700 dark:text-rose-300">{totalPenalty.toLocaleString('vi-VN')} VNĐ</span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-rose-600 text-white font-bold flex flex-wrap items-center justify-between shadow-md">
        <span className="text-xs uppercase tracking-wider">TỔNG NGHĨA VỤ CẦN THANH TOÁN KHẨN CẤP (GỐC + LÃI QUÁ HẠN + PHẠT):</span>
        <span className="font-mono text-base font-extrabold">{totalUrgentPayment.toLocaleString('vi-VN')} VNĐ</span>
      </div>
    </div>
  );
};
