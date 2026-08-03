-- =====================================================================
-- QUẢN TRỊ NGƯỜI DÙNG — các thao tác dùng lại thường xuyên
-- =====================================================================
-- Đây KHÔNG phải migration chạy một lần. Đây là bộ lệnh tra cứu:
-- mở file, sửa email/tên, chạy đoạn cần dùng trong Supabase SQL Editor.
--
-- LƯU Ý: SQL Editor chạy với quyền quản trị nên BỎ QUA RLS.
-- Các lệnh dưới đây vẫn hoạt động sau khi đã bật RLS.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. GÁN VAI TRÒ cho tài khoản đã tạo trong Dashboard
-- ---------------------------------------------------------------------
-- Tra UUID tự động theo email — không cần copy tay.
-- Sửa 3 giá trị: email, vai trò ('admin' hoặc 'banker'), họ tên.

INSERT INTO public."UserRoles" ("UserId", "Role", "FullName")
SELECT id, 'banker', 'Nguyễn Văn A'
FROM auth.users
WHERE email = 'nguyenvana@company.vn'
ON CONFLICT ("UserId") DO UPDATE
  SET "Role"     = EXCLUDED."Role",
      "FullName" = EXCLUDED."FullName";

-- Nếu trả về "INSERT 0 0" nghĩa là KHÔNG tìm thấy email đó trong
-- auth.users — bạn chưa tạo tài khoản trong Dashboard, hoặc gõ sai email.


-- ---------------------------------------------------------------------
-- 2. KIỂM TRA danh sách người dùng và vai trò
-- ---------------------------------------------------------------------
SELECT
  u.email,
  r."Role",
  r."FullName",
  u.last_sign_in_at                      AS "Đăng nhập gần nhất",
  u.email_confirmed_at IS NOT NULL       AS "Đã xác nhận email",
  (SELECT count(*) FROM public."Customers" c WHERE c."OwnerId" = u.id)
                                         AS "Số KH phụ trách"
FROM auth.users u
LEFT JOIN public."UserRoles" r ON r."UserId" = u.id
ORDER BY r."Role" NULLS LAST, u.email;

-- Dòng có "Role" = NULL là tài khoản CHƯA gán vai trò: đăng nhập được
-- nhưng sau khi bật RLS sẽ không thấy bất kỳ dữ liệu nào.


-- ---------------------------------------------------------------------
-- 3. BÀN GIAO khách hàng cho banker
-- ---------------------------------------------------------------------
-- Cách A — bàn giao theo danh sách mã CIF cụ thể:
UPDATE public."Customers"
SET "OwnerId" = (SELECT id FROM auth.users WHERE email = 'nguyenvana@company.vn')
WHERE "CifKh" IN ('CIF001', 'CIF002', 'CIF003');

-- Cách B — bàn giao toàn bộ KH đang thuộc một người sang người khác
-- (dùng khi banker nghỉ việc / luân chuyển):
-- UPDATE public."Customers"
-- SET "OwnerId" = (SELECT id FROM auth.users WHERE email = 'nguoi_moi@company.vn')
-- WHERE "OwnerId" = (SELECT id FROM auth.users WHERE email = 'nguoi_cu@company.vn');


-- ---------------------------------------------------------------------
-- 4. ĐỔI VAI TRÒ
-- ---------------------------------------------------------------------
-- UPDATE public."UserRoles" SET "Role" = 'admin'
-- WHERE "UserId" = (SELECT id FROM auth.users WHERE email = 'nguyenvana@company.vn');


-- ---------------------------------------------------------------------
-- 5. THU HỒI QUYỀN khi nhân sự nghỉ việc
-- ---------------------------------------------------------------------
-- Thứ tự đúng: bàn giao KH trước (mục 3B), rồi mới thu hồi quyền.
-- Xoá vai trò => đăng nhập được nhưng không thấy dữ liệu:
-- DELETE FROM public."UserRoles"
-- WHERE "UserId" = (SELECT id FROM auth.users WHERE email = 'nguoi_cu@company.vn');
--
-- Chặn hẳn đăng nhập: Dashboard > Authentication > Users > Delete user.
-- CẢNH BÁO: Customers."OwnerId" tham chiếu auth.users(id). Xoá user khi
-- còn KH gán cho họ sẽ bị chặn bởi khoá ngoại — bàn giao trước.
