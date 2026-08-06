-- =====================================================================
-- Rà soát: kỳ thu nợ đang được coi là xong khi chưa thu đủ
-- =====================================================================
-- Quyết định nghiệp vụ 05/08/2026: một kỳ chỉ xong khi thu ĐỦ nghĩa vụ
-- (gốc + lãi + phạt). Thu một phần gốc, hoặc đủ gốc mà chưa đóng lãi, hay
-- một phần gốc một phần lãi — đều KHÔNG phải đã thanh toán.
--
-- Hiện IsPaid là ô tích tay và điều khiển ba thứ: paidPrincipalOf coi như
-- thu đủ gốc, getAutoDebtGroupInfo bỏ kỳ đó khỏi đếm ngày quá hạn,
-- computeSchedulePenalty ngừng tính phạt.
--
-- CHỈ ĐỌC. Đo mức độ trước khi đổi logic.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PHẦN 1 — Phân bố trạng thái thật của các kỳ
-- ---------------------------------------------------------------------
-- da_thu_nhung_khong_co_so_tien là nhóm PHẢI NẠP TRƯỚC khi chuyển sang
-- suy trạng thái từ số tiền. Không nạp thì cả nhóm này nhảy về "chưa thu"
-- và dư nợ toàn danh mục phình lên.

WITH k AS (
  SELECT
    s."Id",
    s."IsPaid",
    coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0)
      + coalesce(s."OverdueInterestAmount", 0)                     AS nghia_vu,
    coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."ActualPaidInterest", 0)
      + coalesce(s."PrepaidPrincipalAmount", 0)                    AS da_thu
  FROM public."RepaymentSchedules" s
  JOIN public."LoanContracts" l ON l."Id" = s."ContractId"
  WHERE l."IsSettled" IS NOT TRUE
)
SELECT
  count(*)                                                          AS tong_ky,
  count(*) FILTER (WHERE "IsPaid")                                  AS tich_da_thanh_toan,
  count(*) FILTER (WHERE "IsPaid" AND da_thu = 0)                   AS da_thu_nhung_khong_co_so_tien,
  count(*) FILTER (WHERE "IsPaid" AND da_thu > 0 AND da_thu < nghia_vu) AS tich_da_thu_nhung_thu_thieu,
  count(*) FILTER (WHERE NOT "IsPaid" AND da_thu > 0)               AS chua_tich_nhung_da_thu_mot_phan,
  count(*) FILTER (WHERE NOT "IsPaid" AND da_thu = 0)               AS chua_thu_gi
FROM k;


-- ---------------------------------------------------------------------
-- PHẦN 2 — Kỳ đã tích "đã thanh toán" mà số tiền thu còn thiếu
-- ---------------------------------------------------------------------
-- Đây là các kỳ đang khai thiếu dư nợ, khai tốt nhóm nợ và được tha phạt.
-- NÂNG ô Limit của editor trước khi chạy.

SELECT
  c."FullName",
  l."ContractNumber",
  s."PeriodNumber",
  s."DueDate",
  s."PrincipalAmount",
  s."InterestAmount",
  coalesce(s."OverdueInterestAmount", 0)                            AS phat,
  coalesce(s."ActualPaidPrincipal", 0)                              AS goc_da_thu,
  coalesce(s."ActualPaidInterest", 0)                               AS lai_da_thu,
  coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0)
    + coalesce(s."OverdueInterestAmount", 0)
  - coalesce(s."ActualPaidPrincipal", 0) - coalesce(s."ActualPaidInterest", 0)
  - coalesce(s."PrepaidPrincipalAmount", 0)                         AS con_thieu
FROM public."RepaymentSchedules" s
JOIN public."LoanContracts" l ON l."Id" = s."ContractId"
JOIN public."Customers" c ON c."Id" = l."CustomerId"
WHERE l."IsSettled" IS NOT TRUE
  AND s."IsPaid"
  AND coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."ActualPaidInterest", 0)
      + coalesce(s."PrepaidPrincipalAmount", 0) > 0
  AND coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."ActualPaidInterest", 0)
      + coalesce(s."PrepaidPrincipalAmount", 0)
      < coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0)
        + coalesce(s."OverdueInterestAmount", 0)
ORDER BY 10 DESC;


-- ---------------------------------------------------------------------
-- PHẦN 3 — Kỳ chưa tích mà đã thu một phần
-- ---------------------------------------------------------------------
-- Nhóm này hiện đang bị tính phạt và đếm quá hạn trên TOÀN BỘ nghĩa vụ,
-- kể cả phần khách đã trả.

SELECT
  c."FullName",
  l."ContractNumber",
  s."PeriodNumber",
  s."DueDate",
  s."OverdueDays",
  coalesce(s."ActualPaidPrincipal", 0)                              AS goc_da_thu,
  coalesce(s."ActualPaidInterest", 0)                               AS lai_da_thu,
  coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0) AS nghia_vu
FROM public."RepaymentSchedules" s
JOIN public."LoanContracts" l ON l."Id" = s."ContractId"
JOIN public."Customers" c ON c."Id" = l."CustomerId"
WHERE l."IsSettled" IS NOT TRUE
  AND NOT s."IsPaid"
  AND coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."ActualPaidInterest", 0)
      + coalesce(s."PrepaidPrincipalAmount", 0) > 0
ORDER BY 4;


-- ---------------------------------------------------------------------
-- PHẦN 4 — Chênh lệch do làm tròn
-- ---------------------------------------------------------------------
-- Để chọn ngưỡng coi là "đủ": nếu phần lớn khoản thiếu nằm dưới 1.000đ
-- thì đó là làm tròn, không phải khách nợ.

WITH k AS (
  SELECT
    coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0)
      + coalesce(s."OverdueInterestAmount", 0)
    - coalesce(s."ActualPaidPrincipal", 0) - coalesce(s."ActualPaidInterest", 0)
    - coalesce(s."PrepaidPrincipalAmount", 0)                       AS con_thieu
  FROM public."RepaymentSchedules" s
  JOIN public."LoanContracts" l ON l."Id" = s."ContractId"
  WHERE l."IsSettled" IS NOT TRUE
    AND s."IsPaid"
    AND coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."ActualPaidInterest", 0)
        + coalesce(s."PrepaidPrincipalAmount", 0) > 0
)
SELECT
  count(*)                                          AS tong,
  count(*) FILTER (WHERE con_thieu <= 0)            AS thu_du_hoac_thua,
  count(*) FILTER (WHERE con_thieu > 0 AND con_thieu <= 1000)    AS thieu_duoi_1_nghin,
  count(*) FILTER (WHERE con_thieu > 1000 AND con_thieu <= 100000) AS thieu_duoi_100_nghin,
  count(*) FILTER (WHERE con_thieu > 100000)        AS thieu_tren_100_nghin,
  max(con_thieu)                                    AS thieu_nhieu_nhat
FROM k;
