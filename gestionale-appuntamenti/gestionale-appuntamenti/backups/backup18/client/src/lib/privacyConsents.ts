// Testo dei consensi privacy in diverse lingue/giurisdizioni
// Ogni testo è conforme alle normative locali di ogni paese

export interface ConsentText {
  language: string;
  languageCode: string;
  countryCode: string;
  title: string;
  introduction: string;
  dataController: string;
  purposes: string[];
  legalBasis: string[];
  dataCategories: string[];
  dataProcessing: string;
  retentionPeriod: string;
  dataRecipients: string[];
  dataTransfer: string;
  rightsTitle: string;
  rights: string[];
  consentNature: string;
  automatedDecisionMaking: string;
  consentStatement: string;
}

export const consentTexts: Record<string, ConsentText> = {
  // ITALIANO (GDPR - Italia)
  "it-IT": {
    language: "Italiano",
    languageCode: "it",
    countryCode: "IT",
    title: "Informativa sul trattamento dei dati personali",
    introduction: "Ai sensi dell'art. 13 del Regolamento UE 2016/679 (GDPR)",
    dataController: "Il titolare del trattamento è [Nome Studio/Professionista], con sede in [Indirizzo], [Città], [CAP], [Provincia], P.IVA [Numero], contattabile all'indirizzo email [Email] e al numero di telefono [Telefono].",
    purposes: [
      "Erogazione dei servizi richiesti e gestione degli appuntamenti",
      "Adempimento di obblighi contrattuali e legali",
      "Gestione amministrativa e contabile",
      "Invio di comunicazioni relative ai servizi sottoscritti",
      "Invio di promemoria per gli appuntamenti"
    ],
    legalBasis: [
      "Esecuzione di un contratto di cui Lei è parte",
      "Adempimento di obblighi legali cui è soggetto il titolare",
      "Consenso da Lei espresso per specifiche finalità",
      "Legittimo interesse del titolare"
    ],
    dataCategories: [
      "Dati anagrafici e di contatto (nome, cognome, indirizzo, email, telefono)",
      "Dati relativi alla salute (informazioni mediche pertinenti al trattamento)",
      "Dati fiscali (necessari per la fatturazione)",
      "Eventuali dati relativi a preferenze di appuntamento"
    ],
    dataProcessing: "Il trattamento dei dati avverrà mediante strumenti elettronici e cartacei, con logiche strettamente correlate alle finalità per cui sono raccolti e, comunque, in modo da garantire la sicurezza e la riservatezza dei dati stessi.",
    retentionPeriod: "I dati personali saranno conservati per il tempo necessario all'erogazione dei servizi richiesti e per l'adempimento degli obblighi di legge, e comunque non oltre i termini previsti dalla normativa vigente.",
    dataRecipients: [
      "Personale autorizzato del Titolare",
      "Soggetti esterni nominati Responsabili del trattamento (consulenti, fornitori di servizi tecnici)",
      "Enti pubblici e privati quando previsto da norme di legge o di regolamento"
    ],
    dataTransfer: "I dati personali non saranno trasferiti in Paesi terzi extra UE.",
    rightsTitle: "Diritti dell'interessato",
    rights: [
      "Accedere ai Suoi dati personali",
      "Chiederne la rettifica o la cancellazione",
      "Chiedere la limitazione del trattamento",
      "Opporsi al trattamento",
      "Richiedere la portabilità dei dati",
      "Revocare il consenso in qualsiasi momento, senza pregiudicare la liceità del trattamento basata sul consenso prima della revoca"
    ],
    consentNature: "Il conferimento dei dati personali è necessario per l'erogazione dei servizi richiesti. Il mancato conferimento di tali dati comporta l'impossibilità di erogare i servizi richiesti.",
    automatedDecisionMaking: "Non è presente alcun processo decisionale automatizzato, compresa la profilazione.",
    consentStatement: "Dichiaro di aver letto e compreso l'informativa sulla privacy e acconsento al trattamento dei miei dati personali per le finalità indicate"
  },

  // INGLESE (USA - CCPA/CPRA California)
  "en-US": {
    language: "English (US)",
    languageCode: "en",
    countryCode: "US",
    title: "Privacy Notice",
    introduction: "Pursuant to the California Consumer Privacy Act (CCPA) as amended by the California Privacy Rights Act (CPRA)",
    dataController: "[Business/Professional Name], with headquarters at [Address], [City], [State], [ZIP Code], can be reached at email [Email] and phone number [Phone].",
    purposes: [
      "Providing the services you requested and appointment management",
      "Fulfilling our contractual and legal obligations",
      "Administrative and accounting management",
      "Sending communications related to subscribed services",
      "Sending appointment reminders"
    ],
    legalBasis: [
      "Performance of a contract to which you are a party",
      "Compliance with legal obligations",
      "Consent you have provided for specific purposes",
      "Legitimate interests"
    ],
    dataCategories: [
      "Identifiers and contact information (name, address, email, phone number)",
      "Health information (medical information relevant to treatment)",
      "Financial information (necessary for billing)",
      "Commercial information (appointment preferences)"
    ],
    dataProcessing: "Your personal information will be processed using electronic and paper-based methods, with logic strictly related to the purposes for which they are collected and, in any case, in a way that guarantees the security and confidentiality of the data.",
    retentionPeriod: "Your personal information will be retained for the time necessary to provide the requested services and to comply with legal obligations, and in any case no longer than the terms required by current regulations.",
    dataRecipients: [
      "Authorized personnel of the Controller",
      "External parties appointed as Data Processors (consultants, technical service providers)",
      "Public and private entities when required by law or regulation"
    ],
    dataTransfer: "Your personal information will not be transferred to countries outside the United States.",
    rightsTitle: "Your Rights",
    rights: [
      "Right to know about personal information collected, disclosed, or sold",
      "Right to delete personal information collected from you",
      "Right to opt-out of the sale of your personal information",
      "Right to correct inaccurate personal information",
      "Right to limit use and disclosure of sensitive personal information",
      "Right to non-discrimination for exercising your privacy rights"
    ],
    consentNature: "Providing your personal information is necessary for the provision of the requested services. Failure to provide such data makes it impossible to provide the requested services.",
    automatedDecisionMaking: "We do not use automated decision-making, including profiling.",
    consentStatement: "I declare that I have read and understood the privacy notice and consent to the processing of my personal information for the purposes indicated"
  },

  // SPAGNOLO (Spagna - RGPD/LOPDGDD)
  "es-ES": {
    language: "Español",
    languageCode: "es",
    countryCode: "ES",
    title: "Información sobre el tratamiento de datos personales",
    introduction: "De conformidad con el art. 13 del Reglamento UE 2016/679 (RGPD) y la Ley Orgánica 3/2018 (LOPDGDD)",
    dataController: "El responsable del tratamiento es [Nombre de la Clínica/Profesional], con domicilio en [Dirección], [Ciudad], [Código Postal], [Provincia], NIF [Número], contactable en la dirección de correo electrónico [Email] y en el número de teléfono [Teléfono].",
    purposes: [
      "Prestación de los servicios solicitados y gestión de citas",
      "Cumplimiento de obligaciones contractuales y legales",
      "Gestión administrativa y contable",
      "Envío de comunicaciones relacionadas con los servicios contratados",
      "Envío de recordatorios de citas"
    ],
    legalBasis: [
      "Ejecución de un contrato en el que usted es parte",
      "Cumplimiento de obligaciones legales",
      "Consentimiento otorgado para finalidades específicas",
      "Interés legítimo del responsable"
    ],
    dataCategories: [
      "Datos identificativos y de contacto (nombre, apellidos, dirección, email, teléfono)",
      "Datos relativos a la salud (información médica relevante para el tratamiento)",
      "Datos fiscales (necesarios para la facturación)",
      "Datos sobre preferencias de citas"
    ],
    dataProcessing: "El tratamiento de datos se realizará mediante herramientas electrónicas y en papel, con lógicas estrictamente relacionadas con las finalidades para las que se recopilan y, en cualquier caso, de manera que garantice la seguridad y confidencialidad de los mismos.",
    retentionPeriod: "Los datos personales se conservarán durante el tiempo necesario para la prestación de los servicios solicitados y para el cumplimiento de las obligaciones legales, y en ningún caso más allá de los términos previstos por la normativa vigente.",
    dataRecipients: [
      "Personal autorizado del Responsable",
      "Terceros designados como Encargados del Tratamiento (consultores, proveedores de servicios técnicos)",
      "Entidades públicas y privadas cuando lo exija la ley o el reglamento"
    ],
    dataTransfer: "Los datos personales no serán transferidos a países fuera de la Unión Europea.",
    rightsTitle: "Derechos del interesado",
    rights: [
      "Acceder a sus datos personales",
      "Solicitar su rectificación o supresión",
      "Solicitar la limitación del tratamiento",
      "Oponerse al tratamiento",
      "Solicitar la portabilidad de los datos",
      "Retirar el consentimiento en cualquier momento, sin que ello afecte a la licitud del tratamiento basado en el consentimiento previo a su retirada"
    ],
    consentNature: "La provisión de datos personales es necesaria para la prestación de los servicios solicitados. La falta de estos datos imposibilita la prestación de los servicios solicitados.",
    automatedDecisionMaking: "No existe ningún proceso de toma de decisiones automatizado, incluida la elaboración de perfiles.",
    consentStatement: "Declaro haber leído y comprendido la información sobre protección de datos y doy mi consentimiento para el tratamiento de mis datos personales para las finalidades indicadas"
  },

  // TEDESCO (Germania - DSGVO)
  "de-DE": {
    language: "Deutsch",
    languageCode: "de",
    countryCode: "DE",
    title: "Datenschutzhinweise",
    introduction: "Gemäß Art. 13 der EU-Verordnung 2016/679 (DSGVO)",
    dataController: "Verantwortlicher für die Datenverarbeitung ist [Name der Praxis/des Fachmanns], mit Sitz in [Adresse], [Stadt], [PLZ], Steuer-ID [Nummer], erreichbar unter der E-Mail-Adresse [E-Mail] und der Telefonnummer [Telefon].",
    purposes: [
      "Bereitstellung der angeforderten Dienstleistungen und Terminverwaltung",
      "Erfüllung vertraglicher und gesetzlicher Verpflichtungen",
      "Verwaltungs- und Buchhaltungsmanagement",
      "Versenden von Mitteilungen im Zusammenhang mit abonnierten Diensten",
      "Versenden von Terminerinnerungen"
    ],
    legalBasis: [
      "Durchführung eines Vertrags, dessen Vertragspartei Sie sind",
      "Erfüllung einer rechtlichen Verpflichtung",
      "Ihre für bestimmte Zwecke erteilte Einwilligung",
      "Berechtigte Interessen des Verantwortlichen"
    ],
    dataCategories: [
      "Identifikations- und Kontaktdaten (Name, Anschrift, E-Mail, Telefonnummer)",
      "Gesundheitsdaten (für die Behandlung relevante medizinische Informationen)",
      "Steuerdaten (für die Rechnungsstellung erforderlich)",
      "Daten zu Terminpräferenzen"
    ],
    dataProcessing: "Die Verarbeitung der Daten erfolgt elektronisch und in Papierform, mit einer Logik, die streng mit den Zwecken zusammenhängt, für die sie erhoben werden, und in jedem Fall so, dass die Sicherheit und Vertraulichkeit der Daten gewährleistet ist.",
    retentionPeriod: "Ihre personenbezogenen Daten werden für die Zeit aufbewahrt, die für die Erbringung der angeforderten Dienstleistungen und für die Erfüllung gesetzlicher Verpflichtungen erforderlich ist, und in keinem Fall länger als die in den geltenden Vorschriften vorgesehenen Fristen.",
    dataRecipients: [
      "Befugtes Personal des Verantwortlichen",
      "Externe Parteien, die als Auftragsverarbeiter ernannt wurden (Berater, technische Dienstleister)",
      "Öffentliche und private Einrichtungen, wenn dies gesetzlich oder durch Vorschriften vorgesehen ist"
    ],
    dataTransfer: "Ihre personenbezogenen Daten werden nicht in Länder außerhalb der Europäischen Union übermittelt.",
    rightsTitle: "Rechte der betroffenen Person",
    rights: [
      "Auskunft über Ihre personenbezogenen Daten",
      "Berichtigung oder Löschung",
      "Einschränkung der Verarbeitung",
      "Widerspruch gegen die Verarbeitung",
      "Datenübertragbarkeit",
      "Jederzeitiger Widerruf Ihrer Einwilligung, ohne dass die Rechtmäßigkeit der aufgrund der Einwilligung bis zum Widerruf erfolgten Verarbeitung berührt wird"
    ],
    consentNature: "Die Bereitstellung personenbezogener Daten ist für die Erbringung der angeforderten Dienstleistungen erforderlich. Ohne diese Daten können die angeforderten Dienstleistungen nicht erbracht werden.",
    automatedDecisionMaking: "Es gibt keine automatisierte Entscheidungsfindung, einschließlich Profiling.",
    consentStatement: "Ich erkläre, dass ich die Datenschutzhinweise gelesen und verstanden habe, und ich willige in die Verarbeitung meiner personenbezogenen Daten für die angegebenen Zwecke ein"
  },

  // FRANCESE (Francia - RGPD)
  "fr-FR": {
    language: "Français",
    languageCode: "fr",
    countryCode: "FR",
    title: "Information sur le traitement des données personnelles",
    introduction: "Conformément à l'art. 13 du Règlement UE 2016/679 (RGPD)",
    dataController: "Le responsable du traitement est [Nom du Cabinet/Professionnel], avec siège à [Adresse], [Ville], [Code Postal], SIRET [Numéro], joignable à l'adresse e-mail [Email] et au numéro de téléphone [Téléphone].",
    purposes: [
      "Fourniture des services demandés et gestion des rendez-vous",
      "Respect des obligations contractuelles et légales",
      "Gestion administrative et comptable",
      "Envoi de communications relatives aux services souscrits",
      "Envoi de rappels de rendez-vous"
    ],
    legalBasis: [
      "Exécution d'un contrat auquel vous êtes partie",
      "Respect des obligations légales",
      "Consentement que vous avez donné pour des finalités spécifiques",
      "Intérêt légitime du responsable du traitement"
    ],
    dataCategories: [
      "Données d'identification et de contact (nom, prénom, adresse, email, téléphone)",
      "Données relatives à la santé (informations médicales pertinentes pour le traitement)",
      "Données fiscales (nécessaires à la facturation)",
      "Données relatives aux préférences de rendez-vous"
    ],
    dataProcessing: "Le traitement des données sera effectué par des moyens électroniques et papier, avec une logique strictement liée aux finalités pour lesquelles elles sont collectées et, dans tous les cas, de manière à garantir la sécurité et la confidentialité des données elles-mêmes.",
    retentionPeriod: "Les données personnelles seront conservées pendant le temps nécessaire à la fourniture des services demandés et au respect des obligations légales, et en aucun cas au-delà des délais prévus par la réglementation en vigueur.",
    dataRecipients: [
      "Personnel autorisé du Responsable du traitement",
      "Parties externes désignées comme Sous-traitants (consultants, fournisseurs de services techniques)",
      "Organismes publics et privés lorsque prévu par la loi ou le règlement"
    ],
    dataTransfer: "Les données personnelles ne seront pas transférées vers des pays hors de l'Union européenne.",
    rightsTitle: "Droits de la personne concernée",
    rights: [
      "Accéder à vos données personnelles",
      "Demander leur rectification ou leur effacement",
      "Demander la limitation du traitement",
      "S'opposer au traitement",
      "Demander la portabilité des données",
      "Retirer votre consentement à tout moment, sans porter atteinte à la licéité du traitement fondé sur le consentement avant le retrait de celui-ci"
    ],
    consentNature: "La fourniture de données personnelles est nécessaire pour la prestation des services demandés. L'absence de ces données rend impossible la fourniture des services demandés.",
    automatedDecisionMaking: "Il n'existe aucun processus décisionnel automatisé, y compris le profilage.",
    consentStatement: "Je déclare avoir lu et compris les informations sur la protection des données et je donne mon consentement au traitement de mes données personnelles pour les finalités indiquées"
  },

  // RUSSO (Russia - Legge Federale №152-FZ)
  "ru-RU": {
    language: "Русский",
    languageCode: "ru",
    countryCode: "RU",
    title: "Информация об обработке персональных данных",
    introduction: "В соответствии с Федеральным законом №152-ФЗ «О персональных данных»",
    dataController: "Оператором персональных данных является [Название Клиники/Специалиста], с местонахождением по адресу [Адрес], [Город], [Индекс], ИНН [Номер], с которым можно связаться по электронной почте [Email] и по телефону [Телефон].",
    purposes: [
      "Предоставление запрошенных услуг и управление записями на прием",
      "Выполнение договорных и юридических обязательств",
      "Административное и бухгалтерское управление",
      "Отправка сообщений, связанных с подписанными услугами",
      "Отправка напоминаний о записи на прием"
    ],
    legalBasis: [
      "Исполнение договора, стороной которого вы являетесь",
      "Соблюдение юридических обязательств",
      "Согласие, которое вы дали для конкретных целей",
      "Законные интересы оператора"
    ],
    dataCategories: [
      "Идентификационные и контактные данные (имя, фамилия, адрес, электронная почта, телефон)",
      "Данные о здоровье (медицинская информация, относящаяся к лечению)",
      "Налоговые данные (необходимые для выставления счетов)",
      "Данные о предпочтениях по записи на прием"
    ],
    dataProcessing: "Обработка данных будет осуществляться с использованием электронных и бумажных средств, с логикой, строго связанной с целями, для которых они собираются, и в любом случае таким образом, чтобы гарантировать безопасность и конфиденциальность самих данных.",
    retentionPeriod: "Персональные данные будут храниться в течение времени, необходимого для предоставления запрошенных услуг и выполнения юридических обязательств, и в любом случае не дольше сроков, предусмотренных действующим законодательством.",
    dataRecipients: [
      "Уполномоченный персонал Оператора",
      "Внешние стороны, назначенные Обработчиками (консультанты, поставщики технических услуг)",
      "Государственные и частные организации, когда это предусмотрено законом или регламентом"
    ],
    dataTransfer: "Ваши персональные данные не будут передаваться в страны за пределами Российской Федерации без вашего явного согласия и без обеспечения надлежащих мер защиты.",
    rightsTitle: "Ваши права",
    rights: [
      "Доступ к вашим персональным данным",
      "Требование их исправления или удаления",
      "Ограничение обработки",
      "Возражение против обработки",
      "Требование передачи данных",
      "Отзыв согласия в любое время, без ущерба для законности обработки, основанной на согласии до его отзыва"
    ],
    consentNature: "Предоставление персональных данных необходимо для оказания запрошенных услуг. Отсутствие этих данных делает невозможным предоставление запрошенных услуг.",
    automatedDecisionMaking: "Отсутствует какой-либо процесс автоматизированного принятия решений, включая профилирование.",
    consentStatement: "Я заявляю, что прочитал(а) и понял(а) информацию о защите персональных данных и даю свое согласие на обработку моих персональных данных для указанных целей"
  },

  // CINESE (Cina - PIPL)
  "zh-CN": {
    language: "中文",
    languageCode: "zh",
    countryCode: "CN",
    title: "个人信息处理声明",
    introduction: "根据《中华人民共和国个人信息保护法》",
    dataController: "个人信息处理者是 [诊所/专业人士名称]，地址位于 [地址]，[城市]，[邮编]，可通过电子邮件 [Email] 和电话号码 [电话] 联系。",
    purposes: [
      "提供所请求的服务和预约管理",
      "履行合同和法律义务",
      "行政和会计管理",
      "发送与订阅服务相关的通信",
      "发送预约提醒"
    ],
    legalBasis: [
      "履行您作为一方的合同",
      "遵守法律义务",
      "您为特定目的提供的同意",
      "处理者的合法权益"
    ],
    dataCategories: [
      "身份和联系信息（姓名、地址、电子邮件、电话号码）",
      "健康信息（与治疗相关的医疗信息）",
      "财务信息（用于结算）",
      "预约偏好数据"
    ],
    dataProcessing: "数据处理将使用电子和纸质方法进行，其逻辑与收集数据的目的严格相关，并且在任何情况下，都会确保数据本身的安全性和机密性。",
    retentionPeriod: "个人信息将保留提供所请求服务和履行法律义务所需的时间，并且在任何情况下不会超过现行法规规定的期限。",
    dataRecipients: [
      "处理者授权的人员",
      "被指定为处理方的外部方（顾问、技术服务提供商）",
      "法律或法规要求的公共和私人实体"
    ],
    dataTransfer: "未经您的明确同意并确保适当的保护措施，您的个人信息不会转移到中华人民共和国境外。",
    rightsTitle: "您的权利",
    rights: [
      "访问您的个人信息",
      "要求更正或删除",
      "要求限制处理",
      "反对处理",
      "要求数据可携带性",
      "随时撤回同意，而不影响撤回前基于同意的处理的合法性"
    ],
    consentNature: "提供个人信息对于提供所请求的服务是必要的。缺少这些数据将导致无法提供所请求的服务。",
    automatedDecisionMaking: "不存在任何自动化决策过程，包括分析。",
    consentStatement: "我声明我已阅读并理解个人信息保护声明，并同意出于所述目的处理我的个人信息"
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