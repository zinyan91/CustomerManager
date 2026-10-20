BEGIN;
CREATE OR REPLACE FUNCTION app_team.can_read_customer(p_customer bigint)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT coalesce((nullif(current_setting('request.headers',true),'')::jsonb->>'x-team-read')='1',false)
    AND app_team.account_active() AND public.has_module('credit') AND EXISTS (
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
COMMIT;
