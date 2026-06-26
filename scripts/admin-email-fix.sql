-- 強化 JWT email 解析，讓 bni_is_admin() 能正確辨識 Google OAuth 登入

CREATE OR REPLACE FUNCTION bni_current_jwt_email()
RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT lower(trim(COALESCE(
    NULLIF(current_setting('request.jwt.claim.email', true), ''),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email'),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb -> 'user_metadata' ->> 'email'),
    (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb ->> 'user_email'),
    ''
  )));
$$;

CREATE OR REPLACE FUNCTION bni_is_admin()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT bni_current_jwt_email() IN ('b1993614@gmail.com', 'tripletech.ai@gmail.com', 'samuel900731@gmail.com');
$$;

GRANT EXECUTE ON FUNCTION bni_is_admin() TO authenticated;
