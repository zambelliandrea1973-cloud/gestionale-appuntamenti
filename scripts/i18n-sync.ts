#!/usr/bin/env tsx
/**
 * i18n-sync: confronta tutti i file locale JSON con la base canonica (it.json).
 * - Riporta chiavi mancanti / extra in ogni lingua
 * - Con --fix aggiunge automaticamente le chiavi mancanti con valore "[TODO:LANG] testo originale"
 *
 * Uso:
 *   npm run i18n:sync          # solo report
 *   npm run i18n:sync -- --fix # auto-fix chiavi mancanti
 */
import { promises as fs } from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(process.cwd(), 'client/src/locales');
const BASE_LANG = 'it';

type Json = Record<string, any>;

function flatten(obj: Json, prefix = ''): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = String(v);
    }
  }
  return out;
}

function unflatten(flat: Record<string, string>): Json {
  const out: Json = {};
  for (const [key, val] of Object.entries(flat)) {
    const parts = key.split('.');
    let cur = out;
    for (let i = 0; i < parts.length - 1; i++) {
      if (typeof cur[parts[i]] !== 'object' || cur[parts[i]] === null) {
        cur[parts[i]] = {};
      }
      cur = cur[parts[i]];
    }
    cur[parts[parts.length - 1]] = val;
  }
  return out;
}

async function main() {
  const fix = process.argv.includes('--fix');
  const files = (await fs.readdir(LOCALES_DIR)).filter(f => f.endsWith('.json'));

  const basePath = path.join(LOCALES_DIR, `${BASE_LANG}.json`);
  const baseFlat = flatten(JSON.parse(await fs.readFile(basePath, 'utf-8')));
  const baseKeys = new Set(Object.keys(baseFlat));

  console.log(`\n📚 Base: ${BASE_LANG}.json (${baseKeys.size} chiavi)\n`);

  let totalIssues = 0;

  for (const file of files) {
    const lang = file.replace('.json', '');
    if (lang === BASE_LANG) continue;

    const fullPath = path.join(LOCALES_DIR, file);
    const data = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
    const flat = flatten(data);
    const keys = new Set(Object.keys(flat));

    const missing = [...baseKeys].filter(k => !keys.has(k));
    const extra = [...keys].filter(k => !baseKeys.has(k));

    if (missing.length === 0 && extra.length === 0) {
      console.log(`✓ ${lang}: allineato (${keys.size} chiavi)`);
      continue;
    }

    totalIssues += missing.length + extra.length;
    console.log(`⚠ ${lang}: ${missing.length} mancanti, ${extra.length} extra`);

    if (missing.length > 0 && missing.length <= 10) {
      missing.forEach(k => console.log(`    - mancante: ${k}`));
    } else if (missing.length > 10) {
      console.log(`    - prime 5 mancanti:`);
      missing.slice(0, 5).forEach(k => console.log(`        ${k}`));
    }

    if (fix && missing.length > 0) {
      for (const k of missing) {
        flat[k] = `[TODO:${lang.toUpperCase()}] ${baseFlat[k]}`;
      }
      const merged = unflatten(flat);
      await fs.writeFile(fullPath, JSON.stringify(merged, null, 2) + '\n');
      console.log(`    ✎ aggiunte ${missing.length} chiavi con marker [TODO:${lang.toUpperCase()}]`);
    }
  }

  console.log(`\n${totalIssues === 0 ? '✓ Tutte le lingue allineate' : `⚠ Totale issues: ${totalIssues}${fix ? ' (corrette)' : ' — usa --fix per correggere'}`}\n`);

  if (!fix && totalIssues > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
