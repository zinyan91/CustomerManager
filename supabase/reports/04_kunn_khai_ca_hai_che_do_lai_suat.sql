-- =====================================================================
-- Rà soát: KUNN khai đồng thời lãi ưu đãi VÀ lãi thông thường
-- =====================================================================
-- Quyết định nghiệp vụ 05/08/2026: hai chế độ lãi suất LOẠI TRỪ NHAU.
-- Chọn "LS thông thường" thì lãi ưu đãi không tồn tại để mà áp dụng.
--
-- Trước đây form lưu cả hai nhóm cột bất kể banker chọn chế độ nào, còn
-- buildRateTimeline thấy PreferentialRate > 0 kèm số kỳ > 0 là áp lãi ưu
-- đãi — nên khoản khai theo lãi thông thường vẫn bị tính lãi ưu đãi.
--
-- Đã bịt ở mã nguồn (buildRateFields). Câu này tìm các dòng CŨ.
-- CHỈ ĐỌC.
-- =====================================================================


-- ---------------------------------------------------------------------
-- PHẦN 1 — Tổng hợp
-- ---------------------------------------------------------------------

SELECT
  count(*)                                                            AS tong_kunn,
  count(*) FILTER (
    WHERE coalesce("PreferentialRate", 0) > 0
      AND coalesce("PreferentialPeriodMonths", 0) > 0
      AND coalesce("BaseRate", 0) > 0
  )                                                                   AS khai_ca_hai_che_do,
  count(*) FILTER (
    WHERE coalesce("PenaltySurcharge", 0) > 0
  )                                                                   AS co_phu_troi_dieu_kien
FROM public."LoanContracts"
WHERE "IsSettled" IS NOT TRUE;


-- ---------------------------------------------------------------------
-- PHẦN 2 — Danh sách, kèm mức lãi mà mỗi cách hiểu sẽ cho ra
-- ---------------------------------------------------------------------
-- lai_dang_ap_dung  = mức bảng lịch ĐANG tính (ưu đãi thắng)
-- lai_neu_thong_thuong = mức nếu hiểu là chế độ thông thường
-- lech_diem_pt      = khoảng cách giữa hai cách hiểu, tính theo điểm %
--
-- NÂNG ô Limit của editor trước khi chạy.

SELECT
  c."FullName",
  l."ContractNumber",
  l."DisbursementDate",
  l."KunnTenor",
  round(l."PreferentialRate" * 100, 4)                     AS ls_uu_dai,
  l."PreferentialPeriodMonths"                             AS so_ky_uu_dai,
  round(l."BaseRate" * 100, 4)                             AS ls_co_so,
  round(l."MarginRate" * 100, 4)                           AS bien_do,
  round(coalesce(l."PenaltySurcharge", 0), 4)              AS phu_troi,
  round(l."InterestRate" * 100, 4)                         AS interest_rate_da_luu,
  round(l."PreferentialRate" * 100, 4)                     AS lai_dang_ap_dung,
  round((l."BaseRate" + coalesce(l."MarginRate", 0)) * 100, 4) AS lai_neu_thong_thuong,
  round(((l."BaseRate" + coalesce(l."MarginRate", 0)) - l."PreferentialRate") * 100, 4) AS lech_diem_pt
FROM public."LoanContracts" l
JOIN public."Customers" c ON c."Id" = l."CustomerId"
WHERE l."IsSettled" IS NOT TRUE
  AND coalesce(l."PreferentialRate", 0) > 0
  AND coalesce(l."PreferentialPeriodMonths", 0) > 0
  AND coalesce(l."BaseRate", 0) > 0
ORDER BY abs((l."BaseRate" + coalesce(l."MarginRate", 0)) - l."PreferentialRate") DESC,
         c."FullName";


-- ---------------------------------------------------------------------
-- PHẦN 3 — Phụ trội điều kiện: chưa đi vào phép tính lãi
-- ---------------------------------------------------------------------
-- PenaltySurcharge được lưu và đọc lại vào form, nhưng KHÔNG nằm trong
-- đầu vào của buildRateTimeline, nên không kỳ lãi nào cộng nó. Danh sách
-- dưới đây là các khoản đang bị ảnh hưởng, chờ quyết định nghiệp vụ:
-- phụ trội có được cộng vào lãi suất cho vay hay không.

SELECT
  c."FullName",
  l."ContractNumber",
  round(coalesce(l."PenaltySurcharge", 0), 4)              AS phu_troi_diem_pt,
  round(l."InterestRate" * 100, 4)                         AS interest_rate_da_luu,
  round(coalesce(l."CurrentBalance", l."LoanAmount", 0), 0) AS du_no
FROM public."LoanContracts" l
JOIN public."Customers" c ON c."Id" = l."CustomerId"
WHERE l."IsSettled" IS NOT TRUE
  AND coalesce(l."PenaltySurcharge", 0) > 0
ORDER BY 3 DESC, 1;
