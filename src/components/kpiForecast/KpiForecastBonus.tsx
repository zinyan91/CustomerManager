import { formatNumberWith } from '../../lib/formatSettings';
import { useFormatSettings } from '../../context/FormatSettingsContext';
import { fmtMoney, fmtPercent } from '../../lib/utils';
import type { KpiForecastRank, KpiForecastResult } from '../../types/kpiForecast';

export function KpiForecastBonus({ result, rank }: { result: KpiForecastResult; rank: KpiForecastRank }) {
  const { formatSettings } = useFormatSettings();
  const growthLabel = rank.startsWith('RBO') ? 'Tăng ròng dư nợ' : 'Tăng ròng huy động CKH';
  const formatPoints = (value: number) => formatNumberWith(value, formatSettings.decimalDigits, formatSettings.numberStyle);
  return (
    <section aria-labelledby="kpi-forecast-bonus-title" className="border-y border-line bg-panel">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2">
        <h2 id="kpi-forecast-bonus-title" className="text-sm font-semibold text-ink">Thưởng kinh doanh dự kiến</h2>
        <span className="text-xs text-ink-muted">{growthLabel}: {fmtPercent(result.growthCompletion, '0%')}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] border-collapse text-xs">
          <thead className="bg-panel-muted/55 text-ink-muted">
            <tr className="border-b border-line">
              <th className="px-3 py-2 text-left font-medium">Bậc</th>
              <th className="px-3 py-2 text-right font-medium">Điểm tính thưởng</th>
              <th className="px-3 py-2 text-right font-medium">Đơn giá</th>
              <th className="px-3 py-2 text-right font-medium">Thưởng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/65">
            {result.bonusTiers.map(tier => (
              <tr key={tier.id}>
                <td className="px-3 py-2 text-ink">{tier.label}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{formatPoints(tier.points)}</td>
                <td className="px-3 py-2 text-right font-mono tabular-nums">{fmtMoney(tier.rate)}</td>
                <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums">{fmtMoney(tier.amount)}</td>
              </tr>
            ))}
            <tr className="bg-panel-muted/65 font-semibold text-ink">
              <td className="px-3 py-2">TỔNG CỘNG</td>
              <td className="px-3 py-2" colSpan={2} />
              <td className="px-3 py-2 text-right font-mono tabular-nums text-accent">{fmtMoney(result.bonus)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="border-t border-line px-3 py-2 text-xs text-ink-muted">
        Chưa bao gồm điều kiện tăng trưởng, ràng buộc của TTKD, mức thưởng tối đa và KPIs điểm trừ.
      </div>
    </section>
  );
}
