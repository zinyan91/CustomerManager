-- 81_ngay_tat_toan_va_thoi_diem_ghi.sql
-- Ghi lại thời điểm thao tác tất toán KUNN, đóng HĐTD, thu một kỳ, để đối chiếu được "hôm nay đã tất toán bao nhiêu".
-- Ngày nghiệp vụ (SettledDate, ClosedDate, PaymentDate) có thể lùi về quá khứ; *At là lúc bấm, do CSDL tự đóng dấu
-- nên mọi đường thao tác (ô tick ở form, nút thu nợ, nút tất toán, mã cũ) đều được ghi.
-- Dữ liệu cũ: *At để trống vì không ai biết lúc bấm; ngày nghiệp vụ còn trống thì điền theo dữ liệu thu nợ đã có;
-- KUNN đã tất toán đưa dư nợ về 0.

BEGIN;

CREATE TABLE IF NOT EXISTS public."LoanContracts_backup_20261110" AS
  SELECT "Id", "IsSettled", "SettledDate", "CurrentBalance" FROM public."LoanContracts";
CREATE TABLE IF NOT EXISTS public."CreditContracts_backup_20261110" AS
  SELECT "Id", "IsClosed", "ClosedDate" FROM public."CreditContracts";
ALTER TABLE public."LoanContracts_backup_20261110" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."CreditContracts_backup_20261110" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."LoanContracts_backup_20261110", public."CreditContracts_backup_20261110" FROM anon, authenticated;

ALTER TABLE public."LoanContracts" ADD COLUMN IF NOT EXISTS "SettledAt" timestamptz;
ALTER TABLE public."CreditContracts" ADD COLUMN IF NOT EXISTS "ClosedAt" timestamptz;
ALTER TABLE public."RepaymentSchedules" ADD COLUMN IF NOT EXISTS "PaidRecordedAt" timestamptz;

CREATE OR REPLACE FUNCTION public.stamp_loan_settled() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW."IsSettled" IS TRUE AND (TG_OP = 'INSERT' OR OLD."IsSettled" IS DISTINCT FROM TRUE) THEN
    NEW."CurrentBalance" := 0;
    NEW."SettledAt" := now();
    NEW."SettledDate" := coalesce(NEW."SettledDate", (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
  ELSIF NEW."IsSettled" IS NOT TRUE AND TG_OP = 'UPDATE' AND OLD."IsSettled" IS TRUE THEN
    NEW."SettledAt" := NULL;
    NEW."SettledDate" := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.stamp_credit_contract_closed() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW."IsClosed" IS TRUE AND (TG_OP = 'INSERT' OR OLD."IsClosed" IS DISTINCT FROM TRUE) THEN
    NEW."ClosedAt" := now();
    NEW."ClosedDate" := coalesce(NEW."ClosedDate", (now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date);
  ELSIF NEW."IsClosed" IS NOT TRUE AND TG_OP = 'UPDATE' AND OLD."IsClosed" IS TRUE THEN
    NEW."ClosedAt" := NULL;
    NEW."ClosedDate" := NULL;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.stamp_schedule_paid() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW."IsPaid" IS TRUE AND (TG_OP = 'INSERT' OR OLD."IsPaid" IS DISTINCT FROM TRUE) THEN
    NEW."PaidRecordedAt" := now();
  ELSIF NEW."IsPaid" IS NOT TRUE THEN
    NEW."PaidRecordedAt" := NULL;
  END IF;
  RETURN NEW;
END $$;

REVOKE EXECUTE ON FUNCTION public.stamp_loan_settled(), public.stamp_credit_contract_closed(), public.stamp_schedule_paid() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_stamp_loan_settled ON public."LoanContracts";
CREATE TRIGGER trg_stamp_loan_settled BEFORE INSERT OR UPDATE OF "IsSettled" ON public."LoanContracts"
  FOR EACH ROW EXECUTE FUNCTION public.stamp_loan_settled();

DROP TRIGGER IF EXISTS trg_stamp_credit_contract_closed ON public."CreditContracts";
CREATE TRIGGER trg_stamp_credit_contract_closed BEFORE INSERT OR UPDATE OF "IsClosed" ON public."CreditContracts"
  FOR EACH ROW EXECUTE FUNCTION public.stamp_credit_contract_closed();

DROP TRIGGER IF EXISTS trg_stamp_schedule_paid ON public."RepaymentSchedules";
CREATE TRIGGER trg_stamp_schedule_paid BEFORE INSERT OR UPDATE OF "IsPaid" ON public."RepaymentSchedules"
  FOR EACH ROW EXECUTE FUNCTION public.stamp_schedule_paid();

-- Điền ngày nghiệp vụ còn trống cho dữ liệu cũ, không đụng ô đã có ngày.
-- Ngày tất toán = ngày thu cuối cùng ghi trên lịch của KUNN đó.
UPDATE public."LoanContracts" l
SET "SettledDate" = s.last_paid
FROM (SELECT "ContractId", max("PaymentDate") AS last_paid FROM public."RepaymentSchedules" WHERE "IsPaid" GROUP BY "ContractId") s
WHERE l."IsSettled" IS TRUE AND l."SettledDate" IS NULL AND s."ContractId" = l."Id" AND s.last_paid IS NOT NULL;

-- KUNN đã tất toán thì dư nợ bằng 0; số cũ còn treo do tất toán bằng ô tick ở mã cũ (đã sao lưu ở trên).
UPDATE public."LoanContracts" SET "CurrentBalance" = 0
WHERE "IsSettled" IS TRUE AND coalesce("CurrentBalance", 0) <> 0;

-- Ngày đóng HĐTD = ngày tất toán muộn nhất trong các KUNN của nó.
UPDATE public."CreditContracts" cc
SET "ClosedDate" = k.last_settled
FROM (SELECT "CreditContractId", max("SettledDate") AS last_settled FROM public."LoanContracts"
      WHERE "IsSettled" IS TRUE AND "CreditContractId" IS NOT NULL GROUP BY "CreditContractId") k
WHERE cc."IsClosed" IS TRUE AND cc."ClosedDate" IS NULL AND k."CreditContractId" = cc."Id" AND k.last_settled IS NOT NULL;

COMMIT;
