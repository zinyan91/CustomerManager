-- Gỡ migration 77: xoá khoản vay và sổ đã chuyển, trả bản ghi HĐTD/KUNN/TSBĐ cũ về như trước.
-- Dừng nếu đã có dữ liệu nhập SAU khi chuyển (trả nợ mới trên khoản đã chuyển, hoặc khoản vay mới
-- dùng sổ đã chuyển), vì xoá khoản vay sẽ kéo theo xoá các dòng trả nợ đó.
DO $$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(DISTINCT l."ContractNumber", ', ') INTO v_bad
  FROM "PledgeLoanRepayments" r JOIN "PledgeLoans" l ON l."Id" = r."PledgeLoanId"
  WHERE l."LegacyLoanContractId" IS NOT NULL
    AND r."Note" IS DISTINCT FROM 'Chuyển từ KUNN: gốc đã thu trước khi chuyển';
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Không gỡ được: khoản vay đã chuyển có trả nợ ghi sau khi chuyển: %', v_bad;
  END IF;

  SELECT string_agg(DISTINCT l."ContractNumber", ', ') INTO v_bad
  FROM "PledgeLoanSavingsBooks" k
  JOIN "PledgeLoans" l ON l."Id" = k."PledgeLoanId"
  JOIN "SavingsBooks" b ON b."Id" = k."SavingsBookId"
  WHERE b."MovedFromCollateralId" IS NOT NULL AND l."LegacyLoanContractId" IS NULL;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'Không gỡ được: khoản vay mới đang dùng sổ đã chuyển: %', v_bad;
  END IF;

  UPDATE "LoanContracts"   SET "MovedToPledgeLoanId"  = NULL WHERE "MovedToPledgeLoanId"  IS NOT NULL;
  UPDATE "CreditContracts" SET "MovedToPledgeLoanId"  = NULL WHERE "MovedToPledgeLoanId"  IS NOT NULL;
  UPDATE "Collaterals"     SET "MovedToSavingsBookId" = NULL WHERE "MovedToSavingsBookId" IS NOT NULL;

  DELETE FROM "PledgeLoans" WHERE "LegacyLoanContractId" IS NOT NULL;
  DELETE FROM "SavingsBooks" WHERE "MovedFromCollateralId" IS NOT NULL;
END;
$$;
