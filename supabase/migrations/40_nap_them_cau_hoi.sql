-- Nạp thêm một bộ câu hỏi vào ngân hàng đã có dữ liệu, tự bỏ câu trùng.
--
-- VÌ SAO KHÔNG DÙNG seed_quiz_bank: hàm đó cố ý chỉ chạy trên bảng rỗng và cố ý
-- bỏ qua chống trùng (để mang được 9 cụm trùng có sẵn của bộ gốc vào). Nạp thêm
-- là việc ngược lại: bảng đã có dữ liệu, và trùng thì phải BỎ chứ không mang vào.
--
-- VÌ SAO PHẢI LÀ HÀM CHỨ KHÔNG INSERT THẲNG TỪ CLIENT: trigger chống trùng nổ
-- exception, mà một exception làm đổ cả câu INSERT. Nạp 500 câu mà 30 câu trùng
-- thì mất cả 500. Hàm này chạy vòng lặp, mỗi dòng một khối BEGIN...EXCEPTION —
-- plpgsql tự đặt savepoint quanh khối đó — nên một dòng lỗi chỉ mất dòng đó.
--
-- VÌ SAO KHÔNG TẮT TRIGGER: trigger là chốt thật, nạp thêm chỉ được đi qua nó
-- chứ không được vòng qua nó. Hàm tự lọc trước để trigger không phải nổ, còn nếu
-- có nổ (đua ghi) thì khối EXCEPTION hứng và ghi vào báo cáo.
--
-- BA LOẠI BỊ BỎ, BÁO CÁO RIÊNG TỪNG LOẠI:
--   trung_trong_ngan_hang  — đã có câu cùng nội dung trong bảng
--   trung_trong_file       — file tự trùng với chính nó; giữ bản đầu, bỏ bản sau
--   khong_hop_le          — thiếu nội dung, thiếu lựa chọn, đáp án trỏ ra ngoài…
--
-- CÂU TRÙNG NỘI DUNG NHƯNG KHÁC ĐÁP ÁN cũng bị bỏ như mọi câu trùng, và **liệt
-- kê riêng** ở khoá lech_dap_an. Hệ thống không tự chọn bản nào — cùng nguyên tắc
-- với 3 cụm lệch đáp án của bộ gốc. Bỏ âm thầm là để người dùng tưởng đã nạp.

BEGIN;

CREATE OR REPLACE FUNCTION public.import_quiz_questions(p_questions jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
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
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = auth.uid()) THEN
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
  'Nạp thêm bộ câu hỏi vào bảng đã có dữ liệu. Tự bỏ câu trùng nội dung (so bằng quiz_normalize_text) cả với bảng lẫn với chính file, tự bỏ câu không hợp lệ, trả báo cáo từng loại. Câu trùng nội dung mà khác đáp án được liệt kê riêng ở lech_dap_an để người có thẩm quyền quyết.';

COMMIT;


-- Đối chiếu: hàm tồn tại và authenticated gọi được.
SELECT p.proname AS ham, p.prosecdef AS security_definer,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') AS authenticated_goi_duoc
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname IN ('seed_quiz_bank', 'import_quiz_questions')
ORDER BY 1;
