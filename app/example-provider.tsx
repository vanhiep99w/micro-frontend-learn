'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ExampleExplorerProvider } from '@vanhiep99w/docs-kit/components/example-explorer';
import { examples } from '@/lib/examples';

export function ExampleProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return <ExampleExplorerProvider examples={examples} navigationKey={pathname}>{children}</ExampleExplorerProvider>;
}
