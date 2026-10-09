-- Gỡ migration 74. Thất bại có chủ ý nếu còn văn bản chia sẻ (Kind = 'writer'): xóa chúng là mất dữ liệu, hãy sao lưu rồi tự xử lý trước.
-- Đưa các hàm về định nghĩa của migration 71/72.
ALTER TABLE public."OfficeDocuments" DROP CONSTRAINT IF EXISTS "OfficeDocuments_Kind_check";
ALTER TABLE public."OfficeDocuments" ADD CONSTRAINT "OfficeDocuments_Kind_check" CHECK ("Kind" IN ('calc'));

DROP FUNCTION IF EXISTS public.office_create_document(text, jsonb, text);
CREATE FUNCTION public.office_create_document(p_title text, p_data jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  PERFORM public.office_require_user();
  PERFORM public.office_check_size(p_data);
  INSERT INTO public."OfficeDocuments" ("Title", "OwnerId", "Data", "UpdatedBy")
  VALUES (left(coalesce(p_title, ''), 200), auth.uid(), p_data, auth.uid())
  RETURNING "Id" INTO new_id;
  RETURN new_id;
END;
$$;

DROP FUNCTION IF EXISTS public.office_list_documents();
CREATE FUNCTION public.office_list_documents()
RETURNS TABLE (id uuid, title text, owner_id uuid, owner_name text, role text, updated_at timestamptz, last_seq bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.office_require_user();
  RETURN QUERY
  SELECT d."Id", d."Title", d."OwnerId", coalesce(nullif(btrim(r."FullName"), ''), ''), public.office_role_of(d."Id"), d."UpdatedAt", d."LastSeq"
  FROM public."OfficeDocuments" d
  LEFT JOIN public."UserRoles" r ON r."UserId" = d."OwnerId"
  WHERE public.office_role_of(d."Id") IS NOT NULL
  ORDER BY d."UpdatedAt" DESC;
END;
$$;

DROP FUNCTION IF EXISTS public.office_get_document(uuid);
CREATE FUNCTION public.office_get_document(p_doc uuid)
RETURNS TABLE (id uuid, title text, data jsonb, role text, last_seq bigint, snap_seq bigint, updated_at timestamptz)
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
  RETURN QUERY SELECT d."Id", d."Title", d."Data", who, d."LastSeq", d."SnapSeq", d."UpdatedAt" FROM public."OfficeDocuments" d WHERE d."Id" = p_doc;
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

  SELECT "LastSeq" INTO current_seq FROM public."OfficeDocuments" WHERE "Id" = p_doc FOR UPDATE;
  IF current_seq IS DISTINCT FROM p_base_seq THEN
    RAISE EXCEPTION 'Người khác đã lưu tài liệu này trước bạn. Hãy tải lại bản mới nhất.' USING ERRCODE = '40001';
  END IF;

  new_seq := current_seq + 1;
  UPDATE public."OfficeDocuments"
  SET "Data" = p_data, "Title" = left(coalesce(p_title, ''), 200), "LastSeq" = new_seq, "SnapSeq" = new_seq, "UpdatedAt" = now(), "UpdatedBy" = auth.uid()
  WHERE "Id" = p_doc;
  INSERT INTO public."OfficeDocumentOps" ("DocId", "Seq", "UserId", "ClientId", "Patch", "Summary")
  VALUES (p_doc, new_seq, auth.uid(), '', '[{"t":"reset"}]'::jsonb, '{"kind":"reset"}'::jsonb);
  RETURN new_seq;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.office_create_document(text, jsonb), public.office_list_documents(), public.office_get_document(uuid),
  public.office_save_document(uuid, bigint, text, jsonb)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.office_create_document(text, jsonb), public.office_list_documents(), public.office_get_document(uuid),
  public.office_save_document(uuid, bigint, text, jsonb)
TO authenticated;
