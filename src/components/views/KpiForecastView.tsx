import { Calculator } from 'lucide-react';
import { useKpiForecast } from '../../hooks/useKpiForecast';
import { KpiForecastBonus } from '../kpiForecast/KpiForecastBonus';
import { KpiForecastControls } from '../kpiForecast/KpiForecastControls';
import { KpiForecastSummary } from '../kpiForecast/KpiForecastSummary';
import { KpiForecastTable } from '../kpiForecast/KpiForecastTable';

export function KpiForecastView() {
  const forecast = useKpiForecast();
  return (
    <div className="w-full space-y-4 pb-8 text-ink">
      <div className="flex items-center gap-2.5 border-b border-line/60 p-3">
        <span className="rounded-[var(--r-control)] bg-accent-soft p-2 text-accent">
          <Calculator className="h-4 w-4" />
        </span>
        <h1 className="text-base font-bold tracking-tight text-ink sm:text-lg">Dự báo KPI RBO, CSO</h1>
      </div>
      <KpiForecastControls inputs={forecast.inputs} onRankChange={forecast.setRank}
        onRegionChange={forecast.setRegion} onTenureChange={forecast.setTenureMonths} />
      <KpiForecastSummary result={forecast.result} />
      <KpiForecastTable result={forecast.result} onActualChange={forecast.setActual} onFeeChange={forecast.setFee} />
      <KpiForecastBonus result={forecast.result} rank={forecast.inputs.rank} />
    </div>
  );
}
