-- Lãi suất cho vay (LSCV) dành cho KHCN, quý IV/2026 — hiệu lực 02/11 → 31/12/2026.
-- Nguồn: Thông báo số 3177/2026/TB-TGĐ ngày 30/10/2026, Vietbank, V/v Ban hành lãi suất cho vay dành cho khách hàng cá nhân.
-- ĐÃ ĐỐI CHIẾU BẢN GỐC nên SourceVerified = true.
--
-- Một văn bản, hai chương trình (ngắn hạn, trung dài hạn); "DocumentNumber" là UNIQUE nên mỗi bản mang hậu tố loại.
-- Ngắn hạn: LSCV cố định suốt thời gian vay theo thời gian nhận nợ X; MinTenorMonths là cận dưới của khoảng X,
-- FixedMonths là cận trên. Sản phẩm nông nghiệp, nông thôn: LSCV tối thiểu thấp hơn 0,5% (ghi ở điều kiện).

BEGIN;

DO $$
DECLARE
  pid integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public."RatePrograms" WHERE "DocumentNumber" = '3177/2026/TB-TGĐ (ngắn hạn)') THEN
    RAISE NOTICE 'Da co 3177 ngan han, bo qua.';
    RETURN;
  END IF;

  INSERT INTO public."RatePrograms" (
    "Kind", "Name", "DocumentNumber", "DocumentDate", "EffectiveFrom", "EffectiveTo",
    "SourceVerified", "ScopeText", "TargetText", "Note"
  ) VALUES (
    'cho_vay_ngan_han',
    'Lãi suất cho vay ngắn hạn dành cho KHCN — quý IV/2026 (3177/2026/TB-TGĐ)',
    '3177/2026/TB-TGĐ (ngắn hạn)', DATE '2026-10-30', DATE '2026-11-02', DATE '2026-12-31',
    true,
    'Sản phẩm: cho vay bổ sung vốn lưu động; cho vay lĩnh vực nông nghiệp, nông thôn; cho vay nuôi tôm dành cho KHCN; cho vay Phát triển kinh tế gia đình.',
    'Tất cả KHCN thuộc khai thác của Khối Bán lẻ.',
    'Điều kiện: KH phát sinh doanh thu phí tối thiểu 2,0% trên số tiền giải ngân hoặc theo thông báo của Khối Bán lẻ từng thời kỳ. '
    || 'LSCV cố định suốt thời gian vay; COF theo biểu công bố Vietbank từng thời kỳ; miễn phí trả nợ trước hạn. '
    || 'Lãi suất và biên độ là mức tối thiểu; sau thời gian hiệu lực áp dụng biểu LSCV thông thường theo QĐ 3828/2024/QĐ-TGĐ ngày 31/12/2024.'
  ) RETURNING "Id" INTO pid;

  INSERT INTO public."RateProgramTiers"
    ("ProgramId", "PackageCode", "Label", "FixedMonths", "MinTenorMonths", "MinFeeRatio", "RateAnnual", "SortOrder")
  VALUES
    (pid, 'LC1', 'Nhận nợ tối đa 05 tháng',        5,  NULL, 0.0200, 0.0990, 1),
    (pid, 'LC2', 'Nhận nợ trên 05 đến 06 tháng',   6,  6,    0.0200, 0.1060, 2),
    (pid, 'LC3', 'Nhận nợ trên 06 đến 09 tháng',   9,  7,    0.0200, 0.1090, 3),
    (pid, 'LC4', 'Nhận nợ trên 09 đến 12 tháng',   12, 10,   0.0200, 0.1180, 4);

  INSERT INTO public."RateProgramPrepaymentFees" ("ProgramId", "YearFrom", "YearTo", "FeeRatio", "Note")
  VALUES (pid, 1, NULL, 0.0000, 'Miễn phí trả nợ trước hạn.');

  INSERT INTO public."RateProgramFbeCodes"
    ("ProgramId", "Scope", "Applies", "RateIdCode", "Description", "RateIdValue", "SortOrder")
  VALUES
    (pid, 'co_dinh_suot_thoi_gian_vay', 'LC1 — nhận nợ tối đa 05 tháng',      '19265', 'NH_LC1_LSCVQUYIV2026', '9.9% (fix)',  1),
    (pid, 'co_dinh_suot_thoi_gian_vay', 'LC2 — nhận nợ trên 05 đến 06 tháng', '19266', 'NH_LC2_LSCVQUYIV2026', '10.6% (fix)', 2),
    (pid, 'co_dinh_suot_thoi_gian_vay', 'LC3 — nhận nợ trên 06 đến 09 tháng', '19267', 'NH_LC3_LSCVQUYIV2026', '10.9% (fix)', 3),
    (pid, 'co_dinh_suot_thoi_gian_vay', 'LC4 — nhận nợ trên 09 đến 12 tháng', '19268', 'NH_LC4_LSCVQUYIV2026', '11.8% (fix)', 4);

  INSERT INTO public."RateProgramConditions" ("ProgramId", "Heading", "Content", "SortOrder")
  VALUES
    (pid, 'Doanh thu phí', 'KH phát sinh doanh thu phí tối thiểu 2,0% trên số tiền giải ngân hoặc theo thông báo của Khối Bán lẻ từng thời kỳ. Phí phát sinh trước giải ngân, tính từ ngày phê duyệt HĐTD lần này (không gồm phí trả nợ trước hạn); phí của KH hoặc vợ/chồng KH; đã ghi nhận cho Giấy nhận nợ này thì không ghi nhận cho Giấy nhận nợ khác.', 1),
    (pid, 'Nông nghiệp, nông thôn', 'Sản phẩm cho vay lĩnh vực nông nghiệp, nông thôn: LSCV tối thiểu thấp hơn 0,5% so với mức của từng lựa chọn.', 2);
END $$;

DO $$
DECLARE
  pid integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public."RatePrograms" WHERE "DocumentNumber" = '3177/2026/TB-TGĐ (trung dài hạn)') THEN
    RAISE NOTICE 'Da co 3177 trung dai han, bo qua.';
    RETURN;
  END IF;

  INSERT INTO public."RatePrograms" (
    "Kind", "Name", "DocumentNumber", "DocumentDate", "EffectiveFrom", "EffectiveTo",
    "FloatingBaseLabel", "FloatingSpreadAnnual", "RateResetMonths",
    "SourceVerified", "ScopeText", "TargetText", "Note"
  ) VALUES (
    'cho_vay_trung_dai_han',
    'Lãi suất cho vay trung dài hạn dành cho KHCN — quý IV/2026 (3177/2026/TB-TGĐ)',
    '3177/2026/TB-TGĐ (trung dài hạn)', DATE '2026-10-30', DATE '2026-11-02', DATE '2026-12-31',
    'LSCS kỳ hạn > 12 tháng', 0.0375, 3,
    true,
    'Sản phẩm: An Cư Thịnh Vượng; mua/nhận chuyển nhượng nhà dự án; SXKD trung dài hạn; An Gia Phát Lộc; An Tâm Tiêu Dùng; nông nghiệp, nông thôn; mua xe ô tô KHCN; trả nợ trước hạn khoản vay KHCN tại TCTD; Top-up KHCN hiện hữu; nuôi tôm; Phát triển kinh tế gia đình; tiêu dùng nhanh KHCN.',
    'Tất cả KHCN thuộc khai thác của Khối Bán lẻ.',
    'Điều kiện: KH phát sinh doanh thu phí tối thiểu 2,0% trên số tiền giải ngân hoặc theo thông báo của Khối Bán lẻ từng thời kỳ. '
    || 'Sau thời gian cố định: LSCS kỳ hạn > 12 tháng + 3,75%, điều chỉnh 03 tháng/lần; COF theo biểu công bố Vietbank từng thời kỳ. '
    || 'Lãi suất và biên độ là mức tối thiểu; sau thời gian hiệu lực áp dụng biểu LSCV thông thường theo QĐ 3828/2024/QĐ-TGĐ ngày 31/12/2024.'
  ) RETURNING "Id" INTO pid;

  INSERT INTO public."RateProgramTiers"
    ("ProgramId", "PackageCode", "Label", "FixedMonths", "MinFeeRatio", "RateAnnual", "SortOrder")
  VALUES
    (pid, 'LC1', 'Cố định 06 tháng đầu', 6,  0.0200, 0.1190, 1),
    (pid, 'LC2', 'Cố định 12 tháng đầu', 12, 0.0200, 0.1220, 2);

  INSERT INTO public."RateProgramPrepaymentFees" ("ProgramId", "YearFrom", "YearTo", "FeeRatio", "Note")
  VALUES
    (pid, 1, 1, 0.0300, NULL),
    (pid, 2, 2, 0.0200, NULL),
    (pid, 3, 4, 0.0100, NULL),
    (pid, 5, 5, 0.0050, NULL),
    (pid, 6, NULL, 0.0000, 'Tính trên số tiền trả nợ trước hạn. Miễn phí nếu trả trong vòng 30 ngày trước ngày đến hạn GNN.');

  INSERT INTO public."RateProgramFbeCodes"
    ("ProgramId", "Scope", "Applies", "RateIdCode", "Description", "RateIdValue", "SortOrder")
  VALUES
    (pid, 'co_dinh_ky_dau', 'LC1 — 06 tháng đầu',          '19269', 'TDH_LC1_LSCVQUYIV2026_1', '11.9% (fix)',           1),
    (pid, 'co_dinh_ky_dau', 'LC1 — từ tháng thứ 7 trở đi', '19270', 'TDH_LC1_LSCVQUYIV2026_2', 'LSCS + 3.75% (floating)', 2),
    (pid, 'co_dinh_ky_dau', 'LC2 — 12 tháng đầu',          '19271', 'TDH_LC2_LSCVQUYIV2026_1', '12.2% (fix)',           3),
    (pid, 'co_dinh_ky_dau', 'LC2 — từ tháng thứ 13 trở đi', '19272', 'TDH_LC2_LSCVQUYIV2026_2', 'LSCS + 3.75% (floating)', 4);

  INSERT INTO public."RateProgramConditions" ("ProgramId", "Heading", "Content", "SortOrder")
  VALUES
    (pid, 'Doanh thu phí', 'KH phát sinh doanh thu phí tối thiểu 2,0% trên số tiền giải ngân hoặc theo thông báo của Khối Bán lẻ từng thời kỳ. Phí phát sinh trước giải ngân, tính từ ngày phê duyệt HĐTD lần này (không gồm phí trả nợ trước hạn); phí của KH hoặc vợ/chồng KH; đã ghi nhận cho Giấy nhận nợ này thì không ghi nhận cho Giấy nhận nợ khác.', 1),
    (pid, 'Nông nghiệp, nông thôn', 'Sản phẩm cho vay lĩnh vực nông nghiệp, nông thôn: LSCV tối thiểu thấp hơn 0,5% so với mức của từng lựa chọn.', 2);
END $$;

COMMIT;
