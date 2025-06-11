import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { 
  Plus, 
  Search, 
  Users, 
  UserCheck, 
  UserX, 
  RefreshCw,
  Server,
  Phone
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ClientForm from "@/components/ClientForm";
import ClientCard from "@/components/ClientCard";
import { useTranslation } from "react-i18next";
import { useMobileForcedSync } from "@/hooks/use-mobile-force-sync";

export default function Clients() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Clean React Query implementation for multi-tenant system
  const queryClient = useQueryClient();
  
  // Query per ottenere l'ID dell'utente corrente
  const { data: currentUser } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      const response = await fetch('/api/user', { credentials: 'include' });
      if (!response.ok) throw new Error('Failed to fetch user');
      return response.json();
    }
  });
  
  // Sistema di sincronizzazione forzata per mobile - stesso percorso del PC
  const { syncData, isMobile, clientsCount, isForcesynced } = useMobileForcedSync();
  
  // Se mobile usa dati sincronizzati, altrimenti usa query normale
  const effectiveClients = isMobile && syncData ? syncData.clients : undefined;
  
  const {
    data: queryClients = [],
    isLoading: queryLoading,
    error,
    refetch: refetchClients
  } = useQuery({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
      console.log(`[${deviceType}] Chiamata /api/clients con nuovo sistema multi-tenant`);
      
      const response = await fetch('/api/clients', {
        credentials: 'include',
        headers: {
          'X-Device-Type': deviceType,
          'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'If-Modified-Since': 'Mon, 26 Jul 1997 05:00:00 GMT',
          'If-None-Match': '*'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log(`[${deviceType}] Ricevuti ${data.length} clienti dal nuovo sistema multi-tenant`);
      console.log(`[${deviceType}] Sample clienti:`, data.slice(0, 3).map(c => ({
        id: c.id, 
        firstName: c.firstName, 
        lastName: c.lastName, 
        uniqueCode: c.uniqueCode 
      })));
      return data;
    },
    enabled: !isMobile || !effectiveClients // Disabilita query se mobile ha dati sincronizzati
  });

  // Utilizza dati sincronizzati per mobile o query normale per desktop
  const clients = effectiveClients || queryClients;
  const isLoading = isMobile ? !isForcesynced : queryLoading;
  
  // Debug per mobile
  if (isMobile && effectiveClients) {
    console.log(`📱 [CLIENTS] Mobile usando dati sincronizzati: ${effectiveClients.length} clienti`);
  }
  
  const forceRefreshFromServer = async () => {
    console.log("Refresh con nuovo sistema multi-tenant");
    try {
      const result = await refetchClients();
      const clientCount = result.data?.length || 0;
      
      toast({
        title: "Aggiornamento completato",
        description: `Caricati ${clientCount} clienti dal server`,
      });
    } catch (error) {
      console.error("Errore durante refresh:", error);
      toast({
        title: "Errore",
        description: "Impossibile aggiornare dal server",
        variant: "destructive",
      });
    }
  };

  // Handle client form submission and refresh data
  const handleClientCreated = async () => {
    console.log("Cliente creato/aggiornato, refreshing data...");
    
    try {
      await queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      await refetchClients();
      
      setIsClientDialogOpen(false);
      
      toast({
        title: t("clients.clientCreatedTitle"),
        description: t("clients.clientCreatedDescription"),
      });
    } catch (error) {
      console.error("Errore durante il refresh dopo creazione cliente:", error);
      toast({
        title: "Errore",
        description: "Errore durante l'aggiornamento dei dati",
        variant: "destructive",
      });
    }
  };

  // Handle client update
  const handleClientUpdated = async () => {
    console.log("Cliente aggiornato, refreshing data...");
    await refetchClients();
  };

  // Handle client deletion
  const handleClientDeleted = async () => {
    console.log("Cliente eliminato, refreshing data...");
    await refetchClients();
  };

  // Filter clients based on search query and active tab, then sort by lastName
  const filteredClients = clients
    .filter((client: any) => {
      // Apply search filter
      const matchesSearch = searchQuery.trim().length < 2 || 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery) || 
        (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Apply tab filter
      const matchesTab = 
        activeTab === "all" || 
        (activeTab === "my-clients" && currentUser && client.ownerId === currentUser.id) ||
        (activeTab === "other-clients" && currentUser && client.ownerId !== currentUser.id) ||
        (activeTab === "frequent" && client.isFrequent === true) ||
        (activeTab === "no-consent" && client.hasConsent !== true);
      
      return matchesSearch && matchesTab;
    })
    .sort((a, b) => a.lastName.localeCompare(b.lastName, 'it-IT'));

  console.log(`CONTEGGIO CLIENTI: Ricevuti: ${clients.length}, Filtrati: ${filteredClients.length}, Tab attivo: ${activeTab}`);
  
  // Debug ownership per admin - FORZATO
  if (currentUser?.type === 'admin' && clients.length > 0) {
    const ownershipStats = {};
    clients.forEach(client => {
      const owner = client.ownerId || 'undefined';
      ownershipStats[owner] = (ownershipStats[owner] || 0) + 1;
    });
    console.log(`👑 [CLIENT-DEBUG] FORCED - Distribuzione frontend clienti per ownerId:`, ownershipStats);
    console.log(`👑 [CLIENT-DEBUG] FORCED - Admin ID corrente: ${currentUser.id}`);
    
    const ownClients = clients.filter(c => c.ownerId === currentUser.id).length;
    const otherClients = clients.filter(c => c.ownerId !== currentUser.id).length;
    console.log(`👑 [CLIENT-DEBUG] FORCED - Frontend - Clienti propri: ${ownClients}, Altri: ${otherClients}`);
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Caricamento clienti...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-red-600">Errore nel caricamento dei clienti: {error.message}</p>
          <Button onClick={() => refetchClients()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            Riprova
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("clients.title")}</h1>
          <p className="text-muted-foreground mt-2">
            {t("clients.subtitle")} ({filteredClients.length} {t("clients.total")})
          </p>
        </div>
        <div className="flex gap-2">
          {isMobile && (
            <Button
              onClick={async () => {
                console.log(`📱 [MOBILE-SYNC-TEST] Forzando sincronizzazione mobile`);
                await queryClient.invalidateQueries({ queryKey: ['/api/mobile-sync'] });
                toast({
                  title: "Sincronizzazione Mobile",
                  description: `Test sync: ${clientsCount} clienti disponibili`,
                });
              }}
              variant="secondary"
              size="sm"
            >
              📱 Sync Mobile ({clientsCount})
            </Button>
          )}
          <Button
            onClick={forceRefreshFromServer}
            variant="outline"
            size="sm"
          >
            <Server className="h-4 w-4 mr-2" />
            Test Server
          </Button>
          <Button
            onClick={async () => {
              const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
              console.log(`🚀 [${deviceType}] DEBUG: Forzando refresh completo`);
              await queryClient.clear();
              await refetchClients();
            }}
            variant="destructive"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Debug Cache
          </Button>
          <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t("clients.addClient")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("clients.addNewClient")}</DialogTitle>
              </DialogHeader>
              <ClientForm onSuccess={handleClientCreated} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search and Tabs */}
      <div className="mb-6">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder={t("clients.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full ${currentUser?.type === 'admin' ? 'grid-cols-5' : 'grid-cols-3'}`}>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {t("clients.allClients")} ({clients.filter(() => true).length})
            </TabsTrigger>
            {currentUser?.type === 'admin' && (
              <>
                <TabsTrigger value="my-clients" className="flex items-center gap-2 bg-green-50 border-green-200 text-green-700 data-[state=active]:bg-green-100">
                  <Users className="h-4 w-4" />
                  Miei Clienti ({clients.filter((c: any) => c.ownerId === currentUser.id).length})
                </TabsTrigger>
                <TabsTrigger value="other-clients" className="flex items-center gap-2 bg-orange-50 border-orange-200 text-orange-700 data-[state=active]:bg-orange-100">
                  <Users className="h-4 w-4" />
                  Altri Account ({clients.filter((c: any) => c.ownerId !== currentUser.id).length})
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="frequent" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              {t("clients.frequentClients")} ({clients.filter((c: any) => c.isFrequent === true).length})
            </TabsTrigger>
            <TabsTrigger value="no-consent" className="flex items-center gap-2">
              <UserX className="h-4 w-4" />
              {t("clients.noConsent")} ({clients.filter((c: any) => c.hasConsent !== true).length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {filteredClients.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery.length >= 2 ? t("clients.noSearchResults") : t("clients.noClients")}
                  </h3>
                  <p className="text-muted-foreground text-center mb-6">
                    {searchQuery.length >= 2 
                      ? t("clients.noSearchResultsDescription")
                      : t("clients.noClientsDescription")
                    }
                  </p>
                  {searchQuery.length < 2 && (
                    <Button onClick={() => setIsClientDialogOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      {t("clients.addFirstClient")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredClients.map((client: any) => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onUpdate={handleClientUpdated}
                    onDelete={handleClientDeleted}
                    isOtherAccount={currentUser?.type === 'admin' && client.ownerId !== currentUser.id}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}