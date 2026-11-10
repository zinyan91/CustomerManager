-- Gỡ migration 82: xóa bảng Báo cáo nhanh KQKD và danh sách người được sửa.
-- CẢNH BÁO: mất toàn bộ số liệu đã nhập. Xuất Excel từ giao diện trước khi chạy.

BEGIN;

DROP TABLE IF EXISTS public."BusinessResultEditors";
DROP TABLE IF EXISTS public."BusinessResultSheets";
DROP FUNCTION IF EXISTS public.can_edit_business_result();
DROP FUNCTION IF EXISTS public.business_result_stamp();

COMMIT;
