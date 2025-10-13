import { build } from 'esbuild';
import { TsconfigPathsPlugin } from '@esbuild-plugins/tsconfig-paths';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outdir: 'dist',
  plugins: [TsconfigPathsPlugin({
    tsconfig: resolve(__dirname, 'tsconfig.json')
  })],
  external: [
    'express',
    'drizzle-orm',
    'postgres',
    '@neondatabase/serverless',
    'pg'
  ]
}).catch(() => process.exit(1));
