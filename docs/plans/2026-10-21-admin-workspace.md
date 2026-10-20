# Quản trị trong điều hướng chính

**Mục tiêu:** Master Admin mở Quản trị ngay trên thanh phân hệ, chuyển giữa các màn quản trị trong cùng ứng dụng; bố cục đồng bộ các trang còn lại.
**Phạm vi:** LÀM: tách Quản trị khỏi Cài đặt; menu phụ quản trị; cập nhật khung trang, tổng quan, bảng và biểu mẫu. KHÔNG LÀM: thay đổi quyền API/RLS, nghiệp vụ tạo tài khoản, team, KPI, chuyển giao hoặc kho lưu trữ. User Admin giữ quyền truy cập trực tiếp các công cụ được cấp hiện có, nhưng không thấy tab chính Quản trị.
**Tệp dự kiến chạm:** chia hai phần: điều hướng (`App.tsx`, `AppLayout`, `PrimaryRail`, `Sidebar`, `CommandPalette`, `useSidebarNavigation`, `workspaceNavigation`, `navigation`); trình bày (`AdminLayout`, `AdminOverviewView`, `tableStyles`, các view quản trị và thành phần biểu mẫu liên quan), cùng test.
**Tầng:** lib định nghĩa điều hướng; hooks điều phối menu; components hiển thị và chặn tuyến theo quyền hiện có. Không thay đổi hạ tầng.
**Kiểm chứng bằng gì:** test điều hướng Master Admin/User Admin/User, nhận diện đường dẫn con, quyền truy cập trực tiếp, test hồi quy CRUD và biểu mẫu; toàn bộ Vitest, production build; Playwright trên localhost với API giả lập tách biệt, desktop/mobile và sáng/tối.
**Rủi ro đã biết:** ẩn tab không thay thế bảo mật server; không được vô tình thu hồi quyền User Admin. Tránh khung ứng dụng lồng nhau, menu active sai ở đường dẫn con, thanh ngữ cảnh khách hàng lọt vào quản trị, tràn trang trên mobile.

## Bố cục

```text
Header chung
Rail 88 | Menu Quản trị 220 | Tiêu đề + thao tác
        | Tổng quan         | Nội dung liền mạch
        | Người dùng        | Bảng / biểu mẫu
        | Team              |
        | Dữ liệu KPI       |
        | Chuyển giao       |
        | Cấu hình kho      |
```

- Giữ palette hiện tại: rail #13263E; nền sáng #FFFFFF, chữ #0A192F, viền #C4D1E3; nền tối #0A1628, chữ #F0F6FC. Dùng token sáng/tối thay màu riêng theo từng màn.
- Giữ font ứng dụng; tiêu đề 18px semibold, dữ liệu 14px, nhãn 12–14px. Căn trái; số căn phải, tabular.
- Trang liên tục với menu phụ; đường kẻ chia vùng, không thêm lớp card bao quanh. Nút chính dùng accent hiện có. Tổng quan đưa số tài khoản, khách hàng và tình trạng lên đầu, giữ đủ bảng phân quyền/module phía dưới.
- Đã đối chiếu brief: không tạo thiết kế riêng cho admin, không thêm lối tắt hay chữ giải thích ngoài yêu cầu. Mobile dùng menu hệ thống chung.
