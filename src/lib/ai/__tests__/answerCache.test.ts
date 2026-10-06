import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({
  calls: [] as Array<[string, ...unknown[]]>,
  result: { data: null as unknown, error: null as null | { message: string } },
}));

vi.mock('../../supabase', () => {
  const b: Record<string, unknown> = {};
  for (const m of ['select', 'eq', 'upsert', 'maybeSingle']) {
    b[m] = (...args: unknown[]) => {
      h.calls.push([m, ...args]);
      return b;
    };
  }
  b.then = (resolve: (v: unknown) => unknown) => resolve(h.result);
  return { supabase: { from: (t: string) => (h.calls.push(['from', t]), b) } };
});

import { CACHE_TTL_MS, findCachedAnswer, isCacheValid, MAX_ANSWER_CHARS, questionKey, saveCachedAnswer, type CachedAnswer } from '../answerCache';

beforeEach(() => {
  h.calls.length = 0;
  h.result = { data: null, error: null };
});

describe('questionKey', () => {
  it('không dấu, không phân biệt hoa thường, dấu câu và thứ tự từ', () => {
    expect(questionKey('Lãi suất ngắn hạn?')).toBe(questionKey('ngắn hạn, LÃI SUẤT'));
    expect(questionKey('Lãi suất ngắn hạn')).toBe('han lai ngan suat');
  });
  it('thêm hay bớt từ thì khóa khác', () => {
    expect(questionKey('lãi suất ngắn hạn')).not.toBe(questionKey('lãi suất ngắn hạn không'));
  });
  it('giữ số hiệu', () => {
    expect(questionKey('2848-8 nói về gì')).toBe('2848 8 gi noi ve');
  });
  it('câu hỏi rỗng ra khóa rỗng', () => {
    expect(questionKey('  ?! ')).toBe('');
  });
});

describe('isCacheValid', () => {
  const NOW = Date.parse('2026-10-07T00:00:00Z');
  const entry = (over: Partial<CachedAnswer> = {}): CachedAnswer => ({
    question: 'q', answer: 'a', docRefs: [{ id: '8', updatedAt: 'v1' }], updatedAt: '2026-10-05T00:00:00Z', ...over,
  });

  it('còn dùng được khi văn bản chưa đổi và chưa quá hạn', () => {
    expect(isCacheValid(entry(), [{ id: '8', updatedAt: 'v1' }, { id: '9', updatedAt: 'x' }], NOW)).toBe(true);
  });
  it('văn bản đã bị sửa (UpdatedAt đổi) thì bỏ', () => {
    expect(isCacheValid(entry(), [{ id: '8', updatedAt: 'v2' }], NOW)).toBe(false);
  });
  it('văn bản đã bị xóa thì bỏ', () => {
    expect(isCacheValid(entry(), [{ id: '9', updatedAt: 'x' }], NOW)).toBe(false);
  });
  it('quá 30 ngày thì bỏ', () => {
    expect(isCacheValid(entry({ updatedAt: new Date(NOW - CACHE_TTL_MS - 1000).toISOString() }), [{ id: '8', updatedAt: 'v1' }], NOW)).toBe(false);
  });
  it('không có văn bản căn cứ hoặc ngày hỏng thì bỏ', () => {
    expect(isCacheValid(entry({ docRefs: [] }), [], NOW)).toBe(false);
    expect(isCacheValid(entry({ updatedAt: 'rác' }), [{ id: '8', updatedAt: 'v1' }], NOW)).toBe(false);
  });
  it('mọi văn bản căn cứ phải còn nguyên, thiếu một cái là bỏ', () => {
    const two = entry({ docRefs: [{ id: '8', updatedAt: 'v1' }, { id: '4', updatedAt: 'v1' }] });
    expect(isCacheValid(two, [{ id: '8', updatedAt: 'v1' }, { id: '4', updatedAt: 'v9' }], NOW)).toBe(false);
  });
});

describe('findCachedAnswer', () => {
  it('đọc theo khóa câu hỏi và trả về dữ liệu đã chuẩn hóa', async () => {
    h.result = { data: { Question: 'q', Answer: 'a', DocRefs: [{ id: '8', updatedAt: 'v1' }, { sai: 1 }], UpdatedAt: 't' }, error: null };
    const out = await findCachedAnswer('han lai ngan suat');
    expect(out).toEqual({ question: 'q', answer: 'a', docRefs: [{ id: '8', updatedAt: 'v1' }], updatedAt: 't' });
    expect(h.calls).toContainEqual(['from', 'AiAnswerCache']);
    expect(h.calls).toContainEqual(['eq', 'QuestionKey', 'han lai ngan suat']);
  });
  it('chưa có thì null; khóa rỗng không gọi DB', async () => {
    expect(await findCachedAnswer('abc')).toBeNull();
    h.calls.length = 0;
    expect(await findCachedAnswer('')).toBeNull();
    expect(h.calls).toEqual([]);
  });
  it('DB báo lỗi (vd chưa áp migration) thì ném lỗi', async () => {
    h.result = { data: null, error: { message: 'relation does not exist' } };
    await expect(findCachedAnswer('abc')).rejects.toThrow(/Không đọc được bộ nhớ trả lời: relation does not exist/);
  });
});

describe('saveCachedAnswer', () => {
  const args = { key: 'k', question: 'q', answer: 'a', docRefs: [{ id: '8', updatedAt: 'v1' }], model: 'm' };

  it('upsert theo khóa câu hỏi', async () => {
    await saveCachedAnswer(args);
    const call = h.calls.find((c) => c[0] === 'upsert') as [string, Record<string, unknown>, Record<string, unknown>];
    expect(call[1]).toMatchObject({ QuestionKey: 'k', Question: 'q', Answer: 'a', DocRefs: args.docRefs, Model: 'm' });
    expect(call[2]).toEqual({ onConflict: 'QuestionKey' });
  });
  it('không lưu khi thiếu căn cứ hoặc câu trả lời rỗng', async () => {
    await expect(saveCachedAnswer({ ...args, docRefs: [] })).rejects.toThrow(/Thiếu dữ liệu/);
    await expect(saveCachedAnswer({ ...args, answer: '  ' })).rejects.toThrow(/Thiếu dữ liệu/);
    expect(h.calls.some((c) => c[0] === 'upsert')).toBe(false);
  });
  it('câu trả lời quá dài thì bỏ qua, không gọi DB', async () => {
    await saveCachedAnswer({ ...args, answer: 'x'.repeat(MAX_ANSWER_CHARS + 1) });
    expect(h.calls.some((c) => c[0] === 'upsert')).toBe(false);
  });
  it('DB từ chối thì ném lỗi', async () => {
    h.result = { data: null, error: { message: 'rls' } };
    await expect(saveCachedAnswer(args)).rejects.toThrow(/Không lưu được bộ nhớ trả lời: rls/);
  });
});
