**Mục tiêu:** Hồ sơ chứng từ thành mục riêng trên rail chính. Mục này chỉ có cây bộ hồ sơ ở cột phụ, không menu Tài liệu đứng cạnh cây.
**Phạm vi:** LÀM: nhóm documents riêng chứa templates; Tài liệu còn Văn thư/Kho/Office. AppLayout bỏ Sidebar thường ở documents; cây dùng đúng khoảng cột phụ 240px, thu/mở bằng rail; điện thoại mở cây bằng nút trong workspace, menu ứng dụng vẫn đổi phân hệ. Bỏ hai select ngang ở workspace này, giữ mẫu trước/sau và lựa chọn gồm trên cây. KHÔNG LÀM: đổi form, export, trạng thái dữ liệu hoặc quyền module.
**Tệp dự kiến chạm:** workspaceNavigation/PrimaryRail/AppLayout; DocumentTemplateView và DossierNavigation/Workspace; test route/menu/view/export; spec/progress.
**Tầng:** Giao diện, dùng controller hiện có; không DB.
**Kiểm chứng bằng gì:** một rail + một cây, không sidebar Tài liệu trên route documents; templates chỉ xuất hiện một nhóm; browser desktop/mobile thu/mở/chọn mẫu/giữ dữ liệu/export; full test/build.
**Rủi ro đã biết:** Cây phải dùng cùng trạng thái thu/mở với main để không chừa cột trống; mobile cần drawer riêng có focus/đóng rõ ràng; vẫn cho chuyển phân hệ qua header/rail.
