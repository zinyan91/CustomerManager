import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { AiAttachment, AiChatMessage } from '../../../types/ai';
import { AiUnavailableError, MSG_GEMINI_NOT_CONFIGURED, buildContents, describeGeminiFailure, resetModelMemory, streamGeminiContent, thinkingConfigFor, reasoningDepthFor, SYSTEM_INSTRUCTION, orderCandidateModels, SLOW_MODEL_PENALTY_MS, DEFAULT_AI_MODEL, FALLBACK_AI_MODELS, AVAILABLE_AI_MODELS, type ModelAttempt } from '../geminiClient';
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

  it('chỉ khai báo công cụ tri thức khi câu hỏi là về cách dùng hệ thống', async () => {
    const bodies: any[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return sse('Được');
    }));
    for await (const _ of streamGeminiContent([msg('1', 'user', 'Nhóm nợ 2 là gì?')], undefined, 'gemini-3.8-flash')) { /* đọc hết */ }
    expect(bodies[0].tools).toBeUndefined();
    expect(bodies[0].system_instruction.parts[0].text).not.toContain('TRI THỨC HỆ THỐNG');
    bodies.length = 0;
    for await (const _ of streamGeminiContent([msg('2', 'user', 'Vì sao lịch trả nợ trên hệ thống bị lệch?')], undefined, 'gemini-3.8-flash')) { /* đọc hết */ }
    expect(bodies[0].tools).toBeDefined();
  });

  it('câu hỏi phân tích gửi kèm mức suy nghĩ cao và giới hạn câu trả lời dài hơn; câu hỏi nhanh giữ mức thấp', async () => {
    const bodies: any[] = [];
    vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
      bodies.push(JSON.parse(String(init.body)));
      return sse('Được');
    }));
    for await (const _ of streamGeminiContent(user, undefined, 'gemini-3.8-flash', undefined, { tools: false })) { /* đọc hết */ }
    expect(bodies[0].generationConfig).toMatchObject({ maxOutputTokens: 8192, thinkingConfig: { thinkingLevel: 'high' } });
    bodies.length = 0;
    for await (const _ of streamGeminiContent([msg('2', 'user', 'Xin chào')], undefined, 'gemini-3.8-flash', undefined, { tools: false })) { /* đọc hết */ }
    expect(bodies[0].generationConfig).toMatchObject({ maxOutputTokens: 4096, thinkingConfig: { thinkingLevel: 'low' } });
  });

  it('model treo quá hạn chờ: chuyển model, báo từng lần thử, câu sau hỏi model khác trước; hết hạn phạt thì xếp lại như cũ', async () => {
    vi.useFakeTimers();
    try {
      const calls: string[] = [];
      vi.stubGlobal('fetch', vi.fn((url: string, init: RequestInit) => {
        const model = decodeURIComponent(url.split('/models/')[1].split(':')[0]);
        calls.push(model);
        if (model === 'gemini-3.8-flash') {
          return new Promise((_, reject) => init.signal!.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' }))));
        }
        return Promise.resolve(sse('Được'));
      }));
      const attempts: ModelAttempt[] = [];
      const run = async () => {
        let out = '';
        for await (const c of streamGeminiContent([msg('1', 'user', 'Xin chào')], undefined, 'gemini-3.8-flash', undefined, { tools: false, onAttempt: (a) => attempts.push(a) })) out += c;
        return out;
      };
      const first = run();
      await vi.advanceTimersByTimeAsync(30_000);
      expect(await first).toBe('Được');
      expect(attempts.map((a) => [a.model, a.outcome])).toEqual([['gemini-3.8-flash', 'timeout'], ['gemini-3.6-flash', 'ok']]);
      expect(attempts[0].ms).toBeGreaterThanOrEqual(30_000);

      calls.length = 0;
      expect(await run()).toBe('Được');
      expect(calls).toEqual(['gemini-3.6-flash']);

      vi.setSystemTime(Date.now() + SLOW_MODEL_PENALTY_MS + 1);
      expect(orderCandidateModels(['gemini-3.8-flash', 'gemini-3.6-flash'])[0]).toBe('gemini-3.8-flash');
    } finally {
      vi.useRealTimers();
    }
  });

  it('mất mạng: báo không kết nối được', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    await expect(drain()).rejects.toThrow('Không kết nối được tới Gemini');
  });
});

describe('thinkingConfigFor', () => {
  it('câu hỏi nhanh giữ mức suy nghĩ thấp như cũ', () => {
    expect(thinkingConfigFor('gemini-2.5-flash')).toEqual({ thinkingBudget: 0 });
    expect(thinkingConfigFor('gemini-3.8-flash')).toEqual({ thinkingLevel: 'low' });
    expect(thinkingConfigFor('gemini-1.5-pro')).toBeUndefined();
  });

  it('câu hỏi cần lập luận được suy nghĩ sâu', () => {
    expect(thinkingConfigFor('gemini-2.5-flash', 'deep')).toEqual({ thinkingBudget: -1 });
    expect(thinkingConfigFor('gemini-3.8-flash', 'deep')).toEqual({ thinkingLevel: 'high' });
    expect(thinkingConfigFor('gemini-1.5-pro', 'deep')).toBeUndefined();
  });
});

describe('chọn mô hình', () => {
  it('mặc định 3.6 Flash; 3.8 Flash (từng treo trọn hạn chờ) xếp cuối danh sách dự phòng', () => {
    resetModelMemory();
    expect(DEFAULT_AI_MODEL).toBe('gemini-3.6-flash');
    expect(orderCandidateModels([DEFAULT_AI_MODEL, ...FALLBACK_AI_MODELS])).toEqual(['gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-3.8-flash']);
    expect(AVAILABLE_AI_MODELS[0].id).toBe(DEFAULT_AI_MODEL);
  });

  it('người dùng tự chọn 3.8 thì vẫn thử 3.8 trước', () => {
    resetModelMemory();
    expect(orderCandidateModels(['gemini-3.8-flash', ...FALLBACK_AI_MODELS])[0]).toBe('gemini-3.8-flash');
  });
});

describe('reasoningDepthFor', () => {
  it.each([
    'Phân tích khả năng trả nợ của công ty này',
    'Có nên cho vay bổ sung vốn lưu động không?',
    'Tính toán nhu cầu vốn lưu động giúp tôi',
    'Đề xuất tài sản bảo đảm thay thế',
    'So sánh hai phương án trả nợ',
  ])('"%s" → sâu', (q) => expect(reasoningDepthFor(q)).toBe('deep'));

  it.each([
    'Xin chào',
    'Có bao nhiêu văn bản?',
    'Danh sách khách hàng mới',
    'Tóm tắt nội dung tài liệu đính kèm.',
    'Lãi suất cho vay ngắn hạn kỳ hạn 6 tháng hiện nay là bao nhiêu, áp dụng cho khách hàng cá nhân vay sản xuất kinh doanh có tài sản bảo đảm?',
  ])('"%s" → nhanh (tra cứu, tóm tắt, kể cả câu dài)', (q) => expect(reasoningDepthFor(q)).toBe('quick'));
});

describe('lời dặn hệ thống', () => {
  it('cho phép dùng hiểu biết chuyên môn và tự suy luận, vẫn giữ ràng buộc không bịa số liệu', () => {
    expect(SYSTEM_INSTRUCTION).toContain('Được tự do dùng hiểu biết chuyên môn rộng');
    expect(SYSTEM_INSTRUCTION).toContain('suy luận từng bước');
    expect(SYSTEM_INSTRUCTION).toContain('không bịa số');
    expect(SYSTEM_INSTRUCTION).toContain('nhắc cán bộ đối chiếu bản hiện hành');
  });

  it('bỏ các lệnh gò câu trả lời vào một phân hệ hoặc một câu cố định', () => {
    expect(SYSTEM_INSTRUCTION).not.toContain('CHỈ TRẢ LỜI VỀ VĂN THƯ');
    expect(SYSTEM_INSTRUCTION).not.toContain('Trả lời đúng một câu');
    expect(SYSTEM_INSTRUCTION).not.toContain('BẮT BUỘC TUÂN THỦ TUYỆT ĐỐI');
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
