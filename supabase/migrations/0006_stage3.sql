-- 段階3：学校・島・学年繰り上げ

create table schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null check (kind in ('小', '中', '高'))
);
alter table students add column school_id uuid references schools(id) on delete set null;

create table islands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0
);

-- その日・コマ・先生のマスに割り当てた島
create table cell_islands (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  period_id uuid not null references periods(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  island_id uuid not null references islands(id) on delete cascade,
  unique (date, period_id, teacher_id)
);

-- 曜日テンプレートのマスに割り当てた島
create table template_islands (
  id uuid primary key default gen_random_uuid(),
  weekday int not null check (weekday between 1 and 5),
  period_id uuid not null references periods(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  island_id uuid not null references islands(id) on delete cascade,
  unique (weekday, period_id, teacher_id)
);

-- 学年を繰り上げた年度（1年度1回）
create table promotions (
  year int primary key,
  done_at timestamptz not null default now()
);

do $$
declare t text;
begin
  foreach t in array array['schools','islands','cell_islands','template_islands','promotions']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "authenticated all" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- 学年を1つ上げる。その年度に実行済みなら何もしないで false
create or replace function promote_grades(p_year int) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
declare
  seq text[] := array['小1','小2','小3','小4','小5','小6','中1','中2','中3','高1','高2','高3','卒業'];
begin
  insert into promotions (year) values (p_year) on conflict do nothing;
  if not found then
    return false;
  end if;
  update students s
     set grade = seq[least(array_position(seq, s.grade) + 1, array_length(seq, 1))]
   where array_position(seq, s.grade) is not null;
  return true;
end;
$$;

-- テンプレート反映：配置と島を1つのトランザクションでコピー
create or replace function apply_template(p_date date, p_rows jsonb) returns boolean
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into day_status (date) values (p_date) on conflict do nothing;
  if not found then
    return false;
  end if;
  insert into placements (date, period_id, teacher_id, student_id, subject)
  select p_date, (r->>'period_id')::uuid, (r->>'teacher_id')::uuid, (r->>'student_id')::uuid, r->>'subject'
    from jsonb_array_elements(p_rows) r
  on conflict (date, period_id, student_id) do nothing;
  insert into cell_islands (date, period_id, teacher_id, island_id)
  select p_date, ti.period_id, ti.teacher_id, ti.island_id
    from template_islands ti
   where ti.weekday = extract(dow from p_date)::int
  on conflict (date, period_id, teacher_id) do nothing;
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
  delete from cell_islands where date = p_date;
  insert into day_status (date) values (p_date) on conflict do nothing;
  insert into placements (date, period_id, teacher_id, student_id, subject)
  select p_date, (r->>'period_id')::uuid, (r->>'teacher_id')::uuid, (r->>'student_id')::uuid, r->>'subject'
    from jsonb_array_elements(p_rows) r
  on conflict (date, period_id, student_id) do nothing;
  insert into cell_islands (date, period_id, teacher_id, island_id)
  select p_date, ti.period_id, ti.teacher_id, ti.island_id
    from template_islands ti
   where ti.weekday = extract(dow from p_date)::int
  on conflict (date, period_id, teacher_id) do nothing;
end;
$$;

revoke all on function promote_grades(int) from public, anon;
grant execute on function promote_grades(int) to authenticated, service_role;
