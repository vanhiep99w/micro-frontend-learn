import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createHighlighter } from 'shiki';
import { loadSourceExamples, projectRoot } from './source-examples.mjs';

const { registry, snapshots, references } = await loadSourceExamples();
const languages = [...new Set([...snapshots.values()].flatMap((snapshot) => snapshot.files.map((file) => file.language)))];
const highlighter = await createHighlighter({ themes: ['github-light', 'github-dark'], langs: languages });
const assets = [];
try {
  for (const snapshot of snapshots.values()) {
    const files = snapshot.files.map((file) => ({
      ...file,
      html: highlighter.codeToHtml(file.code, {
        lang: file.language,
        themes: { light: 'github-light', dark: 'github-dark' },
        transformers: [{ line(node, line) { node.properties['data-line'] = line; } }],
      }),
    }));
    assets.push([`${snapshot.project}-document.json`, { ...snapshot, files }]);
  }
} finally {
  highlighter.dispose();
}

const manifest = registry.map((entry) => ({
  id: entry.id,
  title: entry.title,
  defaultSnapshot: 'document',
  snapshots: [{ id: 'document', title: 'Code trong bài', asset: `${entry.id}-document.json` }],
}));
// This directory is entirely generated. Validate/highlight everything before replacing it.
const output = join(projectRoot, 'public/source-examples');
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
for (const [name, data] of [...assets, ['manifest.json', manifest]]) {
  await writeFile(join(output, name), JSON.stringify(data) + '\n');
}
console.log(`Source Explorer: ${snapshots.size} projects, ${assets.reduce((n, [, asset]) => n + asset.files.length, 0)} files, ${references} validated references.`);
