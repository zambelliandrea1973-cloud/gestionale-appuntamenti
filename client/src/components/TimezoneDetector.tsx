import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

/**
 * Componente per il rilevamento automatico del fuso orario dell'utente
 * e la sincronizzazione con il server
 */
export const TimezoneDetector = () => {
  const { toast } = useToast();
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Evita di eseguire più volte il rilevamento
    if (initialized) return;
    
    const detectAndSaveTimezone = async () => {
      try {
        // Rileva il fuso orario del browser usando l'API Intl
        let timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        
        // Correzione per utenti italiani: se il browser rileva Europe/Zurich ma siamo in Italia
        // questo può accadere per configurazioni del sistema
        if (timezone === 'Europe/Zurich') {
          // Verifica se l'offset corrisponde all'ora italiana (UTC+1/+2)
          const now = new Date();
          const offsetMinutes = now.getTimezoneOffset();
          const offsetHours = -offsetMinutes / 60;
          
          // Se l'offset è quello italiano, correggi il fuso orario
          if (offsetHours === 1 || offsetHours === 2) {
            timezone = 'Europe/Rome';
            console.log('Correzione fuso orario: da Europe/Zurich a Europe/Rome per utente italiano');
          }
        }
        
        // Calcola l'offset in ore dal fuso orario UTC
        const now = new Date();
        const offsetMinutes = now.getTimezoneOffset();
        const offsetHours = -offsetMinutes / 60; // Nota: getTimezoneOffset() restituisce l'opposto dell'offset
        
        // Ottiene il nome del fuso orario in formato leggibile
        const dateFormatter = new Intl.DateTimeFormat('it-IT', {
          timeZoneName: 'long',
          timeZone: timezone
        });
        const timezoneName = dateFormatter.formatToParts(now)
          .find(part => part.type === 'timeZoneName')?.value || 'Ora italiana';
          
        console.log(`Fuso orario corretto: ${timezone} (${timezoneName}), Offset: UTC${offsetHours >= 0 ? '+' : ''}${offsetHours}`);
        
        // Verifica se il fuso orario è già impostato nel server
        const response = await fetch('/api/timezone-settings');
        const serverTimezone = await response.json();
        
        // Se il fuso orario è diverso da quello salvato, aggiornalo
        if (!serverTimezone || 
            serverTimezone.timezone !== timezone || 
            serverTimezone.offset !== offsetHours) {
          
          console.log('Fuso orario diverso da quello salvato, aggiornamento...');
          
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
            console.log('Fuso orario aggiornato con successo');
          } else {
            console.error('Errore nell\'aggiornamento del fuso orario');
          }
        } else {
          console.log('Fuso orario già correttamente impostato');
        }
      } catch (error) {
        console.error('Errore nel rilevamento del fuso orario:', error);
        
        // Notifica solo se c'è un errore
        toast({
          title: "Errore fuso orario",
          description: "Non è stato possibile rilevare o salvare il fuso orario. L'applicazione utilizzerà il fuso orario predefinito (Europa/Roma).",
          variant: "destructive"
        });
      } finally {
        setInitialized(true);
      }
    };
    
    detectAndSaveTimezone();
  }, [initialized, toast]);
  
  // Questo componente non ha un rendering visibile
  return null;
};

export default TimezoneDetector;