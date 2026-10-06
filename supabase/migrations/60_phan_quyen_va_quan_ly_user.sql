-- =====================================================================
-- Migration 60: Phân quyền 3 cấp, cấu hình hệ thống, siết RLS văn thư
-- =====================================================================
-- Master Admin : toàn quyền (phân quyền, cấu hình HF, xóa vĩnh viễn KH)
-- User Admin   : xem/sửa KH mọi tài khoản, gán/chuyển KH, xóa tệp kho;
--                KHÔNG phân quyền, KHÔNG cấu hình HF, KHÔNG xóa vĩnh viễn KH
-- User         : chỉ KH của mình, upload/tải tệp kho
--
-- ÁP DỤNG: sau migration 59 (bảng Dispatches), TRƯỚC khi deploy mã mới.
-- Ma trận quyền phía giao diện ở src/lib/permissions.ts — đổi một nơi phải
-- đổi nơi kia.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Vai trò: admin -> master_admin, banker -> user
-- ---------------------------------------------------------------------
ALTER TABLE public."UserRoles"
  DROP CONSTRAINT IF EXISTS "UserRoles_Role_check";

UPDATE public."UserRoles" SET "Role" = 'master_admin' WHERE "Role" = 'admin';
UPDATE public."UserRoles" SET "Role" = 'user'         WHERE "Role" = 'banker';

ALTER TABLE public."UserRoles"
  ADD CONSTRAINT "UserRoles_Role_check"
  CHECK ("Role" IN ('master_admin', 'user_admin', 'user'));

COMMENT ON TABLE public."UserRoles" IS
  'Phân quyền: master_admin (toàn quyền), user_admin (quản trị dữ liệu), user (chuyên viên tín dụng).';

-- ---------------------------------------------------------------------
-- 2. Hàm kiểm tra quyền
-- ---------------------------------------------------------------------
-- is_admin(): Master Admin hoặc User Admin. Các policy cũ dùng is_admin()
-- nên User Admin tự có quyền "gần đầy đủ" trên các bảng đó.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."UserRoles"
    WHERE "UserId" = auth.uid() AND "Role" IN ('master_admin', 'user_admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_master_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."UserRoles"
    WHERE "UserId" = auth.uid() AND "Role" = 'master_admin'
  );
$$;

-- ---------------------------------------------------------------------
-- 3. Chặn hạ quyền / xóa Master Admin cuối cùng (tránh khóa hệ thống)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_last_master_admin()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF OLD."Role" = 'master_admin'
     AND (TG_OP = 'DELETE' OR NEW."Role" <> 'master_admin') THEN
    IF NOT EXISTS (
      SELECT 1 FROM public."UserRoles"
      WHERE "Role" = 'master_admin' AND "UserId" <> OLD."UserId"
    ) THEN
      RAISE EXCEPTION 'Không thể hạ quyền hoặc xóa Master Admin cuối cùng.';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_last_master_admin ON public."UserRoles";
CREATE TRIGGER trg_guard_last_master_admin
  BEFORE UPDATE OR DELETE ON public."UserRoles"
  FOR EACH ROW EXECUTE FUNCTION public.guard_last_master_admin();

-- ---------------------------------------------------------------------
-- 4. RLS UserRoles: đọc (bản thân hoặc admin), ghi chỉ Master Admin
-- ---------------------------------------------------------------------
DROP POLICY IF EXISTS "userroles_select_self" ON public."UserRoles";
CREATE POLICY "userroles_select_self" ON public."UserRoles"
  FOR SELECT TO authenticated
  USING ("UserId" = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "userroles_admin_write" ON public."UserRoles";
CREATE POLICY "userroles_admin_write" ON public."UserRoles"
  FOR ALL TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

-- ---------------------------------------------------------------------
-- 5. RLS Customers
-- ---------------------------------------------------------------------
-- Giữ nguyên hành vi hiện tại: admin hoặc chủ sở hữu. KH chưa gán
-- (OwnerId IS NULL) chỉ admin thấy. User không đổi OwnerId sang người
-- khác được vì WITH CHECK buộc OwnerId = chính mình.
DROP POLICY IF EXISTS "customers_select" ON public."Customers";
CREATE POLICY "customers_select" ON public."Customers"
  FOR SELECT TO authenticated
  USING (public.is_admin() OR "OwnerId" = auth.uid());

DROP POLICY IF EXISTS "customers_insert" ON public."Customers";
CREATE POLICY "customers_insert" ON public."Customers"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR "OwnerId" = auth.uid());

DROP POLICY IF EXISTS "customers_update" ON public."Customers";
CREATE POLICY "customers_update" ON public."Customers"
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR "OwnerId" = auth.uid())
  WITH CHECK (public.is_admin() OR "OwnerId" = auth.uid());

-- Xóa vĩnh viễn: chỉ Master Admin
DROP POLICY IF EXISTS "customers_delete" ON public."Customers";
CREATE POLICY "customers_delete" ON public."Customers"
  FOR DELETE TO authenticated
  USING (public.is_master_admin());

-- ---------------------------------------------------------------------
-- 6. SystemConfig: cấu hình dùng chung (token HF...)
-- ---------------------------------------------------------------------
-- Chỉ tài khoản đã đăng nhập đọc được (anon bị chặn); chỉ Master Admin ghi.
-- Token HF ở đây vẫn nhìn thấy được qua DevTools của user đã đăng nhập:
-- dùng fine-grained token chỉ cấp quyền cho đúng một dataset.
CREATE TABLE IF NOT EXISTS public."SystemConfig" (
  "Key"       text PRIMARY KEY,
  "Value"     jsonb NOT NULL DEFAULT '{}'::jsonb,
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public."SystemConfig" IS
  'Cấu hình hệ thống dùng chung. Khóa hf_config = cấu hình Hugging Face (token, repo, thư mục).';

ALTER TABLE public."SystemConfig" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "systemconfig_select" ON public."SystemConfig";
CREATE POLICY "systemconfig_select" ON public."SystemConfig"
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "systemconfig_insert" ON public."SystemConfig";
CREATE POLICY "systemconfig_insert" ON public."SystemConfig"
  FOR INSERT TO authenticated WITH CHECK (public.is_master_admin());

DROP POLICY IF EXISTS "systemconfig_update" ON public."SystemConfig";
CREATE POLICY "systemconfig_update" ON public."SystemConfig"
  FOR UPDATE TO authenticated
  USING (public.is_master_admin())
  WITH CHECK (public.is_master_admin());

DROP POLICY IF EXISTS "systemconfig_delete" ON public."SystemConfig";
CREATE POLICY "systemconfig_delete" ON public."SystemConfig"
  FOR DELETE TO authenticated USING (public.is_master_admin());

REVOKE ALL ON public."SystemConfig" FROM anon;

-- Dọn các dòng cấu hình cũ nằm trong bảng mở cho mọi người
DELETE FROM public."StatementTemplates"
WHERE "Id" IN ('sys_hf_config', 'sys_dispatches_sync');

-- ---------------------------------------------------------------------
-- 7. Dispatches: nguồn dữ liệu thật của metadata văn thư / kho lưu trữ
-- ---------------------------------------------------------------------
ALTER TABLE public."Dispatches"
  ADD COLUMN IF NOT EXISTS "RepoId"     text,
  ADD COLUMN IF NOT EXISTS "FilePath"   text,
  ADD COLUMN IF NOT EXISTS "FolderPath" text;

ALTER TABLE public."Dispatches"
  ALTER COLUMN "OwnerId" SET DEFAULT auth.uid();

-- Cùng đường dẫn ở hai repo là hai tệp khác nhau nên khóa theo (RepoId, FilePath).
-- Không dùng chỉ mục có điều kiện WHERE: upsert theo onConflict của PostgREST
-- không suy ra được chỉ mục một phần. NULL vẫn được lặp nhiều lần.
CREATE UNIQUE INDEX IF NOT EXISTS ux_dispatches_repo_filepath
  ON public."Dispatches" ("RepoId", "FilePath");

-- Thay các policy mở cho anon của migration 59
DROP POLICY IF EXISTS "Dispatches_select_all" ON public."Dispatches";
DROP POLICY IF EXISTS "Dispatches_insert_all" ON public."Dispatches";
DROP POLICY IF EXISTS "Dispatches_update_all" ON public."Dispatches";
DROP POLICY IF EXISTS "Dispatches_delete_all" ON public."Dispatches";

-- Kho lưu trữ dùng chung: mọi tài khoản đăng nhập đều xem được
CREATE POLICY "dispatches_select" ON public."Dispatches"
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "dispatches_insert" ON public."Dispatches"
  FOR INSERT TO authenticated WITH CHECK ("OwnerId" = auth.uid());

CREATE POLICY "dispatches_update" ON public."Dispatches"
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR "OwnerId" = auth.uid())
  WITH CHECK (public.is_admin() OR "OwnerId" = auth.uid());

CREATE POLICY "dispatches_delete" ON public."Dispatches"
  FOR DELETE TO authenticated USING (public.is_admin());

REVOKE ALL ON public."Dispatches" FROM anon;

-- ---------------------------------------------------------------------
-- 7b. StorageRepos: danh sách dataset Hugging Face (Kho chung, Kho cá nhân, Văn thư)
-- ---------------------------------------------------------------------
-- Token HF dùng chung nằm ở SystemConfig (khóa hf_config); bảng này chỉ giữ danh sách repo.
-- Quy tắc: một Kho chung, một repo Văn thư, mỗi tài khoản tối đa một repo cá nhân.
-- Phân quyền ở đây chỉ quyết định ai THẤY repo trong danh sách; việc ghi lên HF dùng
-- token chung nên không thể ép ở tầng CSDL.
CREATE TABLE IF NOT EXISTS public."StorageRepos" (
  "Id"             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "Name"           text NOT NULL,
  "RepoId"         text NOT NULL UNIQUE,
  "Folder"         text,
  "Kind"           text NOT NULL CHECK ("Kind" IN ('shared', 'personal', 'dispatch')),
  "AssignedUserId" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "CreatedAt"      timestamptz NOT NULL DEFAULT now(),
  "CreatedBy"      uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);
-- Không dùng CHECK buộc repo cá nhân phải có người gán: ON DELETE SET NULL khi xóa tài khoản
-- sẽ vi phạm và chặn việc xóa user. Repo mồ côi chỉ admin còn thấy; ứng dụng kiểm tra khi tạo.

CREATE UNIQUE INDEX IF NOT EXISTS ux_storagerepos_one_shared
  ON public."StorageRepos" ("Kind") WHERE "Kind" = 'shared';
CREATE UNIQUE INDEX IF NOT EXISTS ux_storagerepos_one_dispatch
  ON public."StorageRepos" ("Kind") WHERE "Kind" = 'dispatch';
CREATE UNIQUE INDEX IF NOT EXISTS ux_storagerepos_one_personal_per_user
  ON public."StorageRepos" ("AssignedUserId") WHERE "Kind" = 'personal';

ALTER TABLE public."StorageRepos" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "storagerepos_select" ON public."StorageRepos";
CREATE POLICY "storagerepos_select" ON public."StorageRepos"
  FOR SELECT TO authenticated
  USING (
    "Kind" IN ('shared', 'dispatch')
    OR "AssignedUserId" = auth.uid()
    OR public.is_admin()
  );

DROP POLICY IF EXISTS "storagerepos_insert" ON public."StorageRepos";
CREATE POLICY "storagerepos_insert" ON public."StorageRepos"
  FOR INSERT TO authenticated WITH CHECK (public.is_master_admin());

DROP POLICY IF EXISTS "storagerepos_update" ON public."StorageRepos";
CREATE POLICY "storagerepos_update" ON public."StorageRepos"
  FOR UPDATE TO authenticated
  USING (public.is_master_admin()) WITH CHECK (public.is_master_admin());

DROP POLICY IF EXISTS "storagerepos_delete" ON public."StorageRepos";
CREATE POLICY "storagerepos_delete" ON public."StorageRepos"
  FOR DELETE TO authenticated USING (public.is_master_admin());

REVOKE ALL ON public."StorageRepos" FROM anon;

-- ---------------------------------------------------------------------
-- 8. Đếm KH theo tài khoản (không phải tải toàn bộ bảng Customers)
-- ---------------------------------------------------------------------
-- SECURITY INVOKER: tôn trọng RLS. Admin thấy mọi tài khoản; user chỉ
-- thấy dòng của mình. OwnerId NULL = chưa phân công.
CREATE OR REPLACE FUNCTION public.get_user_customer_counts()
RETURNS TABLE ("UserId" uuid, "CustomerCount" bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT c."OwnerId", count(*)
  FROM public."Customers" c
  GROUP BY c."OwnerId";
$$;

REVOKE EXECUTE ON FUNCTION public.get_user_customer_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_user_customer_counts() TO authenticated;
