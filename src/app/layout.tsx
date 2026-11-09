import type { Metadata } from 'next';
import { Noto_Sans_JP } from 'next/font/google';
import './globals.css';

const noto = Noto_Sans_JP({ variable: '--font-noto', subsets: ['latin'], weight: ['400', '500', '700'] });

export const metadata: Metadata = {
  title: '個人塾 時間割・成績管理',
  description: '講習期間の時間割をドラッグ＆ドロップで組めるデモアプリ',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <body className={`${noto.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
