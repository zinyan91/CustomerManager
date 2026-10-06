import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { OfficialDoc } from '../../../types/officialDoc';

const m = vi.hoisted(() => ({ index: vi.fn(), auth: vi.fn(), read: vi.fn(), find: vi.fn() }));
vi.mock('../../api/officialDocApi', () => ({ listDocIndex: m.index }));
vi.mock('../../huggingface/hfConfigApi', () => ({ fetchHfAuth: m.auth }));
vi.mock('../docReader', () => ({ readDocsForAi: m.read }));
vi.mock('../answerCache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../answerCache')>()),
  findCachedAnswer: m.find,
}));

import { describeRead, lookupSharedAnswer, prepareDocContext } from '../docContext';

const doc = (id: string, docNumber: string, title: string): OfficialDoc => ({
  id, category: 'van-ban', docNumber, title, issuedDate: '2026-09-28', effectiveFrom: '2026-09-28', effectiveTo: null,
  files: [{ kind: 'goc', repoId: 'o/k', path: `${id}.pdf`, name: `${id}.pdf` }], createdAt: '', updatedAt: `v-${id}`,
});
const D8 = doc('8', '2848-8/2026/TB-BĐH', 'Gia hạn chương trình ưu đãi lãi suất huy động Tuần lễ vàng');
const READ_OK = {
  attachments: [{ id: 'a', name: '8.pdf', mimeType: 'application/pdf', size: 1, base64Data: 'QQ==' }],
  readFiles: [{ docId: '8', docNumber: D8.docNumber, title: D8.title, fileName: '8.pdf', kind: 'goc' }],
  notes: [],
};

beforeEach(() => {
  m.index.mockReset().mockResolvedValue([D8, doc('4', '2848-4/2026/TB-BĐH', 'Triển khai chương trình lãi suất cho vay')]);
  m.auth.mockReset().mockResolvedValue({ token: 'tk' });
  m.read.mockReset().mockResolvedValue(READ_OK);
  m.find.mockReset().mockResolvedValue(null);
});

describe('prepareDocContext', () => {
  it('nêu số hiệu: tải đúng văn bản, trả tệp đính kèm, mô tả tệp và nhớ văn bản đang bàn', async () => {
    const onStatus = vi.fn();
    const out = await prepareDocContext('2848-8 nói về gì', [], { onStatus });

    expect(onStatus).toHaveBeenCalledWith('Đang đọc văn bản 2848-8/2026/TB-BĐH...');
    expect(m.read).toHaveBeenCalledWith([D8], 'tk');
    expect(out.attachments).toHaveLength(1);
    expect(out.contextText).toMatch(/Tệp "8\.pdf" \(File văn bản gốc\) thuộc văn bản số 2848-8\/2026\/TB-BĐH/);
    expect(out.focusIds).toEqual(['8']);
    expect(out.refs).toEqual([{ id: '8', updatedAt: 'v-8' }]);
    expect(out.complete).toBe(true);
  });

  it('câu nối tiếp dùng văn bản đang bàn từ lượt trước', async () => {
    const out = await prepareDocContext('Bảng lãi suất chi tiết', ['8']);
    expect(m.read).toHaveBeenCalledWith([D8], 'tk');
    expect(out.focusIds).toEqual(['8']);
  });

  it('câu hỏi không liên quan văn bản nào: không tải gì, giữ nguyên văn bản đang bàn', async () => {
    const out = await prepareDocContext('xin chào', ['8']);
    expect(m.read).not.toHaveBeenCalled();
    expect(m.auth).not.toHaveBeenCalled();
    expect(out).toEqual({ attachments: [], contextText: '', focusIds: ['8'], refs: [], complete: false });
  });

  it('không tra cứu được danh mục: báo lỗi trong ngữ cảnh để AI nói thật', async () => {
    m.index.mockRejectedValue(new Error('Không đọc được danh mục văn bản: boom'));
    const out = await prepareDocContext('2848-8', []);
    expect(out.attachments).toEqual([]);
    expect(out.contextText).toMatch(/Không tra cứu được danh mục văn bản: .*boom/);
  });

  it('chưa có token HF: nói rõ chưa đọc được nội dung', async () => {
    m.auth.mockResolvedValue(null);
    const out = await prepareDocContext('2848-8', []);
    expect(m.read).not.toHaveBeenCalled();
    expect(out.contextText).toMatch(/Chưa cấu hình token Hugging Face/);
  });

  it('tệp không đọc được: ghi chú đi vào ngữ cảnh', async () => {
    m.read.mockResolvedValue({ attachments: [], readFiles: [], notes: ['Tệp "8.pdf" của văn bản 2848-8 không còn trong Kho'] });
    const out = await prepareDocContext('2848-8', []);
    expect(out.attachments).toEqual([]);
    expect(out.contextText).toMatch(/KHÔNG ĐỌC ĐƯỢC.*\n- Tệp "8\.pdf"/);
  });
});

describe('prepareDocContext - dùng danh mục tải sẵn', () => {
  it('có index truyền vào thì không gọi lại DB', async () => {
    const preset = [D8];
    await prepareDocContext('2848-8', [], { index: preset });
    expect(m.index).not.toHaveBeenCalled();
    expect(m.read).toHaveBeenCalledWith([D8], 'tk');
  });
});

describe('lookupSharedAnswer', () => {
  const cached = (over = {}) => ({ question: 'q', answer: 'Đáp án đã lưu', docRefs: [{ id: '8', updatedAt: 'v-8' }], updatedAt: new Date().toISOString(), ...over });
  const Q = 'gia hạn chương trình ưu đãi lãi suất huy động Tuần lễ vàng';

  it('có câu trả lời đã lưu còn hiệu lực thì trả về, kèm danh mục đã tải', async () => {
    m.find.mockResolvedValue(cached());
    const r = await lookupSharedAnswer(Q);
    expect(r.hit?.answer).toBe('Đáp án đã lưu');
    expect(r.index).toHaveLength(2);
  });

  it('văn bản đã bị sửa kể từ lúc lưu thì không dùng', async () => {
    m.find.mockResolvedValue(cached({ docRefs: [{ id: '8', updatedAt: 'cu' }] }));
    expect((await lookupSharedAnswer(Q)).hit).toBeNull();
  });

  it('có văn bản mới liên quan hơn kể từ lúc lưu thì không dùng câu cũ', async () => {
    m.find.mockResolvedValue(cached());
    m.index.mockResolvedValue([D8, doc('9', '2848-9/2026/TB-BĐH', 'Gia hạn chương trình ưu đãi lãi suất huy động Tuần lễ vàng đợt 2')]);
    expect((await lookupSharedAnswer(Q)).hit).toBeNull();
  });

  it('chưa có câu trả lời nào thì không có hit', async () => {
    expect((await lookupSharedAnswer(Q)).hit).toBeNull();
  });

  it('bộ nhớ lỗi (vd chưa áp migration) thì coi như chưa có, không làm hỏng câu hỏi', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    m.find.mockRejectedValue(new Error('relation does not exist'));
    const r = await lookupSharedAnswer(Q);
    expect(r.hit).toBeNull();
    expect(r.index).toHaveLength(2);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('danh mục tải lỗi thì không có hit và index null', async () => {
    m.find.mockResolvedValue(cached());
    m.index.mockRejectedValue(new Error('db'));
    expect(await lookupSharedAnswer(Q)).toEqual({ hit: null, index: null });
  });
});

describe('describeRead', () => {
  it('rỗng khi không có gì', () => {
    expect(describeRead({ attachments: [], readFiles: [], notes: [] })).toBe('');
  });
});
