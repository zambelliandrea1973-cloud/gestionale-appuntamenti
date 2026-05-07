#!/usr/bin/env tsx
/**
 * i18n-placeholder-check: detects keys in de/es/fr/nl/no/ro/ru whose value is
 * identical to en.json — a signal that an English placeholder was left in place
 * instead of a real translation.
 *
 * Usage:
 *   npm run i18n:placeholder-check           # CI mode — exits 1 if regressions found
 *   npm run i18n:placeholder-check -- --update  # regenerate the exceptions baseline
 *
 * How it works:
 *  1. Auto-exempt values that are truly universal regardless of language:
 *       - Empty strings
 *       - URLs and email addresses
 *       - Phone numbers (starting with +)
 *       - Strings containing {{ interpolation }} variables
 *       - Strings containing emoji characters
 *       - Copyright lines (starting with ©)
 *       - Strings consisting entirely of uppercase letters, digits, and common
 *         punctuation — these are codes/acronyms (SMS, IBAN, BIC, PDF…)
 *
 *  2. Everything else that is currently identical to en.json is tracked in the
 *     exceptions baseline as "lang:dotted.key" pairs
 *     (.local/i18n-placeholder-exceptions.json).
 *     A new key that matches English but isn't auto-exempt AND isn't in the
 *     baseline is reported as a regression and causes exit code 1.
 *
 *  3. Run with --update to regenerate the baseline from the current file state.
 *     Do this whenever a new key is legitimately the same in English and the
 *     other languages (brand names, technical nouns, etc.).
 */

import { promises as fs } from 'fs';
import path from 'path';

const LOCALES_DIR = path.resolve(process.cwd(), 'client/src/locales');
const EXCEPTIONS_FILE = path.resolve(process.cwd(), '.local/i18n-placeholder-exceptions.json');

const TARGET_LANGS = ['de', 'es', 'fr', 'nl', 'no', 'ro', 'ru'];

type FlatMap = Record<string, string>;

function flatten(obj: Record<string, unknown>, prefix = ''): FlatMap {
  const out: FlatMap = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(out, flatten(v as Record<string, unknown>, key));
    } else if (typeof v === 'string') {
      out[key] = v;
    }
  }
  return out;
}

async function loadFlat(lang: string): Promise<FlatMap> {
  const raw = await fs.readFile(path.join(LOCALES_DIR, `${lang}.json`), 'utf-8');
  return flatten(JSON.parse(raw));
}

/**
 * Returns true when the value is universally the same in all languages —
 * meaning it is NOT a translation target at all:
 *
 *  - Empty / whitespace only
 *  - Pure template tokens: the ENTIRE string is one or more {{var}} placeholders
 *    with nothing else (e.g. "{{count}}", "{{name}} {{surname}}").
 *    NOTE: strings that mix human text with {{var}} (e.g. "Hello, {{name}}!")
 *    are NOT exempt — they are translatable and must be checked.
 *  - Emoji-only string     → visual symbol, same everywhere
 *  - URL (http/https)      → not localised
 *  - Email address         → not localised
 *  - Phone number (+…)     → not localised
 *  - Starts with ©         → copyright notice
 *  - Pure ALL-CAPS token(s) with punctuation → codes/acronyms (SMS, IBAN, BIC/SWIFT)
 *
 * Intentionally NOT auto-exempt:
 *  - Strings that mix human-readable text with {{var}} interpolations
 *  - Single ordinary words (e.g. "Settings", "Save", "Profile")
 *  - Multi-word phrases in plain mixed case
 *  - Brand/product names — these are handled via the exceptions baseline
 *    so any NEW brand-name key is still surfaced for review
 */
function isAutoExempt(value: string): boolean {
  const v = value.trim();

  if (!v) return true;

  // Pure template tokens: the whole string is only {{...}} variables + whitespace.
  // Strip all {{...}} groups; if nothing meaningful remains → exempt.
  // This correctly exempts "{{count}}" but NOT "Welcome, {{name}}!".
  const stripped = v.replace(/\{\{[^}]+\}\}/g, '').trim();
  if (!stripped && /\{\{/.test(v)) return true;

  // Emoji-only: after stripping emoji characters, nothing text-like remains
  if (/\p{Emoji_Presentation}/u.test(v)) {
    const noEmoji = v.replace(/\p{Emoji_Presentation}/gu, '').trim();
    if (!noEmoji || /^[\s/|().,\-:]+$/.test(noEmoji)) return true;
  }

  // URLs and emails
  if (/^https?:\/\//i.test(v)) return true;
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return true;

  // Phone numbers
  if (/^\+[\d\s\-().]{4,}$/.test(v)) return true;

  // Copyright / symbol-led strings
  if (/^©/.test(v)) return true;

  // Pure ALL-CAPS strings (codes, acronyms): letters are A-Z only, rest is digits/symbols/spaces
  // Examples: "IBAN", "SMS", "BIC/SWIFT", "SWIFT/BIC (optional)", "IBAN *"
  if (/^[A-Z0-9\s/*()\-.,_:]+$/.test(v) && /[A-Z]{2,}/.test(v)) return true;

  return false;
}

interface Regression {
  lang: string;
  key: string;
  value: string;
}

/** Format used in the exceptions file: "<lang>:<dotted.key>" */
function exceptionId(lang: string, key: string): string {
  return `${lang}:${key}`;
}

async function main() {
  const updateMode = process.argv.includes('--update');

  const enFlat = await loadFlat('en');

  // Collect all non-auto-exempt identical values across all target langs
  const allIdentical: Regression[] = [];

  for (const lang of TARGET_LANGS) {
    const langFlat = await loadFlat(lang);
    for (const [key, enVal] of Object.entries(enFlat)) {
      if (langFlat[key] === enVal && !isAutoExempt(enVal)) {
        allIdentical.push({ lang, key, value: enVal });
      }
    }
  }

  if (updateMode) {
    const ids = allIdentical.map(r => exceptionId(r.lang, r.key)).sort();
    await fs.mkdir(path.dirname(EXCEPTIONS_FILE), { recursive: true });
    await fs.writeFile(EXCEPTIONS_FILE, JSON.stringify(ids, null, 2) + '\n');
    console.log(
      `\n✓ Baseline updated: ${ids.length} exception(s) saved to ${path.relative(process.cwd(), EXCEPTIONS_FILE)}\n`,
    );
    return;
  }

  // CI mode: compare against baseline
  let exceptions: string[] = [];
  try {
    exceptions = JSON.parse(await fs.readFile(EXCEPTIONS_FILE, 'utf-8'));
  } catch {
    console.warn(
      `\n⚠ No exceptions baseline found at ${path.relative(process.cwd(), EXCEPTIONS_FILE)}`,
    );
    console.warn(
      `  Run with --update to generate the baseline from the current state.\n`,
    );
  }

  const exceptionSet = new Set(exceptions);

  const regressions = allIdentical.filter(
    r => !exceptionSet.has(exceptionId(r.lang, r.key)),
  );

  if (regressions.length === 0) {
    console.log(`\n✓ i18n placeholder check passed`);
    console.log(`  Target langs     : ${TARGET_LANGS.join(', ')}`);
    console.log(`  Baseline entries : ${exceptionSet.size}`);
    console.log(`  Regressions      : 0\n`);
    return;
  }

  // Group by language for readable output
  const byLang = new Map<string, Regression[]>();
  for (const r of regressions) {
    if (!byLang.has(r.lang)) byLang.set(r.lang, []);
    byLang.get(r.lang)!.push(r);
  }

  console.error(
    `\n✗ i18n placeholder check FAILED — ${regressions.length} English placeholder(s) detected\n`,
  );
  console.error(
    `  These keys have the exact same value as en.json but are missing a real translation:\n`,
  );

  for (const [lang, items] of byLang) {
    console.error(`  [${lang}]`);
    for (const { key, value } of items) {
      console.error(`    ${key}: ${JSON.stringify(value)}`);
    }
    console.error('');
  }

  console.error(`  Fix:`);
  console.error(`    1. Translate the values above into each target language, OR`);
  console.error(
    `    2. If a value is legitimately the same as English (brand name, technical term),`,
  );
  console.error(`       run:  npx tsx scripts/i18n-placeholder-check.ts --update`);
  console.error(`       to add the key(s) to the exceptions baseline and commit the result.\n`);

  process.exit(1);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
