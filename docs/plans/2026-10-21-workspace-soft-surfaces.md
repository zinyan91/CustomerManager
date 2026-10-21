# Làm mềm bề mặt KPI và bảng

**Mục tiêu:** Bớt cảm giác khung kỹ thuật và đường kẻ cứng, giữ phân cấp dễ đọc và màu trạng thái.
**Phạm vi:** LÀM: bỏ cạnh màu 3px/vạch chọn trên thẻ, bo KPI 12px theo token panel, viền mảnh và bóng nhẹ để tách nền; nhãn nhẹ hơn, nới nhịp dọc; giảm độ đậm của tiêu đề bảng. KHÔNG LÀM: đổi dữ liệu, điều hướng, chức năng, thiết kế dashboard hoặc tự commit/push.
**Tệp dự kiến chạm:** src/index.css; components/ui/KpiCard.tsx; lib/uiClasses.ts; ba dải KPI phụ trợ trong components/inventory để đồng bộ nhãn; AGENTS.md; docs/specs/workspace-visual-conventions.md; docs/progress/2026-10.md.
**Tầng:** CSS và trình bày component; không thay logic nghiệp vụ.
**Kiểm chứng bằng gì:** Chụp trước/sau các component thật trên localhost; đo bo góc, viền, nền, tương phản, tràn nội dung ở sáng/tối và 1440/390/320px; thử lọc/tab/chọn dòng, kiểm dialog và media print; full Vitest, build, lint tệp sửa.
**Rủi ro đã biết:** Style làm phẳng có độ ưu tiên cao sẽ xoá bóng/bo góc nếu selector KPI không thắng; giảm độ rõ viền phải có nền/bóng đủ phân biệt; không dùng màu nền quá đậm làm giảm tương phản; không nới lề ngang gây thiếu chỗ cho số tiền.

## Thiết kế

- Giữ palette hiện có, không thêm màu: panel #FFFFFF, surface #F3F5F8, line #C4D1E3, ink #0A192F, accent #004CB8; các trạng thái theo token. Tối lấy cùng token ngữ nghĩa.
- KPI nền pha màu 3%, viền trung tính nhẹ, bo 12px, bóng nhỏ sát mặt thẻ. Màu tập trung ở số và icon, không đóng khung bằng các cạnh màu đậm.
- Ô chọn dùng nền accent nhẹ và viền nhấn mảnh; focus bàn phím riêng, giữ nhãn và màu số cảnh báo.
- Nhãn dùng chữ thường theo nội dung, độ đậm vừa; số là trọng tâm. Giữ font/cỡ chữ theo cấu hình, không tải font hoặc thêm chữ.
- Bảng và menu giữ liền khối; đầu bảng nền pha nhẹ, chữ đủ tương phản, đường chia mềm hơn. Không thêm khung bo góc quanh cả trang.

```text
Menu | Tiêu đề
     |   ( KPI )   ( KPI )   ( KPI )   nền và bóng rất nhẹ
     | Thanh lọc
     | Tiêu đề cột nhạt hơn, không giãn chữ quá rộng
     | Dòng dữ liệu
```

So với bản cạnh màu 3px: bỏ đường nhấn dày và nhãn in hoa thay vì chỉ tăng bán kính. Giữ màu để nhận biết ý nghĩa, dùng bề mặt/nền để phân nhóm.

## Kết quả kiểm chứng

- Full `npm test -- --maxWorkers=4`: 4.725 test / 374 tệp đạt. Build TypeScript + Vite và oxlint tệp nguồn sửa/thêm đạt; `git diff --check` đạt.
- Edge render component thật trên localhost: sáng/tối × 1440/1024/768/390/320px, tổng 280 thẻ thống kê/KPI, không tràn thẻ/trang; bo góc 12px, cạnh 1px, không còn cạnh màu 3px/vạch chọn trên.
- 1.206 mẫu chữ trên nền thực tế: tương phản thấp nhất 4,97:1; không có mẫu dưới 4,5:1.
- Nhấn lọc khách hàng/tài sản, tab báo cáo, chọn dòng đạt; Tab bàn phím có outline 2px. Dialog vẫn bo 12px/nền riêng; media print không bị style làm phẳng màn hình.
- Đã đối chiếu ảnh trước/sau desktop sáng và mobile tối, gồm bảy KPI team.
- Bắt được lỗi ép ba ô số tiền vào vùng nội dung tablet khi có menu phụ; đổi dải KPI sang auto-fit theo chiều rộng nội dung, loại có số tiền dài/icon dùng min-width 260px. Kiểm lại không còn tràn.
- Fixture dùng dữ liệu mẫu, không truy cập production. Chưa kiểm toàn bộ route với phiên đăng nhập thật.
