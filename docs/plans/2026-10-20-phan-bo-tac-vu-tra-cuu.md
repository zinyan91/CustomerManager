**Mục tiêu:** Tra cứu mở trực tiếp tra cứu thay vì danh mục độc lập; tác vụ cũ nằm đúng menu phụ và giữ khung điều hướng chung.
**Phạm vi:** LÀM: bỏ mục Danh mục, Tra cứu gồm MDSDV/quy định thẻ/ôn tập; đưa Báo cáo Excel sang Phân tích, giữ hồ sơ chứng từ ở Tài liệu, giải ngân ở Tín dụng, dự toán/bán lẻ ở Dự toán. Các route tác vụ dùng AppLayout; /hub cũ chuyển tới tác vụ được phép. KHÔNG LÀM: đổi nội dung nghiệp vụ, DB, công thức, quy trình Office toàn màn hình hoặc quản trị.
**Tệp dự kiến chạm:** lib/workspaceNavigation/navigation/modules; App; AppLayout (giữ tràn khung văn thư/kho); component chuyển hướng /hub; tests route/menu/quyền; docs/progress.
**Tầng:** lib phân bổ và chọn đích theo module, UI route/layout dùng chung.
**Kiểm chứng bằng gì:** test mapping mọi tác vụ đúng một nhóm, click Tra cứu không /hub, route cũ tới đúng màn có rail/sidebar, tài khoản hạn chế không lặp chuyển hướng; browser desktop/mobile; npm test/build.
**Rủi ro đã biết:** Giữ route cũ và module từng tác vụ, đặc biệt TOI/rates và dự toán/inventory. Văn thư/kho cần không padding để giữ chiều cao vùng làm việc. Không đưa Office/editor hoặc admin vào khung CRM.
