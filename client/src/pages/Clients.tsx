// @ts-nocheck
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
  Phone,
  Download,
  Eye,
  EyeOff,
  Building2
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ClientForm from "@/components/ClientForm";
import ClientCard from "@/components/ClientCard";
import { useTranslation } from "react-i18next";
import { useMobileForcedSync } from "@/hooks/use-mobile-force-sync";

interface ClientsSummary {
  ownerId: number;
  clientCount: number;
  ownerName: string;
  ownerEmail: string | null;
  isCurrentUser: boolean;
}

export default function Clients() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const CLIENTS_PER_PAGE = 50;
  const [visibleCount, setVisibleCount] = useState(CLIENTS_PER_PAGE);
  
  // Stato per clienti caricati on-demand per professionista (lazy loading)
  const [loadedOwnerClients, setLoadedOwnerClients] = useState<Record<number, any[]>>({});
  const [loadingOwner, setLoadingOwner] = useState<number | null>(null);
  const [expandedOwners, setExpandedOwners] = useState<Set<number>>(new Set());
  
  // Clean React Query implementation for multi-tenant system
  const queryClient = useQueryClient();
  
  // Query per ottenere l'ID dell'utente corrente
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/user-with-license'],
    queryFn: async () => {
      const response = await fetch('/api/user-with-license', { credentials: 'include' });
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
  } = useQuery<any>({
    queryKey: ['/api/clients'],
    queryFn: async () => {
      const deviceType = window.innerWidth < 768 ? 'mobile' : 'desktop';
      
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
      
      return await response.json();
    },
    enabled: !isMobile || !effectiveClients // Disabilita query se mobile ha dati sincronizzati
  });

  // Utilizza dati sincronizzati per mobile o query normale per desktop
  const clients = effectiveClients || queryClients;
  const isLoading = isMobile ? !isForcesynced : queryLoading;
  
  const hasInitializedTab = useRef(false);
  useEffect(() => {
    if (currentUser && !hasInitializedTab.current) {
      hasInitializedTab.current = true;
      if (currentUser.type === 'admin') {
        setActiveTab("by-staff");
      }
    }
  }, [currentUser]);
  
  const forceRefreshFromServer = async () => {
    try {
      const result = await refetchClients();
      const clientCount = result.data?.length || 0;
      
      toast({
        title: t("clientsPageNotifications.refreshSuccess"),
        description: t("clientsPageNotifications.refreshSuccessDesc").replace("{count}", clientCount),
      });
    } catch (error) {
      console.error("Errore durante refresh:", error);
      toast({
        title: t("clientsPageNotifications.refreshError"),
        description: t("clientsPageNotifications.refreshErrorDesc"),
        variant: "destructive",
      });
    }
  };

  // Handle client form submission and refresh data
  const handleClientCreated = async () => {
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
        title: t('common.error'),
        description: t('i18nFinale.clientsPage.updateError'),
        variant: "destructive",
      });
    }
  };

  const handleClientUpdated = async () => {
    await refetchClients();
  };

  const handleClientDeleted = async () => {
    await refetchClients();
  };

  // Fetch client owners metadata for grouping (admin-only)
  const { data: clientOwners = [] } = useQuery<Array<{ id: number; assignmentCode: string | null; username: string }>>({
    queryKey: ['/api/client-owners'],
    enabled: currentUser?.type === 'admin' && activeTab === "by-staff"
  });

  // 🚀 LAZY LOADING: Query per riepilogo professionisti (solo conteggio, non dati completi)
  const { data: clientsSummary = [], isLoading: summaryLoading } = useQuery<ClientsSummary[]>({
    queryKey: ['/api/admin/clients-summary'],
    enabled: currentUser?.type === 'admin' && activeTab === "by-staff"
  });

  // Funzione per caricare clienti di un professionista on-demand
  const loadOwnerClients = async (ownerId: number) => {
    if (loadedOwnerClients[ownerId]) {
      // Toggle expand/collapse se già caricati
      setExpandedOwners(prev => {
        const newSet = new Set(prev);
        if (newSet.has(ownerId)) {
          newSet.delete(ownerId);
        } else {
          newSet.add(ownerId);
        }
        return newSet;
      });
      return;
    }

    setLoadingOwner(ownerId);
    try {
      const response = await fetch(`/api/admin/clients-by-owner/${ownerId}`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to load');
      const data = await response.json();
      
      setLoadedOwnerClients(prev => ({ ...prev, [ownerId]: data }));
      setExpandedOwners(prev => new Set(prev).add(ownerId));
      
      toast({
        title: t('i18nFinale.clientsPage.clientsLoadedTitle'),
        description: `${t('i18nFinale.clientsPage.clientsLoadedTitle')}: ${data.length}`,
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('i18nFinale.clientsPage.clientsLoadFailedTitle'),
        variant: "destructive"
      });
    } finally {
      setLoadingOwner(null);
    }
  };

  // Filter clients based on search query and active tab, then sort by lastName
  const filteredClients = clients
    .filter((client: any) => {
      // Apply search filter
      const matchesSearch = searchQuery.trim().length < 2 || 
        `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.phone?.includes(searchQuery) || 
        (client.email && client.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Apply tab filter - usa user_id per identificare proprietà
      const clientUserId = client.user_id || client.ownerId;
      const matchesTab = 
        activeTab === "all" || 
        activeTab === "by-staff" ||
        (activeTab === "my-clients" && currentUser && (!clientUserId || clientUserId === currentUser.id)) ||
        (activeTab === "other-clients" && currentUser && clientUserId && clientUserId !== currentUser.id) ||
        (activeTab === "frequent" && client.isFrequent === true) ||
        (activeTab === "no-consent" && client.hasConsent !== true);
      
      return matchesSearch && matchesTab;
    })
    .sort((a: any, b: any) => a.lastName.localeCompare(b.lastName, 'it-IT'));

  // Group clients by staff member (ownerId) - solo per admin
  const clientsByStaff = {};
  if (currentUser?.type === 'admin' && activeTab === "by-staff") {
    filteredClients.forEach((client: any) => {
      const ownerId = client.ownerId || client.user_id || currentUser.id;
      if (!clientsByStaff[ownerId]) {
        clientsByStaff[ownerId] = [];
      }
      clientsByStaff[ownerId].push(client);
    });
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>{t("clientsPageNotifications.loadingClients")}</p>
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
          <p className="text-red-600">{t("clientsPageNotifications.errorLoadingClients")} {error.message}</p>
          <Button onClick={() => refetchClients()} className="mt-4">
            <RefreshCw className="h-4 w-4 mr-2" />
            {t("clientsPageNotifications.retry")}
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
        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          {isMobile && (
            <Button
              onClick={async () => {
                await queryClient.invalidateQueries({ queryKey: ['/api/mobile-sync'] });
                toast({
                  title: t('i18nFinale.clientsPageExtra.mobileSyncTitle'),
                  description: t('i18nFinale.clientsPageExtra.mobileSyncDesc', { count: clientsCount }),
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
            className="flex-shrink-0"
          >
            <Server className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">{t('i18nFinale.clientsPageExtra.testServer')}</span>
            <span className="sm:hidden">{t('common.test')}</span>
          </Button>
          <Button
            onClick={async () => {
              await queryClient.clear();
              await refetchClients();
            }}
            variant="destructive"
            size="sm"
            className="flex-shrink-0"
          >
            <RefreshCw className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Debug Cache</span>
            <span className="sm:hidden">Debug</span>
          </Button>
          <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex-shrink-0">
                <Plus className="h-4 w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">{t("clients.addClient")}</span>
                <span className="sm:hidden">{t('i18nFinale.clientsPage.newShort')}</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{t("clients.addNewClient")}</DialogTitle>
              </DialogHeader>
              <ClientForm 
                onClose={() => setIsClientDialogOpen(false)} 
              />
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
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(CLIENTS_PER_PAGE);
            }}
            className="pl-10"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setVisibleCount(CLIENTS_PER_PAGE); }} className="w-full">
          <TabsList className={`grid w-full gap-1 ${currentUser?.type === 'admin' ? 'grid-cols-3 sm:grid-cols-6' : 'grid-cols-2 sm:grid-cols-3'}`}>
            <TabsTrigger value="all" className="flex items-center gap-1 text-xs sm:text-sm px-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t("clients.allClients")}</span>
              <span className="sm:hidden">{t('i18nFinale.clientsPage.allTab')}</span>
              <span className="ml-0.5">({clients.filter(() => true).length})</span>
            </TabsTrigger>
            {currentUser?.type === 'admin' && (
              <>
                <TabsTrigger value="by-staff" className="flex items-center gap-1 text-xs sm:text-sm px-2 bg-blue-50 border-blue-200 text-blue-700 data-[state=active]:bg-blue-100">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("clientsPageNotifications.staffLabel")}</span>
                  <span className="sm:hidden">Staff</span>
                </TabsTrigger>
                <TabsTrigger value="my-clients" className="flex items-center gap-1 text-xs sm:text-sm px-2 bg-green-50 border-green-200 text-green-700 data-[state=active]:bg-green-100">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("clientsPageNotifications.myClientsLabel")}</span>
                  <span className="sm:hidden">Miei</span>
                  <span className="ml-0.5">({clients.filter((c: any) => c.ownerId === currentUser.id).length})</span>
                </TabsTrigger>
                <TabsTrigger value="other-clients" className="flex items-center gap-1 text-xs sm:text-sm px-2 bg-orange-50 border-orange-200 text-orange-700 data-[state=active]:bg-orange-100">
                  <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{t("clientsPageNotifications.otherAccountsLabel")}</span>
                  <span className="sm:hidden">{t('i18nFinale.clientsPage.othersTab')}</span>
                  <span className="ml-0.5">({clients.filter((c: any) => c.ownerId !== currentUser.id).length})</span>
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="frequent" className="flex items-center gap-1 text-xs sm:text-sm px-2">
              <UserCheck className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t("clients.frequentClients")}</span>
              <span className="sm:hidden">Frequenti</span>
              <span className="ml-0.5">({clients.filter((c: any) => c.isFrequent === true).length})</span>
            </TabsTrigger>
            <TabsTrigger value="no-consent" className="flex items-center gap-1 text-xs sm:text-sm px-2">
              <UserX className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">{t("clients.noConsent")}</span>
              <span className="sm:hidden">{t('i18nFinale.clientsPage.noConsentTab')}</span>
              <span className="ml-0.5">({clients.filter((c: any) => c.hasConsent !== true).length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {/* 🚀 ADMIN BY-STAFF: Usa logica separata basata su clientsSummary */}
            {activeTab === "by-staff" && currentUser?.type === 'admin' ? (
              // 🚀 LAZY LOADING: Vista riepilogo professionisti con caricamento on-demand
              <div className="space-y-4">
                {summaryLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>{t('i18nFinale.clientsPage.loadingSummary')}</span>
                  </div>
                ) : clientsSummary.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                      <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">{t('i18nFinale.clientsPage.noProfessionalsFound')}</h3>
                      <p className="text-muted-foreground text-center">
                        {t('i18nFinale.clientsPage.noClientsInSystem')}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  clientsSummary.map((summary) => {
                    const isExpanded = expandedOwners.has(summary.ownerId);
                    const ownerClients = loadedOwnerClients[summary.ownerId] || [];
                    const isLoadingThis = loadingOwner === summary.ownerId;
                    
                    return (
                      <Card key={summary.ownerId} className={`border-2 ${summary.isCurrentUser ? 'border-green-300' : 'border-gray-200'}`}>
                        <CardHeader 
                          className={`cursor-pointer hover:bg-gray-50 transition-colors ${summary.isCurrentUser ? 'bg-green-50' : 'bg-blue-50'}`}
                          onClick={() => loadOwnerClients(summary.ownerId)}
                        >
                          <CardTitle className="flex items-center justify-between">
                            <span className="flex items-center gap-2">
                              {summary.isCurrentUser ? (
                                <span className="text-green-600">👑</span>
                              ) : (
                                <Building2 className="h-5 w-5 text-blue-600" />
                              )}
                              <span className="font-medium">
                                {summary.ownerName}
                              </span>
                              {summary.ownerEmail && !summary.isCurrentUser && (
                                <span className="text-sm text-muted-foreground hidden md:inline">
                                  ({summary.ownerEmail})
                                </span>
                              )}
                            </span>
                            <div className="flex items-center gap-2">
                              <Badge variant={summary.isCurrentUser ? "default" : "secondary"} className="text-sm">
                                {summary.clientCount} {t('clients.clientCount', { count: summary.clientCount, defaultValue: summary.clientCount === 1 ? 'client' : 'clients' })}
                              </Badge>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                disabled={isLoadingThis}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  loadOwnerClients(summary.ownerId);
                                }}
                              >
                                {isLoadingThis ? (
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                ) : isExpanded ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </CardTitle>
                        </CardHeader>
                        
                        {/* Clienti caricati on-demand */}
                        {isExpanded && (
                          <CardContent className="pt-6">
                            {ownerClients.length > 0 ? (
                              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {ownerClients.map((client: any) => (
                                  <ClientCard
                                    key={client.id}
                                    client={client}
                                    onUpdate={handleClientUpdated}
                                    onDelete={handleClientDeleted}
                                    isOtherAccount={!summary.isCurrentUser}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="text-center py-8 text-muted-foreground">
                                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                <p>{t('i18nFinale.clientsPage.noClientsForProfessional')}</p>
                              </div>
                            )}
                          </CardContent>
                        )}
                      </Card>
                    );
                  })
                )}
              </div>
            ) : filteredClients.length === 0 ? (
              // Empty state per altri tab
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    {searchQuery.length >= 2 ? t("clients.noSearchResults") : t("clients.noClients")}
                  </h3>
                  <p className="text-muted-foreground text-center mb-6">
                    {searchQuery.length >= 2 
                      ? t("clients.noSearchResultsDescription")
                      : currentUser?.type === 'admin' 
                        ? t('clients.adminPersonalClientsHint', "Your personal clients will appear here. Use the 'Staff' tab to see other professionals' clients.")
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
              // Vista normale (griglia semplice) con paginazione
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredClients.slice(0, visibleCount).map((client: any) => {
                    const clientUserId = client.user_id || client.ownerId;
                    const isOtherAccount = currentUser?.type === 'admin' && clientUserId && clientUserId !== currentUser.id;
                    
                    return (
                      <ClientCard
                        key={client.id}
                        client={client}
                        onUpdate={handleClientUpdated}
                        onDelete={handleClientDeleted}
                        isOtherAccount={isOtherAccount}
                      />
                    );
                  })}
                </div>
                {visibleCount < filteredClients.length && (
                  <div className="flex justify-center mt-6">
                    <Button
                      variant="outline"
                      onClick={() => setVisibleCount(prev => prev + CLIENTS_PER_PAGE)}
                      className="px-8"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      {Math.min(visibleCount, filteredClients.length)} / {filteredClients.length} — {t("clients.loadMore", "Load more")}
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}