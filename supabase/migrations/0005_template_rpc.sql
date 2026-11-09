-- テンプレート反映を1つのトランザクションで行う（二重反映・途中失敗の防止）
-- security invoker：呼び出したユーザーの権限（RLS）で動く

create or replace function apply_template(p_date date, p_rows jsonb) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into day_status (date) values (p_date) on conflict do nothing;
  if not found then
    return false; -- 他の読み込みが反映済み（その完了を待ってから戻る）
  end if;
  insert into placements (date, period_id, teacher_id, student_id, subject)
  select p_date, (r->>'period_id')::uuid, (r->>'teacher_id')::uuid, (r->>'student_id')::uuid, r->>'subject'
    from jsonb_array_elements(p_rows) r
  on conflict (date, period_id, student_id) do nothing;
  return true;
end;
$$;

create or replace function reset_day_to_template(p_date date, p_rows jsonb) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  delete from placements where date = p_date;
  insert into day_status (date) values (p_date) on conflict do nothing;
  insert into placements (date, period_id, teacher_id, student_id, subject)
  select p_date, (r->>'period_id')::uuid, (r->>'teacher_id')::uuid, (r->>'student_id')::uuid, r->>'subject'
    from jsonb_array_elements(p_rows) r
  on conflict (date, period_id, student_id) do nothing;
end;
$$;

revoke all on function apply_template(date, jsonb) from public, anon;
revoke all on function reset_day_to_template(date, jsonb) from public, anon;
grant execute on function apply_template(date, jsonb) to authenticated, service_role;
grant execute on function reset_day_to_template(date, jsonb) to authenticated, service_role;
