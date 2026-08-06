-- =====================================================================
-- Xoá cột rác CreditContracts.RateHistory
-- =====================================================================
-- Rà soát 05/08/2026 (reports/03) tìm ra 59 dòng ở cột này. Nội dung
-- KHÔNG phải lịch sử lãi suất mà là bản sao trường Note cũ:
--
--   HĐTD: 2002/HĐTD_2/9726862
--   [PENALTY_RATE:150]
--
-- Migration 14 khi tách CreditContracts ra khỏi mô hình bảng phẳng đã
-- copy Note vào sai cột. Ba bằng chứng đây là rác chứ không phải nguồn
-- tin cậy:
--
--   1. Sai ngữ nghĩa: cột tên RateHistory nhưng chứa số hiệu hợp đồng.
--   2. Đã trôi dạt: ba dòng của ĐOÀN NGỌC LÝ có HdtdNumber không khớp số
--      ghi bên trong (Id 10 khai 2002/HĐTD/9738792, nội dung ghi
--      2002/HĐTD/9632191_3).
--   3. Không mã nào đọc: mọi xử lý lịch sử lãi suất chỉ chạy trên
--      LoanContracts.RateHistory.
--
-- Lịch sử lãi suất THẬT nằm ở LoanContracts.RateHistory, không đụng tới.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — XEM TRƯỚC KHI XOÁ
-- ---------------------------------------------------------------------

SELECT cc."Id", cc."HdtdNumber", c."FullName", cc."RateHistory"
FROM public."CreditContracts" cc
JOIN public."Customers" c ON c."Id" = cc."CustomerId"
WHERE cc."RateHistory" IS NOT NULL AND btrim(cc."RateHistory") <> ''
ORDER BY cc."Id";


-- ---------------------------------------------------------------------
-- BƯỚC 2 — SAO LƯU
-- ---------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public."_backup_CreditContractsRateHistory_20260805" (
  "Id"          integer PRIMARY KEY,
  "HdtdNumber"  text,
  "RateHistory" text,
  "SavedAt"     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public."_backup_CreditContractsRateHistory_20260805"
  ENABLE ROW LEVEL SECURITY;

INSERT INTO public."_backup_CreditContractsRateHistory_20260805"
  ("Id", "HdtdNumber", "RateHistory")
SELECT "Id", "HdtdNumber", "RateHistory"
FROM public."CreditContracts"
WHERE "RateHistory" IS NOT NULL
ON CONFLICT ("Id") DO NOTHING;


-- ---------------------------------------------------------------------
-- BƯỚC 3 — XOÁ CỘT
-- ---------------------------------------------------------------------

ALTER TABLE public."CreditContracts" DROP COLUMN "RateHistory";


-- ---------------------------------------------------------------------
-- BƯỚC 4 — KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- Cột không còn tồn tại:
--
--   SELECT count(*) AS con_cot
--   FROM information_schema.columns
--   WHERE table_schema = 'public'
--     AND table_name = 'CreditContracts'
--     AND column_name = 'RateHistory';
--
-- Lịch sử lãi suất thật của KUNN không bị đụng:
--
--   SELECT count(*) AS kunn_co_lich_su_lai_suat
--   FROM public."LoanContracts"
--   WHERE "RateHistory" IS NOT NULL AND "RateHistory"::text <> 'null';
--
-- Chạy lại PHẦN 1 của reports/03: dòng CreditContracts / RateHistory
-- biến mất khỏi kết quả.
