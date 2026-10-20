import { useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { useAlertReports } from '../../hooks/useAlertReports';
import { useReportCenterController } from '../../hooks/useReportCenterController';
import { AlertReportWorkspace } from '../reports/AlertReportWorkspace';
import { ReportSummaryWorkspace } from '../reports/ReportSummaryWorkspace';

export function ReportCenterView() {
  const [tab,setTab]=useState<'alerts'|'summary'>('alerts');
  const alerts=useAlertReports();
  const summary=useReportCenterController();
  return <div data-workspace-page className="text-xs min-w-0 bg-panel">
    <header className="px-4 py-4 border-b border-line flex items-center gap-2">
      <FileSpreadsheet className="w-5 h-5 text-ink-muted" />
      <h1 className="text-base font-semibold text-ink">Báo cáo Excel</h1>
    </header>
    <div role="tablist" aria-label="Nhóm báo cáo" className="flex border-b border-line">
      {([{id:'alerts',label:'Theo dõi đến hạn'},{id:'summary',label:'Danh mục & tổng hợp'}] as const).map(item=>
        <button key={item.id} type="button" role="tab" id={`report-tab-${item.id}`} aria-selected={tab===item.id}
          aria-controls={`report-panel-${item.id}`} onClick={()=>setTab(item.id)}
          onKeyDown={e=>{if(e.key==='ArrowLeft'||e.key==='ArrowRight'){e.preventDefault();setTab(tab==='alerts'?'summary':'alerts');document.getElementById(`report-tab-${tab==='alerts'?'summary':'alerts'}`)?.focus();}}}
          tabIndex={tab===item.id?0:-1}
          className={`px-4 py-3 text-xs border-b-2 focus-visible:outline-2 focus-visible:outline-accent ${tab===item.id?'border-accent text-ink font-semibold':'border-transparent text-ink-muted hover:bg-surface'}`}>
          {item.label}
        </button>)}
    </div>
    <div role="tabpanel" id={`report-panel-${tab}`} aria-labelledby={`report-tab-${tab}`}>
      {tab==='alerts'?<AlertReportWorkspace ctrl={alerts} />:<ReportSummaryWorkspace ctrl={summary} portfolio={alerts} />}
    </div>
  </div>;
}
