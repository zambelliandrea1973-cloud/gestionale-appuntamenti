import fs from 'fs';
import path from 'path';

// Definizione del tipo per le impostazioni del nome aziendale
export interface CompanyNameSettings {
  name: string;
  fontSize: number;
  fontWeight: string;
  fontStyle: string;
  textDecoration: string;
  color: string;
  enabled: boolean;
}

// Valori predefiniti per le impostazioni
const defaultSettings: CompanyNameSettings = {
  name: '',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  enabled: true
};

// Percorso del file per salvare le impostazioni
const settingsPath = path.join(process.cwd(), 'data', 'company_name_settings.json');

// Assicurati che la directory esista
const ensureDirectoryExists = () => {
  const dir = path.dirname(settingsPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Carica le impostazioni dal file
export const loadSettings = (): CompanyNameSettings => {
  try {
    ensureDirectoryExists();
    
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf8');
      return JSON.parse(data);
    }
    
    // Se il file non esiste, crea uno nuovo con le impostazioni predefinite
    saveSettings(defaultSettings);
    return defaultSettings;
  } catch (error) {
    console.error('Errore durante il caricamento delle impostazioni del nome aziendale:', error);
    return defaultSettings;
  }
};

// Salva le impostazioni nel file
export const saveSettings = (settings: CompanyNameSettings): boolean => {
  try {
    ensureDirectoryExists();
    
    // Verifica e applica le restrizioni e i valori predefiniti
    const validatedSettings = validateSettings(settings);
    
    fs.writeFileSync(settingsPath, JSON.stringify(validatedSettings, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Errore durante il salvataggio delle impostazioni del nome aziendale:', error);
    return false;
  }
};

// Valida le impostazioni e applica i valori predefiniti se necessario
const validateSettings = (settings: Partial<CompanyNameSettings>): CompanyNameSettings => {
  const validated: CompanyNameSettings = {
    name: settings.name !== undefined ? settings.name : defaultSettings.name,
    fontSize: settings.fontSize !== undefined && settings.fontSize >= 12 && settings.fontSize <= 48
      ? settings.fontSize
      : defaultSettings.fontSize,
    fontWeight: ['normal', 'bold', 'light'].includes(settings.fontWeight || '')
      ? settings.fontWeight!
      : defaultSettings.fontWeight,
    fontStyle: ['normal', 'italic'].includes(settings.fontStyle || '')
      ? settings.fontStyle!
      : defaultSettings.fontStyle,
    textDecoration: ['none', 'underline'].includes(settings.textDecoration || '')
      ? settings.textDecoration!
      : defaultSettings.textDecoration,
    color: /^#[0-9A-F]{6}$/i.test(settings.color || '')
      ? settings.color!
      : defaultSettings.color,
    enabled: settings.enabled !== undefined ? settings.enabled : defaultSettings.enabled
  };

  return validated;
};

// Verifica se le impostazioni sono state personalizzate rispetto ai valori predefiniti
export const isCustomized = (): boolean => {
  const settings = loadSettings();
  
  // Controlla se almeno una proprietà è diversa dal valore predefinito
  return Object.keys(defaultSettings).some(key => {
    const settingKey = key as keyof CompanyNameSettings;
    return settings[settingKey] !== defaultSettings[settingKey];
  });
};

// Ripristina i valori predefiniti
export const resetToDefault = (): boolean => {
  return saveSettings(defaultSettings);
};

// Esportiamo tutte le funzioni in un oggetto per l'uso con import
export const companyNameService = {
  loadSettings,
  saveSettings,
  isCustomized,
  resetToDefault
};