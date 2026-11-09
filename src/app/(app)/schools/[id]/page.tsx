'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { gradesForSchool } from '@/domain/school-grades';
import { SUBJECTS, type Grade, type SchoolMaterial, type Subject } from '@/domain/types';
import { deleteSchoolMaterial, listSchoolMaterials, listSchools, upsertSchoolMaterial } from '@/lib/repo';
import { Button, ErrorText, Field, inputCls, Modal, PageTitle, Table, useLoad } from '@/components/ui';

type Draft = Omit<SchoolMaterial, 'id'> & { id?: string };

export default function SchoolMaterialsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useLoad(async () => {
    const [schools, materials] = await Promise.all([listSchools(), listSchoolMaterials(id)]);
    return { school: schools.find((s) => s.id === id) ?? null, materials };
  }, [id]);
  const [tab, setTab] = useState<Grade | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!data) return <><ErrorText error={error} /><p className="text-slate-500">読み込み中…</p></>;
  if (!data.school) return <p>学校が見つかりません。<Link href="/schools" className="text-indigo-600">一覧へ</Link></p>;

  const grades = gradesForSchool(data.school.kind);
  const grade = tab && grades.includes(tab) ? tab : grades[0];
  // 科目の並び（9教科の順）→ 登録順
  const rows = data.materials
    .filter((m) => m.grade === grade)
    .sort((a, b) => SUBJECTS.indexOf(a.subject) - SUBJECTS.indexOf(b.subject));
  const countOf = (g: Grade) => data.materials.filter((m) => m.grade === g).length;

  async function save() {
    if (!draft) return;
    if (!draft.name.trim()) return setSaveError('教材名を入力してください');
    try {
      await upsertSchoolMaterial({ ...draft, name: draft.name.trim(), publisher: draft.publisher.trim(), memo: draft.memo.trim() });
      setDraft(null);
      reload();
    } catch (e) { setSaveError(String(e)); }
  }
  async function remove(m: SchoolMaterial) {
    if (!confirm(`${m.subject}「${m.name}」を削除しますか？`)) return;
    await deleteSchoolMaterial(m.id);
    reload();
  }
  const blank = (subject: Subject = '国語'): Draft =>
    ({ schoolId: id, grade, subject, name: '', publisher: '', memo: '' });

  return (
    <>
      <PageTitle action={<Button onClick={() => { setSaveError(null); setDraft(blank()); }}>＋ 教材を追加</Button>}>
        {data.school.name} <span className="text-base font-normal text-slate-500">学年・科目・教材</span>
      </PageTitle>
      <p className="mb-4 text-sm text-slate-500">
        <Link href="/schools" className="text-indigo-600 hover:underline">← 学校一覧</Link>
        　学年ごとに、学校で使っている教科書・ワークを登録します。定期テストの範囲確認や対策に使います。
      </p>

      <div className="mb-4 flex flex-wrap gap-1">
        {grades.map((g) => (
          <button key={g} onClick={() => setTab(g)}
            className={`rounded-lg px-4 py-1.5 text-sm ${g === grade ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600'}`}>
            {g}<span className="ml-1 text-xs opacity-70">{countOf(g)}</span>
          </button>
        ))}
      </div>

      <ErrorText error={error} />
      <Table head={['科目', '教材（教科書・ワーク）', '出版社', 'メモ', '']}>
        {rows.map((m, i) => (
          <tr key={m.id}>
            <td className="w-28 px-4 py-2 font-medium">{rows[i - 1]?.subject === m.subject ? '' : m.subject}</td>
            <td className="px-4 py-2">{m.name}</td>
            <td className="px-4 py-2 text-slate-600">{m.publisher || <span className="text-slate-300">—</span>}</td>
            <td className="px-4 py-2 text-slate-600">{m.memo}</td>
            <td className="whitespace-nowrap px-4 py-2 text-right">
              <Button variant="ghost" onClick={() => { setSaveError(null); setDraft(m); }}>編集</Button>{' '}
              <Button variant="danger" onClick={() => remove(m)}>削除</Button>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">{grade} の教材はまだ登録がありません</td></tr>}
      </Table>

      {draft && (
        <Modal title={draft.id ? '教材を編集' : `${draft.grade} の教材を追加`} onClose={() => setDraft(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="学年">
                <select className={inputCls} value={draft.grade} onChange={(e) => setDraft({ ...draft, grade: e.target.value as Grade })}>
                  {grades.map((g) => <option key={g}>{g}</option>)}
                </select>
              </Field>
              <Field label="科目">
                <select className={inputCls} value={draft.subject} onChange={(e) => setDraft({ ...draft, subject: e.target.value as Subject })}>
                  {SUBJECTS.map((s) => <option key={s}>{s}</option>)}
                </select>
              </Field>
            </div>
            <Field label="教材名"><input className={inputCls} placeholder="例：NEW HORIZON、学校ワーク" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></Field>
            <Field label="出版社（任意）"><input className={inputCls} placeholder="例：東京書籍" value={draft.publisher} onChange={(e) => setDraft({ ...draft, publisher: e.target.value })} /></Field>
            <Field label="メモ（任意）"><input className={inputCls} placeholder="例：2学期はUnit4から" value={draft.memo} onChange={(e) => setDraft({ ...draft, memo: e.target.value })} /></Field>
            <ErrorText error={saveError} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDraft(null)}>キャンセル</Button>
              <Button onClick={save}>保存</Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
