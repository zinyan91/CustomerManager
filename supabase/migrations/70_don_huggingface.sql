-- =====================================================================
-- Migration 70: dọn Hugging Face khỏi CSDL (kho lưu trữ chỉ còn Google Drive)
-- =====================================================================
-- Mọi repo đã ở Drive, mọi tệp của văn bản đã tham chiếu bằng mã tệp Drive. Migration này:
--   1. Sao lưu StorageRepos (kể cả Provider, Folder, LegacyRepoId = tên repo Hugging Face cũ) sang bảng khóa kín,
--      để còn tra được repo cũ nếu cần đối chiếu.
--   2. Xóa token Hugging Face (SystemConfig khóa hf_config) và chính sách mod_hf_config chỉ phục vụ khóa đó.
--      Token KHÔNG được sao lưu: thu hồi nó ở Hugging Face (Settings > Access Tokens).
--   3. Bỏ hàm chuyển repo sang Drive và các cột Provider, Folder, LegacyRepoId.
--   4. update_storage_repo chỉ còn (id, tên, ID thư mục Drive): đổi ID thì trỏ lại tệp của văn bản như trước.
-- Không đụng dữ liệu trên Hugging Face. Gỡ lại: supabase/rollbacks/70_don_huggingface_rollback.sql
-- =====================================================================

CREATE TABLE IF NOT EXISTS public."StorageRepos_backup_20261008" AS TABLE public."StorageRepos";
ALTER TABLE public."StorageRepos_backup_20261008" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."StorageRepos_backup_20261008" FROM anon, authenticated;

DROP POLICY IF EXISTS "mod_hf_config" ON public."SystemConfig";
DELETE FROM public."SystemConfig" WHERE "Key" = 'hf_config';

DROP FUNCTION IF EXISTS public.switch_storage_repo_to_drive(bigint, text, jsonb);
DROP FUNCTION IF EXISTS public.update_storage_repo(bigint, text, text, text);

ALTER TABLE public."StorageRepos" DROP CONSTRAINT IF EXISTS "StorageRepos_Provider_check";
ALTER TABLE public."StorageRepos"
  DROP COLUMN IF EXISTS "Provider",
  DROP COLUMN IF EXISTS "Folder",
  DROP COLUMN IF EXISTS "LegacyRepoId";

CREATE OR REPLACE FUNCTION public.update_storage_repo(p_id bigint, p_name text, p_repo_id text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_repo text;
  docs     integer := 0;
  disp     integer := 0;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Chỉ Master Admin được sửa repo.' USING ERRCODE = '42501';
  END IF;
  IF btrim(coalesce(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Nhập tên hiển thị của repo.';
  END IF;
  IF p_repo_id IS NULL OR p_repo_id !~ '^[A-Za-z0-9_-]{10,}$' THEN
    RAISE EXCEPTION 'ID thư mục Google Drive chỉ gồm chữ không dấu, số, "-" hoặc "_" (từ 10 ký tự).';
  END IF;

  SELECT "RepoId" INTO old_repo FROM public."StorageRepos" WHERE "Id" = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy repo cần sửa.';
  END IF;

  IF p_repo_id <> old_repo AND EXISTS (SELECT 1 FROM public."StorageRepos" WHERE "RepoId" = p_repo_id AND "Id" <> p_id) THEN
    RAISE EXCEPTION 'Repository ID này đã được repo khác dùng.';
  END IF;

  UPDATE public."StorageRepos" SET "Name" = btrim(p_name), "RepoId" = p_repo_id WHERE "Id" = p_id;

  IF p_repo_id <> old_repo THEN
    UPDATE public."OfficialDocuments" d
    SET "Files" = (
      SELECT coalesce(jsonb_agg(
               CASE WHEN t.f ->> 'repoId' = old_repo THEN jsonb_set(t.f, '{repoId}', to_jsonb(p_repo_id)) ELSE t.f END
               ORDER BY t.ord), '[]'::jsonb)
      FROM jsonb_array_elements(d."Files") WITH ORDINALITY AS t(f, ord)
    )
    WHERE EXISTS (SELECT 1 FROM jsonb_array_elements(d."Files") e WHERE e ->> 'repoId' = old_repo);
    GET DIAGNOSTICS docs = ROW_COUNT;

    UPDATE public."Dispatches" SET "RepoId" = p_repo_id WHERE "RepoId" = old_repo;
    GET DIAGNOSTICS disp = ROW_COUNT;
  END IF;

  RETURN jsonb_build_object('documents', docs, 'dispatches', disp);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_storage_repo(bigint, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_storage_repo(bigint, text, text) TO authenticated;
