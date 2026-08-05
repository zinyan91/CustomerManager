import React from 'react';
import { Receipt, X, Save } from 'lucide-react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtDate, getEffectiveActiveRate, formatMoneyInput } from '../../lib/utils';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className={`${containerCardBg} w-full max-w-xl rounded-2xl border shadow-2xl p-5 space-y-4`}>
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Receipt className="w-5 h-5 text-sky-500" />
            <h3 className="font-bold text-sm uppercase tracking-wide text-slate-900 dark:text-slate-100">
              GHI NHẬN THANH TOÁN & QUÁ HẠN — KỲ #{editingSchedule.PeriodNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/60 grid grid-cols-2 gap-3 text-xs">
          <div>Ngày đến hạn kỳ: <strong className="font-mono text-slate-900 dark:text-slate-100">{fmtDate(editingSchedule.DueDate)}</strong></div>
          <div>Gốc quy định: <strong className="font-mono text-sky-600 dark:text-sky-400">{editingSchedule.PrincipalAmount.toLocaleString('vi-VN')} VNĐ</strong></div>
          <div>Lãi quy định: <strong className="font-mono text-amber-600 dark:text-amber-400">{editingSchedule.InterestAmount.toLocaleString('vi-VN')} VNĐ</strong></div>
          <div>Tổng nghĩa vụ chuẩn: <strong className="font-mono text-emerald-600 dark:text-emerald-400">{(editingSchedule.PrincipalAmount + editingSchedule.InterestAmount).toLocaleString('vi-VN')} VNĐ</strong></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-sky-600 dark:text-sky-400 mb-1">
                Gốc đã đóng kỳ này (VNĐ)
              </label>
              <input
                type="text"
                value={modalActualPaidPrincipalStr}
                onChange={e => setModalActualPaidPrincipalStr(formatMoneyInput(e.target.value))}
                placeholder="0"
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-sky-600 dark:text-sky-400 bg-sky-50/50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mb-1">
                Lãi đã đóng kỳ này (VNĐ)
              </label>
              <input
                type="text"
                value={modalActualPaidInterestStr}
                onChange={e => setModalActualPaidInterestStr(formatMoneyInput(e.target.value))}
                placeholder="0"
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-amber-600 dark:text-amber-400 mb-1">
                Trả nợ gốc trước hạn kỳ này (VNĐ)
              </label>
              <input
                type="text"
                value={modalPrepaidPrincipalStr}
                onChange={e => setModalPrepaidPrincipalStr(formatMoneyInput(e.target.value))}
                placeholder="0"
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-amber-600 dark:text-amber-400 bg-amber-50/50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
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
                    const calcPen = computeSchedulePenalty(editingSchedule, rate, { overdueDays: days }).principalPenalty;
                    setModalOverdueInterestStr(calcPen.toLocaleString('vi-VN'));
                  } else {
                    setModalOverdueInterestStr('0');
                  }
                }}
                placeholder="0"
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-rose-600 dark:text-rose-400 mb-1">
                Lãi phạt quá hạn 150% (VNĐ)
              </label>
              <input
                type="text"
                value={modalOverdueInterestStr}
                onChange={e => setModalOverdueInterestStr(formatMoneyInput(e.target.value))}
                className="w-full p-2.5 rounded-xl border text-xs font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-50/50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">
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
                      const calcPen = computeSchedulePenalty(editingSchedule, rate, { overdueDays: calcDays }).principalPenalty;
                      setModalOverdueInterestStr(calcPen.toLocaleString('vi-VN'));
                    } else {
                      setModalOverdueInterestStr('0');
                    }
                  }
                }}
                className="w-full p-2.5 rounded-xl border text-xs bg-transparent border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={modalIsPaid}
              onChange={e => setModalIsPaid(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              Xác nhận Kỳ #{editingSchedule.PeriodNumber} đã thanh toán
            </span>
          </label>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-600/30 flex items-center space-x-1.5"
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
