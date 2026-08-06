-- =====================================================================
-- Rà soát: kỳ thu nợ đang được coi là xong khi chưa thu đủ
-- =====================================================================
-- Quyết định nghiệp vụ 05/08/2026: một kỳ chỉ xong khi thu ĐỦ nghĩa vụ
-- (gốc + lãi + phạt). Thu một phần gốc, hoặc đủ gốc mà chưa đóng lãi, hay
-- một phần gốc một phần lãi — đều KHÔNG phải đã thanh toán.
--
-- BẢN NÀY ĐÃ SỬA. Bản đầu cộng tay và cho hai báo động giả trên hồ sơ LÊ
-- VĂN HẬU, hai lỗi cùng lúc:
--
--   1. Trừ PrepaidPrincipalAmount ra khỏi nghĩa vụ, trong khi
--      PrincipalAmount VỐN ĐÃ bao gồm phần trả trước hạn (CONVENTIONS §2).
--      Kỳ 7 của 2002/HĐTD/9665732/GNN-01: 800.840.000 + 24.158.604
--      − 785.000.000 = 39.998.604 — một khoản "thiếu" không tồn tại, thực
--      chất là khách TRẢ TRƯỚC HẠN chứ không phải nợ quá hạn.
--   2. Hiểu ActualPaidPrincipal = 0 là "chưa thu đồng nào", trong khi kèm
--      IsPaid = true thì quy ước cũ nghĩa là "đã trả đủ theo lịch".
--
-- Nên câu này PHẢN CHIẾU ĐÚNG paidPrincipalOf trong loanMath.ts, đúng
-- nguyên tắc CONVENTIONS §1: SQL rà soát dùng lại quy tắc đã cài trong code.
--
-- CHỈ ĐỌC.
-- =====================================================================


-- ---------------------------------------------------------------------
-- Quy tắc dùng chung — sao lại đúng paidPrincipalOf + nghĩa vụ của kỳ
-- ---------------------------------------------------------------------
--   goc_da_thu = ActualPaidPrincipal > 0
--                  ? ActualPaidPrincipal + PrepaidPrincipalAmount
--                  : IsPaid ? PrincipalAmount : PrepaidPrincipalAmount
--   lai_da_thu = ActualPaidInterest, HOẶC InterestAmount nếu IsPaid mà cột
--                đó bỏ trống (cùng quy ước cũ với gốc)
--   nghia_vu   = PrincipalAmount + InterestAmount + OverdueInterestAmount
--                (PrincipalAmount đã gồm phần trả trước hạn)


-- ---------------------------------------------------------------------
-- PHẦN 1 — Phân bố trạng thái thật của các kỳ
-- ---------------------------------------------------------------------
-- da_thu_theo_quy_uoc_cu là nhóm PHẢI NẠP TRƯỚC khi chuyển sang suy trạng
-- thái từ số tiền: IsPaid = true nhưng cả hai cột ActualPaid* bỏ trống.
-- Không nạp thì cả nhóm nhảy về "chưa thu" và dư nợ toàn danh mục phình lên.

WITH k AS (
  SELECT
    s."Id",
    s."IsPaid",
    coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0)
      + coalesce(s."OverdueInterestAmount", 0)                          AS nghia_vu,
    CASE
      WHEN coalesce(s."ActualPaidPrincipal", 0) > 0
        THEN s."ActualPaidPrincipal" + coalesce(s."PrepaidPrincipalAmount", 0)
      WHEN s."IsPaid" THEN coalesce(s."PrincipalAmount", 0)
      ELSE coalesce(s."PrepaidPrincipalAmount", 0)
    END                                                                 AS goc_da_thu,
    CASE
      WHEN coalesce(s."ActualPaidInterest", 0) > 0 THEN s."ActualPaidInterest"
      WHEN s."IsPaid" THEN coalesce(s."InterestAmount", 0)
      ELSE 0
    END                                                                 AS lai_da_thu,
    coalesce(s."ActualPaidPrincipal", 0)                                AS goc_khai_tay,
    coalesce(s."ActualPaidInterest", 0)                                 AS lai_khai_tay
  FROM public."RepaymentSchedules" s
  JOIN public."LoanContracts" l ON l."Id" = s."ContractId"
  WHERE l."IsSettled" IS NOT TRUE
)
SELECT
  count(*)                                                              AS tong_ky,
  count(*) FILTER (WHERE "IsPaid")                                      AS tich_da_thanh_toan,
  count(*) FILTER (WHERE "IsPaid" AND goc_khai_tay = 0 AND lai_khai_tay = 0)
                                                                        AS da_thu_theo_quy_uoc_cu,
  count(*) FILTER (WHERE "IsPaid" AND (goc_khai_tay > 0 OR lai_khai_tay > 0)
                     AND goc_da_thu + lai_da_thu < nghia_vu)            AS tich_nhung_thu_thieu_that,
  count(*) FILTER (WHERE NOT "IsPaid" AND (goc_khai_tay > 0 OR lai_khai_tay > 0))
                                                                        AS chua_tich_nhung_da_thu_mot_phan,
  count(*) FILTER (WHERE NOT "IsPaid" AND goc_khai_tay = 0 AND lai_khai_tay = 0
                     AND coalesce(goc_da_thu, 0) = 0)                   AS chua_thu_gi
FROM k;


-- ---------------------------------------------------------------------
-- PHẦN 2 — Kỳ đã tích mà THẬT SỰ thu thiếu
-- ---------------------------------------------------------------------
-- Chỉ xét kỳ có khai tay ít nhất một trong hai cột ActualPaid*, nên loại
-- được cả nhóm quy ước cũ lẫn nhóm trả trước hạn.
-- Cột tra_truoc_han để nhìn thấy phần trả trước, KHÔNG trừ ra khỏi nghĩa vụ.

SELECT
  c."FullName",
  l."ContractNumber",
  s."PeriodNumber",
  s."DueDate",
  s."PrincipalAmount",
  s."InterestAmount",
  coalesce(s."OverdueInterestAmount", 0)                                AS phat,
  coalesce(s."PrepaidPrincipalAmount", 0)                               AS tra_truoc_han,
  coalesce(s."ActualPaidPrincipal", 0)                                  AS goc_khai_tay,
  coalesce(s."ActualPaidInterest", 0)                                   AS lai_khai_tay,
  coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0)
    + coalesce(s."OverdueInterestAmount", 0)
  - (coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."PrepaidPrincipalAmount", 0))
  - coalesce(s."ActualPaidInterest", 0)                                 AS con_thieu
FROM public."RepaymentSchedules" s
JOIN public."LoanContracts" l ON l."Id" = s."ContractId"
JOIN public."Customers" c ON c."Id" = l."CustomerId"
WHERE l."IsSettled" IS NOT TRUE
  AND s."IsPaid"
  AND (coalesce(s."ActualPaidPrincipal", 0) > 0 OR coalesce(s."ActualPaidInterest", 0) > 0)
  AND coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0)
      + coalesce(s."OverdueInterestAmount", 0)
      > coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."PrepaidPrincipalAmount", 0)
        + coalesce(s."ActualPaidInterest", 0)
ORDER BY 11 DESC;


-- ---------------------------------------------------------------------
-- PHẦN 3 — Kỳ chưa tích mà đã thu một phần
-- ---------------------------------------------------------------------
-- Nhóm này đang bị đếm quá hạn và tính phạt trên TOÀN BỘ nghĩa vụ, kể cả
-- phần khách đã trả.

SELECT
  c."FullName",
  l."ContractNumber",
  s."PeriodNumber",
  s."DueDate",
  s."OverdueDays",
  coalesce(s."ActualPaidPrincipal", 0)                                  AS goc_khai_tay,
  coalesce(s."ActualPaidInterest", 0)                                   AS lai_khai_tay,
  coalesce(s."PrepaidPrincipalAmount", 0)                               AS tra_truoc_han,
  coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0)     AS nghia_vu
FROM public."RepaymentSchedules" s
JOIN public."LoanContracts" l ON l."Id" = s."ContractId"
JOIN public."Customers" c ON c."Id" = l."CustomerId"
WHERE l."IsSettled" IS NOT TRUE
  AND NOT s."IsPaid"
  AND (coalesce(s."ActualPaidPrincipal", 0) > 0 OR coalesce(s."ActualPaidInterest", 0) > 0)
ORDER BY 4;


-- ---------------------------------------------------------------------
-- PHẦN 4 — Trả nợ trước hạn, để KHÔNG lẫn với thu thiếu
-- ---------------------------------------------------------------------
-- Đây là nhóm mà bản báo cáo đầu đã gộp bậy. Trả trước hạn là khách trả
-- SỚM, ngược hẳn với nợ quá hạn.

SELECT
  c."FullName",
  l."ContractNumber",
  s."PeriodNumber",
  s."DueDate",
  s."IsPaid",
  coalesce(s."PrepaidPrincipalAmount", 0)                               AS tra_truoc_han,
  s."PrincipalAmount",
  coalesce(s."ActualPaidPrincipal", 0)                                  AS goc_khai_tay
FROM public."RepaymentSchedules" s
JOIN public."LoanContracts" l ON l."Id" = s."ContractId"
JOIN public."Customers" c ON c."Id" = l."CustomerId"
WHERE coalesce(s."PrepaidPrincipalAmount", 0) > 0
ORDER BY 6 DESC;


-- ---------------------------------------------------------------------
-- PHẦN 5 — Chênh lệch do làm tròn, để chọn ngưỡng coi là "đủ"
-- ---------------------------------------------------------------------

WITH k AS (
  SELECT
    coalesce(s."PrincipalAmount", 0) + coalesce(s."InterestAmount", 0)
      + coalesce(s."OverdueInterestAmount", 0)
    - (coalesce(s."ActualPaidPrincipal", 0) + coalesce(s."PrepaidPrincipalAmount", 0))
    - coalesce(s."ActualPaidInterest", 0)                               AS con_thieu
  FROM public."RepaymentSchedules" s
  JOIN public."LoanContracts" l ON l."Id" = s."ContractId"
  WHERE l."IsSettled" IS NOT TRUE
    AND s."IsPaid"
    AND (coalesce(s."ActualPaidPrincipal", 0) > 0 OR coalesce(s."ActualPaidInterest", 0) > 0)
)
SELECT
  count(*)                                                              AS tong,
  count(*) FILTER (WHERE con_thieu <= 0)                                AS thu_du_hoac_thua,
  count(*) FILTER (WHERE con_thieu > 0 AND con_thieu <= 1000)            AS thieu_duoi_1_nghin,
  count(*) FILTER (WHERE con_thieu > 1000 AND con_thieu <= 100000)       AS thieu_duoi_100_nghin,
  count(*) FILTER (WHERE con_thieu > 100000)                             AS thieu_tren_100_nghin,
  max(con_thieu)                                                        AS thieu_nhieu_nhat
FROM k;
