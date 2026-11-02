import { Award, Gauge, Sparkles, Target, WalletCards } from 'lucide-react';
import { formatNumberWith } from '../../lib/formatSettings';
import { useFormatSettings } from '../../context/FormatSettingsContext';
import { fmtMoney, fmtPercent } from '../../lib/utils';
import type { KpiCampaignResult } from '../../types/kpiCampaign';
import { KpiCard } from '../ui/KpiCard';

export function KpiCampaignSummary({ result }: { result: KpiCampaignResult }) {
  const { formatSettings } = useFormatSettings();
  const formatPoints = (value: number) => formatNumberWith(value, formatSettings.decimalDigits, formatSettings.numberStyle);

  return (
    <section aria-label="Kết quả KPI theo đợt" className="grid grid-cols-2 gap-2 px-3 lg:grid-cols-5">
      <KpiCard label="Điểm kế hoạch" value={formatPoints(result.planPoints)} icon={Target} hue="accent" />
      <KpiCard label="Điểm theo QĐ 1799" value={formatPoints(result.basePoints)} icon={Gauge} hue="cust" />
      <KpiCard label="Điểm sau hệ số" value={formatPoints(result.campaignPoints)} icon={Sparkles} hue="cust" />
      <KpiCard label="Hoàn thành ghi nhận" value={fmtPercent(result.completion, '0%')} icon={Award} hue={result.completion >= 1 ? 'pos' : 'warn'} />
      <KpiCard label="Thưởng dự kiến" value={fmtMoney(result.bonus)} icon={WalletCards} hue="card" />
    </section>
  );
}
