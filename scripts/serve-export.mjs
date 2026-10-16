import { createServer } from 'node:http';
import { stat, readFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { projectRoot } from './source-examples.mjs';

const root = resolve(projectRoot, 'out');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1] ?? 3210);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid --port');
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.woff': 'font/woff',
};
async function isFile(path) {
  try { return (await stat(path)).isFile(); } catch { return false; }
}
if (!await isFile(resolve(root, 'index.html'))) throw new Error('Missing out/: run npm run build first.');
const server = createServer(async (request, response) => {
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      response.writeHead(405, { Allow: 'GET, HEAD' }); response.end(); return;
    }
    const path = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    const local = resolve(root, '.' + path);
    if (local !== root && !local.startsWith(root + sep)) {
      response.writeHead(403); response.end(); return;
    }
    // Next export may have BOTH foo.html and foo/ containing RSC segments.
    let file;
    for (const candidate of [local, local + '.html', resolve(local, 'index.html')]) {
      if (await isFile(candidate)) { file = candidate; break; }
    }
    const status = file ? 200 : 404;
    file ??= resolve(root, '404.html');
    const body = await readFile(file);
    response.writeHead(status, {
      'Content-Type': types[extname(file)] ?? 'application/octet-stream',
      'Content-Length': body.length, 'Cache-Control': 'no-store',
    });
    response.end(request.method === 'HEAD' ? undefined : body);
  } catch {
    response.writeHead(400); response.end('Bad request');
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Static docs: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.closeAllConnections();
  server.close(() => process.exit(0));
});
