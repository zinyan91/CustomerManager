import { useState, useEffect } from 'react';
import {
  X, Download, FileText, Sparkles, MessageSquare,
  Building, Calendar, User, Tag, ExternalLink, Loader2
} from 'lucide-react';
import type { DispatchDocument } from '../../types/dispatch';
import { DISPATCH_TYPE_LABELS } from '../../types/dispatch';
import type { HfConfig } from '../../types/huggingface';
import { resolveFileDownloadUrl } from '../../lib/dispatch/dispatchStorage';
import { summarizeDocumentWithAi } from '../../lib/ai/geminiClient';
import { fileKindOf, isReadableByAi } from '../../lib/fileKinds';

interface DispatchPreviewModalProps {
  document: DispatchDocument | null;
  isOpen: boolean;
  onClose: () => void;
  /** Không truyền thì ẩn nút Hỏi đáp AI (màn không có trợ lý AI). */
  onOpenAiChat?: (doc: DispatchDocument) => void;
  onUpdated?: (updated: DispatchDocument) => void;
  /** Cấu hình HF dùng chung để tải tệp riêng tư; null khi chưa cấu hình. */
  hfConfig: HfConfig | null;
}

export function DispatchPreviewModal({
  document: doc,
  isOpen,
  onClose,
  onOpenAiChat,
  onUpdated,
  hfConfig,
}: DispatchPreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<DispatchDocument | null>(doc);

  useEffect(() => {
    setCurrentDoc(doc);
    setErrorMsg(null);
  }, [doc]);

  useEffect(() => {
    if (!doc) {
      setFileUrl('');
      return;
    }

    let active = true;
    setIsLoadingUrl(true);

    resolveFileDownloadUrl(doc, hfConfig)
      .then((url) => {
        if (active) {
          setFileUrl(url);
          setIsLoadingUrl(false);
        }
      })
      .catch((err) => {
        if (active) {
          setFileUrl('');
          setErrorMsg(err instanceof Error ? err.message : 'Không mở được tệp.');
          setIsLoadingUrl(false);
        }
      });

    return () => {
      active = false;
    };
  }, [doc, hfConfig]);

  if (!isOpen || !currentDoc) return null;

  const kind = fileKindOf(currentDoc.fileName, currentDoc.fileType);
  const isPdf = kind === 'pdf';
  const isImage = kind === 'image';
  const aiReadable = isReadableByAi(kind);

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = window.document.createElement('a');
    a.href = fileUrl;
    a.download = currentDoc.fileName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  const handleGenerateSummary = async () => {
    if (!currentDoc || isSummarizing) return;
    setIsSummarizing(true);
    setErrorMsg(null);
    try {
      const res = await summarizeDocumentWithAi(
        currentDoc.title,
        currentDoc.documentNumber,
        currentDoc.issuer,
        currentDoc.note
      );

      // Bản tóm tắt chỉ hiện trong phiên xem này, không ghi vào CSDL
      const updated: DispatchDocument = { ...currentDoc, aiSummary: res.summary, aiKeywords: res.keywords };

      setCurrentDoc(updated);
      onUpdated?.(updated);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Không tạo được bản tóm tắt.');
    } finally {
      setIsSummarizing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="w-full max-w-5xl h-[92vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 truncate pr-2">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                {currentDoc.title}
              </div>
              <div className="text-[10px] text-slate-500 font-mono">
                Số: {currentDoc.documentNumber || 'Không có số'} • {currentDoc.fileName}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              title="Tải tệp xuống máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </button>

            {onOpenAiChat && aiReadable && (
            <button
              type="button"
              onClick={() => onOpenAiChat(currentDoc)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-700 hover:bg-teal-600 text-white transition-colors"
              title="Mở đoạn chat với AI để hỏi về văn bản này"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hỏi đáp AI</span>
            </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="px-5 py-2 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800">
            {errorMsg}
          </div>
        )}

        {/* Khung nội dung Preview & Sidebar metadata */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Vùng xem trước file */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-auto p-2 relative">
            {isLoadingUrl ? (
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                <span>Đang tải bản xem trước tệp...</span>
              </div>
            ) : isPdf && fileUrl ? (
              <iframe
                src={fileUrl}
                title="Bản xem trước PDF"
                className="w-full h-full rounded-lg bg-white border border-slate-200 dark:border-slate-800"
              />
            ) : isImage && fileUrl ? (
              <div className="max-w-full max-h-full flex items-center justify-center p-4">
                <img
                  src={fileUrl}
                  alt={currentDoc.title}
                  className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-md"
                />
              </div>
            ) : (
              /* Trường hợp file Word, Excel hoặc định dạng khác */
              <div className="max-w-md w-full p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-teal-500/10 text-teal-600 flex items-center justify-center mx-auto">
                  <FileText className="w-8 h-8" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {currentDoc.fileName}
                  </h4>
                  <p className="text-xs text-slate-500 mt-1">
                    Định dạng {currentDoc.fileType || 'tài liệu'} • {(currentDoc.fileSize / 1024).toFixed(1)} KB
                  </p>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  {aiReadable
                    ? 'Trình duyệt không hỗ trợ xem trước trực tiếp định dạng văn bản này. Bạn có thể tải file về để mở trên máy tính hoặc sử dụng AI để tóm tắt các điểm chính.'
                    : 'Định dạng này không xem trước được. Hãy tải tệp về để mở trên máy tính.'}
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={handleDownload}
                    className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold flex items-center gap-2"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải tệp về máy</span>
                  </button>
                  {fileUrl && (
                    <a
                      href={fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Mở tab mới</span>
                    </a>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar thông tin chi tiết & AI Summary */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col p-4 overflow-y-auto space-y-4 text-xs">
            {/* Thuộc tính văn bản */}
            <div>
              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs uppercase tracking-wider mb-2.5 pb-1 border-b border-slate-100 dark:border-slate-800">
                Thông tin hành chính
              </h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Loại văn bản</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {DISPATCH_TYPE_LABELS[currentDoc.documentType] || currentDoc.documentType}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Building className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Cơ quan ban hành</span>
                    <span className="text-slate-800 dark:text-slate-200">{currentDoc.issuer || 'N/A'}</span>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <Calendar className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-slate-500 block text-[10px]">Ngày ban hành / Tiếp nhận</span>
                    <span className="text-slate-800 dark:text-slate-200">
                      {currentDoc.documentDate || 'N/A'} / {currentDoc.receivedDate || 'N/A'}
                    </span>
                  </div>
                </div>

                {currentDoc.customerName && (
                  <div className="flex items-start gap-2">
                    <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <span className="text-slate-500 block text-[10px]">Khách hàng liên quan</span>
                      <span className="font-medium text-slate-800 dark:text-slate-200">
                        {currentDoc.customerName}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Khối AI Tóm tắt nội dung */}
            {aiReadable && (
            <div className="rounded-xl p-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                  <span>AI Tóm tắt văn bản</span>
                </div>
                {!currentDoc.aiSummary && (
                  <button
                    type="button"
                    onClick={handleGenerateSummary}
                    disabled={isSummarizing}
                    className="text-[11px] text-teal-700 dark:text-teal-400 hover:underline font-semibold"
                  >
                    {isSummarizing ? 'Đang tóm tắt...' : 'Tóm tắt ngay'}
                  </button>
                )}
              </div>

              {currentDoc.aiSummary ? (
                <div className="space-y-2">
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed text-[11px]">
                    {currentDoc.aiSummary}
                  </p>
                  {currentDoc.aiKeywords && currentDoc.aiKeywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {currentDoc.aiKeywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-slate-200/70 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                  Chưa có bản tóm tắt tự động. Bạn có thể bấm nút &quot;Tóm tắt ngay&quot; để AI phân tích các ý chính của tài liệu này.
                </p>
              )}
            </div>
            )}

            {/* Ghi chú */}
            {currentDoc.note && (
              <div>
                <span className="text-slate-500 block text-[10px] uppercase font-semibold">Ghi chú</span>
                <p className="text-slate-700 dark:text-slate-300 text-[11px] mt-0.5 bg-slate-50 dark:bg-slate-800/40 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                  {currentDoc.note}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
