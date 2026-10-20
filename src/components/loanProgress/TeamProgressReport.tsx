import { useLoanProgress } from '../../hooks/useLoanProgress';
import { progressNumber, summarizeProgress } from '../../lib/loanProgress';
import { PROGRESS_STAGES } from '../../types/loanProgress';
import { KpiCard } from '../ui/KpiCard';
import { ErrorState, LoadingState } from '../ui/FeedbackStates';
import { ProgressTable } from './ProgressTable';

export function TeamProgressReport({month,teamId,ytd}:{month:string;teamId:string;ytd:boolean}) {
  const report = useLoanProgress(month,[],ytd,teamId);
  const total = summarizeProgress(report.rows);
  return <section className="space-y-4" aria-label="Báo cáo tiến độ hồ sơ">
    <h2 className="text-base font-bold text-ink px-3">Báo cáo tiến độ hồ sơ</h2>
    {report.error ? <ErrorState message={report.error} onRetry={report.reload} />
      : report.loading ? <LoadingState text="Đang tải tiến độ hồ sơ…" /> : <>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {([['Amount','Số tiền hồ sơ'],['Cards','Thẻ'],['Fees','Phí'],['Insurance','Bảo hiểm']] as const).map(([key,label])=>
            <KpiCard key={key} label={key==='Cards' ? label : `${label} (VND)`} value={progressNumber(total[key])} />)}
        </div>
        <div className="px-3">
          <h3 className="text-sm font-semibold text-ink">Tiến độ hồ sơ · {total.count}</h3>
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-x-6 gap-y-3 mt-3">
            {PROGRESS_STAGES.map(stage=><div key={stage} className="flex justify-between gap-3 text-xs border-b border-line/50 pb-2">
              <span className="text-ink-muted">{stage}</span><strong className="text-ink">{report.rows.filter(row=>row.Stage===stage).length}</strong>
            </div>)}
          </div>
        </div>
        <ProgressTable rows={report.rows} showAssignee />
      </>}
  </section>;
}
