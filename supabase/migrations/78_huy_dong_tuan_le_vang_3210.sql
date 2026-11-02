-- Chương trình ưu đãi lãi suất huy động "Tuần lễ vàng" và "Tiết kiệm phong tỏa CASA" — kỳ 01/11 → 15/11/2026.
-- Nguồn: Thông báo số 3210/2026/TB-TGĐ ngày 30/10/2026, Vietbank,
-- V/v Chương trình ưu đãi lãi suất huy động Tuần lễ vàng và Tiết kiệm phong tỏa Casa dành cho khách hàng cá nhân.
-- ĐÃ ĐỐI CHIẾU BẢN GỐC nên SourceVerified = true.
--
-- Điểm khác Thông báo 2848-8/2026/TB-BĐH:
-- 1. Tại quầy chia 5 bậc quy mô KH (<100tr, 100tr–1 tỷ, 1–3 tỷ, 3–5 tỷ, ≥5 tỷ) và công bố đủ 4 cách lãnh lãi
--    (07 tháng không có lãi hàng quý).
-- 2. Thêm Tiết kiệm phong tỏa CASA (lãi trả trước, 06/07 tháng và 09/12 tháng) cùng VOF riêng; nhãn bậc mang tiền tố
--    "Tiết kiệm phong tỏa CASA" để màn Chào lãi suất tách khỏi dòng trả trước của Tuần lễ vàng.
-- Sinh từ bảng trong văn bản; 119 dòng.

BEGIN;

DO $$
DECLARE
  pid integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public."RatePrograms" WHERE "DocumentNumber" = '3210/2026/TB-TGĐ') THEN
    RAISE NOTICE 'Da co 3210/2026/TB-TGD, bo qua.';
    RETURN;
  END IF;

  INSERT INTO public."RatePrograms" (
    "Kind", "Name", "DocumentNumber", "DocumentDate", "EffectiveFrom", "EffectiveTo",
    "SourceVerified", "ScopeText", "TargetText", "Note"
  ) VALUES (
    'huy_dong',
    'Tuần lễ vàng huy động và Tiết kiệm phong tỏa CASA — KHCN (kỳ 01/11–15/11/2026)',
    '3210/2026/TB-TGĐ', DATE '2026-10-30', DATE '2026-11-01', DATE '2026-11-15',
    true,
    'Tất cả Trung tâm kinh doanh (TTKD) của Vietbank trên toàn quốc.',
    'Khách hàng cá nhân (KHCN).',
    'Sản phẩm áp dụng: Tiết kiệm truyền thống, Tiết kiệm quyền chọn, Tiền gửi/ hợp đồng tiền gửi có kỳ hạn, Tiết kiệm Phát lộc, Tiền gửi Online có kỳ hạn. Thời gian áp dụng: Từ ngày 01/11/2026 đến hết ngày 15/11/2026. Đối tượng: KHCN gửi tiết kiệm trong thời gian chương trình (KH hiện hữu tái tục, KH hiện hữu gửi mới, KH mới). Thẩm quyền phê duyệt lãi suất: Giám đốc/Phó Giám đốc phụ trách/Phó Giám đốc TTKD. Hình thức lãnh lãi: lãi đầu kỳ, lãi cuối kỳ, lãi hàng tháng, lãi hàng quý. Kênh online 8,95%/năm cho kỳ hạn 06, 07, 09, 12 tháng. Tiết kiệm phong tỏa CASA: sản phẩm Tiết kiệm truyền thống, lãi trả trước; KH đồng ý phong tỏa số tiền lãi đầu kỳ ở TKTT với thời gian tương đương kỳ hạn sổ (biểu mẫu BM01_Giấy đề nghị phong tỏa); không thu phí phong tỏa/giải tỏa, miễn phí mở TKTT thứ 2 trở đi; VOF tài khoản block CASA = 0,01%. Mức lãi suất phân quyền là mức tối đa, TTKD được áp dụng mức thấp hơn. Quy mô KH gồm số dư tiền gửi có kỳ hạn và chứng chỉ tiền gửi hiện hữu, phát sinh mới của KH và nhóm KH liên quan. Không áp dụng đồng thời với chương trình ưu đãi/khuyến mãi lãi suất khác (trừ ưu đãi Thanh toán quốc tế theo TB 2383/2026/TB-BĐH và chương trình có quy định riêng); không áp dụng KH danh mục đặc thù (KH chiến lược, Legacy, KH loại trừ khác). UDF: "Tuần lễ vàng huy động" hoặc "Tuần lễ vàng – Vui vi vu"; phong tỏa CASA: sổ tiết kiệm gắn "Tuần lễ vàng – Block Casa" hoặc "Block Casa – Vui vi vu", TKTT gắn "Tiết kiệm Block Casa".'
  ) RETURNING "Id" INTO pid;

  INSERT INTO public."RateProgramTiers"
    ("ProgramId", "Label", "Channel", "BalanceTierLabel", "PayoutMode", "TenorMonths", "RateAnnual", "SortOrder")
  VALUES
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH < 100 triệu đồng', 'cuoi_ky', 6, 0.0860, 1),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', 'Quy mô KH < 100 triệu đồng', 'hang_thang', 6, 0.0864, 2),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', 'Quy mô KH < 100 triệu đồng', 'hang_quy', 6, 0.0871, 3),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', 'Quy mô KH < 100 triệu đồng', 'tra_truoc', 6, 0.0842, 4),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH < 100 triệu đồng', 'cuoi_ky', 7, 0.0860, 5),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', 'Quy mô KH < 100 triệu đồng', 'hang_thang', 7, 0.0861, 6),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', 'Quy mô KH < 100 triệu đồng', 'tra_truoc', 7, 0.0837, 7),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH < 100 triệu đồng', 'cuoi_ky', 9, 0.0830, 8),
    (pid, 'Quầy — 09 tháng — lãi hàng tháng', 'quay', 'Quy mô KH < 100 triệu đồng', 'hang_thang', 9, 0.0827, 9),
    (pid, 'Quầy — 09 tháng — lãi hàng quý', 'quay', 'Quy mô KH < 100 triệu đồng', 'hang_quy', 9, 0.0833, 10),
    (pid, 'Quầy — 09 tháng — lãi trả trước', 'quay', 'Quy mô KH < 100 triệu đồng', 'tra_truoc', 9, 0.0799, 11),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH < 100 triệu đồng', 'cuoi_ky', 12, 0.0830, 12),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', 'Quy mô KH < 100 triệu đồng', 'hang_thang', 12, 0.0819, 13),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', 'Quy mô KH < 100 triệu đồng', 'hang_quy', 12, 0.0824, 14),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', 'Quy mô KH < 100 triệu đồng', 'tra_truoc', 12, 0.0783, 15),
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'cuoi_ky', 6, 0.0870, 16),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'hang_thang', 6, 0.0874, 17),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'hang_quy', 6, 0.0880, 18),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'tra_truoc', 6, 0.0852, 19),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'cuoi_ky', 7, 0.0870, 20),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'hang_thang', 7, 0.0871, 21),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'tra_truoc', 7, 0.0846, 22),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'cuoi_ky', 9, 0.0840, 23),
    (pid, 'Quầy — 09 tháng — lãi hàng tháng', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'hang_thang', 9, 0.0836, 24),
    (pid, 'Quầy — 09 tháng — lãi hàng quý', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'hang_quy', 9, 0.0842, 25),
    (pid, 'Quầy — 09 tháng — lãi trả trước', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'tra_truoc', 9, 0.0807, 26),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'cuoi_ky', 12, 0.0840, 27),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'hang_thang', 12, 0.0828, 28),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'hang_quy', 12, 0.0834, 29),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'tra_truoc', 12, 0.0791, 30),
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'cuoi_ky', 6, 0.0880, 31),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'hang_thang', 6, 0.0884, 32),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'hang_quy', 6, 0.0890, 33),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'tra_truoc', 6, 0.0861, 34),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'cuoi_ky', 7, 0.0880, 35),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'hang_thang', 7, 0.0880, 36),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'tra_truoc', 7, 0.0855, 37),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'cuoi_ky', 9, 0.0870, 38),
    (pid, 'Quầy — 09 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'hang_thang', 9, 0.0846, 39),
    (pid, 'Quầy — 09 tháng — lãi hàng quý', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'hang_quy', 9, 0.0852, 40),
    (pid, 'Quầy — 09 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'tra_truoc', 9, 0.0816, 41),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'cuoi_ky', 12, 0.0870, 42),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'hang_thang', 12, 0.0837, 43),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'hang_quy', 12, 0.0843, 44),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'tra_truoc', 12, 0.0800, 45),
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'cuoi_ky', 6, 0.0910, 46),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'hang_thang', 6, 0.0893, 47),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'hang_quy', 6, 0.0900, 48),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'tra_truoc', 6, 0.0870, 49),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'cuoi_ky', 7, 0.0910, 50),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'hang_thang', 7, 0.0890, 51),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'tra_truoc', 7, 0.0864, 52),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'cuoi_ky', 9, 0.0880, 53),
    (pid, 'Quầy — 09 tháng — lãi hàng tháng', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'hang_thang', 9, 0.0855, 54),
    (pid, 'Quầy — 09 tháng — lãi hàng quý', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'hang_quy', 9, 0.0861, 55),
    (pid, 'Quầy — 09 tháng — lãi trả trước', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'tra_truoc', 9, 0.0825, 56),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'cuoi_ky', 12, 0.0880, 57),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'hang_thang', 12, 0.0846, 58),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'hang_quy', 12, 0.0852, 59),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', '3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'tra_truoc', 12, 0.0808, 60),
    (pid, 'Quầy — 06 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'cuoi_ky', 6, 0.0920, 61),
    (pid, 'Quầy — 06 tháng — lãi hàng tháng', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'hang_thang', 6, 0.0903, 62),
    (pid, 'Quầy — 06 tháng — lãi hàng quý', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'hang_quy', 6, 0.0910, 63),
    (pid, 'Quầy — 06 tháng — lãi trả trước', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'tra_truoc', 6, 0.0879, 64),
    (pid, 'Quầy — 07 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'cuoi_ky', 7, 0.0920, 65),
    (pid, 'Quầy — 07 tháng — lãi hàng tháng', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'hang_thang', 7, 0.0900, 66),
    (pid, 'Quầy — 07 tháng — lãi trả trước', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'tra_truoc', 7, 0.0873, 67),
    (pid, 'Quầy — 09 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'cuoi_ky', 9, 0.0890, 68),
    (pid, 'Quầy — 09 tháng — lãi hàng tháng', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'hang_thang', 9, 0.0865, 69),
    (pid, 'Quầy — 09 tháng — lãi hàng quý', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'hang_quy', 9, 0.0871, 70),
    (pid, 'Quầy — 09 tháng — lãi trả trước', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'tra_truoc', 9, 0.0834, 71),
    (pid, 'Quầy — 12 tháng — lãi cuối kỳ', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'cuoi_ky', 12, 0.0890, 72),
    (pid, 'Quầy — 12 tháng — lãi hàng tháng', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'hang_thang', 12, 0.0856, 73),
    (pid, 'Quầy — 12 tháng — lãi hàng quý', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'hang_quy', 12, 0.0862, 74),
    (pid, 'Quầy — 12 tháng — lãi trả trước', 'quay', 'Quy mô KH ≥ 5 tỷ đồng', 'tra_truoc', 12, 0.0817, 75),
    (pid, 'Online — 06 tháng', 'online', NULL, 'cuoi_ky', 6, 0.0895, 76),
    (pid, 'Online — 07 tháng', 'online', NULL, 'cuoi_ky', 7, 0.0895, 77),
    (pid, 'Online — 09 tháng', 'online', NULL, 'cuoi_ky', 9, 0.0895, 78),
    (pid, 'Online — 12 tháng', 'online', NULL, 'cuoi_ky', 12, 0.0895, 79),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 6, 0.0930, 80),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 6, 0.0919, 81),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 6, 0.0912, 82),
    (pid, 'FTP mua (VOF) — 06 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 6, 0.0888, 83),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 7, 0.0930, 84),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 7, 0.0916, 85),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 7, 0.0909, 86),
    (pid, 'FTP mua (VOF) — 07 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 7, 0.0882, 87),
    (pid, 'FTP mua (VOF) — 09 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 9, 0.0910, 88),
    (pid, 'FTP mua (VOF) — 09 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 9, 0.0890, 89),
    (pid, 'FTP mua (VOF) — 09 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 9, 0.0884, 90),
    (pid, 'FTP mua (VOF) — 09 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 9, 0.0851, 91),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi cuối kỳ', 'ftp', NULL, 'cuoi_ky', 12, 0.0910, 92),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi hàng quý', 'ftp', NULL, 'hang_quy', 12, 0.0880, 93),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi hàng tháng', 'ftp', NULL, 'hang_thang', 12, 0.0874, 94),
    (pid, 'FTP mua (VOF) — 12 tháng — lãi trả trước', 'ftp', NULL, 'tra_truoc', 12, 0.0834, 95),
    (pid, 'Phong tỏa CASA — 06 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · Quy mô KH < 100 triệu đồng', 'tra_truoc', 6, 0.0880, 96),
    (pid, 'Phong tỏa CASA — 07 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · Quy mô KH < 100 triệu đồng', 'tra_truoc', 7, 0.0880, 97),
    (pid, 'Phong tỏa CASA — 09 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · Quy mô KH < 100 triệu đồng', 'tra_truoc', 9, 0.0850, 98),
    (pid, 'Phong tỏa CASA — 12 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · Quy mô KH < 100 triệu đồng', 'tra_truoc', 12, 0.0850, 99),
    (pid, 'Phong tỏa CASA — 06 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'tra_truoc', 6, 0.0890, 100),
    (pid, 'Phong tỏa CASA — 07 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'tra_truoc', 7, 0.0890, 101),
    (pid, 'Phong tỏa CASA — 09 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'tra_truoc', 9, 0.0860, 102),
    (pid, 'Phong tỏa CASA — 12 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 100 triệu đồng ≤ Quy mô KH < 1 tỷ đồng', 'tra_truoc', 12, 0.0860, 103),
    (pid, 'Phong tỏa CASA — 06 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'tra_truoc', 6, 0.0900, 104),
    (pid, 'Phong tỏa CASA — 07 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'tra_truoc', 7, 0.0900, 105),
    (pid, 'Phong tỏa CASA — 09 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'tra_truoc', 9, 0.0867, 106),
    (pid, 'Phong tỏa CASA — 12 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 1 tỷ đồng ≤ Quy mô KH < 3 tỷ đồng', 'tra_truoc', 12, 0.0867, 107),
    (pid, 'Phong tỏa CASA — 06 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'tra_truoc', 6, 0.0900, 108),
    (pid, 'Phong tỏa CASA — 07 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'tra_truoc', 7, 0.0900, 109),
    (pid, 'Phong tỏa CASA — 09 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'tra_truoc', 9, 0.0867, 110),
    (pid, 'Phong tỏa CASA — 12 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · 3 tỷ đồng ≤ Quy mô KH < 5 tỷ đồng', 'tra_truoc', 12, 0.0867, 111),
    (pid, 'Phong tỏa CASA — 06 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · Quy mô KH ≥ 5 tỷ đồng', 'tra_truoc', 6, 0.0900, 112),
    (pid, 'Phong tỏa CASA — 07 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · Quy mô KH ≥ 5 tỷ đồng', 'tra_truoc', 7, 0.0900, 113),
    (pid, 'Phong tỏa CASA — 09 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · Quy mô KH ≥ 5 tỷ đồng', 'tra_truoc', 9, 0.0867, 114),
    (pid, 'Phong tỏa CASA — 12 tháng — lãi trả trước', 'quay', 'Tiết kiệm phong tỏa CASA · Quy mô KH ≥ 5 tỷ đồng', 'tra_truoc', 12, 0.0867, 115),
    (pid, 'FTP mua (VOF) phong tỏa CASA — 06 tháng — lãi trả trước', 'ftp', 'Tiết kiệm phong tỏa CASA', 'tra_truoc', 6, 0.0910, 116),
    (pid, 'FTP mua (VOF) phong tỏa CASA — 07 tháng — lãi trả trước', 'ftp', 'Tiết kiệm phong tỏa CASA', 'tra_truoc', 7, 0.0910, 117),
    (pid, 'FTP mua (VOF) phong tỏa CASA — 09 tháng — lãi trả trước', 'ftp', 'Tiết kiệm phong tỏa CASA', 'tra_truoc', 9, 0.0877, 118),
    (pid, 'FTP mua (VOF) phong tỏa CASA — 12 tháng — lãi trả trước', 'ftp', 'Tiết kiệm phong tỏa CASA', 'tra_truoc', 12, 0.0877, 119);

END $$;

COMMIT;
