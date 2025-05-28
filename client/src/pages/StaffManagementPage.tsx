import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, UserPlus, Search, Edit, Trash2, CreditCard, History, Eye, EyeOff, Settings, Shield } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StaffUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
  referralCode?: string;
}

export default function StaffManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Stati per i dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPaymentHistoryDialogOpen, setIsPaymentHistoryDialogOpen] = useState(false);
  const [isBankingDialogOpen, setIsBankingDialogOpen] = useState(false);
  const [isAdminConfigDialogOpen, setIsAdminConfigDialogOpen] = useState(false);
  
  // Stati per i form
  const [formError, setFormError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSavingAdminConfig, setIsSavingAdminConfig] = useState(false);
  
  // Ricerca
  const [searchQuery, setSearchQuery] = useState("");
  
  // Utente selezionato
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  
  // Form data
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "staff"
  });
  
  // Configurazione admin
  const [adminBankingConfig, setAdminBankingConfig] = useState({
    adminIban: "",
    adminBank: "",
    adminAccountHolder: "",
    paymentApiKey: "",
    dailyLimit: 500,
    autoPaymentsEnabled: false
  });

  // Query per ottenere gli utenti staff
  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/staff/users'],
    queryFn: async () => {
      const response = await fetch('/api/staff/users');
      if (!response.ok) {
        throw new Error('Failed to fetch staff users');
      }
      return response.json();
    },
  });

  // Funzione per aggiungere un nuovo utente
  const handleAddUser = async () => {
    if (!formData.username || !formData.email || !formData.password) {
      setFormError("Tutti i campi sono obbligatori");
      return;
    }

    setIsCreating(true);
    setFormError("");

    try {
      const response = await fetch('/api/staff/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
        setFormData({ username: "", email: "", password: "", role: "staff" });
        setIsAddDialogOpen(false);
        toast({
          title: "Successo",
          description: "Utente staff creato con successo",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante la creazione dell'utente");
      }
    } catch (err: any) {
      setFormError(err.message || "Si è verificato un errore durante la creazione dell'utente");
      toast({
        variant: "destructive",
        title: "Errore",
        description: err.message || "Impossibile creare l'utente staff",
      });
    } finally {
      setIsCreating(false);
    }
  };

  // Funzione per salvare la configurazione admin
  const saveAdminConfig = async () => {
    if (!adminBankingConfig.adminIban) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: "L'IBAN dell'amministratore è obbligatorio",
      });
      return;
    }

    setIsSavingAdminConfig(true);

    try {
      const response = await fetch('/api/admin/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(adminBankingConfig),
      });

      if (response.ok) {
        setIsAdminConfigDialogOpen(false);
        toast({
          title: "Successo",
          description: "Configurazione admin salvata con successo",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante il salvataggio della configurazione");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: err.message || "Impossibile salvare la configurazione",
      });
    } finally {
      setIsSavingAdminConfig(false);
    }
  };

  // Funzioni di gestione
  const handleDeleteClick = (user: StaffUser) => {
    setSelectedUser(user);
    // Qui andrà la logica per eliminare l'utente
  };

  const handleEditClick = (user: StaffUser) => {
    setSelectedUser(user);
    setIsEditDialogOpen(true);
  };

  const handleBankingClick = (user: StaffUser) => {
    setSelectedUser(user);
    setIsBankingDialogOpen(true);
  };

  const handlePaymentHistoryClick = (user: StaffUser) => {
    setSelectedUser(user);
    setIsPaymentHistoryDialogOpen(true);
  };

  // Filtra gli utenti in base alla ricerca
  const filteredUsers = staffUsers.filter((user: StaffUser) => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>
            Impossibile caricare gli utenti staff. Riprova più tardi.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestione Staff</h1>
          <p className="text-muted-foreground">Gestisci gli utenti staff del tuo sistema</p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            variant="outline" 
            onClick={() => setIsAdminConfigDialogOpen(true)}
            className="border-blue-200 text-blue-700 hover:bg-blue-50"
          >
            <Settings className="mr-2 h-4 w-4" />
            Configurazione Admin
          </Button>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                <span>Aggiungi Staff</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Aggiungi nuovo utente staff</DialogTitle>
                <DialogDescription>
                  Crea un nuovo account staff che potrà accedere al sistema.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                {formError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Errore</AlertTitle>
                    <AlertDescription>{formError}</AlertDescription>
                  </Alert>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="username">Username *</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    placeholder="Inserisci username"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Inserisci email"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="Inserisci password"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsAddDialogOpen(false)}
                  disabled={isCreating}
                >
                  Annulla
                </Button>
                <Button
                  onClick={handleAddUser}
                  disabled={isCreating}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creazione...
                    </>
                  ) : (
                    <>
                      <UserPlus className="mr-2 h-4 w-4" />
                      Crea Utente
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Barra di ricerca */}
      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Cerca staff per username o email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Lista utenti staff */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.map((user: StaffUser) => (
          <Card key={user.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{user.username}</CardTitle>
                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                  {user.role}
                </Badge>
              </div>
              <CardDescription>{user.email}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleEditClick(user)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Modifica
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleBankingClick(user)}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Dati Bancari
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaymentHistoryClick(user)}
                >
                  <History className="h-4 w-4 mr-1" />
                  Storico
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">Nessun utente staff trovato.</p>
        </div>
      )}

      {/* Dialog Configurazione Admin */}
      <Dialog open={isAdminConfigDialogOpen} onOpenChange={setIsAdminConfigDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Configurazione Admin
            </DialogTitle>
            <DialogDescription>
              Configura i tuoi dati bancari per autorizzare i pagamenti automatici agli staff
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="adminIban">IBAN Amministratore *</Label>
              <Input
                id="adminIban"
                value={adminBankingConfig.adminIban}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  adminIban: e.target.value
                }))}
                placeholder="IT60 X054 2811 1010 0000 0123 456"
                className="font-mono"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminBank">Banca</Label>
              <Input
                id="adminBank"
                value={adminBankingConfig.adminBank}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  adminBank: e.target.value
                }))}
                placeholder="Nome della banca"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="adminAccountHolder">Intestatario Conto</Label>
              <Input
                id="adminAccountHolder"
                value={adminBankingConfig.adminAccountHolder}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  adminAccountHolder: e.target.value
                }))}
                placeholder="Nome completo intestatario"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="paymentApiKey">API Key Pagamenti</Label>
              <Input
                id="paymentApiKey"
                type="password"
                value={adminBankingConfig.paymentApiKey}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  paymentApiKey: e.target.value
                }))}
                placeholder="API key per servizio bonifici"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dailyLimit">Limite Giornaliero (€)</Label>
              <Input
                id="dailyLimit"
                type="number"
                value={adminBankingConfig.dailyLimit}
                onChange={(e) => setAdminBankingConfig(prev => ({
                  ...prev,
                  dailyLimit: parseFloat(e.target.value) || 0
                }))}
                placeholder="500"
              />
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="autoPaymentsEnabled"
                checked={adminBankingConfig.autoPaymentsEnabled}
                onCheckedChange={(checked) => setAdminBankingConfig(prev => ({
                  ...prev,
                  autoPaymentsEnabled: checked as boolean
                }))}
              />
              <Label htmlFor="autoPaymentsEnabled">
                Abilita pagamenti automatici
              </Label>
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAdminConfigDialogOpen(false)}
              disabled={isSavingAdminConfig}
            >
              Annulla
            </Button>
            <Button
              onClick={saveAdminConfig}
              disabled={isSavingAdminConfig || !adminBankingConfig.adminIban}
            >
              {isSavingAdminConfig ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <Shield className="mr-2 h-4 w-4" />
                  Salva Configurazione
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}