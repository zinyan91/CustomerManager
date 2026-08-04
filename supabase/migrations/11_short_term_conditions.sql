-- =====================================================================
-- Điều kiện và ghi chú của chương trình cho vay ngắn hạn
-- =====================================================================
-- Migration 10 mới nạp 2 dòng điều kiện thẻ tín dụng cho chương trình
-- 2274/2026/TB-BĐH. Tờ lãi suất gửi khách còn thiếu phần đối tượng áp
-- dụng và các ghi chú về phí — khách hàng không đọc được công văn nội bộ
-- nên những nội dung này phải nằm trên tờ chào.
--
-- An toàn khi chạy lại nhiều lần.
-- =====================================================================

DO $$
DECLARE
  pid integer;
BEGIN
  SELECT "Id" INTO pid FROM public."RatePrograms"
   WHERE "DocumentNumber" = '2274/2026/TB-BĐH' LIMIT 1;

  IF pid IS NULL THEN
    RAISE NOTICE 'Không tìm thấy chương trình ngắn hạn. Chạy migration 09 trước.';
    RETURN;
  END IF;

  DELETE FROM public."RateProgramConditions" WHERE "ProgramId" = pid;

  INSERT INTO public."RateProgramConditions" ("ProgramId", "Heading", "Content", "SortOrder")
  VALUES
    (pid, 'Mục đích vay',
     'Phục vụ nhu cầu đời sống và hoạt động sản xuất kinh doanh.', 1),

    (pid, 'Tài sản bảo đảm',
     'Bất động sản và/hoặc xe ô tô.', 2),

    (pid, 'Khách hàng phát hành thẻ tín dụng mới',
     'Doanh số giao dịch tối thiểu 3 triệu đồng trong vòng 60 ngày.', 3),

    (pid, 'Khách hàng đã có thẻ tín dụng',
     'Doanh số giao dịch tối thiểu 5 triệu đồng trong vòng 60 ngày.', 4),

    (pid, 'Khách hàng mới',
     'Được giảm tối đa 50% phí dịch vụ nêu trên. Khách hàng mới là khách hàng lần đầu giải ngân vay vốn sản xuất kinh doanh, '
     || 'hoặc đã tất toán toàn bộ dư nợ và rút tài sản từ 30 ngày trở lên, '
     || 'hoặc đã được phê duyệt cấp tín dụng nhưng chưa giải ngân trong 3 tháng gần nhất.', 5),

    (pid, NULL,
     'Doanh thu phí tối thiểu tính trên tất cả thu nhập từ phí dịch vụ, không bao gồm phí trả nợ trước hạn. '
     || 'Phí được ghi nhận nếu phát sinh trong vòng 05 ngày làm việc về trước kể từ ngày giải ngân, bao gồm cả ngày giải ngân.', 6),

    (pid, NULL,
     'Trường hợp giải ngân nhiều giấy nhận nợ, khách hàng được cộng dồn phí đối với các giấy nhận nợ có thời gian cách nhau không quá 05 ngày làm việc.', 7),

    (pid, NULL,
     'Phí tại quầy và phí tài khoản số đẹp chưa bao gồm thuế giá trị gia tăng (VAT) và không áp dụng đối với tài khoản số đẹp 12 số.', 8),

    (pid, 'Phí trả nợ trước hạn',
     'Vay theo hạn mức tín dụng: miễn phí. Vay từng lần: 0,50% số tiền trả nợ trước hạn, '
     || 'miễn phí nếu khách hàng trả nợ trước hạn trong vòng 10 ngày trước thời điểm kết thúc khoản vay.', 9),

    (pid, 'Không áp dụng',
     'Sản phẩm hợp tác kinh doanh; đầu tư sinh lời; cho vay cầm cố tiền gửi tiết kiệm do Vietbank phát hành; '
     || 'khoản vay có mục đích kinh doanh bất động sản; kinh doanh chứng khoán; cho vay thấu chi tài khoản thanh toán.', 10);
END $$;


-- ---------------------------------------------------------------------
-- KIỂM TRA SAU KHI CHẠY
-- ---------------------------------------------------------------------
-- Kỳ vọng 10 dòng cho chương trình ngắn hạn:
--   SELECT c."SortOrder", c."Heading" FROM public."RateProgramConditions" c
--     JOIN public."RatePrograms" p ON p."Id" = c."ProgramId"
--    WHERE p."DocumentNumber" = '2274/2026/TB-BĐH' ORDER BY c."SortOrder";
