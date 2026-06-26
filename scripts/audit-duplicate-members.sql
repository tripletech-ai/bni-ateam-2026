-- 全庫：檢查同名同分會 active 重複
SELECT name, branch, count(*) AS cnt,
  array_agg(id ORDER BY created_at) AS ids,
  array_agg(status ORDER BY created_at) AS statuses
FROM bni_members
WHERE active = true
GROUP BY name, branch
HAVING count(*) > 1
ORDER BY cnt DESC, name;
