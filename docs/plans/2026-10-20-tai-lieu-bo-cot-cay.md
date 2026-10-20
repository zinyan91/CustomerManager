**Mục tiêu:** Hồ sơ chứng từ không có cột điều hướng thứ ba; chọn bộ hồ sơ và biểu mẫu trên một thanh ngang, vùng nhập/xem trước rộng hơn.
**Phạm vi:** LÀM: bỏ DossierTreeRail khỏi view, bỏ trạng thái drawer/collapse, hai ô chọn ngang và trước/sau; giữ lựa chọn gồm tài liệu tùy chọn, các form, dữ liệu theo bộ và xuất/in. KHÔNG LÀM: đổi registry mẫu, công thức hay nội dung pháp lý; không thay menu Tài liệu chung.
**Tệp dự kiến chạm:** DocumentTemplateView, DossierWorkspace, DossierNavigation mới, test xuất Word và test chọn bộ/mẫu, progress/spec.
**Tầng:** Giao diện sử dụng controller hiện có, không đổi reducer/DB.
**Kiểm chứng bằng gì:** test đổi bộ/mẫu và giữ dữ liệu, tùy chọn gồm, xuất Word còn khớp nội dung; browser desktop/mobile đo không cột cây và vùng form/preview, test/build.
**Rủi ro đã biết:** Các bộ dùng chung templateId vẫn phải giữ dữ liệu riêng; tài liệu tùy chọn không biến mất khỏi ô chọn. Giữ mọi mẫu và đúng form đặc thù.
