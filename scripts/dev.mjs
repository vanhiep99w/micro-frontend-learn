import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { startSourceWatcher } from './watch-source-examples.mjs';

const watcher = await startSourceWatcher();
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(2)], {
  stdio: 'inherit',
});
let signalCode;
for (const [signal, code] of [['SIGINT', 130], ['SIGTERM', 143]]) {
  process.once(signal, () => {
    signalCode = code;
    child.kill(signal);
    const timeout = setTimeout(() => child.kill('SIGKILL'), 5000);
    timeout.unref();
  });
}
child.once('error', async (error) => {
  console.error(error);
  await watcher.close();
  process.exit(1);
});
child.once('exit', async (code) => {
  await watcher.close();
  process.exit(signalCode ?? code ?? 1);
});
