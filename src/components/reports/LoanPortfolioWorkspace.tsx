import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import type { LoanPortfolioController } from '../../hooks/useLoanPortfolio';
import { DEBT_GROUP_FILTER_LABELS, type DebtGroupFilter } from '../../lib/reports/debtGroup';
import { Button } from '../ui/Button';
import { LoanPortfolioTable } from './LoanPortfolioTable';

interface Props {
  ctrl: LoanPortfolioController;
}

const FILTERS = Object.keys(DEBT_GROUP_FILTER_LABELS) as DebtGroupFilter[];

const segment = (on: boolean) =>
  `px-3 py-1.5 rounded-[var(--r-control)] text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent ${
    on ? 'bg-accent text-accent-ink shadow-2xs' : 'text-ink-muted hover:bg-panel hover:text-ink'
  }`;

export function LoanPortfolioWorkspace({ ctrl }: Props) {
  const { tables, table } = ctrl;

  return (
    <section aria-label="Danh mục đang vay" className="divide-y divide-line">
      <div data-workspace-panel className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-panel">
        <div role="group" aria-label="Nhóm nợ" className="flex items-center gap-1 rounded-[var(--r-control)] bg-surface p-1">
          {FILTERS.map(f => (
            <button key={f} type="button" aria-pressed={ctrl.filter === f} onClick={() => ctrl.setFilter(f)} className={segment(ctrl.filter === f)}>
              {DEBT_GROUP_FILTER_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            disabled={ctrl.loading}
            onClick={() => void ctrl.reload()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Làm mới
          </Button>
          <Button
            loading={ctrl.loading}
            disabled={Boolean(ctrl.error || !tables)}
            onClick={ctrl.exportExcel}
            leftIcon={<FileSpreadsheet className="w-4 h-4" />}
          >
            Xuất Excel
          </Button>
        </div>
      </div>

      {ctrl.error && <div role="alert" className="p-4 text-neg">{ctrl.error}</div>}
      {ctrl.actionError && <div role="alert" className="p-4 text-neg">{ctrl.actionError}</div>}

      {tables && table && (
        <>
          <div role="tablist" aria-label="Sheet" className="flex flex-wrap items-center gap-1 px-4 py-2 bg-surface">
            {tables.map(t => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={t.id === table.id}
                onClick={() => ctrl.setTableId(t.id)}
                className={segment(t.id === table.id)}
              >
                {t.title} <span className="font-mono">({t.rows.length})</span>
              </button>
            ))}
          </div>
          <div role="tabpanel" aria-label={table.title}>
            <LoanPortfolioTable table={table} />
          </div>
        </>
      )}
      {!tables && ctrl.loading && <div role="status" className="p-4 text-ink-muted">Đang tải danh mục…</div>}
    </section>
  );
}
