import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

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
for (const path of docs) {
  const slug = relative(content, path).replaceAll('\\', '/').replace(/\.mdx$/, '');
  const route = 'docs' + (slug === 'index' ? '' : '/' + slug.replace(/\/index$/, ''));
  assert(existsSync(join(output, route + '.html')),
    `Missing exported document: ${route}.html`);
}

const searchPath = join(output, 'api/search.json');
assert(existsSync(searchPath), 'Missing static search index: api/search.json.');
const index = JSON.parse(readFileSync(searchPath, 'utf8'));
assert(index !== null && typeof index === 'object', 'Invalid search index.');

console.log(`OK: out/ contains ${docs.length} docs, home, 404, assets and static search JSON.`);
