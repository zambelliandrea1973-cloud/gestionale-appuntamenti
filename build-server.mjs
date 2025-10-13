import { build } from 'esbuild';
import { TsconfigPathsPlugin } from '@esbuild-plugins/tsconfig-paths';

build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outdir: 'dist',
  plugins: [TsconfigPathsPlugin({})],
  external: [
    'express',
    'drizzle-orm',
    'postgres',
    '@neondatabase/serverless',
    'pg'
  ]
}).catch(() => process.exit(1));
