'use client';

import { useDraggable } from '@dnd-kit/core';

export function StudentChip({ dragId, label, sub, warn, note }: {
  dragId: string; label: string; sub?: string; warn?: string; note?: string;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: dragId });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      title={warn}
      className={`inline-flex cursor-grab select-none items-center gap-1 rounded-full border px-2 py-0.5 text-xs shadow-sm active:cursor-grabbing
        ${warn ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400' : 'border-emerald-400 bg-emerald-50'}
        ${isDragging ? 'z-50 opacity-70' : ''}`}
    >
      <span className="font-medium">{label}</span>
      {sub && <span className="text-slate-500">{sub}</span>}
      {note && <span className="rounded bg-white px-1 text-[10px] text-slate-600">{note}</span>}
      {warn && <span className="text-amber-600">⚠</span>}
    </div>
  );
}
