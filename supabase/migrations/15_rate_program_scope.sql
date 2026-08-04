-- =====================================================================
-- Phạm vi áp dụng & Đối tượng áp dụng của chương trình lãi suất
-- =====================================================================
-- Văn bản của Ban điều hành luôn ghi rõ chương trình áp cho ai và trong
-- phạm vi nào (kênh, sản phẩm, loại khách hàng, vùng). Trước đây phần này
-- bị dồn vào cột "Note" chung nên không tra được, không hiển thị riêng, và
-- lẫn với các câu ghi chú không còn giá trị sử dụng như "thay thế thông báo
-- số ...".
--
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================

ALTER TABLE public."RatePrograms"
  ADD COLUMN IF NOT EXISTS "ScopeText"  text,
  ADD COLUMN IF NOT EXISTS "TargetText" text;

COMMENT ON COLUMN public."RatePrograms"."ScopeText" IS
  'Phạm vi áp dụng: sản phẩm, kênh, vùng, thời gian áp dụng đặc thù. Lấy nguyên văn từ văn bản gốc.';

COMMENT ON COLUMN public."RatePrograms"."TargetText" IS
  'Đối tượng áp dụng: nhóm khách hàng được và không được áp dụng. Lấy nguyên văn từ văn bản gốc.';


-- ---------------------------------------------------------------------
-- NẠP SẴN CHO BA CHƯƠNG TRÌNH ĐÃ ĐỐI CHIẾU VĂN BẢN GỐC
-- ---------------------------------------------------------------------
-- Chỉ ghi khi ô còn trống, để không đè nội dung admin đã tự sửa.

UPDATE public."RatePrograms"
SET "TargetText" = COALESCE("TargetText", 'Khách hàng cá nhân (KHCN).'),
    "ScopeText"  = COALESCE("ScopeText",
      'Cho vay ngắn hạn. Hết hiệu lực khi hết hạn mức chương trình 4.000 tỷ đồng. '
      'Không áp dụng thẩm quyền giảm LSCV và giảm phí trả nợ trước hạn trong suốt thời gian vay.')
WHERE "DocumentNumber" = '2274/2026/TB-BĐH';

UPDATE public."RatePrograms"
SET "TargetText" = COALESCE("TargetText", 'Khách hàng cá nhân (KHCN).'),
    "ScopeText"  = COALESCE("ScopeText",
      'Cho vay trung dài hạn. Hết hiệu lực khi hết hạn mức chương trình 1.000 tỷ đồng. '
      'Thời gian cố định lãi suất kỳ đầu không vượt quá 1/2 thời gian cho vay theo từng giấy nhận nợ, làm tròn xuống khi lẻ tháng.')
WHERE "DocumentNumber" = '1680/2026/TB-TGĐ';

UPDATE public."RatePrograms"
SET "TargetText" = COALESCE("TargetText",
      'Khách hàng cá nhân mở tài khoản tiền gửi tiết kiệm trong thời gian chương trình, gồm khoản tái tục, gửi mới và khách hàng mới. '
      'Không áp dụng cho khách hàng thuộc danh mục đặc thù (khách hàng chiến lược, Legacy).'),
    "ScopeText"  = COALESCE("ScopeText",
      'Tiết kiệm truyền thống, tiết kiệm quốc chọn, tiền gửi/hợp đồng tiền gửi có kỳ hạn, tiết kiệm Phát lộc, tiền gửi online có kỳ hạn. '
      'TTKD được áp dụng mức lãi suất thấp hơn. Số dư tính trên 01 tài khoản tiết kiệm. '
      'Không áp dụng đồng thời với chương trình ưu đãi/khuyến mãi khác.')
WHERE "DocumentNumber" = '2279/2026/TB-BĐH';


-- ---------------------------------------------------------------------
-- KIỂM TRA
-- ---------------------------------------------------------------------
-- SELECT "DocumentNumber", "Name", "ScopeText", "TargetText"
-- FROM public."RatePrograms"
-- ORDER BY "EffectiveFrom" DESC;
