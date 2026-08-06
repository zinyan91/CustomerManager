import React from 'react';
import type { RepaymentSchedule, LoanContract } from '../../types';
import { paidPrincipalOf, isScheduleFullySettled, computeSchedulePenalty, schedulePaymentStatus } from '../../lib/loanMath';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { fmtDate } from '../../lib/utils';
import { useLang } from '../../context/LanguageContext';

interface PeriodDetailCardProps {
  selectedContract: LoanContract | null;
  selectedSchedule: RepaymentSchedule | null;
}

const money = (v: number) => (v > 0 ? v.toLocaleString('vi-VN') : '–');

export const PeriodDetailCard: React.FC<PeriodDetailCardProps> = ({
  selectedContract,
  selectedSchedule,
}) => {
  const { t } = useLang();

  if (!selectedSchedule) {
    return (
      <div className="bg-panel border border-line rounded-lg px-4 py-8 text-center text-ink-faint text-xs">
        {t('period.empty')}
      </div>
    );
  }

  const isSettled = isScheduleFullySettled(selectedSchedule);
  const paymentStatus = schedulePaymentStatus(selectedSchedule);

  const duePrincipal = selectedSchedule.PrincipalAmount || 0;
  const paidPrincipal = paidPrincipalOf(selectedSchedule);
  const unpaidPrincipal = Math.max(0, duePrincipal - paidPrincipal);

  const dueInterest = selectedSchedule.InterestAmount || 0;
  const paidInterest = isSettled ? dueInterest : paymentStatus.collectedInterest;
  const unpaidInterest = Math.max(0, dueInterest - paidInterest);

  const penaltyAmount = selectedSchedule.OverdueInterestAmount ?? (
    isSettled ? 0 : computeSchedulePenalty(
      selectedSchedule,
      getEffectiveActiveRate(selectedContract, selectedSchedule.DueDate)
    ).principalPenalty
  );
  const paidPenalty = isSettled ? (selectedSchedule.OverdueInterestAmount || 0) : 0;
  const unpaidPenalty = Math.max(0, penaltyAmount - paidPenalty);

  const components = [
    { key: 'principal', label: t('period.compPrincipal'), due: duePrincipal, paid: paidPrincipal, unpaid: unpaidPrincipal },
    { key: 'interest', label: t('period.compInterest'), due: dueInterest, paid: paidInterest, unpaid: unpaidInterest },
    { key: 'penalty', label: t('period.compPenalty'), due: penaltyAmount, paid: paidPenalty, unpaid: unpaidPenalty },
  ];

  const totalDue = components.reduce((a, c) => a + c.due, 0);
  const totalPaid = components.reduce((a, c) => a + c.paid, 0);
  const totalUnpaid = Math.max(0, totalDue - totalPaid);
  const activeComponents = components.filter(c => c.due > 0);

  const rows = [
    { key: 'total', label: t('period.rowTotal'), due: totalDue, paid: totalPaid, unpaid: totalUnpaid, isTotal: true },
    { key: 'principal', label: t('period.rowPrincipal'), due: duePrincipal, paid: paidPrincipal, unpaid: unpaidPrincipal },
    { key: 'interest', label: t('period.rowInterest'), due: dueInterest, paid: paidInterest, unpaid: unpaidInterest },
    { key: 'penalty', label: t('period.rowPenalty'), due: penaltyAmount, paid: paidPenalty, unpaid: unpaidPenalty },
  ];

  const cell = 'px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap';
  const headCell = 'px-[var(--row-px)] py-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-faint whitespace-nowrap';

  return (
    <div className="bg-panel border border-line rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-end justify-between gap-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">{t('schedule.period')}</span>
          <span className="font-mono text-ink font-bold text-[calc(var(--fs-heading)*1.4)] leading-none">
            {selectedSchedule.PeriodNumber}
          </span>
          <span className="text-xs text-ink-muted">
            {t('period.dueOn')} <span className="font-mono text-ink">{fmtDate(selectedSchedule.DueDate)}</span>
          </span>
        </div>

        {totalDue > 0 && (
          <div className="w-full sm:w-[340px]">
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-faint">
                {t('period.recovery')}
              </span>
              <span className="font-mono text-xs text-ink">
                {Math.round((totalPaid / totalDue) * 100)}%
              </span>
            </div>
            <div className="flex gap-px h-2 rounded-sm overflow-hidden bg-panel-muted" role="img"
              aria-label={t('period.recoveryAria', {
                paid: totalPaid.toLocaleString('vi-VN'),
                due: totalDue.toLocaleString('vi-VN'),
                period: selectedSchedule.PeriodNumber,
              })}>
              {activeComponents.map(c => (
                <div key={c.key} className="flex" style={{ width: `${(c.due / totalDue) * 100}%` }}>
                  <div className={`h-full ${c.key === 'penalty' ? 'bg-neg' : 'bg-pos'}`} style={{ width: `${(c.paid / c.due) * 100}%` }} />
                  <div className={`h-full ${c.key === 'penalty' ? 'bg-neg/25' : 'bg-line-strong/60'}`} style={{ width: `${(c.unpaid / c.due) * 100}%` }} />
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
              {activeComponents.map(c => (
                <span key={c.key} className="text-[10px] text-ink-faint">
                  {c.label} <span className="font-mono text-ink-muted">{Math.round((c.due / totalDue) * 100)}%</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-panel-muted">
            <tr className="border-b border-line">
              <th className={`${headCell} min-w-[220px]`}>{t('period.elements')}</th>
              <th className={`${headCell} text-right w-[150px]`}>{t('period.colDue')}</th>
              <th className={`${headCell} text-right w-[150px]`}>{t('period.colPaid')}</th>
              <th className={`${headCell} text-right w-[150px]`}>{t('period.colUnpaid')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isEmpty = r.due === 0 && r.paid === 0 && r.unpaid === 0;
              return (
                <tr
                  key={r.key}
                  className={`border-b border-line/60 ${r.isTotal ? 'bg-panel-muted' : ''} ${isEmpty ? 'text-ink-faint' : ''}`}
                >
                  <td className={`${cell} ${r.isTotal ? 'font-bold text-ink' : isEmpty ? '' : 'text-ink'}`}>
                    {r.label}
                  </td>
                  <td className={`${cell} text-right font-mono ${r.isTotal ? 'font-bold text-ink' : isEmpty ? '' : 'text-ink'}`}>
                    {money(r.due)}
                  </td>
                  <td className={`${cell} text-right font-mono ${r.paid > 0 ? 'text-pos font-semibold' : 'text-ink-faint'}`}>
                    {money(r.paid)}
                  </td>
                  <td className={`${cell} text-right font-mono ${r.unpaid > 0 ? 'text-neg font-semibold' : 'text-ink-faint'}`}>
                    {money(r.unpaid)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
