'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function guestLogin() {
    setLoading(true);
    setError(null);
    const { error } = await createClient().auth.signInAnonymously();
    if (error) {
      console.error('signInAnonymously failed:', error.status, error.code, error.message);
      setError('ログインできませんでした。時間をおいてもう一度お試しください。');
      setLoading(false);
      return;
    }
    router.replace('/timetable');
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-indigo-800 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <h1 className="text-2xl font-bold text-slate-800">個人塾 時間割・成績管理</h1>
        <p className="mt-3 text-sm text-slate-600">
          講習期間の時間割をドラッグ＆ドロップで組めるデモアプリです。
          曜日テンプレート・定期テストの成績管理（面談資料）にも対応。データはすべて架空のものです。
        </p>
        <button
          onClick={guestLogin}
          disabled={loading}
          className="mt-6 w-full rounded-lg bg-indigo-600 py-3 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? 'ログイン中…' : 'ゲストとして試す'}
        </button>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        <p className="mt-4 text-xs text-slate-400">初回の読み込みに少し時間がかかる場合があります。</p>
      </div>
    </main>
  );
}
