import { Button } from '../ui/Button';
import { fmtDate, fmtNumber, fmtRate } from '../../lib/utils';
import { purposeLabel } from '../../lib/loanProductRules';
import { savingsMaturityDate } from '../../lib/savingsBook';
import type { LoanRow } from '../../lib/savingsPledgeView';
import { DetailList, DetailRow, RowStatus, SectionTitle, WarningNote } from './shared';

const CLOSED_HOW: Record<string, string> = {
  partial: 'Trả trước một phần',
  full: 'Trả toàn bộ trước hạn',
  due: 'Trả khi đến hạn',
  offset: 'Tất toán sổ để cấn trừ',
};

interface Props {
  row: LoanRow;
  onGoToBook: (bookId: number) => void;
  onRepay: () => void;
  onEdit: () => void;
}

export function PledgeLoanDetail({ row, onGoToBook, onRepay, onEdit }: Props) {
  const l = row.loan;
  return (
    <aside aria-label={`Chi tiết khoản vay ${l.ContractNumber}`} className="p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">{l.ContractNumber}</h2>
        <RowStatus {...row.status} />
      </div>

      <DetailList>
        <DetailRow label="Số tiền vay" value={fmtNumber(l.Amount)} />
        <DetailRow label="Dư nợ gốc" value={fmtNumber(row.outstanding)} />
        <DetailRow label="Lãi suất" value={fmtRate(l.InterestRate)} />
        <DetailRow label="Thời hạn" value={`${row.termDays} ngày`} />
        <DetailRow label="Ngày giải ngân" value={fmtDate(l.DisbursementDate)} />
        <DetailRow label="Ngày đến hạn" value={fmtDate(l.DueDate)} />
        {l.LoanPurpose && <DetailRow label="Mục đích" value={purposeLabel(l.LoanPurpose)} />}
        <DetailRow label="Phương thức trả" value="Gốc và lãi trả cuối kỳ" />
        {l.IsClosed ? (
          <DetailRow label="Tất toán" value={`${fmtDate(l.ClosedDate)} · ${CLOSED_HOW[l.ClosedHow ?? ''] ?? '—'}`} />
        ) : (
          <>
            <DetailRow label="Lãi đến hôm nay" value={fmtNumber(row.accruedToday)} />
            <DetailRow label="Lãi đến ngày đến hạn" value={fmtNumber(row.obligationAtDue - row.outstanding)} />
            <DetailRow label="Phải trả khi đến hạn" value={fmtNumber(row.obligationAtDue)} strong />
          </>
        )}
      </DetailList>

      <SectionTitle>Sổ tiết kiệm bảo đảm</SectionTitle>
      <ul className="divide-y divide-line/60 text-xs">
        {row.books.map(({ book, principalCovered }) => (
          <li key={book.Id} className="flex justify-between gap-2 py-1.5">
            <button type="button" onClick={() => onGoToBook(book.Id)} className="font-semibold text-accent hover:underline cursor-pointer">
              {book.BookNumber}
            </button>
            <span className="text-ink-muted font-mono tabular-nums">gốc vay {fmtNumber(principalCovered)} · đáo hạn {fmtDate(savingsMaturityDate(book))}</span>
          </li>
        ))}
      </ul>

      {row.warnings.map((w) => <WarningNote key={w}>{w}</WarningNote>)}

      {!l.IsClosed && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" onClick={onRepay}>Trả nợ</Button>
          {row.outstanding === l.Amount && <Button variant="secondary" size="sm" onClick={onEdit}>Sửa</Button>}
        </div>
      )}
    </aside>
  );
}
