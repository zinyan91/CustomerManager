-- Chương trình ưu đãi lãi suất huy động "Tuần lễ vàng" dành cho KHCN.
-- Nguồn: Thông báo số 2400/2026/TB-BĐH ngày 06/08/2026, Vietbank,
-- ký TUQ. Phó Tổng Giám đốc PT Điều hành — Giám đốc Khối Bán lẻ Võ Duy Anh Dũng.
-- ĐÃ ĐỐI CHIẾU BẢN GỐC (bản quét 7 trang) nên SourceVerified = true.
--
-- Chương trình trước là 2279/2026/TB-BĐH ngày 23/07/2026 (migration 09 gieo với
-- số hiệu tạm TAM-HD-2279, migration 13 đổi tên và đặt SourceVerified = true).
-- Nó khai hiệu lực tới 07/08/2026, chồng lấn hai ngày với chương trình mới bắt
-- đầu 06/08/2026 — đóng lại ở 05/08/2026 để không ngày nào có hai chương trình
-- huy động cùng hiệu lực. Lệnh dưới bắt CẢ HAI số hiệu vì không chắc migration
-- 13 đã chạy trên cơ sở dữ liệu này chưa.
--
-- Lãi suất lưu dạng thập phân: 0.0895 = 8,95%/năm.

BEGIN;

-- 1. Đóng bản tạm trước ngày chương trình mới có hiệu lực.
UPDATE public."RatePrograms"
SET "EffectiveTo" = DATE '2026-08-05',
    "Note" = coalesce("Note", '') ||
      ' [Đóng 07/08/2026: thay bằng Thông báo 2400/2026/TB-BĐH đã có bản gốc.]'
WHERE "DocumentNumber" IN ('TAM-HD-2279/2026/TB-BĐH', '2279/2026/TB-BĐH')
  AND ("EffectiveTo" IS NULL OR "EffectiveTo" > DATE '2026-08-05');

-- 2. Nạp chương trình mới. Chạy lại nhiều lần không sinh trùng.
DO $$
DECLARE
  pid integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public."RatePrograms" WHERE "DocumentNumber" = '2400/2026/TB-BĐH') THEN
    RAISE NOTICE 'Da co 2400/2026/TB-BDH, bo qua.';
    RETURN;
  END IF;

  INSERT INTO public."RatePrograms" (
    "Kind", "Name", "DocumentNumber", "DocumentDate", "EffectiveFrom", "EffectiveTo",
    "SourceVerified", "ScopeText", "Note"
  ) VALUES (
    'huy_dong',
    'Tuần lễ vàng huy động — ưu đãi lãi suất tiền gửi KHCN',
    '2400/2026/TB-BĐH', DATE '2026-08-06', DATE '2026-08-06', DATE '2026-08-15',
    true,
    'Tất cả Trung tâm kinh doanh (TTKD) của Vietbank trên toàn quốc. Đối tượng: khách hàng cá nhân.',
    'Sản phẩm áp dụng: Tiết kiệm truyền thống, Tiết kiệm quyền chọn, Tiền gửi/hợp đồng tiền gửi có kỳ hạn, Tiết kiệm Phát lộc, Tiền gửi Online có kỳ hạn. '
    'Điều kiện: KHCN gửi tài khoản tiết kiệm trong thời gian chương trình — KH hiện hữu tái tục, KH hiện hữu gửi mới, KH mới. '
    'Kỳ hạn 06, 07 và 12 tháng (và các kỳ hạn ngày tương ứng). '
    'Mức lãi suất phân quyền là mức TỐI ĐA, TTKD được áp dụng mức thấp hơn. '
    'Lãi suất kênh online tự động cập nhật trên App Vietbank Digital từ 07/08/2026. '
    'Gắn UDF "Tuần lễ vàng huy động" khi mở tài khoản. '
    'Không áp dụng đồng thời với chương trình ưu đãi/khuyến mãi khác; không áp dụng cho KH thuộc danh mục đặc thù (KH chiến lược, Legacy). '
    'Vượt mức lãi suất chương trình thì TTKD trình Phó Tổng giám đốc phụ trách điều hành phê duyệt.'
  ) RETURNING "Id" INTO pid;

  -- Lãi suất tại quầy, kênh online và FTP mua (VOF).
  -- Thẩm quyền phê duyệt: Giám đốc / Phó Giám đốc phụ trách / Phó Giám đốc TTKD.
  -- Kỳ hạn 07 tháng không có phương án lãi hàng quý (văn bản để dấu "–").
  INSERT INTO public."RateProgramTiers"
    ("ProgramId", "Label", "Channel", "BalanceTierLabel", "PayoutMode", "TenorMonths", "RateAnnual", "SortOrder")
  VALUES
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', 'Số dư < 200 triệu đồng', 'cuoi_ky', 6, 0.0895, 1),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', 'Số dư < 200 triệu đồng', 'hang_thang', 6, 0.0884, 2),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', 'Số dư < 200 triệu đồng', 'hang_quy', 6, 0.0890, 3),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', 'Số dư < 200 triệu đồng', 'tra_truoc', 6, 0.0861, 4),
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'cuoi_ky', 6, 0.0895, 5),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_thang', 6, 0.0893, 6),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_quy', 6, 0.0895, 7),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'tra_truoc', 6, 0.0870, 8),
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 6, 0.0895, 9),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_thang', 6, 0.0895, 10),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_quy', 6, 0.0895, 11),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'tra_truoc', 6, 0.0879, 12),
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'cuoi_ky', 6, 0.0895, 13),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_thang', 6, 0.0895, 14),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_quy', 6, 0.0895, 15),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'tra_truoc', 6, 0.0888, 16),
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', 'Số dư ≥ 8 tỷ đồng', 'cuoi_ky', 6, 0.0895, 17),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_thang', 6, 0.0895, 18),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_quy', 6, 0.0895, 19),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', 'Số dư ≥ 8 tỷ đồng', 'tra_truoc', 6, 0.0897, 20),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', 'Số dư < 200 triệu đồng', 'cuoi_ky', 7, 0.0895, 21),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', 'Số dư < 200 triệu đồng', 'hang_thang', 7, 0.0880, 22),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', 'Số dư < 200 triệu đồng', 'tra_truoc', 7, 0.0855, 23),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'cuoi_ky', 7, 0.0895, 24),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_thang', 7, 0.0890, 25),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'tra_truoc', 7, 0.0864, 26),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 7, 0.0895, 27),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_thang', 7, 0.0895, 28),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'tra_truoc', 7, 0.0873, 29),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'cuoi_ky', 7, 0.0895, 30),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_thang', 7, 0.0895, 31),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'tra_truoc', 7, 0.0882, 32),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', 'Số dư ≥ 8 tỷ đồng', 'cuoi_ky', 7, 0.0895, 33),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_thang', 7, 0.0895, 34),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', 'Số dư ≥ 8 tỷ đồng', 'tra_truoc', 7, 0.0891, 35),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', 'Số dư < 200 triệu đồng', 'cuoi_ky', 12, 0.0895, 36),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', 'Số dư < 200 triệu đồng', 'hang_thang', 12, 0.0865, 37),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', 'Số dư < 200 triệu đồng', 'hang_quy', 12, 0.0871, 38),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', 'Số dư < 200 triệu đồng', 'tra_truoc', 12, 0.0825, 39),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'cuoi_ky', 12, 0.0895, 40),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_thang', 12, 0.0874, 41),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_quy', 12, 0.0880, 42),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'tra_truoc', 12, 0.0834, 43),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 12, 0.0895, 44),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_thang', 12, 0.0883, 45),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_quy', 12, 0.0890, 46),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'tra_truoc', 12, 0.0842, 47),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'cuoi_ky', 12, 0.0895, 48),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_thang', 12, 0.0893, 49),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_quy', 12, 0.0895, 50),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'tra_truoc', 12, 0.0850, 51),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', 'Số dư ≥ 8 tỷ đồng', 'cuoi_ky', 12, 0.0895, 52),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_thang', 12, 0.0895, 53),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_quy', 12, 0.0895, 54),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', 'Số dư ≥ 8 tỷ đồng', 'tra_truoc', 12, 0.0859, 55),
    (pid, 'Online — 06 tháng', 'online', NULL, 'cuoi_ky', 6, 0.0895, 56),
    (pid, 'Online — 07 tháng', 'online', NULL, 'cuoi_ky', 7, 0.0895, 57),
    (pid, 'Online — 12 tháng', 'online', NULL, 'cuoi_ky', 12, 0.0895, 58),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 6, 0.0950, 59),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 6, 0.0939, 60),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 6, 0.0932, 61),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 6, 0.0916, 62),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 7, 0.0950, 63),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 7, 0.0935, 64),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 7, 0.0928, 65),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 7, 0.0910, 66),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 12, 0.0950, 67),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 12, 0.0918, 68),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 12, 0.0911, 69),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 12, 0.0877, 70);

  -- Mức phân quyền cao hơn: Trưởng bộ phận huy động và dịch vụ.
  -- Chỉ áp cho lãi cuối kỳ, chung cho cả ba kỳ hạn 06/07/12 tháng.
  INSERT INTO public."DepositRateAuthorities"
    ("ProgramId", "TenorLabel", "AuthorityLevel", "CurrentRate", "AdjustedRate", "SortOrder")
  VALUES
    (pid, 'Số dư < 200 triệu đồng — 06/07/12 tháng, lãi cuối kỳ', 'Trưởng bộ phận huy động và dịch vụ — Phòng Sản phẩm — Khối Bán lẻ', NULL, 0.0900, 1),
    (pid, '200 triệu ≤ Số dư < 500 triệu đồng — 06/07/12 tháng, lãi cuối kỳ', 'Trưởng bộ phận huy động và dịch vụ — Phòng Sản phẩm — Khối Bán lẻ', NULL, 0.0910, 2),
    (pid, '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng — 06/07/12 tháng, lãi cuối kỳ', 'Trưởng bộ phận huy động và dịch vụ — Phòng Sản phẩm — Khối Bán lẻ', NULL, 0.0920, 3),
    (pid, '1 tỷ đồng ≤ Số dư < 8 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng — 06/07/12 tháng, lãi cuối kỳ', 'Trưởng bộ phận huy động và dịch vụ — Phòng Sản phẩm — Khối Bán lẻ', NULL, 0.0930, 4),
    (pid, 'Số dư ≥ 8 tỷ đồng — 06/07/12 tháng, lãi cuối kỳ', 'Trưởng bộ phận huy động và dịch vụ — Phòng Sản phẩm — Khối Bán lẻ', NULL, 0.0940, 5);
END $$;

COMMIT;


-- 3. Đối chiếu sau khi chạy.
--    Kỳ vọng: 70 dòng lãi suất (55 quầy + 3 online + 12 FTP), 5 dòng phân quyền,
--    và không có hai chương trình huy động nào cùng hiệu lực ngày 06/08/2026.

SELECT
  p."DocumentNumber"                                        AS so_van_ban,
  p."EffectiveFrom"                                         AS hieu_luc_tu,
  p."EffectiveTo"                                           AS hieu_luc_den,
  p."SourceVerified"                                        AS da_doi_chieu,
  count(*) FILTER (WHERE t."Channel" = 'quay')              AS dong_quay,
  count(*) FILTER (WHERE t."Channel" = 'online')            AS dong_online,
  count(*) FILTER (WHERE t."Channel" = 'ftp')               AS dong_ftp,
  (SELECT count(*) FROM public."DepositRateAuthorities" a WHERE a."ProgramId" = p."Id") AS dong_phan_quyen
FROM public."RatePrograms" p
LEFT JOIN public."RateProgramTiers" t ON t."ProgramId" = p."Id"
WHERE p."Kind" = 'huy_dong'
GROUP BY p."Id", p."DocumentNumber", p."EffectiveFrom", p."EffectiveTo", p."SourceVerified"
ORDER BY p."EffectiveFrom";

SELECT count(*) AS so_chuong_trinh_chong_lan
FROM public."RatePrograms"
WHERE "Kind" = 'huy_dong'
  AND "EffectiveFrom" <= DATE '2026-08-06'
  AND ("EffectiveTo" IS NULL OR "EffectiveTo" >= DATE '2026-08-06');
