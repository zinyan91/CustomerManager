import type { AiChatMessage, AiThreadSummary } from '../../types/ai';

// Mỗi tài khoản một vùng lưu riêng: nhiều nhân viên dùng chung một trình duyệt không thấy chat của nhau.
// Khóa cũ (cm_ai_threads_v1, không gắn tài khoản) cố ý không đọc: không biết thuộc ai.
export const threadsKey = (userId: string) => `cm_ai_threads_v2:${userId}`;
export const messagesKey = (userId: string, threadId: string) => `cm_ai_messages_v2:${userId}:${threadId}`;

function read<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // JSON hỏng hoặc localStorage bị chặn: coi như chưa có lịch sử
    return [];
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Hết dung lượng hoặc bị chặn: chat vẫn chạy bình thường, chỉ không nhớ được sau khi tải lại
  }
}

export function loadThreads(userId: string | null): AiThreadSummary[] {
  return userId ? read<AiThreadSummary>(threadsKey(userId)) : [];
}

export function saveThreads(userId: string | null, threads: AiThreadSummary[]): void {
  if (userId) write(threadsKey(userId), threads);
}

export function loadMessages(userId: string | null, threadId: string): AiChatMessage[] {
  return userId ? read<AiChatMessage>(messagesKey(userId, threadId)) : [];
}

/**
 * Tệp đính kèm chỉ lưu tên và dung lượng: nội dung base64 và ảnh xem trước làm đầy localStorage
 * (khoảng 5MB) khiến chat không lưu được nữa.
 */
export function saveMessages(userId: string | null, threadId: string, messages: AiChatMessage[]): void {
  if (!userId) return;
  write(
    messagesKey(userId, threadId),
    messages.map((m) =>
      m.attachments ? { ...m, attachments: m.attachments.map((a) => ({ ...a, base64Data: '', previewUrl: undefined })) } : m
    )
  );
}

export function removeThread(userId: string | null, threadId: string): void {
  if (!userId) return;
  try {
    localStorage.removeItem(messagesKey(userId, threadId));
  } catch {
    // Không xóa được thì dữ liệu còn lại vô hại: không còn thread nào trỏ tới
  }
}
