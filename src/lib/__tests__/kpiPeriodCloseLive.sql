BEGIN;
CREATE TEMP TABLE kpi_close_context (
  user_id uuid,team_id uuid,period_id uuid,batch_id uuid,month date
) ON COMMIT DROP;
GRANT SELECT ON kpi_close_context TO authenticated;
DO $$
DECLARE v_user uuid; v_team uuid := gen_random_uuid(); v_period uuid := gen_random_uuid();
  v_batch uuid := gen_random_uuid();
  v_month date := (date_trunc('month',statement_timestamp() AT TIME ZONE 'Asia/Ho_Chi_Minh')-interval '1 month')::date;
BEGIN
  SELECT r."UserId" INTO v_user FROM public."UserRoles" r JOIN auth.users u ON u.id=r."UserId"
  WHERE r."Role"='master_admin' AND (u.banned_until IS NULL OR u.banned_until<=statement_timestamp())
    AND NOT EXISTS (SELECT 1 FROM public."TeamMemberships" m WHERE m."UserId"=r."UserId")
  ORDER BY r."UserId" LIMIT 1;
  IF v_user IS NULL THEN RAISE EXCEPTION 'Cần Master Admin chưa có lịch sử team để kiểm trong giao dịch rollback.'; END IF;
  INSERT INTO kpi_close_context VALUES (v_user,v_team,v_period,v_batch,v_month);
  INSERT INTO public."Teams" ("Id","Name") VALUES (v_team,'Rolled-back KPI close verification');
  INSERT INTO public."TeamMemberships" ("TeamId","UserId","TeamRole","EffectiveFrom","EffectiveTo","ChangeReason")
    VALUES (v_team,v_user,'leader',v_month::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh',
      (v_month+interval '1 month')::timestamp AT TIME ZONE 'Asia/Ho_Chi_Minh','Rolled-back fixture');
  INSERT INTO public."KpiPeriods" ("Id","TeamId","Month") VALUES (v_period,v_team,v_month);
  INSERT INTO public."TeamKpiTargets" ("PeriodId","MetricCode","Amount")
    SELECT v_period,"Code",100 FROM public."KpiDefinitions";
  INSERT INTO public."MemberKpiTargets" ("PeriodId","MetricCode","UserId","Amount")
    SELECT v_period,"Code",v_user,10 FROM public."KpiDefinitions";
  INSERT INTO public."KpiInputBatches" ("Id","PeriodId","Revision","DataAsOf","SourceName","Reason","Rows","PublishedBy")
    VALUES (v_batch,v_period,1,(v_month+interval '1 month'-interval '1 day')::date,'Fixture','Rolled-back fixture',7,v_user);
  INSERT INTO public."KpiObservations" ("BatchId","UserId","MetricCode","Amount",
    "FeeNiceNumber","FeeNonLife","FeeLife","FeeCancellation","FeeCredit","FeeFx","FeeCounterDigital")
    SELECT v_batch,v_user,"Code",0,0,0,0,0,0,0,0 FROM public."KpiDefinitions";
END;
$$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT user_id::text FROM kpi_close_context),true);
DO $$
DECLARE v kpi_close_context%ROWTYPE; v_failed boolean := false;
BEGIN
  SELECT * INTO v FROM kpi_close_context;
  PERFORM public.set_kpi_period_status(v.period_id,'closed','Rolled-back close test');
  IF (SELECT "Status" FROM public."KpiPeriods" WHERE "Id"=v.period_id)<>'closed' THEN
    RAISE EXCEPTION 'Kỳ chưa chốt';
  END IF;
  BEGIN
    PERFORM public.save_kpi_target(v.period_id,'net_loan',NULL,120,1,'Must reject closed edit');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%đã chốt%' THEN v_failed := true; ELSE RAISE; END IF;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Kỳ chốt vẫn sửa được'; END IF;
  PERFORM public.set_kpi_period_status(v.period_id,'open','Rolled-back reopen test');
END;
$$;
RESET ROLE;
DO $$ BEGIN
  IF (SELECT count(*) FROM app_team."KpiPeriodSnapshots" WHERE "PeriodId"=(SELECT period_id FROM kpi_close_context))<>1 THEN
    RAISE EXCEPTION 'Mở lại kỳ làm mất snapshot';
  END IF;
END $$;
ROLLBACK;
