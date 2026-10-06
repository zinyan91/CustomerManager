import { forwardRef, useImperativeHandle, useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, X, FileText, ChevronDown, Image as ImageIcon, AlertCircle } from 'lucide-react';
import type { DispatchDocument } from '../../types/dispatch';
import type { AiAttachment } from '../../types/ai';
import { convertFilesToAiAttachments, formatFileSize } from '../../lib/ai/fileToAttachment';
import { ATTACHMENT_INTENTS, intentsFor, type AttachmentIntentId } from '../../lib/ai/attachmentIntents';

interface AiComposerProps {
  /** `intent` có khi người dùng chọn một việc với tệp (tóm tắt, đọc, thêm văn bản mới) thay vì tự gõ câu hỏi. */
  onSend: (message: string, attachments?: AiAttachment[], intent?: AttachmentIntentId) => void;
  /** Hiện lựa chọn "Thêm văn bản mới" (tài khoản được thêm văn bản vào Văn thư). */
  canRecord?: boolean;
  onStop: () => void;
  isStreaming: boolean;
  attachedDoc: DispatchDocument | null;
  onRemoveAttachedDoc: () => void;
  availableDispatches?: DispatchDocument[];
  onSelectDispatch?: (doc: DispatchDocument) => void;
  placeholder?: string;
}

export interface AiComposerHandle {
  /** Thêm tệp (kéo thả từ ngoài vào) vào danh sách đính kèm; không gửi, chờ người dùng Enter. */
  addFiles: (files: File[]) => void;
}

export const AiComposer = forwardRef<AiComposerHandle, AiComposerProps>(function AiComposer({
  onSend,
  canRecord = false,
  onStop,
  isStreaming,
  attachedDoc,
  onRemoveAttachedDoc,
  availableDispatches = [],
  onSelectDispatch,
  placeholder = 'Nhập câu hỏi hoặc kéo thả tệp vào đây...',
}, ref) {
  const [text, setText] = useState('');
  const [showDocPicker, setShowDocPicker] = useState(false);
  const [attachments, setAttachments] = useState<AiAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isReadingFiles, setIsReadingFiles] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tự động chỉnh độ cao textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const hasText = Boolean(text.trim());
    // Có tệp mà chưa gõ gì: phải chọn một việc ở dải lựa chọn, không tự gửi câu hỏi mặc định
    if (!hasText || isStreaming) return;

    const msg = text;
    const atts = attachments.length > 0 ? [...attachments] : undefined;
    setText('');
    setAttachments([]);
    setUploadError(null);
    if (atts) {
      onSend(msg, atts);
    } else {
      onSend(msg);
    }

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const processFileList = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setIsReadingFiles(true);
    setUploadError(null);
    try {
      const { attachments: newAtts, errors } = await convertFilesToAiAttachments(files);
      if (newAtts.length > 0) {
        setAttachments((prev) => [...prev, ...newAtts]);
      }
      if (errors.length > 0) {
        setUploadError(errors.join('. '));
      }
    } catch (err: any) {
      setUploadError(err.message || 'Không thể đọc tệp tin.');
    } finally {
      setIsReadingFiles(false);
    }
  };

  useImperativeHandle(ref, () => ({ addFiles: (files) => void processFileList(files) }));

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      void processFileList(e.target.files);
    }
    // Reset input để có thể chọn lại cùng 1 file nếu muốn
    e.target.value = '';
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData.items;
    const pastedFiles: File[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.kind === 'file') {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }

    if (pastedFiles.length > 0) {
      e.preventDefault();
      void processFileList(pastedFiles);
    }
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const canSend = Boolean(text.trim()) && !isStreaming && !isReadingFiles;

  const sendWithIntent = (id: AttachmentIntentId) => {
    if (isStreaming || isReadingFiles || attachments.length === 0) return;
    const prompt = ATTACHMENT_INTENTS.find((i) => i.id === id)?.prompt ?? '';
    const atts = [...attachments];
    setText('');
    setAttachments([]);
    setUploadError(null);
    onSend(prompt, atts, id);
  };

  const intents = intentsFor(canRecord, Boolean(text.trim()));

  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
      {/* Thông báo lỗi khi upload */}
      {uploadError && (
        <div className="mb-2 max-w-3xl mx-auto flex items-center justify-between p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-1 hover:text-rose-900 dark:hover:text-rose-100 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Dải hiển thị tệp / hình ảnh đang đính kèm */}
      {attachments.length > 0 && (
        <div className="mb-2 max-w-3xl mx-auto flex flex-wrap gap-2">
          {attachments.map((att) => (
            <div
              key={att.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs text-xs text-slate-800 dark:text-slate-200 max-w-xs group"
            >
              {att.mimeType.startsWith('image/') ? (
                att.previewUrl ? (
                  <img
                    src={att.previewUrl}
                    alt={att.name}
                    className="w-6 h-6 object-cover rounded-md border border-slate-200 dark:border-slate-700 shrink-0"
                  />
                ) : (
                  <ImageIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )
              ) : (
                <FileText className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              )}

              <div className="min-w-0 flex-1">
                <div className="truncate font-medium text-[11px]" title={att.name}>
                  {att.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {formatFileSize(att.size)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleRemoveAttachment(att.id)}
                className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-md transition-colors cursor-pointer shrink-0"
                title="Gỡ tệp"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Chọn việc cần làm với tệp vừa đính kèm */}
      {attachments.length > 0 && intents.length > 0 && (
        <div role="group" aria-label="Chọn việc cần làm với tệp" className="mb-2 max-w-3xl mx-auto flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Bạn muốn làm gì với tệp này?</span>
          {intents.map((i) => (
            <button
              key={i.id}
              type="button"
              disabled={isStreaming || isReadingFiles}
              onClick={() => sendWithIntent(i.id)}
              className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-medium hover:border-teal-600 hover:text-teal-800 dark:hover:text-teal-300 disabled:opacity-50 cursor-pointer"
            >
              {i.label}
            </button>
          ))}
        </div>
      )}

      {/* Khối hiển thị văn bản đang đính kèm từ kho */}
      {attachedDoc && (
        <div className="mb-2 max-w-3xl mx-auto flex items-center justify-between px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-800 dark:text-teal-300">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
            <span className="font-semibold shrink-0">Hồ sơ kho:</span>
            <span className="truncate">{attachedDoc.title}</span>
            {attachedDoc.documentNumber && (
              <span className="px-1.5 py-0.2 rounded bg-teal-100 dark:bg-teal-900 text-[10px] font-mono text-teal-700 dark:text-teal-300 shrink-0">
                {attachedDoc.documentNumber}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onRemoveAttachedDoc}
            className="p-1 text-teal-600 hover:text-rose-600 rounded-md transition-colors cursor-pointer"
            title="Gỡ văn bản đính kèm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Khung soạn thảo */}
      <div className="max-w-3xl mx-auto flex items-end gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 p-2 shadow-2xs focus-within:border-teal-600 dark:focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 relative">
        {/* Input file ẩn */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf"
          multiple
          className="hidden"
          onChange={handleFileInputChange}
          aria-label="Tải ảnh hoặc file PDF lên"
        />

        {/* Nút đính kèm hình ảnh / PDF từ máy tính */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isReadingFiles}
          className="p-2 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-50"
          title="Đính kèm hình ảnh hoặc file PDF để AI đọc và phân tích"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Nút đính kèm văn thư từ kho */}
        {availableDispatches.length > 0 && onSelectDispatch && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDocPicker(!showDocPicker)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
              title="Đính kèm văn bản từ sổ văn thư"
            >
              <FileText className="w-4 h-4" />
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Menu chọn văn bản */}
            {showDocPicker && (
              <div className="absolute bottom-full left-0 mb-2 w-80 max-h-60 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-50 p-1.5 text-xs">
                <div className="px-2 py-1 font-semibold text-slate-500 text-[11px] border-b border-slate-100 dark:border-slate-700 mb-1">
                  Chọn văn bản đính kèm:
                </div>
                {availableDispatches.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      onSelectDispatch(doc);
                      setShowDocPicker(false);
                    }}
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors flex items-start gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 mt-0.5 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <div className="font-medium text-slate-800 dark:text-slate-200 truncate">{doc.title}</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">
                        {doc.documentNumber || 'Không có số'} • {doc.documentDate || 'N/A'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <textarea
          ref={textareaRef}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder={placeholder}
          className="flex-1 max-h-32 min-h-[38px] bg-transparent border-none text-xs focus:outline-none text-slate-900 dark:text-slate-100 placeholder:text-slate-400 px-2 py-2 resize-none leading-relaxed"
        />

        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="p-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title="Dừng phản hồi"
          >
            <Square className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend}
            className="p-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title="Gửi tin nhắn"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
});
