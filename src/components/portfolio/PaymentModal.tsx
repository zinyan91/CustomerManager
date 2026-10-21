import React from 'react';
import { Receipt, Save } from 'lucide-react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtDate, fmtMoney, formatMoneyInput } from '../../lib/utils';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { DateInput } from '../DateInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';

interface PaymentModalProps {
  editingSchedule: RepaymentSchedule;
  selectedContract: LoanContract;
  loading: boolean;
  modalActualPaidPrincipalStr: string;
  setModalActualPaidPrincipalStr: (v: string) => void;
  modalActualPaidInterestStr: string;
  setModalActualPaidInterestStr: (v: string) => void;
  modalPrepaidPrincipalStr: string;
  setModalPrepaidPrincipalStr: (v: string) => void;
  modalOverdueDaysStr: string;
  setModalOverdueDaysStr: (v: string) => void;
  modalOverdueInterestStr: string;
  setModalOverdueInterestStr: (v: string) => void;
  modalPaymentDate: string;
  setModalPaymentDate: (v: string) => void;
  modalIsPaid: boolean;
  setModalIsPaid: (v: boolean) => void;
  onClose: () => void;
  onSave: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  editingSchedule,
  selectedContract,
  loading,
  modalActualPaidPrincipalStr,
  setModalActualPaidPrincipalStr,
  modalActualPaidInterestStr,
  setModalActualPaidInterestStr,
  modalPrepaidPrincipalStr,
  setModalPrepaidPrincipalStr,
  modalOverdueDaysStr,
  setModalOverdueDaysStr,
  modalOverdueInterestStr,
  setModalOverdueInterestStr,
  modalPaymentDate,
  setModalPaymentDate,
  modalIsPaid,
  setModalIsPaid,
  onClose,
  onSave,
}) => {
  const annualRate = getEffectiveActiveRate(selectedContract, editingSchedule.DueDate);

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-4 sm:p-5 bg-surface/40 flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-accent-soft text-accent shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <DialogTitle className="font-bold text-sm tracking-wide text-ink">
              Thu nợ Kỳ #{editingSchedule.PeriodNumber} · {selectedContract.ContractNumber}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-surface/60 rounded-[var(--r-control)] border border-line/60">
            <div>
              <div className="text-[10px] text-ink-faint uppercase font-bold">Ngày đến hạn</div>
              <div className="font-mono font-bold text-ink">{fmtDate(editingSchedule.DueDate)}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-faint uppercase font-bold">Gốc phải thu</div>
              <div className="font-mono font-bold text-pos">{fmtMoney(editingSchedule.PrincipalAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-faint uppercase font-bold">Lãi phải thu</div>
              <div className="font-mono font-bold text-warn">{fmtMoney(editingSchedule.InterestAmount)}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-faint uppercase font-bold">Lãi suất áp dụng</div>
              <div className="font-mono font-bold text-accent">{(annualRate * 100).toFixed(2)}%/năm</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="collection-payment-date" className="block text-[11px] font-bold text-ink-muted uppercase mb-1">
                Ngày thực trả
              </label>
              <DateInput
                id="collection-payment-date"
                value={modalPaymentDate}
                onChange={setModalPaymentDate}
                className="w-full p-2 rounded-[var(--r-control)] border border-line/70 bg-surface/80 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label htmlFor="collection-overdue-days" className="block text-[11px] font-bold text-ink-muted uppercase mb-1">
                Số ngày quá hạn
              </label>
              <input
                id="collection-overdue-days"
                type="number"
                min={0}
                value={modalOverdueDaysStr}
                onChange={e => setModalOverdueDaysStr(e.target.value)}
                className="w-full p-2 rounded-[var(--r-control)] border border-line/70 bg-surface/80 text-xs font-mono font-bold"
              />
            </div>

            <div>
              <label htmlFor="collection-principal" className="block text-[11px] font-bold text-ink-muted uppercase mb-1">
                Gốc thực thu (VNĐ)
              </label>
              <input
                id="collection-principal"
                type="text"
                value={modalActualPaidPrincipalStr}
                onChange={e => setModalActualPaidPrincipalStr(formatMoneyInput(e.target.value))}
                className="w-full p-2 rounded-[var(--r-control)] border border-line/70 bg-surface/80 text-xs font-mono font-bold text-pos"
              />
            </div>

            <div>
              <label htmlFor="collection-interest" className="block text-[11px] font-bold text-ink-muted uppercase mb-1">
                Lãi thực thu gồm lãi phạt (VNĐ)
              </label>
              <input
                id="collection-interest"
                type="text"
                value={modalActualPaidInterestStr}
                onChange={e => setModalActualPaidInterestStr(formatMoneyInput(e.target.value))}
                className="w-full p-2 rounded-[var(--r-control)] border border-line/70 bg-surface/80 text-xs font-mono font-bold text-warn"
              />
            </div>

            <div>
              <label htmlFor="collection-prepaid" className="block text-[11px] font-bold text-ink-muted uppercase mb-1">
                Gốc trả trước hạn (VNĐ)
              </label>
              <input
                id="collection-prepaid"
                type="text"
                value={modalPrepaidPrincipalStr}
                onChange={e => setModalPrepaidPrincipalStr(formatMoneyInput(e.target.value))}
                className="w-full p-2 rounded-[var(--r-control)] border border-line/70 bg-surface/80 text-xs font-mono font-bold text-accent"
              />
            </div>

            <div>
              <label htmlFor="collection-penalty" className="block text-[11px] font-bold text-ink-muted uppercase mb-1">
                Lãi phạt quá hạn (VNĐ)
              </label>
              <input
                id="collection-penalty"
                type="text"
                value={modalOverdueInterestStr}
                onChange={e => setModalOverdueInterestStr(formatMoneyInput(e.target.value))}
                className="w-full p-2 rounded-[var(--r-control)] border border-line/70 bg-surface/80 text-xs font-mono font-bold text-neg"
              />
            </div>
          </div>
        </div>

        <div className="p-4 bg-surface/40 border-t border-line/60 flex items-center justify-between flex-wrap gap-2">
          <label className="flex items-center space-x-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={modalIsPaid}
              onChange={e => setModalIsPaid(e.target.checked)}
              className="w-4 h-4 rounded border-line text-pos focus:ring-pos cursor-pointer"
            />
            <span className="text-xs font-bold text-ink-muted">
              Xác nhận Kỳ #{editingSchedule.PeriodNumber} đã thanh toán
            </span>
          </label>

          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={loading}
              onClick={onSave}
              leftIcon={<Save className="w-3.5 h-3.5" />}
            >
              {loading ? 'Đang lưu...' : 'Lưu kỳ thu nợ'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
