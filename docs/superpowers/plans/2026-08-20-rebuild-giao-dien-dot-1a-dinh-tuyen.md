# Rebuild giao diện — Đợt 1a: định tuyến

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đưa URL thật vào ứng dụng — F5 giữ nguyên chỗ đang làm, nút Back của trình duyệt chạy đúng, gửi được link tới một màn cụ thể, mở được hai màn ở hai tab — mà 19 màn hiện có vẫn chạy nguyên trạng.

**Architecture:** `react-router` v7 thay chuỗi `activeTab === '...'` trong `App.tsx`. Để 19 màn không phải sửa, `WorkContext.activeTab` và `setActiveTab` được giữ nguyên chữ ký nhưng đổi ruột: chúng đọc và ghi URL thay vì `useState`. Nhờ vậy mọi lời gọi `setActiveTab(...)` rải trong các view tiếp tục chạy, chỉ khác là nay chúng điều hướng thật. Cầu tạm này gỡ ở đợt 3–7 khi từng màn được viết lại.

**Tech Stack:** React 19.2, `react-router` v7, TypeScript, Tailwind CSS v4, Vitest (không có tệp cấu hình riêng — tệp test cần DOM tự khai `// @vitest-environment jsdom`), Testing Library.

**Spec:** `docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md` — mục §6.1 và §6.4.

**Đợt trước:** `docs/superpowers/plans/2026-08-19-rebuild-giao-dien-dot-0.md` đã xong và gộp vào `main`. Nó tạo ra `src/lib/navigation.ts` — nguồn khai báo duy nhất của 19 màn — mà đợt này sẽ mở rộng thêm trường đường dẫn.

## Global Constraints

- **19 màn hiện có chạy nguyên trạng.** Không sửa tệp nào trong `src/components/views/`, không sửa tệp nào trong `src/hooks/`. Nếu một task buộc phải sửa, dừng lại và báo — đó là dấu hiệu thiết kế sai.
- **1.691 test hiện có phải xanh sau mỗi task.**
- Không viết chú thích giải thích trong mã. Lý do "vì sao" thuộc `CONVENTIONS.md`.
- Chuỗi hiển thị cho người dùng và mô tả test viết tiếng Việt.
- Không đổi diện mạo màn nào. Đợt này đổi *hành vi điều hướng*, không đổi hình thức.
- **Không đăng nhập, không nhập mật khẩu, không xoá `localStorage` của trình duyệt.** Máy chủ phát triển có thể đang giữ phiên đăng nhập thật của chủ dự án.
- **Không chạy `npm test` khi chưa cần.** Ba tệp test còn chạm cơ sở dữ liệu thật đã được bịt ở đợt 0, nhưng `src/components/__tests__/DocumentTemplateExport.test.tsx` vẫn *đọc* bảng `SaleCatalogProfiles` mỗi lần chạy — đây là việc còn treo, không phải của đợt này.
- Lệnh: `npm test`, `npx vitest run <đường-dẫn>`, `npm run build`, `npm run lint`.

---

## File Structure

**Tạo mới**

| Tệp | Trách nhiệm |
| :--- | :--- |
| `src/lib/routes.ts` | Bảng đường dẫn và hàm dựng đường dẫn. Thuần, không React, kiểm thử được |
| `src/lib/__tests__/routes.test.ts` | Khoá bảng đường dẫn: đủ 19 màn, không trùng, khớp `ScreenId` |
| `src/components/AppLayout.tsx` | Khung trang: Header, Sidebar, vùng nội dung với `<Outlet />` |
| `src/components/__tests__/routing.test.tsx` | Dựng bộ định tuyến trong bộ nhớ, kiểm URL nào ra màn nào |

**Sửa**

| Tệp | Sửa gì |
| :--- | :--- |
| `src/lib/navigation.ts` | `NavItem` thêm trường `path` |
| `src/lib/__tests__/navigation.test.ts` | Thêm test cho trường `path` |
| `src/main.tsx` | Bọc ứng dụng trong `BrowserRouter` |
| `src/App.tsx` | Thành bảng khai báo tuyến đường, không còn chuỗi `activeTab ===` |
| `src/context/WorkContext.tsx` | `activeTab` / `setActiveTab` đọc ghi URL thay vì `useState` |
| `src/components/Sidebar.tsx` | Dùng `NavLink` thay `onClick` + `setActiveTab` |
| `src/components/CommandPalette.tsx` | Dùng `useNavigate` thay `setActiveTab` |
| `src/components/__tests__/Sidebar.test.tsx` | Bọc trong bộ định tuyến |
| `src/components/Header.tsx` | Bỏ vòng lặp truy vấn cơ sở dữ liệu 30 giây |
| `package.json` | Thêm `react-router` |
| `CONVENTIONS.md` | Thêm mục về định tuyến |

**Không đụng:** toàn bộ `src/components/views/`, toàn bộ `src/hooks/`, `src/lib/api/`.

---

## Task 0: Mốc đối chiếu

Đợt 0 cho thấy dấu vân tay giá trị tính toán đối chiếu chắc hơn ảnh chụp, vì so được từng px bằng máy. Làm lại cách đó, thêm phần ghi nhận hành vi điều hướng hiện tại để cuối đợt biết cái gì đã đổi.

**Files:**
- Create: `docs/superpowers/anh-moc/dot-1a/van-tay-truoc.json` (thư mục đã nằm trong `.gitignore`)

**Interfaces:**
- Consumes: không có
- Produces: tệp mốc mà Task 5 đối chiếu

- [ ] **Step 1: Xác nhận điểm xuất phát**

```bash
git branch --show-current
git status --short
npm test 2>&1 | grep -oE "Tests +[0-9]+ passed" | tail -1
```

Kỳ vọng: nhánh `rebuild-giao-dien-dot-1`, cây sạch, 1.691 test.

- [ ] **Step 2: Mở ứng dụng**

Dùng `mcp__Claude_Browser__preview_start`. Nếu chưa có `.claude/launch.json` thì tạo với `runtimeExecutable` là `npm`, `runtimeArgs` là `["run","dev"]`, `port` 5173.

**Không đăng nhập.** Nếu trình duyệt đã sẵn phiên đăng nhập của chủ dự án thì dùng luôn phiên đó, và **không đăng xuất, không xoá `localStorage`**.

- [ ] **Step 3: Ghi lại hành vi điều hướng hiện tại**

Chạy qua `mcp__Claude_Browser__javascript_tool`:

```js
JSON.stringify({
  url: location.href,
  duongDan: location.pathname,
  soNutSidebar: document.querySelectorAll('aside nav button').length,
  soTheLienKet: document.querySelectorAll('aside nav a').length,
  soNhom: document.querySelectorAll('aside nav > div').length,
  theLoaiMucSidebar: document.querySelector('aside nav button, aside nav a')?.tagName,
  manDangMo: document.querySelector('aside [aria-current="page"]')?.textContent?.trim(),
})
```

Ghi kết quả vào `docs/superpowers/anh-moc/dot-1a/van-tay-truoc.json`.

Kỳ vọng lúc này: `soNutSidebar` 19, `soTheLienKet` 0, `soNhom` 5, `theLoaiMucSidebar` là `BUTTON`, `duongDan` là `/`. Sau đợt này ba số đầu đảo thành 0 / 19 / 5 và `theLoaiMucSidebar` thành `A` — đó là dấu hiệu đo được rằng thanh bên nay là liên kết thật.

- [ ] **Step 4: Chứng minh vấn đề đang có**

Bấm sang một màn bất kỳ trong thanh bên, rồi chạy `location.reload()` qua công cụ trình duyệt. Ghi vào tệp mốc: sau khi tải lại, màn hình quay về đâu.

Kỳ vọng: quay về Tổng quan, và thanh địa chỉ vẫn là `http://localhost:5173/` bất kể đang mở màn nào. **Đây chính là vấn đề đợt này sửa** — ghi lại để cuối đợt đối chiếu.

- [ ] **Step 5: Không commit gì**

Task này chỉ tạo tệp trong thư mục đã bị `.gitignore` bỏ qua. Chạy `git status --short`, phải sạch.

---

## Task 1: Bảng đường dẫn

Bảng đường dẫn tách riêng khỏi React để kiểm thử được, và để nơi nào cần dựng một đường dẫn cũng lấy từ một chỗ. Task này **chưa nối vào ứng dụng** — chỉ tạo dữ liệu và test.

**Đường dẫn viết tiếng Anh.** Chủ dự án chốt 20/08/2026, để tránh rắc rối về mã hoá và về công cụ. Đường dẫn bám sát chính `ScreenId` đã có, cộng tiền tố nhóm cho hai nhóm công cụ và tra cứu — nhờ vậy nhìn đường dẫn là đoán được id màn và ngược lại.

**Lưu ý về sáu màn hồ sơ khách hàng:** spec §6.1 định hình cuối là `/customers/:id/...`. Đợt 1a **chưa làm phần `:id`** — đó là việc của đợt 1b. Ở đợt này sáu màn đó dùng đường dẫn phẳng, và đợt 1b sẽ lồng chúng vào dưới `/customers/:id/`. Chỉ sáu đường dẫn này đổi giữa hai đợt; mười ba đường dẫn còn lại đã là hình cuối.

**Files:**
- Create: `src/lib/routes.ts`
- Create: `src/lib/__tests__/routes.test.ts`
- Modify: `src/lib/navigation.ts`
- Modify: `src/lib/__tests__/navigation.test.ts`

**Interfaces:**
- Consumes: `ScreenId` từ `src/lib/navigation.ts` (do đợt 0 tạo)
- Produces:
  - `ROUTE_OF: Record<ScreenId, string>`
  - `SCREEN_OF_PATH: Record<string, ScreenId>`
  - `screenIdOfPath(pathname: string): ScreenId | null`
  - `DEFAULT_ROUTE: string`
  - `NavItem` nay có thêm `path: string`
  - Task 2 và 3 dùng cả bốn thứ trên.

- [ ] **Step 1: Viết test thất bại**

Tạo `src/lib/__tests__/routes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ROUTE_OF, SCREEN_OF_PATH, screenIdOfPath, DEFAULT_ROUTE } from '../routes';
import { NAV_ITEMS } from '../navigation';

describe('bảng đường dẫn', () => {
  it('mỗi màn có đúng một đường dẫn', () => {
    expect(Object.keys(ROUTE_OF)).toHaveLength(19);
    for (const item of NAV_ITEMS) {
      expect(ROUTE_OF[item.id], `thiếu đường dẫn cho ${item.id}`).toBeTruthy();
    }
  });

  it('không đường dẫn nào trùng nhau', () => {
    const paths = Object.values(ROUTE_OF);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('mọi đường dẫn bắt đầu bằng gạch chéo, viết thường, không dấu', () => {
    for (const path of Object.values(ROUTE_OF)) {
      expect(path, `${path} sai dạng`).toMatch(/^\/[a-z0-9/-]*$/);
    }
  });

  it('không đường dẫn nào kết thúc bằng gạch chéo', () => {
    for (const path of Object.values(ROUTE_OF)) {
      expect(path.endsWith('/'), `${path} thừa gạch chéo cuối`).toBe(false);
    }
  });

  it('tra ngược từ đường dẫn ra đúng màn', () => {
    for (const [id, path] of Object.entries(ROUTE_OF)) {
      expect(SCREEN_OF_PATH[path]).toBe(id);
      expect(screenIdOfPath(path)).toBe(id);
    }
  });

  it('đường dẫn lạ trả về null, không ném lỗi', () => {
    expect(screenIdOfPath('/not-a-real-screen')).toBeNull();
    expect(screenIdOfPath('')).toBeNull();
  });

  it('bỏ qua gạch chéo thừa ở cuối khi tra', () => {
    expect(screenIdOfPath('/dashboard/')).toBe('dashboard');
  });

  it('màn mặc định là Tổng quan', () => {
    expect(DEFAULT_ROUTE).toBe(ROUTE_OF.dashboard);
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/lib/__tests__/routes.test.ts`
Kỳ vọng: FAIL — không nhập được `../routes`.

- [ ] **Step 3: Viết `src/lib/routes.ts`**

```ts
import type { ScreenId } from './navigation';

export const ROUTE_OF: Record<ScreenId, string> = {
  dashboard: '/dashboard',

  customers: '/customers',
  'credit-contracts': '/credit-contracts',
  loans: '/loans',
  collaterals: '/collaterals',
  'credit-cards': '/credit-cards',

  calculators: '/tools/calculators',
  'business-plan': '/tools/business-plan',
  inventory: '/tools/inventory',
  'purchase-statement': '/tools/purchase-statement',
  'retail-invoice': '/tools/retail-invoice',
  'rate-quote': '/tools/rate-quote',
  cof: '/tools/cost-of-funds',

  mdsdv: '/reference/loan-purpose',
  'card-policies': '/reference/card-policies',
  templates: '/reference/templates',
  'quiz-bank': '/reference/quiz',

  'post-loan': '/post-loan-control',
  settings: '/settings',
};

export const DEFAULT_ROUTE = ROUTE_OF.dashboard;

export const SCREEN_OF_PATH: Record<string, ScreenId> = Object.fromEntries(
  Object.entries(ROUTE_OF).map(([id, path]) => [path, id as ScreenId])
);

export function screenIdOfPath(pathname: string): ScreenId | null {
  if (!pathname) return null;
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return SCREEN_OF_PATH[clean] ?? null;
}
```

- [ ] **Step 4: Chạy test, xác nhận xanh**

Chạy: `npx vitest run src/lib/__tests__/routes.test.ts`
Kỳ vọng: PASS, 8 test.

- [ ] **Step 5: Viết test thất bại cho trường `path` trong `navigation.ts`**

Thêm vào cuối `src/lib/__tests__/navigation.test.ts`:

```ts
import { ROUTE_OF } from '../routes';

describe('navigation — đường dẫn', () => {
  it('mọi mục đều có đường dẫn khớp bảng đường dẫn', () => {
    for (const item of NAV_ITEMS) {
      expect(item.path, `${item.id} thiếu path`).toBeTruthy();
      expect(item.path).toBe(ROUTE_OF[item.id]);
    }
  });

  it('không hai mục nào chung một đường dẫn', () => {
    const paths = NAV_ITEMS.map(i => i.path);
    expect(new Set(paths).size).toBe(paths.length);
  });
});
```

Dòng `import { ROUTE_OF } from '../routes';` đặt lên đầu tệp cùng các import khác.

- [ ] **Step 6: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/lib/__tests__/navigation.test.ts`
Kỳ vọng: FAIL — `item.path` là `undefined`.

- [ ] **Step 7: Thêm `path` vào `navigation.ts`**

Trong `src/lib/navigation.ts`, thêm `path: string;` vào `interface NavItem`, rồi thêm `path: ROUTE_OF['<id>'],` vào từng mục trong `NAV_GROUPS`. Nhập `ROUTE_OF` từ `./routes` ở đầu tệp.

Ví dụ mục đầu:

```ts
{ id: 'dashboard', labelKey: 'nav.dashboard', groupKey: 'nav.groupOverview', icon: LayoutDashboard, path: ROUTE_OF.dashboard, keywords: ['overview', 'tong quan', 'dashboard', 'danh muc'] },
```

Làm đủ cả 19 mục. Với id có dấu gạch ngang thì viết `ROUTE_OF['credit-contracts']`.

- [ ] **Step 8: Chạy test, xác nhận xanh**

Chạy: `npx vitest run src/lib/__tests__/routes.test.ts src/lib/__tests__/navigation.test.ts`
Kỳ vọng: PASS, 8 + 9 = 17 test.

- [ ] **Step 9: Kiểm kiểu và chạy toàn bộ**

Chạy: `npm run build && npm test && npm run lint`
Kỳ vọng: cả ba xanh, 1.701 test.

Ứng dụng lúc này **chưa đổi hành vi gì** — không ai đọc `path` cả.

- [ ] **Step 10: Commit**

```bash
git add src/lib/routes.ts src/lib/__tests__/routes.test.ts src/lib/navigation.ts src/lib/__tests__/navigation.test.ts
git commit -m "feat(dieu-huong): bang duong dan, chua noi vao ung dung"
```

---

## Task 2: Bộ định tuyến

Task nặng nhất của đợt. Sau task này URL đã chạy thật, nhưng **Sidebar và CommandPalette chưa sửa một dòng nào** — chúng vẫn gọi `setActiveTab`, chỉ khác là hàm đó nay điều hướng. Nhờ cách này, nếu có gì vỡ thì biết ngay là do bộ định tuyến chứ không phải do component.

**Files:**
- Create: `src/components/AppLayout.tsx`
- Create: `src/components/__tests__/routing.test.tsx`
- Modify: `src/main.tsx`
- Modify: `src/App.tsx`
- Modify: `src/context/WorkContext.tsx`
- Modify: `src/components/__tests__/Sidebar.test.tsx`
- Modify: `package.json`

**Interfaces:**
- Consumes: `ROUTE_OF`, `DEFAULT_ROUTE`, `screenIdOfPath` từ Task 1
- Produces:
  - `AppLayout` — component khung trang, render `Header` + `Sidebar` + `<Outlet />`
  - `WorkContext.activeTab` / `setActiveTab` giữ nguyên chữ ký `string` / `(t: string) => void`, đổi ruột sang URL
  - Task 3 thay `setActiveTab` bằng điều hướng trực tiếp.

- [ ] **Step 1: Cài `react-router`**

```bash
npm install react-router@^7
```

Kiểm: `node -e "console.log(require('./package.json').dependencies['react-router'])"`

- [ ] **Step 2: Viết test thất bại cho bộ định tuyến**

Tạo `src/components/__tests__/routing.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { LanguageProvider } from '../../context/LanguageContext';
import { ROUTE_OF, DEFAULT_ROUTE, screenIdOfPath } from '../../lib/routes';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    session: { user: { id: 'test' } },
    user: { id: 'test', email: 'test@nganhang.vn' },
    role: 'banker',
    fullName: 'Nguyễn Văn Thử',
    isAdmin: false,
    loading: false,
    signIn: async () => {},
    signOut: async () => {},
  }),
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));

afterEach(cleanup);

describe('bảng đường dẫn', () => {
  it('mọi đường dẫn tra ngược được ra màn', () => {
    for (const path of Object.values(ROUTE_OF)) {
      expect(screenIdOfPath(path), `${path} không tra ngược được`).toBeTruthy();
    }
  });

  it('màn mặc định là Tổng quan', () => {
    expect(DEFAULT_ROUTE).toBe('/dashboard');
  });
});

describe('AppLayout dựng được trong bộ định tuyến', () => {
  function dungLen(duongDan: string) {
    return render(
      <MemoryRouter initialEntries={[duongDan]}>
        <LanguageProvider>
          <Routes>
            <Route element={<AppLayoutDuoiTest />}>
              <Route path={ROUTE_OF.dashboard} element={<div>NOI DUNG MAN</div>} />
              <Route path={ROUTE_OF.settings} element={<div>NOI DUNG MAN</div>} />
            </Route>
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    );
  }

  it('render khung và nội dung màn con, không ném lỗi', () => {
    dungLen(ROUTE_OF.dashboard);
    expect(screen.getByRole('navigation')).toBeTruthy();
    expect(screen.getByText('NOI DUNG MAN')).toBeTruthy();
  });

  it('đổi đường dẫn thì thanh bên đánh dấu đúng mục', () => {
    const { container } = dungLen(ROUTE_OF.settings);
    const dangMo = container.querySelector('[aria-current="page"]');
    expect(dangMo).toBeTruthy();
  });
});
```

Thêm ở đầu tệp, sau khối `vi.mock`:

```tsx
import { AppLayout as AppLayoutDuoiTest } from '../AppLayout';
```

**Vì sao phải giả lập `AuthContext`:** `AppLayout` trả về `<LoginView />` khi chưa có phiên đăng nhập, nên nếu không giả lập thì test sẽ thấy màn đăng nhập chứ không thấy thanh bên, và `getByRole('navigation')` đỏ vì lý do chẳng liên quan tới định tuyến. Giả lập ở tầng `AuthContext` thay vì tầng `supabase` cho gọn và không phụ thuộc hình dạng nội bộ của thư viện.

- [ ] **Step 3: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/components/__tests__/routing.test.tsx`
Kỳ vọng: FAIL — không nhập được `../AppLayout`.

- [ ] **Step 4: Tạo `src/components/AppLayout.tsx`**

Chuyển nguyên phần khung trang đang nằm trong `App.tsx` (dòng 79–123 của bản hiện tại) sang đây, thay khối `activeTab === ...` bằng `<Outlet />`:

```tsx
import { useState, useEffect, useCallback } from 'react';
import { Outlet } from 'react-router';
import { Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useWork } from '../context/WorkContext';
import { LoginView } from './LoginView';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { ErrorBoundary } from './ErrorBoundary';

export function AppLayout() {
  const { activeTab, setActiveTab } = useWork();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const { session, loading } = useAuth();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleMobileMenu = useCallback(() => setIsMobileMenuOpen(prev => !prev), []);
  const handleOpenCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), []);
  const handleCloseMobileMenu = useCallback(() => setIsMobileMenuOpen(false), []);
  const handleCloseCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), []);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface text-ink flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
      </div>
    );
  }

  if (!session) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen bg-surface text-ink flex flex-col antialiased">
      <Header
        onToggleMobileMenu={handleToggleMobileMenu}
        onOpenCommandPalette={handleOpenCommandPalette}
      />
      <div className="flex flex-1 pt-[var(--header-h)] relative">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isOpenMobile={isMobileMenuOpen}
          onCloseMobile={handleCloseMobileMenu}
        />
        <main className="flex-1 md:ml-60 min-w-0 bg-surface p-3 sm:p-4 md:p-6 overflow-y-auto">
          <ErrorBoundary title="Lỗi khi tải giao diện màn hình">
            <Outlet />
          </ErrorBoundary>
        </main>
      </div>

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={handleCloseCommandPalette}
      />
    </div>
  );
}
```

Lớp CSS chép **nguyên văn** từ `App.tsx` cũ — đây là chỗ dễ làm đổi diện mạo nhất của cả đợt.

- [ ] **Step 5: Viết lại `src/App.tsx` thành bảng khai báo tuyến đường**

```tsx
import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { AppLayout } from './components/AppLayout';
import { ViewSkeleton } from './components/SkeletonLoader';
import { ROUTE_OF, DEFAULT_ROUTE } from './lib/routes';

const DashboardView = lazy(() => import('./components/views/DashboardView').then(m => ({ default: m.DashboardView })));
const CustomerListView = lazy(() => import('./components/views/CustomerListView').then(m => ({ default: m.CustomerListView })));
const LoanPortfolioView = lazy(() => import('./components/views/LoanPortfolioView').then(m => ({ default: m.LoanPortfolioView })));
const CreditContractView = lazy(() => import('./components/views/CreditContractView').then(m => ({ default: m.CreditContractView })));
const CollateralView = lazy(() => import('./components/views/CollateralView').then(m => ({ default: m.CollateralView })));
const CardContractView = lazy(() => import('./components/views/CardContractView').then(m => ({ default: m.CardContractView })));
const CardPolicyLookupView = lazy(() => import('./components/views/CardPolicyLookupView').then(m => ({ default: m.CardPolicyLookupView })));
const CalculatorView = lazy(() => import('./components/views/CalculatorView').then(m => ({ default: m.CalculatorView })));
const MdsdvLookupView = lazy(() => import('./components/views/MdsdvLookupView').then(m => ({ default: m.MdsdvLookupView })));
const RateQuoteView = lazy(() => import('./components/views/RateQuoteView').then(m => ({ default: m.RateQuoteView })));
const CofView = lazy(() => import('./components/views/CofView').then(m => ({ default: m.CofView })));
const DocumentTemplateView = lazy(() => import('./components/views/DocumentTemplateView').then(m => ({ default: m.DocumentTemplateView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then(m => ({ default: m.SettingsView })));
const PostLoanControlView = lazy(() => import('./components/views/PostLoanControlView').then(m => ({ default: m.PostLoanControlView })));
const BusinessPlanView = lazy(() => import('./components/views/BusinessPlanView').then(m => ({ default: m.BusinessPlanView })));
const InventoryView = lazy(() => import('./components/views/InventoryView').then(m => ({ default: m.InventoryView })));
const PurchaseStatementView = lazy(() => import('./components/views/PurchaseStatementView').then(m => ({ default: m.PurchaseStatementView })));
const RetailInvoiceView = lazy(() => import('./components/views/RetailInvoiceView').then(m => ({ default: m.RetailInvoiceView })));
const QuizBankView = lazy(() => import('./components/views/QuizBankView').then(m => ({ default: m.QuizBankView })));

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<Navigate to={DEFAULT_ROUTE} replace />} />
        <Route path={ROUTE_OF.dashboard} element={<Suspense fallback={<ViewSkeleton />}><DashboardView /></Suspense>} />
        <Route path={ROUTE_OF.customers} element={<Suspense fallback={<ViewSkeleton />}><CustomerListView /></Suspense>} />
        <Route path={ROUTE_OF['credit-contracts']} element={<Suspense fallback={<ViewSkeleton />}><CreditContractView /></Suspense>} />
        <Route path={ROUTE_OF.loans} element={<Suspense fallback={<ViewSkeleton />}><LoanPortfolioView /></Suspense>} />
        <Route path={ROUTE_OF.collaterals} element={<Suspense fallback={<ViewSkeleton />}><CollateralView /></Suspense>} />
        <Route path={ROUTE_OF['credit-cards']} element={<Suspense fallback={<ViewSkeleton />}><CardContractView /></Suspense>} />
        <Route path={ROUTE_OF.calculators} element={<Suspense fallback={<ViewSkeleton />}><CalculatorView /></Suspense>} />
        <Route path={ROUTE_OF['business-plan']} element={<Suspense fallback={<ViewSkeleton />}><BusinessPlanView /></Suspense>} />
        <Route path={ROUTE_OF.inventory} element={<Suspense fallback={<ViewSkeleton />}><InventoryView /></Suspense>} />
        <Route path={ROUTE_OF['purchase-statement']} element={<Suspense fallback={<ViewSkeleton />}><PurchaseStatementView /></Suspense>} />
        <Route path={ROUTE_OF['retail-invoice']} element={<Suspense fallback={<ViewSkeleton />}><RetailInvoiceView /></Suspense>} />
        <Route path={ROUTE_OF['rate-quote']} element={<Suspense fallback={<ViewSkeleton />}><RateQuoteView /></Suspense>} />
        <Route path={ROUTE_OF.cof} element={<Suspense fallback={<ViewSkeleton />}><CofView /></Suspense>} />
        <Route path={ROUTE_OF.mdsdv} element={<Suspense fallback={<ViewSkeleton />}><MdsdvLookupView /></Suspense>} />
        <Route path={ROUTE_OF['card-policies']} element={<Suspense fallback={<ViewSkeleton />}><CardPolicyLookupView /></Suspense>} />
        <Route path={ROUTE_OF.templates} element={<Suspense fallback={<ViewSkeleton />}><DocumentTemplateView /></Suspense>} />
        <Route path={ROUTE_OF['quiz-bank']} element={<Suspense fallback={<ViewSkeleton />}><QuizBankView /></Suspense>} />
        <Route path={ROUTE_OF['post-loan']} element={<Suspense fallback={<ViewSkeleton />}><PostLoanControlView /></Suspense>} />
        <Route path={ROUTE_OF.settings} element={<Suspense fallback={<ViewSkeleton />}><SettingsView /></Suspense>} />
        <Route path="*" element={<Navigate to={DEFAULT_ROUTE} replace />} />
      </Route>
    </Routes>
  );
}

export default App;
```

- [ ] **Step 6: Bọc ứng dụng trong `BrowserRouter`**

Trong `src/main.tsx`, thêm `import { BrowserRouter } from 'react-router';` rồi bọc **ra ngoài** `ProviderComposer`:

```tsx
<ErrorBoundary title="Ứng dụng gặp sự cố khởi chạy">
  <BrowserRouter>
    <ProviderComposer providers={providers}>
      <App />
    </ProviderComposer>
  </BrowserRouter>
</ErrorBoundary>
```

**Thứ tự này bắt buộc, đặt ngược là ứng dụng vỡ ngay lúc khởi động.** `ProviderComposer` dựng cây bằng `reduceRight`, nên provider cuối mảng — `WorkProvider` — thành lớp trong cùng, bọc quanh `children`. Nếu `BrowserRouter` nằm bên trong `ProviderComposer` thì `WorkProvider` ở **ngoài** router, và `useLocation()` mà Step 7 sắp thêm vào nó sẽ ném lỗi.

Kiểm nhanh sau khi sửa: chạy `npm run dev`, mở trang, bảng điều khiển trình duyệt không được có lỗi kiểu `useLocation() may be used only in the context of a <Router> component`.

- [ ] **Step 7: Đổi ruột `WorkContext`**

Thay hai dòng trạng thái `activeTab` bằng đọc ghi URL. Trong `src/context/WorkContext.tsx`:

```tsx
import { useLocation, useNavigate } from 'react-router';
import { ROUTE_OF, screenIdOfPath } from '../lib/routes';
```

rồi trong `WorkProvider`, thay `const [activeTab, setActiveTab] = useState('dashboard');` bằng:

```tsx
const location = useLocation();
const navigate = useNavigate();
const activeTab = screenIdOfPath(location.pathname) ?? 'dashboard';
const setActiveTab = useCallback((tab: string) => {
  const path = ROUTE_OF[tab as keyof typeof ROUTE_OF];
  if (path) navigate(path);
}, [navigate]);
```

Nhập thêm `useCallback` từ `react`. Chữ ký của `activeTab` và `setActiveTab` **không đổi**, nên 19 màn và Sidebar không phải sửa gì.

`requestDisburse` vẫn gọi `setActiveTab('loans')` như cũ — nay nó điều hướng. Giữ nguyên, đợt 1b mới đổi.

- [ ] **Step 8: Sửa `Sidebar.test.tsx` cho chạy trong bộ định tuyến**

Bọc phần `render` trong `<MemoryRouter>`:

```tsx
import { MemoryRouter } from 'react-router';
```

```tsx
function dungLen() {
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <Sidebar activeTab="dashboard" setActiveTab={() => {}} />
      </LanguageProvider>
    </MemoryRouter>
  );
}
```

Phần khẳng định giữ nguyên — 19 nhãn viết cứng, 5 nhóm, đếm nút, `aria-current`.

- [ ] **Step 9: Chạy test**

Chạy: `npx vitest run src/components/__tests__/routing.test.tsx src/components/__tests__/Sidebar.test.tsx`
Kỳ vọng: PASS.

- [ ] **Step 10: Chạy toàn bộ và kiểm kiểu**

Chạy: `npm run build && npm test && npm run lint`
Kỳ vọng: cả ba xanh.

Nếu `npm test` báo đỏ ở một tệp test màn hình nào đó vì thiếu bộ định tuyến bao ngoài, bọc nó trong `<MemoryRouter>` giống Step 8 — **chỉ sửa tệp test, không sửa màn hình**.

- [ ] **Step 11: Kiểm bằng trình duyệt — đây là bước quan trọng nhất**

Chạy `mcp__Claude_Browser__preview_start`. **Không đăng nhập, không xoá `localStorage`.**

Kiểm bốn điều, ghi kết quả vào báo cáo:

1. Bấm một mục trong thanh bên → thanh địa chỉ đổi thành đường dẫn tương ứng. Đọc `location.pathname` qua `javascript_tool` để xác nhận.
2. Chạy `location.reload()` → **vẫn ở đúng màn đó**, không quay về Tổng quan. Đây là thứ đợt này sinh ra để sửa.
3. Chạy `history.back()` → quay về màn trước, không thoát khỏi ứng dụng.
4. Đi thẳng tới một đường dẫn lạ như `/not-a-real-screen` → chuyển hướng về `/dashboard`, không trắng màn.

- [ ] **Step 12: Kiểm thanh bên không đổi hình thức**

Chạy qua `javascript_tool`:

```js
JSON.stringify({
  soNut: document.querySelectorAll('aside nav button').length,
  soNhom: document.querySelectorAll('aside nav > div').length,
  manDangMo: document.querySelector('aside [aria-current="page"]')?.textContent?.trim(),
})
```

Kỳ vọng: vẫn 19 nút, 5 nhóm. `aria-current` phải trỏ đúng màn đang mở.

- [ ] **Step 13: Commit**

```bash
git add package.json package-lock.json src/main.tsx src/App.tsx src/components/AppLayout.tsx src/context/WorkContext.tsx src/components/__tests__/routing.test.tsx src/components/__tests__/Sidebar.test.tsx
git commit -m "feat(dieu-huong): react-router thay chuoi activeTab, URL chay that"
```

---

## Task 3: Thanh bên và bảng lệnh dùng liên kết thật

Sau Task 2, điều hướng đã chạy qua URL nhưng thanh bên vẫn là `<button>` gọi `setActiveTab`. Nghĩa là chuột phải "Mở ở tab mới" không dùng được, và trình đọc màn hình không biết đó là liên kết. Task này chữa nốt.

**Files:**
- Modify: `src/components/Sidebar.tsx`
- Modify: `src/components/CommandPalette.tsx`
- Modify: `src/components/AppLayout.tsx`
- Modify: `src/components/__tests__/Sidebar.test.tsx`

**Interfaces:**
- Consumes: `NAV_GROUPS` với trường `path` từ Task 1; bộ định tuyến từ Task 2
- Produces: `Sidebar` không còn nhận prop `activeTab` và `setActiveTab`

- [ ] **Step 1: Viết test thất bại**

Thêm vào `src/components/__tests__/Sidebar.test.tsx`:

```tsx
describe('Sidebar dùng liên kết thật', () => {
  it('mỗi mục là một thẻ liên kết, không phải nút', () => {
    const { container } = dungLen();
    expect(container.querySelectorAll('nav a')).toHaveLength(19);
    expect(container.querySelectorAll('nav button')).toHaveLength(0);
  });

  it('liên kết trỏ đúng đường dẫn của màn', () => {
    const { container } = dungLen();
    const href = [...container.querySelectorAll('nav a')].map(a => a.getAttribute('href'));
    expect(href).toContain('/dashboard');
    expect(href).toContain('/customers');
    expect(href).toContain('/settings');
  });

  it('mục ứng với đường dẫn hiện tại được đánh dấu aria-current', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/settings']}>
        <LanguageProvider>
          <Sidebar />
        </LanguageProvider>
      </MemoryRouter>
    );
    const dangMo = container.querySelector('[aria-current="page"]');
    expect(dangMo?.getAttribute('href')).toBe('/settings');
  });
});
```

Đồng thời sửa `dungLen()` bỏ hai prop `activeTab` và `setActiveTab`, và sửa test `aria-current` cũ cho khớp: nó phải dựng ở `initialEntries={['/dashboard']}`.

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/components/__tests__/Sidebar.test.tsx`
Kỳ vọng: FAIL — vẫn còn 19 `button`, 0 `a`.

- [ ] **Step 3: Sửa `Sidebar.tsx`**

Bỏ `activeTab`, `setActiveTab`, `handleTabClick` khỏi `SidebarProps` và thân component. Giữ `isOpenMobile` và `onCloseMobile`.

Thay khối `<button>` bằng `NavLink`:

```tsx
import { NavLink } from 'react-router';
```

```tsx
<NavLink
  key={item.id}
  to={item.path}
  onClick={onCloseMobile}
  className={({ isActive }) => `w-full flex items-center gap-2.5 pl-3 pr-3 py-1.5 rounded-r-lg border-l-2 text-xs text-left transition-all duration-150 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-accent ${
    isActive
      ? 'border-accent bg-accent-soft text-accent font-semibold shadow-xs'
      : 'border-transparent text-ink-muted hover:text-ink hover:bg-panel-muted/80'
  }`}
>
  {({ isActive }) => (
    <>
      <Icon className={`w-3.5 h-3.5 shrink-0 transition-colors duration-150 ${isActive ? 'text-accent' : 'text-ink-faint'}`} />
      <span className="truncate">{t(item.labelKey)}</span>
    </>
  )}
</NavLink>
```

Chuỗi lớp CSS chép **nguyên văn** từ bản `<button>` cũ. `NavLink` tự đặt `aria-current="page"` khi khớp, nên bỏ dòng `aria-current` viết tay.

- [ ] **Step 4: Sửa `AppLayout.tsx`**

Bỏ hai prop khi gọi `<Sidebar>`, và bỏ `activeTab`, `setActiveTab` khỏi `useWork()` nếu không còn dùng:

```tsx
<Sidebar
  isOpenMobile={isMobileMenuOpen}
  onCloseMobile={handleCloseMobileMenu}
/>
```

- [ ] **Step 5: Sửa `CommandPalette.tsx`**

Thay `setActiveTab` bằng điều hướng:

```tsx
import { useNavigate } from 'react-router';
```

```tsx
const navigate = useNavigate();

const handleSelect = useCallback((path: string) => {
  navigate(path);
  onClose();
}, [navigate, onClose]);
```

Chỗ gọi đổi từ `handleSelect(item.id)` sang `handleSelect(item.path)`, và trong `handleKeyDown` đổi `handleSelect(filteredItems[selectedIndex].id)` sang `.path`. Bỏ `useWork` khỏi tệp nếu không còn dùng.

- [ ] **Step 6: Chạy test**

Chạy: `npx vitest run src/components/__tests__/Sidebar.test.tsx src/components/__tests__/routing.test.tsx`
Kỳ vọng: PASS.

- [ ] **Step 7: Chạy toàn bộ**

Chạy: `npm run build && npm test && npm run lint`
Kỳ vọng: cả ba xanh. Lint sẽ bắt import thừa nếu xoá sót.

- [ ] **Step 8: Kiểm bằng trình duyệt**

Kiểm ba điều, ghi vào báo cáo:

1. `document.querySelectorAll('aside nav a').length` phải bằng 19, `...button').length` phải bằng 0.
2. Bấm một mục → điều hướng đúng, mục đó nhận `aria-current="page"`.
3. Bấm `Ctrl + K`, gõ `tsbd`, chọn kết quả → sang đúng màn Định giá TSĐB, thanh địa chỉ đổi.

- [ ] **Step 9: Commit**

```bash
git add src/components/Sidebar.tsx src/components/CommandPalette.tsx src/components/AppLayout.tsx src/components/__tests__/Sidebar.test.tsx
git commit -m "feat(dieu-huong): thanh ben va bang lenh dung lien ket that"
```

---

## Task 4: Header thôi truy vấn cơ sở dữ liệu mỗi 30 giây

Spec §6.3. `Header` hiện chạy `supabase.from('Customers').select('Id').limit(1)` **mỗi 30 giây, ở mọi màn, suốt phiên làm việc**, chỉ để hiện chấm "Trực tuyến". Với mười chuyên viên mở máy cả ngày, đó là khoảng 9.600 truy vấn mỗi ngày không phục vụ nghiệp vụ nào.

**Files:**
- Modify: `src/components/Header.tsx`
- Create: `src/components/__tests__/Header.test.ts`

**Interfaces:**
- Consumes: không có
- Produces: `Header` không còn nhập `supabase`

- [ ] **Step 1: Viết test thất bại**

Tạo `src/components/__tests__/Header.test.ts`:

Test này đọc mã nguồn dạng văn bản nên **không cần DOM**, đừng khai `// @vitest-environment jsdom`.

```tsx
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const nguon = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../Header.tsx'),
  'utf8'
);

describe('Header không tự truy vấn cơ sở dữ liệu', () => {
  it('không nhập supabase', () => {
    expect(nguon).not.toContain("from '../lib/supabase'");
  });

  it('không đặt vòng lặp định kỳ', () => {
    expect(nguon).not.toContain('setInterval');
  });

  it('trạng thái kết nối đọc từ trình duyệt', () => {
    expect(nguon).toContain('navigator.onLine');
  });
});
```

- [ ] **Step 2: Chạy test, xác nhận đỏ**

Chạy: `npx vitest run src/components/__tests__/Header.test.ts`
Kỳ vọng: FAIL cả ba.

- [ ] **Step 3: Sửa `Header.tsx`**

Bỏ `import { supabase } from '../lib/supabase';`, bỏ hàm `checkConnection` và khối `useEffect` gọi `setInterval`. Thay bằng:

```tsx
const [isOnline, setIsOnline] = useState(navigator.onLine);

useEffect(() => {
  const len = () => setIsOnline(true);
  const xuong = () => setIsOnline(false);
  window.addEventListener('online', len);
  window.addEventListener('offline', xuong);
  return () => {
    window.removeEventListener('online', len);
    window.removeEventListener('offline', xuong);
  };
}, []);
```

Bỏ `useCallback` khỏi danh sách nhập nếu không còn dùng. Phần hiển thị chấm và chữ giữ **nguyên văn** — kiểu `isOnline === false` đổi thành `!isOnline`, còn lớp CSS không đổi một ký tự nào.

- [ ] **Step 4: Chạy test, xác nhận xanh**

Chạy: `npx vitest run src/components/__tests__/Header.test.ts`
Kỳ vọng: PASS, 3 test.

- [ ] **Step 5: Chạy toàn bộ**

Chạy: `npm run build && npm test && npm run lint`
Kỳ vọng: cả ba xanh.

- [ ] **Step 6: Kiểm bằng trình duyệt**

Mở tab Network của công cụ nhà phát triển, hoặc dùng `mcp__Claude_Browser__read_network_requests` lọc theo `Customers`. Để ứng dụng chạy yên khoảng một phút.

Kỳ vọng: **không** có truy vấn `Customers?select=Id&limit=1` lặp lại. Trước khi sửa thì cứ 30 giây có một cái.

Kiểm thêm: chấm trạng thái vẫn hiện, vẫn xanh khi có mạng.

- [ ] **Step 7: Commit**

```bash
git add src/components/Header.tsx src/components/__tests__/Header.test.ts
git commit -m "perf(header): thoi truy van CSDL moi 30 giay de hien cham truc tuyen"
```

---

## Task 5: Đối chiếu, dọn và ghi quy ước

**Files:**
- Modify: `CONVENTIONS.md`

**Interfaces:**
- Consumes: mốc từ Task 0
- Produces: không có mã

- [ ] **Step 1: Đối chiếu với mốc Task 0**

Chạy lại đúng đoạn mã ở Task 0 Step 3 qua `javascript_tool`, so với `docs/superpowers/anh-moc/dot-1a/van-tay-truoc.json`:

| Số đo | Trước | Sau | |
| :--- | :--- | :--- | :--- |
| `soNutSidebar` | 19 | 0 | nay là thẻ liên kết |
| `soTheLienKet` | 0 | 19 | |
| `soNhom` | 5 | 5 | **phải giữ nguyên** |
| `theLoaiNutSidebar` | `BUTTON` | `A` | |
| F5 giữ nguyên màn | không | **có** | đây là mục tiêu của đợt |

- [ ] **Step 2: Kiểm bốn hành vi điều hướng lần cuối**

Ghi kết quả từng cái vào báo cáo: bấm mục thì URL đổi · F5 giữ nguyên màn · nút Back quay về màn trước · đường dẫn lạ chuyển hướng về Tổng quan.

- [ ] **Step 3: Thêm mục định tuyến vào `CONVENTIONS.md`**

Thêm vào §15, sau mục "Thang chữ":

```markdown
### Định tuyến

`react-router` v7. Bảng đường dẫn khai một chỗ ở `src/lib/routes.ts`; `src/lib/navigation.ts`
đọc từ đó nên thanh bên, bảng lệnh và bộ định tuyến không thể lệch nhau. Thêm màn là sửa
hai tệp đó, không sửa `App.tsx`.

`vercel.json` đã có sẵn rewrite `/(.*) → /index.html`, nên F5 ở đường dẫn con không ra 404
trên bản đã triển khai. Đừng gỡ dòng đó.

Đường dẫn viết **tiếng Anh**, chữ thường, không có gạch chéo ở cuối — chốt 20/08/2026 để tránh rắc rối mã hoá và công cụ. Chúng bám sát `ScreenId`, cộng tiền tố nhóm `/tools/` và `/reference/`. Test
`src/lib/__tests__/routes.test.ts` giữ ba quy tắc đó.

**Cầu tạm cần gỡ.** `WorkContext.activeTab` và `setActiveTab` giữ nguyên chữ ký cũ nhưng nay
đọc ghi URL, để 19 màn chưa viết lại vẫn chạy. Đây là **đích chưa phải hiện trạng**: màn nào
được viết lại ở đợt 3–7 thì chuyển sang `useNavigate` và bỏ `setActiveTab` khỏi tệp đó. Khi màn
cuối cùng chuyển xong, gỡ hai thứ này khỏi `WorkContext`.

Sáu màn hồ sơ khách hàng hiện dùng đường dẫn phẳng (`/loans`, `/collaterals`…). Đợt 1b lồng chúng
vào `/customers/:id/` theo spec §6.1. Mười ba đường dẫn còn lại đã là hình cuối.
```

- [ ] **Step 4: Sửa mục nói về Header nếu có**

Tìm trong `CONVENTIONS.md` chỗ nào mô tả Header tự kiểm tra kết nối. Nếu có, sửa cho khớp: nay đọc `navigator.onLine`, không truy vấn cơ sở dữ liệu.

- [ ] **Step 5: Chạy đủ bộ kiểm chứng**

```bash
npm test && npm run build && npm run lint
```

- [ ] **Step 6: Commit**

```bash
git add CONVENTIONS.md
git commit -m "docs(quy-uoc): them muc dinh tuyen va cau tam can go"
```

---

## Kết thúc đợt 1a

- [ ] **Xác nhận 19 màn vẫn chạy**

Mở lần lượt cả 19 màn qua thanh bên. Mỗi màn phải dựng lên được, không trắng màn, không lỗi trong bảng điều khiển trình duyệt. Dùng `mcp__Claude_Browser__read_console_messages` với `onlyErrors: true` sau khi đi hết một lượt.

Đây là tiêu chí đỗ/trượt của cả đợt.

- [ ] **Xác nhận không màn nào đổi diện mạo**

Đợt này đổi hành vi điều hướng, không đổi hình thức. Thanh bên phải trông y hệt: cùng 5 nhóm, cùng 19 nhãn, cùng thứ tự, cùng màu khi được chọn.

- [ ] **Ghi phần bàn giao vào mô tả pull request**

> Kiểm giúp: mở vài màn rồi F5 — phải ở nguyên chỗ đó. Bấm Back — phải quay về màn trước chứ không thoát app. Copy đường dẫn gửi cho đồng nghiệp — phải mở đúng màn đó.

---

## Đợt tiếp theo

Đợt 1b (`useSelectedCustomer` đọc `:id` từ URL, thanh ngữ cảnh khách hàng, chuyển bốn controller khỏi `WorkContext.selectedCustomerId`, luồng giải ngân qua URL) lập kế hoạch riêng khi đợt 1a xong và được duyệt.

Việc cần đo trước khi lập kế hoạch 1b: thanh ngữ cảnh cần dư nợ và hạn mức khả dụng, mà hai số đó phải tính từ `summarizeCreditContracts` trên hợp đồng tín dụng cộng khoản vay cộng lịch trả nợ. Bốn controller hiện mỗi cái tự nạp một bản riêng. **Đo độ trễ thật trước khi quyết** nạp chung hay nạp riêng — đừng đếm số dòng rồi kết luận là nhẹ.
