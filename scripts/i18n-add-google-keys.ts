import * as fs from 'fs';
import * as path from 'path';

type Lang = 'it'|'en'|'es'|'fr'|'de'|'nl'|'no'|'ro'|'ru';
const LANGS: Lang[] = ['it','en','es','fr','de','nl','no','ro','ru'];

type LangMap = Record<Lang, string>;
type LangArrMap = Record<Lang, string[]>;

const KEYS: Record<string, LangMap | LangArrMap> = {
  // ===== GoogleCalendarSettings.tsx =====
  'googleCalendar.settings.toastSavedTitle': {
    it: "Impostazioni salvate", en: "Settings saved", es: "Configuración guardada",
    fr: "Paramètres enregistrés", de: "Einstellungen gespeichert", nl: "Instellingen opgeslagen",
    no: "Innstillinger lagret", ro: "Setări salvate", ru: "Настройки сохранены"
  },
  'googleCalendar.settings.toastSaveError': {
    it: "Impossibile salvare le impostazioni. Riprova più tardi.",
    en: "Unable to save settings. Please try again later.",
    es: "No se pudieron guardar los ajustes. Inténtalo más tarde.",
    fr: "Impossible d'enregistrer les paramètres. Réessayez plus tard.",
    de: "Einstellungen konnten nicht gespeichert werden. Bitte später erneut versuchen.",
    nl: "Kan instellingen niet opslaan. Probeer het later opnieuw.",
    no: "Kunne ikke lagre innstillingene. Prøv igjen senere.",
    ro: "Nu s-au putut salva setările. Încearcă din nou mai târziu.",
    ru: "Не удалось сохранить настройки. Повторите попытку позже."
  },
  'googleCalendar.settings.toastAuthCompleted': {
    it: "Autorizzazione completata", en: "Authorization complete", es: "Autorización completada",
    fr: "Autorisation terminée", de: "Autorisierung abgeschlossen", nl: "Autorisatie voltooid",
    no: "Autorisering fullført", ro: "Autorizare finalizată", ru: "Авторизация завершена"
  },
  'googleCalendar.settings.toastAuthError': {
    it: "Errore di autorizzazione", en: "Authorization error", es: "Error de autorización",
    fr: "Erreur d'autorisation", de: "Autorisierungsfehler", nl: "Autorisatiefout",
    no: "Autorisasjonsfeil", ro: "Eroare de autorizare", ru: "Ошибка авторизации"
  },
  'googleCalendar.settings.toastAuthErrorDesc': {
    it: "Non è stato possibile autorizzare il tuo account Google. Verifica il codice inserito.",
    en: "Unable to authorize your Google account. Please check the code you entered.",
    es: "No se pudo autorizar tu cuenta de Google. Verifica el código ingresado.",
    fr: "Impossible d'autoriser votre compte Google. Vérifiez le code saisi.",
    de: "Ihr Google-Konto konnte nicht autorisiert werden. Bitte überprüfen Sie den eingegebenen Code.",
    nl: "Kan je Google-account niet autoriseren. Controleer de ingevoerde code.",
    no: "Kunne ikke autorisere Google-kontoen din. Sjekk koden du skrev inn.",
    ro: "Contul Google nu a putut fi autorizat. Verifică codul introdus.",
    ru: "Не удалось авторизовать ваш аккаунт Google. Проверьте введённый код."
  },
  'googleCalendar.settings.toastAuthErrorGeneric': {
    it: "Si è verificato un errore durante l'autorizzazione con Google",
    en: "An error occurred during Google authorization",
    es: "Se produjo un error durante la autorización con Google",
    fr: "Une erreur s'est produite lors de l'autorisation Google",
    de: "Bei der Google-Autorisierung ist ein Fehler aufgetreten",
    nl: "Er is een fout opgetreden tijdens de Google-autorisatie",
    no: "Det oppstod en feil under Google-autorisering",
    ro: "A apărut o eroare în timpul autorizării Google",
    ru: "Произошла ошибка во время авторизации Google"
  },
  'googleCalendar.settings.toastMissingCode': {
    it: "Codice mancante", en: "Missing code", es: "Código faltante",
    fr: "Code manquant", de: "Code fehlt", nl: "Code ontbreekt",
    no: "Kode mangler", ro: "Cod lipsă", ru: "Код отсутствует"
  },
  'googleCalendar.settings.toastMissingCodeDesc': {
    it: "Inserire il codice di autorizzazione fornito da Google",
    en: "Please enter the authorization code provided by Google",
    es: "Introduce el código de autorización proporcionado por Google",
    fr: "Saisissez le code d'autorisation fourni par Google",
    de: "Bitte geben Sie den von Google bereitgestellten Autorisierungscode ein",
    nl: "Voer de door Google verstrekte autorisatiecode in",
    no: "Skriv inn autorisasjonskoden fra Google",
    ro: "Introdu codul de autorizare furnizat de Google",
    ru: "Введите код авторизации, предоставленный Google"
  },
  'googleCalendar.settings.cardTitle': {
    it: "Sincronizzazione Google Calendar", en: "Google Calendar sync", es: "Sincronización de Google Calendar",
    fr: "Synchronisation Google Agenda", de: "Google Kalender Synchronisierung", nl: "Google Agenda-synchronisatie",
    no: "Google Kalender-synkronisering", ro: "Sincronizare Google Calendar", ru: "Синхронизация Google Календаря"
  },
  'googleCalendar.settings.cardDesc': {
    it: "Sincronizza gli appuntamenti con il tuo calendario Google",
    en: "Sync your appointments with your Google Calendar",
    es: "Sincroniza tus citas con tu Google Calendar",
    fr: "Synchronisez vos rendez-vous avec votre Google Agenda",
    de: "Synchronisieren Sie Ihre Termine mit Ihrem Google Kalender",
    nl: "Synchroniseer je afspraken met je Google Agenda",
    no: "Synkroniser avtalene dine med Google Kalender",
    ro: "Sincronizează programările cu Google Calendar",
    ru: "Синхронизируйте встречи с Google Календарём"
  },
  'googleCalendar.settings.loadError': {
    it: "Errore durante il caricamento delle impostazioni di sincronizzazione",
    en: "Error loading sync settings",
    es: "Error al cargar la configuración de sincronización",
    fr: "Erreur lors du chargement des paramètres de synchronisation",
    de: "Fehler beim Laden der Synchronisierungseinstellungen",
    nl: "Fout bij het laden van synchronisatie-instellingen",
    no: "Feil ved lasting av synkroniseringsinnstillinger",
    ro: "Eroare la încărcarea setărilor de sincronizare",
    ru: "Ошибка загрузки настроек синхронизации"
  },
  'googleCalendar.settings.toggleTitle': {
    it: "Attiva sincronizzazione con Google Calendar",
    en: "Enable Google Calendar sync",
    es: "Activar sincronización con Google Calendar",
    fr: "Activer la synchronisation avec Google Agenda",
    de: "Google Kalender-Synchronisierung aktivieren",
    nl: "Google Agenda-synchronisatie inschakelen",
    no: "Aktiver Google Kalender-synkronisering",
    ro: "Activează sincronizarea cu Google Calendar",
    ru: "Включить синхронизацию с Google Календарём"
  },
  'googleCalendar.settings.toggleDesc': {
    it: "Quando è attiva, gli appuntamenti verranno sincronizzati automaticamente con il calendario Google specificato",
    en: "When enabled, appointments are automatically synced with the specified Google Calendar",
    es: "Cuando está activa, las citas se sincronizan automáticamente con el Google Calendar especificado",
    fr: "Lorsqu'elle est activée, les rendez-vous sont automatiquement synchronisés avec l'agenda Google spécifié",
    de: "Wenn aktiviert, werden Termine automatisch mit dem angegebenen Google Kalender synchronisiert",
    nl: "Indien ingeschakeld worden afspraken automatisch gesynchroniseerd met de opgegeven Google Agenda",
    no: "Når aktivert, synkroniseres avtaler automatisk med den valgte Google Kalenderen",
    ro: "Când este activă, programările se sincronizează automat cu Google Calendar-ul specificat",
    ru: "Когда включено, встречи автоматически синхронизируются с указанным Google Календарём"
  },
  'googleCalendar.settings.gmailLabel': {
    it: "Indirizzo Gmail", en: "Gmail address", es: "Dirección Gmail",
    fr: "Adresse Gmail", de: "Gmail-Adresse", nl: "Gmail-adres",
    no: "Gmail-adresse", ro: "Adresă Gmail", ru: "Адрес Gmail"
  },
  'googleCalendar.settings.gmailHint': {
    it: "Inserisci l'indirizzo Gmail del calendario con cui desideri sincronizzare gli appuntamenti:",
    en: "Enter the Gmail address of the calendar you want to sync your appointments with:",
    es: "Introduce la dirección Gmail del calendario con el que quieres sincronizar las citas:",
    fr: "Saisissez l'adresse Gmail du calendrier avec lequel vous souhaitez synchroniser vos rendez-vous :",
    de: "Geben Sie die Gmail-Adresse des Kalenders ein, mit dem Sie Ihre Termine synchronisieren möchten:",
    nl: "Voer het Gmail-adres in van de agenda waarmee je je afspraken wilt synchroniseren:",
    no: "Skriv inn Gmail-adressen til kalenderen du vil synkronisere avtalene med:",
    ro: "Introdu adresa Gmail a calendarului cu care vrei să sincronizezi programările:",
    ru: "Введите адрес Gmail календаря, с которым нужно синхронизировать встречи:"
  },
  'googleCalendar.settings.gmailNote': {
    it: 'Puoi inserire sia "primary" per il tuo calendario principale, sia un indirizzo Gmail specifico',
    en: 'You can enter "primary" for your main calendar, or a specific Gmail address',
    es: 'Puedes escribir "primary" para tu calendario principal, o una dirección Gmail específica',
    fr: 'Vous pouvez saisir "primary" pour votre agenda principal, ou une adresse Gmail spécifique',
    de: 'Sie können "primary" für Ihren Hauptkalender oder eine spezifische Gmail-Adresse eingeben',
    nl: 'Je kunt "primary" invoeren voor je hoofdagenda, of een specifiek Gmail-adres',
    no: 'Du kan skrive "primary" for hovedkalenderen din, eller en spesifikk Gmail-adresse',
    ro: 'Poți introduce "primary" pentru calendarul principal, sau o adresă Gmail specifică',
    ru: 'Вы можете указать "primary" для основного календаря или конкретный адрес Gmail'
  },
  'googleCalendar.settings.accountAuthorized': {
    it: "Il tuo account Google è già stato autorizzato",
    en: "Your Google account is already authorized",
    es: "Tu cuenta de Google ya está autorizada",
    fr: "Votre compte Google est déjà autorisé",
    de: "Ihr Google-Konto ist bereits autorisiert",
    nl: "Je Google-account is al geautoriseerd",
    no: "Google-kontoen din er allerede autorisert",
    ro: "Contul tău Google este deja autorizat",
    ru: "Ваш аккаунт Google уже авторизован"
  },
  'googleCalendar.settings.accountNotAuthorized': {
    it: "Account Google non autorizzato", en: "Google account not authorized",
    es: "Cuenta de Google no autorizada", fr: "Compte Google non autorisé",
    de: "Google-Konto nicht autorisiert", nl: "Google-account niet geautoriseerd",
    no: "Google-konto ikke autorisert", ro: "Cont Google neautorizat",
    ru: "Аккаунт Google не авторизован"
  },
  'googleCalendar.settings.accountNotAuthorizedDesc': {
    it: "Per completare la configurazione, devi autorizzare l'accesso al tuo account Google.",
    en: "To complete setup, you need to authorize access to your Google account.",
    es: "Para completar la configuración, debes autorizar el acceso a tu cuenta de Google.",
    fr: "Pour terminer la configuration, vous devez autoriser l'accès à votre compte Google.",
    de: "Um die Einrichtung abzuschließen, müssen Sie den Zugriff auf Ihr Google-Konto autorisieren.",
    nl: "Om de installatie te voltooien, moet je toegang tot je Google-account autoriseren.",
    no: "For å fullføre oppsettet må du autorisere tilgang til Google-kontoen din.",
    ro: "Pentru a finaliza configurarea, trebuie să autorizezi accesul la contul Google.",
    ru: "Чтобы завершить настройку, разрешите доступ к вашему аккаунту Google."
  },
  'googleCalendar.settings.clientIdLabel': {
    it: "Google Client ID", en: "Google Client ID", es: "Google Client ID",
    fr: "Google Client ID", de: "Google Client ID", nl: "Google Client ID",
    no: "Google Client ID", ro: "Google Client ID", ru: "Google Client ID"
  },
  'googleCalendar.settings.clientSecretLabel': {
    it: "Google Client Secret", en: "Google Client Secret", es: "Google Client Secret",
    fr: "Google Client Secret", de: "Google Client Secret", nl: "Google Client Secret",
    no: "Google Client Secret", ro: "Google Client Secret", ru: "Google Client Secret"
  },
  'googleCalendar.settings.clientIdTooltipTitle': {
    it: "Come ottenere il Google Client ID:",
    en: "How to get the Google Client ID:",
    es: "Cómo obtener el Google Client ID:",
    fr: "Comment obtenir le Google Client ID :",
    de: "So erhalten Sie die Google Client ID:",
    nl: "Hoe krijg je de Google Client ID:",
    no: "Slik får du Google Client ID:",
    ro: "Cum obții Google Client ID:",
    ru: "Как получить Google Client ID:"
  },
  'googleCalendar.settings.clientSecretTooltipTitle': {
    it: "Come ottenere il Google Client Secret:",
    en: "How to get the Google Client Secret:",
    es: "Cómo obtener el Google Client Secret:",
    fr: "Comment obtenir le Google Client Secret :",
    de: "So erhalten Sie das Google Client Secret:",
    nl: "Hoe krijg je het Google Client Secret:",
    no: "Slik får du Google Client Secret:",
    ro: "Cum obții Google Client Secret:",
    ru: "Как получить Google Client Secret:"
  },
  'googleCalendar.settings.clientIdSteps': {
    it: ["Apri la Google Cloud Console","Seleziona o crea un nuovo progetto","Vai su \"API e servizi\" → \"Credenziali\"","Clicca su \"Crea credenziali\" → \"ID client OAuth\"","Seleziona \"Applicazione Web\" come tipo","Aggiungi l'URL della tua app nel campo \"URI di reindirizzamento autorizzati\"","Il Client ID sarà mostrato dopo aver cliccato su \"Crea\""],
    en: ["Open the Google Cloud Console","Select or create a new project","Go to \"APIs & Services\" → \"Credentials\"","Click \"Create credentials\" → \"OAuth client ID\"","Select \"Web application\" as the type","Add your app URL to \"Authorized redirect URIs\"","The Client ID will be shown after clicking \"Create\""],
    es: ["Abre la Google Cloud Console","Selecciona o crea un proyecto nuevo","Ve a \"APIs y servicios\" → \"Credenciales\"","Haz clic en \"Crear credenciales\" → \"ID de cliente OAuth\"","Selecciona \"Aplicación web\" como tipo","Añade la URL de tu app en \"URIs de redireccionamiento autorizados\"","El Client ID se mostrará tras hacer clic en \"Crear\""],
    fr: ["Ouvrez la Google Cloud Console","Sélectionnez ou créez un nouveau projet","Allez dans \"API et services\" → \"Identifiants\"","Cliquez sur \"Créer des identifiants\" → \"ID client OAuth\"","Sélectionnez \"Application Web\" comme type","Ajoutez l'URL de votre app dans \"URI de redirection autorisés\"","Le Client ID s'affichera après avoir cliqué sur \"Créer\""],
    de: ["Öffnen Sie die Google Cloud Console","Wählen Sie ein Projekt aus oder erstellen Sie ein neues","Gehen Sie zu \"APIs & Dienste\" → \"Anmeldedaten\"","Klicken Sie auf \"Anmeldedaten erstellen\" → \"OAuth-Client-ID\"","Wählen Sie \"Webanwendung\" als Typ","Fügen Sie die URL Ihrer App unter \"Autorisierte Weiterleitungs-URIs\" hinzu","Die Client ID wird nach Klick auf \"Erstellen\" angezeigt"],
    nl: ["Open de Google Cloud Console","Selecteer of maak een nieuw project","Ga naar \"API's en services\" → \"Inloggegevens\"","Klik op \"Inloggegevens maken\" → \"OAuth-client-ID\"","Selecteer \"Webapplicatie\" als type","Voeg de URL van je app toe bij \"Toegestane omleidings-URI's\"","De Client ID verschijnt na klikken op \"Maken\""],
    no: ["Åpne Google Cloud Console","Velg eller opprett et nytt prosjekt","Gå til \"APIer og tjenester\" → \"Påloggingsinformasjon\"","Klikk \"Opprett påloggingsinformasjon\" → \"OAuth-klient-ID\"","Velg \"Webapplikasjon\" som type","Legg til app-URL-en i \"Autoriserte omdirigerings-URI-er\"","Klient-ID-en vises etter at du klikker \"Opprett\""],
    ro: ["Deschide Google Cloud Console","Selectează sau creează un proiect nou","Mergi la \"API-uri și servicii\" → \"Credențiale\"","Apasă pe \"Creează credențiale\" → \"ID client OAuth\"","Selectează \"Aplicație web\" ca tip","Adaugă URL-ul aplicației la \"URI-uri de redirecționare autorizate\"","Client ID va fi afișat după ce apeși \"Creează\""],
    ru: ["Откройте Google Cloud Console","Выберите или создайте новый проект","Перейдите в «API и сервисы» → «Учётные данные»","Нажмите «Создать учётные данные» → «Идентификатор клиента OAuth»","Выберите тип «Веб-приложение»","Добавьте URL вашего приложения в «Разрешённые URI перенаправления»","Идентификатор клиента появится после нажатия «Создать»"]
  },
  'googleCalendar.settings.clientSecretSteps': {
    it: ["Segui la stessa procedura del Client ID","Dopo aver creato l'ID client OAuth, nella pagina ti verrà mostrato sia il Client ID che il Client Secret","Il Client Secret è una stringa che inizia con \"GOCSPX-\"","Copialo subito perché non sarà più visibile in seguito","Se lo perdi, dovrai generare un nuovo Client Secret dalla Console"],
    en: ["Follow the same steps as for the Client ID","After creating the OAuth client ID, the page will display both the Client ID and Client Secret","The Client Secret is a string starting with \"GOCSPX-\"","Copy it immediately because it won't be visible again","If you lose it, you'll need to generate a new Client Secret from the Console"],
    es: ["Sigue el mismo procedimiento que para el Client ID","Tras crear el ID de cliente OAuth, la página mostrará tanto el Client ID como el Client Secret","El Client Secret es una cadena que comienza con \"GOCSPX-\"","Cópialo de inmediato porque no volverá a estar visible","Si lo pierdes, deberás generar un nuevo Client Secret desde la Consola"],
    fr: ["Suivez la même procédure que pour le Client ID","Après création de l'ID client OAuth, la page affichera à la fois le Client ID et le Client Secret","Le Client Secret est une chaîne commençant par \"GOCSPX-\"","Copiez-le immédiatement car il ne sera plus visible","Si vous le perdez, vous devrez générer un nouveau Client Secret depuis la Console"],
    de: ["Folgen Sie demselben Verfahren wie für die Client ID","Nach dem Erstellen der OAuth-Client-ID werden Client ID und Client Secret angezeigt","Das Client Secret ist eine Zeichenfolge, die mit \"GOCSPX-\" beginnt","Kopieren Sie es sofort, da es später nicht mehr sichtbar sein wird","Bei Verlust müssen Sie ein neues Client Secret in der Console generieren"],
    nl: ["Volg dezelfde procedure als voor de Client ID","Na het maken van de OAuth-client-ID toont de pagina zowel de Client ID als het Client Secret","Het Client Secret is een tekenreeks die begint met \"GOCSPX-\"","Kopieer het meteen, want het is daarna niet meer zichtbaar","Bij verlies moet je een nieuw Client Secret in de Console aanmaken"],
    no: ["Følg samme fremgangsmåte som for Client ID","Etter at OAuth-klient-ID-en er opprettet, vises både Client ID og Client Secret","Client Secret er en streng som begynner med \"GOCSPX-\"","Kopier den med en gang fordi den ikke vil være synlig senere","Mister du den, må du generere en ny Client Secret fra konsollen"],
    ro: ["Urmează aceeași procedură ca pentru Client ID","După crearea ID-ului client OAuth, pagina va afișa atât Client ID, cât și Client Secret","Client Secret este un șir care începe cu \"GOCSPX-\"","Copiază-l imediat pentru că nu va mai fi vizibil","Dacă îl pierzi, va trebui să generezi un nou Client Secret din Consolă"],
    ru: ["Повторите ту же процедуру, что и для Client ID","После создания идентификатора клиента OAuth на странице будут показаны Client ID и Client Secret","Client Secret — строка, начинающаяся с «GOCSPX-»","Скопируйте его сразу, так как позже он не будет виден","Если потеряете, придётся создать новый Client Secret в Консоли"]
  },
  'googleCalendar.settings.clientIdPlaceholder': {
    it: "Il tuo Client ID di Google", en: "Your Google Client ID", es: "Tu Client ID de Google",
    fr: "Votre Client ID Google", de: "Ihre Google Client ID", nl: "Je Google Client ID",
    no: "Din Google Client ID", ro: "Client ID-ul tău Google", ru: "Ваш Google Client ID"
  },
  'googleCalendar.settings.clientSecretPlaceholder': {
    it: "Il tuo Client Secret di Google", en: "Your Google Client Secret", es: "Tu Client Secret de Google",
    fr: "Votre Client Secret Google", de: "Ihr Google Client Secret", nl: "Je Google Client Secret",
    no: "Din Google Client Secret", ro: "Client Secret-ul tău Google", ru: "Ваш Google Client Secret"
  },
  'googleCalendar.settings.consoleLink': {
    it: "Ottieni dalla Console Google Cloud", en: "Get from Google Cloud Console",
    es: "Obtener desde la Google Cloud Console", fr: "Obtenir depuis la Google Cloud Console",
    de: "Aus der Google Cloud Console abrufen", nl: "Ophalen uit Google Cloud Console",
    no: "Hent fra Google Cloud Console", ro: "Obține din Google Cloud Console",
    ru: "Получить в Google Cloud Console"
  },
  'googleCalendar.settings.startAuth': {
    it: "Inizia processo di autorizzazione", en: "Start authorization process",
    es: "Iniciar proceso de autorización", fr: "Démarrer le processus d'autorisation",
    de: "Autorisierungsprozess starten", nl: "Autorisatieproces starten",
    no: "Start autorisasjonsprosessen", ro: "Începe procesul de autorizare",
    ru: "Начать процесс авторизации"
  },
  'googleCalendar.settings.helpButton': {
    it: "Aiuto con la configurazione", en: "Setup help", es: "Ayuda con la configuración",
    fr: "Aide à la configuration", de: "Hilfe zur Einrichtung", nl: "Hulp bij installatie",
    no: "Hjelp med oppsett", ro: "Ajutor pentru configurare", ru: "Помощь по настройке"
  },
  'googleCalendar.settings.helpTitle': {
    it: "Guida passo-passo alla configurazione", en: "Step-by-step setup guide",
    es: "Guía paso a paso de configuración", fr: "Guide de configuration pas à pas",
    de: "Schritt-für-Schritt-Einrichtungsanleitung", nl: "Stapsgewijze installatiehandleiding",
    no: "Trinnvis oppsettsveiledning", ro: "Ghid de configurare pas cu pas",
    ru: "Пошаговое руководство по настройке"
  },
  'googleCalendar.settings.help1Title': {
    it: "1. Creazione progetto Google Cloud", en: "1. Create Google Cloud project",
    es: "1. Creación del proyecto Google Cloud", fr: "1. Création du projet Google Cloud",
    de: "1. Google Cloud-Projekt erstellen", nl: "1. Google Cloud-project maken",
    no: "1. Opprett Google Cloud-prosjekt", ro: "1. Creează proiect Google Cloud",
    ru: "1. Создание проекта Google Cloud"
  },
  'googleCalendar.settings.help1Steps': {
    it: ["Vai su Google Cloud Console","Crea un nuovo progetto (es. \"App Appuntamenti\")"],
    en: ["Go to Google Cloud Console","Create a new project (e.g. \"Appointments App\")"],
    es: ["Ve a Google Cloud Console","Crea un proyecto nuevo (p. ej. \"App Citas\")"],
    fr: ["Allez sur Google Cloud Console","Créez un nouveau projet (par ex. \"App Rendez-vous\")"],
    de: ["Gehen Sie zur Google Cloud Console","Erstellen Sie ein neues Projekt (z. B. \"Termine-App\")"],
    nl: ["Ga naar Google Cloud Console","Maak een nieuw project (bijv. \"Afsprakenapp\")"],
    no: ["Gå til Google Cloud Console","Opprett et nytt prosjekt (f.eks. \"Avtale-app\")"],
    ro: ["Mergi la Google Cloud Console","Creează un proiect nou (ex. \"App Programări\")"],
    ru: ["Перейдите в Google Cloud Console","Создайте новый проект (например, «App Записи»)"]
  },
  'googleCalendar.settings.help2Title': {
    it: "2. Abilita Google Calendar API", en: "2. Enable the Google Calendar API",
    es: "2. Habilitar Google Calendar API", fr: "2. Activez l'API Google Calendar",
    de: "2. Google Calendar API aktivieren", nl: "2. Google Calendar API inschakelen",
    no: "2. Aktiver Google Calendar API", ro: "2. Activează Google Calendar API",
    ru: "2. Включите Google Calendar API"
  },
  'googleCalendar.settings.help2Steps': {
    it: ["Nel menu laterale, vai su \"API e servizi\" → \"Libreria\"","Cerca \"Google Calendar API\" e selezionala","Clicca su \"Abilita\""],
    en: ["In the side menu, go to \"APIs & Services\" → \"Library\"","Search for \"Google Calendar API\" and select it","Click \"Enable\""],
    es: ["En el menú lateral, ve a \"APIs y servicios\" → \"Biblioteca\"","Busca \"Google Calendar API\" y selecciónala","Haz clic en \"Habilitar\""],
    fr: ["Dans le menu latéral, allez dans \"API et services\" → \"Bibliothèque\"","Cherchez \"Google Calendar API\" et sélectionnez-la","Cliquez sur \"Activer\""],
    de: ["Gehen Sie im Seitenmenü zu \"APIs & Dienste\" → \"Bibliothek\"","Suchen Sie nach \"Google Calendar API\" und wählen Sie sie aus","Klicken Sie auf \"Aktivieren\""],
    nl: ["Ga in het zijmenu naar \"API's en services\" → \"Bibliotheek\"","Zoek naar \"Google Calendar API\" en selecteer die","Klik op \"Inschakelen\""],
    no: ["I sidemenyen, gå til \"APIer og tjenester\" → \"Bibliotek\"","Søk etter \"Google Calendar API\" og velg den","Klikk \"Aktiver\""],
    ro: ["În meniul lateral, mergi la \"API-uri și servicii\" → \"Bibliotecă\"","Caută \"Google Calendar API\" și selecteaz-o","Apasă \"Activează\""],
    ru: ["В боковом меню перейдите в «API и сервисы» → «Библиотека»","Найдите «Google Calendar API» и выберите его","Нажмите «Включить»"]
  },
  'googleCalendar.settings.help3Title': {
    it: "3. Configura il consenso OAuth", en: "3. Configure OAuth consent",
    es: "3. Configurar consentimiento OAuth", fr: "3. Configurer le consentement OAuth",
    de: "3. OAuth-Zustimmung konfigurieren", nl: "3. OAuth-toestemming configureren",
    no: "3. Konfigurer OAuth-samtykke", ro: "3. Configurează consimțământul OAuth",
    ru: "3. Настройте согласие OAuth"
  },
  'googleCalendar.settings.help3Steps': {
    it: ["Nel menu laterale, vai su \"API e servizi\" → \"Schermata consenso OAuth\"","Seleziona \"Esterno\" e clicca \"Crea\"","Compila i campi obbligatori (nome app, email supporto)","In \"Domini autorizzati\" aggiungi il dominio della tua app","Per gli ambiti, aggiungi \"./auth/calendar\" e \"./auth/calendar.events\"","Aggiungi il tuo indirizzo email come utente di test"],
    en: ["In the side menu, go to \"APIs & Services\" → \"OAuth consent screen\"","Select \"External\" and click \"Create\"","Fill in required fields (app name, support email)","In \"Authorized domains\" add your app domain","For scopes, add \"./auth/calendar\" and \"./auth/calendar.events\"","Add your email as a test user"],
    es: ["En el menú lateral, ve a \"APIs y servicios\" → \"Pantalla de consentimiento OAuth\"","Selecciona \"Externo\" y haz clic en \"Crear\"","Rellena los campos obligatorios (nombre de la app, email de soporte)","En \"Dominios autorizados\" añade el dominio de tu app","Para los ámbitos, añade \"./auth/calendar\" y \"./auth/calendar.events\"","Añade tu email como usuario de prueba"],
    fr: ["Dans le menu latéral, allez dans \"API et services\" → \"Écran de consentement OAuth\"","Sélectionnez \"Externe\" et cliquez \"Créer\"","Remplissez les champs obligatoires (nom de l'app, email de support)","Dans \"Domaines autorisés\", ajoutez le domaine de votre app","Pour les portées, ajoutez \"./auth/calendar\" et \"./auth/calendar.events\"","Ajoutez votre email comme utilisateur de test"],
    de: ["Gehen Sie im Seitenmenü zu \"APIs & Dienste\" → \"OAuth-Zustimmungsbildschirm\"","Wählen Sie \"Extern\" und klicken Sie \"Erstellen\"","Füllen Sie Pflichtfelder aus (App-Name, Support-E-Mail)","Fügen Sie unter \"Autorisierte Domains\" Ihre App-Domain hinzu","Fügen Sie als Bereiche \"./auth/calendar\" und \"./auth/calendar.events\" hinzu","Fügen Sie Ihre E-Mail als Testnutzer hinzu"],
    nl: ["Ga in het zijmenu naar \"API's en services\" → \"OAuth-toestemmingsscherm\"","Selecteer \"Extern\" en klik op \"Maken\"","Vul de verplichte velden in (app-naam, support-e-mail)","Voeg bij \"Geautoriseerde domeinen\" je app-domein toe","Voeg bij scopes \"./auth/calendar\" en \"./auth/calendar.events\" toe","Voeg je e-mailadres toe als testgebruiker"],
    no: ["I sidemenyen, gå til \"APIer og tjenester\" → \"OAuth-samtykkeskjerm\"","Velg \"Ekstern\" og klikk \"Opprett\"","Fyll ut obligatoriske felt (appnavn, support-e-post)","Legg til app-domenet ditt under \"Autoriserte domener\"","For omfang, legg til \"./auth/calendar\" og \"./auth/calendar.events\"","Legg til e-postadressen din som testbruker"],
    ro: ["În meniul lateral, mergi la \"API-uri și servicii\" → \"Ecran de consimțământ OAuth\"","Selectează \"Extern\" și apasă \"Creează\"","Completează câmpurile obligatorii (nume aplicație, email suport)","În \"Domenii autorizate\" adaugă domeniul aplicației","Pentru scope-uri, adaugă \"./auth/calendar\" și \"./auth/calendar.events\"","Adaugă adresa ta de email ca utilizator de test"],
    ru: ["В боковом меню перейдите в «API и сервисы» → «Окно согласия OAuth»","Выберите «Внешний» и нажмите «Создать»","Заполните обязательные поля (название приложения, e-mail поддержки)","В «Разрешённые домены» добавьте домен вашего приложения","В качестве scope добавьте «./auth/calendar» и «./auth/calendar.events»","Добавьте свой e-mail как тестового пользователя"]
  },
  'googleCalendar.settings.help4Title': {
    it: "4. Crea le credenziali OAuth", en: "4. Create OAuth credentials",
    es: "4. Crear las credenciales OAuth", fr: "4. Créer les identifiants OAuth",
    de: "4. OAuth-Anmeldedaten erstellen", nl: "4. OAuth-inloggegevens maken",
    no: "4. Opprett OAuth-påloggingsinformasjon", ro: "4. Creează credențialele OAuth",
    ru: "4. Создайте учётные данные OAuth"
  },
  'googleCalendar.settings.help4Steps': {
    it: ["Nel menu laterale, vai su \"API e servizi\" → \"Credenziali\"","Clicca su \"Crea credenziali\" → \"ID client OAuth\"","Seleziona \"Applicazione Web\" come tipo","Aggiungi un nome (es. \"App Appuntamenti Web\")","In \"URI di reindirizzamento autorizzati\" aggiungi l'URL completo della pagina delle impostazioni (incluso \"https://\")","Clicca \"Crea\" e copia Client ID e Client Secret"],
    en: ["In the side menu, go to \"APIs & Services\" → \"Credentials\"","Click \"Create credentials\" → \"OAuth client ID\"","Select \"Web application\" as the type","Add a name (e.g. \"Appointments Web App\")","In \"Authorized redirect URIs\" add the full URL of the settings page (including \"https://\")","Click \"Create\" and copy the Client ID and Client Secret"],
    es: ["En el menú lateral, ve a \"APIs y servicios\" → \"Credenciales\"","Haz clic en \"Crear credenciales\" → \"ID de cliente OAuth\"","Selecciona \"Aplicación web\" como tipo","Añade un nombre (p. ej. \"App Citas Web\")","En \"URIs de redireccionamiento autorizados\" añade la URL completa de la página de ajustes (incluyendo \"https://\")","Haz clic en \"Crear\" y copia el Client ID y Client Secret"],
    fr: ["Dans le menu latéral, allez dans \"API et services\" → \"Identifiants\"","Cliquez sur \"Créer des identifiants\" → \"ID client OAuth\"","Sélectionnez \"Application Web\" comme type","Ajoutez un nom (par ex. \"App Rendez-vous Web\")","Dans \"URI de redirection autorisés\", ajoutez l'URL complète de la page des paramètres (incluant \"https://\")","Cliquez sur \"Créer\" et copiez le Client ID et le Client Secret"],
    de: ["Gehen Sie im Seitenmenü zu \"APIs & Dienste\" → \"Anmeldedaten\"","Klicken Sie auf \"Anmeldedaten erstellen\" → \"OAuth-Client-ID\"","Wählen Sie \"Webanwendung\" als Typ","Fügen Sie einen Namen hinzu (z. B. \"Termine Web-App\")","Fügen Sie unter \"Autorisierte Weiterleitungs-URIs\" die vollständige URL der Einstellungsseite hinzu (inkl. \"https://\")","Klicken Sie \"Erstellen\" und kopieren Sie Client ID und Client Secret"],
    nl: ["Ga in het zijmenu naar \"API's en services\" → \"Inloggegevens\"","Klik op \"Inloggegevens maken\" → \"OAuth-client-ID\"","Selecteer \"Webapplicatie\" als type","Voeg een naam toe (bijv. \"Afspraken Web-app\")","Voeg bij \"Toegestane omleidings-URI's\" de volledige URL van de instellingenpagina toe (inclusief \"https://\")","Klik op \"Maken\" en kopieer Client ID en Client Secret"],
    no: ["I sidemenyen, gå til \"APIer og tjenester\" → \"Påloggingsinformasjon\"","Klikk \"Opprett påloggingsinformasjon\" → \"OAuth-klient-ID\"","Velg \"Webapplikasjon\" som type","Legg til et navn (f.eks. \"Avtale Web-app\")","Under \"Autoriserte omdirigerings-URI-er\" legg til hele URL-en til innstillingssiden (inkludert \"https://\")","Klikk \"Opprett\" og kopier Client ID og Client Secret"],
    ro: ["În meniul lateral, mergi la \"API-uri și servicii\" → \"Credențiale\"","Apasă pe \"Creează credențiale\" → \"ID client OAuth\"","Selectează \"Aplicație web\" ca tip","Adaugă un nume (ex. \"App Programări Web\")","În \"URI-uri de redirecționare autorizate\" adaugă URL-ul complet al paginii de setări (inclusiv \"https://\")","Apasă \"Creează\" și copiază Client ID și Client Secret"],
    ru: ["В боковом меню перейдите в «API и сервисы» → «Учётные данные»","Нажмите «Создать учётные данные» → «Идентификатор клиента OAuth»","Выберите тип «Веб-приложение»","Добавьте название (например, «Web-приложение Записи»)","В «Разрешённые URI перенаправления» добавьте полный URL страницы настроек (включая «https://»)","Нажмите «Создать» и скопируйте Client ID и Client Secret"]
  },
  'googleCalendar.settings.instructionsTitle': {
    it: "Istruzioni per la configurazione:", en: "Setup instructions:",
    es: "Instrucciones de configuración:", fr: "Instructions de configuration :",
    de: "Einrichtungsanleitung:", nl: "Installatie-instructies:",
    no: "Installasjonsinstruksjoner:", ro: "Instrucțiuni de configurare:",
    ru: "Инструкции по настройке:"
  },
  'googleCalendar.settings.inst1Title': {
    it: "Crea un progetto su Google Cloud", en: "Create a Google Cloud project",
    es: "Crea un proyecto en Google Cloud", fr: "Créez un projet Google Cloud",
    de: "Erstellen Sie ein Google Cloud-Projekt", nl: "Maak een Google Cloud-project",
    no: "Opprett et Google Cloud-prosjekt", ro: "Creează un proiect Google Cloud",
    ru: "Создайте проект в Google Cloud"
  },
  'googleCalendar.settings.inst1Step1': {
    it: "Vai su", en: "Go to", es: "Ve a", fr: "Allez sur",
    de: "Gehen Sie zu", nl: "Ga naar", no: "Gå til", ro: "Mergi la", ru: "Перейдите на"
  },
  'googleCalendar.settings.inst1Step2': {
    it: "Crea un nuovo progetto o seleziona un progetto esistente",
    en: "Create a new project or select an existing one",
    es: "Crea un nuevo proyecto o selecciona uno existente",
    fr: "Créez un nouveau projet ou sélectionnez un projet existant",
    de: "Erstellen Sie ein neues Projekt oder wählen Sie ein vorhandenes",
    nl: "Maak een nieuw project of selecteer een bestaand project",
    no: "Opprett et nytt prosjekt eller velg et eksisterende",
    ro: "Creează un proiect nou sau selectează unul existent",
    ru: "Создайте новый проект или выберите существующий"
  },
  'googleCalendar.settings.inst2Title': {
    it: "Abilita le API di Google Calendar", en: "Enable the Google Calendar APIs",
    es: "Habilita las APIs de Google Calendar", fr: "Activez les API Google Calendar",
    de: "Aktivieren Sie die Google Calendar APIs", nl: "Schakel de Google Calendar API's in",
    no: "Aktiver Google Calendar APIer", ro: "Activează API-urile Google Calendar",
    ru: "Включите API Google Календаря"
  },
  'googleCalendar.settings.inst2Step2': {
    it: 'Cerca "Google Calendar API" e attivala',
    en: 'Search for "Google Calendar API" and enable it',
    es: 'Busca "Google Calendar API" y actívala',
    fr: 'Cherchez "Google Calendar API" et activez-la',
    de: 'Suchen Sie nach "Google Calendar API" und aktivieren Sie sie',
    nl: 'Zoek naar "Google Calendar API" en schakel deze in',
    no: 'Søk etter "Google Calendar API" og aktiver den',
    ro: 'Caută "Google Calendar API" și activeaz-o',
    ru: 'Найдите «Google Calendar API» и включите его'
  },
  'googleCalendar.settings.inst3Title': {
    it: "Configura le credenziali OAuth", en: "Configure OAuth credentials",
    es: "Configura las credenciales OAuth", fr: "Configurez les identifiants OAuth",
    de: "OAuth-Anmeldedaten konfigurieren", nl: "OAuth-inloggegevens configureren",
    no: "Konfigurer OAuth-påloggingsinformasjon", ro: "Configurează credențialele OAuth",
    ru: "Настройте учётные данные OAuth"
  },
  'googleCalendar.settings.inst3Steps': {
    it: ["Vai su","Clicca su \"Crea credenziali\" e seleziona \"ID Client OAuth\"","Configura la schermata di consenso OAuth (obbligatorio)","Aggiungi l'URL della tua app come \"URI di reindirizzamento autorizzato\"","Copia il Client ID e Client Secret nell'applicazione"],
    en: ["Go to","Click \"Create credentials\" and select \"OAuth Client ID\"","Configure the OAuth consent screen (required)","Add your app URL as an \"Authorized redirect URI\"","Copy the Client ID and Client Secret into the app"],
    es: ["Ve a","Haz clic en \"Crear credenciales\" y selecciona \"ID de Cliente OAuth\"","Configura la pantalla de consentimiento OAuth (obligatorio)","Añade la URL de tu app como \"URI de redireccionamiento autorizado\"","Copia el Client ID y Client Secret en la aplicación"],
    fr: ["Allez sur","Cliquez sur \"Créer des identifiants\" et sélectionnez \"ID client OAuth\"","Configurez l'écran de consentement OAuth (obligatoire)","Ajoutez l'URL de votre app comme \"URI de redirection autorisé\"","Copiez le Client ID et le Client Secret dans l'application"],
    de: ["Gehen Sie zu","Klicken Sie auf \"Anmeldedaten erstellen\" und wählen Sie \"OAuth-Client-ID\"","Konfigurieren Sie den OAuth-Zustimmungsbildschirm (erforderlich)","Fügen Sie die URL Ihrer App als \"Autorisierte Weiterleitungs-URI\" hinzu","Kopieren Sie Client ID und Client Secret in die Anwendung"],
    nl: ["Ga naar","Klik op \"Inloggegevens maken\" en selecteer \"OAuth-client-ID\"","Configureer het OAuth-toestemmingsscherm (verplicht)","Voeg de URL van je app toe als \"Toegestane omleidings-URI\"","Kopieer de Client ID en Client Secret naar de app"],
    no: ["Gå til","Klikk \"Opprett påloggingsinformasjon\" og velg \"OAuth-klient-ID\"","Konfigurer OAuth-samtykkeskjermen (obligatorisk)","Legg til app-URL-en som \"Autorisert omdirigerings-URI\"","Kopier Client ID og Client Secret inn i appen"],
    ro: ["Mergi la","Apasă pe \"Creează credențiale\" și selectează \"ID Client OAuth\"","Configurează ecranul de consimțământ OAuth (obligatoriu)","Adaugă URL-ul aplicației ca \"URI de redirecționare autorizat\"","Copiază Client ID și Client Secret în aplicație"],
    ru: ["Перейдите на","Нажмите «Создать учётные данные» и выберите «Идентификатор клиента OAuth»","Настройте окно согласия OAuth (обязательно)","Добавьте URL приложения как «Разрешённый URI перенаправления»","Скопируйте Client ID и Client Secret в приложение"]
  },
  'googleCalendar.settings.inst4Title': {
    it: "Completa l'autorizzazione", en: "Complete authorization",
    es: "Completa la autorización", fr: "Terminez l'autorisation",
    de: "Autorisierung abschließen", nl: "Autorisatie voltooien",
    no: "Fullfør autorisering", ro: "Finalizează autorizarea",
    ru: "Завершите авторизацию"
  },
  'googleCalendar.settings.inst4Steps': {
    it: ["Clicca su \"Inizia processo di autorizzazione\"","Segui le istruzioni nella finestra di dialogo"],
    en: ["Click \"Start authorization process\"","Follow the instructions in the dialog"],
    es: ["Haz clic en \"Iniciar proceso de autorización\"","Sigue las instrucciones en el cuadro de diálogo"],
    fr: ["Cliquez sur \"Démarrer le processus d'autorisation\"","Suivez les instructions dans la boîte de dialogue"],
    de: ["Klicken Sie auf \"Autorisierungsprozess starten\"","Folgen Sie den Anweisungen im Dialogfeld"],
    nl: ["Klik op \"Autorisatieproces starten\"","Volg de instructies in het dialoogvenster"],
    no: ["Klikk \"Start autorisasjonsprosessen\"","Følg instruksjonene i dialogboksen"],
    ro: ["Apasă pe \"Începe procesul de autorizare\"","Urmează instrucțiunile din fereastra de dialog"],
    ru: ["Нажмите «Начать процесс авторизации»","Следуйте инструкциям в диалоговом окне"]
  },
  'googleCalendar.settings.noteText': {
    it: "Gli appuntamenti verranno sincronizzati solo se l'opzione è attivata, l'autorizzazione è completata e l'indirizzo Gmail è corretto.",
    en: "Appointments will only be synced if the option is enabled, authorization is complete, and the Gmail address is correct.",
    es: "Las citas solo se sincronizarán si la opción está activada, la autorización se ha completado y la dirección Gmail es correcta.",
    fr: "Les rendez-vous ne seront synchronisés que si l'option est activée, l'autorisation est terminée et l'adresse Gmail est correcte.",
    de: "Termine werden nur synchronisiert, wenn die Option aktiviert ist, die Autorisierung abgeschlossen ist und die Gmail-Adresse korrekt ist.",
    nl: "Afspraken worden alleen gesynchroniseerd als de optie is ingeschakeld, de autorisatie is voltooid en het Gmail-adres correct is.",
    no: "Avtaler synkroniseres bare hvis alternativet er aktivert, autoriseringen er fullført og Gmail-adressen er riktig.",
    ro: "Programările vor fi sincronizate doar dacă opțiunea este activă, autorizarea este finalizată și adresa Gmail este corectă.",
    ru: "Встречи будут синхронизироваться только если опция включена, авторизация завершена и адрес Gmail указан верно."
  },
  'googleCalendar.settings.noteLabel': {
    it: "Nota:", en: "Note:", es: "Nota:", fr: "Note :", de: "Hinweis:",
    nl: "Opmerking:", no: "Merk:", ro: "Notă:", ru: "Примечание:"
  },
  'googleCalendar.settings.savingButton': {
    it: "Salvataggio in corso...", en: "Saving...", es: "Guardando...",
    fr: "Enregistrement...", de: "Wird gespeichert...", nl: "Opslaan...",
    no: "Lagrer...", ro: "Se salvează...", ru: "Сохранение..."
  },
  'googleCalendar.settings.saveButton': {
    it: "Salva impostazioni", en: "Save settings", es: "Guardar configuración",
    fr: "Enregistrer les paramètres", de: "Einstellungen speichern", nl: "Instellingen opslaan",
    no: "Lagre innstillinger", ro: "Salvează setările", ru: "Сохранить настройки"
  },
  'googleCalendar.settings.dialogTitle': {
    it: "Autorizza Google Calendar", en: "Authorize Google Calendar",
    es: "Autorizar Google Calendar", fr: "Autoriser Google Agenda",
    de: "Google Kalender autorisieren", nl: "Google Agenda autoriseren",
    no: "Autoriser Google Kalender", ro: "Autorizează Google Calendar",
    ru: "Авторизовать Google Календарь"
  },
  'googleCalendar.settings.dialogDesc': {
    it: "Per sincronizzare gli appuntamenti, devi autorizzare l'accesso al tuo account Google Calendar",
    en: "To sync appointments you need to authorize access to your Google Calendar account",
    es: "Para sincronizar las citas debes autorizar el acceso a tu cuenta de Google Calendar",
    fr: "Pour synchroniser vos rendez-vous, vous devez autoriser l'accès à votre compte Google Agenda",
    de: "Um Termine zu synchronisieren, müssen Sie den Zugriff auf Ihr Google Kalender-Konto autorisieren",
    nl: "Om afspraken te synchroniseren moet je toegang tot je Google Agenda-account autoriseren",
    no: "For å synkronisere avtaler må du autorisere tilgang til Google Kalender-kontoen din",
    ro: "Pentru a sincroniza programările trebuie să autorizezi accesul la contul Google Calendar",
    ru: "Чтобы синхронизировать встречи, разрешите доступ к вашему аккаунту Google Календаря"
  },
  'googleCalendar.settings.dialogInstr': {
    it: "Apri il seguente link e segui le istruzioni per autorizzare l'accesso a Google Calendar:",
    en: "Open the following link and follow the instructions to authorize access to Google Calendar:",
    es: "Abre el siguiente enlace y sigue las instrucciones para autorizar el acceso a Google Calendar:",
    fr: "Ouvrez le lien suivant et suivez les instructions pour autoriser l'accès à Google Agenda :",
    de: "Öffnen Sie den folgenden Link und folgen Sie den Anweisungen, um den Zugriff auf Google Kalender zu autorisieren:",
    nl: "Open de volgende link en volg de instructies om toegang tot Google Agenda te autoriseren:",
    no: "Åpne følgende lenke og følg instruksjonene for å autorisere tilgang til Google Kalender:",
    ro: "Deschide următorul link și urmează instrucțiunile pentru a autoriza accesul la Google Calendar:",
    ru: "Откройте следующую ссылку и следуйте инструкциям, чтобы разрешить доступ к Google Календарю:"
  },
  'googleCalendar.settings.dialogOpenLink': {
    it: "Apri pagina di autorizzazione Google", en: "Open Google authorization page",
    es: "Abrir página de autorización de Google", fr: "Ouvrir la page d'autorisation Google",
    de: "Google-Autorisierungsseite öffnen", nl: "Google-autorisatiepagina openen",
    no: "Åpne Google-autorisasjonsside", ro: "Deschide pagina de autorizare Google",
    ru: "Открыть страницу авторизации Google"
  },
  'googleCalendar.settings.dialogCodeLabel': {
    it: "Codice di autorizzazione", en: "Authorization code", es: "Código de autorización",
    fr: "Code d'autorisation", de: "Autorisierungscode", nl: "Autorisatiecode",
    no: "Autorisasjonskode", ro: "Cod de autorizare", ru: "Код авторизации"
  },
  'googleCalendar.settings.dialogCodePlaceholder': {
    it: "Incolla qui il codice fornito da Google", en: "Paste the code provided by Google here",
    es: "Pega aquí el código proporcionado por Google", fr: "Collez ici le code fourni par Google",
    de: "Den von Google bereitgestellten Code hier einfügen", nl: "Plak hier de door Google verstrekte code",
    no: "Lim inn koden fra Google her", ro: "Lipește aici codul furnizat de Google",
    ru: "Вставьте сюда код, предоставленный Google"
  },
  'googleCalendar.settings.verifying': {
    it: "Verifica in corso...", en: "Verifying...", es: "Verificando...",
    fr: "Vérification...", de: "Wird überprüft...", nl: "Verifiëren...",
    no: "Verifiserer...", ro: "Se verifică...", ru: "Проверка..."
  },
  'googleCalendar.settings.verifyCodeButton': {
    it: "Verifica codice", en: "Verify code", es: "Verificar código",
    fr: "Vérifier le code", de: "Code überprüfen", nl: "Code verifiëren",
    no: "Verifiser kode", ro: "Verifică codul", ru: "Проверить код"
  },
  'googleCalendar.settings.calendarSelectorTitle': {
    it: "Seleziona un calendario", en: "Select a calendar", es: "Selecciona un calendario",
    fr: "Sélectionner un agenda", de: "Kalender auswählen", nl: "Selecteer een agenda",
    no: "Velg en kalender", ro: "Selectează un calendar", ru: "Выберите календарь"
  },
  'googleCalendar.settings.calendarSelectorDesc': {
    it: "Scegli il calendario Google da utilizzare per la sincronizzazione",
    en: "Choose the Google Calendar to use for synchronization",
    es: "Elige el Google Calendar que usarás para la sincronización",
    fr: "Choisissez l'agenda Google à utiliser pour la synchronisation",
    de: "Wählen Sie den Google Kalender für die Synchronisierung",
    nl: "Kies de Google Agenda voor de synchronisatie",
    no: "Velg Google Kalender for synkronisering",
    ro: "Alege Google Calendar-ul pentru sincronizare",
    ru: "Выберите Google Календарь для синхронизации"
  },
  'googleCalendar.settings.primaryCalendar': {
    it: "Calendario principale", en: "Main calendar", es: "Calendario principal",
    fr: "Agenda principal", de: "Hauptkalender", nl: "Hoofdagenda",
    no: "Hovedkalender", ro: "Calendar principal", ru: "Основной календарь"
  },
  'googleCalendar.settings.noCalendars': {
    it: "Nessun calendario trovato nel tuo account Google",
    en: "No calendars found in your Google account",
    es: "No se han encontrado calendarios en tu cuenta de Google",
    fr: "Aucun agenda trouvé dans votre compte Google",
    de: "Keine Kalender in Ihrem Google-Konto gefunden",
    nl: "Geen agenda's gevonden in je Google-account",
    no: "Ingen kalendere funnet i Google-kontoen din",
    ro: "Nu s-au găsit calendare în contul tău Google",
    ru: "В вашем аккаунте Google не найдено календарей"
  },

  // ===== GoogleCalendarSetupPage.tsx =====
  'googleCalendar.setup.connError': {
    it: "Impossibile avviare la riconnessione", en: "Unable to start reconnection",
    es: "No se puede iniciar la reconexión", fr: "Impossible de lancer la reconnexion",
    de: "Wiederherstellung der Verbindung nicht möglich", nl: "Kan herverbinding niet starten",
    no: "Kan ikke starte gjentilkobling", ro: "Nu se poate iniția reconectarea",
    ru: "Не удалось начать повторное подключение"
  },
  'googleCalendar.setup.connErrorGeneric': {
    it: "Errore di connessione", en: "Connection error", es: "Error de conexión",
    fr: "Erreur de connexion", de: "Verbindungsfehler", nl: "Verbindingsfout",
    no: "Tilkoblingsfeil", ro: "Eroare de conexiune", ru: "Ошибка соединения"
  },
  'googleCalendar.setup.sessionExpired': {
    it: "Sessione scaduta. Effettua nuovamente il login.",
    en: "Session expired. Please log in again.",
    es: "La sesión ha caducado. Vuelve a iniciar sesión.",
    fr: "Session expirée. Veuillez vous reconnecter.",
    de: "Sitzung abgelaufen. Bitte erneut anmelden.",
    nl: "Sessie verlopen. Log opnieuw in.",
    no: "Økten er utløpt. Logg inn på nytt.",
    ro: "Sesiunea a expirat. Conectează-te din nou.",
    ru: "Сессия истекла. Войдите снова."
  },
  'googleCalendar.setup.syncCompleteFallback': {
    it: "Sincronizzazione completata!", en: "Sync complete!", es: "¡Sincronización completada!",
    fr: "Synchronisation terminée !", de: "Synchronisierung abgeschlossen!", nl: "Synchronisatie voltooid!",
    no: "Synkronisering fullført!", ro: "Sincronizare finalizată!", ru: "Синхронизация завершена!"
  },
  'googleCalendar.setup.syncToastTitle': {
    it: "✅ Sincronizzazione completata", en: "✅ Sync complete",
    es: "✅ Sincronización completada", fr: "✅ Synchronisation terminée",
    de: "✅ Synchronisierung abgeschlossen", nl: "✅ Synchronisatie voltooid",
    no: "✅ Synkronisering fullført", ro: "✅ Sincronizare finalizată",
    ru: "✅ Синхронизация завершена"
  },
  'googleCalendar.setup.syncToastDesc': {
    it: "Importati: {{imported}}, Esportati: {{exported}}",
    en: "Imported: {{imported}}, Exported: {{exported}}",
    es: "Importados: {{imported}}, Exportados: {{exported}}",
    fr: "Importés : {{imported}}, Exportés : {{exported}}",
    de: "Importiert: {{imported}}, Exportiert: {{exported}}",
    nl: "Geïmporteerd: {{imported}}, Geëxporteerd: {{exported}}",
    no: "Importert: {{imported}}, Eksportert: {{exported}}",
    ro: "Importate: {{imported}}, Exportate: {{exported}}",
    ru: "Импортировано: {{imported}}, Экспортировано: {{exported}}"
  },
  'googleCalendar.setup.syncErrorFallback': {
    it: "Errore durante la sincronizzazione", en: "Error during synchronization",
    es: "Error durante la sincronización", fr: "Erreur lors de la synchronisation",
    de: "Fehler während der Synchronisierung", nl: "Fout tijdens de synchronisatie",
    no: "Feil under synkronisering", ro: "Eroare la sincronizare",
    ru: "Ошибка во время синхронизации"
  },
  'googleCalendar.setup.syncErrorTitle': {
    it: "Errore sincronizzazione", en: "Sync error", es: "Error de sincronización",
    fr: "Erreur de synchronisation", de: "Synchronisierungsfehler", nl: "Synchronisatiefout",
    no: "Synkroniseringsfeil", ro: "Eroare de sincronizare", ru: "Ошибка синхронизации"
  },
  'googleCalendar.setup.contactsLoaded': {
    it: "Contatti caricati", en: "Contacts loaded", es: "Contactos cargados",
    fr: "Contacts chargés", de: "Kontakte geladen", nl: "Contacten geladen",
    no: "Kontakter lastet", ro: "Contacte încărcate", ru: "Контакты загружены"
  },
  'googleCalendar.setup.contactsFound': {
    it: "Trovati {{count}} contatti nella tua rubrica Google",
    en: "Found {{count}} contacts in your Google address book",
    es: "Se encontraron {{count}} contactos en tu libreta de Google",
    fr: "{{count}} contacts trouvés dans votre carnet d'adresses Google",
    de: "{{count}} Kontakte in Ihrem Google-Adressbuch gefunden",
    nl: "{{count}} contacten gevonden in je Google-adresboek",
    no: "Fant {{count}} kontakter i Google-adresseboken din",
    ro: "S-au găsit {{count}} contacte în agenda Google",
    ru: "Найдено {{count}} контактов в адресной книге Google"
  },
  'googleCalendar.setup.reconnectGoogle': {
    it: "Riconnetti Google", en: "Reconnect Google", es: "Reconectar Google",
    fr: "Reconnecter Google", de: "Google erneut verbinden", nl: "Google opnieuw verbinden",
    no: "Koble til Google på nytt", ro: "Reconectează Google", ru: "Переподключить Google"
  },
  'googleCalendar.setup.reconnectGoogleDesc': {
    it: "È necessario riconnettere il tuo account Google per accedere ai contatti.",
    en: "You need to reconnect your Google account to access contacts.",
    es: "Es necesario reconectar tu cuenta de Google para acceder a los contactos.",
    fr: "Vous devez reconnecter votre compte Google pour accéder aux contacts.",
    de: "Sie müssen Ihr Google-Konto erneut verbinden, um auf Kontakte zuzugreifen.",
    nl: "Je moet je Google-account opnieuw verbinden om toegang tot contacten te krijgen.",
    no: "Du må koble Google-kontoen til på nytt for å få tilgang til kontaktene.",
    ro: "Trebuie să reconectezi contul Google pentru a accesa contactele.",
    ru: "Необходимо переподключить аккаунт Google для доступа к контактам."
  },
  'googleCalendar.setup.contactsLoadError': {
    it: "Errore nel caricamento dei contatti", en: "Error loading contacts",
    es: "Error al cargar los contactos", fr: "Erreur lors du chargement des contacts",
    de: "Fehler beim Laden der Kontakte", nl: "Fout bij het laden van contacten",
    no: "Feil ved lasting av kontakter", ro: "Eroare la încărcarea contactelor",
    ru: "Ошибка загрузки контактов"
  },
  'googleCalendar.setup.importError': {
    it: "Errore nell'importazione", en: "Import error", es: "Error en la importación",
    fr: "Erreur d'importation", de: "Importfehler", nl: "Importfout",
    no: "Importfeil", ro: "Eroare la import", ru: "Ошибка импорта"
  },
  'googleCalendar.setup.importErrorContacts': {
    it: "Errore nell'importazione dei contatti", en: "Error importing contacts",
    es: "Error al importar los contactos", fr: "Erreur lors de l'importation des contacts",
    de: "Fehler beim Importieren der Kontakte", nl: "Fout bij het importeren van contacten",
    no: "Feil ved import av kontakter", ro: "Eroare la importul contactelor",
    ru: "Ошибка импорта контактов"
  },
  'googleCalendar.setup.importedToast': {
    it: "✅ Importazione completata", en: "✅ Import complete",
    es: "✅ Importación completada", fr: "✅ Importation terminée",
    de: "✅ Import abgeschlossen", nl: "✅ Import voltooid",
    no: "✅ Import fullført", ro: "✅ Import finalizat",
    ru: "✅ Импорт завершён"
  },
  'googleCalendar.setup.csvFileEmpty': {
    it: "File vuoto", en: "Empty file", es: "Archivo vacío",
    fr: "Fichier vide", de: "Leere Datei", nl: "Leeg bestand",
    no: "Tom fil", ro: "Fișier gol", ru: "Пустой файл"
  },
  'googleCalendar.setup.csvFileEmptyDesc': {
    it: "Il file CSV non contiene dati", en: "The CSV file contains no data",
    es: "El archivo CSV no contiene datos", fr: "Le fichier CSV ne contient aucune donnée",
    de: "Die CSV-Datei enthält keine Daten", nl: "Het CSV-bestand bevat geen gegevens",
    no: "CSV-filen inneholder ingen data", ro: "Fișierul CSV nu conține date",
    ru: "CSV-файл не содержит данных"
  },
  'googleCalendar.setup.csvInvalidFormat': {
    it: "Formato non valido", en: "Invalid format", es: "Formato no válido",
    fr: "Format non valide", de: "Ungültiges Format", nl: "Ongeldig formaat",
    no: "Ugyldig format", ro: "Format invalid", ru: "Недопустимый формат"
  },
  'googleCalendar.setup.csvInvalidFormatDesc': {
    it: "Il file deve contenere colonne: nome, email o telefono",
    en: "The file must contain columns: name, email or phone",
    es: "El archivo debe contener columnas: nombre, email o teléfono",
    fr: "Le fichier doit contenir les colonnes : nom, email ou téléphone",
    de: "Die Datei muss Spalten enthalten: Name, E-Mail oder Telefon",
    nl: "Het bestand moet de kolommen bevatten: naam, e-mail of telefoon",
    no: "Filen må inneholde kolonnene: navn, e-post eller telefon",
    ro: "Fișierul trebuie să conțină coloanele: nume, email sau telefon",
    ru: "Файл должен содержать столбцы: имя, e-mail или телефон"
  },
  'googleCalendar.setup.csvLoaded': {
    it: "File caricato", en: "File loaded", es: "Archivo cargado",
    fr: "Fichier chargé", de: "Datei geladen", nl: "Bestand geladen",
    no: "Fil lastet", ro: "Fișier încărcat", ru: "Файл загружен"
  },
  'googleCalendar.setup.csvLoadedDesc': {
    it: "Trovati {{count}} contatti nel file", en: "Found {{count}} contacts in the file",
    es: "Se encontraron {{count}} contactos en el archivo", fr: "{{count}} contacts trouvés dans le fichier",
    de: "{{count}} Kontakte in der Datei gefunden", nl: "{{count}} contacten gevonden in het bestand",
    no: "Fant {{count}} kontakter i filen", ro: "S-au găsit {{count}} contacte în fișier",
    ru: "В файле найдено {{count}} контактов"
  },
  'googleCalendar.setup.csvReadError': {
    it: "Errore lettura file", en: "File read error", es: "Error al leer el archivo",
    fr: "Erreur de lecture du fichier", de: "Fehler beim Lesen der Datei", nl: "Fout bij lezen bestand",
    no: "Feil ved lesing av fil", ro: "Eroare la citirea fișierului", ru: "Ошибка чтения файла"
  },
  'googleCalendar.setup.csvReadErrorDesc': {
    it: "Impossibile leggere il file CSV", en: "Unable to read the CSV file",
    es: "No se puede leer el archivo CSV", fr: "Impossible de lire le fichier CSV",
    de: "CSV-Datei kann nicht gelesen werden", nl: "Kan het CSV-bestand niet lezen",
    no: "Kan ikke lese CSV-filen", ro: "Nu se poate citi fișierul CSV",
    ru: "Не удалось прочитать CSV-файл"
  },
  'googleCalendar.setup.csvNoSelection': {
    it: "Nessun contatto selezionato", en: "No contact selected",
    es: "Ningún contacto seleccionado", fr: "Aucun contact sélectionné",
    de: "Kein Kontakt ausgewählt", nl: "Geen contact geselecteerd",
    no: "Ingen kontakt valgt", ro: "Niciun contact selectat",
    ru: "Контакт не выбран"
  },
  'googleCalendar.setup.csvNoSelectionDesc': {
    it: "Seleziona almeno un contatto da importare",
    en: "Select at least one contact to import",
    es: "Selecciona al menos un contacto para importar",
    fr: "Sélectionnez au moins un contact à importer",
    de: "Wählen Sie mindestens einen Kontakt zum Importieren aus",
    nl: "Selecteer ten minste één contact om te importeren",
    no: "Velg minst én kontakt å importere",
    ro: "Selectează cel puțin un contact pentru import",
    ru: "Выберите хотя бы один контакт для импорта"
  },
  'googleCalendar.setup.csvImportSuccess': {
    it: "Importazione completata", en: "Import complete", es: "Importación completada",
    fr: "Importation terminée", de: "Import abgeschlossen", nl: "Import voltooid",
    no: "Import fullført", ro: "Import finalizat", ru: "Импорт завершён"
  },
  'googleCalendar.setup.csvImported': {
    it: "Importati {{count}} contatti", en: "Imported {{count}} contacts",
    es: "Importados {{count}} contactos", fr: "{{count}} contacts importés",
    de: "{{count}} Kontakte importiert", nl: "{{count}} contacten geïmporteerd",
    no: "Importerte {{count}} kontakter", ro: "Importate {{count}} contacte",
    ru: "Импортировано {{count}} контактов"
  },
  'googleCalendar.setup.csvImportedSkipped': {
    it: "Importati {{count}} contatti, {{skipped}} già esistenti",
    en: "Imported {{count}} contacts, {{skipped}} already existed",
    es: "Importados {{count}} contactos, {{skipped}} ya existían",
    fr: "{{count}} contacts importés, {{skipped}} déjà existants",
    de: "{{count}} Kontakte importiert, {{skipped}} bereits vorhanden",
    nl: "{{count}} contacten geïmporteerd, {{skipped}} bestonden al",
    no: "Importerte {{count}} kontakter, {{skipped}} fantes allerede",
    ro: "Importate {{count}} contacte, {{skipped}} existau deja",
    ru: "Импортировано {{count}} контактов, {{skipped}} уже существовали"
  },
  'googleCalendar.setup.csvImportNotes': {
    it: "Importato da file CSV", en: "Imported from CSV file", es: "Importado desde archivo CSV",
    fr: "Importé depuis un fichier CSV", de: "Aus CSV-Datei importiert", nl: "Geïmporteerd uit CSV-bestand",
    no: "Importert fra CSV-fil", ro: "Importat din fișier CSV", ru: "Импортировано из CSV-файла"
  },
  'googleCalendar.setup.syncingButton': {
    it: "Sincronizzazione in corso...", en: "Syncing...", es: "Sincronizando...",
    fr: "Synchronisation en cours...", de: "Synchronisierung läuft...", nl: "Synchroniseren...",
    no: "Synkroniserer...", ro: "Se sincronizează...", ru: "Синхронизация..."
  },
  'googleCalendar.setup.syncNowButton': {
    it: "Sincronizza ora", en: "Sync now", es: "Sincronizar ahora",
    fr: "Synchroniser maintenant", de: "Jetzt synchronisieren", nl: "Nu synchroniseren",
    no: "Synkroniser nå", ro: "Sincronizează acum", ru: "Синхронизировать сейчас"
  },
  'googleCalendar.setup.contactsCardTitle': {
    it: "Sincronizzazione Contatti Google", en: "Google Contacts sync",
    es: "Sincronización de contactos de Google", fr: "Synchronisation des contacts Google",
    de: "Google Kontakte-Synchronisierung", nl: "Google Contacten-synchronisatie",
    no: "Synkronisering av Google-kontakter", ro: "Sincronizare contacte Google",
    ru: "Синхронизация контактов Google"
  },
  'googleCalendar.setup.contactsCardDesc': {
    it: "Importa i contatti dalla tua rubrica Google come clienti",
    en: "Import contacts from your Google address book as clients",
    es: "Importa los contactos de tu libreta de Google como clientes",
    fr: "Importez les contacts de votre carnet d'adresses Google comme clients",
    de: "Importieren Sie Kontakte aus Ihrem Google-Adressbuch als Kunden",
    nl: "Importeer contacten uit je Google-adresboek als klanten",
    no: "Importer kontakter fra Google-adresseboken som klienter",
    ro: "Importă contactele din agenda Google ca clienți",
    ru: "Импортируйте контакты из адресной книги Google как клиентов"
  },
  'googleCalendar.setup.testFeatureLong': {
    it: "🧪 Funzione in fase di test", en: "🧪 Feature in testing",
    es: "🧪 Función en fase de prueba", fr: "🧪 Fonction en phase de test",
    de: "🧪 Funktion in der Testphase", nl: "🧪 Functie in testfase",
    no: "🧪 Funksjon under testing", ro: "🧪 Funcție în testare",
    ru: "🧪 Функция на этапе тестирования"
  },
  'googleCalendar.setup.testFeatureLongDesc': {
    it: 'L\'importazione contatti Google è attualmente disponibile solo per gli utenti tester autorizzati. Se non sei tra i tester, potresti vedere un errore "Accesso bloccato" da Google.',
    en: 'Google contacts import is currently available only for authorized tester users. If you\'re not a tester, you may see an "Access blocked" error from Google.',
    es: 'La importación de contactos de Google solo está disponible para usuarios tester autorizados. Si no eres tester, puedes ver un error "Acceso bloqueado" de Google.',
    fr: 'L\'importation des contacts Google n\'est actuellement disponible que pour les utilisateurs testeurs autorisés. Si vous n\'êtes pas testeur, vous pouvez voir une erreur "Accès bloqué" de Google.',
    de: 'Der Google-Kontaktimport ist derzeit nur für autorisierte Testbenutzer verfügbar. Wenn Sie kein Tester sind, sehen Sie möglicherweise einen "Zugriff blockiert"-Fehler von Google.',
    nl: 'Google-contactenimport is momenteel alleen beschikbaar voor geautoriseerde testers. Als je geen tester bent, zie je mogelijk een "Toegang geblokkeerd"-fout van Google.',
    no: 'Import av Google-kontakter er for øyeblikket bare tilgjengelig for autoriserte testbrukere. Hvis du ikke er tester, kan du få en "Tilgang blokkert"-feil fra Google.',
    ro: 'Importul contactelor Google este momentan disponibil doar pentru utilizatorii tester autorizați. Dacă nu ești tester, poți vedea o eroare "Acces blocat" de la Google.',
    ru: 'Импорт контактов Google сейчас доступен только авторизованным тестировщикам. Если вы не тестировщик, вы можете увидеть ошибку «Доступ заблокирован» от Google.'
  },
  'googleCalendar.setup.reconnectNeeded': {
    it: "Connessione a Google Calendar inattiva", en: "Google Calendar connection inactive", es: "Conexión con Google Calendar inactiva",
    fr: "Connexion à Google Agenda inactive", de: "Google-Kalenderverbindung inaktiv", nl: "Google Agenda-verbinding inactief",
    no: "Google Kalender-tilkobling inaktiv", ro: "Conexiunea la Google Calendar este inactivă", ru: "Подключение к Google Календарю неактивно"
  },
  'googleCalendar.setup.reconnectNeededDesc': {
    it: "Per attivare la sincronizzazione con il proprio calendario Google, effettuare il collegamento.",
    en: "To activate synchronization with your Google Calendar, connect your Google account.",
    es: "Para activar la sincronización con tu calendario de Google, conecta tu cuenta de Google.",
    fr: "Pour activer la synchronisation avec votre agenda Google, connectez votre compte Google.",
    de: "Um die Synchronisierung mit Ihrem Google-Kalender zu aktivieren, verbinden Sie Ihr Google-Konto.",
    nl: "Activeer de synchronisatie met je Google Agenda door je Google-account te verbinden.",
    no: "Aktiver synkronisering med Google Kalender ved å koble til Google-kontoen din.",
    ro: "Pentru a activa sincronizarea cu calendarul Google, conectează contul Google.",
    ru: "Чтобы включить синхронизацию с Google Календарём, подключите аккаунт Google."
  },
  'googleCalendar.setup.loadingContacts': {
    it: "Caricamento contatti...", en: "Loading contacts...", es: "Cargando contactos...",
    fr: "Chargement des contacts...", de: "Kontakte werden geladen...", nl: "Contacten laden...",
    no: "Laster kontakter...", ro: "Se încarcă contactele...", ru: "Загрузка контактов..."
  },
  'googleCalendar.setup.loadContactsButton': {
    it: "Carica contatti da Google", en: "Load contacts from Google",
    es: "Cargar contactos desde Google", fr: "Charger les contacts depuis Google",
    de: "Kontakte von Google laden", nl: "Contacten laden vanuit Google",
    no: "Last kontakter fra Google", ro: "Încarcă contacte din Google",
    ru: "Загрузить контакты из Google"
  },
  'googleCalendar.setup.contactsCountFound': {
    it: "Trovati {{count}} contatti", en: "Found {{count}} contacts",
    es: "{{count}} contactos encontrados", fr: "{{count}} contacts trouvés",
    de: "{{count}} Kontakte gefunden", nl: "{{count}} contacten gevonden",
    no: "Fant {{count}} kontakter", ro: "S-au găsit {{count}} contacte",
    ru: "Найдено {{count}} контактов"
  },
  'googleCalendar.setup.contactsHint': {
    it: 'Seleziona i contatti da importare o usa "Importa tutti"',
    en: 'Select contacts to import or use "Import all"',
    es: 'Selecciona los contactos a importar o usa "Importar todos"',
    fr: 'Sélectionnez les contacts à importer ou utilisez "Tout importer"',
    de: 'Wählen Sie Kontakte zum Importieren oder verwenden Sie "Alle importieren"',
    nl: 'Selecteer contacten om te importeren of gebruik "Alles importeren"',
    no: 'Velg kontakter å importere eller bruk "Importer alle"',
    ro: 'Selectează contactele de importat sau folosește "Importă tot"',
    ru: 'Выберите контакты для импорта или используйте «Импортировать все»'
  },
  'googleCalendar.setup.deselectAll': {
    it: "Deseleziona tutti", en: "Deselect all", es: "Deseleccionar todos",
    fr: "Tout désélectionner", de: "Alle abwählen", nl: "Alles deselecteren",
    no: "Fjern alle", ro: "Deselectează tot", ru: "Снять выделение со всех"
  },
  'googleCalendar.setup.selectAll': {
    it: "Seleziona tutti", en: "Select all", es: "Seleccionar todos",
    fr: "Tout sélectionner", de: "Alle auswählen", nl: "Alles selecteren",
    no: "Velg alle", ro: "Selectează tot", ru: "Выбрать все"
  },
  'googleCalendar.setup.importAll': {
    it: "Importa tutti ({{count}})", en: "Import all ({{count}})",
    es: "Importar todos ({{count}})", fr: "Tout importer ({{count}})",
    de: "Alle importieren ({{count}})", nl: "Alles importeren ({{count}})",
    no: "Importer alle ({{count}})", ro: "Importă tot ({{count}})",
    ru: "Импортировать все ({{count}})"
  },
  'googleCalendar.setup.importSelected': {
    it: "Importa selezionati ({{count}})", en: "Import selected ({{count}})",
    es: "Importar seleccionados ({{count}})", fr: "Importer la sélection ({{count}})",
    de: "Auswahl importieren ({{count}})", nl: "Selectie importeren ({{count}})",
    no: "Importer valgte ({{count}})", ro: "Importă selectate ({{count}})",
    ru: "Импортировать выбранные ({{count}})"
  },
  'googleCalendar.setup.noName': {
    it: "Senza nome", en: "No name", es: "Sin nombre",
    fr: "Sans nom", de: "Ohne Namen", nl: "Geen naam",
    no: "Uten navn", ro: "Fără nume", ru: "Без имени"
  },
  'googleCalendar.setup.reloadContacts': {
    it: "Ricarica contatti", en: "Reload contacts", es: "Recargar contactos",
    fr: "Recharger les contacts", de: "Kontakte neu laden", nl: "Contacten herladen",
    no: "Last inn kontakter på nytt", ro: "Reîncarcă contactele", ru: "Перезагрузить контакты"
  },
  'googleCalendar.setup.contactsNote1': {
    it: "• I contatti già esistenti (stesso email o telefono) verranno saltati",
    en: "• Existing contacts (same email or phone) will be skipped",
    es: "• Los contactos ya existentes (mismo email o teléfono) se omitirán",
    fr: "• Les contacts déjà existants (même email ou téléphone) seront ignorés",
    de: "• Bereits vorhandene Kontakte (gleiche E-Mail oder Telefon) werden übersprungen",
    nl: "• Bestaande contacten (zelfde e-mail of telefoon) worden overgeslagen",
    no: "• Eksisterende kontakter (samme e-post eller telefon) hoppes over",
    ro: "• Contactele existente (același email sau telefon) vor fi omise",
    ru: "• Существующие контакты (тот же e-mail или телефон) будут пропущены"
  },
  'googleCalendar.setup.contactsNote2': {
    it: '• I contatti importati avranno la nota "Importato da Google Contacts"',
    en: '• Imported contacts will have the note "Imported from Google Contacts"',
    es: '• Los contactos importados tendrán la nota "Importado desde Google Contacts"',
    fr: '• Les contacts importés auront la note "Importé depuis Google Contacts"',
    de: '• Importierte Kontakte erhalten die Notiz "Aus Google Contacts importiert"',
    nl: '• Geïmporteerde contacten krijgen de notitie "Geïmporteerd uit Google Contacts"',
    no: '• Importerte kontakter får notatet "Importert fra Google Contacts"',
    ro: '• Contactele importate vor avea nota "Importat din Google Contacts"',
    ru: '• Импортированные контакты получат заметку «Импортировано из Google Contacts»'
  },
  'googleCalendar.setup.csvCardTitle': {
    it: "Importa da File (CSV/vCard)", en: "Import from file (CSV/vCard)",
    es: "Importar desde archivo (CSV/vCard)", fr: "Importer depuis un fichier (CSV/vCard)",
    de: "Aus Datei importieren (CSV/vCard)", nl: "Importeren uit bestand (CSV/vCard)",
    no: "Importer fra fil (CSV/vCard)", ro: "Importă din fișier (CSV/vCard)",
    ru: "Импорт из файла (CSV/vCard)"
  },
  'googleCalendar.setup.csvCardDesc': {
    it: "Per chi non usa Gmail: importa i contatti dal telefono o da altri servizi",
    en: "For non-Gmail users: import contacts from your phone or other services",
    es: "Para quienes no usan Gmail: importa contactos desde el teléfono u otros servicios",
    fr: "Pour ceux qui n'utilisent pas Gmail : importez les contacts depuis votre téléphone ou d'autres services",
    de: "Für Nicht-Gmail-Nutzer: Importieren Sie Kontakte vom Telefon oder anderen Diensten",
    nl: "Voor niet-Gmail-gebruikers: importeer contacten van je telefoon of andere diensten",
    no: "For ikke-Gmail-brukere: importer kontakter fra telefonen eller andre tjenester",
    ro: "Pentru cei care nu folosesc Gmail: importă contactele din telefon sau alte servicii",
    ru: "Для тех, кто не использует Gmail: импортируйте контакты с телефона или из других сервисов"
  },
  'googleCalendar.setup.csvHowToTitle': {
    it: "Come esportare i contatti dal telefono", en: "How to export contacts from your phone",
    es: "Cómo exportar contactos desde el teléfono", fr: "Comment exporter les contacts depuis votre téléphone",
    de: "So exportieren Sie Kontakte vom Telefon", nl: "Contacten exporteren vanaf je telefoon",
    no: "Slik eksporterer du kontakter fra telefonen", ro: "Cum exporți contactele din telefon",
    ru: "Как экспортировать контакты с телефона"
  },
  'googleCalendar.setup.csvIphone': {
    it: "📱 iPhone (iCloud)", en: "📱 iPhone (iCloud)", es: "📱 iPhone (iCloud)",
    fr: "📱 iPhone (iCloud)", de: "📱 iPhone (iCloud)", nl: "📱 iPhone (iCloud)",
    no: "📱 iPhone (iCloud)", ro: "📱 iPhone (iCloud)", ru: "📱 iPhone (iCloud)"
  },
  'googleCalendar.setup.csvIphoneSteps': {
    it: ["Vai su <strong>icloud.com/contacts</strong> dal computer","Seleziona i contatti da esportare (o \"Seleziona tutto\")","Clicca l'icona ingranaggio → <strong>Esporta vCard</strong>","Converti il file .vcf in CSV con un convertitore online"],
    en: ["Go to <strong>icloud.com/contacts</strong> from your computer","Select the contacts to export (or \"Select all\")","Click the gear icon → <strong>Export vCard</strong>","Convert the .vcf file to CSV with an online converter"],
    es: ["Ve a <strong>icloud.com/contacts</strong> desde el ordenador","Selecciona los contactos a exportar (o \"Seleccionar todo\")","Haz clic en el icono de engranaje → <strong>Exportar vCard</strong>","Convierte el archivo .vcf a CSV con un conversor online"],
    fr: ["Allez sur <strong>icloud.com/contacts</strong> depuis votre ordinateur","Sélectionnez les contacts à exporter (ou \"Tout sélectionner\")","Cliquez sur l'icône engrenage → <strong>Exporter la vCard</strong>","Convertissez le fichier .vcf en CSV avec un convertisseur en ligne"],
    de: ["Gehen Sie am Computer zu <strong>icloud.com/contacts</strong>","Wählen Sie die zu exportierenden Kontakte aus (oder \"Alle auswählen\")","Klicken Sie auf das Zahnradsymbol → <strong>vCard exportieren</strong>","Konvertieren Sie die .vcf-Datei mit einem Online-Konverter in CSV"],
    nl: ["Ga op je computer naar <strong>icloud.com/contacts</strong>","Selecteer de te exporteren contacten (of \"Alles selecteren\")","Klik op het tandwielicoon → <strong>vCard exporteren</strong>","Converteer het .vcf-bestand met een online converter naar CSV"],
    no: ["Gå til <strong>icloud.com/contacts</strong> fra datamaskinen","Velg kontaktene som skal eksporteres (eller \"Velg alle\")","Klikk tannhjul-ikonet → <strong>Eksporter vCard</strong>","Konverter .vcf-filen til CSV med en konverter på nettet"],
    ro: ["Mergi la <strong>icloud.com/contacts</strong> de pe computer","Selectează contactele de exportat (sau \"Selectează tot\")","Apasă pictograma rotiță → <strong>Exportă vCard</strong>","Convertește fișierul .vcf în CSV cu un convertor online"],
    ru: ["Откройте <strong>icloud.com/contacts</strong> на компьютере","Выберите контакты для экспорта (или «Выбрать всё»)","Нажмите на иконку шестерёнки → <strong>Экспорт vCard</strong>","Преобразуйте файл .vcf в CSV с помощью онлайн-конвертера"]
  },
  'googleCalendar.setup.csvAndroid': {
    it: "📱 Android (senza Gmail)", en: "📱 Android (no Gmail)", es: "📱 Android (sin Gmail)",
    fr: "📱 Android (sans Gmail)", de: "📱 Android (ohne Gmail)", nl: "📱 Android (zonder Gmail)",
    no: "📱 Android (uten Gmail)", ro: "📱 Android (fără Gmail)", ru: "📱 Android (без Gmail)"
  },
  'googleCalendar.setup.csvAndroidSteps': {
    it: ["Apri l'app <strong>Contatti</strong> sul telefono","Menu → <strong>Impostazioni</strong> → <strong>Esporta</strong>","Scegli <strong>Esporta in file .vcf</strong>","Invia il file al computer e convertilo in CSV"],
    en: ["Open the <strong>Contacts</strong> app on your phone","Menu → <strong>Settings</strong> → <strong>Export</strong>","Choose <strong>Export to .vcf file</strong>","Send the file to your computer and convert it to CSV"],
    es: ["Abre la app <strong>Contactos</strong> en el teléfono","Menú → <strong>Ajustes</strong> → <strong>Exportar</strong>","Elige <strong>Exportar a archivo .vcf</strong>","Envía el archivo al ordenador y conviértelo a CSV"],
    fr: ["Ouvrez l'app <strong>Contacts</strong> sur votre téléphone","Menu → <strong>Paramètres</strong> → <strong>Exporter</strong>","Choisissez <strong>Exporter en fichier .vcf</strong>","Envoyez le fichier sur votre ordinateur et convertissez-le en CSV"],
    de: ["Öffnen Sie die App <strong>Kontakte</strong> auf Ihrem Telefon","Menü → <strong>Einstellungen</strong> → <strong>Exportieren</strong>","Wählen Sie <strong>In .vcf-Datei exportieren</strong>","Senden Sie die Datei an den Computer und konvertieren Sie sie in CSV"],
    nl: ["Open de <strong>Contacten</strong>-app op je telefoon","Menu → <strong>Instellingen</strong> → <strong>Exporteren</strong>","Kies <strong>Exporteren naar .vcf-bestand</strong>","Stuur het bestand naar je computer en converteer het naar CSV"],
    no: ["Åpne appen <strong>Kontakter</strong> på telefonen","Meny → <strong>Innstillinger</strong> → <strong>Eksporter</strong>","Velg <strong>Eksporter til .vcf-fil</strong>","Send filen til datamaskinen og konverter den til CSV"],
    ro: ["Deschide aplicația <strong>Contacte</strong> de pe telefon","Meniu → <strong>Setări</strong> → <strong>Exportă</strong>","Alege <strong>Exportă în fișier .vcf</strong>","Trimite fișierul pe computer și convertește-l în CSV"],
    ru: ["Откройте приложение <strong>Контакты</strong> на телефоне","Меню → <strong>Настройки</strong> → <strong>Экспорт</strong>","Выберите <strong>Экспорт в файл .vcf</strong>","Отправьте файл на компьютер и преобразуйте его в CSV"]
  },
  'googleCalendar.setup.csvOutlook': {
    it: "💻 Outlook / Microsoft", en: "💻 Outlook / Microsoft", es: "💻 Outlook / Microsoft",
    fr: "💻 Outlook / Microsoft", de: "💻 Outlook / Microsoft", nl: "💻 Outlook / Microsoft",
    no: "💻 Outlook / Microsoft", ro: "💻 Outlook / Microsoft", ru: "💻 Outlook / Microsoft"
  },
  'googleCalendar.setup.csvOutlookSteps': {
    it: ["Apri <strong>Outlook.com</strong> → Persone","Clicca <strong>Gestisci</strong> → <strong>Esporta contatti</strong>","Scegli formato <strong>CSV</strong>"],
    en: ["Open <strong>Outlook.com</strong> → People","Click <strong>Manage</strong> → <strong>Export contacts</strong>","Choose <strong>CSV</strong> format"],
    es: ["Abre <strong>Outlook.com</strong> → Personas","Haz clic en <strong>Administrar</strong> → <strong>Exportar contactos</strong>","Elige formato <strong>CSV</strong>"],
    fr: ["Ouvrez <strong>Outlook.com</strong> → Personnes","Cliquez <strong>Gérer</strong> → <strong>Exporter les contacts</strong>","Choisissez le format <strong>CSV</strong>"],
    de: ["Öffnen Sie <strong>Outlook.com</strong> → Personen","Klicken Sie <strong>Verwalten</strong> → <strong>Kontakte exportieren</strong>","Wählen Sie das <strong>CSV</strong>-Format"],
    nl: ["Open <strong>Outlook.com</strong> → Personen","Klik op <strong>Beheren</strong> → <strong>Contacten exporteren</strong>","Kies <strong>CSV</strong>-formaat"],
    no: ["Åpne <strong>Outlook.com</strong> → Personer","Klikk <strong>Administrer</strong> → <strong>Eksporter kontakter</strong>","Velg <strong>CSV</strong>-format"],
    ro: ["Deschide <strong>Outlook.com</strong> → Persoane","Apasă <strong>Gestionează</strong> → <strong>Exportă contacte</strong>","Alege formatul <strong>CSV</strong>"],
    ru: ["Откройте <strong>Outlook.com</strong> → Люди","Нажмите <strong>Управление</strong> → <strong>Экспорт контактов</strong>","Выберите формат <strong>CSV</strong>"]
  },
  'googleCalendar.setup.csvFormatTitle': {
    it: "📋 Formato file richiesto", en: "📋 Required file format",
    es: "📋 Formato de archivo requerido", fr: "📋 Format de fichier requis",
    de: "📋 Erforderliches Dateiformat", nl: "📋 Vereist bestandsformaat",
    no: "📋 Påkrevd filformat", ro: "📋 Format de fișier necesar",
    ru: "📋 Требуемый формат файла"
  },
  'googleCalendar.setup.csvFormatDesc': {
    it: "Il file CSV deve avere le colonne: <strong>Nome</strong>, <strong>Email</strong>, <strong>Telefono</strong>",
    en: "The CSV file must have columns: <strong>Name</strong>, <strong>Email</strong>, <strong>Phone</strong>",
    es: "El archivo CSV debe tener columnas: <strong>Nombre</strong>, <strong>Email</strong>, <strong>Teléfono</strong>",
    fr: "Le fichier CSV doit avoir les colonnes : <strong>Nom</strong>, <strong>Email</strong>, <strong>Téléphone</strong>",
    de: "Die CSV-Datei muss Spalten haben: <strong>Name</strong>, <strong>E-Mail</strong>, <strong>Telefon</strong>",
    nl: "Het CSV-bestand moet de kolommen hebben: <strong>Naam</strong>, <strong>E-mail</strong>, <strong>Telefoon</strong>",
    no: "CSV-filen må ha kolonnene: <strong>Navn</strong>, <strong>E-post</strong>, <strong>Telefon</strong>",
    ro: "Fișierul CSV trebuie să aibă coloanele: <strong>Nume</strong>, <strong>Email</strong>, <strong>Telefon</strong>",
    ru: "CSV-файл должен содержать столбцы: <strong>Имя</strong>, <strong>E-mail</strong>, <strong>Телефон</strong>"
  },
  'googleCalendar.setup.csvUploadHint': {
    it: "Clicca per caricare un file CSV", en: "Click to upload a CSV file",
    es: "Haz clic para cargar un archivo CSV", fr: "Cliquez pour charger un fichier CSV",
    de: "Klicken Sie, um eine CSV-Datei hochzuladen", nl: "Klik om een CSV-bestand te uploaden",
    no: "Klikk for å laste opp en CSV-fil", ro: "Apasă pentru a încărca un fișier CSV",
    ru: "Нажмите, чтобы загрузить CSV-файл"
  },
  'googleCalendar.setup.csvSelectedN': {
    it: "{{count}} selezionati per l'importazione", en: "{{count}} selected for import",
    es: "{{count}} seleccionados para importar", fr: "{{count}} sélectionnés pour l'importation",
    de: "{{count}} für den Import ausgewählt", nl: "{{count}} geselecteerd voor import",
    no: "{{count}} valgt for import", ro: "{{count}} selectate pentru import",
    ru: "Выбрано {{count}} для импорта"
  },
  'googleCalendar.setup.csvImporting': {
    it: "Importazione...", en: "Importing...", es: "Importando...",
    fr: "Importation...", de: "Wird importiert...", nl: "Importeren...",
    no: "Importerer...", ro: "Se importă...", ru: "Импорт..."
  },
  'googleCalendar.setup.csvImportButton': {
    it: "Importa {{count}} contatti", en: "Import {{count}} contacts",
    es: "Importar {{count}} contactos", fr: "Importer {{count}} contacts",
    de: "{{count}} Kontakte importieren", nl: "{{count}} contacten importeren",
    no: "Importer {{count}} kontakter", ro: "Importă {{count}} contacte",
    ru: "Импортировать {{count}} контактов"
  },
  'googleCalendar.setup.csvNote1': {
    it: "• Formati supportati: CSV (separatore virgola o punto e virgola)",
    en: "• Supported formats: CSV (comma or semicolon separator)",
    es: "• Formatos compatibles: CSV (separador coma o punto y coma)",
    fr: "• Formats supportés : CSV (séparateur virgule ou point-virgule)",
    de: "• Unterstützte Formate: CSV (Komma oder Semikolon als Trennzeichen)",
    nl: "• Ondersteunde formaten: CSV (komma- of puntkomma-scheidingsteken)",
    no: "• Støttede formater: CSV (komma- eller semikolon-skilletegn)",
    ro: "• Formate acceptate: CSV (separator virgulă sau punct și virgulă)",
    ru: "• Поддерживаемые форматы: CSV (разделитель запятая или точка с запятой)"
  },
  'googleCalendar.setup.csvNote2': {
    it: "• I contatti già esistenti verranno saltati automaticamente",
    en: "• Already existing contacts will be skipped automatically",
    es: "• Los contactos ya existentes se omitirán automáticamente",
    fr: "• Les contacts déjà existants seront ignorés automatiquement",
    de: "• Bereits vorhandene Kontakte werden automatisch übersprungen",
    nl: "• Reeds bestaande contacten worden automatisch overgeslagen",
    no: "• Eksisterende kontakter hoppes automatisk over",
    ro: "• Contactele existente vor fi omise automat",
    ru: "• Уже существующие контакты будут автоматически пропущены"
  },
  'googleCalendar.setup.syncStatusTitle': {
    it: "Stato sincronizzazione", en: "Sync status", es: "Estado de sincronización",
    fr: "État de la synchronisation", de: "Synchronisierungsstatus", nl: "Synchronisatiestatus",
    no: "Synkroniseringsstatus", ro: "Stare sincronizare", ru: "Статус синхронизации"
  },
  'googleCalendar.setup.lastSyncDate': {
    it: "Ultima sincronizzazione: {{date}}", en: "Last sync: {{date}}",
    es: "Última sincronización: {{date}}", fr: "Dernière synchronisation : {{date}}",
    de: "Letzte Synchronisierung: {{date}}", nl: "Laatste synchronisatie: {{date}}",
    no: "Siste synkronisering: {{date}}", ro: "Ultima sincronizare: {{date}}",
    ru: "Последняя синхронизация: {{date}}"
  },
  'googleCalendar.setup.syncedEventsN': {
    it: "Eventi sincronizzati: {{count}}", en: "Synced events: {{count}}",
    es: "Eventos sincronizados: {{count}}", fr: "Événements synchronisés : {{count}}",
    de: "Synchronisierte Termine: {{count}}", nl: "Gesynchroniseerde gebeurtenissen: {{count}}",
    no: "Synkroniserte hendelser: {{count}}", ro: "Evenimente sincronizate: {{count}}",
    ru: "Синхронизировано событий: {{count}}"
  },
};

function setDeep(obj: any, path: string, value: any) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur[parts[i]] === undefined || typeof cur[parts[i]] !== 'object' || Array.isArray(cur[parts[i]])) {
      cur[parts[i]] = {};
    }
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

const localesDir = path.resolve(process.cwd(), 'client', 'src', 'locales');
for (const lang of LANGS) {
  const file = path.join(localesDir, `${lang}.json`);
  const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
  let added = 0;
  for (const [key, langMap] of Object.entries(KEYS)) {
    const value = (langMap as any)[lang];
    if (value === undefined) {
      console.warn(`Missing translation for ${key} in ${lang}`);
      continue;
    }
    setDeep(data, key, value);
    added++;
  }
  fs.writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
  console.log(`${lang}: wrote ${added} keys`);
}
