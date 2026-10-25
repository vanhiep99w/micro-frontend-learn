import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { test } from 'node:test';
import { auditDocsKit, legacyCandidate } from '../scripts/docs-kit-audit.mjs';

test('all documentation fences are inventoried; no unconverted diagram; five descriptors validate', async () => {
  const result = await auditDocsKit();
  assert.equal(result.rows.filter(({ path }) => path.endsWith('.mdx')).length, 81);
  // The Module Federation landing page is now a short prose overview;
  // its detailed diagrams remain in the following lessons.
  assert.equal(result.totals.d2, 134);
  for (const lang of ['code-walkthrough', 'code-diff', 'terminal-session', 'protocol-exchange', 'span-waterfall']) {
    assert(result.totals[lang] > 0, `Missing authored example: ${lang}`);
  }
  assert.equal(result.reviewed.length, 5);
});

test('legacy detection does not treat actual code, HTML or D2 arrows as diagrams', () => {
  const code = (lang, value) => ({ type: 'code', lang, value });
  assert(legacyCandidate(code('text', 'A --> B')));
  assert(legacyCandidate(code('mermaid', 'graph TD; A-->B')));
  assert(legacyCandidate(code('text', '┌────┐')));
  assert(!legacyCandidate(code('ts', "it('raw → expected', () => {})")));
  assert(!legacyCandidate(code('html', '<!-- Actual HTML comment -->')));
  assert(!legacyCandidate(code('d2', 'client -> server: Request')));
});

test('reviewed D2 catalog SVG bytes remain pinned and contain no active/external content', async () => {
  for (const [file, digest] of [
    ['react.svg', 'd0e9dc0b633d07be392250c600a0e32133277c5f6e6a8fddaae4d4ea5839b32c'],
    ['vuejs.svg', '16c080853806a49cf4bfbc5349c605297d7da0b1e7444dad2778d639791aa518'],
  ]) {
    const svg = await readFile(new URL('../content/d2-icons/' + file, import.meta.url), 'utf8');
    assert.equal(createHash('sha256').update(svg).digest('hex'), digest);
    assert(!/<script|<foreignObject|\bon\w+\s*=|(?:href|src)\s*=|url\(/i.test(svg));
  }
});
