-- 学校・学年・科目ごとの使用教材（教科書・学校ワークなど）
create table school_materials (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  grade text not null,
  subject text not null,
  name text not null,
  publisher text not null default '',
  memo text not null default '',
  created_at timestamptz not null default now()
);
create index on school_materials (school_id, grade);

alter table school_materials enable row level security;
create policy "authenticated all" on school_materials for all to authenticated using (true) with check (true);
