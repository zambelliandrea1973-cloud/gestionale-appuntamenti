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

/**
 * Flatten OGGETTI (non Array) per ottenere le chiavi foglia.
 * Arrays e valori primitivi sono trattati come "foglie" (path unico).
 * Restituisce mappa: path → valore originale (preservando tipo).
 */
function flatten(obj: Json, prefix = ''): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    // Solo oggetti plain (non array, non null) vengono espansi
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      // Stringhe, numeri, booleani, array, null → foglie
      out[key] = v;
    }
  }
  return out;
}

/**
 * Imposta un valore in un path nested, creando oggetti intermedi se necessario.
 * Preserva il tipo del valore (array, oggetto, primitivo).
 */
function setAt(obj: Json, pathStr: string, val: any): void {
  const parts = pathStr.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object' || Array.isArray(cur[parts[i]])) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = val;
}

/**
 * Crea il valore "[TODO]" preservando il tipo originale:
 * - Stringa → "[TODO:LANG] testo originale"
 * - Array di stringhe → array di "[TODO:LANG] elem"
 * - Array di oggetti / oggetti → struttura clonata (non modificata; va tradotta a mano)
 */
function makeTodo(val: any, lang: string): any {
  if (typeof val === 'string') {
    return `[TODO:${lang.toUpperCase()}] ${val}`;
  }
  if (Array.isArray(val)) {
    return val.map(item => makeTodo(item, lang));
  }
  if (val && typeof val === 'object') {
    const copy: Json = {};
    for (const [k, v] of Object.entries(val)) copy[k] = makeTodo(v, lang);
    return copy;
  }
  return val; // numeri, booleani, null restano invariati
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
      // Modifica direttamente data preservando arrays/oggetti esistenti.
      for (const k of missing) {
        setAt(data, k, makeTodo(baseFlat[k], lang));
      }
      await fs.writeFile(fullPath, JSON.stringify(data, null, 2) + '\n');
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
