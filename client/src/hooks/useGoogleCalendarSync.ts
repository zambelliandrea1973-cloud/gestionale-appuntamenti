import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { queryClient } from "@/lib/queryClient";

interface UseSyncGoogleCalendarOptions {
  showToast?: boolean;
}

export function useSyncGoogleCalendar(options: UseSyncGoogleCalendarOptions = {}) {
  const { showToast = true } = options;
  const { toast } = useToast();
  const { t } = useTranslation();

  return useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/google-calendar/sync-now', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
        credentials: 'include',
      });
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Sessione scaduta. Effettua nuovamente il login.');
      }
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Errore durante la sincronizzazione');
      }
      
      return data;
    },
    onSuccess: (data: any) => {
      const imported = data.details?.imported || 0;
      const deleted = data.details?.deleted || 0;
      const exported = data.details?.exported || 0;
      
      if (showToast) {
        toast({
          title: t("common.success") || "✅ Sincronizzazione completata",
          description: `📥 Importati: ${imported} | 📤 Esportati: ${exported} | 🗑️ Eliminati: ${deleted}`,
          variant: "default",
        });
      }
      
      queryClient.invalidateQueries({ 
        queryKey: ["/api/appointments"],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ 
        queryKey: ["/api/appointments/range"],
        refetchType: 'all'
      });
      queryClient.invalidateQueries({ 
        predicate: (query) => {
          const key = query.queryKey[0];
          return typeof key === 'string' && key.startsWith('/api/appointments/date/');
        },
        refetchType: 'all'
      });
    },
    onError: (error: any) => {
      if (showToast) {
        toast({
          title: "❌ Errore",
          description: error.message || "Impossibile sincronizzare con Google Calendar",
          variant: "destructive",
        });
      }
    },
  });
}
