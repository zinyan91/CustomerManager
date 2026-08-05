-- =====================================================================
-- Rà soát: dữ liệu nghiệp vụ còn nằm trong trường ghi chú
-- =====================================================================
-- CONVENTIONS.md §1 cấm nhét dữ liệu nghiệp vụ vào Note: không truy vấn
-- được, không kiểm toán được, và tạo ra nguồn thứ hai trôi dạt khỏi cột
-- thật. Rà soát 05/08/2026 tìm ra ba đường ghi vẫn đang SỐNG, không phải
-- tàn dư:
--
--   1. LoanContracts.Note   ← "HĐTD: <số>"        do LoanPortfolioView ghi
--   2. RepaymentSchedules.Note ← "[TRẢ TRƯỚC HẠN: +Xđ]"  do generateSchedule ghi
--   3. CreditCards.Note     ← "[CollateralId:N]"  chỉ còn ĐỌC, không ghi
--
-- Cả ba đã bịt ở mã nguồn. Câu này đo phần dữ liệu còn lại.
-- CHỈ ĐỌC.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PHẦN 1 — TỔNG HỢP: mỗi bảng còn bao nhiêu dòng
-- ---------------------------------------------------------------------

SELECT 'LoanContracts / HĐTD:'            AS khoi_du_lieu,
       count(*)                            AS so_dong
FROM public."LoanContracts" WHERE "Note" LIKE '%HĐTD:%'
UNION ALL
SELECT 'LoanContracts / [COLLATERAL_IDS:', count(*)
FROM public."LoanContracts" WHERE "Note" LIKE '%[COLLATERAL_IDS:%'
UNION ALL
SELECT 'LoanContracts / [RATE_HISTORY:', count(*)
FROM public."LoanContracts" WHERE "Note" LIKE '%[RATE_HISTORY:%'
UNION ALL
SELECT 'LoanContracts / [PENALTY_SURCHARGE:', count(*)
FROM public."LoanContracts" WHERE "Note" LIKE '%[PENALTY_SURCHARGE:%'
UNION ALL
SELECT 'RepaymentSchedules / [TRẢ TRƯỚC HẠN:', count(*)
FROM public."RepaymentSchedules" WHERE "Note" LIKE '%TRẢ TRƯỚC HẠN%'
UNION ALL
SELECT 'CreditCards / [CollateralId:', count(*)
FROM public."CreditCards" WHERE "Note" LIKE '%[CollateralId:%'
ORDER BY 2 DESC, 1;


-- ---------------------------------------------------------------------
-- PHẦN 2 — Số HĐTD trong Note có lệch số thật không
-- ---------------------------------------------------------------------
-- Cột note_khac_hdtd_lien_ket khác 0 nghĩa là đã có nhóm hạn mức gom sai
-- trước khi gỡ nhánh đọc Note khỏi getMasterHdtdNumber.

SELECT
  count(*)                                                  AS co_hdtd_trong_note,
  count(*) FILTER (WHERE note_hdtd <> prefix_hdtd)          AS note_khac_tien_to_so_kunn,
  count(*) FILTER (WHERE note_hdtd <> cc_hdtd)              AS note_khac_hdtd_lien_ket,
  count(*) FILTER (WHERE prefix_hdtd <> cc_hdtd)            AS tien_to_khac_hdtd_lien_ket
FROM (
  SELECT
    btrim(split_part(split_part(l."Note", 'HĐTD:', 2), E'\n', 1)) AS note_hdtd,
    split_part(l."ContractNumber", '/GNN-', 1)                    AS prefix_hdtd,
    cc."HdtdNumber"                                               AS cc_hdtd
  FROM public."LoanContracts" l
  JOIN public."CreditContracts" cc ON cc."Id" = l."CreditContractId"
  WHERE l."Note" LIKE '%HĐTD:%'
) t;


-- ---------------------------------------------------------------------
-- PHẦN 3 — Tiền trả trước hạn: Note có, cột không
-- ---------------------------------------------------------------------
-- generateSchedule cũ ghi số tiền vào Note mà KHÔNG điền
-- PrepaidPrincipalAmount, nên tiền trả trước hạn của các kỳ này vô hình
-- với paidPrincipalOf và recalculateSchedules.

SELECT
  count(*)                                                              AS ky_co_ghi_chu_tra_truoc,
  count(*) FILTER (WHERE coalesce("PrepaidPrincipalAmount", 0) = 0)      AS trong_do_cot_bo_trong
FROM public."RepaymentSchedules"
WHERE "Note" LIKE '%TRẢ TRƯỚC HẠN%';


-- ---------------------------------------------------------------------
-- PHẦN 4 — Thẻ tín dụng: liên kết TSBĐ trong Note mà cột bỏ trống
-- ---------------------------------------------------------------------

SELECT "Id", "CardNumber", "CollateralId", "Note"
FROM public."CreditCards"
WHERE "Note" LIKE '%[CollateralId:%'
ORDER BY "Id";
