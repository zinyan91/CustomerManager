# Kho tri thức cho AI — đợt 1: hạ tầng + 4 chủ đề

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AI trong CustomerManager tự gọi công cụ `traCuuHeThong` để trả lời "trang X dùng thế nào / quy trình Y ra sao / vì sao số lệch", dựa trên tệp tri thức đã đối chiếu với mã; đợt 1 phủ lãi và lịch trả nợ, nhóm nợ, TSĐB + LTV, kho lưu trữ.

**Architecture:** Tệp `.md` có frontmatter nằm trong `src/lib/ai/triThuc/noi-dung/`, Vite gói qua `import.meta.glob(..., { query: '?raw' })` không eager và chỉ tải ở câu hỏi AI đầu tiên. Logic đọc/tra/dựng bản đồ là hàm thuần; vòng lặp gọi công cụ là module thuần `toolLoop` nhận hàm "mở một lượt"; `geminiClient` thêm `tools` vào payload và mở từng lượt, giữ nguyên chữ ký `streamGeminiContent`.

**Tech Stack:** TypeScript, Vite 8 (`import.meta.glob`), Vitest 4, Gemini REST `streamGenerateContent` (SSE).

**Spec:** [2026-10-12-tri-thuc-ai-design.md](../specs/2026-10-12-tri-thuc-ai-design.md) (đầu bài gốc: [brief](../specs/2026-10-12-tri-thuc-ai-brief.md)).

## Global Constraints

- Mỗi tệp tri thức ≤ 3,5 KB = **3584 byte**; bản đồ chủ đề trong prompt ≤ 3 KB = **3072 byte**.
- Tra chủ đề: khớp **id trước**, rồi **trọn dãy từ**, không khớp chuỗi con ("kho" không khớp "không"); câu có dấu so có dấu, chỉ câu gõ không dấu mới so ở dạng bỏ dấu; không dùng `\b`.
- Một lần tra trả tối đa **2 chủ đề**; không khớp thì trả danh sách toàn bộ chủ đề.
- Tối đa **2 lượt công cụ** rồi bắt buộc trả lời bằng chữ; lượt sau dùng đúng model của lượt đầu; giữ nguyên `parts` của model (kể cả `thoughtSignature`).
- Câu trả lời có gọi công cụ **không** được lưu vào bộ nhớ dùng chung.
- Mọi thứ trong bundle là công khai: tệp tri thức không chứa khóa, token, địa chỉ nội bộ, dữ liệu khách hàng thật.
- Mỗi câu mô tả hành vi trong tệp tri thức phải đối chiếu được với một tệp trong `src/` (liệt kê ở `nguon`); mâu thuẫn giữa tài liệu/skill và mã thì **tin mã**.
- Chữ trong tệp tri thức bằng tiếng Việt có dấu, không tooltip/chú thích thừa; tên hàm và tệp giữ nguyên chữ gốc.
- Test gác lấy `ROUTE_OF` (không phải `NAV_GROUPS`) làm nguồn chuẩn về danh sách trang.
- Chỉ commit khi người dùng đồng ý; trước khi commit phải ghi mục vào `docs/progress/2026-10.md` (Task 11). Lệnh commit trong kế hoạch chỉ chạy khi được phép. Cuối thông điệp commit thêm `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
- Không đụng Supabase/DB; không schema, không migration.
- Đồ tạm (nếu có) chỉ ở `.tmp/` và xóa trước khi báo xong.

## Review Focus

Các tình huống spec ngầm hiểu nhưng dễ bị bỏ sót; mỗi dòng có test ở task ghi trong ngoặc.

1. Người dùng gõ không dấu ("tinh lai", "kho luu tru") vẫn ra đúng chủ đề, còn "gói"/"gọi" và "kho"/"không" không lẫn (Task 1).
2. Tệp lưu bằng Notepad có BOM và xuống dòng CRLF vẫn đọc được; frontmatter thiếu trường báo lỗi nêu tên tệp (Task 1).
3. Model gọi công cụ với `chuDe` rỗng, là số, hoặc là chủ đề không tồn tại thì nhận danh sách chủ đề, không ném lỗi (Task 3).
4. Model gọi công cụ ở mọi lượt không dừng: sau 2 lượt công cụ phải ép trả lời bằng chữ và không gửi `tools` ở lượt đó (Task 2).
5. Kho tri thức nạp lỗi (tệp hỏng): chat vẫn trả lời bình thường, không treo, không có `tools` (Task 4).
6. Một khối SSE chứa nhiều `parts` (chữ + `functionCall` kèm `thoughtSignature`): `parts` gửi lại lượt sau phải giống hệt bản nhận (Task 4).
7. Câu trả lời có gọi công cụ không được lưu dùng chung dù câu hỏi khớp văn bản (Task 5).

---

## Cấu trúc tệp

| Tệp | Việc |
|---|---|
| `src/lib/ai/triThuc/phanTichTriThuc.ts` (mới) | Đọc frontmatter, tra chủ đề, dựng bản đồ — hàm thuần |
| `src/lib/ai/triThuc/khoTriThuc.ts` (mới) | `import.meta.glob` + cache một lần |
| `src/lib/ai/triThuc/noi-dung/*.md` (mới, 4 tệp) | Nội dung tri thức |
| `src/lib/ai/toolLoop.ts` (mới) | Vòng lặp gọi công cụ — hàm thuần |
| `src/lib/ai/tools/traCuuHeThong.ts` (mới) | Khai báo công cụ, hàm chạy, đoạn chỉ dẫn prompt |
| `src/lib/ai/geminiClient.ts` (sửa) | `tools` trong payload, đọc nhiều `parts`, mở từng lượt |
| `src/hooks/useAiAssistant.ts` (sửa nhỏ) | Không lưu dùng chung khi đã dùng công cụ |
| `src/lib/ai/__tests__/{phanTichTriThuc,toolLoop,traCuuHeThong,khoTriThuc,geminiTools,triThucGac}.test.ts` (mới) | Test |
| `src/hooks/__tests__/useAiAssistantDocs.test.tsx` (sửa) | Thêm một test |
| `docs/progress/2026-10.md` (sửa) | Nhật ký |

Chạy một tệp test: `npx vitest run <đường dẫn>`. Toàn bộ: `npm test`. Build: `npm run build`.

---

### Task 1: Đọc, tra và dựng bản đồ tri thức (hàm thuần)

**Files:**
- Create: `src/lib/ai/triThuc/phanTichTriThuc.ts`
- Test: `src/lib/ai/__tests__/phanTichTriThuc.test.ts`

**Interfaces:**
- Produces:
  - `interface ChuDe { id; tieuDe; moTa; nhom: string; tuKhoa: string[]; trang: string[]; nguon: string[]; noiDung: string }`
  - `const GIOI_HAN_TEP = 3584`, `const GIOI_HAN_BAN_DO = 3072`
  - `docChuDe(raw: string, tenTep?: string): ChuDe` — ném `Error` nêu tên tệp khi thiếu phần đầu hoặc thiếu `id|tieuDe|moTa|nhom`
  - `traChuDe(kho: ChuDe[], cauHoi: string, toiDa?: number): ChuDe[]` (mặc định 2)
  - `danhSachChuDe(kho: ChuDe[]): { id: string; tieuDe: string; moTa: string }[]`
  - `dungBanDo(kho: ChuDe[]): string`

- [ ] **Step 1: Viết test (sẽ đỏ)**

```ts
import { describe, it, expect } from 'vitest';
import { danhSachChuDe, docChuDe, dungBanDo, traChuDe, type ChuDe } from '../triThuc/phanTichTriThuc';

const TEP = `---
id: lai-lich-tra-no
tieuDe: Lãi và lịch trả nợ
moTa: Cách tính lãi, lịch trả gốc lãi
nhom: Tính toán và lãi
tuKhoa: [lãi, lịch trả nợ, tổng gốc]
trang: [/tools/calculators, /loans]
nguon: [src/lib/loanMath.ts]
---
# Nội dung
Gốc chia đều theo kỳ.
`;

const cd = (id: string, nhom: string, tuKhoa: string[], tieuDe = id): ChuDe => ({
  id, tieuDe, moTa: `mô tả ${id}`, nhom, tuKhoa, trang: [], nguon: [], noiDung: `nội dung ${id}`,
});

describe('docChuDe', () => {
  it('đọc đủ trường và phần nội dung', () => {
    const c = docChuDe(TEP);
    expect(c).toMatchObject({
      id: 'lai-lich-tra-no',
      tieuDe: 'Lãi và lịch trả nợ',
      nhom: 'Tính toán và lãi',
      tuKhoa: ['lãi', 'lịch trả nợ', 'tổng gốc'],
      trang: ['/tools/calculators', '/loans'],
      nguon: ['src/lib/loanMath.ts'],
    });
    expect(c.noiDung).toBe('# Nội dung\nGốc chia đều theo kỳ.');
  });

  it('chịu được BOM và xuống dòng CRLF do Notepad lưu', () => {
    const c = docChuDe('﻿' + TEP.replace(/\n/g, '\r\n'));
    expect(c.id).toBe('lai-lich-tra-no');
    expect(c.noiDung).toBe('# Nội dung\nGốc chia đều theo kỳ.');
  });

  it('thiếu phần đầu hoặc thiếu trường bắt buộc thì lỗi nêu tên tệp', () => {
    expect(() => docChuDe('# không có đầu', 'a.md')).toThrow('a.md');
    expect(() => docChuDe('---\nid: x\n---\nnd', 'b.md')).toThrow('b.md: thiếu trường tieuDe');
  });

  it('không có tuKhoa/trang/nguon thì là mảng rỗng', () => {
    const c = docChuDe('---\nid: x\ntieuDe: X\nmoTa: m\nnhom: N\n---\nnd');
    expect(c.tuKhoa).toEqual([]);
    expect(c.trang).toEqual([]);
    expect(c.nguon).toEqual([]);
  });
});

describe('traChuDe', () => {
  const kho = [
    cd('kho-luu-tru', 'Hệ thống', ['kho lưu trữ', 'kho', 'tải lên']),
    cd('lai-lich-tra-no', 'Tính toán và lãi', ['lãi', 'lịch trả nợ', 'tổng gốc']),
    cd('goi-dich-vu', 'Hệ thống', ['gói']),
    cd('goi-dien', 'Hệ thống', ['gọi']),
  ];

  it('khớp đúng id trước', () => {
    expect(traChuDe(kho, 'lai-lich-tra-no').map((c) => c.id)).toEqual(['lai-lich-tra-no']);
  });

  it('khớp trọn dãy từ khóa trong câu hỏi', () => {
    expect(traChuDe(kho, 'Tính lãi thế nào?').map((c) => c.id)).toEqual(['lai-lich-tra-no']);
    expect(traChuDe(kho, 'lịch trả nợ lệch tổng gốc').map((c) => c.id)).toEqual(['lai-lich-tra-no']);
  });

  it('không khớp chuỗi con: "không" không khớp "kho"', () => {
    expect(traChuDe(kho, 'Hệ thống không chạy')).toEqual([]);
  });

  it('câu có dấu so có dấu: "gọi" không lẫn "gói"', () => {
    expect(traChuDe(kho, 'cách gọi').map((c) => c.id)).toEqual(['goi-dien']);
    expect(traChuDe(kho, 'cách gói').map((c) => c.id)).toEqual(['goi-dich-vu']);
  });

  it('câu gõ không dấu so ở dạng bỏ dấu', () => {
    expect(traChuDe(kho, 'tinh lai the nao').map((c) => c.id)).toEqual(['lai-lich-tra-no']);
    expect(traChuDe(kho, 'tai len kho luu tru').map((c) => c.id)).toEqual(['kho-luu-tru']);
  });

  it('chỉ trả tối đa số chủ đề yêu cầu, ưu tiên khớp dài hơn', () => {
    const r = traChuDe(kho, 'kho lưu trữ và lịch trả nợ, lãi, tải lên', 1);
    expect(r).toHaveLength(1);
  });

  it('câu rỗng không khớp gì', () => {
    expect(traChuDe(kho, '   ')).toEqual([]);
  });
});

describe('danhSachChuDe và dungBanDo', () => {
  const kho = [
    cd('a', 'Nhóm một', [], 'Tiêu đề A'),
    cd('b', 'Nhóm hai', [], 'Tiêu đề B'),
    cd('c', 'Nhóm một', [], 'Tiêu đề C'),
  ];

  it('danh sách chỉ có id, tiêu đề, mô tả', () => {
    expect(danhSachChuDe(kho)[0]).toEqual({ id: 'a', tieuDe: 'Tiêu đề A', moTa: 'mô tả a' });
  });

  it('bản đồ gộp theo nhóm, mỗi nhóm một dòng', () => {
    expect(dungBanDo(kho)).toBe('- Nhóm một: a (Tiêu đề A); c (Tiêu đề C)\n- Nhóm hai: b (Tiêu đề B)');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/lib/ai/__tests__/phanTichTriThuc.test.ts`
Expected: FAIL — không import được `../triThuc/phanTichTriThuc`.

- [ ] **Step 3: Viết mã**

```ts
import { normalizeSearch } from '../../officialDoc/normalize';

export interface ChuDe {
  id: string;
  tieuDe: string;
  moTa: string;
  nhom: string;
  tuKhoa: string[];
  trang: string[];
  nguon: string[];
  noiDung: string;
}

export const GIOI_HAN_TEP = 3584;
export const GIOI_HAN_BAN_DO = 3072;

const TRUONG_BAT_BUOC = ['id', 'tieuDe', 'moTa', 'nhom'] as const;

function tachDanhSach(giaTri: string | undefined): string[] {
  const t = (giaTri ?? '').trim();
  const trong = t.startsWith('[') && t.endsWith(']') ? t.slice(1, -1) : t;
  return trong.split(',').map((s) => s.trim()).filter(Boolean);
}

export function docChuDe(raw: string, tenTep = 'tệp tri thức'): ChuDe {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) throw new Error(`${tenTep}: thiếu phần đầu --- ... ---`);
  const truong: Record<string, string> = {};
  for (const dong of m[1].split('\n')) {
    const i = dong.indexOf(':');
    if (i > 0) truong[dong.slice(0, i).trim()] = dong.slice(i + 1).trim();
  }
  for (const k of TRUONG_BAT_BUOC) {
    if (!truong[k]) throw new Error(`${tenTep}: thiếu trường ${k}`);
  }
  return {
    id: truong.id,
    tieuDe: truong.tieuDe,
    moTa: truong.moTa,
    nhom: truong.nhom,
    tuKhoa: tachDanhSach(truong.tuKhoa),
    trang: tachDanhSach(truong.trang),
    nguon: tachDanhSach(truong.nguon),
    noiDung: m[2].trim(),
  };
}

const tachTu = (s: string): string[] => s.normalize('NFC').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);
const tachTuBoDau = (s: string): string[] => tachTu(normalizeSearch(s));

function coDau(cauHoi: string): boolean {
  return tachTu(cauHoi).join(' ') !== tachTuBoDau(cauHoi).join(' ');
}

function chuaDay(tu: string[], cum: string[]): boolean {
  if (cum.length === 0 || cum.length > tu.length) return false;
  for (let i = 0; i + cum.length <= tu.length; i++) {
    if (cum.every((t, j) => tu[i + j] === t)) return true;
  }
  return false;
}

export function traChuDe(kho: ChuDe[], cauHoi: string, toiDa = 2): ChuDe[] {
  const theoId = kho.find((c) => c.id === cauHoi.trim().toLowerCase());
  if (theoId) return [theoId];
  const tach = coDau(cauHoi) ? tachTu : tachTuBoDau;
  const tu = tach(cauHoi);
  const diem = (c: ChuDe) =>
    [c.tieuDe, ...c.tuKhoa].reduce((tong, cum) => {
      const t = tach(cum);
      return chuaDay(tu, t) ? tong + t.length : tong;
    }, 0);
  return kho
    .map((c) => ({ c, d: diem(c) }))
    .filter((x) => x.d > 0)
    .sort((a, b) => b.d - a.d || a.c.id.localeCompare(b.c.id))
    .slice(0, toiDa)
    .map((x) => x.c);
}

export function danhSachChuDe(kho: ChuDe[]): { id: string; tieuDe: string; moTa: string }[] {
  return kho.map(({ id, tieuDe, moTa }) => ({ id, tieuDe, moTa }));
}

export function dungBanDo(kho: ChuDe[]): string {
  const nhom = new Map<string, ChuDe[]>();
  for (const c of kho) nhom.set(c.nhom, [...(nhom.get(c.nhom) ?? []), c]);
  return [...nhom]
    .map(([ten, ds]) => `- ${ten}: ${ds.map((c) => `${c.id} (${c.tieuDe})`).join('; ')}`)
    .join('\n');
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/ai/__tests__/phanTichTriThuc.test.ts`
Expected: PASS toàn bộ. Nếu "câu rỗng" hoặc "tối đa" lệch thì sửa mã, không sửa test.

- [ ] **Step 5: Commit** (chỉ khi được phép)

```bash
git add src/lib/ai/triThuc/phanTichTriThuc.ts src/lib/ai/__tests__/phanTichTriThuc.test.ts
git commit -m "feat: tri thuc AI - doc, tra va dung ban do chu de"
```

---

### Task 2: Vòng lặp gọi công cụ (hàm thuần)

**Files:**
- Create: `src/lib/ai/toolLoop.ts`
- Test: `src/lib/ai/__tests__/toolLoop.test.ts`

**Interfaces:**
- Produces:
  - `interface ModelPart { text?: string; functionCall?: { name: string; args?: Record<string, unknown> }; [khac: string]: unknown }`
  - `interface Content { role: 'user' | 'model'; parts: ModelPart[] }`
  - `type TurnChunk = { text: string } | { parts: ModelPart[] }` — lượt phát chữ dần rồi **một** phần tử `{ parts }` cuối cùng (toàn bộ parts của model)
  - `type OpenTurn = (contents: Content[], coCongCu: boolean) => AsyncIterable<TurnChunk>`
  - `type ToolTable = Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>>`
  - `const SO_LUOT_CONG_CU_TOI_DA = 2`
  - `runToolLoop(openTurn: OpenTurn, contents: Content[], tools: ToolTable, onToolUse?: () => void): AsyncGenerator<string>`

- [ ] **Step 1: Viết test (sẽ đỏ)**

```ts
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
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/lib/ai/__tests__/toolLoop.test.ts`
Expected: FAIL — không import được `../toolLoop`.

- [ ] **Step 3: Viết mã**

```ts
export interface ModelPart {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  [khac: string]: unknown;
}

export interface Content {
  role: 'user' | 'model';
  parts: ModelPart[];
}

export type TurnChunk = { text: string } | { parts: ModelPart[] };
export type OpenTurn = (contents: Content[], coCongCu: boolean) => AsyncIterable<TurnChunk>;
export type ToolTable = Record<string, (args: Record<string, unknown>) => unknown | Promise<unknown>>;

export const SO_LUOT_CONG_CU_TOI_DA = 2;

async function chayCongCu(tools: ToolTable, name: string, args: Record<string, unknown>): Promise<ModelPart> {
  const tool = tools[name];
  if (!tool) return { functionResponse: { name, response: { loi: `Không có công cụ ${name}` } } };
  try {
    return { functionResponse: { name, response: { ketQua: await tool(args) } } };
  } catch (err) {
    return { functionResponse: { name, response: { loi: err instanceof Error ? err.message : String(err) } } };
  }
}

export async function* runToolLoop(
  openTurn: OpenTurn,
  contents: Content[],
  tools: ToolTable,
  onToolUse?: () => void
): AsyncGenerator<string> {
  let lichSu = contents;
  for (let luot = 0; ; luot++) {
    const coCongCu = luot < SO_LUOT_CONG_CU_TOI_DA;
    let parts: ModelPart[] = [];
    for await (const chunk of openTurn(lichSu, coCongCu)) {
      if ('text' in chunk) yield chunk.text;
      else parts = chunk.parts;
    }
    const cacLenhGoi = coCongCu ? parts.filter((p) => p.functionCall) : [];
    if (cacLenhGoi.length === 0) return;
    onToolUse?.();
    const ketQua = await Promise.all(
      cacLenhGoi.map((p) => chayCongCu(tools, p.functionCall!.name, p.functionCall!.args ?? {}))
    );
    lichSu = [...lichSu, { role: 'model', parts }, { role: 'user', parts: ketQua }];
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/ai/__tests__/toolLoop.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit** (chỉ khi được phép)

```bash
git add src/lib/ai/toolLoop.ts src/lib/ai/__tests__/toolLoop.test.ts
git commit -m "feat: tri thuc AI - vong lap goi cong cu"
```

---

### Task 3: Kho tri thức (nạp lười) và công cụ `traCuuHeThong`

**Files:**
- Create: `src/lib/ai/triThuc/khoTriThuc.ts`, `src/lib/ai/tools/traCuuHeThong.ts`
- Test: `src/lib/ai/__tests__/khoTriThuc.test.ts`, `src/lib/ai/__tests__/traCuuHeThong.test.ts`

**Interfaces:**
- Consumes: `ChuDe`, `docChuDe`, `traChuDe`, `danhSachChuDe`, `dungBanDo` (Task 1); `ToolTable` (Task 2).
- Produces:
  - `taiKhoTriThuc(): Promise<ChuDe[]>` — tải một lần, sắp theo `id`; lỗi thì bỏ cache để lần sau thử lại và ném lỗi nêu tên tệp
  - `const TEN_CONG_CU = 'traCuuHeThong'`
  - `const KHAI_BAO_CONG_CU` — đối tượng `{ functionDeclarations: [...] }` đưa vào `tools`
  - `taoCongCuTriThuc(taiKho: () => Promise<ChuDe[]>): ToolTable`
  - `dungChiDanTriThuc(kho: ChuDe[]): string` — đoạn thêm vào system prompt (chỉ dẫn + bản đồ)

- [ ] **Step 1: Viết test (sẽ đỏ)**

`khoTriThuc.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { taiKhoTriThuc } from '../triThuc/khoTriThuc';

describe('taiKhoTriThuc', () => {
  it('tải một lần: gọi lại trả cùng kết quả, đã sắp theo id', async () => {
    const a = taiKhoTriThuc();
    expect(taiKhoTriThuc()).toBe(a);
    const kho = await a;
    expect(kho.map((c) => c.id)).toEqual([...kho.map((c) => c.id)].sort());
  });
});
```

`traCuuHeThong.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import type { ChuDe } from '../triThuc/phanTichTriThuc';
import { KHAI_BAO_CONG_CU, TEN_CONG_CU, dungChiDanTriThuc, taoCongCuTriThuc } from '../tools/traCuuHeThong';

const kho: ChuDe[] = [
  { id: 'lai-lich-tra-no', tieuDe: 'Lãi và lịch trả nợ', moTa: 'm1', nhom: 'Tính toán và lãi', tuKhoa: ['lãi', 'lịch trả nợ'], trang: ['/loans'], nguon: [], noiDung: 'Gốc chia đều' },
  { id: 'kho-luu-tru', tieuDe: 'Kho lưu trữ', moTa: 'm2', nhom: 'Hệ thống', tuKhoa: ['kho lưu trữ'], trang: ['/storage'], nguon: [], noiDung: 'Tải lên' },
];
const chay = async (args: Record<string, unknown>) => {
  const tool = taoCongCuTriThuc(async () => kho)[TEN_CONG_CU];
  return (await tool(args)) as Record<string, unknown>;
};

describe('traCuuHeThong', () => {
  it('khai báo đúng tên và tham số chuDe tùy chọn', () => {
    const decl = KHAI_BAO_CONG_CU.functionDeclarations[0];
    expect(decl.name).toBe('traCuuHeThong');
    expect(decl.parameters.properties.chuDe.type).toBe('STRING');
    expect(decl.parameters).not.toHaveProperty('required');
  });

  it('có chuDe khớp: trả nội dung chủ đề', async () => {
    expect(await chay({ chuDe: 'tính lãi' })).toEqual({
      chuDe: [{ id: 'lai-lich-tra-no', tieuDe: 'Lãi và lịch trả nợ', trang: ['/loans'], noiDung: 'Gốc chia đều' }],
    });
  });

  it('chuDe rỗng, thiếu hoặc không phải chuỗi: trả danh sách chủ đề, không lỗi', async () => {
    const mong = { danhSach: [{ id: 'lai-lich-tra-no', tieuDe: 'Lãi và lịch trả nợ', moTa: 'm1' }, { id: 'kho-luu-tru', tieuDe: 'Kho lưu trữ', moTa: 'm2' }] };
    expect(await chay({})).toEqual(mong);
    expect(await chay({ chuDe: '  ' })).toEqual(mong);
    expect(await chay({ chuDe: 42 })).toEqual(mong);
  });

  it('chủ đề không tồn tại: nói không tìm thấy và kèm danh sách', async () => {
    const r = await chay({ chuDe: 'thời tiết hôm nay' });
    expect(r.khongTimThay).toBe('thời tiết hôm nay');
    expect(r.danhSach).toHaveLength(2);
  });
});

describe('dungChiDanTriThuc', () => {
  it('nêu tên công cụ, dặn không bịa, và chứa bản đồ chủ đề', () => {
    const s = dungChiDanTriThuc(kho);
    expect(s).toContain('traCuuHeThong');
    expect(s).toContain('không tự bịa');
    expect(s).toContain('- Tính toán và lãi: lai-lich-tra-no (Lãi và lịch trả nợ)');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/lib/ai/__tests__/khoTriThuc.test.ts src/lib/ai/__tests__/traCuuHeThong.test.ts`
Expected: FAIL — không import được hai mô-đun mới.

- [ ] **Step 3: Viết mã**

`src/lib/ai/triThuc/khoTriThuc.ts`:

```ts
import { docChuDe, type ChuDe } from './phanTichTriThuc';

const TEP = import.meta.glob<string>('./noi-dung/*.md', { query: '?raw', import: 'default' });

let dangTai: Promise<ChuDe[]> | null = null;

export function taiKhoTriThuc(): Promise<ChuDe[]> {
  dangTai ??= Promise.all(Object.entries(TEP).map(async ([duongDan, tai]) => docChuDe(await tai(), duongDan)))
    .then((ds) => ds.sort((a, b) => a.id.localeCompare(b.id)))
    .catch((err) => {
      dangTai = null;
      throw err;
    });
  return dangTai;
}
```

`src/lib/ai/tools/traCuuHeThong.ts`:

```ts
import { danhSachChuDe, dungBanDo, traChuDe, type ChuDe } from '../triThuc/phanTichTriThuc';
import type { ToolTable } from '../toolLoop';

export const TEN_CONG_CU = 'traCuuHeThong';

export const KHAI_BAO_CONG_CU = {
  functionDeclarations: [
    {
      name: TEN_CONG_CU,
      description:
        'Tra cứu cách dùng các trang, quy trình nghiệp vụ và các điểm dễ sai của hệ thống CustomerManager. Gọi khi người dùng hỏi một trang dùng thế nào, quy trình ra sao, vì sao số liệu lệch. Không dùng để tra dữ liệu khách hàng.',
      parameters: {
        type: 'OBJECT',
        properties: {
          chuDe: {
            type: 'STRING',
            description: 'Mã chủ đề hoặc từ khóa lấy từ bản đồ chủ đề. Bỏ trống để xem danh sách chủ đề.',
          },
        },
      },
    },
  ],
};

export function taoCongCuTriThuc(taiKho: () => Promise<ChuDe[]>): ToolTable {
  return {
    [TEN_CONG_CU]: async (args) => {
      const kho = await taiKho();
      const chuDe = typeof args.chuDe === 'string' ? args.chuDe.trim() : '';
      if (!chuDe) return { danhSach: danhSachChuDe(kho) };
      const khop = traChuDe(kho, chuDe);
      if (khop.length === 0) return { khongTimThay: chuDe, danhSach: danhSachChuDe(kho) };
      return { chuDe: khop.map((c) => ({ id: c.id, tieuDe: c.tieuDe, trang: c.trang, noiDung: c.noiDung })) };
    },
  };
}

export function dungChiDanTriThuc(kho: ChuDe[]): string {
  return `TRI THỨC HỆ THỐNG:
Khi người dùng hỏi một trang dùng thế nào, quy trình nghiệp vụ ra sao hoặc vì sao số liệu lệch, gọi công cụ ${TEN_CONG_CU} rồi trả lời theo nội dung nhận được. Công cụ không có thì nói hệ thống chưa có mô tả, không tự bịa.
Các chủ đề:
${dungBanDo(kho)}`;
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Run: `npx vitest run src/lib/ai/__tests__/khoTriThuc.test.ts src/lib/ai/__tests__/traCuuHeThong.test.ts`
Expected: PASS. (Chưa có tệp `.md` nên kho rỗng; `import.meta.glob` không khớp tệp nào vẫn hợp lệ.)

- [ ] **Step 5: Commit** (chỉ khi được phép)

```bash
git add src/lib/ai/triThuc/khoTriThuc.ts src/lib/ai/tools/traCuuHeThong.ts src/lib/ai/__tests__/khoTriThuc.test.ts src/lib/ai/__tests__/traCuuHeThong.test.ts
git commit -m "feat: tri thuc AI - kho nap luoi va cong cu traCuuHeThong"
```

---

### Task 4: Nối vào `geminiClient` (tools, nhiều parts, mở từng lượt)

**Files:**
- Modify: `src/lib/ai/geminiClient.ts` (import đầu tệp; `StreamExtras`; thân `streamGeminiContent`; `summarizeDocumentWithAi`)
- Test: `src/lib/ai/__tests__/geminiTools.test.ts`

**Interfaces:**
- Consumes: `runToolLoop`, `OpenTurn`, `TurnChunk`, `ModelPart`, `Content` (Task 2); `taoCongCuTriThuc`, `KHAI_BAO_CONG_CU`, `dungChiDanTriThuc` (Task 3); `taiKhoTriThuc` (Task 3).
- Produces: `StreamExtras` có thêm `onToolUse?: () => void` và `tools?: boolean` (mặc định bật; `false` tắt). Chữ ký `streamGeminiContent` không đổi.

- [ ] **Step 1: Viết test (sẽ đỏ)**

```ts
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest';
import type { AiChatMessage } from '../../../types/ai';
import type { ChuDe } from '../triThuc/phanTichTriThuc';

const m = vi.hoisted(() => ({ kho: vi.fn() }));
vi.mock('../triThuc/khoTriThuc', () => ({ taiKhoTriThuc: m.kho }));

import { resetModelMemory, streamGeminiContent, type StreamExtras } from '../geminiClient';

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

  it('lượt sau không mở được: báo lỗi Gemini, không đổi sang model khác', async () => {
    const f = vi.fn()
      .mockImplementationOnce(async () => khoiSse(parts([{ functionCall: { name: 'traCuuHeThong', args: {} } }])))
      .mockImplementation(async () => new Response('{}', { status: 429 }));
    vi.stubGlobal('fetch', f);
    await expect(gom()).rejects.toThrow('hết hạn mức');
    expect(f).toHaveBeenCalledTimes(2);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Run: `npx vitest run src/lib/ai/__tests__/geminiTools.test.ts`
Expected: FAIL (không có `tools` trong body, v.v.).

- [ ] **Step 3: Sửa `geminiClient.ts`**

(a) Thêm import dưới các import hiện có:

```ts
import { runToolLoop, type Content, type ModelPart, type OpenTurn, type TurnChunk } from './toolLoop';
import { KHAI_BAO_CONG_CU, dungChiDanTriThuc, taoCongCuTriThuc } from './tools/traCuuHeThong';
import { taiKhoTriThuc } from './triThuc/khoTriThuc';
import type { ChuDe } from './triThuc/phanTichTriThuc';
```

(b) Trong `StreamExtras` thêm hai trường (cuối interface):

```ts
  /** Gọi khi AI đã tra công cụ tri thức trong lượt này: câu trả lời không nên lưu dùng chung. */
  onToolUse?: () => void;
  /** Đặt false để tắt công cụ tri thức (lời gọi cần đầu ra thuần như tóm tắt, trích JSON). */
  tools?: boolean;
```

(c) Thêm hàm đọc một lượt, đặt ngay trước `streamGeminiContent`:

```ts
async function* readTurn(response: Response): AsyncGenerator<TurnChunk> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  const parts: ModelPart[] = [];

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data:')) continue;

        const dataStr = trimmed.slice(5).trim();
        if (dataStr === '[DONE]') break;

        try {
          const chunkParts = JSON.parse(dataStr).candidates?.[0]?.content?.parts;
          if (!Array.isArray(chunkParts)) continue;
          for (const part of chunkParts as ModelPart[]) {
            parts.push(part);
            if (typeof part.text === 'string' && part.text && part.thought !== true) yield { text: part.text };
          }
        } catch {
          // Bỏ qua dòng SSE không hợp lệ
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  yield { parts };
}
```

(d) Trong thân `streamGeminiContent`, **thay** từ dòng `let systemPrompt = SYSTEM_INSTRUCTION;` đến hết `const payload = {...};` bằng:

```ts
  let kho: ChuDe[] = [];
  if (extras.tools !== false) {
    try {
      kho = await taiKhoTriThuc();
    } catch (err) {
      console.warn('Không nạp được kho tri thức cho AI:', err);
    }
  }
  const coTriThuc = kho.length > 0;

  let systemPrompt = SYSTEM_INSTRUCTION;
  if (coTriThuc) {
    systemPrompt += `

${dungChiDanTriThuc(kho)}`;
  }

  // Bơm dữ liệu thời gian thực của hệ thống vào System Prompt
  if (systemContext) {
    systemPrompt += `

${formatSystemContextPrompt(systemContext)}`;
  }

  if (docContext) {
    systemPrompt += `

NGỮ CẢNH VĂN BẢN ĐANG XEM XÉT:
${docContext}`;
  }

  const payloadFor = (noiDung: unknown[], coCongCu: boolean) => ({
    system_instruction: {
      parts: [{ text: systemPrompt }],
    },
    contents: noiDung,
    ...(coTriThuc && coCongCu ? { tools: [KHAI_BAO_CONG_CU] } : {}),
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 4096,
    },
  });
  const payload = payloadFor(contents, true);
```

(e) Trong vòng `for (const cand of candidateModels)`, khi mở được thì ghi nhớ model: khai báo `let chosenModel = '';` cạnh `let response: Response | null = null;` và đổi nhánh thành công thành:

```ts
        if ('response' in opened) {
          response = opened.response;
          chosenModel = cand;
          break;
        }
```

(f) **Thay** toàn bộ khối từ comment `// Đọc SSE Stream từ Google Gemini` đến hết hàm (từ `const reader = ...` đến `finally { reader.releaseLock(); }` và dấu `}` đóng hàm) bằng:

```ts
  const lanDau = response;
  let soLuot = 0;
  const openTurn: OpenTurn = async function* (noiDung, coCongCu) {
    if (soLuot++ === 0) {
      yield* readTurn(lanDau);
      return;
    }
    let opened: OpenResult;
    try {
      opened = await openStream(chosenModel, apiKey, payloadFor(noiDung, coCongCu), HEADER_TIMEOUT_MS);
    } catch (err) {
      const timedOut = err instanceof Error && err.name === 'AbortError';
      throw new AiUnavailableError(
        timedOut
          ? `Gemini không phản hồi sau ${Math.round(HEADER_TIMEOUT_MS / 1000)} giây. Thử lại.`
          : 'Không kết nối được tới Gemini. Kiểm tra mạng rồi thử lại.'
      );
    }
    if (!('response' in opened)) throw new AiUnavailableError(opened.failure);
    yield* readTurn(opened.response);
  };

  yield* runToolLoop(openTurn, contents as Content[], coTriThuc ? taoCongCuTriThuc(taiKhoTriThuc) : {}, extras.onToolUse);
}
```

Giữ nguyên khối `if (!response || !response.body) { ... return; }` (đường dự phòng) ngay trước đó. Sau khối đó TypeScript đã biết `response` khác null; nếu `tsc` kêu, dùng `const lanDau: Response = response;`.

(g) Trong `summarizeDocumentWithAi`, đổi dòng gọi stream thành:

```ts
  for await (const chunk of streamGeminiContent(messages, undefined, undefined, undefined, { tools: false })) {
```

- [ ] **Step 4: Chạy test mới và test cũ của AI**

Run: `npx vitest run src/lib/ai`
Expected: PASS toàn bộ, gồm `geminiRequest.test.ts` (đường dự phòng, 429, 404, mất mạng giữ nguyên). Nếu `geminiRequest` đỏ vì thứ tự mock fetch thì **sửa mã**, không nới test; đọc kỹ lỗi trước khi sửa.

- [ ] **Step 5: Kiểm kiểu**

Run: `npx tsc -b`
Expected: không lỗi.

- [ ] **Step 6: Commit** (chỉ khi được phép)

```bash
git add src/lib/ai/geminiClient.ts src/lib/ai/__tests__/geminiTools.test.ts
git commit -m "feat: tri thuc AI - noi cong cu tra cuu vao geminiClient"
```

---

### Task 5: Không lưu dùng chung câu trả lời có dùng công cụ

**Files:**
- Modify: `src/hooks/useAiAssistant.ts` (quanh dòng 229-257)
- Test: `src/hooks/__tests__/useAiAssistantDocs.test.tsx`

**Interfaces:**
- Consumes: `StreamExtras.onToolUse` (Task 4).

- [ ] **Step 1: Viết test (sẽ đỏ)** — thêm vào `describe('useAiAssistant - đọc văn bản Văn thư', ...)`, ngay sau test "không lưu khi AI dùng câu trả lời dự phòng":

```ts
  it('không lưu khi AI đã tra công cụ tri thức, dù câu hỏi khớp văn bản', async () => {
    m.stream.mockImplementation(async function* (_h: unknown, _d: unknown, _m: unknown, _s: unknown, extras: { onToolUse: () => void }) {
      extras.onToolUse();
      yield 'Trả lời theo tri thức';
    });
    await ask(setup(), Q);
    expect(m.save).not.toHaveBeenCalled();
  });
```

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `npx vitest run src/hooks/__tests__/useAiAssistantDocs.test.tsx -t "tri thức"`
Expected: FAIL — `save` bị gọi.

- [ ] **Step 3: Sửa `useAiAssistant.ts`**

Cạnh `let usedFallback = false;` thêm `let usedTools = false;`. Trong đối tượng extras truyền vào `streamGeminiContent` thêm:

```ts
          onToolUse: () => {
            usedTools = true;
          },
```

Đổi điều kiện lưu thành:

```ts
      if (shareable && !failed && !usedFallback && !usedTools && !abortControllerRef.current && docs.complete && accumulated.trim()) {
```

- [ ] **Step 4: Chạy lại cả tệp test hook**

Run: `npx vitest run src/hooks/__tests__/useAiAssistantDocs.test.tsx`
Expected: PASS toàn bộ (test lưu hiện có vẫn qua vì mock không gọi `onToolUse`).

- [ ] **Step 5: Commit** (chỉ khi được phép)

```bash
git add src/hooks/useAiAssistant.ts src/hooks/__tests__/useAiAssistantDocs.test.tsx
git commit -m "feat: tri thuc AI - khong luu dung chung cau tra loi co tra cong cu"
```

---

### Task 6: Test gác

**Files:**
- Test (mới): `src/lib/ai/__tests__/triThucGac.test.ts`

**Interfaces:**
- Consumes: `ROUTE_OF` (`src/lib/routes.ts`), `ADMIN_NAV` (`src/lib/adminNav.ts`), `taiKhoTriThuc` (Task 3), `dungBanDo`, `GIOI_HAN_TEP`, `GIOI_HAN_BAN_DO` (Task 1).

- [ ] **Step 1: Viết test**

```ts
import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { ROUTE_OF } from '../../routes';
import { ADMIN_NAV } from '../../adminNav';
import { taiKhoTriThuc } from '../triThuc/khoTriThuc';
import { GIOI_HAN_BAN_DO, GIOI_HAN_TEP, dungBanDo } from '../triThuc/phanTichTriThuc';

const THU_MUC = fileURLToPath(new URL('../triThuc/noi-dung/', import.meta.url));
const tepMd = existsSync(THU_MUC) ? readdirSync(THU_MUC).filter((t) => t.endsWith('.md')) : [];

const TAT_CA_TRANG = new Set([...Object.values(ROUTE_OF), ...ADMIN_NAV.map((i) => i.path)]);

/** Trang chưa có tri thức. Chỉ được GIẢM: viết xong chủ đề nào thì xóa trang đó khỏi danh sách. */
const CHUA_VIET: string[] = [
  '/dashboard', '/hub', '/customers', '/disbursement', '/credit-contracts', '/loans', '/collaterals',
  '/mortgage-contracts', '/credit-cards', '/dispatches', '/storage', '/tools/calculators',
  '/tools/business-plan', '/tools/corporate-financial', '/tools/inventory', '/tools/shopping-checklist',
  '/tools/purchase-statement', '/tools/retail-invoice', '/tools/rate-quote', '/tools/cost-of-funds',
  '/tools/reports', '/office', '/reference/loan-purpose', '/reference/card-policies',
  '/reference/templates', '/reference/quiz', '/post-loan-control', '/admin', '/settings',
  '/admin/users', '/admin/transfer', '/admin/storage',
];

const GIONG_BI_MAT: [string, RegExp][] = [
  ['khóa Google API', /AIza[0-9A-Za-z_-]{35}/],
  ['JWT', /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{5,}/],
  ['khóa kiểu sk-', /\bsk-[A-Za-z0-9]{20,}/],
  ['token GitHub', /\bgh[pousr]_[A-Za-z0-9]{20,}/],
  ['khóa riêng', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['URL kèm tài khoản:mật khẩu', /https?:\/\/[^/\s:@]+:[^/\s@]+@/],
  ['gán bí mật', /(secret|token|password|api[_-]?key)\s*[:=]\s*['"]?[A-Za-z0-9_\-/+=]{12,}/i],
];

describe('kho tri thức AI', () => {
  it('mọi tệp: không BOM, đúng cỡ, tên tệp trùng id', async () => {
    const kho = await taiKhoTriThuc();
    expect(kho).toHaveLength(tepMd.length);
    for (const ten of tepMd) {
      const raw = readFileSync(resolve(THU_MUC, ten));
      expect(raw[0] === 0xef && raw[1] === 0xbb, `${ten} có BOM`).toBe(false);
      expect(raw.length, `${ten} vượt ${GIOI_HAN_TEP} byte`).toBeLessThanOrEqual(GIOI_HAN_TEP);
    }
    expect(kho.map((c) => `${c.id}.md`).sort()).toEqual([...tepMd].sort());
  });

  it('bản đồ chủ đề không vượt giới hạn', async () => {
    const kho = await taiKhoTriThuc();
    expect(Buffer.byteLength(dungBanDo(kho)), 'bản đồ quá lớn: gộp chủ đề hoặc rút tiêu đề').toBeLessThanOrEqual(GIOI_HAN_BAN_DO);
  });

  it('mọi tệp trong `nguon` còn tồn tại trong src', async () => {
    const kho = await taiKhoTriThuc();
    const mat = kho.flatMap((c) => c.nguon.filter((n) => !existsSync(resolve(process.cwd(), n))).map((n) => `${c.id}: ${n}`));
    expect(mat, 'tệp nguồn đã đổi tên hoặc bị xóa: cập nhật tri thức').toEqual([]);
  });

  it('mọi đường dẫn trong `trang` là đường dẫn có thật', async () => {
    const kho = await taiKhoTriThuc();
    const la = kho.flatMap((c) => c.trang.filter((p) => !TAT_CA_TRANG.has(p)).map((p) => `${c.id}: ${p}`));
    expect(la).toEqual([]);
  });

  it('không chứa chuỗi giống bí mật', () => {
    const vang: string[] = [];
    for (const ten of tepMd) {
      const text = readFileSync(resolve(THU_MUC, ten), 'utf8');
      for (const [nhan, mau] of GIONG_BI_MAT) if (mau.test(text)) vang.push(`${ten}: ${nhan}`);
    }
    expect(vang).toEqual([]);
  });

  it('mọi trang đều có tri thức, trừ các trang còn nợ trong CHUA_VIET (danh sách chỉ giảm)', async () => {
    const kho = await taiKhoTriThuc();
    const daPhu = new Set(kho.flatMap((c) => c.trang));
    const thieu = [...TAT_CA_TRANG].filter((p) => !daPhu.has(p));
    expect(thieu.filter((p) => !CHUA_VIET.includes(p)), 'trang chưa có tri thức và chưa nằm trong CHUA_VIET').toEqual([]);
    expect(CHUA_VIET.filter((p) => daPhu.has(p)), 'trang đã có tri thức: xóa khỏi CHUA_VIET').toEqual([]);
    expect(CHUA_VIET.filter((p) => !TAT_CA_TRANG.has(p)), 'CHUA_VIET có đường dẫn không tồn tại').toEqual([]);
  });
});
```

- [ ] **Step 2: Chạy**

Run: `npx vitest run src/lib/ai/__tests__/triThucGac.test.ts`
Expected: PASS (chưa có tệp `.md`, mọi trang nằm trong `CHUA_VIET`). Nếu "CHUA_VIET có đường dẫn không tồn tại" đỏ thì `ROUTE_OF` khác bản kế hoạch: sửa danh sách cho khớp `ROUTE_OF`/`ADMIN_NAV` thật, không nới điều kiện.

- [ ] **Step 3: Commit** (chỉ khi được phép)

```bash
git add src/lib/ai/__tests__/triThucGac.test.ts
git commit -m "test: tri thuc AI - test gac do phu trang, kich thuoc, bi mat"
```

---

## Quy trình chung cho Task 7–10 (viết một chủ đề tri thức)

Mỗi task viết đúng một tệp `src/lib/ai/triThuc/noi-dung/<id>.md`. Nội dung **không** có sẵn trong kế hoạch vì phải đọc từ mã thật; quy trình bắt buộc:

1. **Đọc mã trước, viết sau.** Mở từng tệp trong `nguon` và các màn hình liên quan; trả lời các câu hỏi liệt kê ở task. Với phần nghiệp vụ, có thể gọi skill `tin-dung` để biết ngữ cảnh nhưng **mọi câu mô tả hành vi phải khớp `src/`**; skill đã trôi so với mã.
2. **Khuôn nội dung** (tổng ≤ 3584 byte, gồm cả frontmatter): `# <Tiêu đề>`; **Dùng để làm gì** (1–2 câu); **Cách dùng** (các bước theo đúng nút/nhãn thật trên giao diện — mở view để chép đúng nhãn); **Quy tắc tính/xử lý** (công thức, ngưỡng, thứ tự ưu tiên lấy từ mã); **Chỗ dễ sai** (các bẫy có thật trong mã hoặc nhật ký `docs/progress/`); không viết tooltip, không lời mở đầu, không kể lịch sử.
3. **Đối chiếu từng câu**: tự rà một lượt, mỗi câu hành vi chỉ ra được tệp trong `nguon` (nếu dùng tệp ngoài danh sách thì thêm vào `nguon`). Câu nào không chứng minh được thì xóa.
4. Chạy `npx vitest run src/lib/ai/__tests__/triThucGac.test.ts`: nó sẽ liệt kê các trang vừa được phủ ("trang đã có tri thức: xóa khỏi CHUA_VIET"); xóa đúng các đường dẫn đó khỏi `CHUA_VIET` trong test, chạy lại tới khi xanh. Chỉ khai `trang` cho trang mà chủ đề thật sự mô tả.
5. Không chép dữ liệu khách hàng thật, địa chỉ nội bộ hay khóa vào tệp.

---

### Task 7: Chủ đề `lai-lich-tra-no`

**Files:**
- Create: `src/lib/ai/triThuc/noi-dung/lai-lich-tra-no.md`
- Modify: `src/lib/ai/__tests__/triThucGac.test.ts` (`CHUA_VIET`)

Frontmatter khởi điểm (điều chỉnh `trang`/`nguon` theo thực tế sau khi đọc mã):

```markdown
---
id: lai-lich-tra-no
tieuDe: Lãi và lịch trả nợ
moTa: Cách tính lãi, sinh lịch trả gốc lãi, phạt trả trước, vì sao tổng gốc hoặc lãi lệch
nhom: Tính toán và lãi
tuKhoa: [lãi, lãi suất, lịch trả nợ, lịch trả, gốc, kỳ trả, trả nợ, tổng gốc, phạt trả trước, tất toán]
trang: [/tools/calculators, /loans]
nguon: [src/lib/loanMath.ts, src/lib/calcMath.ts, src/lib/loanSettlement.ts, src/lib/loanProductRules.ts]
---
```

Câu hỏi phải trả lời từ mã:
- `generateSchedule` (`loanMath.ts`): các kiểu trả gốc (đều theo kỳ, cuối kỳ/bullet…) chọn bằng gì; kỳ cuối xử lý phần gốc dư thế nào để `Σ(gốc các kỳ)` bằng tiền vay.
- Lãi mỗi kỳ tính trên cơ sở nào (số ngày thực tế/số ngày chuẩn, dư nợ đầu kỳ), làm tròn ở đâu (`roundPrincipalCore`).
- Ngày đến hạn đầu tiên và ngày đáo hạn được xác định ra sao (`resolveFirstDueAnchor`, `maturityDateOf`, `applyMaturityToDueDates`).
- Phạt/lãi quá hạn (`computeSchedulePenalty`) và tất toán trước hạn (`loanSettlement.ts`): công thức và điều kiện.
- Công cụ tính toán ở `/tools/calculators` làm gì, khác gì lịch trả của khoản vay ở `/loans`.
- Bẫy thường gặp: số liệu lệch khi nào (ví dụ đổi ngày giải ngân/đáo hạn rồi phải dựng lại lịch — `redateSchedules`, `recalculateSchedules`).

- [ ] **Step 1: Đọc mã và viết tệp theo quy trình chung.**
- [ ] **Step 2: Chạy `npx vitest run src/lib/ai/__tests__/triThucGac.test.ts`, cập nhật `CHUA_VIET`, chạy lại tới xanh.**
- [ ] **Step 3: Chạy `npx vitest run src/lib/ai`** — Expected: PASS.
- [ ] **Step 4: Commit** (chỉ khi được phép): `git add src/lib/ai/triThuc/noi-dung/lai-lich-tra-no.md src/lib/ai/__tests__/triThucGac.test.ts` rồi `git commit -m "feat: tri thuc AI - chu de lai va lich tra no"`.

---

### Task 8: Chủ đề `nhom-no`

**Files:**
- Create: `src/lib/ai/triThuc/noi-dung/nhom-no.md`
- Modify: `src/lib/ai/__tests__/triThucGac.test.ts` (`CHUA_VIET`)

Frontmatter khởi điểm:

```markdown
---
id: nhom-no
tieuDe: Nhóm nợ và kiểm soát sau vay
moTa: Cách xác định nhóm nợ từ ngày quá hạn, vì sao nhóm nợ hiển thị khác dữ liệu lưu, kiểm soát sau vay
nhom: Tính toán và lãi
tuKhoa: [nhóm nợ, quá hạn, ngày quá hạn, nợ xấu, kiểm soát sau vay, kssv, phân loại nợ]
trang: [/post-loan-control, /loans]
nguon: [src/lib/loanMath.ts, src/lib/postLoanControl.ts]
---
```

Câu hỏi phải trả lời từ mã:
- `debtGroupFromOverdueDays` và `getAutoDebtGroupInfo` (`loanMath.ts`): các ngưỡng ngày → nhóm 1–5, và ngày quá hạn lấy từ lịch trả nào (`overdueDaysOfSchedule`).
- Nhóm nợ được tính sống từ ngày quá hạn so với trường lưu: nơi nào hiển thị lấy giá trị nào (dùng lớn hơn của hai? — xác nhận bằng mã, đừng tin ghi chú); `/loans` và `/post-loan-control` có thống nhất không.
- `postLoanControl.ts` và `PostLoanControlView.tsx`: màn kiểm soát sau vay liệt kê/nhắc việc gì, theo điều kiện nào.
- Bẫy: vì sao nhóm nợ trên màn khác nhóm đã lưu trong hồ sơ; việc đổi ngày hay ghi nhận trả nợ ảnh hưởng ra sao.

- [ ] **Step 1: Đọc mã và viết tệp theo quy trình chung.**
- [ ] **Step 2: Chạy `npx vitest run src/lib/ai/__tests__/triThucGac.test.ts`, cập nhật `CHUA_VIET`, chạy lại tới xanh.**
- [ ] **Step 3: Chạy `npx vitest run src/lib/ai`** — Expected: PASS.
- [ ] **Step 4: Commit** (chỉ khi được phép): `git add src/lib/ai/triThuc/noi-dung/nhom-no.md src/lib/ai/__tests__/triThucGac.test.ts` rồi `git commit -m "feat: tri thuc AI - chu de nhom no"`.

---

### Task 9: Chủ đề `tsbd-ltv`

**Files:**
- Create: `src/lib/ai/triThuc/noi-dung/tsbd-ltv.md`
- Modify: `src/lib/ai/__tests__/triThucGac.test.ts` (`CHUA_VIET`)

Frontmatter khởi điểm:

```markdown
---
id: tsbd-ltv
tieuDe: Tài sản bảo đảm, định giá và LTV
moTa: LTV theo loại tài sản, hạn mức cho vay tối đa từ tài sản, hiệu lực định giá
nhom: Hồ sơ tín dụng
tuKhoa: [tài sản bảo đảm, tsbd, ltv, định giá, hạn mức, giá trị định giá, sổ tiết kiệm, bất động sản, hiệu lực định giá]
trang: [/collaterals]
nguon: [src/lib/collateralMath.ts, src/lib/creditLimit.ts, src/components/views/CollateralView.tsx]
---
```

Câu hỏi phải trả lời từ mã:
- `ASSET_TYPE_LTV`, `defaultLtvForAssetType`, `getEffectiveLtv`, `isLtvException`: LTV mặc định theo loại tài sản, khi nào dùng LTV nhập tay, LTV 0% xử lý ra sao (quy tắc không dùng `||` khi 0 hợp lệ — xác nhận trong mã), ngoại lệ LTV là gì.
- `maxLoanFromCollateral`, `usableCapacity`, `totalUsableCapacity`: công thức hạn mức cho vay từ tài sản; chọn `AppraisedValue` hay `Value`; tài sản hạn chế (`isRestrictedAsset`) bị tính thế nào.
- Hiệu lực định giá: `appraisalExpiryDate`, `appraisalStatus`, `isAppraisalUsable`, `APPRAISAL_TENOR_DEFAULT_MONTHS`, `APPRAISAL_WARN_DAYS` — khi nào hết hạn, cảnh báo, và định giá hết hạn có còn tính hạn mức không.
- Sổ tiết kiệm và thẻ: `isSavingsPassbook`, `CARD_STK_LTV_PERCENT`, `cardProductCap`.
- `creditLimit.ts` nối tài sản với hạn mức tín dụng ra sao (chỉ nêu phần thực sự có trong mã).
- Màn `/collaterals` (định giá TSĐB): các nút và cột thật.

- [ ] **Step 1: Đọc mã và viết tệp theo quy trình chung.**
- [ ] **Step 2: Chạy `npx vitest run src/lib/ai/__tests__/triThucGac.test.ts`, cập nhật `CHUA_VIET`, chạy lại tới xanh.**
- [ ] **Step 3: Chạy `npx vitest run src/lib/ai`** — Expected: PASS.
- [ ] **Step 4: Commit** (chỉ khi được phép): `git add src/lib/ai/triThuc/noi-dung/tsbd-ltv.md src/lib/ai/__tests__/triThucGac.test.ts` rồi `git commit -m "feat: tri thuc AI - chu de tai san bao dam va LTV"`.

---

### Task 10: Chủ đề `kho-luu-tru`

**Files:**
- Create: `src/lib/ai/triThuc/noi-dung/kho-luu-tru.md`
- Modify: `src/lib/ai/__tests__/triThucGac.test.ts` (`CHUA_VIET`)

Frontmatter khởi điểm:

```markdown
---
id: kho-luu-tru
tieuDe: Kho lưu trữ
moTa: Tải lên, tải xuống, tệp trùng tên, bảng truyền tệp, cấu hình kho cho quản trị
nhom: Hệ thống
tuKhoa: [kho lưu trữ, kho, tải lên, tải xuống, tệp trùng, ghi đè, bảng truyền tệp, thử lại, hủy tải, thư mục, zip]
trang: [/storage, /admin/storage]
nguon: [src/lib/drive/driveUpload.ts, src/lib/drive/driveDuplicates.ts, src/lib/transferRows.ts, src/hooks/useArchive.ts, src/hooks/useArchiveUpload.ts, src/components/views/StorageManagementView.tsx, src/components/views/StorageConfigView.tsx]
---
```

Câu hỏi phải trả lời từ mã (đây là phần hay đổi nhất: `docs/progress/2026-10.md` chỉ để gợi hướng, **mã mới là sự thật**):
- Kho lấy dữ liệu từ đâu, mở kho nhanh bằng gì, vùng thả tệp hoạt động ra sao (`useArchive.ts`, `StorageManagementView.tsx`).
- Tải lên: chọn tệp/thư mục, xử lý tệp trùng tên (các lựa chọn thật trong `driveDuplicates.ts`, mặc định, ghi đè áp dụng cho loại tệp nào và không áp dụng cho loại nào).
- Bảng truyền tệp: tab, trạng thái, tiến độ theo byte và tốc độ (khi nào có, khi nào không), hủy và thử lại từng tệp, điều kiện thử lại (`transferRows.ts`, `useArchiveUpload.ts`).
- Tải xuống thư mục (ZIP) và tải từng tệp khác nhau thế nào.
- `/admin/storage`: ai cấu hình được (quyền `storage.configure` trong `src/lib/adminNav.ts`) và cấu hình gì (`StorageConfigView.tsx`).
- Bẫy thật đã gặp ở nhật ký tiến độ và còn đúng trong mã (vd ghi đè tệp 0 byte lỗi, chưa có giao diện xem phiên bản cũ).

- [ ] **Step 1: Đọc mã và viết tệp theo quy trình chung.**
- [ ] **Step 2: Chạy `npx vitest run src/lib/ai/__tests__/triThucGac.test.ts`, cập nhật `CHUA_VIET`, chạy lại tới xanh.**
- [ ] **Step 3: Chạy `npx vitest run src/lib/ai`** — Expected: PASS.
- [ ] **Step 4: Commit** (chỉ khi được phép): `git add src/lib/ai/triThuc/noi-dung/kho-luu-tru.md src/lib/ai/__tests__/triThucGac.test.ts` rồi `git commit -m "feat: tri thuc AI - chu de kho luu tru"`.

---

### Task 11: Kiểm chứng toàn bộ và nhật ký tiến độ

**Files:**
- Modify: `docs/progress/2026-10.md` (thêm mục lên đầu, ngay dưới dòng `---` đầu tiên)

- [ ] **Step 1: Toàn bộ test**

Run: `npm test`
Expected: tất cả PASS. Ghi lại số test pass.

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: thành công, không lỗi `tsc`.

- [ ] **Step 3: Kiểm tệp tri thức thành chunk riêng, không phình bundle đầu**

Run: `ls -la dist/assets | grep -i -E "lai-lich|nhom-no|tsbd|kho-luu"` (Git Bash).
Expected: mỗi chủ đề một tệp `.js` nhỏ riêng. Ghi kích thước chunk `index-*.js` trước/sau nếu so được với bản trước (`git stash` không cần; so với số trong output build gần nhất nếu có).

- [ ] **Step 4: Lint**

Run: `npx oxlint src/lib/ai src/hooks/useAiAssistant.ts`
Expected: không lỗi mới do mã đợt này.

- [ ] **Step 5: Kiểm bằng Gemini thật (cần khóa API của người dùng)**

Chạy `npm run dev`, mở trang có AI, đặt khóa vào `localStorage` khóa `cm_gemini_api_key` (người dùng tự cung cấp, không ghi vào mã hay nhật ký). Hỏi lần lượt 4 câu: "Lịch trả nợ tính lãi thế nào?", "Nhóm nợ xác định ra sao?", "LTV của tài sản bảo đảm tính thế nào?", "Kho lưu trữ xử lý tệp trùng tên thế nào?". Với mỗi câu, mở tab Network và xác nhận: (a) có **hai** yêu cầu `streamGenerateContent` (lượt hỏi, lượt gửi kết quả công cụ), (b) lượt hai **không** lỗi 400 (kiểm chứng `thoughtSignature`), (c) câu trả lời khớp nội dung tệp tri thức. Hỏi thêm một câu không liên quan hệ thống ("Thủ đô nước Pháp?") để xác nhận AI trả lời ngay, không gọi công cụ.
Nếu chưa có khóa: **ghi rõ "chưa kiểm bằng Gemini thật"** ở mục nhật ký, không báo xong cho phần này.
Nếu lượt hai lỗi 400: dừng, báo người dùng; không tự đổi cách gửi `parts` khi chưa đọc nội dung lỗi trả về.

- [ ] **Step 6: Ghi nhật ký tiến độ**

Thêm mục theo khuôn của `docs/progress/README.md`, đặt đầu tệp `docs/progress/2026-10.md`:

```markdown
## 2026-10-12 — Kho tri thức cho AI, đợt 1: hạ tầng và 4 chủ đề
**Chạm:** src/lib/ai/{toolLoop.ts,geminiClient.ts} · src/lib/ai/triThuc/{phanTichTriThuc.ts,khoTriThuc.ts,noi-dung/*.md} · src/lib/ai/tools/traCuuHeThong.ts · src/hooks/useAiAssistant.ts · test: phanTichTriThuc, toolLoop, traCuuHeThong, khoTriThuc, geminiTools, triThucGac, useAiAssistantDocs
**Vì sao:** AI chỉ biết dữ liệu, không biết cách dùng trang và quy trình; người dùng chọn function calling, làm hạ tầng cho mọi trang và viết nội dung theo đợt.
**Đã làm:** <điền theo thực tế: công cụ traCuuHeThong, vòng lặp tối đa 2 lượt, nạp lười, 4 chủ đề, test gác theo ROUTE_OF, không lưu dùng chung khi có tra công cụ>.
**Lưu ý:** <điền: số trang còn trong CHUA_VIET, kích thước chunk, mọi thứ trong bundle là công khai>.
**Kiểm chứng:** <điền số test pass, build, kết quả kiểm Gemini thật hoặc "chưa kiểm bằng Gemini thật">.
**Còn mở:** các đợt sau (hồ sơ tín dụng, chào lãi suất/COF, doanh nghiệp, chứng từ, tra cứu/biểu mẫu, hệ thống); nội dung đúng tại ngày viết, cần cập nhật khi trang đổi hành vi.
```

Điền đủ các chỗ `<...>` bằng số liệu thật trước khi lưu; không để lại ngoặc nhọn.

- [ ] **Step 7: Dọn dẹp**

Xóa mọi đồ tạm (nếu có trong `.tmp/`), kiểm `git status` chỉ còn các tệp thuộc đợt này.

- [ ] **Step 8: Commit** (chỉ khi được phép)

```bash
git add docs/progress/2026-10.md docs/superpowers/specs docs/superpowers/plans
git commit -m "docs: tri thuc AI dot 1 - nhat ky tien do, spec va ke hoach"
```

---

## Tự rà soát (đã chạy)

- **Phủ spec:** kho + trình đọc/tra (T1, T3); công cụ (T3); vòng lặp, giữ `parts`, model cố định, công cụ lỗi (T2, T4); bản đồ ≤ 3 KB và chỉ dẫn prompt (T1, T3, T6); không lưu dùng chung (T5); test gác gồm độ phủ `ROUTE_OF`, kích thước, BOM, `nguon`, bí mật, danh sách chỉ giảm (T6); 4 chủ đề (T7–T10); kiểm Gemini thật và nhật ký (T11); đường dự phòng số liệu giữ nguyên (T4 Step 3f, Step 4).
- **Chữ ký nhất quán:** `OpenTurn(contents, coCongCu)`, `TurnChunk`, `ToolTable`, `taoCongCuTriThuc(taiKho)`, `dungChiDanTriThuc(kho)`, `StreamExtras.onToolUse/tools` dùng cùng tên ở mọi task.
- **Chưa kiểm được trong kế hoạch:** nội dung 4 tệp tri thức (phải viết từ mã khi thực thi), và hành vi `thoughtSignature` với Gemini thật (Task 11 Step 5).
