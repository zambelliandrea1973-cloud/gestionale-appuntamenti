import { useEffect, useState } from 'react';

/**
 * Componente per il rilevamento automatico del fuso orario dell'utente
 * e la sincronizzazione con il server
 */
export const TimezoneDetector = () => {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Evita di eseguire più volte il rilevamento
    if (initialized) return;
    
    const detectAndSaveTimezone = async () => {
      try {
        // Rileva il fuso orario del browser usando l'API Intl
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Calcola l'offset in ore dal fuso orario UTC
        const now = new Date();
        const offsetMinutes = now.getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60; // Nota: getTimezoneOffset() restituisce l'opposto dell'offset
        
        // Ottiene il nome del fuso orario in formato leggibile
        const dateFormatter = new Intl.DateTimeFormat(navigator.language, {
          timeZoneName: 'long',
          timeZone: timezone
        });
        const timezoneName = dateFormatter.formatToParts(now)
          .find(part => part.type === 'timeZoneName')?.value || timezone;
          
        console.log(`Detected timezone: ${timezone} (${timezoneName}), Offset: UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`);
        
        // Verifica se il fuso orario è già impostato nel server
        const response = await fetch('/api/timezone-settings');
        const serverTimezone = await response.json();
        
        // Se il fuso orario è diverso da quello salvato, aggiornalo
        if (!serverTimezone || 
            serverTimezone.timezone !== timezone || 
            serverTimezone.offset !== offsetHours) {
          
          console.log('Timezone differs from saved, updating...');
          
          // Salva il nuovo fuso orario
          const saveResponse = await fetch('/api/timezone-settings', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              timezone,
              offset: offsetHours,
              name: timezoneName
            }),
          });
          
          if (saveResponse.ok) {
            console.log('Timezone updated successfully');
          } else {
            console.error('Error updating timezone');
          }
        } else {
          console.log('Timezone already correctly set');
        }
      } catch (error) {
        console.error('Error detecting timezone:', error);
        
        // Log error instead of toast to avoid mobile crash
        console.error("Could not detect or save timezone. The application will use the default timezone (Europe/Rome).");
      } finally {
        setInitialized(true);
      }
    };
    
    detectAndSaveTimezone();
  }, [initialized]);
  
  // Questo componente non ha un rendering visibile
  return null;
};

export default TimezoneDetector;