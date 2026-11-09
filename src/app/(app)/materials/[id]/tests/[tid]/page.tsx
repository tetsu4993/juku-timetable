'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { DIFFICULTIES, testTypeLabel, type Difficulty } from '@/domain/ai-test';
import { getGeneratedTest, getSchoolMaterial } from '@/lib/repo';
import { Button, ErrorText, useLoad } from '@/components/ui';

export default function GeneratedTestPage() {
  const { id, tid } = useParams<{ id: string; tid: string }>();
  const { data, error } = useLoad(async () => {
    const [material, test] = await Promise.all([getSchoolMaterial(id), getGeneratedTest(tid)]);
    return { material, test };
  }, [id, tid]);
  const [showAnswers, setShowAnswers] = useState(false);

  if (!data) return <><ErrorText error={error} /><p className="text-slate-500">読み込み中…</p></>;
  if (!data.test) return <p>テストが見つかりません。<Link href={`/materials/${id}`} className="text-indigo-600">教材へ</Link></p>;
  const { test, material } = data;
  const label = (n: number) => String.fromCharCode(0x30a2 + n * 2); // ア・イ・ウ…

  return (
    <div className="mx-auto max-w-4xl">
      <style>{'@page { size: A4 portrait; margin: 14mm; }'}</style>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href={`/materials/${id}`} className="text-sm text-indigo-600 hover:underline">← 教材・目次へ</Link>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setShowAnswers(!showAnswers)}>{showAnswers ? '解答を隠す' : '解答・解説を表示'}</Button>
          <Button onClick={() => window.print()}>印刷</Button>
        </div>
      </div>

      <article className="card p-8 print:border-0 print:p-0 print:shadow-none">
        <header className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold">{test.title}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {material ? `${material.name}${material.publisher ? `（${material.publisher}）` : ''}　` : ''}
            種類：{testTypeLabel(material?.subject ?? '', test.testType)}　範囲：{test.unitNames.join('、')}　難易度：{DIFFICULTIES[test.difficulty as Difficulty] ?? test.difficulty}
          </p>
          <div className="mt-4 flex gap-8 text-sm">
            <span>名前＿＿＿＿＿＿＿＿＿＿＿＿</span><span>点数　　　／{test.questions.length}</span>
          </div>
        </header>

        <ol className="space-y-6">
          {test.questions.map((q, i) => (
            <li key={i} className="break-inside-avoid">
              <div className="flex gap-3">
                <span className="font-bold text-indigo-700">問{i + 1}</span>
                <div className="flex-1">
                  <p className="whitespace-pre-wrap">{q.question}</p>
                  {q.choices.length > 0 && (
                    <ul className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
                      {q.choices.map((c, j) => <li key={j}>{label(j)}　{c}</li>)}
                    </ul>
                  )}
                  {q.choices.length === 0 && !showAnswers && <div className="mt-2 h-10 border-b border-dashed border-slate-300" />}
                  {showAnswers && (
                    <div className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm">
                      <b className="text-emerald-800">答え：</b>{q.answer}
                      <div className="mt-1 text-slate-600">{q.explanation}</div>
                    </div>
                  )}
                  <p className="mt-1 text-[11px] text-slate-400 print:hidden">{q.unit}</p>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-[11px] text-slate-400">※ AIが単元名をもとに作成した練習問題です。内容は教科書・授業と照らして確認してください。</p>
      </article>
    </div>
  );
}
