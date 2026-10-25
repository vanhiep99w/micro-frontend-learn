import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHighlighter } from 'shiki';
import { loadSourceExamples, projectRoot } from './source-examples.mjs';

const hash = (value) => createHash('sha256').update(value).digest('hex');

async function atomicWrite(path, content) {
  try { if (await readFile(path, 'utf8') === content) return; } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const temporary = `${path}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, content);
    await rename(temporary, path);
  } finally {
    await rm(temporary, { force: true });
  }
}

export async function buildSourceExamples({ root = projectRoot, prune = true, log = console.log } = {}) {
  const { projects, snapshots, references } = await loadSourceExamples(root);
  const languages = [...new Set([...snapshots.values()].flatMap((snapshot) => snapshot.files.map((file) => file.language)))];
  const highlighter = await createHighlighter({ themes: ['github-light', 'github-dark'], langs: languages });
  const assets = new Map();
  const assetNames = new Map();
  try {
    for (const [key, snapshot] of snapshots) {
      const files = snapshot.files.map((file) => ({
        ...file,
        html: highlighter.codeToHtml(file.code, {
          lang: file.language,
          themes: { light: 'github-light', dark: 'github-dark' },
          transformers: [{ line(node, line) { node.properties['data-line'] = line; } }],
        }),
      }));
      const content = JSON.stringify({ ...snapshot, files }) + '\n';
      const name = `${snapshot.project}-${snapshot.snapshot}-${hash(content).slice(0, 16)}.json`;
      assets.set(name, content);
      assetNames.set(key, name);
    }
  } finally {
    highlighter.dispose();
  }
  const manifest = [...projects.values()].map((project) => ({
    id: project.id,
    title: project.title,
    defaultSnapshot: project.defaultSnapshot,
    snapshots: [...project.snapshots.keys()].map((id) => ({
      id, title: project.snapshotTitles.get(id), asset: assetNames.get(`${project.id}/${id}`),
    })),
  }));
  // Each trusted preview is generated from its own complete source snapshot.
  // Dev's existing source watcher rebuilds the source drawer and apps together.
  const previewRoot = join(root, 'public/examples/application-shell');
  for (const [id, directory] of [
    ['document', ''],
    ['race-broken', 'race/broken'],
    ['race-fixed', 'race/fixed'],
  ]) {
    const snapshot = snapshots.get(`kien-truc-application-shell/${id}`);
    if (!snapshot) continue;
    for (const file of snapshot.files) {
      const path = join(previewRoot, directory, file.path);
      await mkdir(dirname(path), { recursive: true });
      await atomicWrite(path, file.code + '\n');
    }
    if (id !== 'document') {
      await atomicWrite(join(previewRoot, directory, 'index.html'), `<!doctype html>
<html lang="vi"><meta charset="utf-8"><title>Mở shell</title>
<a href="./shell/index.html">Mở shell của ví dụ</a>
<script>location.replace('./shell/index.html' + location.search + location.hash);</script>
</html>\n`);
    }
  }
  // Keep previously shared local preview links working after separating examples.
  if (snapshots.has('kien-truc-application-shell/race-broken')) {
    await atomicWrite(join(previewRoot, 'race/index.html'), `<!doctype html>
<html lang="vi"><meta charset="utf-8"><title>Chọn ví dụ</title>
<a href="./broken/shell/index.html">Bản lỗi</a> · <a href="./fixed/shell/index.html">Đã xử lý</a>
<script>const mode = new URLSearchParams(location.search).get('mode') === 'broken' ? 'broken' : 'fixed'; location.replace('./' + mode + '/shell/index.html' + location.hash);</script>
</html>\n`);
  }

  const manifestJSON = JSON.stringify(manifest) + '\n';
  const revision = hash(manifestJSON);
  const output = join(root, 'public/source-examples');
  // Validate and render everything first. Publish immutable assets before the manifest,
  // then revision last so the dev viewer never observes a partially written snapshot.
  await mkdir(output, { recursive: true });
  for (const [name, content] of assets) await atomicWrite(join(output, name), content);
  await atomicWrite(join(output, 'manifest.json'), manifestJSON);
  await atomicWrite(join(output, 'revision.json'), JSON.stringify({ revision }) + '\n');
  if (prune) {
    const keep = new Set([...assets.keys(), 'manifest.json', 'revision.json']);
    for (const name of await readdir(output)) {
      if (name.endsWith('.json') && !keep.has(name)) await rm(join(output, name));
    }
  }
  const fileCount = [...snapshots.values()].reduce((count, snapshot) => count + snapshot.files.length, 0);
  log(`Source Explorer: ${projects.size} projects, ${snapshots.size} snapshots, ${fileCount} files, ${references} validated references.`);
  return { revision, projects: projects.size, snapshots: snapshots.size, files: fileCount, references };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildSourceExamples();
}
