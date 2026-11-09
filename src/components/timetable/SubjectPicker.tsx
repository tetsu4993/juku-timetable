'use client';

import type { Subject } from '@/domain/types';
import { Button, Modal } from '@/components/ui';

export function SubjectPicker({ studentName, subjects, remaining, onPick, onCancel }: {
  studentName: string; subjects: Subject[]; remaining?: Partial<Record<Subject, number>>;
  onPick: (s: Subject) => void; onCancel: () => void;
}) {
  return (
    <Modal title={`${studentName} の科目を選択`} onClose={onCancel}>
      <div className="flex flex-wrap gap-2">
        {subjects.map((s) => (
          <Button key={s} onClick={() => onPick(s)}>
            {s}{remaining?.[s] !== undefined ? `（残${remaining[s]}）` : ''}
          </Button>
        ))}
      </div>
      <div className="mt-4 text-right"><Button variant="ghost" onClick={onCancel}>キャンセル</Button></div>
    </Modal>
  );
}
