import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import http from 'node:http';
import { once } from 'node:events';

const cms = createRequire(new URL('../apps/cms/package.json', import.meta.url));
const strapi = createRequire(cms.resolve('@strapi/strapi'));
const core = createRequire(strapi.resolve('@strapi/core'));
const Koa = core('koa');

// Strapi's CLI loads the CommonJS watch entrypoint.
for (const format of ['js']) {
  test(`Strapi webpack ${format} watch serves Koa requests and closes cleanly`, { timeout: 30000 }, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'mz-strapi-watch-'));
    const app = new Koa();
    let watcher;
    let server;
    try {
      await mkdir(join(dir, 'src/admin'), { recursive: true });
      await writeFile(join(dir, 'entry.js'), 'module.exports = "strapi adapter fixture";');
      await writeFile(join(dir, 'index.html'), '<html><body>admin fallback fixture</body></html>');
      // Exercise Strapi's public webpack config hook and actual watch adapter,
      // without starting a database or loading this site's CMS environment.
      await writeFile(join(dir, 'src/admin/webpack.config.js'), `
        module.exports = () => ({
          mode: 'development', devtool: false, stats: 'errors-only',
          entry: ${JSON.stringify(join(dir, 'entry.js'))},
          output: { path: ${JSON.stringify(join(dir, 'out'))}, filename: 'bundle.js', publicPath: '/admin/' },
          infrastructureLogging: { level: 'none' },
          plugins: [{ apply(compiler) {
            compiler.hooks.thisCompilation.tap('Fixture', compilation => {
              compilation.hooks.processAssets.tap({name:'Fixture', stage:compiler.webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL}, () => {
                compilation.emitAsset('index.html', new compiler.webpack.sources.RawSource('<html><body>admin fallback fixture</body></html>'));
              });
            });
          }}]
        });
      `);
      const watchPath = join(dirname(strapi.resolve('@strapi/strapi')), 'src/node/webpack', `watch.${format}`);
      const { watch } = await import(pathToFileURL(watchPath));
      watcher = await watch({
        cwd: dir, appDir: dir, runtimeDir: dir, entry: 'entry.js', distPath: join(dir, 'out'),
        target: ['chrome 120'], env: {}, options: {}, basePath: '/admin', adminPath: '/admin',
        logger: { debug() {}, warn() {} },
        strapi: { server: { app, routes(routes) {
          for (const route of routes) app.use((ctx, next) =>
            ctx.path.startsWith('/admin/') ? route.handler(ctx, next) : next());
        } } },
      });
      server = app.listen(0, '127.0.0.1');
      await once(server, 'listening');
      const request = (path, options = {}) => new Promise((resolve, reject) => {
        const req = http.request({ host: '127.0.0.1', port: server.address().port, path, ...options }, res => {
          const chunks = [];
          res.on('data', chunk => chunks.push(chunk));
          res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString() }));
        });
        req.setTimeout(5000, () => req.destroy(new Error('Adapter request timed out')));
        req.on('error', reject);
        req.end();
      });
      const get = await request('/admin/bundle.js');
      assert.equal(get.status, 200);
      assert.match(get.body, /strapi adapter fixture/);
      assert.match(get.headers['content-type'], /javascript/);
      const head = await request('/admin/bundle.js', { method: 'HEAD' });
      assert.equal(head.status, 200);
      assert.equal(head.body, '');
      assert.equal(head.headers['content-length'], get.headers['content-length']);
      const range = await request('/admin/bundle.js', { headers: { range: 'bytes=0-9' } });
      assert.equal(range.status, 206);
      assert.equal(range.body, get.body.slice(0, 10));
      const missing = await request('/outside/missing');
      assert.equal(missing.status, 404);
      const fallback = await request('/admin/content-manager');
      assert.equal(fallback.status, 200);
      assert.match(fallback.body, /admin fallback fixture/);
      const traversal = await request('/admin/..%2fentry.js');
      assert.equal(traversal.status, 403);
      assert.ok(!traversal.body.includes('strapi adapter fixture'));
    } finally {
      if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
      if (watcher) await watcher.close();
      await rm(dir, { recursive: true, force: true });
    }
  });
}
