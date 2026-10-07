-- =====================================================================
-- Migration 68: Kho lưu trữ có thể nằm trên Google Drive (Shared Drive)
-- =====================================================================
-- Mỗi repo có nhà cung cấp lưu trữ: 'huggingface' (mặc định, mọi repo hiện có) hoặc 'drive'.
-- Repo Drive: RepoId là ID thư mục gốc của kho trong Shared Drive (không phải owner/ten-repo).
-- LegacyRepoId giữ repo Hugging Face cũ khi chuyển sang Drive, để quay lui được.
-- Chỉ thêm cột: không đụng dữ liệu cũ. update_storage_repo kiểm tra RepoId theo nhà cung cấp.
-- Gỡ lại: supabase/rollbacks/68_kho_luu_tru_google_drive_rollback.sql
-- =====================================================================

ALTER TABLE public."StorageRepos"
  ADD COLUMN IF NOT EXISTS "Provider" text NOT NULL DEFAULT 'huggingface',
  ADD COLUMN IF NOT EXISTS "LegacyRepoId" text;

ALTER TABLE public."StorageRepos" DROP CONSTRAINT IF EXISTS "StorageRepos_Provider_check";
ALTER TABLE public."StorageRepos"
  ADD CONSTRAINT "StorageRepos_Provider_check" CHECK ("Provider" IN ('huggingface', 'drive'));

COMMENT ON COLUMN public."StorageRepos"."Provider" IS
  'Nơi lưu tệp: huggingface (RepoId = owner/ten-repo) hoặc drive (RepoId = ID thư mục gốc trong Shared Drive).';
COMMENT ON COLUMN public."StorageRepos"."LegacyRepoId" IS
  'Repo Hugging Face trước khi chuyển sang Drive, giữ để quay lui.';

CREATE OR REPLACE FUNCTION public.update_storage_repo(p_id bigint, p_name text, p_repo_id text, p_folder text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_repo   text;
  provider   text;
  new_folder text;
  docs       integer := 0;
  disp       integer := 0;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Chỉ Master Admin được sửa repo.' USING ERRCODE = '42501';
  END IF;
  IF btrim(coalesce(p_name, '')) = '' THEN
    RAISE EXCEPTION 'Nhập tên hiển thị của repo.';
  END IF;

  SELECT "RepoId", "Provider" INTO old_repo, provider FROM public."StorageRepos" WHERE "Id" = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy repo cần sửa.';
  END IF;

  IF provider = 'drive' THEN
    IF p_repo_id IS NULL OR p_repo_id !~ '^[A-Za-z0-9_-]{10,}$' THEN
      RAISE EXCEPTION 'ID thư mục Google Drive chỉ gồm chữ không dấu, số, "-" hoặc "_" (từ 10 ký tự).';
    END IF;
  ELSIF p_repo_id IS NULL OR p_repo_id !~ '^[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._-]*$' THEN
    RAISE EXCEPTION 'Repository ID cần dạng owner/ten-repo, chỉ gồm chữ không dấu, số, "-", "_" hoặc ".".';
  END IF;

  IF p_repo_id <> old_repo AND EXISTS (SELECT 1 FROM public."StorageRepos" WHERE "RepoId" = p_repo_id AND "Id" <> p_id) THEN
    RAISE EXCEPTION 'Repository ID này đã được repo khác dùng.';
  END IF;

  new_folder := nullif(regexp_replace(btrim(coalesce(p_folder, '')), '^/+|/+$', '', 'g'), '');

  UPDATE public."StorageRepos"
  SET "Name" = btrim(p_name), "RepoId" = p_repo_id, "Folder" = new_folder
  WHERE "Id" = p_id;

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

REVOKE EXECUTE ON FUNCTION public.update_storage_repo(bigint, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_storage_repo(bigint, text, text, text) TO authenticated;
