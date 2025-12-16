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
      // Usa lo stesso endpoint della pagina Pro per coerenza
      const response = await fetch('/api/google-calendar/sync-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        credentials: 'include', // Importante: include cookies per autenticazione
      });
      
      if (!response.ok) {
        throw new Error("Sync failed");
      }
      
      return response.json();
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
      
      // Invalida i dati degli appuntamenti per ricaricare
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/range"] });
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
