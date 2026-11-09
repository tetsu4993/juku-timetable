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
      className="ml-auto rounded border border-slate-300 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100 disabled:opacity-50">
      {busy ? '戻しています…' : 'デモデータを初期状態に戻す'}
    </button>
  );
}
