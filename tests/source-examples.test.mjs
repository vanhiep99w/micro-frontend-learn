import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { collectFiles, createSourceExamples, loadSourceExamples, safePath, validateReference } from '../scripts/source-examples.mjs';

const parse = (content) => unified().use(remarkParse).use(remarkMdx).parse(content);
const fence = (code, region = 'main', lang = 'ts', snapshot) => `\`\`\`${lang} sourceFile="src/example.ts" sourceRegion="${region}"${snapshot ? ` sourceSnapshot="${snapshot}"` : ''}\n${code}\n\`\`\``;
const fixture = () => {
  const registry = [{ id: 'demo', title: 'Demo', doc: 'demo.mdx', defaultSnapshot: 'basic', snapshots: [
    { id: 'basic', title: 'Basic', defaultFile: 'src/example.ts' },
    { id: 'advanced', title: 'Advanced', defaultFile: 'src/example.ts' },
  ] }];
  const trees = new Map([['demo.mdx', parse(`${fence('basic();')}\n\n${fence('advanced();', 'main', 'ts', 'advanced')}`)]]);
  return { registry, trees };
};

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
  assert.throws(() => collectFiles(parse('```ts sourceSnapshot="basic"\na\n```'), 'test'), /needs sourceFile/);
  assert.throws(() => collectFiles(parse('```ts sourceFile=src/a.ts\na\n```'), 'test'), /double-quoted/);
  assert.throws(() => collectFiles(parse(fence('a').replace('src/example.ts', '../secret')), 'test'), /Unsafe path/);
});

test('only permits relative local paths', () => {
  for (const path of ['../secret', '/etc/passwd', 'src/../secret', 'https://example.com/a', 'src\\a.ts', 'src//a', '']) {
    assert.throws(() => safePath(path));
  }
  assert.equal(safePath('src/.config/entry.ts'), 'src/.config/entry.ts');
});

test('keeps same-path variants separate; untagged fences belong to default only', () => {
  const { registry, trees } = fixture();
  const { projects, snapshots } = createSourceExamples(registry, trees);
  assert.equal(snapshots.size, 2);
  assert.equal(validateReference({ project: 'demo' }, projects, 'test').files[0].code, 'basic();');
  assert.equal(validateReference({ project: 'demo', snapshot: 'advanced' }, projects, 'test').files[0].code, 'advanced();');
  assert.deepEqual(snapshots.get('demo/basic').files[0].regions, { main: [1, 1] });
  assert.deepEqual(snapshots.get('demo/advanced').files[0].regions, { main: [1, 1] });
});

test('validates registry snapshots, defaults, empty variants, duplicate IDs and orphan tags', () => {
  const cases = [
    ({ registry }) => { registry[0].defaultSnapshot = 'missing'; },
    ({ registry }) => { registry[0].snapshots[1].id = 'basic'; },
    ({ registry }) => { registry[0].snapshots[1].id = '../secret'; },
    ({ registry }) => { registry[0].snapshots[1].defaultFile = 'missing.ts'; },
    ({ registry }) => { registry[0].defaultFile = 'src/example.ts'; },
    ({ registry }) => { registry[0].snapshots = []; },
    ({ registry }) => { registry.push(structuredClone(registry[0])); },
    ({ trees }) => { trees.set('demo.mdx', parse(fence('a', 'main', 'ts', 'unknown'))); },
    ({ trees }) => { trees.set('demo.mdx', parse(fence('a'))); },
    ({ trees }) => { trees.set('unregistered.mdx', parse(fence('a'))); },
    ({ trees }) => { trees.set('unregistered.mdx', parse('```ts sourceRegion="main"\na\n```')); },
    ({ trees }) => { trees.set('unregistered.mdx', parse('<SourceRef project={"demo"} />')); },
    ({ trees }) => { trees.set('unregistered.mdx', parse('<SourceRef project="demo" snapshot="missing" />')); },
  ];
  for (const change of cases) {
    const input = fixture();
    change(input);
    assert.throws(() => createSourceExamples(input.registry, input.trees));
  }
});

test('validates defaults, files, snapshots, regions and line bounds', () => {
  const { registry, trees } = fixture();
  trees.set('demo.mdx', parse(`${fence('a\nb')}\n\n${fence('c', 'main', 'ts', 'advanced')}`));
  const { projects } = createSourceExamples(registry, trees);
  for (const ref of [{ project: 'demo' }, { project: 'demo', region: 'main' }, { project: 'demo', lines: '1-2' }, { project: 'demo', lines: '2' }]) {
    assert.doesNotThrow(() => validateReference(ref, projects, 'test'));
  }
  for (const ref of [
    { project: 'missing' }, { project: 'demo', snapshot: 'missing' },
    { project: 'demo', file: 'missing.ts' }, { project: 'demo', region: 'missing' },
    { project: 'demo', lines: '0-1' }, { project: 'demo', lines: '1-3' },
    { project: 'demo', lines: '2-1' }, { project: 'demo', lines: 'NaN' },
    { project: 'demo', region: 'main', lines: '1' },
    { project: 'demo', variant: 'invalid' }, { project: 'demo', typo: 'x' },
    { project: 'demo', snapshot: 'advanced', lines: '1-2' },
  ]) assert.throws(() => validateReference(ref, projects, 'test'));
});

test('all repository SourceRefs resolve to canonical MDX snippets and variants', async () => {
  const { registry, projects, snapshots, references } = await loadSourceExamples();
  assert.equal(registry.length, projects.size);
  assert(projects.size >= 27);
  assert(snapshots.size > projects.size);
  assert(references > 200);
  const loader = snapshots.get('module-federation-dynamic-remotes/document').files.find((file) => file.path === 'shell/src/runtime-remotes.js');
  assert.deepEqual(Object.keys(loader.regions), ['manifest', 'loader']);
  const boundary = snapshots.get('module-federation-types-contracts/manual-types').files.find((file) => file.path === 'shell/src/catalog-boundary.ts');
  assert.deepEqual(Object.keys(boundary.regions), ['decoder', 'adapter']);
  for (const snapshot of snapshots.values()) {
    for (const file of snapshot.files) {
      const lines = file.code.split('\n').length;
      for (const [start, end] of Object.values(file.regions)) assert(start >= 1 && end >= start && end <= lines);
    }
  }
});

test('explicit shared source files are copied only to named snapshots, while default files stay isolated', () => {
  const { registry } = fixture();
  const shared = fence('shared();').replace('sourceRegion="main"', 'sourceRegion="main" sourceSnapshots="basic,advanced"');
  const defaultOnly = fence('basicOnly();').replace('src/example.ts', 'src/basic-only.ts');
  const advancedOnly = fence('advancedOnly();', 'main', 'ts', 'advanced').replace('src/example.ts', 'src/advanced-only.ts');
  const trees = new Map([['demo.mdx', parse([shared, defaultOnly, advancedOnly].join('\n\n'))]]);
  const { projects } = createSourceExamples(registry, trees);
  const basic = projects.get('demo').snapshots.get('basic');
  const advanced = projects.get('demo').snapshots.get('advanced');
  assert.deepEqual(basic.files.map(file => file.path).sort(), ['src/basic-only.ts', 'src/example.ts']);
  assert.deepEqual(advanced.files.map(file => file.path).sort(), ['src/advanced-only.ts', 'src/example.ts']);
  assert.equal(basic.files.find(file => file.path === 'src/example.ts').code, advanced.files.find(file => file.path === 'src/example.ts').code);
});

test('shared snapshot metadata rejects ambiguous, unknown, repeated, empty and orphan selections', () => {
  const { registry } = fixture();
  const shared = fence('shared();').replace('sourceRegion="main"', 'sourceRegion="main" sourceSnapshots="basic,advanced"');
  for (const invalid of [
    shared.replace('basic,advanced', 'basic,unknown'),
    shared.replace('basic,advanced', 'basic,basic'),
    shared.replace('basic,advanced', 'basic,'),
    shared.replace('basic,advanced', 'basic,,advanced'),
    shared.replace('sourceSnapshots=', 'sourceSnapshot="basic" sourceSnapshots='),
    shared.replace('sourceFile="src/example.ts" ', ''),
    shared.replace('sourceSnapshots="basic,advanced"', 'sourceSnapshots=basic,advanced'),
    shared.replace('sourceSnapshots="basic,advanced"', 'sourceSnapshots=""'),
  ]) {
    assert.throws(() => createSourceExamples(registry, new Map([['demo.mdx', parse(invalid)]])));
  }
  const { trees } = fixture();
  trees.set('unregistered.mdx', parse('```ts sourceSnapshots="basic,advanced"\nshared();\n```'));
  assert.throws(() => createSourceExamples(registry, trees), /source metadata needs a registry entry/);
});

function sourceAsset(files) {
  return { schemaVersion: 1, sourceHash: createHash('sha256').update(JSON.stringify(files)).digest('hex'), files };
}

test('reviewed source assets produce isolated complete snapshots with main regions', () => {
  const registry = [{ id: 'lab', title: 'Lab', doc: 'lab.mdx', defaultSnapshot: 'fixed', snapshots: [
    { id: 'broken', title: 'Broken', defaultFile: 'shell/main.js', sourceAsset: 'lab/broken.json' },
    { id: 'fixed', title: 'Fixed', defaultFile: 'shell/main.js', sourceAsset: 'lab/fixed.json' },
  ] }];
  const trees = new Map([['lab.mdx', parse('<SourceRef project="lab" snapshot="broken" file="shell/main.js" region="main" />')]]);
  const assets = new Map([
    ['lab/broken.json', sourceAsset([{ path: 'shell/main.js', language: 'js', code: 'broken();\n' }])],
    ['lab/fixed.json', sourceAsset([{ path: 'shell/main.js', language: 'js', code: 'guard();\nfixed();\n' }])],
  ]);
  const { projects } = createSourceExamples(registry, trees, assets);
  assert.equal(projects.get('lab').snapshots.get('broken').files[0].code, 'broken();\n');
  assert.deepEqual(projects.get('lab').snapshots.get('fixed').files[0].regions.main, [1, 2]);
});

test('source assets reject missing files, bad hashes, traversal, duplicates and mixed inline sources', () => {
  const registry = [{ id: 'lab', title: 'Lab', doc: 'lab.mdx', defaultSnapshot: 'fixed', snapshots: [
    { id: 'fixed', title: 'Fixed', defaultFile: 'shell/main.js', sourceAsset: 'lab/fixed.json' },
  ] }];
  const trees = new Map([['lab.mdx', parse('Source asset lesson.')]]);
  const file = { path: 'shell/main.js', language: 'js', code: 'fixed();\n' };
  assert.throws(() => createSourceExamples(registry, trees), /missing source asset/);
  const invalid = [
    { ...sourceAsset([file]), sourceHash: 'wrong' },
    sourceAsset([{ ...file, path: '../private' }]),
    sourceAsset([file, file]),
    sourceAsset([{ ...file, language: 'mermaid' }]),
    sourceAsset([{ ...file, code: '' }]),
  ];
  for (const asset of invalid) assert.throws(() => createSourceExamples(registry, trees, new Map([['lab/fixed.json', asset]])));
  const assets = new Map([['lab/fixed.json', sourceAsset([file])]]);
  const inline = new Map([['lab.mdx', parse(fence('inline();'))]]);
  assert.throws(() => createSourceExamples(registry, inline, assets), /do not mix/);
  registry[0].snapshots[0].sourceAsset = '../private.json';
  assert.throws(() => createSourceExamples(registry, trees, assets), /Unsafe path/);
});
