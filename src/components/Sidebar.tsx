'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { ResetButton } from './ResetButton';

const MAIN = [
  { href: '/timetable', label: '時間割', icon: '▦' },
  { href: '/templates', label: '曜日テンプレート', icon: '⧉' },
  { href: '/tests', label: '成績', icon: '✎' },
];
const MASTERS = [
  { href: '/students', label: '生徒' },
  { href: '/teachers', label: '先生' },
  { href: '/schools', label: '学校' },
  { href: '/target-schools', label: '志望校' },
  { href: '/islands', label: '島（場所）' },
  { href: '/periods', label: 'コマ' },
  { href: '/terms', label: '期間・講習' },
];

export function Sidebar() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mastersOpen, setMastersOpen] = useState(true);
  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  const item = (href: string, label: string, icon?: string) => (
    <Link key={href} href={href} onClick={() => setOpen(false)}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
        active(href) ? 'bg-white/15 font-medium text-white' : 'text-slate-300 hover:bg-white/10 hover:text-white'}`}>
      {icon && <span className="w-4 text-center opacity-80">{icon}</span>}
      {label}
    </Link>
  );

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center gap-3 bg-slate-900 px-4 py-3 text-white md:hidden print:hidden">
        <button aria-label="メニュー" onClick={() => setOpen(!open)} className="text-xl">☰</button>
        <span className="font-bold">塾 時間割</span>
      </div>
      <aside className={`${open ? 'flex' : 'hidden'} fixed inset-y-0 left-0 z-50 w-56 shrink-0 flex-col overflow-y-auto bg-gradient-to-b from-slate-900 to-indigo-950 p-3 md:sticky md:top-0 md:flex md:h-screen print:hidden`}>
        <div className="mb-6 px-3 pt-2">
          <div className="text-lg font-bold tracking-wide text-white">塾 時間割</div>
          <div className="text-[11px] text-indigo-200/80">時間割・成績管理</div>
        </div>
        <nav className="flex-1 space-y-1">
          {MAIN.map((n) => item(n.href, n.label, n.icon))}
          <button onClick={() => setMastersOpen(!mastersOpen)}
            className="mt-4 flex w-full items-center justify-between px-3 py-1 text-[11px] font-medium tracking-wider text-indigo-200/70 uppercase">
            マスタ <span>{mastersOpen ? '▾' : '▸'}</span>
          </button>
          {mastersOpen && <div className="space-y-1">{MASTERS.map((n) => item(n.href, n.label))}</div>}
        </nav>
        <ResetButton />
      </aside>
      {open && <div className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
