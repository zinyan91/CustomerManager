-- =====================================================================
-- Migration 74: chia sẻ Văn bản (Writer) cho từng tài khoản, sửa lần lượt
-- =====================================================================
-- Cần migration 71, 72, 73. Văn bản dùng lại cùng bảng, thành viên, mốc, nhật ký với bảng tính chung; chỉ thêm loại 'writer'.
-- Văn bản lưu cả khối qua office_save_document (khóa lạc quan theo LastSeq, lệch thì lỗi 40001), không dùng nhật ký từng ô.
--
--   OfficeDocuments."Kind"        nhận thêm 'writer'
--   office_create_document        thêm tham số p_kind (mặc định 'calc', nên lời gọi cũ vẫn chạy)
--   office_list_documents         trả thêm kind
--   office_get_document           trả thêm kind
--   office_save_document          văn bản ghi tóm tắt {"kind":"save"} để nhật ký ghi "Lưu văn bản" (bảng tính giữ {"kind":"reset"})
-- Không xóa dữ liệu. Gỡ lại: supabase/rollbacks/74_van_ban_chia_se_rollback.sql
-- ÁP DỤNG: sau migration 73, TRƯỚC khi deploy mã Văn bản chung.
-- =====================================================================

ALTER TABLE public."OfficeDocuments" DROP CONSTRAINT IF EXISTS "OfficeDocuments_Kind_check";
ALTER TABLE public."OfficeDocuments" ADD CONSTRAINT "OfficeDocuments_Kind_check" CHECK ("Kind" IN ('calc', 'writer'));

DROP FUNCTION IF EXISTS public.office_create_document(text, jsonb);
CREATE OR REPLACE FUNCTION public.office_create_document(p_title text, p_data jsonb, p_kind text DEFAULT 'calc')
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  PERFORM public.office_require_user();
  IF p_kind IS NULL OR p_kind NOT IN ('calc', 'writer') THEN
    RAISE EXCEPTION 'Loại tài liệu không hợp lệ.' USING ERRCODE = '22023';
  END IF;
  PERFORM public.office_check_size(p_data);
  INSERT INTO public."OfficeDocuments" ("Kind", "Title", "OwnerId", "Data", "UpdatedBy")
  VALUES (p_kind, left(coalesce(p_title, ''), 200), auth.uid(), p_data, auth.uid())
  RETURNING "Id" INTO new_id;
  RETURN new_id;
END;
$$;

-- Kiểu trả về đổi (thêm kind) nên phải bỏ hàm cũ trước.
DROP FUNCTION IF EXISTS public.office_list_documents();
CREATE FUNCTION public.office_list_documents()
RETURNS TABLE (id uuid, title text, owner_id uuid, owner_name text, role text, updated_at timestamptz, last_seq bigint, kind text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.office_require_user();
  RETURN QUERY
  SELECT d."Id", d."Title", d."OwnerId", coalesce(nullif(btrim(r."FullName"), ''), ''), public.office_role_of(d."Id"), d."UpdatedAt", d."LastSeq", d."Kind"
  FROM public."OfficeDocuments" d
  LEFT JOIN public."UserRoles" r ON r."UserId" = d."OwnerId"
  WHERE public.office_role_of(d."Id") IS NOT NULL
  ORDER BY d."UpdatedAt" DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.office_get_document(uuid);
CREATE FUNCTION public.office_get_document(p_doc uuid)
RETURNS TABLE (id uuid, title text, data jsonb, role text, last_seq bigint, snap_seq bigint, updated_at timestamptz, kind text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text;
BEGIN
  PERFORM public.office_require_user();
  who := public.office_role_of(p_doc);
  IF who IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy tài liệu này hoặc bạn không có quyền xem.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT d."Id", d."Title", d."Data", who, d."LastSeq", d."SnapSeq", d."UpdatedAt", d."Kind" FROM public."OfficeDocuments" d WHERE d."Id" = p_doc;
END;
$$;

CREATE OR REPLACE FUNCTION public.office_save_document(p_doc uuid, p_base_seq bigint, p_title text, p_data jsonb)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text;
  current_seq bigint;
  doc_kind text;
  new_seq bigint;
BEGIN
  PERFORM public.office_require_user();
  PERFORM public.office_check_size(p_data);
  who := public.office_role_of(p_doc);
  IF who IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy tài liệu này hoặc bạn không có quyền.' USING ERRCODE = '42501';
  END IF;
  IF who NOT IN ('owner', 'editor') THEN
    RAISE EXCEPTION 'Bạn chỉ có quyền xem tài liệu này.' USING ERRCODE = '42501';
  END IF;

  SELECT "LastSeq", "Kind" INTO current_seq, doc_kind FROM public."OfficeDocuments" WHERE "Id" = p_doc FOR UPDATE;
  IF current_seq IS DISTINCT FROM p_base_seq THEN
    RAISE EXCEPTION 'Người khác đã lưu tài liệu này trước bạn. Hãy tải lại bản mới nhất.' USING ERRCODE = '40001';
  END IF;

  new_seq := current_seq + 1;
  UPDATE public."OfficeDocuments"
  SET "Data" = p_data, "Title" = left(coalesce(p_title, ''), 200), "LastSeq" = new_seq, "SnapSeq" = new_seq, "UpdatedAt" = now(), "UpdatedBy" = auth.uid()
  WHERE "Id" = p_doc;
  INSERT INTO public."OfficeDocumentOps" ("DocId", "Seq", "UserId", "ClientId", "Patch", "Summary")
  VALUES (p_doc, new_seq, auth.uid(), '', '[{"t":"reset"}]'::jsonb, jsonb_build_object('kind', CASE WHEN doc_kind = 'writer' THEN 'save' ELSE 'reset' END));
  RETURN new_seq;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.office_create_document(text, jsonb, text), public.office_list_documents(), public.office_get_document(uuid),
  public.office_save_document(uuid, bigint, text, jsonb)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.office_create_document(text, jsonb, text), public.office_list_documents(), public.office_get_document(uuid),
  public.office_save_document(uuid, bigint, text, jsonb)
TO authenticated;
