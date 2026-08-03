-- =====================================================================
-- GIAI ĐOẠN A: Vai trò & Quyền sở hữu dữ liệu
-- =====================================================================
-- File này CHƯA bật RLS nên KHÔNG làm gián đoạn ứng dụng đang chạy.
-- Chỉ thêm cấu trúc. Chạy trong Supabase SQL Editor.
--
-- ĐIỀU KIỆN TIÊN QUYẾT: đã tạo ít nhất 1 tài khoản admin trong
-- Dashboard > Authentication > Users > Add user, và lấy được UUID.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Bảng phân vai trò
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."UserRoles" (
  "UserId"    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  "Role"      text NOT NULL CHECK ("Role" IN ('admin', 'banker')),
  "FullName"  text,
  "CreatedAt" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."UserRoles" IS
  'Vai trò người dùng. admin = toàn quyền xem/sửa; banker = chỉ KH mình phụ trách.';

-- ---------------------------------------------------------------------
-- 2. Cột chủ sở hữu trên Customers
-- ---------------------------------------------------------------------
-- Quyền trên Collaterals / LoanContracts / CreditCards / RepaymentSchedules
-- được suy ra theo quan hệ tới Customers, không cần thêm cột.
ALTER TABLE public."Customers"
  ADD COLUMN IF NOT EXISTS "OwnerId" uuid REFERENCES auth.users(id);

COMMENT ON COLUMN public."Customers"."OwnerId" IS
  'Banker phụ trách. NULL = chỉ admin nhìn thấy.';

-- ---------------------------------------------------------------------
-- 3. Chỉ mục — BẮT BUỘC cho hiệu năng khi bật RLS
-- ---------------------------------------------------------------------
-- Không có các index này, mỗi truy vấn sẽ quét toàn bảng cho từng dòng.
CREATE INDEX IF NOT EXISTS idx_customers_owner
  ON public."Customers" ("OwnerId");
CREATE INDEX IF NOT EXISTS idx_collaterals_customer
  ON public."Collaterals" ("CustomerId");
CREATE INDEX IF NOT EXISTS idx_loancontracts_customer
  ON public."LoanContracts" ("CustomerId");
CREATE INDEX IF NOT EXISTS idx_creditcards_customer
  ON public."CreditCards" ("CustomerId");
CREATE INDEX IF NOT EXISTS idx_repayment_contract
  ON public."RepaymentSchedules" ("ContractId");

-- ---------------------------------------------------------------------
-- 4. Hàm hỗ trợ (SECURITY DEFINER để tránh đệ quy RLS)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public."UserRoles"
    WHERE "UserId" = auth.uid() AND "Role" = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_customer(cid bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1 FROM public."Customers" c
    WHERE c."Id" = cid AND c."OwnerId" = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.can_access_contract(contract_id bigint)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_admin() OR EXISTS (
    SELECT 1
    FROM public."LoanContracts" lc
    JOIN public."Customers" c ON c."Id" = lc."CustomerId"
    WHERE lc."Id" = contract_id AND c."OwnerId" = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------
-- 5. THỦ CÔNG: gán admin và chủ sở hữu dữ liệu cũ
-- ---------------------------------------------------------------------
INSERT INTO public."UserRoles" ("UserId", "Role", "FullName")
VALUES ('48931617-68d2-40f1-9181-57e18a10b0e0', 'admin', 'Quản trị hệ thống')
ON CONFLICT ("UserId") DO UPDATE SET "Role" = 'admin';

-- Gán toàn bộ KH hiện có cho admin (nếu bỏ qua, banker sẽ không thấy gì
-- sau khi bật RLS — dữ liệu KHÔNG mất, chỉ bị ẩn):
UPDATE public."Customers" SET "OwnerId" = '48931617-68d2-40f1-9181-57e18a10b0e0'
WHERE "OwnerId" IS NULL;
