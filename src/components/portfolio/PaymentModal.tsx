import React from 'react';
import { Receipt, X, Save } from 'lucide-react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtDate, formatMoneyInput } from '../../lib/utils';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { calculateOverdueDaysFromDates, computeSchedulePenalty } from '../../lib/loanMath';
import { DateInput } from '../DateInput';

interface PaymentModalProps {
  editingSchedule: RepaymentSchedule;
  selectedContract: LoanContract;
  containerCardBg: string;
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
  containerCardBg,
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface/80 backdrop-blur-sm animate-fadeIn">
      <div className={`${containerCardBg} w-full max-w-xl rounded-lg border shadow-2xl p-5 space-y-4`}>
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-sm  tracking-wide text-ink">
              GHI NHẬN THANH TOÁN & QUÁ HẠN — KỲ #{editingSchedule.PeriodNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-panel-muted text-ink-faint"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-md bg-accent-soft  border border-accent/30  grid grid-cols-2 gap-3 text-xs">
          <div>Ngày đến hạn kỳ: <strong className="font-mono text-ink">{fmtDate(editingSchedule.DueDate)}</strong></div>
          <div>Gốc quy định: <strong className="font-mono text-accent">{editingSchedule.PrincipalAmount.toLocaleString('vi-VN')} VNĐ</strong></div>
          <div>Lãi quy định: <strong className="font-mono text-warn">{editingSchedule.InterestAmount.toLocaleString('vi-VN')} VNĐ</strong></div>
          <div>Tổng nghĩa vụ chuẩn: <strong className="font-mono text-pos">{(editingSchedule.PrincipalAmount + editingSchedule.InterestAmount).toLocaleString('vi-VN')} VNĐ</strong></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-accent mb-1">
                Gốc đã đóng kỳ này (VNĐ)
              </label>
              <input
                type="text"
                value={modalActualPaidPrincipalStr}
                onChange={e => setModalActualPaidPrincipalStr(formatMoneyInput(e.target.value))}
                placeholder="0"
                className="w-full p-2.5 rounded-md border text-xs font-mono font-bold text-accent bg-accent-soft  border-accent/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-pos mb-1">
                Lãi đã đóng kỳ này (VNĐ)
              </label>
              <input
                type="text"
                value={modalActualPaidInterestStr}
                onChange={e => setModalActualPaidInterestStr(formatMoneyInput(e.target.value))}
                placeholder="0"
                className="w-full p-2.5 rounded-md border text-xs font-mono font-bold text-pos bg-pos-soft  border-pos/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-warn mb-1">
                Trả nợ gốc trước hạn kỳ này (VNĐ)
              </label>
              <input
                type="text"
                value={modalPrepaidPrincipalStr}
                onChange={e => setModalPrepaidPrincipalStr(formatMoneyInput(e.target.value))}
                placeholder="0"
                className="w-full p-2.5 rounded-md border text-xs font-mono font-bold text-warn bg-warn-soft  border-warn/30"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-neg mb-1">
                Số ngày quá hạn (ngày)
              </label>
              <input
                type="number"
                min={0}
                value={modalOverdueDaysStr}
                onChange={e => {
                  const days = parseInt(e.target.value, 10) || 0;
                  setModalOverdueDaysStr(e.target.value);
                  if (days > 0 && selectedContract) {
                    const rate = getEffectiveActiveRate(selectedContract, editingSchedule.DueDate);
                    const calcPen = computeSchedulePenalty(editingSchedule, rate, { overdueDays: days, principalPenaltyMultiplier: selectedContract.PrincipalPenaltyMultiplier }).principalPenalty;
                    setModalOverdueInterestStr(calcPen.toLocaleString('vi-VN'));
                  } else {
                    setModalOverdueInterestStr('0');
                  }
                }}
                placeholder="0"
                className="w-full p-2.5 rounded-md border text-xs font-mono font-bold text-neg bg-neg-soft border-neg/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-neg mb-1">
                Lãi phạt quá hạn 150% (VNĐ)
              </label>
              <input
                type="text"
                value={modalOverdueInterestStr}
                onChange={e => setModalOverdueInterestStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-md border text-xs font-mono font-bold text-neg bg-neg-soft border-neg/30"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-faint mb-1">
                Ngày thanh toán thực tế
              </label>
              <DateInput
                value={modalPaymentDate}
                onChange={(newDate) => {
                  setModalPaymentDate(newDate);
                  if (editingSchedule && newDate) {
                    const calcDays = calculateOverdueDaysFromDates(newDate, editingSchedule.DueDate);
                    setModalOverdueDaysStr(calcDays.toString());
                    if (calcDays > 0 && selectedContract) {
                      const rate = getEffectiveActiveRate(selectedContract, editingSchedule.DueDate);
                      const calcPen = computeSchedulePenalty(editingSchedule, rate, { overdueDays: calcDays, principalPenaltyMultiplier: selectedContract.PrincipalPenaltyMultiplier }).principalPenalty;
                      setModalOverdueInterestStr(calcPen.toLocaleString('vi-VN'));
                    } else {
                      setModalOverdueInterestStr('0');
                    }
                  }
                }}
                className="w-full p-2.5 rounded-md border text-xs bg-transparent border-line"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-line flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={modalIsPaid}
              onChange={e => setModalIsPaid(e.target.checked)}
              className="w-4 h-4 rounded text-pos "
            />
            <span className="text-xs font-bold text-ink-muted">
              Xác nhận Kỳ #{editingSchedule.PeriodNumber} đã thanh toán
            </span>
          </label>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-xs font-bold bg-panel-muted hover:bg-panel-muted text-ink-muted"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={loading}
              className="px-4 py-2 rounded-md text-xs font-bold bg-accent hover:opacity-90 text-accent-ink  flex items-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{loading ? 'Đang lưu...' : 'LƯU CẬP NHẬT KỲ THU NỢ'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
