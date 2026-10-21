import { Archive, ContactRound, UserCheck, Users, type LucideIcon } from 'lucide-react';
import type { CustomerStatusFilter } from '../../lib/customerStatus';

interface CustomerListSummaryStripProps {
  counts: Record<CustomerStatusFilter, number>;
  status: CustomerStatusFilter;
  relatedCount: number;
  onStatusChange: (status: CustomerStatusFilter) => void;
}

const STATUS_METRICS = [
  { status: 'ALL', label: 'Tổng hồ sơ', tone: 'cust', icon: Users },
  { status: 'active', label: 'Đang làm việc', tone: 'pos', icon: UserCheck },
  { status: 'archived', label: 'Hồ sơ lưu trữ', tone: 'neutral', icon: Archive },
] as const;

const TONE_STYLES = {
  cust: { value: 'text-kpi-cust', icon: 'bg-kpi-cust/10 text-kpi-cust', selectedIcon: 'bg-kpi-cust text-surface' },
  pos: { value: 'text-pos', icon: 'bg-pos-soft text-pos', selectedIcon: 'bg-pos text-surface' },
  neutral: { value: 'text-ink-muted', icon: 'bg-panel-muted text-ink-muted', selectedIcon: 'bg-ink-faint text-surface' },
  accent: { value: 'text-accent', icon: 'bg-accent-soft text-accent', selectedIcon: 'bg-accent text-accent-ink' },
};

function CustomerMetricContent({ label, value, icon: Icon, tone, selected = false }: {
  label: string;
  value: number;
  icon: LucideIcon;
  tone: keyof typeof TONE_STYLES;
  selected?: boolean;
}) {
  const styles = TONE_STYLES[tone];
  return <>
    <div className="flex items-start justify-between gap-2 min-h-10">
      <span className="text-[11px] font-medium leading-4 text-ink-muted text-balance">{label}</span>
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-control)] ${selected ? styles.selectedIcon : styles.icon}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
    </div>
    <div className={`customer-summary-value mt-2 ${styles.value}`}>{value}</div>
  </>;
}

export function CustomerListSummaryStrip({ counts, status, relatedCount, onStatusChange }: CustomerListSummaryStripProps) {
  return (
    <div data-workspace-metrics className="customer-summary-strip grid grid-cols-2 xl:grid-cols-4">
      {STATUS_METRICS.map(metric => (
        <button
          key={metric.status}
          type="button"
          data-workspace-panel
          data-metric-tone={metric.tone}
          aria-pressed={status === metric.status}
          onClick={() => onStatusChange(metric.status)}
          className="text-left focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2"
        >
          <CustomerMetricContent label={metric.label} value={counts[metric.status]} icon={metric.icon} tone={metric.tone} selected={status === metric.status} />
        </button>
      ))}
      <div data-workspace-panel data-metric-tone="accent">
        <CustomerMetricContent label="Có KHLQ / Hôn phối" value={relatedCount} icon={ContactRound} tone="accent" />
      </div>
    </div>
  );
}
