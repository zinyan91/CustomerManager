-- 83_hdtd_tai_tuc.sql
-- HĐTD mới ghi lại HĐTD cũ mà nó tái tục. HĐTD đã được tái tục không cộng vào tổng hạn mức cấp của khách nữa,
-- để khi HĐTD hạn mức cũ hết hiệu lực mà còn KUNN ngắn hạn chưa đến hạn thì hai hạn mức không bị cộng dồn.
-- Dư nợ KUNN của HĐTD cũ vẫn tính riêng ở HĐTD cũ.
-- Chỉ thêm cột, không đụng dữ liệu cũ. Gỡ lại: supabase/rollbacks/83_hdtd_tai_tuc_rollback.sql
-- ÁP DỤNG: TRƯỚC khi deploy mã mới (form HĐTD ghi cột này).

BEGIN;

ALTER TABLE public."CreditContracts"
  ADD COLUMN IF NOT EXISTS "RenewsCreditContractId" integer
  REFERENCES public."CreditContracts"("Id") ON DELETE SET NULL;

ALTER TABLE public."CreditContracts"
  DROP CONSTRAINT IF EXISTS "CreditContracts_renews_not_self";
ALTER TABLE public."CreditContracts"
  ADD CONSTRAINT "CreditContracts_renews_not_self" CHECK ("RenewsCreditContractId" IS DISTINCT FROM "Id");

CREATE INDEX IF NOT EXISTS "CreditContracts_RenewsCreditContractId_idx"
  ON public."CreditContracts" ("RenewsCreditContractId")
  WHERE "RenewsCreditContractId" IS NOT NULL;

COMMENT ON COLUMN public."CreditContracts"."RenewsCreditContractId" IS
  'HĐTD cũ mà HĐTD này tái tục. HĐTD cũ không còn cộng vào tổng hạn mức cấp.';

COMMIT;
