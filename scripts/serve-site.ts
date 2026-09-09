#!/usr/bin/env bun
import { resolve, sep } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const build = Bun.spawn(
  [process.execPath, 'scripts/build-site.ts', '--base', ''],
  { cwd: root, stdout: 'inherit', stderr: 'inherit' }
);
const exitCode = await build.exited;
if (exitCode !== 0) process.exit(exitCode);

const directory = resolve(root, 'site/dist');
const server = Bun.serve({
  hostname: '127.0.0.1',
  port: 4173,
  async fetch(request) {
    const url = new URL(request.url);
    let pathname: string;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return new Response('Bad Request', { status: 400 });
    }
    const path = resolve(directory, `.${pathname}`);
    if (path !== directory && !path.startsWith(directory + sep)) {
      return new Response('Not Found', { status: 404 });
    }
    const file = Bun.file(
      pathname.endsWith('/') ? resolve(path, 'index.html') : path
    );
    if (await file.exists()) {
      return new Response(file, {
        headers: { 'Cache-Control': 'no-store' },
      });
    }
    if (
      !pathname.endsWith('/') &&
      (await Bun.file(resolve(path, 'index.html')).exists())
    ) {
      url.pathname += '/';
      return Response.redirect(url.href, 302);
    }
    return new Response('Not Found', { status: 404 });
  },
});

console.log(`Site preview: ${server.url}`);
console.log('Stop with Ctrl+C. Restart after editing site files to rebuild.');
