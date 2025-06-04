import { useState, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  UserPlus, 
  Star, 
  AlertCircle,
  Loader2,
  Clock,
  Phone,
  AlertTriangle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ClientForm from "@/components/ClientForm";
import ClientCard from "@/components/ClientCard";
import { useTranslation } from "react-i18next";

export default function Clients() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const autoRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isUpdatingPrefixes, setIsUpdatingPrefixes] = useState(false);
  
  // Fetch all clients with explicit queryFn and cache busting
  const queryClient = useQueryClient();
  
  // Force cache invalidation on mount and auto-refresh
  useEffect(() => {
    // Invalida immediatamente la cache
    queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    
    // Auto-refresh ogni 30 secondi per mantenere dati sincronizzati
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
    }, 30000);
    
    return () => clearInterval(interval);
  }, [queryClient]);
  const {
    data: clients = [],
    isLoading,
    error,
    refetch: refetchClients
  } = useQuery({
    queryKey: ["/api/clients"],
    staleTime: 0,
    gcTime: 0,
    queryFn: async () => {
      console.log("🔍 FRONTEND: Chiamata fetch a /api/clients");
      const response = await fetch(`/api/clients?_t=${Date.now()}`, {
        method: "GET",
        credentials: "include",
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0",
          "X-Requested-With": "XMLHttpRequest"
        }
      });
      
      console.log("🔍 FRONTEND: Response status:", response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log("🔍 FRONTEND: Ricevuti clienti:", data.length);
      return data;
    },
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 3000, // Aggiornamento automatico ogni 3 secondi
    refetchIntervalInBackground: true,
    enabled: true,
    retry: 3
  });

  // Funzione per forzare il caricamento dal server bypassando completamente la cache
  const forceRefreshFromServer = async () => {
    console.log("🔄 FORZA REFRESH DAL SERVER - BYPASS CACHE COMPLETO");
    try {
      const response = await fetch(`/api/clients?_t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      if (response.ok) {
        const freshData = await response.json();
        console.log("📊 DATI FRESCHI DAL SERVER:", freshData);
        // Invalida e aggiorna la cache
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        refetchClients();
        toast({
          title: "Dati aggiornati",
          description: `Caricati ${freshData.length} clienti dal server`,
        });
      } else {
        console.error("❌ Errore nella chiamata al server:", response.status);
      }
    } catch (error) {
      console.error("❌ Errore nel fetch:", error);
    }
  };
  
  // Imposta un intervallo per aggiornare i dati ogni 5 minuti 
  // e un aggiornamento programmato a mezzanotte
  useEffect(() => {
    // Funzione per aggiornare i dati
    const refreshData = () => {
      console.log("Esecuzione aggiornamento automatico dati clienti");
      refetchClients().then(() => {
        setLastRefreshTime(new Date());
      });
    };
    
    // Imposta un intervallo per l'aggiornamento (ogni ora)
    autoRefreshIntervalRef.current = setInterval(refreshData, 60 * 60 * 1000);
    
    // Imposta un timer per l'aggiornamento di mezzanotte
    const setupMidnightRefresh = () => {
      const now = new Date();
      const midnight = new Date(now);
      midnight.setHours(23, 59, 0, 0); // Imposta alle 23:59
      
      // Calcola i millisecondi fino alla mezzanotte
      let delay = midnight.getTime() - now.getTime();
      if (delay < 0) {
        // Se è già passata la mezzanotte, imposta per la mezzanotte successiva
        delay += 24 * 60 * 60 * 1000;
      }
      
      // Pianifica l'aggiornamento
      const midnightTimer = setTimeout(() => {
        console.log("Esecuzione aggiornamento programmato di mezzanotte");
        refreshData();
        // Reimposta il timer per la notte successiva
        setupMidnightRefresh();
      }, delay);
      
      return midnightTimer;
    };
    
    // Avvia il timer per l'aggiornamento di mezzanotte
    const midnightTimer = setupMidnightRefresh();
    
    // Pulizia degli intervalli quando il componente viene smontato
    return () => {
      if (autoRefreshIntervalRef.current) {
        clearInterval(autoRefreshIntervalRef.current);
      }
      clearTimeout(midnightTimer);
    };
  }, []);
  
  // Client search
  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      toast({
        title: t('notifications.warning'),
        description: t('clients.search.minLength'),
        variant: "destructive"
      });
      return;
    }
    
    // Just refetch all clients, as we're filtering them client-side
    refetchClients();
  };
  
  // Filter clients based on search query and active tab, then sort by lastName
  const filteredClients = clients
    .filter(client => {
      // Apply search filter
      const matchesSearch = searchQuery.trim().length < 2 || 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery) || 
        (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Apply tab filter
      const matchesTab = 
        activeTab === "all" || 
        (activeTab === "frequent" && client.isFrequent === true) ||
        (activeTab === "no-consent" && client.hasConsent !== true);
      
      return matchesSearch && matchesTab;
    })
    // Ordina alfabeticamente per cognome
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'it-IT'));
  

  
  // Handle client form submission and refresh data
  const handleClientCreated = async () => {
    console.log("✅ Cliente creato/aggiornato, refreshing data...");
    
    try {
      // Invalidare tutte le query relative ai clienti
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      // Invalidare anche tutte le query relative agli appuntamenti
      await queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Forza il refetch immediato
      await refetchClients();
      
      console.log("✅ Dati aggiornati con successo");
    } catch (error) {
      console.error("❌ Errore nell'aggiornamento dati:", error);
    }
    
    setIsClientDialogOpen(false);
  };

  // Handle client deletion and refresh data
  const handleClientDeleted = async () => {
    console.log("🗑️ Cliente eliminato, refreshing data...");
    
    try {
      // Invalidare tutte le query relative ai clienti
      await queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      
      // Forza il refetch immediato
      await refetchClients();
      
      console.log("✅ Dati aggiornati dopo eliminazione");
    } catch (error) {
      console.error("❌ Errore nell'aggiornamento dopo eliminazione:", error);
    }
  };
  
  // Funzione per aggiornare i prefissi telefonici di tutti i clienti
  const handleUpdatePhonePrefixes = async () => {
    if (isUpdatingPrefixes) return;
    
    try {
      setIsUpdatingPrefixes(true);
      
      // Chiedi conferma all'utente prima di procedere
      if (!window.confirm(t('clients.confirmUpdatePrefixes', 'Sei sicuro di voler aggiornare i prefissi di tutti i numeri di telefono? Questa operazione aggiungerà il prefisso +39 a tutti i numeri italiani che non hanno già un prefisso internazionale.'))) {
        setIsUpdatingPrefixes(false);
        return;
      }
      
      const response = await fetch('/api/update-phone-prefixes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`Errore durante l'aggiornamento dei prefissi: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      console.log('Risultato aggiornamento prefissi:', result);
      
      // Mostra un toast con un riepilogo dell'operazione
      toast({
        title: t('notifications.success'),
        description: t('clients.prefixesUpdated', {
          total: result.summary.total,
          updated: result.summary.updated,
          skipped: result.summary.skipped,
          empty: result.summary.empty
        }, 'Aggiornamento completato: {{updated}} numeri aggiornati, {{skipped}} già con prefisso, {{empty}} senza numero'),
      });
      
      // Aggiorna la lista dei clienti
      refetchClients();
      
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dei prefissi:', error);
      
      toast({
        title: t('notifications.error'),
        description: error instanceof Error ? error.message : "Errore durante l'aggiornamento dei prefissi",
        variant: "destructive"
      });
    } finally {
      setIsUpdatingPrefixes(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-medium">{t('sidebar.clients')}</h2>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={() => {
                refetchClients();
                setLastRefreshTime(new Date());
                toast({
                  title: t('notifications.success'),
                  description: t('clients.refreshSuccess'),
                });
              }}
            >
              <Loader2 className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="h-8"
              onClick={forceRefreshFromServer}
            >
              Test Server
            </Button>
            
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs text-muted-foreground">
                    <Clock className="h-3 w-3 mr-1" />
                    {lastRefreshTime.toLocaleTimeString(i18n.language)}
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('clients.lastUpdate')}: {lastRefreshTime.toLocaleString(i18n.language)}</p>
                  <p className="text-xs mt-1">{t('clients.autoUpdate')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        
        <div className="flex space-x-2">
          {/* Il pulsante "Aggiorna prefissi" è stato rimosso dall'interfaccia utente
              ma l'API /api/update-phone-prefixes rimane disponibile per usi avanzati
              o per essere richiamata tramite script interni */}
          
          <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                {t('clients.newClient')}
              </Button>
            </DialogTrigger>
            <ClientForm onClose={() => setIsClientDialogOpen(false)} onClientCreated={handleClientCreated} />
          </Dialog>
        </div>
      </div>
      
      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <Input
            type="text"
            placeholder={t('clients.search.placeholder')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleSearch();
              }
            }}
          />
        </div>
        
        <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
          <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
            <TabsTrigger value="all">{t('clients.filter.all')}</TabsTrigger>
            <TabsTrigger value="frequent" className="flex items-center">
              <Star className="mr-1 h-3.5 w-3.5 text-pink-500" />
              {t('clients.filter.frequent')}
            </TabsTrigger>
            <TabsTrigger value="no-consent" className="flex items-center">
              <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-500" />
              {t('clients.filter.noConsent')}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {/* Client list */}
      {isLoading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filteredClients.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-8 text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
          <h3 className="text-lg font-medium text-gray-900 mb-1">{t('clients.noClientsFound')}</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? t('clients.noResultsMatch', { query: searchQuery })
              : t('clients.noClientsInSystem')
            }
          </p>
          <Button 
            onClick={() => setIsClientDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            {t('clients.addFirstClient')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <ClientCard 
              key={client.id} 
              client={client} 
              onUpdate={handleClientDeleted}
            />
          ))}
        </div>
      )}
      
      {/* Stats */}
      {clients.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-8">
          <div className="bg-white rounded-lg shadow-sm p-4 flex-grow">
            <div className="text-lg font-medium">{t('clients.stats.total')}</div>
            <div className="text-3xl font-bold mt-2">{clients.length}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 flex-grow">
            <div className="text-lg font-medium flex items-center">
              <Star className="mr-2 h-4 w-4 text-pink-500" />
              {t('clients.stats.frequent')}
            </div>
            <div className="text-3xl font-bold mt-2">
              {clients.filter(c => c.isFrequent).length}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 flex-grow">
            <div className="text-lg font-medium flex items-center">
              <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
              {t('clients.stats.noConsent')}
            </div>
            <div className="text-3xl font-bold mt-2">
              {clients.filter(c => !c.hasConsent).length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
