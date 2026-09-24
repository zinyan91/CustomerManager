import React, { type ElementType } from 'react';
import {
  Banknote, AlertTriangle, Building2, Calendar, ChevronDown, ChevronUp, Trash2, Clock, CheckCircle2, RotateCcw
} from 'lucide-react';
import { fmtDate, fmtMoney, fmtRate, todayIso } from '../../lib/utils';
import { collateralValue } from '../../lib/collateralMath';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { kunnPrincipal } from '../../lib/loanMath';
import {
  hdtdLifecycle, HDTD_LIFECYCLE_LABEL, canCloseCreditContract,
  type HdtdLifecycle, type CreditContractSummary,
} from '../../lib/creditContract';
import type { Collateral, CreditContract, LoanContract } from '../../types';

const LIFECYCLE_BADGE: Record<HdtdLifecycle, string> = {
  closed: 'bg-panel-muted border border-line text-ink-faint',
  expired: 'bg-neg-soft border border-neg/30 text-neg',
  not_yet_effective: 'bg-warn-soft border border-warn/30 text-warn',
  expiring_soon: 'bg-warn-soft border border-warn/30 text-warn',
  active: 'bg-pos-soft border border-pos/30 text-pos',
};

const LIFECYCLE_ICON: Record<HdtdLifecycle, ElementType | null> = {
  closed: null,
  expired: AlertTriangle,
  not_yet_effective: Clock,
  expiring_soon: Clock,
  active: null,
};

interface KunnAccordionItemProps {
  contractSummary: CreditContractSummary;
  collaterals: Collateral[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  getKunnsForContract: (cc: CreditContract) => LoanContract[];
  outstandingOf: (k: LoanContract) => number;
  onDisburse: (cc: CreditContract) => void;
  onEdit: (cc: CreditContract) => void;
  onDelete: (cc: CreditContract) => void;
  onToggleClose?: (cc: CreditContract) => void;
  mortgageNumbers?: string[];
  today?: string;
}

export const KunnAccordionItem: React.FC<KunnAccordionItemProps> = ({
  contractSummary,
  collaterals,
  isExpanded,
  onToggleExpand,
  getKunnsForContract,
  outstandingOf,
  onDisburse,
  onEdit,
  onDelete,
  onToggleClose,
  mortgageNumbers = [],
  today,
}) => {
  const {
    contract: cc, outstanding, available, kunnCount, activeKunnCount,
    canDisburse, blockReason, revolving: isRevolving, disbursedCumulative: totalDisbursed,
  } = contractSummary;

  const assignedCols = collaterals.filter(c =>
    (cc.CollateralIds || '').split(',').map(x => parseInt(x.trim(), 10)).includes(c.Id)
  );
  const contractKunns = getKunnsForContract(cc);

  const granted = cc.ContractAmount || 0;

  const lifecycle = hdtdLifecycle(cc, today || todayIso());
  const LifecycleIcon = LIFECYCLE_ICON[lifecycle];

  const canDelete = kunnCount === 0;
  const canCloseCheck = canCloseCreditContract(cc, contractKunns);

  const utilPercent = granted > 0
    ? isRevolving
      ? Math.min(100, (outstanding / granted) * 100)
      : (available <= 0 || totalDisbursed >= granted ? 100 : Math.min(100, (totalDisbursed / granted) * 100))
    : 0;

  return (
    <div
      className={`rounded-2xl border transition-all duration-150 overflow-hidden specular-card ${
        cc.IsClosed
          ? 'bg-panel/50 border-line/60 opacity-75'
          : 'bg-panel/85 backdrop-blur-xl border-line/70 hover:border-accent/40 shadow-xs'
      }`}
    >
      {/* Top Row: Info & Action Buttons */}
      <div className="p-4 sm:p-5 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1.5 min-w-[240px]">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-mono font-bold text-sm sm:text-base text-accent tracking-tight">
                {cc.HdtdNumber}
              </span>
              <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-2xs ${LIFECYCLE_BADGE[lifecycle]}`}>
                {LifecycleIcon && <LifecycleIcon className="w-3 h-3" />}
                {HDTD_LIFECYCLE_LABEL[lifecycle]}
              </span>
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold bg-surface border border-line/70 text-ink-muted">
                {cc.LoanMethod || 'HĐTD'}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink-faint">
              {cc.ApprovalCode && (
                <span className="font-mono">
                  Tờ trình: <strong className="text-accent">{cc.ApprovalCode}</strong>
                  {cc.ApprovalAmount && ` (${fmtMoney(cc.ApprovalAmount)})`}
                </span>
              )}
              {(cc.ContractStartDate || cc.ContractEndDate) && (
                <span className="flex items-center gap-1 font-mono text-ink-muted">
                  <Calendar className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span>
                    {cc.ContractStartDate ? fmtDate(cc.ContractStartDate) : '—'} → {cc.ContractEndDate ? fmtDate(cc.ContractEndDate) : '—'}
                  </span>
                  {cc.LoanTenorMonths && (
                    <span className="text-[10px] text-ink-faint">({cc.LoanTenorMonths} tháng)</span>
                  )}
                </span>
              )}
              {cc.LoanPurpose && (
                <span className="text-ink-faint">
                  Mục đích: <strong className="text-ink font-medium">{cc.LoanPurpose}</strong>
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            <button
              type="button"
              disabled={!canDisburse}
              onClick={() => onDisburse(cc)}
              className={`font-bold text-xs py-1.5 px-3 rounded-xl flex items-center space-x-1.5 transition-all shadow-xs ${
                canDisburse
                  ? 'bg-accent text-accent-ink hover:opacity-90 cursor-pointer'
                  : 'bg-panel-muted border border-line text-ink-faint cursor-not-allowed opacity-60'
              }`}
              title={blockReason || 'Giải ngân KUNN mới từ HĐTD này'}
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>
                {lifecycle === 'closed'
                  ? 'Đã đóng'
                  : lifecycle === 'expired'
                  ? 'Hết hiệu lực'
                  : lifecycle === 'not_yet_effective'
                  ? 'Chưa hiệu lực'
                  : available <= 0
                  ? 'Hết khả dụng'
                  : 'Giải ngân từ HĐTD'}
              </span>
            </button>

            {onToggleClose && (
              <button
                type="button"
                onClick={() => onToggleClose(cc)}
                className={`font-semibold text-xs py-1.5 px-3 rounded-xl border transition-colors flex items-center space-x-1.5 shadow-2xs ${
                  cc.IsClosed
                    ? 'border-line/70 bg-surface/80 hover:bg-surface text-ink hover:border-accent cursor-pointer'
                    : canCloseCheck.allowed
                    ? 'border-line/70 bg-surface/80 hover:bg-surface text-ink hover:border-accent cursor-pointer'
                    : 'border-line bg-panel-muted/50 text-ink-faint cursor-not-allowed opacity-70'
                }`}
                title={
                  cc.IsClosed
                    ? 'Mở lại hiệu lực Hợp đồng tín dụng'
                    : canCloseCheck.allowed
                    ? 'Tất toán và đóng Hợp đồng tín dụng'
                    : `Không thể tất toán: Còn ${canCloseCheck.unsettledKunnNumbers.length} KUNN chưa tất toán (${canCloseCheck.unsettledKunnNumbers.join(', ')})`
                }
              >
                {cc.IsClosed ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 text-accent" />
                    <span>Mở lại HĐTD</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className={`w-3.5 h-3.5 ${canCloseCheck.allowed ? 'text-accent' : 'text-ink-faint'}`} />
                    <span>Tất toán HĐTD</span>
                  </>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={() => onEdit(cc)}
              className="border border-line/70 bg-surface/80 hover:bg-surface text-ink hover:border-accent font-semibold text-xs py-1.5 px-3 rounded-xl transition-colors cursor-pointer shadow-2xs"
            >
              Sửa
            </button>
            <button
              type="button"
              disabled={!canDelete}
              onClick={() => onDelete(cc)}
              className={`p-1.5 rounded-xl border transition-colors ${
                canDelete
                  ? 'border-line/70 bg-surface/80 text-ink-faint hover:text-neg hover:border-neg cursor-pointer shadow-2xs'
                  : 'border-line bg-panel-muted/50 text-ink-faint/40 cursor-not-allowed'
              }`}
              title={
                canDelete
                  ? 'Xóa HĐTD'
                  : `Không thể xóa: Có ${kunnCount} KUNN liên kết (Ràng buộc Postgres RESTRICT)`
              }
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Financial Metrics & Visual Utilization Progress Bar */}
        <div className="space-y-2.5 pt-3 border-t border-line/60">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-2.5 rounded-xl bg-surface/60 border border-line/60">
              <div className="text-[10px] text-ink-faint font-bold uppercase tracking-wider">Hạn mức cấp</div>
              <div className="font-mono font-bold text-accent text-sm">{fmtMoney(cc.ContractAmount || 0)}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface/60 border border-line/60">
              <div className="text-[10px] text-ink-faint font-bold uppercase tracking-wider">Dư nợ hiện tại</div>
              <div className="font-mono font-bold text-warn text-sm">{fmtMoney(outstanding)}</div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface/60 border border-line/60">
              <div className="text-[10px] text-ink-faint font-bold uppercase tracking-wider">Khả dụng giải ngân</div>
              <div className={`font-mono font-bold text-sm ${available > 0 ? 'text-pos' : 'text-ink-faint'}`}>
                {fmtMoney(available)}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-surface/60 border border-line/60">
              <div className="text-[10px] text-ink-faint font-bold uppercase tracking-wider">Quy mô KUNN</div>
              <div className="font-bold text-ink text-sm">{activeKunnCount} mở / {kunnCount} tổng</div>
            </div>
          </div>

          {/* Visual Headroom Progress Bar */}
          <div className="space-y-1.5 p-2.5 rounded-xl bg-surface/40 border border-line/60">
            <div className="w-full bg-panel-muted rounded-full h-2 overflow-hidden flex border border-line/60">
              <div
                className={`h-full transition-all duration-300 ${
                  utilPercent >= 100 || available <= 0
                    ? 'bg-neg shadow-xs shadow-neg/50'
                    : utilPercent > 80
                    ? 'bg-warn shadow-xs shadow-warn/50'
                    : 'bg-pos shadow-xs shadow-pos/50'
                }`}
                style={{ width: `${utilPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-ink-faint font-medium">
              <span>
                {isRevolving
                  ? `Hạn mức quay vòng: Đã sử dụng ${utilPercent.toFixed(1)}%`
                  : `Cho vay từng lần: Đã giải ngân ${fmtMoney(totalDisbursed)} / ${fmtMoney(granted)}`}
              </span>
              <span className={available > 0 ? 'text-pos font-bold' : 'text-neg font-bold'}>
                {available > 0 ? `Còn trống ${fmtMoney(available)}` : 'Hết hạn mức giải ngân (0 VNĐ)'}
              </span>
            </div>
          </div>
        </div>

        {/* Collateral Tag Badges */}
        {assignedCols.length > 0 && (
          <div className="pt-2.5 border-t border-line/60 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
            <span className="flex items-center gap-1 font-bold text-ink-faint text-xs shrink-0">
              <Building2 className="w-3.5 h-3.5 text-accent" />
              TSBĐ thế chấp ({assignedCols.length}):
            </span>
            {assignedCols.map(c => (
              <span
                key={c.Id}
                className="px-2.5 py-1 rounded-lg bg-surface border border-line/70 text-ink font-mono text-[10px] flex items-center gap-1.5 shadow-2xs"
              >
                <strong className="text-accent">{c.AssetCode || c.AssetType || 'TSBĐ'}</strong>
                <span className="text-ink-faint">({fmtMoney(collateralValue(c))})</span>
              </span>
            ))}
          </div>
        )}

        {mortgageNumbers.length > 0 && (
          <div className="pt-2 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
            <span className="font-bold text-ink-faint text-xs">HĐTC:</span>
            <span className="font-mono text-ink">{mortgageNumbers.join(', ')}</span>
          </div>
        )}
      </div>

      {/* Accordion Toggle Footer */}
      <div className="border-t border-line/60 bg-surface/50 px-4 sm:px-5 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-xs font-bold text-accent hover:underline flex items-center gap-1.5 cursor-pointer"
        >
          {isExpanded ? (
            <><span>Thu gọn danh sách KUNN</span><ChevronUp className="w-4 h-4" /></>
          ) : (
            <><span>Xem chi tiết {contractKunns.length} Khế ước nhận nợ (KUNN)</span><ChevronDown className="w-4 h-4" /></>
          )}
        </button>

        <span className="text-xs font-mono text-ink-faint font-semibold">
          {contractKunns.filter(k => !k.IsSettled).length} KUNN đang lưu nợ
        </span>
      </div>

      {/* Expanded KUNN Table */}
      {isExpanded && (
        <div className="p-3 sm:p-4 bg-surface/30 border-t border-line/60 animate-in fade-in-50 duration-150">
          {contractKunns.length === 0 ? (
            <div className="text-center py-6 text-ink-faint text-xs italic">
              Chưa có KUNN nào được giải ngân dưới HĐTD này.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line/70 bg-panel/60 backdrop-blur-md">
              <table className="w-full text-xs border-collapse min-w-[750px] font-app">
                <thead className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-line/80 text-[10px] uppercase font-bold tracking-[0.09em] text-ink-faint">
                  <tr>
                    <th className="px-4 py-3 text-left font-bold whitespace-nowrap">SỐ KUNN</th>
                    <th className="px-4 py-3 text-right font-bold whitespace-nowrap">SỐ TIỀN VAY</th>
                    <th className="px-4 py-3 text-right font-bold whitespace-nowrap">DƯ NỢ HIỆN TẠI</th>
                    <th className="px-4 py-3 text-center font-bold whitespace-nowrap">LÃI SUẤT</th>
                    <th className="px-4 py-3 text-left font-bold whitespace-nowrap">NGÀY VAY → ĐÁO HẠN</th>
                    <th className="px-4 py-3 text-center font-bold whitespace-nowrap">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {contractKunns.map(k => {
                    const kunnBalance = outstandingOf(k);
                    return (
                      <tr key={k.Id} className="hover:bg-accent/[0.04] transition-colors border-b border-line/30">
                        <td className="px-4 py-3 font-mono font-bold text-accent whitespace-nowrap">
                          {k.ContractNumber}
                        </td>
                        <td className="px-4 py-3 font-mono font-semibold text-right text-ink whitespace-nowrap">
                          {fmtMoney(kunnPrincipal(k))}
                        </td>
                        <td className="px-4 py-3 font-mono font-bold text-right text-warn whitespace-nowrap">
                          {fmtMoney(kunnBalance)}
                        </td>
                        <td className="px-4 py-3 font-mono text-center text-accent font-semibold whitespace-nowrap">
                          {fmtRate(getEffectiveActiveRate(k))}
                        </td>
                        <td className="px-4 py-3 font-mono text-ink-muted text-xs whitespace-nowrap">
                          {k.DisbursementDate ? fmtDate(k.DisbursementDate) : (k.ContractStartDate ? fmtDate(k.ContractStartDate) : '—')} → {k.KunnDueDate ? fmtDate(k.KunnDueDate) : (k.ContractEndDate ? fmtDate(k.ContractEndDate) : '—')}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold ${
                            k.IsSettled
                              ? 'bg-panel-muted text-ink-faint border border-line'
                              : 'bg-pos-soft text-pos border border-pos/30'
                          }`}>
                            {k.IsSettled ? 'ĐÃ TẤT TOÁN' : 'ĐANG VAY'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
