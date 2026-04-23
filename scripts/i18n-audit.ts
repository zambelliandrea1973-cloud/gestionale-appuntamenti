#!/usr/bin/env tsx
/**
 * i18n-audit: scansiona client/src per trovare stringhe italiane hardcoded
 * (testi JSX, placeholder, label, toast, dialog title, validazioni Zod).
 *
 * Uso: npm run i18n:audit
 * Output: .local/i18n-audit-report.md + console summary
 */
import { promises as fs } from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'client/src');
const REPORT_PATH = path.resolve(process.cwd(), '.local/i18n-audit-report.md');

const SKIP_DIRS = new Set(['locales', 'node_modules', '__tests__']);
const TARGET_EXT = new Set(['.ts', '.tsx']);

const ITALIAN_HINT = /[àèéìòùÀÈÉÌÒÙ]|\b(il|lo|la|gli|le|un|una|del|della|degli|delle|che|con|per|alla|allo|alle|agli|nel|nella|sono|hai|sei|cliente|appuntament|fattur|salv|elimin|modific|crea|nuovo|nuova|scegli|inserisci|password|utente|conferma|annulla|errore|successo|aggiorn|carica|non|più|già|dopo|prima)\b/i;

type Finding = {
  file: string;
  line: number;
  type: string;
  snippet: string;
};

const findings: Finding[] = [];

const PATTERNS: Array<{ regex: RegExp; type: string; group?: number }> = [
  { regex: />\s*([A-ZÀ-Ú][^<>{}\n]{4,}?)\s*</g, type: 'JSX text', group: 1 },
  { regex: /placeholder\s*=\s*["']([^"']{4,}?)["']/g, type: 'placeholder', group: 1 },
  { regex: /title\s*=\s*["']([^"']{4,}?)["']/g, type: 'title attr', group: 1 },
  { regex: /aria-label\s*=\s*["']([^"']{4,}?)["']/g, type: 'aria-label', group: 1 },
  { regex: /label\s*:\s*["']([^"']{4,}?)["']/g, type: 'label prop', group: 1 },
  { regex: /toast\s*\(\s*\{[^}]*?(?:title|description)\s*:\s*["']([^"']{4,}?)["']/g, type: 'toast', group: 1 },
  { regex: /(?:title|description|message)\s*:\s*["']([A-ZÀ-Ú][^"']{4,}?)["']/g, type: 'object literal', group: 1 },
  { regex: /\.(min|max|email|required|nonempty)\s*\(\s*\d*\s*,?\s*["']([^"']{4,}?)["']/g, type: 'zod message', group: 2 },
  { regex: /alert\s*\(\s*["']([^"']{4,}?)["']\s*\)/g, type: 'alert()', group: 1 },
  { regex: /confirm\s*\(\s*["']([^"']{4,}?)["']\s*\)/g, type: 'confirm()', group: 1 },
];

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (SKIP_DIRS.has(e.name)) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else if (TARGET_EXT.has(path.extname(e.name))) out.push(full);
  }
  return out;
}

async function scanFile(file: string) {
  const content = await fs.readFile(file, 'utf-8');
  const lines = content.split('\n');
  for (const { regex, type, group = 1 } of PATTERNS) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(content)) !== null) {
      const text = (m[group] || '').trim();
      if (!text || text.length < 4) continue;
      if (!ITALIAN_HINT.test(text)) continue;
      if (text.startsWith('{') || text.startsWith('${')) continue;
      const lineNum = content.substring(0, m.index).split('\n').length;
      findings.push({
        file: path.relative(process.cwd(), file),
        line: lineNum,
        type,
        snippet: text.slice(0, 100),
      });
    }
  }
}

async function main() {
  const files = await walk(ROOT);
  for (const f of files) await scanFile(f);

  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);

  let md = `# i18n Audit Report\n\nGenerato: ${new Date().toISOString()}\n\n`;
  md += `**Totale stringhe italiane hardcoded trovate: ${findings.length}**\n`;
  md += `**File coinvolti: ${byFile.size}**\n\n`;
  md += `## Top 30 file da rifattorizzare (per priorità)\n\n`;
  md += `| # | File | Stringhe |\n|---|------|----------|\n`;
  sorted.slice(0, 30).forEach(([file, list], i) => {
    md += `| ${i + 1} | \`${file}\` | ${list.length} |\n`;
  });
  md += `\n## Dettaglio completo\n\n`;
  for (const [file, list] of sorted) {
    md += `### \`${file}\` (${list.length} stringhe)\n\n`;
    for (const f of list.slice(0, 20)) {
      md += `- L${f.line} [${f.type}]: \`${f.snippet.replace(/`/g, "'")}\`\n`;
    }
    if (list.length > 20) md += `- ... e altre ${list.length - 20}\n`;
    md += `\n`;
  }

  await fs.mkdir(path.dirname(REPORT_PATH), { recursive: true });
  await fs.writeFile(REPORT_PATH, md);

  console.log(`\n✓ Audit completato`);
  console.log(`  Stringhe hardcoded: ${findings.length}`);
  console.log(`  File coinvolti: ${byFile.size}`);
  console.log(`  Report: ${path.relative(process.cwd(), REPORT_PATH)}\n`);
  console.log(`Top 10 file:`);
  sorted.slice(0, 10).forEach(([file, list]) => {
    console.log(`  ${list.length.toString().padStart(4)}  ${file}`);
  });
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
