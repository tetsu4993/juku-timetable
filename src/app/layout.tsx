import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '個人塾 時間割・成績管理',
  description: '講習期間の時間割をドラッグ＆ドロップで組めるデモアプリ',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ja">
      <head>
        {/* フォントはブラウザで読み込む（ビルド時のダウンロードに依存しない） */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
