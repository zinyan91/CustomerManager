-- =====================================================================
-- Sửa ràng buộc mâu thuẫn: KUNN trỏ về HĐTD cha
-- =====================================================================
-- `LoanContracts.CreditContractId` hiện mang HAI ràng buộc chọi nhau:
--
--   migration 14: REFERENCES "CreditContracts"("Id") ON DELETE SET NULL
--   migration 23: ALTER COLUMN "CreditContractId" SET NOT NULL
--
-- Xoá một HĐTD còn KUNN thì Postgres cố gán NULL vào cột NOT NULL và văng
-- lỗi 23502 bằng tiếng Anh. Nhánh SET NULL vì thế KHÔNG BAO GIỜ chạy được
-- — nó là mã chết ở tầng dữ liệu, chỉ để lại một thông báo khó hiểu.
--
-- Đường xoá khách hàng cũng đi qua đây: "CreditContracts"."CustomerId" là
-- ON DELETE CASCADE, nên xoá khách kéo theo xoá HĐTD kéo theo lỗi trên.
--
-- RESTRICT mới đúng ý định đã có sẵn ở nơi khác trong hệ thống:
--   · migration 22 chặn ĐÓNG HĐTD khi còn KUNN chưa tất toán
--   · migration 23 buộc mọi KUNN phải gắn HĐTD
--   · CreditContractView chặn XOÁ HĐTD khi countKunnOfCreditContractAPI > 0
--
-- Chốt ở giao diện không phải lớp bảo vệ — cùng lý lẽ với RLS và unique
-- index số KUNN. Đây là lớp bảo vệ thật.
--
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. ĐO TRƯỚC KHI SỬA
-- ---------------------------------------------------------------------
-- Ràng buộc hiện tại và quy tắc xoá của nó.
-- confdeltype: a = NO ACTION · r = RESTRICT · c = CASCADE · n = SET NULL
SELECT con.conname,
       con.confdeltype,
       CASE con.confdeltype
         WHEN 'n' THEN 'SET NULL (sai — cột đang NOT NULL)'
         WHEN 'r' THEN 'RESTRICT'
         WHEN 'c' THEN 'CASCADE'
         WHEN 'a' THEN 'NO ACTION'
       END AS quy_tac_xoa
FROM pg_constraint con
JOIN pg_class rel   ON rel.oid = con.conrelid
JOIN pg_class frel  ON frel.oid = con.confrelid
WHERE con.contype = 'f'
  AND rel.relname  = 'LoanContracts'
  AND frel.relname = 'CreditContracts';


-- ---------------------------------------------------------------------
-- 2. THAY RÀNG BUỘC
-- ---------------------------------------------------------------------
-- Tên ràng buộc do Postgres tự đặt lúc ADD COLUMN ... REFERENCES nên
-- không viết cứng vào đây — tìm theo quan hệ rồi mới xoá.

DO $$
DECLARE
  ten_rang_buoc text;
BEGIN
  SELECT con.conname INTO ten_rang_buoc
  FROM pg_constraint con
  JOIN pg_class rel  ON rel.oid = con.conrelid
  JOIN pg_class frel ON frel.oid = con.confrelid
  WHERE con.contype = 'f'
    AND rel.relname  = 'LoanContracts'
    AND frel.relname = 'CreditContracts'
  LIMIT 1;

  IF ten_rang_buoc IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public."LoanContracts" DROP CONSTRAINT %I', ten_rang_buoc);
  END IF;
END $$;

ALTER TABLE public."LoanContracts"
  ADD CONSTRAINT "LoanContracts_CreditContractId_fkey"
  FOREIGN KEY ("CreditContractId")
  REFERENCES public."CreditContracts"("Id")
  ON DELETE RESTRICT;


-- ---------------------------------------------------------------------
-- 3. KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- (a) Quy tắc xoá phải là 'r' (RESTRICT)
SELECT con.conname, con.confdeltype
FROM pg_constraint con
JOIN pg_class rel  ON rel.oid = con.conrelid
JOIN pg_class frel ON frel.oid = con.confrelid
WHERE con.contype = 'f'
  AND rel.relname  = 'LoanContracts'
  AND frel.relname = 'CreditContracts';

-- (b) Không KUNN nào mồ côi sau khi dựng lại khoá ngoại
SELECT count(*) AS kunn_mo_coi
FROM public."LoanContracts" k
LEFT JOIN public."CreditContracts" h ON h."Id" = k."CreditContractId"
WHERE h."Id" IS NULL;

-- (c) Ràng buộc chặn thật — chạy nguyên khối, phải trả lỗi 23503 rồi cuộn lại.
--     Thay 19 bằng Id một HĐTD đang còn KUNN.
-- BEGIN;
--   DELETE FROM public."CreditContracts" WHERE "Id" = 19;
-- ROLLBACK;
