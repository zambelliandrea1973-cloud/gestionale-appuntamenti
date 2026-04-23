#!/usr/bin/env tsx
/**
 * i18n-sync: confronta tutti i file locale JSON con la base canonica (it.json).
 *
 * Controlli eseguiti (tutti causano exit code != 0 se falliscono):
 *  (a) Disallineamento chiavi tra le 9 lingue (mancanti / extra)
 *  (b) Marker [TODO:LANG] residui in qualsiasi locale
 *  (c) Interpolazioni {{var}} non corrispondenti tra it.json e gli altri locale
 *
 * Uso:
 *   npm run i18n:sync          # solo report (exit 1 se ci sono issues)
 *   npm run i18n:sync -- --fix # auto-fix chiavi mancanti (NON corregge TODO né interpolazioni)
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
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v, key));
    } else {
      out[key] = v;
    }
  }
  return out;
}

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
  return val;
}

const TODO_RE = /\[TODO:[A-Z-]+\]/;
const INTERP_RE = /\{\{\s*([^}]+?)\s*\}\}/g;

/**
 * Estrae l'insieme di nomi di variabili {{var}} da una stringa o struttura.
 * Per array/oggetti, unisce ricorsivamente tutte le variabili trovate.
 */
function extractInterpolations(val: any): Set<string> {
  const out = new Set<string>();
  const walk = (v: any) => {
    if (typeof v === 'string') {
      let m: RegExpExecArray | null;
      const re = new RegExp(INTERP_RE.source, 'g');
      while ((m = re.exec(v)) !== null) out.add(m[1]);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (v && typeof v === 'object') {
      Object.values(v).forEach(walk);
    }
  };
  walk(val);
  return out;
}

/**
 * True se la stringa (o qualsiasi stringa nested in array/oggetto) contiene un marker [TODO:LANG].
 */
function hasTodoMarker(val: any): boolean {
  if (typeof val === 'string') return TODO_RE.test(val);
  if (Array.isArray(val)) return val.some(hasTodoMarker);
  if (val && typeof val === 'object') return Object.values(val).some(hasTodoMarker);
  return false;
}

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const x of a) if (!b.has(x)) return false;
  return true;
}

async function main() {
  const fix = process.argv.includes('--fix');
  const files = (await fs.readdir(LOCALES_DIR)).filter(f => f.endsWith('.json'));

  const basePath = path.join(LOCALES_DIR, `${BASE_LANG}.json`);
  const baseData = JSON.parse(await fs.readFile(basePath, 'utf-8'));
  const baseFlat = flatten(baseData);
  const baseKeys = new Set(Object.keys(baseFlat));

  console.log(`\n📚 Base: ${BASE_LANG}.json (${baseKeys.size} chiavi)\n`);

  // (b) Verifica TODO anche nella base
  let baseTodos = 0;
  for (const [k, v] of Object.entries(baseFlat)) {
    if (hasTodoMarker(v)) baseTodos++;
  }
  if (baseTodos > 0) {
    console.log(`⚠ ${BASE_LANG}: ${baseTodos} chiavi con marker [TODO:*] (la base non dovrebbe averne)`);
  }

  let issuesMissing = 0;
  let issuesExtra = 0;
  let issuesTodos = baseTodos;
  let issuesInterp = 0;

  for (const file of files) {
    const lang = file.replace('.json', '');
    if (lang === BASE_LANG) continue;

    const fullPath = path.join(LOCALES_DIR, file);
    const data = JSON.parse(await fs.readFile(fullPath, 'utf-8'));
    const flat = flatten(data);
    const keys = new Set(Object.keys(flat));

    // (a) Disallineamento chiavi
    const missing = [...baseKeys].filter(k => !keys.has(k));
    const extra = [...keys].filter(k => !baseKeys.has(k));

    // (b) Marker TODO residui
    const todoKeys: string[] = [];
    for (const [k, v] of Object.entries(flat)) {
      if (hasTodoMarker(v)) todoKeys.push(k);
    }

    // (c) Mismatch interpolazioni {{var}} per chiavi presenti in entrambi
    const interpMismatch: { key: string; base: string[]; got: string[] }[] = [];
    for (const k of keys) {
      if (!baseKeys.has(k)) continue;
      const baseVars = extractInterpolations(baseFlat[k]);
      const langVars = extractInterpolations(flat[k]);
      if (!setsEqual(baseVars, langVars)) {
        interpMismatch.push({
          key: k,
          base: [...baseVars].sort(),
          got: [...langVars].sort(),
        });
      }
    }

    if (
      missing.length === 0 &&
      extra.length === 0 &&
      todoKeys.length === 0 &&
      interpMismatch.length === 0
    ) {
      console.log(`✓ ${lang}: allineato (${keys.size} chiavi, no TODO, interpolazioni OK)`);
      continue;
    }

    issuesMissing += missing.length;
    issuesExtra += extra.length;
    issuesTodos += todoKeys.length;
    issuesInterp += interpMismatch.length;

    const parts: string[] = [];
    if (missing.length || extra.length) parts.push(`${missing.length} mancanti, ${extra.length} extra`);
    if (todoKeys.length) parts.push(`${todoKeys.length} TODO residui`);
    if (interpMismatch.length) parts.push(`${interpMismatch.length} interpolazioni divergenti`);
    console.log(`⚠ ${lang}: ${parts.join(' | ')}`);

    if (missing.length > 0 && missing.length <= 10) {
      missing.forEach(k => console.log(`    - mancante: ${k}`));
    } else if (missing.length > 10) {
      console.log(`    - prime 5 mancanti:`);
      missing.slice(0, 5).forEach(k => console.log(`        ${k}`));
    }

    if (todoKeys.length > 0) {
      const sample = todoKeys.slice(0, 5);
      sample.forEach(k => console.log(`    - TODO: ${k}`));
      if (todoKeys.length > sample.length) {
        console.log(`        … e altri ${todoKeys.length - sample.length}`);
      }
    }

    if (interpMismatch.length > 0) {
      const sample = interpMismatch.slice(0, 5);
      sample.forEach(m => {
        console.log(`    - interp: ${m.key} → atteso {${m.base.join(',')}} trovato {${m.got.join(',')}}`);
      });
      if (interpMismatch.length > sample.length) {
        console.log(`        … e altri ${interpMismatch.length - sample.length}`);
      }
    }

    if (fix && missing.length > 0) {
      for (const k of missing) {
        setAt(data, k, makeTodo(baseFlat[k], lang));
      }
      await fs.writeFile(fullPath, JSON.stringify(data, null, 2) + '\n');
      console.log(`    ✎ aggiunte ${missing.length} chiavi con marker [TODO:${lang.toUpperCase()}]`);
    }
  }

  const total = issuesMissing + issuesExtra + issuesTodos + issuesInterp;
  console.log(
    `\nRiepilogo: mancanti=${issuesMissing} | extra=${issuesExtra} | TODO=${issuesTodos} | interpolazioni=${issuesInterp}`,
  );
  if (total === 0) {
    console.log(`✓ Tutte le lingue allineate, nessun TODO, interpolazioni coerenti\n`);
  } else {
    console.log(
      `⚠ Totale issues: ${total}${fix ? ' (solo chiavi mancanti corrette; extra/TODO/interpolazioni vanno risolti a mano)' : ' — usa --fix per correggere le chiavi mancanti'}\n`,
    );
  }

  // Exit non-zero se ci sono issues residue.
  // --fix corregge solo le chiavi MANCANTI: extra, TODO e interpolazioni
  // restano problemi bloccanti anche in modalità fix.
  const residual = (fix ? 0 : issuesMissing) + issuesExtra + issuesTodos + issuesInterp;
  if (residual > 0) process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
