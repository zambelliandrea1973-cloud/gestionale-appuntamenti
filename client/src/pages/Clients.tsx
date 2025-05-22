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
  const [deletedClients, setDeletedClients] = useState<any[]>([]);
  
  // Fetch all clients
  const {
    data: clients = [],
    isLoading,
    refetch: refetchClients
  } = useQuery({
    queryKey: ["/api/clients"]
  });
  
  // Funzione per cercare i clienti eliminati (nascosti)
  const fetchDeletedClients = async () => {
    try {
      const response = await fetch('/api/clients/deleted');
      if (!response.ok) {
        throw new Error('Errore nel recupero dei clienti eliminati');
      }
      
      const data = await response.json();
      setDeletedClients(data || []);
    } catch (error) {
      console.error('Errore nel recupero dei clienti eliminati:', error);
      setDeletedClients([]);
    }
  };
  
  // Carica i clienti eliminati quando viene montato il componente o cambia la tab
  useEffect(() => {
    // Se la tab attiva è "deleted", carica i clienti eliminati
    if (activeTab === "deleted") {
      fetchDeletedClients();
    }
  }, [activeTab]);

  // Imposta un intervallo per aggiornare i dati ogni 5 minuti 
  // e un aggiornamento programmato a mezzanotte
  useEffect(() => {
    // Funzione per aggiornare i dati
    const refreshData = () => {
      console.log("Esecuzione aggiornamento automatico dati clienti");
      refetchClients().then(() => {
        setLastRefreshTime(new Date());
        
        // Se siamo nella tab dei clienti eliminati, aggiorniamo anche quelli
        if (activeTab === "deleted") {
          fetchDeletedClients();
        }
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
  }, [activeTab]);
  
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
  const filteredClients = activeTab === "deleted" 
    // Se il tab attivo è "deleted", mostra i clienti eliminati
    ? deletedClients
        .filter(client => 
          searchQuery.trim().length < 2 || 
          `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
          client.phone.includes(searchQuery) || 
          (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .sort((a, b) => a.lastName.localeCompare(b.lastName, 'it-IT'))
    // Altrimenti, mostra i client visibili filtrati
    : clients
        .filter(client => {
          // Apply search filter
          const matchesSearch = searchQuery.trim().length < 2 || 
            `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
            client.phone.includes(searchQuery) || 
            (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()));
          
          // Apply tab filter
          const matchesTab = 
            activeTab === "all" || 
            (activeTab === "frequent" && client.isFrequent) ||
            (activeTab === "no-consent" && !client.hasConsent);
          
          return matchesSearch && matchesTab;
        })
        // Ordina alfabeticamente per cognome
        .sort((a, b) => a.lastName.localeCompare(b.lastName, 'it-IT'));
  
  // Otteniamo l'istanza del queryClient
  const queryClient = useQueryClient();
  
  // Handle client form submission and refresh data
  const handleClientCreated = () => {
    console.log("Cliente creato/aggiornato, refreshing data...");
    
    // Invalidare tutte le query relative ai clienti
    queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
    
    // Invalidare anche tutte le query relative agli appuntamenti
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    
    // Refresh locale
    refetchClients();
    setIsClientDialogOpen(false);
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
          <TabsList className="grid grid-cols-4 w-full md:w-[540px]">
            <TabsTrigger value="all">{t('clients.filter.all')}</TabsTrigger>
            <TabsTrigger value="frequent" className="flex items-center">
              <Star className="mr-1 h-3.5 w-3.5 text-pink-500" />
              {t('clients.filter.frequent')}
            </TabsTrigger>
            <TabsTrigger value="no-consent" className="flex items-center">
              <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-500" />
              {t('clients.filter.noConsent')}
            </TabsTrigger>
            <TabsTrigger value="deleted" className="flex items-center">
              <AlertTriangle className="mr-1 h-3.5 w-3.5 text-red-500" />
              {t('clients.filter.deleted', 'Eliminati')}
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
              : activeTab === "deleted"
                ? t('clients.noDeletedClients', 'Nessun cliente eliminato')
                : t('clients.noClientsInSystem')
            }
          </p>
          {activeTab !== "deleted" && (
            <Button 
              onClick={() => setIsClientDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              {t('clients.addFirstClient')}
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            activeTab === "deleted" ? (
              <Card key={client.id} className="overflow-hidden border border-gray-200 bg-white shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 truncate">
                      {client.firstName} {client.lastName}
                    </h3>
                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                      {t('clients.status.deleted', 'Eliminato')}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm">
                    {client.phone && (
                      <div className="flex items-center text-gray-600">
                        <Phone className="mr-2 h-4 w-4" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.email && (
                      <div className="flex items-center text-gray-600">
                        <Mail className="mr-2 h-4 w-4" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="bg-gray-50 px-6 py-3 flex justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/clients/${client.id}/restore`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json'
                          }
                        });
                        
                        if (!response.ok) {
                          throw new Error(`Errore durante il ripristino: ${response.statusText}`);
                        }
                        
                        toast({
                          title: t('notifications.success'),
                          description: t('clients.clientRestored', 'Cliente ripristinato con successo'),
                        });
                        
                        // Aggiorna entrambi gli elenchi (visibili ed eliminati)
                        refetchClients();
                        fetchDeletedClients();
                      } catch (error) {
                        console.error('Errore durante il ripristino del cliente:', error);
                        toast({
                          title: t('notifications.error'),
                          description: t('clients.restoreError', 'Errore durante il ripristino del cliente'),
                          variant: "destructive"
                        });
                      }
                    }}
                  >
                    {t('clients.actions.restore', 'Ripristina')}
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <ClientCard 
                key={client.id} 
                client={client} 
                onUpdate={() => refetchClients()}
              />
            )
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
