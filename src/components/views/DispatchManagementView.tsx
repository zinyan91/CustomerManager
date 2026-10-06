import { useState, useEffect, useMemo } from 'react';
import {
  Upload, Search, Filter, RotateCcw, Settings,
  Sparkles, FolderArchive, FileText, CheckCircle2, HardDrive, AlertCircle, Loader2, X,
} from 'lucide-react';
import type { DispatchDocument, DispatchFilter, DispatchUploadPayload } from '../../types/dispatch';
import { DISPATCH_TYPE_LABELS } from '../../types/dispatch';
import {
  uploadDispatchDocument,
  deleteDispatchDocument,
  filterDispatches,
  resolveFileDownloadUrl,
} from '../../lib/dispatch/dispatchStorage';
import {
  DISPATCH_CATEGORIES,
  categoryLabel,
  countByCategory,
  filterByCategory,
  type DispatchCategoryFilter,
} from '../../lib/dispatch/dispatchCategories';
import { isHfConfigComplete } from '../../lib/huggingface/hfConfigApi';
import { archiveStatusMessage } from '../../lib/huggingface/hfStatus';
import { useArchive } from '../../hooks/useArchive';
import { useAuth } from '../../context/AuthContext';
import { DispatchTable } from '../dispatch/DispatchTable';
import { DispatchUploadModal } from '../dispatch/DispatchUploadModal';
import { DispatchPreviewModal } from '../dispatch/DispatchPreviewModal';
import { AiChatDialog } from '../ai/AiChatDialog';
import { StorageSettingsModal } from '../storage/StorageSettingsModal';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/database.types';

type CustomerRow = Database['public']['Tables']['Customers']['Row'];

const INITIAL_FILTER: DispatchFilter = {
  search: '',
  documentType: 'all',
  customerId: 'all',
  dateFrom: '',
  dateTo: '',
};

export function DispatchManagementView() {
  const { can } = useAuth();
  const { auth, allRepos, config, documents, setDocuments, status, reload, reloadRepos } = useArchive('dispatch');
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [filter, setFilter] = useState<DispatchFilter>(INITIAL_FILTER);
  const [category, setCategory] = useState<DispatchCategoryFilter>('all');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DispatchDocument | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiAttachedDoc, setAiAttachedDoc] = useState<DispatchDocument | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const canConfigure = can('storage.configure');
  const canDelete = can('storage.delete');
  const archiveReady = isHfConfigComplete(config);
  const canUpload = can('dispatch.upload') && archiveReady;
  const statusMessage = archiveStatusMessage(status, canConfigure);
  const rootFolder = config?.folder ?? '';

  // Nạp danh sách khách hàng từ Supabase
  useEffect(() => {
    supabase
      .from('Customers')
      .select('Id, FullName, CifKh')
      .order('FullName', { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          setActionError(`Không nạp được danh sách khách hàng: ${error.message}`);
          return;
        }
        if (data) {
          setCustomers(data as CustomerRow[]);
        }
      });
  }, []);

  const counts = useMemo(() => countByCategory(documents, rootFolder), [documents, rootFolder]);
  const inCategory = useMemo(() => filterByCategory(documents, category, rootFolder), [documents, category, rootFolder]);

  // Gắn tên khách hàng vào văn thư
  const documentsWithCustomerNames = useMemo(() => {
    const custMap = new Map(customers.map((c) => [c.Id, c.FullName]));
    return inCategory.map((doc) => ({
      ...doc,
      customerName: doc.customerId ? custMap.get(doc.customerId) : undefined,
    }));
  }, [inCategory, customers]);

  const filteredDocuments = useMemo(() => filterDispatches(documentsWithCustomerNames, filter), [documentsWithCustomerNames, filter]);

  const stats = useMemo(() => {
    const totalBytes = inCategory.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    return {
      total: inCategory.length,
      quyetDinhTb: inCategory.filter((d) => d.documentType === 'quyet_dinh' || d.documentType === 'thong_bao').length,
      hopDongTt: inCategory.filter((d) => d.documentType === 'hop_dong' || d.documentType === 'to_trinh').length,
      totalMb: (totalBytes / 1024 / 1024).toFixed(1),
    };
  }, [inCategory]);

  // Lỗi upload được ném lên để DispatchUploadModal hiển thị
  const handleUpload = async (payload: DispatchUploadPayload) => {
    await uploadDispatchDocument(payload, config);
    await reload();
  };

  const handleDelete = async (doc: DispatchDocument) => {
    if (!canDelete) {
      setActionError('Bạn không có quyền xóa văn bản khỏi kho văn thư.');
      return;
    }
    if (!window.confirm('Bạn có chắc chắn muốn xóa văn bản này khỏi kho văn thư?')) return;

    setActionError(null);
    try {
      await deleteDispatchDocument(doc, config);
      await reload();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không xóa được văn bản.');
    }
  };

  const handleDownload = async (doc: DispatchDocument) => {
    setActionError(null);
    try {
      const url = await resolveFileDownloadUrl(doc, config);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Không thể tải tệp tin.');
    }
  };

  const handleOpenAiChatForDoc = (doc: DispatchDocument) => {
    setAiAttachedDoc(doc);
    setIsAiChatOpen(true);
  };

  const navItems: Array<{ id: DispatchCategoryFilter; label: string }> = [
    { id: 'all', label: 'Tất cả' },
    ...DISPATCH_CATEGORIES.map((c) => ({ id: c.id as DispatchCategoryFilter, label: c.label })),
  ];

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden font-app bg-slate-50 dark:bg-slate-950">
      {/* Sidebar riêng của Văn thư */}
      <aside className="w-56 lg:w-64 shrink-0 flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="px-4 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FolderArchive className="w-5 h-5 text-slate-700 dark:text-slate-300" />
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">Văn thư</span>
          </div>
          {canConfigure && (
            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Cấu hình kho lưu trữ"
              className="p-1.5 rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        <nav className="p-3 space-y-1" aria-label="Mục văn thư">
          {navItems.map((item) => {
            const active = item.id === category;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                onClick={() => setCategory(item.id)}
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

      {/* Nội dung */}
      <div className="flex-1 min-w-0 overflow-y-auto p-5 space-y-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
          <h1 className="text-lg font-bold text-slate-900 dark:text-slate-100">
            {category === 'all' ? 'Tất cả văn thư' : categoryLabel(category)}
          </h1>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setAiAttachedDoc(null);
                setIsAiChatOpen(true);
              }}
              className="px-3.5 py-2 rounded-lg border border-teal-600/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Trợ lý AI Tín dụng</span>
            </button>

            {canUpload && (
              <button
                type="button"
                onClick={() => setIsUploadOpen(true)}
                className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Tải văn thư mới</span>
              </button>
            )}
          </div>
        </div>

        {(statusMessage || actionError || status.kind === 'loading') && (
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1.5 text-sm">
            {status.kind === 'loading' && (
              <div className="flex items-center gap-2 text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang nạp kho văn thư...</span>
              </div>
            )}
            {statusMessage && (
              <div role="alert" className="flex items-start gap-2 text-amber-800 dark:text-amber-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{statusMessage}</span>
              </div>
            )}
            {actionError && (
              <div role="alert" className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span className="flex-1">{actionError}</span>
                <button type="button" onClick={() => setActionError(null)} aria-label="Đóng thông báo" className="p-0.5 text-slate-400 hover:text-slate-700">
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Thẻ thống kê nhanh */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Tổng số văn thư', value: stats.total, Icon: FileText },
            { label: 'Quyết định & Thông báo', value: stats.quyetDinhTb, Icon: CheckCircle2 },
            { label: 'Hợp đồng & Tờ trình', value: stats.hopDongTt, Icon: FolderArchive },
            { label: 'Dung lượng tệp', value: `${stats.totalMb} MB`, Icon: HardDrive },
          ].map(({ label, value, Icon }) => (
            <div key={label} className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
                <span className="text-xs font-medium">{label}</span>
                <Icon className="w-4 h-4 opacity-70" />
              </div>
              <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
            </div>
          ))}
        </div>

        {/* Thanh tìm kiếm & bộ lọc */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-wrap items-center gap-2.5 text-sm">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={filter.search}
              onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
              placeholder="Tìm theo số hiệu, trích yếu, người ký, tên tệp..."
              aria-label="Tìm văn thư"
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={filter.documentType}
              onChange={(e) => setFilter((f) => ({ ...f, documentType: e.target.value }))}
              aria-label="Lọc loại văn bản"
              className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            >
              <option value="all">Tất cả loại văn bản</option>
              {Object.entries(DISPATCH_TYPE_LABELS).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <select
            value={filter.customerId}
            onChange={(e) =>
              setFilter((f) => ({
                ...f,
                customerId: e.target.value === 'all' ? 'all' : Number(e.target.value),
              }))
            }
            aria-label="Lọc khách hàng"
            className="px-2.5 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm max-w-[220px]"
          >
            <option value="all">Tất cả khách hàng</option>
            {customers.map((c) => (
              <option key={c.Id} value={c.Id}>
                {c.FullName} ({c.CifKh})
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs">Từ:</span>
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
              aria-label="Từ ngày"
              className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 text-xs">Đến:</span>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
              aria-label="Đến ngày"
              className="px-2 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm"
            />
          </div>

          <button
            type="button"
            onClick={() => setFilter(INITIAL_FILTER)}
            aria-label="Đặt lại bộ lọc"
            className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        <DispatchTable
          documents={filteredDocuments}
          onPreview={(doc) => setPreviewDoc(doc)}
          onDownload={handleDownload}
          onAiSummary={handleOpenAiChatForDoc}
          onDelete={handleDelete}
          canDelete={canDelete}
        />
      </div>

      {canUpload && (
        <DispatchUploadModal
          isOpen={isUploadOpen}
          onClose={() => setIsUploadOpen(false)}
          onUpload={handleUpload}
          customers={customers}
          rootFolder={rootFolder}
          defaultCategory={category === 'all' ? 'van-ban' : category}
        />
      )}

      {canConfigure && (
        <StorageSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          auth={auth}
          repos={allRepos}
          onChanged={reloadRepos}
        />
      )}

      <DispatchPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        hfConfig={config}
        onOpenAiChat={handleOpenAiChatForDoc}
        onUpdated={(updated) => {
          setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        }}
      />

      <AiChatDialog
        isOpen={isAiChatOpen}
        onClose={() => {
          setIsAiChatOpen(false);
          setAiAttachedDoc(null);
        }}
        availableDispatches={documentsWithCustomerNames}
        initialAttachedDoc={aiAttachedDoc}
      />
    </div>
  );
}
