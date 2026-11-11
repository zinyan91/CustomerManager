-- Gỡ migration 83. Mất liên kết tái tục đã nhập; sao lưu trước khi gỡ.
BEGIN;

CREATE TABLE IF NOT EXISTS public."CreditContracts_renews_backup_83" AS
  SELECT "Id", "RenewsCreditContractId" FROM public."CreditContracts" WHERE "RenewsCreditContractId" IS NOT NULL;
ALTER TABLE public."CreditContracts_renews_backup_83" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."CreditContracts_renews_backup_83" FROM anon, authenticated;

DROP INDEX IF EXISTS public."CreditContracts_RenewsCreditContractId_idx";
ALTER TABLE public."CreditContracts" DROP CONSTRAINT IF EXISTS "CreditContracts_renews_not_self";
ALTER TABLE public."CreditContracts" DROP COLUMN IF EXISTS "RenewsCreditContractId";

COMMIT;
