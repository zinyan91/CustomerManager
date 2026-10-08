import React, { useCallback, useEffect, useRef, useState } from 'react';
import { FilePlus2, FolderOpen, Trash2 } from 'lucide-react';
import { deleteCalcDraft, listCalcDrafts } from './calc/services/calcDraftStore';
import { useOfficeI18n } from './i18n';
import type { DraftSummary } from './shared/idbStore';

interface OfficeHomeProps {
  onNewSpreadsheet: () => void;
  onOpenFile: (file: File) => void;
  onOpenDraft: (id: string) => void;
}

const CARD =
  'flex items-center gap-3 px-4 py-3 rounded-lg border border-line bg-panel hover:bg-surface text-left text-sm cursor-pointer';

/** Cổng vào tab Báo cáo: tạo hoặc mở bảng tính, và danh sách bản nháp gần đây trong trình duyệt này. */
export const OfficeHome: React.FC<OfficeHomeProps> = ({ onNewSpreadsheet, onOpenFile, onOpenDraft }) => {
  const { m, lang } = useOfficeI18n();
  const t = m.home;
  const [drafts, setDrafts] = useState<DraftSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const reload = useCallback(async () => {
    try {
      setDrafts(await listCalcDrafts());
      setError(null);
    } catch (caught) {
      setDrafts([]);
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const remove = async (draft: DraftSummary) => {
    const name = draft.title || m.calc.untitled;
    if (!window.confirm(t.confirmDelete(name))) return;
    try {
      await deleteCalcDraft(draft.id);
      await reload();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    }
  };

  const when = (ms: number) => new Date(ms).toLocaleString(lang === 'vi' ? 'vi-VN' : 'en-US');

  return (
    <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-xl font-bold text-ink">{t.title}</h1>

      <section aria-label={t.spreadsheet} className="grid sm:grid-cols-2 gap-3">
        <button type="button" className={CARD} onClick={onNewSpreadsheet}>
          <FilePlus2 className="w-5 h-5 shrink-0" />
          <span className="font-semibold">{t.spreadsheetNew}</span>
        </button>
        <button type="button" className={CARD} onClick={() => input.current?.click()}>
          <FolderOpen className="w-5 h-5 shrink-0" />
          <span>
            <span className="font-semibold block">{t.spreadsheetOpen}</span>
            <span className="text-xs text-slate-500">{t.spreadsheetOpenHint}</span>
          </span>
        </button>
        <input
          ref={input}
          type="file"
          hidden
          accept=".xlsx,.xlsm,.csv,.tsv,.txt"
          aria-label={t.spreadsheetOpen}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) onOpenFile(file);
          }}
        />
      </section>

      <section aria-label={t.recent} className="space-y-2">
        <h2 className="text-sm font-bold text-ink">{t.recent}</h2>
        {error && (
          <div role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}
        {drafts && drafts.length === 0 && !error && <p className="text-sm text-slate-500">{t.noRecent}</p>}
        <ul className="divide-y divide-line border-y border-line">
          {(drafts ?? []).map((draft) => (
            <li key={draft.id} className="flex items-center gap-3 py-2">
              <button
                type="button"
                className="flex-1 min-w-0 text-left cursor-pointer hover:underline"
                onClick={() => onOpenDraft(draft.id)}
                aria-label={`${t.open} ${draft.title || m.calc.untitled}`}
              >
                <span className="block truncate text-sm font-medium text-ink">{draft.title || m.calc.untitled}</span>
                <span className="block text-xs text-slate-500">{t.updated(when(draft.updatedAt))}</span>
              </button>
              <button
                type="button"
                onClick={() => void remove(draft)}
                aria-label={`${t.delete}: ${draft.title || m.calc.untitled}`}
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
