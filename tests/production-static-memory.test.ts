import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

async function probe(development: boolean) {
  const directory = mkdtempSync(path.join(tmpdir(), 'calendar-static-memory-'));
  try {
    mkdirSync(path.join(directory, 'server/public'), { recursive: true });
    mkdirSync(path.join(directory, 'client'));
    writeFileSync(path.join(directory, 'server/public/index.html'), '<html>production</html>');
    writeFileSync(path.join(directory, 'client/index.html'), '<script src="/src/main.tsx"></script>');
    symlinkSync(path.resolve('node_modules'), path.join(directory, 'node_modules'), 'dir');
    const output = path.join(directory, 'server/helper.mjs');
    await build({
      entryPoints: ['server/vite.ts'], outfile: output, platform: 'node',
      bundle: true, format: 'esm', packages: 'external', logLevel: 'silent',
      plugins: [{
        name: 'development-dependency-probes',
        setup(builder) {
          builder.onResolve({ filter: /^vite$|^\.\.\/vite\.config$/ }, args => ({ path: args.path, namespace: 'dev-only' }));
          builder.onLoad({ filter: /.*/, namespace: 'dev-only' }, args => ({
            contents: args.path === 'vite' ? `
              ${development ? '' : 'throw new Error("Production loaded the Vite development compiler");'}
              globalThis.compilerLoads = (globalThis.compilerLoads || 0) + 1;
              export function createLogger() { return { error() {} }; }
              export async function createServer(options) {
                globalThis.viteOptions = options;
                return {
                  middlewares() {},
                  async transformIndexHtml(url, html) { return html + '<!-- transformed -->'; },
                  ssrFixStacktrace() {},
                };
              }
            ` : `
              ${development ? '' : 'throw new Error("Production loaded development plugins");'}
              globalThis.configLoads = (globalThis.configLoads || 0) + 1;
              export default { fixture: 'development-config' };
            `,
            loader: 'js',
          }));
        },
      }],
    });
    const program = `
      import assert from 'node:assert/strict';
      const helper = await import(${JSON.stringify(pathToFileURL(output).href)});
      assert.equal(globalThis.compilerLoads, undefined);
      assert.equal(globalThis.configLoads, undefined);
      const handlers = [];
      const app = { use(...args) { handlers.push(args); } };
      ${development ? `
        const server = { fixture: 'hmr-server' };
        await helper.setupVite(app, server);
        assert.equal(globalThis.compilerLoads, 1);
        assert.equal(globalThis.configLoads, 1);
        assert.equal(globalThis.viteOptions.server.allowedHosts, true);
        assert.equal(globalThis.viteOptions.server.hmr.server, server);
        assert.equal(globalThis.viteOptions.fixture, 'development-config');
        let html;
        await handlers[1][1]({ originalUrl: '/' }, {
          status(value) { assert.equal(value, 200); return this; },
          set() { return this; }, end(value) { html = value; },
        }, error => { throw error; });
        assert.match(html, /main.tsx\\?v=/);
        assert.match(html, /transformed/);
      ` : `
        helper.serveStatic(app);
        assert.equal(handlers.length, 2);
        let file;
        handlers[1][1]({}, { sendFile(value) { file = value; } });
        assert.equal(file, ${JSON.stringify(path.join(directory, 'server/public/index.html'))});
        assert.equal(globalThis.compilerLoads, undefined);
        assert.equal(globalThis.configLoads, undefined);
      `}
      console.log('PASS');
    `;
    const child = spawnSync(process.execPath, ['--input-type=module', '-e', program], {
      encoding: 'utf8', timeout: 15000,
      env: { ...process.env, NODE_ENV: development ? 'development' : 'production' },
    });
    assert.equal(child.status, 0, child.stderr || String(child.error));
    assert.match(child.stdout, /PASS/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

test('production static serving does not initialize the development compiler or plugins', () => probe(false));
test('development still loads Vite on demand and serves transformed HTML with HMR', () => probe(true));
