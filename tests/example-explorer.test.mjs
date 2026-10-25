import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateExamples, resolveExample } from '@vanhiep99w/docs-kit/example-explorer';
import { examples } from '../lib/examples.ts';

test('Example Explorer is wired through provider, registry, MDX and CSS without the old inline frame', async () => {
  validateExamples(examples);
  const mdx=await readFile(new URL('../mdx-components.tsx',import.meta.url),'utf8');
  const css=await readFile(new URL('../app/global.css',import.meta.url),'utf8');
  const page=await readFile(new URL('../content/docs/giao-tiep-va-trang-thai/index.mdx',import.meta.url),'utf8');
  const provider=await readFile(new URL('../app/example-provider.tsx',import.meta.url),'utf8');
  const layout=await readFile(new URL('../app/layout.tsx',import.meta.url),'utf8');
  assert.match(mdx,/import \{ ExampleRef \} from '@vanhiep99w\/docs-kit\/components\/example-explorer'/);
  assert.match(mdx,/\n    ExampleRef,/);
  assert.match(css,/@import '@vanhiep99w\/docs-kit\/styles\/example-explorer.css'/);
  assert.doesNotMatch(css,/styles\/live-demo.css/);
  assert.match(provider,/navigationKey=\{pathname\}/);
  assert.match(layout,/<ExampleProvider>/);
  assert.doesNotMatch(page,/<LiveDemo/);
  const references=[...page.matchAll(/<ExampleRef example="([^"]+)"(?: version="([^"]+)")?/g)];
  assert.equal(references.length,3);
  for(const [,example,version] of references) resolveExample(examples,{example,version});
  assert.equal(new Set(references.map(([,id])=>id)).size,2);
  assert.match(page,/không gọi backend/);
  assert.match(page,/hai biến thể của lab v1/);
});
test('versions reference distinct real teaching behavior, not duplicate URLs or query-provided arbitrary apps', () => {
  const snapshot=resolveExample(examples,{example:'mfe-cart',version:'snapshot'}).version;
  const events=resolveExample(examples,{example:'mfe-cart',version:'events-only'}).version;
  assert.notEqual(snapshot.src,events.src);
  assert.equal(new URL(events.src).searchParams.get('mode'),'events-only');
  const bus=resolveExample(examples,{example:'event-target'}).version;
  assert.equal(new URL(bus.src).pathname,'/browser/event-target/v1/');
  for(const definition of examples) for(const version of definition.versions) {
    if (definition.id === 'application-shell') assert.equal(version.src, '/examples/application-shell/shell/index.html');
    else if (definition.id === 'application-shell-race') assert.equal(version.src, `/examples/application-shell/race/${version.id}/shell/index.html`);
    else assert.equal(new URL(version.src).origin,'https://example-learn.pages.dev');
  }
});
