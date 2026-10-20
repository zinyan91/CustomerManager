BEGIN;
ALTER TABLE public."LoanProgressEntries" ADD COLUMN "TeamId" uuid REFERENCES public."Teams"("Id") ON DELETE RESTRICT;
CREATE INDEX "LoanProgressEntries_team_month_idx" ON public."LoanProgressEntries" ("TeamId","Month","Id");
CREATE FUNCTION app_team.can_write_progress_team(p_team uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$
  SELECT p_team IS NOT NULL AND app_team.account_active() AND public.has_module('credit')
    AND EXISTS(SELECT 1 FROM public."Teams" t WHERE t."Id"=p_team AND t."IsActive")
    AND app_team.can_lead_team(p_team);
$$;
REVOKE ALL ON FUNCTION app_team.can_write_progress_team(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app_team.can_write_progress_team(uuid) TO authenticated;
DROP POLICY progress_read ON public."LoanProgressEntries";
DROP POLICY progress_insert ON public."LoanProgressEntries";
DROP POLICY progress_update ON public."LoanProgressEntries";
CREATE POLICY progress_read ON public."LoanProgressEntries" FOR SELECT TO authenticated
  USING (app_team.account_active() AND public.has_module('credit') AND (
    ("TeamId" IS NOT NULL AND app_team.can_view_team("TeamId"))
    OR ("TeamId" IS NULL AND ("OwnerId"=(SELECT auth.uid()) OR public.is_admin()))
  ));
CREATE POLICY progress_insert ON public."LoanProgressEntries" FOR INSERT TO authenticated
  WITH CHECK ("OwnerId"=(SELECT auth.uid()) AND app_team.can_write_progress_team("TeamId"));
CREATE POLICY progress_update ON public."LoanProgressEntries" FOR UPDATE TO authenticated
  USING (app_team.can_write_progress_team("TeamId")
    OR ("TeamId" IS NULL AND app_team.account_active() AND public.has_module('credit') AND public.is_admin()))
  WITH CHECK (app_team.can_write_progress_team("TeamId"));
GRANT UPDATE ("TeamId") ON public."LoanProgressEntries" TO authenticated;
COMMIT;
