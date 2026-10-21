import { fmtMoney } from '../../lib/utils';
import type { AppraisalStatus } from '../../lib/collateralMath';

interface CollateralSummaryStripProps {
  totalValue: number;
  count: number;
  counts: { expired: number; expiring_soon: number; missing: number };
  filter: AppraisalStatus | 'all';
  onFilterChange: (filter: AppraisalStatus | 'all') => void;
}

const STATUS_METRICS = [
  { status: 'expired', label: 'Hết hiệu lực', color: 'text-neg' },
  { status: 'expiring_soon', label: 'Sắp hết hạn', color: 'text-warn' },
  { status: 'missing', label: 'Chưa định giá', color: 'text-ink' },
] as const;

export function CollateralSummaryStrip({ totalValue, count, counts, filter, onFilterChange }: CollateralSummaryStripProps) {
  return (
    <div data-workspace-metrics className="grid grid-cols-2 xl:grid-cols-4">
      <button
        type="button"
        data-workspace-panel
        aria-pressed={filter === 'all'}
        onClick={() => onFilterChange('all')}
        className="px-4 py-3 text-left border-b border-line focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2 cursor-pointer"
      >
        <div className={`text-[11px] font-semibold ${filter === 'all' ? 'text-accent' : 'text-ink-muted'}`}>Tổng giá trị TSĐB</div>
        <div className="mt-1 font-mono font-bold text-sm sm:text-base text-accent whitespace-nowrap">{fmtMoney(totalValue)}</div>
        <div className="text-[11px] text-ink-muted">{count} tài sản</div>
      </button>
      {STATUS_METRICS.map(metric => (
        <button
          key={metric.status}
          type="button"
          data-workspace-panel
          aria-pressed={filter === metric.status}
          onClick={() => onFilterChange(filter === metric.status ? 'all' : metric.status)}
          className="px-4 py-3 text-left border-b border-line focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2 cursor-pointer"
        >
          <div className={`text-[11px] font-semibold ${filter === metric.status ? 'text-accent' : 'text-ink-muted'}`}>{metric.label}</div>
          <div className={`mt-1 font-mono font-bold text-lg ${metric.color}`}>
            {counts[metric.status]} <span className="text-[11px] font-normal text-ink-muted">tài sản</span>
          </div>
        </button>
      ))}
    </div>
  );
}
