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
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 130_000);
      let response: Response;
      try {
        response = await fetch('/api/google-calendar/sync-now', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
          credentials: 'include',
          signal: controller.signal,
        });
      } catch (err: any) {
        if (err?.name === 'AbortError') throw new Error('Timeout — sincronizzazione troppo lenta, riprova');
        throw err;
      } finally {
        clearTimeout(timeoutId);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Session expired. Please log in again.');
      }
      
      const data = await response.json();
      
      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || 'Sync error');
      }
      
      return data;
    },
    onSuccess: (data: any) => {
      const imported = data.details?.imported || 0;
      const deleted = data.details?.deleted || 0;
      const exported = data.details?.exported || 0;
      const found = data.details?.found ?? null;
      const errors: string[] = data.details?.errors || [];
      
      if (showToast) {
        if (errors.length > 0) {
          toast({
            title: t('common.error', '❌ Errore sincronizzazione'),
            description: errors[0],
            variant: "destructive",
          });
        } else {
          const foundInfo = found !== null ? ` (trovati nel calendario: ${found})` : '';
          toast({
            title: t("common.success", "✅ Sync completato"),
            description: `📥 Importati: ${imported} | 📤 Esportati: ${exported} | 🗑️ Eliminati: ${deleted}${foundInfo}`,
            variant: "default",
          });
        }
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
          title: t('i18nFinale.googleCalendarSync.errorWithEmoji'),
          description: error.message || "Unable to sync with Google Calendar",
          variant: "destructive",
        });
      }
    },
  });
}
