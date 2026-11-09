-- 教材の目次（単元）と、AIで作った疑似テスト、AI利用回数の上限

create table material_units (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references school_materials(id) on delete cascade,
  name text not null,
  sort_order int not null default 0
);
create index on material_units (material_id, sort_order);

create table generated_tests (
  id uuid primary key default gen_random_uuid(),
  material_id uuid not null references school_materials(id) on delete cascade,
  unit_names text[] not null,
  difficulty text not null,
  title text not null,
  questions jsonb not null,
  created_at timestamptz not null default now()
);
create index on generated_tests (material_id, created_at desc);

-- AIの利用回数（日本時間の日付ごと）。サーバー（service role）からだけ触る
create table ai_usage (
  day date primary key,
  count int not null default 0
);

alter table material_units enable row level security;
create policy "authenticated all" on material_units for all to authenticated using (true) with check (true);
alter table generated_tests enable row level security;
create policy "authenticated all" on generated_tests for all to authenticated using (true) with check (true);
alter table ai_usage enable row level security; -- ポリシーなし＝ログインユーザーからは読み書き不可

-- 今日の残り回数があれば1回分使って true。上限に達していれば false（同時実行でも超えない）
create or replace function consume_ai_quota(p_day date, p_limit int) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare used int;
begin
  insert into ai_usage (day, count) values (p_day, 0) on conflict (day) do nothing;
  update ai_usage set count = count + 1 where day = p_day and count < p_limit returning count into used;
  return used is not null;
end;
$$;
-- 使わなかった1回分を戻す（AI呼び出しが失敗したとき）
create or replace function refund_ai_quota(p_day date) returns void
language sql
security definer
set search_path = public
as $$ update ai_usage set count = greatest(count - 1, 0) where day = p_day; $$;

revoke all on function consume_ai_quota(date, int) from public, anon, authenticated;
revoke all on function refund_ai_quota(date) from public, anon, authenticated;
grant execute on function consume_ai_quota(date, int) to service_role;
grant execute on function refund_ai_quota(date) to service_role;
