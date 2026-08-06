import React, { useState, useEffect } from 'react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtDate, fmtMoney, fmtRate } from '../../lib/utils';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import {
  paidPrincipalOf, computeSchedulePenalty, isScheduleFullySettled, schedulePaymentStatus,
} from '../../lib/loanMath';
import { PeriodDetailCard } from './PeriodDetailCard';
import { useLang } from '../../context/LanguageContext';

type Density = 'cozy' | 'compact';

interface ScheduleTabProps {
  contracts: LoanContract[];
  selectedContract: LoanContract | null;
  handleSelectContract: (c: LoanContract) => void;
  schedules: RepaymentSchedule[];
  openPaymentModal: (s: RepaymentSchedule) => void;
}

const DENSITY_KEY = 'schedule_density';

const num = (v: number) => (v > 0 ? v.toLocaleString('vi-VN') : '–');

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  contracts, selectedContract, handleSelectContract, schedules, openPaymentModal,
}) => {
  const { t } = useLang();
  const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(null);
  const [density, setDensity] = useState<Density>(
    () => (localStorage.getItem(DENSITY_KEY) === 'compact' ? 'compact' : 'cozy')
  );

  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, density);
  }, [density]);

  useEffect(() => {
    if (schedules && schedules.length > 0) {
      const overdueOrUnpaid = schedules.find(s => !isScheduleFullySettled(s)) || schedules[0];
      setSelectedScheduleId(overdueOrUnpaid.Id);
    } else {
      setSelectedScheduleId(null);
    }
  }, [selectedContract?.Id, schedules]);

  const getPenaltyForSchedule = (s: RepaymentSchedule) => {
    if (isScheduleFullySettled(s)) return s.OverdueInterestAmount || 0;
    return computeSchedulePenalty(
      s,
      getEffectiveActiveRate(selectedContract, s.DueDate)
    ).principalPenalty;
  };

  const totalPenaltySum = schedules.reduce((a, s) => a + getPenaltyForSchedule(s), 0);
  const selectedScheduleObj = schedules.find(s => s.Id === selectedScheduleId) || null;
  const settledCount = schedules.filter(isScheduleFullySettled).length;

  const cell = 'px-[var(--row-px)] py-[var(--row-py)] whitespace-nowrap';
  const headCell = 'px-[var(--row-px)] py-2 text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-faint whitespace-nowrap';

  return (
    <div className="space-y-3" data-density={density}>
      <div className="bg-panel border border-line rounded-lg p-4">
        <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint mb-2.5">
          {t('schedule.contracts')}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {contracts.map(c => {
            const isCurrent = selectedContract?.Id === c.Id;
            return (
              <button
                key={c.Id}
                onClick={() => handleSelectContract(c)}
                aria-pressed={isCurrent}
                className={`px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                  isCurrent
                    ? 'bg-accent text-accent-ink border-accent'
                    : 'bg-panel text-ink-muted border-line hover:border-line-strong hover:text-ink'
                }`}
              >
                <span className="font-mono">{c.ContractNumber}</span>
                <span className="opacity-70"> · {fmtMoney(c.LoanAmount || c.ContractAmount)}</span>
              </button>
            );
          })}
        </div>

        {selectedContract && (
          <dl className="grid grid-cols-2 md:grid-cols-5 gap-x-6 gap-y-3 mt-4 pt-4 border-t border-line">
            {[
              { k: t('schedule.loanAmount'), v: fmtMoney(selectedContract.LoanAmount || selectedContract.ContractAmount), mono: true },
              { k: t('schedule.activeRate'), v: fmtRate(getEffectiveActiveRate(selectedContract)), mono: true },
              { k: t('schedule.tenor'), v: selectedContract.KunnTenor || `${selectedContract.LoanTenorMonths || 12} ${t('schedule.months')}`, mono: false },
              { k: t('schedule.principalMethod'), v: selectedContract.PrincipalRepaymentMethod || t('schedule.defaultMethod'), mono: false },
              { k: t('schedule.disbursementDate'), v: fmtDate(selectedContract.DisbursementDate || selectedContract.ContractStartDate), mono: true },
            ].map(f => (
              <div key={f.k}>
                <dt className="text-[10px] uppercase tracking-[0.08em] text-ink-faint mb-0.5">{f.k}</dt>
                <dd className={`text-ink font-semibold ${f.mono ? 'font-mono' : 'text-xs'}`}>{f.v}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="bg-panel border border-line rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-faint">
              {t('schedule.title')}
            </span>
            {selectedContract && (
              <span className="font-mono text-ink font-semibold">{selectedContract.ContractNumber}</span>
            )}
            {schedules.length > 0 && (
              <span className="text-xs text-ink-muted">
                <span className="font-mono text-pos">{settledCount}</span>
                <span className="text-ink-faint">/</span>
                <span className="font-mono">{schedules.length}</span> {t('schedule.settledCount')}
              </span>
            )}
          </div>

          <div className="inline-flex rounded-md border border-line overflow-hidden" role="group" aria-label={t('schedule.density')}>
            {(['cozy', 'compact'] as Density[]).map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                aria-pressed={density === d}
                className={`px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
                  density === d ? 'bg-accent-soft text-accent' : 'text-ink-faint hover:text-ink'
                }`}
              >
                {d === 'cozy' ? t('schedule.densityCozy') : t('schedule.densityCompact')}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[460px] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-panel-muted">
              <tr className="border-b border-line">
                <th className={`${headCell} w-9`}><span className="sr-only">{t('schedule.selectPeriod')}</span></th>
                <th className={`${headCell} text-right w-14`}>{t('schedule.period')}</th>
                <th className={headCell}>{t('schedule.status')}</th>
                <th className={headCell}>{t('schedule.dueDate')}</th>
                <th className={`${headCell} text-right`}>{t('schedule.overdueDays')}</th>
                <th className={`${headCell} text-right`}>{t('schedule.due')}</th>
                <th className={`${headCell} text-right`}>{t('schedule.unpaid')}</th>
                <th className={headCell}>{t('schedule.paymentDate')}</th>
                <th className={`${headCell} text-right`}>{t('schedule.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {!selectedContract ? (
                <tr><td colSpan={9} className="text-center py-12 text-ink-faint">{t('schedule.emptyNoContract')}</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={9} className="text-center py-12 text-ink-faint">
                  {t('schedule.emptyNoSchedule')}
                </td></tr>
              ) : schedules.map(s => {
                let autoOverdue = 0;
                if (!isScheduleFullySettled(s) && s.DueDate) {
                  const parts = s.DueDate.split('-');
                  if (parts.length === 3) {
                    const due = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    due.setHours(0, 0, 0, 0);
                    const diff = today.getTime() - due.getTime();
                    if (diff > 0) autoOverdue = Math.ceil(diff / (1000 * 60 * 60 * 24));
                  }
                }

                const daThuDu = isScheduleFullySettled(s);
                const paymentStat = schedulePaymentStatus(s);
                const effectiveOverdueDays = daThuDu
                  ? (s.OverdueDays || 0)
                  : ((s.OverdueDays && s.OverdueDays > 0) ? s.OverdueDays : autoOverdue);
                const penaltyAmount = s.OverdueInterestAmount ?? getPenaltyForSchedule(s);
                const isOverdue = effectiveOverdueDays > 0 && !daThuDu;
                const repaymentDueTotal = (s.PrincipalAmount || 0) + (s.InterestAmount || 0) + penaltyAmount;
                const paidTotal = paidPrincipalOf(s) + (daThuDu ? (s.InterestAmount || 0) : paymentStat.collectedInterest) + (daThuDu ? penaltyAmount : 0);
                const repaymentUnpaidTotal = Math.max(0, repaymentDueTotal - paidTotal);
                const isSelectedRow = selectedScheduleId === s.Id;

                const rail = isOverdue ? 'border-l-neg' : daThuDu ? 'border-l-pos' : 'border-l-transparent';

                return (
                  <tr
                    key={s.Id}
                    onClick={() => setSelectedScheduleId(s.Id)}
                    className={`border-b border-line/60 border-l-2 ${rail} cursor-pointer transition-colors duration-150 ${
                      isSelectedRow ? 'bg-accent-soft' : 'hover:bg-panel-muted'
                    }`}
                  >
                    <td className={`${cell} text-center`} onClick={(e) => e.stopPropagation()}>
                      <input
                        type="radio"
                        name="selectedSchedulePeriod"
                        checked={isSelectedRow}
                        onChange={() => setSelectedScheduleId(s.Id)}
                        aria-label={`${t('schedule.viewPeriod')} ${s.PeriodNumber}`}
                        className="w-3.5 h-3.5 accent-accent cursor-pointer align-middle"
                      />
                    </td>
                    <td className={`${cell} text-right font-mono font-semibold text-ink`}>{s.PeriodNumber}</td>
                    <td className={cell}>
                      {daThuDu ? (
                        <span className="inline-flex items-center gap-1.5 text-pos font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-pos" aria-hidden="true" />
                          {t('schedule.statusPaid')}
                        </span>
                      ) : isOverdue ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-neg text-surface font-bold text-[10px] uppercase tracking-[0.06em]">
                          {t('schedule.statusOverdue')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-ink-muted">
                          <span className="w-1.5 h-1.5 rounded-full bg-line-strong" aria-hidden="true" />
                          {t('schedule.statusPending')}
                        </span>
                      )}
                    </td>
                    <td className={`${cell} font-mono text-ink`}>{fmtDate(s.DueDate)}</td>
                    <td className={`${cell} text-right font-mono ${effectiveOverdueDays > 0 ? 'text-neg font-semibold' : 'text-ink-faint'}`}>
                      {effectiveOverdueDays > 0 ? effectiveOverdueDays : '–'}
                    </td>
                    <td className={`${cell} text-right font-mono text-ink`}>{num(repaymentDueTotal)}</td>
                    <td className={`${cell} text-right font-mono ${repaymentUnpaidTotal > 0 ? 'text-neg font-semibold' : 'text-ink-faint'}`}>
                      {num(repaymentUnpaidTotal)}
                    </td>
                    <td className={`${cell} font-mono ${s.PaymentDate ? 'text-ink-muted' : 'text-ink-faint'}`}>
                      {s.PaymentDate ? fmtDate(s.PaymentDate) : '–'}
                    </td>
                    <td className={`${cell} text-right`} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openPaymentModal(s);
                        }}
                        className="px-2 py-1 rounded-md border border-line text-ink-muted text-[11px] font-semibold hover:border-accent hover:text-accent transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                      >
                        {t('schedule.record')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {schedules.length > 0 && (
              <tfoot className="sticky bottom-0 bg-panel-muted">
                <tr className="border-t border-line-strong">
                  <td className={`${cell} text-[10px] font-semibold uppercase tracking-[0.09em] text-ink-faint`} colSpan={5}>
                    {t('schedule.total')}
                  </td>
                  <td className={`${cell} text-right font-mono font-bold text-ink`}>
                    {(schedules.reduce((a, s) => a + (s.PrincipalAmount || 0) + (s.InterestAmount || 0), 0) + totalPenaltySum).toLocaleString('vi-VN')}
                  </td>
                  <td className={`${cell} text-right font-mono font-bold text-neg`}>
                    {schedules.reduce((a, s) => {
                      const penalty = getPenaltyForSchedule(s);
                      const due = (s.PrincipalAmount || 0) + (s.InterestAmount || 0) + penalty;
                      const isPaid = isScheduleFullySettled(s);
                      const pStat = schedulePaymentStatus(s);
                      const paid = paidPrincipalOf(s) + (isPaid ? (s.InterestAmount || 0) : pStat.collectedInterest) + (isPaid ? penalty : 0);
                      return a + Math.max(0, due - paid);
                    }, 0).toLocaleString('vi-VN')}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {selectedContract && (
        <PeriodDetailCard
          selectedContract={selectedContract}
          selectedSchedule={selectedScheduleObj}
        />
      )}
    </div>
  );
};
