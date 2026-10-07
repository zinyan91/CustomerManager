-- =====================================================================
-- Migration 65: Cờ module theo tài khoản, chặn thật bằng RLS
-- =====================================================================
-- Master Admin / User Admin chọn module nào mỗi tài khoản cấp User được dùng.
-- Không sửa chính sách cũ: thêm chính sách RESTRICTIVE (nối AND với chính sách hiện có).
-- Gỡ lại: chạy supabase/rollbacks/65_user_modules_rollback.sql
--
-- Quy tắc has_module(m):
--   1. Chưa đăng nhập: KHÔNG có quyền (đóng luôn các bảng đang mở cho anon).
--   2. Master Admin, User Admin: luôn có quyền.
--   3. Chưa có dòng trong UserModules: có mọi module (tương thích ngược).
--   4. Có dòng: chỉ các module trong mảng; mảng rỗng = không module nào.
--
-- ÁP DỤNG: TRƯỚC khi deploy mã mới. Danh sách module phải khớp src/lib/modules.ts.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bảng cờ module
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."UserModules" (
  "UserId"    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "Modules"   text[] NOT NULL DEFAULT '{}',
  "UpdatedAt" timestamptz NOT NULL DEFAULT now(),
  "UpdatedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  CONSTRAINT "UserModules_known_modules"
    CHECK ("Modules" <@ ARRAY['credit', 'rates', 'dispatch', 'storage', 'inventory', 'quiz', 'tools']::text[])
);

COMMENT ON TABLE public."UserModules" IS
  'Module được dùng của từng tài khoản. Không có dòng = đủ mọi module. Admin luôn đủ module.';

-- ---------------------------------------------------------------------
-- 2. Hàm kiểm tra
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_module(m text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND (
    public.is_admin()
    OR NOT EXISTS (SELECT 1 FROM public."UserModules" WHERE "UserId" = auth.uid())
    OR EXISTS (SELECT 1 FROM public."UserModules" WHERE "UserId" = auth.uid() AND m = ANY ("Modules"))
  );
$$;

-- Tài khoản đích là Master Admin? Dùng trong chính sách ghi, đọc UserRoles bỏ qua RLS.
CREATE OR REPLACE FUNCTION public.user_is_master_admin(uid uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public."UserRoles" WHERE "UserId" = uid AND "Role" = 'master_admin');
$$;

-- ---------------------------------------------------------------------
-- 3. RLS của chính UserModules
-- ---------------------------------------------------------------------
ALTER TABLE public."UserModules" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "usermodules_select" ON public."UserModules";
CREATE POLICY "usermodules_select" ON public."UserModules"
  FOR SELECT TO authenticated
  USING ("UserId" = auth.uid() OR public.is_admin());

-- Hai vai trò quản trị ghi được, trừ dòng của Master Admin (giống luật quản lý người dùng)
DROP POLICY IF EXISTS "usermodules_write" ON public."UserModules";
CREATE POLICY "usermodules_write" ON public."UserModules"
  FOR ALL TO authenticated
  USING (public.is_admin() AND NOT public.user_is_master_admin("UserId"))
  WITH CHECK (public.is_admin() AND NOT public.user_is_master_admin("UserId"));

REVOKE ALL ON public."UserModules" FROM anon;

-- ---------------------------------------------------------------------
-- 4. Chính sách RESTRICTIVE theo module
-- ---------------------------------------------------------------------
-- (SELECT ...) để Postgres tính một lần mỗi câu lệnh, không tính từng dòng.
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- Hồ sơ tín dụng
      ('credit', 'Customers'), ('credit', 'CreditContracts'), ('credit', 'LoanContracts'), ('credit', 'RepaymentSchedules'),
      ('credit', 'Collaterals'), ('credit', 'CollateralAppraisals'), ('credit', 'MortgageContracts'),
      ('credit', 'MortgageContractCollaterals'), ('credit', 'MortgageContractCreditContracts'),
      ('credit', 'CardContracts'), ('credit', 'CardSupplementaryHolders'), ('credit', 'PostLoanControlRecords'),
      ('credit', 'DisbursementPayees'),
      -- Văn thư
      ('dispatch', 'OfficialDocuments'), ('dispatch', 'Dispatches'), ('dispatch', 'AiAnswerCache'),
      -- Dự toán, kho hàng, bán lẻ
      ('inventory', 'InventoryItems'), ('inventory', 'InventoryCategoryTemplates'), ('inventory', 'SaleCatalogProfiles'),
      ('inventory', 'StatementTemplates'), ('inventory', 'PurchaseStatements'), ('inventory', 'RetailInvoices'),
      -- Ôn tập
      ('quiz', 'QuizQuestions')
    ) AS v(module, tbl)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'mod_' || r.module, r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL USING ((SELECT public.has_module(%L)))',
      'mod_' || r.module, r.tbl, r.module
    );
  END LOOP;

  -- Lãi suất và vốn: người làm hồ sơ tín dụng cũng cần bảng lãi suất khi lập khoản vay
  FOR r IN
    SELECT tbl FROM (VALUES
      ('RatePrograms'), ('RateProgramConditions'), ('RateProgramFbeCodes'), ('RateProgramFeeOptions'),
      ('RateProgramPrepaymentFees'), ('RateProgramTiers'),
      ('CofPrograms'), ('CofRateItems'), ('CofStandardRates'), ('DepositRateAuthorities')
    ) AS v(tbl)
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'mod_rates', r.tbl);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR ALL USING ((SELECT public.has_module(%L) OR public.has_module(%L)))',
      'mod_rates', r.tbl, 'rates', 'credit'
    );
  END LOOP;
END $$;

-- Danh sách kho: kho Văn thư và Biểu mẫu theo module dispatch; kho chung và kho cá nhân theo module storage
DROP POLICY IF EXISTS "mod_storage" ON public."StorageRepos";
CREATE POLICY "mod_storage" ON public."StorageRepos"
  AS RESTRICTIVE FOR ALL
  USING (public.has_module(CASE WHEN "Kind" IN ('dispatch', 'form') THEN 'dispatch' ELSE 'storage' END));

-- Token kho tệp (khóa hf_config): chỉ tài khoản có module storage hoặc dispatch lấy được,
-- nên tài khoản không có hai module này không với tới tệp trên kho lưu trữ
DROP POLICY IF EXISTS "mod_hf_config" ON public."SystemConfig";
CREATE POLICY "mod_hf_config" ON public."SystemConfig"
  AS RESTRICTIVE FOR ALL
  USING ("Key" <> 'hf_config' OR (SELECT public.has_module('storage') OR public.has_module('dispatch')));
