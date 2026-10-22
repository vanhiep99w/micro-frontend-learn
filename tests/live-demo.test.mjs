import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('LiveDemo is wired through the package API, MDX registry, CSS and authored lesson', async () => {
  const mdx = await readFile(new URL('../mdx-components.tsx', import.meta.url), 'utf8');
  const css = await readFile(new URL('../app/global.css', import.meta.url), 'utf8');
  const page = await readFile(new URL('../content/docs/giao-tiep-va-trang-thai/index.mdx', import.meta.url), 'utf8');
  assert.match(mdx, /import \{ LiveDemo \} from '@vanhiep99w\/docs-kit\/components\/live-demo'/);
  assert.match(mdx, /\n    LiveDemo,/);
  assert.match(css, /@import '@vanhiep99w\/docs-kit\/styles\/live-demo.css'/);
  assert.match(page, /<LiveDemo\s/);
  assert.match(page, /src="https:\/\/example-learn.pages.dev\/micro-frontend\/communication\/v1\/"/);
  assert.match(page, /sourceUrl="https:\/\/github.com\/vanhiep99w\/example-learn/);
  assert.match(page, /\[Thử trực tiếp React và Vue\]\(#thử-trực-tiếp-react-và-vue\)/);
  assert.match(page, /không gọi backend/);
});
