import type { Metadata } from 'next';
import { Inter, Noto_Sans_JP } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const notoSansJP = Noto_Sans_JP({ subsets: ['latin'], variable: '--font-noto-sans-jp' });

export const metadata: Metadata = {
  title: 'GamiFi Members - ゲーミフィケーション会員サイト',
  description: 'コミュニティの会員エンゲージメント向上のためのゲーミフィケーション会員サイト',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className={`${inter.variable} ${notoSansJP.variable} font-sans antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
