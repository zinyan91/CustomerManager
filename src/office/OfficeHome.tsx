import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FilePlus2, FileText, FolderOpen, Table2, Trash2 } from 'lucide-react';
import { deleteCalcDraft, listCalcDrafts } from './calc/services/calcDraftStore';
import { canManageSharing, deleteSharedDocument, listSharedDocuments, type SharedDocSummary } from './collab/collabApi';
import { useOfficeI18n } from './i18n';
import type { DraftSummary } from './shared/idbStore';
import { deleteDraft as deleteWriterDraft, listDrafts as listWriterDrafts } from './writer/services/draftStore';

export type OfficeKind = 'calc' | 'writer';

interface OfficeHomeProps {
  onNewDocument: (kind: OfficeKind) => void;
  onOpenFile: (kind: OfficeKind, file: File) => void;
  onOpenDraft: (kind: OfficeKind, id: string) => void;
  onOpenShared: (id: string, kind: OfficeKind) => void;
}

type Recent = DraftSummary & { kind: OfficeKind };

const CARD =
  'flex items-center gap-3 px-4 py-3 rounded-lg border border-line bg-panel hover:bg-surface text-left text-sm cursor-pointer';

const ACCEPT: Record<OfficeKind, string> = {
  calc: '.xlsx,.xlsm,.csv,.tsv,.txt',
  writer: '.docx,.txt,.md,.html,.htm',
};

const DELETE: Record<OfficeKind, (id: string) => Promise<void>> = { calc: deleteCalcDraft, writer: deleteWriterDraft };

/** Cổng vào tab Báo cáo: tạo hoặc mở bảng tính và văn bản, và danh sách bản nháp gần đây trong trình duyệt này. */
export const OfficeHome: React.FC<OfficeHomeProps> = ({ onNewDocument, onOpenFile, onOpenDraft, onOpenShared }) => {
  const { m, lang } = useOfficeI18n();
  const t = m.home;
  const [recent, setRecent] = useState<Recent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shared, setShared] = useState<SharedDocSummary[] | null>(null);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const inputs = { calc: useRef<HTMLInputElement>(null), writer: useRef<HTMLInputElement>(null) };

  const reload = useCallback(async () => {
    try {
      const [sheets, docs] = await Promise.all([listCalcDrafts(), listWriterDrafts()]);
      const all: Recent[] = [...sheets.map((d) => ({ ...d, kind: 'calc' as const })), ...docs.map((d) => ({ ...d, kind: 'writer' as const }))];
      setRecent(all.sort((a, b) => b.updatedAt - a.updatedAt));
      setError(null);
    } catch (caught) {
      setRecent([]);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, []);

  // Bảng tính chung nạp riêng: lỗi ở đây (mất mạng, chưa áp migration) không được che danh sách nháp trong trình duyệt.
  const reloadShared = useCallback(async () => {
    try {
      setShared(await listSharedDocuments());
      setSharedError(null);
    } catch (caught) {
      setShared([]);
      setSharedError(caught instanceof Error ? caught.message : String(caught));
    }
  }, []);

  useEffect(() => {
    void reload();
    void reloadShared();
  }, [reload, reloadShared]);

  const removeShared = async (doc: SharedDocSummary) => {
    if (!window.confirm(t.confirmDelete(doc.title || m.calc.untitled))) return;
    try {
      await deleteSharedDocument(doc.id);
      await reloadShared();
    } catch (caught) {
      setSharedError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const nameOf = (draft: Recent) => draft.title || (draft.kind === 'calc' ? m.calc.untitled : m.writer.untitled);

  const remove = async (draft: Recent) => {
    if (!window.confirm(t.confirmDelete(nameOf(draft)))) return;
    try {
      await DELETE[draft.kind](draft.id);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const when = (ms: number) => new Date(ms).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');

  const section = (kind: OfficeKind, label: string, newLabel: string, openLabel: string, hint: string) => (
    <section aria-label={label} className="grid sm:grid-cols-2 gap-3">
      <button type="button" className={CARD} onClick={() => onNewDocument(kind)}>
        <FilePlus2 className="w-5 h-5 shrink-0" />
        <span className="font-semibold">{newLabel}</span>
      </button>
      <button type="button" className={CARD} onClick={() => inputs[kind].current?.click()}>
        <FolderOpen className="w-5 h-5 shrink-0" />
        <span>
          <span className="font-semibold block">{openLabel}</span>
          <span className="text-xs text-slate-500">{hint}</span>
        </span>
      </button>
      <input
        ref={inputs[kind]}
        type="file"
        hidden
        accept={ACCEPT[kind]}
        aria-label={openLabel}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) onOpenFile(kind, file);
        }}
      />
    </section>
  );

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-ink">{t.title}</h1>

      {section('calc', t.spreadsheet, t.spreadsheetNew, t.spreadsheetOpen, t.spreadsheetOpenHint)}
      {section('writer', t.document, t.documentNew, t.documentOpen, t.documentOpenHint)}

      <section aria-label={t.sharedTitle} className="space-y-2">
        <h2 className="text-sm font-bold text-ink">{t.sharedTitle}</h2>
        {sharedError && (
          <div role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {sharedError}
          </div>
        )}
        {shared && shared.length === 0 && !sharedError && <p className="text-sm text-slate-500">{t.sharedEmpty}</p>}
        <ul className="divide-y divide-line border-y border-line" aria-label={t.sharedTitle}>
          {(shared ?? []).map((doc) => (
            <li key={doc.id} className="flex items-center gap-3 py-2">
              {doc.kind === 'writer' ? <FileText className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" /> : <Table2 className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />}
              <button
                type="button"
                className="flex-1 min-w-0 text-left cursor-pointer hover:underline"
                onClick={() => onOpenShared(doc.id, doc.kind)}
                aria-label={`${t.open} ${doc.title || (doc.kind === 'writer' ? m.writer.untitled : m.calc.untitled)}`}
              >
                <span className="block truncate text-sm font-medium text-ink">{doc.title || (doc.kind === 'writer' ? m.writer.untitled : m.calc.untitled)}</span>
                <span className="block text-xs text-slate-500">
                  {[t.sharedBy(doc.ownerName), t.updated(when(Date.parse(doc.updatedAt) || 0))].filter(Boolean).join(' · ')}
                </span>
              </button>
              <span className="text-xs text-slate-500 shrink-0">{m.ribbon.share.roleLabel[doc.role]}</span>
              {canManageSharing(doc.role) && (
                <button
                  type="button"
                  onClick={() => void removeShared(doc)}
                  aria-label={`${t.delete}: ${doc.title || (doc.kind === 'writer' ? m.writer.untitled : m.calc.untitled)}`}
                  className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-surface cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={t.recent} className="space-y-2">
        <h2 className="text-sm font-bold text-ink">{t.recent}</h2>
        {error && (
          <div role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {recent && recent.length === 0 && !error && <p className="text-sm text-slate-500">{t.noRecent}</p>}
        <ul className="divide-y divide-line border-y border-line" aria-label={t.recent}>
          {(recent ?? []).map((draft) => (
            <li key={`${draft.kind}:${draft.id}`} className="flex items-center gap-3 py-2">
              {draft.kind === 'calc' ? <Table2 className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" /> : <FileText className="w-4 h-4 shrink-0 text-slate-500" aria-hidden="true" />}
              <button
                type="button"
                className="flex-1 min-w-0 text-left cursor-pointer hover:underline"
                onClick={() => onOpenDraft(draft.kind, draft.id)}
                aria-label={`${t.open} ${nameOf(draft)}`}
              >
                <span className="block truncate text-sm font-medium text-ink">{nameOf(draft)}</span>
                <span className="block text-xs text-slate-500">{t.updated(when(draft.updatedAt))}</span>
              </button>
              <button
                type="button"
                onClick={() => void remove(draft)}
                aria-label={`${t.delete}: ${nameOf(draft)}`}
                className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-surface cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">{t.draftsNote}</p>
      </section>
    </main>
  );
};
