-- Chỉ đọc. Đếm khoản vay có lịch trả nợ chưa khớp quy tắc kỳ cuối chốt
-- 17/08/2026: dãy kỳ phải chấm dứt đúng ngày đáo hạn. Áp cho cả hai loại vay.
--
-- Lịch đang lưu KHÔNG tự đổi theo mã mới. Nó chỉ được dựng lại khi banker lưu
-- lại KUNN hoặc bấm "Tính lại lịch". Báo cáo này cho biết bao nhiêu khoản sẽ đổi
-- khi điều đó xảy ra, và đổi theo hướng nào.

-- Khoản chưa khai KunnDueDate bị loại khỏi báo cáo này. Mã nguồn suy ngày đáo
-- hạn từ DisbursementDate + KunnTenor khi cột trống, nhưng SQL không lặp lại
-- phép suy đó — một quy tắc nghiệp vụ chỉ cài ở một nơi.

-- Phần 1 — phân loại theo loại vay
WITH kunn AS (
  SELECT
    c."Id",
    c."ContractNumber",
    c."CustomerId",
    c."LoanAmount",
    c."LoanMethod",
    c."KunnDueDate"::date        AS dao_han,
    c."RepaymentStartDate"::date AS ky_dau,
    (SELECT max(s."DueDate"::date) FROM "RepaymentSchedules" s WHERE s."ContractId" = c."Id") AS ky_cuoi,
    (SELECT count(*) FROM "RepaymentSchedules" s WHERE s."ContractId" = c."Id")               AS so_ky,
    (SELECT count(*) FROM "RepaymentSchedules" s
      WHERE s."ContractId" = c."Id" AND s."DueDate"::date > c."KunnDueDate"::date)            AS so_ky_sau_dao_han,
    (SELECT count(*) FROM "RepaymentSchedules" s
      WHERE s."ContractId" = c."Id" AND s."DueDate"::date > c."KunnDueDate"::date
        AND coalesce(s."IsPaid", false))                                                     AS so_ky_sau_dao_han_da_thu
  FROM "LoanContracts" c
  WHERE coalesce(c."IsSettled", false) = false
    AND c."KunnDueDate" IS NOT NULL
)
SELECT
  "LoanMethod",
  CASE
    WHEN ky_cuoi IS NULL      THEN 'chưa có lịch'
    WHEN ky_cuoi = dao_han    THEN 'đã khớp — không đổi'
    WHEN ky_cuoi > dao_han    THEN 'đáo hạn TRƯỚC kỳ due cuối — kỳ cuối rút về ngày đáo hạn'
    ELSE                           'đáo hạn SAU kỳ due cuối — mở thêm một kỳ'
  END AS tinh_huong,
  count(*)                       AS so_khoan,
  sum("LoanAmount")              AS tong_du_no,
  sum(so_ky_sau_dao_han_da_thu)  AS so_ky_da_thu_nam_sau_dao_han
FROM kunn
GROUP BY 1, 2
ORDER BY 3 DESC;

-- Phần 2 — danh sách chi tiết để đối chiếu GNN giấy.
-- Cột so_ky_sau_dao_han_da_thu > 0 là ca PHẢI xem tay: sinh lại lịch sẽ đụng kỳ
-- đã ghi nhận thu tiền, và hệ thống chặn chứ không tự xoá lịch sử thu.
WITH kunn AS (
  SELECT
    c."Id",
    c."ContractNumber",
    c."CustomerId",
    c."LoanMethod",
    c."KunnDueDate"::date        AS dao_han,
    c."RepaymentStartDate"::date AS ky_dau,
    (SELECT max(s."DueDate"::date) FROM "RepaymentSchedules" s WHERE s."ContractId" = c."Id") AS ky_cuoi,
    (SELECT count(*) FROM "RepaymentSchedules" s WHERE s."ContractId" = c."Id")               AS so_ky,
    (SELECT count(*) FROM "RepaymentSchedules" s
      WHERE s."ContractId" = c."Id" AND s."DueDate"::date > c."KunnDueDate"::date
        AND coalesce(s."IsPaid", false))                                                     AS so_ky_sau_dao_han_da_thu
  FROM "LoanContracts" c
  WHERE coalesce(c."IsSettled", false) = false
    AND c."KunnDueDate" IS NOT NULL
)
SELECT
  k."Id",
  k."ContractNumber",
  k."LoanMethod",
  kh."FullName",
  k.ky_dau,
  k.ky_cuoi,
  k.dao_han,
  k.dao_han - k.ky_cuoi AS lech_ngay,
  k.so_ky,
  k.so_ky_sau_dao_han_da_thu
FROM kunn k
LEFT JOIN "Customers" kh ON kh."Id" = k."CustomerId"
WHERE k.ky_cuoi IS DISTINCT FROM k.dao_han
ORDER BY k.so_ky_sau_dao_han_da_thu DESC, abs(k.dao_han - k.ky_cuoi) DESC;
