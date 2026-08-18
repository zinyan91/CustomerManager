import { useCallback, useState } from 'react';
import {
  fetchRepaymentSchedulesAPI, bulkSaveRepaymentSchedulesAPI, saveContractAPI,
} from '../lib/api';
import {
  canQuickSettle, markSchedulePaidOnTime, recalculateSchedules,
  getAutoDebtGroupInfo, computeOutstandingBalance,
} from '../lib/loanMath';
import { todayIso } from '../lib/utils';
import type { LoanContract, RepaymentSchedule } from '../types';

interface QuickSettleParams {
  onNotify: (type: 'success' | 'error', message: string) => void;
  onDone: () => void;
  confirm?: (message: string) => boolean;
}

export function useQuickSettle({ onNotify, onDone, confirm }: QuickSettleParams) {
  const [busyScheduleId, setBusyScheduleId] = useState<number | null>(null);

  const settle = useCallback(async (
    contract: LoanContract,
    period: RepaymentSchedule,
    label: string
  ) => {
    const homNay = todayIso();
    const check = canQuickSettle(period, homNay);
    if (!check.ok) {
      onNotify('error', check.reason || 'Kỳ này không thu nhanh được.');
      return;
    }

    const hoi = confirm ?? ((m: string) => window.confirm(m));
    if (!hoi(label)) return;

    setBusyScheduleId(period.Id);
    try {
      const hienCo = await fetchRepaymentSchedulesAPI(contract.Id);
      const thucTe = hienCo.find(s => s.Id === period.Id);
      if (!thucTe) throw new Error('Kỳ trả nợ không còn tồn tại, hãy tải lại trang.');

      const lai = canQuickSettle(thucTe, homNay);
      if (!lai.ok) throw new Error(lai.reason || 'Kỳ này không thu nhanh được.');

      const daGhi = markSchedulePaidOnTime(thucTe, homNay);
      const banNhap = hienCo.map(s => (s.Id === daGhi.Id ? daGhi : s));

      await bulkSaveRepaymentSchedulesAPI(recalculateSchedules(banNhap, contract));

      const moi = await fetchRepaymentSchedulesAPI(contract.Id);
      const nhomNo = getAutoDebtGroupInfo(moi);
      await saveContractAPI({
        Id: contract.Id,
        CustomerId: contract.CustomerId,
        ContractNumber: contract.ContractNumber,
        CurrentBalance: computeOutstandingBalance(moi, contract),
        DebtGroup: nhomNo.debtGroup,
      });

      onNotify('success', `✓ Đã ghi nhận thu kỳ ${period.PeriodNumber} · ${contract.ContractNumber}`);
      onDone();
    } catch (err) {
      onNotify('error', err instanceof Error ? err.message : 'Không ghi nhận được kỳ thu.');
    } finally {
      setBusyScheduleId(null);
    }
  }, [onNotify, onDone, confirm]);

  return { settle, busyScheduleId };
}
