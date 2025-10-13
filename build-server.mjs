import { build } from 'esbuild';

build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  format: 'esm',
  platform: 'node',
  outdir: 'dist',
  alias: {
    '@shared': './shared'
  },
  external: [
    'express',
    'drizzle-orm',
    'postgres',
    '@neondatabase/serverless'
  ]
}).catch(() => process.exit(1));
