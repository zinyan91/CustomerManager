BEGIN;

CREATE OR REPLACE FUNCTION public.assign_team_member(p_team uuid, p_user uuid, p_role text, p_reason text)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
DECLARE
  v_at timestamptz := statement_timestamp();
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

COMMIT;
