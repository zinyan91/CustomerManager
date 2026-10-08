-- Gỡ migration 71. CẢNH BÁO: xóa mọi tài liệu Báo cáo đã đưa lên hệ thống và việc chia sẻ của chúng.
-- Bản nháp trong trình duyệt của từng người không bị ảnh hưởng. Sao lưu hai bảng trước nếu cần giữ.
DROP FUNCTION IF EXISTS public.office_delete_document(uuid);
DROP FUNCTION IF EXISTS public.office_set_member(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.office_list_members(uuid);
DROP FUNCTION IF EXISTS public.office_invitable_users();
DROP FUNCTION IF EXISTS public.office_save_document(uuid, bigint, text, jsonb);
DROP FUNCTION IF EXISTS public.office_get_document(uuid);
DROP FUNCTION IF EXISTS public.office_list_documents();
DROP FUNCTION IF EXISTS public.office_create_document(text, jsonb);
DROP FUNCTION IF EXISTS public.office_check_size(jsonb);
DROP FUNCTION IF EXISTS public.office_require_user();
DROP POLICY IF EXISTS "office_members_select" ON public."OfficeDocumentMembers";
DROP POLICY IF EXISTS "office_documents_select" ON public."OfficeDocuments";
DROP FUNCTION IF EXISTS public.office_role_of(uuid);
DROP TABLE IF EXISTS public."OfficeDocumentMembers";
DROP TABLE IF EXISTS public."OfficeDocuments";
