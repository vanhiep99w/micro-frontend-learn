import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rename, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildSourceExamples } from '../scripts/build-source-examples.mjs';
import { createRebuildQueue, startSourceWatcher } from '../scripts/watch-source-examples.mjs';

const pause = (ms) => new Promise((done) => setTimeout(done, ms));
async function until(check) {
  const timeout = Date.now() + 15_000;
  while (!await check()) {
    if (Date.now() > timeout) throw new Error('Timed out waiting for source rebuild');
    await pause(50);
  }
}

test('queue serializes changes during a build and recovers after a failed build', async () => {
  let calls = 0;
  let release;
  const gate = new Promise((done) => { release = done; });
  const errors = [];
  const queue = createRebuildQueue(async () => {
    calls++;
    if (calls === 1) { await gate; throw new Error('temporary failure'); }
  }, { delay: 500, onError: (error) => errors.push(error) });
  try {
    queue.invalidate();
    const work = queue.flush();
    queue.invalidate(); queue.invalidate();
    release(); await work;
    assert.equal(calls, 2);
    assert.equal(errors.length, 1);
    assert.equal(queue.lastError, undefined);
  } finally { await queue.close(); }
});

test('real watcher handles edits, atomic saves, registry updates and invalid input without losing good assets', async () => {
  const root = await mkdtemp(join(tmpdir(), 'micro-source-watch-'));
  let watcher;
  const doc = join(root, 'content/docs/demo.mdx');
  const registryPath = join(root, 'source-examples/registry.json');
  const output = join(root, 'public/source-examples');
  const registry = [{ id: 'demo', title: 'Demo', doc: 'demo.mdx', defaultFile: 'src/main.ts' }];
  const code = (value) => '```ts sourceFile="src/main.ts" sourceRegion="entry"\n' + value + '\n```\n\n<SourceRef project="demo" file="src/main.ts" region="entry" />';
  const json = async (name) => JSON.parse(await readFile(join(output, name), 'utf8'));
  const source = async () => {
    const manifest = await json('manifest.json');
    return json(manifest[0].snapshots[0].asset);
  };
  const errors = [];
  try {
    await mkdir(join(root, 'content/docs'), { recursive: true });
    await mkdir(join(root, 'source-examples'), { recursive: true });
    await writeFile(doc, code('const html = "<script>&</script>";'));
    await writeFile(registryPath, JSON.stringify(registry));
    watcher = await startSourceWatcher({ root, log: () => {}, onError: (error) => errors.push(error) });
    const initialManifest = await json('manifest.json');
    const initialRevision = await json('revision.json');
    const file = (await source()).files[0];
    assert.equal(file.code, 'const html = "<script>&</script>";');
    assert(!file.html.includes('<script>'));
    assert(file.html.includes('data-line="1"'));
    assert(file.html.includes('--shiki-dark'));
    // Repeated builds are deterministic, and dev does not prune assets used by old readers.
    await buildSourceExamples({ root, prune: false, log: () => {} });
    assert.deepEqual(await json('revision.json'), initialRevision);
    await writeFile(doc + '.tmp', code('console.log("saved atomically");'));
    await rename(doc + '.tmp', doc);
    await until(async () => (await source()).files[0].code.includes('saved atomically'));
    assert.notDeepEqual(await json('revision.json'), initialRevision);
    await access(join(output, initialManifest[0].snapshots[0].asset));
    // A broken intermediate save reports an error, but leaves the last valid manifest intact.
    const validRevision = await json('revision.json');
    await writeFile(doc, code('a').replace('region="entry"', 'region="missing"'));
    await until(() => errors.length > 0);
    assert.deepEqual(await json('revision.json'), validRevision);
    await writeFile(doc, code('console.log("recovered");'));
    await until(async () => (await source()).files[0].code.includes('recovered'));
    registry[0].title = 'Updated title';
    await writeFile(registryPath, JSON.stringify(registry));
    await until(async () => (await json('manifest.json'))[0].title === 'Updated title');
    await watcher.close(); watcher = undefined;
    await buildSourceExamples({ root, log: () => {} });
    await assert.rejects(access(join(output, initialManifest[0].snapshots[0].asset)));
  } finally {
    await watcher?.close();
    await rm(root, { recursive: true, force: true });
  }
});
