-- Chương trình ưu đãi lãi suất huy động "Tuần lễ vàng" — kỳ 01/10 → 23/10/2026.
-- Nguồn: Thông báo số 2848-8/2026/TB-BĐH ngày 28/09/2026, Vietbank,
-- Tiêu đề: Gia hạn chương trình ưu đãi lãi suất huy động Tuần lễ vàng dành cho khách hàng cá nhân.
-- ĐÃ ĐỐI CHIẾU BẢN GỐC nên SourceVerified = true.
--
-- Điểm khác Thông báo 2605/2026/TB-BĐH:
-- 1. Bậc tại quầy phân theo Quy mô KH (6 bậc: <200tr, 200–500tr, 500tr–2 tỷ, 2–3 tỷ, 3–8 tỷ, ≥8 tỷ).
-- 2. Kỳ hạn 06, 07, 09 và 12 tháng (thêm 09 tháng); chỉ công bố lãi cuối kỳ, các hình thức lãnh lãi khác quy đổi tương ứng.
-- 3. Kênh online đồng loạt 8,95%/năm cho cả 4 kỳ hạn, không chia giai đoạn.
-- 4. Giá bán vốn nội bộ VOF (FTP mua) có thêm kỳ hạn 09 tháng.

BEGIN;

DO $$
DECLARE
  pid integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public."RatePrograms" WHERE "DocumentNumber" = '2848-8/2026/TB-BĐH') THEN
    RAISE NOTICE 'Da co 2848-8/2026/TB-BDH, bo qua.';
    RETURN;
  END IF;

  INSERT INTO public."RatePrograms" (
    "Kind", "Name", "DocumentNumber", "DocumentDate", "EffectiveFrom", "EffectiveTo",
    "SourceVerified", "ScopeText", "TargetText", "Note"
  ) VALUES (
    'huy_dong',
    'Tuần lễ vàng huy động — gia hạn ưu đãi lãi suất tiền gửi KHCN (kỳ 01/10–23/10/2026)',
    '2848-8/2026/TB-BĐH', DATE '2026-09-28', DATE '2026-10-01', DATE '2026-10-23',
    true,
    'Tất cả Trung tâm kinh doanh (TTKD) của Vietbank trên toàn quốc.',
    'Khách hàng cá nhân (KHCN).',
    'Sản phẩm áp dụng: Tiết kiệm truyền thống, Tiết kiệm quyền chọn, Tiền gửi/ hợp đồng tiền gửi có kỳ hạn, Tiết kiệm Phát lộc, Tiền gửi Online có kỳ hạn. '
    'Thời gian áp dụng: Từ ngày 01/10/2026 đến hết ngày 23/10/2026. '
    'Điều kiện: KH hiện hữu tái tục, KH hiện hữu gửi mới và KH mới gửi tài khoản tiết kiệm trong thời gian chương trình. '
    'Kỳ hạn 06, 07, 09 và 12 tháng. '
    'Lãi suất là lãi cuối kỳ; các hình thức lãnh lãi hàng tháng, hàng quý, trả trước quy đổi tương ứng. '
    'Mức lãi suất phân quyền là mức tối đa, TTKD được áp dụng mức thấp hơn. '
    'Quy mô KH gồm số dư tiền gửi có kỳ hạn và chứng chỉ tiền gửi hiện hữu, phát sinh mới của KH và nhóm KH liên quan. '
    'Không áp dụng đồng thời với chương trình ưu đãi/khuyến mãi lãi suất khác (trừ ưu đãi Thanh toán quốc tế theo TB 2383/2026/TB-BĐH). '
    'Không áp dụng với KH danh mục đặc thù (KH chiến lược, Legacy, KH loại trừ khác). '
    'Gắn UDF "Tuần lễ vàng huy động" khi mở tài khoản.'
  ) RETURNING "Id" INTO pid;

  INSERT INTO public."RateProgramTiers"
    ("ProgramId", "Label", "Channel", "BalanceTierLabel", "PayoutMode", "TenorMonths", "RateAnnual", "SortOrder")
  VALUES
    -- Bậc 1: Quy mô KH < 200 triệu đồng
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH < 200 triệu đồng', 'cuoi_ky', 6, 0.0900, 1),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH < 200 triệu đồng', 'cuoi_ky', 7, 0.0900, 2),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH < 200 triệu đồng', 'cuoi_ky', 9, 0.0880, 3),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH < 200 triệu đồng', 'cuoi_ky', 12, 0.0880, 4),
    -- Bậc 2: 200 triệu đồng ≤ Quy mô KH < 500 triệu đồng
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '200 triệu đồng ≤ Quy mô KH < 500 triệu đồng', 'cuoi_ky', 6, 0.0910, 5),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '200 triệu đồng ≤ Quy mô KH < 500 triệu đồng', 'cuoi_ky', 7, 0.0910, 6),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', '200 triệu đồng ≤ Quy mô KH < 500 triệu đồng', 'cuoi_ky', 9, 0.0880, 7),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '200 triệu đồng ≤ Quy mô KH < 500 triệu đồng', 'cuoi_ky', 12, 0.0880, 8),
    -- Bậc 3: 500 triệu đồng ≤ Quy mô KH < 2 tỷ đồng
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '500 triệu đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 6, 0.0920, 9),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '500 triệu đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 7, 0.0920, 10),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', '500 triệu đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 9, 0.0890, 11),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '500 triệu đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 12, 0.0890, 12),
    -- Bậc 4: 2 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '2 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'cuoi_ky', 6, 0.0930, 13),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '2 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'cuoi_ky', 7, 0.0930, 14),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', '2 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'cuoi_ky', 9, 0.0900, 15),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '2 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'cuoi_ky', 12, 0.0900, 16),
    -- Bậc 5: 3 tỷ đồng ≤ Quy mô KH < 8 tỷ đồng
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Quy mô KH < 8 tỷ đồng', 'cuoi_ky', 6, 0.0940, 17),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Quy mô KH < 8 tỷ đồng', 'cuoi_ky', 7, 0.0940, 18),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Quy mô KH < 8 tỷ đồng', 'cuoi_ky', 9, 0.0910, 19),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Quy mô KH < 8 tỷ đồng', 'cuoi_ky', 12, 0.0910, 20),
    -- Bậc 6: Quy mô KH ≥ 8 tỷ đồng
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH ≥ 8 tỷ đồng', 'cuoi_ky', 6, 0.0950, 21),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH ≥ 8 tỷ đồng', 'cuoi_ky', 7, 0.0950, 22),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH ≥ 8 tỷ đồng', 'cuoi_ky', 9, 0.0920, 23),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH ≥ 8 tỷ đồng', 'cuoi_ky', 12, 0.0920, 24),
    -- Kênh online
    (pid, 'Online — 06 tháng', 'online', NULL, 'cuoi_ky', 6, 0.0895, 25),
    (pid, 'Online — 07 tháng', 'online', NULL, 'cuoi_ky', 7, 0.0895, 26),
    (pid, 'Online — 09 tháng', 'online', NULL, 'cuoi_ky', 9, 0.0895, 27),
    (pid, 'Online — 12 tháng', 'online', NULL, 'cuoi_ky', 12, 0.0895, 28),
    -- Giá bán vốn nội bộ VOF (FTP mua)
    (pid, 'FTP mua (VOF) — 06 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 6, 0.0960, 29),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 6, 0.0949, 30),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 6, 0.0941, 31),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 6, 0.0916, 32),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 7, 0.0960, 33),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 7, 0.0945, 34),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 7, 0.0938, 35),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 7, 0.0909, 36),
    (pid, 'FTP mua (VOF) — 09 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 9, 0.0940, 37),
    (pid, 'FTP mua (VOF) — 09 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 9, 0.0919, 38),
    (pid, 'FTP mua (VOF) — 09 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 9, 0.0912, 39),
    (pid, 'FTP mua (VOF) — 09 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 9, 0.0878, 40),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 12, 0.0940, 41),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 12, 0.0909, 42),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 12, 0.0902, 43),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 12, 0.0859, 44);

END $$;

COMMIT;
