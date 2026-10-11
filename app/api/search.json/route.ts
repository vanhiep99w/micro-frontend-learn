import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';

// Serialize the index at build time, rather than querying a runtime server.
export const dynamic = 'force-static';
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source);
