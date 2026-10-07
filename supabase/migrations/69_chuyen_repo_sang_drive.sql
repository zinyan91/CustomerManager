-- =====================================================================
-- Migration 69: chuyển một repo Hugging Face sang Google Drive (một giao dịch)
-- =====================================================================
-- Công cụ chuyển dữ liệu (Master Admin) chép từng tệp từ Hugging Face lên Drive, đối chiếu dung lượng, rồi gọi hàm này
-- để đổi repo sang Drive và trỏ lại tệp của văn bản bằng mã tệp Drive, tất cả trong MỘT giao dịch: lỗi thì không đổi gì.
--
-- p_files: mảng JSON [{"from": "<đường dẫn tệp trên Hugging Face>", "path": "<đường dẫn trong kho Drive>", "fileId": "<mã tệp Drive>"}].
-- Tệp trong OfficialDocuments.Files có repoId = repo cũ và path trùng "from" sẽ được ghi lại repoId, path, fileId;
-- tệp không có trong p_files giữ nguyên (đếm là files_unmapped, thường là tham chiếu đã hỏng từ trước).
--
-- Không xóa gì: repo Hugging Face cũ nằm ở LegacyRepoId, Folder giữ nguyên. Quay lui một repo (tệp của văn bản đã có mã Drive nên vẫn mở được):
--   UPDATE public."StorageRepos" SET "Provider" = 'huggingface', "RepoId" = "LegacyRepoId", "LegacyRepoId" = NULL WHERE "Id" = <id>;
-- Gỡ hàm: supabase/rollbacks/69_chuyen_repo_sang_drive_rollback.sql
-- =====================================================================

CREATE OR REPLACE FUNCTION public.switch_storage_repo_to_drive(p_id bigint, p_drive_root text, p_files jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_repo  text;
  v_provider  text;
  v_dispatch  integer;
  v_docs      integer := 0;
  v_remapped  integer := 0;
  v_unmapped  integer := 0;
BEGIN
  IF NOT public.is_master_admin() THEN
    RAISE EXCEPTION 'Chỉ Master Admin được chuyển repo sang Google Drive.' USING ERRCODE = '42501';
  END IF;

  IF p_drive_root IS NULL OR p_drive_root !~ '^[A-Za-z0-9_-]{10,}$' THEN
    RAISE EXCEPTION 'ID thư mục Google Drive chỉ gồm chữ không dấu, số, "-" hoặc "_" (từ 10 ký tự).';
  END IF;
  IF p_files IS NULL OR jsonb_typeof(p_files) <> 'array' THEN
    RAISE EXCEPTION 'Danh sách tệp đã chuyển phải là một mảng.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM jsonb_array_elements(p_files) e
    WHERE jsonb_typeof(e) <> 'object'
       OR coalesce(e ->> 'from', '') = '' OR coalesce(e ->> 'path', '') = '' OR coalesce(e ->> 'fileId', '') = ''
  ) THEN
    RAISE EXCEPTION 'Mỗi tệp đã chuyển cần đủ "from", "path" và "fileId".';
  END IF;
  IF (SELECT count(*) FROM jsonb_array_elements(p_files) e) <> (SELECT count(DISTINCT e ->> 'from') FROM jsonb_array_elements(p_files) e) THEN
    RAISE EXCEPTION 'Danh sách tệp đã chuyển có đường dẫn nguồn trùng nhau.';
  END IF;

  SELECT "RepoId", "Provider" INTO v_old_repo, v_provider FROM public."StorageRepos" WHERE "Id" = p_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy repo cần chuyển.';
  END IF;
  IF v_provider = 'drive' THEN
    RAISE EXCEPTION 'Repo này đã ở Google Drive.';
  END IF;
  IF EXISTS (SELECT 1 FROM public."StorageRepos" WHERE "RepoId" = p_drive_root AND "Id" <> p_id) THEN
    RAISE EXCEPTION 'Thư mục Drive này đã được repo khác dùng.';
  END IF;

  -- Bảng Dispatches (văn bản kiểu cũ) lưu đường dẫn và địa chỉ Hugging Face riêng, chưa hỗ trợ chuyển: từ chối thay vì để lệch
  SELECT count(*) INTO v_dispatch FROM public."Dispatches" WHERE "RepoId" = v_old_repo;
  IF v_dispatch > 0 THEN
    RAISE EXCEPTION 'Còn % dòng trong bảng Dispatches trỏ tới repo này; chưa hỗ trợ chuyển. Không đổi gì.', v_dispatch;
  END IF;

  UPDATE public."StorageRepos"
  SET "Provider" = 'drive', "LegacyRepoId" = v_old_repo, "RepoId" = p_drive_root
  WHERE "Id" = p_id;

  SELECT count(*) FILTER (WHERE m.src IS NOT NULL), count(*) FILTER (WHERE m.src IS NULL)
  INTO v_remapped, v_unmapped
  FROM public."OfficialDocuments" d
  CROSS JOIN LATERAL jsonb_array_elements(d."Files") AS t(f)
  LEFT JOIN (SELECT e ->> 'from' AS src FROM jsonb_array_elements(p_files) e) m ON m.src = t.f ->> 'path'
  WHERE t.f ->> 'repoId' = v_old_repo;

  WITH m AS (
    SELECT e ->> 'from' AS src, e ->> 'path' AS dst, e ->> 'fileId' AS fid FROM jsonb_array_elements(p_files) e
  ), changed AS (
    UPDATE public."OfficialDocuments" d
    SET "Files" = (
      SELECT coalesce(jsonb_agg(
               CASE WHEN t.f ->> 'repoId' = v_old_repo AND m.src IS NOT NULL
                    THEN t.f || jsonb_build_object('repoId', p_drive_root, 'path', m.dst, 'fileId', m.fid)
                    ELSE t.f END
               ORDER BY t.ord), '[]'::jsonb)
      FROM jsonb_array_elements(d."Files") WITH ORDINALITY AS t(f, ord)
      LEFT JOIN m ON t.f ->> 'repoId' = v_old_repo AND m.src = t.f ->> 'path'
    )
    WHERE EXISTS (
      SELECT 1 FROM jsonb_array_elements(d."Files") x JOIN m ON m.src = x ->> 'path' WHERE x ->> 'repoId' = v_old_repo
    )
    RETURNING d."Id"
  )
  SELECT count(*) INTO v_docs FROM changed;

  RETURN jsonb_build_object('documents', v_docs, 'files_remapped', v_remapped, 'files_unmapped', v_unmapped);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.switch_storage_repo_to_drive(bigint, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.switch_storage_repo_to_drive(bigint, text, jsonb) TO authenticated;
