-- Gỡ migration 77: xoá khoản vay và sổ đã chuyển, trả bản ghi HĐTD/KUNN/TSBĐ cũ về như trước.
-- Sổ đã chuyển mà banker đã gắn thêm khoản vay mới thì khoá ngoại chặn lại, không mất dữ liệu nhập sau.
BEGIN;

UPDATE "LoanContracts"   SET "MovedToPledgeLoanId"  = NULL WHERE "MovedToPledgeLoanId"  IS NOT NULL;
UPDATE "CreditContracts" SET "MovedToPledgeLoanId"  = NULL WHERE "MovedToPledgeLoanId"  IS NOT NULL;
UPDATE "Collaterals"     SET "MovedToSavingsBookId" = NULL WHERE "MovedToSavingsBookId" IS NOT NULL;

DELETE FROM "PledgeLoans" WHERE "LegacyLoanContractId" IS NOT NULL;
DELETE FROM "SavingsBooks" WHERE "MovedFromCollateralId" IS NOT NULL;

COMMIT;
