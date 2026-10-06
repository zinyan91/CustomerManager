import { describe, it, expect, beforeEach } from 'vitest';
import type { AiChatMessage, AiThreadSummary } from '../../../types/ai';
import { loadMessages, loadThreads, messagesKey, removeThread, saveMessages, saveThreads, threadsKey } from '../chatStorage';

// vitest chạy môi trường node: dựng localStorage tối giản
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
});

const thread = (id: string): AiThreadSummary => ({ id, title: id, createdAt: '', updatedAt: '' });
const msg = (id: string, over: Partial<AiChatMessage> = {}): AiChatMessage => ({ id, role: 'user', content: id, createdAt: '', ...over });

describe('chat theo từng tài khoản', () => {
  it('hai tài khoản trên cùng trình duyệt không thấy chat của nhau', () => {
    saveThreads('user-a', [thread('t1')]);
    saveMessages('user-a', 't1', [msg('a1')]);
    saveThreads('user-b', [thread('t2')]);

    expect(loadThreads('user-a').map((t) => t.id)).toEqual(['t1']);
    expect(loadThreads('user-b').map((t) => t.id)).toEqual(['t2']);
    expect(loadMessages('user-a', 't1').map((m) => m.id)).toEqual(['a1']);
    expect(loadMessages('user-b', 't1')).toEqual([]);
  });

  it('khóa lưu có mã tài khoản', () => {
    expect(threadsKey('u1')).toBe('cm_ai_threads_v2:u1');
    expect(messagesKey('u1', 't1')).toBe('cm_ai_messages_v2:u1:t1');
  });

  it('không đọc dữ liệu cũ không gắn tài khoản (không biết của ai)', () => {
    store.set('cm_ai_threads_v1', JSON.stringify([thread('cu')]));
    store.set('cm_ai_messages_v1_cu', JSON.stringify([msg('cu1')]));
    expect(loadThreads('user-a')).toEqual([]);
    expect(loadMessages('user-a', 'cu')).toEqual([]);
  });

  it('chưa đăng nhập thì không đọc, không ghi', () => {
    saveThreads(null, [thread('t1')]);
    saveMessages(null, 't1', [msg('x')]);
    expect(store.size).toBe(0);
    expect(loadThreads(null)).toEqual([]);
    expect(loadMessages(null, 't1')).toEqual([]);
  });

  it('dữ liệu hỏng hoặc sai kiểu thì coi như rỗng', () => {
    store.set(threadsKey('u'), '{không phải json');
    store.set(messagesKey('u', 't'), '{"a":1}');
    expect(loadThreads('u')).toEqual([]);
    expect(loadMessages('u', 't')).toEqual([]);
  });

  it('khi lưu bỏ nội dung base64 và ảnh xem trước của tệp đính kèm, giữ tên và dung lượng', () => {
    const att = { id: 'a', name: 'x.pdf', mimeType: 'application/pdf', size: 99, base64Data: 'QUJD', previewUrl: 'data:image/png;base64,AAAA' };
    saveMessages('u', 't', [msg('m1', { attachments: [att] })]);
    const raw = store.get(messagesKey('u', 't')) as string;
    expect(raw).not.toContain('QUJD');
    expect(raw).not.toContain('AAAA');
    expect(loadMessages('u', 't')[0].attachments).toEqual([{ id: 'a', name: 'x.pdf', mimeType: 'application/pdf', size: 99, base64Data: '' }]);
  });

  it('xóa thread chỉ xóa tin nhắn của đúng tài khoản', () => {
    saveMessages('a', 't', [msg('1')]);
    saveMessages('b', 't', [msg('2')]);
    removeThread('a', 't');
    expect(loadMessages('a', 't')).toEqual([]);
    expect(loadMessages('b', 't')).toHaveLength(1);
  });

  it('ghi lỗi (hết dung lượng) không làm chat sập', () => {
    (globalThis as { localStorage?: unknown }).localStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    };
    expect(() => saveThreads('u', [thread('t')])).not.toThrow();
    expect(() => saveMessages('u', 't', [msg('1')])).not.toThrow();
  });
});
