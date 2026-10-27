-- Gỡ migration 76. Chạy SAU khi đã gỡ migration 77 (nếu đã áp), vì bỏ bảng sẽ mất dữ liệu đã nhập ở tab Huy động & Cầm cố.
BEGIN;

DROP FUNCTION IF EXISTS public.record_pledge_repayment(bigint, jsonb, numeric);
DROP FUNCTION IF EXISTS public.save_pledge_loan(jsonb, jsonb);

ALTER TABLE "CreditContracts" DROP COLUMN IF EXISTS "MovedToPledgeLoanId";
ALTER TABLE "LoanContracts"   DROP COLUMN IF EXISTS "MovedToPledgeLoanId";
ALTER TABLE "Collaterals"     DROP COLUMN IF EXISTS "MovedToSavingsBookId";

DROP TABLE IF EXISTS "PledgeLoanRepayments";
DROP TABLE IF EXISTS "PledgeLoanSavingsBooks";
DROP TABLE IF EXISTS "PledgeLoans";
DROP TABLE IF EXISTS "SavingsBooks";

DROP FUNCTION IF EXISTS public.can_access_pledge_loan(bigint);

COMMIT;
