import * as fs from 'fs';
import * as path from 'path';

type Lang = 'it' | 'en' | 'es' | 'fr' | 'de' | 'nl' | 'no' | 'ro' | 'ru';
const LANGS: Lang[] = ['it', 'en', 'es', 'fr', 'de', 'nl', 'no', 'ro', 'ru'];

const KEY = 'onboarding.sampleBadge';
const VALUES: Record<Lang, string> = {
  it: 'Esempio',
  en: 'Sample',
  es: 'Ejemplo',
  fr: 'Exemple',
  de: 'Beispiel',
  nl: 'Voorbeeld',
  no: 'Eksempel',
  ro: 'Exemplu',
  ru: 'Пример',
};

function setNested(obj: any, dotted: string, value: string) {
  const parts = dotted.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const k = parts[i];
    if (typeof cur[k] !== 'object' || cur[k] === null) cur[k] = {};
    cur = cur[k];
  }
  cur[parts[parts.length - 1]] = value;
}

function main() {
  const localesDir = path.join(process.cwd(), 'client', 'src', 'locales');
  for (const lang of LANGS) {
    const file = path.join(localesDir, `${lang}.json`);
    const json = JSON.parse(fs.readFileSync(file, 'utf-8'));
    setNested(json, KEY, VALUES[lang]);
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf-8');
    console.log(`✅ ${lang}: chiave ${KEY} aggiunta`);
  }
}

main();
