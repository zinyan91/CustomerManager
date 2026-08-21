# Đợt 2 — Bộ Component Dùng Chung & Dialog / ConfirmDialog

> **Cho người thi công:** BẮT BUỘC dùng kỹ năng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans` để thi công từng task một. Các bước dùng ô đánh dấu (`- [ ]`).

**Mục tiêu:** Xây dựng bộ component dùng chung chuẩn hoá trên nền Radix UI primitives (`@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-tabs`), thay thế toàn bộ 15 modal tự dựng và 13 tệp dùng `window.confirm`, đồng thời loại bỏ việc truyền chuỗi class qua props.

**Kiến trúc:** 
Tạo thư mục `src/components/ui/` chứa các component nguyên tử (Atomic UI Primitives):
1. `Button`, `StatusPill`, `Panel`, `PanelHeader`, `KpiCard`, `Field`, `FeedbackStates` (`LoadingState`, `EmptyState`, `ErrorState`).
2. `Dialog` (hỗ trợ cả modal thông thường lẫn drawer trượt từ mép phải `side="right"` qua `@radix-ui/react-dialog`).
3. `ConfirmDialog` & `useConfirm()` hook (thay thế triệt để `window.confirm`).
4. `Tabs` (qua `@radix-ui/react-tabs`).
5. `CustomerPicker` (qua `@radix-ui/react-popover`).
6. `DataTable` (kế thừa cơ chế priority 1/2/3 và breakpoint `md` của `AdaptiveTable`, bỏ class string props).

**Công nghệ:** React 19 · TypeScript · `@radix-ui/react-dialog` · `@radix-ui/react-popover` · `@radix-ui/react-tabs` · Lucide React · Tailwind CSS · Vitest + Testing Library.

**Bản thiết kế:** `docs/superpowers/specs/2026-08-19-rebuild-giao-dien-design.md` — §5 "Bộ component dùng chung".

**Trạng thái nền:** `docs/superpowers/TRANG-THAI.md`

---

## Ràng buộc toàn cục

- **Chỉ cài 3 gói Radix UI**, không hơn: `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-tabs`.
- **Không truyền chuỗi class qua props**: Xoá bỏ hoàn toàn các props như `containerCardBg`, `inputStyle`, `labelStyle`, `tableHeaderStyle`. Component đọc trực tiếp token CSS hoặc biến thể (variants).
- **Tiếp cận (Accessibility)**: Dialog phải có bẫy tiêu điểm (focus trap), đóng bằng phím Escape, thuộc tính `aria-describedby` / `aria-labelledby`.
- **Bo góc chuẩn**: `--r-panel` 12px, `--r-control` 8px, `--r-pill` 999px.
- **Thang chữ chuẩn**: `--fs-label` (11px), `--fs-dense` (12px), `--fs-body` (13px), `--fs-title` (15px), `--fs-screen` (18px), `--fs-num` (24px).
- **Màu ngữ nghĩa**: Nền đặc `bg-pos`, `bg-warn`, `bg-neg` đi kèm `text-surface` (không dùng `text-white`).
- **Test độc lập & không gọi mạng**: Mọi component có test đơn vị riêng, kiểm tra tương tác bàn phím, focus và ARIA attributes.
- **Bảo toàn tính liên tục**: Sau mỗi task, `npm test` và `npx tsc -b` phải luôn xanh (100% pass).

---

## Danh sách các Task thi công

### Task 1: Cài đặt 3 gói Radix UI Primitives & Khởi tạo thư mục `src/components/ui/`
- Cài đặt `@radix-ui/react-dialog`, `@radix-ui/react-popover`, `@radix-ui/react-tabs`.
- Kiểm tra `package.json`, `package-lock.json`, chạy `npx tsc -b` và `npm test`.

### Task 2: Component `Button` & `StatusPill`
- Tạo `src/components/ui/Button.tsx` (variants: `primary`, `secondary`, `danger`, `ghost`, `outline`; sizes: `sm`, `md`, `lg`; loading state).
- Tạo `src/components/ui/StatusPill.tsx` (token semantic status, `rounded-[var(--r-pill)]`, `text-surface` on solid background).
- Viết unit tests: `src/components/ui/__tests__/Button.test.tsx`, `src/components/ui/__tests__/StatusPill.test.tsx`.

### Task 3: Component `Panel`, `PanelHeader` & `KpiCard`
- Tạo `src/components/ui/Panel.tsx` (card container `rounded-[var(--r-panel)]`, border, specular glassmorphism token, header không custom màu chữ tự do).
- Tạo `src/components/ui/KpiCard.tsx` (cố định cỡ số 24px `--fs-num`, 5 sắc thái KPI: `accent`, `kpi-cust`, `kpi-collateral`, `kpi-card`, `neg`/`warn`).
- Viết unit tests: `src/components/ui/__tests__/Panel.test.tsx`, `src/components/ui/__tests__/KpiCard.test.tsx`.

### Task 4: Component `Field` (Form controls & Inline Errors)
- Tạo `src/components/ui/Field.tsx` (nhãn `--fs-label`, wrapper cho Input/Select/Textarea, hiển thị lỗi ngay dưới ô nhập liệu).
- Viết unit tests: `src/components/ui/__tests__/Field.test.tsx`.

### Task 5: Component `Dialog` (Radix Dialog with Standard & Slide-over Drawer)
- Tạo `src/components/ui/Dialog.tsx` bọc `@radix-ui/react-dialog` (`DialogRoot`, `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`).
- Hỗ trợ `variant="center"` (modal tiêu chuẩn) và `variant="drawer"` (slide-over từ mép phải cho form dài).
- Viết unit tests: `src/components/ui/__tests__/Dialog.test.tsx`.

### Task 6: Component `ConfirmDialog` & Hook `useConfirm`
- Tạo `src/components/ui/ConfirmDialog.tsx` & `src/context/ConfirmContext.tsx` (hỗ trợ gọi hàm `confirm({ title, message, tone, confirmText, cancelText })` trả về Promise<boolean>).
- Viết unit tests: `src/components/ui/__tests__/ConfirmDialog.test.tsx`.

### Task 7: Component `Tabs` (Radix Tabs)
- Tạo `src/components/ui/Tabs.tsx` bọc `@radix-ui/react-tabs` (`TabsRoot`, `TabsList`, `TabsTrigger`, `TabsContent`) với điều hướng phím mũi tên.
- Viết unit tests: `src/components/ui/__tests__/Tabs.test.tsx`.

### Task 8: Component `DataTable` (Adaptive Responsive Table)
- Tạo `src/components/ui/DataTable.tsx` thay thế `AdaptiveTable.tsx` cũ, giữ nguyên priority 1/2/3, breakpoint `md`, sticky header, bỏ class string props.
- Viết unit tests: `src/components/ui/__tests__/DataTable.test.tsx`.

### Task 9: Component `FeedbackStates` (`LoadingState`, `EmptyState`, `ErrorState`)
- Tạo `src/components/ui/FeedbackStates.tsx` chuẩn hoá các trạng thái tải dữ liệu, bảng rỗng và báo lỗi kèm nút thử lại.
- Viết unit tests: `src/components/ui/__tests__/FeedbackStates.test.tsx`.

### Task 10: Component `CustomerPicker` (Radix Popover)
- Tạo `src/components/ui/CustomerPicker.tsx` bọc `@radix-ui/react-popover` với ô tìm kiếm nhanh và danh sách khách hàng thả nổi chuẩn ARIA.
- Viết unit tests: `src/components/ui/__tests__/CustomerPicker.test.tsx`.

### Task 11: Thay thế `window.confirm` trong toàn bộ 13 tệp codebase
- Chuyển `Header.tsx`, `useCustomerListController.ts`, `useCreditContractController.ts`, `useLoanPortfolioController.ts`, `useCollateralController.ts`, `useQuizBankController.ts`, `useCardPolicyController.ts`, `useInventoryController.ts`, `usePaymentModal.ts`, etc. sang dùng `useConfirm()`.

### Task 12: Chuyển đổi các Modal tự dựng sang `Dialog` / `Dialog (drawer)`
- Chuyển đổi `CustomerDrawerForm`, `CreditContractFormModal`, `CardContractModal`, `PaymentModal`, `SaleCatalogModal`, `KunnForm` (modal wrapper), etc.

### Task 13: Nghiệm thu toàn diện Đợt 2 & Cập nhật `TRANG-THAI.md`
- Kiểm tra toàn bộ 92+ test files (1.858+ tests), `npx tsc -b`, kiểm tra trực quan.
- Cập nhật tài liệu `docs/superpowers/TRANG-THAI.md`.
