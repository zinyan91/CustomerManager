import React from 'react';
import {
  Banknote, AlertTriangle, Building2, Calendar, ChevronDown, ChevronUp, Trash2, Clock
} from 'lucide-react';
import { fmtDate, fmtMoney, fmtRate, todayIso } from '../../lib/utils';
import { collateralValue } from '../../lib/collateralMath';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { isRevolvingCredit } from '../../lib/loanProductRules';
import type { Collateral, CreditContract, LoanContract } from '../../types';

interface KunnAccordionItemProps {
  contractSummary: {
    contract: CreditContract;
    outstanding: number;
    available: number;
    kunnCount: number;
    activeKunnCount: number;
  };
  collaterals: Collateral[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  getKunnsForContract: (cc: CreditContract) => LoanContract[];
  outstandingOf: (k: LoanContract) => number;
  onDisburse: (cc: CreditContract) => void;
  onEdit: (cc: CreditContract) => void;
  onDelete: (cc: CreditContract) => void;
}

export const KunnAccordionItem: React.FC<KunnAccordionItemProps> = ({
  contractSummary: { contract: cc, outstanding, available, kunnCount, activeKunnCount },
  collaterals,
  isExpanded,
  onToggleExpand,
  getKunnsForContract,
  outstandingOf,
  onDisburse,
  onEdit,
  onDelete,
}) => {
  const today = todayIso();
  const assignedCols = collaterals.filter(c =>
    (cc.CollateralIds || '').split(',').map(x => parseInt(x.trim(), 10)).includes(c.Id)
  );
  const contractKunns = getKunnsForContract(cc);

  const granted = cc.ContractAmount || 0;
  const isRevolving = isRevolvingCredit(cc.LoanMethod);
  const totalDisbursed = contractKunns.reduce((s, k) => s + (k.LoanAmount || k.ContractAmount || 0), 0);

  const isExpired = !!(cc.ContractEndDate && cc.ContractEndDate < today);
  const isExpiringSoon = !isExpired && !!(cc.ContractEndDate && (
    (new Date(cc.ContractEndDate).getTime() - new Date(today).getTime()) / (1000 * 3600 * 24) <= 30
  ));

  const canDisburse = !cc.IsClosed && !isExpired && available > 0;
  const canDelete = kunnCount === 0;

  // Progress bar utilization percent
  const utilPercent = granted > 0
    ? isRevolving
      ? Math.min(100, (outstanding / granted) * 100)
      : (available <= 0 || totalDisbursed >= granted ? 100 : Math.min(100, (totalDisbursed / granted) * 100))
    : 0;

  return (
    <div
      className={`rounded-xl border transition-all duration-150 overflow-hidden ${
        cc.IsClosed
          ? 'bg-panel-muted/30 border-line opacity-75'
          : 'bg-panel border-line hover:border-accent/40 shadow-xs'
      }`}
    >
      {/* Top Row: Info & Action Buttons */}
      <div className="p-4 space-y-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1 min-w-[240px]">
            <div className="flex items-center flex-wrap gap-2">
              <span className="font-mono font-bold text-sm text-accent tracking-tight">
                {cc.HdtdNumber}
              </span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                cc.IsClosed
                  ? 'bg-panel-muted border border-line text-ink-faint'
                  : 'bg-pos-soft border border-pos/30 text-pos'
              }`}>
                {cc.IsClosed ? 'ĐÃ ĐÓNG' : 'ĐANG HIỆU LỰC'}
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-panel-muted border border-line text-ink-muted">
                {cc.LoanMethod || 'HĐTD'}
              </span>
              {isExpired && !cc.IsClosed && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neg-soft text-neg border border-neg/30 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" /> HẾT HẠN HIỆU LỰC
                </span>
              )}
              {isExpiringSoon && !cc.IsClosed && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-warn-soft text-warn border border-warn/30 flex items-center gap-1">
                  <Clock className="w-3 h-3" /> SẮP HẾT HẠN
                </span>
              )}
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
              className={`font-bold text-xs py-1.5 px-3 rounded-lg flex items-center space-x-1.5 transition-all shadow-xs ${
                canDisburse
                  ? 'bg-accent text-accent-ink hover:opacity-90'
                  : 'bg-panel-muted border border-line text-ink-faint cursor-not-allowed opacity-60'
              }`}
              title={
                cc.IsClosed
                  ? 'HĐTD đã đóng tất toán'
                  : isExpired
                  ? 'HĐTD đã hết hạn hiệu lực'
                  : available <= 0
                  ? (isRevolving ? 'Dư nợ đã đạt tối đa hạn mức' : 'Cho vay từng lần: Đã giải ngân đủ hạn mức')
                  : 'Giải ngân KUNN mới từ HĐTD này'
              }
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>{available <= 0 ? 'Hết khả dụng' : isExpired ? 'Hết hạn HĐTD' : 'Giải ngân từ HĐTD'}</span>
            </button>

            <button
              type="button"
              onClick={() => onEdit(cc)}
              className="border border-line bg-panel text-ink hover:border-accent font-semibold text-xs py-1.5 px-3 rounded-lg transition-colors"
            >
              Sửa
            </button>
            <button
              type="button"
              disabled={!canDelete}
              onClick={() => onDelete(cc)}
              className={`p-1.5 rounded-lg border transition-colors ${
                canDelete
                  ? 'border-line bg-panel text-ink-faint hover:text-neg hover:border-neg'
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
        <div className="space-y-2 pt-2 border-t border-line">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-ink-faint font-semibold uppercase">Hạn mức cấp</div>
              <div className="font-mono font-bold text-ink">{fmtMoney(cc.ContractAmount || 0)}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-faint font-semibold uppercase">Dư nợ hiện tại</div>
              <div className="font-mono font-bold text-warn">{fmtMoney(outstanding)}</div>
            </div>
            <div>
              <div className="text-[10px] text-ink-faint font-semibold uppercase">Khả dụng giải ngân</div>
              <div className={`font-mono font-bold ${available > 0 ? 'text-pos' : 'text-ink-faint'}`}>
                {fmtMoney(available)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-ink-faint font-semibold uppercase">Quy mô KUNN</div>
              <div className="font-semibold text-ink">{activeKunnCount} mở / {kunnCount} tổng KUNN</div>
            </div>
          </div>

          {/* Visual Headroom Progress Bar */}
          <div className="space-y-1">
            <div className="w-full bg-panel-muted rounded-full h-2 overflow-hidden flex border border-line">
              <div
                className={`h-full transition-all duration-300 ${
                  utilPercent >= 100 || available <= 0
                    ? 'bg-neg'
                    : utilPercent > 80
                    ? 'bg-warn'
                    : 'bg-pos'
                }`}
                style={{ width: `${utilPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-ink-faint">
              <span>
                {isRevolving
                  ? `Hạn mức quay vòng: Đã sử dụng ${utilPercent.toFixed(1)}%`
                  : `Cho vay từng lần: Đã giải ngân ${fmtMoney(totalDisbursed)} / ${fmtMoney(granted)}`}
              </span>
              <span>
                {available > 0 ? `Còn trống ${fmtMoney(available)}` : 'Hết hạn mức giải ngân (0 VNĐ)'}
              </span>
            </div>
          </div>
        </div>

        {/* Collateral Tag Badges */}
        {assignedCols.length > 0 && (
          <div className="pt-2 border-t border-line/60 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted">
            <span className="flex items-center gap-1 font-semibold text-ink-faint shrink-0">
              <Building2 className="w-3.5 h-3.5 text-accent" />
              TSBĐ thế chấp ({assignedCols.length}):
            </span>
            {assignedCols.map(c => (
              <span
                key={c.Id}
                className="px-2 py-0.5 rounded-md bg-panel-muted border border-line text-ink font-mono text-[10px] flex items-center gap-1.5"
              >
                <strong>{c.AssetCode || c.AssetType || 'TSBĐ'}</strong>
                <span className="text-ink-faint">({fmtMoney(collateralValue(c))})</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Accordion Toggle Footer */}
      <div className="border-t border-line bg-panel-muted/40 px-4 py-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onToggleExpand}
          className="text-[11px] font-bold text-accent hover:underline flex items-center gap-1.5"
        >
          {isExpanded ? (
            <><span>Thu gọn danh sách KUNN</span><ChevronUp className="w-3.5 h-3.5" /></>
          ) : (
            <><span>Xem chi tiết {contractKunns.length} Khế ước nhận nợ (KUNN)</span><ChevronDown className="w-3.5 h-3.5" /></>
          )}
        </button>

        <span className="text-[10px] text-ink-faint">
          {contractKunns.filter(k => !k.IsSettled).length} KUNN đang lưu nợ
        </span>
      </div>

      {/* Expanded KUNN Table */}
      {isExpanded && (
        <div className="p-3 bg-panel-muted/20 border-t border-line animate-in fade-in-50 duration-150">
          {contractKunns.length === 0 ? (
            <div className="text-center py-3 text-ink-faint text-xs">
              Chưa có KUNN nào được giải ngân dưới HĐTD này.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="text-ink-faint uppercase border-b border-line text-left">
                    <th className="pb-1.5 font-bold">Số KUNN</th>
                    <th className="pb-1.5 font-bold text-right">Số tiền vay</th>
                    <th className="pb-1.5 font-bold text-right">Dư nợ hiện tại</th>
                    <th className="pb-1.5 font-bold text-center">Lãi suất</th>
                    <th className="pb-1.5 font-bold">Ngày vay → Đáo hạn</th>
                    <th className="pb-1.5 font-bold text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/60">
                  {contractKunns.map(k => {
                    const kunnBalance = outstandingOf(k);
                    return (
                      <tr key={k.Id} className="hover:bg-panel-muted/60 transition-colors">
                        <td className="py-2 font-mono font-bold text-accent">
                          {k.ContractNumber}
                        </td>
                        <td className="py-2 font-mono font-semibold text-right text-ink">
                          {fmtMoney(k.LoanAmount || k.ContractAmount || 0)}
                        </td>
                        <td className="py-2 font-mono font-bold text-right text-warn">
                          {fmtMoney(kunnBalance)}
                        </td>
                        <td className="py-2 font-mono text-center text-accent font-semibold">
                          {fmtRate(getEffectiveActiveRate(k))}
                        </td>
                        <td className="py-2 font-mono text-ink-faint">
                          {k.DisbursementDate ? fmtDate(k.DisbursementDate) : (k.ContractStartDate ? fmtDate(k.ContractStartDate) : '—')} → {k.KunnDueDate ? fmtDate(k.KunnDueDate) : (k.ContractEndDate ? fmtDate(k.ContractEndDate) : '—')}
                        </td>
                        <td className="py-2 text-center">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
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
