-- Chương trình ưu đãi lãi suất huy động "Tuần lễ vàng" — kỳ 28/08 → 20/09/2026.
-- Nguồn: Thông báo số 2605/2026/TB-BĐH ngày 27/08/2026, Vietbank,
-- Tiêu đề: Điều chỉnh chương trình ưu đãi lãi suất huy động Tuần lễ vàng dành cho khách hàng cá nhân.
-- ĐÃ ĐỐI CHIẾU BẢN GỐC nên SourceVerified = true.
--
-- Điểm mới của Thông báo 2605/2026/TB-BĐH:
-- 1. Bậc số dư tại quầy: Bậc "1 tỷ ≤ Số dư < 8 tỷ" được tách thành 2 bậc riêng biệt:
--    - "1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng" (lãi cuối kỳ: 6M 9.30%, 7M 9.30%, 12M 9.30%)
--    - "3 tỷ đồng ≤ Số dư < 8 tỷ đồng" (lãi cuối kỳ: 6M 9.40%, 7M 9.40%, 12M 9.30%)
-- 2. Bậc "Số dư ≥ 8 tỷ đồng" tăng lãi cuối kỳ lên 9.50% (6M, 7M) và 9.40% (12M).
-- 3. Kênh Online phân theo 2 giai đoạn:
--    - 28/08 → 05/09/2026: 06 & 07 tháng là 9.20%/năm; 12 tháng là 8.95%/năm.
--    - 06/09 → 20/09/2026: 06, 07 & 12 tháng đồng loạt 8.95%/năm.
-- 4. Giá bán vốn nội bộ VOF (FTP mua) được điều chỉnh tăng cho các kỳ hạn 6, 7, 12 tháng.

BEGIN;

-- 1. Đóng kỳ trước (2500) ngay trước ngày kỳ mới có hiệu lực (27/08/2026).
UPDATE public."RatePrograms"
SET "EffectiveTo" = DATE '2026-08-27',
    "Note" = coalesce("Note", '') ||
      ' [Đóng 27/08/2026: thay bằng Thông báo 2605/2026/TB-BĐH hiệu lực từ 28/08/2026.]'
WHERE "DocumentNumber" = '2500/2026/TB-BĐH';

-- 2. Nạp chương trình mới.
DO $$
DECLARE
  pid integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public."RatePrograms" WHERE "DocumentNumber" = '2605/2026/TB-BĐH') THEN
    RAISE NOTICE 'Da co 2605/2026/TB-BDH, bo qua.';
    RETURN;
  END IF;

  INSERT INTO public."RatePrograms" (
    "Kind", "Name", "DocumentNumber", "DocumentDate", "EffectiveFrom", "EffectiveTo",
    "SourceVerified", "ScopeText", "TargetText", "Note"
  ) VALUES (
    'huy_dong',
    'Tuần lễ vàng huy động — điều chỉnh ưu đãi lãi suất tiền gửi KHCN (kỳ 28/08–20/09/2026)',
    '2605/2026/TB-BĐH', DATE '2026-08-27', DATE '2026-08-28', DATE '2026-09-20',
    true,
    'Tất cả Trung tâm kinh doanh (TTKD) của Vietbank trên toàn quốc.',
    'Khách hàng cá nhân (KHCN).',
    'Sản phẩm áp dụng: Tiết kiệm truyền thống, Tiết kiệm quyền chọn, Tiền gửi/ hợp đồng tiền gửi có kỳ hạn, Tiết kiệm Phát lộc, Tiền gửi Online có kỳ hạn. '
    'Thời gian áp dụng: Từ ngày 28/08/2026 đến hết ngày 20/09/2026. '
    'Điều kiện: KHCN gửi tài khoản tiết kiệm tại quầy và online trong thời gian chương trình. '
    'Kỳ hạn 06, 07 và 12 tháng (và các kỳ hạn ngày tương ứng). '
    'Kèm theo biểu giá bán vốn nội bộ VOF (FTP mua).'
  ) RETURNING "Id" INTO pid;

  INSERT INTO public."RateProgramTiers"
    ("ProgramId", "Label", "Channel", "BalanceTierLabel", "PayoutMode", "TenorMonths", "RateAnnual", "SortOrder")
  VALUES
    -- ==========================================
    -- 1. BẬC 1: Số dư < 200 triệu đồng
    -- ==========================================
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', 'Số dư < 200 triệu đồng', 'cuoi_ky', 6, 0.0900, 1),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', 'Số dư < 200 triệu đồng', 'hang_thang', 6, 0.0884, 2),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', 'Số dư < 200 triệu đồng', 'hang_quy', 6, 0.0890, 3),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', 'Số dư < 200 triệu đồng', 'tra_truoc', 6, 0.0861, 4),
    
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', 'Số dư < 200 triệu đồng', 'cuoi_ky', 7, 0.0900, 5),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', 'Số dư < 200 triệu đồng', 'hang_thang', 7, 0.0880, 6),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', 'Số dư < 200 triệu đồng', 'tra_truoc', 7, 0.0855, 7),
    
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', 'Số dư < 200 triệu đồng', 'cuoi_ky', 12, 0.0900, 8),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', 'Số dư < 200 triệu đồng', 'hang_thang', 12, 0.0865, 9),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', 'Số dư < 200 triệu đồng', 'hang_quy', 12, 0.0871, 10),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', 'Số dư < 200 triệu đồng', 'tra_truoc', 12, 0.0825, 11),

    -- ==========================================
    -- 2. BẬC 2: 200 triệu ≤ Số dư < 500 triệu đồng
    -- ==========================================
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'cuoi_ky', 6, 0.0910, 12),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_thang', 6, 0.0893, 13),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_quy', 6, 0.0900, 14),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'tra_truoc', 6, 0.0870, 15),
    
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'cuoi_ky', 7, 0.0910, 16),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_thang', 7, 0.0890, 17),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'tra_truoc', 7, 0.0864, 18),
    
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'cuoi_ky', 12, 0.0910, 19),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_thang', 12, 0.0874, 20),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'hang_quy', 12, 0.0880, 21),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '200 triệu ≤ Số dư < 500 triệu đồng', 'tra_truoc', 12, 0.0834, 22),

    -- ==========================================
    -- 3. BẬC 3: 500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng
    -- ==========================================
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 6, 0.0920, 23),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_thang', 6, 0.0903, 24),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_quy', 6, 0.0910, 25),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'tra_truoc', 6, 0.0879, 26),
    
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 7, 0.0920, 27),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_thang', 7, 0.0900, 28),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'tra_truoc', 7, 0.0873, 29),
    
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'cuoi_ky', 12, 0.0920, 30),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_thang', 12, 0.0883, 31),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'hang_quy', 12, 0.0890, 32),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '500 triệu ≤ Số dư < 1 tỷ đồng; hoặc 1 tỷ đồng ≤ Quy mô KH < 2 tỷ đồng', 'tra_truoc', 12, 0.0842, 33),

    -- ==========================================
    -- 4. BẬC 4: 1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng
    -- ==========================================
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'cuoi_ky', 6, 0.0930, 34),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_thang', 6, 0.0912, 35),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_quy', 6, 0.0919, 36),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'tra_truoc', 6, 0.0888, 37),
    
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'cuoi_ky', 7, 0.0930, 38),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_thang', 7, 0.0909, 39),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'tra_truoc', 7, 0.0882, 40),
    
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'cuoi_ky', 12, 0.0930, 41),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_thang', 12, 0.0893, 42),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'hang_quy', 12, 0.0899, 43),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Số dư < 3 tỷ đồng; hoặc Quy mô KH ≥ 2 tỷ đồng', 'tra_truoc', 12, 0.0850, 44),

    -- ==========================================
    -- 5. BẬC 5: 3 tỷ đồng ≤ Số dư < 8 tỷ đồng
    -- ==========================================
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'cuoi_ky', 6, 0.0940, 45),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'hang_thang', 6, 0.0922, 46),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'hang_quy', 6, 0.0929, 47),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'tra_truoc', 6, 0.0897, 48),
    
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'cuoi_ky', 7, 0.0940, 49),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'hang_thang', 7, 0.0919, 50),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'tra_truoc', 7, 0.0891, 51),
    
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'cuoi_ky', 12, 0.0930, 52),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'hang_thang', 12, 0.0893, 53),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'hang_quy', 12, 0.0899, 54),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '3 tỷ đồng ≤ Số dư < 8 tỷ đồng', 'tra_truoc', 12, 0.0850, 55),

    -- ==========================================
    -- 6. BẬC 6: Số dư ≥ 8 tỷ đồng
    -- ==========================================
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', 'Số dư ≥ 8 tỷ đồng', 'cuoi_ky', 6, 0.0950, 56),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_thang', 6, 0.0932, 57),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_quy', 6, 0.0939, 58),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', 'Số dư ≥ 8 tỷ đồng', 'tra_truoc', 6, 0.0906, 59),
    
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', 'Số dư ≥ 8 tỷ đồng', 'cuoi_ky', 7, 0.0950, 60),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_thang', 7, 0.0928, 61),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', 'Số dư ≥ 8 tỷ đồng', 'tra_truoc', 7, 0.0900, 62),
    
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', 'Số dư ≥ 8 tỷ đồng', 'cuoi_ky', 12, 0.0940, 63),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_thang', 12, 0.0902, 64),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', 'Số dư ≥ 8 tỷ đồng', 'hang_quy', 12, 0.0909, 65),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', 'Số dư ≥ 8 tỷ đồng', 'tra_truoc', 12, 0.0859, 66),

    -- ==========================================
    -- 7. KÊNH ONLINE
    -- ==========================================
    -- Giai đoạn 1: 28/08/2026 → 05/09/2026
    (pid, 'Online — 06 tháng (28/08–05/09)', 'online', '28/08/2026 – 05/09/2026', 'cuoi_ky', 6, 0.0920, 67),
    (pid, 'Online — 07 tháng (28/08–05/09)', 'online', '28/08/2026 – 05/09/2026', 'cuoi_ky', 7, 0.0920, 68),
    (pid, 'Online — 12 tháng (28/08–05/09)', 'online', '28/08/2026 – 05/09/2026', 'cuoi_ky', 12, 0.0895, 69),
    -- Giai đoạn 2: 06/09/2026 → 20/09/2026
    (pid, 'Online — 06 tháng (06/09–20/09)', 'online', '06/09/2026 – 20/09/2026', 'cuoi_ky', 6, 0.0895, 70),
    (pid, 'Online — 07 tháng (06/09–20/09)', 'online', '06/09/2026 – 20/09/2026', 'cuoi_ky', 7, 0.0895, 71),
    (pid, 'Online — 12 tháng (06/09–20/09)', 'online', '06/09/2026 – 20/09/2026', 'cuoi_ky', 12, 0.0895, 72),

    -- ==========================================
    -- 8. GIÁ BÁN VỐN NỘI BỘ VOF (FTP MUA)
    -- ==========================================
    (pid, 'FTP mua (VOF) — 06 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 6, 0.0960, 73),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 6, 0.0949, 74),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 6, 0.0941, 75),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 6, 0.0916, 76),
    
    (pid, 'FTP mua (VOF) — 07 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 7, 0.0960, 77),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 7, 0.0945, 78),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 7, 0.0938, 79),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 7, 0.0909, 80),
    
    (pid, 'FTP mua (VOF) — 12 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 12, 0.0960, 81),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 12, 0.0927, 82),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 12, 0.0920, 83),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 12, 0.0875, 84);

END $$;

COMMIT;
