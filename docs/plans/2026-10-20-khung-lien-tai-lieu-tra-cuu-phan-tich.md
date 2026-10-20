**Mục tiêu:** Tài liệu, Tra cứu và Phân tích nối sát menu phụ theo mẫu Dự toán; Báo cáo Excel nằm trong Tổng quan.
**Phạm vi:** LÀM: mở rộng workspace-continuous cho ba nhóm và Báo cáo Excel, đánh dấu vùng panel rõ ràng và root để bỏ góc/bóng/mép, chuyển item reports sang overview. KHÔNG LÀM: thay đổi logic, quyền, số liệu, form nhập, modal, HTML xuất/in; Office vẫn là editor riêng.
**Tệp dự kiến chạm:** AppLayout/workspaceNavigation, các view và panel hiển thị của ba nhóm, Panel chung (marker), tests điều hướng, spec/progress.
**Tầng:** Giao diện/CSS và lib phân bổ menu.
**Kiểm chứng bằng gì:** mapping reports ở Tổng quan cả URL alias; browser đo sát menu/radius/shadow trên từng route, desktop/mobile, thao tác tra cứu/tab/form; test/build.
**Rủi ro đã biết:** Không đổi style cửa sổ phủ hoặc bản in. Văn thư/Kho vốn có layout liền, giữ chiều cao đang chạy. Reports thuộc module tools, dù nằm Tổng quan vẫn không mở Dashboard cho người thiếu credit.
