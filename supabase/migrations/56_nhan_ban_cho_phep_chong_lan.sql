-- Cho phép nhân bản chương trình lãi suất CHỒNG LẤN ngày với kỳ đang có.
--
-- Vì sao: nghiệp vụ thường ra công văn mới TRƯỚC khi kỳ cũ hết để áp liền sau
-- đó — nên khoảng hiệu lực chồng lấn là bình thường. Resolver phía ứng dụng
-- (findActiveProgram) đã chọn bản có EffectiveFrom mới nhất phủ ngày đang xét,
-- nên chồng lấn được phân định xác định (bản mới đè bản cũ).
--
-- Bản trước (migration 49) chặn MỌI chồng lấn cùng loại, mâu thuẫn với resolver
-- và khiến không nhân bản được kỳ mới. Bản này chỉ còn chặn trường hợp thật sự
-- nhập nhằng: trùng ĐÚNG ngày bắt đầu với một chương trình cùng loại (khi đó
-- resolver không phân định được bản nào áp dụng vì cùng EffectiveFrom).
--
-- Phần còn lại của hàm giữ nguyên như migration 49 (chép 6 bảng con, bản sao
-- luôn SourceVerified = false, SECURITY INVOKER nên RLS vẫn áp: chỉ admin chạy).

BEGIN;

CREATE OR REPLACE FUNCTION public.clone_rate_program(
  p_source_id       integer,
  p_document_number text,
  p_name            text,
  p_document_date   date,
  p_effective_from  date,
  p_effective_to    date
)
RETURNS integer
LANGUAGE plpgsql
AS $$
DECLARE
  new_id integer;
  src    public."RatePrograms"%ROWTYPE;
BEGIN
  SELECT * INTO src FROM public."RatePrograms" WHERE "Id" = p_source_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Không tìm thấy chương trình nguồn có Id = %', p_source_id;
  END IF;

  IF coalesce(btrim(p_document_number), '') = '' THEN
    RAISE EXCEPTION 'Phải khai số văn bản cho chương trình mới';
  END IF;

  IF p_effective_from IS NULL THEN
    RAISE EXCEPTION 'Phải khai ngày bắt đầu hiệu lực';
  END IF;

  IF p_effective_to IS NOT NULL AND p_effective_to < p_effective_from THEN
    RAISE EXCEPTION 'Ngày hết hiệu lực không được trước ngày bắt đầu';
  END IF;

  -- CHO PHÉP chồng lấn; chỉ chặn khi trùng ĐÚNG ngày bắt đầu cùng loại,
  -- vì hai chương trình cùng ngày bắt đầu sẽ không xác định được bản nào áp dụng.
  IF EXISTS (
    SELECT 1 FROM public."RatePrograms"
    WHERE "Kind" = src."Kind"
      AND "EffectiveFrom" = p_effective_from
  ) THEN
    RAISE EXCEPTION 'Đã có chương trình cùng loại bắt đầu đúng ngày %. Đổi ngày hiệu lực từ, hoặc sửa/đóng chương trình đó.', p_effective_from;
  END IF;

  INSERT INTO public."RatePrograms" (
    "Kind", "Name", "DocumentNumber", "DocumentDate", "EffectiveFrom", "EffectiveTo",
    "QuotaVnd", "FloatingBaseLabel", "FloatingSpreadAnnual", "RateResetMonths",
    "MinFeeAmountVnd", "NewCustomerFeeDiscount", "CasaShortfallFeeAddon", "CasaMinRatio",
    "AllowRateReduction", "AllowPrepayFeeWaive", "SourceVerified",
    "Note", "ScopeText", "TargetText"
  )
  VALUES (
    src."Kind",
    coalesce(nullif(btrim(p_name), ''), src."Name"),
    btrim(p_document_number),
    p_document_date,
    p_effective_from,
    p_effective_to,
    src."QuotaVnd", src."FloatingBaseLabel", src."FloatingSpreadAnnual", src."RateResetMonths",
    src."MinFeeAmountVnd", src."NewCustomerFeeDiscount", src."CasaShortfallFeeAddon", src."CasaMinRatio",
    src."AllowRateReduction", src."AllowPrepayFeeWaive",
    false,
    coalesce(src."Note", '') || ' [Nhân bản từ ' || src."DocumentNumber" || '. Số liệu CHƯA đối chiếu văn bản kỳ này.]',
    src."ScopeText", src."TargetText"
  )
  RETURNING "Id" INTO new_id;

  INSERT INTO public."RateProgramTiers"
    ("ProgramId", "PackageCode", "Label", "FixedMonths", "MinTenorMonths", "MinFeeRatio",
     "Channel", "BalanceTierLabel", "PayoutMode", "TenorMonths", "RateAnnual", "SortOrder", "Note")
  SELECT new_id, "PackageCode", "Label", "FixedMonths", "MinTenorMonths", "MinFeeRatio",
         "Channel", "BalanceTierLabel", "PayoutMode", "TenorMonths", "RateAnnual", "SortOrder", "Note"
  FROM public."RateProgramTiers" WHERE "ProgramId" = p_source_id;

  INSERT INTO public."RateProgramPrepaymentFees"
    ("ProgramId", "YearFrom", "YearTo", "FeeRatio", "Note", "AppliesTo")
  SELECT new_id, "YearFrom", "YearTo", "FeeRatio", "Note", "AppliesTo"
  FROM public."RateProgramPrepaymentFees" WHERE "ProgramId" = p_source_id;

  INSERT INTO public."RateProgramFbeCodes"
    ("ProgramId", "Scope", "Applies", "RateIdCode", "Description", "RateIdValue", "SortOrder")
  SELECT new_id, "Scope", "Applies", "RateIdCode", "Description", "RateIdValue", "SortOrder"
  FROM public."RateProgramFbeCodes" WHERE "ProgramId" = p_source_id;

  INSERT INTO public."DepositRateAuthorities"
    ("ProgramId", "TenorLabel", "AuthorityLevel", "CurrentRate", "AdjustedRate", "SortOrder")
  SELECT new_id, "TenorLabel", "AuthorityLevel", "CurrentRate", "AdjustedRate", "SortOrder"
  FROM public."DepositRateAuthorities" WHERE "ProgramId" = p_source_id;

  INSERT INTO public."RateProgramFeeOptions"
    ("ProgramId", "OptionLabel", "PackageGroup", "MinFeeRatio", "CounterFeeRatio", "Note", "SortOrder")
  SELECT new_id, "OptionLabel", "PackageGroup", "MinFeeRatio", "CounterFeeRatio", "Note", "SortOrder"
  FROM public."RateProgramFeeOptions" WHERE "ProgramId" = p_source_id;

  INSERT INTO public."RateProgramConditions"
    ("ProgramId", "Heading", "Content", "SortOrder")
  SELECT new_id, "Heading", "Content", "SortOrder"
  FROM public."RateProgramConditions" WHERE "ProgramId" = p_source_id;

  RETURN new_id;
END;
$$;

COMMENT ON FUNCTION public.clone_rate_program IS
  'Nhân bản chương trình lãi suất sang khoảng ngày mới, chép cả 6 bảng con. Cho phép chồng lấn (bản mới nhất thắng); chỉ chặn khi trùng đúng ngày bắt đầu cùng loại. Bản sao luôn SourceVerified = false. Chỉ admin chạy được (SECURITY INVOKER, RLS vẫn áp).';

REVOKE ALL ON FUNCTION public.clone_rate_program(integer, text, text, date, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.clone_rate_program(integer, text, text, date, date, date) TO authenticated;

COMMIT;


-- Đối chiếu sau khi chạy: hàm còn đó, vẫn SECURITY INVOKER (prosecdef = false).
--   SELECT p.proname, p.prosecdef AS security_definer
--   FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
--   WHERE n.nspname = 'public' AND p.proname = 'clone_rate_program';
--
-- Xóa chương trình KHÔNG cần hàm riêng: RatePrograms có RLS FOR ALL (is_admin())
-- và 6 bảng con đều ON DELETE CASCADE, nên ứng dụng xóa trực tiếp qua PostgREST
-- với điều kiện SourceVerified = false (xem deleteRateProgramAPI).
