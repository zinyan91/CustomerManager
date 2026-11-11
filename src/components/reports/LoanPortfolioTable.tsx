import type { CSSProperties } from 'react';
import type { PortfolioCell, PortfolioColKind, PortfolioTable } from '../../lib/reports/loanPortfolioTables';
import { PORTFOLIO_FROZEN_COLUMNS } from '../../lib/reports/loanPortfolioTables';
import type { PortfolioTone } from '../../lib/reports/portfolioTone';
import { fmtDecimals, fmtNumber } from '../../lib/utils';

const FROZEN_WIDTHS_REM = [3, 7, 14];

const TONE_CLASS: Record<PortfolioTone, string> = {
  pos: 'bg-pos-soft text-pos font-semibold',
  warn: 'bg-warn-soft text-warn font-semibold',
  neg: 'bg-neg-soft text-neg font-semibold',
};

const ALIGN: Record<PortfolioColKind, string> = {
  text: 'text-left',
  center: 'text-center',
  rate: 'text-center',
  money: 'text-right font-mono',
  amount: 'text-right font-mono',
};

function frozenStyle(index: number): CSSProperties | undefined {
  if (index >= PORTFOLIO_FROZEN_COLUMNS) return undefined;
  const left = FROZEN_WIDTHS_REM.slice(0, index).reduce((a, b) => a + b, 0);
  const width = `${FROZEN_WIDTHS_REM[index]}rem`;
  return { position: 'sticky', left: `${left}rem`, width, minWidth: width, maxWidth: width };
}

function cellText(kind: PortfolioColKind, value: string | number): string {
  if (typeof value !== 'number') return value;
  if (kind === 'money') return fmtNumber(value);
  if (kind === 'amount') return fmtDecimals(value, 2);
  return String(value);
}

const ROW_HOVER_BG = 'group-hover:bg-accent-soft';
const ROW_HOVER_EDGE =
  'group-hover:shadow-[inset_0_1px_0_var(--color-accent),inset_0_-1px_0_var(--color-accent)]';

const isFrozen = (index: number) => index < PORTFOLIO_FROZEN_COLUMNS;
const frozenEdge = (index: number) => (index === PORTFOLIO_FROZEN_COLUMNS - 1 ? 'border-r-2 border-r-line' : '');

interface Props {
  table: PortfolioTable;
}

export function LoanPortfolioTable({ table }: Props) {
  const firstSum = table.columns.findIndex(c => c.sum);
  const labelSpan = firstSum > 0 ? firstSum : 1;

  const bodyCell = (cell: PortfolioCell, index: number) => {
    const kind = table.columns[index].kind;
    const frozen = isFrozen(index) ? `z-[1] ${frozenEdge(index)}` : '';
    const background = cell.tone ? TONE_CLASS[cell.tone] : `${isFrozen(index) ? 'bg-panel' : ''} ${ROW_HOVER_BG}`;
    const wrap = kind === 'text' ? 'min-w-[10rem]' : 'whitespace-nowrap';
    return (
      <td key={index} style={frozenStyle(index)} className={`${ALIGN[kind]} ${wrap} ${frozen} ${background} ${ROW_HOVER_EDGE}`}>
        {cellText(kind, cell.value)}
      </td>
    );
  };

  return (
    <div className="overflow-auto max-h-[70vh] bg-panel">
      <table className="table-fintech w-full text-xs">
        <thead className="sticky top-0 z-20">
          <tr>
            {table.columns.map((col, i) => (
              <th
                key={i}
                style={frozenStyle(i)}
                className={`${ALIGN[col.kind]} whitespace-nowrap bg-panel-muted ${isFrozen(i) ? `z-30 ${frozenEdge(i)}` : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.length === 0 ? (
            <tr>
              <td colSpan={table.columns.length} className="text-center text-ink-muted py-6">
                Không có khoản nào phù hợp bộ lọc.
              </td>
            </tr>
          ) : (
            table.rows.map((row, r) => <tr key={r} className="group">{row.map(bodyCell)}</tr>)
          )}
          <tr className="font-bold">
            <td colSpan={labelSpan} style={{ position: 'sticky', left: 0 }} className="z-[1] bg-panel-muted text-center">
              TỔNG CỘNG
            </td>
            {table.columns.slice(labelSpan).map((col, offset) => {
              const total = table.totals[labelSpan + offset];
              return (
                <td key={offset} className={`bg-panel-muted ${ALIGN[col.kind]} whitespace-nowrap`}>
                  {total === null ? '' : cellText(col.kind, total)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
