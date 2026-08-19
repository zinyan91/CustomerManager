# Rebuild giao diện — Đợt 0: nền tảng

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng lớp nền cho rebuild — token màu có test tương phản, thang chữ ngữ nghĩa, ba bán kính, danh sách màn khai một chỗ, dọn rác — mà **không đổi diện mạo của bất kỳ màn nào**.

**Architecture:** Đợt này chỉ *thêm* hạ tầng và *rút* phần khai trùng lặp. Token mới sinh ra nhưng chưa có màn nào tiêu thụ; cơ chế cũ (ghi đè lớp Tailwind trong `index.css`) giữ nguyên làm cầu tạm cho tới đợt 7. Nhờ vậy đợt 0 gần như không có rủi ro thị giác, và mọi thay đổi đều kiểm được bằng test đơn vị.

**Tech Stack:** TypeScript, React 19, Tailwind CSS v4, Vitest (không có tệp cấu hình riêng — dùng chỉ thị `// @vitest-environment jsdom` ở đầu tệp test cần DOM), Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md`

## Global Constraints

- **Không đổi diện mạo màn nào trong đợt này.** Token mới thêm vào nhưng chưa component nào dùng.
- **Không đụng `src/lib/` phần nghiệp vụ tài chính.** Đợt này chỉ thêm tệp mới vào `src/lib/` và sửa `fontSettings.ts`, `uiClasses.ts`.
- **1.621 test hiện có phải xanh sau mỗi task.** Test trong `lib/` chuyển đỏ là dấu hiệu đã lấn sang tầng nghiệp vụ — dừng lại, đừng sửa test cho xanh.
- **Không viết chú thích giải thích trong mã.** Lý do "vì sao" thuộc `CONVENTIONS.md`.
- Chuỗi hiển thị cho người dùng viết tiếng Việt.
- Lệnh: `npm test` (chạy hết), `npx vitest run <đường-dẫn>` (chạy một tệp), `npm run build` (kiểm kiểu + đóng gói), `npm run lint`.

---

## File Structure

**Tạo mới**

| Tệp | Trách nhiệm |
| :--- | :--- |
| `src/lib/themeTokens.ts` | Bảng màu hai giao diện dưới dạng dữ liệu TypeScript, và danh sách cặp màu phải đạt tương phản |
| `src/lib/contrast.ts` | Hàm thuần tính độ sáng tương đối và tỷ lệ tương phản WCAG |
| `src/lib/navigation.ts` | Khai báo duy nhất danh sách màn: id, nhãn, biểu tượng, nhóm |
| `src/lib/appVersion.ts` | Một nguồn duy nhất cho số hiệu phiên bản |
| `src/lib/__tests__/contrast.test.ts` | Khoá ngưỡng tương phản mọi cặp màu ngữ nghĩa |
| `src/lib/__tests__/themeTokens.test.ts` | Chặn `index.css` trôi khỏi `themeTokens.ts` |
| `src/lib/__tests__/navigation.test.ts` | Khoá tính toàn vẹn của danh sách màn |

**Sửa**

| Tệp | Sửa gì |
| :--- | :--- |
| `src/index.css` | Thêm biến bán kính; giữ nguyên phần còn lại |
| `src/lib/fontSettings.ts` | Thêm sáu biến thang chữ ngữ nghĩa vào `cssVariablesFor` |
| `src/lib/__tests__/fontSettings.test.ts` | Thêm test cho sáu biến mới |
| `src/lib/uiClasses.ts` | Ba bán kính đọc từ biến CSS |
| `src/components/Sidebar.tsx` | Đọc danh sách màn từ `navigation.ts` |
| `src/components/CommandPalette.tsx` | Đọc danh sách màn từ `navigation.ts` |
| `src/components/LoginView.tsx` | Đọc phiên bản từ `appVersion.ts` |
| `package.json` | Gỡ `clsx`, `tailwind-merge`; đặt `version` |
| `CONVENTIONS.md` | Viết lại §15, sửa §17 |

**Xoá**

| Tệp | Lý do |
| :--- | :--- |
| `src/App.css` | 185 dòng rác template Vite, không được import ở đâu |

---

## Task 0: Chụp ảnh mốc trước khi động vào gì

Tiêu chí đỗ/trượt của cả đợt 0 là **không màn nào đổi diện mạo**. Không có ảnh mốc thì không chứng minh được điều đó, và cuối đợt chỉ còn cách tin vào trí nhớ.

**Files:**
- Create: `docs/superpowers/anh-moc/dot-0/` (thư mục ảnh, không commit)

**Interfaces:**
- Consumes: không có
- Produces: bộ ảnh mốc mà bước "Kết thúc đợt 0" đối chiếu

- [ ] **Step 1: Xác nhận cây làm việc sạch và đang ở đúng nhánh**

```bash
git status --short && git branch --show-current
```

Kỳ vọng: không có thay đổi chưa commit, nhánh là `rebuild-giao-dien`.

- [ ] **Step 2: Thêm thư mục ảnh vào `.gitignore`**

Thêm hai dòng vào cuối `.gitignore`:

```
# Ảnh mốc đối chiếu khi rebuild giao diện
docs/superpowers/anh-moc/
```

- [ ] **Step 3: Chạy ứng dụng và chụp bốn màn ở cả hai giao diện**

Chạy: `npm run dev`

Chụp ở bề rộng cửa sổ **1440px**, mỗi màn hai ảnh (giao diện tối và sáng, đổi bằng nút trên Header):

| Màn | Tên tệp |
| :--- | :--- |
| Tổng quan | `tong-quan-toi.png`, `tong-quan-sang.png` |
| Danh sách khách hàng | `khach-hang-toi.png`, `khach-hang-sang.png` |
| Quản lý khoản vay (đã chọn một khách có KUNN) | `khoan-vay-toi.png`, `khoan-vay-sang.png` |
| Cài đặt | `cai-dat-toi.png`, `cai-dat-sang.png` |

Lưu vào `docs/superpowers/anh-moc/dot-0/`.

- [ ] **Step 4: Chụp thêm màn đăng nhập**

Đăng xuất, chụp `dang-nhap-toi.png` và `dang-nhap-sang.png`. Task 4 đụng vào bo góc của đúng màn này nên cần mốc riêng.

- [ ] **Step 5: Chụp một màn ở bề rộng 375px**

Thu cửa sổ về 375px, mở Quản lý khoản vay, chụp `khoan-vay-375-toi.png`. Đây là mốc cho quy tắc bảng đổi hình dạng ở §15.

- [ ] **Step 6: Ghi lại số đo hiện trạng**

```bash
grep -rl "containerCardBg\|inputStyle\|labelStyle\|tableHeaderStyle\|sectionBoxBg\|readonlyInputStyle\|styles=" --include=*.tsx src | wc -l
grep -roh "rounded-[a-z0-9]*" --include=*.tsx src | sort | uniq -c | sort -rn
npm test 2>&1 | grep -oE "Tests +[0-9]+ passed" | tail -1
```

Ghi ba kết quả vào `docs/superpowers/anh-moc/dot-0/so-do-truoc.txt`. Kỳ vọng lúc này: 69 tệp, 7 biến thể bo góc, 1.621 test.

- [ ] **Step 7: Commit phần `.gitignore`**

```bash
git add .gitignore
git commit -m "chore: bo qua thu muc anh moc doi chieu giao dien"
```

---

## Task 1: Đo tương phản màu và khoá bằng test

Đây là task quan trọng nhất của đợt. Spec §4.3 cho phép tô màu số tiền và ngày tháng — những cặp màu chưa từng được đo. Đo thủ công đã cho thấy tất cả đều đạt AA, nhưng chỗ sát nhất chỉ **4,50** (`accent` trên `panel-muted`, giao diện sáng), tức đúng ngưỡng và không dư. Test này giữ cho ai đó chỉnh `--t-*` sau này không âm thầm làm rơi xuống dưới.

**Files:**
- Create: `src/lib/contrast.ts`
- Create: `src/lib/themeTokens.ts`
- Test: `src/lib/__tests__/contrast.test.ts`

**Interfaces:**
- Consumes: không có
- Produces:
  - `relativeLuminance(hex: string): number`
  - `contrastRatio(hexA: string, hexB: string): number`
  - `type ThemeName = 'dark' | 'light'`
  - `type TokenName = string`
  - `THEME_TOKENS: Record<ThemeName, Record<TokenName, string>>`
  - `CONTRAST_PAIRS: { fg: TokenName; bg: TokenName; min: number }[]`
  - Task 2 dùng `THEME_TOKENS`; Task 6 trích số đo từ test này để viết vào `CONVENTIONS.md`.

- [ ] **Step 1: Viết test thất bại cho hàm tương phản**

Tạo `src/lib/__tests__/contrast.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { relativeLuminance, contrastRatio } from '../contrast';

describe('relativeLuminance', () => {
  it('đen là 0, trắng là 1', () => {
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 5);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 5);
  });

  it('không phân biệt hoa thường và chấp nhận thiếu dấu thăng', () => {
    expect(relativeLuminance('#38bdf8')).toBeCloseTo(relativeLuminance('38BDF8'), 10);
  });
});

describe('contrastRatio', () => {
  it('đen trên trắng là 21', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 2);
  });

  it('cùng một màu thì bằng 1', () => {
    expect(contrastRatio('#38BDF8', '#38BDF8')).toBeCloseTo(1, 5);
  });

  it('đảo thứ tự hai màu cho cùng kết quả', () => {
    expect(contrastRatio('#0F172A', '#34D399')).toBeCloseTo(contrastRatio('#34D399', '#0F172A'), 10);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/lib/__tests__/contrast.test.ts`
Kỳ vọng: FAIL — không nhập được `../contrast`.

- [ ] **Step 3: Viết `src/lib/contrast.ts`**

```ts
function channels(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = channels(hex).map(c =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  const [hi, lo] = a >= b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Chạy: `npx vitest run src/lib/__tests__/contrast.test.ts`
Kỳ vọng: PASS, 5 test.

- [ ] **Step 5: Viết test thất bại cho ngưỡng tương phản của bảng màu**

Thêm vào cuối `src/lib/__tests__/contrast.test.ts`:

```ts
import { THEME_TOKENS, CONTRAST_PAIRS, type ThemeName } from '../themeTokens';

const THEMES: ThemeName[] = ['dark', 'light'];

describe('bảng màu đạt ngưỡng tương phản WCAG AA', () => {
  for (const theme of THEMES) {
    for (const pair of CONTRAST_PAIRS) {
      it(`${theme}: ${pair.fg} trên ${pair.bg} ≥ ${pair.min}`, () => {
        const t = THEME_TOKENS[theme];
        expect(t[pair.fg], `thiếu token ${pair.fg}`).toBeTruthy();
        expect(t[pair.bg], `thiếu token ${pair.bg}`).toBeTruthy();
        expect(contrastRatio(t[pair.fg], t[pair.bg])).toBeGreaterThanOrEqual(pair.min);
      });
    }
  }

  it('viên trạng thái nền đặc dùng chữ text-surface, không dùng trắng', () => {
    for (const theme of THEMES) {
      const t = THEME_TOKENS[theme];
      for (const bg of ['neg', 'warn', 'pos'] as const) {
        expect(
          contrastRatio(t.surface, t[bg]),
          `${theme}: ${bg} với chữ surface`
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
```

- [ ] **Step 6: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/lib/__tests__/contrast.test.ts`
Kỳ vọng: FAIL — không nhập được `../themeTokens`.

- [ ] **Step 7: Viết `src/lib/themeTokens.ts`**

Giá trị chép **đúng nguyên văn** từ `src/index.css` khối `:root, :root.dark` và `:root.light`.

```ts
export type ThemeName = 'dark' | 'light';
export type TokenName = string;

export const THEME_TOKENS: Record<ThemeName, Record<TokenName, string>> = {
  dark: {
    surface: '#070B14',
    panel: '#0F172A',
    'panel-muted': '#1E293B',
    line: '#334155',
    'line-strong': '#475569',
    ink: '#F8FAFC',
    'ink-muted': '#94A3B8',
    'ink-faint': '#8290A5',
    accent: '#38BDF8',
    'accent-ink': '#0F172A',
    'accent-soft': '#0C486A',
    pos: '#34D399',
    'pos-soft': '#064E3B',
    neg: '#F87171',
    'neg-soft': '#641717',
    warn: '#FBBF24',
    'warn-soft': '#78350F',
    g1: '#34D399',
    g2: '#FBBF24',
    g3: '#FB923C',
    g4: '#F87171',
    g5: '#F15E5E',
    'kpi-cust': '#A78BFA',
    'kpi-collateral': '#2DD4BF',
    'kpi-card': '#F472B6',
  },
  light: {
    surface: '#F1F5F9',
    panel: '#FFFFFF',
    'panel-muted': '#E2E8F0',
    line: '#CBD5E1',
    'line-strong': '#94A3B8',
    ink: '#0F172A',
    'ink-muted': '#334155',
    'ink-faint': '#5A697E',
    accent: '#026EA6',
    'accent-ink': '#FFFFFF',
    'accent-soft': '#E0F2FE',
    pos: '#047653',
    'pos-soft': '#D1FAE5',
    neg: '#CA2121',
    'neg-soft': '#FEE2E2',
    warn: '#9D5604',
    'warn-soft': '#FEF3C7',
    g1: '#047653',
    g2: '#9D5604',
    g3: '#B24309',
    g4: '#CA2121',
    g5: '#991B1B',
    'kpi-cust': '#6D28D9',
    'kpi-collateral': '#0F766E',
    'kpi-card': '#BE185D',
  },
};

export const CONTRAST_PAIRS: { fg: TokenName; bg: TokenName; min: number }[] = [
  { fg: 'ink', bg: 'surface', min: 4.5 },
  { fg: 'ink', bg: 'panel', min: 4.5 },
  { fg: 'ink', bg: 'panel-muted', min: 4.5 },
  { fg: 'ink-muted', bg: 'panel', min: 4.5 },
  { fg: 'ink-muted', bg: 'panel-muted', min: 4.5 },
  { fg: 'ink-faint', bg: 'panel', min: 4.5 },
  { fg: 'ink-faint', bg: 'panel-muted', min: 4.5 },
  { fg: 'accent', bg: 'panel', min: 4.5 },
  { fg: 'accent', bg: 'panel-muted', min: 4.5 },
  { fg: 'pos', bg: 'panel', min: 4.5 },
  { fg: 'pos', bg: 'panel-muted', min: 4.5 },
  { fg: 'neg', bg: 'panel', min: 4.5 },
  { fg: 'neg', bg: 'panel-muted', min: 4.5 },
  { fg: 'warn', bg: 'panel', min: 4.5 },
  { fg: 'warn', bg: 'panel-muted', min: 4.5 },
];
```

- [ ] **Step 8: Chạy test, xác nhận xanh**

Chạy: `npx vitest run src/lib/__tests__/contrast.test.ts`
Kỳ vọng: PASS, 36 test (5 hàm + 30 cặp + 1 viên nền đặc).

Nếu có cặp nào đỏ thì **đừng hạ ngưỡng `min`** — chỉnh giá trị token trong `themeTokens.ts` **và** `index.css` cho khớp rồi chạy lại.

- [ ] **Step 9: Commit**

```bash
git add src/lib/contrast.ts src/lib/themeTokens.ts src/lib/__tests__/contrast.test.ts
git commit -m "test(mau): khoa nguong tuong phan WCAG AA cho moi cap mau ngu nghia"
```

---

## Task 2: Chặn `index.css` trôi khỏi `themeTokens.ts`

Task 1 tạo ra hai nguồn cho cùng một bảng màu: `index.css` (thứ trình duyệt thật sự đọc) và `themeTokens.ts` (thứ test đọc). Nếu chúng trôi khỏi nhau thì test tương phản trở nên vô nghĩa — nó sẽ đo một bảng màu không ai dùng. Task này khoá hai bên lại với nhau.

**Files:**
- Test: `src/lib/__tests__/themeTokens.test.ts`

**Interfaces:**
- Consumes: `THEME_TOKENS` từ Task 1
- Produces: không có API mới

- [ ] **Step 1: Viết test thất bại**

Tạo `src/lib/__tests__/themeTokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { THEME_TOKENS, type ThemeName } from '../themeTokens';

const cssPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../index.css');
const css = readFileSync(cssPath, 'utf8').replace(/\r\n/g, '\n');

function tokensInBlockStartingAt(marker: string): Record<string, string> {
  const start = css.indexOf(marker);
  if (start === -1) throw new Error(`Không tìm thấy khối "${marker}" trong index.css`);
  const open = css.indexOf('{', start);
  const close = css.indexOf('}', open);
  const body = css.slice(open + 1, close);

  const out: Record<string, string> = {};
  for (const line of body.split('\n')) {
    const m = line.match(/^\s*--t-([a-z0-9-]+)\s*:\s*([^;]+);/i);
    if (m) out[m[1]] = m[2].trim().toUpperCase();
  }
  return out;
}

const CSS_BLOCK: Record<ThemeName, string> = {
  dark: ':root,\n:root.dark',
  light: ':root.light',
};

describe('index.css và themeTokens.ts phải khớp nhau', () => {
  for (const theme of ['dark', 'light'] as ThemeName[]) {
    it(`${theme}: mọi token khai trong TypeScript đều có trong CSS, cùng giá trị`, () => {
      const fromCss = tokensInBlockStartingAt(CSS_BLOCK[theme]);
      for (const [name, value] of Object.entries(THEME_TOKENS[theme])) {
        expect(fromCss[name], `index.css thiếu --t-${name} ở giao diện ${theme}`).toBeTruthy();
        expect(fromCss[name]).toBe(value.toUpperCase());
      }
    });

    it(`${theme}: CSS không có token thừa nào chưa khai trong TypeScript`, () => {
      const fromCss = tokensInBlockStartingAt(CSS_BLOCK[theme]);
      const known = new Set(Object.keys(THEME_TOKENS[theme]));
      const thua = Object.keys(fromCss).filter(k => !known.has(k));
      expect(thua, `token có trong CSS mà thiếu trong themeTokens.ts: ${thua.join(', ')}`).toEqual([]);
    });
  }
});
```

- [ ] **Step 2: Chạy test**

Chạy: `npx vitest run src/lib/__tests__/themeTokens.test.ts`
Kỳ vọng: PASS, 4 test — vì Task 1 đã chép giá trị đúng nguyên văn.

Nếu đỏ: so lại giá trị trong `themeTokens.ts` với `index.css`, sửa `themeTokens.ts` cho khớp CSS (CSS là thứ trình duyệt đọc, nó đúng).

- [ ] **Step 3: Chứng minh test thật sự bắt được lỗi**

Sửa tạm `src/lib/themeTokens.ts`, đổi `pos: '#34D399'` ở giao diện `dark` thành `pos: '#00FF00'`.

Chạy: `npx vitest run src/lib/__tests__/themeTokens.test.ts`
Kỳ vọng: FAIL — `dark: mọi token khai trong TypeScript đều có trong CSS`.

Hoàn tác lại `#34D399` rồi chạy lại, kỳ vọng PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/__tests__/themeTokens.test.ts
git commit -m "test(mau): chan index.css troi khoi themeTokens.ts"
```

---

## Task 3: Thang chữ ngữ nghĩa

Spec §4.1. Thêm sáu biến ngữ nghĩa, dẫn xuất từ đúng bốn nhóm điều chỉnh mà Cài đặt đang có, nên tính năng chỉnh cỡ chữ vẫn chạy y nguyên. **Chưa component nào tiêu thụ biến mới** — vì thế đợt 0 không đổi diện mạo.

Phép dẫn xuất chọn sao cho giá trị mặc định rơi đúng vào con số spec yêu cầu:

| Biến mới | Công thức | Mặc định | Spec yêu cầu |
| :--- | :--- | ---: | ---: |
| `--fs-screen` | `heading + 4` | 18px | 18px |
| `--fs-title` | `heading + 1` | 15px | 15px |
| `--fs-body` | `table + 1` | 13px | 13px |
| `--fs-dense` | `table` | 12px | 12px |
| `--fs-label` | `small` | 11px | 11px |
| `--fs-num` | `mono * 2` | 24px | 24px |

Nhờ `--fs-body = table + 1`, cỡ chữ bảng tự lên 13px khi màn hình chuyển sang dùng biến mới ở đợt 3 trở đi — không cần đổi giá trị mặc định của Cài đặt, và không có màn nào nhúc nhích trong đợt 0.

**Files:**
- Modify: `src/lib/fontSettings.ts:91-100` (hàm `cssVariablesFor`)
- Test: `src/lib/__tests__/fontSettings.test.ts` (thêm vào cuối)

**Interfaces:**
- Consumes: `FontSettings`, `normalizeFontSettings` đã có sẵn
- Produces: `cssVariablesFor` nay trả thêm sáu khoá `--fs-screen`, `--fs-title`, `--fs-body`, `--fs-dense`, `--fs-label`, `--fs-num`. Đợt 3–7 sẽ dùng các biến này.

- [ ] **Step 1: Viết test thất bại**

Thêm vào cuối `src/lib/__tests__/fontSettings.test.ts`:

```ts
describe('cssVariablesFor — thang chữ ngữ nghĩa', () => {
  it('mặc định rơi đúng thang spec đã chốt', () => {
    const v = cssVariablesFor(DEFAULT_FONT_SETTINGS);
    expect(v['--fs-screen']).toBe('18px');
    expect(v['--fs-title']).toBe('15px');
    expect(v['--fs-body']).toBe('13px');
    expect(v['--fs-dense']).toBe('12px');
    expect(v['--fs-label']).toBe('11px');
    expect(v['--fs-num']).toBe('24px');
  });

  it('chữ thân bảng luôn lớn hơn chữ bảng dày đúng 1px', () => {
    const v = cssVariablesFor({ family: 'system', heading: 14, table: 16, small: 11, mono: 12 });
    expect(v['--fs-dense']).toBe('16px');
    expect(v['--fs-body']).toBe('17px');
  });

  it('kéo thanh trượt Tiêu đề thì cả hai cỡ tiêu đề cùng đổi', () => {
    const v = cssVariablesFor({ family: 'system', heading: 18, table: 12, small: 11, mono: 12 });
    expect(v['--fs-screen']).toBe('22px');
    expect(v['--fs-title']).toBe('19px');
  });

  it('biến cũ giữ nguyên để màn chưa chuyển vẫn chạy', () => {
    const v = cssVariablesFor(DEFAULT_FONT_SETTINGS);
    expect(v['--fs-heading']).toBe('14px');
    expect(v['--fs-table']).toBe('12px');
    expect(v['--fs-small']).toBe('11px');
    expect(v['--fs-mono']).toBe('12px');
  });

  it('giá trị vượt khoảng bị kẹp trước khi sinh biến ngữ nghĩa', () => {
    const v = cssVariablesFor({ family: 'system', heading: 999, table: 12, small: 11, mono: 12 } as never);
    expect(v['--fs-screen']).toBe(`${FONT_SIZE_LIMITS.heading.max + 4}px`);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/lib/__tests__/fontSettings.test.ts`
Kỳ vọng: FAIL — `--fs-screen` là `undefined`.

- [ ] **Step 3: Sửa `cssVariablesFor`**

Thay toàn bộ thân hàm `cssVariablesFor` trong `src/lib/fontSettings.ts`:

```ts
export function cssVariablesFor(s: FontSettings): Record<string, string> {
  const n = normalizeFontSettings(s);
  return {
    '--app-font': fontStackOf(n.family),

    '--fs-heading': `${n.heading}px`,
    '--fs-table': `${n.table}px`,
    '--fs-small': `${n.small}px`,
    '--fs-mono': `${n.mono}px`,

    '--fs-screen': `${n.heading + 4}px`,
    '--fs-title': `${n.heading + 1}px`,
    '--fs-body': `${n.table + 1}px`,
    '--fs-dense': `${n.table}px`,
    '--fs-label': `${n.small}px`,
    '--fs-num': `${n.mono * 2}px`,
  };
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Chạy: `npx vitest run src/lib/__tests__/fontSettings.test.ts`
Kỳ vọng: PASS, 17 test — 12 test cũ cộng 5 test mới.

- [ ] **Step 5: Xác nhận không màn nào đổi**

Chạy: `npm test`
Kỳ vọng: PASS toàn bộ, kể cả ba test khói giao diện. Không test nào cần sửa — vì chưa component nào đọc biến mới.

- [ ] **Step 6: Commit**

```bash
git add src/lib/fontSettings.ts src/lib/__tests__/fontSettings.test.ts
git commit -m "feat(chu): them thang chu ngu nghia, chua man nao tieu thu"
```

---

## Task 4: Ba bán kính

Spec §4.2. Hiện có 7 biến thể bo góc rải trong `.tsx` (`rounded-md` 384 lần, `rounded-lg` 337, `rounded-xl` 75, `rounded-full` 27, `rounded-2xl` 3, `rounded-sm` 2, `rounded-r` 1). Đợt 0 chỉ dựng token và sửa `uiClasses.ts`; việc quy 829 chỗ dùng thô về ba token diễn ra theo từng màn ở đợt 3–7.

`CONVENTIONS.md` §15 hiện ghi `RADIUS_PANEL` là `rounded-lg` và `RADIUS_CONTROL` là `rounded-md`, còn mã lại để `rounded-xl` / `rounded-lg`. Task này chốt theo spec: panel 12px, control 8px, thêm pill.

**Files:**
- Modify: `src/index.css` (thêm vào khối `:root` đang khai `--header-h`)
- Modify: `src/lib/uiClasses.ts:21-22`

**Interfaces:**
- Consumes: không có
- Produces: `RADIUS_PANEL`, `RADIUS_CONTROL`, `RADIUS_PILL` — chuỗi lớp Tailwind tuỳ ý dùng biến CSS. Đợt 2 dựng component sẽ dùng ba hằng này.

- [ ] **Step 1: Thêm biến bán kính vào `src/index.css`**

Tìm khối này (khoảng dòng 92):

```css
:root {
  --header-h: 52px;
}
```

Sửa thành:

```css
:root {
  --header-h: 52px;
  --r-panel: 12px;
  --r-control: 8px;
  --r-pill: 999px;
}
```

- [ ] **Step 2: Sửa `src/lib/uiClasses.ts`**

Thay hai dòng:

```ts
export const RADIUS_PANEL = 'rounded-xl';
export const RADIUS_CONTROL = 'rounded-lg';
```

bằng ba dòng:

```ts
export const RADIUS_PANEL = 'rounded-[var(--r-panel)]';
export const RADIUS_CONTROL = 'rounded-[var(--r-control)]';
export const RADIUS_PILL = 'rounded-[var(--r-pill)]';
```

- [ ] **Step 3: Kiểm bằng mắt trên trình duyệt**

Chạy: `npm run dev`

`RADIUS_PANEL` đang dùng ở `LoginView.tsx` (qua hằng `PANEL`) và `RADIUS_CONTROL` ở `LoginView.tsx`. Mở màn đăng nhập, so với ảnh chụp trước khi sửa: bo góc thẻ đăng nhập đi từ `rounded-xl` (12px) sang `--r-panel` (12px) nên **không đổi**; ô nhập đi từ `rounded-lg` (8px) sang `--r-control` (8px) nên cũng **không đổi**.

Nếu thấy khác thì dừng lại — nghĩa là giá trị Tailwind mặc định không như giả định, đo lại bằng công cụ kiểm tra phần tử rồi chỉnh `--r-panel` / `--r-control` cho khớp.

- [ ] **Step 4: Chạy toàn bộ test và kiểm kiểu**

Chạy: `npm test && npm run build`
Kỳ vọng: cả hai xanh.

- [ ] **Step 5: Commit**

```bash
git add src/index.css src/lib/uiClasses.ts
git commit -m "feat(bo-goc): ba ban kinh khai bang bien CSS thay bay bien the"
```

---

## Task 5: Danh sách màn khai một chỗ

Spec §6.4. Danh sách 19 màn hiện khai ba nơi: `Sidebar.tsx:14-62`, `CommandPalette.tsx:42-62`, và chuỗi `activeTab ===` ở `App.tsx:95-113`. Task này rút hai nơi đầu về một tệp. `App.tsx` để nguyên — bộ định tuyến sẽ thay nó ở đợt 1.

**Files:**
- Create: `src/lib/navigation.ts`
- Create: `src/lib/__tests__/navigation.test.ts`
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/CommandPalette.tsx`

**Interfaces:**
- Consumes: `TranslationKey` từ `src/lib/i18n.ts`
- Produces:
  - `type ScreenId` — hợp của 19 chuỗi id
  - `interface NavItem { id: ScreenId; labelKey: TranslationKey; groupKey: TranslationKey; icon: ElementType; keywords: string[] }`
  - `NAV_GROUPS: { groupKey: TranslationKey; items: NavItem[] }[]`
  - `NAV_ITEMS: NavItem[]` — phẳng, theo đúng thứ tự hiển thị
  - Đợt 1 dùng `ScreenId` và `NAV_GROUPS` để dựng bộ định tuyến; đợt 5 sửa tệp này khi gộp ba màn tồn kho.

- [ ] **Step 1: Viết test thất bại**

Tạo `src/lib/__tests__/navigation.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { NAV_GROUPS, NAV_ITEMS } from '../navigation';

describe('navigation', () => {
  it('có đúng 19 màn', () => {
    expect(NAV_ITEMS).toHaveLength(19);
  });

  it('không id nào trùng', () => {
    const ids = NAV_ITEMS.map(i => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('NAV_ITEMS là bản trải phẳng của NAV_GROUPS, đúng thứ tự', () => {
    const phang = NAV_GROUPS.flatMap(g => g.items);
    expect(phang.map(i => i.id)).toEqual(NAV_ITEMS.map(i => i.id));
  });

  it('mọi mục đều có nhãn, nhóm và biểu tượng', () => {
    for (const item of NAV_ITEMS) {
      expect(item.labelKey, `${item.id} thiếu labelKey`).toBeTruthy();
      expect(item.groupKey, `${item.id} thiếu groupKey`).toBeTruthy();
      expect(item.icon, `${item.id} thiếu icon`).toBeTruthy();
    }
  });

  it('groupKey của mỗi mục khớp nhóm chứa nó', () => {
    for (const g of NAV_GROUPS) {
      for (const item of g.items) {
        expect(item.groupKey).toBe(g.groupKey);
      }
    }
  });

  it('mọi mục đều có từ khoá tìm kiếm không dấu', () => {
    for (const item of NAV_ITEMS) {
      expect(item.keywords.length, `${item.id} không có từ khoá`).toBeGreaterThan(0);
      for (const kw of item.keywords) {
        expect(kw, `${item.id}: từ khoá "${kw}" phải viết thường không dấu`).toMatch(/^[a-z0-9 ]+$/);
      }
    }
  });

  it('giữ đúng bộ id mà App.tsx đang xử lý', () => {
    expect(NAV_ITEMS.map(i => i.id).sort()).toEqual([
      'business-plan', 'calculators', 'card-policies', 'cof', 'collaterals',
      'credit-cards', 'credit-contracts', 'customers', 'dashboard', 'inventory',
      'loans', 'mdsdv', 'post-loan', 'purchase-statement', 'quiz-bank',
      'rate-quote', 'retail-invoice', 'settings', 'templates',
    ]);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/lib/__tests__/navigation.test.ts`
Kỳ vọng: FAIL — không nhập được `../navigation`.

- [ ] **Step 3: Viết `src/lib/navigation.ts`**

Nhóm và thứ tự chép từ `Sidebar.tsx:14-62`; từ khoá chép từ `CommandPalette.tsx:42-62`.

```ts
import type { ElementType } from 'react';
import {
  BookOpen, LayoutDashboard, Users, FileText, Building2, CreditCard,
  ShieldAlert, Settings, Calculator, FileSignature, Target, Percent,
  Landmark, Handshake, ClipboardList, GraduationCap, Boxes, Receipt,
} from 'lucide-react';
import type { TranslationKey } from './i18n';

export type ScreenId =
  | 'dashboard'
  | 'customers' | 'credit-contracts' | 'loans' | 'collaterals' | 'credit-cards'
  | 'calculators' | 'business-plan' | 'inventory' | 'purchase-statement'
  | 'retail-invoice' | 'rate-quote' | 'cof'
  | 'mdsdv' | 'card-policies' | 'templates' | 'quiz-bank'
  | 'post-loan' | 'settings';

export interface NavItem {
  id: ScreenId;
  labelKey: TranslationKey;
  groupKey: TranslationKey;
  icon: ElementType;
  keywords: string[];
}

export interface NavGroup {
  groupKey: TranslationKey;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: 'nav.groupOverview',
    items: [
      { id: 'dashboard', labelKey: 'nav.dashboard', groupKey: 'nav.groupOverview', icon: LayoutDashboard, keywords: ['overview', 'tong quan', 'dashboard', 'danh muc'] },
    ],
  },
  {
    groupKey: 'nav.groupRecords',
    items: [
      { id: 'customers', labelKey: 'nav.customers', groupKey: 'nav.groupRecords', icon: Users, keywords: ['khach hang', 'danh sach', 'customer', 'cif'] },
      { id: 'credit-contracts', labelKey: 'nav.creditContracts', groupKey: 'nav.groupRecords', icon: Handshake, keywords: ['hop dong tin dung', 'hdtd', 'tin dung', 'contract'] },
      { id: 'loans', labelKey: 'nav.loans', groupKey: 'nav.groupRecords', icon: FileText, keywords: ['khoan vay', 'du no', 'loan', 'portfolio'] },
      { id: 'collaterals', labelKey: 'nav.collaterals', groupKey: 'nav.groupRecords', icon: Building2, keywords: ['tai san bao dam', 'tsbd', 'collateral', 'bat dong san'] },
      { id: 'credit-cards', labelKey: 'nav.creditCards', groupKey: 'nav.groupRecords', icon: CreditCard, keywords: ['the tin dung', 'card', 'han muc'] },
    ],
  },
  {
    groupKey: 'nav.groupBusinessTools',
    items: [
      { id: 'calculators', labelKey: 'nav.calculators', groupKey: 'nav.groupBusinessTools', icon: Calculator, keywords: ['tinh toan', 'lai suat', 'calculator', 'tra no'] },
      { id: 'business-plan', labelKey: 'nav.businessPlan', groupKey: 'nav.groupBusinessTools', icon: ClipboardList, keywords: ['phuong an kinh doanh', 'pakd', 'phuong an'] },
      { id: 'inventory', labelKey: 'nav.inventory', groupKey: 'nav.groupBusinessTools', icon: Boxes, keywords: ['ton kho', 'hang hoa', 'inventory'] },
      { id: 'purchase-statement', labelKey: 'nav.purchaseStatement', groupKey: 'nav.groupBusinessTools', icon: FileText, keywords: ['bang ke mua hang', 'hoa don', 'purchase'] },
      { id: 'retail-invoice', labelKey: 'nav.retailInvoice', groupKey: 'nav.groupBusinessTools', icon: Receipt, keywords: ['hoa don ban le', 'ban le', 'invoice'] },
      { id: 'rate-quote', labelKey: 'nav.rateQuote', groupKey: 'nav.groupBusinessTools', icon: Percent, keywords: ['dinh gia lai suat', 'lai suat', 'quote'] },
      { id: 'cof', labelKey: 'nav.cof', groupKey: 'nav.groupBusinessTools', icon: Landmark, keywords: ['gia von', 'cof', 'cost of funds'] },
    ],
  },
  {
    groupKey: 'nav.groupLookup',
    items: [
      { id: 'mdsdv', labelKey: 'nav.mdsdv', groupKey: 'nav.groupLookup', icon: Target, keywords: ['muc dich su dung von', 'mdsdv'] },
      { id: 'card-policies', labelKey: 'nav.cardPolicies', groupKey: 'nav.groupLookup', icon: BookOpen, keywords: ['chinh sach the', 'quy dinh', 'policy'] },
      { id: 'templates', labelKey: 'nav.templates', groupKey: 'nav.groupLookup', icon: FileSignature, keywords: ['bieu mau', 'chung tu', 'template'] },
      { id: 'quiz-bank', labelKey: 'nav.quizBank', groupKey: 'nav.groupLookup', icon: GraduationCap, keywords: ['ngan hang cau hoi', 'quiz', 'on tap'] },
    ],
  },
  {
    groupKey: 'nav.groupControl',
    items: [
      { id: 'post-loan', labelKey: 'nav.postLoan', groupKey: 'nav.groupControl', icon: ShieldAlert, keywords: ['kiem soat sau vay', 'kssv', 'post loan', 'kiem tra'] },
      { id: 'settings', labelKey: 'nav.settings', groupKey: 'nav.groupControl', icon: Settings, keywords: ['cai dat', 'he thong', 'settings', 'config'] },
    ],
  },
];

export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap(g => g.items);
```

Hai từ khoá gõ sai trong bản cũ đã sửa khi chép sang: `'vaye'` ở mục `mdsdv` bỏ hẳn, `'khiem tra'` ở mục `quiz-bank` sửa thành `'on tap'`.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Chạy: `npx vitest run src/lib/__tests__/navigation.test.ts`
Kỳ vọng: PASS, 7 test.

- [ ] **Step 5: Sửa `Sidebar.tsx` đọc từ nguồn chung**

Xoá mảng `menuGroups` (dòng 14–62) và các import biểu tượng không còn dùng ở dòng 2–3. Giữ lại `X` vì nút đóng menu vẫn cần.

Đầu tệp thành:

```tsx
import { memo, useCallback } from 'react';
import { X } from 'lucide-react';
import { useLang } from '../context/LanguageContext';
import { NAV_GROUPS } from '../lib/navigation';
```

Trong phần render, đổi `menuGroups.map(...)` thành `NAV_GROUPS.map(...)`. Phần thân vòng lặp giữ nguyên không sửa gì.

- [ ] **Step 6: Sửa `CommandPalette.tsx` đọc từ nguồn chung**

Xoá `interface CommandItem` (dòng 34–40) và mảng `COMMAND_ITEMS` (dòng 42–62), cùng toàn bộ import biểu tượng ở dòng 2–24 trừ `Search`, `X`, `ChevronRight`.

Đầu tệp thành:

```tsx
import React, { useEffect, useState, useRef, useMemo, useCallback, memo } from 'react';
import { Search, X, ChevronRight } from 'lucide-react';
import { useWork } from '../context/WorkContext';
import { useLang } from '../context/LanguageContext';
import { NAV_ITEMS } from '../lib/navigation';
```

Trong `filteredItems`, đổi `COMMAND_ITEMS` thành `NAV_ITEMS` ở cả hai chỗ (`if (!query.trim()) return NAV_ITEMS;` và `return NAV_ITEMS.filter(...)`).

- [ ] **Step 7: Kiểm kiểu và chạy toàn bộ test**

Chạy: `npm run build && npm test && npm run lint`
Kỳ vọng: cả ba xanh. `npm run lint` sẽ bắt được import biểu tượng còn thừa nếu xoá sót.

- [ ] **Step 8: Kiểm bằng mắt**

Chạy: `npm run dev`

Kiểm hai chỗ:
1. Thanh bên trái vẫn đủ 5 nhóm và 19 mục, đúng thứ tự cũ.
2. Bấm `Ctrl + K`, bảng lệnh vẫn liệt kê đủ 19 mục; gõ `tsbd` vẫn ra "Định giá TSĐB".

- [ ] **Step 9: Commit**

```bash
git add src/lib/navigation.ts src/lib/__tests__/navigation.test.ts src/components/Sidebar.tsx src/components/CommandPalette.tsx
git commit -m "refactor(dieu-huong): danh sach man khai mot cho thay ba noi"
```

---

## Task 6: Dọn rác và thống nhất phiên bản

Spec §4.6. Ba việc độc lập nhưng cùng tính chất và cùng mức rủi ro nên gộp một task.

**Files:**
- Delete: `src/App.css`
- Create: `src/lib/appVersion.ts`
- Create: `src/lib/__tests__/appVersion.test.ts`
- Modify: `src/components/Sidebar.tsx` — dòng hiển thị `2.4.0` ở chân thanh bên (Task 5 đã sửa tệp này, số dòng đã dịch chuyển; tìm theo nội dung)
- Modify: `src/components/LoginView.tsx` — dòng `© 2026 CustomerManager · v2.5.0 Stable` ở chân thẻ đăng nhập
- Modify: `package.json`

**Interfaces:**
- Consumes: không có
- Produces: `APP_VERSION: string` — mọi chỗ hiển thị phiên bản đọc từ đây.

- [ ] **Step 1: Xác nhận ba thứ sắp xoá thật sự không ai dùng**

```bash
grep -rn "App\.css" src/ ; echo "--- clsx:" ; grep -rn "from 'clsx'\|require('clsx')" src/ ; echo "--- tailwind-merge:" ; grep -rn "tailwind-merge" src/
```

Kỳ vọng: cả ba đều không ra kết quả nào. Nếu có kết quả thì **dừng lại**, báo lại thay vì xoá.

- [ ] **Step 2: Xoá `src/App.css` và hai gói không dùng**

```bash
git rm src/App.css
npm uninstall clsx tailwind-merge
```

- [ ] **Step 3: Viết test thất bại cho phiên bản**

Tạo `src/lib/__tests__/appVersion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { APP_VERSION } from '../appVersion';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');
const doc = (p: string) => readFileSync(resolve(root, p), 'utf8');

describe('APP_VERSION', () => {
  it('có dạng x.y.z', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('khớp version trong package.json', () => {
    expect(JSON.parse(doc('package.json')).version).toBe(APP_VERSION);
  });

  it('Sidebar và LoginView đọc phiên bản từ nguồn chung', () => {
    for (const p of ['src/components/Sidebar.tsx', 'src/components/LoginView.tsx']) {
      expect(doc(p), `${p} không nhập APP_VERSION`).toContain("from '../lib/appVersion'");
      expect(doc(p), `${p} vẫn dùng APP_VERSION trong JSX`).toContain('{APP_VERSION}');
    }
  });

  it('không còn hai chuỗi phiên bản ghi cứng đã mâu thuẫn trước đây', () => {
    expect(doc('src/components/Sidebar.tsx')).not.toContain('2.4.0');
    expect(doc('src/components/LoginView.tsx')).not.toContain('v2.5.0 Stable');
  });
});
```

**Không** dùng cách quét toàn bộ `.tsx` tìm mẫu `\d+\.\d+\.\d+`: tiền Việt viết `500.000.000` cũng khớp mẫu đó, và 18 tệp trong `src/` đang có chuỗi như vậy. Test sẽ đỏ vì lý do chẳng liên quan. Chỉ kiểm đúng hai tệp thật sự hiển thị phiên bản.

- [ ] **Step 4: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/lib/__tests__/appVersion.test.ts`
Kỳ vọng: FAIL — không nhập được `../appVersion`.

- [ ] **Step 5: Tạo `src/lib/appVersion.ts`**

```ts
export const APP_VERSION = '2.5.0';
```

Chọn `2.5.0` vì đó là số cao hơn trong hai số đang mâu thuẫn (`Sidebar` ghi `2.4.0`, `LoginView` ghi `v2.5.0 Stable`).

- [ ] **Step 6: Đặt `version` trong `package.json`**

Đổi `"version": "0.0.0"` thành `"version": "2.5.0"`.

- [ ] **Step 7: Sửa hai component đọc từ nguồn chung**

Trong `src/components/Sidebar.tsx`, thêm `import { APP_VERSION } from '../lib/appVersion';` rồi đổi:

```tsx
<span className="font-mono text-ink-muted">2.4.0</span>
```

thành:

```tsx
<span className="font-mono text-ink-muted">{APP_VERSION}</span>
```

Trong `src/components/LoginView.tsx`, thêm cùng import rồi đổi:

```tsx
© 2026 CustomerManager · v2.5.0 Stable
```

thành:

```tsx
© 2026 CustomerManager · v{APP_VERSION}
```

- [ ] **Step 8: Chạy test, xác nhận xanh**

Chạy: `npx vitest run src/lib/__tests__/appVersion.test.ts`
Kỳ vọng: PASS, 3 test.

Nếu test thứ ba đỏ vì bắt nhầm chuỗi khác trông giống số phiên bản (ví dụ một chuỗi ngày tháng), thu hẹp mẫu khớp về `/v\d+\.\d+\.\d+/` rồi chạy lại.

- [ ] **Step 9: Chạy toàn bộ và kiểm gói**

```bash
npm test && npm run build && npm run lint
```

Kỳ vọng: cả ba xanh, và `npm run build` không báo thiếu `clsx` hay `tailwind-merge`.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore: xoa App.css rac, go clsx va tailwind-merge, thong nhat phien ban"
```

---

## Task 7: Cập nhật `CONVENTIONS.md`

Spec §1 và §11. Đây không phải việc phụ: tài liệu đang lệch khỏi mã ở sáu chỗ, và nếu đợt 0 không sửa thì rebuild này sẽ đẻ thêm quy ước mới chồng lên quy ước cũ đã sai.

**Files:**
- Modify: `CONVENTIONS.md` §15 (dòng 1182–1270) và §17 (dòng 1303 trở đi)

**Interfaces:**
- Consumes: số đo tương phản từ Task 1, thang chữ từ Task 3, bán kính từ Task 4
- Produces: không có mã

- [ ] **Step 1: Lấy số đo thật để viết vào tài liệu**

```bash
npx vitest run src/lib/__tests__/contrast.test.ts --reporter=verbose 2>&1 | head -40
npm test 2>&1 | grep -oE "Tests +[0-9]+ passed" | tail -1
```

Ghi lại: cặp có tỷ lệ thấp nhất, và tổng số test sau đợt 0.

- [ ] **Step 2: Viết lại phần chính sách màu trong §15**

Thay đoạn bắt đầu bằng **"Quy tắc: màu chỉ được mang nghĩa."** và đoạn ngoại lệ sắc KPI ngay sau nó bằng:

```markdown
**Quy tắc: màu tô ở đúng năm chỗ, không tô chỗ khác.** Chốt 19/08/2026, thay
quy tắc "màu chỉ mang nghĩa" trước đây.

| Vị trí | Màu |
| :--- | :--- |
| Năm ô KPI | năm sắc định danh: `accent`, `kpi-cust`, `kpi-collateral`, `kpi-card`, `neg` |
| Số tiền trong bảng | `pos` |
| Ngày tháng trong bảng | `accent` |
| Trạng thái, hạn còn lại | viên nền `pos-soft` / `warn-soft` / `neg-soft`; quá hạn dùng `bg-neg` + `text-surface` |
| Tiêu đề, nhãn, khung | trung tính — không tô |

Dòng cuối là ràng buộc thật: tiêu đề panel **không** được tô màu. Trước đây
"DƯ NỢ THEO PHƯƠNG THỨC VAY" tô xanh dương nằm ngay cạnh "PHÂN BỔ DƯ NỢ THEO
NHÓM NỢ" tô xanh lá — hai màu trang trí không mang nghĩa gì, đặt cạnh bốn panel
cảnh báo đang dùng đúng bốn sắc ngữ nghĩa.
```

- [ ] **Step 3: Sửa đoạn nói về tương phản trong §15**

Thay câu ghi "thấp nhất **5.09** (nhãn cột `ink-faint` trên `panel-muted`)" bằng số đo thật lấy ở Step 1, kèm câu này:

```markdown
Ngưỡng này nay có test giữ: `src/lib/__tests__/contrast.test.ts` đo mọi cặp màu
ngữ nghĩa ở cả hai giao diện và bắt buộc đạt WCAG AA (4,5). Đổi giá trị `--t-*`
mà làm rơi xuống dưới ngưỡng thì test đỏ ngay. **Đừng hạ ngưỡng trong test để
cho xanh** — chỉnh lại giá trị màu.

`src/lib/themeTokens.ts` giữ bản sao bảng màu ở dạng TypeScript để test đọc
được; `src/lib/__tests__/themeTokens.test.ts` chặn nó trôi khỏi `index.css`.
```

- [ ] **Step 4: Sửa bảng quy tắc hình thức trong §15**

Thay dòng "Bo góc" trong bảng bằng:

```markdown
| Bo góc | Ba bán kính, khai bằng biến CSS: `--r-panel` 12px cho thẻ, bảng, hộp thoại; `--r-control` 8px cho nút, ô nhập, tab; `--r-pill` 999px cho viên trạng thái. Dùng qua `RADIUS_PANEL`, `RADIUS_CONTROL`, `RADIUS_PILL` ở `uiClasses.ts`, không viết `rounded-*` thô |
```

- [ ] **Step 5: Sửa đoạn nói về chuỗi class truyền qua props trong §15**

Đoạn hiện ghi "component không tự dựng chuỗi class riêng và **không truyền chuỗi class qua props** nữa" là mô tả sai hiện trạng. Thay bằng:

```markdown
Component **không được** truyền chuỗi class qua props. Đây là đích, chưa phải
hiện trạng: rà soát 19/08/2026 đếm được **69 tệp** vẫn truyền
`containerCardBg`, `inputStyle`, `labelStyle`, `tableHeaderStyle`,
`sectionBoxBg`, `styles`, `cardBg`. Đợt 2 của lần rebuild giao diện dựng bộ
component đọc token trực tiếp; đợt 3–7 gỡ dần các props này theo từng màn. Mã
mới **không được thêm** props kiểu này.
```

- [ ] **Step 6: Thêm mục thang chữ vào §15**

Thêm ngay trước đoạn nói về mật độ dòng:

```markdown
### Thang chữ

`src/lib/fontSettings.ts` sinh ra sáu biến ngữ nghĩa, dẫn xuất từ bốn nhóm
điều chỉnh của màn Cài đặt:

| Biến | Dẫn xuất | Mặc định | Dùng cho |
| :--- | :--- | ---: | :--- |
| `--fs-screen` | `heading + 4` | 18px | tiêu đề màn |
| `--fs-title` | `heading + 1` | 15px | tiêu đề thẻ |
| `--fs-body` | `table + 1` | 13px | ô bảng thường, chữ thân, ô nhập |
| `--fs-dense` | `table` | 12px | bảng dày: lịch trả nợ 120 kỳ, ma trận COF |
| `--fs-label` | `small` | 11px | nhãn cột, nhãn KPI, chú thích |
| `--fs-num` | `mono × 2` | 24px | số trên thẻ KPI |

Bốn biến cũ `--fs-heading`, `--fs-table`, `--fs-small`, `--fs-mono` cùng khối
ghi đè lớp Tailwind ở cuối `index.css` là **cầu tạm** cho các màn chưa chuyển.
Gỡ ở đợt 7 khi màn cuối cùng đã dùng biến ngữ nghĩa. Mã mới dùng biến ngữ
nghĩa, đừng dùng bốn biến cũ.
```

- [ ] **Step 7: Sửa số test ở §17**

Đổi dòng ghi `# 739 test: 736 logic tài chính + 3 khói giao diện` thành số thật lấy ở Step 1.

- [ ] **Step 8: Đọc lại toàn bộ §15 một lượt**

Kiểm ba điều: không còn câu nào mâu thuẫn với câu khác; mọi con số đều là số vừa đo chứ không phải số cũ; không còn chỗ nào mô tả hiện trạng sai.

- [ ] **Step 9: Commit**

```bash
git add CONVENTIONS.md
git commit -m "docs(quy-uoc): sua §15 va §17 cho khop ma nguon va chinh sach mau moi"
```

---

## Kết thúc đợt 0

- [ ] **Chạy đủ bộ kiểm chứng**

```bash
npm test && npm run build && npm run lint
```

- [ ] **Xác nhận không màn nào đổi diện mạo**

Chạy `npm run dev`, chụp lại đúng 11 ảnh mà Task 0 đã chụp — cùng bề rộng cửa sổ, cùng màn, cùng giao diện — rồi đối chiếu từng cặp với ảnh trong `docs/superpowers/anh-moc/dot-0/`.

Phải **không thấy khác biệt nào**. Đây là tiêu chí đỗ/trượt của cả đợt: thấy khác là có gì đó sai, tìm cho ra rồi mới đi tiếp. Chỗ đáng ngờ nhất là màn đăng nhập, vì Task 4 đụng vào bo góc của đúng màn đó.

- [ ] **Thử tính năng chỉnh cỡ chữ**

Vào Cài đặt, kéo cả bốn thanh trượt cỡ chữ và đổi phông. Giao diện phải phản ứng y như trước đợt 0.

- [ ] **Đo lại số liệu và so với mốc Task 0**

```bash
grep -rl "containerCardBg\|inputStyle\|labelStyle\|tableHeaderStyle\|sectionBoxBg\|readonlyInputStyle\|styles=" --include=*.tsx src | wc -l
grep -roh "rounded-[a-z0-9]*" --include=*.tsx src | sort | uniq -c | sort -rn
npm test 2>&1 | grep -oE "Tests +[0-9]+ passed" | tail -1
```

So với `docs/superpowers/anh-moc/dot-0/so-do-truoc.txt`:

| Số đo | Trước | Sau đợt 0 |
| :--- | ---: | ---: |
| Tệp truyền chuỗi class qua props | 69 | 69 — **không đổi**, việc này thuộc đợt 2–7 |
| Biến thể bo góc thô trong `.tsx` | 7 | 7 — **không đổi**, việc này thuộc đợt 3–7 |
| Số test | 1.621 | tăng khoảng 50 |

Hai con số đầu **phải giữ nguyên**. Nếu chúng giảm thì nghĩa là đợt 0 đã lấn sang việc của đợt sau, và tiêu chí "không đổi màn nào" nhiều khả năng đã bị phá.

Ghi bảng này vào phần mô tả pull request.

---

## Đợt tiếp theo

Đợt 1 (`react-router`, thanh ngữ cảnh khách hàng, Header, Sidebar, CommandPalette) lập kế hoạch riêng khi đợt 0 xong và được duyệt. Đợt 1 sẽ dùng `ScreenId` và `NAV_GROUPS` mà Task 5 tạo ra.
