import test from 'node:test';
import assert from 'node:assert/strict';
import { loadExamplePages, extractExampleReferences } from '../scripts/example-references.mjs';
import { examples } from '../lib/examples.ts';
import { validateExamples, resolveExample } from '@vanhiep99w/docs-kit/example-explorer';

const covered = [
 'bat-dau/bai-toan-shop.mdx', 'kien-truc/chia-domain.mdx', 'kien-truc/application-shell.mdx',
 'giao-tiep-va-trang-thai/contracts.mdx', 'giao-tiep-va-trang-thai/events.mdx',
 'giao-tiep-va-trang-thai/state-ownership.mdx', 'giao-tiep-va-trang-thai/index.mdx',
 'ui-va-framework/css-isolation.mdx', 'giao-tiep-va-trang-thai/routing.mdx',
 'production/resilience.mdx', 'giao-tiep-va-trang-thai/data-fetching.mdx',
 'cac-cach-tich-hop/web-components.mdx', 'cac-cach-tich-hop/iframe.mdx',
 'ui-va-framework/design-system.mdx',
].sort();

test('all selected lessons reference valid runnable examples and every definition is used',async()=>{
 validateExamples(examples);
 const pages = await loadExamplePages();
 assert.deepEqual(pages.map(page=>page.path).sort(),covered);
 const used = new Set();
 for(const page of pages) for(const request of page.references){
  const {example,version} = resolveExample(examples,request);
  used.add(example.id);
  if (example.id === 'application-shell') assert.equal(version.src, '/examples/application-shell/shell/');
  else assert.equal(new URL(version.src).origin,'https://example-learn.pages.dev');
 }
 assert.equal(used.size,10);
 assert.equal(examples.length,10);
});
test('reference checker parses actual JSX, ignores code samples and rejects dynamic registry IDs',()=>{
 const fence=String.fromCharCode(96).repeat(3);
 const mdx=fence+'mdx\n<ExampleRef example="not-real" />\n'+fence+'\n\n<ExampleRef example="mfe-cart" version="snapshot">Open</ExampleRef>';
 const refs=extractExampleReferences(mdx);
 assert.equal(refs.length,1);assert.equal(refs[0].example,'mfe-cart');
 assert.throws(()=>extractExampleReferences('<ExampleRef example={id} />'),/static string/);
 assert.throws(()=>extractExampleReferences('<ExampleRef />'),/needs example/);
});
