import { ClipboardList } from 'lucide-react';
import { useLoanProgress } from '../../hooks/useLoanProgress';
import { progressNumber, summarizeProgress } from '../../lib/loanProgress';
import { PROGRESS_STAGES } from '../../types/loanProgress';
import { Panel, PanelHeader } from '../ui/Panel';
import { ErrorState, LoadingState } from '../ui/FeedbackStates';
import { ProgressTable } from './ProgressTable';

const TOTALS = [['Amount', 'Số tiền hồ sơ (VND)'], ['Cards', 'Thẻ'], ['Fees', 'Phí (VND)'], ['Insurance', 'Bảo hiểm (VND)']] as const;

export function TeamProgressReport({month,teamId,ytd}:{month:string;teamId:string;ytd:boolean}) {
  const report = useLoanProgress(month,[],ytd,teamId);
  const total = summarizeProgress(report.rows);
  return <Panel role="region" aria-label="Báo cáo tiến độ hồ sơ">
    <PanelHeader title={`Báo cáo tiến độ hồ sơ${report.loading || report.error ? '' : ` · ${total.count}`}`} icon={<ClipboardList className="w-4 h-4" />} bordered />
    <div className="mt-4 space-y-4">
      {report.error ? <ErrorState message={report.error} onRetry={report.reload} />
        : report.loading ? <LoadingState text="Đang tải tiến độ hồ sơ…" /> : <>
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-px overflow-hidden rounded-[var(--r-control)] border border-line bg-line">
            {TOTALS.map(([key,label])=><div key={key} className="bg-panel px-4 py-3 min-w-0">
              <dt className="text-xs text-ink-muted">{label}</dt>
              <dd className="mt-1 font-mono tabular-nums text-lg font-bold text-ink truncate">{progressNumber(total[key])}</dd>
            </div>)}
          </dl>
          <dl className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-2">
            {PROGRESS_STAGES.map(stage=><div key={stage} className="flex justify-between gap-3 text-xs border-b border-line/50 pb-2">
              <dt className="text-ink-muted">{stage}</dt><dd className="font-semibold text-ink">{report.rows.filter(row=>row.Stage===stage).length}</dd>
            </div>)}
          </dl>
          <ProgressTable rows={report.rows} showAssignee />
        </>}
    </div>
  </Panel>;
}
