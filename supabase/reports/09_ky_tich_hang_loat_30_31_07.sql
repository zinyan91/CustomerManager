-- 15 KUNN có toàn bộ lịch bị tích "đã thu" trong hai ngày 30-31/07/2026.
-- CHỈ ĐỌC.
--
-- Vì sao khoanh đúng hai ngày này: đo phân bố `PaymentDate` trên toàn bộ kỳ đã
-- thu (10/08/2026, 1.064 kỳ) thấy gần như mọi ngày đều có số kỳ BẰNG số KUNN —
-- tức mỗi KUNN thu một kỳ vào ngày đó, đúng hình dạng thu nợ hàng tháng thật.
-- Chỉ bốn ngày lệch khỏi khuôn:
--
--   2026-07-31 -> 162 kỳ / 6 KUNN   (27 kỳ mỗi KUNN)
--   2026-07-30 -> 158 kỳ / 9 KUNN   (17,6 kỳ mỗi KUNN)
--   2025-06-16 ->  13 kỳ / 3 KUNN
--   2024-09-24 ->   2 kỳ / 1 KUNN
--
-- Hai ngày đầu là 320 kỳ trên 15 KUNN. Đường ghi duy nhất tồn tại lúc đó là nút
-- "Đánh dấu TT" một dòng một cú nhấp, dập `new Date()` làm PaymentDate và ghi
-- ĐÚNG HAI CỘT `IsPaid` + `PaymentDate` — không có ô nhập số tiền nào. Modal ghi
-- nhận thanh toán mới sinh ra 13:43 ngày 31/07/2026 (commit b0d6de9).
--
-- CÂU HỎI BÁO CÁO NÀY TRẢ LỜI: 15 KUNN đó có thật sự đã tất toán không.
--   - Nếu `IsSettled` = true và dư nợ = 0: tích toàn bộ lịch là ĐÚNG nghiệp vụ,
--     chỉ có `PaymentDate` sai (là ngày bấm nút, không phải ngày hạch toán).
--   - Nếu còn dư nợ: những kỳ đó bị tích khống, và dư nợ hệ thống đang khai
--     THIẾU đúng bằng phần gốc của các kỳ bị tích sai.


-- PHẦN 1. Danh sách 15 KUNN, đối chiếu số kỳ bị tích với trạng thái tất toán.

WITH tich_hang_loat AS (
  SELECT
    s."ContractId",
    count(*)                                              AS so_ky_tich_2_ngay,
    min(s."PeriodNumber")                                 AS ky_dau,
    max(s."PeriodNumber")                                 AS ky_cuoi,
    sum(s."PrincipalAmount")                              AS goc_cac_ky_tich
  FROM "RepaymentSchedules" s
  WHERE s."IsPaid" = true
    AND s."PaymentDate" IN (DATE '2026-07-30', DATE '2026-07-31')
  GROUP BY s."ContractId"
)
SELECT
  c."FullName"                                            AS khach_hang,
  lc."ContractNumber"                                     AS so_kunn,
  t.so_ky_tich_2_ngay,
  t.ky_dau,
  t.ky_cuoi,
  (SELECT count(*) FROM "RepaymentSchedules" x
     WHERE x."ContractId" = lc."Id")                      AS tong_so_ky,
  lc."IsSettled"                                          AS da_tat_toan,
  lc."CurrentBalance"                                     AS du_no_he_thong,
  coalesce(lc."LoanAmount", lc."ContractAmount")          AS so_tien_vay,
  t.goc_cac_ky_tich,
  coalesce(lc."LoanAmount", lc."ContractAmount")
    - (SELECT coalesce(sum(x."PrincipalAmount"), 0)
         FROM "RepaymentSchedules" x
        WHERE x."ContractId" = lc."Id" AND x."IsPaid" = true) AS du_no_theo_lich
FROM tich_hang_loat t
JOIN "LoanContracts" lc ON lc."Id" = t."ContractId"
JOIN "Customers"     c  ON c."Id"  = lc."CustomerId"
ORDER BY t.so_ky_tich_2_ngay DESC;


-- PHẦN 2. Trong 15 KUNN đó, KUNN nào có kỳ bị tích mà NGÀY ĐẾN HẠN CÒN Ở TƯƠNG
-- LAI so với thời điểm bấm nút. Đây là bằng chứng tích khống không thể bàn:
-- không ai thu được tiền của kỳ chưa tới hạn.
-- Kỳ vọng nếu dữ liệu lành: 0 dòng.

SELECT
  c."FullName"            AS khach_hang,
  lc."ContractNumber"     AS so_kunn,
  s."PeriodNumber"        AS ky,
  s."DueDate"::text       AS den_han,
  s."PaymentDate"::text   AS ngay_bam_nut,
  (s."DueDate" - s."PaymentDate")                         AS so_ngay_den_han_sau_khi_tich,
  s."PrincipalAmount"     AS goc_ky,
  s."InterestAmount"      AS lai_ky
FROM "RepaymentSchedules" s
JOIN "LoanContracts" lc ON lc."Id" = s."ContractId"
JOIN "Customers"     c  ON c."Id"  = lc."CustomerId"
WHERE s."IsPaid" = true
  AND s."PaymentDate" IN (DATE '2026-07-30', DATE '2026-07-31')
  AND s."DueDate" > s."PaymentDate"
ORDER BY (s."DueDate" - s."PaymentDate") DESC, lc."ContractNumber", s."PeriodNumber";


-- PHẦN 3. Tổng thiệt hại nếu PHẦN 2 có dòng: bao nhiêu tiền gốc đang bị coi là
-- đã thu trong khi kỳ còn chưa tới hạn.

SELECT
  count(*)                          AS so_ky_tich_khong,
  count(DISTINCT s."ContractId")     AS so_kunn,
  sum(s."PrincipalAmount")          AS goc_dang_khai_khong,
  sum(s."InterestAmount")           AS lai_dang_khai_khong
FROM "RepaymentSchedules" s
WHERE s."IsPaid" = true
  AND s."PaymentDate" IN (DATE '2026-07-30', DATE '2026-07-31')
  AND s."DueDate" > s."PaymentDate";


-- PHẦN 4. Kỳ có PaymentDate vô lý ngoài hai ngày trên.
-- Phân bố có một dòng ghi 2001-02-01 — gõ sai năm, không có nghĩa nghiệp vụ nào.

SELECT
  c."FullName"          AS khach_hang,
  lc."ContractNumber"   AS so_kunn,
  s."PeriodNumber"      AS ky,
  s."DueDate"::text     AS den_han,
  s."PaymentDate"::text AS ngay_thu_khai
FROM "RepaymentSchedules" s
JOIN "LoanContracts" lc ON lc."Id" = s."ContractId"
JOIN "Customers"     c  ON c."Id"  = lc."CustomerId"
WHERE s."IsPaid" = true
  AND (s."PaymentDate" < DATE '2020-01-01'
       OR s."PaymentDate" > CURRENT_DATE
       OR s."PaymentDate" < s."DueDate" - INTERVAL '2 years')
ORDER BY s."PaymentDate";
