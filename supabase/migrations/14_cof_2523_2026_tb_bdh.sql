-- Migration 14: Cập nhật Lãi suất mua bán vốn nội bộ theo Thông báo số 2523/2026/TB-BĐH ngày 18/08/2026 (hiệu lực 21/08/2026)
-- Thay thế Thông báo 2294/2026/TB-BĐH ngày 27/07/2026

DO $$
DECLARE
  pid integer;
  old_pid integer;
BEGIN
  -- 1. Cập nhật ngày hết hiệu lực của thông báo cũ 2294/2026/TB-BĐH
  UPDATE public."CofPrograms"
     SET "EffectiveTo" = '2026-08-20'
   WHERE "DocumentNumber" = '2294/2026/TB-BĐH';

  -- 2. Kiểm tra nếu thông báo 2523 đã tồn tại thì không thêm lại
  SELECT "Id" INTO pid FROM public."CofPrograms"
   WHERE "DocumentNumber" = '2523/2026/TB-BĐH' LIMIT 1;

  IF pid IS NOT NULL THEN
    RETURN;
  END IF;

  -- 3. Tạo bản ghi thông báo mới 2523/2026/TB-BĐH
  INSERT INTO public."CofPrograms"
    ("Name", "DocumentNumber", "DocumentDate", "EffectiveFrom", "EffectiveTo",
     "ReplacesDocument", "SourceVerified", "Note")
  VALUES (
    'Lãi suất mua bán vốn nội bộ — Phụ lục B: Giá mua vốn từ Hội Sở (FTP bán - COF)',
    '2523/2026/TB-BĐH', '2026-08-18', '2026-08-21', NULL,
    '2294/2026/TB-BĐH ngày 27/07/2026', true,
    'Áp dụng cho: Các khoản huy động mới hoặc tái tục; Các khoản cho vay mới hoặc đến kỳ điều chỉnh lãi suất; '
    || 'Các khoản cho vay hỗ trợ nhà ở xã hội gói 30.000 tỷ của NHNN (bao gồm cho vay mới và các khoản vay hiện hữu). '
    || 'Các khoản tiền gửi và khoản vay phát sinh trước 21/08/2026 mà chưa đến kỳ điều chỉnh lãi suất vẫn áp dụng giá theo văn bản trước đó. '
    || 'Kỳ điều chỉnh lãi suất 6M, 9M, 12M và 24M chỉ áp dụng với khoản vay giải ngân TRƯỚC thời điểm thông báo có hiệu lực. '
    || 'Nhập liệu sai để hưởng COF thấp hơn sẽ bị Hội sở rà soát định kỳ và áp COF chế tài cao nhất.'
  ) RETURNING "Id" INTO pid;

  -- 4. Bảng I. Cho vay VND thông thường (dư nợ nhóm 1 và nhóm 2)
  INSERT INTO public."CofStandardRates"
    ("ProgramId", "Section", "TenorLabel", "FixedRate", "Reset3M", "Reset6M", "Reset9M", "Reset12M", "Reset24M", "Reset36M", "SortOrder")
  VALUES
    (pid, 'vnd_thong_thuong', 'Dưới 1 tuần',            0.0830, NULL,   NULL,   NULL,   NULL,   NULL,   NULL,    1),
    (pid, 'vnd_thong_thuong', '1 tuần',                 0.0830, NULL,   NULL,   NULL,   NULL,   NULL,   NULL,    2),
    (pid, 'vnd_thong_thuong', '2 tuần',                 0.0830, NULL,   NULL,   NULL,   NULL,   NULL,   NULL,    3),
    (pid, 'vnd_thong_thuong', '3 tuần',                 0.0830, NULL,   NULL,   NULL,   NULL,   NULL,   NULL,    4),
    (pid, 'vnd_thong_thuong', '1 tháng',                0.0830, NULL,   NULL,   NULL,   NULL,   NULL,   NULL,    5),
    (pid, 'vnd_thong_thuong', '2 tháng',                0.0830, NULL,   NULL,   NULL,   NULL,   NULL,   NULL,    6),
    (pid, 'vnd_thong_thuong', '3 tháng',                0.0830, 0.0830, NULL,   NULL,   NULL,   NULL,   NULL,    7),
    (pid, 'vnd_thong_thuong', '4 tháng',                0.0830, 0.0830, NULL,   NULL,   NULL,   NULL,   NULL,    8),
    (pid, 'vnd_thong_thuong', '5 tháng',                0.0870, 0.0870, NULL,   NULL,   NULL,   NULL,   NULL,    9),
    (pid, 'vnd_thong_thuong', '6 tháng',                0.0940, 0.0920, 0.0940, NULL,   NULL,   NULL,   NULL,   10),
    (pid, 'vnd_thong_thuong', '7 tháng',                0.0965, 0.0930, 0.0950, NULL,   NULL,   NULL,   NULL,   11),
    (pid, 'vnd_thong_thuong', '8 tháng',                0.0965, 0.0930, 0.0950, NULL,   NULL,   NULL,   NULL,   12),
    (pid, 'vnd_thong_thuong', '9 tháng',                0.0965, 0.0935, 0.0955, 0.0965, NULL,   NULL,   NULL,   13),
    (pid, 'vnd_thong_thuong', '10 tháng',               0.1055, 0.0950, 0.0970, 0.0980, NULL,   NULL,   NULL,   14),
    (pid, 'vnd_thong_thuong', '11 tháng',               0.1055, 0.0965, 0.0985, 0.0995, NULL,   NULL,   NULL,   15),
    (pid, 'vnd_thong_thuong', '12 tháng',               0.1055, 0.1005, 0.1025, 0.1035, 0.1055, NULL,   NULL,   16),
    (pid, 'vnd_thong_thuong', '> 12 tháng và ≤ 60 tháng',  0.1210, 0.1030, 0.1050, 0.1060, 0.1080, 0.1210, 0.1210, 17),
    (pid, 'vnd_thong_thuong', '> 60 tháng và ≤ 180 tháng', 0.1230, 0.1050, 0.1070, 0.1080, 0.1100, 0.1230, 0.1230, 18),
    (pid, 'vnd_thong_thuong', '> 180 tháng',               0.1250, 0.1070, 0.1090, 0.1100, 0.1120, 0.1250, 0.1250, 19);

  -- 5. Bảng III. Sản phẩm đặc thù & Các mục COF phụ
  INSERT INTO public."CofRateItems"
    ("ProgramId", "Section", "GroupLabel", "Label", "RateAnnual", "Formula", "Note", "SortOrder")
  VALUES
    (pid, 'cam_co_stk_vnd', 'Cho vay VND đảm bảo bằng sổ tiết kiệm / hợp đồng tiền gửi VND của Vietbank', 'Dưới 1 tuần',      0.0830, NULL, NULL,  1),
    (pid, 'cam_co_stk_vnd', NULL, '1 tuần đến 3 tuần', 0.0830, NULL, NULL,  2),
    (pid, 'cam_co_stk_vnd', NULL, '1 tháng',           0.0830, NULL, NULL,  3),
    (pid, 'cam_co_stk_vnd', NULL, '2 tháng',           0.0830, NULL, NULL,  4),
    (pid, 'cam_co_stk_vnd', NULL, '3 tháng',           0.0830, NULL, NULL,  5),
    (pid, 'cam_co_stk_vnd', NULL, '4 tháng',           0.0830, NULL, NULL,  6),
    (pid, 'cam_co_stk_vnd', NULL, '5 tháng',           0.0870, NULL, NULL,  7),
    (pid, 'cam_co_stk_vnd', NULL, '6 tháng',           0.0940, NULL, NULL,  8),
    (pid, 'cam_co_stk_vnd', NULL, '7 tháng',           0.0965, NULL, NULL,  9),
    (pid, 'cam_co_stk_vnd', NULL, '8 tháng',           0.0965, NULL, NULL, 10),
    (pid, 'cam_co_stk_vnd', NULL, '9 tháng',           0.0965, NULL, NULL, 11),
    (pid, 'cam_co_stk_vnd', NULL, '10 tháng',          0.1055, NULL, NULL, 12),
    (pid, 'cam_co_stk_vnd', NULL, '11 tháng',          0.1055, NULL, NULL, 13),
    (pid, 'cam_co_stk_vnd', NULL, '12 tháng',          0.1055, NULL, NULL, 14),
    (pid, 'cam_co_stk_vnd', NULL, '13 tháng',          0.1210, NULL, NULL, 15),
    (pid, 'cam_co_stk_vnd', NULL, '14 tháng',          0.1210, NULL, NULL, 16),
    (pid, 'cam_co_stk_vnd', NULL, '15 tháng',          0.1210, NULL, NULL, 17),
    (pid, 'cam_co_stk_vnd', NULL, '16 tháng',          0.1210, NULL, NULL, 18),
    (pid, 'cam_co_stk_vnd', NULL, '17 tháng',          0.1210, NULL, NULL, 19),
    (pid, 'cam_co_stk_vnd', NULL, '18 tháng',          0.1210, NULL, NULL, 20),
    (pid, 'cam_co_stk_vnd', NULL, '19 tháng',          0.1210, NULL, NULL, 21),
    (pid, 'cam_co_stk_vnd', NULL, '20 tháng',          0.1210, NULL, NULL, 22),
    (pid, 'cam_co_stk_vnd', NULL, '21 tháng',          0.1210, NULL, NULL, 23),
    (pid, 'cam_co_stk_vnd', NULL, '22 tháng',          0.1210, NULL, NULL, 24),
    (pid, 'cam_co_stk_vnd', NULL, '23 tháng',          0.1210, NULL, NULL, 25),
    (pid, 'cam_co_stk_vnd', NULL, '24 tháng',          0.1210, NULL, NULL, 26),
    (pid, 'cam_co_stk_vnd', NULL, '36 tháng',          0.1210, NULL, NULL, 27),

    (pid, 'san_pham_dac_thu', 'Cho vay cầm cố sổ Vietbank cùng loại tiền (sổ tiền gửi đặc thù)',
     'Cho vay cầm cố sổ tiết kiệm Tích tài', NULL,
     'FTP bán (COF) = FTP mua (VOF) của sổ tiền gửi đảm bảo cho khoản vay', NULL, 30),
    (pid, 'san_pham_dac_thu', 'Cho vay CBNV Vietbank và người thân CBNV Vietbank',
     'Toàn bộ thời gian vay', NULL, 'Lãi suất cho vay − 0,75%/năm', NULL, 31),
    (pid, 'san_pham_dac_thu', 'Cho vay ngắn hạn VND khách hàng thuộc đối tượng TT 08/2014/TT-NHNN',
     '3 tháng đầu tiên', NULL, 'Lãi suất cho vay − 0,75%/năm', NULL, 32),
    (pid, 'san_pham_dac_thu', NULL, 'Từ tháng thứ 4 trở đi', NULL, 'Theo giá FTP bán thông thường', NULL, 33),
    (pid, 'san_pham_dac_thu', 'Cho vay hỗ trợ nhà ở xã hội (gói 30.000 tỷ của NHNN)',
     'Toàn bộ thời gian vay', 0.0350, NULL, NULL, 34),

    (pid, 'tat_toan_truoc_han', 'Vay trung dài hạn tất toán trước hạn', 'Năm đầu tiên', 0.0150, NULL, NULL, 40),
    (pid, 'tat_toan_truoc_han', NULL, 'Năm thứ 2',         0.0100, NULL, NULL, 41),
    (pid, 'tat_toan_truoc_han', NULL, 'Năm thứ 3',         0.0050, NULL, NULL, 42),
    (pid, 'tat_toan_truoc_han', NULL, 'Năm thứ 4 – 5',     0.0050, NULL, NULL, 43),
    (pid, 'tat_toan_truoc_han', NULL, 'Năm thứ 6 trở đi',  0,      NULL, 'Trong 1 tháng trước khi đáo hạn thì miễn phí.', 44),
    (pid, 'tat_toan_truoc_han', 'Vay góp đều tất toán trước hạn', '3 năm đầu', NULL,
     'Tương tự FTP bán tất toán trước hạn cho vay trung dài hạn', NULL, 45),
    (pid, 'tat_toan_truoc_han', NULL, 'Từ năm thứ 4 trở đi', 0, NULL, NULL, 46),

    (pid, 'no_qua_han', 'Giá COF đối với nợ quá hạn từ nhóm 3 đến nhóm 5 và nợ quá hạn đã bán VAMC',
     'Toàn bộ dư nợ', NULL, 'FTP bán (COF) kỳ hạn tương ứng, kỳ điều chỉnh lãi suất 3M/lần', NULL, 50),

    (pid, 'thanh_khoan', 'Giá COF đối với thanh khoản tiền mặt (VND)',
     'Thanh khoản trong định mức', 0.0081, NULL, NULL, 60),
    (pid, 'thanh_khoan', NULL, 'Ngoài định mức — vượt dưới 50%', 0.0830, NULL, NULL, 61),
    (pid, 'thanh_khoan', NULL, 'Ngoài định mức — vượt từ 50% trở lên', 0.0830, NULL,
     'Tỷ lệ vượt định mức = (Số tiền thanh khoản bình quân tháng − Định mức cho phép) / Định mức cho phép × 100%, đã bao gồm +10% cho phép.', 62);

END $$;
