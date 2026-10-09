import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { AiAttachment, AiChatMessage } from '../../../types/ai';
import { AiUnavailableError, MSG_GEMINI_NOT_CONFIGURED, buildContents, describeGeminiFailure, resetModelMemory, streamGeminiContent, thinkingConfigFor } from '../geminiClient';
import { mentionsCustomers } from '../systemContext';

const msg = (id: string, role: AiChatMessage['role'], content: string, attachments?: AiAttachment[]): AiChatMessage => ({
  id, role, content, createdAt: '', attachments,
});
const att = (name: string): AiAttachment => ({ id: name, name, mimeType: 'application/pdf', size: 1, base64Data: 'QQ==' });

describe('buildContents', () => {
  it('tệp văn bản gắn vào tin người dùng cuối, không vào tin cũ hay tin của AI', () => {
    const out = buildContents(
      [msg('1', 'user', 'câu 1'), msg('2', 'assistant', 'trả lời'), msg('3', 'user', 'câu 2')],
      [att('van-ban.pdf')]
    );
    expect(out.map((c) => c.role)).toEqual(['user', 'model', 'user']);
    expect(out[0].parts).toEqual([{ text: 'câu 1' }]);
    expect(out[2].parts).toEqual([{ text: 'câu 2' }, { inline_data: { mime_type: 'application/pdf', data: 'QQ==' } }]);
  });

  it('giữ tệp người dùng tự đính kèm và thêm tệp văn bản phía sau', () => {
    const out = buildContents([msg('1', 'user', 'hỏi', [att('tu-tai-len.pdf')])], [att('van-ban.pdf')]);
    expect(out[0].parts).toHaveLength(3);
  });

  it('không có tệp bổ sung thì giữ nguyên như cũ; tin rỗng có chữ đệm', () => {
    expect(buildContents([msg('1', 'user', '  ')])[0].parts).toEqual([{ text: ' ' }]);
  });

  it('bảng tính, Word đi kèm thành đoạn chữ có tên tệp, không thành tệp nhị phân', () => {
    const sheet: AiAttachment = { id: 's', name: 'bctc.xlsx', mimeType: 'sheet', size: 1, base64Data: '', textData: '100,Tài sản,1' };
    const out = buildContents([msg('1', 'user', 'phân tích', [sheet])]);
    expect(out[0].parts).toEqual([{ text: 'phân tích' }, { text: 'Nội dung tệp đính kèm "bctc.xlsx":' + String.fromCharCode(10) + '100,Tài sản,1' }]);
  });
});

describe('describeGeminiFailure', () => {
  it('mỗi nhóm lỗi nêu đúng lý do và việc cần làm', () => {
    expect(describeGeminiFailure(403)).toContain('Khóa Gemini bị từ chối (HTTP 403)');
    expect(describeGeminiFailure(429)).toContain('hết hạn mức');
    expect(describeGeminiFailure(503)).toContain('quá tải');
    expect(describeGeminiFailure(404)).toContain('không còn dùng được');
    expect(describeGeminiFailure(400, 'Request payload size exceeds the limit')).toContain('Request payload size exceeds the limit');
  });
});

describe('streamGeminiContent khi Gemini không dùng được', () => {
  const user: AiChatMessage[] = [msg('1', 'user', 'Phân tích báo cáo tài chính trong tệp đính kèm')];
  const drain = async () => {
    let out = '';
    for await (const chunk of streamGeminiContent(user, 'ngữ cảnh văn thư', 'gemini-3.8-flash')) out += chunk;
    return out;
  };
  const sse = (text: string) =>
    new Response(new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode('data: ' + JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }) + '\n\n')); c.close(); } }));

  beforeEach(() => {
    resetModelMemory();
    vi.stubEnv('VITE_GEMINI_API_KEY', 'khoa-thu');
    vi.stubEnv('GEMINI_API_KEY', '');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it('thiếu khóa: báo thiếu khóa, không trả câu soạn sẵn nào', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn());
    await expect(drain()).rejects.toThrow(MSG_GEMINI_NOT_CONFIGURED);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('mọi model trả 429: ném lỗi nêu hạn mức, KHÔNG có câu "Tỷ lệ LTV" hay "Phân tích & Tóm tắt Văn bản"', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 429 })));
    const error = await drain().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(AiUnavailableError);
    expect((error as Error).message).toContain('hết hạn mức');
  });

  it('một model báo 404 còn model sau chạy được: dùng model sau, không báo lỗi', async () => {
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => (call++ === 0 ? new Response('{"error":{"message":"no longer available"}}', { status: 404 }) : sse('Xin chào'))));
    expect(await drain()).toBe('Xin chào');
  });

  it('chỉ có lỗi 404 ở mọi model thì báo model không còn dùng được; lỗi khác 404 được ưu tiên báo vì nói đúng nguyên nhân', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 404 })));
    await expect(drain()).rejects.toThrow('Mô hình AI không còn dùng được');
    resetModelMemory();
    let call = 0;
    vi.stubGlobal('fetch', vi.fn(async () => (call++ === 0 ? new Response('{}', { status: 404 }) : new Response('{}', { status: 403 }))));
    await expect(drain()).rejects.toThrow('Khóa Gemini bị từ chối (HTTP 403)');
  });

  it('mất mạng: báo không kết nối được', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(drain()).rejects.toThrow('Không kết nối được tới Gemini');
  });
});

describe('thinkingConfigFor', () => {
  it('giảm suy nghĩ cho họ Gemini 2.5 và 3, bỏ qua model khác', () => {
    expect(thinkingConfigFor('gemini-2.5-flash')).toEqual({ thinkingBudget: 0 });
    expect(thinkingConfigFor('gemini-3.8-flash')).toEqual({ thinkingLevel: 'low' });
    expect(thinkingConfigFor('gemini-1.5-pro')).toBeUndefined();
  });
});

describe('mentionsCustomers', () => {
  it('nhận ra câu hỏi về khách hàng, không nhầm với từ "không", "khi"', () => {
    expect(mentionsCustomers('Danh sách khách hàng')).toBe(true);
    expect(mentionsCustomers('tra cứu CIF 123')).toBe(true);
    expect(mentionsCustomers('KH Nguyễn Văn A còn nợ không')).toBe(true);
    expect(mentionsCustomers('2848-8 nói về gì, khi nào hết hiệu lực không')).toBe(false);
  });
});
