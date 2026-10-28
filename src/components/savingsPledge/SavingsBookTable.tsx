import { TABLE_CELL, TABLE_HEAD, ROW_RAIL_NEUTRAL, ROW_RAIL_SELECTED } from '../../lib/uiClasses';
import { fmtDate, fmtNumber, fmtRate } from '../../lib/utils';
import { TENOR_UNIT_LABELS } from '../../lib/stkPledge';
import type { BookRow } from '../../lib/savingsPledgeView';
import { RowStatus } from './shared';
import { StatusPill } from '../ui/StatusPill';

interface Props {
  rows: BookRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function SavingsBookTable({ rows, selectedId, onSelect }: Props) {
  const showMonthly = rows.some((r) => r.book.InterestPaymentMethod === 'periodic');
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className={TABLE_HEAD}>
            <th className={`${TABLE_CELL} text-left`}>Số sổ</th>
            <th className={`${TABLE_CELL} text-right`}>Số tiền gửi</th>
            <th className={`${TABLE_CELL} text-right`}>Lãi suất</th>
            <th className={`${TABLE_CELL} text-left`}>Kỳ hạn</th>
            <th className={`${TABLE_CELL} text-left`}>Ngày gửi</th>
            <th className={`${TABLE_CELL} text-left`}>Ngày đáo hạn</th>
            {showMonthly && <th className={`${TABLE_CELL} text-right`}>Lãi hàng tháng</th>}
            <th className={`${TABLE_CELL} text-left`}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const b = r.book;
            const selected = b.Id === selectedId;
            return (
              <tr
                key={b.Id}
                tabIndex={0}
                aria-selected={selected}
                onClick={() => onSelect(b.Id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(b.Id); }}
                className={`cursor-pointer border-b border-line/60 hover:bg-accent-soft/60 focus-visible:outline-2 focus-visible:outline-accent ${selected ? ROW_RAIL_SELECTED : ROW_RAIL_NEUTRAL} ${b.IsClosed ? 'text-ink-faint' : 'text-ink'}`}
              >
                <td className={TABLE_CELL}>
                  <div className="font-semibold whitespace-nowrap">{b.BookNumber}</div>
                  {b.DepositType === 'tg_foreign' && <div className="text-[11px] text-ink-muted">{b.Currency}</div>}
                </td>
                <td className={`${TABLE_CELL} text-right font-mono tabular-nums whitespace-nowrap`}>{fmtNumber(b.Amount)}</td>
                <td className={`${TABLE_CELL} text-right font-mono tabular-nums whitespace-nowrap`}>{b.InterestRate === null ? '—' : fmtRate(b.InterestRate)}</td>
                <td className={`${TABLE_CELL} whitespace-nowrap`}>
                  {b.Tenor !== null && b.TenorUnit ? `${b.Tenor} ${TENOR_UNIT_LABELS[b.TenorUnit].toLowerCase()}` : '—'}
                </td>
                <td className={`${TABLE_CELL} whitespace-nowrap`}>{fmtDate(b.OpenDate)}</td>
                <td className={`${TABLE_CELL} whitespace-nowrap`}>{fmtDate(r.maturity)}</td>
                {showMonthly && (
                  <td className={`${TABLE_CELL} text-right font-mono tabular-nums whitespace-nowrap`}>
                    {r.monthlyInterest === null ? '—' : fmtNumber(r.monthlyInterest)}
                  </td>
                )}
                <td className={TABLE_CELL}>
                  <div className="flex gap-1.5 flex-wrap">
                    <RowStatus {...r.status} />
                    {r.incomplete && <StatusPill status="warn" className="whitespace-nowrap">Thiếu thông tin</StatusPill>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
