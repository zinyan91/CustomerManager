import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { AiAttachment } from '../../../types/ai';

const key = vi.hoisted(() => ({ value: 'k' }));
vi.mock('../geminiClient', () => ({
  FALLBACK_AI_MODELS: ['m1', 'm2'],
  getGeminiApiKey: () => key.value,
}));

import { buildExtractionPrompt, extractOfficialDocFields, parseExtractedFields } from '../docExtract';

const att: AiAttachment = { id: 'a', name: 'tb.pdf', mimeType: 'application/pdf', size: 3, base64Data: 'QUJD' };

const reply = (text: string, status = 200) =>
  new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }), { status });

beforeEach(() => {
  key.value = 'k';
});

describe('parseExtractedFields', () => {
  const full = {
    docNumber: ' 2753/2026/TB-BĐH ',
    title: 'Chương trình lãi suất',
    category: 'van-ban',
    issuedDate: '2026-09-18',
    effectiveFrom: '2026-09-21',
    effectiveTo: '2026-10-31',
  };

  it('đọc đủ trường và cắt khoảng trắng', () => {
    expect(parseExtractedFields(JSON.stringify(full))).toEqual({ ...full, docNumber: '2753/2026/TB-BĐH' });
  });

  it('chịu được khung ```json và chữ thừa quanh JSON', () => {
    expect(parseExtractedFields('Đây:\n```json\n' + JSON.stringify(full) + '\n```').docNumber).toBe('2753/2026/TB-BĐH');
  });

  it('ngày dd/mm/yyyy đổi sang ISO', () => {
    const out = parseExtractedFields(JSON.stringify({ ...full, issuedDate: '18/09/2026', effectiveFrom: '21/09/2026', effectiveTo: '31/10/2026' }));
    expect([out.issuedDate, out.effectiveFrom, out.effectiveTo]).toEqual(['2026-09-18', '2026-09-21', '2026-10-31']);
  });

  it('thiếu ngày hiệu lực thì lấy ngày ban hành; thiếu ngày hết hiệu lực thì null', () => {
    const out = parseExtractedFields(JSON.stringify({ ...full, effectiveFrom: '', effectiveTo: '' }));
    expect(out.effectiveFrom).toBe('2026-09-18');
    expect(out.effectiveTo).toBeNull();
  });

  it('ngày hết hiệu lực trước ngày hiệu lực bị bỏ', () => {
    expect(parseExtractedFields(JSON.stringify({ ...full, effectiveTo: '2026-09-01' })).effectiveTo).toBeNull();
  });

  it('mục lạ thì rơi về Văn bản', () => {
    expect(parseExtractedFields(JSON.stringify({ ...full, category: '?' })).category).toBe('van-ban');
  });

  it('không có trường loại văn bản trong kết quả', () => {
    expect(parseExtractedFields(JSON.stringify({ ...full, docType: 'thong-bao' }))).not.toHaveProperty('docType');
  });

  it('trường thiếu để rỗng, không bịa', () => {
    const out = parseExtractedFields('{}');
    expect(out).toMatchObject({ docNumber: '', title: '', issuedDate: '', effectiveFrom: '', effectiveTo: null });
  });

  it('không phải JSON thì ném lỗi rõ ràng', () => {
    expect(() => parseExtractedFields('xin lỗi tôi không đọc được')).toThrow(/không trả về dữ liệu đọc được/);
  });
});

describe('buildExtractionPrompt', () => {
  it('liệt kê bốn mục và không hỏi loại văn bản', () => {
    const p = buildExtractionPrompt();
    expect(p).toContain('hop-dong (Hợp đồng)');
    expect(p).not.toMatch(/docType/);
    expect(p).toMatch(/Không suy đoán/);
  });
});

describe('extractOfficialDocFields', () => {
  it('gửi tệp cho Gemini dạng inline_data, yêu cầu JSON, trả về trường đã chuẩn hóa', async () => {
    const fetchFn = vi.fn(async () => reply(JSON.stringify({ docNumber: 'S1', title: 'T', issuedDate: '2026-01-02' }))) as unknown as typeof fetch;
    const out = await extractOfficialDocFields(att, 'm1', fetchFn);

    expect(out).toMatchObject({ docNumber: 'S1', title: 'T', issuedDate: '2026-01-02', effectiveFrom: '2026-01-02' });
    const [url, init] = (fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/models/m1:generateContent');
    const body = JSON.parse(String(init.body));
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.contents[0].parts[1]).toEqual({ inline_data: { mime_type: 'application/pdf', data: 'QUJD' } });
  });

  it('model đầu lỗi thì thử model kế tiếp', async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce(new Response('', { status: 503 }))
      .mockResolvedValueOnce(reply('{"docNumber":"S2"}')) as unknown as typeof fetch;
    expect((await extractOfficialDocFields(att, 'm1', fetchFn)).docNumber).toBe('S2');
    expect((fetchFn as unknown as ReturnType<typeof vi.fn>).mock.calls[1][0]).toContain('/models/m2:');
  });

  it('mọi model đều lỗi thì ném lỗi, không trả form giả', async () => {
    const fetchFn = vi.fn(async () => new Response('', { status: 429 })) as unknown as typeof fetch;
    await expect(extractOfficialDocFields(att, 'm1', fetchFn)).rejects.toThrow(/Không đọc được văn bản bằng AI: AI từ chối yêu cầu \(429\)/);
  });

  it('chưa có khóa Gemini thì báo rõ và không gọi mạng', async () => {
    key.value = '';
    const fetchFn = vi.fn() as unknown as typeof fetch;
    await expect(extractOfficialDocFields(att, 'm1', fetchFn)).rejects.toThrow(/Chưa cấu hình khóa Gemini/);
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
