-- Dọn mẩu ghi chú còn dấu ba chấm trên chương trình huy động 2400/2026/TB-BĐH.
--
-- Ngày 17/08/2026, khi chưa có đường gia hạn trong ứng dụng, kỳ 2400 được kéo
-- dài tới 30/09/2026 bằng một lệnh UPDATE gõ tay. Lệnh đó nối vào cột Note
-- nguyên văn khuôn mẫu chưa điền:
--
--   [Gia hạn tới 30/09/2026 theo Thông báo số ... ngày ...]
--
-- Ngay sau đó migration 50 nạp Thông báo 2500/2026/TB-BĐH và đóng kỳ 2400 lại ở
-- 16/08/2026. Mẩu ghi chú kia vì vậy vừa chưa điền vừa nói sai ngày — giữ lại
-- thì người đọc sau tưởng kỳ này hiệu lực tới 30/09.
--
-- Chỉ xoá đúng mẩu đó, giữ nguyên phần mô tả chương trình và dòng ghi chú đóng
-- kỳ do migration 50 thêm vào.

BEGIN;

-- 1. Xem trước khi sửa.
SELECT "DocumentNumber", "EffectiveFrom", "EffectiveTo", "Note" AS note_truoc_khi_sua
FROM public."RatePrograms"
WHERE "DocumentNumber" = '2400/2026/TB-BĐH';

-- 2. Gỡ mẩu ghi chú, rồi gộp các khoảng trắng thừa do việc gỡ để lại.
UPDATE public."RatePrograms"
SET "Note" = btrim(
      regexp_replace(
        regexp_replace("Note", '\s*\[Gia hạn tới 30/09/2026[^\]]*\]', '', 'g'),
        '\s{2,}', ' ', 'g'
      )
    )
WHERE "DocumentNumber" = '2400/2026/TB-BĐH'
  AND "Note" LIKE '%[Gia hạn tới 30/09/2026%';

COMMIT;


-- 3. Đối chiếu sau khi chạy.
--    Kỳ vọng: con_sot = 0, và Note vẫn còn dòng đóng kỳ 16/08/2026.
SELECT
  "DocumentNumber",
  "EffectiveFrom",
  "EffectiveTo",
  ("Note" LIKE '%[Gia hạn tới 30/09/2026%')::int AS con_sot,
  ("Note" LIKE '%Đóng 16/08/2026%')::int         AS con_dong_ghi_chu_dong_ky,
  "Note"                                         AS note_sau_khi_sua
FROM public."RatePrograms"
WHERE "DocumentNumber" = '2400/2026/TB-BĐH';
