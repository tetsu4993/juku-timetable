// 開発用：時間割の動作確認のための最小ダミーデータを入れる（架空データのみ）
// 使い方: node --env-file=.env.local scripts/dev-seed-min.mjs
import { createClient } from '@supabase/supabase-js';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
const { error: authError } = await sb.auth.signInAnonymously();
if (authError) throw authError;

const must = async (p) => { const { data, error } = await p; if (error) throw error; return data; };

const periods = await must(sb.from('periods').select('id'));
if (periods.length === 0) {
  await must(sb.from('periods').insert([
    { name: '1限', start_time: '17:00', end_time: '18:20', sort_order: 1 },
    { name: '2限', start_time: '18:30', end_time: '19:50', sort_order: 2 },
  ]));
}

const names = ['青木', '石井', '上田', '江口', '大野'];
const existing = await must(sb.from('students').select('name'));
for (const name of names) {
  if (existing.some((s) => s.name === name)) continue;
  const [st] = await must(sb.from('students').insert({ name, grade: '中2' }).select());
  await must(sb.from('student_regular').insert([
    { student_id: st.id, weekday: 2, subject: '数学' },
    { student_id: st.id, weekday: 2, subject: '英語' },
  ]));
}

const teachers = await must(sb.from('teachers').select('name'));
if (!teachers.some((t) => t.name === '国語先生')) {
  await must(sb.from('teachers').insert({ name: '国語先生', subjects: ['国語'], grades: ['中1'], weekdays: [2] }));
}
console.log('seeded');
