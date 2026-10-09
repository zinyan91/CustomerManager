-- =====================================================================
-- Migration 73: mốc phiên bản, khôi phục và đổi tên bảng tính chung (giai đoạn 4 của "cùng sửa nhiều người")
-- =====================================================================
-- Cần migration 71 và 72. Khôi phục KHÔNG xóa thao tác hay mốc nào: nó ghi nội dung của mốc đã chọn thành bản hiện hành mới
-- ở số thứ tự kế tiếp (kèm thao tác "reset" để các máy khác tải lại). Muốn quay lại thì khôi phục mốc "trước khi khôi phục"
-- mà ứng dụng tự lưu trước đó.
--
--   OfficeDocumentVersions   các mốc: số thứ tự, nhãn, nội dung đầy đủ tại số thứ tự đó, người lưu
--   office_save_version      lưu một mốc (chủ và người được sửa); nội dung do máy gửi, ứng với số thứ tự đã có
--   office_list_versions     danh sách mốc, không kèm nội dung (ai có quyền đọc)
--   office_restore_version   khôi phục một mốc (chủ và người được sửa)
--   office_rename_document   đổi tên (chủ và người được sửa), ghi một thao tác để máy khác cập nhật tên
-- Gỡ lại: supabase/rollbacks/73_bao_cao_lich_su_va_doi_ten_rollback.sql
-- ÁP DỤNG: sau migration 72, TRƯỚC khi deploy mã dùng chúng.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public."OfficeDocumentVersions" (
  "Id"        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "DocId"     uuid NOT NULL REFERENCES public."OfficeDocuments"("Id") ON DELETE CASCADE,
  "Seq"       bigint NOT NULL,
  "Label"     text NOT NULL DEFAULT '',
  "Data"      jsonb NOT NULL,
  "CreatedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "OfficeDocumentVersions_DocId_idx" ON public."OfficeDocumentVersions" ("DocId", "CreatedAt" DESC);

ALTER TABLE public."OfficeDocumentVersions" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office_versions_select" ON public."OfficeDocumentVersions";
CREATE POLICY "office_versions_select" ON public."OfficeDocumentVersions"
  FOR SELECT TO authenticated
  USING (public.office_role_of("DocId") IS NOT NULL);

REVOKE ALL ON public."OfficeDocumentVersions" FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public."OfficeDocumentVersions" TO authenticated;

-- Giới hạn 50 mốc mỗi tài liệu: mỗi mốc là cả bảng tính (tối đa 5 MB), để tài liệu không phình vô hạn. Đủ thì báo, không tự xóa.
CREATE OR REPLACE FUNCTION public.office_save_version(p_doc uuid, p_seq bigint, p_label text, p_data jsonb)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text;
  last_s bigint;
  new_id bigint;
BEGIN
  PERFORM public.office_require_user();
  PERFORM public.office_check_size(p_data);
  who := public.office_role_of(p_doc);
  IF who IS NULL OR who NOT IN ('owner', 'editor') THEN
    RAISE EXCEPTION 'Bạn không có quyền lưu mốc của tài liệu này.' USING ERRCODE = '42501';
  END IF;
  SELECT "LastSeq" INTO last_s FROM public."OfficeDocuments" WHERE "Id" = p_doc FOR UPDATE;
  IF p_seq IS NULL OR p_seq < 1 OR p_seq > last_s THEN
    RAISE EXCEPTION 'Số thứ tự của mốc không hợp lệ.' USING ERRCODE = '22023';
  END IF;
  IF (SELECT count(*) FROM public."OfficeDocumentVersions" WHERE "DocId" = p_doc) >= 50 THEN
    RAISE EXCEPTION 'Tài liệu đã có 50 mốc, không lưu thêm được.' USING ERRCODE = '54000';
  END IF;
  INSERT INTO public."OfficeDocumentVersions" ("DocId", "Seq", "Label", "Data", "CreatedBy")
  VALUES (p_doc, p_seq, left(btrim(coalesce(p_label, '')), 120), p_data, auth.uid())
  RETURNING "Id" INTO new_id;
  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.office_list_versions(p_doc uuid)
RETURNS TABLE (id bigint, seq bigint, label text, created_by uuid, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.office_require_user();
  IF public.office_role_of(p_doc) IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy tài liệu này hoặc bạn không có quyền xem.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT v."Id", v."Seq", v."Label", v."CreatedBy", v."CreatedAt"
  FROM public."OfficeDocumentVersions" v
  WHERE v."DocId" = p_doc
  ORDER BY v."CreatedAt" DESC, v."Id" DESC;
END;
$$;

-- Khôi phục: nội dung mốc thành bản hiện hành mới; không xóa gì. Trả số thứ tự mới.
CREATE OR REPLACE FUNCTION public.office_restore_version(p_doc uuid, p_version bigint)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text;
  snap jsonb;
  from_seq bigint;
  new_seq bigint;
BEGIN
  PERFORM public.office_require_user();
  who := public.office_role_of(p_doc);
  IF who IS NULL OR who NOT IN ('owner', 'editor') THEN
    RAISE EXCEPTION 'Bạn không có quyền khôi phục tài liệu này.' USING ERRCODE = '42501';
  END IF;
  SELECT "Data", "Seq" INTO snap, from_seq FROM public."OfficeDocumentVersions" WHERE "Id" = p_version AND "DocId" = p_doc;
  IF snap IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy mốc cần khôi phục.' USING ERRCODE = '22023';
  END IF;

  SELECT "LastSeq" + 1 INTO new_seq FROM public."OfficeDocuments" WHERE "Id" = p_doc FOR UPDATE;
  UPDATE public."OfficeDocuments"
  SET "Data" = snap, "LastSeq" = new_seq, "SnapSeq" = new_seq, "UpdatedAt" = now(), "UpdatedBy" = auth.uid()
  WHERE "Id" = p_doc;
  INSERT INTO public."OfficeDocumentOps" ("DocId", "Seq", "UserId", "ClientId", "Patch", "Summary")
  VALUES (p_doc, new_seq, auth.uid(), '', '[{"t":"reset"}]'::jsonb, jsonb_build_object('kind', 'reset', 'restoredFromSeq', from_seq));
  RETURN new_seq;
END;
$$;

CREATE OR REPLACE FUNCTION public.office_rename_document(p_doc uuid, p_title text)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text;
  new_seq bigint;
  clean text := left(btrim(coalesce(p_title, '')), 200);
BEGIN
  PERFORM public.office_require_user();
  who := public.office_role_of(p_doc);
  IF who IS NULL OR who NOT IN ('owner', 'editor') THEN
    RAISE EXCEPTION 'Bạn không có quyền đổi tên tài liệu này.' USING ERRCODE = '42501';
  END IF;
  SELECT "LastSeq" + 1 INTO new_seq FROM public."OfficeDocuments" WHERE "Id" = p_doc FOR UPDATE;
  UPDATE public."OfficeDocuments" SET "Title" = clean, "LastSeq" = new_seq, "UpdatedAt" = now(), "UpdatedBy" = auth.uid() WHERE "Id" = p_doc;
  INSERT INTO public."OfficeDocumentOps" ("DocId", "Seq", "UserId", "ClientId", "Patch", "Summary")
  VALUES (p_doc, new_seq, auth.uid(), '', '[]'::jsonb, jsonb_build_object('kind', 'rename', 'title', clean));
  RETURN new_seq;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.office_save_version(uuid, bigint, text, jsonb), public.office_list_versions(uuid),
  public.office_restore_version(uuid, bigint), public.office_rename_document(uuid, text)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.office_save_version(uuid, bigint, text, jsonb), public.office_list_versions(uuid),
  public.office_restore_version(uuid, bigint), public.office_rename_document(uuid, text)
TO authenticated;
