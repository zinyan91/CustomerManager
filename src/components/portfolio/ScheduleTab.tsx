import React from 'react';
import { Calendar } from 'lucide-react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtDate, fmtMoney, fmtRate } from '../../lib/utils';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { paidPrincipalOf, computeSchedulePenalty } from '../../lib/loanMath';
import { formatSegmentsLabel, type RateSegment } from '../../lib/rateResolution';
import { DebtSummaryCard } from './DebtSummaryCard';

interface ScheduleTabProps {
  isLight: boolean;
  containerCardBg: string;
  tableHeaderStyle: string;
  tableRowHover: string;
  contracts: LoanContract[];
  selectedContract: LoanContract | null;
  handleSelectContract: (c: LoanContract) => void;
  schedules: RepaymentSchedule[];
  allSchedulesMap: Record<number, RepaymentSchedule[]>;
  periodRateSegments: Record<number, RateSegment[]>;
  openPaymentModal: (s: RepaymentSchedule) => void;
}

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  isLight, containerCardBg, tableHeaderStyle, tableRowHover,
  contracts, selectedContract, handleSelectContract,
  schedules, allSchedulesMap, periodRateSegments, openPaymentModal,
}) => {
  const getPenaltyForSchedule = (s: RepaymentSchedule) => {
    if (s.IsPaid) return s.OverdueInterestAmount || 0;
    return computeSchedulePenalty(
      s,
      getEffectiveActiveRate(selectedContract, s.DueDate)
    ).principalPenalty;
  };

  const totalPenaltySum = schedules.reduce((a, s) => a + getPenaltyForSchedule(s), 0);

  return (
    <div className="space-y-4">
      <div className={`${containerCardBg} rounded-2xl p-4 border`}>
        <div className="font-bold mb-3 flex items-center space-x-2 text-xs">
          <Calendar className="w-4 h-4 text-sky-500" />
          <span>CHỌN HỢP ĐỒNG TÍN DỤNG ĐỂ XEM / TẠO LỊCH THU NỢ</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-4">
          {contracts.map(c => (
            <button key={c.Id} onClick={() => handleSelectContract(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${selectedContract?.Id === c.Id
                ? 'bg-sky-600 text-white border-sky-500 shadow-sm'
                : isLight
                  ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:border-sky-700'
                }`}>
              {c.ContractNumber} ({fmtMoney(c.LoanAmount || c.ContractAmount)})
            </button>
          ))}
        </div>

        {selectedContract && (
          <div className={`flex flex-wrap items-center justify-between gap-3 pt-3 border-t ${isLight ? 'border-slate-200' : 'border-slate-800'}`}>
            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
              <span>Số tiền KUNN: <strong className="text-emerald-600 dark:text-emerald-400 font-mono">{fmtMoney(selectedContract.LoanAmount || selectedContract.ContractAmount)}</strong></span>
              <span>Lãi suất hiện hành: <strong className="text-rose-600 dark:text-rose-400 font-mono">{fmtRate(getEffectiveActiveRate(selectedContract))}</strong></span>
              <span>Thời hạn KUNN: <strong className="text-sky-600 dark:text-sky-400">{selectedContract.KunnTenor || `${selectedContract.LoanTenorMonths || 12} tháng`}</strong></span>
              <span>Phương thức gốc: <strong className="text-purple-600 dark:text-purple-400">{selectedContract.PrincipalRepaymentMethod || 'Gốc trả cuối kỳ'}</strong></span>
              <span>Ngày giải ngân: <strong className="text-amber-600 dark:text-amber-400 font-mono">{fmtDate(selectedContract.DisbursementDate || selectedContract.ContractStartDate)}</strong></span>
            </div>
          </div>
        )}
      </div>

      <div className={`${containerCardBg} rounded-2xl overflow-hidden border shadow-sm`}>
        <div className={`p-3 border-b flex items-center justify-between ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/40 border-slate-800'}`}>
          <span className="font-bold text-xs">
            LỊCH THU NỢ {selectedContract ? `— ${selectedContract.ContractNumber}` : ''} ({schedules.length} kỳ)
          </span>
          {schedules.length > 0 && (
            <div className="text-[11px] text-slate-500 flex items-center space-x-4">
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>Đã TT: {schedules.filter(s => s.IsPaid).length} kỳ</span>
              </span>
              <span className="flex items-center space-x-1">
                <span className="w-2 h-2 rounded-full bg-amber-500 inline-block"></span>
                <span>Chờ TT: {schedules.filter(s => !s.IsPaid).length} kỳ</span>
              </span>
            </div>
          )}
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className={`sticky top-0 ${tableHeaderStyle}`}>
              <tr>
                <th className="p-3 text-center whitespace-nowrap">KỲ</th>
                <th className="p-3 whitespace-nowrap">NGÀY ĐẾN HẠN</th>
                <th className="p-3 text-center whitespace-nowrap text-purple-600 dark:text-purple-400">LÃI SUẤT ÁP DỤNG</th>
                <th className="p-3 text-center whitespace-nowrap text-rose-500">SỐ NGÀY QUÁ HẠN</th>
                <th className="p-3 text-right whitespace-nowrap">GỐC PHẢI TRẢ</th>
                <th className="p-3 text-right whitespace-nowrap text-emerald-600 dark:text-emerald-400">GỐC ĐÃ TRẢ</th>
                <th className="p-3 text-right whitespace-nowrap">LÃI THƯỜNG</th>
                <th className="p-3 text-right whitespace-nowrap text-rose-500">LÃI PHẠT QUÁ HẠN</th>
                <th className="p-3 text-right whitespace-nowrap">TỔNG NGHĨA VỤ TRẢ</th>
                <th className="p-3 text-center whitespace-nowrap">TRẠNG THÁI</th>
                <th className="p-3 whitespace-nowrap">NGÀY TT</th>
                <th className="p-3 text-center whitespace-nowrap">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${isLight ? 'divide-slate-200' : 'divide-slate-800/50'}`}>
              {!selectedContract ? (
                <tr><td colSpan={12} className="text-center p-8 text-slate-400">Chọn một HĐTD để xem lịch thu nợ</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={12} className="text-center p-8 text-slate-400">
                  Chưa có lịch thu nợ. Nhấn "TẠO LỊCH THU NỢ TỰ ĐỘNG" để tính toán.
                </td></tr>
              ) : schedules.map(s => {
                let autoOverdue = 0;
                if (!s.IsPaid && s.DueDate) {
                  const parts = s.DueDate.split('-');
                  if (parts.length === 3) {
                    const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    due.setHours(0, 0, 0, 0);
                    const diff = today.getTime() - due.getTime();
                    if (diff > 0) autoOverdue = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  }
                }

                const effectiveOverdueDays = s.IsPaid
                  ? (s.OverdueDays || 0)
                  : ((s.OverdueDays && s.OverdueDays > 0) ? s.OverdueDays : autoOverdue);
                const penaltyAmount = s.OverdueInterestAmount ?? getPenaltyForSchedule(s);
                const isOverdue = effectiveOverdueDays > 0;
                const rowTotalAmount = (s.PrincipalAmount || 0) + (s.InterestAmount || 0) + penaltyAmount;
                const isPrepayRow = (s.PrepaidPrincipalAmount && s.PrepaidPrincipalAmount > 0) || s.Note?.includes('TRẢ TRƯỚC HẠN');

                const rateSegs = periodRateSegments[s.Id] || [];
                const activeRatePercentStr = rateSegs.length > 0
                  ? formatSegmentsLabel(rateSegs) + '/năm'
                  : (getEffectiveActiveRate(selectedContract, s.DueDate) * 100).toFixed(2) + '%/năm';
                const isForecastRate = rateSegs.some(x => x.forecast);
                const rateBreakdown = rateSegs.length > 1
                  ? rateSegs.map(x => `${x.days} ngày @ ${x.ratePercent.toFixed(2).replace('.', ',')}% (${x.label})`).join('  +  ')
                  : (rateSegs[0]?.label || '');

                return (
                  <tr key={s.Id} className={`transition-colors ${isPrepayRow
                    ? 'bg-amber-500/10 dark:bg-amber-500/20 font-semibold border-l-4 border-amber-500'
                    : s.IsPaid
                      ? 'bg-emerald-50/50 dark:bg-emerald-950/10'
                      : isOverdue
                        ? 'bg-rose-50/60 dark:bg-rose-950/30 font-semibold'
                        : tableRowHover
                    }`}>
                    <td className="p-3 text-center font-bold font-mono">#{s.PeriodNumber}</td>
                    <td className="p-3 font-mono font-bold">{fmtDate(s.DueDate)}</td>
                    <td className="p-3 text-center font-mono font-bold text-purple-600 dark:text-purple-400 bg-purple-50/30 dark:bg-purple-950/20 rounded-lg"
                      title={rateBreakdown || undefined}>
                      <div className={rateSegs.length > 1 ? 'whitespace-nowrap' : ''}>
                        {activeRatePercentStr}
                      </div>
                      {isForecastRate && (
                        <div className="text-[9px] font-sans font-normal text-slate-400 uppercase tracking-wide">dự phóng</div>
                      )}
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      {effectiveOverdueDays > 0 ? (
                        <span className="px-2 py-0.5 rounded-lg bg-rose-600 text-white text-[11px] font-extrabold shadow-sm">
                          {effectiveOverdueDays} ngày
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">—</span>
                      )}
                    </td>
                    <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono font-bold">
                      {(s.PrincipalAmount || 0).toLocaleString('vi-VN')}
                      {s.PrepaidPrincipalAmount ? (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400">
                          gồm trả trước hạn {s.PrepaidPrincipalAmount.toLocaleString('vi-VN')}
                        </div>
                      ) : null}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {(() => {
                        const phaiTra = s.PrincipalAmount || 0;
                        const daTra = paidPrincipalOf(s);
                        if (daTra === 0) {
                          return <span className="text-slate-400 font-normal">—</span>;
                        }
                        const thieu = phaiTra - daTra;
                        return (
                          <>
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {daTra.toLocaleString('vi-VN')}
                            </span>
                            {thieu > 0 && (
                              <div className="text-[10px] text-rose-600 dark:text-rose-400 font-normal">
                                còn thiếu {thieu.toLocaleString('vi-VN')}
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-mono font-bold">{(s.InterestAmount || 0).toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono font-bold">
                      {penaltyAmount > 0 ? penaltyAmount.toLocaleString('vi-VN') : '—'}
                    </td>
                    <td className="p-3 text-right font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm">{rowTotalAmount.toLocaleString('vi-VN')}</td>
                    <td className="p-3 text-center">
                      {s.IsPaid ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                          ✓ Đã TT {effectiveOverdueDays > 0 ? `(Trễ ${effectiveOverdueDays}d)` : ''}
                        </span>
                      ) : isOverdue ? (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-600 text-white border border-rose-500 animate-pulse">
                          🔴 Quá {effectiveOverdueDays}d
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                          🟡 Chờ TT
                        </span>
                      )}
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-600 dark:text-slate-300">{s.IsPaid ? fmtDate(s.PaymentDate) : '—'}</td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openPaymentModal(s);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center space-x-1 border ${s.IsPaid
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-500 shadow-sky-600/20'
                          }`}>
                        <span>⚙️ Ghi nhận TT / Sửa</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {schedules.length > 0 && (
              <tfoot className={`border-t sticky bottom-0 font-bold ${tableHeaderStyle}`}>
                <tr>
                  <td className="p-3 text-center" colSpan={4}>TỔNG CỘNG LỊCH THU NỢ</td>
                  <td className="p-3 text-right text-sky-600 dark:text-sky-400 font-mono">
                    {schedules.reduce((a, s) => a + (s.PrincipalAmount || 0), 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono">
                    {schedules.reduce((a, s) => a + paidPrincipalOf(s), 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right text-amber-600 dark:text-amber-400 font-mono">
                    {schedules.reduce((a, s) => a + (s.InterestAmount || 0), 0).toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right text-rose-600 dark:text-rose-400 font-mono">
                    {totalPenaltySum.toLocaleString('vi-VN')}
                  </td>
                  <td className="p-3 text-right text-emerald-600 dark:text-emerald-400 font-mono text-sm">
                    {(schedules.reduce((a, s) => a + (s.PrincipalAmount || 0) + (s.InterestAmount || 0), 0) + totalPenaltySum).toLocaleString('vi-VN')}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {selectedContract && (
          <DebtSummaryCard
            selectedContract={selectedContract}
            schedules={schedules}
            allSchedulesMap={allSchedulesMap}
          />
        )}
      </div>
    </div>
  );
};
