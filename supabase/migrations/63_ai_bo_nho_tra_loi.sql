-- =====================================================================
-- Migration 63: Bộ nhớ câu trả lời AI dùng chung (AiAnswerCache)
-- =====================================================================
-- Khi một nhân viên hỏi AI về nội dung văn bản Văn thư, câu trả lời được lưu lại để
-- người khác hỏi y như vậy được trả lời ngay, không phải đọc lại văn bản.
-- Chỉ lưu câu trả lời dựa trên văn bản Văn thư (nội dung vốn ai cũng xem được). Ứng dụng
-- KHÔNG lưu câu trả lời có dữ liệu khách hàng, tệp riêng của người dùng hay câu nối tiếp.
-- "QuestionKey" là các từ của câu hỏi (không dấu, đã sắp xếp); "DocRefs" là các văn bản đã
-- đọc kèm UpdatedAt lúc đó: văn bản bị sửa thì câu trả lời cũ bị bỏ qua.
--
-- ÁP DỤNG: sau migration 62, TRƯỚC khi deploy mã mới.
-- Chưa áp thì AI vẫn trả lời bình thường, chỉ không có bộ nhớ dùng chung.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public."AiAnswerCache" (
  "Id"          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "QuestionKey" text NOT NULL,
  "Question"    text NOT NULL,
  "Answer"      text NOT NULL
                CONSTRAINT ck_aianswer_len CHECK (char_length("Answer") <= 20000),
  "DocRefs"     jsonb NOT NULL DEFAULT '[]'::jsonb
                CONSTRAINT ck_aianswer_refs CHECK (jsonb_typeof("DocRefs") = 'array'),
  "Model"       text,
  "CreatedBy"   uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  "CreatedAt"   timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt"   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ux_aianswer_key UNIQUE ("QuestionKey")
);

COMMENT ON TABLE public."AiAnswerCache" IS
  'Câu trả lời AI dựa trên văn bản Văn thư, dùng chung cho mọi tài khoản.';

ALTER TABLE public."AiAnswerCache" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aianswer_select" ON public."AiAnswerCache";
CREATE POLICY "aianswer_select" ON public."AiAnswerCache"
  FOR SELECT TO authenticated USING (true);

-- Mọi tài khoản đăng nhập thêm/làm mới được (nút "Hỏi lại AI" ghi đè câu cũ)
DROP POLICY IF EXISTS "aianswer_insert" ON public."AiAnswerCache";
CREATE POLICY "aianswer_insert" ON public."AiAnswerCache"
  FOR INSERT TO authenticated WITH CHECK ("CreatedBy" = auth.uid());

DROP POLICY IF EXISTS "aianswer_update" ON public."AiAnswerCache";
CREATE POLICY "aianswer_update" ON public."AiAnswerCache"
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- Chỉ admin xóa: dọn câu trả lời sai
DROP POLICY IF EXISTS "aianswer_delete" ON public."AiAnswerCache";
CREATE POLICY "aianswer_delete" ON public."AiAnswerCache"
  FOR DELETE TO authenticated USING (public.is_admin());

REVOKE ALL ON public."AiAnswerCache" FROM anon;
