-- 登入後自動綁定：後台名單已有資料者，不需再走認領表單（除非要修改請到「我的資料」）

CREATE OR REPLACE FUNCTION bni_member_profile_filled(
  p_profession text,
  p_have text,
  p_want_meet text,
  p_want_referral text,
  p_bio text
)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT trim(COALESCE(p_profession, '')) <> ''
    AND (
      trim(COALESCE(p_have, '')) <> ''
      OR trim(COALESCE(p_want_meet, '')) <> ''
      OR trim(COALESCE(p_want_referral, '')) <> ''
      OR trim(COALESCE(p_bio, '')) <> ''
    );
$$;

CREATE OR REPLACE FUNCTION bni_auto_bind_on_login(p_display_name text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text;
  v_member bni_members%ROWTYPE;
  v_name text;
  v_count int;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'bound', false, 'reason', 'NOT_AUTHENTICATED');
  END IF;

  SELECT * INTO v_member FROM bni_members WHERE auth_user_id = v_user_id AND active = true LIMIT 1;
  IF FOUND THEN
    INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
      VALUES (v_user_id, v_member.id, false, now())
      ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = EXCLUDED.bound_member_id, updated_at = now();
    RETURN jsonb_build_object(
      'ok', true, 'bound', true, 'auto', false,
      'member_id', v_member.id, 'name', v_member.name, 'branch', v_member.branch
    );
  END IF;

  SELECT bni_current_jwt_email() INTO v_email;
  v_name := trim(COALESCE(p_display_name, ''));

  -- 1) 後台已填 google_email 的名單
  IF v_email <> '' THEN
    SELECT * INTO v_member FROM bni_members m
    WHERE m.active = true
      AND m.auth_user_id IS NULL
      AND lower(trim(COALESCE(m.google_email, ''))) = v_email
      AND bni_member_profile_filled(m.profession, m.have, m.want_meet, m.want_referral, m.bio)
    ORDER BY CASE WHEN m.status = 'roster' THEN 0 ELSE 1 END
    LIMIT 1;

    IF FOUND THEN
      UPDATE bni_members
        SET auth_user_id = v_user_id, google_email = v_email,
            status = CASE WHEN status = 'roster' THEN 'claimed' ELSE status END,
            updated_at = now()
      WHERE id = v_member.id;
      INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
        VALUES (v_user_id, v_member.id, false, now())
        ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_member.id, updated_at = now();
      RETURN jsonb_build_object(
        'ok', true, 'bound', true, 'auto', true, 'method', 'email',
        'member_id', v_member.id, 'name', v_member.name, 'branch', v_member.branch
      );
    END IF;
  END IF;

  -- 2) 名單姓名完全一致且僅一筆（後台已有完整資料）
  IF v_name <> '' THEN
    SELECT count(*)::int INTO v_count FROM bni_members m
    WHERE m.active = true
      AND m.auth_user_id IS NULL
      AND m.status = 'roster'
      AND bni_member_profile_filled(m.profession, m.have, m.want_meet, m.want_referral, m.bio)
      AND trim(m.name) = v_name;

    IF v_count = 1 THEN
      SELECT * INTO v_member FROM bni_members m
      WHERE m.active = true
        AND m.auth_user_id IS NULL
        AND m.status = 'roster'
        AND bni_member_profile_filled(m.profession, m.have, m.want_meet, m.want_referral, m.bio)
        AND trim(m.name) = v_name
      LIMIT 1;

      UPDATE bni_members
        SET auth_user_id = v_user_id,
            google_email = COALESCE(NULLIF(trim(google_email), ''), v_email),
            status = 'claimed', updated_at = now()
      WHERE id = v_member.id;
      INSERT INTO bni_onboarding (auth_user_id, bound_member_id, tutorial_done, updated_at)
        VALUES (v_user_id, v_member.id, false, now())
        ON CONFLICT (auth_user_id) DO UPDATE SET bound_member_id = v_member.id, updated_at = now();
      RETURN jsonb_build_object(
        'ok', true, 'bound', true, 'auto', true, 'method', 'name',
        'member_id', v_member.id, 'name', v_member.name, 'branch', v_member.branch
      );
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', false, 'bound', false);
END; $$;

GRANT EXECUTE ON FUNCTION bni_auto_bind_on_login(text) TO authenticated;
