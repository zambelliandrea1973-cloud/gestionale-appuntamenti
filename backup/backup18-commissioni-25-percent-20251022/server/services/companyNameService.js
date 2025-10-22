import fs from 'fs';
import path from 'path';

// Definizione delle impostazioni predefinite
const defaultSettings = {
  name: '',
  fontSize: 24,
  fontWeight: 'normal',
  fontStyle: 'normal',
  textDecoration: 'none',
  color: '#000000',
  enabled: true
};

// Percorso del file delle impostazioni
const settingsFilePath = path.join(process.cwd(), 'data', 'company_name_settings.json');

// Funzione per assicurarsi che la directory esista
const ensureDirectoryExists = () => {
  const dir = path.dirname(settingsFilePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Funzione per validare le impostazioni
const validateSettings = (settings) => {
  // Assicurati che tutti i campi siano presenti con i valori corretti
  return {
    name: typeof settings.name === 'string' ? settings.name : defaultSettings.name,
    fontSize: typeof settings.fontSize === 'number' && settings.fontSize >= 12 && settings.fontSize <= 48
      ? settings.fontSize : defaultSettings.fontSize,
    fontWeight: ['normal', 'bold', 'light'].includes(settings.fontWeight) 
      ? settings.fontWeight : defaultSettings.fontWeight,
    fontStyle: ['normal', 'italic'].includes(settings.fontStyle)
      ? settings.fontStyle : defaultSettings.fontStyle,
    textDecoration: ['none', 'underline'].includes(settings.textDecoration)
      ? settings.textDecoration : defaultSettings.textDecoration,
    color: /^#[0-9A-F]{6}$/i.test(settings.color)
      ? settings.color : defaultSettings.color,
    enabled: typeof settings.enabled === 'boolean' 
      ? settings.enabled : defaultSettings.enabled
  };
};

// Servizio per la gestione del nome aziendale
export const companyNameService = {
  // Recupera le impostazioni salvate
  getSettings: () => {
    try {
      ensureDirectoryExists();
      
      if (fs.existsSync(settingsFilePath)) {
        const rawData = fs.readFileSync(settingsFilePath, 'utf8');
        const settings = JSON.parse(rawData);
        return validateSettings(settings);
      }
      
      // Se il file non esiste, crea uno nuovo con le impostazioni predefinite
      companyNameService.saveSettings(defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Errore durante il recupero delle impostazioni del nome aziendale:', error);
      return defaultSettings;
    }
  },
  
  // Salva le nuove impostazioni
  saveSettings: (settings) => {
    try {
      ensureDirectoryExists();
      
      // Valida le impostazioni prima di salvarle
      const validatedSettings = validateSettings(settings);
      
      fs.writeFileSync(
        settingsFilePath, 
        JSON.stringify(validatedSettings, null, 2), 
        'utf8'
      );
      
      return true;
    } catch (error) {
      console.error('Errore durante il salvataggio delle impostazioni del nome aziendale:', error);
      return false;
    }
  },
  
  // Ripristina le impostazioni predefinite
  resetToDefault: () => {
    return companyNameService.saveSettings(defaultSettings);
  }
};