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
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{children}</h1>
      {action}
    </div>
  );
}

export function ErrorText({ error }: { error: string | null }) {
  return error ? <p className="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">エラー：{error}</p> : null;
}

export function Button({ variant = 'primary', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'danger' }) {
  const cls = {
    primary: 'bg-indigo-600 text-white shadow-sm hover:bg-indigo-700',
    ghost: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
    danger: 'text-red-600 hover:bg-red-50',
  }[variant];
  return <button {...props} className={`rounded-lg px-3 py-1.5 text-sm font-medium transition disabled:opacity-50 ${cls} ${props.className ?? ''}`} />;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

export const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none';

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

const MODAL_WIDTH = { md: 'max-w-lg', xl: 'max-w-6xl' } as const;

export function Modal({ title, onClose, children, size = 'md' }: {
  title: string; onClose: () => void; children: React.ReactNode; size?: keyof typeof MODAL_WIDTH;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4" onClick={onClose}>
      <div className={`max-h-[90vh] w-full ${MODAL_WIDTH[size]} overflow-auto rounded-2xl bg-white p-6 shadow-xl`} onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="card overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50/80 text-left text-xs text-slate-500">
          <tr>{head.map((h) => <th key={h} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100 [&>tr:hover]:bg-indigo-50/40">{children}</tbody>
      </table>
    </div>
  );
}
