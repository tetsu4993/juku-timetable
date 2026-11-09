'use client';

import { useState } from 'react';

export function ResetButton() {
  const [busy, setBusy] = useState(false);
  async function reset() {
    if (!confirm('デモデータを初期状態に戻します。編集した内容はすべて消えます。よろしいですか？')) return;
    setBusy(true);
    const res = await fetch('/api/reset', { method: 'POST' });
    setBusy(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(`戻せませんでした：${body.error ?? res.status}`);
      return;
    }
    location.reload();
  }
  return (
    <button onClick={reset} disabled={busy}
      className="mt-3 w-full rounded-lg border border-white/20 px-3 py-2 text-xs text-slate-300 hover:bg-white/10 hover:text-white disabled:opacity-50">
      {busy ? '戻しています…' : 'デモデータを初期状態に戻す'}
    </button>
  );
}
