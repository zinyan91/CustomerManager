-- =====================================================================
-- Dọn dữ liệu nghiệp vụ khỏi trường ghi chú
-- =====================================================================
-- Chạy SAU khi đã xem supabase/reports/02_du_lieu_nghiep_vu_trong_note.sql.
--
-- Ba đường ghi đã bịt ở mã nguồn 05/08/2026: LoanPortfolioView không còn
-- nhét "HĐTD: <số>", generateSchedule ghi tiền trả trước hạn vào cột
-- PrepaidPrincipalAmount, getMasterHdtdNumber không đọc Note nữa.
--
-- Migration này chỉ gỡ phần dữ liệu nghiệp vụ, GIỮ NGUYÊN phần ghi chú
-- thật của banker trong cùng ô. Quy tắc gỡ giống hàm stripLegacyNoteBlobs
-- trong src/lib/utils.ts để hai nơi không trôi dạt.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — SAO LƯU
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."_backup_Note_20260805" (
  "Bang"    text    NOT NULL,
  "Id"      integer NOT NULL,
  "Note"    text,
  "SavedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("Bang", "Id")
);

ALTER TABLE public."_backup_Note_20260805" ENABLE ROW LEVEL SECURITY;

INSERT INTO public."_backup_Note_20260805" ("Bang", "Id", "Note")
SELECT 'LoanContracts', "Id", "Note"
FROM public."LoanContracts"
WHERE "Note" IS NOT NULL
ON CONFLICT ("Bang", "Id") DO NOTHING;

INSERT INTO public."_backup_Note_20260805" ("Bang", "Id", "Note")
SELECT 'RepaymentSchedules', "Id", "Note"
FROM public."RepaymentSchedules"
WHERE "Note" IS NOT NULL
ON CONFLICT ("Bang", "Id") DO NOTHING;


-- ---------------------------------------------------------------------
-- BƯỚC 2 — CHUYỂN TIỀN TRẢ TRƯỚC HẠN TỪ NOTE SANG CỘT
-- ---------------------------------------------------------------------
-- Làm TRƯỚC khi gỡ chuỗi, vì con số nằm trong chính chuỗi đó. Chỉ điền
-- khi cột đang trống: cột đã có giá trị nghĩa là banker đã khai tay, số
-- đó mới là số đúng.
--
-- PrincipalAmount của kỳ ĐÃ bao gồm phần trả trước hạn (CONVENTIONS §2),
-- nên bước này chỉ bổ sung cột, không đổi số tiền của bất kỳ kỳ nào.

UPDATE public."RepaymentSchedules"
SET "PrepaidPrincipalAmount" = nullif(
      regexp_replace(
        split_part(split_part("Note", 'TRẢ TRƯỚC HẠN:', 2), 'đ', 1),
        '[^0-9]', '', 'g'
      ), ''
    )::numeric
WHERE "Note" LIKE '%TRẢ TRƯỚC HẠN%'
  AND coalesce("PrepaidPrincipalAmount", 0) = 0
  AND nullif(
        regexp_replace(
          split_part(split_part("Note", 'TRẢ TRƯỚC HẠN:', 2), 'đ', 1),
          '[^0-9]', '', 'g'
        ), ''
      ) IS NOT NULL;


-- ---------------------------------------------------------------------
-- BƯỚC 3 — GỠ CHUỖI KHỎI NOTE
-- ---------------------------------------------------------------------

UPDATE public."LoanContracts"
SET "Note" = nullif(
      btrim(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace("Note", '\[COLLATERAL_IDS:[^\]]*\]', '', 'g'),
                '\[PENALTY_SURCHARGE:[^\]]*\]', '', 'g'),
              '\[RATE_HISTORY:[^\]]*\]\]?', '', 'g'),
            '(^|\n)[[:space:]]*HĐTD:[^\n]*', '', 'g'),
          '\n{2,}', E'\n', 'g')
      ), ''
    )
WHERE "Note" LIKE '%HĐTD:%'
   OR "Note" LIKE '%[COLLATERAL_IDS:%'
   OR "Note" LIKE '%[RATE_HISTORY:%'
   OR "Note" LIKE '%[PENALTY_SURCHARGE:%';

UPDATE public."RepaymentSchedules"
SET "Note" = nullif(
      btrim(regexp_replace("Note", '\[?TRẢ TRƯỚC HẠN:[^\]\n]*\]?', '', 'g')), ''
    )
WHERE "Note" LIKE '%TRẢ TRƯỚC HẠN%';


-- ---------------------------------------------------------------------
-- BƯỚC 4 — KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- Chạy lại PHẦN 1 của báo cáo 02: mọi dòng phải về 0.
--
-- Đối chiếu phần ghi chú thật không bị mất — câu này liệt kê các dòng có
-- ghi chú trước khi dọn mà nay trống rỗng, phải kiểm từng dòng xem đúng là
-- ô đó CHỈ chứa dữ liệu nghiệp vụ:
--
--   SELECT b."Bang", b."Id", b."Note" AS note_cu
--   FROM public."_backup_Note_20260805" b
--   LEFT JOIN public."LoanContracts" l
--     ON b."Bang" = 'LoanContracts' AND l."Id" = b."Id"
--   LEFT JOIN public."RepaymentSchedules" s
--     ON b."Bang" = 'RepaymentSchedules' AND s."Id" = b."Id"
--   WHERE coalesce(l."Note", s."Note") IS NULL
--   ORDER BY b."Bang", b."Id";
--
-- Bất biến tiền phải giữ nguyên sau BƯỚC 2 — chạy lại câu kiểm bốn bất
-- biến ở PROGRESS: sai_tong_goc vẫn phải bằng 0.
