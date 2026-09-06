import { useCallback, useEffect, useMemo, useState } from 'react';
import { cloneRateProgramAPI, updateRateProgramAPI, deleteRateProgramAPI } from '../lib/api';
import { checkProgramPeriod, type RateProgram, type RateProgramKind } from '../lib/rateQuote';

interface UseRateProgramAdminArgs {
  programs: RateProgram[];
  kind: RateProgramKind;
  activeProgram: RateProgram | null;
  reload: () => Promise<void> | void;
}

export function useRateProgramAdmin({
  programs, kind, activeProgram, reload,
}: UseRateProgramAdminArgs) {
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [cloneDocNumber, setCloneDocNumber] = useState('');
  const [cloneName, setCloneName] = useState('');
  const [cloneDocDate, setCloneDocDate] = useState('');
  const [cloneFrom, setCloneFrom] = useState('');
  const [cloneTo, setCloneTo] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const kindPrograms = useMemo(
    () => programs.filter(p => p.Kind === kind)
      .slice()
      .sort((a, b) => (a.EffectiveFrom < b.EffectiveFrom ? 1 : -1)),
    [programs, kind]
  );

  const source = useMemo(
    () => kindPrograms.find(p => p.Id === sourceId) ?? null,
    [kindPrograms, sourceId]
  );

  useEffect(() => {
    const fallback = activeProgram ?? kindPrograms[0] ?? null;
    setSourceId(fallback ? fallback.Id : null);
    setMessage('');
  }, [kind, activeProgram, kindPrograms]);

  useEffect(() => {
    setPeriodFrom(source?.EffectiveFrom ?? '');
    setPeriodTo(source?.EffectiveTo ?? '');
    setCloneName(source?.Name ?? '');
    setCloneDocNumber('');
    setCloneDocDate('');
    setCloneFrom('');
    setCloneTo('');
  }, [source]);

  const savePeriod = useCallback(async () => {
    if (!source) return;
    setBusy(true);
    setMessage('');
    try {
      const check = checkProgramPeriod(programs, {
        id: source.Id,
        kind: source.Kind,
        effectiveFrom: periodFrom,
        effectiveTo: periodTo.trim() || null,
      });
      if (!check.ok) throw new Error(check.message);

      await updateRateProgramAPI(source.Id, {
        EffectiveFrom: periodFrom,
        EffectiveTo: periodTo.trim() || null,
      });
      await reload();
      setMessage('Đã lưu khoảng hiệu lực.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Lưu thất bại.');
    } finally {
      setBusy(false);
    }
  }, [source, programs, periodFrom, periodTo, reload]);

  const cloneProgram = useCallback(async () => {
    if (!source) return;
    setBusy(true);
    setMessage('');
    try {
      if (!cloneDocNumber.trim()) throw new Error('Phải khai số văn bản của chương trình mới.');

      const check = checkProgramPeriod(programs, {
        kind: source.Kind,
        effectiveFrom: cloneFrom,
        effectiveTo: cloneTo.trim() || null,
      });
      if (!check.ok) throw new Error(check.message);

      await cloneRateProgramAPI({
        sourceId: source.Id,
        documentNumber: cloneDocNumber.trim(),
        name: cloneName.trim() || source.Name,
        documentDate: cloneDocDate.trim() || null,
        effectiveFrom: cloneFrom,
        effectiveTo: cloneTo.trim() || null,
      });
      await reload();
      setMessage('Đã nhân bản. Bản mới chưa đối chiếu văn bản gốc nên chưa chào khách được — sửa từng ô lãi suất rồi báo tôi đánh dấu đã đối chiếu.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Nhân bản thất bại.');
    } finally {
      setBusy(false);
    }
  }, [source, programs, cloneDocNumber, cloneName, cloneDocDate, cloneFrom, cloneTo, reload]);

  const deleteProgram = useCallback(async () => {
    if (!source) return;
    if (source.SourceVerified) {
      setMessage('Chương trình đã đối chiếu văn bản gốc, không xóa được. Chỉ xóa được bản chưa đối chiếu (do nhân bản tạo ra).');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await deleteRateProgramAPI(source.Id);
      await reload();
      setMessage('Đã xóa chương trình.');
    } catch (err: unknown) {
      setMessage(err instanceof Error ? err.message : 'Xóa thất bại.');
    } finally {
      setBusy(false);
    }
  }, [source, reload]);

  return {
    kindPrograms,
    source,
    sourceId,
    setSourceId,
    periodFrom,
    setPeriodFrom,
    periodTo,
    setPeriodTo,
    cloneDocNumber,
    setCloneDocNumber,
    cloneName,
    setCloneName,
    cloneDocDate,
    setCloneDocDate,
    cloneFrom,
    setCloneFrom,
    cloneTo,
    setCloneTo,
    busy,
    message,
    savePeriod,
    cloneProgram,
    deleteProgram,
  };
}
