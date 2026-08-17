-- Hàm nhân bản một chương trình lãi suất sang khoảng ngày mới.
--
-- Vì sao cần: ứng dụng không có đường nào thêm chương trình lãi suất. Mỗi kỳ
-- mới phải viết một migration tay như 30_huy_dong_tuan_le_vang_2400.sql, trong
-- khi phần lớn kỳ mới dùng lại nguyên khung bảng lãi suất của kỳ trước, chỉ đổi
-- số văn bản, khoảng ngày và vài con số. Nhân bản rồi sửa từng ô bằng khối
-- "SỬA THÔNG SỐ (CHỈ ADMIN)" sẵn có nhanh và ít sai hơn gõ lại toàn bộ.
--
-- Vì sao là hàm trong CSDL chứ không phải 7 lệnh insert từ trình duyệt: bản sao
-- trải trên 7 bảng, đứt giữa chừng sẽ để lại chương trình thiếu dòng lãi suất
-- mà vẫn được coi là hiệu lực. Trong hàm thì cả cụm nằm trong một giao dịch.
--
-- SECURITY INVOKER (mặc định) nên RLS vẫn áp: chỉ admin ghi được, đúng như
-- chính sách đặt ở migration 09. KHÔNG dùng SECURITY DEFINER ở đây.
--
-- Bản sao luôn đặt SourceVerified = false. Số liệu chép từ kỳ trước chưa được
-- đối chiếu văn bản kỳ mới, và cờ này chặn việc đem đi chào khách.

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

  -- Xét cả chương trình nguồn: bản sao là một dòng MỚI nên nó cũng không được
  -- chồng lấn với chính kỳ mà nó chép ra.
  IF EXISTS (
    SELECT 1 FROM public."RatePrograms"
    WHERE "Kind" = src."Kind"
      AND ("EffectiveTo" IS NULL OR p_effective_from <= "EffectiveTo")
      AND (p_effective_to IS NULL OR "EffectiveFrom" <= p_effective_to)
  ) THEN
    RAISE EXCEPTION 'Khoảng ngày chồng lấn với chương trình cùng loại đang có. Đóng chương trình đó lại trước.';
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
  'Nhân bản chương trình lãi suất sang khoảng ngày mới, chép cả 6 bảng con. Bản sao luôn SourceVerified = false. Chỉ admin chạy được vì RLS vẫn áp (SECURITY INVOKER).';

REVOKE ALL ON FUNCTION public.clone_rate_program(integer, text, text, date, date, date) FROM public;
GRANT EXECUTE ON FUNCTION public.clone_rate_program(integer, text, text, date, date, date) TO authenticated;

COMMIT;


-- Đối chiếu sau khi chạy: hàm đã tồn tại và chỉ authenticated gọi được.
SELECT p.proname,
       pg_get_function_identity_arguments(p.oid) AS tham_so,
       p.prosecdef                               AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.proname = 'clone_rate_program';
