import { KPI_FORECAST_RANKS, KPI_FORECAST_REGIONS, type KpiForecastInputs, type KpiForecastRank, type KpiForecastRegion } from '../../types/kpiForecast';
import { Input, Select } from '../ui/Field';

export function KpiForecastControls({
  inputs,
  onRankChange,
  onRegionChange,
  onTenureChange,
}: {
  inputs: KpiForecastInputs;
  onRankChange: (rank: KpiForecastRank) => void;
  onRegionChange: (region: KpiForecastRegion) => void;
  onTenureChange: (months: number) => void;
}) {
  return (
    <div className="workspace-toolbar grid gap-3 border-y border-line bg-surface px-3 py-3 sm:grid-cols-3">
      <label className="space-y-1.5 text-[length:var(--fs-label)] font-medium text-ink-muted">
        <span className="block">Cấp bậc</span>
        <Select value={inputs.rank} onChange={event => onRankChange(event.target.value as KpiForecastRank)}>
          {KPI_FORECAST_RANKS.map(rank => <option key={rank} value={rank}>{rank}</option>)}
        </Select>
      </label>
      <label className="space-y-1.5 text-[length:var(--fs-label)] font-medium text-ink-muted">
        <span className="block">Khu vực làm việc</span>
        <Select value={inputs.region} onChange={event => onRegionChange(event.target.value as KpiForecastRegion)}>
          {KPI_FORECAST_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
        </Select>
      </label>
      <label className="space-y-1.5 text-[length:var(--fs-label)] font-medium text-ink-muted">
        <span className="block">Thâm niên chính thức (tháng)</span>
        <Input type="number" min={0} step={1} inputMode="numeric" value={inputs.tenureMonths}
          onWheel={event => event.currentTarget.blur()}
          className="kpi-forecast-number-input"
          onChange={event => onTenureChange(Number(event.target.value))} />
      </label>
    </div>
  );
}
