**Mục tiêu:** Báo cáo (/office) nằm ở menu phụ Tổng quan; Quản lý văn thư và Kho lưu trữ là hai tab chính riêng.
**Phạm vi:** LÀM: chuyển office sang overview, tách dispatch/storage khỏi Tài liệu; hai tab mở trực tiếp và bỏ menu phụ lặp một mục, giữ điều hướng nội bộ có sẵn. KHÔNG LÀM: đổi route, quyền, dữ liệu, nội dung chức năng hoặc editor Báo cáo.
**Tệp dự kiến chạm:** workspaceNavigation, PrimaryRail, AppLayout; test điều hướng/route; spec/progress.
**Tầng:** Danh mục và vỏ giao diện.
**Kiểm chứng bằng gì:** Test nhóm/menu theo quyền và route; browser desktop/mobile chuyển đúng trang, không sidebar trống, menu Tổng quan có Báo cáo và Báo cáo Excel. Full test/build.
**Rủi ro đã biết:** Báo cáo trong ảnh là /office, khác /hub/reports. Office giữ layout riêng; không nhầm chuyển hai chức năng thành một. Hai tab độc lập cần main x88, không chừa khoảng sidebar 220px.
