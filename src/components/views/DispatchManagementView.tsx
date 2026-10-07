import { useState } from 'react';
import { Plus, Sparkles, FolderArchive, FolderCog, AlertCircle, X } from 'lucide-react';
import type { OfficialDoc, OfficialDocCategory, OfficialDocInput } from '../../types/officialDoc';
import { OFFICIAL_CATEGORIES, categoryLabel } from '../../lib/officialDoc/categories';
import { deleteOfficialDoc, saveOfficialDoc } from '../../lib/api/officialDocApi';
import { downloadDocFile, downloadDocFilesZip } from '../../lib/officialDoc/docFileActions';
import { docDownloadPlan } from '../../lib/officialDoc/docFiles';
import { useOfficialDocs } from '../../hooks/useOfficialDocs';
import { useHfToken } from '../../hooks/useHfToken';
import { useAuth } from '../../context/AuthContext';
import { canManageRepos } from '../../lib/storageRepos';
import { OfficialDocFilters } from '../dispatch/OfficialDocFilters';
import { OfficialDocList } from '../dispatch/OfficialDocList';
import { OfficialDocDetail } from '../dispatch/OfficialDocDetail';
import { OfficialDocForm } from '../dispatch/OfficialDocForm';
import { AiChatDialog } from '../ai/AiChatDialog';
import { StorageManagementView } from './StorageManagementView';

type FormState = { doc: OfficialDoc | null } | null;

export function DispatchManagementView() {
  const { can, role } = useAuth();
  const docsState = useOfficialDocs();
  const { filter, updateFilter, resetFilters, counts } = docsState;
  const { token, error: tokenError } = useHfToken();

  const [detailDoc, setDetailDoc] = useState<OfficialDoc | null>(null);
  const [form, setForm] = useState<FormState>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  // Kho Văn thư và Biểu mẫu chỉ Master Admin quản lý; các vai trò khác dùng chúng qua danh mục văn bản
  const canManageFiles = canManageRepos(role);
  const [panel, setPanel] = useState<'docs' | 'files'>('docs');

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
    const plan = docDownloadPlan(doc);
    if (plan.kind === 'none') return;
    setActionError(null);
    setDownloadingId(doc.id);
    try {
      if (plan.kind === 'zip') await downloadDocFilesZip(plan.files, plan.zipName, token);
      else await downloadDocFile(plan.file, token);
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
    <div className="flex flex-col md:flex-row h-[calc(100dvh-3.5rem)] overflow-hidden font-app bg-slate-50 dark:bg-slate-950">
      <aside className="w-full md:w-48 xl:w-56 2xl:w-64 shrink-0 flex flex-col border-b md:border-b-0 md:border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="hidden md:flex px-4 py-4 border-b border-slate-200 dark:border-slate-800 items-center gap-2.5">
          <FolderArchive className="w-5 h-5 text-slate-700 dark:text-slate-300" />
          <span className="text-base font-bold text-slate-900 dark:text-slate-100">Văn thư</span>
        </div>

        <nav className="p-2 md:p-3 flex md:block gap-1.5 md:gap-0 md:space-y-1 overflow-x-auto" aria-label="Mục văn thư">
          {navItems.map((item) => {
            const active = panel === 'docs' && item.id === filter.category;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => {
                  setPanel('docs');
                  updateFilter({ category: item.id });
                }}
                className={`shrink-0 md:w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap cursor-pointer ${
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

          {canManageFiles && (
            <button
              type="button"
              aria-current={panel === 'files' ? 'page' : undefined}
              onClick={() => setPanel('files')}
              className={`shrink-0 md:w-full md:mt-3 md:border-t md:border-slate-200 md:dark:border-slate-800 md:pt-3 flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm whitespace-nowrap cursor-pointer ${
                panel === 'files'
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-semibold'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <FolderCog className="w-4 h-4 shrink-0" />
              <span>Kho tệp</span>
            </button>
          )}
        </nav>
      </aside>

      <div className="flex-1 min-h-0 md:min-w-0 overflow-y-auto bg-white dark:bg-slate-900">
       {panel === 'files' && canManageFiles ? (
        <StorageManagementView scope="dispatch" embedded />
       ) : (
       <section className="divide-y divide-slate-200 dark:divide-slate-800">
        <div className="px-3 sm:px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
            {filter.category === 'all' ? 'Tất cả văn bản' : categoryLabel(filter.category)}
          </h1>

          <div className="flex flex-wrap items-center gap-2.5">
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
          sort={docsState.sort}
          onSort={docsState.toggleSort}
          onPageChange={docsState.setPage}
          onOpen={setDetailDoc}
          onDownload={handleDownload}
          downloadingId={downloadingId}
          onEdit={canEdit ? (doc) => setForm({ doc }) : undefined}
          onDelete={canDelete ? handleDelete : undefined}
        />
       </section>
       )}
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
