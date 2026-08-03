-- =====================================================================
-- GIAI ĐOẠN C: Bật Row Level Security
-- =====================================================================
-- ⚠️ CHỈ CHẠY SAU KHI ĐÃ CÓ ĐĂNG NHẬP TRONG ỨNG DỤNG.
-- Chạy file này khi frontend chưa có Auth sẽ làm app ngừng hoạt động
-- hoàn toàn (auth.uid() = NULL nên mọi policy đều chặn).
--
-- ĐIỀU KIỆN TIÊN QUYẾT:
--   1. Đã chạy 01_roles_and_ownership.sql
--   2. Đã gán admin và OwnerId cho dữ liệu cũ (mục 5 của file 01)
--   3. Frontend đã có luồng đăng nhập hoạt động
--
-- Cách hoàn tác nếu có sự cố — xem cuối file.
-- =====================================================================

-- ---------------------------------------------------------------------
-- Bật RLS trên toàn bộ bảng nghiệp vụ
-- ---------------------------------------------------------------------
ALTER TABLE public."Customers"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Collaterals"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoanContracts"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CreditCards"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."RepaymentSchedules"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."UserRoles"           ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------
-- UserRoles: ai cũng đọc được vai trò của chính mình; chỉ admin sửa
-- ---------------------------------------------------------------------
CREATE POLICY "userroles_select_self" ON public."UserRoles"
  FOR SELECT TO authenticated
  USING ("UserId" = auth.uid() OR public.is_admin());

CREATE POLICY "userroles_admin_write" ON public."UserRoles"
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ---------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------
CREATE POLICY "customers_select" ON public."Customers"
  FOR SELECT TO authenticated
  USING (public.is_admin() OR "OwnerId" = auth.uid());

-- Banker tạo KH mới buộc phải tự đứng tên chủ sở hữu
CREATE POLICY "customers_insert" ON public."Customers"
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() OR "OwnerId" = auth.uid());

CREATE POLICY "customers_update" ON public."Customers"
  FOR UPDATE TO authenticated
  USING (public.is_admin() OR "OwnerId" = auth.uid())
  WITH CHECK (public.is_admin() OR "OwnerId" = auth.uid());

-- Xóa hồ sơ khách hàng: chỉ admin (quyết định có chủ ý cho nghiệp vụ NH)
CREATE POLICY "customers_delete" ON public."Customers"
  FOR DELETE TO authenticated
  USING (public.is_admin());

-- ---------------------------------------------------------------------
-- Collaterals / LoanContracts / CreditCards — suy quyền theo CustomerId
-- ---------------------------------------------------------------------
CREATE POLICY "collaterals_all" ON public."Collaterals"
  FOR ALL TO authenticated
  USING (public.can_access_customer("CustomerId"))
  WITH CHECK (public.can_access_customer("CustomerId"));

CREATE POLICY "loancontracts_all" ON public."LoanContracts"
  FOR ALL TO authenticated
  USING (public.can_access_customer("CustomerId"))
  WITH CHECK (public.can_access_customer("CustomerId"));

CREATE POLICY "creditcards_all" ON public."CreditCards"
  FOR ALL TO authenticated
  USING (public.can_access_customer("CustomerId"))
  WITH CHECK (public.can_access_customer("CustomerId"));

-- ---------------------------------------------------------------------
-- RepaymentSchedules — suy quyền qua ContractId -> LoanContracts
-- ---------------------------------------------------------------------
CREATE POLICY "repayment_all" ON public."RepaymentSchedules"
  FOR ALL TO authenticated
  USING (public.can_access_contract("ContractId"))
  WITH CHECK (public.can_access_contract("ContractId"));

-- ---------------------------------------------------------------------
-- Chặn tuyệt đối vai trò anon (chưa đăng nhập)
-- ---------------------------------------------------------------------
-- Mọi policy trên đều giới hạn TO authenticated, nên anon đã bị chặn.
-- Thu hồi grant để phòng thủ nhiều lớp:
REVOKE ALL ON public."Customers"          FROM anon;
REVOKE ALL ON public."Collaterals"        FROM anon;
REVOKE ALL ON public."LoanContracts"      FROM anon;
REVOKE ALL ON public."CreditCards"        FROM anon;
REVOKE ALL ON public."RepaymentSchedules" FROM anon;
REVOKE ALL ON public."UserRoles"          FROM anon;

-- =====================================================================
-- KIỂM CHỨNG
-- =====================================================================
-- Mọi bảng phải có rowsecurity = true:
--   SELECT tablename, rowsecurity FROM pg_tables
--   WHERE schemaname = 'public' ORDER BY tablename;
--
-- Liệt kê policy đã tạo:
--   SELECT tablename, policyname, cmd FROM pg_policies
--   WHERE schemaname = 'public' ORDER BY tablename;

-- =====================================================================
-- HOÀN TÁC KHẨN CẤP (nếu app sập)
-- =====================================================================
-- ALTER TABLE public."Customers"          DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."Collaterals"        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."LoanContracts"      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."CreditCards"        DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."RepaymentSchedules" DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE public."UserRoles"          DISABLE ROW LEVEL SECURITY;
