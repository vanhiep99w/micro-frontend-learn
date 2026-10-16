import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const docsRoot = join(projectRoot, 'content/docs');
const parser = unified().use(remarkParse).use(remarkMdx);

function walk(node, callback) {
  callback(node);
  node.children?.forEach((child) => walk(child, callback));
}

export function safePath(path) {
  assert(typeof path === 'string' && path.length > 0, 'Expected a non-empty relative path');
  assert(!path.includes('\\') && !path.includes(':') && !path.startsWith('/'), `Unsafe path: ${path}`);
  assert(path.split('/').every((part) => part && part !== '.' && part !== '..'), `Unsafe path: ${path}`);
  return path;
}

function metadata(meta, key) {
  const matches = [...(meta ?? '').matchAll(new RegExp(`(?:^|\\s)${key}="([^"]+)"`, 'g'))];
  assert(matches.length <= 1, `Duplicate ${key} in code fence metadata`);
  if ((meta ?? '').includes(key + '=')) assert(matches.length === 1, `${key} must use a non-empty double-quoted value`);
  return matches[0]?.[1];
}

/** Extract only explicitly opted-in fences; fragments/variants are never guessed from titles. */
export function collectFiles(tree, context) {
  const files = new Map();
  walk(tree, (node) => {
    if (node.type !== 'code') return;
    const path = metadata(node.meta, 'sourceFile');
    const region = metadata(node.meta, 'sourceRegion');
    if (!path) {
      assert(!region, `${context}: sourceRegion needs sourceFile`);
      return;
    }
    safePath(path);
    assert(region && /^[a-z][a-z0-9-]*$/.test(region), `${context}: missing/invalid sourceRegion for ${path}`);
    assert(node.value.length > 0, `${context}: empty source ${path}`);
    const language = node.lang || 'text';
    assert(!['d2', 'mermaid', 'bash', 'http'].includes(language), `${context}: not a source file: ${path}`);
    const file = files.get(path) ?? { path, language, code: '', regions: {} };
    assert(file.language === language, `${context}: mixed languages in ${path}`);
    assert(!Object.hasOwn(file.regions, region), `${context}: duplicate region ${path}#${region}`);
    if (file.code) file.code += '\n\n';
    const start = file.code.split('\n').length;
    file.code += node.value;
    file.regions[region] = [start, file.code.split('\n').length];
    files.set(path, file);
  });
  return [...files.values()];
}

function referenceProps(node, context) {
  const props = {};
  for (const attr of node.attributes ?? []) {
    assert(attr.type === 'mdxJsxAttribute' && typeof attr.value === 'string', `${context}: SourceRef props must be static strings`);
    assert(!Object.hasOwn(props, attr.name), `${context}: duplicate SourceRef prop ${attr.name}`);
    props[attr.name] = attr.value;
  }
  return props;
}

export function validateReference(ref, snapshots, context) {
  for (const key of Object.keys(ref)) {
    assert(['project', 'snapshot', 'file', 'region', 'lines', 'variant'].includes(key), `${context}: unknown SourceRef prop ${key}`);
  }
  const snapshot = snapshots.get(ref.project);
  assert(snapshot, `${context}: unknown source project ${ref.project}`);
  assert(!ref.snapshot || ref.snapshot === snapshot.snapshot, `${context}: unknown snapshot ${ref.snapshot}`);
  assert(!ref.variant || ['inline', 'button'].includes(ref.variant), `${context}: invalid SourceRef variant`);
  assert(!(ref.region && ref.lines), `${context}: cannot combine region and lines`);
  const path = ref.file ?? snapshot.defaultFile;
  const file = snapshot.files.find((entry) => entry.path === path);
  assert(file, `${context}: unknown source file ${path}`);
  if (ref.region) assert(Object.hasOwn(file.regions, ref.region), `${context}: unknown region ${path}#${ref.region}`);
  if (ref.lines) {
    const range = /^(\d+)(?:-(\d+))?$/.exec(ref.lines);
    assert(range, `${context}: invalid lines ${ref.lines}`);
    const start = Number(range[1]);
    const end = Number(range[2] ?? range[1]);
    assert(start >= 1 && end >= start && end <= file.code.split('\n').length, `${context}: lines outside ${path}`);
  }
}

async function mdxPaths(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? mdxPaths(join(dir, entry.name))
    : entry.name.endsWith('.mdx') ? [join(dir, entry.name)] : []));
  return paths.flat().sort();
}

export async function loadSourceExamples() {
  const registry = JSON.parse(await readFile(join(projectRoot, 'source-examples/registry.json'), 'utf8'));
  assert(Array.isArray(registry) && registry.length > 0, 'Empty source registry');
  const snapshots = new Map();
  const registeredDocs = new Set();
  const trees = new Map();
  for (const path of await mdxPaths(docsRoot)) trees.set(path, parser.parse(await readFile(path, 'utf8')));

  for (const entry of registry) {
    assert(/^[a-z][a-z0-9-]*$/.test(entry.id), `Invalid source project ID: ${entry.id}`);
    assert(!snapshots.has(entry.id), `Duplicate source project ID: ${entry.id}`);
    assert(typeof entry.title === 'string' && entry.title.trim(), `${entry.id}: missing title`);
    const path = join(docsRoot, safePath(entry.doc));
    assert(!registeredDocs.has(path), `Duplicate registered doc: ${entry.doc}`);
    registeredDocs.add(path);
    const tree = trees.get(path);
    assert(tree, `Missing source document: ${entry.doc}`);
    const files = collectFiles(tree, entry.doc);
    assert(files.length > 0, `${entry.doc}: no sourceFile fences`);
    assert(files.some((file) => file.path === entry.defaultFile), `${entry.doc}: missing defaultFile ${entry.defaultFile}`);
    snapshots.set(entry.id, { project: entry.id, snapshot: 'document', defaultFile: entry.defaultFile, files });
  }

  let references = 0;
  for (const [path, tree] of trees) {
    walk(tree, (node) => {
      if (node.type === 'code' && /\bsourceFile=/.test(node.meta ?? '')) {
        assert(registeredDocs.has(path), `${path}: sourceFile fence needs a registry entry`);
      }
      if (node.name !== 'SourceRef') return;
      validateReference(referenceProps(node, path), snapshots, `${path}:${node.position?.start.line}`);
      references++;
    });
  }
  return { registry, snapshots, references };
}
