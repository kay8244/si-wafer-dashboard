import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MI Platform 현황판',
  description: 'MI Platform 현황판 — 반도체 시장 분석 대시보드',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased transition-colors duration-200">
        {children}
      </body>
    </html>
  );
}
