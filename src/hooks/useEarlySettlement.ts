import { useState, useMemo, useCallback } from 'react';
import type { LoanContract, RepaymentSchedule } from '../types';
import { todayIso, fmtDate } from '../lib/utils';
import { calculateEarlySettlementQuote, type EarlySettlementQuote } from '../lib/loanSettlement';
import {
  deleteRepaymentSchedulesByIdsAPI,
  bulkSaveRepaymentSchedulesAPI,
  saveContractAPI,
  fetchRepaymentSchedulesAPI,
} from '../lib/api';

export interface EarlySettlementResult {
  contract: LoanContract;
  schedules: RepaymentSchedule[];
}

interface UseEarlySettlementParams {
  selectedContract: LoanContract | null;
  schedules: RepaymentSchedule[];
  onSettled: (result: EarlySettlementResult) => void;
  onNotify: (type: 'success' | 'error', message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function useEarlySettlement({
  selectedContract,
  schedules,
  onSettled,
  onNotify,
  onLoadingChange,
}: UseEarlySettlementParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [settlementDate, setSettlementDate] = useState(() => todayIso());
  const [penaltyRateStr, setPenaltyRateStr] = useState('0');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const penaltyRatePercent = useMemo(() => {
    const val = parseFloat(penaltyRateStr.replace(',', '.'));
    return isNaN(val) || val < 0 ? 0 : val;
  }, [penaltyRateStr]);

  const quote: EarlySettlementQuote | null = useMemo(() => {
    if (!selectedContract) return null;
    return calculateEarlySettlementQuote({
      contract: selectedContract,
      schedules,
      settlementDate,
      penaltyRatePercent,
    });
  }, [selectedContract, schedules, settlementDate, penaltyRatePercent]);

  const open = useCallback(() => {
    if (!selectedContract) return;
    if (selectedContract.IsSettled) {
      onNotify('error', `Khoản vay ${selectedContract.ContractNumber} đã ở trạng thái tất toán.`);
      return;
    }
    setSettlementDate(todayIso());
    setPenaltyRateStr('0');
    setIsOpen(true);
  }, [selectedContract, onNotify]);

  const close = useCallback(() => {
    if (isSubmitting) return;
    setIsOpen(false);
  }, [isSubmitting]);

  const executeSettlement = useCallback(async () => {
    if (!selectedContract || !quote) return;
    if (!quote.canSettle) {
      onNotify('error', quote.blockReason || 'Không thể thực hiện tất toán khoản vay này.');
      return;
    }

    try {
      setIsSubmitting(true);
      onLoadingChange?.(true);

      // 1. Xóa toàn bộ các kỳ thu nợ tương lai còn lại
      if (quote.futureScheduleIds.length > 0) {
        await deleteRepaymentSchedulesByIdsAPI(quote.futureScheduleIds);
      }

      // 2. Lưu lại kỳ tất toán chốt số liệu thực tế
      if (quote.settledRow) {
        await bulkSaveRepaymentSchedulesAPI([quote.settledRow]);
      }

      // 3. Cập nhật trạng thái hợp đồng KUNN: Bal = 0, IsSettled = true, DebtGroup = 1
      const updatedContractPayload: Partial<LoanContract> = {
        Id: selectedContract.Id,
        CustomerId: selectedContract.CustomerId,
        ContractNumber: selectedContract.ContractNumber,
        CurrentBalance: 0,
        IsSettled: true,
        SettledDate: quote.settlementDate,
        DebtGroup: 1,
      };
      await saveContractAPI(updatedContractPayload);

      // 4. Lấy lại danh sách kỳ mới nhất sau khi cắt lịch
      const refreshedSchedules = await fetchRepaymentSchedulesAPI(selectedContract.Id);

      const updatedContract: LoanContract = {
        ...selectedContract,
        ...updatedContractPayload,
      };

      onSettled({
        contract: updatedContract,
        schedules: refreshedSchedules,
      });

      onNotify(
        'success',
        `✓ Đã tất toán khoản vay ${selectedContract.ContractNumber} thành công! Lịch thu nợ đã được chốt và cắt tại ngày ${fmtDate(quote.settlementDate)}.`
      );
      setIsOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onNotify('error', `Không thể hoàn tất tất toán: ${msg}`);
    } finally {
      setIsSubmitting(false);
      onLoadingChange?.(false);
    }
  }, [selectedContract, quote, onNotify, onLoadingChange, onSettled]);

  return {
    isOpen,
    settlementDate,
    setSettlementDate,
    penaltyRateStr,
    setPenaltyRateStr,
    quote,
    isSubmitting,
    open,
    close,
    executeSettlement,
  };
}
