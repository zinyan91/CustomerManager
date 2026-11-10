import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import type { SettlementLine, SettlementTotals } from '../../lib/multiSettlement';
import type { SettlementDraft } from '../../hooks/useMultiSettlement';
import { fmtDate, fmtNumber, todayIso } from '../../lib/utils';
import { DateInput } from '../DateInput';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Button } from '../ui/Button';

interface MultiSettlementModalProps {
  isOpen: boolean;
  lines: SettlementLine[];
  drafts: Record<number, SettlementDraft>;
  totals: SettlementTotals;
  failures: Record<number, string>;
  isSubmitting: boolean;
  onChangeDraft: (contractId: number, patch: Partial<SettlementDraft>) => void;
  onSelectAll: (selected: boolean) => void;
  onApplyDateToSelected: (settlementDate: string) => void;
  onClose: () => void;
  onConfirm: () => void;
}

const money = (v: number | undefined) => (v === undefined ? '—' : fmtNumber(v));
const percentText = (v: number) => `${String(v).replace('.', ',')}%`;

export function MultiSettlementModal({
  isOpen, lines, drafts, totals, failures, isSubmitting, onChangeDraft, onSelectAll, onApplyDateToSelected, onClose, onConfirm,
}: MultiSettlementModalProps) {
  const [commonDate, setCommonDate] = useState(() => todayIso());
  if (!isOpen) return null;
  const selectedCount = lines.filter(l => drafts[l.contract.Id]?.selected).length;
  const allSelected = selectedCount === lines.length;

  return (
    <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
      <DialogContent size="full" className="p-0 overflow-hidden max-h-[92vh] flex flex-col font-app">
        <DialogHeader className="p-4 sm:p-5 bg-surface/50 border-b border-line flex-row items-center gap-2.5 space-y-0">
          <div className="p-2 rounded-xl bg-accent-soft text-accent shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <DialogTitle className="font-bold text-sm text-ink">Tất toán khoản vay</DialogTitle>
        </DialogHeader>

        <div className="px-4 sm:px-5 pt-4 flex flex-wrap items-end gap-2">
          <div>
            <label className="block text-[11px] font-semibold text-ink-muted mb-1" htmlFor="settlement-common-date">Ngày tất toán chung</label>
            <DateInput id="settlement-common-date" value={commonDate} onChange={setCommonDate} className="w-36 rounded-md border border-line bg-panel px-2 py-1 text-xs" />
          </div>
          <Button variant="secondary" onClick={() => onApplyDateToSelected(commonDate)} disabled={selectedCount === 0}>
            Áp cho các khoản đã chọn
          </Button>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-5">
          <table className="w-full min-w-[1100px] text-xs border-collapse">
            <thead className="sticky top-0 bg-surface text-ink-muted font-semibold">
              <tr className="border-b border-line">
                <th className="p-2 w-8 text-center">
                  <input type="checkbox" aria-label="Chọn tất cả" checked={allSelected} onChange={e => onSelectAll(e.target.checked)} />
                </th>
                <th className="p-2 text-left">Số KUNN</th>
                <th className="p-2 text-left">Hình thức vay</th>
                <th className="p-2 text-center">Ngày giải ngân</th>
                <th className="p-2 text-center w-36">Ngày tất toán</th>
                <th className="p-2 text-right w-32">Phí (%)</th>
                <th className="p-2 text-right">Gốc còn lại</th>
                <th className="p-2 text-right">Lãi dồn tích</th>
                <th className="p-2 text-right">Phí trả trước</th>
                <th className="p-2 text-right">Tổng tất toán</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60">
              {lines.map(line => {
                const id = line.contract.Id;
                const d = drafts[id];
                const q = line.quote;
                const problem = failures[id] ?? line.blockReason;
                return (
                  <tr key={id} className={d?.selected ? 'bg-accent-soft/20' : ''}>
                    <td className="p-2 text-center align-top">
                      <input
                        type="checkbox"
                        aria-label={`Chọn ${line.contract.ContractNumber}`}
                        checked={Boolean(d?.selected)}
                        onChange={e => onChangeDraft(id, { selected: e.target.checked })}
                      />
                    </td>
                    <td className="p-2 align-top">
                      <div className="font-mono font-semibold text-ink">{line.contract.ContractNumber}</div>
                      {problem && <div role="alert" className="mt-1 text-[11px] text-neg">{problem}</div>}
                    </td>
                    <td className="p-2 align-top text-ink">{line.loanMethod}</td>
                    <td className="p-2 align-top text-center font-mono">{fmtDate(line.contract.DisbursementDate || line.contract.ContractStartDate) || '—'}</td>
                    <td className="p-2 align-top">
                      <DateInput
                        ariaLabel={`Ngày tất toán ${line.contract.ContractNumber}`}
                        value={d?.settlementDate ?? ''}
                        onChange={v => onChangeDraft(id, { settlementDate: v })}
                        className="w-full rounded-md border border-line bg-panel px-2 py-1 text-xs"
                      />
                    </td>
                    <td className="p-2 align-top">
                      <input
                        type="text"
                        inputMode="decimal"
                        aria-label={`Phí trả trước (%) của ${line.contract.ContractNumber}`}
                        value={d?.penaltyInput ?? ''}
                        placeholder={String(line.fee.percent).replace('.', ',')}
                        onChange={e => onChangeDraft(id, { penaltyInput: e.target.value })}
                        className="w-full rounded-md border border-line bg-panel px-2 py-1 text-right font-mono text-xs"
                      />
                      <div className="mt-1 text-[11px] text-ink-faint text-right whitespace-nowrap">{line.fee.reason}</div>
                    </td>
                    <td className="p-2 align-top text-right font-mono tabular-nums">{money(q?.remainingPrincipal)}</td>
                    <td className="p-2 align-top text-right font-mono tabular-nums">{money(q?.accruedInterest)}</td>
                    <td className="p-2 align-top text-right font-mono tabular-nums">
                      {money(q?.penaltyFee)}
                      {q && q.penaltyFee > 0 && <div className="text-[11px] text-ink-faint">{percentText(line.penaltyPercent)}</div>}
                    </td>
                    <td className="p-2 align-top text-right font-mono tabular-nums font-semibold text-ink">{money(q?.totalSettlementAmount)}</td>
                  </tr>
                );
              })}
              <tr className="border-t-2 border-line bg-surface font-bold text-ink">
                <td colSpan={6} className="p-2 text-right">TỔNG CỘNG ({totals.count} khoản)</td>
                <td className="p-2 text-right font-mono tabular-nums">{fmtNumber(totals.principal)}</td>
                <td className="p-2 text-right font-mono tabular-nums">{fmtNumber(totals.interest)}</td>
                <td className="p-2 text-right font-mono tabular-nums">{fmtNumber(totals.fee)}</td>
                <td className="p-2 text-right font-mono tabular-nums">{fmtNumber(totals.total)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-line flex items-center justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>Huỷ</Button>
          <Button onClick={onConfirm} disabled={isSubmitting || totals.count === 0}>
            {isSubmitting ? 'Đang tất toán…' : `Tất toán ${totals.count} khoản`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
