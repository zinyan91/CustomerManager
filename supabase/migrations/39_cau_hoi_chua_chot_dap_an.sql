-- Cho phép câu hỏi CHƯA CHỐT ĐÁP ÁN: CorrectAnswers là mảng rỗng.
--
-- VÌ SAO: bộ 662 câu có hai câu mà người soạn ghi thẳng trong đề "CÂU NÀO CŨNG
-- SAI" (id gốc 504 — Tiết kiệm Phát Lộc, và 570 — công thức vốn lưu động ròng).
-- Bản dọn sẵn đánh cả bốn lựa chọn là đáp án đúng, nhưng đó là cách ghi chú của
-- người soạn chứ không phải đáp án. Chủ dự án chốt 10/08/2026: để trống đáp án.
--
-- KHÔNG đặt ràng buộc "không được đánh đúng mọi lựa chọn". Đo lại thì có BỐN câu
-- mọi lựa chọn đều đúng một cách hợp lệ (176, 194, 195, 198 — hai câu trong đó
-- ghi thẳng trong đề "cho phép lựa chọn nhiều đáp án"). Ràng buộc ấy sẽ khoá dữ
-- liệu thật ra ngoài. Thứ cần biểu diễn là "chưa chốt đáp án", và nó biểu diễn
-- bằng mảng rỗng, không bằng việc đánh đúng tất cả.
--
-- RÀNG BUỘC CŨ ĐANG ĐÚNG DO ĂN MAY. `array_length('{}', 1) >= 1` trả NULL, và
-- CHECK của Postgres chỉ đổ khi biểu thức ra FALSE — nên mảng rỗng vốn đã đi qua
-- được. Migration này viết lại cho đúng ý định thay vì dựa vào chỗ ăn may đó.

BEGIN;

ALTER TABLE public."QuizQuestions"
  DROP CONSTRAINT IF EXISTS "QuizQuestions_PhaiCoDapAnDung";

ALTER TABLE public."QuizQuestions"
  ADD CONSTRAINT "QuizQuestions_DapAnKhongChuaNull"
  CHECK (array_position("CorrectAnswers", NULL) IS NULL);

COMMENT ON COLUMN public."QuizQuestions"."CorrectAnswers" IS
  'Tập mã lựa chọn đúng, luôn là tập con của mã trong Options (trigger chốt). MẢNG RỖNG nghĩa là CHƯA CHỐT ĐÁP ÁN — dùng cho câu mà đề ghi "câu nào cũng sai" hoặc câu còn phải đối chiếu văn bản gốc. Chế độ Luyện tập bỏ qua các câu này vì không chấm được.';

COMMIT;


-- Đối chiếu. Kỳ vọng: ràng buộc cũ không còn, ràng buộc mới có, và mảng rỗng
-- ghi được còn mảng chứa NULL thì bị chặn.

SELECT conname AS rang_buoc
FROM pg_constraint
WHERE conrelid = 'public."QuizQuestions"'::regclass
  AND contype = 'c'
ORDER BY 1;
