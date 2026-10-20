import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { selectAlertRows, type AlertReportId, type AlertSnapshot } from '../lib/reports/alertData';
import { buildAlertExport } from '../lib/reports/alertExport';
import { loadAlertSnapshot } from '../lib/reports/alertLoader';
import { buildDueListHtml, openPrintWindow, type DueFilter } from '../lib/dueList';
import { buildXlsx, MIME_XLSX } from '../lib/xlsxWriter';
import { downloadBytes } from '../lib/xlsExport';
import { exportActiveCustomerPortfolioExcel } from '../lib/customerPortfolioExport';
import { todayIso } from '../lib/utils';
import { runWithTimeout } from '../lib/asyncTimeout';
import { reportErrorMessage } from '../lib/reports/errorMessage';

export function useAlertReports() {
  const [snapshot,setSnapshot] = useState<AlertSnapshot | null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState<string | null>(null);
  const [actionError,setActionError] = useState<string | null>(null);
  const [report,setReport] = useState<AlertReportId>('due');
  const [filter,setFilter] = useState<DueFilter>('all');
  const [onlyGroup1,setOnlyGroup1] = useState(true);
  const [search,setSearch] = useState('');
  const seq = useRef(0);
  const reload = useCallback(async () => {
    const current=++seq.current;
    setLoading(true);setError(null);setActionError(null);
    try {
      const data=await runWithTimeout(() => loadAlertSnapshot(todayIso()),60_000,'Nạp dữ liệu báo cáo quá thời gian chờ. Thử tải lại.');
      if(current===seq.current) setSnapshot(data);
    } catch(err) {
      if(current===seq.current) {setSnapshot(null);setError(reportErrorMessage(err));}
    } finally {if(current===seq.current) setLoading(false);}
  },[]);
  const cancel = useCallback(() => {seq.current++;},[]);
  useEffect(() => {void reload();return cancel;},[reload,cancel]);
  const rows = useMemo(() => snapshot ? selectAlertRows(snapshot,{onlyGroup1,due:filter,search}) : null,
    [snapshot,onlyGroup1,filter,search]);
  const output = useMemo(() => rows && snapshot ? buildAlertExport(report,rows,snapshot.today) : null,[rows,snapshot,report]);
  const run = (action:() => void) => {
    setActionError(null);
    try { action(); } catch(err) {setActionError(reportErrorMessage(err));}
  };
  const exportExcel = () => {
    if(loading || error || !output) return;
    run(() => downloadBytes(buildXlsx(output.sheet),output.fileName,MIME_XLSX));
  };
  const print = () => {
    if(loading || error || !output) return;
    run(() => {if(!openPrintWindow(buildDueListHtml(output.print))) throw new Error('Không mở được bản in. Tải lại trang rồi thử lại.');});
  };
  const exportPortfolio = () => {
    if(loading || error || !snapshot) return;
    run(() => exportActiveCustomerPortfolioExcel({...snapshot,todayStr:snapshot.today}));
  };
  return {report,setReport,filter,setFilter,onlyGroup1,setOnlyGroup1,search,setSearch,
    snapshot,rows,output,loading,error,actionError,reload,exportExcel,print,exportPortfolio};
}
