import { useCallback, useMemo, useState } from 'react';
import type { CreditContract, LoanContract, RepaymentSchedule } from '../types';
import { applyEarlySettlementAPI, type AppliedSettlement } from '../lib/api';
import { buildSettlementLine, settlementTotals, type SettlementLine } from '../lib/multiSettlement';
import { parseDecimalNumber, todayIso } from '../lib/utils';

export interface SettlementDraft {
  selected: boolean;
  settlementDate: string;
  /** Rỗng = dùng tỷ lệ gợi ý theo hình thức vay và năm vay. */
  penaltyInput: string;
}

interface UseMultiSettlementParams {
  /** KUNN chưa tất toán của khách đang xem. */
  openContracts: LoanContract[];
  creditContracts: CreditContract[];
  schedulesMap: Record<number, RepaymentSchedule[] | undefined>;
  onSettled: (results: AppliedSettlement[]) => void;
  onNotify: (type: 'success' | 'error', message: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export function useMultiSettlement({ openContracts, creditContracts, schedulesMap, onSettled, onNotify, onLoadingChange }: UseMultiSettlementParams) {
  const [isOpen, setIsOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, SettlementDraft>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [failures, setFailures] = useState<Record<number, string>>({});

  const lines: SettlementLine[] = useMemo(() => openContracts.map(contract => {
    const d = drafts[contract.Id] ?? { selected: false, settlementDate: todayIso(), penaltyInput: '' };
    const override = d.penaltyInput.trim() === '' ? null : Math.max(0, parseDecimalNumber(d.penaltyInput) || 0);
    return buildSettlementLine({ contract, schedules: schedulesMap[contract.Id], settlementDate: d.settlementDate, penaltyOverridePercent: override }, creditContracts);
  }), [openContracts, drafts, schedulesMap, creditContracts]);

  const selectedLines = useMemo(() => lines.filter(l => drafts[l.contract.Id]?.selected), [lines, drafts]);
  const totals = useMemo(() => settlementTotals(selectedLines), [selectedLines]);

  const open = useCallback((preselectId?: number) => {
    if (openContracts.length === 0) {
      onNotify('error', 'Khách hàng không còn khoản vay nào chưa tất toán.');
      return;
    }
    const today = todayIso();
    setDrafts(Object.fromEntries(openContracts.map(c => [c.Id, { selected: c.Id === preselectId, settlementDate: today, penaltyInput: '' }])));
    setFailures({});
    setIsOpen(true);
  }, [openContracts, onNotify]);

  const close = useCallback(() => {
    if (!isSubmitting) setIsOpen(false);
  }, [isSubmitting]);

  const updateDraft = useCallback((contractId: number, patch: Partial<SettlementDraft>) => {
    setDrafts(prev => ({ ...prev, [contractId]: { ...(prev[contractId] ?? { selected: false, settlementDate: todayIso(), penaltyInput: '' }), ...patch } }));
  }, []);

  const applyDateToSelected = useCallback((settlementDate: string) => {
    setDrafts(prev => Object.fromEntries(Object.entries(prev).map(([id, d]) => [id, d.selected ? { ...d, settlementDate } : d])));
  }, []);

  const setAllSelected = useCallback((selected: boolean) => {
    setDrafts(prev => Object.fromEntries(Object.entries(prev).map(([id, d]) => [id, { ...d, selected }])));
  }, []);

  const execute = useCallback(async () => {
    const ready = selectedLines.filter(l => l.blockReason === null && l.quote);
    if (ready.length === 0) {
      onNotify('error', 'Chưa có khoản nào tất toán được trong các khoản đã chọn.');
      return;
    }
    setIsSubmitting(true);
    onLoadingChange?.(true);
    const done: AppliedSettlement[] = [];
    const failed: Record<number, string> = {};
    // Ghi tuần tự từng khoản: một khoản lỗi không làm hỏng các khoản đã ghi xong
    for (const line of ready) {
      try {
        done.push(await applyEarlySettlementAPI(line.contract, line.quote!));
      } catch (err) {
        failed[line.contract.Id] = err instanceof Error ? err.message : String(err);
      }
    }
    setIsSubmitting(false);
    onLoadingChange?.(false);
    if (done.length > 0) onSettled(done);
    setFailures(failed);

    const failedCount = Object.keys(failed).length;
    const reloadFailed = done.filter(d => d.reloadError !== null);
    if (failedCount === 0 && reloadFailed.length > 0) {
      onNotify('error', `Đã tất toán ${done.length} khoản vay; chưa đọc lại được lịch trả nợ của ${reloadFailed.map(d => d.contract.ContractNumber).join(', ')}: ${reloadFailed[0].reloadError}`);
      setIsOpen(false);
    } else if (failedCount === 0) {
      onNotify('success', `Đã tất toán ${done.length} khoản vay.`);
      setIsOpen(false);
    } else {
      onNotify('error', `Đã tất toán ${done.length} khoản; ${failedCount} khoản chưa ghi được, xem lý do ở từng dòng.`);
      setDrafts(prev => Object.fromEntries(Object.entries(prev).map(([id, d]) => [id, { ...d, selected: Number(id) in failed }])));
    }
  }, [selectedLines, onNotify, onLoadingChange, onSettled]);

  return { isOpen, open, close, drafts, updateDraft, applyDateToSelected, setAllSelected, lines, totals, isSubmitting, failures, execute };
}
