# Làm rõ ranh giới ô KPI trong bố cục phẳng

**Mục tiêu:** Nhìn rõ từng ô KPI và ô đang lọc, giữ trang liền menu phụ.
**Phạm vi:** LÀM: style chung cho sáu dải data-workspace-metrics hiện có (khách hàng, HĐTD, định giá, hóa đơn, bảng kê, công nợ): nền nhẹ, khoảng cách nhỏ, viền đầy đủ, nhấn ô được chọn và focus bàn phím. KHÔNG LÀM: đổi dashboard, dữ liệu/công thức/chức năng, thêm chữ, bo góc/bóng khung trang, tự commit/push.
**Tệp dự kiến chạm:** src/index.css; docs/progress/2026-10.md.
**Tầng:** CSS hiển thị, dùng marker/aria-pressed hiện có; không đổi component/hook/lib.
**Kiểm chứng bằng gì:** Edge fixture sáng/tối, desktop/mobile: đo gap/viền/nền trước và sau, nhấn lọc/focus, số liệu và ô tổng hợp đủ nội dung, không tràn ngang; kiểm tra ba trang tín dụng và ba dải phụ trợ; full Vitest/build và git diff --check.
**Rủi ro đã biết:** selector cũ làm phẳng có độ ưu tiên cao hơn selector chia viền; sửa đúng phạm vi metrics, không lan sang bảng/form/dialog. Khoảng cách mới thu hẹp chiều rộng nội dung tiền; chỉnh padding ô và một cột ở màn dưới 360px.

## Thiết kế

Kế thừa token sáng: surface #F3F5F8, panel #FFFFFF, line #C4D1E3, ink #0A192F, accent #004CB8, accent-soft #E5EEF9; chế độ tối dùng ánh xạ có sẵn. Font và cỡ chữ giữ nguyên.

```text
Menu | Tiêu đề
     | nền surface
     | [ KPI 1 ]  [ KPI 2 ]  [ KPI 3 ]  [ KPI 4 ]
     | [ô chọn: nền accent-soft + viền và vạch trên accent]
     | bộ lọc / bảng
```

Chọn nền trung tính, viền 1px và khe 10px thay vì tô mỗi ô một màu hoặc dùng bóng nổi. Lề dải 16px, padding ô 12px. Rà lại với yêu cầu giữ phẳng: chỉ các ô KPI có viền riêng; khung trang và menu vẫn nối liền, không thêm bo góc.
