'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'] as const;

/** 非同期ロード＋再読込 */
export function useLoad<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latest = useRef(0);
  const reload = useCallback(async () => {
    const id = ++latest.current; // 古い読み込みの結果で新しい表示を上書きしない
    try {
      setError(null);
      const result = await fn();
      if (id === latest.current) setData(result);
    } catch (e) {
      if (id === latest.current) setError(e instanceof Error ? e.message : String(e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  useEffect(() => { reload(); }, [reload]);
  return { data, error, reload };
}

export function PageTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h1 className="text-xl font-bold">{children}</h1>
      {action}
    </div>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">エラー：{error}</p> : null;
}

export function Button({ variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const cls = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    ghost: 'border border-slate-300 bg-white hover:bg-slate-100',
    danger: 'text-red-600 hover:bg-red-50',
  }[variant];
  return <button {...props} className={`rounded px-3 py-1.5 text-sm disabled:opacity-50 ${cls} ${props.className ?? ''}`} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = 'w-full rounded border border-slate-300 px-2 py-1.5 text-sm';

export function CheckGroup<T extends string | number>({
  options, value, onChange, label = (v) => String(v),
}: { options: readonly T[]; value: T[]; onChange: (v: T[]) => void; label?: (v: T) => string }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      {options.map((o) => (
        <label key={String(o)} className="flex items-center gap-1 text-sm">
          <input
            type="checkbox"
            checked={value.includes(o)}
            onChange={(e) => onChange(e.target.checked ? [...value, o] : value.filter((x) => x !== o))}
          />
          {label(o)}
        </label>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-lg bg-white p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-slate-100 text-left">
          <tr>{head.map((h) => <th key={h} className="px-3 py-2 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y">{children}</tbody>
      </table>
    </div>
  );
}
