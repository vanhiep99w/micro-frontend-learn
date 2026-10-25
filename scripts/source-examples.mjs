import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';

export const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
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

function validID(id, context) {
  assert(typeof id === 'string' && /^[a-z][a-z0-9-]*$/.test(id), `${context}: invalid ID ${id}`);
}

function metadata(meta, key) {
  const matches = [...(meta ?? '').matchAll(new RegExp(`(?:^|\\s)${key}="([^"]+)"`, 'g'))];
  assert(matches.length <= 1, `Duplicate ${key} in code fence metadata`);
  if ((meta ?? '').includes(key + '=')) assert(matches.length === 1, `${key} must use a non-empty double-quoted value`);
  return matches[0]?.[1];
}

/** A missing sourceSnapshot belongs ONLY to the project's default, never every variant. */
export function collectFiles(tree, context, {
  snapshot = 'document', defaultSnapshot = 'document', snapshotIds = ['document'],
} = {}) {
  const files = new Map();
  walk(tree, (node) => {
    if (node.type !== 'code') return;
    const path = metadata(node.meta, 'sourceFile');
    const region = metadata(node.meta, 'sourceRegion');
    const selected = metadata(node.meta, 'sourceSnapshot');
    // Share identical support files explicitly, without leaking them to the default.
    const shared = metadata(node.meta, 'sourceSnapshots');
    if (!path) {
      assert(!region && !selected && !shared, `${context}: sourceRegion/sourceSnapshot/sourceSnapshots needs sourceFile`);
      return;
    }
    assert(!(selected && shared), `${context}: use sourceSnapshot OR sourceSnapshots, not both`);
    const selectedIDs = shared ? shared.split(',').map(id => id.trim()) : [selected ?? defaultSnapshot];
    assert(selectedIDs.every(Boolean), `${context}: empty sourceSnapshots ID`);
    assert(new Set(selectedIDs).size === selectedIDs.length, `${context}: duplicate sourceSnapshots ID`);
    for (const id of selectedIDs) assert(snapshotIds.includes(id), `${context}: unknown sourceSnapshot ${id}`);
    safePath(path);
    assert(region && /^[a-z][a-z0-9-]*$/.test(region), `${context}: missing/invalid sourceRegion for ${path}`);
    assert(node.value.length > 0, `${context}: empty source ${path}`);
    const language = node.lang || 'text';
    assert(!['d2', 'mermaid', 'bash', 'powershell', 'http'].includes(language), `${context}: not a source file: ${path}`);
    if (!selectedIDs.includes(snapshot)) return;
    const file = files.get(path) ?? { path, language, code: '', regions: {} };
    assert(file.language === language, `${context}: mixed languages in ${snapshot}/${path}`);
    assert(!Object.hasOwn(file.regions, region), `${context}: duplicate region ${snapshot}/${path}#${region}`);
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

export function validateReference(ref, projects, context) {
  for (const key of Object.keys(ref)) {
    assert(['project', 'snapshot', 'file', 'region', 'lines', 'variant'].includes(key), `${context}: unknown SourceRef prop ${key}`);
  }
  const project = projects.get(ref.project);
  assert(project, `${context}: unknown source project ${ref.project}`);
  const id = ref.snapshot ?? project.defaultSnapshot;
  const snapshot = project.snapshots.get(id);
  assert(snapshot, `${context}: unknown snapshot ${id} in ${ref.project}`);
  assert(!ref.variant || ['inline', 'button'].includes(ref.variant), `${context}: invalid SourceRef variant`);
  assert(!(ref.region && ref.lines), `${context}: cannot combine region and lines`);
  const path = ref.file ?? snapshot.defaultFile;
  const file = snapshot.files.find((entry) => entry.path === path);
  assert(file, `${context}: unknown source file ${id}/${path}`);
  if (ref.region) assert(Object.hasOwn(file.regions, ref.region), `${context}: unknown region ${id}/${path}#${ref.region}`);
  if (ref.lines) {
    const range = /^(\d+)(?:-(\d+))?$/.exec(ref.lines);
    assert(range, `${context}: invalid lines ${ref.lines}`);
    const start = Number(range[1]);
    const end = Number(range[2] ?? range[1]);
    assert(start >= 1 && end >= start && end <= file.code.split('\n').length, `${context}: lines outside ${id}/${path}`);
  }
  return snapshot;
}

async function mdxPaths(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const paths = await Promise.all(entries.map((entry) => entry.isDirectory()
    ? mdxPaths(join(dir, entry.name))
    : entry.name.endsWith('.mdx') ? [join(dir, entry.name)] : []));
  return paths.flat().sort();
}

function filesFromSourceAsset(asset, context) {
  assert(asset?.schemaVersion === 1 && Array.isArray(asset.files) && asset.files.length, `${context}: invalid source asset`);
  const hash = createHash('sha256').update(JSON.stringify(asset.files)).digest('hex');
  assert(asset.sourceHash === hash, `${context}: source asset hash mismatch`);
  const paths = new Set();
  return asset.files.map(file => {
    safePath(file.path);
    assert(!paths.has(file.path), `${context}: duplicate source asset path ${file.path}`);
    paths.add(file.path);
    assert(['js', 'ts', 'tsx', 'jsx', 'html', 'css', 'json'].includes(file.language), `${context}: unsupported source asset language`);
    assert(typeof file.code === 'string' && file.code.trim(), `${context}: empty source asset code`);
    return { path: file.path, language: file.language, code: file.code, regions: { main: [1, file.code.trimEnd().split('\n').length] } };
  });
}

/** Pure data assembly; optional reviewed JSON assets come from canonical runnable labs. */
export function createSourceExamples(registry, trees, sourceAssets = new Map()) {
  assert(Array.isArray(registry) && registry.length > 0, 'Empty source registry');
  const projects = new Map();
  const snapshots = new Map();
  const registeredDocs = new Set();
  for (const entry of registry) {
    validID(entry.id, 'Source project');
    assert(!projects.has(entry.id), `Duplicate source project ID: ${entry.id}`);
    assert(typeof entry.title === 'string' && entry.title.trim(), `${entry.id}: missing title`);
    const path = safePath(entry.doc);
    assert(!registeredDocs.has(path), `Duplicate registered doc: ${path}`);
    registeredDocs.add(path);
    const tree = trees.get(path);
    assert(tree, `Missing source document: ${path}`);
    const expanded = entry.snapshots !== undefined;
    assert(!expanded || !entry.defaultFile, `${path}: use defaultFile inside snapshots, not on the project`);
    assert(expanded || entry.defaultSnapshot === undefined, `${path}: defaultSnapshot requires snapshots`);
    const definitions = expanded ? entry.snapshots : [{ id: 'document', title: 'Code trong bài', defaultFile: entry.defaultFile }];
    assert(Array.isArray(definitions) && definitions.length > 0, `${path}: empty snapshots`);
    const defaultSnapshot = expanded ? entry.defaultSnapshot : 'document';
    const ids = definitions.map((definition) => definition.id);
    ids.forEach((id) => validID(id, path));
    assert(new Set(ids).size === ids.length, `${path}: duplicate snapshot IDs`);
    assert(ids.includes(defaultSnapshot), `${path}: invalid defaultSnapshot ${defaultSnapshot}`);
    const project = {
      id: entry.id, title: entry.title, defaultSnapshot,
      snapshotTitles: new Map(definitions.map((definition) => [definition.id, definition.title])),
      snapshots: new Map(),
    };
    for (const definition of definitions) {
      assert(typeof definition.title === 'string' && definition.title.trim(), `${path}: missing snapshot title`);
      safePath(definition.defaultFile);
      let files = collectFiles(tree, path, { snapshot: definition.id, defaultSnapshot, snapshotIds: ids });
      if (definition.sourceAsset !== undefined) {
        safePath(definition.sourceAsset);
        assert(files.length === 0, `${path}: do not mix sourceAsset and inline source files`);
        assert(sourceAssets.has(definition.sourceAsset), `${path}: missing source asset ${definition.sourceAsset}`);
        files = filesFromSourceAsset(sourceAssets.get(definition.sourceAsset), `${path}/${definition.id}`);
      }
      assert(files.length > 0, `${path}: no sourceFile fences for snapshot ${definition.id}`);
      assert(files.some((file) => file.path === definition.defaultFile), `${path}: missing defaultFile ${definition.id}/${definition.defaultFile}`);
      const snapshot = { project: entry.id, snapshot: definition.id, defaultFile: definition.defaultFile, files };
      project.snapshots.set(definition.id, snapshot);
      snapshots.set(`${entry.id}/${definition.id}`, snapshot);
    }
    projects.set(entry.id, project);
  }

  let references = 0;
  for (const [path, tree] of trees) {
    walk(tree, (node) => {
      if (node.type === 'code' && /\bsource(?:File|Region|Snapshots?)=/.test(node.meta ?? '')) {
        assert(registeredDocs.has(path), `${path}: source metadata needs a registry entry`);
      }
      if (node.name !== 'SourceRef') return;
      validateReference(referenceProps(node, path), projects, `${path}:${node.position?.start.line}`);
      references++;
    });
  }
  return { registry, projects, snapshots, references };
}

export async function loadSourceExamples(root = projectRoot) {
  const docsRoot = join(root, 'content/docs');
  const registry = JSON.parse(await readFile(join(root, 'source-examples/registry.json'), 'utf8'));
  const trees = new Map();
  for (const path of await mdxPaths(docsRoot)) {
    const name = path.slice(docsRoot.length + 1).replaceAll('\\', '/');
    trees.set(name, parser.parse({ value: await readFile(path, 'utf8'), path }));
  }
  const sourceAssets = new Map();
  for (const entry of registry) for (const snapshot of entry.snapshots ?? []) {
    if (snapshot.sourceAsset === undefined) continue;
    safePath(snapshot.sourceAsset);
    if (!sourceAssets.has(snapshot.sourceAsset)) {
      sourceAssets.set(snapshot.sourceAsset, JSON.parse(await readFile(join(root, 'source-examples', snapshot.sourceAsset), 'utf8')));
    }
  }
  return createSourceExamples(registry, trees, sourceAssets);
}
