import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface UseSyncGoogleCalendarOptions {
  showToast?: boolean; // Se false, sincronizza silenziosamente in background
}

export function useSyncGoogleCalendar(options: UseSyncGoogleCalendarOptions = {}) {
  const { showToast = true } = options;
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      console.log('🔄 [HOOK] mutationFn chiamata - invio richiesta a sync-now...');
      
      // IDENTICO alla pagina Pro: stesso endpoint, stesse headers
      const response = await fetch('/api/google-calendar/sync-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        credentials: 'include',
      });
      
      console.log('🔄 [HOOK] Response status:', response.status);
      
      // IDENTICO alla pagina Pro: verifica content-type per sessioni scadute
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('🔴 [HOOK] Risposta non JSON:', contentType);
        throw new Error('Sessione scaduta. Effettua nuovamente il login.');
      }
      
      const data = await response.json();
      console.log('🔄 [HOOK] Response data:', data);
      
      // IDENTICO alla pagina Pro: verifica success nella risposta
      if (!response.ok || !data.success) {
        const errorMsg = data.error || data.message || 'Errore durante la sincronizzazione';
        console.error('🔴 [HOOK] Errore sync:', errorMsg);
        throw new Error(errorMsg);
      }
      
      return data;
    },
    onSuccess: (data: any) => {
      // Estrai i valori da details (struttura corretta dal backend)
      const imported = data.details?.imported || 0;
      const deleted = data.details?.deleted || 0;
      const exported = data.details?.exported || 0;
      
      if (showToast) {
        toast({
          title: t("common.success") || "✅ Sincronizzazione completata",
          description: `📥 Importati: ${imported} | 📤 Esportati: ${exported} | 🗑️ Eliminati: ${deleted}`,
          variant: "default",
        });
      } else {
        // Log silenzioso per sincronizzazione in background
        console.log(`🔄 [AUTO-SYNC] Background: Importati ${imported}, Esportati ${exported}, Eliminati ${deleted}`);
      }
      
      // Invalida TUTTI i dati degli appuntamenti per forzare il refresh
      // Usa refetchType: 'all' per assicurare il refetch immediato
      queryClient.invalidateQueries({ 
        queryKey: ["/api/appointments"],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/appointments/range"],
        refetchType: 'all'
      });
      // Invalida anche le query per data specifica (usate dalla pagina Calendar)
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/appointments/date/');
        },
        refetchType: 'all'
      });
      
      console.log('🔄 [HOOK] Cache invalidata - forzato refresh appuntamenti');
    },
    onError: (error: any) => {
      if (showToast) {
        toast({
          title: "❌ Errore",
          description: error.message || "Impossibile sincronizzare con Google Calendar",
          variant: "destructive",
        });
      } else {
        // Log silenzioso per sincronizzazione in background
        console.warn(`⚠️ [AUTO-SYNC] Errore in background:`, error);
      }
    },
  });
}
