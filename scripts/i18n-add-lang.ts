#!/usr/bin/env tsx
/**
 * i18n-add-lang: scaffolda un nuovo file di lingua copiando da una base esistente
 * e marcando tutti i valori con [TODO] per traduzione successiva.
 *
 * Uso:
 *   tsx scripts/i18n-add-lang.ts pt-BR es      # nuovo Portoghese basato su Spagnolo
 *   tsx scripts/i18n-add-lang.ts hi en         # nuovo Hindi basato su Inglese
 *
 * Ricorda di aggiornare client/src/lib/i18n.ts dopo aver creato il file.
 */
import { promises as fs } from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(process.cwd(), 'client/src/locales');

async function main() {
  const [, , newLang, baseLang] = process.argv;
  if (!newLang || !baseLang) {
    console.error('Uso: tsx scripts/i18n-add-lang.ts <newLang> <baseLang>');
    console.error('Esempio: tsx scripts/i18n-add-lang.ts pt-BR es');
    process.exit(1);
  }

  const basePath = path.join(LOCALES_DIR, `${baseLang}.json`);
  const newPath = path.join(LOCALES_DIR, `${newLang}.json`);

  try {
    await fs.access(newPath);
    console.error(`✖ ${newLang}.json esiste già. Eliminalo prima se vuoi rigenerarlo.`);
    process.exit(1);
  } catch {}

  const baseRaw = await fs.readFile(basePath, 'utf-8');
  const baseData = JSON.parse(baseRaw);

  const marker = `[TODO:${newLang.toUpperCase()}]`;
  const transform = (v: any): any => {
    if (typeof v === 'string') return `${marker} ${v}`;
    if (Array.isArray(v)) return v.map(transform);
    if (v && typeof v === 'object') {
      const out: Record<string, any> = {};
      for (const [k, val] of Object.entries(v)) out[k] = transform(val);
      return out;
    }
    return v;
  };

  const newData = transform(baseData);
  await fs.writeFile(newPath, JSON.stringify(newData, null, 2) + '\n');

  console.log(`\n✓ Creato ${newLang}.json basato su ${baseLang}.json`);
  console.log(`  Tutte le stringhe sono marcate con ${marker}`);
  console.log(`\nProssimi step:`);
  console.log(`  1. Apri client/src/lib/i18n.ts e aggiungi import + resource per "${newLang}"`);
  console.log(`  2. Aggiungi "${newLang}" nell'array supportedLngs`);
  console.log(`  3. Traduci le stringhe (rimuovi i marker ${marker})`);
  console.log(`  4. Aggiungi la lingua nel selettore UI (LanguageSelector)\n`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
