import assert from 'node:assert/strict';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkMdx from 'remark-mdx';
import { parseCodeWalkthroughDescriptor } from '@vanhiep99w/docs-kit/code-walkthrough';
import { parseCodeDiffDescriptor } from '@vanhiep99w/docs-kit/code-diff';
import { parseTerminalSession } from '@vanhiep99w/docs-kit/terminal-session';
import { parseProtocolExchangeDescriptor } from '@vanhiep99w/docs-kit/protocol-exchange';
import { parseSpanWaterfallDescriptor } from '@vanhiep99w/docs-kit/span-waterfall';

const root = new URL('../', import.meta.url);
const parsers = {
  'code-walkthrough': parseCodeWalkthroughDescriptor,
  'code-diff': parseCodeDiffDescriptor,
  'terminal-session': parseTerminalSession,
  'protocol-exchange': parseProtocolExchangeDescriptor,
  'span-waterfall': parseSpanWaterfallDescriptor,
};
// Reviewed text artifacts, keyed by first line rather than a fragile line number.
export const retainedArtifacts = new Map([
  ['content/docs/troubleshooting/index.mdx|Journey/route: mở sản phẩm từ catalog', 'Incident record template; arrows are placeholder text, not a diagram.'],
  ['content/docs/troubleshooting/remote-khong-tai.mdx|GET http://localhost:3001/remoteEntry.js          → 200 JavaScript', 'Illustrative Network/Console evidence; preserve request URLs, statuses and error.'],
  ['content/docs/troubleshooting/debug-checklist.mdx|Tab A:', 'Illustrative diagnostic record for two tabs; preserve release metadata and HTTP result.'],
  ['content/docs/kien-truc/runtime-composition.mdx|Catalog release catalog-r17', 'Literal artifact directory listing, not architecture.'],
  ['content/docs/cac-cach-tich-hop/import-maps.mdx|import-map-shop/', 'Literal file tree used by the implementation, not architecture.'],
]);

export function legacyCandidate(node) {
  if (node.type !== 'code' || node.lang === 'd2') return false;
  if (/mermaid/i.test(node.lang ?? '')) return true;
  // Box drawings in any fence; arrow-like characters only in untyped/text artifacts.
  return /[┌┐└┘┏┓┗┛╔╗╚╝├┤┬┴┼─│▼▲►◄]/u.test(node.value)
    || ((!node.lang || ['text', 'plaintext', 'ascii', 'diagram'].includes(node.lang))
      && /→|←|-->|<--|==>|\+[-=]{3,}\+|^\s*\|.*\|\s*$/m.test(node.value));
}

function nodes(tree) {
  return [tree, ...(tree.children ?? []).flatMap(nodes)];
}
async function walk(dir) {
  return (await Promise.all((await readdir(new URL(dir, root), { withFileTypes: true })).map(
    (entry) => entry.isDirectory() ? walk(dir + entry.name + '/') : [dir + entry.name],
  ))).flat();
}

export async function auditDocsKit() {
  const files = ['README.md', ...(await walk('content/')).filter((p) => /\.mdx?$/.test(p))].sort();
  const rows = [];
  const reviewed = new Set();
  let fences = 0;
  for (const path of files) {
    const source = await readFile(new URL(path, root), 'utf8');
    const processor = unified().use(remarkParse);
    if (path.endsWith('.mdx')) processor.use(remarkMdx);
    const tree = processor.parse(source);
    const counts = {};
    for (const node of nodes(tree)) {
      if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
        assert(!/mermaid/i.test(node.name ?? ''), `${path}: legacy Mermaid JSX`);
      }
      if (node.type === 'text') {
        assert(!/[┌┐└┘┏┓┗┛╔╗╚╝├┤┬┴┼─│▼▲►◄]/u.test(node.value), `${path}: unfenced diagram candidate`);
      }
      if (node.type !== 'code') continue;
      fences++;
      const lang = node.lang ?? 'untyped';
      counts[lang] = (counts[lang] ?? 0) + 1;
      if (/mermaid/i.test(lang)) throw new Error(`${path}:${node.position.start.line}: Mermaid fence`);
      if (legacyCandidate(node)) {
        const key = path + '|' + node.value.split('\n')[0];
        assert(retainedArtifacts.has(key), `${path}:${node.position.start.line}: unreviewed legacy diagram candidate`);
        reviewed.add(key);
      }
      if (parsers[lang]) {
        try { await parsers[lang](node.value); }
        catch (error) { throw new Error(`${path}:${node.position.start.line}: ${lang}: ${error.message}`, { cause: error }); }
      }
    }
    rows.push({ path, counts });
  }
  assert.deepEqual([...reviewed].sort(), [...retainedArtifacts.keys()].sort(), 'Stale retained-artifact classification');
  return { rows, fences, reviewed: [...reviewed], totals: rows.reduce((all, { counts }) => {
    for (const [key, value] of Object.entries(counts)) all[key] = (all[key] ?? 0) + value;
    return all;
  }, {}) };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = await auditDocsKit();
  const report = {
    docsKitVersion: JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8')).dependencies['@vanhiep99w/docs-kit'],
    scope: 'README.md and all Markdown/MDX under content/',
    remainingLegacyDiagrams: [],
    ...result,
    retainedArtifacts: Object.fromEntries(retainedArtifacts),
  };
  const json = JSON.stringify(report, null, 2) + '\n';
  const target = new URL('../docs-kit-inventory.json', import.meta.url);
  if (process.argv.includes('--write')) await writeFile(target, json);
  else if (process.argv.includes('--check')) assert.equal(await readFile(target, 'utf8'), json, 'Stale docs-kit-inventory.json; review, then run with --write');
  else console.log(json);
  if (process.argv.includes('--write') || process.argv.includes('--check')) {
    console.log(`OK: ${result.rows.length} documents, ${result.fences} fences, ${result.totals.d2} D2, 5 reviewed text artifacts; no remaining legacy diagram candidates.`);
  }
}
