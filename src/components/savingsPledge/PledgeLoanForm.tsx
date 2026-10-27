import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { Button } from '../ui/Button';
import { DateInput } from '../DateInput';
import { LOAN_PURPOSES } from '../../lib/loanProductRules';
import { signedDays } from '../../lib/pledgeLoanMath';
import { fmtNumber } from '../../lib/utils';
import type { BookRow } from '../../lib/savingsPledgeView';
import type { SavingsPledgeController } from '../../hooks/useSavingsPledgeController';
import { DecimalInput, MoneyInput } from './inputs';
import { WarningNote } from './shared';

interface Props {
  form: SavingsPledgeController['loanForm'];
  bookRows: BookRow[];
}

export function PledgeLoanForm({ form, bookRows }: Props) {
  const v = form.values;
  const openBooks = bookRows.filter((r) => !r.book.IsClosed);
  const covered = form.links.reduce((s, l) => s + l.PrincipalCovered, 0);
  const days = v.DisbursementDate && v.DueDate && v.DueDate > v.DisbursementDate ? signedDays(v.DisbursementDate, v.DueDate) : null;
  const unused = openBooks.filter((r) => !form.links.some((l) => l.SavingsBookId === r.book.Id));

  const setLink = (index: number, patch: Partial<{ SavingsBookId: number; PrincipalCovered: number }>) =>
    form.setLinks(form.links.map((l, i) => (i === index ? { ...l, ...patch } : l)));

  return (
    <Dialog open={form.open} onOpenChange={(open) => !open && form.close()}>
      <DialogContent size="xl" className="p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-4 border-b border-line">
          <DialogTitle className="text-sm font-semibold text-ink">{v.Id ? `Sửa khoản vay ${v.ContractNumber}` : 'Tạo khoản vay cầm cố'}</DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4 overflow-y-auto max-h-[65vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Số HĐ cầm cố" htmlFor="pl-number" required>
              <Input id="pl-number" value={v.ContractNumber ?? ''} onChange={(e) => form.setField('ContractNumber', e.target.value)} />
            </Field>
            <Field label="Mục đích" htmlFor="pl-purpose">
              <Select id="pl-purpose" value={v.LoanPurpose ?? ''} onChange={(e) => form.setField('LoanPurpose', e.target.value || null)}>
                <option value="">—</option>
                {LOAN_PURPOSES.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </Select>
            </Field>
            <Field label="Số tiền vay" htmlFor="pl-amount" required>
              <MoneyInput id="pl-amount" value={v.Amount} onChange={(n) => form.setField('Amount', n)} />
            </Field>
            <Field label="Lãi suất (%/năm)" htmlFor="pl-rate" required>
              <DecimalInput id="pl-rate" value={v.InterestRate} onChange={(n) => form.setField('InterestRate', n ?? undefined)} />
            </Field>
            <Field label="Ngày giải ngân" htmlFor="pl-disb" required>
              <DateInput id="pl-disb" value={v.DisbursementDate ?? ''} onChange={(d) => form.setField('DisbursementDate', d)} />
            </Field>
            <Field label="Ngày đến hạn" htmlFor="pl-due" required hint={days !== null ? `${days} ngày` : undefined}>
              <DateInput id="pl-due" value={v.DueDate ?? ''} onChange={(d) => form.setField('DueDate', d)} />
            </Field>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[length:var(--fs-label)] font-bold uppercase tracking-wider text-ink-muted">Sổ tiết kiệm bảo đảm</span>
              <span className={`text-xs font-mono tabular-nums ${covered === (v.Amount ?? 0) ? 'text-ink-muted' : 'text-warn'}`}>
                {fmtNumber(covered)} / {fmtNumber(v.Amount ?? 0)}
              </span>
            </div>
            <div className="space-y-2">
              {form.links.map((l, i) => {
                const row = bookRows.find((r) => r.book.Id === l.SavingsBookId);
                return (
                  <div key={i} className="grid grid-cols-[1fr_11rem_auto] gap-2 items-center">
                    <Select aria-label="Sổ bảo đảm" value={l.SavingsBookId} onChange={(e) => setLink(i, { SavingsBookId: Number(e.target.value) })}>
                      {[...(row ? [row] : []), ...unused].map((r) => (
                        <option key={r.book.Id} value={r.book.Id}>
                          {r.book.BookNumber} · còn trống {r.free === null ? '—' : fmtNumber(r.free)}
                        </option>
                      ))}
                    </Select>
                    <MoneyInput id={`pl-cover-${i}`} value={l.PrincipalCovered} onChange={(n) => setLink(i, { PrincipalCovered: n })} />
                    <Button variant="ghost" size="sm" onClick={() => form.setLinks(form.links.filter((_, j) => j !== i))}>Bỏ</Button>
                  </div>
                );
              })}
            </div>
            {unused.length > 0 && (
              <Button variant="secondary" size="sm" className="mt-2"
                onClick={() => form.setLinks([...form.links, { SavingsBookId: unused[0].book.Id, PrincipalCovered: Math.max(0, (v.Amount ?? 0) - covered) }])}>
                Thêm sổ
              </Button>
            )}
            {openBooks.length === 0 && <p className="text-xs text-ink-muted">Khách hàng chưa có sổ tiết kiệm nào đang hiệu lực.</p>}
          </div>

          <Field label="Ghi chú" htmlFor="pl-note">
            <Textarea id="pl-note" rows={2} value={v.Note ?? ''} onChange={(e) => form.setField('Note', e.target.value || null)} />
          </Field>

          {form.warnings.map((w) => <WarningNote key={w}>{w}</WarningNote>)}
          {form.error && <p role="alert" className="text-xs font-semibold text-neg">{form.error}</p>}
        </div>
        <DialogFooter className="p-4 border-t border-line">
          <Button variant="secondary" onClick={form.close}>Huỷ</Button>
          <Button loading={form.saving} onClick={() => void form.submit()}>Lưu khoản vay</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
