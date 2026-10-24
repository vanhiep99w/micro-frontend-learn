import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

// Exercise the real collection: '# @flow' and '# scenarios:' inside D2 are not H1s.
test('structural checker distinguishes flow comments from article headings', () => {
  const page = readFileSync('content/docs/giao-tiep-va-trang-thai/authentication.mdx', 'utf8');
  assert.match(page, /^# @flow$/m);
  const result = spawnSync(process.execPath, ['scripts/check-docs.mjs'], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.match(result.stdout, /internal links\/anchors/);
});
