-- =====================================================================
-- P1: Trả việc sinh ID về cho database
-- =====================================================================
-- Trước đây client tự tính max(Id)+1 rồi gửi kèm khi insert. Cách này có
-- ba vấn đề:
--   1. Tranh chấp: hai banker lưu cùng lúc sẽ sinh trùng Id.
--   2. Sau khi bật RLS, select('Id') chỉ trả về các dòng banker được phép
--      thấy, nên max(Id) là cực đại CỤC BỘ — gần như chắc chắn đâm vào
--      bản ghi của người khác.
--   3. Nhánh dự phòng Date.now() (~1,78e12) vượt giới hạn kiểu integer
--      (2.147.483.647) nên luôn tràn số.
--
-- Bốn bảng đã có sẵn sequence nhưng chưa từng được dùng, nên con trỏ vẫn
-- nằm ở số rất nhỏ. PHẢI đồng bộ trước khi bỏ code sinh ID ở client, nếu
-- không nextval sẽ trả về 1, 2, 3... trùng với dữ liệu đang có.
--
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Đồng bộ sequence của 4 bảng đã có sẵn
-- ---------------------------------------------------------------------
-- Dạng 3 tham số với is_called = false: nextval kế tiếp trả về đúng
-- giá trị truyền vào. Bảng rỗng thì bắt đầu từ 1.
SELECT setval('public."Customers_Id_seq"',
  COALESCE((SELECT MAX("Id") FROM public."Customers"), 0) + 1, false);

SELECT setval('public."Collaterals_Id_seq"',
  COALESCE((SELECT MAX("Id") FROM public."Collaterals"), 0) + 1, false);

SELECT setval('public."LoanContracts_Id_seq"',
  COALESCE((SELECT MAX("Id") FROM public."LoanContracts"), 0) + 1, false);

SELECT setval('public."CreditCards_Id_seq"',
  COALESCE((SELECT MAX("Id") FROM public."CreditCards"), 0) + 1, false);


-- ---------------------------------------------------------------------
-- 2. RepaymentSchedules chưa có sequence — tạo mới
-- ---------------------------------------------------------------------
CREATE SEQUENCE IF NOT EXISTS public."RepaymentSchedules_Id_seq"
  OWNED BY public."RepaymentSchedules"."Id";

ALTER TABLE public."RepaymentSchedules"
  ALTER COLUMN "Id" SET DEFAULT nextval('public."RepaymentSchedules_Id_seq"');

SELECT setval('public."RepaymentSchedules_Id_seq"',
  COALESCE((SELECT MAX("Id") FROM public."RepaymentSchedules"), 0) + 1, false);


-- ---------------------------------------------------------------------
-- 3. Cấp quyền dùng sequence
-- ---------------------------------------------------------------------
-- Thiếu quyền này thì insert báo "permission denied for sequence".
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;


-- ---------------------------------------------------------------------
-- 4. KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- Cột "Id tiếp theo" phải LỚN HƠN cột "Id lớn nhất" ở mọi dòng.
-- Nếu bằng hoặc nhỏ hơn, bản ghi mới sẽ trùng khoá chính.
SELECT 'Customers' AS bang,
       (SELECT COALESCE(MAX("Id"),0) FROM public."Customers")        AS id_lon_nhat,
       last_value AS con_tro_sequence
FROM public."Customers_Id_seq"
UNION ALL SELECT 'Collaterals',
       (SELECT COALESCE(MAX("Id"),0) FROM public."Collaterals"), last_value
FROM public."Collaterals_Id_seq"
UNION ALL SELECT 'LoanContracts',
       (SELECT COALESCE(MAX("Id"),0) FROM public."LoanContracts"), last_value
FROM public."LoanContracts_Id_seq"
UNION ALL SELECT 'CreditCards',
       (SELECT COALESCE(MAX("Id"),0) FROM public."CreditCards"), last_value
FROM public."CreditCards_Id_seq"
UNION ALL SELECT 'RepaymentSchedules',
       (SELECT COALESCE(MAX("Id"),0) FROM public."RepaymentSchedules"), last_value
FROM public."RepaymentSchedules_Id_seq";
