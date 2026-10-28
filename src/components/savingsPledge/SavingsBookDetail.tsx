import { Button } from '../ui/Button';
import { fmtDate, fmtNumber, fmtRate } from '../../lib/utils';
import { INTEREST_PAYMENT_METHOD_LABELS, PLEDGE_DEPOSIT_TYPE_LABELS, TENOR_UNIT_LABELS } from '../../lib/stkPledge';
import { savingsInterestToMaturity } from '../../lib/savingsBook';
import type { BookRow } from '../../lib/savingsPledgeView';
import { DetailList, DetailRow, RowStatus, SectionTitle, WarningNote } from './shared';

interface Props {
  row: BookRow;
  onGoToLoan: (loanId: number) => void;
  onEdit: () => void;
  onNewLoan: () => void;
}

export function SavingsBookDetail({ row, onGoToLoan, onEdit, onNewLoan }: Props) {
  const b = row.book;
  const interest = savingsInterestToMaturity(b);
  const pledged = row.allocations.length > 0;

  return (
    <aside aria-label={`Chi tiết sổ ${b.BookNumber}`} className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{b.BookNumber}</h2>
        <RowStatus {...row.status} />
      </div>

      <DetailList>
        <DetailRow label="Loại tiền gửi" value={PLEDGE_DEPOSIT_TYPE_LABELS[b.DepositType]} />
        <DetailRow label="Số tiền gửi" value={`${fmtNumber(b.Amount)}${b.DepositType === 'tg_foreign' ? ` ${b.Currency}` : ''}`} />
        {b.DepositType === 'tg_foreign' && <DetailRow label="Tỷ giá quy đổi" value={fmtNumber(b.ExchangeRate)} />}
        <DetailRow label="Lãi suất" value={b.InterestRate === null ? '—' : fmtRate(b.InterestRate)} />
        <DetailRow label="Kỳ hạn" value={b.Tenor !== null && b.TenorUnit ? `${b.Tenor} ${TENOR_UNIT_LABELS[b.TenorUnit].toLowerCase()}` : '—'} />
        <DetailRow label="Lãnh lãi" value={INTEREST_PAYMENT_METHOD_LABELS[b.InterestPaymentMethod]} />
        <DetailRow label="Ngày gửi" value={fmtDate(b.OpenDate)} />
        <DetailRow label="Ngày đáo hạn" value={fmtDate(row.maturity)} />
        <DetailRow label="Lãi đến đáo hạn" value={interest === null ? '—' : fmtNumber(interest)} />
        <DetailRow label="Khả năng bảo đảm" value={row.capacity === null ? '—' : fmtNumber(row.capacity)} strong />
        {b.IsClosed && <DetailRow label="Ngày tất toán" value={fmtDate(b.ClosedDate)} />}
      </DetailList>

      {row.incomplete && <WarningNote>Sổ thiếu lãi suất, ngày gửi hoặc kỳ hạn nên chưa tính được khả năng bảo đảm.</WarningNote>}

      <SectionTitle>Đang bảo đảm cho</SectionTitle>
      {pledged ? (
        <ul className="divide-y divide-line/60 text-xs">
          {row.allocations.map((a) => (
            <li key={a.pledgeLoanId} className="flex justify-between gap-2 py-1.5">
              <button type="button" onClick={() => onGoToLoan(a.pledgeLoanId)} className="font-semibold text-accent hover:underline cursor-pointer">
                {a.contractNumber}
              </button>
              <span className="text-ink-muted font-mono tabular-nums">gốc {fmtNumber(a.principalCovered)} · đến hạn {fmtDate(a.dueDate)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-ink-muted">Sổ chưa bảo đảm khoản vay nào.</p>
      )}

      {!b.IsClosed && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onEdit}>Sửa thông tin sổ</Button>
          <Button size="sm" onClick={onNewLoan}>Vay cầm cố trên sổ này</Button>
        </div>
      )}
      {pledged && !b.IsClosed && <WarningNote>Sổ đang cầm cố: tất toán qua thao tác Trả nợ của khoản vay để cấn trừ.</WarningNote>}
    </aside>
  );
}
