-- Gỡ tàn dư của ứng dụng WPF sau khi hệ thống chuyển hoàn toàn sang web.
--
-- Nguyên tắc: BACKFILL TRƯỚC, XOÁ SAU. Mỗi bước tự chuyển dữ liệu về cột đúng
-- rồi mới bỏ đường cũ, nên chạy được bất kể dữ liệu hiện đang ở trạng thái nào.
--
-- KHÔNG đụng vào [PENALTY_RATE: trong Note. Đó là lãi suất phạt theo từng
-- khoản và HIỆN CHƯA CÓ CỘT NÀO CHỨA — xem CONVENTIONS.md §1. Gỡ nó đi là mất
-- hẳn con số. Chờ quyết định nghiệp vụ rồi mới làm, ở migration khác.

BEGIN;

-- 1. CreditCards: hai cột cùng nghĩa từ thời WPF.
--    Web đọc CreditLimit, WPF ghi Limit. Gộp về CreditLimit.

ALTER TABLE "CreditCards" ALTER COLUMN "CreditLimit" DROP NOT NULL;

UPDATE "CreditCards"
SET "CreditLimit" = "Limit"
WHERE coalesce("CreditLimit", 0) = 0
  AND coalesce("Limit", 0) > 0;

UPDATE "CreditCards"
SET "CreditLimit" = 0
WHERE "CreditLimit" IS NULL;

ALTER TABLE "CreditCards" ALTER COLUMN "CreditLimit" SET NOT NULL;
ALTER TABLE "CreditCards" ALTER COLUMN "CreditLimit" SET DEFAULT 0;

ALTER TABLE "CreditCards" DROP COLUMN IF EXISTS "Limit";


-- 2. CreditCards: mã tài sản còn nằm trong Note thay vì cột CollateralId.
--    Chuyển về cột thật rồi xoá chuỗi, giữ nguyên phần ghi chú thật của banker.

UPDATE "CreditCards"
SET "CollateralId" = (substring("Note" from '\[CollateralId:(\d+)\]'))::int
WHERE "CollateralId" IS NULL
  AND "Note" ~ '\[CollateralId:\d+\]'
  AND EXISTS (
    SELECT 1 FROM "Collaterals" t
    WHERE t."Id" = (substring("Note" from '\[CollateralId:(\d+)\]'))::int
  );

UPDATE "CreditCards"
SET "Note" = nullif(btrim(regexp_replace("Note", '\[CollateralId:\d+\]', '', 'g')), '')
WHERE "Note" LIKE '%[CollateralId:%';

COMMIT;


-- 3. Đối chiếu sau khi chạy. Kỳ vọng: cả ba đều bằng 0.

SELECT
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name = 'CreditCards' AND column_name = 'Limit')      AS con_cot_limit,
  (SELECT count(*) FROM "CreditCards" WHERE "Note" LIKE '%[CollateralId:%') AS con_chuoi_trong_note,
  (SELECT count(*) FROM "CreditCards" WHERE "CreditLimit" IS NULL)     AS con_han_muc_rong;
