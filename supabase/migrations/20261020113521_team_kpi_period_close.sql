BEGIN;
CREATE TABLE app_team."KpiPeriodSnapshots" (
  "Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "PeriodId" uuid NOT NULL REFERENCES public."KpiPeriods"("Id") ON DELETE RESTRICT,
  "Snapshot" jsonb NOT NULL,
  "Reason" text NOT NULL,
  "CreatedAt" timestamptz NOT NULL DEFAULT statement_timestamp(),
  "CreatedBy" uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);
ALTER TABLE app_team."KpiPeriodSnapshots" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON app_team."KpiPeriodSnapshots" FROM PUBLIC,anon,authenticated;

CREATE FUNCTION app_team.set_kpi_period_status(p_period uuid,p_status text,p_reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_period public."KpiPeriods"%ROWTYPE;
  v_batch public."KpiInputBatches"%ROWTYPE;
  v_snapshot jsonb;
  v_cutoff timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-manager:team-membership',0));
  IF NOT app_team.can_manage_teams() THEN
    RAISE EXCEPTION 'Chỉ Master Admin được chốt hoặc mở lại kỳ KPI.' USING ERRCODE='42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('open','closed') THEN
    RAISE EXCEPTION 'Trạng thái kỳ KPI không hợp lệ.';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Nhập lý do từ 1 đến 1000 ký tự.';
  END IF;
  SELECT * INTO v_period FROM public."KpiPeriods" WHERE "Id"=p_period FOR UPDATE;
  IF v_period."Id" IS NULL THEN RAISE EXCEPTION 'Kỳ KPI không tồn tại.'; END IF;
  IF v_period."Status"=p_status THEN RETURN; END IF;
  SELECT * INTO v_batch FROM public."KpiInputBatches" WHERE "PeriodId"=p_period ORDER BY "Revision" DESC LIMIT 1;
  IF p_status='closed' THEN
    IF v_batch."Id" IS NULL OR v_batch."DataAsOf"<>(v_period."Month"+interval '1 month'-interval '1 day')::date THEN
      RAISE EXCEPTION 'Chỉ chốt kỳ khi có dữ liệu đến ngày cuối tháng.';
    END IF;
    v_cutoff := (v_batch."DataAsOf"+1)::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh';
    IF NOT EXISTS (SELECT 1 FROM public."TeamMemberships" m WHERE m."TeamId"=v_period."TeamId"
      AND m."EffectiveFrom"<v_cutoff AND (m."EffectiveTo" IS NULL OR m."EffectiveTo">=v_cutoff)) THEN
      RAISE EXCEPTION 'Team chưa có nhân sự tại mốc chốt kỳ.';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public."TeamMemberships" m CROSS JOIN public."KpiDefinitions" d
      WHERE m."TeamId"=v_period."TeamId" AND m."EffectiveFrom"<v_cutoff
        AND (m."EffectiveTo" IS NULL OR m."EffectiveTo">=v_cutoff)
        AND (NOT EXISTS (SELECT 1 FROM public."KpiObservations" o WHERE o."BatchId"=v_batch."Id"
          AND o."UserId"=m."UserId" AND o."MetricCode"=d."Code")
        OR NOT EXISTS (SELECT 1 FROM public."MemberKpiTargets" t WHERE t."PeriodId"=p_period
          AND t."UserId"=m."UserId" AND t."MetricCode"=d."Code"))
    ) THEN RAISE EXCEPTION 'Chưa đủ số thực hiện hoặc chỉ tiêu cho từng thành viên và KPI.'; END IF;
    SELECT jsonb_build_object(
      'period',to_jsonb(v_period),'batch',to_jsonb(v_batch),
      'teamTargets',(SELECT jsonb_agg(t ORDER BY t."MetricCode") FROM public."TeamKpiTargets" t WHERE t."PeriodId"=p_period),
      'memberTargets',(SELECT jsonb_agg(t ORDER BY t."UserId",t."MetricCode") FROM public."MemberKpiTargets" t WHERE t."PeriodId"=p_period),
      'observations',(SELECT jsonb_agg(o ORDER BY o."UserId",o."MetricCode") FROM public."KpiObservations" o WHERE o."BatchId"=v_batch."Id"),
      'memberships',(SELECT jsonb_agg(m ORDER BY m."UserId") FROM public."TeamMemberships" m
        WHERE m."TeamId"=v_period."TeamId" AND m."EffectiveFrom"<v_cutoff
        AND (m."EffectiveTo" IS NULL OR m."EffectiveTo">=v_cutoff))
    ) INTO v_snapshot;
    INSERT INTO app_team."KpiPeriodSnapshots" ("PeriodId","Snapshot","Reason","CreatedBy")
      VALUES (p_period,v_snapshot,btrim(p_reason),auth.uid());
  END IF;
  UPDATE public."KpiPeriods" SET "Status"=p_status WHERE "Id"=p_period;
  INSERT INTO public."KpiAuditLog" ("PeriodId","Entity","OldValue","NewValue","Reason","ChangedBy")
    VALUES (p_period,'KpiPeriods',jsonb_build_object('Status',v_period."Status"),
      jsonb_build_object('Status',p_status),btrim(p_reason),auth.uid());
END;
$$;
CREATE FUNCTION public.set_kpi_period_status(p_period uuid,p_status text,p_reason text)
RETURNS void LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT app_team.set_kpi_period_status(p_period,p_status,p_reason); $$;
REVOKE ALL ON FUNCTION app_team.set_kpi_period_status(uuid,text,text),
  public.set_kpi_period_status(uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app_team.set_kpi_period_status(uuid,text,text),
  public.set_kpi_period_status(uuid,text,text) TO authenticated;
COMMIT;
