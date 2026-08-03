-- =====================================================================
-- P2: Đưa dữ liệu nghiệp vụ từ trường Note về đúng cột của nó
-- =====================================================================
-- Hiện trạng đã khảo sát:
--   - 39/39 hợp đồng có [COLLATERAL_IDS:...] trong Note nhưng cột
--     CollateralIds RỖNG  -> BẮT BUỘC phải copy sang cột.
--   - 8/8 hợp đồng có [PENALTY_SURCHARGE:...] nhưng cột PenaltySurcharge
--     ĐÃ có giá trị -> chuỗi trong Note chỉ là rác, dọn thẳng.
--   - [RATE_HISTORY:...] : 0 dòng, không còn gì để xử lý.
--   - CreditCards.IssuanceType đang là kiểu integer trong khi ứng dụng
--     ghi chuỗi mô tả -> mọi lần lưu đều lỗi và bị âm thầm bỏ qua.
--
-- ⚠️ THỨ TỰ QUAN TRỌNG: chạy MỤC 1 trước MỤC 2. Dọn Note trước khi copy
-- là mất vĩnh viễn liên kết tài sản bảo đảm của 39 hợp đồng.
--
-- ⚠️ Chạy file này TRƯỚC khi deploy code đã gỡ nhánh đọc dự phòng.
-- =====================================================================


-- ---------------------------------------------------------------------
-- MỤC 0 — SAO LƯU trước khi động vào dữ liệu
-- ---------------------------------------------------------------------
-- Giữ nguyên Note gốc để đối chiếu hoặc khôi phục nếu có sự cố.
CREATE TABLE IF NOT EXISTS public."_backup_LoanContracts_Note_20260803" AS
SELECT "Id", "ContractNumber", "Note", "CollateralIds", "PenaltySurcharge"
FROM public."LoanContracts"
WHERE "Note" ~ '\[(COLLATERAL_IDS|PENALTY_SURCHARGE|RATE_HISTORY):';

ALTER TABLE public."_backup_LoanContracts_Note_20260803" ENABLE ROW LEVEL SECURITY;


-- ---------------------------------------------------------------------
-- MỤC 1 — COPY dữ liệu từ Note sang cột riêng
-- ---------------------------------------------------------------------
-- Chỉ ghi vào những dòng cột đang rỗng. Không đè lên giá trị đã có.
UPDATE public."LoanContracts"
SET "CollateralIds" = substring("Note" from '\[COLLATERAL_IDS:([^\]]+)\]')
WHERE "Note" LIKE '%[COLLATERAL_IDS:%'
  AND COALESCE("CollateralIds", '') = '';

UPDATE public."LoanContracts"
SET "PenaltySurcharge" = NULLIF(substring("Note" from '\[PENALTY_SURCHARGE:([^\]]+)\]'), '')::numeric
WHERE "Note" LIKE '%[PENALTY_SURCHARGE:%'
  AND "PenaltySurcharge" IS NULL
  AND substring("Note" from '\[PENALTY_SURCHARGE:([^\]]+)\]') ~ '^[0-9.]+$';


-- ---------------------------------------------------------------------
-- MỤC 2 — KIỂM CHỨNG (chạy và đọc kỹ TRƯỚC khi sang mục 3)
-- ---------------------------------------------------------------------
-- Cả hai cột phải bằng 0. Khác 0 nghĩa là còn dòng chưa copy được —
-- DỪNG LẠI, đừng chạy mục 3.
SELECT
  count(*) FILTER (WHERE "Note" LIKE '%[COLLATERAL_IDS:%'
                     AND COALESCE("CollateralIds",'') = '')  AS collateral_chua_copy,
  count(*) FILTER (WHERE "Note" LIKE '%[PENALTY_SURCHARGE:%'
                     AND "PenaltySurcharge" IS NULL)         AS phat_chua_copy
FROM public."LoanContracts";


-- ---------------------------------------------------------------------
-- MỤC 3 — DỌN chuỗi đánh dấu khỏi Note
-- ---------------------------------------------------------------------
-- CHỈ chạy khi mục 2 trả về 0 và 0.
UPDATE public."LoanContracts"
SET "Note" = NULLIF(
      btrim(regexp_replace(
        "Note",
        '\[(COLLATERAL_IDS|PENALTY_SURCHARGE|RATE_HISTORY):[^\]]*\]',
        '', 'g'
      )),
      ''
    )
WHERE "Note" ~ '\[(COLLATERAL_IDS|PENALTY_SURCHARGE|RATE_HISTORY):';


-- ---------------------------------------------------------------------
-- MỤC 4 — Sửa kiểu dữ liệu CreditCards.IssuanceType
-- ---------------------------------------------------------------------
-- Ứng dụng ghi chuỗi mô tả ('Cầm cố STK', 'Quan hệ tín dụng (Liên kết
-- TSĐB)'...) nhưng cột đang là integer. Postgres từ chối, code bắt lỗi
-- rồi lưu lại sau khi XOÁ cả IssuanceType lẫn CollateralId — giao diện
-- báo thành công trong khi hai trường đã mất.
-- Bảng đang rỗng nên đổi kiểu không có rủi ro dữ liệu.
ALTER TABLE public."CreditCards"
  ALTER COLUMN "IssuanceType" TYPE text USING "IssuanceType"::text;


-- ---------------------------------------------------------------------
-- MỤC 5 — KIỂM CHỨNG CUỐI
-- ---------------------------------------------------------------------
-- (a) Không còn chuỗi đánh dấu nào trong Note — kỳ vọng 0
-- SELECT count(*) FROM public."LoanContracts"
-- WHERE "Note" ~ '\[(COLLATERAL_IDS|PENALTY_SURCHARGE|RATE_HISTORY):';
--
-- (b) Đủ 39 hợp đồng có liên kết TSĐB trong cột riêng
-- SELECT count(*) FROM public."LoanContracts"
-- WHERE COALESCE("CollateralIds",'') <> '';
--
-- (c) IssuanceType đã là text
-- SELECT data_type FROM information_schema.columns
-- WHERE table_name = 'CreditCards' AND column_name = 'IssuanceType';


-- ---------------------------------------------------------------------
-- DỌN BẢNG SAO LƯU (chỉ chạy sau khi đã dùng thật vài ngày và yên tâm)
-- ---------------------------------------------------------------------
-- DROP TABLE public."_backup_LoanContracts_Note_20260803";
