BEGIN;
CREATE TABLE public."LoanProgressEntries" (
  "Id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "OwnerId" uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  "Month" text NOT NULL CHECK ("Month" ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  "CustomerKind" text NOT NULL CHECK ("CustomerKind" IN ('new','existing')),
  "CustomerId" bigint REFERENCES public."Customers"("Id") ON DELETE RESTRICT,
  "CustomerName" text NOT NULL CHECK (length(btrim("CustomerName")) BETWEEN 1 AND 200),
  "Amount" numeric CHECK ("Amount" BETWEEN 0 AND 999999999999999 AND trunc("Amount")="Amount"),
  "Cards" integer CHECK ("Cards" >= 0),
  "Fees" numeric CHECK ("Fees" BETWEEN 0 AND 999999999999999 AND trunc("Fees")="Fees"),
  "Insurance" numeric CHECK ("Insurance" BETWEEN 0 AND 999999999999999 AND trunc("Insurance")="Insurance"),
  "CaseType" text NOT NULL CHECK ("CaseType" IN ('Mới','Tái cấp','Tái cấp tăng thêm','Tái cấp giảm','Ngắn hạn chuyển Trung dài hạn')),
  "LoanTerm" text NOT NULL CHECK ("LoanTerm" IN ('Ngắn hạn','Dài hạn')),
  "Stage" text NOT NULL CHECK ("Stage" IN ('Mới nhận hồ sơ','Thu thập hồ sơ','Đã gửi định giá','Đang lập tờ trình','Đã trình ký','Đã trình HO','Chờ phê duyệt','Đã có phê duyệt','Đang công chứng','Chờ giải ngân','Đã giải ngân')),
  "Version" integer NOT NULL DEFAULT 1,
  "CreatedAt" timestamptz NOT NULL DEFAULT statement_timestamp(),
  "UpdatedAt" timestamptz NOT NULL DEFAULT statement_timestamp(),
  CHECK (("CustomerKind"='new' AND "CustomerId" IS NULL) OR ("CustomerKind"='existing' AND "CustomerId" IS NOT NULL))
);
CREATE INDEX "LoanProgressEntries_owner_month_idx" ON public."LoanProgressEntries" ("OwnerId","Month","Id");
CREATE TABLE public."LoanProgressHistory" (
  "Id" bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  "EntryId" uuid NOT NULL REFERENCES public."LoanProgressEntries"("Id") ON DELETE RESTRICT,
  "OldValue" jsonb,
  "NewValue" jsonb NOT NULL,
  "ChangedBy" uuid REFERENCES auth.users(id),
  "ChangedAt" timestamptz NOT NULL DEFAULT statement_timestamp()
);
CREATE INDEX "LoanProgressHistory_entry_idx" ON public."LoanProgressHistory" ("EntryId","Id");

CREATE FUNCTION app_team.can_read_progress_owner(p_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT app_team.account_active() AND public.has_module('credit') AND (
    p_owner=(SELECT auth.uid()) OR public.is_admin() OR EXISTS (
      SELECT 1 FROM public."TeamMemberships" m
      WHERE m."UserId"=p_owner AND m."EffectiveFrom"<=statement_timestamp()
        AND (m."EffectiveTo" IS NULL OR m."EffectiveTo">statement_timestamp())
        AND app_team.can_lead_team(m."TeamId")
    )
  );
$$;
CREATE FUNCTION app_team.guard_progress()
RETURNS trigger LANGUAGE plpgsql SET search_path=''
AS $$
BEGIN
  IF TG_OP='UPDATE' THEN
    IF NEW."Id" IS DISTINCT FROM OLD."Id" OR NEW."OwnerId" IS DISTINCT FROM OLD."OwnerId"
      OR NEW."CreatedAt" IS DISTINCT FROM OLD."CreatedAt" THEN
      RAISE EXCEPTION 'Không được thay đổi mã, chủ sở hữu hoặc ngày tạo hồ sơ.';
    END IF;
    NEW."Version" := OLD."Version"+1;
  ELSE
    NEW."Version" := 1;
    NEW."CreatedAt" := statement_timestamp();
  END IF;
  NEW."UpdatedAt" := statement_timestamp();
  IF NEW."CustomerKind"='existing' THEN
    SELECT c."FullName" INTO NEW."CustomerName" FROM public."Customers" c
      WHERE c."Id"=NEW."CustomerId" AND c."OwnerId"=NEW."OwnerId";
    IF NOT FOUND THEN RAISE EXCEPTION 'Khách hàng hiện hữu không thuộc người nhập.'; END IF;
  ELSE
    NEW."CustomerName" := btrim(NEW."CustomerName");
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION app_team.audit_progress()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  INSERT INTO public."LoanProgressHistory" ("EntryId","OldValue","NewValue","ChangedBy")
  VALUES (NEW."Id",CASE WHEN TG_OP='UPDATE' THEN to_jsonb(OLD) ELSE NULL END,to_jsonb(NEW),auth.uid());
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION app_team.can_read_progress_owner(uuid), app_team.guard_progress(), app_team.audit_progress() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_team.can_read_progress_owner(uuid) TO authenticated;
CREATE TRIGGER progress_guard BEFORE INSERT OR UPDATE ON public."LoanProgressEntries"
  FOR EACH ROW EXECUTE FUNCTION app_team.guard_progress();
CREATE TRIGGER progress_audit AFTER INSERT OR UPDATE ON public."LoanProgressEntries"
  FOR EACH ROW EXECUTE FUNCTION app_team.audit_progress();
ALTER TABLE public."LoanProgressEntries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."LoanProgressHistory" ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public."LoanProgressEntries",public."LoanProgressHistory" FROM anon,authenticated;
GRANT SELECT,INSERT ON public."LoanProgressEntries" TO authenticated;
GRANT UPDATE ("Month","CustomerKind","CustomerId","CustomerName","Amount","Cards","Fees","Insurance","CaseType","LoanTerm","Stage")
  ON public."LoanProgressEntries" TO authenticated;
CREATE POLICY progress_read ON public."LoanProgressEntries" FOR SELECT TO authenticated
  USING (app_team.can_read_progress_owner("OwnerId"));
CREATE POLICY progress_insert ON public."LoanProgressEntries" FOR INSERT TO authenticated
  WITH CHECK ("OwnerId"=(SELECT auth.uid()) AND app_team.account_active() AND public.has_module('credit'));
CREATE POLICY progress_update ON public."LoanProgressEntries" FOR UPDATE TO authenticated
  USING ("OwnerId"=(SELECT auth.uid()) AND app_team.account_active() AND public.has_module('credit'))
  WITH CHECK ("OwnerId"=(SELECT auth.uid()) AND app_team.account_active() AND public.has_module('credit'));
COMMIT;
