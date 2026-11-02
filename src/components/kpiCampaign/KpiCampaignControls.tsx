import { useState } from 'react';
import { formatNumberWith, parseNumberWith } from '../../lib/formatSettings';
import { useFormatSettings } from '../../context/FormatSettingsContext';
import { KPI_FORECAST_REGIONS, type KpiForecastRank, type KpiForecastRegion } from '../../types/kpiForecast';
import type { KpiCampaign, KpiCampaignInputs, KpiRatingId } from '../../types/kpiCampaign';
import { Input, Select } from '../ui/Field';

const LABEL = 'space-y-1 text-[length:var(--fs-label)] font-medium text-ink-muted';

export function KpiCampaignControls({
  campaigns,
  campaign,
  inputs,
  onCampaignChange,
  onRankChange,
  onRegionChange,
  onTenureChange,
  onRatingChange,
}: {
  campaigns: readonly KpiCampaign[];
  campaign: KpiCampaign;
  inputs: KpiCampaignInputs;
  onCampaignChange: (id: string) => void;
  onRankChange: (rank: KpiForecastRank) => void;
  onRegionChange: (region: KpiForecastRegion) => void;
  onTenureChange: (months: number) => void;
  onRatingChange: (rating: KpiRatingId) => void;
}) {
  const { formatSettings } = useFormatSettings();
  const [tenureDraft, setTenureDraft] = useState<string | null>(null);

  return (
    <div className="workspace-toolbar grid gap-2 border-y border-line bg-surface px-3 py-2 sm:grid-cols-2 lg:grid-cols-5">
      <label className={LABEL}>
        <span className="block">Đợt</span>
        <Select value={campaign.id} onChange={event => onCampaignChange(event.target.value)}>
          {campaigns.map(item => <option key={item.id} value={item.id}>{item.name} ({item.documentNumber})</option>)}
        </Select>
      </label>
      <label className={LABEL}>
        <span className="block">Cấp bậc</span>
        <Select value={inputs.rank} onChange={event => onRankChange(event.target.value as KpiForecastRank)}>
          {campaign.ranks.map(rank => <option key={rank} value={rank}>{campaign.rankLabels[rank]}</option>)}
        </Select>
      </label>
      <label className={LABEL}>
        <span className="block">Xếp loại theo QĐ 1799/2026</span>
        <Select value={inputs.rating} onChange={event => onRatingChange(event.target.value as KpiRatingId)}>
          {campaign.ratings.map(rating => <option key={rating.id} value={rating.id}>{rating.label}</option>)}
        </Select>
      </label>
      <label className={LABEL}>
        <span className="block">Khu vực làm việc</span>
        <Select value={inputs.region} onChange={event => onRegionChange(event.target.value as KpiForecastRegion)}>
          {KPI_FORECAST_REGIONS.map(region => <option key={region} value={region}>{region}</option>)}
        </Select>
      </label>
      <label className={LABEL}>
        <span className="block">Thâm niên chính thức (tháng)</span>
        <Input type="text" inputMode="numeric"
          value={tenureDraft ?? (inputs.tenureMonths === 0 ? '' : formatNumberWith(inputs.tenureMonths, 0, formatSettings.numberStyle))}
          className="kpi-forecast-number-input"
          onChange={event => {
            setTenureDraft(event.target.value);
            onTenureChange(Math.max(0, Math.trunc(parseNumberWith(event.target.value, formatSettings.numberStyle))));
          }}
          onBlur={() => setTenureDraft(null)} />
      </label>
    </div>
  );
}
