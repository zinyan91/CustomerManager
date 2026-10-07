-- Gỡ migration 69: bỏ hàm chuyển repo sang Drive. Không đụng dữ liệu đã chuyển (repo đã ở Drive vẫn ở Drive;
-- muốn trả một repo về Hugging Face dùng câu lệnh quay lui ghi ở đầu migration 69).
DROP FUNCTION IF EXISTS public.switch_storage_repo_to_drive(bigint, text, jsonb);
