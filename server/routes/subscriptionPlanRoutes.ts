import { Router } from 'express';
import { requireAuth } from '../middleware/authMiddleware';
import { storage } from '../storage';
import { PLAN_FEATURE_SLUGS, PlanFeatureEntry } from '../../shared/schema';

const router = Router();

// Map from legacy display strings (Italian/English) to stable slugs.
// Applied server-side when a plan is created or updated so the DB always holds slugs.
const LEGACY_NAME_TO_SLUG: Record<string, string> = {
  'Appointment calendar': 'calendar',
  'Client management': 'clients',
  'QR/PWA app for clients': 'qrPwa',
  'Client appointment requests': 'appointmentRequests',
  'Client notifications': 'notifications',
  'Invoice generation': 'invoices',
  'Google Calendar sync': 'googleCalendar',
  'Reports and statistics': 'reports',
  'Promotional packages': 'packages',
  'Multi-staff management': 'multiStaff',
  'Product inventory': 'inventory',
  'AI Marketing campaigns': 'marketingAI',
  'Calendario appuntamenti': 'calendar',
  'Gestione appuntamenti': 'calendar',
  'Gestione appuntamenti base': 'calendar',
  'Gestione clienti': 'clients',
  'App QR/PWA per clienti': 'qrPwa',
  'PWA area clienti scaricabile': 'qrPwa',
  'Richiesta appuntamenti cliente': 'appointmentRequests',
  'Notifiche clienti': 'notifications',
  'Notifiche ai clienti': 'notifications',
  'Notifiche email': 'notifications',
  'Emissione fatture': 'invoices',
  'Gestione fatture': 'invoices',
  'Sincronizzazione Google Calendar': 'googleCalendar',
  'Integrazione Google Calendar': 'googleCalendar',
  'Integrazione calendario': 'googleCalendar',
  'Report e statistiche': 'reports',
  'Report dettagliati': 'reports',
  'Report avanzati': 'reports',
  'Pacchetti promozionali': 'packages',
  'Gestione piu dipendenti': 'multiStaff',
  'Gestione più dipendenti': 'multiStaff',
  'Supporto per più operatori': 'multiStaff',
  'Magazzino prodotti': 'inventory',
  'Campagne Marketing AI': 'marketingAI',
};

const VALID_SLUGS = new Set<string>(PLAN_FEATURE_SLUGS);

/**
 * Normalises a raw features value (from the request body) into an array of
 * PlanFeatureEntry objects that always use a valid slug as the `key`.
 * Entries whose key cannot be resolved to a known slug are silently dropped.
 */
function normalizeFeatures(raw: unknown): PlanFeatureEntry[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const result: PlanFeatureEntry[] = [];
  for (const item of raw) {
    if (typeof item === 'string') {
      const slug = LEGACY_NAME_TO_SLUG[item] ?? (VALID_SLUGS.has(item) ? item : null);
      if (slug) result.push({ key: slug as PlanFeatureEntry['key'], included: true });
    } else if (item && typeof item === 'object') {
      const key = (item as any).key ?? LEGACY_NAME_TO_SLUG[(item as any).name ?? ''];
      if (key && VALID_SLUGS.has(key)) {
        result.push({ key: key as PlanFeatureEntry['key'], included: (item as any).included ?? true });
      }
    }
  }
  return result.length > 0 ? result : undefined;
}

router.get("/api/subscription-plans", async (req, res) => {
  try {
    const plans = await storage.getActiveSubscriptionPlans();
    res.json(plans);
  } catch (error) {
    console.error('Error loading subscription plans:', error);
    res.status(500).json({ message: "Error loading plans" });
  }
});

router.post("/api/subscription-plans", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Only admin can create plans" });
  }

  try {
    const body = { ...req.body };
    if (body.features !== undefined) {
      body.features = normalizeFeatures(body.features);
    }
    const newPlan = await storage.createSubscriptionPlan(body);

    // Auto-seed an empty preset description entry for the new plan name
    // if one does not already exist, so the Preset Defaults section shows it immediately.
    const planName: string = newPlan.name?.trim();
    if (planName) {
      const setting = await storage.getSetting(PLAN_PRESET_DESCRIPTIONS_KEY);
      let presets: Record<string, Record<string, string>> = {};
      if (setting?.value) {
        try {
          const parsed = JSON.parse(setting.value);
          presets = migratePresets(parsed);
        } catch { /* ignore */ }
      }
      const existingKey = Object.keys(presets).find(
        (k) => k.toLowerCase() === planName.toLowerCase()
      );
      if (!existingKey) {
        presets[planName] = {};
        await storage.saveSetting(
          PLAN_PRESET_DESCRIPTIONS_KEY,
          JSON.stringify(presets),
          'Editable plan preset descriptions',
          'plans'
        );
      }
    }

    res.json(newPlan);
  } catch (error) {
    console.error('Error creating plan:', error);
    res.status(500).json({ message: "Error creating plan" });
  }
});

router.put("/api/subscription-plans/:id", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Only admin can modify plans" });
  }

  try {
    const planId = parseInt(req.params.id);
    const body = { ...req.body };
    if (body.features !== undefined) {
      body.features = normalizeFeatures(body.features);
    }
    const updatedPlan = await storage.updateSubscriptionPlan(planId, body);
    res.json(updatedPlan);
  } catch (error) {
    console.error('Error updating plan:', error);
    res.status(500).json({ message: "Error updating plan" });
  }
});

router.delete("/api/subscription-plans/:id", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Only admin can delete plans" });
  }

  try {
    const planId = parseInt(req.params.id);
    await storage.updateSubscriptionPlan(planId, { isActive: false });
    res.json({ message: "Plan deactivated successfully" });
  } catch (error) {
    console.error('Error deleting plan:', error);
    res.status(500).json({ message: "Error deleting plan" });
  }
});

const PLAN_PRESET_DESCRIPTIONS_KEY = 'plan_preset_descriptions';

// Canonical descriptions for all 9 supported locales, sourced from client/src/locales/*.json → plans.*.description
// Stored in nested format: { planSlug: { locale: description } }
const CANONICAL_PRESET_DESCRIPTIONS: Record<string, Record<string, string>> = {
  base: {
    it: 'Piano base per professionisti individuali. Gestione clienti, appuntamenti e fatturazione essenziale.',
    en: 'Basic plan for individual professionals. Essential client, appointment, and billing management.',
    es: 'Plan básico para profesionales individuales. Gestión esencial de clientes, citas y facturación.',
    fr: 'Forfait de base pour les professionnels individuels. Gestion essentielle des clients, des rendez-vous et de la facturation.',
    de: 'Basisplan für Einzelprofis. Grundlegende Kunden-, Termin- und Abrechnungsverwaltung.',
    nl: 'Basisplan voor individuele professionals. Essentieel beheer van klanten, afspraken en facturering.',
    no: 'Grunnplan for enkeltpersoner. Grunnleggende klient-, avtale- og faktureringshåndtering.',
    ro: 'Plan de bază pentru profesioniști individuali. Gestionare esențială a clienților, programărilor și facturării.',
    ru: 'Базовый план для индивидуальных специалистов. Основное управление клиентами, записями и выставлением счетов.',
  },
  pro: {
    it: 'Piano professionale con funzionalità avanzate: sincronizzazione Google Calendar, pacchetti promozionali e notifiche automatiche.',
    en: 'Professional plan with advanced features: Google Calendar sync, promotional packages, and automatic notifications.',
    es: 'Plan profesional con funcionalidades avanzadas: sincronización con Google Calendar, paquetes promocionales y notificaciones automáticas.',
    fr: 'Forfait professionnel avec des fonctionnalités avancées : synchronisation Google Agenda, forfaits promotionnels et notifications automatiques.',
    de: 'Professioneller Plan mit erweiterten Funktionen: Google Kalender-Synchronisierung, Aktionspakete und automatische Benachrichtigungen.',
    nl: 'Professioneel plan met geavanceerde functies: Google Agenda-synchronisatie, promotiepakketten en automatische meldingen.',
    no: 'Profesjonelt plan med avanserte funksjoner: Google Kalender-synkronisering, kampanjepakker og automatiske varsler.',
    ro: 'Plan profesional cu funcționalități avansate: sincronizare Google Calendar, pachete promoționale și notificări automate.',
    ru: 'Профессиональный план с расширенными функциями: синхронизация с Google Календарём, промо-пакеты и автоматические уведомления.',
  },
  professional: {
    it: 'Piano professionale con funzionalità avanzate: sincronizzazione Google Calendar, pacchetti promozionali e notifiche automatiche.',
    en: 'Professional plan with advanced features: Google Calendar sync, promotional packages, and automatic notifications.',
    es: 'Plan profesional con funcionalidades avanzadas: sincronización con Google Calendar, paquetes promocionales y notificaciones automáticas.',
    fr: 'Forfait professionnel avec des fonctionnalités avancées : synchronisation Google Agenda, forfaits promotionnels et notifications automatiques.',
    de: 'Professioneller Plan mit erweiterten Funktionen: Google Kalender-Synchronisierung, Aktionspakete und automatische Benachrichtigungen.',
    nl: 'Professioneel plan met geavanceerde functies: Google Agenda-synchronisatie, promotiepakketten en automatische meldingen.',
    no: 'Profesjonelt plan med avanserte funksjoner: Google Kalender-synkronisering, kampanjepakker og automatiske varsler.',
    ro: 'Plan profesional cu funcționalități avansate: sincronizare Google Calendar, pachete promoționale și notificări automate.',
    ru: 'Профессиональный план с расширенными функциями: синхронизация с Google Календарём, промо-пакеты и автоматические уведомления.',
  },
  business: {
    it: 'Piano completo per studi multi-professionista. Tutte le funzionalità Pro più gestione avanzata del team e accesso illimitato.',
    en: 'Complete plan for multi-professional practices. All Pro features plus advanced team management and unlimited access.',
    es: 'Plan completo para consultorios multi-profesional. Todas las funcionalidades Pro más gestión avanzada del equipo y acceso ilimitado.',
    fr: "Forfait complet pour les cabinets multi-professionnels. Toutes les fonctionnalités Pro plus la gestion avancée de l'équipe et un accès illimité.",
    de: 'Komplettplan für Mehrpersonenpraxen. Alle Pro-Funktionen plus erweitertes Teammanagement und unbegrenzten Zugriff.',
    nl: 'Compleet plan voor praktijken met meerdere professionals. Alle Pro-functies plus geavanceerd teambeheer en onbeperkte toegang.',
    no: 'Komplett plan for flerprofesjonsbaserte praksiser. Alle Pro-funksjoner pluss avansert teamhåndtering og ubegrenset tilgang.',
    ro: 'Plan complet pentru cabinete multi-profesionale. Toate funcționalitățile Pro plus gestionare avansată a echipei și acces nelimitat.',
    ru: 'Полный план для многопрофессиональных практик. Все функции Pro плюс расширенное управление командой и неограниченный доступ.',
  },
  trial: {
    it: 'Versione di prova gratuita di 40 giorni con accesso completo a tutte le funzionalità.',
    en: 'Free 40-day trial with full access to all features.',
    es: 'Versión de prueba gratuita de 40 días con acceso completo a todas las funcionalidades.',
    fr: "Version d'essai gratuite de 40 jours avec un accès complet à toutes les fonctionnalités.",
    de: 'Kostenlose 40-tägige Testversion mit vollem Zugriff auf alle Funktionen.',
    nl: 'Gratis proefversie van 40 dagen met volledige toegang tot alle functies.',
    no: 'Gratis 40-dagers prøveversjon med full tilgang til alle funksjoner.',
    ro: 'Versiune de probă gratuită de 40 de zile cu acces complet la toate funcționalitățile.',
    ru: 'Бесплатная пробная версия на 40 дней с полным доступом ко всем функциям.',
  },
};

/**
 * Migrates a raw presets object from either old format (Record<string, string>)
 * or new format (Record<string, Record<string, string>>) to the new nested format.
 * Old string values are converted to { it: value }.
 */
function migratePresets(raw: Record<string, unknown>): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === 'string') {
      // Old format: migrate string to { it: value }
      result[key] = value.trim() ? { it: value } : {};
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      // New format: already a locale map
      const localeMap: Record<string, string> = {};
      for (const [lang, desc] of Object.entries(value as object)) {
        if (typeof lang === 'string' && typeof desc === 'string') {
          localeMap[lang] = desc;
        }
      }
      result[key] = localeMap;
    }
  }
  return result;
}

/**
 * Seeds the preset descriptions for the five canonical plan slugs when none
 * exist yet in app_settings.  Runs once on server start-up; is a no-op if
 * any presets are already stored.
 */
async function seedPresetDescriptionsIfEmpty(): Promise<void> {
  try {
    const setting = await storage.getSetting(PLAN_PRESET_DESCRIPTIONS_KEY);
    let presets: Record<string, Record<string, string>> = {};
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        presets = migratePresets(parsed);
      } catch { /* ignore */ }
    }

    // Merge: add canonical slugs that are missing entirely, and fill in
    // missing locale entries for slugs that already exist.
    // Existing admin edits (non-empty values) are never overwritten.
    let changed = 0;
    for (const [slug, localeMap] of Object.entries(CANONICAL_PRESET_DESCRIPTIONS)) {
      if (!(slug in presets)) {
        presets[slug] = { ...localeMap };
        changed++;
      } else {
        // Slug exists — fill in any locale that has no value yet
        for (const [lang, desc] of Object.entries(localeMap)) {
          if (!presets[slug][lang]?.trim()) {
            presets[slug][lang] = desc;
            changed++;
          }
        }
      }
    }

    // Also persist if migration happened (old string format → new nested format)
    const needsMigration = setting?.value
      ? (() => {
          try {
            const parsed = JSON.parse(setting.value);
            return Object.values(parsed).some((v) => typeof v === 'string');
          } catch {
            return false;
          }
        })()
      : false;

    if (changed === 0 && !needsMigration) return;

    await storage.saveSetting(
      PLAN_PRESET_DESCRIPTIONS_KEY,
      JSON.stringify(presets),
      'Editable plan preset descriptions',
      'plans'
    );
  } catch (err) {
    // Non-fatal — log and continue
    console.warn('[subscriptionPlanRoutes] Could not seed preset descriptions:', err);
  }
}

// Run the seed check immediately when this module is loaded (server start-up)
seedPresetDescriptionsIfEmpty();

router.get("/api/plan-preset-descriptions", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Only admin can access plan presets" });
  }
  try {
    const setting = await storage.getSetting(PLAN_PRESET_DESCRIPTIONS_KEY);
    let presets: Record<string, Record<string, string>> = {};
    if (setting?.value) {
      try {
        const parsed = JSON.parse(setting.value);
        presets = migratePresets(parsed);
      } catch {
        presets = {};
      }
    }
    res.json(presets);
  } catch (error) {
    console.error('Error loading plan preset descriptions:', error);
    res.status(500).json({ message: "Error loading plan preset descriptions" });
  }
});

router.put("/api/plan-preset-descriptions", requireAuth, async (req, res) => {
  const user = req.user as any;
  if (user.type !== 'admin') {
    return res.status(403).json({ message: "Only admin can update plan presets" });
  }
  try {
    const body = req.body;
    if (typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ message: "Invalid preset format" });
    }
    // Accept nested format: { planName: { locale: description } }
    const sanitized: Record<string, Record<string, string>> = {};
    for (const [key, locales] of Object.entries(body)) {
      if (typeof key !== 'string' || !key.trim()) continue;
      if (typeof locales === 'string') {
        // Handle old-format clients sending a string — migrate to { it: value }
        sanitized[key.trim()] = (locales as string).trim() ? { it: locales as string } : {};
      } else if (locales && typeof locales === 'object' && !Array.isArray(locales)) {
        const localeMap: Record<string, string> = {};
        for (const [lang, desc] of Object.entries(locales as object)) {
          if (typeof lang === 'string' && typeof desc === 'string') {
            localeMap[lang] = desc;
          }
        }
        sanitized[key.trim()] = localeMap;
      }
    }
    await storage.saveSetting(
      PLAN_PRESET_DESCRIPTIONS_KEY,
      JSON.stringify(sanitized),
      'Editable plan preset descriptions',
      'plans'
    );
    res.json(sanitized);
  } catch (error) {
    console.error('Error updating plan preset descriptions:', error);
    res.status(500).json({ message: "Error updating plan preset descriptions" });
  }
});

export default router;
