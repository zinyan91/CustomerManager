import { useEffect, useRef, useState } from 'react';
import { readKpiExcel, downloadKpiTemplate } from '../lib/kpiExcel';
import { parseKpiImportRows, reconcileKpiImport, summarizeKpiImport } from '../lib/kpiImport';
import { fetchKpiBatches, fetchKpiObservations, publishKpiImport } from '../lib/api/kpiObservationApi';
import type { KpiDefinition, KpiImportPreview } from '../types/kpi';
import type { TeamMember } from '../types/team';

export function useKpiImport(periodId: string, definitions: KpiDefinition[], members: TeamMember[], onPublished: () => void) {
  const [preview, setPreview] = useState<KpiImportPreview | null>(null);
  const [source, setSource] = useState('');
  const [revision, setRevision] = useState(0);
  const [asOf, setAsOf] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const request = useRef(0);
  useEffect(() => () => { ++request.current; }, [periodId]);

  const read = async (file: File) => {
    const version = ++request.current;
    setBusy(true);
    setError(null);
    setNotice(null);
    setPreview(null);
    try {
      const [raw, batches] = await Promise.all([readKpiExcel(file), fetchKpiBatches([periodId])]);
      const latest = batches.sort((a, b) => b.Revision - a.Revision)[0];
      const previous = latest ? await fetchKpiObservations([latest.Id]) : [];
      const parsed = parseKpiImportRows(raw, definitions, members.map(member => member.UserId));
      if (version !== request.current) return;
      const differences = reconcileKpiImport(parsed.rows, previous);
      setPreview({ ...parsed, differences, totals: summarizeKpiImport(differences) });
      setSource(file.name);
      setRevision(latest?.Revision ?? 0);
    } catch (cause) {
      if (version === request.current) setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      if (version === request.current) setBusy(false);
    }
  };
  const publish = async () => {
    if (!preview || preview.errors.length || !asOf || !reason.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await publishKpiImport({ periodId, revision, asOf, source, reason, rows: preview.rows });
      setPreview(null);
      setNotice('Đã công bố dữ liệu KPI.');
      onPublished();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally { setBusy(false); }
  };
  const download = async () => {
    setError(null);
    try { await downloadKpiTemplate(definitions, members); }
    catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
  };
  return { preview, source, revision, asOf, setAsOf, reason, setReason, busy, error, notice, read, publish, download };
}
