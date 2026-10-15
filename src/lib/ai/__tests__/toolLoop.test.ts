import { describe, it, expect, vi } from 'vitest';
import { runToolLoop, SO_LUOT_CONG_CU_TOI_DA, type Content, type ModelPart, type OpenTurn } from '../toolLoop';

const hoi: Content[] = [{ role: 'user', parts: [{ text: 'lãi tính thế nào' }] }];
const goi = (name: string, args: Record<string, unknown> = {}): ModelPart => ({ functionCall: { name, args }, thoughtSignature: 'sig-1' });

/** Mỗi phần tử của `luot` là một lượt: các đoạn chữ rồi parts cuối. */
function moGia(luot: ModelPart[][]) {
  const nhatKy: { contents: Content[]; coCongCu: boolean }[] = [];
  const open: OpenTurn = async function* (contents, coCongCu) {
    const i = nhatKy.length;
    nhatKy.push({ contents, coCongCu });
    const parts = luot[Math.min(i, luot.length - 1)];
    for (const p of parts) if (p.text) yield { text: p.text };
    yield { parts };
  };
  return { open, nhatKy };
}

const gom = async (g: AsyncGenerator<string>) => {
  let s = '';
  for await (const c of g) s += c;
  return s;
};

describe('runToolLoop', () => {
  it('không gọi công cụ: một lượt, trả chữ nguyên văn, không báo dùng công cụ', async () => {
    const { open, nhatKy } = moGia([[{ text: 'Trả lời ngay' }]]);
    const onToolUse = vi.fn();
    expect(await gom(runToolLoop(open, hoi, {}, onToolUse))).toBe('Trả lời ngay');
    expect(nhatKy).toHaveLength(1);
    expect(nhatKy[0].coCongCu).toBe(true);
    expect(onToolUse).not.toHaveBeenCalled();
  });

  it('gọi công cụ một lần: chạy công cụ, gửi lại nguyên parts của model kèm kết quả, rồi trả chữ', async () => {
    const lanDau = [goi('traCuuHeThong', { chuDe: 'lãi' })];
    const { open, nhatKy } = moGia([lanDau, [{ text: 'Theo tài liệu...' }]]);
    const tool = vi.fn(async () => ({ noiDung: 'Gốc chia đều' }));
    const onToolUse = vi.fn();

    expect(await gom(runToolLoop(open, hoi, { traCuuHeThong: tool }, onToolUse))).toBe('Theo tài liệu...');

    expect(tool).toHaveBeenCalledWith({ chuDe: 'lãi' });
    expect(onToolUse).toHaveBeenCalledTimes(1);
    expect(nhatKy).toHaveLength(2);
    const lai = nhatKy[1].contents;
    expect(lai).toHaveLength(3);
    expect(lai[1]).toEqual({ role: 'model', parts: lanDau });
    expect(lai[1].parts[0]).toBe(lanDau[0]);
    expect(lai[2]).toEqual({
      role: 'user',
      parts: [{ functionResponse: { name: 'traCuuHeThong', response: { ketQua: { noiDung: 'Gốc chia đều' } } } }],
    });
  });

  it('chữ model nói trước khi gọi công cụ vẫn được phát ra', async () => {
    const { open } = moGia([[{ text: 'Để tôi tra. ' }, goi('traCuuHeThong')], [{ text: 'Xong.' }]]);
    expect(await gom(runToolLoop(open, hoi, { traCuuHeThong: () => 1 }))).toBe('Để tôi tra. Xong.');
  });

  it('công cụ không tồn tại hoặc ném lỗi: model nhận kết quả lỗi, vòng lặp không đổ', async () => {
    const { open, nhatKy } = moGia([[goi('khongCo'), goi('hong')], [{ text: 'Không tra được.' }]]);
    const hong = () => { throw new Error('vỡ kho'); };
    expect(await gom(runToolLoop(open, hoi, { hong }))).toBe('Không tra được.');
    expect(nhatKy[1].contents[2].parts).toEqual([
      { functionResponse: { name: 'khongCo', response: { loi: 'Không có công cụ khongCo' } } },
      { functionResponse: { name: 'hong', response: { loi: 'vỡ kho' } } },
    ]);
  });

  it('model gọi công cụ ở mọi lượt: dừng sau số lượt tối đa, lượt cuối không có công cụ và bỏ qua functionCall', async () => {
    const { open, nhatKy } = moGia([[goi('traCuuHeThong')]]);
    const tool = vi.fn(() => 'x');
    const ra = await gom(runToolLoop(open, hoi, { traCuuHeThong: tool }));
    expect(ra).toBe('');
    expect(nhatKy).toHaveLength(SO_LUOT_CONG_CU_TOI_DA + 1);
    expect(nhatKy.map((l) => l.coCongCu)).toEqual([true, true, false]);
    expect(tool).toHaveBeenCalledTimes(SO_LUOT_CONG_CU_TOI_DA);
  });
});
