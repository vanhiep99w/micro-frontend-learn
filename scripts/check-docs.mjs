import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const root = join(project, 'content/docs');

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  });
}

function slugify(text) {
  return text.trim().toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s_-]/gu, '')
    .replace(/\s/g, '-');
}

const files = walk(root);
const pages = new Map();
const headings = new Map();
let categories = 0;
let links = 0;

for (const path of files.filter((file) => file.endsWith('.mdx'))) {
  const content = readFileSync(path, 'utf8');
  const name = relative(root, path).replaceAll('\\', '/').replace(/\.mdx$/, '');
  const route = '/docs' + (name === 'index' ? '' : '/' + name.replace(/\/index$/, ''));
  assert(!pages.has(route), `Duplicate route: ${route}`);
  pages.set(route, { path, content });

  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---\r?\n/.exec(content);
  assert(frontmatter, `Missing frontmatter: ${path}`);
  for (const field of ['title', 'description']) {
    assert(new RegExp('^' + field + ':\\s*\\S', 'm').test(frontmatter[1]),
      `Missing ${field}: ${path}`);
  }
  // D2 flow uses leading '# @flow' comment-YAML; those are code, not article H1s.
  // Match the opening delimiter so inner triple backticks in a longer fence stay code.
  const prose = content.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm, '');
  assert(prose.includes('## Mục lục'), `Missing manual TOC: ${path}`);
  assert(!/^# /m.test(prose), `Duplicate H1: ${path}`);

  const seen = new Map();
  const ids = new Set();
  for (const match of prose.matchAll(/^#{2,6}\s+(.+)$/gm)) {
    const base = slugify(match[1]);
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    ids.add(count ? base + '-' + count : base);
  }
  headings.set(route, ids);
}

for (const path of files.filter((file) => file.endsWith('/meta.json'))) {
  const meta = JSON.parse(readFileSync(path, 'utf8'));
  assert.equal(typeof meta.title, 'string', `Invalid title: ${path}`);
  assert(Array.isArray(meta.pages), `Missing ordering: ${path}`);
  assert.equal(new Set(meta.pages).size, meta.pages.length, `Duplicate nav entry: ${path}`);
  const dir = dirname(path);
  if (dir !== root) categories++;
  for (const entry of meta.pages) {
    assert.equal(typeof entry, 'string', `Invalid nav entry: ${path}`);
    assert(existsSync(join(dir, entry + '.mdx')) || existsSync(join(dir, entry, 'meta.json')),
      `Missing nav target ${entry}: ${path}`);
  }
  const expected = readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isFile() && entry.name.endsWith('.mdx')) return [entry.name.slice(0, -4)];
    if (entry.isDirectory()) {
      assert(existsSync(join(dir, entry.name, 'meta.json')), `Missing metadata: ${entry.name}`);
      return [entry.name];
    }
    return [];
  });
  assert.deepEqual([...meta.pages].sort(), expected.sort(), `Incomplete ordering: ${path}`);
}

for (const [route, { path, content }] of pages) {
  for (const match of content.matchAll(/\]\((\/docs[^\s)]*|#[^\s)]*)\)/g)) {
    const href = match[1];
    const [target, anchor] = href.split('#');
    const targetRoute = target || route;
    assert(pages.has(targetRoute), `Broken route ${href}: ${path}`);
    if (anchor) {
      assert(headings.get(targetRoute).has(decodeURIComponent(anchor)),
        `Broken anchor ${href}: ${path}`);
    }
    links++;
  }
}

console.log(`OK: ${categories} categories, ${pages.size} MDX pages, ${links} internal links/anchors.`);
console.log('Structural checks only; MDX compilation, typecheck and build are separate.');
