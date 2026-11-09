import { Target } from 'lucide-react';
import { Panel, PanelHeader } from '../ui/Panel';
import { DataTable, type ColumnDef } from '../ui/DataTable';
import { formatKpiAmount, formatKpiCompletion } from '../../lib/kpiDashboard';
import type { KpiDashboardCard } from '../../types/kpiDashboard';

function Amount({ value, unit }: { value: number | null; unit: 'VND' | 'count' }) {
  const formatted = formatKpiAmount(value, unit);
  return <span className="font-mono tabular-nums">{formatted.value}{formatted.unit && <span className="text-ink-faint"> {formatted.unit}</span>}</span>;
}

function Completion({ value }: { value: number | null }) {
  const width = Math.max(0, Math.min(100, value ?? 0));
  return <div className="flex items-center justify-end gap-2.5">
    <div className="hidden sm:block h-1.5 w-24 overflow-hidden rounded-full bg-panel-muted" aria-hidden="true">
      <div className={`h-full rounded-full ${width >= 100 ? 'bg-pos' : 'bg-accent'}`} style={{ width: `${width}%` }} />
    </div>
    <span className={`font-mono tabular-nums font-semibold w-14 text-right ${width >= 100 ? 'text-pos' : 'text-ink'}`}>{formatKpiCompletion(value)}</span>
  </div>;
}

export function TeamKpiSummaryTable({ cards, selectedCode, onSelect }: {
  cards: KpiDashboardCard[]; selectedCode: string | undefined; onSelect: (code: string) => void;
}) {
  const columns: ColumnDef<KpiDashboardCard>[] = [
    { key: 'name', label: 'Chỉ tiêu', render: card => <span className="font-semibold text-ink">{card.definition.Name}</span>, width: '34%' },
    { key: 'target', label: 'Kế hoạch', align: 'right', render: card => <Amount value={card.target} unit={card.definition.Unit} /> },
    { key: 'actual', label: 'Thực hiện', align: 'right', render: card => <Amount value={card.actual} unit={card.definition.Unit} /> },
    { key: 'completion', label: 'Hoàn thành', align: 'right', render: card => <Completion value={card.completion} />, width: '22%' },
  ];
  return <Panel role="region" aria-label="Các chỉ tiêu KPI">
    <PanelHeader title="Các chỉ tiêu KPI" icon={<Target className="w-4 h-4" />} bordered />
    <div className="mt-4">
      <DataTable columns={columns} rows={cards} rowKey={card => card.definition.Code}
        cardTitle={card => card.definition.Name}
        onRowClick={card => onSelect(card.definition.Code)}
        isSelected={card => card.definition.Code === selectedCode} />
    </div>
  </Panel>;
}
