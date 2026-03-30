create policy "Allow anonymous update"
on "public"."rate_limits"
as PERMISSIVE
for UPDATE
to public
using (
  true
) 
with check (
  -- 检测下面不允许修改
  id = (SELECT id FROM rate_limits WHERE id = rate_limits.id)
  AND
  key = (SELECT key FROM rate_limits WHERE id = rate_limits.id)
  AND
  identifier = (SELECT identifier FROM rate_limits WHERE id = rate_limits.id)
  AND
  timestamp = (SELECT timestamp FROM rate_limits WHERE id = rate_limits.id)
  AND
  created_at = (SELECT created_at FROM rate_limits WHERE id = rate_limits.id)
  AND
  updated_at = (SELECT updated_at FROM rate_limits WHERE id = rate_limits.id)
);