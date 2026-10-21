import { useRef, useState } from 'react';
import type { LoanContract, RepaymentSchedule } from '../types';
import { fmtDate, fmtMoney, parseMoneyInput, formatMoneyInput, todayIso } from '../lib/utils';
import { initialPaymentDraft, changePaymentDate, changeOverdueDays, buildPaymentUpdate, quickCollectionPlan, type PaymentDraft } from '../lib/paymentCollection';
import {
  computeOutstandingBalance,
  getAutoDebtGroupInfo, recalculateSchedules,
} from '../lib/loanMath';
import { bulkSaveRepaymentSchedulesAPI, fetchRepaymentSchedulesAPI, saveContractAPI } from '../lib/api';
import { useConfirm } from '../context/ConfirmContext';
import { verifyCollectionPersistence } from '../lib/collectionPersistence';

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
  const confirm = useConfirm();
  const [editingSchedule, setEditingSchedule] = useState<RepaymentSchedule | null>(null);
  const [draft, setDraft] = useState<PaymentDraft | null>(null);
  const busy = useRef(false);
  const patch = (value: Partial<PaymentDraft>) => setDraft(previous => previous ? { ...previous, ...value } : previous);
  const setPaymentDate = (date: string) => setDraft(previous => previous && editingSchedule && selectedContract
    ? changePaymentDate(previous, date, editingSchedule, selectedContract) : previous);
  const setOverdueDaysStr = (days: string) => setDraft(previous => previous && editingSchedule && selectedContract
    ? changeOverdueDays(previous, days, editingSchedule, selectedContract) : previous);
  const setOverdueInterestStr = (value: string) => setDraft(previous => {
    if (!previous || !editingSchedule) return previous;
    const penalty = parseMoneyInput(formatMoneyInput(value));
    const follows = parseMoneyInput(previous.actualPaidInterestStr) === editingSchedule.InterestAmount + parseMoneyInput(previous.overdueInterestStr);
    return { ...previous, overdueInterestStr: formatMoneyInput(value),
      actualPaidInterestStr: follows ? formatMoneyInput(String(editingSchedule.InterestAmount + penalty)) : previous.actualPaidInterestStr };
  });
  const open = (s: RepaymentSchedule) => {
    if (!selectedContract) return;
    setEditingSchedule(s);
    setDraft(initialPaymentDraft(s, selectedContract, todayIso()));
  };
  const close = () => { setEditingSchedule(null); setDraft(null); };

  const persist = async (next: RepaymentSchedule[], contract: LoanContract) => {
    const calculated = recalculateSchedules(next, contract);
    await bulkSaveRepaymentSchedulesAPI(calculated);
    const refreshed = await fetchRepaymentSchedulesAPI(contract.Id);
    verifyCollectionPersistence(calculated, refreshed);
    const autoInfo = getAutoDebtGroupInfo(refreshed, todayIso());
    const balance = computeOutstandingBalance(refreshed, contract);
    await saveContractAPI({
      Id: contract.Id, CustomerId: contract.CustomerId, ContractNumber: contract.ContractNumber,
      CurrentBalance: balance, DebtGroup: autoInfo.debtGroup,
    });
    onSaved({ schedules: refreshed, balance, debtGroup: autoInfo.debtGroup });
  };

  const save = async () => {
    if (!editingSchedule || !selectedContract || !draft || busy.current) return;
    busy.current = true;
    try {
      const updated = buildPaymentUpdate(editingSchedule, draft);
      onLoadingChange(true);
      await persist(schedules.map(s => s.Id === updated.Id ? updated : s), selectedContract);
      close();
      onNotify('success', `Đã cập nhật kỳ #${editingSchedule.PeriodNumber}.`);
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : String(error));
    } finally {
      busy.current = false;
      onLoadingChange(false);
    }
  };

  const quickSettleAllDue = async (delayDays = 0) => {
    if (!selectedContract || busy.current) return;
    busy.current = true;
    try {
      onLoadingChange(true);
      const fresh = await fetchRepaymentSchedulesAPI(selectedContract.Id);
      const plan = quickCollectionPlan(recalculateSchedules(fresh, selectedContract), selectedContract, delayDays, todayIso());
      if (!plan.length) {
        onNotify('error', 'Không có kỳ chưa thu nào phù hợp ngày thu đã chọn.');
        return;
      }
      const penalty = plan.reduce((sum, s) => sum + (s.OverdueInterestAmount ?? 0), 0);
      const confirmed = await confirm({
        title: delayDays ? `Thu nhanh trễ ${delayDays} ngày` : 'Thu nhanh đúng hạn',
        message: plan.map(s => `Kỳ #${s.PeriodNumber}: ${fmtDate(s.PaymentDate)} — lãi phạt ${fmtMoney(s.OverdueInterestAmount ?? 0)}`).join('\n')
          + `\nTổng lãi phạt: ${fmtMoney(penalty)}. Ghi nhận thu đủ ${plan.length} kỳ?`,
        confirmText: 'Thu nợ nhanh', tone: 'primary',
      });
      if (!confirmed) return;
      const latest = await fetchRepaymentSchedulesAPI(selectedContract.Id);
      if (JSON.stringify(latest) !== JSON.stringify(fresh)) throw new Error('Lịch trả nợ đã thay đổi. Tải lại và kiểm tra trước khi thu.');
      const byId = new Map(plan.map(s => [s.Id, s]));
      await persist(fresh.map(s => byId.get(s.Id) ?? s), selectedContract);
      onNotify('success', `Đã ghi nhận thu nhanh ${plan.length} kỳ.`);
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : String(error));
    } finally {
      busy.current = false;
      onLoadingChange(false);
    }
  };

  return {
    editingSchedule,
    overdueDaysStr: draft?.overdueDaysStr ?? '0', setOverdueDaysStr,
    overdueInterestStr: draft?.overdueInterestStr ?? '0', setOverdueInterestStr,
    prepaidPrincipalStr: draft?.prepaidPrincipalStr ?? '0', setPrepaidPrincipalStr: (v: string) => patch({ prepaidPrincipalStr: v }),
    actualPaidPrincipalStr: draft?.actualPaidPrincipalStr ?? '0', setActualPaidPrincipalStr: (v: string) => patch({ actualPaidPrincipalStr: v }),
    actualPaidInterestStr: draft?.actualPaidInterestStr ?? '0', setActualPaidInterestStr: (v: string) => patch({ actualPaidInterestStr: v }),
    isPaid: draft?.isPaid ?? false, setIsPaid: (v: boolean) => patch({ isPaid: v }),
    paymentDate: draft?.paymentDate ?? '', setPaymentDate,
    note: draft?.note ?? '', setNote: (v: string) => patch({ note: v }),
    open, close, save, quickSettleAllDue,
  };
}
