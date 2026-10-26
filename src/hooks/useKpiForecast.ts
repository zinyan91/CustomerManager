import { useMemo, useState } from 'react';
import { calculateKpiForecast, createKpiForecastInputs } from '../lib/kpiForecast';
import type {
  KpiForecastFeeId,
  KpiForecastInputs,
  KpiForecastMetricId,
  KpiForecastRank,
  KpiForecastRegion,
} from '../types/kpiForecast';

export function useKpiForecast() {
  const [inputs, setInputs] = useState<KpiForecastInputs>(createKpiForecastInputs);
  const result = useMemo(() => calculateKpiForecast(inputs), [inputs]);

  const setRank = (rank: KpiForecastRank) => setInputs(current => ({ ...current, rank }));
  const setRegion = (region: KpiForecastRegion) => setInputs(current => ({ ...current, region }));
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

  return { inputs, result, setRank, setRegion, setTenureMonths, setActual, setFee };
}
