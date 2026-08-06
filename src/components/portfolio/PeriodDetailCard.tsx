import React from 'react';
import type { RepaymentSchedule, LoanContract } from '../../types';
import { periodObligation } from '../../lib/scheduleView';
import { fmtDate } from '../../lib/utils';
import { useLang } from '../../context/LanguageContext';
import { PANEL, SECTION_LABEL, TABLE_CELL, TABLE_HEAD } from '../../lib/uiClasses';

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
      <div className={`${PANEL} px-4 py-8 text-center text-ink-faint text-xs`}>
        {t('period.empty')}
      </div>
    );
  }

  const o = periodObligation(selectedSchedule, selectedContract);

  const rows = [
    { key: 'principal', label: t('period.rowPrincipal'), ...o.principal },
    { key: 'interest', label: t('period.rowInterest'), ...o.interest },
    { key: 'penalty', label: t('period.rowPenalty'), ...o.penalty },
  ];

  const cell = `${TABLE_CELL} whitespace-nowrap`;
  const headCell = `px-[var(--row-px)] py-2 ${TABLE_HEAD} font-semibold whitespace-nowrap`;

  return (
    <div className={`${PANEL} overflow-hidden`}>
      <div className="px-4 py-3 border-b border-line flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <span className={`${SECTION_LABEL}`}>
          {t('schedule.period')}
        </span>
        <span className="font-mono num-lead text-ink font-bold">
          {selectedSchedule.PeriodNumber}
        </span>
        <span className="text-xs text-ink-muted">
          {t('period.dueOn')} <span className="font-mono text-ink">{fmtDate(selectedSchedule.DueDate)}</span>
        </span>
        {o.isOverdue && (
          <span className="ml-auto inline-flex items-center px-1.5 py-0.5 rounded bg-neg text-surface font-bold text-[10px] uppercase tracking-[0.06em]">
            {t('period.overdueBadge', { days: o.overdueDays })}
          </span>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-panel-muted">
            <tr className="border-b border-line">
              <th className={headCell}>{t('period.elements')}</th>
              <th className={`${headCell} text-right`}>{t('period.colDue')}</th>
              <th className={`${headCell} text-right`}>{t('period.colPaid')}</th>
              <th className={`${headCell} text-right`}>{t('period.colUnpaid')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const isEmpty = r.due === 0 && r.paid === 0;
              return (
                <tr key={r.key} className="border-b border-line/60">
                  <td className={`${cell} ${isEmpty ? 'text-ink-faint' : 'text-ink'}`}>{r.label}</td>
                  <td className={`${cell} text-right font-mono ${isEmpty ? 'text-ink-faint' : 'text-ink'}`}>
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
          <tfoot className="bg-panel-muted">
            <tr className="border-t border-line-strong">
              <td className={`${cell} ${TABLE_HEAD} font-semibold`}>
                {t('period.rowTotal')}
              </td>
              <td className={`${cell} text-right font-mono font-bold text-ink`}>{money(o.total.due)}</td>
              <td className={`${cell} text-right font-mono font-bold ${o.total.paid > 0 ? 'text-pos' : 'text-ink-faint'}`}>
                {money(o.total.paid)}
              </td>
              <td className={`${cell} text-right font-mono font-bold ${o.total.unpaid > 0 ? 'text-neg' : 'text-ink-faint'}`}>
                {money(o.total.unpaid)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
