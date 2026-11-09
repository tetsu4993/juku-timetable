'use client';

import { useDroppable } from '@dnd-kit/core';

export function Cell({ dropId, over, children, className = '' }: {
  dropId: string; over?: boolean; children: React.ReactNode; className?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: dropId });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-16 ${className} ${over ? 'bg-red-100' : ''} ${isOver ? 'outline outline-2 outline-indigo-500' : ''}`}
    >
      {children}
    </div>
  );
}
