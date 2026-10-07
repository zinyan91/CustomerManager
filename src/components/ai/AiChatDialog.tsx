import { useRef, useState } from 'react';
import {
  X, Plus, Trash2, MessageSquare, Sparkles,
  Maximize2, Minimize2, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { FelixAiAvatar } from './FelixAiAvatar';
import { AiConversation } from './AiConversation';
import { AiComposer, type AiComposerHandle } from './AiComposer';
import { AiDocProposalCard } from './AiDocProposalCard';
import { AiCreditProposalCard } from './AiCreditProposalCard';
import { useAiAssistant } from '../../hooks/useAiAssistant';
import { useAiDocProposals } from '../../hooks/useAiDocProposals';
import { useAiCreditProposals } from '../../hooks/useAiCreditProposals';
import { useFileDrop } from '../../hooks/useFileDrop';
import { useResizableWidth } from '../../hooks/useResizableWidth';
import { useAuth } from '../../context/AuthContext';
import type { DispatchDocument } from '../../types/dispatch';

interface AiChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableDispatches?: DispatchDocument[];
  initialAttachedDoc?: DispatchDocument | null;
  mode?: 'sidebar' | 'drawer';
  /** AI đọc tệp gửi kèm và đề xuất ghi nhận vào Văn thư. Mặc định theo quyền dispatch.upload của tài khoản. */
  canRecordDocs?: boolean;
  onDocRecorded?: () => void;
}

export function AiChatDialog({
  isOpen,
  onClose,
  availableDispatches = [],
  initialAttachedDoc,
  mode = 'sidebar',
  canRecordDocs,
  onDocRecorded,
}: AiChatDialogProps) {
  const { user, can } = useAuth();
  // Chat riêng theo tài khoản: nhân viên khác đăng nhập trên cùng máy không thấy chat của nhau
  const assistant = useAiAssistant(user?.id ?? null);
  const composerRef = useRef<AiComposerHandle>(null);
  const recordAllowed = canRecordDocs ?? can('dispatch.upload');
  const docs = useAiDocProposals({ enabled: recordAllowed, model: assistant.model, onRecorded: onDocRecorded });
  const credit = useAiCreditProposals({ model: assistant.model });
  const { isDragging, dropHandlers } = useFileDrop((items) => composerRef.current?.addItems(items));
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const resize = useResizableWidth({ storageKey: 'cm_ai_chat_width', defaultWidth: 480, minWidth: 380, wideWidth: 800 });
  const isMaximized = resize.isWide;

  // Gắn doc ban đầu nếu được truyền vào
  if (initialAttachedDoc && assistant.attachedDoc?.id !== initialAttachedDoc.id) {
    assistant.setAttachedDoc(initialAttachedDoc);
  }

  if (!isOpen) return null;

  const chatContent = (
    <>
      {/* Header */}
      <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900 shrink-0 gap-2 shadow-2xs">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Danh sách phiên hội thoại"
          >
            {isSidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>

          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
            <FelixAiAvatar
              size="sm"
              status={assistant.isStreaming ? 'thinking' : 'idle'}
            />
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 flex-wrap">
                <span className="truncate">Trợ Lý AI Tín Dụng & Văn Thư</span>
                <select
                  value={assistant.model}
                  onChange={(e) => assistant.setModel(e.target.value)}
                  className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-teal-500/10 text-teal-800 dark:text-teal-300 border border-teal-500/30 cursor-pointer focus:outline-hidden shrink-0"
                  title="Chọn mô hình AI"
                >
                  <option value="gemini-3.8-flash">Gemini 3.8 Flash</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-3.1-flash-lite">Gemini 3.1 Flash Lite</option>
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                </select>
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[200px] sm:max-w-xs">
                {assistant.attachedDoc
                  ? `Đang xem: ${assistant.attachedDoc.title}`
                  : 'Sẵn sàng giải đáp & phân tích tài liệu'}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => assistant.createNewThread()}
            className="p-1.5 text-slate-500 hover:text-teal-700 dark:hover:text-teal-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1 text-xs shrink-0 cursor-pointer"
            title="Tạo cuộc trò chuyện mới"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline text-[11px] font-medium">Đoạn chat mới</span>
          </button>

          <button
            type="button"
            onClick={resize.toggleWide}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
            title={isMaximized ? 'Thu nhỏ' : 'Phóng to'}
          >
            {isMaximized ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors shrink-0 cursor-pointer"
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
          <div className="w-64 border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col p-2 space-y-1">
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
        <div {...dropHandlers} className="flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative">
          {isDragging && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-900/10 dark:bg-slate-100/10 border-2 border-dashed border-teal-600 rounded-lg pointer-events-none">
              <span className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 text-sm font-semibold text-slate-800 dark:text-slate-100 shadow">
                Thả tệp để đính kèm
              </span>
            </div>
          )}
          <AiConversation
            messages={assistant.messages}
            isStreaming={assistant.isStreaming}
            streamingText={assistant.streamingText}
            statusText={assistant.statusText}
            scrollKey={[...docs.proposals, ...credit.proposals].map((p) => `${p.id}:${p.status}`).join('|')}
            onRefreshAnswer={(id) => void assistant.refreshAnswer(id)}
            onSelectPrompt={(p) => assistant.sendMessage(p)}
            onClearHistory={assistant.clearMessages}
            footer={[
              ...credit.proposals.map((p) => (
                <AiCreditProposalCard
                  key={p.id}
                  proposal={p}
                  onEditCustomer={credit.editCustomer}
                  onEditCollateral={credit.editCollateral}
                  onRemoveCollateral={credit.removeCollateral}
                  onLookup={(id) => void credit.lookup(id)}
                  onRecord={(id) => void credit.record(id)}
                  onDismiss={credit.dismiss}
                />
              )),
              ...docs.proposals.map((p) => (
              <AiDocProposalCard
                key={p.id}
                proposal={p}
                onEdit={docs.edit}
                onRecord={docs.record}
                onDismiss={docs.dismiss}
                onRemoveForm={docs.removeForm}
                onResearchForms={docs.researchForms}
              />
              )),
            ]}
          />

          <AiComposer
            ref={composerRef}
            canRecord={recordAllowed}
            onSend={(msg, atts, intent, formFiles, appendices) => {
              // "Thêm văn bản mới": AI chỉ trích các trường để người dùng xem rồi xác nhận, không trả lời trong chat
              if (intent === 'record') {
                if (atts) docs.propose(atts, formFiles ?? [], appendices ?? []);
                return;
              }
              // "Nhập hồ sơ tín dụng": AI trích khách hàng và tài sản bảo đảm để người dùng xem rồi ghi, không trả lời trong chat
              if (intent === 'credit') {
                if (atts) credit.propose(atts);
                return;
              }
              void assistant.sendMessage(msg, undefined, atts);
            }}
            onStop={assistant.stopStreaming}
            isStreaming={assistant.isStreaming}
            attachedDoc={assistant.attachedDoc}
            onRemoveAttachedDoc={() => assistant.setAttachedDoc(null)}
            availableDispatches={availableDispatches}
            onSelectDispatch={(doc) => assistant.setAttachedDoc(doc)}
          />
        </div>
      </div>
    </>
  );

  // Thanh kéo ở mép trái: kéo để đổi độ rộng, nhấp đúp để về mặc định
  const resizeHandle = (
    <div
      {...resize.handleProps}
      className={`absolute inset-y-0 left-0 z-30 w-1.5 cursor-col-resize touch-none transition-colors hover:bg-teal-500/50 focus-visible:bg-teal-500/60 focus:outline-hidden ${
        resize.isDragging ? 'bg-teal-500/60' : ''
      }`}
    />
  );

  if (mode === 'sidebar') {
    return (
      <aside
        aria-label="Trợ lý AI Tín dụng & Văn thư"
        style={{ width: resize.width }}
        className="relative h-full max-w-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-20 max-md:fixed max-md:inset-0 max-md:z-50 max-md:w-full! max-md:border-l-0"
      >
        {resizeHandle}
        {chatContent}
      </aside>
    );
  }

  return (
    <div className="fixed top-[56px] bottom-0 right-0 z-40 flex pointer-events-none animate-in slide-in-from-right duration-200">
      <div
        style={{ width: resize.width }}
        className="pointer-events-auto isolate relative h-full max-w-full bg-white dark:bg-slate-900 shadow-2xl border-l border-slate-200 dark:border-slate-800 flex flex-col"
      >
        {resizeHandle}
        {chatContent}
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
