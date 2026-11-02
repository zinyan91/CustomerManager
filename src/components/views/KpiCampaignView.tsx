import { CalendarRange } from 'lucide-react';
import { useKpiCampaign } from '../../hooks/useKpiCampaign';
import { KpiCampaignControls } from '../kpiCampaign/KpiCampaignControls';
import { KpiCampaignSummary } from '../kpiCampaign/KpiCampaignSummary';
import { KpiCampaignTable } from '../kpiCampaign/KpiCampaignTable';
import { KpiForecastBonus } from '../kpiForecast/KpiForecastBonus';

export function KpiCampaignView() {
  const kpi = useKpiCampaign();
  return (
    <div className="w-full space-y-4 pb-8 text-ink">
      <div className="flex items-center gap-2.5 border-b border-line/60 p-3">
        <span className="rounded-[var(--r-control)] bg-accent-soft p-2 text-accent">
          <CalendarRange className="h-4 w-4" />
        </span>
        <h1 className="text-base font-bold tracking-tight text-ink sm:text-lg">KPI theo đợt</h1>
      </div>
      {kpi.campaign && kpi.result
        ? <>
            <KpiCampaignControls campaigns={kpi.campaigns} campaign={kpi.campaign} inputs={kpi.inputs}
              onCampaignChange={kpi.setCampaignId} onRankChange={kpi.setRank} onRegionChange={kpi.setRegion}
              onTenureChange={kpi.setTenureMonths} onRatingChange={kpi.setRating} />
            <KpiCampaignSummary result={kpi.result} />
            <KpiCampaignTable result={kpi.result} onActualChange={kpi.setActual} onFeeChange={kpi.setFee} />
            <KpiForecastBonus result={kpi.result} rank={kpi.inputs.rank} />
          </>
        : <p className="px-3 text-sm text-ink-muted">Chưa có đợt KPI nào.</p>}
    </div>
  );
}
