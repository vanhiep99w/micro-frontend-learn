import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { SourceProvider } from './source-provider';
import { ExampleProvider } from './example-provider';
import './global.css';

export const metadata: Metadata = {
  title: {
    default: 'Micro-frontend Learning',
    template: '%s | Micro-frontend Learning',
  },
  description: 'Lộ trình học micro-frontend bằng tiếng Việt, từ nền tảng đến triển khai và vận hành.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="vi" suppressHydrationWarning>
      <body className="flex min-h-screen flex-col">
        <RootProvider search={{ options: { type: 'static', api: '/api/search.json' } }}>
          <SourceProvider><ExampleProvider>{children}</ExampleProvider></SourceProvider>
        </RootProvider>
      </body>
    </html>
  );
}
