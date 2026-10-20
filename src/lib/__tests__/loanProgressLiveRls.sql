BEGIN;
CREATE TEMP TABLE verify_context AS SELECT p."Id" AS entry,p."OwnerId" AS admin,m."TeamId" AS team,m."UserId" AS leader,
 (SELECT "UserId" FROM public."TeamMemberships" WHERE "TeamId"=m."TeamId" AND "TeamRole"='member' AND "EffectiveTo" IS NULL AND "UserId" IN (SELECT "UserId" FROM public."UserRoles" WHERE "Role"='user') ORDER BY "UserId" LIMIT 1) AS member
 FROM public."LoanProgressEntries" p CROSS JOIN public."TeamMemberships" m WHERE (p."TeamId" IS NULL OR p."TeamId"=m."TeamId") AND m."TeamRole"='leader' AND m."EffectiveTo" IS NULL LIMIT 1;
GRANT SELECT ON verify_context TO authenticated;
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM verify_context WHERE admin IS NOT NULL AND leader IS NOT NULL AND member IS NOT NULL)
   THEN RAISE EXCEPTION 'Thiếu danh tính/dữ liệu kiểm thử'; END IF;
END $$;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT admin::text FROM verify_context),true);
UPDATE public."LoanProgressEntries" SET "TeamId"=(SELECT team FROM verify_context),"AssigneeId"=(SELECT member FROM verify_context) WHERE "Id"=(SELECT entry FROM verify_context);
SELECT set_config('request.jwt.claim.sub',(SELECT leader::text FROM verify_context),true);
DO $$ DECLARE changed integer; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public."LoanProgressEntries" WHERE "TeamId"=(SELECT team FROM verify_context) AND "Id"=(SELECT entry FROM verify_context)) THEN RAISE EXCEPTION 'Leader không nhận báo cáo Admin'; END IF;
 IF NOT EXISTS(SELECT 1 FROM public."LoanProgressEntries" p
   WHERE p."Id"=(SELECT entry FROM verify_context) AND p."AssigneeId"=(SELECT member FROM verify_context)
     AND length(p."AssigneeName")>0) THEN RAISE EXCEPTION 'Nhân sự phụ trách không được lưu đúng'; END IF;
 UPDATE public."LoanProgressEntries" SET "Stage"='Thu thập hồ sơ' WHERE "Id"=(SELECT entry FROM verify_context);
 GET DIAGNOSTICS changed=ROW_COUNT; IF changed<>1 THEN RAISE EXCEPTION 'Leader không sửa được team'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub',(SELECT member::text FROM verify_context),true);
DO $$ DECLARE changed integer; BEGIN
 IF NOT EXISTS(SELECT 1 FROM public."LoanProgressEntries" WHERE "Id"=(SELECT entry FROM verify_context)) THEN RAISE EXCEPTION 'Member không xem được'; END IF;
 UPDATE public."LoanProgressEntries" SET "Stage"='Đã giải ngân' WHERE "Id"=(SELECT entry FROM verify_context);
 GET DIAGNOSTICS changed=ROW_COUNT;
 IF changed<>0 AND NOT public.is_admin() THEN RAISE EXCEPTION 'Member sửa được'; END IF;
END $$;
ROLLBACK;
SELECT count(*) AS preserved_rows,count(*) FILTER(WHERE "TeamId" IS NULL) AS still_unassigned,'PASS Admin assign -> Leader sees/edits -> member reads; rollback' AS result FROM public."LoanProgressEntries";
