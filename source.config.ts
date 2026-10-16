import { defineDocs, defineConfig } from 'fumadocs-mdx/config';
import { remarkD2 } from '@vanhiep99w/docs-kit/d2';

export const docs = defineDocs({
  dir: 'content/docs',
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [[remarkD2, {
      cacheDir: '.next/cache/docs-kit/d2',
      defaultCaption: 'Sơ đồ',
    }]],
  },
});
