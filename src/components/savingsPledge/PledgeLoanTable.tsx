import { TABLE_CELL, TABLE_HEAD, ROW_RAIL_NEUTRAL, ROW_RAIL_SELECTED } from '../../lib/uiClasses';
import { fmtDate, fmtNumber, fmtRate } from '../../lib/utils';
import type { LoanRow } from '../../lib/savingsPledgeView';
import { RowStatus } from './shared';

interface Props {
  rows: LoanRow[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export function PledgeLoanTable({ rows, selectedId, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className={TABLE_HEAD}>
            <th className={`${TABLE_CELL} text-left`}>Số HĐ cầm cố</th>
            <th className={`${TABLE_CELL} text-right`}>Dư nợ gốc</th>
            <th className={`${TABLE_CELL} text-right`}>Lãi suất</th>
            <th className={`${TABLE_CELL} text-left`}>Giải ngân → đến hạn</th>
            <th className={`${TABLE_CELL} text-right`}>Lãi đến hôm nay</th>
            <th className={`${TABLE_CELL} text-left`}>Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const l = r.loan;
            const selected = l.Id === selectedId;
            return (
              <tr
                key={l.Id}
                tabIndex={0}
                aria-selected={selected}
                onClick={() => onSelect(l.Id)}
                onKeyDown={(e) => { if (e.key === 'Enter') onSelect(l.Id); }}
                className={`cursor-pointer border-b border-line/60 hover:bg-accent-soft/60 focus-visible:outline-2 focus-visible:outline-accent ${selected ? ROW_RAIL_SELECTED : ROW_RAIL_NEUTRAL} ${l.IsClosed ? 'text-ink-faint' : 'text-ink'}`}
              >
                <td className={TABLE_CELL}>
                  <div className="font-semibold whitespace-nowrap">{l.ContractNumber}</div>
                  <div className="text-[11px] text-ink-muted">
                    {r.termDays} ngày · {r.books.map((b) => b.book.BookNumber).join(', ') || '—'}
                  </div>
                </td>
                <td className={`${TABLE_CELL} text-right font-mono tabular-nums whitespace-nowrap`}>{fmtNumber(r.outstanding)}</td>
                <td className={`${TABLE_CELL} text-right font-mono tabular-nums whitespace-nowrap`}>{fmtRate(l.InterestRate)}</td>
                <td className={`${TABLE_CELL} whitespace-nowrap`}>{fmtDate(l.DisbursementDate)} → {fmtDate(l.DueDate)}</td>
                <td className={`${TABLE_CELL} text-right font-mono tabular-nums whitespace-nowrap`}>{l.IsClosed ? '—' : fmtNumber(r.accruedToday)}</td>
                <td className={TABLE_CELL}><RowStatus {...r.status} /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
