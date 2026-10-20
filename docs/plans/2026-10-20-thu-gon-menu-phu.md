**Mục tiêu:** Menu phụ desktop gọn hơn, nhãn khoản vay không còn hậu tố (KUNN).
**Phạm vi:** LÀM: giảm chiều rộng cột phụ từ 240px xuống 220px, đồng bộ mép main và cây chứng từ; đổi nhãn điều hướng tiếng Việt. KHÔNG LÀM: đổi nghiệp vụ, dữ liệu, chiều rộng menu lớp phủ điện thoại.
**Tệp dự kiến chạm:** Sidebar.tsx, AppLayout.tsx, DocumentTemplateView.tsx, lib/i18n.ts, Sidebar.test.tsx; spec và progress.
**Tầng:** Giao diện và nhãn dịch dùng chung.
**Kiểm chứng bằng gì:** npm test, npm run build; browser đo cột phụ 220px, main bắt đầu x308, thu gọn về x88, menu khoản vay không xuống dòng; kiểm cây chứng từ.
**Rủi ro đã biết:** Cột phụ và mép main cần đổi cùng nhau để tránh khoảng trống hoặc chồng lấn.
