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
      const response = await apiRequest("/api/google-calendar/sync", {
        method: "POST",
      });
      
      if (!response.ok) {
        throw new Error("Sync failed");
      }
      
      return response.json();
    },
    onSuccess: (data: any) => {
      if (showToast) {
        toast({
          title: t("common.success") || "✅ Sincronizzazione completata",
          description: `📥 Importati: ${data.imported || 0} | 🗑️ Eliminati: ${data.deleted || 0}`,
          variant: "default",
        });
      } else {
        // Log silenzioso per sincronizzazione in background
        console.log(`🔄 [AUTO-SYNC] Background: Importati ${data.imported || 0}, Eliminati ${data.deleted || 0}`);
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
