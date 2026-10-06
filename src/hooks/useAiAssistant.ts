import { useState, useCallback, useRef, useEffect } from 'react';
import type { AiChatMessage, AiThreadSummary, AiAttachment } from '../types/ai';
import type { DispatchDocument } from '../types/dispatch';
import { streamGeminiContent, DEFAULT_AI_MODEL } from '../lib/ai/geminiClient';
import { fetchSystemContextData, mentionsCustomers, type SystemContextData } from '../lib/ai/systemContext';
import { prepareDocContext, lookupSharedAnswer, EMPTY_DOC_CONTEXT, type SharedLookup } from '../lib/ai/docContext';
import { questionKey, saveCachedAnswer } from '../lib/ai/answerCache';
import { loadMessages, loadThreads, removeThread, saveMessages, saveThreads } from '../lib/ai/chatStorage';

const NL2 = '\n\n';

export interface SendOptions {
  /** Bỏ qua câu trả lời dùng chung và đọc lại văn bản (nút "Hỏi lại AI"). */
  skipCache?: boolean;
  /** Lịch sử làm gốc thay cho `messages` hiện tại (khi hỏi lại một câu đã có). */
  baseHistory?: AiChatMessage[];
}

/**
 * Trợ lý AI: chat riêng theo tài khoản (userId) và bộ nhớ trả lời dùng chung cho các câu hỏi về văn bản Văn thư.
 * userId null (chưa đăng nhập) thì chat chỉ nằm trong bộ nhớ, không lưu.
 */
export function useAiAssistant(userId: string | null = null) {
  const [threads, setThreads] = useState<AiThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [attachedDoc, setAttachedDoc] = useState<DispatchDocument | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_AI_MODEL);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('');

  const abortControllerRef = useRef<boolean>(false);
  // Văn bản đang bàn ở lượt trước: câu hỏi nối tiếp ("bảng lãi suất chi tiết?") không phải nêu lại số hiệu
  const focusDocIdsRef = useRef<string[]>([]);
  // Thread vừa tạo trong lúc gửi tin: tin nhắn đã nằm trong state, không nạp đè từ kho lưu
  const freshThreadRef = useRef<string | null>(null);

  // Đổi tài khoản thì nạp đúng lịch sử của tài khoản đó, không để lại gì của người trước
  useEffect(() => {
    focusDocIdsRef.current = [];
    freshThreadRef.current = null;
    const list = loadThreads(userId);
    setThreads(list);
    setActiveThreadId(list[0]?.id ?? null);
    setAttachedDoc(null);
    setError(null);
    setStatusText('');
  }, [userId]);

  useEffect(() => {
    if (activeThreadId && activeThreadId === freshThreadRef.current) return;
    setMessages(activeThreadId ? loadMessages(userId, activeThreadId) : []);
  }, [activeThreadId, userId]);

  const createNewThread = useCallback(
    (firstMessageText?: string) => {
      const newId = `th_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const title = firstMessageText
        ? firstMessageText.length > 35
          ? `${firstMessageText.slice(0, 32)}...`
          : firstMessageText
        : 'Cuộc trò chuyện mới';

      const newThread: AiThreadSummary = {
        id: newId,
        title,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const nextThreads = [newThread, ...threads];
      setThreads(nextThreads);
      saveThreads(userId, nextThreads);
      focusDocIdsRef.current = [];
      freshThreadRef.current = newId;
      setActiveThreadId(newId);
      setMessages([]);
      return newId;
    },
    [threads, userId]
  );

  const selectThread = useCallback((id: string) => {
    focusDocIdsRef.current = [];
    freshThreadRef.current = null;
    setActiveThreadId(id);
  }, []);

  const deleteThread = useCallback(
    (id: string) => {
      const filtered = threads.filter((t) => t.id !== id);
      setThreads(filtered);
      saveThreads(userId, filtered);
      removeThread(userId, id);

      if (activeThreadId === id) {
        if (filtered.length > 0) {
          setActiveThreadId(filtered[0].id);
        } else {
          setActiveThreadId(null);
          setMessages([]);
        }
      }
    },
    [threads, activeThreadId, userId]
  );

  const stopStreaming = useCallback(() => {
    abortControllerRef.current = true;
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    if (activeThreadId) saveMessages(userId, activeThreadId, []);
  }, [activeThreadId, userId]);

  const sendMessage = useCallback(
    async (text: string, overrideDoc?: DispatchDocument | null, attachments?: AiAttachment[], options: SendOptions = {}) => {
      const cleanText = text.trim();
      const hasAttachments = Boolean(attachments && attachments.length > 0);
      if ((!cleanText && !hasAttachments) || isStreaming) return;

      abortControllerRef.current = false;
      setError(null);

      const targetDoc = overrideDoc !== undefined ? overrideDoc : attachedDoc;
      const history = options.baseHistory ?? messages;

      let currentThreadId = activeThreadId;
      if (!currentThreadId) {
        const titleText = cleanText || (hasAttachments && attachments ? `Tài liệu: ${attachments[0].name}` : 'Cuộc trò chuyện');
        currentThreadId = createNewThread(titleText);
      }
      const threadId = currentThreadId;

      const defaultPrompt = hasAttachments
        ? 'Tóm tắt nội dung tài liệu đính kèm.'
        : '';

      const userMsg: AiChatMessage = {
        id: `msg_u_${Date.now()}`,
        role: 'user',
        content: cleanText || defaultPrompt,
        createdAt: new Date().toISOString(),
        attachedDocumentId: targetDoc?.id,
        attachedDocumentTitle: targetDoc?.title,
        attachments: hasAttachments ? attachments : undefined,
      };

      const updatedHistory = [...history, userMsg];
      setMessages(updatedHistory);
      saveMessages(userId, threadId, updatedHistory);

      setIsStreaming(true);
      setStreamingText('');

      const commitAssistant = (content: string, fromCache = false) => {
        const assistantMsg: AiChatMessage = {
          id: `msg_a_${Date.now()}`,
          role: 'assistant',
          content,
          createdAt: new Date().toISOString(),
          fromCache: fromCache || undefined,
        };
        const finalMessages = [...updatedHistory, assistantMsg];
        setMessages(finalMessages);
        saveMessages(userId, threadId, finalMessages);

        setThreads((prev) => {
          const next = prev.map((t) =>
            t.id === threadId ? { ...t, lastMessagePreview: content.slice(0, 60), updatedAt: new Date().toISOString() } : t
          );
          saveThreads(userId, next);
          return next;
        });
      };

      // Chỉ câu hỏi mở đầu một cuộc chat, không kèm tệp riêng hay khách hàng, mới dùng chung được:
      // câu nối tiếp phụ thuộc ngữ cảnh, còn dữ liệu khách hàng không được chia sẻ giữa các tài khoản.
      const key = questionKey(cleanText);
      const shareable = history.length === 0 && !hasAttachments && !targetDoc && !mentionsCustomers(cleanText) && key !== '';

      setStatusText('Đang tra cứu văn bản...');
      let lookup: SharedLookup | null = null;
      if (shareable && !options.skipCache) {
        lookup = await lookupSharedAnswer(cleanText);
        if (lookup.hit) {
          commitAssistant(lookup.hit.answer, true);
          setIsStreaming(false);
          setStatusText('');
          return;
        }
      }

      // Tạo ngữ cảnh văn bản đính kèm nếu có
      let docContext: string | undefined;
      if (targetDoc) {
        docContext = `Văn bản: "${targetDoc.title}" (Số: ${targetDoc.documentNumber || 'N/A'}, Loại: ${targetDoc.documentType}, Cơ quan ký: ${targetDoc.issuer || 'N/A'}, Ngày ban hành: ${targetDoc.documentDate || 'N/A'}).\nTóm tắt sơ bộ: ${targetDoc.aiSummary || 'Chưa có'}\nGhi chú: ${targetDoc.note || 'Không có'}`;
      }

      // Dữ liệu hệ thống và nội dung các văn bản liên quan được lấy song song để phản hồi đầu đến sớm
      let systemData: SystemContextData | undefined;
      let docs = EMPTY_DOC_CONTEXT;
      try {
        const [sys, prepared] = await Promise.all([
          fetchSystemContextData({ includeCustomers: mentionsCustomers(cleanText) }).catch((err) => {
            console.warn('Lỗi thu thập dữ liệu hệ thống cho AI:', err);
            return undefined;
          }),
          prepareDocContext(cleanText, focusDocIdsRef.current, { onStatus: setStatusText, index: lookup?.index ?? undefined }),
        ]);
        systemData = sys;
        docs = prepared;
      } catch (err) {
        console.warn('Lỗi chuẩn bị nội dung văn bản cho AI:', err);
      }
      focusDocIdsRef.current = docs.focusIds;
      if (docs.contextText) {
        docContext = [docContext, docs.contextText].filter(Boolean).join(NL2);
      }
      setStatusText(docs.attachments.length > 0 ? 'AI đang đọc nội dung văn bản...' : '');

      let accumulated = '';
      let failed = false;
      let usedFallback = false;
      try {
        const stream = streamGeminiContent(updatedHistory, docContext, model, systemData, {
          attachments: docs.attachments,
          onFallback: () => {
            usedFallback = true;
          },
        });
        for await (const chunk of stream) {
          if (abortControllerRef.current) break;
          accumulated += chunk;
          setStreamingText(accumulated);
        }
      } catch (err: any) {
        failed = true;
        console.error('Lỗi khi trò chuyện với AI:', err);
        setError(err.message || 'Lỗi kết nối AI');
        accumulated += '\n\n*(Đã xảy ra gián đoạn trong quá trình xử lý phản hồi)*';
      } finally {
        setIsStreaming(false);
        setStreamingText('');
        setStatusText('');

        if (accumulated.trim()) commitAssistant(accumulated);
      }

      // Lưu cho người sau chỉ khi câu trả lời thật sự dựa trên nội dung văn bản đã đọc đủ và trọn vẹn
      if (shareable && !failed && !usedFallback && !abortControllerRef.current && docs.complete && accumulated.trim()) {
        saveCachedAnswer({ key, question: cleanText, answer: accumulated, docRefs: docs.refs, model }).catch((err) =>
          console.warn('Không lưu được câu trả lời vào bộ nhớ dùng chung:', err)
        );
      }
    },
    [isStreaming, attachedDoc, activeThreadId, messages, createNewThread, model, userId]
  );

  /** Hỏi lại AI một câu đã nhận câu trả lời dùng chung: bỏ bộ nhớ, đọc lại văn bản và làm mới câu trả lời. */
  const refreshAnswer = useCallback(
    async (assistantMessageId: string) => {
      const idx = messages.findIndex((m) => m.id === assistantMessageId);
      const question = idx > 0 ? messages[idx - 1] : null;
      if (!question || question.role !== 'user') return;
      const base = messages.slice(0, idx - 1);
      setMessages(base);
      if (activeThreadId) saveMessages(userId, activeThreadId, base);
      await sendMessage(question.content, undefined, undefined, { skipCache: true, baseHistory: base });
    },
    [messages, activeThreadId, userId, sendMessage]
  );

  const askAboutDocument = useCallback(
    (doc: DispatchDocument) => {
      setAttachedDoc(doc);
      const prompt = `Tôi muốn phân tích văn bản "${doc.title}" (Số hiệu: ${doc.documentNumber || 'N/A'}). Bạn hãy tóm tắt các điểm trọng tâm, đối tượng áp dụng và những điều kiện/nghĩa vụ pháp lý cần đặc biệt lưu ý trong hồ sơ này.`;
      sendMessage(prompt, doc);
    },
    [sendMessage]
  );

  return {
    threads,
    activeThreadId,
    messages,
    isStreaming,
    streamingText,
    statusText,
    attachedDoc,
    model,
    error,
    setModel,
    setAttachedDoc,
    sendMessage,
    refreshAnswer,
    stopStreaming,
    clearMessages,
    createNewThread,
    selectThread,
    deleteThread,
    askAboutDocument,
  };
}
