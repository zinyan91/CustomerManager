-- =====================================================================
-- Sửa dữ liệu: đánh dấu tất toán cho KUNN đã trả hết gốc
-- =====================================================================
-- Đây là SỬA DỮ LIỆU, không phải thay đổi lược đồ. Chạy SAU migration 14
-- vì cần cột "SettledDate".
--
-- Hoàn cảnh: KH ĐẶNG BÁ NHÂN (CIF 005119169) có 2 KUNN 1,4 tỷ đã trả hết
-- gốc ngày 01/08/2026 (kỳ cuối ghi đủ 1.400.000.000, trạng thái Đã TT)
-- nhưng ô "Hợp đồng đã tất toán" vẫn bỏ trống. Với HMTD điều này không làm
-- sai hạn mức vì cách tính đã dựa trên dư nợ, nhưng dữ liệu không phản ánh
-- đúng thực tế và sẽ sai khi hệ thống bắt đầu ẩn KUNN đã tất toán.
--
-- Điều kiện áp dụng có chủ ý HẸP: chỉ những KUNN đã có lịch thu nợ và
-- KHÔNG còn kỳ nào chưa thanh toán. KUNN chưa sinh lịch không bị chạm tới.
-- =====================================================================


-- ---------------------------------------------------------------------
-- BƯỚC 1 — XEM TRƯỚC. Chạy riêng, đọc kỹ danh sách rồi mới sang bước 2.
-- ---------------------------------------------------------------------
SELECT
  k."CifKh",
  k."FullName",
  lc."Id"                AS kunn_id,
  lc."ContractNumber",
  lc."LoanAmount",
  lc."CurrentBalance",
  lc."KunnDueDate",
  count(s.*)             AS so_ky,
  max(s."PaymentDate")   AS ngay_tt_ky_cuoi
FROM public."LoanContracts" lc
JOIN public."Customers" k ON k."Id" = lc."CustomerId"
JOIN public."RepaymentSchedules" s ON s."ContractId" = lc."Id"
WHERE COALESCE(lc."IsSettled", false) = false
  AND NOT EXISTS (
    SELECT 1 FROM public."RepaymentSchedules" x
    WHERE x."ContractId" = lc."Id"
      AND COALESCE(x."IsPaid", false) = false
  )
GROUP BY k."CifKh", k."FullName", lc."Id", lc."ContractNumber",
         lc."LoanAmount", lc."CurrentBalance", lc."KunnDueDate"
ORDER BY k."FullName", lc."ContractNumber";


-- ---------------------------------------------------------------------
-- BƯỚC 2 — CẬP NHẬT. Chỉ chạy sau khi danh sách trên đúng như mong đợi.
-- ---------------------------------------------------------------------
-- Ngày tất toán lấy theo ngày thanh toán của kỳ cuối cùng, không lấy ngày
-- hôm nay: khoản đã trả xong từ 01/08 mà ghi tất toán hôm nay là sai mốc
-- để tính COF thu bổ sung khi trả trước hạn.

WITH da_tra_het AS (
  SELECT lc."Id" AS kunn_id, max(s."PaymentDate") AS ngay_tt
  FROM public."LoanContracts" lc
  JOIN public."RepaymentSchedules" s ON s."ContractId" = lc."Id"
  WHERE COALESCE(lc."IsSettled", false) = false
    AND NOT EXISTS (
      SELECT 1 FROM public."RepaymentSchedules" x
      WHERE x."ContractId" = lc."Id"
        AND COALESCE(x."IsPaid", false) = false
    )
  GROUP BY lc."Id"
)
UPDATE public."LoanContracts" lc
SET "IsSettled"      = true,
    "SettledDate"    = COALESCE(d.ngay_tt::date, lc."KunnDueDate"::date),
    "CurrentBalance" = 0
FROM da_tra_het d
WHERE lc."Id" = d.kunn_id
RETURNING lc."Id", lc."ContractNumber", lc."SettledDate", lc."CurrentBalance";


-- ---------------------------------------------------------------------
-- BƯỚC 3 — KIỂM TRA LẠI. Kỳ vọng: 0 dòng.
-- ---------------------------------------------------------------------
-- SELECT lc."Id", lc."ContractNumber"
-- FROM public."LoanContracts" lc
-- WHERE COALESCE(lc."IsSettled", false) = false
--   AND EXISTS (SELECT 1 FROM public."RepaymentSchedules" s WHERE s."ContractId" = lc."Id")
--   AND NOT EXISTS (
--     SELECT 1 FROM public."RepaymentSchedules" x
--     WHERE x."ContractId" = lc."Id" AND COALESCE(x."IsPaid", false) = false
--   );
