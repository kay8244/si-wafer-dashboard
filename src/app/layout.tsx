import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SI 웨이퍼 5개사 실적 대시보드',
  description:
    '신에츠화학, SUMCO, 글로벌웨이퍼스, 실트로닉, SK실트론 분기별 실적 비교 분석 대시보드',
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
