import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useSyncGoogleCalendar } from "@/hooks/useGoogleCalendarSync";

interface SyncGoogleButtonProps {
  size?: "sm" | "lg" | "default" | "icon";
  variant?: "default" | "outline" | "ghost";
  showLabel?: boolean;
}

export function SyncGoogleButton({ 
  size = "sm", 
  variant = "outline",
  showLabel = true 
}: SyncGoogleButtonProps) {
  const mutation = useSyncGoogleCalendar();
  const { t } = useTranslation();

  return (
    <Button
      onClick={() => mutation.mutate()}
      disabled={mutation.isPending}
      variant={variant}
      size={size}
      className="gap-2"
      data-testid="button-sync-google-calendar"
    >
      {mutation.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4" />
      )}
      {showLabel && "Sincronizza Google"}
    </Button>
  );
}
