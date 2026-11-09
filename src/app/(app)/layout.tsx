import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ResetButton } from '@/components/ResetButton';

const NAV = [
  { href: '/timetable', label: '時間割' },
  { href: '/templates', label: 'テンプレート' },
  { href: '/tests', label: '成績' },
  { href: '/teachers', label: '先生' },
  { href: '/students', label: '生徒' },
  { href: '/periods', label: 'コマ' },
  { href: '/terms', label: '期間・講習' },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b bg-white print:hidden">
        <nav className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-4 px-4 py-3">
          <span className="font-bold">塾 時間割</span>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href} className="text-sm text-slate-600 hover:text-blue-600">
              {n.label}
            </Link>
          ))}
          <ResetButton />
        </nav>
      </header>
      <main className="mx-auto max-w-[1400px] px-4 py-6 print:max-w-none print:p-0">{children}</main>
    </div>
  );
}
