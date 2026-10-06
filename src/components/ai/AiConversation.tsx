import { useEffect, useRef, useState } from 'react';
import { Copy, Check, FileText, Sparkles, Loader2 } from 'lucide-react';
import type { AiChatMessage, StarterPrompt } from '../../types/ai';
import { BANKING_STARTER_PROMPTS } from '../../types/ai';
import { FelixAiAvatar } from './FelixAiAvatar';
import { AiMarkdownMessage } from './AiMarkdownMessage';

interface AiConversationProps {
  messages: AiChatMessage[];
  isStreaming: boolean;
  streamingText: string;
  onSelectPrompt: (prompt: string) => void;
  onClearHistory?: () => void;
}

export function AiConversation({
  messages,
  isStreaming,
  streamingText,
  onSelectPrompt,
}: AiConversationProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Cuộn xuống cuối khi có tin nhắn mới hoặc đang stream
  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  }, [messages, streamingText, isStreaming]);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messages.length === 0 ? (
        <EmptyWelcomeState onSelectPrompt={onSelectPrompt} />
      ) : (
        <>
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {msg.role === 'assistant' ? (
                <FelixAiAvatar size="sm" status="idle" />
              ) : (
                <div className="w-7 h-7 rounded-xl bg-slate-700 text-slate-100 flex items-center justify-center text-xs font-semibold shrink-0 select-none">
                  KH
                </div>
              )}

              <div
                className={`rounded-2xl p-3.5 text-xs shadow-2xs ${
                  msg.role === 'user'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 rounded-tr-xs'
                    : 'bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700/80 text-slate-800 dark:text-slate-200 rounded-tl-xs'
                }`}
              >
                {/* Header người gửi & Đính kèm */}
                <div className="flex items-center justify-between gap-3 mb-1.5 pb-1 border-b border-slate-200/40 dark:border-slate-700/40 text-[10px]">
                  <span className="font-semibold opacity-75">
                    {msg.role === 'user' ? 'Bạn' : 'Trợ lý Tín dụng & Văn thư'}
                  </span>
                  <span className="opacity-50">
                    {new Date(msg.createdAt).toLocaleTimeString('vi-VN', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                {/* Văn bản đính kèm nếu có */}
                {msg.attachedDocumentTitle && (
                  <div className="mb-2 p-1.5 rounded-lg bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Văn bản: {msg.attachedDocumentTitle}</span>
                  </div>
                )}

                {/* Nội dung tin nhắn */}
                {msg.role === 'user' ? (
                  <div className="whitespace-pre-wrap leading-relaxed">{msg.content}</div>
                ) : (
                  <AiMarkdownMessage content={msg.content} />
                )}

                {/* Actions chân tin nhắn AI */}
                {msg.role === 'assistant' && (
                  <div className="mt-2.5 pt-1.5 border-t border-slate-100 dark:border-slate-700/50 flex items-center justify-end gap-2 text-[10px] text-slate-400">
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.content)}
                      className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                      title="Sao chép nội dung"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-500" />
                          <span className="text-emerald-500">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Sao chép</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Luồng phản hồi đang streaming */}
          {isStreaming && (
            <div className="flex items-start gap-3 max-w-3xl mr-auto">
              <FelixAiAvatar size="sm" status="thinking" />
              <div className="rounded-2xl rounded-tl-xs p-3.5 text-xs bg-white dark:bg-slate-800 border border-teal-500/30 text-slate-800 dark:text-slate-200 shadow-sm min-w-[200px]">
                <div className="flex items-center gap-2 pb-1.5 mb-2 border-b border-slate-100 dark:border-slate-700 text-[10px] text-teal-600 dark:text-teal-400 font-medium">
                  <Loader2 className="w-3 h-3 animate-spin text-teal-600" />
                  <span>Trợ lý AI đang phân tích & phản hồi...</span>
                </div>

                {streamingText ? (
                  <div>
                    <AiMarkdownMessage content={streamingText} />
                    <span className="inline-block w-1.5 h-3.5 ml-1 bg-teal-500 animate-pulse align-middle" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-400 py-1">
                    <span>Đang kết nối mô hình xử lý văn bản...</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

function EmptyWelcomeState({ onSelectPrompt }: { onSelectPrompt: (p: string) => void }) {
  return (
    <div className="max-w-2xl mx-auto py-6 text-center space-y-6">
      <div className="space-y-2">
        <FelixAiAvatar size="xl" status="idle" className="mx-auto" />
        <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-2">
          <span>Trợ Lý AI Tín Dụng & Quản Lý Văn Thư</span>
          <Sparkles className="w-4 h-4 text-teal-600" />
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
          Hỗ trợ tra cứu quy chuẩn tín dụng, thẩm định hồ sơ, tính toán lịch trả nợ, tóm tắt và phân tích công văn, văn thư lưu trữ.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left pt-2">
        {BANKING_STARTER_PROMPTS.map((starter: StarterPrompt, idx: number) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelectPrompt(starter.prompt)}
            className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/60 hover:border-teal-500/50 hover:bg-teal-50/30 dark:hover:bg-teal-950/20 transition-all text-left shadow-2xs group cursor-pointer"
          >
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
                {starter.badge}
              </span>
            </div>
            <div className="text-xs font-medium text-slate-800 dark:text-slate-200 group-hover:text-teal-700 dark:group-hover:text-teal-400 transition-colors">
              {starter.title}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
