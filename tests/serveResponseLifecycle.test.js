import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { createStaticFileServer } from '../tools/serve.mjs';

const listen = server => new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', () => resolve(server.address().port));
});
const close = server => new Promise(resolve => server.close(resolve));
const waitForClose = (stream, timeoutMs = 2000) => stream.closed ? Promise.resolve() : new Promise((resolve, reject) => {
  const timeout = setTimeout(() => {
    stream.off('close', onClose);
    reject(new Error('source stream did not close after response ended'));
  }, timeoutMs);
  const onClose = () => {
    clearTimeout(timeout);
    resolve();
  };
  stream.once('close', onClose);
});

function assertOwnedTemporaryDirectory(directory, temporaryRoot) {
  const resolved = path.resolve(directory);
  assert.equal(path.dirname(resolved), temporaryRoot, 'cleanup target stays directly under the intended temp root');
  assert.match(path.basename(resolved), /^wildkin-serve-/, 'cleanup target retains the owned fixture prefix');
  return resolved;
}

test('static server preserves complete bytes and closes the source stream when a response aborts', async t => {
  const temporaryRoot = path.resolve(os.tmpdir());
  const directory = assertOwnedTemporaryDirectory(fs.mkdtempSync(path.join(temporaryRoot, 'wildkin-serve-')), temporaryRoot);
  const payload = Buffer.alloc(8 * 1024 * 1024, 0x5a);
  const source = path.join(directory, 'payload.bin');
  fs.writeFileSync(source, payload);

  const streams = [];
  const server = createStaticFileServer({
    servedRoot: directory,
    createReadStream(filePath) {
      const stream = fs.createReadStream(filePath, { highWaterMark: 16 * 1024 });
      streams.push(stream);
      return stream;
    },
  });
  t.after(async () => {
    for (const stream of streams) if (!stream.destroyed) stream.destroy();
    server.closeAllConnections?.();
    if (server.listening) await close(server);
    const cleanupTarget = assertOwnedTemporaryDirectory(directory, temporaryRoot);
    fs.rmSync(cleanupTarget, { recursive: true, force: true });
  });
  const port = await listen(server);

  const complete = await new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port, path: '/payload.bin' }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    }).on('error', reject);
  });
  assert.deepEqual(complete, payload, 'ordinary response preserves the complete source bytes');
  await waitForClose(streams[0]);
  assert.equal(streams[0].closed, true, 'ordinary source stream closes');

  await new Promise((resolve, reject) => {
    const request = http.get({ host: '127.0.0.1', port, path: '/payload.bin' }, response => {
      response.once('data', () => response.destroy());
      response.once('close', resolve);
      response.once('error', error => error.code === 'ECONNRESET' ? resolve() : reject(error));
    });
    request.once('error', error => error.code === 'ECONNRESET' ? resolve() : reject(error));
  });
  await waitForClose(streams[1]);
  assert.equal(streams[1].closed, true, 'aborted response closes its source stream');
  assert.equal(streams[1].destroyed, true, 'aborted response destroys its source stream');

  const renamed = path.join(directory, 'payload-renamed.bin');
  fs.renameSync(source, renamed);
  fs.renameSync(renamed, source);
  await close(server);
});
