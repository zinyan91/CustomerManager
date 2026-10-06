import { useState, useRef, useEffect } from 'react';
import { Send, Square, Paperclip, X, FileText, ChevronDown } from 'lucide-react';
import type { DispatchDocument } from '../../types/dispatch';

interface AiComposerProps {
  onSend: (message: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  attachedDoc: DispatchDocument | null;
  onRemoveAttachedDoc: () => void;
  availableDispatches?: DispatchDocument[];
  onSelectDispatch?: (doc: DispatchDocument) => void;
  placeholder?: string;
}

export function AiComposer({
  onSend,
  onStop,
  isStreaming,
  attachedDoc,
  onRemoveAttachedDoc,
  availableDispatches = [],
  onSelectDispatch,
  placeholder = 'Nhập câu hỏi nghiệp vụ hoặc yêu cầu trợ giúp... (Enter để gửi, Shift+Enter xuống dòng)',
}: AiComposerProps) {
  const [text, setText] = useState('');
  const [showDocPicker, setShowDocPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Tự động chỉnh độ cao textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    if (!text.trim() || isStreaming) return;
    const msg = text;
    setText('');
    onSend(msg);
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

  return (
    <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60">
      {/* Khối hiển thị văn bản đang đính kèm */}
      {attachedDoc && (
        <div className="mb-2 max-w-3xl mx-auto flex items-center justify-between px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/60 text-xs text-teal-800 dark:text-teal-300">
          <div className="flex items-center gap-2 truncate">
            <FileText className="w-3.5 h-3.5 shrink-0 text-teal-600 dark:text-teal-400" />
            <span className="font-semibold shrink-0">Đính kèm:</span>
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
            className="p-1 text-teal-600 hover:text-rose-600 rounded-md transition-colors"
            title="Gỡ văn bản đính kèm"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Khung soạn thảo */}
      <div className="max-w-3xl mx-auto flex items-end gap-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 p-2 shadow-2xs focus-within:border-teal-600 dark:focus-within:border-teal-500 focus-within:ring-2 focus-within:ring-teal-500/20 relative">
        {/* Nút đính kèm văn thư */}
        {availableDispatches.length > 0 && onSelectDispatch && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowDocPicker(!showDocPicker)}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1"
              title="Đính kèm văn bản từ kho văn thư để AI phân tích"
            >
              <Paperclip className="w-4 h-4" />
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
                    className="w-full text-left p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors flex items-start gap-2"
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
            disabled={!text.trim()}
            className="p-2 bg-teal-700 hover:bg-teal-600 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 cursor-pointer"
            title="Gửi tin nhắn"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
