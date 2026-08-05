-- =====================================================================
-- Sàn lãi suất theo hợp đồng
-- =====================================================================
-- Biên độ được phép âm: lãi suất sau ưu đãi có thể chào dưới lãi suất cơ sở
-- (khách ưu tiên, chương trình giảm tiếp). Hợp đồng khi đó gần như luôn kèm
-- câu "lãi suất không thấp hơn X%/năm". Không lưu được mức sàn đó thì
-- base + biên độ âm có thể tính ra mức thấp hơn hợp đồng cho phép, hoặc âm.
--
-- Lưu dạng thập phân, cùng quy ước với InterestRate / BaseRate / MarginRate:
-- 0.065 = 6,5%/năm. NULL = hợp đồng không quy định sàn.
--
-- CHẠY MIGRATION NÀY TRƯỚC KHI DEPLOY code đọc cột RateFloorAnnual.
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================

ALTER TABLE public."LoanContracts"
  ADD COLUMN IF NOT EXISTS "RateFloorAnnual" numeric;

COMMENT ON COLUMN public."LoanContracts"."RateFloorAnnual" IS
  'Sàn lãi suất theo hợp đồng, dạng thập phân (0.065 = 6,5%/năm). NULL = không quy định.';

-- Chốt an toàn: sàn phải là số không âm và dưới 100%/năm. Ràng buộc rời để
-- không chặn các dòng dữ liệu cũ đang NULL.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'LoanContracts_RateFloorAnnual_range'
  ) THEN
    ALTER TABLE public."LoanContracts"
      ADD CONSTRAINT "LoanContracts_RateFloorAnnual_range"
      CHECK ("RateFloorAnnual" IS NULL OR ("RateFloorAnnual" >= 0 AND "RateFloorAnnual" < 1));
  END IF;
END $$;


-- ---------------------------------------------------------------------
-- RÀ SOÁT: khoản vay đang khai biên độ âm
-- ---------------------------------------------------------------------
-- Chạy sau khi deploy để biết chỗ nào cần khai sàn. Biên độ âm mà chưa có
-- sàn thì lãi thả nổi đang chỉ bị chặn ở 0%/năm.

SELECT lc."Id", lc."ContractNumber", c."FullName",
       lc."BaseRate", lc."MarginRate", lc."RateFloorAnnual",
       lc."BaseRate" + lc."MarginRate" AS lai_tha_noi
FROM public."LoanContracts" lc
LEFT JOIN public."Customers" c ON c."Id" = lc."CustomerId"
WHERE lc."MarginRate" < 0
ORDER BY lc."MarginRate";
