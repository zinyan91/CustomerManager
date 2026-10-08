-- =====================================================================
-- Migration 71: tài liệu Báo cáo dùng chung (giai đoạn 1 của "cùng sửa nhiều người")
-- =====================================================================
-- Một bảng tính trong tab Báo cáo có thể đưa lên hệ thống và chia sẻ cho từng tài khoản (quyền sửa hoặc chỉ xem).
-- Giai đoạn này chưa có thời gian thực: nội dung là một bản chụp, mỗi lần lưu tăng số thứ tự (LastSeq) và chỉ nhận khi
-- người lưu đang giữ đúng số thứ tự hiện tại; nếu người khác đã lưu trước thì báo xung đột (mã 40001) để không ghi đè mất.
-- Nhật ký thao tác, mốc phiên bản và đồng bộ thời gian thực thêm ở các giai đoạn sau bằng migration riêng.
--
-- Mô hình quyền:
--   owner  : người tạo. Sửa, mời, đổi quyền, gỡ, xóa tài liệu.
--   editor : được mời với quyền sửa. Đọc và lưu nội dung.
--   viewer : được mời với quyền xem. Chỉ đọc.
--   admin  : Master Admin không thuộc tài liệu. Đọc, quản lý thành viên, xóa; KHÔNG sửa nội dung.
-- Mọi hàm đều đòi đăng nhập và module "tools". Bảng khóa kín: ghi chỉ qua hàm SECURITY DEFINER.
--
-- Không đụng dữ liệu cũ (chỉ thêm bảng và hàm). Gỡ lại: supabase/rollbacks/71_bao_cao_cung_sua_rollback.sql
-- ÁP DỤNG: TRƯỚC khi deploy mã dùng chúng.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public."OfficeDocuments" (
  "Id"        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "Kind"      text NOT NULL DEFAULT 'calc' CHECK ("Kind" IN ('calc')),
  "Title"     text NOT NULL DEFAULT '',
  "OwnerId"   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "Data"      jsonb NOT NULL,
  "LastSeq"   bigint NOT NULL DEFAULT 1,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public."OfficeDocumentMembers" (
  "DocId"     uuid NOT NULL REFERENCES public."OfficeDocuments"("Id") ON DELETE CASCADE,
  "UserId"    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  "Role"      text NOT NULL CHECK ("Role" IN ('editor', 'viewer')),
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY ("DocId", "UserId")
);

CREATE INDEX IF NOT EXISTS "OfficeDocumentMembers_UserId_idx" ON public."OfficeDocumentMembers" ("UserId");
CREATE INDEX IF NOT EXISTS "OfficeDocuments_OwnerId_idx" ON public."OfficeDocuments" ("OwnerId");

COMMENT ON TABLE public."OfficeDocuments" IS 'Tài liệu Báo cáo dùng chung. Ghi chỉ qua các hàm office_*.';
COMMENT ON COLUMN public."OfficeDocuments"."LastSeq" IS 'Tăng một mỗi lần lưu; người lưu phải giữ đúng số này (khóa lạc quan).';

-- ---------------------------------------------------------------------
-- Quyền của người đang đăng nhập trên một tài liệu: owner, editor, viewer, admin hoặc NULL (không thấy).
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.office_role_of(p_doc uuid)
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL OR NOT public.has_module('tools') THEN NULL
    WHEN d."OwnerId" = auth.uid() THEN 'owner'
    ELSE coalesce(
      (SELECT m."Role" FROM public."OfficeDocumentMembers" m WHERE m."DocId" = d."Id" AND m."UserId" = auth.uid()),
      CASE WHEN public.is_master_admin() THEN 'admin' END
    )
  END
  FROM public."OfficeDocuments" d
  WHERE d."Id" = p_doc;
$$;

-- ---------------------------------------------------------------------
-- RLS: khóa kín ghi; đọc cho người có quyền đọc (nền cho Realtime ở giai đoạn sau)
-- ---------------------------------------------------------------------
ALTER TABLE public."OfficeDocuments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."OfficeDocumentMembers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office_documents_select" ON public."OfficeDocuments";
CREATE POLICY "office_documents_select" ON public."OfficeDocuments"
  FOR SELECT TO authenticated
  USING (public.office_role_of("Id") IS NOT NULL);

DROP POLICY IF EXISTS "office_members_select" ON public."OfficeDocumentMembers";
CREATE POLICY "office_members_select" ON public."OfficeDocumentMembers"
  FOR SELECT TO authenticated
  USING ("UserId" = auth.uid() OR public.office_role_of("DocId") IN ('owner', 'admin'));

REVOKE ALL ON public."OfficeDocuments", public."OfficeDocumentMembers" FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public."OfficeDocuments", public."OfficeDocumentMembers" TO authenticated;

-- ---------------------------------------------------------------------
-- Hàm
-- ---------------------------------------------------------------------
-- Giới hạn bản chung: 5 MB để một tài liệu không làm nặng CSDL và mỗi lần mở.
CREATE OR REPLACE FUNCTION public.office_require_user()
RETURNS void
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_module('tools') THEN
    RAISE EXCEPTION 'Bạn không có quyền dùng tab Báo cáo.' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.office_check_size(p_data jsonb)
RETURNS void
LANGUAGE plpgsql IMMUTABLE
SET search_path = public
AS $$
BEGIN
  IF p_data IS NULL OR jsonb_typeof(p_data) <> 'object' THEN
    RAISE EXCEPTION 'Nội dung bảng tính không hợp lệ.' USING ERRCODE = '22023';
  END IF;
  IF octet_length(p_data::text) > 5 * 1024 * 1024 THEN
    RAISE EXCEPTION 'Bảng tính lớn hơn 5 MB, không đưa lên hệ thống được. Hãy chia nhỏ hoặc bỏ bớt ảnh.' USING ERRCODE = '54000';
  END IF;
END;
$$;

-- Đưa một bản nháp lên hệ thống: người gọi thành chủ.
CREATE OR REPLACE FUNCTION public.office_create_document(p_title text, p_data jsonb)
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

-- Danh sách tài liệu thấy được, không kèm nội dung.
CREATE OR REPLACE FUNCTION public.office_list_documents()
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

-- Mở một tài liệu: nội dung kèm quyền của người mở và số thứ tự hiện tại.
CREATE OR REPLACE FUNCTION public.office_get_document(p_doc uuid)
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

-- Lưu nội dung: chỉ chủ và người được quyền sửa; phải giữ đúng số thứ tự, nếu không là xung đột (40001).
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

-- Tài khoản có thể mời: chỉ mã và họ tên, không email. Không gồm chính mình và tài khoản chưa gán vai trò.
CREATE OR REPLACE FUNCTION public.office_invitable_users()
RETURNS TABLE (id uuid, full_name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.office_require_user();
  RETURN QUERY
  SELECT r."UserId", coalesce(nullif(btrim(r."FullName"), ''), '')
  FROM public."UserRoles" r
  WHERE r."Role" IS NOT NULL AND r."UserId" <> auth.uid()
  ORDER BY 2, 1;
END;
$$;

-- Thành viên của một tài liệu: chỉ chủ và Master Admin xem.
CREATE OR REPLACE FUNCTION public.office_list_members(p_doc uuid)
RETURNS TABLE (user_id uuid, full_name text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.office_require_user();
  IF coalesce(public.office_role_of(p_doc), '') NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Chỉ chủ tài liệu hoặc Master Admin xem được danh sách chia sẻ.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT m."UserId", coalesce(nullif(btrim(r."FullName"), ''), ''), m."Role"
  FROM public."OfficeDocumentMembers" m
  LEFT JOIN public."UserRoles" r ON r."UserId" = m."UserId"
  WHERE m."DocId" = p_doc
  ORDER BY m."CreatedAt";
END;
$$;

-- Mời, đổi quyền hoặc gỡ (p_role NULL là gỡ): chỉ chủ và Master Admin.
CREATE OR REPLACE FUNCTION public.office_set_member(p_doc uuid, p_user uuid, p_role text)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owner uuid;
BEGIN
  PERFORM public.office_require_user();
  IF public.office_role_of(p_doc) IS NULL OR public.office_role_of(p_doc) NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Chỉ chủ tài liệu hoặc Master Admin đổi được việc chia sẻ.' USING ERRCODE = '42501';
  END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('editor', 'viewer') THEN
    RAISE EXCEPTION 'Quyền chia sẻ chỉ có "sửa" hoặc "xem".' USING ERRCODE = '22023';
  END IF;
  SELECT "OwnerId" INTO owner FROM public."OfficeDocuments" WHERE "Id" = p_doc;
  IF p_user = owner THEN
    RAISE EXCEPTION 'Chủ tài liệu luôn có quyền sửa, không cần mời.' USING ERRCODE = '22023';
  END IF;
  IF p_role IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public."UserRoles" WHERE "UserId" = p_user AND "Role" IS NOT NULL) THEN
    RAISE EXCEPTION 'Không tìm thấy tài khoản cần mời.' USING ERRCODE = '22023';
  END IF;

  IF p_role IS NULL THEN
    DELETE FROM public."OfficeDocumentMembers" WHERE "DocId" = p_doc AND "UserId" = p_user;
  ELSE
    INSERT INTO public."OfficeDocumentMembers" ("DocId", "UserId", "Role") VALUES (p_doc, p_user, p_role)
    ON CONFLICT ("DocId", "UserId") DO UPDATE SET "Role" = EXCLUDED."Role";
  END IF;
END;
$$;

-- Xóa tài liệu và việc chia sẻ của nó: chỉ chủ và Master Admin.
CREATE OR REPLACE FUNCTION public.office_delete_document(p_doc uuid)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.office_require_user();
  IF public.office_role_of(p_doc) IS NULL OR public.office_role_of(p_doc) NOT IN ('owner', 'admin') THEN
    RAISE EXCEPTION 'Chỉ chủ tài liệu hoặc Master Admin xóa được tài liệu này.' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public."OfficeDocuments" WHERE "Id" = p_doc;
END;
$$;

REVOKE EXECUTE ON FUNCTION
  public.office_role_of(uuid), public.office_require_user(), public.office_check_size(jsonb),
  public.office_create_document(text, jsonb), public.office_list_documents(), public.office_get_document(uuid),
  public.office_save_document(uuid, bigint, text, jsonb), public.office_invitable_users(), public.office_list_members(uuid),
  public.office_set_member(uuid, uuid, text), public.office_delete_document(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.office_role_of(uuid), public.office_create_document(text, jsonb), public.office_list_documents(), public.office_get_document(uuid),
  public.office_save_document(uuid, bigint, text, jsonb), public.office_invitable_users(), public.office_list_members(uuid),
  public.office_set_member(uuid, uuid, text), public.office_delete_document(uuid)
TO authenticated;
