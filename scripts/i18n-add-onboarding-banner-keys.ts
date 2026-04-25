import * as fs from 'fs';
import * as path from 'path';

type Lang = 'it' | 'en' | 'es' | 'fr' | 'de' | 'nl' | 'no' | 'ro' | 'ru';
const LANGS: Lang[] = ['it', 'en', 'es', 'fr', 'de', 'nl', 'no', 'ro', 'ru'];

type LangMap = Record<Lang, string>;

const KEYS: Record<string, LangMap> = {
  'onboarding.banner.title': {
    it: 'Configura il tuo gestionale',
    en: 'Set up your workspace',
    es: 'Configura tu espacio',
    fr: 'Configurez votre espace',
    de: 'Richte deinen Arbeitsbereich ein',
    nl: 'Stel je werkruimte in',
    no: 'Sett opp arbeidsområdet',
    ro: 'Configurează-ți spațiul de lucru',
    ru: 'Настройте рабочее пространство',
  },
  'onboarding.banner.subtitle': {
    it: '{{completed}} di {{total}} passaggi completati. I dati di esempio verranno rimossi automaticamente quando inserirai i tuoi.',
    en: '{{completed}} of {{total}} steps completed. Sample data is removed automatically when you add your own.',
    es: '{{completed}} de {{total}} pasos completados. Los datos de ejemplo se eliminan automáticamente cuando agregas los tuyos.',
    fr: '{{completed}} sur {{total}} étapes terminées. Les données d\'exemple sont supprimées automatiquement lorsque vous ajoutez les vôtres.',
    de: '{{completed}} von {{total}} Schritten erledigt. Die Beispieldaten werden automatisch entfernt, sobald du eigene Daten hinzufügst.',
    nl: '{{completed}} van {{total}} stappen voltooid. Voorbeeldgegevens worden automatisch verwijderd zodra je je eigen gegevens toevoegt.',
    no: '{{completed}} av {{total}} trinn fullført. Eksempeldata fjernes automatisk når du legger til dine egne.',
    ro: '{{completed}} din {{total}} pași completați. Datele demonstrative sunt eliminate automat când adaugi propriile tale.',
    ru: 'Выполнено {{completed}} из {{total}} шагов. Демоданные удаляются автоматически, как только вы добавите свои.',
  },
  'onboarding.banner.dismiss': {
    it: 'Nascondi questa guida',
    en: 'Hide this guide',
    es: 'Ocultar esta guía',
    fr: 'Masquer ce guide',
    de: 'Diese Anleitung ausblenden',
    nl: 'Deze gids verbergen',
    no: 'Skjul denne veiledningen',
    ro: 'Ascunde acest ghid',
    ru: 'Скрыть это руководство',
  },
  'onboarding.banner.takeTour': {
    it: 'Fai il tour guidato',
    en: 'Take the guided tour',
    es: 'Hacer el tour guiado',
    fr: 'Faire la visite guidée',
    de: 'Geführte Tour starten',
    nl: 'Volg de rondleiding',
    no: 'Ta den veiledede omvisningen',
    ro: 'Pornește turul ghidat',
    ru: 'Пройти ознакомительный тур',
  },
  'onboarding.banner.allDone': {
    it: 'Tutto pronto, chiudi',
    en: 'All done, close',
    es: '¡Todo listo, cerrar!',
    fr: 'Tout est prêt, fermer',
    de: 'Alles erledigt, schließen',
    nl: 'Alles klaar, sluiten',
    no: 'Alt er klart, lukk',
    ro: 'Totul gata, închide',
    ru: 'Всё готово, закрыть',
  },
  'onboarding.banner.stepDone': {
    it: 'Completato',
    en: 'Completed',
    es: 'Completado',
    fr: 'Terminé',
    de: 'Erledigt',
    nl: 'Voltooid',
    no: 'Fullført',
    ro: 'Finalizat',
    ru: 'Готово',
  },
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
    let added = 0;
    for (const [key, map] of Object.entries(KEYS)) {
      setNested(json, key, map[lang]);
      added++;
    }
    fs.writeFileSync(file, JSON.stringify(json, null, 2) + '\n', 'utf-8');
    console.log(`✅ ${lang}: ${added} chiavi aggiunte/aggiornate`);
  }
}

main();
