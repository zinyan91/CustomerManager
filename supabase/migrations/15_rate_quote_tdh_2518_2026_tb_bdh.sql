-- Migration 15: Cập nhật Lãi suất cho vay trung dài hạn theo Thông báo 2518/2026/TB-BĐH ngày 19/08/2026
-- Thay thế Thông báo 1680/2026/TB-TGĐ ngày 19/06/2026

DO $$
DECLARE
  pid integer;
BEGIN
  -- 1. Cập nhật ngày kết thúc của thông báo cũ 1680/2026/TB-TGĐ
  UPDATE public."RatePrograms"
     SET "EffectiveTo" = '2026-08-18'
   WHERE "DocumentNumber" = '1680/2026/TB-TGĐ';

  -- 2. Kiểm tra nếu thông báo 2518 đã tồn tại thì không thêm lại
  SELECT "Id" INTO pid FROM public."RatePrograms"
   WHERE "DocumentNumber" = '2518/2026/TB-BĐH' LIMIT 1;

  IF pid IS NOT NULL THEN
    RETURN;
  END IF;

  -- 3. Thêm chương trình mới 2518/2026/TB-BĐH
  INSERT INTO public."RatePrograms" (
    "Kind", "Name", "DocumentNumber", "DocumentDate", "EffectiveFrom", "EffectiveTo",
    "QuotaVnd", "FloatingBaseLabel", "FloatingSpreadAnnual", "RateResetMonths",
    "MinFeeAmountVnd", "NewCustomerFeeDiscount", "CasaShortfallFeeAddon", "CasaMinRatio",
    "AllowRateReduction", "AllowPrepayFeeWaive", "SourceVerified",
    "ScopeText", "TargetText", "Note"
  ) VALUES (
    'cho_vay_trung_dai_han',
    'Chương trình lãi suất cho vay trung dài hạn dành cho KHCN (2518/2026/TB-BĐH)',
    '2518/2026/TB-BĐH',
    '2026-08-19',
    '2026-08-19',
    '2026-09-30',
    1000000000000,
    'LSCS',
    0.0375,
    3,
    500000,
    NULL,
    NULL,
    NULL,
    false,
    false,
    true,
    'Cho vay trung dài hạn phục vụ nhu cầu đời sống, hoạt động SXKD. Thời gian vay tối thiểu 60 tháng. Hết hiệu lực khi hết hạn mức 1.000 tỷ đồng hoặc hết ngày 30/09/2026.',
    'Khách hàng cá nhân (KHCN).',
    'Thay thế Thông báo 1680/2026/TB-TGĐ ngày 19/06/2026. Hiệu lực từ 19/08/2026 đến hết 30/09/2026 hoặc đến khi hết hạn mức 1.000 tỷ đồng. '
    || 'Phí dịch vụ: Gói CĐ 24T tối thiểu 1.50% (tối thiểu 500.000đ), các gói còn lại tối thiểu 1.00% (tối thiểu 500.000đ). '
    || 'Điều kiện thẻ tín dụng: phát sinh tối thiểu 3 triệu trong 60 ngày (thẻ mới) hoặc 5 triệu (thẻ cũ), không thoả truy thu 0.10%/năm và cộng thêm 0.10%/năm. '
    || 'Miễn phí trả nợ trước hạn trong vòng 30 ngày trước thời điểm kết thúc khoản vay.'
  ) RETURNING "Id" INTO pid;

  -- 4. Bảng Tiers Lãi suất ưu đãi
  INSERT INTO public."RateProgramTiers" (
    "ProgramId", "Label", "FixedMonths", "MinTenorMonths", "MinFeeRatio", "RateAnnual", "SortOrder", "Note"
  ) VALUES
    (pid, 'Cố định 03 tháng', 3,  60, 0.0100, 0.0000, 1, 'Ưu đãi 0%/năm trong 03 tháng đầu. Phí dịch vụ tối thiểu 1.00% (tối thiểu 500.000đ).'),
    (pid, 'Cố định 06 tháng', 6,  60, 0.0100, 0.0850, 2, 'Ưu đãi 8.50%/năm trong 06 tháng đầu. Phí dịch vụ tối thiểu 1.00% (tối thiểu 500.000đ).'),
    (pid, 'Cố định 12 tháng', 12, 60, 0.0100, 0.0950, 3, 'Ưu đãi 9.50%/năm trong 12 tháng đầu. Phí dịch vụ tối thiểu 1.00% (tối thiểu 500.000đ).'),
    (pid, 'Cố định 24 tháng', 24, 60, 0.0150, 0.1050, 4, 'Ưu đãi 10.50%/năm trong 24 tháng đầu. Phí dịch vụ tối thiểu 1.50% (tối thiểu 500.000đ).');

  -- 5. Bảng Phí trả nợ trước hạn
  INSERT INTO public."RateProgramPrepaymentFees" (
    "ProgramId", "YearFrom", "YearTo", "FeeRatio", "Note"
  ) VALUES
    (pid, 1, 1, 0.0400, NULL),
    (pid, 2, 2, 0.0300, NULL),
    (pid, 3, 3, 0.0200, NULL),
    (pid, 4, 4, 0.0100, NULL),
    (pid, 5, 5, 0.0050, NULL),
    (pid, 6, NULL, 0.0000, 'Miễn phí trả nợ trước hạn nếu trả trong vòng 30 ngày trước thời điểm kết thúc khoản vay.');

  -- 6. Bảng Hướng dẫn mã Corebanking FBE & UDF
  INSERT INTO public."RateProgramFbeCodes" (
    "ProgramId", "Scope", "Applies", "RateIdCode", "Description", "RateIdValue", "SortOrder"
  ) VALUES
    (pid, 'co_dinh_ky_dau', 'Gói CĐ 03T — 03 tháng đầu', '10837', 'CN_UU DAI_TOI DA 03 THANG CO DINH LSCV', '0% (fix)', 1),
    (pid, 'co_dinh_ky_dau', 'Gói CĐ 03T — Từ tháng 04 trở đi', '3917', 'CN_THONG THUONG_LSCS TDH_M', 'LSCS + biên độ 3.75%', 2),
    (pid, 'co_dinh_ky_dau', 'Gói CĐ 06T — 06 tháng đầu', '10838', 'CN_UU DAI_TOI DA 06 THANG CO DINH LSCV', '8.50% (fix)', 3),
    (pid, 'co_dinh_ky_dau', 'Gói CĐ 06T — Từ tháng 07 trở đi', '3917', 'CN_THONG THUONG_LSCS TDH_M', 'LSCS + biên độ 3.75%', 4),
    (pid, 'co_dinh_ky_dau', 'Gói CĐ 12T — 12 tháng đầu', '11138', 'CN_UU DAI_TOI DA 12 THANG CO DINH LSCV', '9.50% (fix)', 5),
    (pid, 'co_dinh_ky_dau', 'Gói CĐ 12T — Từ tháng 13 trở đi', '3917', 'CN_THONG THUONG_LSCS TDH_M', 'LSCS + biên độ 3.75%', 6),
    (pid, 'co_dinh_ky_dau', 'Gói CĐ 24T — 24 tháng đầu', '18965', 'CN_UU DAI_TOI DA 24 THANG CO DINH LSCV', '10.50% (fix)', 7),
    (pid, 'co_dinh_ky_dau', 'Gói CĐ 24T — Từ tháng 25 trở đi', '3917', 'CN_THONG THUONG_LSCS TDH_M', 'LSCS + biên độ 3.75%', 8),
    (pid, 'data_udf', 'Cố định lãi suất 03 tháng đầu', NULL, 'CN_UD 03T_GOI TDH 2026 (LAN3)', NULL, 9),
    (pid, 'data_udf', 'Cố định lãi suất 06 tháng đầu', NULL, 'CN_UD 06T_GOI TDH 2026 (LAN3)', NULL, 10),
    (pid, 'data_udf', 'Cố định lãi suất 12 tháng đầu', NULL, 'CN_UD 12T_GOI TDH 2026 (LAN3)', NULL, 11),
    (pid, 'data_udf', 'Cố định lãi suất 24 tháng đầu', NULL, 'CN_UD 24T_GOI TDH 2026 (LAN3)', NULL, 12),
    (pid, 'data_udf', 'Thẻ tín dụng đi kèm khoản vay', NULL, 'THEMOI - [Số tháng CĐ] hoặc THECU - [Số tháng CĐ]', 'VD: THEMOI - 6M', 13);

END $$;
