import * as fs from 'fs';
import * as path from 'path';

type Lang = 'it' | 'en' | 'es' | 'fr' | 'de' | 'nl' | 'no' | 'ro' | 'ru';
const LANGS: Lang[] = ['it', 'en', 'es', 'fr', 'de', 'nl', 'no', 'ro', 'ru'];

type LangMap = Record<Lang, string>;

const KEYS: Record<string, LangMap> = {
  'google.simpleSetup.error400Tip.title': {
    it: "Suggerimento per errore 400",
    en: "Tip for error 400",
    es: "Consejo para el error 400",
    fr: "Astuce pour l'erreur 400",
    de: "Tipp für Fehler 400",
    nl: "Tip voor fout 400",
    no: "Tips for feil 400",
    ro: "Sfat pentru eroarea 400",
    ru: "Подсказка для ошибки 400"
  },
  'google.simpleSetup.error400Tip.description': {
    it: "Se riscontri l'errore 400 (redirect_uri_mismatch), visita /api/google-auth/compare-auth-urls per risolvere il problema.",
    en: "If you get error 400 (redirect_uri_mismatch), visit /api/google-auth/compare-auth-urls to fix the issue.",
    es: "Si recibes el error 400 (redirect_uri_mismatch), visita /api/google-auth/compare-auth-urls para resolver el problema.",
    fr: "Si vous obtenez l'erreur 400 (redirect_uri_mismatch), visitez /api/google-auth/compare-auth-urls pour résoudre le problème.",
    de: "Wenn der Fehler 400 (redirect_uri_mismatch) auftritt, besuche /api/google-auth/compare-auth-urls, um das Problem zu beheben.",
    nl: "Als je foutmelding 400 (redirect_uri_mismatch) krijgt, ga je naar /api/google-auth/compare-auth-urls om het probleem op te lossen.",
    no: "Hvis du får feil 400 (redirect_uri_mismatch), gå til /api/google-auth/compare-auth-urls for å løse problemet.",
    ro: "Dacă întâmpini eroarea 400 (redirect_uri_mismatch), accesează /api/google-auth/compare-auth-urls pentru a rezolva problema.",
    ru: "Если возникает ошибка 400 (redirect_uri_mismatch), перейдите на /api/google-auth/compare-auth-urls, чтобы решить проблему."
  },
  'google.simpleSetup.cloudConfig.title': {
    it: "Importante: configurazione Google Cloud",
    en: "Important: Google Cloud setup",
    es: "Importante: configuración de Google Cloud",
    fr: "Important : configuration Google Cloud",
    de: "Wichtig: Google Cloud-Konfiguration",
    nl: "Belangrijk: Google Cloud-configuratie",
    no: "Viktig: Google Cloud-konfigurasjon",
    ro: "Important: configurare Google Cloud",
    ru: "Важно: настройка Google Cloud"
  },
  'google.simpleSetup.cloudConfig.intro': {
    it: "Per utilizzare l'integrazione con Google Calendar, devi configurare correttamente il progetto Google Cloud. Assicurati che l'URL di reindirizzamento nella console Google Cloud sia esattamente il seguente:",
    en: "To use the Google Calendar integration, you must properly configure your Google Cloud project. Make sure the redirect URL in the Google Cloud console is exactly the following:",
    es: "Para usar la integración con Google Calendar debes configurar correctamente el proyecto en Google Cloud. Asegúrate de que la URL de redirección en la consola de Google Cloud sea exactamente la siguiente:",
    fr: "Pour utiliser l'intégration avec Google Calendar, vous devez configurer correctement le projet Google Cloud. Assurez-vous que l'URL de redirection dans la console Google Cloud soit exactement la suivante :",
    de: "Um die Google Kalender-Integration zu nutzen, musst du das Google Cloud-Projekt korrekt konfigurieren. Stelle sicher, dass die Weiterleitungs-URL in der Google Cloud-Konsole genau die folgende ist:",
    nl: "Om de integratie met Google Agenda te gebruiken, moet je het Google Cloud-project correct configureren. Zorg ervoor dat de doorverwijs-URL in de Google Cloud-console exact het volgende is:",
    no: "For å bruke integrasjonen med Google Kalender må du konfigurere Google Cloud-prosjektet riktig. Sørg for at omadresserings-URL-en i Google Cloud-konsollen er nøyaktig følgende:",
    ro: "Pentru a folosi integrarea cu Google Calendar, trebuie să configurezi corect proiectul Google Cloud. Asigură-te că URL-ul de redirecționare din consola Google Cloud este exact următorul:",
    ru: "Чтобы использовать интеграцию с Google Календарём, необходимо правильно настроить проект в Google Cloud. Убедитесь, что URL перенаправления в консоли Google Cloud точно следующий:"
  },
  'google.simpleSetup.cloudConfig.urlCopiedTitle': {
    it: "URL copiato",
    en: "URL copied",
    es: "URL copiada",
    fr: "URL copiée",
    de: "URL kopiert",
    nl: "URL gekopieerd",
    no: "URL kopiert",
    ro: "URL copiat",
    ru: "URL скопирован"
  },
  'google.simpleSetup.cloudConfig.urlCopiedDesc': {
    it: "L'URL di callback è stato copiato negli appunti",
    en: "The callback URL has been copied to the clipboard",
    es: "La URL de devolución de llamada se ha copiado al portapapeles",
    fr: "L'URL de rappel a été copiée dans le presse-papiers",
    de: "Die Callback-URL wurde in die Zwischenablage kopiert",
    nl: "De callback-URL is naar het klembord gekopieerd",
    no: "Callback-URL-en er kopiert til utklippstavlen",
    ro: "URL-ul de callback a fost copiat în clipboard",
    ru: "URL обратного вызова скопирован в буфер обмена"
  },
  'google.simpleSetup.cloudConfig.error403Help': {
    it: "Se riscontri errori 403 (accesso negato), copia questo URL esatto e assicurati che sia configurato correttamente nella console Google Cloud → Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs.",
    en: "If you get 403 errors (access denied), copy this exact URL and make sure it is properly configured in Google Cloud console → Credentials → OAuth 2.0 Client IDs → Authorized redirect URIs.",
    es: "Si recibes errores 403 (acceso denegado), copia esta URL exacta y asegúrate de que esté configurada correctamente en la consola de Google Cloud → Credenciales → ID de cliente de OAuth 2.0 → URI de redirección autorizadas.",
    fr: "Si vous obtenez des erreurs 403 (accès refusé), copiez cette URL exacte et assurez-vous qu'elle est correctement configurée dans la console Google Cloud → Identifiants → ID client OAuth 2.0 → URI de redirection autorisés.",
    de: "Wenn 403-Fehler (Zugriff verweigert) auftreten, kopiere diese exakte URL und stelle sicher, dass sie in der Google Cloud-Konsole → Anmeldedaten → OAuth 2.0-Client-IDs → Autorisierte Weiterleitungs-URIs korrekt konfiguriert ist.",
    nl: "Als je 403-fouten (toegang geweigerd) krijgt, kopieer dan deze exacte URL en zorg ervoor dat deze correct is geconfigureerd in de Google Cloud-console → Inloggegevens → OAuth 2.0-client-ID's → Geautoriseerde doorverwijs-URI's.",
    no: "Hvis du får 403-feil (tilgang nektet), kopier denne nøyaktige URL-en og kontroller at den er riktig konfigurert i Google Cloud-konsollen → Legitimasjon → OAuth 2.0-klient-ID-er → Autoriserte omadresserings-URI-er.",
    ro: "Dacă întâmpini erori 403 (acces refuzat), copiază acest URL exact și asigură-te că este configurat corect în consola Google Cloud → Credențiale → ID-uri de client OAuth 2.0 → URI-uri de redirecționare autorizate.",
    ru: "Если возникают ошибки 403 (доступ запрещён), скопируйте этот точный URL и убедитесь, что он правильно настроен в консоли Google Cloud → Учётные данные → Идентификаторы клиента OAuth 2.0 → Авторизованные URI перенаправления."
  },
  'google.simpleSetup.cloudConfig.domainCheck': {
    it: "Verifica attentamente che il dominio sia esattamente \"wife-scheduler-zambelliandrea1.replit.app\" e non \".repl.co\" o altro.",
    en: "Carefully check that the domain is exactly \"wife-scheduler-zambelliandrea1.replit.app\" and not \".repl.co\" or anything else.",
    es: "Verifica cuidadosamente que el dominio sea exactamente \"wife-scheduler-zambelliandrea1.replit.app\" y no \".repl.co\" u otro.",
    fr: "Vérifiez attentivement que le domaine est exactement « wife-scheduler-zambelliandrea1.replit.app » et non « .repl.co » ou autre.",
    de: "Überprüfe sorgfältig, dass die Domain genau \"wife-scheduler-zambelliandrea1.replit.app\" lautet und nicht \".repl.co\" oder etwas anderes.",
    nl: "Controleer zorgvuldig of het domein exact \"wife-scheduler-zambelliandrea1.replit.app\" is en niet \".repl.co\" of iets anders.",
    no: "Kontroller nøye at domenet er nøyaktig «wife-scheduler-zambelliandrea1.replit.app» og ikke «.repl.co» eller noe annet.",
    ro: "Verifică cu atenție că domeniul este exact „wife-scheduler-zambelliandrea1.replit.app” și nu „.repl.co” sau altceva.",
    ru: "Внимательно проверьте, что домен — это именно «wife-scheduler-zambelliandrea1.replit.app», а не «.repl.co» или что-либо другое."
  },
  'google.simpleSetup.cloudConfig.debugTool': {
    it: "Strumento di debug per errore 400 (redirect_uri_mismatch)",
    en: "Debug tool for error 400 (redirect_uri_mismatch)",
    es: "Herramienta de depuración para el error 400 (redirect_uri_mismatch)",
    fr: "Outil de débogage pour l'erreur 400 (redirect_uri_mismatch)",
    de: "Debug-Tool für Fehler 400 (redirect_uri_mismatch)",
    nl: "Debugtool voor fout 400 (redirect_uri_mismatch)",
    no: "Feilsøkingsverktøy for feil 400 (redirect_uri_mismatch)",
    ro: "Instrument de depanare pentru eroarea 400 (redirect_uri_mismatch)",
    ru: "Инструмент отладки для ошибки 400 (redirect_uri_mismatch)"
  },
  'google.simpleSetup.error403.title': {
    it: "Risoluzione Errore 403 (access_denied)",
    en: "Resolving Error 403 (access_denied)",
    es: "Resolución del error 403 (access_denied)",
    fr: "Résolution de l'erreur 403 (access_denied)",
    de: "Behebung von Fehler 403 (access_denied)",
    nl: "Oplossing voor fout 403 (access_denied)",
    no: "Løsning for feil 403 (access_denied)",
    ro: "Rezolvarea erorii 403 (access_denied)",
    ru: "Устранение ошибки 403 (access_denied)"
  },
  'google.simpleSetup.error403.intro': {
    it: "Se continui a ricevere l'errore 403, prova questa procedura:",
    en: "If you keep getting error 403, try this procedure:",
    es: "Si sigues recibiendo el error 403, prueba este procedimiento:",
    fr: "Si vous continuez à recevoir l'erreur 403, essayez cette procédure :",
    de: "Wenn du weiterhin Fehler 403 erhältst, versuche dieses Vorgehen:",
    nl: "Als je foutmelding 403 blijft krijgen, probeer dan deze procedure:",
    no: "Hvis du fortsatt får feil 403, prøv denne fremgangsmåten:",
    ro: "Dacă primești în continuare eroarea 403, încearcă această procedură:",
    ru: "Если ошибка 403 продолжает появляться, попробуйте следующую процедуру:"
  },
  'google.simpleSetup.error403.step1': {
    it: "Vai alla <1>Console Google Cloud</1>",
    en: "Go to the <1>Google Cloud Console</1>",
    es: "Ve a la <1>Consola de Google Cloud</1>",
    fr: "Accédez à la <1>console Google Cloud</1>",
    de: "Gehe zur <1>Google Cloud-Konsole</1>",
    nl: "Ga naar de <1>Google Cloud-console</1>",
    no: "Gå til <1>Google Cloud-konsollen</1>",
    ro: "Accesează <1>Consola Google Cloud</1>",
    ru: "Перейдите в <1>консоль Google Cloud</1>"
  },
  'google.simpleSetup.error403.step2': {
    it: "Seleziona il tuo progetto",
    en: "Select your project",
    es: "Selecciona tu proyecto",
    fr: "Sélectionnez votre projet",
    de: "Wähle dein Projekt aus",
    nl: "Selecteer je project",
    no: "Velg prosjektet ditt",
    ro: "Selectează proiectul tău",
    ru: "Выберите свой проект"
  },
  'google.simpleSetup.error403.step3': {
    it: "<1>Elimina</1> le vecchie credenziali OAuth 2.0",
    en: "<1>Delete</1> the old OAuth 2.0 credentials",
    es: "<1>Elimina</1> las credenciales antiguas de OAuth 2.0",
    fr: "<1>Supprimez</1> les anciens identifiants OAuth 2.0",
    de: "<1>Lösche</1> die alten OAuth 2.0-Anmeldedaten",
    nl: "<1>Verwijder</1> de oude OAuth 2.0-inloggegevens",
    no: "<1>Slett</1> de gamle OAuth 2.0-legitimasjonene",
    ro: "<1>Șterge</1> vechile credențiale OAuth 2.0",
    ru: "<1>Удалите</1> старые учётные данные OAuth 2.0"
  },
  'google.simpleSetup.error403.step4': {
    it: "Crea un nuovo Client ID OAuth 2.0 completamente nuovo",
    en: "Create a brand new OAuth 2.0 Client ID",
    es: "Crea un ID de cliente OAuth 2.0 completamente nuevo",
    fr: "Créez un tout nouvel identifiant client OAuth 2.0",
    de: "Erstelle eine komplett neue OAuth 2.0-Client-ID",
    nl: "Maak een volledig nieuwe OAuth 2.0-client-ID",
    no: "Opprett en helt ny OAuth 2.0-klient-ID",
    ro: "Creează un ID de client OAuth 2.0 complet nou",
    ru: "Создайте совершенно новый идентификатор клиента OAuth 2.0"
  },
  'google.simpleSetup.error403.step5': {
    it: "Aggiungi con attenzione l'URL di callback esatto: <1>{{url}}</1>",
    en: "Carefully add the exact callback URL: <1>{{url}}</1>",
    es: "Añade cuidadosamente la URL de devolución de llamada exacta: <1>{{url}}</1>",
    fr: "Ajoutez soigneusement l'URL de rappel exacte : <1>{{url}}</1>",
    de: "Füge sorgfältig die exakte Callback-URL hinzu: <1>{{url}}</1>",
    nl: "Voeg zorgvuldig de exacte callback-URL toe: <1>{{url}}</1>",
    no: "Legg nøye til den nøyaktige callback-URL-en: <1>{{url}}</1>",
    ro: "Adaugă cu atenție URL-ul de callback exact: <1>{{url}}</1>",
    ru: "Внимательно добавьте точный URL обратного вызова: <1>{{url}}</1>"
  },
  'google.simpleSetup.error403.step6': {
    it: "Ritorna qui e riprova l'autorizzazione",
    en: "Come back here and try the authorization again",
    es: "Regresa aquí y vuelve a intentar la autorización",
    fr: "Revenez ici et réessayez l'autorisation",
    de: "Komme hierher zurück und versuche die Autorisierung erneut",
    nl: "Kom hier terug en probeer de autorisatie opnieuw",
    no: "Kom tilbake hit og prøv autorisasjonen igjen",
    ro: "Revino aici și încearcă din nou autorizarea",
    ru: "Вернитесь сюда и попробуйте авторизацию снова"
  }
};

const LOCALES_DIR = path.resolve(process.cwd(), 'client/src/locales');

function setNested(obj: any, keyPath: string, value: any) {
  const parts = keyPath.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] == null || typeof cur[parts[i]] !== 'object' || Array.isArray(cur[parts[i]])) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

let totalAdded = 0;
for (const lang of LANGS) {
  const filePath = path.join(LOCALES_DIR, `${lang}.json`);
  const json = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  let added = 0;
  for (const [keyPath, langMap] of Object.entries(KEYS)) {
    setNested(json, keyPath, langMap[lang]);
    added++;
  }
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n');
  console.log(`[${lang}] +${added} keys → ${filePath}`);
  totalAdded += added;
}
console.log(`\nTotal: ${totalAdded} key-language entries added across ${LANGS.length} locales.`);
