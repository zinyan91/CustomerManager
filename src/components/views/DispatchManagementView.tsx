import { useState } from 'react';
import { Plus, Sparkles, FolderArchive, AlertCircle, X } from 'lucide-react';
import type { OfficialDoc, OfficialDocCategory, OfficialDocInput } from '../../types/officialDoc';
import { OFFICIAL_CATEGORIES, categoryLabel } from '../../lib/officialDoc/categories';
import { deleteOfficialDoc, saveOfficialDoc } from '../../lib/api/officialDocApi';
import { downloadDocFile } from '../../lib/officialDoc/docFileActions';
import { primaryFile } from '../../lib/officialDoc/docFiles';
import { useOfficialDocs } from '../../hooks/useOfficialDocs';
import { useHfToken } from '../../hooks/useHfToken';
import { useAuth } from '../../context/AuthContext';
import { OfficialDocFilters } from '../dispatch/OfficialDocFilters';
import { OfficialDocList } from '../dispatch/OfficialDocList';
import { OfficialDocDetail } from '../dispatch/OfficialDocDetail';
import { OfficialDocForm } from '../dispatch/OfficialDocForm';
import { AiChatDialog } from '../ai/AiChatDialog';

type FormState = { doc: OfficialDoc | null } | null;

export function DispatchManagementView() {
  const { can } = useAuth();
  const docsState = useOfficialDocs();
  const { filter, updateFilter, resetFilters, counts } = docsState;
  const { token, error: tokenError } = useHfToken();

  const [detailDoc, setDetailDoc] = useState<OfficialDoc | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const canEdit = can('dispatch.upload');
  const canDelete = can('storage.delete');
  const error = actionError ?? docsState.error ?? tokenError;

  const navItems: Array<{ id: OfficialDocCategory | 'all'; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    ...OFFICIAL_CATEGORIES,
  ];

  const handleSubmit = async (input: OfficialDocInput) => {
    await saveOfficialDoc(form?.doc?.id ?? null, input);
    setForm(null);
    docsState.reload();
  };

  const handleDownload = async (doc: OfficialDoc) => {
    const file = primaryFile(doc.files);
    if (!file) return;
    setActionError(null);
    setDownloadingId(doc.id);
    try {
      await downloadDocFile(file, token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không tải được tệp.');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async (doc: OfficialDoc) => {
    if (!window.confirm(`Xóa văn bản "${doc.docNumber}"? Tệp trong Kho lưu trữ vẫn được giữ nguyên.`)) return;
    setActionError(null);
    try {
      await deleteOfficialDoc(doc.id);
      docsState.reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không xóa được văn bản.');
    }
  };

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden font-app bg-slate-50 dark:bg-slate-950">
      <aside className="w-48 xl:w-56 2xl:w-64 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <FolderArchive className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">Văn thư</span>
        </div>

        <nav className="p-3 space-y-1" aria-label="Mục văn thư">
          {navItems.map((item) => {
            const active = item.id === filter.category;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => updateFilter({ category: item.id })}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{item.label}</span>
                <span className={`text-xs font-mono ${active ? 'opacity-80' : 'text-slate-400'}`}>{counts[item.id]}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0 overflow-y-auto bg-white dark:bg-slate-900">
       <section className="divide-y divide-slate-200 dark:divide-slate-800">
        <div className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {filter.category === 'all' ? 'Tất cả văn bản' : categoryLabel(filter.category)}
          </h1>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsAiChatOpen((prev) => !prev)}
              aria-pressed={isAiChatOpen}
              className={`px-3.5 py-2 rounded-lg border text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer ${
                isAiChatOpen
                  ? 'border-teal-600 bg-teal-600 text-white dark:bg-teal-500 dark:border-teal-500 dark:text-slate-900 shadow-2xs'
                  : 'border-teal-600/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Trợ lý AI Tín dụng</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => setForm({ doc: null })}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Thêm văn bản</span>
              </button>
            )}
          </div>
        </div>

        {error && (
          <div role="alert" className="px-4 py-2.5 flex items-start gap-2 text-sm text-rose-700 dark:text-rose-300">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="flex-1">{error}</span>
            {actionError && (
              <button type="button" onClick={() => setActionError(null)} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700 cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        <OfficialDocFilters filter={filter} onChange={updateFilter} onReset={resetFilters} />

        <OfficialDocList
          docs={docsState.docs}
          loading={docsState.loading}
          total={docsState.total}
          page={docsState.page}
          pageCount={docsState.pageCount}
          onPageChange={docsState.setPage}
          onOpen={setDetailDoc}
          onDownload={handleDownload}
          downloadingId={downloadingId}
          onEdit={canEdit ? (doc) => setForm({ doc }) : undefined}
          onDelete={canDelete ? handleDelete : undefined}
        />
       </section>
      </div>

      <OfficialDocDetail doc={detailDoc} token={token} onClose={() => setDetailDoc(null)} />

      {form && (
        <OfficialDocForm
          doc={form.doc}
          defaultCategory={filter.category === 'all' ? 'van-ban' : filter.category}
          token={token}
          onSubmit={handleSubmit}
          onClose={() => setForm(null)}
        />
      )}

      <AiChatDialog isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} mode="sidebar" canRecordDocs={canEdit} onDocRecorded={docsState.reload} />
    </div>
  );
}
