'use client';

import type { Island } from '@/domain/types';

/** マス（コマ×先生）の島を選ぶ。印刷時は名前だけ表示 */
export function IslandSelect({ islands, value, duplicate, onChange }: {
  islands: Island[]; value: string | null; duplicate: boolean; onChange: (islandId: string | null) => void;
}) {
  if (islands.length === 0) return null;
  const name = islands.find((i) => i.id === value)?.name;
  return (
    <div className={`flex items-center gap-1 border-b px-1 py-0.5 text-[11px] ${duplicate ? 'bg-amber-50' : 'bg-slate-50/60'}`}>
      <select aria-label="島" value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}
        className="min-w-0 flex-1 rounded border-0 bg-transparent py-0 text-[11px] text-slate-600 focus:ring-1 focus:ring-indigo-300 print:hidden">
        <option value="">島：未選択</option>
        {islands.map((i) => <option key={i.id} value={i.id}>島：{i.name}</option>)}
      </select>
      <span className="hidden print:inline">{name ? `島：${name}` : ''}</span>
      {duplicate && <span title="同じコマで他の先生と同じ島です" className="text-amber-600">⚠ 島が重複</span>}
    </div>
  );
}
