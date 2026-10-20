BEGIN;

ALTER FUNCTION public.team_member_directory(uuid) SET SCHEMA app_team;
CREATE FUNCTION public.team_member_directory(p_team uuid)
RETURNS TABLE (
  "MembershipId" uuid, "TeamId" uuid, "UserId" uuid, "TeamRole" text,
  "FullName" text, "EffectiveFrom" timestamptz, "EffectiveTo" timestamptz
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT * FROM app_team.team_member_directory(p_team); $$;
REVOKE ALL ON FUNCTION public.team_member_directory(uuid),app_team.team_member_directory(uuid),
  public.assign_team_member(uuid,uuid,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.team_member_directory(uuid),app_team.team_member_directory(uuid),
  public.assign_team_member(uuid,uuid,text,text) TO authenticated;

CREATE TABLE public."KpiDefinitions" (
  "Code" text PRIMARY KEY,
  "Name" text NOT NULL,
  "Unit" text NOT NULL CHECK ("Unit" IN ('VND', 'count')),
  "Aggregation" text NOT NULL CHECK ("Aggregation" IN ('flow', 'stock')),
  "SortOrder" integer NOT NULL UNIQUE
);
INSERT INTO public."KpiDefinitions" VALUES
  ('net_loan','Tăng ròng cho vay','VND','flow',1),
  ('net_term_deposit','Tăng ròng huy động có kỳ hạn','VND','flow',2),
  ('net_casa','Tăng ròng CASA','VND','flow',3),
  ('new_customers','Khách hàng mới','count','flow',4),
  ('service_fees','Phí dịch vụ','VND','flow',5),
  ('loan_balance','Quy mô dư nợ quản lý','VND','stock',6),
  ('credit_cards','Thẻ tín dụng','count','flow',7);

CREATE TABLE public."KpiPeriods" (
  "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "TeamId" uuid NOT NULL REFERENCES public."Teams"("Id") ON DELETE RESTRICT,
  "Month" date NOT NULL CHECK (extract(day FROM "Month") = 1),
  "Status" text NOT NULL DEFAULT 'open' CHECK ("Status" IN ('open','closed')),
  "CreatedAt" timestamptz NOT NULL DEFAULT statement_timestamp(),
  "CreatedBy" uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  UNIQUE ("TeamId","Month")
);

CREATE TABLE public."TeamKpiTargets" (
  "PeriodId" uuid NOT NULL REFERENCES public."KpiPeriods"("Id") ON DELETE RESTRICT,
  "MetricCode" text NOT NULL REFERENCES public."KpiDefinitions"("Code") ON DELETE RESTRICT,
  "Amount" numeric(20,2) NOT NULL CHECK ("Amount" >= 0 AND "Amount" <> 'NaN'::numeric),
  "Version" integer NOT NULL DEFAULT 1 CHECK ("Version" > 0),
  PRIMARY KEY ("PeriodId","MetricCode")
);
CREATE TABLE public."MemberKpiTargets" (
  "PeriodId" uuid NOT NULL,
  "MetricCode" text NOT NULL,
  "UserId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  "Amount" numeric(20,2) NOT NULL CHECK ("Amount" >= 0 AND "Amount" <> 'NaN'::numeric),
  "Version" integer NOT NULL DEFAULT 1 CHECK ("Version" > 0),
  PRIMARY KEY ("PeriodId","MetricCode","UserId"),
  FOREIGN KEY ("PeriodId","MetricCode") REFERENCES public."TeamKpiTargets"("PeriodId","MetricCode") ON DELETE RESTRICT
);
CREATE INDEX "MemberKpiTargets_user_idx" ON public."MemberKpiTargets" ("UserId","PeriodId");

CREATE TABLE public."KpiAuditLog" (
  "Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "PeriodId" uuid NOT NULL REFERENCES public."KpiPeriods"("Id") ON DELETE RESTRICT,
  "Entity" text NOT NULL,
  "OldValue" jsonb,
  "NewValue" jsonb NOT NULL,
  "Reason" text NOT NULL,
  "ChangedAt" timestamptz NOT NULL DEFAULT statement_timestamp(),
  "ChangedBy" uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT
);
CREATE INDEX "KpiAuditLog_period_idx" ON public."KpiAuditLog" ("PeriodId","ChangedAt");

CREATE FUNCTION app_team.can_view_kpi_period(p_period uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public."KpiPeriods" p
    WHERE p."Id"=p_period AND app_team.can_view_team(p."TeamId"));
$$;
CREATE FUNCTION app_team.can_lead_kpi_period(p_period uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (SELECT 1 FROM public."KpiPeriods" p
    WHERE p."Id"=p_period AND app_team.can_lead_team(p."TeamId"));
$$;

ALTER TABLE public."KpiDefinitions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."KpiPeriods" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeamKpiTargets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."MemberKpiTargets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."KpiAuditLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."KpiDefinitions",public."KpiPeriods",public."TeamKpiTargets",
  public."MemberKpiTargets",public."KpiAuditLog" FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public."KpiDefinitions",public."KpiPeriods",public."TeamKpiTargets",
  public."MemberKpiTargets",public."KpiAuditLog" TO authenticated;

CREATE POLICY kpi_definition_read ON public."KpiDefinitions" FOR SELECT TO authenticated
  USING ((SELECT app_team.account_active() AND public.has_module('credit')));
CREATE POLICY kpi_period_read ON public."KpiPeriods" FOR SELECT TO authenticated
  USING (app_team.can_view_team("TeamId"));
CREATE POLICY kpi_team_target_read ON public."TeamKpiTargets" FOR SELECT TO authenticated
  USING (app_team.can_view_kpi_period("PeriodId"));
CREATE POLICY kpi_member_target_read ON public."MemberKpiTargets" FOR SELECT TO authenticated
  USING (app_team.can_lead_kpi_period("PeriodId") OR
    ("UserId"=(SELECT auth.uid()) AND app_team.can_view_kpi_period("PeriodId")));
CREATE POLICY kpi_audit_read ON public."KpiAuditLog" FOR SELECT TO authenticated
  USING (app_team.can_lead_kpi_period("PeriodId"));

CREATE FUNCTION app_team.create_kpi_period(p_team uuid,p_month date)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE v_id uuid;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-manager:team-membership',0));
  IF NOT app_team.can_manage_teams() THEN
    RAISE EXCEPTION 'Chỉ Master Admin được tạo kỳ KPI.' USING ERRCODE='42501';
  END IF;
  IF p_month IS NULL OR extract(day FROM p_month)<>1 THEN
    RAISE EXCEPTION 'Kỳ KPI phải là ngày đầu tháng.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Teams" WHERE "Id"=p_team AND "IsActive") THEN
    RAISE EXCEPTION 'Team không tồn tại hoặc đã ngừng hoạt động.';
  END IF;
  INSERT INTO public."KpiPeriods" ("TeamId","Month","CreatedBy")
    VALUES (p_team,p_month,auth.uid()) RETURNING "Id" INTO v_id;
  INSERT INTO public."KpiAuditLog" ("PeriodId","Entity","NewValue","Reason","ChangedBy")
    VALUES (v_id,'KpiPeriods',jsonb_build_object('TeamId',p_team,'Month',p_month),'Tạo kỳ KPI',auth.uid());
  RETURN v_id;
END;
$$;

CREATE FUNCTION app_team.save_kpi_target(
  p_period uuid,p_metric text,p_user uuid,p_amount numeric,p_version integer,p_reason text
)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_period public."KpiPeriods"%ROWTYPE;
  v_budget public."TeamKpiTargets"%ROWTYPE;
  v_member public."MemberKpiTargets"%ROWTYPE;
  v_old jsonb;
  v_new jsonb;
  v_version integer;
  v_allocated numeric;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-manager:team-membership',0));
  IF NOT app_team.account_active() OR NOT public.has_module('credit') THEN
    RAISE EXCEPTION 'Bạn không có quyền cập nhật chỉ tiêu KPI.' USING ERRCODE='42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Nhập lý do thay đổi từ 1 đến 1000 ký tự.';
  END IF;
  IF p_amount IS NULL OR p_amount<0 OR p_amount::text IN ('NaN','Infinity','-Infinity')
    OR p_amount <> round(p_amount,2) THEN
    RAISE EXCEPTION 'Chỉ tiêu phải là số không âm, tối đa hai chữ số thập phân.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."KpiDefinitions" WHERE "Code"=p_metric) THEN
    RAISE EXCEPTION 'Chỉ tiêu KPI không hợp lệ.';
  END IF;
  IF EXISTS (SELECT 1 FROM public."KpiDefinitions" WHERE "Code"=p_metric AND "Unit"='count')
    AND p_amount<>trunc(p_amount) THEN
    RAISE EXCEPTION 'Chỉ tiêu số lượng phải là số nguyên.';
  END IF;
  IF p_user IS NULL THEN
    IF NOT app_team.can_manage_teams() THEN
      RAISE EXCEPTION 'Chỉ Master Admin được giao ngân sách team.' USING ERRCODE='42501';
    END IF;
  ELSIF NOT app_team.can_lead_kpi_period(p_period) THEN
    RAISE EXCEPTION 'Bạn không có quyền phân bổ chỉ tiêu của team này.' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_period FROM public."KpiPeriods" WHERE "Id"=p_period FOR UPDATE;
  IF v_period."Id" IS NULL OR v_period."Status"<>'open' THEN
    RAISE EXCEPTION 'Kỳ KPI không tồn tại hoặc đã chốt.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public."Teams" WHERE "Id"=v_period."TeamId" AND "IsActive") THEN
    RAISE EXCEPTION 'Team đã ngừng hoạt động.';
  END IF;
  SELECT * INTO v_budget FROM public."TeamKpiTargets"
    WHERE "PeriodId"=p_period AND "MetricCode"=p_metric;
  SELECT coalesce(sum("Amount"),0) INTO v_allocated FROM public."MemberKpiTargets"
    WHERE "PeriodId"=p_period AND "MetricCode"=p_metric;
  IF p_user IS NULL THEN
    IF p_version IS DISTINCT FROM coalesce(v_budget."Version",0) THEN
      RAISE EXCEPTION 'Chỉ tiêu đã thay đổi. Tải lại dữ liệu trước khi lưu.' USING ERRCODE='40001';
    END IF;
    IF p_amount<v_allocated THEN
      RAISE EXCEPTION 'Ngân sách team không được thấp hơn tổng chỉ tiêu đã phân bổ.';
    END IF;
    v_old := CASE WHEN v_budget."Version" IS NULL THEN NULL ELSE to_jsonb(v_budget) END;
    v_version := coalesce(v_budget."Version",0)+1;
    INSERT INTO public."TeamKpiTargets" VALUES (p_period,p_metric,p_amount,v_version)
      ON CONFLICT ("PeriodId","MetricCode") DO UPDATE
      SET "Amount"=excluded."Amount","Version"=excluded."Version"
      RETURNING to_jsonb("TeamKpiTargets".*) INTO v_new;
  ELSE
    IF v_budget."Version" IS NULL THEN
      RAISE EXCEPTION 'Chưa có ngân sách team cho chỉ tiêu này.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public."TeamMemberships" WHERE "TeamId"=v_period."TeamId"
      AND "UserId"=p_user AND "EffectiveFrom"<=statement_timestamp()
      AND ("EffectiveTo" IS NULL OR "EffectiveTo">statement_timestamp())) THEN
      RAISE EXCEPTION 'Tài khoản không còn là thành viên của team.';
    END IF;
    SELECT * INTO v_member FROM public."MemberKpiTargets"
      WHERE "PeriodId"=p_period AND "MetricCode"=p_metric AND "UserId"=p_user;
    IF p_version IS DISTINCT FROM coalesce(v_member."Version",0) THEN
      RAISE EXCEPTION 'Chỉ tiêu đã thay đổi. Tải lại dữ liệu trước khi lưu.' USING ERRCODE='40001';
    END IF;
    IF v_allocated-coalesce(v_member."Amount",0)+p_amount>v_budget."Amount" THEN
      RAISE EXCEPTION 'Tổng phân bổ vượt ngân sách team.';
    END IF;
    v_old := CASE WHEN v_member."Version" IS NULL THEN NULL ELSE to_jsonb(v_member) END;
    v_version := coalesce(v_member."Version",0)+1;
    INSERT INTO public."MemberKpiTargets" VALUES (p_period,p_metric,p_user,p_amount,v_version)
      ON CONFLICT ("PeriodId","MetricCode","UserId") DO UPDATE
      SET "Amount"=excluded."Amount","Version"=excluded."Version"
      RETURNING to_jsonb("MemberKpiTargets".*) INTO v_new;
  END IF;
  INSERT INTO public."KpiAuditLog" ("PeriodId","Entity","OldValue","NewValue","Reason","ChangedBy")
    VALUES (p_period,CASE WHEN p_user IS NULL THEN 'TeamKpiTargets' ELSE 'MemberKpiTargets' END,
      v_old,v_new,btrim(p_reason),auth.uid());
  RETURN v_version;
END;
$$;

CREATE FUNCTION public.create_kpi_period(p_team uuid,p_month date)
RETURNS uuid LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT app_team.create_kpi_period(p_team,p_month); $$;
CREATE FUNCTION public.save_kpi_target(
  p_period uuid,p_metric text,p_user uuid,p_amount numeric,p_version integer,p_reason text
)
RETURNS integer LANGUAGE sql SECURITY INVOKER SET search_path = ''
AS $$ SELECT app_team.save_kpi_target(p_period,p_metric,p_user,p_amount,p_version,p_reason); $$;

REVOKE ALL ON FUNCTION app_team.can_view_kpi_period(uuid),app_team.can_lead_kpi_period(uuid),
  app_team.create_kpi_period(uuid,date),app_team.save_kpi_target(uuid,text,uuid,numeric,integer,text),
  public.create_kpi_period(uuid,date),public.save_kpi_target(uuid,text,uuid,numeric,integer,text)
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app_team.can_view_kpi_period(uuid),app_team.can_lead_kpi_period(uuid),
  app_team.create_kpi_period(uuid,date),app_team.save_kpi_target(uuid,text,uuid,numeric,integer,text),
  public.create_kpi_period(uuid,date),public.save_kpi_target(uuid,text,uuid,numeric,integer,text)
  TO authenticated;

COMMIT;
