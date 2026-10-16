'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { SourceExplorerProvider } from '@vanhiep99w/docs-kit/components/source-explorer';

export function SourceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [revision, setRevision] = useState<string>();

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      try {
        const response = await fetch('/source-examples/revision.json', { cache: 'no-store' });
        if (response.ok) {
          const data: unknown = await response.json();
          if (!disposed && typeof data === 'object' && data !== null
            && 'revision' in data && typeof data.revision === 'string'
            && /^[a-f0-9]{64}$/.test(data.revision)) setRevision(data.revision);
        }
      } catch {
        // Keep the last good source while the dev server restarts.
      } finally {
        if (!disposed) timer = setTimeout(poll, 1000);
      }
    }
    void poll();
    return () => { disposed = true; clearTimeout(timer); };
  }, []);

  return (
    <SourceExplorerProvider
      navigationKey={pathname}
      manifestUrl={`/source-examples/manifest.json${revision ? `?revision=${revision}` : ''}`}
      scrollAnchorSelector="#nd-page .prose > *"
    >
      {children}
    </SourceExplorerProvider>
  );
}
