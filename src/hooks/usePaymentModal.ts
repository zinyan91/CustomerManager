import { useState } from 'react';
import type { LoanContract, RepaymentSchedule } from '../types';
import { parseMoneyInput, todayIso } from '../lib/utils';
import {
  calculateOverdueDaysFromDates, computeOutstandingBalance,
  getAutoDebtGroupInfo, recalculateSchedules,
} from '../lib/loanMath';
import { getEffectiveActiveRate } from '../lib/rateResolution';
import { bulkSaveRepaymentSchedulesAPI, fetchRepaymentSchedulesAPI, saveContractAPI } from '../lib/api';

export interface PaymentSaveResult {
  schedules: RepaymentSchedule[];
  balance: number;
  debtGroup: number;
}

interface UsePaymentModalParams {
  selectedContract: LoanContract | null;
  schedules: RepaymentSchedule[];
  onSaved: (result: PaymentSaveResult) => void;
  onNotify: (type: 'success' | 'error', message: string) => void;
  onLoadingChange: (loading: boolean) => void;
}

export function usePaymentModal({
  selectedContract, schedules, onSaved, onNotify, onLoadingChange,
}: UsePaymentModalParams) {
  const [editingSchedule, setEditingSchedule] = useState<RepaymentSchedule | null>(null);
  const [overdueDaysStr, setOverdueDaysStr] = useState('0');
  const [overdueInterestStr, setOverdueInterestStr] = useState('0');
  const [prepaidPrincipalStr, setPrepaidPrincipalStr] = useState('0');
  const [actualPaidPrincipalStr, setActualPaidPrincipalStr] = useState('0');
  const [actualPaidInterestStr, setActualPaidInterestStr] = useState('0');
  const [isPaid, setIsPaid] = useState(false);
  const [paymentDate, setPaymentDate] = useState(() => todayIso());
  const [note, setNote] = useState('');

  const open = (s: RepaymentSchedule) => {
    setEditingSchedule(s);
    const payDate = s.PaymentDate || todayIso();
    setPaymentDate(payDate);

    let overdue = s.OverdueDays;
    if (overdue === undefined || overdue === null || overdue === 0) {
      overdue = calculateOverdueDaysFromDates(payDate, s.DueDate);
    }
    setOverdueDaysStr(overdue.toString());

    let initialPenalty = s.OverdueInterestAmount ?? 0;
    if (!initialPenalty && overdue > 0 && selectedContract) {
      const rate = getEffectiveActiveRate(selectedContract, s.DueDate);
      initialPenalty = Math.round((s.PrincipalAmount || 0) * (rate * 1.5) * (overdue / 365));
    }
    setOverdueInterestStr(initialPenalty ? initialPenalty.toLocaleString('vi-VN') : '0');

    const prepay = s.PrepaidPrincipalAmount ?? 0;
    setPrepaidPrincipalStr(prepay ? prepay.toLocaleString('vi-VN') : '0');

    const actP = s.ActualPaidPrincipal ?? ((s.PrincipalAmount || 0) + prepay);
    setActualPaidPrincipalStr(actP ? actP.toLocaleString('vi-VN') : '0');

    const actI = s.ActualPaidInterest ?? ((s.InterestAmount || 0) + initialPenalty);
    setActualPaidInterestStr(actI ? actI.toLocaleString('vi-VN') : '0');

    setIsPaid(s.IsPaid);
    setNote(s.Note || '');
  };

  const close = () => setEditingSchedule(null);

  const save = async () => {
    if (!editingSchedule || !selectedContract) return;

    const overdueDays = parseInt(overdueDaysStr, 10) || 0;
    const overdueInterest = parseMoneyInput(overdueInterestStr);
    const prepaidPrincipal = parseMoneyInput(prepaidPrincipalStr);
    const actualPaidP = parseMoneyInput(actualPaidPrincipalStr);
    const actualPaidI = parseMoneyInput(actualPaidInterestStr);

    const updated: RepaymentSchedule = {
      ...editingSchedule,
      TotalAmount: (editingSchedule.PrincipalAmount || 0) + (editingSchedule.InterestAmount || 0) + overdueInterest,
      IsPaid: isPaid,
      PaymentDate: isPaid ? paymentDate : null,
      OverdueDays: overdueDays,
      OverdueInterestAmount: overdueInterest,
      ActualPaidPrincipal: actualPaidP,
      ActualPaidInterest: actualPaidI,
      PrepaidPrincipalAmount: prepaidPrincipal,
      Note: note || null,
    };

    try {
      onLoadingChange(true);

      const draftList = schedules.map(s => (s.Id === updated.Id ? updated : s));
      const recalculated = recalculateSchedules(draftList, selectedContract);

      await bulkSaveRepaymentSchedulesAPI(recalculated);

      const refreshed = await fetchRepaymentSchedulesAPI(selectedContract.Id);
      const autoInfo = getAutoDebtGroupInfo(refreshed);
      const newBal = computeOutstandingBalance(refreshed, selectedContract);

      await saveContractAPI({
        Id: selectedContract.Id,
        CustomerId: selectedContract.CustomerId,
        ContractNumber: selectedContract.ContractNumber,
        CurrentBalance: newBal,
        DebtGroup: autoInfo.debtGroup,
      });

      onSaved({ schedules: refreshed, balance: newBal, debtGroup: autoInfo.debtGroup });
      setEditingSchedule(null);
      onNotify('success', `✓ Đã cập nhật Kỳ #${editingSchedule.PeriodNumber} & tự động phân bổ lại số tiền gốc cho các kỳ sau!`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      onNotify('error', `Không lưu được kỳ trả nợ: ${message}`);
    } finally {
      onLoadingChange(false);
    }
  };

  return {
    editingSchedule,
    overdueDaysStr, setOverdueDaysStr,
    overdueInterestStr, setOverdueInterestStr,
    prepaidPrincipalStr, setPrepaidPrincipalStr,
    actualPaidPrincipalStr, setActualPaidPrincipalStr,
    actualPaidInterestStr, setActualPaidInterestStr,
    isPaid, setIsPaid,
    paymentDate, setPaymentDate,
    note, setNote,
    open,
    close,
    save,
  };
}
