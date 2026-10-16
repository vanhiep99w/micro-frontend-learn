import assert from 'node:assert/strict';
import test from 'node:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { collectFiles, loadSourceExamples, safePath, validateReference } from '../scripts/source-examples.mjs';

const parse = (content) => unified().use(remarkParse).use(remarkMdx).parse(content);
const fence = (code, region = 'main', lang = 'ts') => `\`\`\`${lang} sourceFile="src/example.ts" sourceRegion="${region}"\n${code}\n\`\`\``;

test('extracts opted-in source verbatim, merges parts with correct 1-based regions', () => {
  const first = 'const html = "<script>&</script>";\nexport { html };';
  const second = 'console.log(html);';
  const files = collectFiles(parse(`${fence(first, 'exports')}\n\n${fence(second, 'consumer')}\n\n\`\`\`ts\nignoreMe();\n\`\`\``), 'test.mdx');
  assert.equal(files.length, 1);
  assert.equal(files[0].code, first + '\n\n' + second);
  assert.deepEqual(files[0].regions, { exports: [1, 2], consumer: [4, 4] });
});

test('rejects duplicate regions, inconsistent languages and invalid metadata', () => {
  assert.throws(() => collectFiles(parse(`${fence('a')}\n\n${fence('b')}`), 'test'), /duplicate region/);
  assert.throws(() => collectFiles(parse(`${fence('a', 'a')}\n\n${fence('b', 'b', 'js')}`), 'test'), /mixed languages/);
  assert.throws(() => collectFiles(parse('```ts sourceRegion="main"\na\n```'), 'test'), /needs sourceFile/);
  assert.throws(() => collectFiles(parse('```ts sourceFile=src/a.ts\na\n```'), 'test'), /double-quoted/);
  assert.throws(() => collectFiles(parse(fence('a').replace('src/example.ts', '../secret')), 'test'), /Unsafe path/);
});

test('only permits relative local paths', () => {
  for (const path of ['../secret', '/etc/passwd', 'src/../secret', 'https://example.com/a', 'src\\a.ts', 'src//a', '']) {
    assert.throws(() => safePath(path));
  }
  assert.equal(safePath('src/.config/entry.ts'), 'src/.config/entry.ts');
});

test('validates defaults, files, snapshots, regions and line bounds', () => {
  const snapshots = new Map([['demo', { snapshot: 'document', defaultFile: 'src/example.ts', files: [{ path: 'src/example.ts', code: 'a\nb', regions: { main: [1, 2] } }] }]]);
  for (const ref of [{ project: 'demo' }, { project: 'demo', region: 'main' }, { project: 'demo', lines: '1-2' }, { project: 'demo', lines: '2' }]) {
    assert.doesNotThrow(() => validateReference(ref, snapshots, 'test'));
  }
  for (const ref of [
    { project: 'missing' }, { project: 'demo', snapshot: 'missing' },
    { project: 'demo', file: 'missing.ts' }, { project: 'demo', region: 'missing' },
    { project: 'demo', lines: '0-1' }, { project: 'demo', lines: '1-3' },
    { project: 'demo', lines: '2-1' }, { project: 'demo', lines: 'NaN' },
    { project: 'demo', region: 'main', lines: '1' },
    { project: 'demo', variant: 'invalid' }, { project: 'demo', typo: 'x' },
  ]) assert.throws(() => validateReference(ref, snapshots, 'test'));
});

test('all repository SourceRefs resolve to the canonical MDX snippets', async () => {
  const { registry, snapshots, references } = await loadSourceExamples();
  assert.equal(registry.length, snapshots.size);
  assert(snapshots.size >= 20);
  assert(references > 100);
  const loader = snapshots.get('module-federation-dynamic-remotes').files.find((file) => file.path === 'shell/src/runtime-remotes.js');
  assert.deepEqual(Object.keys(loader.regions), ['manifest', 'loader']);
  for (const snapshot of snapshots.values()) {
    for (const file of snapshot.files) {
      const lines = file.code.split('\n').length;
      for (const [start, end] of Object.values(file.regions)) assert(start >= 1 && end >= start && end <= lines);
    }
  }
});
