import { useState } from 'react';
import {
  X, Plus, Trash2, MessageSquare, Sparkles,
  Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { FelixAiAvatar } from './FelixAiAvatar';
import { AiConversation } from './AiConversation';
import { AiComposer } from './AiComposer';
import { useAiAssistant } from '../../hooks/useAiAssistant';
import type { DispatchDocument } from '../../types/dispatch';

interface AiChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableDispatches?: DispatchDocument[];
  initialAttachedDoc?: DispatchDocument | null;
}

export function AiChatDialog({
  isOpen,
  onClose,
  availableDispatches = [],
  initialAttachedDoc,
}: AiChatDialogProps) {
  const assistant = useAiAssistant();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  // Gắn doc ban đầu nếu được truyền vào
  if (initialAttachedDoc && assistant.attachedDoc?.id !== initialAttachedDoc.id) {
    assistant.setAttachedDoc(initialAttachedDoc);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex pointer-events-none animate-in slide-in-from-right duration-200">
      <div
        className={`pointer-events-auto h-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col transition-all duration-300 ease-in-out ${
          isMaximized
            ? 'w-screen sm:w-[680px] md:w-[760px] lg:w-[840px]'
            : 'w-screen sm:w-[440px] md:w-[480px] lg:w-[500px]'
        }`}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/90 dark:bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              title="Danh sách phiên hội thoại"
            >
              {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
            </button>

            <div className="flex items-center gap-2.5">
              <FelixAiAvatar
                size="sm"
                status={assistant.isStreaming ? 'thinking' : 'idle'}
              />
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                  <span>Trợ Lý AI Tín Dụng & Văn Thư</span>
                  <select
                    value={assistant.model}
                    onChange={(e) => assistant.setModel(e.target.value)}
                    className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/30 cursor-pointer focus:outline-hidden"
                    title="Chọn mô hình AI"
                  >
                    <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                    <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                    <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  </select>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-xs">
                  {assistant.attachedDoc
                    ? `Đang xem: ${assistant.attachedDoc.title}`
                    : 'Sẵn sàng giải đáp & phân tích tài liệu'}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => assistant.createNewThread()}
              className="p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs"
              title="Tạo cuộc trò chuyện mới"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline text-[11px] font-medium">Đoạn chat mới</span>
            </button>

            <button
              type="button"
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title={isMaximized ? 'Thu nhỏ' : 'Phóng to'}
            >
              {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Đóng cửa sổ"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Khung chính: Sidebar lịch sử + Vùng trò chuyện */}
        <div className="flex-1 flex min-h-0 relative">
          {/* Sidebar danh sách threads */}
          {isSidebarOpen && (
            <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 flex flex-col p-2 space-y-1">
              <div className="px-2 py-1 text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
                <span>Lịch sử trò chuyện</span>
              </div>

              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {assistant.threads.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">Chưa có phiên chat nào</div>
                ) : (
                  assistant.threads.map((t) => (
                    <div
                      key={t.id}
                      className={`group flex items-center justify-between p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                        t.id === assistant.activeThreadId
                          ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 font-medium'
                          : 'hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                      onClick={() => assistant.selectThread(t.id)}
                    >
                      <div className="flex items-center gap-2 truncate pr-1">
                        <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                        <span className="truncate">{t.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          assistant.deleteThread(t.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-600 transition-opacity"
                        title="Xóa phiên này"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Vùng trò chuyện */}
          <div className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900">
            <AiConversation
              messages={assistant.messages}
              isStreaming={assistant.isStreaming}
              streamingText={assistant.streamingText}
              onSelectPrompt={(p) => assistant.sendMessage(p)}
              onClearHistory={assistant.clearMessages}
            />

            <AiComposer
              onSend={(msg) => assistant.sendMessage(msg)}
              onStop={assistant.stopStreaming}
              isStreaming={assistant.isStreaming}
              attachedDoc={assistant.attachedDoc}
              onRemoveAttachedDoc={() => assistant.setAttachedDoc(null)}
              availableDispatches={availableDispatches}
              onSelectDispatch={(doc) => assistant.setAttachedDoc(doc)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Nút Floating Action Button mở trợ lý AI ở góc màn hình
 */
export function FloatingAiAssistantButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-5 right-5 z-40 p-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full shadow-lg border border-slate-700 transition-transform hover:scale-105 active:scale-95 flex items-center gap-2 group cursor-pointer"
      title="Mở Trợ lý AI Tín dụng & Quản lý văn thư"
    >
      <FelixAiAvatar size="sm" status="idle" showGlow={false} />
      <span className="text-xs font-semibold pr-1 hidden sm:inline">Trợ lý AI</span>
      <Sparkles className="w-3.5 h-3.5 text-teal-400 group-hover:animate-spin" />
    </button>
  );
}
