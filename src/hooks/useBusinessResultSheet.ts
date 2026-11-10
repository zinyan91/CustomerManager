import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import type { KqkdRecord, KqkdSheet } from '../types/businessResult';
import type { AdminUser } from '../lib/userAdmin';
import {
  KqkdConflictError,
  addKqkdEditorAPI,
  fetchIsKqkdEditorAPI,
  fetchKqkdEditorIdsAPI,
  fetchKqkdSheetAPI,
  removeKqkdEditorAPI,
  saveKqkdSheetAPI,
} from '../lib/api/businessResultApi';
import { listAdminUsers } from '../lib/api/userAdminApi';
import { buildKqkdWorkbook } from '../lib/businessResult/exportXlsx';
import { downloadBytes } from '../lib/xlsExport';
import { MIME_XLSX } from '../lib/xlsxWriter';
import { todayIso } from '../lib/utils';
import { reportErrorMessage } from '../lib/reports/errorMessage';

/** Trạng thái bảng KQKD: bản đã lưu, bản đang sửa, quyền sửa và danh sách người được sửa (admin). */
export function useBusinessResultSheet() {
  const { user, isAdmin } = useAuth();
  const userId = user?.id ?? null;

  const [saved, setSaved] = useState<KqkdRecord | null>(null);
  const [draft, setDraft] = useState<KqkdSheet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const seq = useRef(0);

  const reload = useCallback(async () => {
    const current = ++seq.current;
    setLoading(true);
    setError(null);
    setActionError(null);
    setConflict(false);
    try {
      const [record, editor] = await Promise.all([
        fetchKqkdSheetAPI(),
        userId ? fetchIsKqkdEditorAPI(userId) : Promise.resolve(false),
      ]);
      if (current !== seq.current) return;
      setSaved(record);
      setDraft(record.sheet);
      setIsEditor(editor);
    } catch (err) {
      if (current === seq.current) setError(reportErrorMessage(err));
    } finally {
      if (current === seq.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
    return () => { seq.current++; };
  }, [reload]);

  const canEdit = isAdmin || isEditor;
  const dirty = useMemo(
    () => Boolean(saved && draft && JSON.stringify(saved.sheet) !== JSON.stringify(draft)),
    [saved, draft]
  );

  /** Áp một thao tác sửa; thao tác báo lỗi (ví dụ xóa cột đang được tính) thì giữ nguyên bảng và hiện lỗi. */
  const edit = useCallback((fn: (s: KqkdSheet) => KqkdSheet) => {
    if (!canEdit || !draft) return;
    try {
      setDraft(fn(draft));
      setActionError(null);
    } catch (err) {
      setActionError(reportErrorMessage(err));
    }
  }, [canEdit, draft]);

  const save = useCallback(async () => {
    if (!canEdit || !draft || !saved || saving) return;
    setSaving(true);
    setActionError(null);
    try {
      const next = await saveKqkdSheetAPI(draft, saved.version);
      setSaved(next);
    } catch (err) {
      if (err instanceof KqkdConflictError) setConflict(true);
      setActionError(reportErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }, [canEdit, draft, saved, saving]);

  const discard = useCallback(() => {
    if (saved) setDraft(saved.sheet);
    setActionError(null);
  }, [saved]);

  const exportExcel = useCallback(() => {
    if (!draft) return;
    setActionError(null);
    try {
      downloadBytes(buildKqkdWorkbook(draft), `Bao_Cao_Nhanh_KQKD_${todayIso()}.xlsx`, MIME_XLSX);
    } catch (err) {
      setActionError(reportErrorMessage(err));
    }
  }, [draft]);

  // ---- Người được sửa (chỉ admin) ----
  const [editorIds, setEditorIds] = useState<string[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [editorsLoading, setEditorsLoading] = useState(false);
  const [editorsError, setEditorsError] = useState<string | null>(null);

  const loadEditors = useCallback(async () => {
    if (!isAdmin) return;
    setEditorsLoading(true);
    setEditorsError(null);
    try {
      const [ids, list] = await Promise.all([fetchKqkdEditorIdsAPI(), listAdminUsers()]);
      setEditorIds(ids);
      setUsers(list);
    } catch (err) {
      setEditorsError(reportErrorMessage(err));
    } finally {
      setEditorsLoading(false);
    }
  }, [isAdmin]);

  const addEditor = useCallback(async (id: string) => {
    if (!isAdmin || !userId) return;
    setEditorsError(null);
    try {
      await addKqkdEditorAPI(id, userId);
      setEditorIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    } catch (err) {
      setEditorsError(reportErrorMessage(err));
    }
  }, [isAdmin, userId]);

  const removeEditor = useCallback(async (id: string) => {
    if (!isAdmin) return;
    setEditorsError(null);
    try {
      await removeKqkdEditorAPI(id);
      setEditorIds(prev => prev.filter(x => x !== id));
    } catch (err) {
      setEditorsError(reportErrorMessage(err));
    }
  }, [isAdmin]);

  return {
    sheet: draft,
    savedAt: saved?.updatedAt ?? null,
    neverSaved: saved?.version === null,
    loading, error, actionError, conflict, saving, dirty, canEdit, isAdmin,
    reload, edit, save, discard, exportExcel,
    editors: { ids: editorIds, users, loading: editorsLoading, error: editorsError, load: loadEditors, add: addEditor, remove: removeEditor },
  };
}

export type BusinessResultController = ReturnType<typeof useBusinessResultSheet>;
