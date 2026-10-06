import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Upload, Search, Filter, RotateCcw,
  Sparkles, FolderArchive, FileText, CheckCircle2, HardDrive
} from 'lucide-react';
import type { DispatchDocument, DispatchFilter, DispatchUploadPayload } from '../../types/dispatch';
import { DISPATCH_TYPE_LABELS } from '../../types/dispatch';
import {
  getDispatches,
  uploadDispatchDocument,
  deleteDispatchDocument,
  filterDispatches,
  resolveFileDownloadUrl,
} from '../../lib/dispatch/dispatchStorage';
import { DispatchTable } from '../dispatch/DispatchTable';
import { DispatchUploadModal } from '../dispatch/DispatchUploadModal';
import { DispatchPreviewModal } from '../dispatch/DispatchPreviewModal';
import { AiChatDialog } from '../ai/AiChatDialog';
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
  const [documents, setDocuments] = useState<DispatchDocument[]>([]);
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [filter, setFilter] = useState<DispatchFilter>(INITIAL_FILTER);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DispatchDocument | null>(null);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [aiAttachedDoc, setAiAttachedDoc] = useState<DispatchDocument | null>(null);

  // Nạp danh sách khách hàng từ Supabase
  useEffect(() => {
    supabase
      .from('Customers')
      .select('Id, FullName, CifKh')
      .order('FullName', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setCustomers(data as CustomerRow[]);
        }
      });
  }, []);

  // Nạp danh sách văn thư từ bộ lưu trữ
  const loadDocuments = useCallback(async () => {
    const list = await getDispatches();
    setDocuments(list);
  }, []);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Gắn tên khách hàng vào văn thư
  const documentsWithCustomerNames = useMemo(() => {
    const custMap = new Map(customers.map((c) => [c.Id, c.FullName]));
    return documents.map((doc) => ({
      ...doc,
      customerName: doc.customerId ? custMap.get(doc.customerId) : undefined,
    }));
  }, [documents, customers]);

  // Lọc văn thư
  const filteredDocuments = useMemo(() => {
    return filterDispatches(documentsWithCustomerNames, filter);
  }, [documentsWithCustomerNames, filter]);

  // Thống kê nhanh KPIs
  const stats = useMemo(() => {
    const total = documents.length;
    const quyetDinhTb = documents.filter((d) => d.documentType === 'quyet_dinh' || d.documentType === 'thong_bao').length;
    const hopDongTt = documents.filter((d) => d.documentType === 'hop_dong' || d.documentType === 'to_trinh').length;
    const totalBytes = documents.reduce((sum, d) => sum + (d.fileSize || 0), 0);
    const totalMb = (totalBytes / 1024 / 1024).toFixed(1);

    return { total, quyetDinhTb, hopDongTt, totalMb };
  }, [documents]);

  const handleUpload = async (payload: DispatchUploadPayload) => {
    await uploadDispatchDocument(payload);
    await loadDocuments();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa văn bản này khỏi kho văn thư?')) return;
    await deleteDispatchDocument(id);
    await loadDocuments();
  };

  const handleDownload = async (doc: DispatchDocument) => {
    try {
      const url = await resolveFileDownloadUrl(doc);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      alert('Không thể tải tệp tin.');
    }
  };

  const handleOpenAiChatForDoc = (doc: DispatchDocument) => {
    setAiAttachedDoc(doc);
    setIsAiChatOpen(true);
  };

  return (
    <div className="space-y-4 font-app max-w-full">
      {/* 1. Header văn thư */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
            <FolderArchive className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100">
              Sổ Quản Lý Văn Thư & Công Văn
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lưu trữ công văn, quyết định tín dụng, hợp đồng, biên bản thẩm định TSĐB & hỗ trợ AI
            </p>
          </div>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAiAttachedDoc(null);
              setIsAiChatOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl border border-teal-600/30 bg-teal-500/10 hover:bg-teal-500/20 text-teal-800 dark:text-teal-300 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Trợ lý AI Tín dụng</span>
          </button>

          <button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-white text-white dark:text-slate-900 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs"
          >
            <Upload className="w-4 h-4" />
            <span>Tải văn thư mới</span>
          </button>
        </div>
      </div>

      {/* 2. Thẻ thống kê nhanh KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Tổng số văn thư</span>
            <FileText className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.total}</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Quyết định & Thông báo</span>
            <CheckCircle2 className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.quyetDinhTb}</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Hợp đồng & Tờ trình</span>
            <FolderArchive className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.hopDongTt}</div>
        </div>

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-1">
            <span className="text-[11px] font-medium">Dung lượng tệp</span>
            <HardDrive className="w-4 h-4 opacity-70" />
          </div>
          <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.totalMb} MB</div>
        </div>
      </div>

      {/* 3. Thanh tìm kiếm & bộ lọc */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/60 flex flex-wrap items-center gap-2.5 text-xs">
        {/* Tìm kiếm từ khóa */}
        <div className="flex-1 min-w-[220px] relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={filter.search}
            onChange={(e) => setFilter((f) => ({ ...f, search: e.target.value }))}
            placeholder="Tìm theo số hiệu, trích yếu, người ký, tên tệp..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-hidden text-xs"
          />
        </div>

        {/* Lọc loại văn bản */}
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={filter.documentType}
            onChange={(e) => setFilter((f) => ({ ...f, documentType: e.target.value }))}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
          >
            <option value="all">Tất cả loại văn bản</option>
            {Object.entries(DISPATCH_TYPE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc khách hàng */}
        <select
          value={filter.customerId}
          onChange={(e) =>
            setFilter((f) => ({
              ...f,
              customerId: e.target.value === 'all' ? 'all' : Number(e.target.value),
            }))
          }
          className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs max-w-[200px]"
        >
          <option value="all">Tất cả khách hàng</option>
          {customers.map((c) => (
            <option key={c.Id} value={c.Id}>
              {c.FullName} ({c.CifKh})
            </option>
          ))}
        </select>

        {/* Lọc từ ngày */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[11px]">Từ:</span>
          <input
            type="date"
            value={filter.dateFrom}
            onChange={(e) => setFilter((f) => ({ ...f, dateFrom: e.target.value }))}
            className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
          />
        </div>

        {/* Lọc đến ngày */}
        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[11px]">Đến:</span>
          <input
            type="date"
            value={filter.dateTo}
            onChange={(e) => setFilter((f) => ({ ...f, dateTo: e.target.value }))}
            className="px-2 py-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs"
          />
        </div>

        {/* Đặt lại bộ lọc */}
        <button
          type="button"
          onClick={() => setFilter(INITIAL_FILTER)}
          className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition-colors"
          title="Đặt lại bộ lọc"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 4. Bảng danh sách văn thư */}
      <DispatchTable
        documents={filteredDocuments}
        onPreview={(doc) => setPreviewDoc(doc)}
        onDownload={handleDownload}
        onAiSummary={handleOpenAiChatForDoc}
        onDelete={handleDelete}
      />

      {/* Modal tải lên văn thư */}
      <DispatchUploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUpload={handleUpload}
        customers={customers}
      />

      {/* Modal xem trước văn bản & Tóm tắt AI */}
      <DispatchPreviewModal
        document={previewDoc}
        isOpen={Boolean(previewDoc)}
        onClose={() => setPreviewDoc(null)}
        onOpenAiChat={handleOpenAiChatForDoc}
        onUpdated={(updated) => {
          setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
        }}
      />

      {/* Tab Chat AI Dài Bên Phải */}
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
