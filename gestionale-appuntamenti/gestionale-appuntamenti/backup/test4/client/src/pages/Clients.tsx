import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { 
  Plus, 
  Search, 
  UserPlus, 
  Star, 
  AlertCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ClientForm from "@/components/ClientForm";
import ClientCard from "@/components/ClientCard";

export default function Clients() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch all clients
  const {
    data: clients = [],
    isLoading,
    refetch: refetchClients
  } = useQuery({
    queryKey: ["/api/clients"]
  });
  
  // Client search
  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) {
      toast({
        title: "Ricerca troppo breve",
        description: "Inserisci almeno 2 caratteri per la ricerca",
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
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <h2 className="text-2xl font-medium">Gestione Clienti</h2>
        
        <Dialog open={isClientDialogOpen} onOpenChange={setIsClientDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Nuovo Cliente
            </Button>
          </DialogTrigger>
          <ClientForm onClose={() => setIsClientDialogOpen(false)} onClientCreated={handleClientCreated} />
        </Dialog>
      </div>
      
      {/* Search and filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-500" />
          </div>
          <Input
            type="text"
            placeholder="Cerca clienti per nome, telefono o email..."
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
            <TabsTrigger value="all">Tutti</TabsTrigger>
            <TabsTrigger value="frequent" className="flex items-center">
              <Star className="mr-1 h-3.5 w-3.5 text-pink-500" />
              Frequenti
            </TabsTrigger>
            <TabsTrigger value="no-consent" className="flex items-center">
              <AlertCircle className="mr-1 h-3.5 w-3.5 text-amber-500" />
              Senza Consenso
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
          <h3 className="text-lg font-medium text-gray-900 mb-1">Nessun cliente trovato</h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? `Nessun cliente corrisponde ai criteri di ricerca "${searchQuery}"`
              : "Non ci sono clienti registrati nel sistema"
            }
          </p>
          <Button 
            onClick={() => setIsClientDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Aggiungi il primo cliente
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map(client => (
            <ClientCard 
              key={client.id} 
              client={client} 
              onUpdate={() => refetchClients()}
            />
          ))}
        </div>
      )}
      
      {/* Stats */}
      {clients.length > 0 && (
        <div className="flex flex-wrap gap-4 mt-8">
          <div className="bg-white rounded-lg shadow-sm p-4 flex-grow">
            <div className="text-lg font-medium">Totale clienti</div>
            <div className="text-3xl font-bold mt-2">{clients.length}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 flex-grow">
            <div className="text-lg font-medium flex items-center">
              <Star className="mr-2 h-4 w-4 text-pink-500" />
              Clienti frequenti
            </div>
            <div className="text-3xl font-bold mt-2">
              {clients.filter(c => c.isFrequent).length}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow-sm p-4 flex-grow">
            <div className="text-lg font-medium flex items-center">
              <AlertCircle className="mr-2 h-4 w-4 text-amber-500" />
              Senza consenso
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
