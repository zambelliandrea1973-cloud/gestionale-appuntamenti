import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useSyncGoogleCalendar } from "@/hooks/useGoogleCalendarSync";

interface SyncGoogleButtonProps {
  size?: "sm" | "lg" | "default" | "icon";
  variant?: "default" | "outline" | "ghost";
  showLabel?: boolean;
  isExternalLoading?: boolean;
}

export function SyncGoogleButton({ 
  size = "sm", 
  variant = "outline",
  showLabel = true,
  isExternalLoading = false,
}: SyncGoogleButtonProps) {
  const mutation = useSyncGoogleCalendar();
  const { t } = useTranslation();

  const isBusy = isExternalLoading || mutation.isPending;

  return (
    <Button
      onClick={() => { if (!isBusy) mutation.mutate(); }}
      disabled={isBusy}
      variant={variant}
      size={size}
      className="gap-2"
      data-testid="button-sync-google-calendar"
      title={isBusy ? t('calendar.syncInProgress', 'Sincronizzazione in corso…') : t('calendar.syncGoogle', 'Sincronizza Google')}
    >
      {isBusy ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {showLabel && (
        isBusy
          ? <span>{t('calendar.syncInProgress', 'Sync…')}</span>
          : <span>{t('calendar.syncGoogle', 'Sincronizza Google')}</span>
      )}
    </Button>
  );
}
