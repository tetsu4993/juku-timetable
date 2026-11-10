-- 志望校マスタ（文科省の学校コード一覧＋AIの調査結果）

create table target_schools (
  id uuid primary key default gen_random_uuid(),
  mext_code text not null unique,
  kind text not null check (kind in ('中学', '高校')),
  pref_code text not null,
  establishment text not null check (establishment in ('国立', '公立', '私立')),
  name text not null,
  address text not null default '',
  postal text not null default '',
  closed boolean not null default false,
  synced_at timestamptz not null default now(),
  -- AIで調べる（手でも直せる）項目
  hensachi text not null default '',
  courses text not null default '',
  exam_schedule text not null default '',
  exam_subjects text not null default '',
  competition text not null default '',
  career_note text not null default '',
  sources jsonb not null default '[]',
  researched_at timestamptz
);
create index on target_schools (pref_code, kind);

-- 登録した地域（更新ボタンで同じ範囲を取り直す）
create table target_school_regions (
  pref_code text primary key,
  registered_at timestamptz not null default now()
);

alter table target_schools enable row level security;
create policy "authenticated all" on target_schools for all to authenticated using (true) with check (true);
alter table target_school_regions enable row level security;
create policy "authenticated all" on target_school_regions for all to authenticated using (true) with check (true);

-- AI利用回数を用途ごとに数える（test：疑似テスト、research：志望校調査）
alter table ai_usage add column kind text not null default 'test';
alter table ai_usage drop constraint ai_usage_pkey;
alter table ai_usage add primary key (day, kind);

create or replace function consume_ai_quota_kind(p_day date, p_kind text, p_limit int) returns boolean
language plpgsql security definer set search_path = public as $$
declare used int;
begin
  insert into ai_usage (day, kind, count) values (p_day, p_kind, 0) on conflict (day, kind) do nothing;
  update ai_usage set count = count + 1 where day = p_day and kind = p_kind and count < p_limit returning count into used;
  return used is not null;
end;
$$;
create or replace function refund_ai_quota_kind(p_day date, p_kind text) returns void
language sql security definer set search_path = public as $$
  update ai_usage set count = greatest(count - 1, 0) where day = p_day and kind = p_kind;
$$;
-- 既存の関数は疑似テスト用として残す
create or replace function consume_ai_quota(p_day date, p_limit int) returns boolean
language sql security definer set search_path = public as $$ select consume_ai_quota_kind(p_day, 'test', p_limit); $$;
create or replace function refund_ai_quota(p_day date) returns void
language sql security definer set search_path = public as $$ select refund_ai_quota_kind(p_day, 'test'); $$;

revoke all on function consume_ai_quota_kind(date, text, int) from public, anon, authenticated;
revoke all on function refund_ai_quota_kind(date, text) from public, anon, authenticated;
grant execute on function consume_ai_quota_kind(date, text, int) to service_role;
grant execute on function refund_ai_quota_kind(date, text) to service_role;
