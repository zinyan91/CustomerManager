import { useState, useEffect } from 'react';
import { X, Download, FileText, MessageSquare, ExternalLink, Loader2 } from 'lucide-react';
import type { DispatchDocument } from '../../types/dispatch';
import { resolveFileDownloadUrl } from '../../lib/dispatch/dispatchStorage';
import { fileKindOf, isReadableByAi } from '../../lib/fileKinds';
import { formatBytes } from '../../lib/formatBytes';

interface DispatchPreviewModalProps {
  document: DispatchDocument | null;
  isOpen: boolean;
  onClose: () => void;
  /** Không truyền thì ẩn nút Hỏi đáp AI (màn không có trợ lý AI). */
  onOpenAiChat?: (doc: DispatchDocument) => void;
}

function previewSubtitle(doc: Pick<DispatchDocument, 'documentNumber' | 'fileName' | 'fileSize'>): string {
  return [
    doc.documentNumber ? `Số: ${doc.documentNumber}` : '',
    doc.fileName,
    doc.fileSize ? formatBytes(doc.fileSize) : '',
  ].filter(Boolean).join(' • ');
}

export function DispatchPreviewModal({ document: doc, isOpen, onClose, onOpenAiChat }: DispatchPreviewModalProps) {
  const [fileUrl, setFileUrl] = useState<string>('');
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrorMsg(null);
    if (!doc) {
      setFileUrl('');
      return;
    }

    let active = true;
    setIsLoadingUrl(true);
    resolveFileDownloadUrl(doc)
      .then((url) => {
        if (!active) return;
        setFileUrl(url);
        setIsLoadingUrl(false);
      })
      .catch((err) => {
        if (!active) return;
        setFileUrl('');
        setErrorMsg(err instanceof Error ? err.message : 'Không mở được tệp.');
        setIsLoadingUrl(false);
      });
    return () => {
      active = false;
    };
  }, [doc]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !doc) return null;

  const kind = fileKindOf(doc.fileName, doc.fileType);
  const isPdf = kind === 'pdf';
  const isImage = kind === 'image';
  const aiReadable = isReadableByAi(kind);

  const handleDownload = () => {
    if (!fileUrl) return;
    const a = window.document.createElement('a');
    a.href = fileUrl;
    a.download = doc.fileName;
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-1.5 sm:p-3 bg-slate-900/60 animate-in fade-in" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={doc.title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[1600px] h-[96dvh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden"
      >
        <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-1.5 rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-400 shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">{doc.title}</div>
              <div className="text-xs text-slate-500 truncate">{previewSubtitle(doc)}</div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {fileUrl && (
              <a
                href={fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mở tab mới</span>
              </a>
            )}
            <button
              type="button"
              onClick={handleDownload}
              disabled={!fileUrl}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải về</span>
            </button>
            {onOpenAiChat && aiReadable && (
              <button
                type="button"
                onClick={() => onOpenAiChat(doc)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-700 hover:bg-teal-600 text-white transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hỏi đáp AI</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {errorMsg && (
          <div role="alert" className="px-4 py-2 text-xs bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-300 border-b border-rose-200 dark:border-rose-800">
            {errorMsg}
          </div>
        )}

        <div className="flex-1 min-h-0 bg-slate-100 dark:bg-slate-950 flex items-center justify-center overflow-auto">
          {isLoadingUrl ? (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
              <span>Đang tải bản xem trước tệp...</span>
            </div>
          ) : isPdf && fileUrl ? (
            <iframe src={fileUrl} title="Bản xem trước PDF" className="w-full h-full bg-white" />
          ) : isImage && fileUrl ? (
            <img src={fileUrl} alt={doc.title} className="max-w-full max-h-full object-contain p-2" />
          ) : (
            <div className="max-w-md w-full m-4 p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 break-all">{doc.fileName}</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Định dạng {doc.fileType || 'tài liệu'}{doc.fileSize ? ` • ${formatBytes(doc.fileSize)}` : ''}
                </p>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {aiReadable
                  ? 'Trình duyệt không xem trước được định dạng này. Hãy tải tệp về để mở trên máy tính, hoặc dùng Hỏi đáp AI để hỏi về nội dung.'
                  : 'Định dạng này không xem trước được. Hãy tải tệp về để mở trên máy tính.'}
              </p>
              <button
                type="button"
                onClick={handleDownload}
                disabled={!fileUrl}
                className="px-4 py-2 rounded-lg bg-teal-700 hover:bg-teal-600 text-white text-xs font-semibold inline-flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải tệp về máy</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
