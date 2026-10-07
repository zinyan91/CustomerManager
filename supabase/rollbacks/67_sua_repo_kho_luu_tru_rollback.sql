-- Gỡ migration 67: bỏ hàm sửa repo. Không hoàn tác các lần đã sửa.
DROP FUNCTION IF EXISTS public.update_storage_repo(bigint, text, text, text);
