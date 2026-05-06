import { db } from '../db';
import { userSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { normalizeLang, SupportedLang } from './emailTranslations';

/**
 * Fetch the preferred language for a given user.
 * Language is stored in userSettings.preferences.language (JSON field).
 * Falls back to 'it' if not set.
 */
export async function getUserLanguage(userId: number): Promise<SupportedLang> {
  try {
    const [row] = await db
      .select({ preferences: userSettings.preferences })
      .from(userSettings)
      .where(eq(userSettings.userId, userId))
      .limit(1);

    if (row?.preferences) {
      const prefs = row.preferences as Record<string, unknown>;
      if (typeof prefs.language === 'string') {
        return normalizeLang(prefs.language);
      }
    }
  } catch {
    // If query fails, fall back silently
  }
  return 'it';
}

/**
 * Parse the Accept-Language HTTP header and return the best matching
 * supported language code.
 */
export function parseLangFromHeader(acceptLanguage: string | undefined): SupportedLang {
  if (!acceptLanguage) return 'it';
  const tag = acceptLanguage.split(',')[0].trim();
  return normalizeLang(tag);
}
