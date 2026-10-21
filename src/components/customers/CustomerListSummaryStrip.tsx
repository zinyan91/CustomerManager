import type { CustomerStatusFilter } from '../../lib/customerStatus';

interface CustomerListSummaryStripProps {
  counts: Record<CustomerStatusFilter, number>;
  status: CustomerStatusFilter;
  relatedCount: number;
  onStatusChange: (status: CustomerStatusFilter) => void;
}

const STATUS_METRICS = [
  { status: 'ALL', label: 'Tổng hồ sơ' },
  { status: 'active', label: 'Đang làm việc' },
  { status: 'archived', label: 'Hồ sơ lưu trữ' },
] as const;

export function CustomerListSummaryStrip({ counts, status, relatedCount, onStatusChange }: CustomerListSummaryStripProps) {
  return (
    <div data-workspace-metrics className="grid grid-cols-2 xl:grid-cols-4">
      {STATUS_METRICS.map(metric => (
        <button
          key={metric.status}
          type="button"
          data-workspace-panel
          aria-pressed={status === metric.status}
          onClick={() => onStatusChange(metric.status)}
          className={`px-4 py-3 text-left border-b border-line focus-visible:outline-2 focus-visible:outline-accent focus-visible:-outline-offset-2 hover:bg-surface ${
            status === metric.status ? 'text-accent' : 'text-ink'
          }`}
        >
          <div className="text-[11px] font-semibold text-ink-muted">{metric.label}</div>
          <div className="mt-1 text-lg font-mono font-bold">{counts[metric.status]}</div>
        </button>
      ))}
      <div data-workspace-panel className="px-4 py-3 border-b border-line">
        <div className="text-[11px] font-semibold text-ink-muted">Có KHLQ / Hôn phối</div>
        <div className="mt-1 text-lg font-mono font-bold text-ink">{relatedCount}</div>
      </div>
    </div>
  );
}
