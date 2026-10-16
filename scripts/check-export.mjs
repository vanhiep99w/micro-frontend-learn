import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadSourceExamples } from './source-examples.mjs';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(project, 'out');
const content = join(project, 'content/docs');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

assert(existsSync(output), 'Missing out/: run npm run build with output: export.');
assert(existsSync(join(output, 'index.html')), 'Missing home page.');
assert(existsSync(join(output, '404.html')), 'Missing static 404 page.');
assert(existsSync(join(output, '_next/static')), 'Missing JS/CSS assets.');

const docs = walk(content).filter((path) => path.endsWith('.mdx'));
let diagrams = 0;
for (const path of docs) {
  const slug = relative(content, path).replaceAll('\\', '/').replace(/\.mdx$/, '');
  const route = 'docs' + (slug === 'index' ? '' : '/' + slug.replace(/\/index$/, ''));
  const htmlPath = join(output, route + '.html');
  assert(existsSync(htmlPath), `Missing exported document: ${route}.html`);
  const expected = [...readFileSync(path, 'utf8').matchAll(/^```d2(?:\s|$)/gm)].length;
  const html = readFileSync(htmlPath, 'utf8');
  const figures = [...html.matchAll(/<figure\b[^>]*class="[^"]*\bd2-diagram\b/g)].length;
  assert.equal(figures, expected, `Missing rendered D2 diagrams: ${route}`);
  diagrams += figures;
}

const searchPath = join(output, 'api/search.json');
assert(existsSync(searchPath), 'Missing static search index: api/search.json.');
const index = JSON.parse(readFileSync(searchPath, 'utf8'));
assert(index !== null && typeof index === 'object', 'Invalid search index.');

const registry = JSON.parse(readFileSync(join(project, 'source-examples/registry.json'), 'utf8'));
const sourceDir = join(output, 'source-examples');
const manifest = JSON.parse(readFileSync(join(sourceDir, 'manifest.json'), 'utf8'));
assert.deepEqual(manifest.map((entry) => entry.id), registry.map((entry) => entry.id), 'Stale Source Explorer manifest');
const { snapshots: canonicalSources } = await loadSourceExamples();
let sourceFiles = 0;
for (const entry of manifest) {
  assert(entry.snapshots.some((snapshot) => snapshot.id === entry.defaultSnapshot), `Invalid default snapshot: ${entry.id}`);
  for (const snapshot of entry.snapshots) {
    assert(/^[a-z0-9-]+\.json$/.test(snapshot.asset), `Unsafe snapshot asset: ${snapshot.asset}`);
    const asset = JSON.parse(readFileSync(join(sourceDir, snapshot.asset), 'utf8'));
    assert.equal(asset.project, entry.id);
    assert.equal(asset.snapshot, snapshot.id);
    const canonical = canonicalSources.get(entry.id);
    assert.equal(asset.defaultFile, canonical.defaultFile);
    assert.deepEqual(asset.files.map(({ html, ...file }) => file), canonical.files, `Stale source code: ${entry.id}`);
    assert(asset.files.some((file) => file.path === asset.defaultFile), `Missing default file: ${entry.id}`);
    for (const file of asset.files) {
      const lines = file.code.split('\n').length;
      const highlighted = [...file.html.matchAll(/data-line="(\d+)"/g)].map((match) => Number(match[1]));
      assert.deepEqual(highlighted, Array.from({ length: lines }, (_, i) => i + 1), `Invalid highlighted lines: ${entry.id}/${file.path}`);
      assert(!/<script\b/i.test(file.html), `Unescaped source HTML: ${entry.id}/${file.path}`);
      assert(file.html.includes('--shiki-dark'), `Missing dark syntax theme: ${entry.id}/${file.path}`);
      for (const [start, end] of Object.values(file.regions)) assert(start >= 1 && end >= start && end <= lines, `Invalid source region: ${file.path}`);
      sourceFiles++;
    }
    // Exported assets must match the freshly generated source (not an old build).
    assert.equal(readFileSync(join(sourceDir, snapshot.asset), 'utf8'), readFileSync(join(project, 'public/source-examples', snapshot.asset), 'utf8'));
  }
}

console.log(`OK: out/ contains ${docs.length} docs, ${diagrams} rendered D2 diagrams, ${manifest.length} source projects/${sourceFiles} files, home, 404, assets and static search JSON.`);
