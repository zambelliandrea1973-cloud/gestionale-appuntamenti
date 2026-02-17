// Metadata delle sezioni del manuale
// Questo sostituisce i contenuti hardcoded - i dati effettivi vengono dal database

export interface ManualSectionMetadata {
  value: string;
  label: string;
  group: string; // Capitolo (es. "1. Configurazione Iniziale")
  order: number;
}

export const MANUAL_SECTIONS: ManualSectionMetadata[] = [
  // Capitolo 1: Configurazione Iniziale
  { value: 'first-access-section', label: '1.1 Primo accesso al sistema', group: '1. Configurazione Iniziale', order: 1 },
  { value: 'configure-data', label: '1.2 Configurare i Dati Aziendali', group: '1. Configurazione Iniziale', order: 2 },
  { value: 'configure-banks', label: '1.3 Configurare i Dati Bancari', group: '1. Configurazione Iniziale', order: 3 },
  { value: 'manage-staff', label: '1.4 Gestire Staff e Stanze di Trattamento', group: '1. Configurazione Iniziale', order: 4 },
  { value: 'configure-emails', label: '1.5 Configurare le Email Automatiche', group: '1. Configurazione Iniziale', order: 5 },
  
  // Capitolo 2: Primi Passi
  { value: 'intro', label: '2.1 Introduzione', group: '2. Primi Passi', order: 6 },
  { value: 'getting-started', label: '2.2 Primi Passi', group: '2. Primi Passi', order: 7 },
  
  // Capitolo 3: Operazioni Quotidiane
  { value: 'appointments', label: '3.1 Gestione Appuntamenti', group: '3. Operazioni Quotidiane', order: 8 },
  { value: 'clients', label: '3.2 Gestione Clienti', group: '3. Operazioni Quotidiane', order: 9 },
  
  // Capitolo 4: Funzioni Avanzate
  { value: 'billing', label: '4.1 Fatturazione', group: '4. Funzioni Avanzate', order: 10 },
  { value: 'promotional-packages', label: '4.2 Pacchetti Promozionali (PRO)', group: '4. Funzioni Avanzate', order: 11 },
  { value: 'settings', label: '5.1 Impostazioni', group: '4. Funzioni Avanzate', order: 12 },
  { value: 'advanced', label: '6.1 Funzioni Avanzate', group: '4. Funzioni Avanzate', order: 13 }
];

export const MANUAL_LOCALES = [
  { value: 'it', label: '🇮🇹 Italiano' },
  { value: 'en', label: '🇬🇧 English' },
  { value: 'de', label: '🇩🇪 Deutsch' },
  { value: 'fr', label: '🇫🇷 Français' },
  { value: 'es', label: '🇪🇸 Español' },
  { value: 'nl', label: '🇳🇱 Nederlands' },
  { value: 'no', label: '🇳🇴 Norsk' },
  { value: 'ro', label: '🇷🇴 Română' },
  { value: 'ru', label: '🇷🇺 Русский' }
];

// Raggruppa sezioni per capitolo
export function getSectionsByGroup(): Map<string, ManualSectionMetadata[]> {
  const grouped = new Map<string, ManualSectionMetadata[]>();
  
  MANUAL_SECTIONS.forEach(section => {
    const existing = grouped.get(section.group) || [];
    grouped.set(section.group, [...existing, section]);
  });
  
  return grouped;
}

// Trova una sezione per value
export function getSectionByValue(value: string): ManualSectionMetadata | undefined {
  return MANUAL_SECTIONS.find(s => s.value === value);
}
