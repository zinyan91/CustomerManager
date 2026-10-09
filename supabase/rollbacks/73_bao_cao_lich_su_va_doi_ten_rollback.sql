-- Gỡ migration 73. CẢNH BÁO: xóa mọi mốc phiên bản đã lưu. Nhật ký thao tác và nội dung hiện hành không bị ảnh hưởng.
DROP FUNCTION IF EXISTS public.office_rename_document(uuid, text);
DROP FUNCTION IF EXISTS public.office_restore_version(uuid, bigint);
DROP FUNCTION IF EXISTS public.office_list_versions(uuid);
DROP FUNCTION IF EXISTS public.office_save_version(uuid, bigint, text, jsonb);
DROP POLICY IF EXISTS "office_versions_select" ON public."OfficeDocumentVersions";
DROP TABLE IF EXISTS public."OfficeDocumentVersions";
