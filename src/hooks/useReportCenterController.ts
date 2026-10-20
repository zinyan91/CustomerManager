import { useCallback, useState } from 'react';
import { REPORTS, buildReportWorkbook } from '../lib/reports/registry';
import { gatherSheets } from '../lib/reports/gather';
import type { DueBucketFilter } from '../lib/reports/dueBucket';
import type { ReportId } from '../lib/reports/types';
import { downloadBytes } from '../lib/xlsExport';
import { MIME_XLSX } from '../lib/xlsxWriter';
import { todayIso } from '../lib/utils';
import { reportErrorMessage } from '../lib/reports/errorMessage';

export function useReportCenterController() {
  const [selected, setSelected] = useState<ReportId[]>(['portfolio']);
  const [filter, setFilter] = useState<DueBucketFilter>('all');
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((id: ReportId) => {
    setSelected(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  }, []);

  const exportSelected = useCallback(async () => {
    if (selected.length === 0) return;
    setExporting(true);
    setError(null);
    try {
      const ctx = { todayIso: todayIso() };
      const defs = REPORTS.filter(r => selected.includes(r.id));
      const { sheets, failed, errors } = await gatherSheets(defs, filter, ctx);

      if (sheets.length === 0) {
        setError(errors?.join('; ') || 'Không xuất được báo cáo nào. Vui lòng kiểm tra kết nối và thử lại.');
        return;
      }
      if (failed.length > 0) {
        const ten = REPORTS.filter(r => failed.includes(r.id)).map(r => r.name).join(', ');
        setError(`Đã xuất ${sheets.length} báo cáo. Không nạp được: ${ten}. ${errors?.join('; ') ?? ''}`);
      }

      downloadBytes(buildReportWorkbook(sheets), `BaoCao_${ctx.todayIso}.xlsx`, MIME_XLSX);
    } catch (err) {
      console.error('exportSelected error:', err);
      setError(reportErrorMessage(err));
    } finally {
      setExporting(false);
    }
  }, [selected, filter]);

  return { selected, toggle, filter, setFilter, exporting, error, exportSelected };
}
