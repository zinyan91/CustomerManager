-- =====================================================================
-- Tầng Hạn mức tín dụng (HMTD) — hỗ trợ nhiều HĐTD dùng chung một hạn mức
-- =====================================================================
-- Nghiệp vụ thực tế có ba tầng:
--     Phê duyệt cấp tín dụng (HMTD)
--         └── Hợp đồng tín dụng (HĐTD)
--                 └── Giấy nhận nợ (KUNN)
--
-- Hệ thống trước đây chỉ có hai tầng dưới, và mức cấp được lưu TRÊN TỪNG
-- hợp đồng. Vì vậy không có cách nào diễn tả "hai HĐTD này dùng chung một
-- hạn mức" — tổng mức cấp bị cộng đôi.
--
-- Ba trường hợp nghiệp vụ:
--   TH1  1 số HĐTD, nhiều KUNN                -> đã đúng, không cần mã
--   TH2  Khác số HĐTD, CÙNG một HMTD          -> cần mã hạn mức (file này)
--   TH3  Khác số HĐTD, khác HMTD              -> đã đúng, không cần mã
--
-- Tương thích ngược: bỏ trống hai cột mới thì hành vi giữ nguyên như cũ.
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================

ALTER TABLE public."LoanContracts"
  ADD COLUMN IF NOT EXISTS "CreditLimitCode"   text,
  ADD COLUMN IF NOT EXISTS "CreditLimitAmount" numeric;

COMMENT ON COLUMN public."LoanContracts"."CreditLimitCode" IS
  'Số phê duyệt cấp tín dụng / mã HMTD. Các HĐTD cùng mã dùng chung một hạn mức, chỉ tính MỘT lần vào tổng mức cấp. Bỏ trống = hợp đồng độc lập.';

COMMENT ON COLUMN public."LoanContracts"."CreditLimitAmount" IS
  'Hạn mức được duyệt của mã HMTD. Chỉ có ý nghĩa khi CreditLimitCode khác rỗng.';

-- Gom nhóm theo mã hạn mức là truy vấn thường xuyên
CREATE INDEX IF NOT EXISTS idx_loancontracts_creditlimitcode
  ON public."LoanContracts" ("CreditLimitCode")
  WHERE "CreditLimitCode" IS NOT NULL;


-- ---------------------------------------------------------------------
-- KIỂM CHỨNG
-- ---------------------------------------------------------------------
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'LoanContracts'
--   AND column_name IN ('CreditLimitCode','CreditLimitAmount');


-- ---------------------------------------------------------------------
-- RÀ SOÁT: các HĐTD có thể đang thuộc TH2 mà chưa gán mã
-- ---------------------------------------------------------------------
-- Nhiều HĐTD gốc khác nhau nhưng cùng thế chấp một tài sản — dấu hiệu
-- có thể là cùng một hạn mức được duyệt. Cần người có nghiệp vụ xác nhận,
-- KHÔNG tự động gán mã.
--
-- ⚠️ PHẢI gom theo HĐTD gốc trước khi cộng. ContractAmount được lặp trên
-- từng dòng KUNN của cùng một HĐTD (TH1) — cộng thẳng sẽ ra con số ảo gấp
-- nhiều lần thực tế.
--
-- WITH hdtd AS (
--   -- Mỗi HĐTD gốc chỉ lấy mức cấp MỘT lần
--   SELECT lc."CustomerId",
--          split_part(lc."ContractNumber", '/GNN-', 1) AS hdtd_goc,
--          max(lc."ContractAmount")                    AS muc_cap,
--          string_agg(DISTINCT lc."CollateralIds", ',') AS ts_ids
--   FROM public."LoanContracts" lc
--   WHERE COALESCE(lc."CreditLimitCode",'') = ''
--     AND COALESCE(lc."CollateralIds",'') <> ''
--   GROUP BY lc."CustomerId", split_part(lc."ContractNumber", '/GNN-', 1)
-- ), suc_bao_dam AS (
--   -- Tổng hạn mức tối đa của TẤT CẢ tài sản mà khách hàng đang thế chấp
--   SELECT h."CustomerId",
--          sum(DISTINCT col."AppraisedValue" * COALESCE(col."LtvPercent",80) / 100.0) AS tong_suc
--   FROM hdtd h
--   JOIN LATERAL unnest(string_to_array(h.ts_ids, ',')) AS cid(v) ON btrim(cid.v) ~ '^\d+$'
--   JOIN public."Collaterals" col ON col."Id" = btrim(cid.v)::int
--   GROUP BY h."CustomerId"
-- )
-- SELECT c."CifKh", c."FullName",
--        count(*)                    AS so_hdtd_goc,
--        sum(h.muc_cap)              AS tong_muc_cap,
--        round(s.tong_suc)           AS tong_suc_bao_dam,
--        round(sum(h.muc_cap) - s.tong_suc) AS vuot
-- FROM hdtd h
-- JOIN public."Customers" c ON c."Id" = h."CustomerId"
-- JOIN suc_bao_dam s ON s."CustomerId" = h."CustomerId"
-- GROUP BY c."CifKh", c."FullName", s.tong_suc
-- HAVING sum(h.muc_cap) > s.tong_suc
-- ORDER BY vuot DESC;
