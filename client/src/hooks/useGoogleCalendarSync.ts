import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { apiRequest, queryClient } from "@/lib/queryClient";

export function useSyncGoogleCalendar() {
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
      toast({
        title: t("common.success") || "✅ Sincronizzazione completata",
        description: `📥 Importati: ${data.imported || 0} | 🗑️ Eliminati: ${data.deleted || 0}`,
        variant: "default",
      });
      
      // Invalida i dati degli appuntamenti per ricaricare
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/range"] });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Errore",
        description: error.message || "Impossibile sincronizzare con Google Calendar",
        variant: "destructive",
      });
    },
  });
}
