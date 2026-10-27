import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/Dialog';
import { Field, Input, Select, Textarea } from '../ui/Field';
import { Button } from '../ui/Button';
import { DateInput } from '../DateInput';
import {
  INTEREST_PAYMENT_METHOD_LABELS, PLEDGE_DEPOSIT_TYPE_LABELS, TENOR_UNIT_LABELS,
  type DepositInterestPaymentMethod, type PledgeDepositType, type TenorUnit,
} from '../../lib/stkPledge';
import type { SavingsPledgeController } from '../../hooks/useSavingsPledgeController';
import { DecimalInput, MoneyInput } from './inputs';

export function SavingsBookForm({ form }: { form: SavingsPledgeController['bookForm'] }) {
  const v = form.values;
  const foreign = v.DepositType === 'tg_foreign';
  const paidInterestShown = v.InterestPaymentMethod === 'periodic' || v.InterestPaymentMethod === 'upfront';

  return (
    <Dialog open={form.open} onOpenChange={(open) => !open && form.close()}>
      <DialogContent size="xl" className="p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="p-4 border-b border-line">
          <DialogTitle className="text-sm font-semibold text-ink">{v.Id ? `Sửa sổ ${v.BookNumber}` : 'Thêm sổ tiết kiệm'}</DialogTitle>
        </DialogHeader>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4 overflow-y-auto max-h-[65vh]">
          <Field label="Số sổ" htmlFor="sb-number" required>
            <Input id="sb-number" value={v.BookNumber ?? ''} onChange={(e) => form.setField('BookNumber', e.target.value)} />
          </Field>
          <Field label="Loại tiền gửi" htmlFor="sb-type">
            <Select id="sb-type" value={v.DepositType} onChange={(e) => {
              const t = e.target.value as PledgeDepositType;
              form.setField('DepositType', t);
              form.setField('Currency', t === 'tg_foreign' ? 'USD' : 'VND');
              if (t !== 'tg_foreign') form.setField('ExchangeRate', null);
            }}>
              {Object.entries(PLEDGE_DEPOSIT_TYPE_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </Select>
          </Field>
          {foreign && (
            <>
              <Field label="Loại ngoại tệ" htmlFor="sb-currency">
                <Input id="sb-currency" value={v.Currency ?? ''} onChange={(e) => form.setField('Currency', e.target.value.toUpperCase())} />
              </Field>
              <Field label="Tỷ giá quy đổi" htmlFor="sb-rate-fx" required>
                <MoneyInput id="sb-rate-fx" value={v.ExchangeRate} onChange={(n) => form.setField('ExchangeRate', n || null)} />
              </Field>
            </>
          )}
          <Field label="Số tiền gửi" htmlFor="sb-amount" required>
            <MoneyInput id="sb-amount" value={v.Amount} onChange={(n) => form.setField('Amount', n)} />
          </Field>
          <Field label="Lãi suất (%/năm)" htmlFor="sb-rate">
            <DecimalInput id="sb-rate" value={v.InterestRate} onChange={(n) => form.setField('InterestRate', n)} />
          </Field>
          <Field label="Ngày gửi" htmlFor="sb-open">
            <DateInput id="sb-open" value={v.OpenDate ?? ''} onChange={(d) => form.setField('OpenDate', d || null)} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Kỳ hạn" htmlFor="sb-tenor">
              <Input id="sb-tenor" inputMode="numeric" className="text-right" value={v.Tenor ?? ''}
                onChange={(e) => form.setField('Tenor', e.target.value ? Math.max(0, parseInt(e.target.value.replace(/\D/g, ''), 10) || 0) || null : null)} />
            </Field>
            <Field label="Đơn vị" htmlFor="sb-unit">
              <Select id="sb-unit" value={v.TenorUnit ?? 'thang'} onChange={(e) => form.setField('TenorUnit', e.target.value as TenorUnit)}>
                {Object.entries(TENOR_UNIT_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </Select>
            </Field>
          </div>
          <Field label="Phương thức lãnh lãi" htmlFor="sb-payout">
            <Select id="sb-payout" value={v.InterestPaymentMethod} onChange={(e) => form.setField('InterestPaymentMethod', e.target.value as DepositInterestPaymentMethod)}>
              {Object.entries(INTEREST_PAYMENT_METHOD_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
            </Select>
          </Field>
          {paidInterestShown && (
            <Field label="Lãi đã chi" htmlFor="sb-paid">
              <MoneyInput id="sb-paid" value={v.PaidInterest} onChange={(n) => form.setField('PaidInterest', n)} />
            </Field>
          )}
          <Field label="Ghi chú" htmlFor="sb-note" className="sm:col-span-2">
            <Textarea id="sb-note" rows={2} value={v.Note ?? ''} onChange={(e) => form.setField('Note', e.target.value || null)} />
          </Field>
          {form.error && <p role="alert" className="sm:col-span-2 text-xs font-semibold text-neg">{form.error}</p>}
        </div>
        <DialogFooter className="p-4 border-t border-line">
          <Button variant="secondary" onClick={form.close}>Huỷ</Button>
          <Button loading={form.saving} onClick={() => void form.submit()}>Lưu sổ</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
