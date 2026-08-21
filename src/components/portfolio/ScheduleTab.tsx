import React, { useState, useEffect } from 'react';
import type { LoanContract, RepaymentSchedule } from '../../types';
import { fmtDate, fmtMoney, fmtNumber, fmtRate, todayIso } from '../../lib/utils';
import { getEffectiveActiveRate } from '../../lib/rateResolution';
import { isScheduleFullySettled, isBulletPrincipal, kunnPrincipal, computeOutstandingBalance } from '../../lib/loanMath';
import { periodObligation, sumObligations } from '../../lib/scheduleView';
import { PeriodDetailCard } from './PeriodDetailCard';
import { useLang } from '../../context/LanguageContext';
import { PANEL, SECTION_LABEL, TABLE_CELL } from '../../lib/uiClasses';

type Density = 'cozy' | 'compact';

interface ScheduleTabProps {
  contracts: LoanContract[];
  selectedContract: LoanContract | null;
  handleSelectContract: (c: LoanContract) => void;
  schedules: RepaymentSchedule[];
  openPaymentModal: (s: RepaymentSchedule) => void;
  onQuickSettleAll?: () => void;
}

const DENSITY_KEY = 'schedule_density';

const num = (v: number) => (v > 0 ? fmtNumber(v) : '–');

export const ScheduleTab: React.FC<ScheduleTabProps> = ({
  contracts, selectedContract, handleSelectContract, schedules, openPaymentModal, onQuickSettleAll,
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

  const rows = schedules.map(s => ({ s, o: periodObligation(s, selectedContract) }));
  const grandTotal = sumObligations(rows.map(r => r.o));
  const selectedScheduleObj = schedules.find(s => s.Id === selectedScheduleId) || null;
  const settledCount = rows.filter(r => r.o.isSettled).length;

  const cell = `${TABLE_CELL} whitespace-nowrap`;
  const headCell = `px-[var(--row-px)] py-2.5 bg-surface/90 backdrop-blur-md text-ink-faint text-[10px] uppercase font-bold tracking-[0.11em] whitespace-nowrap`;

  return (
    <div className="space-y-3" data-density={density}>
      <div className={`${PANEL} p-4`}>
        <div className={`${SECTION_LABEL} mb-2.5`}>
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
                <span className="opacity-70"> · {fmtMoney(kunnPrincipal(c))}</span>
              </button>
            );
          })}
        </div>

        {selectedContract && (
          <dl className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-3 mt-4 pt-4 border-t border-line">
            {[
              { k: t('schedule.loanAmount'), v: fmtMoney(kunnPrincipal(selectedContract)), mono: true },
              { k: t('schedule.currentBalance'), v: fmtMoney(computeOutstandingBalance(schedules, selectedContract)), mono: true },
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

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(420px,30rem)] gap-3 items-start">
      <div className={`${PANEL} overflow-hidden`}>
        <div className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-baseline gap-2.5">
            <span className={`${SECTION_LABEL}`}>
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

          <div className="flex items-center gap-2">
            {onQuickSettleAll && (
              <button
                type="button"
                onClick={onQuickSettleAll}
                disabled={!selectedContract || !schedules.some(s => !s.IsPaid && s.DueDate && s.DueDate <= todayIso())}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-all duration-150 flex items-center gap-1.5 ${
                  selectedContract && schedules.some(s => !s.IsPaid && s.DueDate && s.DueDate <= todayIso())
                    ? 'bg-accent text-white border-accent hover:opacity-90 shadow-xs cursor-pointer'
                    : 'bg-panel-muted text-ink-faint border-line opacity-60 cursor-not-allowed'
                }`}
                title={selectedContract && schedules.some(s => !s.IsPaid && s.DueDate && s.DueDate <= todayIso()) ? 'Tự động ghi nhận tất cả các kỳ đến hạn theo đúng ngày đến hạn' : 'Không có kỳ nào đến hạn cần thu'}
              >
                <span className="text-xs">⚡</span>
                <span>Thu nhanh</span>
              </button>
            )}

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
        </div>

        <div className="overflow-x-auto max-h-[min(70vh,640px)] overflow-y-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-surface/90 backdrop-blur-md shadow-2xs">
              <tr className="border-b border-line/80">
                <th className={`${headCell} w-20`}>{t('schedule.period')}</th>
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
                <tr><td colSpan={8} className="text-center py-12 text-ink-faint">{t('schedule.emptyNoContract')}</td></tr>
              ) : schedules.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-ink-faint">
                  {t('schedule.emptyNoSchedule')}
                </td></tr>
              ) : rows.map(({ s, o }) => {
                const daThuDu = o.isSettled;
                const isOverdue = o.isOverdue;
                const effectiveOverdueDays = o.overdueDays;
                const isSelectedRow = selectedScheduleId === s.Id;

                const rail = isOverdue ? 'border-l-neg' : daThuDu ? 'border-l-pos' : 'border-l-transparent';

                return (
                  <tr
                    key={s.Id}
                    onClick={() => setSelectedScheduleId(s.Id)}
                    className={`border-b border-line/40 border-l-2 ${rail} cursor-pointer transition-colors duration-150 ${
                      isSelectedRow ? 'bg-accent-soft/80 font-medium' : 'hover:bg-accent/[0.04]'
                    }`}
                  >
                    <td className={`${cell} font-mono font-semibold text-ink`}>
                      <span className="inline-flex items-center gap-1.5">
                        <input
                          type="radio"
                          name="selectedSchedulePeriod"
                          checked={isSelectedRow}
                          onChange={() => setSelectedScheduleId(s.Id)}
                          onClick={(e) => e.stopPropagation()}
                          aria-label={`${t('schedule.viewPeriod')} ${s.PeriodNumber}`}
                          className="w-3.5 h-3.5 accent-accent cursor-pointer align-middle"
                        />
                        <span>{s.PeriodNumber}</span>
                        {s.PeriodNumber === schedules.length && isBulletPrincipal(selectedContract) && (
                          <span className="px-1 py-0.2 rounded text-[9px] font-sans font-bold bg-accent-soft text-accent border border-accent/30" title="Kỳ đáo hạn / Tất toán gốc KUNN">
                            Đáo hạn
                          </span>
                        )}
                      </span>
                    </td>
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
                    <td className={`${cell} text-right font-mono text-ink`}>{num(o.total.due)}</td>
                    <td className={`${cell} text-right font-mono ${o.total.unpaid > 0 ? 'text-neg font-semibold' : 'text-ink-faint'}`}>
                      {num(o.total.unpaid)}
                    </td>
                    <td className={`${cell} font-mono ${s.PaymentDate ? 'text-ink-muted' : 'text-ink-faint'}`}>
                      {s.PaymentDate ? fmtDate(s.PaymentDate) : '–'}
                    </td>
                    <td
                      className={`${cell} text-right`}
                      onClick={(e) => e.stopPropagation()}
                    >
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
              <tfoot className="sticky bottom-0 bg-surface/95 backdrop-blur-md border-t-2 border-line/80 shadow-md z-10">
                <tr className="border-t border-line-strong font-bold">
                  <td className={`${cell} text-ink-faint uppercase tracking-wider text-[11px]`} colSpan={4}>
                    {t('schedule.total')}
                  </td>
                  <td className={`${cell} text-right font-mono font-bold text-ink`}>
                    {fmtNumber(grandTotal.due)}
                  </td>
                  <td className={`${cell} text-right font-mono font-bold ${grandTotal.unpaid > 0 ? 'text-neg' : 'text-ink-faint'}`}>
                    {fmtNumber(grandTotal.unpaid)}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {selectedContract && (
        <div className="xl:sticky xl:top-[calc(var(--header-h)+0.75rem)]">
          <PeriodDetailCard
            selectedContract={selectedContract}
            selectedSchedule={selectedScheduleObj}
          />
        </div>
      )}
      </div>
    </div>
  );
};
