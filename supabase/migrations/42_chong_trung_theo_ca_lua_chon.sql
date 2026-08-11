-- Sửa luật chống trùng: so bằng CÂU HỎI + BỘ LỰA CHỌN, không so bằng câu hỏi suông.
--
-- SAI Ở ĐÂU. Migration 38 coi hai câu là trùng khi quiz_normalize_text của phần
-- câu hỏi bằng nhau. Bộ 662 câu có những câu dẫn chung chung mà nội dung thật nằm
-- ở bốn lựa chọn — ví dụ "Các trường hợp sau đây theo quy định hiện hành VietBank
-- hạn chế nhận thế chấp" xuất hiện ở bốn câu (267, 272, 274, 283) với HAI bộ lựa
-- chọn khác hẳn nhau. Luật cũ gom cả bốn thành một cụm rồi kết luận "đáp án đúng
-- khác nhau, ít nhất một bản đang dạy sai". KẾT LUẬN ĐÓ SAI: 267/272 là một câu
-- (đáp án B), 274/283 là câu khác (đáp án D), mỗi đáp án đúng cho bộ lựa chọn của
-- nó. Dữ liệu không hề mâu thuẫn.
--
-- ĐO LẠI TRÊN 662 CÂU, ngày 11/08/2026:
--   luật cũ (chỉ câu hỏi):        9 cụm · 24 câu · 15 bản dư · 3 cụm lệch đáp án
--   luật mới (câu hỏi + lựa chọn): 6 cụm · 12 câu ·  6 bản dư · 0 cụm lệch đáp án
-- Cảnh báo "3 cụm đang dạy sai" ở migration 38 và ở tab là BÁO ĐỘNG GIẢ do luật
-- so trùng quá thô, không phải lỗi dữ liệu. Rút lại.
--
-- HỆ QUẢ: luật mới LỎNG HƠN luật cũ, nên không có dòng nào đang nằm trong bảng bị
-- luật mới coi là phạm. Không cần dọn dữ liệu, chỉ đổi cách so.
--
-- COLLATE "C" KHI SẮP LỰA CHỌN: khoá phải giống hệt bản TypeScript
-- (quizDuplicateKey ở src/lib/quizBank.ts) thì client và CSDL mới nói cùng một
-- luật. TypeScript sắp bằng Array.prototype.sort — thứ tự mã ký tự. Sắp theo
-- collation của CSDL sẽ ra thứ tự khác với tiếng Việt, làm hai bên lệch nhau:
-- client bảo không trùng, CSDL bảo trùng. COLLATE "C" là thứ tự byte UTF-8, khớp
-- với thứ tự mã ký tự cho toàn bộ chữ tiếng Việt.

BEGIN;

-- \x01 ngăn câu hỏi với danh sách lựa chọn, \x02 ngăn các lựa chọn với nhau.
-- Hai ký tự điều khiển này không xuất hiện trong văn bản câu hỏi.
CREATE OR REPLACE FUNCTION public.quiz_duplicate_key(p_question text, p_options jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.quiz_normalize_text(p_question)
    || E'\x01'
    || coalesce((
         SELECT string_agg(public.quiz_normalize_text(o->>'text'), E'\x02'
                           ORDER BY public.quiz_normalize_text(o->>'text') COLLATE "C")
         FROM jsonb_array_elements(coalesce(p_options, '[]'::jsonb)) AS o
       ), '');
$$;

COMMENT ON FUNCTION public.quiz_duplicate_key(text, jsonb) IS
  'Khoá so trùng của một câu hỏi: nội dung câu hỏi + bộ lựa chọn đã chuẩn hoá và sắp thứ tự. Phải giống hệt quizDuplicateKey ở src/lib/quizBank.ts — sửa một bên phải sửa bên kia, test khoá cả hai.';

DROP INDEX IF EXISTS "QuizQuestions_NoiDungChuanHoa_idx";

CREATE INDEX "QuizQuestions_KhoaTrung_idx"
  ON public."QuizQuestions" (public.quiz_duplicate_key("QuestionText", "Options"));


CREATE OR REPLACE FUNCTION public."fn_kiem_tra_cau_hoi"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  ma_lua_chon text[];
  thieu       text[];
  id_trung    bigint;
BEGIN
  SELECT array_agg(o->>'id' ORDER BY ord)
    INTO ma_lua_chon
    FROM jsonb_array_elements(NEW."Options") WITH ORDINALITY AS t(o, ord);

  IF ma_lua_chon IS NULL OR array_position(ma_lua_chon, NULL) IS NOT NULL THEN
    RAISE EXCEPTION 'Mỗi lựa chọn phải có mã (khoá "id").';
  END IF;

  IF array_length(ma_lua_chon, 1) <> (SELECT count(DISTINCT m) FROM unnest(ma_lua_chon) m) THEN
    RAISE EXCEPTION 'Mã lựa chọn bị lặp trong cùng một câu hỏi: %',
      array_to_string(ma_lua_chon, ', ');
  END IF;

  SELECT array_agg(d) INTO thieu
    FROM unnest(NEW."CorrectAnswers") d
   WHERE d <> ALL (ma_lua_chon);

  IF thieu IS NOT NULL THEN
    RAISE EXCEPTION 'Đáp án đúng % không nằm trong danh sách lựa chọn %',
      array_to_string(thieu, ', '), array_to_string(ma_lua_chon, ', ');
  END IF;

  -- Trùng = trùng CẢ câu hỏi LẪN bộ lựa chọn. Câu dẫn chung chung dùng lại cho
  -- nhiều bộ lựa chọn khác nhau là chuyện bình thường trong bộ đề này.
  IF coalesce(current_setting('app.quiz_seed', true), '') <> 'on' THEN
    SELECT q."Id" INTO id_trung
      FROM public."QuizQuestions" q
     WHERE public.quiz_duplicate_key(q."QuestionText", q."Options")
         = public.quiz_duplicate_key(NEW."QuestionText", NEW."Options")
       AND q."Id" <> coalesce(NEW."Id", -1)
     LIMIT 1;

    IF id_trung IS NOT NULL THEN
      RAISE EXCEPTION 'Câu hỏi này đã có trong ngân hàng (Id=%).', id_trung
        USING ERRCODE = 'unique_violation';
    END IF;
  END IF;

  RETURN NEW;
END $$;


-- Đường nạp thêm dùng cùng một khoá. Phần còn lại giữ nguyên từ migration 41.
CREATE OR REPLACE FUNCTION public.import_quiz_questions(p_questions jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  r                jsonb;
  noi_dung         text;
  khoa             text;
  ma_lua_chon      text[];
  dap_an           text[];
  id_co_san        bigint;
  dap_an_co_san    text[];
  da_thay          text[] := '{}';
  so_nap           integer := 0;
  trung_ngan_hang  jsonb := '[]'::jsonb;
  trung_trong_file jsonb := '[]'::jsonb;
  khong_hop_le     jsonb := '[]'::jsonb;
  lech_dap_an      jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Phải đăng nhập mới nạp được câu hỏi.';
  END IF;

  IF jsonb_typeof(p_questions) <> 'array' THEN
    RAISE EXCEPTION 'Tham số phải là mảng jsonb các câu hỏi.';
  END IF;

  FOR r IN SELECT * FROM jsonb_array_elements(p_questions)
  LOOP
    noi_dung := btrim(coalesce(r->>'question', ''));

    IF noi_dung = '' OR jsonb_typeof(r->'options') <> 'array'
       OR jsonb_array_length(r->'options') < 1 THEN
      khong_hop_le := khong_hop_le || jsonb_build_object(
        'cau', left(noi_dung, 120),
        'ly_do', 'Thiếu nội dung câu hỏi hoặc thiếu lựa chọn');
      CONTINUE;
    END IF;

    khoa := public.quiz_duplicate_key(noi_dung, r->'options');

    IF khoa = ANY (da_thay) THEN
      trung_trong_file := trung_trong_file || jsonb_build_object('cau', left(noi_dung, 120));
      CONTINUE;
    END IF;
    da_thay := da_thay || khoa;

    SELECT q."Id", q."CorrectAnswers" INTO id_co_san, dap_an_co_san
      FROM public."QuizQuestions" q
     WHERE public.quiz_duplicate_key(q."QuestionText", q."Options") = khoa
     LIMIT 1;

    IF id_co_san IS NOT NULL THEN
      dap_an := ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'correct_answers', '[]'::jsonb)));

      trung_ngan_hang := trung_ngan_hang || jsonb_build_object(
        'cau', left(noi_dung, 120), 'id_co_san', id_co_san);

      IF NOT (dap_an <@ dap_an_co_san AND dap_an_co_san <@ dap_an) THEN
        lech_dap_an := lech_dap_an || jsonb_build_object(
          'cau', left(noi_dung, 120),
          'id_co_san', id_co_san,
          'dap_an_co_san', to_jsonb(dap_an_co_san),
          'dap_an_trong_file', to_jsonb(dap_an));
      END IF;

      id_co_san := NULL;
      CONTINUE;
    END IF;

    BEGIN
      SELECT array_agg(o->>'id' ORDER BY ord) INTO ma_lua_chon
        FROM jsonb_array_elements(r->'options') WITH ORDINALITY AS t(o, ord);

      dap_an := ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'correct_answers', '[]'::jsonb)));

      INSERT INTO public."QuizQuestions"
        ("QuestionText", "Options", "CorrectAnswers", "Sources", "Topic", "CreatedBy")
      VALUES (
        noi_dung,
        r->'options',
        dap_an,
        coalesce(ARRAY(SELECT jsonb_array_elements_text(coalesce(r->'sources', '[]'::jsonb))), '{}'),
        nullif(btrim(coalesce(r->>'topic', '')), ''),
        auth.uid());

      so_nap := so_nap + 1;

    EXCEPTION WHEN others THEN
      khong_hop_le := khong_hop_le || jsonb_build_object(
        'cau', left(noi_dung, 120), 'ly_do', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'da_nap', so_nap,
    'trung_trong_ngan_hang', trung_ngan_hang,
    'trung_trong_file', trung_trong_file,
    'khong_hop_le', khong_hop_le,
    'lech_dap_an', lech_dap_an);
END $$;

COMMIT;


-- Đối chiếu 1: bốn câu ở cụm bị kết luận nhầm. Kỳ vọng 267 và 272 chung khoá,
-- 274 và 283 chung khoá, hai khoá đó KHÁC nhau. Chạy sau khi đã nạp bộ gốc.
SELECT public.quiz_duplicate_key("QuestionText", "Options") = (
         SELECT public.quiz_duplicate_key("QuestionText", "Options")
         FROM public."QuizQuestions" WHERE "Id" = 267)
       AS cung_khoa_voi_267,
       "Id", "CorrectAnswers"
FROM public."QuizQuestions"
WHERE "Id" IN (267, 272, 274, 283)
ORDER BY "Id";

-- Đối chiếu 2: đếm lại cụm trùng theo luật mới. Kỳ vọng 6 cụm, 12 câu.
SELECT count(*) AS so_cum, coalesce(sum(so_ban), 0) AS so_cau
FROM (
  SELECT count(*) AS so_ban
  FROM public."QuizQuestions"
  GROUP BY public.quiz_duplicate_key("QuestionText", "Options")
  HAVING count(*) > 1
) t;

-- Đối chiếu 3: cụm nào còn lệch đáp án thật. Kỳ vọng KHÔNG dòng nào.
SELECT public.quiz_duplicate_key("QuestionText", "Options") AS khoa,
       array_agg("Id" ORDER BY "Id") AS cac_id,
       count(DISTINCT "CorrectAnswers") AS so_bo_dap_an_khac_nhau
FROM public."QuizQuestions"
GROUP BY 1
HAVING count(*) > 1 AND count(DISTINCT "CorrectAnswers") > 1;
