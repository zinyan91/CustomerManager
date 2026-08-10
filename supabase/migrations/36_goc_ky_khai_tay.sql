-- Gốc mỗi kỳ khai theo giấy nhận nợ.
--
-- VÌ SAO CẦN: bước làm tròn gốc/kỳ là dữ liệu của từng GNN, không phải thiết
-- lập của hệ thống. Trước đợt này nó là hằng số `PRINCIPAL_ROUND_MODE = '10k'`
-- trong loanMath.ts, áp cho toàn danh mục.
--
-- ĐO TRƯỚC KHI LÀM (10/08/2026, dùng gốc các kỳ ĐÃ THU vì migration 18 chỉ viết
-- lại kỳ chưa thu nên kỳ đã thu còn giữ con số nguyên bản):
--   · 28 khoản tái tạo được bằng bước 10.000 và KHÔNG tái tạo được bằng bước
--     1.000 — bằng chứng dứt khoát cho bước 10.000.
--   · 8 khoản có số tiền vay chia hết tuyệt đối cho số kỳ nên không cần làm
--     tròn; cả ba bước cho cùng một số, chúng không mang thông tin.
--   · 0 khoản nói bước khác 10.000.
-- Nên mặc định 10.000 giữ nguyên, và cột này chỉ để khai NGOẠI LỆ.
--
-- Phép đo cũng lộ ra đúng một khoản sai dữ liệu gốc: 2002/HĐTD/9738792/GNN-01
-- có "LoanAmount" = 0 (xem mục LoanAmount = 0 trong PROGRESS.md). Migration này
-- KHÔNG sửa nó — số tiền vay là dữ liệu gốc, phải đối chiếu GNN giấy.
--
-- NULL = tự tính theo thương số, KHÔNG phải "chưa khai". Đọc bằng ?? chứ không
-- phải || — xem CONVENTIONS.md §1.

BEGIN;

ALTER TABLE "LoanContracts"
  ADD COLUMN IF NOT EXISTS "MonthlyPrincipalAmount" numeric;

COMMENT ON COLUMN "LoanContracts"."MonthlyPrincipalAmount" IS
  'Gốc mỗi kỳ khai theo GNN, dùng cho lịch ban đầu. NULL = hệ thống tự tính bằng số tiền vay / số kỳ trả gốc rồi làm tròn lên bước 10.000. Chỉ có nghĩa với gốc trả đều; gốc trả cuối kỳ không dùng.';

ALTER TABLE "LoanContracts"
  ADD CONSTRAINT "LoanContracts_MonthlyPrincipalAmount_duong"
  CHECK ("MonthlyPrincipalAmount" IS NULL OR "MonthlyPrincipalAmount" > 0);

COMMIT;


-- Đối chiếu. Kỳ vọng: cột tồn tại, kiểu numeric, nullable, và 0 khoản đã khai
-- (cột mới nên chưa ai khai).

SELECT
  column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'LoanContracts'
  AND column_name = 'MonthlyPrincipalAmount';

SELECT count(*) AS so_khoan_da_khai
FROM "LoanContracts"
WHERE "MonthlyPrincipalAmount" IS NOT NULL;
