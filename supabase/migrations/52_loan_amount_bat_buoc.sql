ALTER TABLE "LoanContracts"
  ALTER COLUMN "LoanAmount" SET NOT NULL;

ALTER TABLE "LoanContracts"
  ADD CONSTRAINT "LoanContracts_LoanAmount_duong"
  CHECK ("LoanAmount" > 0);
