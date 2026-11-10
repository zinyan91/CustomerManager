-- =====================================================================
-- Migration 82: bảng "Báo cáo nhanh kết quả kinh doanh" nhập tay (Trung tâm Báo cáo Excel)
-- =====================================================================
-- Một bảng dùng chung cho cả hệ thống, lưu nguyên khối JSON (cột, dòng, số liệu) ở dòng Id = 'kqkd'.
-- Số tự tính (chênh lệch, GAP) không lưu: giao diện tính lại từ số nhập (src/lib/businessResult/sheet.ts).
--
-- Quyền:
--   Xem  : mọi tài khoản đã đăng nhập có module "tools" (cùng module với trang Báo cáo Excel).
--   Sửa  : Master Admin, User Admin, và tài khoản có tên trong "BusinessResultEditors".
--   Cấp/gỡ quyền sửa: Master Admin, User Admin.
--
-- Chống ghi đè: mỗi lần lưu tăng "Version"; giao diện chỉ cập nhật khi đang giữ đúng Version hiện tại.
-- Từ 30/10/2026 bảng mới trong public không tự được GRANT, nên cấp quyền ngay trong migration.
--
-- Không đụng dữ liệu cũ. Gỡ lại: supabase/rollbacks/82_bao_cao_kqkd_rollback.sql
-- ÁP DỤNG: TRƯỚC khi deploy mã mới.
-- =====================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public."BusinessResultSheets" (
  "Id"        text PRIMARY KEY CHECK ("Id" = 'kqkd'),
  "Data"      jsonb NOT NULL,
  "Version"   bigint NOT NULL DEFAULT 1 CHECK ("Version" >= 1),
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public."BusinessResultSheets" IS
  'Bảng Báo cáo nhanh KQKD nhập tay, một dòng Id = kqkd. Data: { title, subtitle, unitNote, columns, rows }.';

CREATE TABLE IF NOT EXISTS public."BusinessResultEditors" (
  "UserId"    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "GrantedAt" timestamptz NOT NULL DEFAULT now(),
  "GrantedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public."BusinessResultEditors" IS
  'Tài khoản được sửa bảng Báo cáo nhanh KQKD. Admin luôn sửa được, không cần có tên ở đây.';

CREATE OR REPLACE FUNCTION public.can_edit_business_result()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND public.has_module('tools') AND (
    public.is_admin()
    OR EXISTS (SELECT 1 FROM public."BusinessResultEditors" WHERE "UserId" = auth.uid())
  );
$$;

REVOKE ALL ON FUNCTION public.can_edit_business_result() FROM anon;
GRANT EXECUTE ON FUNCTION public.can_edit_business_result() TO authenticated;

-- Ghi người sửa và thời điểm ở máy chủ, không tin giá trị gửi lên.
CREATE OR REPLACE FUNCTION public.business_result_stamp()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW."UpdatedAt" := now();
  NEW."UpdatedBy" := auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_business_result_stamp ON public."BusinessResultSheets";
CREATE TRIGGER trg_business_result_stamp
  BEFORE INSERT OR UPDATE ON public."BusinessResultSheets"
  FOR EACH ROW EXECUTE FUNCTION public.business_result_stamp();

GRANT SELECT, INSERT, UPDATE ON public."BusinessResultSheets" TO authenticated, service_role;
GRANT SELECT, INSERT, DELETE ON public."BusinessResultEditors" TO authenticated, service_role;
REVOKE ALL ON public."BusinessResultSheets" FROM anon;
REVOKE ALL ON public."BusinessResultEditors" FROM anon;

ALTER TABLE public."BusinessResultSheets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."BusinessResultEditors" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_result_select" ON public."BusinessResultSheets";
CREATE POLICY "business_result_select" ON public."BusinessResultSheets"
  FOR SELECT TO authenticated
  USING ((SELECT public.has_module('tools')));

DROP POLICY IF EXISTS "business_result_insert" ON public."BusinessResultSheets";
CREATE POLICY "business_result_insert" ON public."BusinessResultSheets"
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.can_edit_business_result()));

DROP POLICY IF EXISTS "business_result_update" ON public."BusinessResultSheets";
CREATE POLICY "business_result_update" ON public."BusinessResultSheets"
  FOR UPDATE TO authenticated
  USING ((SELECT public.can_edit_business_result()))
  WITH CHECK ((SELECT public.can_edit_business_result()));

-- Danh sách người được sửa: admin thấy cả danh sách, người khác chỉ thấy dòng của chính mình.
DROP POLICY IF EXISTS "business_result_editors_select" ON public."BusinessResultEditors";
CREATE POLICY "business_result_editors_select" ON public."BusinessResultEditors"
  FOR SELECT TO authenticated
  USING ("UserId" = auth.uid() OR (SELECT public.is_admin()));

DROP POLICY IF EXISTS "business_result_editors_insert" ON public."BusinessResultEditors";
CREATE POLICY "business_result_editors_insert" ON public."BusinessResultEditors"
  FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.is_admin()) AND "GrantedBy" = auth.uid());

DROP POLICY IF EXISTS "business_result_editors_delete" ON public."BusinessResultEditors";
CREATE POLICY "business_result_editors_delete" ON public."BusinessResultEditors"
  FOR DELETE TO authenticated
  USING ((SELECT public.is_admin()));

COMMIT;
