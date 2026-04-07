// Testo dei consensi privacy in diverse lingue/giurisdizioni
// Ogni testo è conforme alle normative locali di ogni paese

export interface ConsentText {
  language: string;
  languageCode: string;
  countryCode: string;
  title: string;
  introduction: string;
  dataControllerHeading: string;
  dataController: string;
  purposesHeading: string;
  purposesIntro: string;
  purposes: string[];
  legalBasisHeading: string;
  legalBasisIntro: string;
  legalBasis: string[];
  dataCategoriesHeading: string;
  dataCategoriesIntro: string;
  dataCategories: string[];
  dataProcessingHeading: string;
  dataProcessing: string;
  retentionPeriodHeading: string;
  retentionPeriod: string;
  dataRecipientsHeading: string;
  dataRecipientsIntro: string;
  dataRecipients: string[];
  dataTransferHeading: string;
  dataTransfer: string;
  rightsTitle: string;
  rightsIntro: string;
  rights: string[];
  consentNatureHeading: string;
  consentNature: string;
  automatedDecisionMakingHeading: string;
  automatedDecisionMaking: string;
  consentStatement: string;
  consentAlreadyProvided: string;
  consentAlreadyProvidedPrevious: string;
  saving: string;
  provideConsent: string;
}

export const consentTexts: Record<string, ConsentText> = {
  // ITALIANO (GDPR - Italia)
  "it-IT": {
    language: "Italiano",
    languageCode: "it",
    countryCode: "IT",
    title: "Informativa sul trattamento dei dati personali",
    introduction: "Ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)",
    dataControllerHeading: "Titolare del trattamento",
    dataController: "Il titolare del trattamento è [Nome Studio/Professionista], con sede in [Indirizzo], [Città], [CAP], [Provincia], P.IVA [Numero], contattabile all'indirizzo email [Email] e al numero di telefono [Telefono].",
    purposesHeading: "Finalità del trattamento",
    purposesIntro: "I dati personali da Lei forniti saranno trattati per le seguenti finalità:",
    purposes: [
      "Erogazione dei servizi richiesti e gestione degli appuntamenti",
      "Adempimento di obblighi contrattuali e legali",
      "Gestione amministrativa e contabile",
      "Invio di comunicazioni relative ai servizi sottoscritti",
      "Invio di promemoria per gli appuntamenti"
    ],
    legalBasisHeading: "Base giuridica del trattamento",
    legalBasisIntro: "Il trattamento dei Suoi dati personali si fonda sulle seguenti basi giuridiche:",
    legalBasis: [
      "Esecuzione di un contratto di cui Lei è parte",
      "Adempimento di obblighi legali cui è soggetto il titolare",
      "Consenso da Lei espresso per specifiche finalità",
      "Legittimo interesse del titolare"
    ],
    dataCategoriesHeading: "Categorie di dati trattati",
    dataCategoriesIntro: "Il trattamento riguarderà le seguenti categorie di dati:",
    dataCategories: [
      "Dati anagrafici e di contatto (nome, cognome, indirizzo, email, telefono)",
      "Dati relativi alla salute (informazioni mediche pertinenti al trattamento)",
      "Dati fiscali (necessari per la fatturazione)",
      "Eventuali dati relativi a preferenze di appuntamento"
    ],
    dataProcessingHeading: "Modalità di trattamento",
    dataProcessing: "Il trattamento dei dati avverrà mediante strumenti elettronici e cartacei, con logiche strettamente correlate alle finalità per cui sono raccolti e, comunque, in modo da garantire la sicurezza e la riservatezza dei dati stessi.",
    retentionPeriodHeading: "Periodo di conservazione",
    retentionPeriod: "I dati personali saranno conservati per il tempo necessario all'erogazione dei servizi richiesti e per l'adempimento degli obblighi di legge, e comunque non oltre i termini previsti dalla normativa vigente.",
    dataRecipientsHeading: "Destinatari dei dati",
    dataRecipientsIntro: "I dati potranno essere comunicati a:",
    dataRecipients: [
      "Personale autorizzato del Titolare",
      "Soggetti esterni nominati Responsabili del trattamento (consulenti, fornitori di servizi tecnici)",
      "Enti pubblici e privati quando previsto da norme di legge o di regolamento"
    ],
    dataTransferHeading: "Trasferimento dati",
    dataTransfer: "I dati personali non saranno trasferiti in Paesi terzi extra UE.",
    rightsTitle: "Diritti dell'interessato",
    rightsIntro: "In qualità di interessato, Lei ha il diritto di:",
    rights: [
      "Accedere ai Suoi dati personali",
      "Chiederne la rettifica o la cancellazione",
      "Chiedere la limitazione del trattamento",
      "Opporsi al trattamento",
      "Richiedere la portabilità dei dati",
      "Revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento basata sul consenso prima della revoca"
    ],
    consentNatureHeading: "Natura del conferimento dei dati",
    consentNature: "Il conferimento dei dati personali è necessario per l'erogazione dei servizi richiesti. Il mancato conferimento di tali dati comporta l'impossibilità di erogare i servizi richiesti.",
    automatedDecisionMakingHeading: "Processo decisionale automatizzato",
    automatedDecisionMaking: "Non è presente alcun processo decisionale automatizzato, compresa la profilazione.",
    consentStatement: "Dichiaro di aver letto e compreso l'informativa sulla privacy e acconsento al trattamento dei miei dati personali per le finalità indicate",
    consentAlreadyProvided: "Hai già fornito il consenso al trattamento dei dati personali",
    consentAlreadyProvidedPrevious: "Hai già fornito il consenso al trattamento dei dati personali in data precedente.",
    saving: "Salvataggio in corso...",
    provideConsent: "Fornisci consenso"
  },

  // INGLESE (USA - CCPA/CPRA California)
  "en-US": {
    language: "English (US)",
    languageCode: "en",
    countryCode: "US",
    title: "Privacy Notice",
    introduction: "Pursuant to the California Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA)",
    dataControllerHeading: "Data Controller",
    dataController: "[Business/Professional Name], with headquarters at [Address], [City], [State], [ZIP Code], can be reached at email [Email] and phone number [Phone].",
    purposesHeading: "Purposes of Processing",
    purposesIntro: "Your personal data will be processed for the following purposes:",
    purposes: [
      "Providing the services you requested and appointment management",
      "Fulfilling our contractual and legal obligations",
      "Administrative and accounting management",
      "Sending communications related to subscribed services",
      "Sending appointment reminders"
    ],
    legalBasisHeading: "Legal Basis",
    legalBasisIntro: "The processing of your personal data is based on the following legal grounds:",
    legalBasis: [
      "Performance of a contract to which you are a party",
      "Compliance with legal obligations",
      "Consent you have provided for specific purposes",
      "Legitimate interests"
    ],
    dataCategoriesHeading: "Categories of Data",
    dataCategoriesIntro: "The processing will involve the following categories of data:",
    dataCategories: [
      "Identifiers and contact information (name, address, email, phone number)",
      "Health information (medical information relevant to treatment)",
      "Financial information (necessary for billing)",
      "Commercial information (appointment preferences)"
    ],
    dataProcessingHeading: "Processing Methods",
    dataProcessing: "Your personal information will be processed using electronic and paper-based methods, with logic strictly related to the purposes for which they are collected and, in any case, in a way that guarantees the security and confidentiality of the data.",
    retentionPeriodHeading: "Retention Period",
    retentionPeriod: "Your personal information will be retained for the time necessary to provide the requested services and to comply with legal obligations, and in any case no longer than the terms required by current regulations.",
    dataRecipientsHeading: "Data Recipients",
    dataRecipientsIntro: "The data may be communicated to:",
    dataRecipients: [
      "Authorized personnel of the Controller",
      "External parties appointed as Data Processors (consultants, technical service providers)",
      "Public and private entities when required by law or regulation"
    ],
    dataTransferHeading: "Data Transfer",
    dataTransfer: "Your personal information will not be transferred to countries outside the United States.",
    rightsTitle: "Your Rights",
    rightsIntro: "As a data subject, you have the right to:",
    rights: [
      "Right to know about personal information collected, disclosed, or sold",
      "Right to delete personal information collected from you",
      "Right to opt-out of the sale of your personal information",
      "Right to correct inaccurate personal information",
      "Right to limit use and disclosure of sensitive personal information",
      "Right to non-discrimination for exercising your privacy rights"
    ],
    consentNatureHeading: "Nature of Data Provision",
    consentNature: "Providing your personal information is necessary for the provision of the requested services. Failure to provide such data makes it impossible to provide the requested services.",
    automatedDecisionMakingHeading: "Automated Decision-Making",
    automatedDecisionMaking: "We do not use automated decision-making, including profiling.",
    consentStatement: "I declare that I have read and understood the privacy notice and consent to the processing of my personal information for the purposes indicated",
    consentAlreadyProvided: "You have already provided consent for personal data processing",
    consentAlreadyProvidedPrevious: "You have already provided consent for personal data processing at a previous date.",
    saving: "Saving...",
    provideConsent: "Provide consent"
  },

  // SPAGNOLO (Spagna - RGPD/LOPDGDD)
  "es-ES": {
    language: "Español",
    languageCode: "es",
    countryCode: "ES",
    title: "Información sobre el tratamiento de datos personales",
    introduction: "De conformidad con el art. 13 del Reglamento UE 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD)",
    dataControllerHeading: "Responsable del tratamiento",
    dataController: "El responsable del tratamiento es [Nombre de la Clínica/Profesional], con domicilio en [Dirección], [Ciudad], [Código Postal], [Provincia], NIF [Número], contactable en la dirección de correo electrónico [Email] y en el número de teléfono [Teléfono].",
    purposesHeading: "Finalidades del tratamiento",
    purposesIntro: "Sus datos personales serán tratados para las siguientes finalidades:",
    purposes: [
      "Prestación de los servicios solicitados y gestión de citas",
      "Cumplimiento de obligaciones contractuales y legales",
      "Gestión administrativa y contable",
      "Envío de comunicaciones relacionadas con los servicios contratados",
      "Envío de recordatorios de citas"
    ],
    legalBasisHeading: "Base jurídica del tratamiento",
    legalBasisIntro: "El tratamiento de sus datos personales se basa en las siguientes bases jurídicas:",
    legalBasis: [
      "Ejecución de un contrato en el que usted es parte",
      "Cumplimiento de obligaciones legales",
      "Consentimiento otorgado para finalidades específicas",
      "Interés legítimo del responsable"
    ],
    dataCategoriesHeading: "Categorías de datos tratados",
    dataCategoriesIntro: "El tratamiento afectará a las siguientes categorías de datos:",
    dataCategories: [
      "Datos identificativos y de contacto (nombre, apellidos, dirección, email, teléfono)",
      "Datos relativos a la salud (información médica relevante para el tratamiento)",
      "Datos fiscales (necesarios para la facturación)",
      "Datos sobre preferencias de citas"
    ],
    dataProcessingHeading: "Modalidades de tratamiento",
    dataProcessing: "El tratamiento de datos se realizará mediante herramientas electrónicas y en papel, con lógicas estrictamente relacionadas con las finalidades para las que se recopilan y, en cualquier caso, de manera que garantice la seguridad y confidencialidad de los mismos.",
    retentionPeriodHeading: "Período de conservación",
    retentionPeriod: "Los datos personales se conservarán durante el tiempo necesario para la prestación de los servicios solicitados y para el cumplimiento de las obligaciones legales, y en ningún caso más allá de los términos previstos por la normativa vigente.",
    dataRecipientsHeading: "Destinatarios de los datos",
    dataRecipientsIntro: "Los datos pueden ser comunicados a:",
    dataRecipients: [
      "Personal autorizado del Responsable",
      "Terceros designados como Encargados del Tratamiento (consultores, proveedores de servicios técnicos)",
      "Entidades públicas y privadas cuando lo exija la ley o el reglamento"
    ],
    dataTransferHeading: "Transferencia de datos",
    dataTransfer: "Los datos personales no serán transferidos a países fuera de la Unión Europea.",
    rightsTitle: "Derechos del interesado",
    rightsIntro: "Como interesado, tiene derecho a:",
    rights: [
      "Acceder a sus datos personales",
      "Solicitar su rectificación o supresión",
      "Solicitar la limitación del tratamiento",
      "Oponerse al tratamiento",
      "Solicitar la portabilidad de los datos",
      "Retirar el consentimiento en cualquier momento, sin que ello afecte a la licitud del tratamiento basado en el consentimiento previo a su retirada"
    ],
    consentNatureHeading: "Naturaleza de la provisión de datos",
    consentNature: "La provisión de datos personales es necesaria para la prestación de los servicios solicitados. La falta de estos datos imposibilita la prestación de los servicios solicitados.",
    automatedDecisionMakingHeading: "Proceso de toma de decisiones automatizado",
    automatedDecisionMaking: "No existe ningún proceso de toma de decisiones automatizado, incluida la elaboración de perfiles.",
    consentStatement: "Declaro haber leído y comprendido la información sobre protección de datos y doy mi consentimiento para el tratamiento de mis datos personales para las finalidades indicadas",
    consentAlreadyProvided: "Ya has proporcionado consentimiento para el tratamiento de datos personales",
    consentAlreadyProvidedPrevious: "Ya has proporcionado consentimiento para el tratamiento de datos personales en una fecha anterior.",
    saving: "Guardando...",
    provideConsent: "Dar consentimiento"
  },

  // TEDESCO (Germania - DSGVO)
  "de-DE": {
    language: "Deutsch",
    languageCode: "de",
    countryCode: "DE",
    title: "Datenschutzhinweise",
    introduction: "Gemäß Art. 13 der EU-Verordnung 2016/679 (DSGVO)",
    dataControllerHeading: "Verantwortlicher für die Datenverarbeitung",
    dataController: "Verantwortlicher für die Datenverarbeitung ist [Name der Praxis/des Fachmanns], mit Sitz in [Adresse], [Stadt], [PLZ], Steuer-ID [Nummer], erreichbar unter der E-Mail-Adresse [E-Mail] und der Telefonnummer [Telefon].",
    purposesHeading: "Zwecke der Verarbeitung",
    purposesIntro: "Ihre personenbezogenen Daten werden für folgende Zwecke verarbeitet:",
    purposes: [
      "Bereitstellung der angeforderten Dienstleistungen und Terminverwaltung",
      "Erfüllung vertraglicher und gesetzlicher Verpflichtungen",
      "Verwaltungs- und Buchhaltungsmanagement",
      "Versenden von Mitteilungen im Zusammenhang mit abonnierten Diensten",
      "Versenden von Terminerinnerungen"
    ],
    legalBasisHeading: "Rechtsgrundlage der Verarbeitung",
    legalBasisIntro: "Die Verarbeitung Ihrer personenbezogenen Daten basiert auf folgenden Rechtsgrundlagen:",
    legalBasis: [
      "Durchführung eines Vertrags, dessen Vertragspartei Sie sind",
      "Erfüllung einer rechtlichen Verpflichtung",
      "Ihre für bestimmte Zwecke erteilte Einwilligung",
      "Berechtigte Interessen des Verantwortlichen"
    ],
    dataCategoriesHeading: "Kategorien der verarbeiteten Daten",
    dataCategoriesIntro: "Die Verarbeitung betrifft folgende Datenkategorien:",
    dataCategories: [
      "Identifikations- und Kontaktdaten (Name, Anschrift, E-Mail, Telefonnummer)",
      "Gesundheitsdaten (für die Behandlung relevante medizinische Informationen)",
      "Steuerdaten (für die Rechnungsstellung erforderlich)",
      "Daten zu Terminpräferenzen"
    ],
    dataProcessingHeading: "Verarbeitungsmethoden",
    dataProcessing: "Die Verarbeitung der Daten erfolgt elektronisch und in Papierform, mit einer Logik, die streng mit den Zwecken zusammenhängt, für die sie erhoben werden, und in jedem Fall so, dass die Sicherheit und Vertraulichkeit der Daten gewährleistet ist.",
    retentionPeriodHeading: "Aufbewahrungsfrist",
    retentionPeriod: "Ihre personenbezogenen Daten werden für die Zeit aufbewahrt, die für die Erbringung der angeforderten Dienstleistungen und für die Erfüllung gesetzlicher Verpflichtungen erforderlich ist, und in keinem Fall länger als die in den geltenden Vorschriften vorgesehenen Fristen.",
    dataRecipientsHeading: "Empfänger der Daten",
    dataRecipientsIntro: "Die Daten können weitergegeben werden an:",
    dataRecipients: [
      "Befugtes Personal des Verantwortlichen",
      "Externe Parteien, die als Auftragsverarbeiter ernannt wurden (Berater, technische Dienstleister)",
      "Öffentliche und private Einrichtungen, wenn dies gesetzlich oder durch Vorschriften vorgesehen ist"
    ],
    dataTransferHeading: "Datenübermittlung",
    dataTransfer: "Ihre personenbezogenen Daten werden nicht in Länder außerhalb der Europäischen Union übermittelt.",
    rightsTitle: "Rechte der betroffenen Person",
    rightsIntro: "Als betroffene Person haben Sie das Recht auf:",
    rights: [
      "Auskunft über Ihre personenbezogenen Daten",
      "Berichtigung oder Löschung",
      "Einschränkung der Verarbeitung",
      "Widerspruch gegen die Verarbeitung",
      "Datenübertragbarkeit",
      "Jederzeitiger Widerruf Ihrer Einwilligung, ohne dass die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird"
    ],
    consentNatureHeading: "Art der Datenbereitstellung",
    consentNature: "Die Bereitstellung personenbezogener Daten ist für die Erbringung der angeforderten Dienstleistungen erforderlich. Ohne diese Daten können die angeforderten Dienstleistungen nicht erbracht werden.",
    automatedDecisionMakingHeading: "Automatisierte Entscheidungsfindung",
    automatedDecisionMaking: "Es gibt keine automatisierte Entscheidungsfindung, einschließlich Profiling.",
    consentStatement: "Ich erkläre, dass ich die Datenschutzhinweise gelesen und verstanden habe, und ich willige in die Verarbeitung meiner personenbezogenen Daten für die angegebenen Zwecke ein",
    consentAlreadyProvided: "Sie haben bereits Ihre Einwilligung zur Verarbeitung personenbezogener Daten erteilt",
    consentAlreadyProvidedPrevious: "Sie haben bereits zu einem früheren Zeitpunkt Ihre Einwilligung zur Verarbeitung personenbezogener Daten erteilt.",
    saving: "Wird gespeichert...",
    provideConsent: "Einwilligung erteilen"
  },

  // FRANCESE (Francia - RGPD)
  "fr-FR": {
    language: "Français",
    languageCode: "fr",
    countryCode: "FR",
    title: "Information sur le traitement des données personnelles",
    introduction: "Conformément à l'art. 13 du Règlement UE 2016/679 (RGPD)",
    dataControllerHeading: "Responsable du traitement",
    dataController: "Le responsable du traitement est [Nom du Cabinet/Professionnel], avec siège à [Adresse], [Ville], [Code Postal], SIRET [Numéro], joignable à l'adresse e-mail [Email] et au numéro de téléphone [Téléphone].",
    purposesHeading: "Finalités du traitement",
    purposesIntro: "Vos données personnelles seront traitées pour les finalités suivantes:",
    purposes: [
      "Fourniture des services demandés et gestion des rendez-vous",
      "Respect des obligations contractuelles et légales",
      "Gestion administrative et comptable",
      "Envoi de communications relatives aux services souscrits",
      "Envoi de rappels de rendez-vous"
    ],
    legalBasisHeading: "Base juridique du traitement",
    legalBasisIntro: "Le traitement de vos données personnelles est fondé sur les bases juridiques suivantes:",
    legalBasis: [
      "Exécution d'un contrat auquel vous êtes partie",
      "Respect des obligations légales",
      "Consentement que vous avez donné pour des finalités spécifiques",
      "Intérêt légitime du responsable du traitement"
    ],
    dataCategoriesHeading: "Catégories de données traitées",
    dataCategoriesIntro: "Le traitement concernera les catégories de données suivantes:",
    dataCategories: [
      "Données d'identification et de contact (nom, prénom, adresse, email, téléphone)",
      "Données relatives à la santé (informations médicales pertinentes pour le traitement)",
      "Données fiscales (nécessaires à la facturation)",
      "Données relatives aux préférences de rendez-vous"
    ],
    dataProcessingHeading: "Modalités de traitement",
    dataProcessing: "Le traitement des données sera effectué par des moyens électroniques et papier, avec une logique strictement liée aux finalités pour lesquelles elles sont collectées et, dans tous les cas, de manière à garantir la sécurité et la confidentialité des données elles-mêmes.",
    retentionPeriodHeading: "Période de conservation",
    retentionPeriod: "Les données personnelles seront conservées pendant le temps nécessaire à la fourniture des services demandés et au respect des obligations légales, et en aucun cas au-delà des délais prévus par la réglementation en vigueur.",
    dataRecipientsHeading: "Destinataires des données",
    dataRecipientsIntro: "Les données peuvent être communiquées à:",
    dataRecipients: [
      "Personnel autorisé du Responsable du traitement",
      "Parties externes désignées comme Sous-traitants (consultants, fournisseurs de services techniques)",
      "Organismes publics et privés lorsque prévu par la loi ou le règlement"
    ],
    dataTransferHeading: "Transfert de données",
    dataTransfer: "Les données personnelles ne seront pas transférées vers des pays hors de l'Union européenne.",
    rightsTitle: "Droits de la personne concernée",
    rightsIntro: "En tant que personne concernée, vous avez le droit de:",
    rights: [
      "Accéder à vos données personnelles",
      "Demander leur rectification ou leur effacement",
      "Demander la limitation du traitement",
      "S'opposer au traitement",
      "Demander la portabilité des données",
      "Retirer votre consentement à tout moment, sans porter atteinte à la licéité du traitement fondé sur le consentement avant le retrait de celui-ci"
    ],
    consentNatureHeading: "Nature de la fourniture des données",
    consentNature: "La fourniture de données personnelles est nécessaire pour la prestation des services demandés. L'absence de ces données rend impossible la fourniture des services demandés.",
    automatedDecisionMakingHeading: "Processus décisionnel automatisé",
    automatedDecisionMaking: "Il n'existe aucun processus décisionnel automatisé, y compris le profilage.",
    consentStatement: "Je déclare avoir lu et compris les informations sur la protection des données et je donne mon consentement au traitement de mes données personnelles pour les finalités indiquées",
    consentAlreadyProvided: "Vous avez déjà donné votre consentement au traitement des données personnelles",
    consentAlreadyProvidedPrevious: "Vous avez déjà donné votre consentement au traitement des données personnelles à une date antérieure.",
    saving: "Enregistrement en cours...",
    provideConsent: "Donner consentement"
  },

  // RUSSO (Russia - Legge Federale №152-FZ)
  "ru-RU": {
    language: "Русский",
    languageCode: "ru",
    countryCode: "RU",
    title: "Информация об обработке персональных данных",
    introduction: "В соответствии с Федеральным законом №152-ФЗ «О персональных данных»",
    dataControllerHeading: "Оператор персональных данных",
    dataController: "Оператором персональных данных является [Название Клиники/Специалиста], с местонахождением по адресу [Адрес], [Город], [Индекс], ИНН [Номер], с которым можно связаться по электронной почте [Email] и по телефону [Телефон].",
    purposesHeading: "Цели обработки",
    purposesIntro: "Ваши персональные данные будут обработаны для следующих целей:",
    purposes: [
      "Предоставление запрошенных услуг и управление записями на прием",
      "Выполнение договорных и юридических обязательств",
      "Административное и бухгалтерское управление",
      "Отправка сообщений, связанных с подписанными услугами",
      "Отправка напоминаний о записи на прием"
    ],
    legalBasisHeading: "Правовое основание обработки",
    legalBasisIntro: "Обработка ваших персональных данных основана на следующих правовых основаниях:",
    legalBasis: [
      "Исполнение договора, стороной которого вы являетесь",
      "Соблюдение юридических обязательств",
      "Согласие, которое вы дали для конкретных целей",
      "Законные интересы оператора"
    ],
    dataCategoriesHeading: "Категории обрабатываемых данных",
    dataCategoriesIntro: "Обработка затронет следующие категории данных:",
    dataCategories: [
      "Идентификационные и контактные данные (имя, фамилия, адрес, электронная почта, телефон)",
      "Данные о здоровье (медицинская информация, относящаяся к лечению)",
      "Налоговые данные (необходимые для выставления счетов)",
      "Данные о предпочтениях по записи на прием"
    ],
    dataProcessingHeading: "Методы обработки",
    dataProcessing: "Обработка данных будет осуществляться с использованием электронных и бумажных средств, с логикой, строго связанной с целями, для которых они собираются, и в любом случае таким образом, чтобы гарантировать безопасность и конфиденциальность самих данных.",
    retentionPeriodHeading: "Срок хранения",
    retentionPeriod: "Персональные данные будут храниться в течение времени, необходимого для предоставления запрошенных услуг и выполнения юридических обязательств, и в любом случае не дольше сроков, предусмотренных действующим законодательством.",
    dataRecipientsHeading: "Получатели данных",
    dataRecipientsIntro: "Данные могут быть переданы:",
    dataRecipients: [
      "Уполномоченный персонал Оператора",
      "Внешние стороны, назначенные Обработчиками (консультанты, поставщики технических услуг)",
      "Государственные и частные организации, когда это предусмотрено законом или регламентом"
    ],
    dataTransferHeading: "Передача данных",
    dataTransfer: "Ваши персональные данные не будут передаваться в страны за пределами Российской Федерации без вашего явного согласия и без обеспечения надлежащих мер защиты.",
    rightsTitle: "Ваши права",
    rightsIntro: "Как субъект данных, вы имеете право:",
    rights: [
      "Доступ к вашим персональным данным",
      "Требование их исправления или удаления",
      "Ограничение обработки",
      "Возражение против обработки",
      "Требование передачи данных",
      "Отзыв согласия в любое время, без ущерба для законности обработки, основанной на согласии до его отзыва"
    ],
    consentNatureHeading: "Характер предоставления данных",
    consentNature: "Предоставление персональных данных необходимо для оказания запрошенных услуг. Отсутствие этих данных делает невозможным предоставление запрошенных услуг.",
    automatedDecisionMakingHeading: "Автоматизированное принятие решений",
    automatedDecisionMaking: "Отсутствует какой-либо процесс автоматизированного принятия решений, включая профилирование.",
    consentStatement: "Я заявляю, что прочитал(а) и понял(а) информацию о защите персональных данных и даю свое согласие на обработку моих персональных данных для указанных целей",
    consentAlreadyProvided: "Вы уже предоставили согласие на обработку персональных данных",
    consentAlreadyProvidedPrevious: "Вы уже предоставили согласие на обработку персональных данных ранее.",
    saving: "Сохранение...",
    provideConsent: "Дать согласие"
  },

  // CINESE (Cina - PIPL)
  "zh-CN": {
    language: "中文",
    languageCode: "zh",
    countryCode: "CN",
    title: "个人信息处理声明",
    introduction: "根据《中华人民共和国个人信息保护法》",
    dataControllerHeading: "数据控制者",
    dataController: "个人信息处理者是 [诊所/专业人士名称]，地址位于 [地址]，[城市]，[邮编]，可通过电子邮件 [Email] 和电话号码 [电话] 联系。",
    purposesHeading: "处理目的",
    purposesIntro: "提供个人信息的目的：",
    purposes: [
      "提供所请求的服务和预约管理",
      "履行合同和法律义务",
      "行政和会计管理",
      "发送与订阅服务相关的通信",
      "发送预约提醒"
    ],
    legalBasisHeading: "法律依据",
    legalBasisIntro: "处理您个人信息的法律依据：",
    legalBasis: [
      "履行您作为一方的合同",
      "遵守法律义务",
      "您为特定目的提供的同意",
      "处理者的合法权益"
    ],
    dataCategoriesHeading: "数据类别",
    dataCategoriesIntro: "处理涉及以下类别的数据：",
    dataCategories: [
      "身份和联系信息（姓名、地址、电子邮件、电话号码）",
      "健康信息（与治疗相关的医疗信息）",
      "财务信息（用于结算）",
      "预约偏好数据"
    ],
    dataProcessingHeading: "处理方式",
    dataProcessing: "数据处理将使用电子和纸质方法进行，其逻辑与收集数据的目的严格相关，并且在任何情况下，都会确保数据本身的安全性和机密性。",
    retentionPeriodHeading: "保留期限",
    retentionPeriod: "个人信息将保留提供所请求服务和履行法律义务所需的时间，并且在任何情况下不会超过现行法规规定的期限。",
    dataRecipientsHeading: "数据接收者",
    dataRecipientsIntro: "数据可能会传达给：",
    dataRecipients: [
      "处理者授权的人员",
      "被指定为处理方的外部方（顾问、技术服务提供商）",
      "法律或法规要求的公共和私人实体"
    ],
    dataTransferHeading: "数据传输",
    dataTransfer: "未经您的明确同意并确保适当的保护措施，您的个人信息不会转移到中华人民共和国境外。",
    rightsTitle: "您的权利",
    rightsIntro: "作为数据主体，您有权：",
    rights: [
      "访问您的个人信息",
      "要求更正或删除",
      "要求限制处理",
      "反对处理",
      "要求数据可携带性",
      "随时撤回同意，而不影响撤回前基于同意的处理的合法性"
    ],
    consentNatureHeading: "提供数据的性质",
    consentNature: "提供个人信息对于提供所请求的服务是必要的。缺少这些数据将导致无法提供所请求的服务。",
    automatedDecisionMakingHeading: "自动化决策",
    automatedDecisionMaking: "不存在任何自动化决策过程，包括分析。",
    consentStatement: "我声明我已阅读并理解个人信息保护声明，并同意出于所述目的处理我的个人信息",
    consentAlreadyProvided: "您已提供个人信息处理同意",
    consentAlreadyProvidedPrevious: "您已于之前日期提供了个人信息处理同意。",
    saving: "保存中...",
    provideConsent: "提供同意"
  }
};

// Funzione per ottenere il testo di consenso in base alla lingua selezionata
export function getConsentText(languageCode: string): ConsentText {
  return consentTexts[languageCode] || consentTexts["it-IT"]; // Default a italiano se la lingua non è supportata
}

// Lista delle lingue disponibili per la selezione
export const availableLanguages = Object.values(consentTexts).map(consent => ({
  code: `${consent.languageCode}-${consent.countryCode}`,
  name: consent.language
}));