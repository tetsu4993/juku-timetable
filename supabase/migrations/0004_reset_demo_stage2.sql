-- デモデータを初期状態に戻す関数（段階2：曜日テンプレートと定期テストの点数を追加）（架空データのみ）
-- 呼び出しは service role（/api/reset）からのみ許可する

create or replace function reset_demo() returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  y int := extract(year from (now() at time zone 'Asia/Tokyo'))::int;
  fy int; -- 年度
  regular_id uuid;
  summer_id uuid;
  summer_start date;
  t_ids uuid[];
  p_ids uuid[];
  s_ids uuid[];
  sid uuid;
  subj text;
  core text[] := array['国語','数学','英語','理科','社会'];
  sei text[] := array['青木','石田','上野','江藤','大塚','加藤','木村','久保田','小林','佐藤',
                      '鈴木','高橋','田中','中村','西田','野口','橋本','藤井','松本','山口'];
  mei text[] := array['陽向','結衣','蓮','葵','湊','凛','悠真','咲良','颯太','美月',
                      '大和','紬','樹','杏','律'];
  grades text[] := array['小5','小6','中1','中2','中3','中1','中2','中3'];
  i int; j int; k int; d int; n int; w int; base int; ex uuid; ex_ids uuid[]; ex_kinds text[];
begin
  truncate scores, exams, template_slots, day_status, placements, extra_attendees, availability, enrollments, student_regular,
           students, teachers, periods, terms restart identity cascade;

  fy := case when extract(month from (now() at time zone 'Asia/Tokyo')) >= 4 then y else y - 1 end;
  summer_start := make_date(y, 7, 21);

  -- 先生5人
  insert into teachers (name, subjects, grades, weekdays) values
    ('山田先生', '{数学,理科}',      '{小5,小6,中1,中2,中3}', '{1,2,3,4,5}'),
    ('佐々木先生', '{英語}',          '{中1,中2,中3}',         '{1,3,5,6}'),
    ('森先生',   '{国語,社会}',      '{小5,小6,中1,中2,中3}', '{2,4,6}'),
    ('林先生',   '{数学,英語}',      '{小5,小6,中1}',         '{1,2,4,5}'),
    ('池田先生', '{理科,社会,数学}', '{中1,中2,中3}',         '{2,3,5,6}');
  select array_agg(id order by name) into t_ids from teachers;

  -- コマ5つ（13:00から80分授業・10分休み）
  for i in 0..4 loop
    insert into periods (name, start_time, end_time, sort_order)
    values ((i + 1) || '限',
            time '13:00' + make_interval(mins => i * 90),
            time '13:00' + make_interval(mins => i * 90 + 80),
            i + 1);
  end loop;
  select array_agg(id order by sort_order) into p_ids from periods;

  -- 生徒70人（1人2〜3科目、通常期は週1〜2日）
  for i in 0..69 loop
    insert into students (name, grade)
    values (sei[1 + i % 20] || ' ' || mei[1 + (i * 7) % 15], grades[1 + (i * 3) % 8])
    returning id into sid;
    for j in 0..(1 + i % 2) loop
      insert into student_regular (student_id, weekday, subject)
      values (sid, 1 + (i + j * 2) % 6, core[1 + (i + j * 2) % 5])
      on conflict do nothing;
    end loop;
  end loop;
  select array_agg(id order by name, id) into s_ids from students;

  -- 期間
  insert into terms (name, kind, start_date, end_date)
  values (fy || '年度 通常期', 'regular', make_date(fy, 4, 1), make_date(fy + 1, 3, 31))
  returning id into regular_id;
  insert into terms (name, kind, start_date, end_date)
  values (y || '年 夏期講習', 'kosyu', summer_start, make_date(y, 8, 31))
  returning id into summer_id;

  -- 講習の申込（科目ごと4〜12コマ）と来られない日
  for i in 1..70 loop
    for j in 0..(1 + i % 2) loop
      insert into enrollments (term_id, student_id, subject, count)
      values (summer_id, s_ids[i], core[1 + (i + j) % 5], 4 + (i * 5 + j * 3) % 9)
      on conflict do nothing;
    end loop;
    if i % 7 = 0 then
      insert into availability (term_id, person_type, person_id, date, available)
      values (summer_id, 'student', s_ids[i], summer_start + 5 + i % 10, false);
    end if;
  end loop;
  insert into availability (term_id, person_type, person_id, date, available)
  values (summer_id, 'teacher', t_ids[3], summer_start + 7, false);

  -- 講習の初日〜3日目に1日約25件の配置
  -- その日に出勤する先生に、担当できる科目・学年の生徒を割り当てる（1コマ5人、先生1人あたり最大2人）
  for d in 0..2 loop
    for i in 1..5 loop          -- コマ
      n := 0;
      for k in 1..2 loop
      for j in 1..5 loop        -- 先生
        continue when not exists (
          select 1 from teachers t where t.id = t_ids[j]
            and extract(dow from summer_start + d)::int = any (t.weekdays));
          exit when n >= 5;
          select e.student_id, e.subject into sid, subj
            from enrollments e
            join students s on s.id = e.student_id
            join teachers t on t.id = t_ids[j]
           where e.term_id = summer_id
             and e.subject = any (t.subjects)
             and s.grade = any (t.grades)
             and not exists (select 1 from placements p
                              where p.date = summer_start + d and p.student_id = e.student_id)
           order by md5(e.student_id::text || d)
           limit 1;
          continue when sid is null;
          insert into placements (date, period_id, teacher_id, student_id, subject)
          values (summer_start + d, p_ids[i], t_ids[j], sid, subj);
          n := n + 1;
          sid := null;
      end loop;
      end loop;
    end loop;
  end loop;

  -- 曜日テンプレート：生徒の通常の曜日・科目を、担当できる先生に割り当てる（1コマ先生あたり最大2人）
  for w in 1..5 loop
    for i in 1..5 loop
      for k in 1..2 loop
        for j in 1..5 loop
          continue when not exists (select 1 from teachers t where t.id = t_ids[j] and w = any (t.weekdays));
          continue when (select count(*) from template_slots x
                          where x.weekday = w and x.period_id = p_ids[i] and x.teacher_id = t_ids[j]) >= k;
          select r.student_id, r.subject into sid, subj
            from student_regular r
            join students s on s.id = r.student_id
            join teachers t on t.id = t_ids[j]
           where r.weekday = w
             and r.subject = any (t.subjects)
             and s.grade = any (t.grades)
             and not exists (select 1 from template_slots x
                              where x.weekday = w and x.student_id = r.student_id
                                and (x.subject = r.subject or x.period_id = p_ids[i]))
           order by md5(r.student_id::text || r.subject)
           limit 1;
          continue when sid is null;
          insert into template_slots (weekday, period_id, teacher_id, student_id, subject)
          values (w, p_ids[i], t_ids[j], sid, subj);
          sid := null;
        end loop;
      end loop;
    end loop;
  end loop;

  -- 定期テスト4回と点数（中間は5教科、期末は9教科）
  insert into exams (name, year, semester, kind) values
    ((fy - 1) || '年度 3学期 期末', fy - 1, 3, 'final'),
    (fy || '年度 1学期 中間', fy, 1, 'midterm'),
    (fy || '年度 1学期 期末', fy, 1, 'final'),
    (fy || '年度 2学期 中間', fy, 2, 'midterm');
  select array_agg(id order by year, semester, kind desc), array_agg(kind order by year, semester, kind desc)
    into ex_ids, ex_kinds from exams;
  for i in 1..70 loop
    base := 45 + (abs(hashtext(s_ids[i]::text)) % 40);   -- 生徒ごとの基準点 45〜84
    for d in 1..4 loop
      for j in 1..9 loop
        continue when ex_kinds[d] = 'midterm' and j > 5;
        subj := (array['国語','数学','英語','理科','社会','音楽','美術','保健体育','技術家庭'])[j];
        insert into scores (exam_id, student_id, subject, score)
        values (ex_ids[d], s_ids[i], subj,
                greatest(0, least(100, base + (d - 2) * 3 + (abs(hashtext(s_ids[i]::text || subj || d)) % 21) - 10)));
      end loop;
    end loop;
  end loop;
end;
$$;

revoke all on function reset_demo() from public, anon, authenticated;
grant execute on function reset_demo() to service_role;
