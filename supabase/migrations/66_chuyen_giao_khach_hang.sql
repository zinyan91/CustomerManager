-- =====================================================================
-- Migration 66: Chuyển giao khách hàng giữa các tài khoản (kèm nhật ký)
-- =====================================================================
-- Quyền xem toàn bộ hồ sơ tín dụng (HĐTD, KUNN, lịch trả nợ, TSĐB, thế chấp, thẻ, kiểm soát sau vay)
-- suy từ Customers.OwnerId qua can_access_customer(), nên chuyển giao = đổi OwnerId của khách.
-- Văn bản Văn thư gắn khách (Dispatches.CustomerId) có OwnerId riêng nên được chuyển theo.
--
-- Chỉ khách đang thuộc người chuyển mới bị chuyển, dù danh sách chọn có mã khách của người khác.
-- Mọi thứ nằm trong một hàm nên nguyên tử: lỗi giữa chừng thì không đổi gì và không ghi nhật ký.
-- Gỡ lại: supabase/rollbacks/66_chuyen_giao_khach_hang_rollback.sql (giữ bảng nhật ký).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Nhật ký chuyển giao
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public."CustomerTransfers" (
  "Id"            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "FromUserId"    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "ToUserId"      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  "CustomerIds"   integer[] NOT NULL,
  "Counts"        jsonb NOT NULL,
  "TransferredBy" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  "TransferredAt" timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public."CustomerTransfers" IS
  'Nhật ký chuyển giao khách hàng. Chỉ hàm transfer_customers() ghi; chỉ hai vai trò quản trị đọc.';

ALTER TABLE public."CustomerTransfers" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "customer_transfers_select" ON public."CustomerTransfers";
CREATE POLICY "customer_transfers_select" ON public."CustomerTransfers"
  FOR SELECT TO authenticated USING (public.is_admin());

REVOKE ALL ON public."CustomerTransfers" FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public."CustomerTransfers" FROM authenticated;

-- ---------------------------------------------------------------------
-- 2. Đếm hồ sơ gắn với một nhóm khách (nội bộ, không mở cho client)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.customer_transfer_counts(p_customer_ids integer[], p_from uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'customers',       cardinality(p_customer_ids),
    'creditContracts', (SELECT count(*) FROM public."CreditContracts"        WHERE "CustomerId" = ANY (p_customer_ids)),
    'loans',           (SELECT count(*) FROM public."LoanContracts"          WHERE "CustomerId" = ANY (p_customer_ids)),
    'collaterals',     (SELECT count(*) FROM public."Collaterals"            WHERE "CustomerId" = ANY (p_customer_ids)),
    'mortgages',       (SELECT count(*) FROM public."MortgageContracts"      WHERE "CustomerId" = ANY (p_customer_ids)),
    'cards',           (SELECT count(*) FROM public."CardContracts"          WHERE "CustomerId" = ANY (p_customer_ids)),
    'postLoan',        (SELECT count(*) FROM public."PostLoanControlRecords" WHERE "CustomerId" = ANY (p_customer_ids)),
    'dispatches',      (SELECT count(*) FROM public."Dispatches"
                         WHERE "CustomerId" = ANY (p_customer_ids::bigint[]) AND "OwnerId" IS NOT DISTINCT FROM p_from)
  );
$$;

REVOKE EXECUTE ON FUNCTION public.customer_transfer_counts(integer[], uuid) FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Xem trước: số hồ sơ sẽ chuyển (chỉ tính khách thật sự của người chuyển)
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.customer_transfer_preview(p_from uuid, p_customer_ids integer[])
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  owned integer[];
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ Master Admin và User Admin được chuyển giao khách hàng.' USING ERRCODE = '42501';
  END IF;

  SELECT coalesce(array_agg("Id"), '{}') INTO owned
  FROM public."Customers" WHERE "Id" = ANY (p_customer_ids) AND "OwnerId" = p_from;

  RETURN public.customer_transfer_counts(owned, p_from);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.customer_transfer_preview(uuid, integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.customer_transfer_preview(uuid, integer[]) TO authenticated;

-- ---------------------------------------------------------------------
-- 4. Chuyển giao
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.transfer_customers(p_from uuid, p_to uuid, p_customer_ids integer[])
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  moved  integer[];
  counts jsonb;
  log_id bigint;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Chỉ Master Admin và User Admin được chuyển giao khách hàng.' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_from = p_to THEN
    RAISE EXCEPTION 'Người chuyển và người nhận phải là hai tài khoản khác nhau.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."UserRoles" WHERE "UserId" = p_to) THEN
    RAISE EXCEPTION 'Người nhận chưa được phân quyền, không nhận được khách hàng.';
  END IF;

  SELECT coalesce(array_agg("Id"), '{}') INTO moved
  FROM public."Customers" WHERE "Id" = ANY (p_customer_ids) AND "OwnerId" = p_from;

  IF cardinality(moved) = 0 THEN
    RAISE EXCEPTION 'Không có khách hàng nào của người chuyển trong danh sách đã chọn.';
  END IF;

  counts := public.customer_transfer_counts(moved, p_from);

  UPDATE public."Customers" SET "OwnerId" = p_to WHERE "Id" = ANY (moved);
  UPDATE public."Dispatches" SET "OwnerId" = p_to
  WHERE "CustomerId" = ANY (moved::bigint[]) AND "OwnerId" IS NOT DISTINCT FROM p_from;

  INSERT INTO public."CustomerTransfers" ("FromUserId", "ToUserId", "CustomerIds", "Counts")
  VALUES (p_from, p_to, moved, counts)
  RETURNING "Id" INTO log_id;

  RETURN counts || jsonb_build_object('transferId', log_id);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.transfer_customers(uuid, uuid, integer[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.transfer_customers(uuid, uuid, integer[]) TO authenticated;
