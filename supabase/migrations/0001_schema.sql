-- 個人塾 時間割アプリ スキーマ（段階1）

create table teachers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  subjects text[] not null default '{}',
  grades text[] not null default '{}',
  weekdays int[] not null default '{}'
);

create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  grade text not null
);

create table student_regular (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  subject text not null,
  unique (student_id, weekday, subject)
);

create table periods (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_time time not null,
  end_time time not null,
  sort_order int not null default 0
);

create table terms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('regular', 'kosyu')),
  start_date date not null,
  end_date date not null,
  check (start_date <= end_date)
);

create table enrollments (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references terms(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  subject text not null,
  count int not null check (count > 0),
  unique (term_id, student_id, subject)
);

create table availability (
  id uuid primary key default gen_random_uuid(),
  term_id uuid not null references terms(id) on delete cascade,
  person_type text not null check (person_type in ('teacher', 'student')),
  person_id uuid not null,
  date date not null,
  available boolean not null,
  unique (term_id, person_type, person_id, date)
);

create table placements (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  period_id uuid not null references periods(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  subject text not null,
  unique (date, period_id, student_id)
);

create table extra_attendees (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  student_id uuid not null references students(id) on delete cascade,
  unique (date, student_id)
);

-- RLS：ログイン済み（匿名ゲスト含む）なら全操作可
do $$
declare t text;
begin
  foreach t in array array['teachers','students','student_regular','periods','terms',
                           'enrollments','availability','placements','extra_attendees']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "authenticated all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
