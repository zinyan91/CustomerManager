BEGIN;

CREATE TABLE public."KpiInputBatches" (
  "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "PeriodId" uuid NOT NULL REFERENCES public."KpiPeriods"("Id") ON DELETE RESTRICT,
  "Revision" integer NOT NULL CHECK ("Revision">0),
  "DataAsOf" date NOT NULL,
  "SourceName" text NOT NULL CHECK (length(btrim("SourceName")) BETWEEN 1 AND 200),
  "Reason" text NOT NULL CHECK (length(btrim("Reason")) BETWEEN 1 AND 1000),
  "Rows" integer NOT NULL CHECK ("Rows">0),
  "PublishedAt" timestamptz NOT NULL DEFAULT statement_timestamp(),
  "PublishedBy" uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  UNIQUE ("PeriodId","Revision")
);
CREATE TABLE public."KpiObservations" (
  "BatchId" uuid NOT NULL REFERENCES public."KpiInputBatches"("Id") ON DELETE RESTRICT,
  "UserId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  "MetricCode" text NOT NULL REFERENCES public."KpiDefinitions"("Code") ON DELETE RESTRICT,
  "Amount" numeric(20,2) NOT NULL CHECK ("Amount" <> 'NaN'::numeric),
  "FeeNiceNumber" numeric(20,2),
  "FeeNonLife" numeric(20,2),
  "FeeLife" numeric(20,2),
  "FeeCancellation" numeric(20,2),
  "FeeCredit" numeric(20,2),
  "FeeFx" numeric(20,2),
  "FeeCounterDigital" numeric(20,2),
  PRIMARY KEY ("BatchId","UserId","MetricCode"),
  CHECK ("MetricCode"<>'service_fees' OR (
    "FeeNiceNumber" IS NOT NULL AND "FeeNonLife" IS NOT NULL AND "FeeLife" IS NOT NULL
    AND "FeeCancellation" IS NOT NULL AND "FeeCredit" IS NOT NULL AND "FeeFx" IS NOT NULL
    AND "FeeCounterDigital" IS NOT NULL AND
    "Amount"="FeeNiceNumber"+"FeeNonLife"+"FeeLife"+"FeeCancellation"+"FeeCredit"+"FeeFx"+"FeeCounterDigital"
  ))
);
CREATE INDEX "KpiObservations_user_idx" ON public."KpiObservations" ("UserId","BatchId");

CREATE FUNCTION app_team.can_view_kpi_batch(p_batch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public."KpiInputBatches" b
  WHERE b."Id"=p_batch AND app_team.can_view_kpi_period(b."PeriodId")); $$;
CREATE FUNCTION app_team.can_lead_kpi_batch(p_batch uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$ SELECT EXISTS (SELECT 1 FROM public."KpiInputBatches" b
  WHERE b."Id"=p_batch AND app_team.can_lead_kpi_period(b."PeriodId")); $$;

ALTER TABLE public."KpiInputBatches" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."KpiObservations" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."KpiInputBatches",public."KpiObservations" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public."KpiInputBatches",public."KpiObservations" TO authenticated;
CREATE POLICY kpi_batch_read ON public."KpiInputBatches" FOR SELECT TO authenticated
  USING (app_team.can_view_kpi_period("PeriodId"));
CREATE POLICY kpi_observation_read ON public."KpiObservations" FOR SELECT TO authenticated
  USING (app_team.can_lead_kpi_batch("BatchId") OR
    ("UserId"=(SELECT auth.uid()) AND app_team.can_view_kpi_batch("BatchId")));

CREATE FUNCTION app_team.publish_kpi_import(
  p_period uuid,p_revision integer,p_as_of date,p_source text,p_reason text,p_rows jsonb
)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_period public."KpiPeriods"%ROWTYPE;
  v_previous public."KpiInputBatches"%ROWTYPE;
  v_id uuid;
  v_row record;
  v_count integer;
  v_fee numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-manager:team-membership',0));
  IF NOT app_team.can_manage_teams() THEN
    RAISE EXCEPTION 'Chỉ Master Admin được công bố dữ liệu KPI.' USING ERRCODE='42501';
  END IF;
  IF p_source IS NULL OR length(btrim(p_source)) NOT BETWEEN 1 AND 200
    OR p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Nhập tên nguồn và lý do công bố hợp lệ.';
  END IF;
  IF p_rows IS NULL OR jsonb_typeof(p_rows)<>'array' THEN
    RAISE EXCEPTION 'Dữ liệu nhập phải là danh sách.';
  END IF;
  v_count := jsonb_array_length(p_rows);
  IF v_count NOT BETWEEN 1 AND 10000 THEN
    RAISE EXCEPTION 'Mỗi lần nhập cần từ 1 đến 10000 dòng.';
  END IF;
  SELECT * INTO v_period FROM public."KpiPeriods" WHERE "Id"=p_period FOR UPDATE;
  IF v_period."Id" IS NULL OR v_period."Status"<>'open' THEN
    RAISE EXCEPTION 'Kỳ KPI không tồn tại hoặc đã chốt.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Teams" WHERE "Id"=v_period."TeamId" AND "IsActive") THEN
    RAISE EXCEPTION 'Team đã ngừng hoạt động.';
  END IF;
  IF p_as_of IS NULL OR p_as_of<v_period."Month"
    OR p_as_of>=v_period."Month"+interval '1 month'
    OR p_as_of>(statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date THEN
    RAISE EXCEPTION 'Mốc dữ liệu phải nằm trong kỳ KPI và không ở tương lai.';
  END IF;
  SELECT * INTO v_previous FROM public."KpiInputBatches" WHERE "PeriodId"=p_period ORDER BY "Revision" DESC LIMIT 1;
  IF p_revision IS DISTINCT FROM coalesce(v_previous."Revision",0) THEN
    RAISE EXCEPTION 'Dữ liệu KPI đã thay đổi. Xem trước lại trước khi công bố.' USING ERRCODE='40001';
  END IF;
  IF EXISTS (SELECT 1 FROM jsonb_to_recordset(p_rows) AS r("UserId" uuid,"MetricCode" text)
    GROUP BY r."UserId",r."MetricCode" HAVING count(*)>1) THEN
    RAISE EXCEPTION 'Trùng tài khoản và chỉ tiêu trong tệp.';
  END IF;
  FOR v_row IN SELECT * FROM jsonb_to_recordset(p_rows) AS r(
    "UserId" uuid,"MetricCode" text,"Amount" numeric,
    "FeeNiceNumber" numeric,"FeeNonLife" numeric,"FeeLife" numeric,"FeeCancellation" numeric,
    "FeeCredit" numeric,"FeeFx" numeric,"FeeCounterDigital" numeric
  ) LOOP
    IF NOT EXISTS (SELECT 1 FROM public."TeamMemberships" m WHERE m."TeamId"=v_period."TeamId"
      AND m."UserId"=v_row."UserId" AND m."EffectiveFrom"<(p_as_of+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh'
      AND (m."EffectiveTo" IS NULL OR m."EffectiveTo">=(p_as_of+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh')) THEN
      RAISE EXCEPTION 'Tài khoản không thuộc team tại mốc dữ liệu.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public."KpiDefinitions" WHERE "Code"=v_row."MetricCode") THEN
      RAISE EXCEPTION 'Mã chỉ tiêu không hợp lệ.';
    END IF;
    IF v_row."Amount" IS NULL OR v_row."Amount"::text IN ('NaN','Infinity','-Infinity')
      OR v_row."Amount"<>round(v_row."Amount",2) THEN
      RAISE EXCEPTION 'Số thực hiện không hợp lệ.';
    END IF;
    IF v_row."MetricCode" IN ('new_customers','credit_cards','loan_balance') AND v_row."Amount"<0 THEN
      RAISE EXCEPTION 'Số lượng và quy mô dư nợ không được âm.';
    END IF;
    IF v_row."MetricCode" IN ('new_customers','credit_cards') AND v_row."Amount"<>trunc(v_row."Amount") THEN
      RAISE EXCEPTION 'Số lượng phải là số nguyên.';
    END IF;
    IF v_row."MetricCode"='service_fees' AND
      (v_row."FeeNiceNumber" IS NULL OR v_row."FeeNonLife" IS NULL OR v_row."FeeLife" IS NULL
      OR v_row."FeeCancellation" IS NULL OR v_row."FeeCredit" IS NULL OR v_row."FeeFx" IS NULL
      OR v_row."FeeCounterDigital" IS NULL OR
      v_row."Amount"<>v_row."FeeNiceNumber"+v_row."FeeNonLife"+v_row."FeeLife"+v_row."FeeCancellation"
        +v_row."FeeCredit"+v_row."FeeFx"+v_row."FeeCounterDigital") THEN
      RAISE EXCEPTION 'Tổng phí không khớp bảy thành phần phí.';
    END IF;
    FOREACH v_fee IN ARRAY ARRAY[v_row."FeeNiceNumber",v_row."FeeNonLife",v_row."FeeLife",
      v_row."FeeCancellation",v_row."FeeCredit",v_row."FeeFx",v_row."FeeCounterDigital"]
    LOOP
      IF v_fee IS NOT NULL AND (v_fee::text IN ('NaN','Infinity','-Infinity') OR v_fee<>round(v_fee,2)) THEN
        RAISE EXCEPTION 'Thành phần phí phải là số, tối đa hai chữ số thập phân.';
      END IF;
    END LOOP;
  END LOOP;
  IF v_previous."Id" IS NOT NULL AND v_previous."DataAsOf"=p_as_of AND
    NOT EXISTS (
      (SELECT to_jsonb(o)-'BatchId' FROM public."KpiObservations" o WHERE o."BatchId"=v_previous."Id"
       EXCEPT SELECT to_jsonb(r) FROM jsonb_to_recordset(p_rows) AS r(
        "UserId" uuid,"MetricCode" text,"Amount" numeric,"FeeNiceNumber" numeric,"FeeNonLife" numeric,
        "FeeLife" numeric,"FeeCancellation" numeric,"FeeCredit" numeric,"FeeFx" numeric,"FeeCounterDigital" numeric))
      UNION ALL
      (SELECT to_jsonb(r) FROM jsonb_to_recordset(p_rows) AS r(
        "UserId" uuid,"MetricCode" text,"Amount" numeric,"FeeNiceNumber" numeric,"FeeNonLife" numeric,
        "FeeLife" numeric,"FeeCancellation" numeric,"FeeCredit" numeric,"FeeFx" numeric,"FeeCounterDigital" numeric)
       EXCEPT SELECT to_jsonb(o)-'BatchId' FROM public."KpiObservations" o WHERE o."BatchId"=v_previous."Id")
    ) THEN RETURN v_previous."Id";
  END IF;
  INSERT INTO public."KpiInputBatches" ("PeriodId","Revision","DataAsOf","SourceName","Reason","Rows","PublishedBy")
    VALUES (p_period,coalesce(v_previous."Revision",0)+1,p_as_of,btrim(p_source),btrim(p_reason),v_count,auth.uid())
    RETURNING "Id" INTO v_id;
  INSERT INTO public."KpiObservations"
    SELECT v_id,r.* FROM jsonb_to_recordset(p_rows) AS r(
      "UserId" uuid,"MetricCode" text,"Amount" numeric,"FeeNiceNumber" numeric,"FeeNonLife" numeric,
      "FeeLife" numeric,"FeeCancellation" numeric,"FeeCredit" numeric,"FeeFx" numeric,"FeeCounterDigital" numeric);
  INSERT INTO public."KpiAuditLog" ("PeriodId","Entity","OldValue","NewValue","Reason","ChangedBy")
    VALUES (p_period,'KpiInputBatches',
      CASE WHEN v_previous."Id" IS NULL THEN NULL ELSE jsonb_build_object('Id',v_previous."Id",'Revision',v_previous."Revision") END,
      jsonb_build_object('Id',v_id,'Revision',coalesce(v_previous."Revision",0)+1,'Rows',v_count),
      btrim(p_reason),auth.uid());
  RETURN v_id;
END;
$$;
CREATE FUNCTION public.publish_kpi_import(
  p_period uuid,p_revision integer,p_as_of date,p_source text,p_reason text,p_rows jsonb
)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT app_team.publish_kpi_import(p_period,p_revision,p_as_of,p_source,p_reason,p_rows); $$;
REVOKE ALL ON FUNCTION app_team.can_view_kpi_batch(uuid),app_team.can_lead_kpi_batch(uuid),
  app_team.publish_kpi_import(uuid,integer,date,text,text,jsonb),
  public.publish_kpi_import(uuid,integer,date,text,text,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app_team.can_view_kpi_batch(uuid),app_team.can_lead_kpi_batch(uuid),
  app_team.publish_kpi_import(uuid,integer,date,text,text,jsonb),
  public.publish_kpi_import(uuid,integer,date,text,text,jsonb) TO authenticated;
COMMIT;
