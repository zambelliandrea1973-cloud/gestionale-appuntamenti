import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Loader2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

type ClientAccessCounterProps = {
  clientId: number;
  showDetails?: boolean;
};

export default function ClientAccessCounter({ clientId, showDetails = false }: ClientAccessCounterProps) {
  const { t } = useTranslation();
  const [hasLoaded, setHasLoaded] = useState(false);

  // Query per recuperare il conteggio degli accessi per un client specifico
  const {
    data: accessCount = 0,
    isLoading,
    isError
  } = useQuery<number>({
    queryKey: [`/api/client-access/count/${clientId}`],
    enabled: !!clientId
  });

  useEffect(() => {
    if (accessCount !== undefined && !isLoading) {
      setHasLoaded(true);
    }
  }, [accessCount, isLoading]);

  // Se è in caricamento o c'è stato un errore, mostra un placeholder
  if (isLoading) {
    return (
      <div className="flex items-center">
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        <span className="text-xs text-muted-foreground">{t('clients.accesses.loading', 'Caricamento...')}</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center">
        <span className="text-xs text-muted-foreground">{t('clients.accesses.error', 'Errore')}</span>
      </div>
    );
  }

  if (!hasLoaded) {
    return (
      <div className="flex items-center">
        <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
        <span className="text-xs text-muted-foreground">{t('clients.accesses.loading', 'Caricamento...')}</span>
      </div>
    );
  }

  if (showDetails) {
    return (
      <div className="flex items-center">
        <Eye className="h-4 w-4 mr-1.5 text-blue-500" />
        <span className="text-sm">
          {t('clients.accesses.count', 'Accessi all\'app: {{count}}', { count: accessCount })}
        </span>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="ml-2 cursor-help">
            <Eye className="h-3 w-3 mr-1 text-blue-500" />
            {accessCount}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{t('clients.accesses.tooltip', 'Numero di volte che il cliente ha aperto l\'app: {{count}}', { count: accessCount })}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}