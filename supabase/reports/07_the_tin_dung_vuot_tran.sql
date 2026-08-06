-- Rà soát thẻ tín dụng sau khi đưa thẻ vào chốt kiểm soát TSĐB (migration 27).
-- Chỉ ĐỌC, không sửa gì.
--
-- GIỚI HẠN PHẢI BIẾT: ba câu dưới đây chỉ kiểm được những ràng buộc xét theo
-- TỪNG TÀI SẢN. Ràng buộc cụm liên thông (một khoản vay nhiều tài sản, một tài
-- sản nhiều khoản vay) KHÔNG viết lại được trung thực bằng SQL thuần — thuật
-- toán gộp cụm nằm ở checkCollateralCapacity. Viết xấp xỉ trong SQL sẽ đếm một
-- khoản vay nhiều lần và tạo báo động giả hàng loạt, đúng cái CONVENTIONS §1
-- đã trả giá. Ràng buộc cụm phải xem trong ứng dụng, ở chốt kiểm soát màn KUNN.


-- 1. Phạm vi: bao nhiêu thẻ đang gắn TSBĐ, chia theo loại tài sản.
--    Cho biết đợt rà soát này ảnh hưởng tới bao nhiêu hồ sơ.

SELECT
  coalesce(t."AssetType", '(không khai)')            AS loai_tai_san,
  count(*)                                            AS so_the,
  sum(coalesce(c."CreditLimit", 0))                   AS tong_han_muc_the
FROM "CreditCards" c
JOIN "Collaterals" t ON t."Id" = c."CollateralId"
GROUP BY 1
ORDER BY 3 DESC;


-- 2. CHÍNH XÁC: thẻ trên sổ tiết kiệm vượt trần sản phẩm 90% mệnh giá.
--    Không cần logic cụm — trần này xét trên đúng một tài sản.

SELECT
  c."Id"                                              AS the_id,
  c."CardNumber"                                      AS so_the,
  kh."FullName"                                       AS khach_hang,
  t."AssetCode"                                       AS ma_tai_san,
  t."AssetType"                                       AS loai_tai_san,
  coalesce(t."AppraisedValue", t."Value", 0)          AS menh_gia,
  round(coalesce(t."AppraisedValue", t."Value", 0) * 0.9) AS tran_90_phan_tram,
  coalesce(c."CreditLimit", 0)                        AS han_muc_the,
  coalesce(c."CreditLimit", 0)
    - round(coalesce(t."AppraisedValue", t."Value", 0) * 0.9) AS vuot,
  c."IsLtvException"                                  AS da_khai_ngoai_le
FROM "CreditCards" c
JOIN "Collaterals" t ON t."Id" = c."CollateralId"
JOIN "Customers" kh  ON kh."Id" = c."CustomerId"
WHERE (t."AssetType" LIKE 'Sổ tiết kiệm%' OR t."AssetType" LIKE 'STK%')
  AND coalesce(c."CreditLimit", 0)
      > round(coalesce(t."AppraisedValue", t."Value", 0) * 0.9)
ORDER BY vuot DESC;


-- 3. CHÍNH XÁC: thẻ gắn tài sản có định giá đã hết hiệu lực hoặc chưa định giá.
--    usableCapacity trả 0 cho các tài sản này, nghĩa là thẻ đang được cấp trên
--    một con số không còn dùng được. Hạn định giá tính lại từ AppraisalDate
--    cộng AppraisalTenorMonths, KHÔNG tin cột AppraisalExpiryDate (kiểu text).

SELECT
  c."Id"                                              AS the_id,
  c."CardNumber"                                      AS so_the,
  kh."FullName"                                       AS khach_hang,
  t."AssetCode"                                       AS ma_tai_san,
  t."AppraisalDate"                                   AS ngay_dinh_gia,
  coalesce(t."AppraisalTenorMonths", 12)              AS hieu_luc_thang,
  t."AppraisalDate"
    + (coalesce(t."AppraisalTenorMonths", 12) || ' months')::interval AS het_hieu_luc,
  coalesce(c."CreditLimit", 0)                        AS han_muc_the,
  CASE WHEN t."AppraisalDate" IS NULL
       THEN 'chưa định giá'
       ELSE 'hết hiệu lực' END                        AS ly_do
FROM "CreditCards" c
JOIN "Collaterals" t ON t."Id" = c."CollateralId"
JOIN "Customers" kh  ON kh."Id" = c."CustomerId"
WHERE coalesce(c."CreditLimit", 0) > 0
  AND (
    t."AppraisalDate" IS NULL
    OR t."AppraisalDate"
       + (coalesce(t."AppraisalTenorMonths", 12) || ' months')::interval < now()
  )
ORDER BY han_muc_the DESC;


-- 4. Tàn dư: thẻ còn giữ mã tài sản trong Note thay vì cột CollateralId.
--    Đường ghi đã bịt, nhưng dữ liệu cũ vẫn được checkCardLimit đọc tới.

SELECT
  "Id"        AS the_id,
  "CardNumber" AS so_the,
  "CollateralId" AS cot_that,
  substring("Note" from '\[CollateralId:(\d+)\]') AS trong_note
FROM "CreditCards"
WHERE "Note" LIKE '%[CollateralId:%'
ORDER BY "Id";
