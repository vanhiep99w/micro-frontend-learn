import { resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { watch } from 'chokidar';
import { buildSourceExamples } from './build-source-examples.mjs';
import { projectRoot } from './source-examples.mjs';

/** Debounce bursts and serialize builds. Changes during a build cause another pass. */
export function createRebuildQueue(build, { delay = 150, onError = console.error } = {}) {
  let timer;
  let dirty = false;
  let running;
  let stopped = false;
  let lastError;
  function drain() {
    clearTimeout(timer);
    if (running) return running;
    running = (async () => {
      while (dirty && !stopped) {
        dirty = false;
        try {
          await build();
          lastError = undefined;
        } catch (error) {
          lastError = error;
          onError(error);
        }
      }
    })().finally(() => { running = undefined; });
    return running;
  }
  return {
    invalidate() {
      if (stopped) return;
      dirty = true;
      clearTimeout(timer);
      timer = setTimeout(drain, delay);
    },
    flush: drain,
    get lastError() { return lastError; },
    async close() {
      stopped = true;
      clearTimeout(timer);
      await running;
    },
  };
}

export async function startSourceWatcher({ root = projectRoot, delay, log = console.log, onError = console.error } = {}) {
  const registryDirectory = join(root, 'source-examples');
  const queue = createRebuildQueue(() => buildSourceExamples({ root, prune: false, log }), { delay, onError });
  const watcher = watch([join(root, 'content/docs'), registryDirectory], {
    ignoreInitial: true,
    awaitWriteFinish: { stabilityThreshold: 100, pollInterval: 20 },
  });
  watcher.on('all', (_event, path) => {
    if (path.endsWith('.mdx') || path.endsWith('.json')) queue.invalidate();
  });
  // A lost filesystem watcher must not silently leave dev serving stale source.
  let rejectReady;
  const ready = new Promise((accept, reject) => {
    rejectReady = reject;
    watcher.once('ready', accept);
  });
  watcher.on('error', (error) => { onError(error); rejectReady(error); });
  try {
    await ready;
    queue.invalidate();
    await queue.flush();
    if (queue.lastError) throw queue.lastError;
  } catch (error) {
    await watcher.close();
    await queue.close();
    throw error;
  }
  log('Source Explorer: watching MDX and registry changes.');
  return { async close() { await watcher.close(); await queue.close(); } };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const watcher = await startSourceWatcher();
  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, async () => {
    await watcher.close();
    process.exit(0);
  });
}
