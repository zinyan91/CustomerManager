BEGIN;
SET LOCAL statement_timeout = '30s';

CREATE TEMP TABLE team_live_context (
  leader_id uuid, member_id uuid, master_id uuid,
  team_a uuid, team_b uuid, customer_base integer
) ON COMMIT DROP;
GRANT SELECT ON team_live_context TO authenticated;

DO $$
DECLARE
  v_users uuid[];
  v_master uuid;
  v_team_a uuid := gen_random_uuid();
  v_team_b uuid := gen_random_uuid();
  v_base integer := -100000000 - floor(random() * 1000000000)::integer;
BEGIN
  SELECT array_agg("UserId" ORDER BY "UserId") INTO v_users FROM (
    SELECT r."UserId" FROM public."UserRoles" r JOIN auth.users u ON u.id=r."UserId"
    WHERE r."Role"='user' AND (u.banned_until IS NULL OR u.banned_until<=statement_timestamp())
      AND (NOT EXISTS (SELECT 1 FROM public."UserModules" m WHERE m."UserId"=r."UserId")
        OR EXISTS (SELECT 1 FROM public."UserModules" m WHERE m."UserId"=r."UserId" AND 'credit'=ANY(m."Modules")))
    ORDER BY r."UserId" LIMIT 2
  ) q;
  SELECT r."UserId" INTO v_master FROM public."UserRoles" r JOIN auth.users u ON u.id=r."UserId"
    WHERE r."Role"='master_admin' AND (u.banned_until IS NULL OR u.banned_until<=statement_timestamp())
    ORDER BY r."UserId" LIMIT 1;
  IF coalesce(array_length(v_users,1),0)<>2 OR v_master IS NULL THEN
    RAISE EXCEPTION 'Cần hai tài khoản User có module credit và một Master Admin để kiểm RLS.';
  END IF;
  IF EXISTS (SELECT 1 FROM public."TeamMemberships" WHERE "UserId"=ANY(v_users)
    AND "EffectiveTo" IS NULL) THEN
    RAISE EXCEPTION 'Tài khoản kiểm thử đã có team; cần chọn danh tính kiểm thử khác.';
  END IF;
  INSERT INTO team_live_context VALUES (v_users[1],v_users[2],v_master,v_team_a,v_team_b,v_base);
  INSERT INTO public."Teams" ("Id","Name") VALUES
    (v_team_a,'RLS verification A'),(v_team_b,'RLS verification B');
  INSERT INTO public."TeamMemberships" ("TeamId","UserId","TeamRole","EffectiveFrom","ChangeReason") VALUES
    (v_team_a,v_users[1],'leader',statement_timestamp()-interval '1 second','Rolled-back verification'),
    (v_team_a,v_users[2],'member',statement_timestamp()-interval '1 second','Rolled-back verification'),
    (v_team_b,v_master,'leader',statement_timestamp()-interval '1 second','Rolled-back verification');
  INSERT INTO public."Customers" ("Id","CifKh","FullName","OwnerId") VALUES
    (v_base,substr(replace(gen_random_uuid()::text,'-',''),1,9),'RLS Leader fixture',v_users[1]),
    (v_base-1,substr(replace(gen_random_uuid()::text,'-',''),1,9),'RLS Member fixture',v_users[2]),
    (v_base-2,substr(replace(gen_random_uuid()::text,'-',''),1,9),'RLS Outside fixture',v_master),
    (v_base-3,substr(replace(gen_random_uuid()::text,'-',''),1,9),'RLS Unassigned fixture',NULL);
END;
$$;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT leader_id::text FROM team_live_context),true);
SELECT set_config('request.headers','{"x-team-read":"1"}',true);
SET LOCAL row_security = on;

DO $$
DECLARE v team_live_context%ROWTYPE; v_count integer; v_changed integer;
BEGIN
  SELECT * INTO v FROM team_live_context;
  IF current_user <> 'authenticated' THEN RAISE EXCEPTION 'RLS chưa chạy dưới authenticated'; END IF;
  PERFORM set_config('request.headers','{}',true);
  SELECT count(*) INTO v_count FROM public."Customers" WHERE "Id" BETWEEN v.customer_base-3 AND v.customer_base;
  IF v_count<>1 THEN RAISE EXCEPTION 'Dashboard cũ đọc rộng cả team'; END IF;
  PERFORM set_config('request.headers','{"x-team-read":"1"}',true);
  SELECT count(*) INTO v_count FROM public."Customers" WHERE "Id" BETWEEN v.customer_base-3 AND v.customer_base;
  IF v_count<>2 THEN RAISE EXCEPTION 'Leader phải chỉ thấy hai hồ sơ fixture thuộc team, thực tế %',v_count; END IF;
  UPDATE public."Customers" SET "FullName"='Must not change' WHERE "Id"=v.customer_base-1;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed<>0 THEN RAISE EXCEPTION 'Leader sửa được hồ sơ người khác'; END IF;
  DELETE FROM public."Customers" WHERE "Id"=v.customer_base-1;
  GET DIAGNOSTICS v_changed = ROW_COUNT;
  IF v_changed<>0 THEN RAISE EXCEPTION 'Leader xóa được hồ sơ người khác'; END IF;
  SELECT count(*) INTO v_count FROM public.team_member_directory(v.team_a);
  IF v_count<>2 THEN RAISE EXCEPTION 'Danh bạ team không khớp'; END IF;
  BEGIN
    PERFORM public.team_member_directory(v.team_b);
    RAISE EXCEPTION 'Leader xem được danh bạ team khác';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.assign_team_member(v.team_a,v.leader_id,'leader','Unauthorized');
    RAISE EXCEPTION 'Leader tự gọi được API bổ nhiệm';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub',(SELECT member_id::text FROM team_live_context),true);
DO $$
DECLARE v team_live_context%ROWTYPE; v_count integer;
BEGIN
  SELECT * INTO v FROM team_live_context;
  SELECT count(*) INTO v_count FROM public."Customers" WHERE "Id" BETWEEN v.customer_base-3 AND v.customer_base;
  IF v_count<>1 THEN RAISE EXCEPTION 'Thành viên phải chỉ xem được một hồ sơ fixture của mình'; END IF;
  BEGIN
    PERFORM public.team_member_directory(v.team_a);
    RAISE EXCEPTION 'Thành viên xem được danh bạ team';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

SELECT set_config('request.jwt.claim.sub',(SELECT master_id::text FROM team_live_context),true);
SELECT public.assign_team_member(team_a,member_id,'leader','Rolled-back Leader change') FROM team_live_context;
SELECT set_config('request.jwt.claim.sub',(SELECT leader_id::text FROM team_live_context),true);
DO $$
DECLARE v team_live_context%ROWTYPE; v_count integer;
BEGIN
  SELECT * INTO v FROM team_live_context;
  SELECT count(*) INTO v_count FROM public."Customers" WHERE "Id" BETWEEN v.customer_base-3 AND v.customer_base;
  IF v_count<>1 THEN RAISE EXCEPTION 'Leader cũ chưa bị thu quyền sau khi đổi Leader'; END IF;
END;
$$;
SELECT set_config('request.jwt.claim.sub',(SELECT member_id::text FROM team_live_context),true);
DO $$
DECLARE v team_live_context%ROWTYPE; v_count integer;
BEGIN
  SELECT * INTO v FROM team_live_context;
  SELECT count(*) INTO v_count FROM public."Customers" WHERE "Id" BETWEEN v.customer_base-3 AND v.customer_base;
  IF v_count<>2 THEN RAISE EXCEPTION 'Leader mới chưa đọc được team'; END IF;
END;
$$;
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub',(SELECT master_id::text FROM team_live_context),true);
DO $$
DECLARE v team_live_context%ROWTYPE; v_period uuid; v_failed boolean; v_batch uuid; v_repeat uuid; v_rows jsonb;
BEGIN
  SELECT * INTO v FROM team_live_context;
  v_period := public.create_kpi_period(v.team_a,'2026-10-01');
  PERFORM public.save_kpi_target(v_period,'net_loan',NULL,100,0,'Rollback budget test');
  PERFORM set_config('request.jwt.claim.sub',v.member_id::text,true);
  PERFORM public.save_kpi_target(v_period,'net_loan',v.leader_id,60,0,'Rollback allocation test');
  v_failed := false;
  BEGIN
    PERFORM public.save_kpi_target(v_period,'net_loan',v.member_id,41,0,'Must exceed budget');
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%vượt ngân sách%' THEN v_failed := true; ELSE RAISE; END IF;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Allocation exceeded live team budget'; END IF;
  v_failed := false;
  BEGIN
    PERFORM public.save_kpi_target(v_period,'net_loan',v.leader_id,50,0,'Stale version');
  EXCEPTION WHEN serialization_failure THEN v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Stale target version accepted'; END IF;
  PERFORM set_config('request.jwt.claim.sub',v.leader_id::text,true);
  IF (SELECT count(*) FROM public."MemberKpiTargets" WHERE "PeriodId"=v_period)<>1 THEN
    RAISE EXCEPTION 'Member must see only own target';
  END IF;
  v_failed := false;
  BEGIN
    PERFORM public.save_kpi_target(v_period,'net_loan',v.leader_id,50,1,'Forbidden member write');
  EXCEPTION WHEN insufficient_privilege THEN v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Member edited a KPI target'; END IF;
  IF has_function_privilege('anon','public.team_member_directory(uuid)','execute') THEN
    RAISE EXCEPTION 'Anon still has direct EXECUTE on directory';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',v.master_id::text,true);
  v_rows := jsonb_build_array(jsonb_build_object('UserId',v.leader_id,'MetricCode','net_loan','Amount',-25));
  v_batch := public.publish_kpi_import(v_period,0,'2026-10-20','Rolled-back source.xlsx','Import test',v_rows);
  v_repeat := public.publish_kpi_import(v_period,1,'2026-10-20','Rolled-back source.xlsx','Idempotency test',v_rows);
  IF v_batch<>v_repeat THEN RAISE EXCEPTION 'Duplicate import created another batch'; END IF;
  v_failed := false;
  BEGIN
    PERFORM public.publish_kpi_import(v_period,0,'2026-10-20','Rolled-back source.xlsx','Stale preview',v_rows);
  EXCEPTION WHEN serialization_failure THEN v_failed := true;
  END;
  IF NOT v_failed THEN RAISE EXCEPTION 'Stale import preview was accepted'; END IF;
  PERFORM set_config('request.jwt.claim.sub',v.leader_id::text,true);
  IF (SELECT count(*) FROM public."KpiObservations" WHERE "BatchId"=v_batch)<>1 THEN
    RAISE EXCEPTION 'Member cannot see own imported result';
  END IF;
END;
$$;
RESET ROLE;
ROLLBACK;
