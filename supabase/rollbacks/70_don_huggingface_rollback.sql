-- Gỡ migration 70: trả lại cột Provider, Folder, LegacyRepoId từ bảng sao lưu và hàm update_storage_repo 4 tham số.
-- KHÔNG khôi phục token Hugging Face (không được sao lưu) và hàm switch_storage_repo_to_drive (tạo lại bằng migration 69).
ALTER TABLE public."StorageRepos"
  ADD COLUMN IF NOT EXISTS "Provider" text NOT NULL DEFAULT 'drive',
  ADD COLUMN IF NOT EXISTS "Folder" text,
  ADD COLUMN IF NOT EXISTS "LegacyRepoId" text;
UPDATE public."StorageRepos" r
SET "Provider" = b."Provider", "Folder" = b."Folder", "LegacyRepoId" = b."LegacyRepoId"
FROM public."StorageRepos_backup_20261008" b WHERE b."Id" = r."Id";
ALTER TABLE public."StorageRepos" DROP CONSTRAINT IF EXISTS "StorageRepos_Provider_check";
ALTER TABLE public."StorageRepos" ADD CONSTRAINT "StorageRepos_Provider_check" CHECK ("Provider" IN ('huggingface', 'drive'));
DROP FUNCTION IF EXISTS public.update_storage_repo(bigint, text, text);
-- Tạo lại update_storage_repo 4 tham số: chạy lại phần CREATE FUNCTION trong migration 68.
