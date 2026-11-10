import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useAlertReports } from '../../hooks/useAlertReports';
import { useReportCenterController } from '../../hooks/useReportCenterController';
import { WorkspacePageHeader } from '../ui/WorkspacePageHeader';
import { AlertReportWorkspace } from '../reports/AlertReportWorkspace';
import { ReportSummaryWorkspace } from '../reports/ReportSummaryWorkspace';
import { BusinessResultWorkspace } from '../reports/BusinessResultWorkspace';
import { useBusinessResultSheet } from '../../hooks/useBusinessResultSheet';

type ReportTab = 'alerts' | 'summary' | 'kqkd';

const TABS: { id: ReportTab; label: string }[] = [
  { id: 'alerts', label: 'Theo dõi đến hạn' },
  { id: 'summary', label: 'Danh mục & tổng hợp' },
  { id: 'kqkd', label: 'Kết quả kinh doanh' },
];

/** Tab KQKD tự nạp dữ liệu khi mở lần đầu, rồi giữ nguyên để không mất phần đang sửa khi đổi tab. */
function BusinessResultTab() {
  const ctrl = useBusinessResultSheet();
  return <BusinessResultWorkspace ctrl={ctrl} />;
}

export function ReportCenterView() {
  const [tab, setTab] = useState<ReportTab>('alerts');
  const [kqkdOpened, setKqkdOpened] = useState(false);
  const selectTab = (next: ReportTab) => {
    setTab(next);
    if (next === 'kqkd') setKqkdOpened(true);
  };
  const alerts = useAlertReports();
  const summary = useReportCenterController();
  return (
    <div data-workspace-page className="text-xs min-w-0 bg-panel font-app pb-8">
      <WorkspacePageHeader title="Báo cáo Excel" icon={FileSpreadsheet} />
      <div
        role="tablist"
        aria-label="Nhóm báo cáo"
        data-workspace-panel
        className="flex items-center gap-1.5 px-4 py-2 border-b border-line bg-surface"
      >
        {TABS.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            id={`report-tab-${item.id}`}
            aria-selected={tab === item.id}
            aria-controls={`report-panel-${item.id}`}
            onClick={() => selectTab(item.id)}
            onKeyDown={e => {
              if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
                e.preventDefault();
                const step = e.key === 'ArrowRight' ? 1 : -1;
                const next = TABS[(index + step + TABS.length) % TABS.length].id;
                selectTab(next);
                document.getElementById(`report-tab-${next}`)?.focus();
              }
            }}
            tabIndex={tab === item.id ? 0 : -1}
            className={`px-3.5 py-2 rounded-[var(--r-control)] text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent ${
              tab === item.id
                ? 'bg-accent text-accent-ink shadow-2xs'
                : 'text-ink-muted hover:bg-panel hover:text-ink'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {tab !== 'kqkd' && (
        <div role="tabpanel" id={`report-panel-${tab}`} aria-labelledby={`report-tab-${tab}`}>
          {tab === 'alerts' ? (
            <AlertReportWorkspace ctrl={alerts} />
          ) : (
            <ReportSummaryWorkspace ctrl={summary} portfolio={alerts} />
          )}
        </div>
      )}
      {kqkdOpened && (
        <div role="tabpanel" id="report-panel-kqkd" aria-labelledby="report-tab-kqkd" hidden={tab !== 'kqkd'}>
          <BusinessResultTab />
        </div>
      )}
    </div>
  );
}
