import { GoogleGenerativeAI } from '@google/generative-ai';

let genAI: GoogleGenerativeAI | null = null;

function getGeminiClient(): GoogleGenerativeAI {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY environment variable is not configured");
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

export interface BusinessAnalysis {
  suggestedBusinessType: string;
  recommendedServices: string[];
  workingHoursRecommendation: string;
  clientManagementNeeds: string[];
  communicationPreferences: string[];
  integrationGoals: string[];
  personalizedTips: string[];
}

// Mappa codice lingua → istruzione esplicita per Gemini
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  it: 'Italian (Italiano)',
  en: 'English',
  es: 'Spanish (Español)',
  fr: 'French (Français)',
  de: 'German (Deutsch)',
  nl: 'Dutch (Nederlands)',
  no: 'Norwegian (Norsk)',
  ro: 'Romanian (Română)',
  ru: 'Russian (Русский)',
};

// Fallback localizzati per quando Gemini fallisce o la chiave manca
const FALLBACK_BY_LANG: Record<string, BusinessAnalysis> = {
  it: {
    suggestedBusinessType: 'consulting',
    recommendedServices: ['Consulenza', 'Visita di controllo', 'Prima visita'],
    workingHoursRecommendation: 'Lunedì - Venerdì, 9:00 - 18:00',
    clientManagementNeeds: ['gestione-appuntamenti', 'comunicazione-clienti', 'gestione-pagamenti'],
    communicationPreferences: ['email', 'whatsapp'],
    integrationGoals: ['sincronizzazione-calendario', 'promemoria-automatici', 'portale-clienti'],
    personalizedTips: [
      'Inizia con la gestione base degli appuntamenti',
      'Configura promemoria automatici per ridurre gli assenti',
      'Crea un portale clienti per prenotazioni facili',
    ],
  },
  en: {
    suggestedBusinessType: 'consulting',
    recommendedServices: ['Consultation', 'Follow-up', 'Initial visit'],
    workingHoursRecommendation: 'Monday to Friday, 9:00 AM to 6:00 PM',
    clientManagementNeeds: ['appointment-scheduling', 'client-communication', 'payment-tracking'],
    communicationPreferences: ['email', 'whatsapp'],
    integrationGoals: ['calendar-sync', 'automated-reminders', 'client-portal'],
    personalizedTips: [
      'Start with basic appointment scheduling',
      'Set up automated reminders to reduce no-shows',
      'Create a simple client portal for easy booking',
    ],
  },
  es: {
    suggestedBusinessType: 'consulting',
    recommendedServices: ['Consulta', 'Seguimiento', 'Primera visita'],
    workingHoursRecommendation: 'Lunes a viernes, 9:00 - 18:00',
    clientManagementNeeds: ['gestión-citas', 'comunicación-clientes', 'gestión-pagos'],
    communicationPreferences: ['email', 'whatsapp'],
    integrationGoals: ['sincronización-calendario', 'recordatorios-automáticos', 'portal-clientes'],
    personalizedTips: [
      'Empieza con la gestión básica de citas',
      'Configura recordatorios automáticos para reducir ausencias',
      'Crea un portal de clientes para reservas fáciles',
    ],
  },
  fr: {
    suggestedBusinessType: 'consulting',
    recommendedServices: ['Consultation', 'Suivi', 'Première visite'],
    workingHoursRecommendation: 'Lundi à vendredi, 9h00 - 18h00',
    clientManagementNeeds: ['gestion-rendez-vous', 'communication-clients', 'suivi-paiements'],
    communicationPreferences: ['email', 'whatsapp'],
    integrationGoals: ['synchronisation-calendrier', 'rappels-automatiques', 'portail-clients'],
    personalizedTips: [
      'Commencez par la gestion de base des rendez-vous',
      'Configurez des rappels automatiques pour réduire les absences',
      'Créez un portail client pour des réservations faciles',
    ],
  },
  de: {
    suggestedBusinessType: 'consulting',
    recommendedServices: ['Beratung', 'Nachsorge', 'Erstbesuch'],
    workingHoursRecommendation: 'Montag bis Freitag, 9:00 - 18:00 Uhr',
    clientManagementNeeds: ['terminverwaltung', 'kundenkommunikation', 'zahlungsverwaltung'],
    communicationPreferences: ['email', 'whatsapp'],
    integrationGoals: ['kalender-synchronisation', 'automatische-erinnerungen', 'kundenportal'],
    personalizedTips: [
      'Beginnen Sie mit der einfachen Terminverwaltung',
      'Richten Sie automatische Erinnerungen ein, um Ausfälle zu reduzieren',
      'Erstellen Sie ein einfaches Kundenportal für die Buchung',
    ],
  },
  nl: {
    suggestedBusinessType: 'consulting',
    recommendedServices: ['Consult', 'Vervolgafspraak', 'Eerste bezoek'],
    workingHoursRecommendation: 'Maandag tot vrijdag, 9:00 - 18:00 uur',
    clientManagementNeeds: ['afsprakenbeheer', 'klantcommunicatie', 'betalingsbeheer'],
    communicationPreferences: ['email', 'whatsapp'],
    integrationGoals: ['agenda-synchronisatie', 'automatische-herinneringen', 'klantportaal'],
    personalizedTips: [
      'Begin met basis afsprakenbeheer',
      'Stel automatische herinneringen in om no-shows te verminderen',
      'Maak een klantportaal voor eenvoudig boeken',
    ],
  },
  no: {
    suggestedBusinessType: 'consulting',
    recommendedServices: ['Konsultasjon', 'Oppfølging', 'Førstegangsbesøk'],
    workingHoursRecommendation: 'Mandag til fredag, 9:00 - 18:00',
    clientManagementNeeds: ['avtalehåndtering', 'kundekommunikasjon', 'betalingshåndtering'],
    communicationPreferences: ['email', 'whatsapp'],
    integrationGoals: ['kalendersynkronisering', 'automatiske-påminnelser', 'kundeportal'],
    personalizedTips: [
      'Start med grunnleggende avtalehåndtering',
      'Sett opp automatiske påminnelser for å redusere uteblivelser',
      'Lag en enkel kundeportal for enkel booking',
    ],
  },
  ro: {
    suggestedBusinessType: 'consulting',
    recommendedServices: ['Consultație', 'Control', 'Prima vizită'],
    workingHoursRecommendation: 'Luni - vineri, 9:00 - 18:00',
    clientManagementNeeds: ['gestionare-programări', 'comunicare-clienți', 'gestionare-plăți'],
    communicationPreferences: ['email', 'whatsapp'],
    integrationGoals: ['sincronizare-calendar', 'memento-uri-automate', 'portal-clienți'],
    personalizedTips: [
      'Începe cu gestionarea de bază a programărilor',
      'Configurează memento-uri automate pentru a reduce absențele',
      'Creează un portal pentru clienți pentru rezervări simple',
    ],
  },
  ru: {
    suggestedBusinessType: 'consulting',
    recommendedServices: ['Консультация', 'Повторный приём', 'Первичный приём'],
    workingHoursRecommendation: 'Понедельник - пятница, 9:00 - 18:00',
    clientManagementNeeds: ['управление-записями', 'связь-с-клиентами', 'учёт-платежей'],
    communicationPreferences: ['email', 'whatsapp'],
    integrationGoals: ['синхронизация-календаря', 'автонапоминания', 'портал-клиентов'],
    personalizedTips: [
      'Начните с базового управления записями',
      'Настройте автонапоминания для снижения неявок',
      'Создайте простой портал для удобного бронирования клиентами',
    ],
  },
};

export async function analyzeBusinessNeeds(responses: {
  businessName?: string;
  businessDescription?: string;
  currentChallenges?: string[];
  targetClients?: string;
  existingTools?: string[];
  teamSize?: number;
  language?: string;
}): Promise<BusinessAnalysis> {
  const lang = (responses.language || 'en').toLowerCase().split('-')[0];
  const langName = LANGUAGE_INSTRUCTIONS[lang] || LANGUAGE_INSTRUCTIONS.en;
  const fallback = FALLBACK_BY_LANG[lang] || FALLBACK_BY_LANG.en;

  try {
    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are an expert business consultant specializing in appointment management systems. Provide practical, actionable recommendations based on business analysis. Always respond with valid JSON only, no extra text.

CRITICAL LANGUAGE REQUIREMENT: ALL string values in the JSON output (recommendedServices, workingHoursRecommendation, clientManagementNeeds, communicationPreferences, integrationGoals, personalizedTips) MUST be written in ${langName}. The "suggestedBusinessType" field is the only field that must remain in English (one of the listed enum values). Do NOT translate the enum value, but DO translate everything else into ${langName}.

Analyze this business for appointment management setup:

Business Name: ${responses.businessName || 'Not specified'}
Description: ${responses.businessDescription || 'Not specified'}
Current Challenges: ${responses.currentChallenges?.join(', ') || 'Not specified'}
Target Clients: ${responses.targetClients || 'Not specified'}
Existing Tools: ${responses.existingTools?.join(', ') || 'None'}
Team Size: ${responses.teamSize || 'Not specified'}

Provide recommendations in this exact JSON format (remember: all string values except suggestedBusinessType must be in ${langName}):
{
  "suggestedBusinessType": "medical|beauty|consulting|fitness|legal|other",
  "recommendedServices": ["service1", "service2", "service3"],
  "workingHoursRecommendation": "suggested schedule description",
  "clientManagementNeeds": ["need1", "need2", "need3"],
  "communicationPreferences": ["email", "whatsapp"],
  "integrationGoals": ["goal1", "goal2", "goal3"],
  "personalizedTips": ["tip1", "tip2", "tip3"]
}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) throw new Error("No response from Gemini");

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const analysis = JSON.parse(jsonMatch[0]);
    return analysis;
  } catch (error) {
    console.error("Error analyzing business needs:", error);
    return fallback;
  }
}

export async function generateCustomizedRecommendations(
  businessType: string,
  currentStep: number,
  userResponses: any
): Promise<string[]> {
  try {
    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a helpful assistant providing personalized business setup recommendations. Focus on practical, implementable advice. Respond with valid JSON only.

Generate 3 specific, actionable recommendations for a ${businessType} business at onboarding step ${currentStep}.

User responses so far: ${JSON.stringify(userResponses)}

Respond with this exact JSON format:
{"recommendations": ["recommendation1", "recommendation2", "recommendation3"]}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) throw new Error("No response from Gemini");
    
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");
    
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed.recommendations || [];
  } catch (error) {
    console.error("Error generating recommendations:", error);
    return [
      "Configure your core services and pricing",
      "Set up automated client communication",
      "Integrate with your existing calendar system"
    ];
  }
}

export async function generateWelcomeMessage(businessName: string, businessType: string): Promise<string> {
  try {
    const model = getGeminiClient().getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent(
      `You are a friendly AI assistant helping business owners set up their appointment management system. Generate a warm, personalized welcome message for ${businessName}, a ${businessType} business. Keep it professional but friendly, and mention the benefits of a well-organized appointment system. Keep it under 200 words.`
    );

    return result.response.text() || `Welcome to ${businessName}! Let's set up your appointment management system to help you serve your clients better.`;
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return `Welcome to ${businessName}! Let's set up your appointment management system to help you serve your clients better.`;
  }
}
