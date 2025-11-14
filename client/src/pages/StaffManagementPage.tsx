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
import { Loader2, UserPlus, Search, Edit, Trash2, CreditCard, History, Eye, EyeOff } from "lucide-react";
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
  
  // Stati per i form
  const [formError, setFormError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
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

  // Query per ottenere gli utenti staff
  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/staff/users'],
    queryFn: async () => {
      const response = await fetch('/api/staff/users', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch staff users: ${response.status}`);
      }
      
      const data = await response.json();
      return data;
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
    </div>
  );
}