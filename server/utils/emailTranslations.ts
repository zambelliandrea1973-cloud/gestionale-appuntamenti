/**
 * Server-side translation strings for email templates and invoice PDFs.
 * Covers all 9 supported languages: it, en, de, fr, es, ru, nl, no, ro
 */

export type SupportedLang = 'it' | 'en' | 'de' | 'fr' | 'es' | 'ru' | 'nl' | 'no' | 'ro';

export const SUPPORTED_LANGS: SupportedLang[] = ['it', 'en', 'de', 'fr', 'es', 'ru', 'nl', 'no', 'ro'];

/** Normalize a raw language string to one of the supported codes. */
export function normalizeLang(raw: string | undefined | null): SupportedLang {
  if (!raw) return 'it';
  const base = raw.toLowerCase().split(/[-_]/)[0];
  if ((SUPPORTED_LANGS as string[]).includes(base)) return base as SupportedLang;
  return 'it';
}

/** Map language code to a BCP-47 locale string for date formatting. */
export const LOCALE_MAP: Record<SupportedLang, string> = {
  it: 'it-IT',
  en: 'en-GB',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  ru: 'ru-RU',
  nl: 'nl-NL',
  no: 'nb-NO',
  ro: 'ro-RO',
};

export function formatDate(date: Date | string, lang: SupportedLang): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE_MAP[lang], { day: '2-digit', month: 'long', year: 'numeric' });
}

export function formatDateShort(date: Date | string, lang: SupportedLang): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString(LOCALE_MAP[lang]);
}

// ---------------------------------------------------------------------------
// Welcome email translations
// ---------------------------------------------------------------------------
export interface WelcomeEmailStrings {
  subject: string;
  title: string;
  greeting: string;
  registrationSuccess: string;
  credentialsTitle: string;
  usernameLabel: string;
  passwordLabel: string;
  importantNote: string;
  trialNote: string;
  accessButton: string;
  helpText: string;
  thankYou: string;
}

const welcomeTranslations: Record<SupportedLang, WelcomeEmailStrings> = {
  it: {
    subject: 'Benvenuto su Appointment Manager - Le tue credenziali di accesso',
    title: 'Benvenuto su Appointment Manager!',
    greeting: 'Ciao',
    registrationSuccess: 'La tua registrazione è avvenuta con successo! Puoi ora accedere alla piattaforma per gestire i tuoi appuntamenti in modo semplice e professionale.',
    credentialsTitle: 'Le tue credenziali di accesso',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    importantNote: 'Importante: Ti consigliamo di conservare queste credenziali in un posto sicuro e di cambiare la password al primo accesso.',
    trialNote: 'Hai <strong>40 giorni di prova gratuita</strong> per esplorare tutte le funzionalità della piattaforma!',
    accessButton: 'Accedi alla Piattaforma',
    helpText: 'Se hai domande o hai bisogno di assistenza, non esitare a contattarci.',
    thankYou: 'Grazie per aver scelto Appointment Manager!',
  },
  en: {
    subject: 'Welcome to Appointment Manager - Your login credentials',
    title: 'Welcome to Appointment Manager!',
    greeting: 'Hello',
    registrationSuccess: 'Your registration has been completed successfully! You can now access the platform to manage your appointments easily and professionally.',
    credentialsTitle: 'Your login credentials',
    usernameLabel: 'Username',
    passwordLabel: 'Password',
    importantNote: 'Important: We recommend keeping these credentials in a safe place and changing your password on first login.',
    trialNote: 'You have <strong>40 days of free trial</strong> to explore all platform features!',
    accessButton: 'Access the Platform',
    helpText: 'If you have any questions or need assistance, please do not hesitate to contact us.',
    thankYou: 'Thank you for choosing Appointment Manager!',
  },
  de: {
    subject: 'Willkommen bei Appointment Manager - Ihre Zugangsdaten',
    title: 'Willkommen bei Appointment Manager!',
    greeting: 'Hallo',
    registrationSuccess: 'Ihre Registrierung war erfolgreich! Sie können nun auf die Plattform zugreifen, um Ihre Termine einfach und professionell zu verwalten.',
    credentialsTitle: 'Ihre Zugangsdaten',
    usernameLabel: 'Benutzername',
    passwordLabel: 'Passwort',
    importantNote: 'Wichtig: Wir empfehlen, diese Zugangsdaten sicher aufzubewahren und das Passwort bei der ersten Anmeldung zu ändern.',
    trialNote: 'Sie haben <strong>40 Tage kostenlose Testphase</strong>, um alle Plattformfunktionen auszuprobieren!',
    accessButton: 'Zur Plattform',
    helpText: 'Wenn Sie Fragen haben oder Hilfe benötigen, zögern Sie nicht, uns zu kontaktieren.',
    thankYou: 'Vielen Dank, dass Sie Appointment Manager gewählt haben!',
  },
  fr: {
    subject: 'Bienvenue sur Appointment Manager - Vos identifiants de connexion',
    title: 'Bienvenue sur Appointment Manager !',
    greeting: 'Bonjour',
    registrationSuccess: 'Votre inscription a été réalisée avec succès ! Vous pouvez désormais accéder à la plateforme pour gérer vos rendez-vous facilement et professionnellement.',
    credentialsTitle: 'Vos identifiants de connexion',
    usernameLabel: 'Nom d\'utilisateur',
    passwordLabel: 'Mot de passe',
    importantNote: 'Important : Nous vous recommandons de conserver ces identifiants en lieu sûr et de changer votre mot de passe lors de votre première connexion.',
    trialNote: 'Vous bénéficiez de <strong>40 jours d\'essai gratuit</strong> pour explorer toutes les fonctionnalités de la plateforme !',
    accessButton: 'Accéder à la Plateforme',
    helpText: 'Si vous avez des questions ou besoin d\'aide, n\'hésitez pas à nous contacter.',
    thankYou: 'Merci d\'avoir choisi Appointment Manager !',
  },
  es: {
    subject: 'Bienvenido a Appointment Manager - Tus credenciales de acceso',
    title: '¡Bienvenido a Appointment Manager!',
    greeting: 'Hola',
    registrationSuccess: '¡Tu registro se ha completado con éxito! Ahora puedes acceder a la plataforma para gestionar tus citas de forma fácil y profesional.',
    credentialsTitle: 'Tus credenciales de acceso',
    usernameLabel: 'Usuario',
    passwordLabel: 'Contraseña',
    importantNote: 'Importante: Te recomendamos guardar estas credenciales en un lugar seguro y cambiar tu contraseña en el primer inicio de sesión.',
    trialNote: 'Tienes <strong>40 días de prueba gratuita</strong> para explorar todas las funcionalidades de la plataforma.',
    accessButton: 'Acceder a la Plataforma',
    helpText: 'Si tienes alguna pregunta o necesitas ayuda, no dudes en contactarnos.',
    thankYou: '¡Gracias por elegir Appointment Manager!',
  },
  ru: {
    subject: 'Добро пожаловать в Appointment Manager — Ваши данные для входа',
    title: 'Добро пожаловать в Appointment Manager!',
    greeting: 'Здравствуйте',
    registrationSuccess: 'Ваша регистрация прошла успешно! Теперь вы можете войти на платформу и удобно управлять своими записями.',
    credentialsTitle: 'Ваши данные для входа',
    usernameLabel: 'Имя пользователя',
    passwordLabel: 'Пароль',
    importantNote: 'Важно: рекомендуем сохранить эти данные в надёжном месте и сменить пароль при первом входе.',
    trialNote: 'У вас есть <strong>40 дней бесплатного пробного периода</strong> для изучения всех функций платформы!',
    accessButton: 'Войти на платформу',
    helpText: 'Если у вас есть вопросы или нужна помощь, не стесняйтесь обращаться к нам.',
    thankYou: 'Спасибо, что выбрали Appointment Manager!',
  },
  nl: {
    subject: 'Welkom bij Appointment Manager - Uw inloggegevens',
    title: 'Welkom bij Appointment Manager!',
    greeting: 'Hallo',
    registrationSuccess: 'Uw registratie is succesvol voltooid! U kunt nu inloggen op het platform om uw afspraken eenvoudig en professioneel te beheren.',
    credentialsTitle: 'Uw inloggegevens',
    usernameLabel: 'Gebruikersnaam',
    passwordLabel: 'Wachtwoord',
    importantNote: 'Belangrijk: Wij raden u aan deze gegevens op een veilige plaats te bewaren en uw wachtwoord bij de eerste inlog te wijzigen.',
    trialNote: 'U heeft <strong>40 dagen gratis proefperiode</strong> om alle functies van het platform te verkennen!',
    accessButton: 'Toegang tot het Platform',
    helpText: 'Als u vragen heeft of hulp nodig heeft, aarzel dan niet om contact met ons op te nemen.',
    thankYou: 'Bedankt dat u voor Appointment Manager heeft gekozen!',
  },
  no: {
    subject: 'Velkommen til Appointment Manager - Dine påloggingsdetaljer',
    title: 'Velkommen til Appointment Manager!',
    greeting: 'Hei',
    registrationSuccess: 'Registreringen din er fullført! Du kan nå logge inn på plattformen for å administrere avtalene dine enkelt og profesjonelt.',
    credentialsTitle: 'Dine påloggingsdetaljer',
    usernameLabel: 'Brukernavn',
    passwordLabel: 'Passord',
    importantNote: 'Viktig: Vi anbefaler å oppbevare disse opplysningene på et sikkert sted og endre passordet ved første innlogging.',
    trialNote: 'Du har <strong>40 dager gratis prøveperiode</strong> for å utforske alle plattformens funksjoner!',
    accessButton: 'Gå til Plattformen',
    helpText: 'Hvis du har spørsmål eller trenger hjelp, ikke nøl med å kontakte oss.',
    thankYou: 'Takk for at du valgte Appointment Manager!',
  },
  ro: {
    subject: 'Bun venit la Appointment Manager - Datele tale de acces',
    title: 'Bun venit la Appointment Manager!',
    greeting: 'Bună ziua',
    registrationSuccess: 'Înregistrarea ta a fost finalizată cu succes! Acum poți accesa platforma pentru a-ți gestiona programările ușor și profesional.',
    credentialsTitle: 'Datele tale de acces',
    usernameLabel: 'Utilizator',
    passwordLabel: 'Parolă',
    importantNote: 'Important: Îți recomandăm să păstrezi aceste date într-un loc sigur și să îți schimbi parola la prima autentificare.',
    trialNote: 'Ai <strong>40 de zile de probă gratuită</strong> pentru a explora toate funcționalitățile platformei!',
    accessButton: 'Accesează Platforma',
    helpText: 'Dacă ai întrebări sau ai nevoie de ajutor, nu ezita să ne contactezi.',
    thankYou: 'Mulțumim că ai ales Appointment Manager!',
  },
};

export function getWelcomeStrings(lang: SupportedLang): WelcomeEmailStrings {
  return welcomeTranslations[lang] ?? welcomeTranslations['it'];
}

// ---------------------------------------------------------------------------
// Trial expiry email translations
// ---------------------------------------------------------------------------
export interface TrialExpiryStrings {
  subject: string;
  headerTitle: string;
  greeting: string;
  warningText: string;
  afterDateText: string;
  choosePlan: string;
  basePlanTitle: string;
  basePlanLimit: string;
  basePlanBuy: string;
  proPlanTitle: string;
  proPlanLimit: string;
  proPlanBuy: string;
  businessPlanTitle: string;
  businessPlanLimit: string;
  businessPlanBuy: string;
  baseFeatures: string[];
  proFeatures: string[];
  businessFeatures: string[];
  baseDisabled: string[];
  proDisabled: string[];
  note: string;
  contactUs: string;
  automatedNotice: string;
  perMonth: string;
  perYear: string;
  saveLabel: string;
}

const trialExpiryTranslations: Record<SupportedLang, TrialExpiryStrings> = {
  it: {
    subject: '⏰ Il tuo periodo di prova scade tra 10 giorni',
    headerTitle: '⏰ Il tuo periodo di prova scade tra 10 giorni',
    greeting: 'Ciao',
    warningText: 'Il tuo periodo di prova terminerà il {date}.',
    afterDateText: 'Dopo questa data, l\'accesso verrà sospeso fino alla scelta di un piano di abbonamento.',
    choosePlan: 'Per continuare ad usare il nostro gestionale, scegli il piano più adatto alle tue esigenze:',
    basePlanTitle: '📅 Piano BASE',
    basePlanLimit: 'Limite: 100 clienti',
    basePlanBuy: 'Acquista Piano BASE',
    proPlanTitle: '⭐ Piano PRO',
    proPlanLimit: 'Limite: 500 clienti',
    proPlanBuy: 'Acquista Piano PRO',
    businessPlanTitle: '🚀 Piano BUSINESS',
    businessPlanLimit: 'Clienti illimitati',
    businessPlanBuy: 'Acquista Piano BUSINESS',
    baseFeatures: ['Calendario appuntamenti', 'Gestione clienti', 'App clienti QR/PWA', 'Richieste appuntamento', 'Notifiche clienti', 'Generazione fatture'],
    proFeatures: ['Tutte le funzioni BASE', 'Sincronizzazione Google Calendar', 'Report e statistiche', 'Pacchetti promozionali'],
    businessFeatures: ['Tutte le funzioni PRO', 'Gestione multi-staff', 'Inventario prodotti', 'Campagne marketing AI'],
    baseDisabled: ['Sincronizzazione Google Calendar', 'Report e statistiche', 'Pacchetti promozionali', 'Gestione multi-staff', 'Inventario prodotti', 'Campagne marketing AI'],
    proDisabled: ['Gestione multi-staff', 'Inventario prodotti', 'Campagne marketing AI'],
    note: 'I tuoi dati rimarranno al sicuro e saranno disponibili non appena attivi un piano di abbonamento.',
    contactUs: 'Hai domande? Contattaci rispondendo a questa email.',
    automatedNotice: 'Questa è una notifica automatica del sistema.',
    perMonth: '/mese',
    perYear: '/anno',
    saveLabel: 'Risparmia',
  },
  en: {
    subject: '⏰ Your trial period expires in 10 days',
    headerTitle: '⏰ Your trial expires in 10 days',
    greeting: 'Hello',
    warningText: 'Your trial period will end on {date}.',
    afterDateText: 'After this date, access will be suspended until a subscription plan is chosen.',
    choosePlan: 'To continue using our management system, choose the plan that best suits your needs:',
    basePlanTitle: '📅 BASE Plan',
    basePlanLimit: 'Limit: 100 clients',
    basePlanBuy: 'Buy BASE Plan',
    proPlanTitle: '⭐ PRO Plan',
    proPlanLimit: 'Limit: 500 clients',
    proPlanBuy: 'Buy PRO Plan',
    businessPlanTitle: '🚀 BUSINESS Plan',
    businessPlanLimit: 'Unlimited clients',
    businessPlanBuy: 'Buy BUSINESS Plan',
    baseFeatures: ['Appointment calendar', 'Client management', 'QR/PWA client app', 'Client appointment requests', 'Client notifications', 'Invoice generation'],
    proFeatures: ['All BASE features', 'Google Calendar sync', 'Reports and statistics', 'Promotional packages'],
    businessFeatures: ['All PRO features', 'Multi-staff management', 'Product inventory', 'AI Marketing campaigns'],
    baseDisabled: ['Google Calendar sync', 'Reports and statistics', 'Promotional packages', 'Multi-staff management', 'Product inventory', 'AI Marketing campaigns'],
    proDisabled: ['Multi-staff management', 'Product inventory', 'AI Marketing campaigns'],
    note: 'Your data will remain safe and will be available as soon as you activate a subscription.',
    contactUs: 'Have questions? Contact us by replying to this email.',
    automatedNotice: 'This is an automated system notification.',
    perMonth: '/month',
    perYear: '/year',
    saveLabel: 'Save',
  },
  de: {
    subject: '⏰ Ihre Testphase läuft in 10 Tagen ab',
    headerTitle: '⏰ Ihre Testphase läuft in 10 Tagen ab',
    greeting: 'Hallo',
    warningText: 'Ihre Testphase endet am {date}.',
    afterDateText: 'Nach diesem Datum wird der Zugang gesperrt, bis ein Abonnementplan gewählt wird.',
    choosePlan: 'Um unsere Verwaltungssoftware weiterhin zu nutzen, wählen Sie den passenden Plan:',
    basePlanTitle: '📅 BASIS-Plan',
    basePlanLimit: 'Limit: 100 Kunden',
    basePlanBuy: 'BASIS-Plan kaufen',
    proPlanTitle: '⭐ PRO-Plan',
    proPlanLimit: 'Limit: 500 Kunden',
    proPlanBuy: 'PRO-Plan kaufen',
    businessPlanTitle: '🚀 BUSINESS-Plan',
    businessPlanLimit: 'Unbegrenzte Kunden',
    businessPlanBuy: 'BUSINESS-Plan kaufen',
    baseFeatures: ['Terminkalender', 'Kundenverwaltung', 'QR/PWA-Kunden-App', 'Terminanfragen', 'Kundenbenachrichtigungen', 'Rechnungserstellung'],
    proFeatures: ['Alle BASIS-Funktionen', 'Google Kalender-Sync', 'Berichte und Statistiken', 'Aktionspakete'],
    businessFeatures: ['Alle PRO-Funktionen', 'Multi-Mitarbeiter-Verwaltung', 'Produktinventar', 'KI-Marketingkampagnen'],
    baseDisabled: ['Google Kalender-Sync', 'Berichte und Statistiken', 'Aktionspakete', 'Multi-Mitarbeiter-Verwaltung', 'Produktinventar', 'KI-Marketingkampagnen'],
    proDisabled: ['Multi-Mitarbeiter-Verwaltung', 'Produktinventar', 'KI-Marketingkampagnen'],
    note: 'Ihre Daten bleiben sicher und stehen nach Aktivierung eines Abonnements sofort bereit.',
    contactUs: 'Fragen? Antworten Sie auf diese E-Mail.',
    automatedNotice: 'Dies ist eine automatische Systemmitteilung.',
    perMonth: '/Monat',
    perYear: '/Jahr',
    saveLabel: 'Sparen',
  },
  fr: {
    subject: '⏰ Votre période d\'essai expire dans 10 jours',
    headerTitle: '⏰ Votre période d\'essai expire dans 10 jours',
    greeting: 'Bonjour',
    warningText: 'Votre période d\'essai prendra fin le {date}.',
    afterDateText: 'Après cette date, l\'accès sera suspendu jusqu\'au choix d\'un abonnement.',
    choosePlan: 'Pour continuer à utiliser notre logiciel de gestion, choisissez le plan adapté à vos besoins :',
    basePlanTitle: '📅 Plan BASE',
    basePlanLimit: 'Limite : 100 clients',
    basePlanBuy: 'Acheter le Plan BASE',
    proPlanTitle: '⭐ Plan PRO',
    proPlanLimit: 'Limite : 500 clients',
    proPlanBuy: 'Acheter le Plan PRO',
    businessPlanTitle: '🚀 Plan BUSINESS',
    businessPlanLimit: 'Clients illimités',
    businessPlanBuy: 'Acheter le Plan BUSINESS',
    baseFeatures: ['Calendrier de rendez-vous', 'Gestion des clients', 'Application cliente QR/PWA', 'Demandes de rendez-vous', 'Notifications clients', 'Génération de factures'],
    proFeatures: ['Toutes les fonctions BASE', 'Synchronisation Google Agenda', 'Rapports et statistiques', 'Forfaits promotionnels'],
    businessFeatures: ['Toutes les fonctions PRO', 'Gestion multi-personnel', 'Inventaire produits', 'Campagnes marketing IA'],
    baseDisabled: ['Synchronisation Google Agenda', 'Rapports et statistiques', 'Forfaits promotionnels', 'Gestion multi-personnel', 'Inventaire produits', 'Campagnes marketing IA'],
    proDisabled: ['Gestion multi-personnel', 'Inventaire produits', 'Campagnes marketing IA'],
    note: 'Vos données resteront en sécurité et seront disponibles dès l\'activation d\'un abonnement.',
    contactUs: 'Des questions ? Contactez-nous en répondant à cet e-mail.',
    automatedNotice: 'Ceci est une notification automatique du système.',
    perMonth: '/mois',
    perYear: '/an',
    saveLabel: 'Économisez',
  },
  es: {
    subject: '⏰ Tu período de prueba caduca en 10 días',
    headerTitle: '⏰ Tu período de prueba caduca en 10 días',
    greeting: 'Hola',
    warningText: 'Tu período de prueba finalizará el {date}.',
    afterDateText: 'Después de esta fecha, el acceso se suspenderá hasta que elijas un plan de suscripción.',
    choosePlan: 'Para seguir usando nuestro software de gestión, elige el plan que mejor se adapte a tus necesidades:',
    basePlanTitle: '📅 Plan BASE',
    basePlanLimit: 'Límite: 100 clientes',
    basePlanBuy: 'Comprar Plan BASE',
    proPlanTitle: '⭐ Plan PRO',
    proPlanLimit: 'Límite: 500 clientes',
    proPlanBuy: 'Comprar Plan PRO',
    businessPlanTitle: '🚀 Plan BUSINESS',
    businessPlanLimit: 'Clientes ilimitados',
    businessPlanBuy: 'Comprar Plan BUSINESS',
    baseFeatures: ['Calendario de citas', 'Gestión de clientes', 'App clientes QR/PWA', 'Solicitudes de cita', 'Notificaciones a clientes', 'Generación de facturas'],
    proFeatures: ['Todas las funciones BASE', 'Sincronización Google Calendar', 'Informes y estadísticas', 'Paquetes promocionales'],
    businessFeatures: ['Todas las funciones PRO', 'Gestión multi-personal', 'Inventario de productos', 'Campañas de marketing IA'],
    baseDisabled: ['Sincronización Google Calendar', 'Informes y estadísticas', 'Paquetes promocionales', 'Gestión multi-personal', 'Inventario de productos', 'Campañas de marketing IA'],
    proDisabled: ['Gestión multi-personal', 'Inventario de productos', 'Campañas de marketing IA'],
    note: 'Tus datos estarán seguros y disponibles en cuanto actives una suscripción.',
    contactUs: '¿Preguntas? Contáctanos respondiendo a este correo.',
    automatedNotice: 'Esta es una notificación automática del sistema.',
    perMonth: '/mes',
    perYear: '/año',
    saveLabel: 'Ahorra',
  },
  ru: {
    subject: '⏰ Ваш пробный период истекает через 10 дней',
    headerTitle: '⏰ Ваш пробный период истекает через 10 дней',
    greeting: 'Здравствуйте',
    warningText: 'Ваш пробный период закончится {date}.',
    afterDateText: 'После этой даты доступ будет приостановлен до выбора тарифного плана.',
    choosePlan: 'Чтобы продолжить использование нашей системы управления, выберите подходящий тариф:',
    basePlanTitle: '📅 Тариф БАЗОВЫЙ',
    basePlanLimit: 'Лимит: 100 клиентов',
    basePlanBuy: 'Купить БАЗОВЫЙ тариф',
    proPlanTitle: '⭐ Тариф PRO',
    proPlanLimit: 'Лимит: 500 клиентов',
    proPlanBuy: 'Купить тариф PRO',
    businessPlanTitle: '🚀 Тариф БИЗНЕС',
    businessPlanLimit: 'Неограниченное число клиентов',
    businessPlanBuy: 'Купить тариф БИЗНЕС',
    baseFeatures: ['Календарь записей', 'Управление клиентами', 'QR/PWA приложение для клиентов', 'Запросы на запись', 'Уведомления клиентов', 'Генерация счетов'],
    proFeatures: ['Все функции БАЗОВОГО', 'Синхронизация с Google Календарём', 'Отчёты и статистика', 'Промо-пакеты'],
    businessFeatures: ['Все функции PRO', 'Управление несколькими сотрудниками', 'Инвентаризация продуктов', 'Маркетинговые кампании с ИИ'],
    baseDisabled: ['Синхронизация с Google Календарём', 'Отчёты и статистика', 'Промо-пакеты', 'Управление несколькими сотрудниками', 'Инвентаризация продуктов', 'Маркетинговые кампании с ИИ'],
    proDisabled: ['Управление несколькими сотрудниками', 'Инвентаризация продуктов', 'Маркетинговые кампании с ИИ'],
    note: 'Ваши данные останутся в безопасности и будут доступны сразу после активации подписки.',
    contactUs: 'Есть вопросы? Ответьте на это письмо.',
    automatedNotice: 'Это автоматическое системное уведомление.',
    perMonth: '/мес.',
    perYear: '/год',
    saveLabel: 'Экономия',
  },
  nl: {
    subject: '⏰ Uw proefperiode verloopt over 10 dagen',
    headerTitle: '⏰ Uw proefperiode verloopt over 10 dagen',
    greeting: 'Hallo',
    warningText: 'Uw proefperiode eindigt op {date}.',
    afterDateText: 'Na deze datum wordt de toegang opgeschort totdat een abonnement is gekozen.',
    choosePlan: 'Om ons beheersysteem te blijven gebruiken, kies het plan dat het beste bij u past:',
    basePlanTitle: '📅 BASIS-plan',
    basePlanLimit: 'Limiet: 100 klanten',
    basePlanBuy: 'Koop BASIS-plan',
    proPlanTitle: '⭐ PRO-plan',
    proPlanLimit: 'Limiet: 500 klanten',
    proPlanBuy: 'Koop PRO-plan',
    businessPlanTitle: '🚀 BUSINESS-plan',
    businessPlanLimit: 'Onbeperkte klanten',
    businessPlanBuy: 'Koop BUSINESS-plan',
    baseFeatures: ['Afsprakencalender', 'Klantbeheer', 'QR/PWA-klantenapp', 'Afspraakverzoeken', 'Klantmeldingen', 'Factuurcreatie'],
    proFeatures: ['Alle BASIS-functies', 'Google Agenda-synchronisatie', 'Rapporten en statistieken', 'Promotiepakketten'],
    businessFeatures: ['Alle PRO-functies', 'Multi-medewerkersbeheer', 'Productinventaris', 'AI-marketingcampagnes'],
    baseDisabled: ['Google Agenda-synchronisatie', 'Rapporten en statistieken', 'Promotiepakketten', 'Multi-medewerkersbeheer', 'Productinventaris', 'AI-marketingcampagnes'],
    proDisabled: ['Multi-medewerkersbeheer', 'Productinventaris', 'AI-marketingcampagnes'],
    note: 'Uw gegevens blijven veilig en zijn beschikbaar zodra u een abonnement activeert.',
    contactUs: 'Vragen? Contacteer ons via dit e-mailadres.',
    automatedNotice: 'Dit is een automatische systeemmelding.',
    perMonth: '/maand',
    perYear: '/jaar',
    saveLabel: 'Bespaar',
  },
  no: {
    subject: '⏰ Din prøveperiode utløper om 10 dager',
    headerTitle: '⏰ Din prøveperiode utløper om 10 dager',
    greeting: 'Hei',
    warningText: 'Din prøveperiode avsluttes {date}.',
    afterDateText: 'Etter denne datoen vil tilgangen bli suspendert til et abonnement er valgt.',
    choosePlan: 'For å fortsette å bruke systemet, velg planen som passer best for deg:',
    basePlanTitle: '📅 BASIS-plan',
    basePlanLimit: 'Grense: 100 kunder',
    basePlanBuy: 'Kjøp BASIS-plan',
    proPlanTitle: '⭐ PRO-plan',
    proPlanLimit: 'Grense: 500 kunder',
    proPlanBuy: 'Kjøp PRO-plan',
    businessPlanTitle: '🚀 BUSINESS-plan',
    businessPlanLimit: 'Ubegrenset antall kunder',
    businessPlanBuy: 'Kjøp BUSINESS-plan',
    baseFeatures: ['Avtalekalender', 'Kundeadministrasjon', 'QR/PWA-kundeapp', 'Avtaleforespørsler', 'Kundevarsler', 'Fakturagenerering'],
    proFeatures: ['Alle BASIS-funksjoner', 'Google Kalender-synkronisering', 'Rapporter og statistikk', 'Kampanjepakker'],
    businessFeatures: ['Alle PRO-funksjoner', 'Flerbrukeradministrasjon', 'Produktlager', 'AI-markedsføringskampanjer'],
    baseDisabled: ['Google Kalender-synkronisering', 'Rapporter og statistikk', 'Kampanjepakker', 'Flerbrukeradministrasjon', 'Produktlager', 'AI-markedsføringskampanjer'],
    proDisabled: ['Flerbrukeradministrasjon', 'Produktlager', 'AI-markedsføringskampanjer'],
    note: 'Dataene dine forblir trygge og tilgjengelige så snart du aktiverer et abonnement.',
    contactUs: 'Har du spørsmål? Svar på denne e-posten.',
    automatedNotice: 'Dette er en automatisk systemmelding.',
    perMonth: '/mnd.',
    perYear: '/år',
    saveLabel: 'Spar',
  },
  ro: {
    subject: '⏰ Perioada ta de probă expiră în 10 zile',
    headerTitle: '⏰ Perioada ta de probă expiră în 10 zile',
    greeting: 'Bună ziua',
    warningText: 'Perioada ta de probă se va încheia pe {date}.',
    afterDateText: 'După această dată, accesul va fi suspendat până la alegerea unui plan de abonament.',
    choosePlan: 'Pentru a continua să folosești sistemul nostru, alege planul potrivit pentru tine:',
    basePlanTitle: '📅 Plan BAZĂ',
    basePlanLimit: 'Limită: 100 clienți',
    basePlanBuy: 'Cumpără Planul BAZĂ',
    proPlanTitle: '⭐ Plan PRO',
    proPlanLimit: 'Limită: 500 clienți',
    proPlanBuy: 'Cumpără Planul PRO',
    businessPlanTitle: '🚀 Plan BUSINESS',
    businessPlanLimit: 'Clienți nelimitați',
    businessPlanBuy: 'Cumpără Planul BUSINESS',
    baseFeatures: ['Calendar programări', 'Gestiune clienți', 'App clienți QR/PWA', 'Solicitări programare', 'Notificări clienți', 'Generare facturi'],
    proFeatures: ['Toate funcțiile BAZĂ', 'Sincronizare Google Calendar', 'Rapoarte și statistici', 'Pachete promoționale'],
    businessFeatures: ['Toate funcțiile PRO', 'Gestiune multi-personal', 'Inventar produse', 'Campanii marketing AI'],
    baseDisabled: ['Sincronizare Google Calendar', 'Rapoarte și statistici', 'Pachete promoționale', 'Gestiune multi-personal', 'Inventar produse', 'Campanii marketing AI'],
    proDisabled: ['Gestiune multi-personal', 'Inventar produse', 'Campanii marketing AI'],
    note: 'Datele tale vor rămâne în siguranță și vor fi disponibile imediat ce activezi un abonament.',
    contactUs: 'Ai întrebări? Contactează-ne răspunzând la acest e-mail.',
    automatedNotice: 'Aceasta este o notificare automată a sistemului.',
    perMonth: '/lună',
    perYear: '/an',
    saveLabel: 'Economiești',
  },
};

export function getTrialExpiryStrings(lang: SupportedLang): TrialExpiryStrings {
  return trialExpiryTranslations[lang] ?? trialExpiryTranslations['it'];
}

// ---------------------------------------------------------------------------
// Invoice PDF label translations
// ---------------------------------------------------------------------------
export interface InvoicePdfStrings {
  invoiceTitle: string;
  addressLabel: string;
  telLabel: string;
  emailLabel: string;
  vatNoLabel: string;
  taxCodeLabel: string;
  clientDetails: string;
  nameLabel: string;
  phoneLabel: string;
  dateOfBirthLabel: string;
  vatNumberLabel: string;
  invoiceNoLabel: string;
  dateLabel: string;
  dueDateLabel: string;
  statusLabel: string;
  statusPaid: string;
  statusSent: string;
  statusOverdue: string;
  statusDraft: string;
  descriptionCol: string;
  quantityCol: string;
  unitPriceCol: string;
  totalCol: string;
  totalLabel: string;
  notesLabel: string;
  thankYou: string;
  documentGenerated: string;
  billedTo: string;
  numberLabel: string;
}

const invoicePdfTranslations: Record<SupportedLang, InvoicePdfStrings> = {
  it: {
    invoiceTitle: 'FATTURA',
    addressLabel: 'Indirizzo',
    telLabel: 'Tel',
    emailLabel: 'Email',
    vatNoLabel: 'P.IVA',
    taxCodeLabel: 'Cod. Fiscale',
    clientDetails: 'Dati Cliente',
    nameLabel: 'Nome',
    phoneLabel: 'Telefono',
    dateOfBirthLabel: 'Data di nascita',
    vatNumberLabel: 'Partita IVA',
    invoiceNoLabel: 'Fattura N.',
    dateLabel: 'Data',
    dueDateLabel: 'Scadenza',
    statusLabel: 'Stato',
    statusPaid: 'Pagata',
    statusSent: 'Inviata',
    statusOverdue: 'Scaduta',
    statusDraft: 'Bozza',
    descriptionCol: 'Descrizione',
    quantityCol: 'Quantità',
    unitPriceCol: 'Prezzo unitario',
    totalCol: 'Totale',
    totalLabel: 'TOTALE',
    notesLabel: 'Note',
    thankYou: 'Grazie per aver scelto i nostri servizi',
    documentGenerated: 'Documento generato il',
    billedTo: 'Fatturato a',
    numberLabel: 'Numero',
  },
  en: {
    invoiceTitle: 'INVOICE',
    addressLabel: 'Address',
    telLabel: 'Tel',
    emailLabel: 'Email',
    vatNoLabel: 'VAT No.',
    taxCodeLabel: 'Tax Code',
    clientDetails: 'Client Details',
    nameLabel: 'Name',
    phoneLabel: 'Phone',
    dateOfBirthLabel: 'Date of Birth',
    vatNumberLabel: 'VAT Number',
    invoiceNoLabel: 'Invoice No.',
    dateLabel: 'Date',
    dueDateLabel: 'Due Date',
    statusLabel: 'Status',
    statusPaid: 'Paid',
    statusSent: 'Sent',
    statusOverdue: 'Overdue',
    statusDraft: 'Draft',
    descriptionCol: 'Description',
    quantityCol: 'Quantity',
    unitPriceCol: 'Unit Price',
    totalCol: 'Total',
    totalLabel: 'TOTAL',
    notesLabel: 'Notes',
    thankYou: 'Thank you for choosing our services',
    documentGenerated: 'Document generated on',
    billedTo: 'Billed to',
    numberLabel: 'Number',
  },
  de: {
    invoiceTitle: 'RECHNUNG',
    addressLabel: 'Adresse',
    telLabel: 'Tel',
    emailLabel: 'E-Mail',
    vatNoLabel: 'USt.-IdNr.',
    taxCodeLabel: 'Steuernummer',
    clientDetails: 'Kundendaten',
    nameLabel: 'Name',
    phoneLabel: 'Telefon',
    dateOfBirthLabel: 'Geburtsdatum',
    vatNumberLabel: 'USt.-IdNr.',
    invoiceNoLabel: 'Rechnung Nr.',
    dateLabel: 'Datum',
    dueDateLabel: 'Fälligkeitsdatum',
    statusLabel: 'Status',
    statusPaid: 'Bezahlt',
    statusSent: 'Gesendet',
    statusOverdue: 'Überfällig',
    statusDraft: 'Entwurf',
    descriptionCol: 'Beschreibung',
    quantityCol: 'Menge',
    unitPriceCol: 'Einzelpreis',
    totalCol: 'Gesamt',
    totalLabel: 'GESAMT',
    notesLabel: 'Anmerkungen',
    thankYou: 'Vielen Dank für Ihr Vertrauen',
    documentGenerated: 'Dokument erstellt am',
    billedTo: 'Rechnung an',
    numberLabel: 'Nummer',
  },
  fr: {
    invoiceTitle: 'FACTURE',
    addressLabel: 'Adresse',
    telLabel: 'Tél',
    emailLabel: 'E-mail',
    vatNoLabel: 'N° TVA',
    taxCodeLabel: 'Code fiscal',
    clientDetails: 'Coordonnées client',
    nameLabel: 'Nom',
    phoneLabel: 'Téléphone',
    dateOfBirthLabel: 'Date de naissance',
    vatNumberLabel: 'Numéro de TVA',
    invoiceNoLabel: 'Facture N°',
    dateLabel: 'Date',
    dueDateLabel: 'Échéance',
    statusLabel: 'Statut',
    statusPaid: 'Payée',
    statusSent: 'Envoyée',
    statusOverdue: 'En retard',
    statusDraft: 'Brouillon',
    descriptionCol: 'Description',
    quantityCol: 'Quantité',
    unitPriceCol: 'Prix unitaire',
    totalCol: 'Total',
    totalLabel: 'TOTAL',
    notesLabel: 'Notes',
    thankYou: 'Merci de nous avoir choisis',
    documentGenerated: 'Document généré le',
    billedTo: 'Facturé à',
    numberLabel: 'Numéro',
  },
  es: {
    invoiceTitle: 'FACTURA',
    addressLabel: 'Dirección',
    telLabel: 'Tel',
    emailLabel: 'Correo',
    vatNoLabel: 'N.º IVA',
    taxCodeLabel: 'NIF/CIF',
    clientDetails: 'Datos del Cliente',
    nameLabel: 'Nombre',
    phoneLabel: 'Teléfono',
    dateOfBirthLabel: 'Fecha de nacimiento',
    vatNumberLabel: 'Número IVA',
    invoiceNoLabel: 'Factura N.º',
    dateLabel: 'Fecha',
    dueDateLabel: 'Vencimiento',
    statusLabel: 'Estado',
    statusPaid: 'Pagada',
    statusSent: 'Enviada',
    statusOverdue: 'Vencida',
    statusDraft: 'Borrador',
    descriptionCol: 'Descripción',
    quantityCol: 'Cantidad',
    unitPriceCol: 'Precio unitario',
    totalCol: 'Total',
    totalLabel: 'TOTAL',
    notesLabel: 'Notas',
    thankYou: 'Gracias por elegirnos',
    documentGenerated: 'Documento generado el',
    billedTo: 'Facturado a',
    numberLabel: 'Número',
  },
  ru: {
    invoiceTitle: 'СЧЁТ',
    addressLabel: 'Адрес',
    telLabel: 'Тел',
    emailLabel: 'Эл. почта',
    vatNoLabel: 'НДС №',
    taxCodeLabel: 'ИНН',
    clientDetails: 'Данные клиента',
    nameLabel: 'Имя',
    phoneLabel: 'Телефон',
    dateOfBirthLabel: 'Дата рождения',
    vatNumberLabel: 'Номер НДС',
    invoiceNoLabel: 'Счёт №',
    dateLabel: 'Дата',
    dueDateLabel: 'Срок оплаты',
    statusLabel: 'Статус',
    statusPaid: 'Оплачен',
    statusSent: 'Отправлен',
    statusOverdue: 'Просрочен',
    statusDraft: 'Черновик',
    descriptionCol: 'Описание',
    quantityCol: 'Количество',
    unitPriceCol: 'Цена за единицу',
    totalCol: 'Итого',
    totalLabel: 'ИТОГО',
    notesLabel: 'Примечания',
    thankYou: 'Спасибо, что выбрали наши услуги',
    documentGenerated: 'Документ создан',
    billedTo: 'Выставлен',
    numberLabel: 'Номер',
  },
  nl: {
    invoiceTitle: 'FACTUUR',
    addressLabel: 'Adres',
    telLabel: 'Tel',
    emailLabel: 'E-mail',
    vatNoLabel: 'BTW-nr.',
    taxCodeLabel: 'Fiscaal nr.',
    clientDetails: 'Klantgegevens',
    nameLabel: 'Naam',
    phoneLabel: 'Telefoon',
    dateOfBirthLabel: 'Geboortedatum',
    vatNumberLabel: 'BTW-nummer',
    invoiceNoLabel: 'Factuur nr.',
    dateLabel: 'Datum',
    dueDateLabel: 'Vervaldatum',
    statusLabel: 'Status',
    statusPaid: 'Betaald',
    statusSent: 'Verzonden',
    statusOverdue: 'Vervallen',
    statusDraft: 'Concept',
    descriptionCol: 'Beschrijving',
    quantityCol: 'Aantal',
    unitPriceCol: 'Stuksprijs',
    totalCol: 'Totaal',
    totalLabel: 'TOTAAL',
    notesLabel: 'Opmerkingen',
    thankYou: 'Bedankt voor uw vertrouwen',
    documentGenerated: 'Document gegenereerd op',
    billedTo: 'Gefactureerd aan',
    numberLabel: 'Nummer',
  },
  no: {
    invoiceTitle: 'FAKTURA',
    addressLabel: 'Adresse',
    telLabel: 'Tlf',
    emailLabel: 'E-post',
    vatNoLabel: 'MVA-nr.',
    taxCodeLabel: 'Organisasjonsnr.',
    clientDetails: 'Kundeopplysninger',
    nameLabel: 'Navn',
    phoneLabel: 'Telefon',
    dateOfBirthLabel: 'Fødselsdato',
    vatNumberLabel: 'MVA-nummer',
    invoiceNoLabel: 'Faktura nr.',
    dateLabel: 'Dato',
    dueDateLabel: 'Forfallsdato',
    statusLabel: 'Status',
    statusPaid: 'Betalt',
    statusSent: 'Sendt',
    statusOverdue: 'Forfalt',
    statusDraft: 'Utkast',
    descriptionCol: 'Beskrivelse',
    quantityCol: 'Antall',
    unitPriceCol: 'Enhetspris',
    totalCol: 'Total',
    totalLabel: 'TOTAL',
    notesLabel: 'Merknader',
    thankYou: 'Takk for at du valgte oss',
    documentGenerated: 'Dokument generert',
    billedTo: 'Fakturert til',
    numberLabel: 'Nummer',
  },
  ro: {
    invoiceTitle: 'FACTURĂ',
    addressLabel: 'Adresă',
    telLabel: 'Tel',
    emailLabel: 'Email',
    vatNoLabel: 'Nr. TVA',
    taxCodeLabel: 'CIF',
    clientDetails: 'Date Client',
    nameLabel: 'Nume',
    phoneLabel: 'Telefon',
    dateOfBirthLabel: 'Data nașterii',
    vatNumberLabel: 'Număr TVA',
    invoiceNoLabel: 'Factură Nr.',
    dateLabel: 'Dată',
    dueDateLabel: 'Scadență',
    statusLabel: 'Stare',
    statusPaid: 'Plătită',
    statusSent: 'Trimisă',
    statusOverdue: 'Restantă',
    statusDraft: 'Ciornă',
    descriptionCol: 'Descriere',
    quantityCol: 'Cantitate',
    unitPriceCol: 'Preț unitar',
    totalCol: 'Total',
    totalLabel: 'TOTAL',
    notesLabel: 'Note',
    thankYou: 'Vă mulțumim că ați ales serviciile noastre',
    documentGenerated: 'Document generat la',
    billedTo: 'Facturat la',
    numberLabel: 'Număr',
  },
};

export function getInvoicePdfStrings(lang: SupportedLang): InvoicePdfStrings {
  return invoicePdfTranslations[lang] ?? invoicePdfTranslations['it'];
}
