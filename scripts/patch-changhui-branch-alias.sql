-- 長輝白金分會 ≡ 長輝分會（evershine / 晚宴入場認領別名）
CREATE OR REPLACE FUNCTION public.bni_normalize_claim_branch(p_branch text)
 RETURNS text
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
DECLARE
  v text := trim(regexp_replace(COALESCE(p_branch, ''), '\s+', '', 'g'));
BEGIN
  IF v = '' THEN RETURN ''; END IF;
  IF v LIKE '~%' OR v LIKE '%海外%' OR v LIKE '%籌備%' OR v ILIKE '%overseas%' THEN
    RETURN v;
  END IF;
  v := regexp_replace(v, '分會+$', '');
  IF v = '' THEN RETURN ''; END IF;
  IF v IN ('長輝白金', '長輝白金分會') THEN
    RETURN '長輝分會';
  END IF;
  RETURN v || '分會';
END;
$function$;
