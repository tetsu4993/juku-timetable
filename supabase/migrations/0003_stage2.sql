-- 段階2：曜日テンプレート・日付状態・定期テスト・点数

create table template_slots (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 1 and 5),
  period_id uuid not null references periods(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  subject text not null,
  unique (weekday, period_id, student_id)
);

-- その日にテンプレートを反映済みかどうか（二重コピー防止）
create table day_status (
  date date primary key,
  from_template boolean not null default true,
  created_at timestamptz not null default now()
);

create table exams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year int not null,
  semester int not null check (semester between 1 and 3),
  kind text not null check (kind in ('midterm', 'final'))
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references exams(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  subject text not null,
  score int check (score between 0 and 100),
  unique (exam_id, student_id, subject)
);

do $$
declare t text;
begin
  foreach t in array array['template_slots','day_status','exams','scores']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "authenticated all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
