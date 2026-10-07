-- =====================================================================
-- Migration 67: Master Admin sửa repo kho lưu trữ (tên, Repository ID, thư mục gốc)
-- =====================================================================
-- Repository ID được lưu thêm ở OfficialDocuments."Files" (mỗi tệp một đối tượng có "repoId") và
-- Dispatches."RepoId". Đổi ID mà không cập nhật các nơi đó thì văn bản mất liên kết tới tệp, nên việc
-- đổi chạy trọn trong một hàm: lỗi giữa chừng thì không đổi gì.
-- Hàm không đổi tên dataset trên Hugging Face; chỉ sửa lại cho khớp tên thật khi nhập sai.
-- Thư mục gốc chỉ là điểm bắt đầu khi duyệt kho; đường dẫn tệp của văn bản là đường dẫn đầy đủ nên không cần sửa.
-- Gỡ lại: supabase/rollbacks/67_sua_repo_kho_luu_tru_rollback.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION public.update_storage_repo(p_id bigint, p_name text, p_repo_id text, p_folder text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_repo   text;
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
  IF p_repo_id IS NULL OR p_repo_id !~ '^[A-Za-z0-9][A-Za-z0-9._-]*/[A-Za-z0-9][A-Za-z0-9._-]*$' THEN
    RAISE EXCEPTION 'Repository ID cần dạng owner/ten-repo, chỉ gồm chữ không dấu, số, "-", "_" hoặc ".".';
  END IF;

  SELECT "RepoId" INTO old_repo FROM public."StorageRepos" WHERE "Id" = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy repo cần sửa.';
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
