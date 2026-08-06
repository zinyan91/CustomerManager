import React from 'react';
import type { RepaymentSchedule, LoanContract } from '../../types';
import { paidPrincipalOf, isScheduleFullySettled, computeSchedulePenalty, schedulePaymentStatus } from '../../lib/loanMath';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { fmtMoney } from '../../lib/utils';
import { ChevronDown, Layers } from 'lucide-react';

interface PeriodDetailCardProps {
  isLight: boolean;
  selectedContract: LoanContract | null;
  selectedSchedule: RepaymentSchedule | null;
}

export const PeriodDetailCard: React.FC<PeriodDetailCardProps> = ({
  isLight,
  selectedContract,
  selectedSchedule,
}) => {
  if (!selectedSchedule) {
    return (
      <div className={`p-6 rounded-2xl border text-center ${isLight ? 'bg-slate-50 border-slate-200 text-slate-400' : 'bg-slate-900/40 border-slate-800 text-slate-500'}`}>
        <Layers className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p className="text-xs">Vui lòng chọn một kỳ trên Bảng Lịch Thu Nợ để xem chi tiết khoản trả</p>
      </div>
    );
  }

  // Calculated values for the selected schedule period
  const isSettled = isScheduleFullySettled(selectedSchedule);
  const paymentStatus = schedulePaymentStatus(selectedSchedule);

  const duePrincipal = selectedSchedule.PrincipalAmount || 0;
  const paidPrincipal = paidPrincipalOf(selectedSchedule);
  const unpaidPrincipal = Math.max(0, duePrincipal - paidPrincipal);

  const dueInterest = selectedSchedule.InterestAmount || 0;
  const paidInterest = isSettled ? dueInterest : paymentStatus.collectedInterest;
  const unpaidInterest = Math.max(0, dueInterest - paidInterest);

  const penaltyAmount = selectedSchedule.OverdueInterestAmount ?? (
    isSettled ? 0 : computeSchedulePenalty(
      selectedSchedule,
      getEffectiveActiveRate(selectedContract, selectedSchedule.DueDate)
    ).principalPenalty
  );
  const paidPenalty = isSettled ? (selectedSchedule.OverdueInterestAmount || 0) : 0;
  const unpaidPenalty = Math.max(0, penaltyAmount - paidPenalty);

  // Charges / Insurance placeholders (user will map data later)
  const dueCharges = 0;
  const paidCharges = 0;
  const unpaidCharges = 0;

  const dueTaxCharges = 0;
  const paidTaxCharges = 0;
  const unpaidTaxCharges = 0;

  const dueLongTermIns = 0;
  const paidLongTermIns = 0;
  const unpaidLongTermIns = 0;

  const dueShortTermIns = 0;
  const paidShortTermIns = 0;
  const unpaidShortTermIns = 0;

  const dueAddShortTermIns = 0;
  const paidAddShortTermIns = 0;
  const unpaidAddShortTermIns = 0;

  // Repayment Amount totals
  const totalDue = duePrincipal + dueInterest + dueCharges + dueTaxCharges + dueLongTermIns + dueShortTermIns + dueAddShortTermIns + penaltyAmount;
  const totalPaid = paidPrincipal + paidInterest + paidCharges + paidTaxCharges + paidLongTermIns + paidShortTermIns + paidAddShortTermIns + paidPenalty;
  const totalUnpaid = Math.max(0, totalDue - totalPaid);

  const rows = [
    {
      label: 'Repayment Amount',
      vnLabel: 'Tổng Khoản Trả',
      due: totalDue,
      paid: totalPaid,
      unpaid: totalUnpaid,
      isTotal: true,
    },
    {
      label: 'Principal',
      vnLabel: 'Nợ Gốc',
      due: duePrincipal,
      paid: paidPrincipal,
      unpaid: unpaidPrincipal,
    },
    {
      label: 'Interest',
      vnLabel: 'Nợ Lãi',
      due: dueInterest,
      paid: paidInterest,
      unpaid: unpaidInterest,
    },
    {
      label: 'Charges',
      vnLabel: 'Phí Dịch Vụ',
      due: dueCharges,
      paid: paidCharges,
      unpaid: unpaidCharges,
    },
    {
      label: 'Tax On Charges',
      vnLabel: 'Thuế Trên Phí',
      due: dueTaxCharges,
      paid: paidTaxCharges,
      unpaid: unpaidTaxCharges,
    },
    {
      label: 'Long Term Insurance',
      vnLabel: 'Bảo Hiểm Dài Hạn',
      due: dueLongTermIns,
      paid: paidLongTermIns,
      unpaid: unpaidLongTermIns,
    },
    {
      label: 'Short Term Insurance',
      vnLabel: 'Bảo Hiểm Ngắn Hạn',
      due: dueShortTermIns,
      paid: paidShortTermIns,
      unpaid: unpaidShortTermIns,
    },
    {
      label: 'Additional Short Term Insurance',
      vnLabel: 'BH Ngắn Hạn Bổ Sung',
      due: dueAddShortTermIns,
      paid: paidAddShortTermIns,
      unpaid: unpaidAddShortTermIns,
    },
    {
      label: 'Penalty Interest Accrued',
      vnLabel: 'Lãi Phạt Dồn Tích',
      due: penaltyAmount,
      paid: penaltyAmount > 0 && isSettled ? penaltyAmount : paidPenalty,
      unpaid: unpaidPenalty,
    },
  ];

  return (
    <div className={`mt-4 rounded-2xl border shadow-sm overflow-hidden transition-all ${
      isLight ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'
    }`}>
      {/* Header */}
      <div className={`p-4 border-b flex items-center justify-between ${
        isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/60 border-slate-800'
      }`}>
        <div className="flex items-center space-x-3">
          <h3 className="font-bold text-sm tracking-tight text-slate-800 dark:text-slate-100">
            Repayment Number {selectedSchedule.PeriodNumber}
          </h3>
          <span className="text-xs font-mono px-2.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
            Kỳ #{selectedSchedule.PeriodNumber} — Hạn: {selectedSchedule.DueDate}
          </span>
        </div>
        <div className="text-xs text-slate-500">
          Chi Tiết Phân Rã Khoản Trả
        </div>
      </div>

      {/* Detail Breakdown Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className={`border-b ${isLight ? 'bg-slate-100/70 border-slate-200 text-slate-600' : 'bg-slate-950/40 border-slate-800 text-slate-400'}`}>
              <th className="p-3 font-semibold uppercase tracking-wider min-w-[220px]">Repayment Elements</th>
              <th className="p-3 font-semibold uppercase tracking-wider text-right w-[140px]">Due</th>
              <th className="p-3 font-semibold uppercase tracking-wider text-right w-[140px]">
                <div className="inline-flex items-center space-x-1 cursor-pointer">
                  <span>Paid</span>
                  <ChevronDown className="w-3 h-3 text-sky-500" />
                </div>
              </th>
              <th className="p-3 font-semibold uppercase tracking-wider text-right w-[140px]">Unpaid</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${isLight ? 'divide-slate-200/70' : 'divide-slate-800/40'}`}>
            {rows.map((r, idx) => (
              <tr
                key={idx}
                className={`transition-colors ${
                  r.isTotal
                    ? isLight
                      ? 'bg-slate-100/80 font-bold text-slate-900'
                      : 'bg-slate-800/60 font-bold text-slate-100'
                    : isLight
                    ? idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                    : idx % 2 === 0 ? 'bg-slate-900/50' : 'bg-slate-950/30'
                } hover:bg-sky-50/40 dark:hover:bg-sky-950/20`}
              >
                <td className="p-3 font-medium">
                  <div className="flex flex-col">
                    <span className={r.isTotal ? 'font-bold' : ''}>{r.label}</span>
                    <span className="text-[10px] text-slate-400 font-normal">{r.vnLabel}</span>
                  </div>
                </td>
                <td className={`p-3 text-right font-mono ${r.isTotal ? 'font-bold' : ''}`}>
                  {fmtMoney(r.due)}
                </td>
                <td className={`p-3 text-right font-mono ${r.paid > 0 ? 'text-emerald-600 dark:text-emerald-400 font-semibold' : 'text-slate-400'}`}>
                  {fmtMoney(r.paid)}
                </td>
                <td className={`p-3 text-right font-mono ${r.unpaid > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-400'}`}>
                  {fmtMoney(r.unpaid)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
