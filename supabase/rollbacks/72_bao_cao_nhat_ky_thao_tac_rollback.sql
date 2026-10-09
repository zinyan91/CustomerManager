-- Gỡ migration 72. CẢNH BÁO: xóa toàn bộ nhật ký thao tác của các bảng tính chung. Nếu đã có thao tác ghi sau bản chụp (LastSeq lớn
-- hơn SnapSeq) thì nội dung trong Data là bản cũ hơn bản hiện hành: lưu lại nội dung từ ứng dụng trước khi gỡ.
-- Đưa hai hàm về bản của migration 71.
ALTER PUBLICATION supabase_realtime DROP TABLE public."OfficeDocumentOps";
DROP FUNCTION IF EXISTS public.office_save_snapshot(uuid, bigint, jsonb);
DROP FUNCTION IF EXISTS public.office_list_ops(uuid, bigint);
DROP FUNCTION IF EXISTS public.office_append_op(uuid, text, jsonb, jsonb);
DROP POLICY IF EXISTS "office_ops_select" ON public."OfficeDocumentOps";
DROP TABLE IF EXISTS public."OfficeDocumentOps";
ALTER TABLE public."OfficeDocuments" DROP COLUMN IF EXISTS "SnapSeq";

DROP FUNCTION IF EXISTS public.office_get_document(uuid);
CREATE FUNCTION public.office_get_document(p_doc uuid)
RETURNS TABLE (id uuid, title text, data jsonb, role text, last_seq bigint, updated_at timestamptz)
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
  RETURN QUERY SELECT d."Id", d."Title", d."Data", who, d."LastSeq", d."UpdatedAt" FROM public."OfficeDocuments" d WHERE d."Id" = p_doc;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.office_get_document(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.office_get_document(uuid) TO authenticated;

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
  SET "Data" = p_data, "Title" = left(coalesce(p_title, ''), 200), "LastSeq" = new_seq, "UpdatedAt" = now(), "UpdatedBy" = auth.uid()
  WHERE "Id" = p_doc;
  RETURN new_seq;
END;
$$;
