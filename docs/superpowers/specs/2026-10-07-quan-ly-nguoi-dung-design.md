# Tab Người dùng: thêm, sửa, khóa, xóa tài khoản và gán vai trò

Ngày: 2026-10-07 · Quyết định của người dùng: tạo bằng mật khẩu tạm do admin đặt; User Admin không đụng Master Admin; khóa đăng nhập là chính, xóa hẳn chỉ khi hết dữ liệu; tab riêng trong sidebar.

## Mục tiêu
Master Admin và User Admin tự thêm nhân viên, đổi họ tên và vai trò, đặt lại mật khẩu, khóa hoặc mở khóa đăng nhập và xóa tài khoản, không phải vào trang Supabase.

## Vì sao cần Edge Function
Tạo, khóa, xóa tài khoản đăng nhập dùng Auth Admin API, cần khóa `service_role`. Khóa này **không được vào trình duyệt**; ứng dụng không có máy chủ riêng (Vercel tĩnh). Giải pháp: một Supabase Edge Function `admin-users` giữ khóa, trình duyệt chỉ gọi nó bằng JWT của người đăng nhập. Mọi luật phân quyền được kiểm lại **trong hàm**, giao diện chỉ để ẩn nút.

## Phạm vi
**Làm:** danh sách tài khoản (cả tài khoản chưa có vai trò), thêm, sửa họ tên/vai trò, đặt lại mật khẩu, khóa/mở khóa, xóa; mục "Người dùng" ở sidebar chỉ hai admin thấy; bỏ phần quản lý vai trò cũ khỏi Cài đặt (gộp sang tab mới).
**Không làm:** mời qua email, đa yếu tố, thu hồi phiên đang mở ngay lập tức (token còn hiệu lực tới khi hết hạn, mặc định ≤ 1 giờ), chuyển khách hàng hàng loạt khi xóa.

## Luật phân quyền (một nguồn: `supabase/functions/admin-users/rules.ts`, src/ import lại)
| | Master Admin | User Admin |
|---|---|---|
| Vai trò gán được | Master Admin, User Admin, User | User Admin, User |
| Thao tác trên tài khoản | mọi tài khoản | mọi tài khoản **trừ** Master Admin |
| Tự đổi vai trò, tự khóa, tự xóa | không | không |
| Đổi họ tên, đặt lại mật khẩu của chính mình | có | có |
Thêm: Master Admin cuối cùng không bị hạ hay xóa (trigger `guard_last_master_admin` đã có). Mật khẩu tạm ≥ 8 ký tự.

## Hàm `admin-users`
POST `{action, ...}` với `verify_jwt` bật. Người gọi phải có vai trò admin (đọc từ `UserRoles`). Trả `{ok: true, data}` hoặc `{ok: false, error}` (tiếng Việt).
- `list`: mọi tài khoản Auth gộp `UserRoles`: id, email, họ tên, vai trò, đã khóa, lần đăng nhập cuối.
- `create`: tạo tài khoản đã xác nhận email + ghi `UserRoles`; ghi vai trò lỗi thì xóa tài khoản vừa tạo (không để tài khoản mồ côi).
- `update`: họ tên, vai trò, khóa (`ban_duration`), mật khẩu mới.
- `delete`: kiểm tra dữ liệu còn gắn với tài khoản ở 4 bảng khóa ngoại NO ACTION (`Customers.OwnerId`, `CollateralAppraisals.PerformedBy`, `PostLoanControlRecords.PerformedBy`, `QuizQuestions.CreatedBy`); còn thì từ chối và gợi ý khóa đăng nhập.

## Giao diện
Mục "Người dùng" (`/users`): bảng Họ tên, Email, Vai trò, Số KH phụ trách, Trạng thái (Hoạt động / Đã khóa / Chưa phân quyền), Đăng nhập cuối, Thao tác (Sửa, Khóa/Mở khóa, Xóa); nút "Thêm người dùng"; form thêm có nút tạo mật khẩu tạm. Nút bị ẩn khi luật không cho phép. Chưa triển khai hàm thì báo rõ cách khắc phục.

## Rủi ro
- Hàm phải được triển khai lên Supabase trước khi dùng tab này; chưa chạy thử với Supabase thật.
- Khóa không cắt phiên đang mở ngay.
- Số hiệu sẵn có 2 tài khoản chưa có vai trò (`test@app.local`, `nat@app.local`) sẽ hiện ở trạng thái "Chưa phân quyền" để admin gán.
