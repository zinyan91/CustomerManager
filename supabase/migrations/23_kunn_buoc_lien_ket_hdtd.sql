-- =====================================================================
-- KUNN bắt buộc liên kết HĐTD
-- =====================================================================
-- Trigger trg_chan_dong_hdtd_con_du_no (migration 22) đối chiếu KUNN với
-- HĐTD qua khoá ngoại CreditContractId. Cột đó còn cho phép NULL nên một
-- KUNN nhập bằng SQL mà bỏ trống sẽ vô hình với trigger: HĐTD vẫn đóng
-- được dù khoản vay đó còn dư nợ.
--
-- Cùng lý lẽ với việc gom số hiệu KUNN về unique index: quy tắc phải nằm
-- dưới database, không chỉ ở đường giao diện.
--
-- Đo 05/08/2026: 0 dòng NULL, và mọi đường tạo KUNN trong ứng dụng đều
-- gán CreditContractId (applyCreditContractToForm), lại chặn sẵn khi khách
-- chưa có HĐTD. Nên bước này không phá đường ghi nào đang dùng.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — KIỂM TRA TRƯỚC: phải trả về 0
-- ---------------------------------------------------------------------

SELECT count(*) AS con_dong_null
FROM public."LoanContracts"
WHERE "CreditContractId" IS NULL;

-- Khác 0 thì DỪNG. Mỗi dòng phải gán HĐTD đúng theo chứng từ, không suy
-- từ tiền tố số hiệu: số hiệu sửa được bằng tay còn khoá ngoại thì không.
-- Câu liệt kê để đối chiếu:
--
--   SELECT l."Id", l."ContractNumber", c."CifKh", c."FullName"
--   FROM public."LoanContracts" l
--   JOIN public."Customers" c ON c."Id" = l."CustomerId"
--   WHERE l."CreditContractId" IS NULL
--   ORDER BY c."FullName", l."ContractNumber";


-- ---------------------------------------------------------------------
-- BƯỚC 2 — RÀNG BUỘC
-- ---------------------------------------------------------------------

ALTER TABLE public."LoanContracts"
  ALTER COLUMN "CreditContractId" SET NOT NULL;


-- ---------------------------------------------------------------------
-- BƯỚC 3 — KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- Câu này PHẢI báo lỗi not_null_violation, và ROLLBACK giữ nguyên dữ liệu
-- kể cả khi ràng buộc không kích hoạt:
--
--   BEGIN;
--   UPDATE public."LoanContracts"
--      SET "CreditContractId" = NULL
--    WHERE "Id" = (SELECT min("Id") FROM public."LoanContracts");
--   ROLLBACK;
