import { Banknote, Building2, CreditCard, Landmark, ReceiptText, Users, Wallet } from 'lucide-react';
import { KpiCard, type KpiHue } from '../ui/KpiCard';
import { formatKpiAmount, formatKpiCompletion } from '../../lib/kpiDashboard';
import type { KpiDashboardCard } from '../../types/kpiDashboard';

const metrics = {
  net_loan:{ icon:Banknote,hue:'accent' },
  net_term_deposit:{ icon:Landmark,hue:'collateral' },
  net_casa:{ icon:Wallet,hue:'cust' },
  new_customers:{ icon:Users,hue:'cust' },
  service_fees:{ icon:ReceiptText,hue:'pos' },
  loan_balance:{ icon:Building2,hue:'accent' },
  credit_cards:{ icon:CreditCard,hue:'card' },
} satisfies Record<string,{ icon:typeof Banknote; hue:KpiHue }>;

export function TeamKpiSummaryCards({ cards }: { cards:KpiDashboardCard[] }) {
  return <section aria-label="Các chỉ tiêu KPI" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-12 gap-3 2xl:gap-4">
    {cards.map((card,index) => {
      const style = metrics[card.definition.Code as keyof typeof metrics] ?? metrics.net_loan;
      const value = formatKpiAmount(card.actual,card.definition.Unit);
      const target = formatKpiAmount(card.target,card.definition.Unit);
      return <div key={card.definition.Code} className={`${index<4 ? 'xl:col-span-3' : 'xl:col-span-4'} [&>div]:h-full`}>
        <KpiCard label={card.definition.Name} icon={style.icon} hue={style.hue}
          value={<>{value.value}{value.unit && <>{' '}<span className="text-xs font-medium text-ink-faint">{value.unit}</span></>}</>}
          subtext={<div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span>Kế hoạch: {target.value}{target.unit && ` ${target.unit}`}</span>
              <span className="font-semibold text-ink">{formatKpiCompletion(card.completion)}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-panel-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-accent" style={{ width:`${Math.max(0,Math.min(100,card.completion ?? 0))}%` }} />
            </div>
          </div>} />
      </div>;
    })}
  </section>;
}
