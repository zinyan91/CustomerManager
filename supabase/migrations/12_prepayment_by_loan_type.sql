-- =====================================================================
-- Phí trả nợ trước hạn phân theo LOẠI KHOẢN VAY
-- =====================================================================
-- Bảng "RateProgramPrepaymentFees" ban đầu chỉ phân theo NĂM, đúng với
-- cho vay trung dài hạn (Năm 1 4%, Năm 2 3%...). Nhưng chương trình
-- ngắn hạn phân theo loại khoản vay:
--
--   Vay theo hạn mức tín dụng : miễn phí
--   Vay từng lần              : 0,50% số tiền trả nợ trước hạn
--
-- Migration 09 nhét cả hai vế vào MỘT dòng 0,50% kèm câu ghi chú. Tờ gửi
-- khách vì thế in ra một mức 0,50% chung chung, phần miễn phí bị đẩy
-- xuống dòng chú thích nhỏ — khách đọc sẽ tưởng mọi khoản vay đều mất
-- phí. Tách thành hai dòng, mỗi loại một mức phí riêng.
--
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. CỘT MỚI
-- ---------------------------------------------------------------------

ALTER TABLE public."RateProgramPrepaymentFees"
  ADD COLUMN IF NOT EXISTS "AppliesTo" text;

COMMENT ON COLUMN public."RateProgramPrepaymentFees"."AppliesTo" IS
  'Loại khoản vay áp dụng mức phí này. NULL = phân theo năm (trung dài hạn), có giá trị = phân theo loại khoản vay (ngắn hạn).';

-- Ràng buộc cũ UNIQUE(ProgramId, YearFrom) chặn hai dòng cùng YearFrom,
-- nên không khai được hai loại khoản vay. Thay bằng hai chỉ mục riêng
-- cho hai cách phân loại.
ALTER TABLE public."RateProgramPrepaymentFees"
  DROP CONSTRAINT IF EXISTS "RateProgramPrepaymentFees_ProgramId_YearFrom_key";

CREATE UNIQUE INDEX IF NOT EXISTS idx_prepayfees_by_year
  ON public."RateProgramPrepaymentFees" ("ProgramId", "YearFrom")
  WHERE "AppliesTo" IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_prepayfees_by_loan_type
  ON public."RateProgramPrepaymentFees" ("ProgramId", "AppliesTo")
  WHERE "AppliesTo" IS NOT NULL;


-- ---------------------------------------------------------------------
-- 2. TÁCH PHÍ CỦA CHƯƠNG TRÌNH NGẮN HẠN
-- ---------------------------------------------------------------------

DO $$
DECLARE
  pid integer;
BEGIN
  SELECT "Id" INTO pid FROM public."RatePrograms"
   WHERE "DocumentNumber" = '2274/2026/TB-BĐH' LIMIT 1;

  IF pid IS NULL THEN
    RAISE NOTICE 'Không tìm thấy chương trình ngắn hạn. Chạy migration 09 trước.';
    RETURN;
  END IF;

  DELETE FROM public."RateProgramPrepaymentFees" WHERE "ProgramId" = pid;

  INSERT INTO public."RateProgramPrepaymentFees"
    ("ProgramId", "YearFrom", "YearTo", "FeeRatio", "AppliesTo", "Note")
  VALUES
    (pid, 1, NULL, 0,      'Vay theo hạn mức tín dụng', NULL),
    (pid, 1, NULL, 0.0050, 'Vay từng lần',
     'Tính trên số tiền trả nợ trước hạn. Miễn phí nếu khách hàng trả nợ trước hạn trong vòng 10 ngày trước thời điểm kết thúc khoản vay.');

  -- Ghi chú số 9 của migration 11 nay đã thành bảng riêng, gỡ để khỏi lặp.
  DELETE FROM public."RateProgramConditions"
   WHERE "ProgramId" = pid AND "Heading" = 'Phí trả nợ trước hạn';
END $$;


-- ---------------------------------------------------------------------
-- 3. KIỂM TRA SAU KHI CHẠY
-- ---------------------------------------------------------------------
-- Kỳ vọng 2 dòng: hạn mức tín dụng FeeRatio = 0, từng lần = 0.0050.
--   SELECT f."AppliesTo", f."FeeRatio" FROM public."RateProgramPrepaymentFees" f
--     JOIN public."RatePrograms" p ON p."Id" = f."ProgramId"
--    WHERE p."DocumentNumber" = '2274/2026/TB-BĐH';
--
-- Trung dài hạn vẫn phân theo năm, AppliesTo để trống:
--   SELECT f."YearFrom", f."FeeRatio", f."AppliesTo" FROM public."RateProgramPrepaymentFees" f
--     JOIN public."RatePrograms" p ON p."Id" = f."ProgramId"
--    WHERE p."DocumentNumber" = '1680/2026/TB-TGĐ' ORDER BY f."YearFrom";
