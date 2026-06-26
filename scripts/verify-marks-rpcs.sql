SELECT proname AS fn FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN (
    'bni_record_connection_mark', 'bni_remove_connection_mark',
    'bni_get_incoming_marks', 'bni_ack_incoming_marks'
  )
ORDER BY fn;
