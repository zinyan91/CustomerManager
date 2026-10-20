BEGIN;
ALTER TABLE public."LoanProgressEntries"
  ADD COLUMN "AssigneeId" uuid REFERENCES auth.users(id) ON DELETE RESTRICT,
  ADD COLUMN "AssigneeName" text;
CREATE INDEX "LoanProgressEntries_assignee_idx" ON public."LoanProgressEntries" ("AssigneeId");
CREATE FUNCTION app_team.guard_progress_assignee()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $$
BEGIN
  IF TG_OP='UPDATE' AND NEW."AssigneeId" IS NOT DISTINCT FROM OLD."AssigneeId"
    AND NEW."TeamId" IS NOT DISTINCT FROM OLD."TeamId" THEN
    NEW."AssigneeName" := OLD."AssigneeName";
    RETURN NEW;
  END IF;
  IF NEW."AssigneeId" IS NULL THEN
    RAISE EXCEPTION 'Chọn nhân sự phụ trách.';
  END IF;
  SELECT coalesce(nullif(btrim(r."FullName"),''),'Chưa có tên') INTO NEW."AssigneeName"
  FROM public."TeamMemberships" m
  JOIN public."Teams" t ON t."Id"=m."TeamId" AND t."IsActive"
  JOIN auth.users u ON u.id=m."UserId" AND (u.banned_until IS NULL OR u.banned_until<=statement_timestamp())
  LEFT JOIN public."UserRoles" r ON r."UserId"=m."UserId"
  WHERE m."TeamId"=NEW."TeamId" AND m."UserId"=NEW."AssigneeId"
    AND m."EffectiveFrom"<=statement_timestamp()
    AND (m."EffectiveTo" IS NULL OR m."EffectiveTo">statement_timestamp());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nhân sự phụ trách không thuộc team đang chọn hoặc đã ngừng hoạt động.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION app_team.guard_progress_assignee() FROM PUBLIC;
CREATE TRIGGER progress_assignee_guard BEFORE INSERT OR UPDATE ON public."LoanProgressEntries"
  FOR EACH ROW EXECUTE FUNCTION app_team.guard_progress_assignee();
GRANT UPDATE ("AssigneeId") ON public."LoanProgressEntries" TO authenticated;
COMMIT;
