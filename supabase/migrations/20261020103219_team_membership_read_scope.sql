BEGIN;

CREATE SCHEMA IF NOT EXISTS app_team;
REVOKE ALL ON SCHEMA app_team FROM PUBLIC;
GRANT USAGE ON SCHEMA app_team TO authenticated;

CREATE TABLE IF NOT EXISTS public."Teams" (
  "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "Name" text NOT NULL CHECK (length(btrim("Name")) BETWEEN 1 AND 100),
  "IsActive" boolean NOT NULL DEFAULT true,
  "CreatedAt" timestamptz NOT NULL DEFAULT statement_timestamp(),
  "CreatedBy" uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public."TeamMemberships" (
  "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "TeamId" uuid NOT NULL REFERENCES public."Teams"("Id") ON DELETE RESTRICT,
  "UserId" uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  "TeamRole" text NOT NULL CHECK ("TeamRole" IN ('leader', 'member')),
  "EffectiveFrom" timestamptz NOT NULL DEFAULT clock_timestamp(),
  "EffectiveTo" timestamptz,
  "ChangeReason" text NOT NULL CHECK (length(btrim("ChangeReason")) BETWEEN 1 AND 1000),
  CHECK ("EffectiveTo" IS NULL OR "EffectiveTo" > "EffectiveFrom")
);

CREATE INDEX IF NOT EXISTS "TeamMemberships_user_period_idx"
  ON public."TeamMemberships" ("UserId", "EffectiveFrom", "EffectiveTo");
CREATE INDEX IF NOT EXISTS "TeamMemberships_team_period_idx"
  ON public."TeamMemberships" ("TeamId", "TeamRole", "EffectiveFrom", "EffectiveTo");

CREATE TABLE IF NOT EXISTS public."TeamAuditLog" (
  "Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "TeamId" uuid NOT NULL REFERENCES public."Teams"("Id") ON DELETE RESTRICT,
  "Entity" text NOT NULL,
  "Operation" text NOT NULL CHECK ("Operation" IN ('INSERT', 'UPDATE')),
  "OldValue" jsonb,
  "NewValue" jsonb NOT NULL,
  "ChangedAt" timestamptz NOT NULL DEFAULT clock_timestamp(),
  "ChangedBy" uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "TeamAuditLog_team_time_idx"
  ON public."TeamAuditLog" ("TeamId", "ChangedAt");

CREATE OR REPLACE FUNCTION app_team.account_active()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = (SELECT auth.uid()) AND (banned_until IS NULL OR banned_until <= statement_timestamp())
  );
$$;

CREATE OR REPLACE FUNCTION app_team.can_view_team(p_team uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT app_team.account_active() AND public.has_module('credit') AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public."TeamMemberships" m
      JOIN public."Teams" t ON t."Id" = m."TeamId"
      WHERE m."TeamId" = p_team AND m."UserId" = (SELECT auth.uid()) AND t."IsActive"
        AND m."EffectiveFrom" <= statement_timestamp() AND (m."EffectiveTo" IS NULL OR m."EffectiveTo" > statement_timestamp())
    )
  );
$$;

CREATE OR REPLACE FUNCTION app_team.can_lead_team(p_team uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT app_team.account_active() AND public.has_module('credit') AND (
    public.is_admin() OR EXISTS (
      SELECT 1 FROM public."TeamMemberships" m
      JOIN public."Teams" t ON t."Id" = m."TeamId"
      WHERE m."TeamId" = p_team AND m."UserId" = (SELECT auth.uid()) AND t."IsActive"
        AND m."TeamRole" = 'leader' AND m."EffectiveFrom" <= statement_timestamp()
        AND (m."EffectiveTo" IS NULL OR m."EffectiveTo" > statement_timestamp())
    )
  );
$$;

CREATE OR REPLACE FUNCTION app_team.can_manage_teams()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT app_team.account_active() AND public.has_module('credit') AND public.is_master_admin();
$$;

CREATE OR REPLACE FUNCTION app_team.can_read_customer(p_customer bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT app_team.account_active() AND public.has_module('credit') AND EXISTS (
    SELECT 1 FROM public."Customers" c
    JOIN public."TeamMemberships" owner_membership ON owner_membership."UserId" = c."OwnerId"
    JOIN public."Teams" t ON t."Id" = owner_membership."TeamId"
    JOIN public."TeamMemberships" leader_membership ON leader_membership."TeamId" = t."Id"
    WHERE c."Id" = p_customer AND t."IsActive"
      AND leader_membership."UserId" = (SELECT auth.uid()) AND leader_membership."TeamRole" = 'leader'
      AND leader_membership."EffectiveFrom" <= statement_timestamp()
      AND (leader_membership."EffectiveTo" IS NULL OR leader_membership."EffectiveTo" > statement_timestamp())
      AND owner_membership."EffectiveFrom" <= statement_timestamp()
      AND (owner_membership."EffectiveTo" IS NULL OR owner_membership."EffectiveTo" > statement_timestamp())
  );
$$;

CREATE OR REPLACE FUNCTION app_team.guard_membership()
RETURNS trigger LANGUAGE plpgsql SET search_path = ''
AS $$
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-manager:team-membership', 0));
  IF TG_OP = 'UPDATE' THEN
    IF NEW."Id" IS DISTINCT FROM OLD."Id" OR NEW."TeamId" IS DISTINCT FROM OLD."TeamId"
      OR NEW."UserId" IS DISTINCT FROM OLD."UserId" OR NEW."TeamRole" IS DISTINCT FROM OLD."TeamRole"
      OR NEW."EffectiveFrom" IS DISTINCT FROM OLD."EffectiveFrom" THEN
      RAISE EXCEPTION 'Không sửa lịch sử membership; hãy kết thúc và tạo membership mới.';
    END IF;
    IF OLD."EffectiveTo" IS NOT NULL AND NEW."EffectiveTo" IS DISTINCT FROM OLD."EffectiveTo" THEN
      RAISE EXCEPTION 'Không mở lại hoặc thay đổi membership đã kết thúc.';
    END IF;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public."TeamMemberships" m
    WHERE m."Id" <> NEW."Id" AND m."UserId" = NEW."UserId"
      AND tstzrange(m."EffectiveFrom", m."EffectiveTo", '[)')
        && tstzrange(NEW."EffectiveFrom", NEW."EffectiveTo", '[)')
  ) THEN
    RAISE EXCEPTION 'Khoảng thành viên chồng lấn với team khác hoặc membership hiện tại.';
  END IF;
  IF NEW."TeamRole" = 'leader' AND EXISTS (
    SELECT 1 FROM public."TeamMemberships" m
    WHERE m."Id" <> NEW."Id" AND m."TeamId" = NEW."TeamId" AND m."TeamRole" = 'leader'
      AND tstzrange(m."EffectiveFrom", m."EffectiveTo", '[)')
        && tstzrange(NEW."EffectiveFrom", NEW."EffectiveTo", '[)')
  ) THEN
    RAISE EXCEPTION 'Team có Leader trong khoảng thời gian này.';
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION app_team.audit_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public."TeamAuditLog" ("TeamId", "Entity", "Operation", "OldValue", "NewValue", "ChangedBy")
  VALUES (
    (CASE WHEN TG_TABLE_NAME = 'Teams' THEN to_jsonb(NEW)->>'Id' ELSE to_jsonb(NEW)->>'TeamId' END)::uuid,
    TG_TABLE_NAME, TG_OP, CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END,
    to_jsonb(NEW), auth.uid()
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS team_membership_guard ON public."TeamMemberships";
CREATE TRIGGER team_membership_guard BEFORE INSERT OR UPDATE ON public."TeamMemberships"
  FOR EACH ROW EXECUTE FUNCTION app_team.guard_membership();
DROP TRIGGER IF EXISTS team_membership_audit ON public."TeamMemberships";
CREATE TRIGGER team_membership_audit AFTER INSERT OR UPDATE ON public."TeamMemberships"
  FOR EACH ROW EXECUTE FUNCTION app_team.audit_change();
DROP TRIGGER IF EXISTS team_audit ON public."Teams";
CREATE TRIGGER team_audit AFTER INSERT OR UPDATE ON public."Teams"
  FOR EACH ROW EXECUTE FUNCTION app_team.audit_change();

ALTER TABLE public."Teams" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeamMemberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TeamAuditLog" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."Teams", public."TeamMemberships", public."TeamAuditLog" FROM anon, authenticated;
GRANT SELECT, INSERT ON public."Teams", public."TeamMemberships" TO authenticated;
GRANT UPDATE ("Name", "IsActive") ON public."Teams" TO authenticated;
GRANT UPDATE ("EffectiveTo", "ChangeReason") ON public."TeamMemberships" TO authenticated;
GRANT SELECT ON public."TeamAuditLog" TO authenticated;

CREATE POLICY team_select ON public."Teams" FOR SELECT TO authenticated
  USING (app_team.can_view_team("Id"));
CREATE POLICY team_insert ON public."Teams" FOR INSERT TO authenticated
  WITH CHECK (app_team.can_manage_teams());
CREATE POLICY team_update ON public."Teams" FOR UPDATE TO authenticated
  USING (app_team.can_manage_teams()) WITH CHECK (app_team.can_manage_teams());
CREATE POLICY membership_select ON public."TeamMemberships" FOR SELECT TO authenticated
  USING (app_team.account_active() AND public.has_module('credit')
    AND ("UserId" = (SELECT auth.uid()) OR app_team.can_lead_team("TeamId")));
CREATE POLICY membership_insert ON public."TeamMemberships" FOR INSERT TO authenticated
  WITH CHECK (app_team.can_manage_teams());
CREATE POLICY membership_update ON public."TeamMemberships" FOR UPDATE TO authenticated
  USING (app_team.can_manage_teams()) WITH CHECK (app_team.can_manage_teams());
CREATE POLICY team_audit_select ON public."TeamAuditLog" FOR SELECT TO authenticated
  USING (app_team.can_lead_team("TeamId"));

CREATE OR REPLACE FUNCTION public.team_member_directory(p_team uuid)
RETURNS TABLE (
  "MembershipId" uuid, "TeamId" uuid, "UserId" uuid, "TeamRole" text,
  "FullName" text, "EffectiveFrom" timestamptz, "EffectiveTo" timestamptz
) LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NOT app_team.can_lead_team(p_team) THEN
    RAISE EXCEPTION 'Bạn không có quyền xem nhân sự của team này.' USING ERRCODE = '42501';
  END IF;
  RETURN QUERY SELECT m."Id", m."TeamId", m."UserId", m."TeamRole",
    coalesce(r."FullName", 'Chưa có tên'), m."EffectiveFrom", m."EffectiveTo"
  FROM public."TeamMemberships" m
  LEFT JOIN public."UserRoles" r ON r."UserId" = m."UserId"
  WHERE m."TeamId" = p_team AND m."EffectiveFrom" <= statement_timestamp()
    AND (m."EffectiveTo" IS NULL OR m."EffectiveTo" > statement_timestamp())
  ORDER BY CASE WHEN m."TeamRole" = 'leader' THEN 0 ELSE 1 END, r."FullName", m."UserId";
END;
$$;

CREATE OR REPLACE FUNCTION public.assign_team_member(p_team uuid, p_user uuid, p_role text, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_at timestamptz := clock_timestamp();
  v_existing public."TeamMemberships"%ROWTYPE;
  v_leader public."TeamMemberships"%ROWTYPE;
  v_id uuid;
BEGIN
  IF NOT app_team.can_manage_teams() THEN
    RAISE EXCEPTION 'Bạn không có quyền gán thành viên hoặc Leader.' USING ERRCODE = '42501';
  END IF;
  IF p_reason IS NULL OR length(btrim(p_reason)) NOT BETWEEN 1 AND 1000 THEN
    RAISE EXCEPTION 'Nhập lý do thay đổi từ 1 đến 1000 ký tự.';
  END IF;
  IF p_role IS NULL OR p_role NOT IN ('leader', 'member') THEN
    RAISE EXCEPTION 'Vai trò trong team không hợp lệ.';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended('customer-manager:team-membership', 0));
  IF NOT EXISTS (SELECT 1 FROM public."Teams" WHERE "Id" = p_team AND "IsActive") THEN
    RAISE EXCEPTION 'Team không tồn tại hoặc đã ngừng hoạt động.';
  END IF;
  SELECT * INTO v_existing FROM public."TeamMemberships"
    WHERE "UserId" = p_user AND "EffectiveFrom" <= v_at AND ("EffectiveTo" IS NULL OR "EffectiveTo" > v_at);
  IF v_existing."Id" IS NOT NULL AND v_existing."TeamId" = p_team AND v_existing."TeamRole" = p_role THEN
    RETURN v_existing."Id";
  END IF;
  IF v_existing."TeamRole" = 'leader' AND
      (v_existing."TeamId" <> p_team OR p_role <> 'leader') AND
      EXISTS (SELECT 1 FROM public."Teams" WHERE "Id" = v_existing."TeamId" AND "IsActive") THEN
    RAISE EXCEPTION 'Hãy bổ nhiệm Leader thay thế trước khi chuyển Leader hiện tại.';
  END IF;
  IF p_role = 'leader' THEN
    FOR v_leader IN SELECT * FROM public."TeamMemberships"
      WHERE "TeamId" = p_team AND "TeamRole" = 'leader' AND "UserId" <> p_user
        AND "EffectiveFrom" <= v_at AND ("EffectiveTo" IS NULL OR "EffectiveTo" > v_at)
    LOOP
      UPDATE public."TeamMemberships" SET "EffectiveTo" = v_at, "ChangeReason" = btrim(p_reason)
        WHERE "Id" = v_leader."Id";
      INSERT INTO public."TeamMemberships" ("TeamId", "UserId", "TeamRole", "EffectiveFrom", "ChangeReason")
        VALUES (p_team, v_leader."UserId", 'member', v_at, btrim(p_reason));
    END LOOP;
  END IF;
  IF v_existing."Id" IS NOT NULL THEN
    UPDATE public."TeamMemberships" SET "EffectiveTo" = v_at, "ChangeReason" = btrim(p_reason)
      WHERE "Id" = v_existing."Id";
  END IF;
  INSERT INTO public."TeamMemberships" ("TeamId", "UserId", "TeamRole", "EffectiveFrom", "ChangeReason")
    VALUES (p_team, p_user, p_role, v_at, btrim(p_reason)) RETURNING "Id" INTO v_id;
  RETURN v_id;
END;
$$;

DO $$
DECLARE v record;
BEGIN
  FOR v IN SELECT * FROM (VALUES
    ('Customers', 'app_team.can_read_customer("Id")'),
    ('CreditContracts', 'app_team.can_read_customer("CustomerId")'),
    ('LoanContracts', 'app_team.can_read_customer("CustomerId")'),
    ('Collaterals', 'app_team.can_read_customer("CustomerId")'),
    ('MortgageContracts', 'app_team.can_read_customer("CustomerId")'),
    ('CardContracts', 'app_team.can_read_customer("CustomerId")'),
    ('PostLoanControlRecords', 'app_team.can_read_customer("CustomerId")'),
    ('RepaymentSchedules', 'EXISTS (SELECT 1 FROM public."LoanContracts" p WHERE p."Id" = "RepaymentSchedules"."ContractId" AND app_team.can_read_customer(p."CustomerId"))'),
    ('CollateralAppraisals', 'EXISTS (SELECT 1 FROM public."Collaterals" p WHERE p."Id" = "CollateralAppraisals"."CollateralId" AND app_team.can_read_customer(p."CustomerId"))'),
    ('CardSupplementaryHolders', 'EXISTS (SELECT 1 FROM public."CardContracts" p WHERE p."Id" = "CardSupplementaryHolders"."CardContractId" AND app_team.can_read_customer(p."CustomerId"))'),
    ('MortgageContractCollaterals', 'EXISTS (SELECT 1 FROM public."MortgageContracts" p WHERE p."Id" = "MortgageContractCollaterals"."MortgageContractId" AND app_team.can_read_customer(p."CustomerId"))'),
    ('MortgageContractCreditContracts', 'EXISTS (SELECT 1 FROM public."MortgageContracts" p WHERE p."Id" = "MortgageContractCreditContracts"."MortgageContractId" AND app_team.can_read_customer(p."CustomerId"))'),
    ('ContractCollaterals', 'EXISTS (SELECT 1 FROM public."LoanContracts" p WHERE p."Id" = "ContractCollaterals"."ContractId" AND app_team.can_read_customer(p."CustomerId"))')
  ) AS p(tbl, predicate)
  LOOP
    IF to_regclass(format('public.%I', v.tbl)) IS NOT NULL THEN
      EXECUTE format('CREATE POLICY team_read ON public.%I FOR SELECT TO authenticated USING (%s)', v.tbl, v.predicate);
    END IF;
  END LOOP;
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA app_team FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_team.account_active(), app_team.can_view_team(uuid),
  app_team.can_lead_team(uuid), app_team.can_manage_teams(), app_team.can_read_customer(bigint)
  TO authenticated;
REVOKE ALL ON FUNCTION public.team_member_directory(uuid), public.assign_team_member(uuid,uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.team_member_directory(uuid), public.assign_team_member(uuid,uuid,text,text) TO authenticated;

COMMIT;
