**Mục tiêu:** Nhóm Dự toán nối sát menu phụ thành một mặt làm việc, không card bo góc nổi và không chừa mép rộng.
**Phạm vi:** LÀM: bỏ padding ngoài cho nhóm Dự toán, nền liền menu, bỏ max-width căn giữa ở dự toán thi công; panel/form/bảng phân cách bằng đường kẻ; thống nhất kho, thi công, mua sắm, hóa đơn và thu mua. KHÔNG LÀM: đổi trường, số liệu, công thức, hành vi nhập/xuất/in, style modal hoặc toàn bộ nút/input.
**Tệp dự kiến chạm:** AppLayout; root của 5 view Dự toán; các panel inventory/shopping đang hiển thị trong view; CSS có phạm vi workspace; docs/progress.
**Tầng:** Chỉ giao diện và CSS; dùng marker panel tường minh, không chọn tất cả div/input.
**Kiểm chứng bằng gì:** browser đo main/page sát menu, panel radius/shadow bằng 0, đủ chiều rộng, desktop/mobile/sáng/tối, thao tác tab và nhập; test hiện có và build.
**Rủi ro đã biết:** Tránh ảnh hưởng modal, ô nhập và preview/HTML in. Các component dùng chung chỉ đổi khi nằm trong main nhóm Dự toán.
