import React from 'react';
import { FileSpreadsheet, Loader2 } from 'lucide-react';
import { ReportRail } from '../reports/ReportRail';
import { useReportCenterController } from '../../hooks/useReportCenterController';
import { REPORTS } from '../../lib/reports/registry';
import { DUE_BUCKET_LABELS, type DueBucketFilter } from '../../lib/reports/dueBucket';
import { UI } from '../../lib/uiClasses';

const BO_LOC: { value: DueBucketFilter; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'overdue', label: DUE_BUCKET_LABELS.overdue },
  { value: 'due', label: DUE_BUCKET_LABELS.due },
  { value: 'upcoming', label: DUE_BUCKET_LABELS.upcoming },
];

export const ReportCenterView: React.FC = () => {
  const { selected, toggle, filter, setFilter, exporting, error, exportSelected } =
    useReportCenterController();

  const daChon = REPORTS.filter(r => selected.includes(r.id));

  return (
    <div className="flex flex-col lg:flex-row gap-4 text-xs">
      <ReportRail selected={selected} onToggle={toggle} />

      <section className={`${UI.containerCardBg} rounded-xl p-4 flex-1 min-w-0 space-y-4`}>
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-accent" />
          <h1 className="text-sm font-bold tracking-tight text-ink">TRUNG TÂM BÁO CÁO EXCEL</h1>
        </div>

        <div>
          <div className="mb-1.5 text-[11px] font-bold text-ink-faint">Kỳ hạn</div>
          <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Lọc kỳ hạn">
            {BO_LOC.map(o => (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={filter === o.value}
                onClick={() => setFilter(o.value)}
                className={`px-3 py-1.5 rounded-lg border text-xs transition-colors ${
                  filter === o.value
                    ? 'border-accent bg-panel-muted font-bold text-ink'
                    : 'border-line text-ink-muted hover:text-ink'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <table className="w-full border-collapse">
          <thead>
            <tr className="text-left text-[11px] text-ink-faint border-b border-line">
              <th className="py-1.5 pr-3 font-semibold">Báo cáo</th>
              <th className="py-1.5 font-semibold">Căn cứ kỳ hạn</th>
            </tr>
          </thead>
          <tbody>
            {daChon.length === 0 ? (
              <tr>
                <td colSpan={2} className="py-3 text-ink-muted">Chưa chọn báo cáo nào.</td>
              </tr>
            ) : (
              daChon.map(r => (
                <tr key={r.id} className="border-b border-line/60">
                  <td className="py-1.5 pr-3 text-ink">{r.name}</td>
                  <td className="py-1.5 text-ink-muted">
                    {r.supportsDueFilter ? r.dueFieldLabel : 'Không lọc — xuất toàn danh mục'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {error && (
          <div role="alert" className="rounded-lg border border-line px-3 py-2 text-ink">
            {error}
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={exportSelected}
            disabled={selected.length === 0 || exporting}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {exporting && <Loader2 className="w-4 h-4 animate-spin" />}
            Xuất Excel
          </button>
        </div>
      </section>
    </div>
  );
};
