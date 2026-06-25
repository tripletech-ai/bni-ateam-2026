-- 現場小遊戲：今日 800 人目標 + 可多次「刷」更新人數

CREATE TABLE IF NOT EXISTS bni_event_pulse (
  auth_user_id uuid NOT NULL,
  pulse_date date NOT NULL DEFAULT (current_date AT TIME ZONE 'Asia/Taipei')::date,
  tap_count int NOT NULL DEFAULT 1,
  first_pulse_at timestamptz NOT NULL DEFAULT now(),
  last_pulse_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (auth_user_id, pulse_date)
);

ALTER TABLE bni_event_pulse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bni_event_pulse_own ON bni_event_pulse;
CREATE POLICY bni_event_pulse_own ON bni_event_pulse
  FOR ALL TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

DROP POLICY IF EXISTS bni_event_pulse_admin ON bni_event_pulse;
CREATE POLICY bni_event_pulse_admin ON bni_event_pulse
  FOR SELECT TO authenticated USING (bni_is_admin());

CREATE OR REPLACE FUNCTION bni_get_event_pulse()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public STABLE AS $$
DECLARE
  v_active int;
  v_taps int;
  v_bound int;
  v_my_taps int := 0;
BEGIN
  SELECT count(*)::int, COALESCE(sum(tap_count), 0)::int
  INTO v_active, v_taps
  FROM bni_event_pulse
  WHERE pulse_date = (current_timestamp AT TIME ZONE 'Asia/Taipei')::date;

  SELECT count(*)::int INTO v_bound
  FROM bni_members WHERE active = true AND auth_user_id IS NOT NULL;

  IF auth.uid() IS NOT NULL THEN
    SELECT COALESCE(tap_count, 0) INTO v_my_taps
    FROM bni_event_pulse
    WHERE auth_user_id = auth.uid()
      AND pulse_date = (current_timestamp AT TIME ZONE 'Asia/Taipei')::date;
  END IF;

  RETURN jsonb_build_object(
    'goal', 800,
    'active_today', v_active,
    'total_taps_today', v_taps,
    'total_bound', v_bound,
    'my_taps_today', COALESCE(v_my_taps, 0),
    'can_pulse', auth.uid() IS NOT NULL
  );
END; $$;

CREATE OR REPLACE FUNCTION bni_record_event_pulse()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id uuid := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  INSERT INTO bni_event_pulse (auth_user_id, pulse_date, tap_count, first_pulse_at, last_pulse_at)
  VALUES (v_user_id, (current_timestamp AT TIME ZONE 'Asia/Taipei')::date, 1, now(), now())
  ON CONFLICT (auth_user_id, pulse_date) DO UPDATE SET
    tap_count = bni_event_pulse.tap_count + 1,
    last_pulse_at = now();

  RETURN bni_get_event_pulse();
END; $$;

GRANT EXECUTE ON FUNCTION bni_get_event_pulse() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION bni_record_event_pulse() TO authenticated;
