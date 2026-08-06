-- Lãi suất phạt gốc theo từng khoản: cho [PENALTY_RATE: một chỗ ở thật.
--
-- Đây là khối chuỗi cuối cùng còn sót trong Note, và là khối DUY NHẤT mà
-- CONVENTIONS.md §1 cấm gỡ trước đó — vì chưa có cột nào chứa nó. Migration
-- này tạo cột rồi mới gỡ, nên từ đây gỡ được.
--
-- Rà soát 07/08/2026 trên dữ liệu thật: chỉ có hai giá trị, 150 (2 khoản) và
-- 0 (1 khoản), toàn bộ ở LoanContracts. Không có mức lẻ nào. Nghĩa là thực chất
-- đây là công tắc MIỄN PHẠT GỐC chứ không phải thang lãi suất.
--
-- Vẫn dùng cột số chứ không dùng boolean: nó ánh xạ 1-1 với tham số
-- principalPenaltyMultiplier mà calcOverduePenalty đã nhận sẵn, nên không phải
-- đẻ thêm khái niệm rồi dịch qua dịch lại. 0 = miễn phạt, NULL = mặc định 1.5.
--
-- PHẠM VI: chỉ phạt trên NỢ GỐC quá hạn. Lãi phạt chậm trả lãi (10%/năm) không
-- đụng tới — khối [PENALTY_RATE: chưa bao giờ mã hoá con số đó.

BEGIN;

ALTER TABLE "LoanContracts"
  ADD COLUMN IF NOT EXISTS "PrincipalPenaltyMultiplier" numeric;

COMMENT ON COLUMN "LoanContracts"."PrincipalPenaltyMultiplier" IS
  'Hệ số phạt trên nợ gốc quá hạn, nhân với lãi suất trong hạn. NULL = dùng mặc định 1.5 (150%). 0 = miễn phạt gốc.';

-- Chuyển giá trị từ Note sang cột. Chuỗi ghi theo phần trăm (150), cột lưu hệ
-- số (1.5).
UPDATE "LoanContracts"
SET "PrincipalPenaltyMultiplier" =
      (substring("Note" from '\[PENALTY_RATE:([0-9.]+)\]'))::numeric / 100
WHERE "PrincipalPenaltyMultiplier" IS NULL
  AND "Note" ~ '\[PENALTY_RATE:[0-9.]+\]';

-- Gỡ chuỗi, giữ nguyên phần ghi chú thật của banker trong cùng ô.
UPDATE "LoanContracts"
SET "Note" = nullif(btrim(regexp_replace("Note", '\[PENALTY_RATE:[0-9.]+\]', '', 'g')), '')
WHERE "Note" LIKE '%[PENALTY_RATE:%';

COMMIT;


-- Đối chiếu. Kỳ vọng: con_chuoi = 0, và da_chuyen liệt kê đúng 3 khoản
-- (hai khoản 1.5, một khoản 0).

SELECT
  (SELECT count(*) FROM "LoanContracts" WHERE "Note" LIKE '%[PENALTY_RATE:%') AS con_chuoi;

SELECT
  "PrincipalPenaltyMultiplier" AS he_so,
  count(*)                     AS so_khoan,
  string_agg("ContractNumber", ', ' ORDER BY "ContractNumber") AS cac_khoan
FROM "LoanContracts"
WHERE "PrincipalPenaltyMultiplier" IS NOT NULL
GROUP BY 1
ORDER BY 1;
