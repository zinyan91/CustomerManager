# Đợt 1b — Ngữ cảnh khách hàng trên URL

> **Cho người thi công:** BẮT BUỘC dùng kỹ năng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để thi công từng task một. Các bước dùng ô đánh dấu (`- [ ]`).

**Mục tiêu:** URL trở thành nguồn sự thật duy nhất về "đang xem khách hàng nào", kèm một thanh ngữ cảnh khách hàng dùng chung cho năm màn hồ sơ; gỡ hết `WorkContext`.

**Kiến trúc:** Năm màn hồ sơ có thêm biến thể lồng `/customers/:customerId/<màn>` bên cạnh đường dẫn phẳng cũ. Đường phẳng = *chưa chọn khách*, đường lồng = *đã chọn khách*. Một hook `useSelectedCustomerId()` đọc `:customerId` từ `useParams`; một hook `useCustomerContext()` nạp bốn truy vấn song song để tính dư nợ, hạn mức khả dụng và nhóm nợ; `CustomerContextBar` render trong `AppLayout` khi URL có `:customerId`. Bốn controller và hai màn bỏ `WorkContext`, sau đó xoá luôn tệp `WorkContext.tsx`.

**Công nghệ:** React 19 · TypeScript · `react-router` v7 · Vitest + Testing Library · Supabase JS · Tailwind (token ngữ nghĩa).

**Bản thiết kế:** `docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md` — §6.1 Định tuyến, §6.2 Thanh ngữ cảnh khách hàng, §6.3 Header thôi ping CSDL. Bản thiết kế là **thẩm quyền cao nhất**; kế hoạch này chỉ diễn giải nó.

**Trạng thái nền:** `docs/superpowers/TRANG-THAI.md`

---

## Ràng buộc toàn cục

Áp cho **mọi** task, không nhắc lại ở từng task:

- **Không viết chú thích trong mã.** Giải thích "vì sao" thuộc `CONVENTIONS.md`, không thuộc `.tsx` / `.ts`.
- **Dùng ở hai nơi trở lên thì rút về `src/lib/`** ngay trong đợt sửa, không để nhân bản.
- Đường dẫn viết **tiếng Anh, chữ thường, không gạch chéo cuối** — chốt 20/08/2026.
- Định danh trên URL là **`Id` số** của khách hàng, **không dùng CIF**. CIF nằm trong lịch sử trình duyệt và log máy chủ là lộ định danh khách hàng thật.
- Màu chỉ mang nghĩa: `pos` cho số tiền dương, `accent` cho ngày tháng, `neg`/`warn` cho cảnh báo, `DEBT_GROUP_COLOR[n]` cho nhóm nợ. **Không** đặt tên lớp động kiểu `bg-g${n}` — Tailwind quét tĩnh, lớp đó không sinh ra.
- Chuỗi class dùng chung lấy từ `src/lib/uiClasses.ts` (`PANEL`, `SECTION_LABEL`, `BTN_SECONDARY`, `RADIUS_PILL`, `DEBT_GROUP_COLOR`, `DEBT_GROUP_TEXT`). **Không truyền chuỗi class qua props** — mã mới cấm thêm props kiểu `containerCardBg`, `inputStyle`.
- **Không note giải thích trong giao diện.** Nhãn + số liệu là đủ.
- Chữ in hoa chỉ dùng cho nhãn 10–11px.
- Nền trạng thái đặc (`bg-neg`, `bg-warn`, `bg-pos`) đi kèm chữ `text-surface`, không phải `text-white`.
- **Thêm màn phải sửa BA chỗ**: `src/lib/routes.ts` · `src/lib/navigation.ts` · `src/App.tsx`. Quên chỗ thứ ba thì mục menu vẫn hiện nhưng bấm vào lặng lẽ về `/dashboard`.
- **Test không được tự khẳng định chính nó.** Viết test xong phải tự phá dữ liệu đầu vào (xoá một phần tử khỏi bảng khai báo, sửa một hằng số) rồi xem test có đỏ không. Nếu không đỏ thì test đó vô dụng.
- **Test không được gọi mạng.** Mọi test chạm `src/lib/api` phải `vi.mock`. Phép thử chắc chắn: đổi tên `.env` rồi chạy lại, test vẫn phải xanh.
- Mỗi task kết thúc bằng một commit. Chạy `npm test` và `npm run build` trước khi commit; cả hai phải xanh.
- Thông báo lỗi/thành công đi qua `Toast` (`src/components/Toast.tsx`). Không `window.alert`.

### Số đo đã có, đừng đo lại

Đo ngày 20/08/2026 bằng `EXPLAIN (ANALYZE)` trên CSDL thật, đặt `role authenticated` + `request.jwt.claims` để RLS thực sự chạy. Khách nặng nhất là `CustomerId = 55` (6 KUNN, 1.420 dòng `RepaymentSchedules`; toàn bảng 10.350 dòng / 112 KUNN / 51 khách).

| Truy vấn | Thời gian | Dòng trả về |
| :--- | ---: | ---: |
| `RepaymentSchedules` theo **một** `ContractId`, `select *` — cách bốn controller đang dùng | 66,2 ms → 30,7 ms (lần 2) | 240 |
| ×6 KUNN của một khách, tuần tự | **~180–400 ms + 6 lượt mạng** | 1.420 |
| `RepaymentSchedules` gộp `in(6 ContractId)`, `select *` | 174,5 ms | 1.420 |
| **`ContractPaidPrincipal` lọc `in(6 ContractId)`** | **11,1 / 11,8 ms** | **6** |
| `ContractPaidPrincipal` không lọc (Tổng quan đang dùng) | 23,7 ms | 130 |
| Lịch quá hạn, cột hẹp, `DueDate < today` + chưa trả | **1,9 ms** | 0 |
| `CreditContracts` theo `CustomerId` | 3,3 ms | 1 |
| `LoanContracts` theo `CustomerId` | 2,5 ms | 6 |

**Nguyên nhân chênh 20 lần:** RLS gắn `can_access_contract("ContractId")` thành **bộ lọc từng dòng** trên `RepaymentSchedules` — đọc 1.420 dòng là gọi hàm 1.420 lần. View `ContractPaidPrincipal` gộp trong một CTE `MATERIALIZED` **trước**, rồi mới lọc, nên chỉ gọi hàm 130 lần (một lần mỗi hợp đồng).

**Phán quyết:** thanh ngữ cảnh **nạp dữ liệu riêng**, bốn truy vấn song song ≈ **21 ms DB / 1 lượt mạng**. Không dùng chung đường nạp lịch trả nợ của controller, không nạp lịch trả nợ thô. Dư nợ lấy từ `ContractPaidPrincipal`, nhóm nợ lấy từ truy vấn lịch quá hạn cột hẹp.

### Quyết định định tuyến (chủ dự án chốt 20/08/2026)

**Giữ cả hai họ đường dẫn.**

| | Đường dẫn | Nghĩa |
| :--- | :--- | :--- |
| Phẳng | `/loans`, `/credit-contracts`, `/collaterals`, `/credit-cards`, `/post-loan-control` | Chưa chọn khách. Màn hiện ô tìm / ô chọn khách như hiện nay. `/post-loan-control` hiện **toàn danh mục** |
| Lồng | `/customers/:customerId/loans`, `…/credit-contracts`, `…/collaterals`, `…/credit-cards`, `…/post-loan-control` | Đã chọn khách. Thanh ngữ cảnh hiện ra |
| Thêm | `/customers/:customerId/profile` | Mở ngăn kéo hồ sơ khách hàng |
| Thêm | `/customers/:customerId/loans/:kunnId/schedule` | Mở thẳng tab Lịch trả nợ của một KUNN |

Đường lồng và đường phẳng render **cùng một component**. Khác biệt duy nhất là `useSelectedCustomerId()` trả `null` hay một số.

---

## Cấu trúc tệp

### Tạo mới

| Tệp | Trách nhiệm |
| :--- | :--- |
| `src/lib/customerRoutes.ts` | Hàm thuần dựng và đọc đường dẫn có `:customerId`. Không import React |
| `src/lib/__tests__/customerRoutes.test.ts` | Test cho trên |
| `src/hooks/useSelectedCustomerId.ts` | `useSelectedCustomerId()` + `useCustomerNavigate()` — cầu nối duy nhất giữa URL và mã màn hình |
| `src/hooks/__tests__/useSelectedCustomerId.test.tsx` | Test cho trên |
| `src/lib/customerContext.ts` | Hàm thuần `buildCustomerContext()` — gộp HĐTD + KUNN + gốc đã trả + lịch quá hạn thành số liệu thanh ngữ cảnh |
| `src/lib/__tests__/customerContext.test.ts` | Test cho trên |
| `src/hooks/useCustomerContext.ts` | Nạp bốn truy vấn song song rồi gọi `buildCustomerContext` |
| `src/hooks/__tests__/useCustomerContext.test.tsx` | Test cho trên, `vi.mock` toàn bộ `src/lib/api` |
| `src/components/CustomerContextBar.tsx` | Thanh ngữ cảnh |
| `src/components/__tests__/CustomerContextBar.test.tsx` | Test cho trên |
| `src/lib/apiHealth.ts` | Kênh ghi nhận kết quả lần gọi API thật gần nhất (§6.3 nửa sau) |
| `src/lib/__tests__/apiHealth.test.ts` | Test cho trên |
| `src/hooks/useApiHealth.ts` | `useSyncExternalStore` bọc `apiHealth` |

### Sửa

| Tệp | Sửa gì |
| :--- | :--- |
| `src/App.tsx` | Thêm 7 tuyến lồng |
| `src/components/AppLayout.tsx` | Render `CustomerContextBar` |
| `src/components/Sidebar.tsx` | Mục màn hồ sơ trỏ tới đường lồng khi đang có khách |
| `src/lib/api/loanContractApi.ts` | Thêm `fetchPaidPrincipalForContractsAPI`, `fetchOverdueSchedulesAPI` |
| `src/lib/supabase.ts` | `global.fetch` bọc để ghi `apiHealth` |
| `src/components/Header.tsx` | Chấm trạng thái đọc thêm `apiHealth` |
| `src/lib/i18n.ts` | Thêm khoá `header.serverUnreachable` cho `vi` và `en` |
| `src/hooks/useCreditContractController.ts` | Bỏ `useWork` |
| `src/hooks/useCardContractController.ts` | Bỏ `useWork` |
| `src/hooks/usePostLoanControlController.ts` | Bỏ `useWork` |
| `src/hooks/useLoanPortfolioController.ts` | Bỏ `useWork`, `disburseRequest` đọc từ query |
| `src/hooks/useCustomerPortfolio.ts` | Nhận id từ URL |
| `src/hooks/useCollateralController.ts` | Lọc theo `:customerId` |
| `src/components/views/CustomerListView.tsx` | `navigate` thay `setActiveTab` |
| `src/components/views/DashboardView.tsx` | `navigate` thay `setActiveTab` |
| `src/components/views/CreditContractView.tsx` | Ô chọn khách điều hướng |
| `src/components/views/CardContractView.tsx` | Ô chọn khách điều hướng |
| `src/components/views/PostLoanControlView.tsx` | Ô chọn khách điều hướng |
| `src/components/views/LoanPortfolioView.tsx` | Xoá khách điều hướng |
| `src/components/views/CollateralView.tsx` | Nhận phạm vi khách |
| `src/components/__tests__/routing.test.tsx` | Phủ tuyến lồng |
| `CONVENTIONS.md` §15 | Cập nhật mục "Định tuyến" |
| `docs/superpowers/TRANG-THAI.md` | Cập nhật sau mỗi task |

### Xoá

| Tệp | Vì sao |
| :--- | :--- |
| `src/context/WorkContext.tsx` | Sau task 14 không còn ai đọc |
| `src/context/__tests__/WorkContext.test.tsx` | Cùng lý do |

---

## Task 1: Bảng đường dẫn có `:customerId`

**Tệp:**
- Tạo: `src/lib/customerRoutes.ts`
- Test: `src/lib/__tests__/customerRoutes.test.ts`

**Giao diện:**
- Tiêu thụ: `ScreenId` và `ROUTE_OF` đã có ở `src/lib/navigation.ts` / `src/lib/routes.ts`.
- Sản xuất (task sau dựa vào đúng các tên này):
  - `CUSTOMER_SCOPED_SCREENS: readonly CustomerScopedScreen[]`
  - `type CustomerScopedScreen = 'credit-contracts' | 'loans' | 'collaterals' | 'credit-cards' | 'post-loan'`
  - `isCustomerScopedScreen(id: ScreenId): id is CustomerScopedScreen`
  - `customerPath(screen: CustomerScopedScreen, customerId: number): string`
  - `customerProfilePath(customerId: number): string`
  - `kunnSchedulePath(customerId: number, kunnId: number): string`
  - `screenPathFor(screen: ScreenId, customerId: number | null): string`
  - `parseCustomerPath(pathname: string): ParsedCustomerPath | null`
  - `interface ParsedCustomerPath { customerId: number; screen: CustomerScopedScreen | 'profile'; kunnId: number | null }`

- [ ] **Bước 1: Viết test đỏ**

Tạo `src/lib/__tests__/customerRoutes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ROUTE_OF } from '../routes';
import {
  CUSTOMER_SCOPED_SCREENS, isCustomerScopedScreen,
  customerPath, customerProfilePath, kunnSchedulePath,
  screenPathFor, parseCustomerPath,
} from '../customerRoutes';

describe('customerRoutes — dựng đường dẫn', () => {
  it('năm màn hồ sơ đều có đường lồng, ghép từ ROUTE_OF nên không lệch được', () => {
    for (const s of CUSTOMER_SCOPED_SCREENS) {
      expect(customerPath(s, 55)).toBe(`/customers/55${ROUTE_OF[s]}`);
    }
  });

  it('phạm vi khách gồm đúng năm màn, không hơn không kém', () => {
    expect([...CUSTOMER_SCOPED_SCREENS].sort()).toEqual(
      ['collaterals', 'credit-cards', 'credit-contracts', 'loans', 'post-loan']
    );
  });

  it('màn ngoài phạm vi khách thì không nhận', () => {
    expect(isCustomerScopedScreen('dashboard')).toBe(false);
    expect(isCustomerScopedScreen('settings')).toBe(false);
    expect(isCustomerScopedScreen('loans')).toBe(true);
  });

  it('hồ sơ và lịch trả nợ của một KUNN', () => {
    expect(customerProfilePath(7)).toBe('/customers/7/profile');
    expect(kunnSchedulePath(7, 912)).toBe('/customers/7/loans/912/schedule');
  });

  it('screenPathFor trả đường phẳng khi chưa có khách', () => {
    expect(screenPathFor('loans', null)).toBe('/loans');
    expect(screenPathFor('loans', 55)).toBe('/customers/55/loans');
    expect(screenPathFor('dashboard', 55)).toBe('/dashboard');
  });
});

describe('customerRoutes — đọc ngược đường dẫn', () => {
  it('đọc được năm màn lồng', () => {
    expect(parseCustomerPath('/customers/55/loans'))
      .toEqual({ customerId: 55, screen: 'loans', kunnId: null });
    expect(parseCustomerPath('/customers/55/post-loan-control'))
      .toEqual({ customerId: 55, screen: 'post-loan', kunnId: null });
  });

  it('đọc được hồ sơ và lịch trả nợ', () => {
    expect(parseCustomerPath('/customers/7/profile'))
      .toEqual({ customerId: 7, screen: 'profile', kunnId: null });
    expect(parseCustomerPath('/customers/7/loans/912/schedule'))
      .toEqual({ customerId: 7, screen: 'loans', kunnId: 912 });
  });

  it('bỏ gạch chéo cuối', () => {
    expect(parseCustomerPath('/customers/55/loans/')?.customerId).toBe(55);
  });

  it('trả null cho đường dẫn không thuộc phạm vi khách', () => {
    expect(parseCustomerPath('/loans')).toBeNull();
    expect(parseCustomerPath('/customers')).toBeNull();
    expect(parseCustomerPath('/customers/abc/loans')).toBeNull();
    expect(parseCustomerPath('/customers/55/khong-co-man-nay')).toBeNull();
    expect(parseCustomerPath('')).toBeNull();
  });
});
```

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/lib/__tests__/customerRoutes.test.ts
```

Kỳ vọng: ĐỎ, `Failed to resolve import "../customerRoutes"`.

- [ ] **Bước 3: Viết `src/lib/customerRoutes.ts`**

```ts
import type { ScreenId } from './navigation';
import { ROUTE_OF } from './routes';

export const CUSTOMER_SCOPED_SCREENS = [
  'credit-contracts', 'loans', 'collaterals', 'credit-cards', 'post-loan',
] as const;

export type CustomerScopedScreen = typeof CUSTOMER_SCOPED_SCREENS[number];

export interface ParsedCustomerPath {
  customerId: number;
  screen: CustomerScopedScreen | 'profile';
  kunnId: number | null;
}

const SCREEN_OF_SEGMENT = new Map<string, CustomerScopedScreen>(
  CUSTOMER_SCOPED_SCREENS.map(s => [ROUTE_OF[s].slice(1), s])
);

export function isCustomerScopedScreen(id: ScreenId): id is CustomerScopedScreen {
  return (CUSTOMER_SCOPED_SCREENS as readonly string[]).includes(id);
}

export function customerPath(screen: CustomerScopedScreen, customerId: number): string {
  return `/customers/${customerId}${ROUTE_OF[screen]}`;
}

export function customerProfilePath(customerId: number): string {
  return `/customers/${customerId}/profile`;
}

export function kunnSchedulePath(customerId: number, kunnId: number): string {
  return `${customerPath('loans', customerId)}/${kunnId}/schedule`;
}

export function screenPathFor(screen: ScreenId, customerId: number | null): string {
  if (customerId !== null && isCustomerScopedScreen(screen)) {
    return customerPath(screen, customerId);
  }
  return ROUTE_OF[screen];
}

export function parseCustomerPath(pathname: string): ParsedCustomerPath | null {
  if (!pathname) return null;
  const parts = pathname.replace(/\/+$/, '').split('/').filter(Boolean);
  if (parts.length < 3 || parts[0] !== 'customers') return null;

  if (!/^\d+$/.test(parts[1])) return null;
  const customerId = Number(parts[1]);

  if (parts[2] === 'profile') {
    return parts.length === 3 ? { customerId, screen: 'profile', kunnId: null } : null;
  }

  const screen = SCREEN_OF_SEGMENT.get(parts[2]);
  if (!screen) return null;

  if (parts.length === 3) return { customerId, screen, kunnId: null };

  if (screen === 'loans' && parts.length === 5 && parts[4] === 'schedule' && /^\d+$/.test(parts[3])) {
    return { customerId, screen, kunnId: Number(parts[3]) };
  }

  return null;
}
```

- [ ] **Bước 4: Chạy lại**

```bash
npx vitest run src/lib/__tests__/customerRoutes.test.ts
```

Kỳ vọng: XANH, 9 test.

- [ ] **Bước 5: Tự phá để kiểm chứng test có răng**

Tạm xoá `'collaterals'` khỏi `CUSTOMER_SCOPED_SCREENS`, chạy lại. Kỳ vọng: test *"phạm vi khách gồm đúng năm màn"* ĐỎ. Khôi phục lại rồi chạy lần nữa cho xanh.

- [ ] **Bước 6: Commit**

```bash
git add src/lib/customerRoutes.ts src/lib/__tests__/customerRoutes.test.ts && git commit -m "feat(dinh-tuyen): bang duong dan co :customerId"
```

---

## Task 2: Tuyến lồng trong `App.tsx` + hook đọc `:customerId`

**Tệp:**
- Tạo: `src/hooks/useSelectedCustomerId.ts`, `src/hooks/__tests__/useSelectedCustomerId.test.tsx`
- Sửa: `src/App.tsx`, `src/components/__tests__/routing.test.tsx`

**Giao diện:**
- Tiêu thụ: `customerPath`, `screenPathFor`, `parseCustomerPath` (Task 1).
- Sản xuất:
  - `useSelectedCustomerId(): number | null`
  - `useCustomerNavigate(): (customerId: number | null) => void` — giữ nguyên màn đang xem, chỉ đổi khách; `null` đưa về đường phẳng.

Tham số tuyến đặt tên `customerId` (khớp `useParams<{ customerId: string }>()`).

- [ ] **Bước 1: Viết test đỏ cho hook**

Tạo `src/hooks/__tests__/useSelectedCustomerId.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { useSelectedCustomerId, useCustomerNavigate } from '../useSelectedCustomerId';

afterEach(cleanup);

function Probe() {
  const id = useSelectedCustomerId();
  const doiKhach = useCustomerNavigate();
  const { pathname } = useLocation();
  return (
    <div>
      <span data-testid="id">{id === null ? 'null' : String(id)}</span>
      <span data-testid="path">{pathname}</span>
      <button type="button" onClick={() => doiKhach(77)}>doi-sang-77</button>
      <button type="button" onClick={() => doiKhach(null)}>bo-khach</button>
    </div>
  );
}

function dungLen(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/loans" element={<Probe />} />
        <Route path="/customers/:customerId/loans" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('useSelectedCustomerId', () => {
  it('đường phẳng thì không có khách', () => {
    dungLen('/loans');
    expect(screen.getByTestId('id').textContent).toBe('null');
  });

  it('đường lồng thì đọc ra Id số', () => {
    dungLen('/customers/55/loans');
    expect(screen.getByTestId('id').textContent).toBe('55');
  });

  it('đứng ở tuyến cha, không có useParams, thì đọc từ đường dẫn', () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans']}>
        <Routes>
          <Route path="*" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('id').textContent).toBe('55');
  });
});

describe('useCustomerNavigate', () => {
  it('đổi khách thì giữ nguyên màn, chỉ đổi Id', () => {
    dungLen('/customers/55/loans');
    fireEvent.click(screen.getByText('doi-sang-77'));
    expect(screen.getByTestId('path').textContent).toBe('/customers/77/loans');
  });

  it('từ đường phẳng chọn khách thì nhảy sang đường lồng của chính màn đó', () => {
    dungLen('/loans');
    fireEvent.click(screen.getByText('doi-sang-77'));
    expect(screen.getByTestId('path').textContent).toBe('/customers/77/loans');
  });

  it('bỏ khách thì về đường phẳng của chính màn đó', () => {
    dungLen('/customers/55/loans');
    fireEvent.click(screen.getByText('bo-khach'));
    expect(screen.getByTestId('path').textContent).toBe('/loans');
  });
});
```

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/hooks/__tests__/useSelectedCustomerId.test.tsx
```

Kỳ vọng: ĐỎ, không phân giải được import.

- [ ] **Bước 3: Viết `src/hooks/useSelectedCustomerId.ts`**

```ts
import { useCallback } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { DEFAULT_ROUTE, screenIdOfPath } from '../lib/routes';
import {
  isCustomerScopedScreen, parseCustomerPath, screenPathFor,
  type CustomerScopedScreen,
} from '../lib/customerRoutes';

export function useSelectedCustomerId(): number | null {
  const { customerId } = useParams<{ customerId: string }>();
  const { pathname } = useLocation();

  if (customerId && /^\d+$/.test(customerId)) return Number(customerId);
  return parseCustomerPath(pathname)?.customerId ?? null;
}

function screenOfLocation(pathname: string): CustomerScopedScreen | null {
  const long = parseCustomerPath(pathname);
  if (long && long.screen !== 'profile') return long.screen;

  const phang = screenIdOfPath(pathname);
  if (phang && isCustomerScopedScreen(phang)) return phang;

  return null;
}

export function useCustomerNavigate(): (customerId: number | null) => void {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return useCallback((customerId: number | null) => {
    const screen = screenOfLocation(pathname);
    if (!screen) {
      navigate(customerId === null ? DEFAULT_ROUTE : `/customers/${customerId}/loans`);
      return;
    }
    navigate(screenPathFor(screen, customerId));
  }, [navigate, pathname]);
}
```

- [ ] **Bước 4: Chạy lại hook test**

```bash
npx vitest run src/hooks/__tests__/useSelectedCustomerId.test.tsx
```

Kỳ vọng: XANH, 6 test.

- [ ] **Bước 5: Viết test đỏ cho tuyến lồng**

Thêm vào cuối `src/components/__tests__/routing.test.tsx`:

```tsx
describe('tuyến lồng theo khách hàng', () => {
  function dungAppO(duongDan: string) {
    return render(
      <MemoryRouter initialEntries={[duongDan]}>
        <ThemeProvider>
          <LanguageProvider>
            <WorkProvider>
              <AppThatDuoiTest />
            </WorkProvider>
          </LanguageProvider>
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  const CAP = [
    ['/customers/55/credit-contracts', 'credit-contracts'],
    ['/customers/55/loans', 'loans'],
    ['/customers/55/collaterals', 'collaterals'],
    ['/customers/55/credit-cards', 'credit-cards'],
    ['/customers/55/post-loan-control', 'post-loan'],
  ] as const;

  it.each(CAP)('%s dựng đúng màn %s', async (path, id) => {
    dungAppO(path);
    expect(await screen.findByText(`MAN:${id}`)).toBeTruthy();
  });

  it('đường lồng lạ vẫn về Tổng quan, không màn trắng', async () => {
    dungAppO('/customers/55/khong-co-man-nay');
    expect(await screen.findByText('MAN:dashboard')).toBeTruthy();
  });

  it('Id không phải số thì màn vẫn dựng, ở trạng thái chưa chọn khách', async () => {
    dungAppO('/customers/abc/loans');
    expect(await screen.findByText('MAN:loans')).toBeTruthy();
  });
});
```

Test cuối phản ánh đúng thiết kế: `:customerId` không phải số vẫn khớp tuyến, nhưng `useSelectedCustomerId()` trả `null` nên màn render ở trạng thái chưa chọn khách — không trắng, không lỗi.

- [ ] **Bước 6: Chạy để chắc nó đỏ**

```bash
npx vitest run src/components/__tests__/routing.test.tsx
```

Kỳ vọng: ĐỎ — năm đường lồng đều rơi vào tuyến `*` nên render `MAN:dashboard` chứ không phải màn mong đợi.

- [ ] **Bước 7: Thêm tuyến lồng vào `src/App.tsx`**

Chèn ngay trước dòng `<Route path="*" …>`:

```tsx
        <Route path={`/customers/:customerId${ROUTE_OF['credit-contracts']}`} element={<Suspense fallback={<ViewSkeleton />}><CreditContractView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF.loans}`} element={<Suspense fallback={<ViewSkeleton />}><LoanPortfolioView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF.loans}/:kunnId/schedule`} element={<Suspense fallback={<ViewSkeleton />}><LoanPortfolioView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF.collaterals}`} element={<Suspense fallback={<ViewSkeleton />}><CollateralView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF['credit-cards']}`} element={<Suspense fallback={<ViewSkeleton />}><CardContractView /></Suspense>} />
        <Route path={`/customers/:customerId${ROUTE_OF['post-loan']}`} element={<Suspense fallback={<ViewSkeleton />}><PostLoanControlView /></Suspense>} />
        <Route path="/customers/:customerId/profile" element={<Suspense fallback={<ViewSkeleton />}><CustomerListView /></Suspense>} />
```

- [ ] **Bước 8: Chạy lại toàn bộ**

```bash
npx vitest run src/components/__tests__/routing.test.tsx && npm run build
```

Kỳ vọng: XANH.

- [ ] **Bước 9: Commit**

```bash
git add src/App.tsx src/hooks/useSelectedCustomerId.ts src/hooks/__tests__/useSelectedCustomerId.test.tsx src/components/__tests__/routing.test.tsx && git commit -m "feat(dinh-tuyen): tuyen long /customers/:customerId va hook doc :customerId"
```

---

## Task 3: Thanh bên giữ ngữ cảnh khách hàng

**Tệp:**
- Sửa: `src/components/Sidebar.tsx`
- Test: `src/components/__tests__/Sidebar.test.tsx`

**Giao diện:**
- Tiêu thụ: `useSelectedCustomerId` (Task 2), `screenPathFor`, `isCustomerScopedScreen` (Task 1).
- Sản xuất: không có API mới.

Hai chuyện phải đúng cùng lúc:
1. Đang ở `/customers/55/loans` mà bấm "Tài sản bảo đảm" thì đi tới `/customers/55/collaterals`, **không** rơi về `/collaterals` — banker không phải chọn lại khách ở từng màn.
2. Ở `/customers/55/loans`, mục sáng lên phải là **Khoản vay**, không phải **Khách hàng**. `NavLink` mặc định khớp theo tiền tố nên `/customers` sẽ tự sáng — phải chặn bằng `end` cho mục `customers` và tự tính `isActive` cho năm màn hồ sơ.

- [ ] **Bước 1: Viết test đỏ**

Thêm vào `src/components/__tests__/Sidebar.test.tsx` (giữ nguyên phần đã có):

```tsx
describe('Sidebar giữ ngữ cảnh khách hàng', () => {
  function dungLenO(duongDan: string) {
    return render(
      <MemoryRouter initialEntries={[duongDan]}>
        <LanguageProvider>
          <Routes>
            <Route path="*" element={<Sidebar />} />
          </Routes>
        </LanguageProvider>
      </MemoryRouter>
    );
  }

  it('đang có khách thì mục màn hồ sơ trỏ tới đường lồng', () => {
    const { container } = dungLenO('/customers/55/loans');
    const link = container.querySelector('a[href="/customers/55/collaterals"]');
    expect(link).toBeTruthy();
  });

  it('đang có khách thì mục ngoài phạm vi khách vẫn trỏ đường phẳng', () => {
    const { container } = dungLenO('/customers/55/loans');
    expect(container.querySelector('a[href="/dashboard"]')).toBeTruthy();
    expect(container.querySelector('a[href="/settings"]')).toBeTruthy();
  });

  it('chưa có khách thì mọi mục trỏ đường phẳng', () => {
    const { container } = dungLenO('/loans');
    expect(container.querySelector('a[href="/collaterals"]')).toBeTruthy();
    expect(container.querySelector('a[href^="/customers/"]')).toBeNull();
  });

  it('ở đường lồng thì mục sáng là màn đó, không phải mục Khách hàng', () => {
    const { container } = dungLenO('/customers/55/loans');
    const dangMo = container.querySelectorAll('[aria-current="page"]');
    expect(dangMo.length).toBe(1);
    expect(dangMo[0].getAttribute('href')).toBe('/customers/55/loans');
  });

  it('ở /customers thì mục Khách hàng sáng', () => {
    const { container } = dungLenO('/customers');
    const dangMo = container.querySelectorAll('[aria-current="page"]');
    expect(dangMo.length).toBe(1);
    expect(dangMo[0].getAttribute('href')).toBe('/customers');
  });
});
```

Bổ sung import ở đầu tệp nếu chưa có: `import { MemoryRouter, Routes, Route } from 'react-router';`

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/components/__tests__/Sidebar.test.tsx
```

Kỳ vọng: ĐỎ ở bốn test mới (mục vẫn trỏ đường phẳng, và `/customers/55/loans` làm sáng hai mục).

- [ ] **Bước 3: Sửa `src/components/Sidebar.tsx`**

Thêm import:

```tsx
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { screenPathFor } from '../lib/customerRoutes';
```

Trong thân component, trước `return`:

```tsx
  const customerId = useSelectedCustomerId();
```

Thay khối `NAV_GROUPS.map` bên trong (`group.items.map(item => {…})`):

```tsx
              {group.items.map(item => {
                const Icon = item.icon;
                const to = screenPathFor(item.id, customerId);
                const ketThuc = item.id === 'customers';
                return (
                  <NavLink
                    key={item.id}
                    to={to}
                    end={ketThuc}
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
                );
              })}
```

`screenPathFor` tự gọi `isCustomerScopedScreen` bên trong, nên mục ngoài phạm vi khách (`dashboard`, `settings`, công cụ, tra cứu) vẫn trả đường phẳng.

`Sidebar` đang bọc `memo`. Nó gọi `useSelectedCustomerId` (tức `useParams`) nên vẫn render lại đúng khi tuyến đổi; `memo` chỉ chặn render do props, không chặn render do hook.

- [ ] **Bước 4: Chạy lại**

```bash
npx vitest run src/components/__tests__/Sidebar.test.tsx
```

Kỳ vọng: XANH.

- [ ] **Bước 5: Tự phá để kiểm chứng**

Tạm đổi `const ketThuc = item.id === 'customers';` thành `const ketThuc = false;`, chạy lại. Kỳ vọng: test *"ở đường lồng thì mục sáng là màn đó"* ĐỎ vì đếm được 2 mục sáng. Khôi phục.

- [ ] **Bước 6: Commit**

```bash
git add src/components/Sidebar.tsx src/components/__tests__/Sidebar.test.tsx && git commit -m "feat(thanh-ben): giu ngu canh khach hang khi doi man"
```

---

## Task 4: Hai truy vấn rẻ cho thanh ngữ cảnh

**Tệp:**
- Sửa: `src/lib/api/loanContractApi.ts`

**Giao diện:**
- Sản xuất:
  - `fetchPaidPrincipalForContractsAPI(contractIds: number[]): Promise<Record<number, number>>`
  - `fetchOverdueSchedulesAPI(contractIds: number[], todayIso: string): Promise<RepaymentSchedule[]>`

Vì sao không dùng lại `fetchRepaymentSchedulesAPI`: xem bảng số đo ở "Ràng buộc toàn cục". Đọc lịch trả nợ thô cho một khách tốn 180–400 ms và 6 lượt mạng; hai hàm dưới tốn 11 ms và 2 ms.

`fetchPaidPrincipalMapAPI` đã có sẵn nhưng **không lọc** — Tổng quan cần cả danh mục nên giữ nguyên nó, hàm mới chỉ thêm bản lọc theo hợp đồng. Cả hai chia lô 200 `ContractId` như `fetchOutstandingSchedulesAPI` đã làm, dùng chung hằng `CONTRACT_LOT` đang có trong tệp.

- [ ] **Bước 1: Viết test đỏ**

Tạo `src/lib/api/__tests__/loanContractApi.paidPrincipal.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

const inMock = vi.fn();
const ltMock = vi.fn();
const selectMock = vi.fn();
const fromMock = vi.fn();

vi.mock('../../supabase', () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...a) },
}));

import {
  fetchPaidPrincipalForContractsAPI, fetchOverdueSchedulesAPI,
} from '../loanContractApi';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fetchPaidPrincipalForContractsAPI', () => {
  it('danh sách rỗng thì không gọi mạng', async () => {
    expect(await fetchPaidPrincipalForContractsAPI([])).toEqual({});
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('đọc view ContractPaidPrincipal, trả về bản đồ số', async () => {
    inMock.mockResolvedValue({
      data: [
        { ContractId: 1135, PaidPrincipal: '1500000' },
        { ContractId: 1136, PaidPrincipal: 0 },
      ],
      error: null,
    });
    selectMock.mockReturnValue({ in: inMock });
    fromMock.mockReturnValue({ select: selectMock });

    const map = await fetchPaidPrincipalForContractsAPI([1135, 1136]);

    expect(fromMock).toHaveBeenCalledWith('ContractPaidPrincipal');
    expect(inMock).toHaveBeenCalledWith('ContractId', [1135, 1136]);
    expect(map).toEqual({ 1135: 1500000, 1136: 0 });
  });

  it('lỗi thì ném ra, không nuốt', async () => {
    inMock.mockResolvedValue({ data: null, error: { message: 'RLS chan' } });
    selectMock.mockReturnValue({ in: inMock });
    fromMock.mockReturnValue({ select: selectMock });

    await expect(fetchPaidPrincipalForContractsAPI([1])).rejects.toThrow('RLS chan');
  });
});

describe('fetchOverdueSchedulesAPI', () => {
  it('lọc đúng: chưa trả và đã quá ngày hôm nay', async () => {
    const orMock = vi.fn();
    ltMock.mockResolvedValue({ data: [{ ContractId: 1135, DueDate: '2026-07-01' }], error: null });
    orMock.mockReturnValue({ lt: ltMock });
    inMock.mockReturnValue({ or: orMock });
    selectMock.mockReturnValue({ in: inMock });
    fromMock.mockReturnValue({ select: selectMock });

    const rows = await fetchOverdueSchedulesAPI([1135], '2026-08-20');

    expect(fromMock).toHaveBeenCalledWith('RepaymentSchedules');
    expect(orMock).toHaveBeenCalledWith('IsPaid.is.null,IsPaid.eq.false');
    expect(ltMock).toHaveBeenCalledWith('DueDate', '2026-08-20');
    expect(rows).toHaveLength(1);
  });

  it('danh sách rỗng thì không gọi mạng', async () => {
    expect(await fetchOverdueSchedulesAPI([], '2026-08-20')).toEqual([]);
    expect(fromMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/lib/api/__tests__/loanContractApi.paidPrincipal.test.ts
```

Kỳ vọng: ĐỎ, hai hàm chưa tồn tại.

- [ ] **Bước 3: Thêm hai hàm vào `src/lib/api/loanContractApi.ts`**

Đặt ngay dưới `fetchPaidPrincipalMapAPI`:

```ts
const OVERDUE_COLUMNS =
  'ContractId, DueDate, IsPaid, PrincipalAmount, InterestAmount, OverdueInterestAmount, ActualPaidPrincipal, ActualPaidInterest, PrepaidPrincipalAmount';

export async function fetchPaidPrincipalForContractsAPI(
  contractIds: number[]
): Promise<Record<number, number>> {
  if (contractIds.length === 0) return {};

  const map: Record<number, number> = {};
  for (const lot of chunk(contractIds, CONTRACT_LOT)) {
    const { data, error } = await supabase
      .from('ContractPaidPrincipal')
      .select('ContractId, PaidPrincipal')
      .in('ContractId', lot);
    if (error) throw new Error(error.message);

    for (const row of data || []) {
      const paid = Number(row.PaidPrincipal);
      if (Number.isFinite(paid)) map[row.ContractId] = paid;
    }
  }
  return map;
}

export async function fetchOverdueSchedulesAPI(
  contractIds: number[],
  todayIso: string
): Promise<RepaymentSchedule[]> {
  if (contractIds.length === 0) return [];

  const all: RepaymentSchedule[] = [];
  for (const lot of chunk(contractIds, CONTRACT_LOT)) {
    const { data, error } = await supabase
      .from('RepaymentSchedules')
      .select(OVERDUE_COLUMNS)
      .in('ContractId', lot)
      .or('IsPaid.is.null,IsPaid.eq.false')
      .lt('DueDate', todayIso);
    if (error) throw new Error(error.message);
    all.push(...((data || []) as unknown as RepaymentSchedule[]));
  }
  return all;
}
```

Dùng `.lt` chứ không phải `.lte`: quá hạn nghĩa là **trước** hôm nay, kỳ đến hạn đúng hôm nay chưa phải quá hạn.

Kiểm tra `chunk` đã được import trong tệp; nếu chưa, thêm vào cụm import sẵn có.

- [ ] **Bước 4: Chạy lại**

```bash
npx vitest run src/lib/api/__tests__/loanContractApi.paidPrincipal.test.ts
```

Kỳ vọng: XANH, 5 test.

- [ ] **Bước 5: Chứng minh test không gọi mạng**

```bash
mv .env .env.tam && npx vitest run src/lib/api/__tests__/loanContractApi.paidPrincipal.test.ts; mv .env.tam .env
```

Kỳ vọng: vẫn XANH.

- [ ] **Bước 6: Commit**

```bash
git add src/lib/api/loanContractApi.ts src/lib/api/__tests__/loanContractApi.paidPrincipal.test.ts && git commit -m "feat(api): hai truy van re cho thanh ngu canh khach hang"
```

---

## Task 5: `buildCustomerContext` — hàm thuần

**Tệp:**
- Tạo: `src/lib/customerContext.ts`, `src/lib/__tests__/customerContext.test.ts`

**Giao diện:**
- Tiêu thụ: `summarizeCreditContracts`, `totalsOfCreditContracts` (`src/lib/creditContract.ts`); `outstandingOf`, `getAutoDebtGroupInfo` (`src/lib/loanMath.ts`).
- Sản xuất:

```ts
export interface CustomerContextSummary {
  granted: number;
  outstanding: number;
  available: number;
  debtGroup: number;
  maxOverdueDays: number;
  activeKunnCount: number;
}

export function buildCustomerContext(input: {
  creditContracts: CreditContract[];
  kunns: LoanContract[];
  paidPrincipal: Record<number, number>;
  overdueSchedules: RepaymentSchedule[];
  today: string;
}): CustomerContextSummary
```

Dư nợ và hạn mức khả dụng đi qua `summarizeCreditContracts` — **không** tự cộng lại. Đó là nơi giữ quy tắc hạn mức tuần hoàn vs vay từng lần, HĐTD hết hiệu lực, HĐTD chưa hiệu lực, HĐTD đã đóng. Chép lại công thức là bắt đầu trôi dạt.

- [ ] **Bước 1: Viết test đỏ**

Tạo `src/lib/__tests__/customerContext.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { buildCustomerContext } from '../customerContext';
import type { CreditContract, LoanContract, RepaymentSchedule } from '../../types';

const HOM_NAY = '2026-08-20';

const hdtd = (over: Partial<CreditContract> = {}): CreditContract => ({
  Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-01',
  LoanMethod: 'Hạn mức tín dụng',
  ContractAmount: 1_000_000_000,
  ContractStartDate: '2026-01-01', ContractEndDate: '2027-01-01',
  IsClosed: false,
  ...over,
} as CreditContract);

const kunn = (over: Partial<LoanContract> = {}): LoanContract => ({
  Id: 100, CustomerId: 55, CreditContractId: 1,
  ContractNumber: 'KUNN-01',
  LoanAmount: 400_000_000,
  IsSettled: false,
  ...over,
} as LoanContract);

describe('buildCustomerContext', () => {
  it('khách chưa có HĐTD thì mọi số bằng 0 và nhóm nợ là 1', () => {
    const r = buildCustomerContext({
      creditContracts: [], kunns: [], paidPrincipal: {},
      overdueSchedules: [], today: HOM_NAY,
    });
    expect(r).toEqual({
      granted: 0, outstanding: 0, available: 0,
      debtGroup: 1, maxOverdueDays: 0, activeKunnCount: 0,
    });
  });

  it('dư nợ trừ gốc đã trả lấy từ ContractPaidPrincipal', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn()],
      paidPrincipal: { 100: 150_000_000 },
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.outstanding).toBe(250_000_000);
    expect(r.granted).toBe(1_000_000_000);
    expect(r.available).toBe(750_000_000);
    expect(r.activeKunnCount).toBe(1);
  });

  it('không có bản ghi gốc đã trả thì lùi về CurrentBalance của KUNN', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn({ CurrentBalance: 380_000_000 })],
      paidPrincipal: {},
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.outstanding).toBe(380_000_000);
  });

  it('KUNN đã tất toán không tính vào dư nợ', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn({ IsSettled: true })],
      paidPrincipal: {},
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.outstanding).toBe(0);
    expect(r.activeKunnCount).toBe(0);
  });

  it('HĐTD hết hiệu lực thì hạn mức khả dụng về 0 dù còn dư địa', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd({ ContractEndDate: '2026-06-30' })],
      kunns: [kunn()],
      paidPrincipal: {},
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.available).toBe(0);
  });

  it('nhóm nợ suy từ số ngày quá hạn lớn nhất', () => {
    const qua = (dueDate: string): RepaymentSchedule => ({
      Id: 1, ContractId: 100, PeriodNumber: 1, DueDate: dueDate,
      IsPaid: false, PrincipalAmount: 1_000_000, InterestAmount: 100_000,
    } as RepaymentSchedule);

    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn()],
      paidPrincipal: {},
      overdueSchedules: [qua('2026-06-01'), qua('2026-08-10')],
      today: HOM_NAY,
    });
    expect(r.maxOverdueDays).toBe(80);
    expect(r.debtGroup).toBeGreaterThan(1);
  });

  it('không có kỳ quá hạn thì nhóm 1, 0 ngày', () => {
    const r = buildCustomerContext({
      creditContracts: [hdtd()],
      kunns: [kunn()],
      paidPrincipal: {},
      overdueSchedules: [],
      today: HOM_NAY,
    });
    expect(r.debtGroup).toBe(1);
    expect(r.maxOverdueDays).toBe(0);
  });
});
```

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/lib/__tests__/customerContext.test.ts
```

Kỳ vọng: ĐỎ.

- [ ] **Bước 3: Viết `src/lib/customerContext.ts`**

```ts
import type { CreditContract, LoanContract, RepaymentSchedule } from '../types';
import { summarizeCreditContracts, totalsOfCreditContracts } from './creditContract';
import { getAutoDebtGroupInfo, outstandingOf } from './loanMath';

export interface CustomerContextSummary {
  granted: number;
  outstanding: number;
  available: number;
  debtGroup: number;
  maxOverdueDays: number;
  activeKunnCount: number;
}

export interface BuildCustomerContextInput {
  creditContracts: CreditContract[];
  kunns: LoanContract[];
  paidPrincipal: Record<number, number>;
  overdueSchedules: RepaymentSchedule[];
  today: string;
}

export function buildCustomerContext(
  { creditContracts, kunns, paidPrincipal, overdueSchedules, today }: BuildCustomerContextInput
): CustomerContextSummary {
  const summaries = summarizeCreditContracts(creditContracts, kunns, {
    getOutstanding: (k) => outstandingOf(k, paidPrincipal[k.Id] ?? null),
    today,
  });

  const { granted, outstanding, available } = totalsOfCreditContracts(summaries);
  const { debtGroup, maxOverdueDays } = getAutoDebtGroupInfo(overdueSchedules, today);

  return {
    granted,
    outstanding,
    available,
    debtGroup,
    maxOverdueDays,
    activeKunnCount: summaries.reduce((s, x) => s + x.activeKunnCount, 0),
  };
}
```

- [ ] **Bước 4: Chạy lại**

```bash
npx vitest run src/lib/__tests__/customerContext.test.ts
```

Kỳ vọng: XANH, 7 test. Nếu con số `maxOverdueDays` lệch, sửa **kỳ vọng trong test** cho khớp `getAutoDebtGroupInfo` — hàm đó là nơi giữ quy tắc, đừng sửa nó.

- [ ] **Bước 5: Tự phá để kiểm chứng**

Tạm đổi `getOutstanding` thành `() => 0`, chạy lại. Kỳ vọng: hai test dư nợ ĐỎ. Khôi phục.

- [ ] **Bước 6: Commit**

```bash
git add src/lib/customerContext.ts src/lib/__tests__/customerContext.test.ts && git commit -m "feat(ngu-canh): ham thuan gop so lieu thanh ngu canh khach hang"
```

---

## Task 6: `useCustomerContext` — nạp bốn truy vấn song song

**Tệp:**
- Tạo: `src/hooks/useCustomerContext.ts`, `src/hooks/__tests__/useCustomerContext.test.tsx`

**Giao diện:**
- Tiêu thụ: `fetchCustomersAPI`, `fetchCreditContractsByCustomerAPI`, `fetchContractsByCustomerAPI`, `fetchPaidPrincipalForContractsAPI`, `fetchOverdueSchedulesAPI`; `buildCustomerContext` (Task 5); `todayIso` (`src/lib/utils`).
- Sản xuất:

```ts
export interface CustomerContextState {
  customer: Customer | null;
  summary: CustomerContextSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}
export function useCustomerContext(customerId: number | null): CustomerContextState
```

Thứ tự nạp: ba truy vấn đầu (`Customers` lọc theo Id, `CreditContracts`, `LoanContracts`) chạy song song; hai truy vấn còn lại cần danh sách `kunnId` nên chạy ở lượt hai, song song với nhau. **Hai lượt mạng, không phải bốn** — tổng ≈ 21 ms DB.

`AbortController` không dùng được với `supabase-js` ở đây; chống đua bằng cờ `huy` trong `useEffect`.

- [ ] **Bước 1: Viết test đỏ**

Tạo `src/hooks/__tests__/useCustomerContext.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';

const fetchCustomers = vi.fn();
const fetchCreditContracts = vi.fn();
const fetchContracts = vi.fn();
const fetchPaid = vi.fn();
const fetchOverdue = vi.fn();

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: (...a: unknown[]) => fetchCustomers(...a),
  fetchCreditContractsByCustomerAPI: (...a: unknown[]) => fetchCreditContracts(...a),
  fetchContractsByCustomerAPI: (...a: unknown[]) => fetchContracts(...a),
  fetchPaidPrincipalForContractsAPI: (...a: unknown[]) => fetchPaid(...a),
  fetchOverdueSchedulesAPI: (...a: unknown[]) => fetchOverdue(...a),
}));

import { useCustomerContext } from '../useCustomerContext';

function Probe({ id }: { id: number | null }) {
  const { customer, summary, loading, error } = useCustomerContext(id);
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="ten">{customer?.FullName ?? '—'}</span>
      <span data-testid="du-no">{summary ? String(summary.outstanding) : '—'}</span>
      <span data-testid="loi">{error ?? '—'}</span>
    </div>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  fetchCustomers.mockResolvedValue([{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055', Phone: '0900000055' }]);
  fetchCreditContracts.mockResolvedValue([{
    Id: 1, CustomerId: 55, HdtdNumber: 'HDTD-01', LoanMethod: 'Hạn mức tín dụng',
    ContractAmount: 1_000_000_000, ContractStartDate: '2026-01-01',
    ContractEndDate: '2027-01-01', IsClosed: false,
  }]);
  fetchContracts.mockResolvedValue([{
    Id: 100, CustomerId: 55, CreditContractId: 1,
    ContractNumber: 'KUNN-01', LoanAmount: 400_000_000, IsSettled: false,
  }]);
  fetchPaid.mockResolvedValue({ 100: 150_000_000 });
  fetchOverdue.mockResolvedValue([]);
});

afterEach(cleanup);

describe('useCustomerContext', () => {
  it('chưa có khách thì không gọi truy vấn nào', async () => {
    render(<Probe id={null} />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(fetchCustomers).not.toHaveBeenCalled();
    expect(fetchCreditContracts).not.toHaveBeenCalled();
    expect(screen.getByTestId('ten').textContent).toBe('—');
  });

  it('có khách thì nạp và tính ra dư nợ', async () => {
    render(<Probe id={55} />);
    await waitFor(() => expect(screen.getByTestId('du-no').textContent).toBe('250000000'));
    expect(screen.getByTestId('ten').textContent).toBe('Trần Thị B');
  });

  it('gốc đã trả và lịch quá hạn chỉ hỏi cho KUNN của khách này', async () => {
    render(<Probe id={55} />);
    await waitFor(() => expect(fetchPaid).toHaveBeenCalled());
    expect(fetchPaid).toHaveBeenCalledWith([100]);
    expect(fetchOverdue.mock.calls[0][0]).toEqual([100]);
  });

  it('khách không có KUNN thì bỏ hẳn hai truy vấn lượt hai', async () => {
    fetchContracts.mockResolvedValue([]);
    render(<Probe id={55} />);
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    expect(fetchPaid).not.toHaveBeenCalled();
    expect(fetchOverdue).not.toHaveBeenCalled();
    expect(screen.getByTestId('du-no').textContent).toBe('0');
  });

  it('lỗi nạp thì báo ra, không nuốt', async () => {
    fetchCreditContracts.mockRejectedValue(new Error('RLS chan'));
    render(<Probe id={55} />);
    await waitFor(() => expect(screen.getByTestId('loi').textContent).toContain('RLS chan'));
    expect(screen.getByTestId('loading').textContent).toBe('false');
  });
});
```

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/hooks/__tests__/useCustomerContext.test.tsx
```

Kỳ vọng: ĐỎ.

- [ ] **Bước 3: Viết `src/hooks/useCustomerContext.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import type { Customer } from '../types';
import {
  fetchContractsByCustomerAPI, fetchCreditContractsByCustomerAPI,
  fetchCustomersAPI, fetchOverdueSchedulesAPI, fetchPaidPrincipalForContractsAPI,
} from '../lib/api';
import { buildCustomerContext, type CustomerContextSummary } from '../lib/customerContext';
import { todayIso } from '../lib/utils';

export interface CustomerContextState {
  customer: Customer | null;
  summary: CustomerContextSummary | null;
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useCustomerContext(customerId: number | null): CustomerContextState {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [summary, setSummary] = useState<CustomerContextSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lanNap, setLanNap] = useState(0);

  const reload = useCallback(() => setLanNap(n => n + 1), []);

  useEffect(() => {
    if (customerId === null) {
      setCustomer(null);
      setSummary(null);
      setError(null);
      setLoading(false);
      return;
    }

    let huy = false;
    const today = todayIso();

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const [dsKhach, hdtds, kunns] = await Promise.all([
          fetchCustomersAPI(),
          fetchCreditContractsByCustomerAPI(customerId),
          fetchContractsByCustomerAPI(customerId),
        ]);
        if (huy) return;

        const kunnIds = kunns.map(k => k.Id);
        const [paidPrincipal, overdueSchedules] = kunnIds.length === 0
          ? [{}, []]
          : await Promise.all([
              fetchPaidPrincipalForContractsAPI(kunnIds),
              fetchOverdueSchedulesAPI(kunnIds, today),
            ]);
        if (huy) return;

        setCustomer(dsKhach.find(c => c.Id === customerId) ?? null);
        setSummary(buildCustomerContext({
          creditContracts: hdtds, kunns, paidPrincipal, overdueSchedules, today,
        }));
      } catch (err) {
        if (huy) return;
        setCustomer(null);
        setSummary(null);
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!huy) setLoading(false);
      }
    })();

    return () => { huy = true; };
  }, [customerId, lanNap]);

  return { customer, summary, loading, error, reload };
}
```

- [ ] **Bước 4: Chạy lại**

```bash
npx vitest run src/hooks/__tests__/useCustomerContext.test.tsx
```

Kỳ vọng: XANH, 5 test.

- [ ] **Bước 5: Chứng minh test không gọi mạng**

```bash
mv .env .env.tam && npx vitest run src/hooks/__tests__/useCustomerContext.test.tsx; mv .env.tam .env
```

Kỳ vọng: vẫn XANH.

- [ ] **Bước 6: Commit**

```bash
git add src/hooks/useCustomerContext.ts src/hooks/__tests__/useCustomerContext.test.tsx && git commit -m "feat(ngu-canh): hook nap so lieu khach hang, hai luot mang"
```

---

## Task 7: `CustomerContextBar` và chỗ nó đứng

**Tệp:**
- Tạo: `src/components/CustomerContextBar.tsx`, `src/components/__tests__/CustomerContextBar.test.tsx`
- Sửa: `src/components/AppLayout.tsx`

**Giao diện:**
- Tiêu thụ: `useSelectedCustomerId`, `useCustomerNavigate` (Task 2); `useCustomerContext` (Task 6); `fmtMoney` (`src/lib/utils`); `PANEL`, `SECTION_LABEL`, `BTN_SECONDARY`, `RADIUS_PILL`, `DEBT_GROUP_COLOR` (`src/lib/uiClasses`); `ROUTE_OF` (`src/lib/routes`).
- Sản xuất: `export function CustomerContextBar(): JSX.Element | null` — không nhận props.

Nội dung theo §6.2: **tên · CIF · điện thoại · dư nợ · hạn mức khả dụng · nhóm nợ · nút đổi khách**. Không thêm gì khác, không thêm dòng phụ diễn giải.

Nút "Đổi khách hàng" điều hướng về `ROUTE_OF.customers`. `useCustomerNavigate(null)` đưa về đường phẳng của **màn đang xem**, đó là hành vi "bỏ chọn khách" — khác với "đi chọn khách khác". Nút này dùng cái sau.

Trả `null` khi URL không có `:customerId` — thanh không chiếm chỗ ở 14 màn còn lại.

- [ ] **Bước 1: Viết test đỏ**

Tạo `src/components/__tests__/CustomerContextBar.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

const dungHook = vi.fn();
vi.mock('../../hooks/useCustomerContext', () => ({
  useCustomerContext: (...a: unknown[]) => dungHook(...a),
}));

import { CustomerContextBar } from '../CustomerContextBar';

const DAY_DU = {
  customer: { Id: 55, FullName: 'Trần Thị B', CifKh: '900055', Phone: '0900000055' },
  summary: {
    granted: 1_000_000_000, outstanding: 250_000_000, available: 750_000_000,
    debtGroup: 1, maxOverdueDays: 0, activeKunnCount: 1,
  },
  loading: false, error: null, reload: () => {},
};

function ViTri() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/loans" element={<><CustomerContextBar /><ViTri /></>} />
        <Route path="/customers" element={<><CustomerContextBar /><ViTri /></>} />
        <Route path="/customers/:customerId/loans" element={<><CustomerContextBar /><ViTri /></>} />
      </Routes>
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  dungHook.mockReturnValue(DAY_DU);
});
afterEach(cleanup);

describe('CustomerContextBar', () => {
  it('không có :customerId thì không render gì', () => {
    const { container } = dungLenO('/loans');
    expect(container.querySelector('[data-testid="thanh-ngu-canh"]')).toBeNull();
    expect(dungHook).toHaveBeenCalledWith(null);
  });

  it('có :customerId thì hiện đủ sáu thông tin của spec', () => {
    dungLenO('/customers/55/loans');
    expect(screen.getByText('Trần Thị B')).toBeTruthy();
    expect(screen.getByText(/900055/)).toBeTruthy();
    expect(screen.getByText(/0900000055/)).toBeTruthy();
    expect(screen.getByText('250.000.000')).toBeTruthy();
    expect(screen.getByText('750.000.000')).toBeTruthy();
    expect(screen.getByText(/Nhóm 1/)).toBeTruthy();
  });

  it('nút đổi khách dẫn về danh sách khách hàng', () => {
    dungLenO('/customers/55/loans');
    fireEvent.click(screen.getByRole('button', { name: /đổi khách/i }));
    expect(screen.getByTestId('path').textContent).toBe('/customers');
  });

  it('đang nạp thì hiện khung chờ, không hiện số cũ', () => {
    dungHook.mockReturnValue({ ...DAY_DU, loading: true, summary: null });
    dungLenO('/customers/55/loans');
    expect(screen.queryByText('250.000.000')).toBeNull();
    expect(screen.getByTestId('thanh-ngu-canh')).toBeTruthy();
  });

  it('lỗi nạp thì nói thẳng ngay trên thanh', () => {
    dungHook.mockReturnValue({ ...DAY_DU, error: 'RLS chan', summary: null, customer: null });
    dungLenO('/customers/55/loans');
    expect(screen.getByText(/RLS chan/)).toBeTruthy();
  });

  it('nhóm nợ khác 1 thì dùng bảng tra màu, không dựng tên lớp động', () => {
    dungHook.mockReturnValue({ ...DAY_DU, summary: { ...DAY_DU.summary, debtGroup: 3, maxOverdueDays: 95 } });
    const { container } = dungLenO('/customers/55/loans');
    expect(container.querySelector('.bg-g3')).toBeTruthy();
    expect(screen.getByText(/Nhóm 3/)).toBeTruthy();
  });
});
```

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/components/__tests__/CustomerContextBar.test.tsx
```

Kỳ vọng: ĐỎ.

- [ ] **Bước 3: Viết `src/components/CustomerContextBar.tsx`**

```tsx
import { useNavigate } from 'react-router';
import { UserCog } from 'lucide-react';
import { useSelectedCustomerId } from '../hooks/useSelectedCustomerId';
import { useCustomerContext } from '../hooks/useCustomerContext';
import { fmtMoney } from '../lib/utils';
import { ROUTE_OF } from '../lib/routes';
import { BTN_SECONDARY, DEBT_GROUP_COLOR, PANEL, RADIUS_PILL, SECTION_LABEL } from '../lib/uiClasses';

export function CustomerContextBar() {
  const customerId = useSelectedCustomerId();
  const { customer, summary, loading, error } = useCustomerContext(customerId);
  const navigate = useNavigate();

  if (customerId === null) return null;

  const nhom = summary?.debtGroup ?? 1;

  return (
    <div data-testid="thanh-ngu-canh" className={`${PANEL} px-4 py-2.5 mb-4 flex flex-wrap items-center gap-x-6 gap-y-2`}>
      <div className="min-w-0">
        <div className={SECTION_LABEL}>Khách hàng</div>
        <div className="text-sm font-semibold text-ink truncate">
          {customer?.FullName ?? (loading ? '…' : '—')}
        </div>
      </div>

      <div className="text-xs text-ink-muted">
        CIF <span className="font-mono text-ink">{customer?.CifKh ?? '—'}</span>
        {' · '}
        <span className="font-mono text-ink">{customer?.Phone || '—'}</span>
      </div>

      <div>
        <div className={SECTION_LABEL}>Dư nợ</div>
        <div className="text-sm font-semibold text-pos tabular-nums">
          {summary ? fmtMoney(summary.outstanding) : '…'}
        </div>
      </div>

      <div>
        <div className={SECTION_LABEL}>Hạn mức khả dụng</div>
        <div className="text-sm font-semibold text-ink tabular-nums">
          {summary ? fmtMoney(summary.available) : '…'}
        </div>
      </div>

      {summary && (
        <span className={`${RADIUS_PILL} ${DEBT_GROUP_COLOR[nhom]} text-surface px-2.5 py-0.5 text-[11px] font-semibold`}>
          Nhóm {nhom}
          {summary.maxOverdueDays > 0 && ` · quá hạn ${summary.maxOverdueDays} ngày`}
        </span>
      )}

      {error && <span className="text-xs text-neg font-semibold">{error}</span>}

      <button
        type="button"
        onClick={() => navigate(ROUTE_OF.customers)}
        className={`${BTN_SECONDARY} ml-auto text-xs py-1.5 px-3 inline-flex items-center gap-1.5`}
      >
        <UserCog className="w-3.5 h-3.5" />
        Đổi khách hàng
      </button>
    </div>
  );
}
```

- [ ] **Bước 4: Gắn vào `src/components/AppLayout.tsx`**

Thêm import:

```tsx
import { CustomerContextBar } from './CustomerContextBar';
```

Đặt ngay trong `<main>`, trước `<ErrorBoundary>`:

```tsx
        <main className="flex-1 md:ml-60 min-w-0 bg-surface p-3 sm:p-4 md:p-6 overflow-y-auto">
          <CustomerContextBar />
          <ErrorBoundary title="Lỗi khi tải giao diện màn hình">
            <Outlet />
          </ErrorBoundary>
        </main>
```

`AppLayout` là tuyến **cha**, nên `useParams` bên trong `CustomerContextBar` không thấy `:customerId` của tuyến con. Đây chính là nhánh `parseCustomerPath(pathname)` đã dựng sẵn trong `useSelectedCustomerId` ở Task 2 — không phải sửa gì thêm. Nếu Task 2 chưa có nhánh đó, quay lại làm cho xong trước khi tiếp tục.

- [ ] **Bước 5: Chạy lại tất cả**

```bash
npx vitest run src/components/__tests__/CustomerContextBar.test.tsx src/hooks/__tests__/useSelectedCustomerId.test.tsx src/components/__tests__/routing.test.tsx && npm run build
```

Kỳ vọng: XANH. Nếu `fmtMoney` in ra chuỗi khác `250.000.000`, sửa kỳ vọng test cho khớp `fmtMoney` — định dạng tiền do §9 quy định, đừng đổi.

- [ ] **Bước 6: Commit**

```bash
git add src/components/CustomerContextBar.tsx src/components/__tests__/CustomerContextBar.test.tsx src/components/AppLayout.tsx && git commit -m "feat(ngu-canh): thanh ngu canh khach hang tren khung ung dung"
```

---

## Task 8: `useCreditContractController` bỏ `WorkContext`

**Tệp:**
- Sửa: `src/hooks/useCreditContractController.ts`, `src/components/views/CreditContractView.tsx`

**Giao diện:**
- Tiêu thụ: `useSelectedCustomerId`, `useCustomerNavigate` (Task 2).
- Sản xuất: controller vẫn trả `setSelectedCustomerId` **cùng chữ ký cũ** `(id: number | null) => void` để `CreditContractView` không phải đổi hình dạng — nhưng ruột nó là `useCustomerNavigate()`.

`handleDisburseRequest` để nguyên gọi `requestDisburse` ở task này; Task 12 mới chuyển nó sang URL. Giữ hai việc tách nhau để mỗi task tự đứng được.

- [ ] **Bước 1: Sửa `src/hooks/useCreditContractController.ts`**

Thay dòng import và dòng đầu thân hàm:

```ts
import { useWork } from '../context/WorkContext';
import { useSelectedCustomerId, useCustomerNavigate } from './useSelectedCustomerId';
```

```ts
export function useCreditContractController() {
  const { requestDisburse } = useWork();
  const selectedCustomerId = useSelectedCustomerId();
  const setSelectedCustomerId = useCustomerNavigate();
```

Phần còn lại không đổi: `selectedCustomerId` vẫn là `number | null`, `setSelectedCustomerId` vẫn nhận `number | null`.

- [ ] **Bước 2: Sửa `src/components/views/CreditContractView.tsx`**

Ô chọn khách hiện gọi cả `setSelectedCustomerId` lẫn `loadCustomer` — nay chỉ điều hướng, `useEffect` trong controller tự nạp theo `selectedCustomerId` mới:

```tsx
            <select
              value={customer?.Id ?? ''}
              onChange={e => {
                const raw = e.target.value;
                setSelectedCustomerId(raw ? parseInt(raw, 10) : null);
              }}
              className={`w-full rounded-lg p-2 font-bold text-ink ${UI.inputStyle}`}
            >
```

Bỏ `loadCustomer` khỏi danh sách destructure nếu không còn chỗ nào dùng.

- [ ] **Bước 3: Sửa `useEffect` nạp khách trong controller**

`useEffect` hiện có nhánh `if (selectedCustomerId && …)` nên **không bao giờ dọn** khi khách về `null`. Trước đây không lộ vì `setSelectedCustomerId(null)` hiếm khi xảy ra; nay bấm "— Chọn Khách hàng —" là về `/credit-contracts`. Sửa:

```ts
  useEffect(() => {
    if (allCustomers.length === 0) return;
    if (selectedCustomerId === null) {
      if (customer !== null) loadCustomer(null);
      return;
    }
    if (selectedCustomerId !== customer?.Id) {
      const c = allCustomers.find(x => x.Id === selectedCustomerId);
      if (c) loadCustomer(c);
    }
  }, [selectedCustomerId, allCustomers, customer, loadCustomer]);
```

- [ ] **Bước 4: Viết test đường đi**

Tạo `src/components/__tests__/CreditContractView.dinhTuyen.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([
    { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' },
    { Id: 77, FullName: 'Lê Văn C', CifKh: '900077' },
  ]),
  fetchCreditContractsByCustomerAPI: async () => [],
  fetchContractsByCustomerAPI: async () => [],
  fetchCollateralsByCustomerAPI: async () => [],
  fetchRepaymentSchedulesAPI: async () => [],
  saveCreditContractAPI: async () => ({}),
  deleteCreditContractAPI: async () => {},
  countKunnOfCreditContractAPI: async () => 0,
}));

import { WorkProvider } from '../../context/WorkContext';
import { CreditContractView } from '../views/CreditContractView';

function ViTri() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

afterEach(cleanup);

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <WorkProvider>
        <Routes>
          <Route path="/credit-contracts" element={<><CreditContractView /><ViTri /></>} />
          <Route path="/customers/:customerId/credit-contracts" element={<><CreditContractView /><ViTri /></>} />
        </Routes>
      </WorkProvider>
    </MemoryRouter>
  );
}

describe('CreditContractView lấy khách từ URL', () => {
  it('chọn khách thì đường dẫn đổi sang đường lồng', async () => {
    dungLenO('/credit-contracts');
    const o = await screen.findByRole('combobox');
    fireEvent.change(o, { target: { value: '77' } });
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/customers/77/credit-contracts'));
  });

  it('bỏ chọn khách thì về đường phẳng', async () => {
    dungLenO('/customers/55/credit-contracts');
    const o = await screen.findByRole('combobox');
    fireEvent.change(o, { target: { value: '' } });
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/credit-contracts'));
  });

  it('vào thẳng đường lồng thì ô chọn đã sẵn đúng khách', async () => {
    dungLenO('/customers/55/credit-contracts');
    await waitFor(() => {
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('55');
    });
  });
});
```

- [ ] **Bước 5: Chạy**

```bash
npx vitest run src/components/__tests__/CreditContractView.dinhTuyen.test.tsx && npm test
```

Kỳ vọng: XANH cả bộ.

- [ ] **Bước 6: Commit**

```bash
git add src/hooks/useCreditContractController.ts src/components/views/CreditContractView.tsx src/components/__tests__/CreditContractView.dinhTuyen.test.tsx && git commit -m "refactor(hdtd): lay khach hang tu URL thay vi WorkContext"
```

---

## Task 9: `useCardContractController` bỏ `WorkContext`

**Tệp:**
- Sửa: `src/hooks/useCardContractController.ts`, `src/components/views/CardContractView.tsx`

**Giao diện:** giống Task 8 — controller vẫn trả `selectedCustomerId` và `setSelectedCustomerId`, chỉ đổi nguồn.

- [ ] **Bước 1: Sửa `src/hooks/useCardContractController.ts`**

Bỏ:

```ts
import { useWork } from '../context/WorkContext';
```

```ts
  const { selectedCustomerId, setSelectedCustomerId } = useWork();
```

Thay bằng:

```ts
import { useSelectedCustomerId, useCustomerNavigate } from './useSelectedCustomerId';
```

```ts
  const selectedCustomerId = useSelectedCustomerId();
  const setSelectedCustomerId = useCustomerNavigate();
```

`useEffect` nạp hợp đồng thẻ đã có nhánh `if (!selectedCustomerId) { setContracts([]); setCollaterals([]); return; }` — không cần sửa.

- [ ] **Bước 2: `CardContractView` không phải sửa**

Ô `<select>` đang gọi `setSelectedCustomerId(e.target.value ? Number(e.target.value) : null)` — chữ ký khớp nguyên.

- [ ] **Bước 3: Viết test đường đi**

Tạo `src/components/__tests__/CardContractView.dinhTuyen.test.tsx`, sao khuôn từ `CreditContractView.dinhTuyen.test.tsx` ở Task 8 — **chép lại đầy đủ, đừng viết "giống Task 8"**:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([
    { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' },
    { Id: 77, FullName: 'Lê Văn C', CifKh: '900077' },
  ]),
  fetchCollateralsByCustomerAPI: async () => [],
  fetchCardContractsByCustomerAPI: async () => [],
  fetchCardSupplementaryHoldersAPI: async () => [],
  saveCardContractAPI: async () => ({}),
  replaceCardSupplementaryHoldersAPI: async () => {},
  deleteCardContractAPI: async () => {},
}));

import { CardContractView } from '../views/CardContractView';

function ViTri() {
  const { pathname } = useLocation();
  return <span data-testid="path">{pathname}</span>;
}

afterEach(cleanup);

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/credit-cards" element={<><CardContractView /><ViTri /></>} />
        <Route path="/customers/:customerId/credit-cards" element={<><CardContractView /><ViTri /></>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('CardContractView lấy khách từ URL', () => {
  it('chọn khách thì đường dẫn đổi sang đường lồng', async () => {
    dungLenO('/credit-cards');
    const o = await screen.findByRole('combobox');
    fireEvent.change(o, { target: { value: '77' } });
    await waitFor(() => expect(screen.getByTestId('path').textContent).toBe('/customers/77/credit-cards'));
  });

  it('vào thẳng đường lồng thì ô chọn đã sẵn đúng khách', async () => {
    dungLenO('/customers/55/credit-cards');
    await waitFor(() => {
      expect((screen.getByRole('combobox') as HTMLSelectElement).value).toBe('55');
    });
  });
});
```

- [ ] **Bước 4: Chạy**

```bash
npx vitest run src/components/__tests__/CardContractView.dinhTuyen.test.tsx && npm test
```

Kỳ vọng: XANH.

- [ ] **Bước 5: Commit**

```bash
git add src/hooks/useCardContractController.ts src/components/__tests__/CardContractView.dinhTuyen.test.tsx && git commit -m "refactor(the): lay khach hang tu URL thay vi WorkContext"
```

---

## Task 10: `usePostLoanControlController` bỏ `WorkContext`

**Tệp:**
- Sửa: `src/hooks/usePostLoanControlController.ts`, `src/components/views/PostLoanControlView.tsx`

Màn này khác ba màn kia: khi **không** có khách nó hiện **toàn danh mục**, đó là năng lực phải giữ (xem quyết định định tuyến).

- [ ] **Bước 1: Sửa `src/hooks/usePostLoanControlController.ts`**

```ts
import { useSelectedCustomerId, useCustomerNavigate } from './useSelectedCustomerId';
```

```ts
export function usePostLoanControlController() {
  const selectedCustomerId = useSelectedCustomerId();
  const setSelectedCustomerId = useCustomerNavigate();
```

Bỏ dòng `import { useWork } …`.

- [ ] **Bước 2: `PostLoanControlView` không phải sửa**

Ba chỗ gọi `setSelectedCustomerId(...)` đều truyền `number | null`, khớp chữ ký.

- [ ] **Bước 3: Viết test giữ năng lực toàn danh mục**

Tạo `src/components/__tests__/PostLoanControlView.dinhTuyen.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchContractsAPI: async () => ([
    { Id: 100, CustomerId: 55, ContractNumber: 'KUNN-55', IsSettled: false, DisbursementDate: '2026-01-05', KunnTenor: '12 tháng' },
    { Id: 200, CustomerId: 77, ContractNumber: 'KUNN-77', IsSettled: false, DisbursementDate: '2026-01-05', KunnTenor: '12 tháng' },
  ]),
  fetchCollateralsAPI: async () => [],
  fetchCustomersAPI: async () => ([
    { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' },
    { Id: 77, FullName: 'Lê Văn C', CifKh: '900077' },
  ]),
  fetchPostLoanControlRecordsAPI: async () => [],
  savePostLoanControlRecordAPI: async () => ({}),
  saveCollateralAppraisalAPI: async () => ({ Id: 1 }),
}));

import { usePostLoanControlController } from '../../hooks/usePostLoanControlController';

function Probe() {
  const { scopedItems, items, selectedCustomerId } = usePostLoanControlController();
  return (
    <div>
      <span data-testid="id">{selectedCustomerId === null ? 'null' : String(selectedCustomerId)}</span>
      <span data-testid="tat-ca">{items.length}</span>
      <span data-testid="trong-pham-vi">{scopedItems.length}</span>
    </div>
  );
}

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/post-loan-control" element={<Probe />} />
        <Route path="/customers/:customerId/post-loan-control" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe('Kiểm soát sau vay theo URL', () => {
  it('đường phẳng vẫn hiện toàn danh mục', async () => {
    dungLenO('/post-loan-control');
    await waitFor(() => expect(Number(screen.getByTestId('tat-ca').textContent)).toBeGreaterThan(0));
    expect(screen.getByTestId('id').textContent).toBe('null');
    expect(screen.getByTestId('trong-pham-vi').textContent)
      .toBe(screen.getByTestId('tat-ca').textContent);
  });

  it('đường lồng thì thu hẹp về một khách', async () => {
    dungLenO('/customers/55/post-loan-control');
    await waitFor(() => expect(Number(screen.getByTestId('tat-ca').textContent)).toBeGreaterThan(0));
    expect(screen.getByTestId('id').textContent).toBe('55');
    expect(Number(screen.getByTestId('trong-pham-vi').textContent))
      .toBeLessThan(Number(screen.getByTestId('tat-ca').textContent));
  });
});
```

- [ ] **Bước 4: Chạy**

```bash
npx vitest run src/components/__tests__/PostLoanControlView.dinhTuyen.test.tsx && npm test
```

Kỳ vọng: XANH. Nếu `items` ra 0 vì lịch kiểm soát cần thêm trường trên `LoanContract`, bổ sung trường vào dữ liệu giả cho tới khi `items.length > 0` — **đừng** hạ kỳ vọng xuống `toBeGreaterThanOrEqual(0)`, thế là test tự khẳng định chính nó.

- [ ] **Bước 5: Commit**

```bash
git add src/hooks/usePostLoanControlController.ts src/components/__tests__/PostLoanControlView.dinhTuyen.test.tsx && git commit -m "refactor(kssv): lay khach hang tu URL, giu man toan danh muc"
```

---

## Task 11: `useCustomerPortfolio` + `useLoanPortfolioController` bỏ `WorkContext`

**Tệp:**
- Sửa: `src/hooks/useLoanPortfolioController.ts`, `src/hooks/useCustomerPortfolio.ts`, `src/components/views/LoanPortfolioView.tsx`
- Test: `src/components/__tests__/LoanPortfolioView.test.tsx`

Đây là màn nặng nhất trong bốn màn. `useCustomerPortfolio` nhận `selectedCustomerId` / `setSelectedCustomerId` **qua tham số** nên bản thân nó không cần sửa nhiều — chỉ controller đổi nguồn.

- [ ] **Bước 1: Sửa `src/hooks/useLoanPortfolioController.ts`**

Bỏ:

```ts
import { useWork } from '../context/WorkContext';
```

```ts
  const { selectedCustomerId, setSelectedCustomerId, disburseRequest, clearDisburseRequest } = useWork();
```

Thay bằng:

```ts
import { useWork } from '../context/WorkContext';
import { useSelectedCustomerId, useCustomerNavigate } from './useSelectedCustomerId';
```

```ts
  const { disburseRequest, clearDisburseRequest } = useWork();
  const selectedCustomerId = useSelectedCustomerId();
  const setSelectedCustomerId = useCustomerNavigate();
```

`disburseRequest` ở lại `WorkContext` tới hết Task 12.

- [ ] **Bước 2: Sửa `src/hooks/useCustomerPortfolio.ts`**

Kiểu tham số hiện là `setSelectedCustomerId: (id: number) => void`. `useCustomerNavigate` nhận `number | null`, rộng hơn nên gán được — không phải đổi. Nhưng có một cái bẫy:

```ts
    if (selectedCustomerId !== id) setSelectedCustomerId(id);
```

Dòng này nằm trong `useEffect` chạy khi `foundCustomer?.Id` đổi. Nay nó gây điều hướng, và điều hướng làm `selectedCustomerId` đổi, kéo `useEffect` thứ hai chạy `pickCustomer` — vòng lặp. `useEffect` thứ hai đã có chốt `if (foundCustomer?.Id === selectedCustomerId) return;` nên vòng lặp dừng sau một lượt. Xác nhận bằng test ở Bước 4; nếu quay vòng, đổi chốt của `useEffect` thứ nhất thành so sánh trực tiếp đường dẫn.

- [ ] **Bước 3: Sửa `src/components/views/LoanPortfolioView.tsx`**

Nút xoá tìm kiếm gọi `setSelectedCustomerId(null)` — giữ nguyên, nay nó điều hướng về `/loans`.

- [ ] **Bước 4: Sửa `src/components/__tests__/LoanPortfolioView.test.tsx`**

Tệp này đang dùng `useWork().setSelectedCustomerId` để dựng cảnh. Thay bằng điều hướng: bọc `MemoryRouter` với `initialEntries={['/customers/55/loans']}` và tuyến `/customers/:customerId/loans`, bỏ helper gọi `useWork`.

Cụ thể, thay khối dựng cảnh:

```tsx
import { MemoryRouter, Routes, Route } from 'react-router';

function dungLenVoiKhach(customerId: number) {
  return render(
    <MemoryRouter initialEntries={[`/customers/${customerId}/loans`]}>
      <WorkProvider>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<LoanPortfolioView />} />
        </Routes>
      </WorkProvider>
    </MemoryRouter>
  );
}
```

và bỏ import `useWork` cùng component trợ giúp gọi `setSelectedCustomerId`.

- [ ] **Bước 5: Chạy**

```bash
npx vitest run src/components/__tests__/LoanPortfolioView.test.tsx && npm test
```

Kỳ vọng: XANH. Nếu test treo vì vòng lặp điều hướng, xem Bước 2.

- [ ] **Bước 6: Commit**

```bash
git add src/hooks/useLoanPortfolioController.ts src/hooks/useCustomerPortfolio.ts src/components/views/LoanPortfolioView.tsx src/components/__tests__/LoanPortfolioView.test.tsx && git commit -m "refactor(khoan-vay): lay khach hang tu URL thay vi WorkContext"
```

---

## Task 12: Luồng giải ngân đi qua URL

**Tệp:**
- Sửa: `src/hooks/useCreditContractController.ts`, `src/hooks/useLoanPortfolioController.ts`, `src/context/WorkContext.tsx`

**Giao diện:**
- Sản xuất: đường dẫn `/customers/:customerId/loans?disburse=<creditContractId>`.

Sau khi task này xong, `WorkContext` chỉ còn `setActiveTab`.

- [ ] **Bước 1: Viết test đỏ**

Tạo `src/components/__tests__/giaiNganQuaUrl.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router';
import { useLoanPortfolioController } from '../../hooks/useLoanPortfolioController';

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055' }]),
  fetchCreditContractsByCustomerAPI: async () => ([{
    Id: 9, CustomerId: 55, HdtdNumber: 'HDTD-09',
    LoanMethod: 'Hạn mức tín dụng', ContractAmount: 1_000_000_000,
    ContractStartDate: '2026-01-01', ContractEndDate: '2027-01-01', IsClosed: false,
  }]),
  fetchContractsByCustomerAPI: async () => [],
  fetchCollateralsByCustomerAPI: async () => [],
  fetchCardContractsByCustomerAPI: async () => [],
  fetchRepaymentSchedulesAPI: async () => [],
  saveContractAPI: async () => ({}),
  deleteContractAPI: async () => {},
  bulkSaveRepaymentSchedulesAPI: async () => {},
  deleteRepaymentSchedulesByContractAPI: async () => {},
  deleteRepaymentSchedulesByIdsAPI: async () => {},
}));

function Probe() {
  const { showForm, formHdtdNumber } = useLoanPortfolioController();
  const { search } = useLocation();
  return (
    <div>
      <span data-testid="mo-form">{String(showForm)}</span>
      <span data-testid="so-hdtd">{formHdtdNumber}</span>
      <span data-testid="query">{search}</span>
    </div>
  );
}

afterEach(cleanup);

describe('giải ngân qua URL', () => {
  it('có ?disburse thì mở form KUNN điền sẵn HĐTD đó', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans?disburse=9']}>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('so-hdtd').textContent).toBe('HDTD-09'));
    expect(screen.getByTestId('mo-form').textContent).toBe('true');
  });

  it('dùng xong thì xoá tham số khỏi URL, Back không kích lại', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans?disburse=9']}>
        <Routes>
          <Route path="/customers/:customerId/loans" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('query').textContent).toBe(''));
  });
});
```

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/components/__tests__/giaiNganQuaUrl.test.tsx
```

Kỳ vọng: ĐỎ.

- [ ] **Bước 3: Sửa `useCreditContractController.handleDisburseRequest`**

```ts
import { useNavigate } from 'react-router';
import { customerPath } from '../lib/customerRoutes';
```

```ts
  const navigate = useNavigate();
```

```ts
  const handleDisburseRequest = useCallback((cc: CreditContract) => {
    if (!customer) return;
    navigate(`${customerPath('loans', customer.Id)}?disburse=${cc.Id}`);
  }, [customer, navigate]);
```

Bỏ `useWork` khỏi tệp này hoàn toàn.

- [ ] **Bước 4: Sửa `useLoanPortfolioController`**

Bỏ `useWork`, thay bằng `useSearchParams`:

```ts
import { useSearchParams } from 'react-router';
```

```ts
  const [searchParams, setSearchParams] = useSearchParams();
  const disburseCreditContractId = (() => {
    const raw = searchParams.get('disburse');
    return raw && /^\d+$/.test(raw) ? Number(raw) : null;
  })();
```

Thay `useEffect` áp `disburseRequest` (quanh dòng 739) bằng:

```ts
  useEffect(() => {
    if (disburseCreditContractId === null) return;
    if (allCustomers.length === 0) return;
    const cc = creditContracts.find(x => x.Id === disburseCreditContractId);
    if (!cc) return;
    handleNewContract();
    applyCreditContractToForm(cc);
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      next.delete('disburse');
      return next;
    }, { replace: true });
  }, [disburseCreditContractId, allCustomers, creditContracts, handleNewContract, applyCreditContractToForm, setSearchParams]);
```

`{ replace: true }` là điểm mấu chốt: không đẩy thêm mục vào lịch sử, nên Back không kích lại luồng giải ngân.

- [ ] **Bước 5: Rút gọn `src/context/WorkContext.tsx`**

Xoá `DisburseRequest`, `disburseRequest`, `requestDisburse`, `clearDisburseRequest`, `selectedCustomerId`, `setSelectedCustomerId`. Còn lại:

```tsx
import React, { createContext, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { ROUTE_OF } from '../lib/routes';

interface WorkContextValue {
  setActiveTab: (t: string) => void;
}

const WorkContext = createContext<WorkContextValue | null>(null);

export const WorkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const setActiveTab = useCallback((tab: string) => {
    const path = ROUTE_OF[tab as keyof typeof ROUTE_OF];
    if (path) navigate(path);
  }, [navigate]);

  return (
    <WorkContext.Provider value={{ setActiveTab }}>
      {children}
    </WorkContext.Provider>
  );
};

export function useWork(): WorkContextValue {
  const ctx = useContext(WorkContext);
  if (!ctx) throw new Error('useWork phải nằm trong WorkProvider');
  return ctx;
}
```

- [ ] **Bước 6: Chạy**

```bash
npx vitest run src/components/__tests__/giaiNganQuaUrl.test.tsx && npm test && npm run build
```

Kỳ vọng: XANH. Nếu `tsc` báo còn chỗ đọc `selectedCustomerId` từ `useWork`, đó là chỗ Task 8–11 bỏ sót — sửa nốt tại đây.

- [ ] **Bước 7: Commit**

```bash
git add -A && git commit -m "feat(giai-ngan): dieu huong qua URL, go disburseRequest khoi WorkContext"
```

---

## Task 13: `CollateralView` nhận phạm vi khách

**Tệp:**
- Sửa: `src/hooks/useCollateralController.ts`, `src/components/views/CollateralView.tsx`

Màn TSĐB hôm nay **không** có phạm vi khách — nó nạp toàn bộ `Collaterals` rồi lọc bằng ba ô tìm CIF / tên chủ tài sản / mã tài sản. Đường lồng phải thu hẹp danh sách về một khách; đường phẳng giữ nguyên hành vi cũ.

- [ ] **Bước 1: Viết test đỏ**

Tạo `src/components/__tests__/CollateralView.phamVi.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchCollateralsAPI: async () => ([
    { Id: 1, CustomerId: 55, AssetCode: 'TS-55', AssetType: 'BĐS - Loại 1', AppraisedValue: 1_000_000_000, LtvPercent: 80 },
    { Id: 2, CustomerId: 77, AssetCode: 'TS-77', AssetType: 'BĐS - Loại 1', AppraisedValue: 2_000_000_000, LtvPercent: 80 },
  ]),
  fetchCustomersAPI: async () => ([
    { Id: 55, FullName: 'Trần Thị B', CifKh: '900055' },
    { Id: 77, FullName: 'Lê Văn C', CifKh: '900077' },
  ]),
  saveCollateralAPI: async () => ({}),
  deleteCollateralAPI: async () => {},
}));

import { useCollateralController } from '../../hooks/useCollateralController';

function Probe() {
  const { visibleCollaterals } = useCollateralController();
  return <span data-testid="ma">{visibleCollaterals.map(c => c.AssetCode).join(',')}</span>;
}

function dungLenO(duongDan: string) {
  return render(
    <MemoryRouter initialEntries={[duongDan]}>
      <Routes>
        <Route path="/collaterals" element={<Probe />} />
        <Route path="/customers/:customerId/collaterals" element={<Probe />} />
      </Routes>
    </MemoryRouter>
  );
}

afterEach(cleanup);

describe('CollateralView theo phạm vi khách', () => {
  it('đường phẳng hiện tài sản của mọi khách', async () => {
    dungLenO('/collaterals');
    await waitFor(() => expect(screen.getByTestId('ma').textContent).toContain('TS-55'));
    expect(screen.getByTestId('ma').textContent).toContain('TS-77');
  });

  it('đường lồng chỉ hiện tài sản của khách đó', async () => {
    dungLenO('/customers/55/collaterals');
    await waitFor(() => expect(screen.getByTestId('ma').textContent).toBe('TS-55'));
  });
});
```

Nếu controller chưa xuất `visibleCollaterals` mà tên khác, dùng đúng tên hiện có; đừng đổi tên đang chạy.

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/components/__tests__/CollateralView.phamVi.test.tsx
```

Kỳ vọng: ĐỎ ở test thứ hai (đường lồng vẫn hiện cả hai).

- [ ] **Bước 3: Sửa `src/hooks/useCollateralController.ts`**

Thêm:

```ts
import { useSelectedCustomerId } from './useSelectedCustomerId';
```

```ts
  const scopedCustomerId = useSelectedCustomerId();
```

Bọc danh sách hiển thị bằng một `useMemo` lọc trước mọi bộ lọc khác:

```ts
  const collateralsTrongPhamVi = useMemo(
    () => scopedCustomerId === null
      ? collaterals
      : collaterals.filter(c => c.CustomerId === scopedCustomerId),
    [collaterals, scopedCustomerId]
  );
```

Rồi thay `collaterals` bằng `collateralsTrongPhamVi` ở **mọi** `useMemo` dựng danh sách hiển thị, phân trang và số tổng. Đừng thay ở chỗ ghi (`saveCollateralAPI`) — nó dùng `inputCustomerId` riêng.

Khi có `scopedCustomerId`, đặt sẵn `inputCustomerId` cho form thêm mới:

```ts
  useEffect(() => {
    if (scopedCustomerId !== null) setInputCustomerId(scopedCustomerId);
  }, [scopedCustomerId]);
```

- [ ] **Bước 4: Chạy**

```bash
npx vitest run src/components/__tests__/CollateralView.phamVi.test.tsx && npm test
```

Kỳ vọng: XANH.

- [ ] **Bước 5: Commit**

```bash
git add src/hooks/useCollateralController.ts src/components/views/CollateralView.tsx src/components/__tests__/CollateralView.phamVi.test.tsx && git commit -m "feat(tsbd): thu hep danh sach theo khach hang tren URL"
```

---

## Task 14: Hai màn cuối bỏ `setActiveTab`, xoá `WorkContext`

**Tệp:**
- Sửa: `src/components/views/CustomerListView.tsx`, `src/components/views/DashboardView.tsx`, `src/components/AppLayout.tsx`, `src/components/ProviderComposer.tsx` (hoặc nơi đang lắp `WorkProvider`), `src/components/__tests__/routing.test.tsx`
- Xoá: `src/context/WorkContext.tsx`, `src/context/__tests__/WorkContext.test.tsx`

Ba tệp gọi `setActiveTab` còn lại sau Task 12 là `CustomerListView` và `DashboardView`. Xong hai chỗ này thì `WorkContext` không còn ai đọc.

- [ ] **Bước 1: Sửa `src/components/views/CustomerListView.tsx`**

Thay:

```tsx
import { useWork } from '../../context/WorkContext';
```

bằng:

```tsx
import { useNavigate } from 'react-router';
import { customerPath } from '../../lib/customerRoutes';
```

Thay:

```tsx
  const { setActiveTab, setSelectedCustomerId } = useWork();
```

bằng:

```tsx
  const navigate = useNavigate();
```

Ba nút hành động:

```tsx
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(customerPath('credit-contracts', c.Id));
                    }}
```

```tsx
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(customerPath('loans', c.Id));
                    }}
```

```tsx
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(customerPath('collaterals', c.Id));
                    }}
```

- [ ] **Bước 2: Sửa `src/components/views/DashboardView.tsx`**

Thay `import { useWork } …` bằng:

```tsx
import { useNavigate } from 'react-router';
import { customerPath } from '../../lib/customerRoutes';
```

```tsx
  const navigate = useNavigate();
```

```tsx
  const moLichTraNo = (customerId: number) => {
    navigate(customerPath('loans', customerId));
  };
```

- [ ] **Bước 3: Xoá `WorkContext`**

```bash
git rm src/context/WorkContext.tsx src/context/__tests__/WorkContext.test.tsx
```

Gỡ `WorkProvider` khỏi nơi lắp nó (tìm bằng `rg "WorkProvider" src`), gỡ khỏi `src/components/__tests__/routing.test.tsx` và mọi test khác đang bọc nó.

- [ ] **Bước 4: Chạy**

```bash
rg "useWork|WorkProvider|WorkContext" src ; npm test && npm run build
```

Kỳ vọng: lệnh `rg` **không ra dòng nào**; test và build XANH.

- [ ] **Bước 5: Tự kiểm trên giao diện thật**

Mở máy chủ phát triển bằng `mcp__Claude_Browser__preview_start` với cấu hình `web` (đừng chạy `npm run dev` qua Bash). Từ `/customers`:
1. Bấm nút **HĐTD** ở một dòng → đường dẫn phải thành `/customers/<id>/credit-contracts`, thanh ngữ cảnh hiện tên đúng khách.
2. Bấm **Vay** → `/customers/<id>/loans`.
3. Bấm **TSBĐ** → `/customers/<id>/collaterals`, danh sách chỉ còn tài sản của khách đó.
4. F5 ở mỗi chỗ → giữ nguyên màn và nguyên khách.
5. Back → về đúng màn trước.
6. Console không có lỗi (`mcp__Claude_Browser__read_console_messages`).

**Không nhập mật khẩu vào form đăng nhập.** Nếu màn đăng nhập hiện ra, nhờ chủ dự án tự đăng nhập một lần rồi dùng lại phiên đó. **Không xoá `localStorage`.**

- [ ] **Bước 6: Commit**

```bash
git add -A && git commit -m "refactor: xoa WorkContext, hai man cuoi dieu huong truc tiep"
```

---

## Task 15: Hai tuyến sâu — hồ sơ khách và lịch trả nợ của một KUNN

**Tệp:**
- Sửa: `src/components/views/CustomerListView.tsx`, `src/hooks/useCustomerListController.ts`, `src/hooks/useLoanPortfolioController.ts`

Hai tuyến đã khai trong `App.tsx` từ Task 2 nhưng chưa làm gì với `:kunnId` và `/profile`.

- [ ] **Bước 1: Viết test đỏ**

Tạo `src/components/__tests__/tuyenSau.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('../../lib/api', () => ({
  fetchCustomersAPI: async () => ([{ Id: 55, FullName: 'Trần Thị B', CifKh: '900055' }]),
  fetchCreditContractsByCustomerAPI: async () => [],
  fetchContractsByCustomerAPI: async () => ([{
    Id: 912, CustomerId: 55, ContractNumber: 'KUNN-912',
    LoanAmount: 400_000_000, IsSettled: false,
  }]),
  fetchCollateralsByCustomerAPI: async () => [],
  fetchCardContractsByCustomerAPI: async () => [],
  fetchRepaymentSchedulesAPI: async () => ([
    { Id: 1, ContractId: 912, PeriodNumber: 1, DueDate: '2026-09-05', PrincipalAmount: 10_000_000, InterestAmount: 500_000, IsPaid: false },
  ]),
  saveContractAPI: async () => ({}),
  deleteContractAPI: async () => {},
  bulkSaveRepaymentSchedulesAPI: async () => {},
  deleteRepaymentSchedulesByContractAPI: async () => {},
  deleteRepaymentSchedulesByIdsAPI: async () => {},
}));

import { useLoanPortfolioController } from '../../hooks/useLoanPortfolioController';

function Probe() {
  const { mainTab, selectedContract } = useLoanPortfolioController();
  return (
    <div>
      <span data-testid="tab">{mainTab}</span>
      <span data-testid="kunn">{selectedContract?.ContractNumber ?? '—'}</span>
    </div>
  );
}

afterEach(cleanup);

describe('tuyến sâu lịch trả nợ', () => {
  it('/customers/55/loans/912/schedule mở thẳng tab Lịch trả nợ của KUNN đó', async () => {
    render(
      <MemoryRouter initialEntries={['/customers/55/loans/912/schedule']}>
        <Routes>
          <Route path="/customers/:customerId/loans/:kunnId/schedule" element={<Probe />} />
        </Routes>
      </MemoryRouter>
    );
    await waitFor(() => expect(screen.getByTestId('kunn').textContent).toBe('KUNN-912'));
    expect(screen.getByTestId('tab').textContent).toBe('schedule');
  });
});
```

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/components/__tests__/tuyenSau.test.tsx
```

Kỳ vọng: ĐỎ.

- [ ] **Bước 3: Áp `:kunnId` trong `useLoanPortfolioController`**

Thêm:

```ts
import { useParams } from 'react-router';
```

```ts
  const { kunnId: kunnIdParam } = useParams<{ kunnId: string }>();
  const deepKunnId = kunnIdParam && /^\d+$/.test(kunnIdParam) ? Number(kunnIdParam) : null;
```

Sau khi `portfolio` đã dựng, thêm:

```ts
  const [daApDeepKunn, setDaApDeepKunn] = useState(false);

  useEffect(() => {
    if (deepKunnId === null || daApDeepKunn) return;
    const k = portfolio.contracts.find(c => c.Id === deepKunnId);
    if (!k) return;
    setDaApDeepKunn(true);
    portfolio.selectContract(k);
    setMainTab('schedule');
  }, [deepKunnId, daApDeepKunn, portfolio.contracts, portfolio.selectContract]);
```

`daApDeepKunn` chặn việc áp lại khi banker tự đóng KUNN đó ra.

- [ ] **Bước 4: Áp `/profile` trong `CustomerListView`**

Thêm:

```tsx
import { useSelectedCustomerId } from '../../hooks/useSelectedCustomerId';
```

```tsx
  const profileCustomerId = useSelectedCustomerId();

  useEffect(() => {
    if (profileCustomerId === null) return;
    const c = visibleCustomers.find(x => x.Id === profileCustomerId);
    if (c) openDrawerForEdit(c);
  }, [profileCustomerId, visibleCustomers, openDrawerForEdit]);
```

Đặt điều hướng tới đường này ở nút "Sửa":

```tsx
                    onClick={(e) => { e.stopPropagation(); navigate(customerProfilePath(c.Id)); }}
```

kèm import `customerProfilePath` từ `../../lib/customerRoutes`.

- [ ] **Bước 5: Chạy**

```bash
npx vitest run src/components/__tests__/tuyenSau.test.tsx && npm test && npm run build
```

Kỳ vọng: XANH.

- [ ] **Bước 6: Commit**

```bash
git add -A && git commit -m "feat(dinh-tuyen): tuyen sau /profile va /loans/:kunnId/schedule"
```

---

## Task 16: Header đọc cờ lỗi API — nốt nửa sau §6.3

**Tệp:**
- Tạo: `src/lib/apiHealth.ts`, `src/lib/__tests__/apiHealth.test.ts`, `src/hooks/useApiHealth.ts`
- Sửa: `src/lib/supabase.ts`, `src/components/Header.tsx`, `src/lib/i18n.ts`

Hiện chấm vẫn xanh "Trực tuyến" khi máy có mạng nhưng Supabase không với tới được — token hết hạn, rớt VPN, dự án tạm ngưng. Với hệ tín dụng, chấm xanh lúc lệnh lưu đang hỏng là tín hiệu sai.

**Điều gì tính là "không với tới được":** `fetch` ném lỗi (mạng), HTTP ≥ 500, hoặc HTTP 401 (hết phiên). **Không** tính 403 và các 4xx khác — 403 từ RLS là câu trả lời nghiệp vụ hợp lệ, không phải máy chủ hỏng.

**Giao diện:**
- Sản xuất:
  - `interface ApiHealthState { reachable: boolean; lastFailureAt: number | null }`
  - `recordApiSuccess(): void`
  - `recordApiFailure(): void`
  - `getApiHealth(): ApiHealthState` — **trả cùng một tham chiếu** khi chưa đổi, để `useSyncExternalStore` không vòng lặp vô hạn
  - `subscribeApiHealth(listener: () => void): () => void`
  - `resetApiHealth(): void`
  - `useApiHealth(): ApiHealthState`

- [ ] **Bước 1: Viết test đỏ**

Tạo `src/lib/__tests__/apiHealth.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getApiHealth, recordApiFailure, recordApiSuccess, resetApiHealth, subscribeApiHealth,
} from '../apiHealth';

beforeEach(() => resetApiHealth());

describe('apiHealth', () => {
  it('mặc định coi là với tới được', () => {
    expect(getApiHealth().reachable).toBe(true);
    expect(getApiHealth().lastFailureAt).toBeNull();
  });

  it('ghi nhận lỗi thì chuyển sang không với tới được', () => {
    recordApiFailure();
    expect(getApiHealth().reachable).toBe(false);
    expect(getApiHealth().lastFailureAt).not.toBeNull();
  });

  it('lần gọi thành công tiếp theo gỡ cờ', () => {
    recordApiFailure();
    recordApiSuccess();
    expect(getApiHealth().reachable).toBe(true);
  });

  it('không đổi trạng thái thì trả đúng một tham chiếu', () => {
    const a = getApiHealth();
    recordApiSuccess();
    expect(getApiHealth()).toBe(a);
  });

  it('báo cho người đăng ký khi trạng thái đổi, im lặng khi không đổi', () => {
    const nghe = vi.fn();
    const huy = subscribeApiHealth(nghe);

    recordApiSuccess();
    expect(nghe).not.toHaveBeenCalled();

    recordApiFailure();
    expect(nghe).toHaveBeenCalledTimes(1);

    recordApiFailure();
    expect(nghe).toHaveBeenCalledTimes(1);

    huy();
    recordApiSuccess();
    expect(nghe).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Bước 2: Chạy để chắc nó đỏ**

```bash
npx vitest run src/lib/__tests__/apiHealth.test.ts
```

Kỳ vọng: ĐỎ.

- [ ] **Bước 3: Viết `src/lib/apiHealth.ts`**

```ts
export interface ApiHealthState {
  reachable: boolean;
  lastFailureAt: number | null;
}

const BAN_DAU: ApiHealthState = Object.freeze({ reachable: true, lastFailureAt: null });

let state: ApiHealthState = BAN_DAU;
const listeners = new Set<() => void>();

function dat(next: ApiHealthState): void {
  if (next.reachable === state.reachable) return;
  state = Object.freeze(next);
  listeners.forEach(fn => fn());
}

export function recordApiSuccess(): void {
  dat({ reachable: true, lastFailureAt: state.lastFailureAt });
}

export function recordApiFailure(): void {
  dat({ reachable: false, lastFailureAt: Date.now() });
}

export function getApiHealth(): ApiHealthState {
  return state;
}

export function subscribeApiHealth(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function resetApiHealth(): void {
  state = BAN_DAU;
  listeners.clear();
}
```

- [ ] **Bước 4: Chạy lại**

```bash
npx vitest run src/lib/__tests__/apiHealth.test.ts
```

Kỳ vọng: XANH, 5 test.

- [ ] **Bước 5: Bọc `fetch` trong `src/lib/supabase.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import { recordApiFailure, recordApiSuccess } from './apiHealth';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Thiếu cấu hình Supabase. Vui lòng khai báo VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong file .env (xem .env.example).'
  );
}

const fetchCoGhiNhan: typeof fetch = async (input, init) => {
  try {
    const res = await fetch(input, init);
    if (res.status >= 500 || res.status === 401) recordApiFailure();
    else recordApiSuccess();
    return res;
  } catch (err) {
    recordApiFailure();
    throw err;
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchCoGhiNhan },
});
```

- [ ] **Bước 6: Viết `src/hooks/useApiHealth.ts`**

```ts
import { useSyncExternalStore } from 'react';
import { getApiHealth, subscribeApiHealth, type ApiHealthState } from '../lib/apiHealth';

export function useApiHealth(): ApiHealthState {
  return useSyncExternalStore(subscribeApiHealth, getApiHealth, getApiHealth);
}
```

- [ ] **Bước 7: Thêm khoá i18n**

`src/lib/i18n.ts`, cạnh `'header.offline'` trong **cả hai** từ điển:

```ts
    'header.serverUnreachable': 'Mất kết nối máy chủ',
```

```ts
    'header.serverUnreachable': 'Server unreachable',
```

- [ ] **Bước 8: Sửa `src/components/Header.tsx`**

Thêm import:

```tsx
import { useApiHealth } from '../hooks/useApiHealth';
```

Trong thân:

```tsx
  const { reachable } = useApiHealth();
```

Thay khối chấm trạng thái:

```tsx
        <span className="hidden md:flex items-center gap-1.5 text-xs">
          <span
            className={`w-1.5 h-1.5 rounded-full ${!isOnline ? 'bg-neg' : !reachable ? 'bg-warn' : 'bg-pos'}`}
            aria-hidden="true"
          />
          <span className={!isOnline ? 'text-neg font-semibold' : !reachable ? 'text-warn font-semibold' : 'text-ink-muted'}>
            {!isOnline ? t('header.offline') : !reachable ? t('header.serverUnreachable') : t('header.online')}
          </span>
        </span>
```

Ba trạng thái, ba màu: đỏ = máy mất mạng, vàng = máy có mạng nhưng máy chủ không trả lời, xanh = mọi thứ chạy.

- [ ] **Bước 9: Viết test cho Header**

Tạo `src/components/__tests__/Header.trangThai.test.tsx`:

```tsx
// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { LanguageProvider } from '../../context/LanguageContext';
import { ThemeProvider } from '../../context/ThemeContext';
import { recordApiFailure, recordApiSuccess, resetApiHealth } from '../../lib/apiHealth';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'u', email: 'a@b.vn' }, role: 'banker', fullName: 'Thử',
    isAdmin: false, signOut: async () => {},
  }),
}));

import { Header } from '../Header';

function dungLen() {
  return render(
    <ThemeProvider><LanguageProvider><Header /></LanguageProvider></ThemeProvider>
  );
}

beforeEach(() => resetApiHealth());
afterEach(cleanup);

describe('Header — chấm trạng thái', () => {
  it('mọi thứ chạy thì Trực tuyến', () => {
    dungLen();
    expect(screen.getByText('Trực tuyến')).toBeTruthy();
  });

  it('máy có mạng nhưng máy chủ không trả lời thì KHÔNG được hiện Trực tuyến', () => {
    recordApiFailure();
    dungLen();
    expect(screen.queryByText('Trực tuyến')).toBeNull();
    expect(screen.getByText('Mất kết nối máy chủ')).toBeTruthy();
  });

  it('gọi lại thành công thì quay về Trực tuyến', () => {
    recordApiFailure();
    recordApiSuccess();
    dungLen();
    expect(screen.getByText('Trực tuyến')).toBeTruthy();
  });
});
```

`resetApiHealth()` xoá cả danh sách người đăng ký, nên gọi nó **trước** `render` trong mỗi test, không phải sau.

- [ ] **Bước 10: Chạy**

```bash
npx vitest run src/components/__tests__/Header.trangThai.test.tsx && npm test && npm run build
```

Kỳ vọng: XANH.

- [ ] **Bước 11: Commit**

```bash
git add -A && git commit -m "feat(header): chuyen trang thai co lo loi tu lan goi API gan nhat"
```

---

## Task 17: Tự kiểm trên giao diện thật và cập nhật tài liệu

**Tệp:**
- Sửa: `CONVENTIONS.md` §15 mục "Định tuyến", `docs/superpowers/TRANG-THAI.md`

- [ ] **Bước 1: Chạy toàn bộ lưới an toàn**

```bash
npm test && npm run build && npm run lint
```

Kỳ vọng: test XANH (nhiều hơn 1.732 vì đợt này thêm test), build XANH, lint không thêm cảnh báo mới ngoài 62 cảnh báo có sẵn. Ghi lại con số thật.

- [ ] **Bước 2: Tự kiểm 19 màn trên giao diện thật**

Mở bằng `mcp__Claude_Browser__preview_start` cấu hình `web`. **Không nhập mật khẩu**; nếu hiện màn đăng nhập, nhờ chủ dự án đăng nhập một lần. **Không xoá `localStorage`.**

Danh sách phải qua hết:

| Việc | Kỳ vọng |
| :--- | :--- |
| Bấm từng mục thanh bên khi **chưa** chọn khách | 19 màn dựng, không màn trắng, không lỗi console |
| Chọn một khách ở màn HĐTD | URL thành `/customers/<id>/credit-contracts`, thanh ngữ cảnh hiện |
| Ở đường lồng, bấm sang Khoản vay / TSBĐ / Thẻ / KSSV | Giữ nguyên `<id>`, thanh ngữ cảnh không nhấp nháy |
| Số trên thanh ngữ cảnh | Dư nợ và hạn mức khả dụng khớp con số màn HĐTD đang hiện |
| Nhóm nợ trên thanh | Khớp nhóm nợ màn Khoản vay đang hiện |
| F5 ở đường lồng | Giữ nguyên màn và nguyên khách |
| Back sau chuỗi điều hướng | Về đúng màn trước, đúng khách trước |
| Bấm "Đổi khách hàng" | Về `/customers` |
| "Giải ngân từ HĐTD" | Sang `/customers/<id>/loans`, form KUNN điền sẵn, URL **không** còn `?disburse=` |
| Back ngay sau giải ngân | **Không** kích lại luồng giải ngân |
| `/post-loan-control` (đường phẳng) | Vẫn hiện toàn danh mục |
| Đường dẫn lạ `/khong-co-gi` | Về `/dashboard` |
| Console suốt phiên | Không lỗi |

Chụp lại bằng `mcp__Claude_Browser__computer` `screenshot` một ảnh thanh ngữ cảnh ở đường lồng để gửi chủ dự án.

- [ ] **Bước 3: Đo lại độ trễ thật của thanh ngữ cảnh**

Dùng `mcp__Claude_Browser__read_network_requests` lọc `ContractPaidPrincipal` và `RepaymentSchedules` khi mở `/customers/55/loans`. Ghi lại thời gian thật của từng lượt. Kỳ vọng: hai lượt mạng, tổng dưới 300 ms trên mạng thường. **Nếu vượt xa số đo ở kế hoạch, dừng lại và báo chủ dự án** — đừng lặng lẽ chấp nhận.

- [ ] **Bước 4: Cập nhật `CONVENTIONS.md` §15 "Định tuyến"**

Viết lại mục đó theo **hiện trạng sau đợt 1b**, phân biệt rõ đâu là đích đâu là hiện trạng, kèm con số thật:
- Hai họ đường dẫn phẳng / lồng, ý nghĩa từng họ.
- `src/lib/customerRoutes.ts` là nơi duy nhất dựng và đọc đường dẫn có `:customerId`.
- Thêm màn vẫn phải sửa ba chỗ; thêm màn **có phạm vi khách** phải sửa bốn chỗ, chỗ thứ tư là `CUSTOMER_SCOPED_SCREENS`.
- **Xoá** đoạn "Cầu tạm cần gỡ" về `WorkContext.setActiveTab` — `WorkContext` đã xoá hẳn.
- Thay đoạn "Sáu màn hồ sơ khách hàng hiện dùng đường dẫn phẳng" bằng hiện trạng mới.
- Ghi lại phán quyết đo được: đọc `RepaymentSchedules` thô bị RLS gọi hàm từng dòng, dùng `ContractPaidPrincipal` khi chỉ cần gốc đã trả.

- [ ] **Bước 5: Cập nhật `docs/superpowers/TRANG-THAI.md`**

- Bảng "Đang ở đâu": đợt vừa xong là **1b**, đợt kế tiếp là **2**, số test và số cảnh báo lint thật.
- Bảng "Tám đợt": 1b thành ✅.
- Mục "Cầu tạm cần gỡ ở đợt 3–7": xoá — không còn cầu tạm nào.
- Mục "Việc còn treo": bỏ dòng "Header mới làm nửa spec §6.3" và dòng "`SCREEN_OF_PATH` xuất ra chỉ để test của chính nó dùng"; **thêm** hai dòng mới:
  - *"RLS gọi `can_access_contract` từng dòng trên `RepaymentSchedules`"* — mức **quan trọng**. Bốn controller vẫn đọc lịch trả nợ thô, 30–66 ms mỗi KUNN. Khách 6 KUNN mất 180–400 ms chỉ để mở màn. Cách chữa là đổi hàm RLS sang dạng lọc theo tập hợp thay vì gọi theo dòng, hoặc thêm view gộp — cần chủ dự án duyệt vì đụng CSDL sản xuất.
  - *"`fetchCustomersAPI()` nạp cả 51 khách chỉ để lấy tên một khách cho thanh ngữ cảnh"* — mức thấp. Đúng ra nên có `fetchCustomerByIdAPI`. Hôm nay rẻ vì danh sách nhỏ và đã nằm trong bộ nhớ đệm của trình duyệt.
- Mục "Đợt 1b sẽ làm gì" đổi thành "Đợt 1b đã tạo ra gì", liệt kê tệp mới và phán quyết.
- Ghi lại bảng số đo độ trễ ở Bước 3 (số thật đo trên trình duyệt, không phải số `EXPLAIN`).

- [ ] **Bước 6: Commit**

```bash
git add CONVENTIONS.md docs/superpowers/TRANG-THAI.md && git commit -m "docs: dot 1b hoan tat — dong bo quy uoc va trang thai"
```

---

## Tự rà lại kế hoạch

**Phủ bản thiết kế:**

| Yêu cầu spec | Task |
| :--- | :--- |
| §6.1 lồng năm màn vào `/customers/:id/…` | 1, 2 |
| §6.1 `/customers/:id/profile` | 2, 15 |
| §6.1 `/customers/:id/loans/:kunnId/schedule` | 2, 15 |
| §6.2 thanh ngữ cảnh: tên, CIF, điện thoại, dư nợ, hạn mức khả dụng, nhóm nợ, nút đổi khách | 5, 6, 7 |
| §6.2 xoá `selectedCustomerId` khỏi `WorkContext` | 8, 9, 10, 11, 14 |
| §6.2 bốn kiểu chọn khách gộp thành một chỗ | 7 (nút đổi khách), 8–11 (ô chọn đều điều hướng cùng một đường) |
| §6.2 `disburseRequest` thay bằng điều hướng URL | 12 |
| §6.3 nửa sau — cờ lỗi từ lần gọi API thật gần nhất | 16 |
| Chuyển bốn controller khỏi `WorkContext` | 8, 9, 10, 11 |

**Ngoài phạm vi đợt này, cố ý bỏ:**
- `/tools/calculators/:tool` (§6.1) — thuộc đợt 5.
- Gộp ba màn tồn kho (§6.5) — thuộc đợt 5.
- Bộ component và `Dialog`/`ConfirmDialog` (§5) — thuộc đợt 2. Thanh ngữ cảnh ở Task 7 dùng thẳng token, đợt 2 sẽ rút vào bộ component.
- Chốt "chưa lưu" khi Back xoá biểu mẫu KUNN đang điền dở — thuộc đợt 3, đã ghi ở "Việc còn treo".
- Sửa hàm RLS `can_access_contract` — đụng CSDL sản xuất, cần chủ dự án duyệt riêng.
