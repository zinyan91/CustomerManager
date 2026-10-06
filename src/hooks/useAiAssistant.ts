import { useState, useCallback, useRef, useEffect } from 'react';
import type { AiChatMessage, AiThreadSummary } from '../types/ai';
import type { DispatchDocument } from '../types/dispatch';
import { streamGeminiContent, DEFAULT_AI_MODEL } from '../lib/ai/geminiClient';

const STORAGE_KEY_THREADS = 'cm_ai_threads_v1';
const STORAGE_KEY_MESSAGES = 'cm_ai_messages_v1_';

export function useAiAssistant() {
  const [threads, setThreads] = useState<AiThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [attachedDoc, setAttachedDoc] = useState<DispatchDocument | null>(null);
  const [model, setModel] = useState<string>(DEFAULT_AI_MODEL);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<boolean>(false);

  // Nạp danh sách threads từ localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_THREADS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setThreads(parsed);
          setActiveThreadId(parsed[0].id);
        }
      }
    } catch {}
  }, []);

  // Nạp tin nhắn khi đổi activeThreadId
  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    try {
      const raw = localStorage.getItem(`${STORAGE_KEY_MESSAGES}${activeThreadId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
          return;
        }
      }
    } catch {}
    setMessages([]);
  }, [activeThreadId]);

  // Lưu tin nhắn khi thay đổi
  const saveMessagesToStorage = useCallback((threadId: string, msgs: AiChatMessage[]) => {
    try {
      localStorage.setItem(`${STORAGE_KEY_MESSAGES}${threadId}`, JSON.stringify(msgs));
    } catch {}
  }, []);

  const saveThreadsToStorage = useCallback((list: AiThreadSummary[]) => {
    try {
      localStorage.setItem(STORAGE_KEY_THREADS, JSON.stringify(list));
    } catch {}
  }, []);

  const createNewThread = useCallback((firstMessageText?: string) => {
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
    saveThreadsToStorage(nextThreads);
    setActiveThreadId(newId);
    setMessages([]);
    return newId;
  }, [threads, saveThreadsToStorage]);

  const selectThread = useCallback((id: string) => {
    setActiveThreadId(id);
  }, []);

  const deleteThread = useCallback((id: string) => {
    const filtered = threads.filter((t) => t.id !== id);
    setThreads(filtered);
    saveThreadsToStorage(filtered);
    try {
      localStorage.removeItem(`${STORAGE_KEY_MESSAGES}${id}`);
    } catch {}

    if (activeThreadId === id) {
      if (filtered.length > 0) {
        setActiveThreadId(filtered[0].id);
      } else {
        setActiveThreadId(null);
        setMessages([]);
      }
    }
  }, [threads, activeThreadId, saveThreadsToStorage]);

  const stopStreaming = useCallback(() => {
    abortControllerRef.current = true;
    setIsStreaming(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    if (activeThreadId) {
      saveMessagesToStorage(activeThreadId, []);
    }
  }, [activeThreadId, saveMessagesToStorage]);

  const sendMessage = useCallback(
    async (text: string, overrideDoc?: DispatchDocument | null) => {
      const cleanText = text.trim();
      if (!cleanText || isStreaming) return;

      abortControllerRef.current = false;
      setError(null);

      const targetDoc = overrideDoc !== undefined ? overrideDoc : attachedDoc;

      let currentThreadId = activeThreadId;
      if (!currentThreadId) {
        currentThreadId = createNewThread(cleanText);
      }

      const userMsg: AiChatMessage = {
        id: `msg_u_${Date.now()}`,
        role: 'user',
        content: cleanText,
        createdAt: new Date().toISOString(),
        attachedDocumentId: targetDoc?.id,
        attachedDocumentTitle: targetDoc?.title,
      };

      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      saveMessagesToStorage(currentThreadId, updatedHistory);

      setIsStreaming(true);
      setStreamingText('');

      // Tạo ngữ cảnh văn bản đính kèm nếu có
      let docContext: string | undefined;
      if (targetDoc) {
        docContext = `Văn bản: "${targetDoc.title}" (Số: ${targetDoc.documentNumber || 'N/A'}, Loại: ${targetDoc.documentType}, Cơ quan ký: ${targetDoc.issuer || 'N/A'}, Ngày ban hành: ${targetDoc.documentDate || 'N/A'}).\nTóm tắt sơ bộ: ${targetDoc.aiSummary || 'Chưa có'}\nGhi chú: ${targetDoc.note || 'Không có'}`;
      }

      let accumulated = '';
      try {
        const stream = streamGeminiContent(updatedHistory, docContext, model);
        for await (const chunk of stream) {
          if (abortControllerRef.current) break;
          accumulated += chunk;
          setStreamingText(accumulated);
        }
      } catch (err: any) {
        console.error('Lỗi khi trò chuyện với AI:', err);
        setError(err.message || 'Lỗi kết nối AI');
        accumulated += '\n\n*(Đã xảy ra gián đoạn trong quá trình xử lý phản hồi)*';
      } finally {
        setIsStreaming(false);
        setStreamingText('');

        if (accumulated.trim()) {
          const assistantMsg: AiChatMessage = {
            id: `msg_a_${Date.now()}`,
            role: 'assistant',
            content: accumulated,
            createdAt: new Date().toISOString(),
          };
          const finalMessages = [...updatedHistory, assistantMsg];
          setMessages(finalMessages);
          saveMessagesToStorage(currentThreadId, finalMessages);

          // Cập nhật preview cho thread
          setThreads((prev) => {
            const next = prev.map((t) =>
              t.id === currentThreadId
                ? {
                    ...t,
                    lastMessagePreview: accumulated.slice(0, 60),
                    updatedAt: new Date().toISOString(),
                  }
                : t
            );
            saveThreadsToStorage(next);
            return next;
          });
        }
      }
    },
    [
      isStreaming,
      attachedDoc,
      activeThreadId,
      messages,
      saveMessagesToStorage,
      createNewThread,
      model,
      saveThreadsToStorage,
    ]
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
    attachedDoc,
    model,
    error,
    setModel,
    setAttachedDoc,
    sendMessage,
    stopStreaming,
    clearMessages,
    createNewThread,
    selectThread,
    deleteThread,
    askAboutDocument,
  };
}
