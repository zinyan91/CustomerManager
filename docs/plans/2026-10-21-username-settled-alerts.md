# Username và cảnh báo sau tất toán

**Mục tiêu:** Người dùng đăng nhập bằng username với mật khẩu hiện có; quản trị gán username. Khách không còn khoản vay có dư nợ không xuất hiện trong cảnh báo hết hạn KUNN/HĐTD/định giá và báo cáo tương ứng.
**Phạm vi:** LÀM: cột Username duy nhất trên UserRoles, backfill từ phần trước @ của email hiện có (5 tài khoản, không trùng phần tên); API đăng nhập server tra username rồi xác thực mật khẩu qua Supabase Auth; giới hạn tần suất ở DB; quản trị tạo/sửa username; cập nhật nguồn cảnh báo chung dashboard/báo cáo. KHÔNG LÀM: đổi email, UUID, mật khẩu cũ, quyền dữ liệu, xoá hồ sơ, thay công thức dư nợ, tự commit/push. Giữ tương thích đăng nhập email cũ trong lớp xác thực.
**Tệp dự kiến chạm:** supabase/migrations và functions/{username-login,admin-users,_shared}; lib/api/usernameLogin.ts; AuthContext, LoginView; userAdmin, UserFormModal, UserManagementView; lib/reports/alertData và tests. Chia hai phần độc lập: cảnh báo rồi xác thực.
**Tầng:** pure lib tính phạm vi cảnh báo/quy tắc username; API xác thực và hàm server; context điều phối phiên; components nhãn/ô nhập; migration bổ sung dữ liệu.
**Kiểm chứng bằng gì:** test trước cho số dư bằng 0 khi IsSettled chưa cập nhật, khách còn khoản vay khác, tài sản riêng/chung, lịch lãi còn thiếu; unit validation và handler auth mock; kiểm tra migration bằng PGlite và DB thật đối soát số tài khoản/role/owner trước-sau; kiểm tra giới hạn tần suất và quyền anon/authenticated; thử đăng nhập bằng username và mật khẩu sai không lộ email; fixture browser không ghi production; full test/build.
**Rủi ro đã biết:** không ẩn kỳ thu lãi còn thiếu chỉ vì gốc bằng 0; không bỏ cảnh báo khách còn nợ dù đã lưu trữ; không công khai tra username→email; không gửi khóa server/mật khẩu vào log; không thử mật khẩu thật; alias theo phần trước @ cần quản trị chỉnh nếu muốn tên khác. Nhánh backup-20261021-username-alerts đã tạo; thay đổi giao diện ba trang từ yêu cầu trước đang giữ nguyên.

## Triển khai

Migration đã được người dùng duyệt và áp trên DB thật; lịch sử phiên bản `20261021071942` đã ghi nhận. Đối soát hash xác nhận email/mật khẩu/UUID, role và ownership không thay đổi (5 tài khoản, 53 khách hàng). Backend đã triển khai. Người dùng đã yêu cầu commit/push mã giao diện lên main sau kiểm chứng.

Hàm đăng nhập chạy trước khi có JWT nên triển khai riêng:

```powershell
supabase functions deploy username-login --project-ref <project-ref> --no-verify-jwt --use-api
supabase functions deploy admin-users --project-ref <project-ref> --use-api
```

`username-login` tự kiểm tra mật khẩu bằng Supabase Auth, giới hạn lượt bằng RPC chỉ service_role gọi được, không trả email khi đăng nhập thất bại. `admin-users` vẫn cần JWT và kiểm role trên server. Không triển khai username-login bằng lệnh mặc định có kiểm JWT.

## Triển khai

Migration đã được người dùng duyệt và áp trên DB thật; lịch sử phiên bản `20261021071942` đã ghi nhận. Đối soát hash xác nhận email/mật khẩu/UUID, role và ownership không thay đổi (5 tài khoản, 53 khách hàng). Backend đã triển khai; mã giao diện chưa push.

Hàm đăng nhập chạy trước khi có JWT nên triển khai riêng:

```powershell
supabase functions deploy username-login --project-ref <project-ref> --no-verify-jwt --use-api
supabase functions deploy admin-users --project-ref <project-ref> --use-api
```

`username-login` tự kiểm tra mật khẩu bằng Supabase Auth, giới hạn lượt bằng RPC chỉ service_role gọi được, không trả email khi đăng nhập thất bại. `admin-users` vẫn cần JWT và kiểm role trên server. Không triển khai username-login bằng lệnh mặc định có kiểm JWT.
