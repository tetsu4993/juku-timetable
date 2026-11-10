-- 授業記録（生徒カルテ）。時間割の配置から記録するか、カルテ画面で直接追加する
create table lesson_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  date date not null,
  period_id uuid references periods(id) on delete set null,
  teacher_id uuid references teachers(id) on delete set null,
  placement_id uuid unique references placements(id) on delete set null,
  subject text not null,
  material_id uuid references school_materials(id) on delete set null,
  unit_names text[] not null default '{}',
  understanding text not null check (understanding in ('◎', '○', '△', '×')),
  homework text not null default '',
  note text not null default '',
  teacher_name text not null default '',
  created_at timestamptz not null default now()
);
create index on lesson_records (student_id, date desc);

alter table lesson_records enable row level security;
create policy "authenticated all" on lesson_records for all to authenticated using (true) with check (true);
