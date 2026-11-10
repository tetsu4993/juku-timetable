'use client';

import { useDraggable } from '@dnd-kit/core';

export function StudentChip({ dragId, label, sub, warn, note, mark, onClick }: {
  dragId: string; label: string; sub?: string; warn?: string; note?: string;
  /** 右端に付ける目印（例：📝 記録済み） */
  mark?: string;
  /** クリック（ドラッグではない短い押下）で呼ばれる */
  onClick?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId });
  // 学年（小・中・高）で色分け
  const tone = sub?.startsWith('小') ? 'border-sky-300 bg-sky-50' : sub?.startsWith('高') ? 'border-violet-300 bg-violet-50' : 'border-emerald-300 bg-emerald-50';
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      title={warn ?? (onClick ? 'クリックで授業記録' : undefined)}
      onClick={onClick}
      className={`inline-flex cursor-grab select-none items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm transition hover:shadow active:cursor-grabbing
        ${warn ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400' : tone}
        ${isDragging ? 'z-50 opacity-70' : ''}`}
    >
      <span className="font-medium">{label}</span>
      {sub && <span className="text-slate-500">{sub}</span>}
      {note && <span className="rounded bg-white px-1 text-[10px] text-slate-600">{note}</span>}
      {warn && <span className="text-amber-600">⚠</span>}
      {mark && <span aria-label="記録済み">{mark}</span>}
    </div>
  );
}
