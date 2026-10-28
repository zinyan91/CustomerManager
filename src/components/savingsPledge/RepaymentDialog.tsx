import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Field, Select, controlClass } from '../ui/Field';
import { Button } from '../ui/Button';
import { DateInput } from '../DateInput';
import { fmtDate, fmtNumber, fmtRate } from '../../lib/utils';
import type { PledgeBundle, PledgeLoan, PledgeRepaymentKind } from '../../types';
import { useRepaymentForm } from '../../hooks/useRepaymentForm';
import type { RepaymentRequest } from '../../hooks/useSavingsPledgeData';
import type { SavingsPledgeController } from '../../hooks/useSavingsPledgeController';
import { MoneyInput } from './inputs';
import { WarningNote } from './shared';

const KINDS: Array<{ kind: PledgeRepaymentKind; label: string; sub: string }> = [
  { kind: 'partial', label: 'Trả trước một phần', sub: 'Trả bớt gốc, khoản vay tiếp tục' },
  { kind: 'full', label: 'Trả toàn bộ trước hạn', sub: 'Lãi tính đến ngày trả, giải chấp sổ' },
  { kind: 'due', label: 'Trả khi đến hạn', sub: 'Gốc và lãi vào ngày đến hạn' },
  { kind: 'offset', label: 'Tất toán sổ để cấn trừ', sub: 'Dùng tiền sổ trả nợ, phần dư trả khách' },
];

function Line({ label, sub, value, strong = false }: { label: string; sub?: string; value: string; strong?: boolean }) {
  return (
    <tr className={strong ? 'font-bold border-t border-line' : 'border-b border-line/60'}>
      <td className="px-3 py-1.5">{label}</td>
      <td className="px-3 py-1.5 text-[11px] text-ink-muted">{sub}</td>
      <td className="px-3 py-1.5 text-right font-mono tabular-nums whitespace-nowrap">{value}</td>
    </tr>
  );
}

interface Props {
  dialog: SavingsPledgeController['repayDialog'];
  bundle: PledgeBundle;
  today: string;
}

export function RepaymentDialog({ dialog, bundle, today }: Props) {
  if (!dialog.loan) return null;
  return <RepaymentDialogBody key={dialog.loan.Id} loan={dialog.loan} bundle={bundle} today={today} onClose={dialog.close} onSubmit={dialog.record} />;
}

interface BodyProps {
  loan: PledgeLoan;
  bundle: PledgeBundle;
  today: string;
  onClose: () => void;
  onSubmit: (req: RepaymentRequest) => Promise<void>;
}

function RepaymentDialogBody({ loan, bundle, today, onClose, onSubmit }: BodyProps) {
  const form = useRepaymentForm({ loan, bundle, today, onSubmit });
  const { quote, kind } = form;
  const effectiveDate = kind === 'due' ? loan.DueDate : form.date;
  const offsetBook = form.linkedBooks.find((b) => b.Id === form.offsetBookId);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent size="xl" className="p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-4 border-b border-line">
          <DialogTitle className="text-sm font-semibold text-ink">Trả nợ {loan.ContractNumber}</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[65vh]">
          <div role="radiogroup" aria-label="Cách trả nợ" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {KINDS.map((k) => (
              <label key={k.kind} className={`flex gap-2 items-start rounded-[var(--r-control)] border px-3 py-2 cursor-pointer ${kind === k.kind ? 'border-accent bg-accent-soft' : 'border-line'}`}>
                <input type="radio" name="repay-kind" className="mt-0.5" checked={kind === k.kind} onChange={() => form.setKind(k.kind)} />
                <span>
                  <span className="block text-xs font-semibold text-ink">{k.label}</span>
                  <span className="block text-[11px] text-ink-muted">{k.sub}</span>
                </span>
              </label>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Ngày trả" htmlFor="rp-date">
              <DateInput id="rp-date" className={controlClass()} value={effectiveDate} disabled={kind === 'due'} onChange={(d) => form.setDate(d)} />
            </Field>
            <Field label="Gốc trả" htmlFor="rp-principal">
              <MoneyInput id="rp-principal" value={kind === 'partial' ? form.principal : quote.principal} disabled={kind !== 'partial'}
                onChange={(n) => form.setPrincipal(n)} />
            </Field>
            {kind === 'offset' && (
              <Field label="Sổ tất toán" htmlFor="rp-book">
                <Select id="rp-book" value={form.offsetBookId ?? ''} onChange={(e) => form.setOffsetBookId(Number(e.target.value))}>
                  {form.linkedBooks.map((b) => <option key={b.Id} value={b.Id}>{b.BookNumber}</option>)}
                </Select>
              </Field>
            )}
          </div>

          {!quote.ok && <p role="alert" className="text-xs font-semibold text-neg">{quote.error}</p>}

          {quote.ok && (
            <table className="w-full text-xs border border-line rounded-[var(--r-control)]">
              <tbody>
                {kind === 'offset' && quote.offset && offsetBook ? (
                  <>
                    <Line label={`Tiền sổ ${offsetBook.BookNumber}`}
                      sub={`gốc ${fmtNumber(quote.offset.savingsTotal - quote.offset.savingsInterest)} + lãi ${quote.offset.early ? 'không kỳ hạn' : 'đúng kỳ hạn'} ${fmtRate(quote.offset.savingsRatePercent)}`}
                      value={fmtNumber(quote.offset.savingsTotal)} />
                    <Line label="Trừ nợ phải trả" sub={`gốc ${fmtNumber(quote.principal)} + lãi ${fmtNumber(quote.interest)}${quote.principalPenalty + quote.interestPenalty > 0 ? ` + phạt ${fmtNumber(quote.principalPenalty + quote.interestPenalty)}` : ''}`}
                      value={`(${fmtNumber(quote.total)})`} />
                    <Line strong label={quote.offset.balance >= 0 ? 'Còn lại trả khách' : 'Khách nộp thêm'} value={fmtNumber(Math.abs(quote.offset.balance))} />
                  </>
                ) : (
                  <>
                    <Line label="Lãi" sub={`${fmtRate(loan.InterestRate)} trên dư nợ, tính đến ${fmtDate(effectiveDate > loan.DueDate ? loan.DueDate : effectiveDate)}`} value={fmtNumber(quote.interest)} />
                    {quote.principalPenalty > 0 && <Line label="Lãi phạt quá hạn gốc" value={fmtNumber(quote.principalPenalty)} />}
                    {quote.interestPenalty > 0 && <Line label="Lãi phạt chậm trả lãi" value={fmtNumber(quote.interestPenalty)} />}
                    <Line label="Gốc trả" value={fmtNumber(quote.principal)} />
                    <Line strong label="Tổng thu lần này" value={fmtNumber(quote.total)} />
                    {kind === 'partial' && quote.nextInterestFrom && (
                      <Line label={`Dư nợ gốc còn lại · lãi kỳ tới tính từ ${fmtDate(quote.nextInterestFrom)}`} value={fmtNumber(quote.remainingPrincipal)} />
                    )}
                  </>
                )}
              </tbody>
            </table>
          )}

          {quote.ok && quote.warnings.map((w) => <WarningNote key={w}>{w}</WarningNote>)}
          {quote.ok && kind !== 'partial' && kind !== 'offset' && (
            <WarningNote>Sau khi ghi nhận: khoản vay tất toán, giải chấp {form.linkedBooks.map((b) => b.BookNumber).join(', ')}.</WarningNote>
          )}
          {form.error && <p role="alert" className="text-xs font-semibold text-neg">{form.error}</p>}
        </div>
        <DialogFooter className="p-4 border-t border-line">
          <Button variant="secondary" onClick={onClose}>Huỷ</Button>
          <Button loading={form.saving} disabled={!quote.ok} onClick={() => void form.submit()}>Ghi nhận trả nợ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
