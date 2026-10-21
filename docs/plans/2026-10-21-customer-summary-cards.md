# Tinh chỉnh KPI Danh sách khách hàng

**Mục tiêu:** Số lượng dễ nhìn hơn, mỗi loại hồ sơ có biểu tượng riêng, trạng thái lọc rõ và bố cục cân đối.
**Phạm vi:** LÀM: riêng bốn thẻ của CustomerListSummaryStrip, số lớn/tabular, icon theo nghĩa, màu viền/bóng hiện có, icon tô đặc khi chọn; desktop bốn ô và màn nhỏ 2×2. KHÔNG LÀM: đổi số liệu, bộ lọc, nội dung nhãn, bảng khách hàng, KPI trang khác hoặc tự commit/push.
**Tệp dự kiến chạm:** src/components/customers/CustomerListSummaryStrip.tsx; src/index.css; docs/specs/workspace-visual-conventions.md; docs/progress/2026-10.md.
**Tầng:** Component trình bày và CSS; dùng props/counts/callback hiện có.
**Kiểm chứng bằng gì:** Render component thật sáng/tối, 1440/1024/768/390/320px, kiểm nhấn cả ba bộ lọc và focus; thử số 0/số lớn, đo tràn, màu/viền/bóng, grid 4/2 cột và tương phản; full Vitest, build, lint.
**Rủi ro đã biết:** CSS chung ghi đè padding, grid và cỡ số; không đổi thẻ KHLQ thành nút vì chưa có bộ lọc này; không để đổi màu chữ khi chọn làm mất sắc ngữ nghĩa.

## Thiết kế

- Giữ token panel/surface/line và bo 12px. Tổng hồ sơ tím khách hàng, đang làm việc xanh lục, lưu trữ slate, quan hệ khách hàng xanh dương.
- Header mỗi thẻ: nhãn bên trái, icon 32px nền màu nhẹ bên phải. Trạng thái đang lọc có icon nền màu đặc.
- Số lượng phía dưới, cỡ `--fs-num`, font theo cấu hình, tabular-nums. Không thêm dòng phụ, tỷ lệ hoặc badge.
- Bốn thẻ ngang ở desktop từ 1280px; 2×2 bên dưới, tránh hàng lẻ ba thẻ khi menu phụ chiếm chỗ.
- Giữ viền và bóng màu theo hướng người dùng đã chọn; tăng khoảng thở trong thẻ lên 16px.

## Kiểm chứng

- Full Vitest 4.725 test/374 tệp đạt; build TypeScript + Vite cuối, oxlint component và `git diff --check` đạt.
- Edge component thật sáng/tối × 1440/1024/768/390/320px: 40 lượt thẻ không tràn, số 0 và 99.999 không tràn. Desktop bốn cột; các cỡ dưới 1280px hai cột.
- Đo thẻ cao đều 108,39px, số 24px theo cấu hình mặc định; tương phản chữ/icon thấp nhất 5,16:1; không lỗi JS.
- Cả ba nút gọi đúng callback ALL/active/archived, mỗi lần chỉ một nút được chọn; thẻ KHLQ không trở thành nút. Focus bàn phím outline 2px.
- Padding dải tài sản đối chứng vẫn 14px 12px; chỉ dải khách hàng đổi thành 16px. Đã xem ảnh desktop sáng và mobile sáng/tối; nhãn cân dòng không rơi từ lẻ.
- Fixture dùng dữ liệu mẫu. Chưa kiểm toàn bộ trang với phiên đăng nhập thật.
