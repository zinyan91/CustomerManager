// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const m = vi.hoisted(() => ({ stream: vi.fn(), system: vi.fn(), prepare: vi.fn(), lookup: vi.fn(), save: vi.fn() }));

vi.mock('../../lib/ai/geminiClient', () => ({
  DEFAULT_AI_MODEL: 'gemini-test',
  streamGeminiContent: m.stream,
}));
vi.mock('../../lib/ai/systemContext', () => ({
  fetchSystemContextData: m.system,
  mentionsCustomers: (q: string) => /khách hàng/i.test(q),
}));
vi.mock('../../lib/ai/docContext', () => ({
  EMPTY_DOC_CONTEXT: { attachments: [], contextText: '', focusIds: [], refs: [], complete: false },
  prepareDocContext: m.prepare,
  lookupSharedAnswer: m.lookup,
}));
vi.mock('../../lib/ai/answerCache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../lib/ai/answerCache')>()),
  saveCachedAnswer: m.save,
}));

import { useAiAssistant } from '../useAiAssistant';

const PDF = { id: 'docread_1', name: '8.pdf', mimeType: 'application/pdf', size: 1, base64Data: 'QQ==' };
const PREPARED = {
  attachments: [PDF],
  contextText: 'NỘI DUNG VĂN BẢN VĂN THƯ ĐÃ ĐƯỢC ĐÍNH KÈM: ...',
  focusIds: ['8'],
  refs: [{ id: '8', updatedAt: 'v-8' }],
  complete: true,
};

beforeEach(() => {
  localStorage.clear();
  m.stream.mockReset().mockImplementation(async function* () {
    yield 'Trả lời';
  });
  m.system.mockReset().mockResolvedValue({ officialDocs: [] });
  m.prepare.mockReset().mockResolvedValue(PREPARED);
  m.lookup.mockReset().mockResolvedValue({ hit: null, index: null });
  m.save.mockReset().mockResolvedValue(undefined);
});

type Hook = ReturnType<typeof renderHook<ReturnType<typeof useAiAssistant>, unknown>>;
const ask = async (hook: Hook, text: string, atts?: Parameters<ReturnType<typeof useAiAssistant>['sendMessage']>[2]) => {
  await act(async () => {
    await hook.result.current.sendMessage(text, undefined, atts);
  });
};
const setup = (userId: string | null = 'user-a') => renderHook(() => useAiAssistant(userId));

describe('useAiAssistant - đọc văn bản Văn thư', () => {
  it('đưa nội dung văn bản liên quan và mô tả vào yêu cầu gửi AI', async () => {
    const hook = setup();
    await ask(hook, '2848-8 nói về gì');

    expect(m.prepare).toHaveBeenCalledWith('2848-8 nói về gì', [], expect.objectContaining({ onStatus: expect.any(Function) }));
    const [history, docContext, model, , extras] = m.stream.mock.calls[0];
    expect(history.at(-1).content).toBe('2848-8 nói về gì');
    expect(docContext).toMatch(/NỘI DUNG VĂN BẢN VĂN THƯ ĐÃ ĐƯỢC ĐÍNH KÈM/);
    expect(model).toBe('gemini-test');
    expect(extras.attachments).toEqual([PDF]);
  });

  it('tệp văn bản chỉ gửi cho lượt này, không nằm trong lịch sử chat đã lưu', async () => {
    const hook = setup();
    await ask(hook, '2848-8 nói về gì');
    expect(JSON.stringify(Object.entries(localStorage))).not.toContain('QQ==');
    expect(hook.result.current.messages.every((x) => !x.attachments)).toBe(true);
    expect(hook.result.current.messages.map((x) => x.role)).toEqual(['user', 'assistant']);
  });

  it('nhớ văn bản đang bàn để câu nối tiếp không phải nêu lại số hiệu', async () => {
    const hook = setup();
    await ask(hook, '2848-8 nói về gì');
    await ask(hook, 'Bảng lãi suất chi tiết');
    expect(m.prepare.mock.calls[0][1]).toEqual([]);
    expect(m.prepare.mock.calls[1][1]).toEqual(['8']);
  });

  it('đổi sang phiên chat khác thì quên văn bản đang bàn', async () => {
    const hook = setup();
    await ask(hook, '2848-8 nói về gì');
    act(() => hook.result.current.selectThread('th_khac'));
    await ask(hook, 'Bảng lãi suất chi tiết');
    expect(m.prepare.mock.calls[1][1]).toEqual([]);
  });

  it('chỉ tải danh sách khách hàng khi câu hỏi nhắc tới khách hàng', async () => {
    const hook = setup();
    await ask(hook, '2848-8 nói về gì');
    await ask(hook, 'Danh sách khách hàng');
    expect(m.system.mock.calls[0][0]).toEqual({ includeCustomers: false, includeFinancials: false });
    expect(m.system.mock.calls[1][0]).toEqual({ includeCustomers: true, includeFinancials: false });
  });

  it('chỉ nạp báo cáo tài chính khi câu hỏi nhắc tới tài chính doanh nghiệp', async () => {
    const hook = setup();
    await ask(hook, '2848-8 nói về gì');
    await ask(hook, 'Phân tích báo cáo tài chính và khả năng trả nợ');
    expect(m.system.mock.calls[0][0]).toMatchObject({ includeFinancials: false });
    expect(m.system.mock.calls[1][0]).toMatchObject({ includeFinancials: true });
  });

  it('không có văn bản liên quan thì không gửi tệp nào', async () => {
    m.prepare.mockResolvedValue({ attachments: [], contextText: '', focusIds: [], refs: [], complete: false });
    const hook = setup();
    await ask(hook, 'LTV tối đa là bao nhiêu');
    expect(m.stream.mock.calls[0][4].attachments).toEqual([]);
    expect(m.stream.mock.calls[0][1]).toBeUndefined();
  });

  it('tra cứu văn bản lỗi bất ngờ thì AI vẫn trả lời, không treo', async () => {
    m.prepare.mockRejectedValue(new Error('mạng lỗi'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const hook = setup();
    await ask(hook, '2848-8 nói về gì');
    expect(hook.result.current.isStreaming).toBe(false);
    expect(hook.result.current.messages.at(-1)?.content).toBe('Trả lời');
    warn.mockRestore();
  });

  it('báo tiến trình rồi xóa khi xong', async () => {
    const hook = setup();
    expect(hook.result.current.statusText).toBe('');
    await ask(hook, '2848-8');
    expect(hook.result.current.statusText).toBe('');
  });
});

describe('useAiAssistant - chat riêng theo tài khoản', () => {
  it('đổi tài khoản trên cùng trình duyệt thì không thấy chat của người trước, quay lại thì còn nguyên', async () => {
    const hook = renderHook(({ uid }) => useAiAssistant(uid), { initialProps: { uid: 'user-a' as string | null } });
    await act(async () => {
      await hook.result.current.sendMessage('Câu hỏi của A');
    });
    expect(hook.result.current.threads).toHaveLength(1);
    expect(hook.result.current.messages).toHaveLength(2);

    hook.rerender({ uid: 'user-b' });
    expect(hook.result.current.threads).toEqual([]);
    expect(hook.result.current.messages).toEqual([]);
    expect(hook.result.current.activeThreadId).toBeNull();

    await act(async () => {
      await hook.result.current.sendMessage('Câu hỏi của B');
    });
    expect(hook.result.current.messages[0].content).toBe('Câu hỏi của B');

    hook.rerender({ uid: 'user-a' });
    expect(hook.result.current.messages[0].content).toBe('Câu hỏi của A');
    expect(hook.result.current.threads).toHaveLength(1);
  });

  it('khóa lưu có mã tài khoản, không còn khóa chung cũ', async () => {
    const hook = setup('user-a');
    await ask(hook, 'xin chào');
    const keys = Object.keys(localStorage);
    expect(keys.some((k) => k.startsWith('cm_ai_threads_v2:user-a'))).toBe(true);
    expect(keys.some((k) => k.startsWith('cm_ai_messages_v2:user-a:'))).toBe(true);
    expect(keys.some((k) => k === 'cm_ai_threads_v1' || k.startsWith('cm_ai_messages_v1_'))).toBe(false);
  });

  it('chat cũ không gắn tài khoản (bản trước) không hiện ra cho ai', () => {
    localStorage.setItem('cm_ai_threads_v1', JSON.stringify([{ id: 'cu', title: 'Chat của ai đó', createdAt: '', updatedAt: '' }]));
    expect(setup('user-a').result.current.threads).toEqual([]);
  });

  it('chưa đăng nhập thì chat chỉ ở trong bộ nhớ, không ghi gì vào máy', async () => {
    const hook = setup(null);
    await ask(hook, 'xin chào');
    expect(hook.result.current.messages).toHaveLength(2);
    expect(localStorage.length).toBe(0);
  });
});

describe('useAiAssistant - bộ nhớ trả lời dùng chung', () => {
  const Q = 'lãi suất cho vay ngắn hạn';
  const HIT = { question: Q, answer: 'Đáp án người khác đã hỏi', docRefs: [{ id: '8', updatedAt: 'v-8' }], updatedAt: '2026-10-06T00:00:00Z' };

  it('câu hỏi người khác đã hỏi: trả lời ngay, không đọc lại văn bản, không gọi AI', async () => {
    m.lookup.mockResolvedValue({ hit: HIT, index: [] });
    const hook = setup();
    await ask(hook, Q);

    expect(m.prepare).not.toHaveBeenCalled();
    expect(m.system).not.toHaveBeenCalled();
    expect(m.stream).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
    const last = hook.result.current.messages.at(-1);
    expect(last).toMatchObject({ role: 'assistant', content: 'Đáp án người khác đã hỏi', fromCache: true });
    expect(hook.result.current.isStreaming).toBe(false);
    expect(hook.result.current.statusText).toBe('');
  });

  it('chưa có trong bộ nhớ: hỏi AI rồi lưu câu trả lời kèm văn bản căn cứ cho người sau', async () => {
    const hook = setup();
    await ask(hook, Q);

    expect(m.lookup).toHaveBeenCalledWith(Q);
    expect(m.save).toHaveBeenCalledWith({
      key: 'cho han lai ngan suat vay',
      question: Q,
      answer: 'Trả lời',
      docRefs: [{ id: '8', updatedAt: 'v-8' }],
      model: 'gemini-test',
    });
    expect(hook.result.current.messages.at(-1)?.fromCache).toBeUndefined();
  });

  it('danh mục đã tải ở bước tra bộ nhớ được dùng lại, không tải lần nữa', async () => {
    const index = [{ id: '8' }];
    m.lookup.mockResolvedValue({ hit: null, index });
    await ask(setup(), Q);
    expect(m.prepare.mock.calls[0][2].index).toBe(index);
  });

  it.each([
    ['câu nối tiếp (không phải câu đầu của cuộc chat)', async (h: Hook) => { await ask(h, 'mở đầu'); m.lookup.mockClear(); m.save.mockClear(); await ask(h, Q); }],
    ['hỏi về khách hàng', async (h: Hook) => ask(h, 'lãi suất của khách hàng A')],
    ['kèm tệp người dùng tự gửi', async (h: Hook) => ask(h, Q, [{ id: 'x', name: 'x.pdf', mimeType: 'application/pdf', size: 1, base64Data: 'QQ==' }])],
  ])('%s: không tra và không lưu bộ nhớ dùng chung', async (_name, run) => {
    const hook = setup();
    await run(hook);
    expect(m.lookup).not.toHaveBeenCalled();
    expect(m.save).not.toHaveBeenCalled();
  });

  it('AI không gọi được: báo lỗi thật, không tạo tin trả lời rỗng; Thử lại gửi lại đúng câu hỏi và có câu trả lời', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    // eslint-disable-next-line require-yield
    m.stream.mockImplementationOnce(async function* () {
      throw new Error('Đã hết hạn mức gọi Gemini (HTTP 429). Thử lại sau ít phút.');
    });
    const hook = setup();
    await ask(hook, 'Phân tích báo cáo tài chính trong tệp đính kèm');
    expect(hook.result.current.error).toContain('HTTP 429');
    expect(hook.result.current.messages.map((x) => x.role)).toEqual(['user']);

    await act(async () => {
      await hook.result.current.retryLast();
    });
    expect(hook.result.current.error).toBeNull();
    expect(hook.result.current.messages.map((x) => [x.role, x.content])).toEqual([
      ['user', 'Phân tích báo cáo tài chính trong tệp đính kèm'],
      ['assistant', 'Trả lời'],
    ]);

    act(() => hook.result.current.dismissError());
    await act(async () => {
      await hook.result.current.retryLast();
    });
    expect(hook.result.current.messages).toHaveLength(2);
  });

  it('không lưu khi AI dùng câu trả lời dự phòng (không đọc được văn bản thật)', async () => {
    m.stream.mockImplementation(async function* (_h: unknown, _d: unknown, _m: unknown, _s: unknown, extras: { onFallback: () => void }) {
      extras.onFallback();
      yield 'Câu dự phòng';
    });
    await ask(setup(), Q);
    expect(m.save).not.toHaveBeenCalled();
  });

  it('không lưu khi chưa đọc đủ văn bản, khi AI lỗi giữa chừng, hoặc không có văn bản căn cứ', async () => {
    m.prepare.mockResolvedValue({ ...PREPARED, complete: false });
    await ask(setup(), Q);
    expect(m.save).not.toHaveBeenCalled();

    m.prepare.mockResolvedValue(PREPARED);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    m.stream.mockImplementation(async function* () {
      yield 'dở';
      throw new Error('đứt kết nối');
    });
    await ask(setup(), Q);
    expect(m.save).not.toHaveBeenCalled();

    m.stream.mockImplementation(async function* () {
      yield 'ok';
    });
    m.prepare.mockResolvedValue({ attachments: [], contextText: '', focusIds: [], refs: [], complete: false });
    await ask(setup(), 'lãi suất bất kỳ khác');
    expect(m.save).not.toHaveBeenCalled();
  });

  it('lưu bộ nhớ lỗi (vd chưa áp migration) không làm hỏng câu trả lời đang hiển thị', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    m.save.mockRejectedValue(new Error('relation does not exist'));
    const hook = setup();
    await ask(hook, Q);
    await act(async () => {});
    expect(hook.result.current.messages.at(-1)?.content).toBe('Trả lời');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('Hỏi lại AI: bỏ bộ nhớ, đọc lại văn bản và làm mới câu trả lời', async () => {
    m.lookup.mockResolvedValue({ hit: HIT, index: [] });
    const hook = setup();
    await ask(hook, Q);
    const cachedMsg = hook.result.current.messages.at(-1)!;
    m.lookup.mockClear();

    await act(async () => {
      await hook.result.current.refreshAnswer(cachedMsg.id);
    });

    expect(m.lookup).not.toHaveBeenCalled();
    expect(m.stream).toHaveBeenCalledTimes(1);
    expect(hook.result.current.messages.map((x) => x.role)).toEqual(['user', 'assistant']);
    expect(hook.result.current.messages.at(-1)).toMatchObject({ content: 'Trả lời' });
    expect(hook.result.current.messages.at(-1)?.fromCache).toBeUndefined();
    expect(m.save).toHaveBeenCalledWith(expect.objectContaining({ question: Q, answer: 'Trả lời' }));
  });
});
