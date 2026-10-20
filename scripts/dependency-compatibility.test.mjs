import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import http from 'node:http';
import net from 'node:net';
import { once } from 'node:events';

const cms = createRequire(new URL('../apps/cms/package.json', import.meta.url));
const strapi = createRequire(cms.resolve('@strapi/strapi'));
const email = createRequire(strapi.resolve('@strapi/email/strapi-server'));
const providerPath = email.resolve('@strapi/provider-email-sendmail');
const providerRequire = createRequire(providerPath);
const results = {};
after(async () => {
  if (process.env.DEPENDENCY_PROBE_OUTPUT) {
    await writeFile(process.env.DEPENDENCY_PROBE_OUTPUT, JSON.stringify(results, null, 2));
  }
});

// This server never relays mail. It records synthetic fixtures over loopback.
test('Strapi sendmail provider preserves SMTP delivery and empty-recipient rejection', { timeout: 10000 }, async () => {
  const deliveries = [];
  const sockets = new Set();
  const server = net.createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.setEncoding('utf8');
    socket.write('220 local.test ESMTP\r\n');
    let buffer = '';
    let data = false;
    let envelope = [];
    let message = [];
    socket.on('data', chunk => {
      buffer += chunk;
      let end;
      while ((end = buffer.indexOf('\r\n')) >= 0) {
        const line = buffer.slice(0, end);
        buffer = buffer.slice(end + 2);
        if (data) {
          if (line === '.') {
            deliveries.push({ envelope, message: message.join('\r\n') });
            data = false;
            socket.write('250 accepted\r\n');
          } else message.push(line);
        } else if (/^(EHLO|HELO)/.test(line)) socket.write('250 local.test\r\n');
        else if (/^(MAIL FROM|RCPT TO)/.test(line)) {
          envelope.push(line);
          socket.write('250 OK\r\n');
        } else if (line === 'DATA') {
          data = true;
          socket.write('354 End with dot\r\n');
        } else if (line === 'QUIT') socket.end('221 Bye\r\n');
        else socket.write('250 OK\r\n');
      }
    });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const provider = providerRequire(providerPath).init({ devHost: '127.0.0.1', devPort: server.address().port }, {
      defaultFrom: 'sender@example.test', defaultReplyTo: 'reply@example.test',
    });
    await provider.send({ to: 'recipient@example.test', subject: 'Compatibility fixture', text: 'Saved text',
      html: null, cc: undefined, date: new Date('2026-01-01T00:00:00Z'), messageId: '<fixture@example.test>' });
    assert.equal(deliveries.length, 1);
    assert.deepEqual(deliveries[0].envelope, ['MAIL FROM:<sender@example.test>', 'RCPT TO:<recipient@example.test>']);
    assert.match(deliveries[0].message, /Saved text/);
    assert.match(deliveries[0].message, /Reply-To: reply@example.test/);
    for (const to of [undefined, null, '']) {
      await assert.rejects(provider.send({ to, text: 'No delivery' }), /No recipients defined/);
    }
    assert.equal(deliveries.length, 1, 'invalid recipients must not cause a delivery');
    results.smtp = deliveries;
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => server.close(resolve));
  }
});

test('webpack middleware serves assets, HEAD and ranges and rejects traversal', { timeout: 20000 }, async () => {
  const dir = await mkdtemp(join(tmpdir(), 'mz-middleware-'));
  const webpack = strapi('webpack');
  const middleware = strapi('webpack-dev-middleware');
  await writeFile(join(dir, 'entry.js'), 'module.exports = "visible fixture";');
  const compiler = webpack({ mode: 'development', devtool: false, entry: join(dir, 'entry.js'),
    output: { path: join(dir, 'out'), filename: 'bundle.js', publicPath: '/assets' },
    infrastructureLogging: { level: 'none' } });
  const handle = middleware(compiler, { stats: false });
  let server;
  try {
    await new Promise(resolve => handle.waitUntilValid(resolve));
    handle.context.outputFileSystem.writeFileSync(join(dir, 'secret.txt'), 'OUTSIDE_OUTPUT_FIXTURE');
    server = http.createServer((req, res) => handle(req, res, () => { res.statusCode = 404; res.end('not found'); }));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const request = (path, options = {}) => new Promise((resolve, reject) => {
      const req = http.request({ host: '127.0.0.1', port: server.address().port, path, ...options }, res => {
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve({ status: res.statusCode, type: res.headers['content-type'],
          range: res.headers['content-range'], body: Buffer.concat(chunks).toString() }));
      });
      req.setTimeout(5000, () => req.destroy(new Error('Middleware request timed out')));
      req.on('error', reject); req.end();
    });
    const get = await request('/assets/bundle.js');
    const head = await request('/assets/bundle.js', { method: 'HEAD' });
    const range = await request('/assets/bundle.js', { headers: { range: 'bytes=0-9' } });
    const missing = await request('/assets/missing.js');
    const traversal = await request('/assets../secret.txt');
    results.middleware = { get, head, range, missing, traversal };
    assert.equal(get.status, 200); assert.match(get.body, /visible fixture/);
    assert.equal(head.status, 200); assert.equal(head.body, '');
    assert.equal(range.status, 206); assert.equal(range.body, get.body.slice(0, 10));
    assert.equal(missing.status, 404);
    assert.equal(traversal.status, 403);
    assert.ok(!traversal.body.includes('OUTSIDE_OUTPUT_FIXTURE'));
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    await new Promise(resolve => handle.close(resolve));
    await new Promise(resolve => compiler.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
