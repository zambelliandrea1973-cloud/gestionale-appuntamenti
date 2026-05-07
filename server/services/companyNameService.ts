import { db } from '../db';
import { companyNameSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';

// Default values
const defaultSettings = {
  name: '',
  fontSize: 24,
  fontFamily: 'Arial',
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  enabled: true
};

// Load settings from the database
export const loadSettings = async (userId: number) => {
  try {
    let settings = await db.query.companyNameSettings.findFirst({
      where: eq(companyNameSettings.userId, userId),
    });

    if (!settings) {
      settings = await db.insert(companyNameSettings).values({
        userId,
        ...defaultSettings,
      }).returning().then(r => r[0]);
    }

    return settings;
  } catch (error) {
    console.error('Error loading company name settings:', error);
    return defaultSettings;
  }
};

// Save the settings in the database
export const saveSettings = async (userId: number, settings: any): Promise<boolean> => {
  try {
    const validatedSettings = validateSettings(settings);
    
    const existing = await db.query.companyNameSettings.findFirst({
      where: eq(companyNameSettings.userId, userId),
    });

    if (existing) {
      await db.update(companyNameSettings)
        .set({ ...validatedSettings, updatedAt: new Date() })
        .where(eq(companyNameSettings.userId, userId));
    } else {
      await db.insert(companyNameSettings)
        .values({ userId, ...validatedSettings });
    }

    return true;
  } catch (error) {
    console.error('Error saving company name settings:', error);
    return false;
  }
};

// Validate the settings
const validateSettings = (settings: any) => {
  return {
    name: settings.name !== undefined ? settings.name : defaultSettings.name,
    fontSize: settings.fontSize !== undefined && settings.fontSize >= 12 && settings.fontSize <= 48
      ? settings.fontSize
      : defaultSettings.fontSize,
    fontFamily: settings.fontFamily || defaultSettings.fontFamily,
    fontWeight: ['normal', 'bold', 'light'].includes(settings.fontWeight || '')
      ? settings.fontWeight
      : defaultSettings.fontWeight,
    fontStyle: ['normal', 'italic'].includes(settings.fontStyle || '')
      ? settings.fontStyle
      : defaultSettings.fontStyle,
    textDecoration: ['none', 'underline'].includes(settings.textDecoration || '')
      ? settings.textDecoration
      : defaultSettings.textDecoration,
    color: /^#[0-9A-F]{6}$/i.test(settings.color || '')
      ? settings.color
      : defaultSettings.color,
    enabled: settings.enabled !== undefined ? settings.enabled : defaultSettings.enabled
  };
};

// Check if customized
export const isCustomized = async (userId: number): Promise<boolean> => {
  const settings = await loadSettings(userId);
  if (!settings) return false;
  return Object.keys(defaultSettings).some((key) => {
    return settings[key as keyof typeof defaultSettings] !== defaultSettings[key as keyof typeof defaultSettings];
  });
};

// Restore default values
export const resetToDefault = async (userId: number): Promise<boolean> => {
  return saveSettings(userId, defaultSettings);
};

export const companyNameService = {
  loadSettings,
  saveSettings,
  isCustomized,
  resetToDefault
};
