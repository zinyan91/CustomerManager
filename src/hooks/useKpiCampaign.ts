import { useMemo, useState } from 'react';
import { activeKpiCampaign, calculateKpiCampaign, createKpiCampaignInputs } from '../lib/kpiCampaign';
import { KPI_CAMPAIGNS } from '../lib/kpiCampaigns';
import { todayIso } from '../lib/utils';
import type { KpiCampaign, KpiCampaignInputs, KpiRatingId } from '../types/kpiCampaign';
import type { KpiForecastFeeId, KpiForecastMetricId, KpiForecastRank, KpiForecastRegion } from '../types/kpiForecast';

export function useKpiCampaign(campaigns: readonly KpiCampaign[] = KPI_CAMPAIGNS) {
  const [campaignId, setCampaignIdState] = useState(() => activeKpiCampaign(campaigns, todayIso())?.id ?? null);
  const [inputs, setInputs] = useState<KpiCampaignInputs>(createKpiCampaignInputs);
  const campaign = campaigns.find(item => item.id === campaignId) ?? null;
  const result = useMemo(() => (campaign ? calculateKpiCampaign(campaign, inputs) : null), [campaign, inputs]);

  const setCampaignId = (id: string) => {
    const next = campaigns.find(item => item.id === id);
    if (!next) return;
    setCampaignIdState(id);
    setInputs(current => ({
      ...current,
      rank: next.ranks.includes(current.rank) ? current.rank : next.ranks[0],
      rating: next.ratings.some(rating => rating.id === current.rating) ? current.rating : next.ratings[0].id,
    }));
  };
  const setRank = (rank: KpiForecastRank) => setInputs(current => ({ ...current, rank }));
  const setRegion = (region: KpiForecastRegion) => setInputs(current => ({ ...current, region }));
  const setRating = (rating: KpiRatingId) => setInputs(current => ({ ...current, rating }));
  const setTenureMonths = (tenureMonths: number) => setInputs(current => ({
    ...current,
    tenureMonths: Math.max(0, Math.trunc(tenureMonths || 0)),
  }));
  const setActual = (id: Exclude<KpiForecastMetricId, 'fees'>, value: number) => setInputs(current => ({
    ...current,
    actuals: { ...current.actuals, [id]: Number.isFinite(value) ? value : 0 },
  }));
  const setFee = (id: KpiForecastFeeId, value: number) => setInputs(current => ({
    ...current,
    fees: { ...current.fees, [id]: Number.isFinite(value) ? value : 0 },
  }));

  return { campaigns, campaign, inputs, result, setCampaignId, setRank, setRegion, setRating, setTenureMonths, setActual, setFee };
}
