-- Gỡ đặc quyền thừa của import_quiz_questions: SECURITY DEFINER → SECURITY INVOKER.
--
-- VÌ SAO GỠ: hàm này chỉ đọc và ghi đúng những gì RLS vốn đã cho phép người đăng
-- nhập làm — SELECT trên "QuizQuestions" là USING (true), INSERT là WITH CHECK
-- ("CreatedBy" = auth.uid()) mà hàm thì tự gán auth.uid(). Bằng chứng thực nghiệm:
-- màn hình vẫn INSERT thẳng từ client qua createQuizQuestionAPI và chạy được, nên
-- authenticated đã có sẵn quyền bảng. SECURITY DEFINER ở đây không mua thêm gì,
-- chỉ để lại một hàm chạy dưới quyền chủ sở hữu — nếu sau này hàm có lỗi thì lỗi
-- ấy leo quyền theo. Đặt SECURITY DEFINER theo quán tính khi chép khuôn từ
-- seed_quiz_bank ở migration 40.
--
-- seed_quiz_bank GIỮ NGUYÊN SECURITY DEFINER: nó phải bật cờ phiên app.quiz_seed
-- để mang 9 cụm trùng có sẵn của bộ gốc đi qua trigger. Đó là đặc quyền có lý do.
--
-- MỘT BẪY PHẢI SỬA CÙNG LÚC: bản cũ kiểm tra đăng nhập bằng
--   SELECT 1 FROM auth.users WHERE id = auth.uid()
-- Dưới SECURITY DEFINER thì chủ sở hữu đọc được auth.users nên nó chạy. Đổi sang
-- SECURITY INVOKER thì người gọi là authenticated, KHÔNG chắc đọc được auth.users,
-- và hàm sẽ đổ ngay ở dòng đầu. Thay bằng auth.uid() IS NULL — đúng thứ cần hỏi,
-- và không đòi quyền trên bảng nào cả.
--
-- Phần thân còn lại giữ nguyên từng chữ so với migration 40.

BEGIN;

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
    khoa := public.quiz_normalize_text(noi_dung);

    IF noi_dung = '' OR jsonb_typeof(r->'options') <> 'array'
       OR jsonb_array_length(r->'options') < 1 THEN
      khong_hop_le := khong_hop_le || jsonb_build_object(
        'cau', left(noi_dung, 120),
        'ly_do', 'Thiếu nội dung câu hỏi hoặc thiếu lựa chọn');
      CONTINUE;
    END IF;

    IF khoa = ANY (da_thay) THEN
      trung_trong_file := trung_trong_file || jsonb_build_object('cau', left(noi_dung, 120));
      CONTINUE;
    END IF;
    da_thay := da_thay || khoa;

    SELECT q."Id", q."CorrectAnswers" INTO id_co_san, dap_an_co_san
      FROM public."QuizQuestions" q
     WHERE public.quiz_normalize_text(q."QuestionText") = khoa
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

REVOKE ALL ON FUNCTION public.import_quiz_questions(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_quiz_questions(jsonb) TO authenticated;

COMMENT ON FUNCTION public.import_quiz_questions(jsonb) IS
  'Nạp thêm bộ câu hỏi vào bảng đã có dữ liệu. Tự bỏ câu trùng nội dung (so bằng quiz_normalize_text) cả với bảng lẫn với chính file, tự bỏ câu không hợp lệ, trả báo cáo từng loại. Câu trùng nội dung mà khác đáp án được liệt kê riêng ở lech_dap_an để người có thẩm quyền quyết. SECURITY INVOKER: chạy dưới quyền người gọi, đi qua RLS như mọi đường ghi khác.';

COMMIT;


-- Đối chiếu. Kỳ vọng:
--   import_quiz_questions  security_definer = false, authenticated gọi được
--   seed_quiz_bank         security_definer = true  (có lý do, giữ nguyên)

SELECT p.proname AS ham, p.prosecdef AS security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_goi_duoc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('seed_quiz_bank', 'import_quiz_questions')
ORDER BY 1;

-- Hàm chạy dưới quyền người gọi thì phải có quyền bảng thật. Kỳ vọng: authenticated
-- có SELECT và INSERT trên QuizQuestions, còn anon thì không có gì.
SELECT grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS quyen
FROM information_schema.role_table_grants
WHERE table_schema = 'public' AND table_name = 'QuizQuestions'
  AND grantee IN ('authenticated', 'anon')
GROUP BY grantee
ORDER BY grantee;
