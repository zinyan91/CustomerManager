-- =====================================================================
-- Quét TOÀN BỘ cột văn bản của mọi bảng, tìm dữ liệu nghiệp vụ trá hình
-- =====================================================================
-- Báo cáo 02 chỉ đếm sáu khối chuỗi ĐÃ BIẾT. Câu này đi ngược lại: liệt
-- kê tài nguyên từ information_schema rồi quét từng cột, nên bắt được cả
-- những khối chưa ai biết — cùng cách làm với rà soát bảo mật lấy bảng từ
-- pg_tables thay vì suy từ mã nguồn (CONVENTIONS.md §1).
--
-- CHỈ ĐỌC.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PHẦN 1 — Đếm theo từng cột văn bản của từng bảng
-- ---------------------------------------------------------------------
-- Hai dấu hiệu:
--   [TEN_KHOA:  → nhãn đóng ngoặc vuông, gần như chắc chắn là dữ liệu
--   TÊN KHOÁ:   → khoá viết HOA đầu dòng, kiểu "HĐTD:" hay "TRẢ TRƯỚC HẠN:"

SELECT
  c.table_name,
  c.column_name,
  (xpath(
    '/row/cnt/text()',
    query_to_xml(
      format(
        'SELECT count(*) AS cnt FROM public.%I
          WHERE %I ~ ''\[[A-Za-z_]{2,}[: ]''
             OR %I ~ ''(^|\n)[[:space:]]*[A-ZĐ][A-ZĐ_[:space:]]{1,30}:''',
        c.table_name, c.column_name, c.column_name
      ), false, true, ''
    )
  ))[1]::text::int AS so_dong_nghi_ngo
FROM information_schema.columns c
JOIN information_schema.tables t
  ON t.table_schema = c.table_schema AND t.table_name = c.table_name
WHERE c.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
  AND c.data_type IN ('text', 'character varying')
  AND c.table_name NOT LIKE '\_backup\_%'
ORDER BY 3 DESC, 1, 2;


-- ---------------------------------------------------------------------
-- PHẦN 2 — Xem nội dung thật của các dòng bị đánh dấu
-- ---------------------------------------------------------------------
-- Thay <bang> và <cot> bằng cặp có so_dong_nghi_ngo > 0 ở PHẦN 1.
-- NÂNG ô Limit của editor trước khi chạy.
--
--   SELECT "Id", "<cot>"
--   FROM public."<bang>"
--   WHERE "<cot>" ~ '\[[A-Za-z_]{2,}[: ]'
--      OR "<cot>" ~ '(^|\n)[[:space:]]*[A-ZĐ][A-ZĐ_[:space:]]{1,30}:'
--   ORDER BY "Id";
--
-- Đọc kết quả: ghi chú thật của banker viết hoa đầu câu là DƯƠNG TÍNH GIẢ,
-- ví dụ "KHÁCH HẸN: trả sớm". Chỉ tính là lỗi khi chuỗi đó mang dữ liệu mà
-- lẽ ra phải có cột riêng — số hợp đồng, số tiền, ngày tháng, khoá ngoại.


-- ---------------------------------------------------------------------
-- PHẦN 3 — Sáu khối đã biết, đối chiếu lại sau migration 24
-- ---------------------------------------------------------------------

SELECT 'LoanContracts / HĐTD:'              AS khoi_du_lieu, count(*) AS so_dong
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
SELECT 'RepaymentSchedules / TRẢ TRƯỚC HẠN', count(*)
FROM public."RepaymentSchedules" WHERE "Note" LIKE '%TRẢ TRƯỚC HẠN%'
UNION ALL
SELECT 'CreditCards / [CollateralId:', count(*)
FROM public."CreditCards" WHERE "Note" LIKE '%[CollateralId:%'
ORDER BY 2 DESC, 1;
