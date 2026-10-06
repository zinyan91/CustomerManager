import { useState, useRef } from 'react';
import { Upload, X, FileText, Sparkles, AlertCircle } from 'lucide-react';
import type { DispatchDocumentType, DispatchUploadPayload } from '../../types/dispatch';
import { DISPATCH_TYPE_LABELS } from '../../types/dispatch';
import { extractDocumentMetadataFromFileName } from '../../lib/ai/geminiClient';
import type { Database } from '../../types/database.types';

type CustomerRow = Database['public']['Tables']['Customers']['Row'];

interface DispatchUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (payload: DispatchUploadPayload) => Promise<void>;
  customers: CustomerRow[];
  initialFolderPath?: string;
}

export function DispatchUploadModal({
  isOpen,
  onClose,
  onUpload,
  customers,
  initialFolderPath = '',
}: DispatchUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [folderPath, setFolderPath] = useState(initialFolderPath);
  const [documentNumber, setDocumentNumber] = useState('');
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState<DispatchDocumentType>('khac');
  const [issuer, setIssuer] = useState('');
  const [documentDate, setDocumentDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [receivedDate, setReceivedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setErrorMsg(null);

    // Tự động phân tích tên file để gợi ý thông tin ban đầu
    const meta = extractDocumentMetadataFromFileName(file.name);
    if (!title) setTitle(meta.title);
    if (meta.documentNumber && !documentNumber) setDocumentNumber(meta.documentNumber);
    if (meta.issuer && !issuer) setIssuer(meta.issuer);
    if (meta.documentType !== 'khac') setDocumentType(meta.documentType);
  };

  const handleAiAutoFill = () => {
    if (!selectedFile) return;
    const meta = extractDocumentMetadataFromFileName(selectedFile.name);
    setTitle(meta.title);
    if (meta.documentNumber) setDocumentNumber(meta.documentNumber);
    if (meta.issuer) setIssuer(meta.issuer);
    setDocumentType(meta.documentType);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMsg('Vui lòng chọn hoặc kéo thả tệp tin cần tải lên.');
      return;
    }
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập trích yếu nội dung văn bản.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await onUpload({
        file: selectedFile,
        documentNumber: documentNumber.trim(),
        title: title.trim(),
        documentType,
        issuer: issuer.trim(),
        documentDate,
        receivedDate,
        customerId,
        folderPath: folderPath.trim() || undefined,
        note: note.trim(),
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể tải lên tệp tin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400">
              <Upload className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tải Lên Văn Thư / Hồ Sơ Lưu Trữ
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Vùng kéo thả tệp tin */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) {
                handleFileChange(e.dataTransfer.files[0]);
              }
            }}
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 rounded-xl p-5 text-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/40"
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.txt"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />

            {selectedFile ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-teal-600 dark:text-teal-400 shrink-0" />
                <div className="text-left">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">{selectedFile.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB • {selectedFile.type || 'Tệp nhị phân'}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Upload className="w-7 h-7 mx-auto text-slate-400" />
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  Nhấp để chọn tệp hoặc kéo thả tệp vào đây
                </div>
                <div className="text-[11px] text-slate-500">
                  Hỗ trợ định dạng: PDF, Word (DOCX), Excel (XLSX), Ảnh scan (PNG, JPG), TXT
                </div>
              </div>
            )}
          </div>

          {/* Nút hỗ trợ AI điền nhanh */}
          {selectedFile && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAiAutoFill}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20 hover:bg-teal-500/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-teal-600" />
                <span>AI Phân tích tên tệp & Tự điền</span>
              </button>
            </div>
          )}

          {/* Trích yếu nội dung */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Trích yếu nội dung văn bản <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Quyết định phê duyệt cấp hạn mức tín dụng 10 tỷ VNĐ..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Số / Ký hiệu văn bản */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Số / Ký hiệu văn bản
              </label>
              <input
                type="text"
                value={documentNumber}
                onChange={(e) => setDocumentNumber(e.target.value)}
                placeholder="VD: 124/QĐ-NHNN, HĐTD-2026/01"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
              />
            </div>

            {/* Loại văn bản */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Loại văn bản
              </label>
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value as DispatchDocumentType)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {Object.entries(DISPATCH_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Cơ quan ban hành */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Cơ quan / Người ban hành
              </label>
              <input
                type="text"
                value={issuer}
                onChange={(e) => setIssuer(e.target.value)}
                placeholder="VD: Chi nhánh / Hội đồng định giá"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Ngày ban hành */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày ban hành
              </label>
              <input
                type="date"
                value={documentDate}
                onChange={(e) => setDocumentDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Ngày tiếp nhận */}
            <div>
              <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ngày tiếp nhận
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Khách hàng liên quan */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Khách hàng liên quan (nếu có)
            </label>
            <select
              value={customerId ?? ''}
              onChange={(e) => setCustomerId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">-- Không gắn khách hàng cụ thể (Văn bản chung / Điều hành) --</option>
              {customers.map((c) => (
                <option key={c.Id} value={c.Id}>
                  {c.FullName} (CIF: {c.CifKh})
                </option>
              ))}
            </select>
          </div>

          {/* Thư mục lưu trữ */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Thư mục lưu trữ (Hugging Face / Cây thư mục)
            </label>
            <input
              type="text"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="VD: 2026/hop-dong (để trống sẽ tự động phân loại)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Ghi chú */}
          <div>
            <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú thêm
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="VD: Bản gốc lưu tủ hồ sơ số 2..."
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-medium transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 disabled:opacity-50 text-white font-medium transition-colors flex items-center gap-2 cursor-pointer shadow-2xs"
            >
              {isSubmitting ? (
                <>
                  <Upload className="w-3.5 h-3.5 animate-bounce" />
                  <span>Đang tải lên...</span>
                </>
              ) : (
                <span>Lưu vào kho văn thư</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
