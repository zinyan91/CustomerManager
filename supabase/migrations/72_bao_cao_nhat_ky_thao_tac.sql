-- =====================================================================
-- Migration 72: nhật ký thao tác của bảng tính chung (giai đoạn 2 của "cùng sửa nhiều người")
-- =====================================================================
-- Cần migration 71 đã áp. Máy chủ KHÔNG áp thay đổi lên nội dung: nó chỉ xếp thứ tự (gán số thứ tự dưới khóa dòng) và ghi
-- lại; mỗi máy tự áp theo đúng số thứ tự nên mọi máy ra cùng một kết quả. Nội dung (cột Data) là bản chụp ở số thứ tự SnapSeq;
-- bản hiện hành = Data + các thao tác có số thứ tự lớn hơn SnapSeq. Không xóa thao tác nào (nhật ký và lịch sử dựa vào đó).
--
--   OfficeDocumentOps    nhật ký thao tác: số thứ tự, người gửi, mã máy (để nhận ra thao tác của chính mình), thay đổi, tóm tắt
--   OfficeDocuments.SnapSeq  số thứ tự mà Data đang ứng với
--   office_append_op     ghi một thao tác, trả số thứ tự (chủ và người được sửa)
--   office_list_ops      các thao tác sau một số thứ tự, để tải bù và để dựng bản hiện hành (ai có quyền đọc)
--   office_save_snapshot ghi lại bản chụp ở một số thứ tự đã có để lần mở sau chỉ phát lại ít thao tác (chủ và người được sửa)
--   office_save_document (đổi) vẫn ghi cả nội dung như giai đoạn 1 nhưng nay cũng ghi một thao tác "reset" để các máy khác tải lại bản chụp
--   office_get_document  (đổi) trả thêm snap_seq
-- Bảng nhật ký được thêm vào publication supabase_realtime; RLS vẫn áp lên luồng nên người không có quyền đọc không nhận được gì.
-- Gỡ lại: supabase/rollbacks/72_bao_cao_nhat_ky_thao_tac_rollback.sql
-- ÁP DỤNG: sau migration 71, TRƯỚC khi deploy mã dùng chúng.
-- =====================================================================

-- Tài liệu có sẵn: Data đang ứng với LastSeq. Tài liệu mới (office_create_document) bắt đầu ở số thứ tự 1 nên mặc định 1.
-- Chỉ chạy một lần: chạy lại không được đặt SnapSeq về LastSeq vì khi đó đã có thao tác sau bản chụp.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'OfficeDocuments' AND column_name = 'SnapSeq') THEN
    ALTER TABLE public."OfficeDocuments" ADD COLUMN "SnapSeq" bigint NOT NULL DEFAULT 1;
    UPDATE public."OfficeDocuments" SET "SnapSeq" = "LastSeq";
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public."OfficeDocumentOps" (
  "Id"        bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "DocId"     uuid NOT NULL REFERENCES public."OfficeDocuments"("Id") ON DELETE CASCADE,
  "Seq"       bigint NOT NULL,
  "UserId"    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "ClientId"  text NOT NULL DEFAULT '',
  "Patch"     jsonb NOT NULL,
  "Summary"   jsonb NOT NULL DEFAULT '{}'::jsonb,
  "CreatedAt" timestamptz NOT NULL DEFAULT now(),
  UNIQUE ("DocId", "Seq")
);

ALTER TABLE public."OfficeDocumentOps" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "office_ops_select" ON public."OfficeDocumentOps";
CREATE POLICY "office_ops_select" ON public."OfficeDocumentOps"
  FOR SELECT TO authenticated
  USING (public.office_role_of("DocId") IS NOT NULL);

REVOKE ALL ON public."OfficeDocumentOps" FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public."OfficeDocumentOps" TO authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'OfficeDocumentOps') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public."OfficeDocumentOps";
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- Hàm
-- ---------------------------------------------------------------------
-- Ghi một thao tác. Giới hạn 1 MB một thao tác: thao tác lớn hơn (dán hàng chục nghìn ô) gửi bằng office_save_document.
CREATE OR REPLACE FUNCTION public.office_append_op(p_doc uuid, p_client text, p_patch jsonb, p_summary jsonb DEFAULT '{}'::jsonb)
RETURNS bigint
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text;
  new_seq bigint;
BEGIN
  PERFORM public.office_require_user();
  IF p_patch IS NULL OR jsonb_typeof(p_patch) <> 'array' THEN
    RAISE EXCEPTION 'Thao tác không hợp lệ.' USING ERRCODE = '22023';
  END IF;
  IF octet_length(p_patch::text) > 1024 * 1024 THEN
    RAISE EXCEPTION 'Thao tác lớn hơn 1 MB, hãy lưu cả bảng tính thay vì gửi từng thao tác.' USING ERRCODE = '54000';
  END IF;
  who := public.office_role_of(p_doc);
  IF who IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy tài liệu này hoặc bạn không có quyền.' USING ERRCODE = '42501';
  END IF;
  IF who NOT IN ('owner', 'editor') THEN
    RAISE EXCEPTION 'Bạn chỉ có quyền xem tài liệu này.' USING ERRCODE = '42501';
  END IF;

  -- Khóa dòng tài liệu: các lần ghi đồng thời xếp hàng, số thứ tự không trùng và tăng đều.
  SELECT "LastSeq" + 1 INTO new_seq FROM public."OfficeDocuments" WHERE "Id" = p_doc FOR UPDATE;
  INSERT INTO public."OfficeDocumentOps" ("DocId", "Seq", "UserId", "ClientId", "Patch", "Summary")
  VALUES (p_doc, new_seq, auth.uid(), left(coalesce(p_client, ''), 64), p_patch, coalesce(p_summary, '{}'::jsonb));
  UPDATE public."OfficeDocuments" SET "LastSeq" = new_seq, "UpdatedAt" = now(), "UpdatedBy" = auth.uid() WHERE "Id" = p_doc;
  RETURN new_seq;
END;
$$;

-- Các thao tác có số thứ tự lớn hơn p_after, tối đa 1000, theo thứ tự tăng dần.
CREATE OR REPLACE FUNCTION public.office_list_ops(p_doc uuid, p_after bigint)
RETURNS TABLE (seq bigint, user_id uuid, client_id text, patch jsonb, summary jsonb, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.office_require_user();
  IF public.office_role_of(p_doc) IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy tài liệu này hoặc bạn không có quyền xem.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY
  SELECT o."Seq", o."UserId", o."ClientId", o."Patch", o."Summary", o."CreatedAt"
  FROM public."OfficeDocumentOps" o
  WHERE o."DocId" = p_doc AND o."Seq" > coalesce(p_after, 0)
  ORDER BY o."Seq"
  LIMIT 1000;
END;
$$;

-- Ghi bản chụp ở số thứ tự p_seq (đã có thao tác, chưa ghi bản chụp) để lần mở sau chỉ phát lại các thao tác sau đó.
CREATE OR REPLACE FUNCTION public.office_save_snapshot(p_doc uuid, p_seq bigint, p_data jsonb)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  who text;
  snap bigint;
  last_s bigint;
BEGIN
  PERFORM public.office_require_user();
  PERFORM public.office_check_size(p_data);
  who := public.office_role_of(p_doc);
  IF who IS NULL OR who NOT IN ('owner', 'editor') THEN
    RAISE EXCEPTION 'Bạn không có quyền ghi bản chụp của tài liệu này.' USING ERRCODE = '42501';
  END IF;
  SELECT "SnapSeq", "LastSeq" INTO snap, last_s FROM public."OfficeDocuments" WHERE "Id" = p_doc FOR UPDATE;
  IF p_seq IS NULL OR p_seq <= snap OR p_seq > last_s THEN
    -- Bản chụp cũ hơn hoặc không tồn tại: bỏ qua lặng lẽ (người khác đã ghi bản chụp mới hơn), không phải lỗi.
    RETURN;
  END IF;
  UPDATE public."OfficeDocuments" SET "Data" = p_data, "SnapSeq" = p_seq WHERE "Id" = p_doc;
END;
$$;

-- Giai đoạn 1 đổi nhẹ: ghi cả nội dung, bản chụp ở đúng số thứ tự mới, và một thao tác "reset" để các máy khác tải lại bản chụp.
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

-- Kiểu trả về đổi (thêm snap_seq) nên phải bỏ hàm cũ trước.
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

REVOKE EXECUTE ON FUNCTION
  public.office_append_op(uuid, text, jsonb, jsonb), public.office_list_ops(uuid, bigint), public.office_save_snapshot(uuid, bigint, jsonb),
  public.office_get_document(uuid)
FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION
  public.office_append_op(uuid, text, jsonb, jsonb), public.office_list_ops(uuid, bigint), public.office_save_snapshot(uuid, bigint, jsonb),
  public.office_get_document(uuid)
TO authenticated;
