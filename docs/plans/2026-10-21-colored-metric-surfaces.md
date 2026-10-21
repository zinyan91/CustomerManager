# Viền và bóng màu cho KPI, thẻ số liệu

**Mục tiêu:** Thẻ KPI và thẻ số liệu có viền/bóng màu nhận biết rõ ngay ở trạng thái thường, giữ bề mặt mềm và chữ dễ đọc.
**Phạm vi:** LÀM: tăng viền màu và bóng theo sắc từng chỉ số ở thẻ KPI dùng chung, dải số liệu và KPI dashboard; nối thống kê câu hỏi/tổng hợp vốn lưu động vào cùng style; giữ màu khi hover/chọn. KHÔNG LÀM: đổi nội dung, công thức, chức năng, dữ liệu, điều hướng hoặc tự commit/push.
**Tệp dự kiến chạm:** src/index.css; components/dashboard/KpiCard.tsx; components/quiz/QuizTelemetryStrip.tsx; components/inventory/WorkingCapitalSummaryTab.tsx; AGENTS.md; docs/specs/workspace-visual-conventions.md; docs/progress/2026-10.md.
**Tầng:** CSS/giao diện; chỉ gắn marker trình bày cho số liệu sẵn có, không sửa phép tính.
**Kiểm chứng bằng gì:** Edge render component thật sáng/tối ở desktop/tablet/mobile; đo viền/bóng theo từng màu, nền, tương phản, overflow; nhấn lọc, chọn, focus; kiểm dialog/print; full Vitest và build.
**Rủi ro đã biết:** Style làm phẳng xoá bóng/viền nếu sai specificity; bóng lan quá rộng làm các thẻ dính màu; hover/chọn không được trở về bóng xám hoặc mất nghĩa cảnh báo; giữ nguyên kích thước dashboard.

## Thiết kế

- Giữ palette, font, bán kính và khoảng cách hiện có. Không thêm token màu mới.
- Viền 1px pha 55% màu chỉ số với line; nền pha 3% với panel.
- Bóng hai tầng cùng màu chỉ số: sát thẻ 12%, bóng mềm lan thấp 24%; dùng chung cho thẻ số liệu và KPI.
- Hover/chọn tăng viền/bóng cùng sắc, ô chọn có vòng ngoài mảnh. Cảnh báo đỏ/vàng vẫn giữ màu riêng.
- Dashboard giữ bố cục, góc bo, nội dung và hiệu ứng sẵn có; đồng bộ riêng viền/bóng theo màu đang có.
- Gắn marker rõ vào nhóm thẻ số liệu bổ sung, không suy màu từ thứ tự thẻ hoặc quét class tùy tiện.

## Kiểm chứng

- Full Vitest 4.725 test/374 tệp đạt; build TypeScript + Vite cuối và oxlint các tệp nguồn sửa/thêm đạt; `git diff --check` đạt.
- Edge render component thật sáng/tối × 1440/1024/768/390/320px: 390 lượt thẻ (dashboard, KPI team và tám dải số liệu). Không có số liệu/trang tràn; màu bóng khớp màu từng chỉ số ở cả 390 lượt.
- 780 mẫu chữ trên nền thẻ đo được tương phản thấp nhất 5,32:1, không mẫu dưới 4,5:1; không lỗi JS.
- Nhấn lọc khách hàng/tài sản và focus bàn phím đạt; chọn KPI hết hiệu lực giữ viền/bóng đỏ, không chuyển sang bóng xanh hoặc xám.
- Kiểm chứng bắt được style specular của chế độ sáng ghi đè bóng dashboard; sửa specificity và kiểm lại đạt.
- Đã xem ảnh KPI team desktop sáng và thẻ số liệu mobile tối. Dialog vẫn giữ bo góc riêng; CSS màu chỉ áp dụng media screen.
- Fixture dùng dữ liệu mẫu, không truy cập/ghi production. Chưa kiểm toàn bộ route với phiên đăng nhập thật.

## Kiểm chứng

- Full Vitest 4.725 test/374 tệp đạt; build TypeScript + Vite cuối và oxlint các tệp nguồn sửa/thêm đạt; `git diff --check` đạt.
- Edge render component thật sáng/tối × 1440/1024/768/390/320px: 390 lượt thẻ (dashboard, KPI team và tám dải số liệu). Không có số liệu/trang tràn; màu bóng khớp màu từng chỉ số ở cả 390 lượt.
- 780 mẫu chữ trên nền thẻ đo được tương phản thấp nhất 5,32:1, không mẫu dưới 4,5:1; không lỗi JS.
- Nhấn lọc khách hàng/tài sản và focus bàn phím đạt; chọn KPI hết hiệu lực giữ viền/bóng đỏ, không chuyển sang bóng xanh hoặc xám.
- Kiểm chứng bắt được style specular của chế độ sáng ghi đè bóng dashboard; sửa specificity và kiểm lại đạt.
- Đã xem ảnh KPI team desktop sáng và thẻ số liệu mobile tối. Dialog vẫn giữ bo góc riêng; CSS màu chỉ áp dụng media screen.
- Fixture dùng dữ liệu mẫu, không truy cập/ghi production. Chưa kiểm toàn bộ route với phiên đăng nhập thật.
