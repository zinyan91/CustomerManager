import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import type { LoanContract } from '../../types';
import { fmtDate, fmtMoney, fmtNumber } from '../../lib/utils';
import type { EarlySettlementQuote } from '../../lib/loanSettlement';
import { DateInput } from '../DateInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';

interface EarlySettlementModalProps {
  isOpen: boolean;
  selectedContract: LoanContract;
  settlementDate: string;
  setSettlementDate: (v: string) => void;
  penaltyRateStr: string;
  setPenaltyRateStr: (v: string) => void;
  quote: EarlySettlementQuote | null;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const PENALTY_PRESETS = ['0', '0.5', '1', '1.5', '2'];

export const EarlySettlementModal: React.FC<EarlySettlementModalProps> = ({
  isOpen,
  selectedContract,
  settlementDate,
  setSettlementDate,
  penaltyRateStr,
  setPenaltyRateStr,
  quote,
  isSubmitting,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  const canSubmit = Boolean(quote?.canSettle && !isSubmitting);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="lg" className="p-0 overflow-hidden max-h-[90vh] flex flex-col font-app">
        {/* Header */}
        <DialogHeader className="p-4 sm:p-5 bg-surface/50 border-b border-line flex-row items-center justify-between space-y-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-accent-soft text-accent shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-bold text-sm tracking-wide text-ink uppercase">
                Tất toán khoản vay trước hạn · {selectedContract.ContractNumber}
              </DialogTitle>
              <div className="text-[11px] text-ink-faint">
                Chốt nghĩa vụ tài chính thực tế và cắt bỏ toàn bộ các kỳ thu nợ tương lai
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Body Content */}
        <div className="p-4 sm:p-5 space-y-4 text-xs overflow-y-auto custom-scrollbar flex-1">
          {/* Thông tin thiết lập: Ngày tất toán & Tỷ lệ phí phạt */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 bg-surface/50 rounded-xl border border-line">
            <div>
              <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                Ngày tất toán thực tế
              </label>
              <DateInput
                value={settlementDate}
                onChange={setSettlementDate}
                className="w-full h-9 rounded-lg border border-line bg-panel text-ink text-xs px-3 font-mono font-semibold"
              />
              <div className="text-[10px] text-ink-faint mt-1">
                Mốc tính lãi kỳ: <span className="font-mono font-semibold text-ink">{quote ? fmtDate(quote.basisStartDate) : '–'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-ink-muted uppercase tracking-wider mb-1">
                Phí trả trước hạn (%)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={penaltyRateStr}
                  onChange={(e) => setPenaltyRateStr(e.target.value)}
                  placeholder="0"
                  className="w-24 h-9 rounded-lg border border-line bg-panel text-ink text-xs px-3 font-mono font-semibold"
                />
                <div className="flex items-center gap-1">
                  {PENALTY_PRESETS.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPenaltyRateStr(p)}
                      className={`px-2 py-1.5 rounded text-[10px] font-mono font-semibold border transition-colors ${
                        penaltyRateStr === p
                          ? 'bg-accent text-accent-ink border-accent'
                          : 'bg-surface text-ink-muted border-line hover:border-line-strong'
                      }`}
                    >
                      {p}%
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-[10px] text-ink-faint mt-1">
                Tính trên dư nợ gốc tất toán trước hạn
              </div>
            </div>
          </div>

          {/* Cảnh báo nếu không thể tất toán */}
          {quote && !quote.canSettle && (
            <div className="p-3 rounded-xl bg-neg-soft border border-neg/30 text-neg flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="text-xs font-medium">
                {quote.blockReason || 'Khoản vay không đủ điều kiện để thực hiện tất toán.'}
              </div>
            </div>
          )}

          {/* Bảng kê nghĩa vụ tất toán chuẩn mực (AGENTS.md Grayscale/Slate) */}
          {quote && quote.canSettle && (
            <div className="rounded-xl border border-line overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-panel-muted border-b border-line text-[10px] uppercase font-bold tracking-wider text-ink-faint">
                  <tr>
                    <th className="px-3.5 py-2.5 w-12 text-center">STT</th>
                    <th className="px-3.5 py-2.5">Khoản mục thu nợ</th>
                    <th className="px-3.5 py-2.5">Cơ sở tính toán</th>
                    <th className="px-3.5 py-2.5 text-right whitespace-nowrap">Số tiền (VNĐ)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  <tr>
                    <td className="px-3.5 py-2.5 text-center font-mono text-ink-faint">1</td>
                    <td className="px-3.5 py-2.5 font-semibold text-ink">Dư nợ gốc còn lại</td>
                    <td className="px-3.5 py-2.5 text-ink-muted font-mono text-[11px]">
                      Tổng nhận nợ trừ các kỳ đã thu
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-ink">
                      {fmtMoney(quote.remainingPrincipal)}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-3.5 py-2.5 text-center font-mono text-ink-faint">2</td>
                    <td className="px-3.5 py-2.5 font-semibold text-ink">Tiền lãi dồn tích đến ngày tất toán</td>
                    <td className="px-3.5 py-2.5 text-ink-muted text-[11px]">
                      <span className="font-mono font-semibold text-ink">{quote.accruedDays}</span> ngày
                      ({fmtDate(quote.basisStartDate)} → {fmtDate(quote.settlementDate)}) · Lãi suất{' '}
                      <span className="font-mono font-semibold text-accent">{quote.effectiveRatePercent.toFixed(2)}%/năm</span>
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-ink">
                      {fmtMoney(quote.accruedInterest)}
                    </td>
                  </tr>

                  <tr>
                    <td className="px-3.5 py-2.5 text-center font-mono text-ink-faint">3</td>
                    <td className="px-3.5 py-2.5 font-semibold text-ink">Phí phạt trả nợ trước hạn</td>
                    <td className="px-3.5 py-2.5 text-ink-muted text-[11px]">
                      Tỷ lệ <span className="font-mono font-semibold text-ink">{quote.penaltyRatePercent}%</span> tính trên{' '}
                      {fmtNumber(quote.remainingPrincipal)} đ gốc
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-ink">
                      {fmtMoney(quote.penaltyFee)}
                    </td>
                  </tr>
                </tbody>
                {/* Dòng TỔNG CỘNG: Hàng cuối cùng theo AGENTS.md */}
                <tfoot className="bg-panel-muted border-t-2 border-line">
                  <tr className="font-bold">
                    <td colSpan={3} className="px-3.5 py-2.5 text-right text-ink font-bold uppercase tracking-wider">
                      TỔNG CỘNG NGHĨA VỤ PHẢI THU
                    </td>
                    <td className="px-3.5 py-2.5 text-right font-mono font-bold text-ink text-sm">
                      {fmtMoney(quote.totalSettlementAmount)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

          {/* Hộp giải thích quy trình cắt lịch theo Core Banking */}
          {quote && quote.canSettle && (
            <div className="p-3 rounded-xl bg-panel-muted border border-line text-ink-muted space-y-1.5 text-[11px]">
              <div className="font-bold text-ink uppercase tracking-wider text-[10px]">
                Quy chuẩn xử lý lịch thu nợ (Core Banking):
              </div>
              <ul className="list-disc list-inside space-y-0.5 text-ink-faint">
                <li>
                  Chốt Kỳ thu nợ #{quote.settlingPeriodNumber} thành kỳ tất toán với ngày đến hạn là{' '}
                  <span className="font-mono font-semibold text-ink">{fmtDate(quote.settlementDate)}</span>.
                </li>
                {quote.futureScheduleIds.length > 0 ? (
                  <li>
                    Xóa bỏ vĩnh viễn <span className="font-mono font-bold text-ink">{quote.futureScheduleIds.length}</span> kỳ thu nợ
                    tương lai còn lại (từ Kỳ #{quote.settlingPeriodNumber + 1} trở đi).
                  </li>
                ) : (
                  <li>Khoản vay không có kỳ thu nợ tương lai phát sinh thêm.</li>
                )}
                <li>
                  Cập nhật hợp đồng: Dư nợ về 0 VNĐ, đóng trạng thái <strong className="text-pos">ĐÃ TẤT TOÁN</strong>, đưa về Nhóm 1.
                </li>
              </ul>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-line bg-surface/40 flex items-center justify-between">
          <div className="text-[11px] text-ink-faint">
            Vui lòng kiểm tra kỹ số tiền trước khi xác nhận. Thao tác không thể hoàn tác.
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button
              variant="primary"
              size="sm"
              loading={isSubmitting}
              onClick={onConfirm}
              disabled={!canSubmit}
              leftIcon={<CheckCircle2 className="w-4 h-4" />}
            >
              {isSubmitting ? 'Đang tất toán...' : 'XÁC NHẬN TẤT TOÁN KHOẢN VAY'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
