---
description: Quy chuẩn kiến trúc bắt buộc: Single Responsibility Principle (SRP), Separation of Concerns (SoC), Decoupling UI and Business Logic.
---

# Quy Chuẩn Kiến Trúc & Thiết Kế Code (Architecture Principles)

## 1. Single Responsibility Principle (SRP) — Đơn Trách Nhiệm
- Mỗi module, component, hook hoặc pure function chỉ chịu trách nhiệm cho **MỘT mục đích duy nhất**.
- **Tuyệt đối không "dồn cục" (monolithic bundling):** Không gom chung Header, Filter/Search Bar, KPI Telemetry Cards, Form nhập/sửa Modal, Table dữ liệu và thuật toán tổng hợp vào chung một tệp `.tsx`.
- Khi một component phình to hoặc đảm nhận từ 2 trách nhiệm hiển thị/điều khiển trở lên, **bắt buộc phải bóc tách** thành các component con và đặt vào thư mục tương ứng (ví dụ: `*Table.tsx`, `*Modal.tsx`, `*Card.tsx`, `*Bar.tsx`).

## 2. Separation of Concerns (SoC) — Tách Biệt Mối Quan Tâm
- Phân định ranh giới rành mạch giữa 3 tầng:
  - **Tầng Logic & Toán nghiệp vụ (`src/lib/`):** Các hàm thuần (Pure Functions), độc lập hoàn toàn với React JSX/DOM, nhận input và trả output, được kiểm thử tự động 100% bằng Vitest.
  - **Tầng Trạng thái & Điều phối (`src/hooks/`, `src/context/`):** Quản lý vòng đời dữ liệu, kết nối Supabase, form state, caching và xử lý side-effects.
  - **Tầng Hiển thị / UI View (`src/components/`):** Chuyên trách trình bày giao diện (Specular Glassmorphism, Responsive, Typography, Tokens), nhận dữ liệu qua props và phát tín hiệu qua callbacks/events.

## 3. Decoupling UI and Business Logic — Tách Rời Giao Diện & Logic Nghiệp Vụ
- **Tuyệt đối không nhúng công thức nghiệp vụ vào `.tsx`:** Mọi phép tính tiền, lãi suất, ngày tháng, LTV, hạn mức, phân nhóm nợ, bảng kê, công nợ, khấu trừ... phải nằm ở `src/lib/`. View chỉ gọi hàm hoặc hook và hiển thị kết quả.
- View không tự phân tích dữ liệu thô (raw data parsing) hoặc tự chạy các vòng lặp aggregate phức tạp ngay trong lúc render.
