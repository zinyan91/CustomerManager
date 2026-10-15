import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { AiChatMessage } from '../../../types/ai';
import type { ChuDe } from '../triThuc/phanTichTriThuc';

const m = vi.hoisted(() => ({ kho: vi.fn() }));
vi.mock('../triThuc/khoTriThuc', () => ({ taiKhoTriThuc: m.kho }));

import { AiUnavailableError, resetModelMemory, streamGeminiContent, type StreamExtras } from '../geminiClient';

const CHU_DE: ChuDe = {
  id: 'lai-lich-tra-no', tieuDe: 'Lãi và lịch trả nợ', moTa: 'm', nhom: 'Tính toán và lãi',
  tuKhoa: ['lãi'], trang: ['/loans'], nguon: [], noiDung: 'NOI-DUNG-THU',
};
const hoi: AiChatMessage[] = [{ id: '1', role: 'user', content: 'tính lãi thế nào', createdAt: '' }];
const khoiSse = (...suKien: unknown[]) =>
  new Response(new ReadableStream({
    start(c) {
      for (const e of suKien) c.enqueue(new TextEncoder().encode('data: ' + JSON.stringify(e) + '\n\n'));
      c.close();
    },
  }));
const parts = (p: unknown[]) => ({ candidates: [{ content: { parts: p } }] });
const bodyCuaLanGoi = (f: ReturnType<typeof vi.fn>, i: number) => JSON.parse((f.mock.calls[i][1] as RequestInit).body as string);
const gom = async (extras: StreamExtras = {}) => {
  let s = '';
  for await (const c of streamGeminiContent(hoi, undefined, 'gemini-3.8-flash', undefined, extras)) s += c;
  return s;
};

beforeEach(() => {
  resetModelMemory();
  m.kho.mockReset().mockResolvedValue([CHU_DE]);
  vi.stubEnv('VITE_GEMINI_API_KEY', 'khoa-thu');
  vi.stubEnv('GEMINI_API_KEY', '');
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('streamGeminiContent với công cụ tri thức', () => {
  it('gửi tools và bản đồ chủ đề; model gọi công cụ thì gọi lại với parts nguyên vẹn và kết quả tra', async () => {
    const goiParts = [{ text: 'Để tôi tra. ' }, { functionCall: { name: 'traCuuHeThong', args: { chuDe: 'lãi' } }, thoughtSignature: 'SIG-XYZ' }];
    const f = vi.fn()
      .mockImplementationOnce(async () => khoiSse(parts(goiParts)))
      .mockImplementationOnce(async () => khoiSse(parts([{ text: 'Gốc chia đều.' }])));
    vi.stubGlobal('fetch', f);
    const onToolUse = vi.fn();

    expect(await gom({ onToolUse })).toBe('Để tôi tra. Gốc chia đều.');

    expect(f).toHaveBeenCalledTimes(2);
    const b1 = bodyCuaLanGoi(f, 0);
    expect(b1.tools[0].functionDeclarations[0].name).toBe('traCuuHeThong');
    expect(b1.system_instruction.parts[0].text).toContain('lai-lich-tra-no (Lãi và lịch trả nợ)');

    const b2 = bodyCuaLanGoi(f, 1);
    expect(b2.contents).toHaveLength(3);
    expect(b2.contents[1]).toEqual({ role: 'model', parts: goiParts });
    expect(b2.contents[2].parts[0].functionResponse.name).toBe('traCuuHeThong');
    expect(JSON.stringify(b2.contents[2])).toContain('NOI-DUNG-THU');
    expect(f.mock.calls[1][0]).toBe(f.mock.calls[0][0]);
    expect(onToolUse).toHaveBeenCalledTimes(1);
  });

  it('một khối SSE chứa nhiều parts: đọc hết chữ trong mọi part', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => khoiSse(parts([{ text: 'Một ' }, { text: 'hai' }]))));
    expect(await gom()).toBe('Một hai');
  });

  it('tools: false thì không gửi tools và không nạp kho', async () => {
    const f = vi.fn(async () => khoiSse(parts([{ text: 'ok' }])));
    vi.stubGlobal('fetch', f);
    expect(await gom({ tools: false })).toBe('ok');
    expect(bodyCuaLanGoi(f, 0).tools).toBeUndefined();
    expect(m.kho).not.toHaveBeenCalled();
  });

  it('kho tri thức nạp lỗi: vẫn trả lời bình thường, không có tools', async () => {
    m.kho.mockRejectedValue(new Error('a.md: thiếu trường id'));
    const canhBao = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const f = vi.fn(async () => khoiSse(parts([{ text: 'vẫn trả lời' }])));
    vi.stubGlobal('fetch', f);
    expect(await gom()).toBe('vẫn trả lời');
    expect(bodyCuaLanGoi(f, 0).tools).toBeUndefined();
    expect(canhBao).toHaveBeenCalled();
  });

  it('kho rỗng thì không gửi tools', async () => {
    m.kho.mockResolvedValue([]);
    const f = vi.fn(async () => khoiSse(parts([{ text: 'ok' }])));
    vi.stubGlobal('fetch', f);
    await gom();
    expect(bodyCuaLanGoi(f, 0).tools).toBeUndefined();
  });

  it('lượt sau cũng chờ lâu như lượt đầu khi có tệp đính kèm (45 giây, không phải 15 giây)', async () => {
    const f = vi.fn()
      .mockImplementationOnce(async () => khoiSse(parts([{ functionCall: { name: 'traCuuHeThong', args: {} } }])))
      .mockImplementationOnce(async () => khoiSse(parts([{ text: 'ok' }])));
    vi.stubGlobal('fetch', f);
    const doTre = vi.spyOn(globalThis, 'setTimeout');
    const tep = [{ id: 'a', name: 'a.pdf', mimeType: 'application/pdf', size: 1, base64Data: 'QQ==' }];

    expect(await gom({ attachments: tep })).toBe('ok');

    const cho = doTre.mock.calls.map((c) => c[1]).filter((d) => d === 15_000 || d === 45_000);
    expect(cho).toEqual([45_000, 45_000]);
  });

  it('AI không phát ra chữ nào: báo lỗi nêu rõ, không im lặng', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => khoiSse(parts([]))));
    const loi = await gom().catch((e: unknown) => e);
    expect(loi).toBeInstanceOf(AiUnavailableError);
    expect((loi as Error).message).toContain('không đưa ra câu trả lời');
  });

  it('gọi công cụ rồi lượt sau không có chữ: cũng báo lỗi', async () => {
    const f = vi.fn()
      .mockImplementationOnce(async () => khoiSse(parts([{ functionCall: { name: 'traCuuHeThong', args: {} } }])))
      .mockImplementationOnce(async () => khoiSse(parts([])));
    vi.stubGlobal('fetch', f);
    await expect(gom()).rejects.toThrow('không đưa ra câu trả lời');
  });

  it('lượt sau không mở được: báo lỗi Gemini, không đổi sang model khác', async () => {
    const f = vi.fn()
      .mockImplementationOnce(async () => khoiSse(parts([{ functionCall: { name: 'traCuuHeThong', args: {} } }])))
      .mockImplementation(async () => new Response('{}', { status: 429 }));
    vi.stubGlobal('fetch', f);
    await expect(gom()).rejects.toThrow('hết hạn mức');
    expect(f).toHaveBeenCalledTimes(2);
  });
});
