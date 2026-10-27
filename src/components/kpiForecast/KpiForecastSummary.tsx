import { Award, Gauge, Target, WalletCards } from 'lucide-react';
import { formatNumberWith } from '../../lib/formatSettings';
import { useFormatSettings } from '../../context/FormatSettingsContext';
import { fmtMoney, fmtPercent } from '../../lib/utils';
import type { KpiForecastResult } from '../../types/kpiForecast';
import { KpiCard } from '../ui/KpiCard';

export function KpiForecastSummary({ result }: { result: KpiForecastResult }) {
  const { formatSettings } = useFormatSettings();
  const formatPoints = (value: number) => formatNumberWith(value, formatSettings.decimalDigits, formatSettings.numberStyle);

  return (
    <section aria-label="Kết quả dự báo KPI" className="grid grid-cols-2 gap-2 px-3 lg:grid-cols-4">
      <KpiCard label="Điểm kế hoạch" value={formatPoints(result.planPoints)} icon={Target} hue="accent" />
      <KpiCard label="Điểm thực hiện" value={formatPoints(result.actualPoints)} icon={Gauge} hue="cust" />
      <KpiCard label="Hoàn thành KPI" value={fmtPercent(result.completion, '0%')} icon={Award} hue={result.completion >= 1 ? 'pos' : 'warn'} />
      <KpiCard label="Thưởng dự kiến" value={fmtMoney(result.bonus)} icon={WalletCards} hue="card" />
    </section>
  );
}
