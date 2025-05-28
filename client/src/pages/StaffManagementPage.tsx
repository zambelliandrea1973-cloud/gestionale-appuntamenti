import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Search, UserPlus, X, Edit, Trash, CreditCard, Euro, History } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from "@/components/ui/alert";
import { PasswordInput } from "@/components/ui/password-input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Interfaccia per il tipo di utente staff
interface StaffUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
  referralCode?: string;
}

export default function StaffManagementPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<StaffUser | null>(null);
  const [userToEdit, setUserToEdit] = useState<StaffUser | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  
  // Form per nuovo utente staff
  const [newUsername, setNewUsername] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Form per modificare utente staff
  const [editUsername, setEditUsername] = useState<string>("");
  const [editPassword, setEditPassword] = useState<string>("");
  const [editEmail, setEditEmail] = useState<string>("");
  const [editFormError, setEditFormError] = useState<string | null>(null);
  
  // Dialog per gestione dati bancari
  const [isBankingDialogOpen, setIsBankingDialogOpen] = useState<boolean>(false);
  const [selectedStaffForBanking, setSelectedStaffForBanking] = useState<StaffUser | null>(null);
  const [bankingData, setBankingData] = useState({
    iban: "",
    bankName: "",
    accountHolder: "",
    swift: ""
  });
  const [isSavingBanking, setIsSavingBanking] = useState<boolean>(false);
  
  // Dialog per storico pagamenti
  const [isPaymentHistoryDialogOpen, setIsPaymentHistoryDialogOpen] = useState<boolean>(false);
  const [selectedStaffForPayments, setSelectedStaffForPayments] = useState<StaffUser | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState<boolean>(false);
  
  const { toast } = useToast();

  // Carica la lista degli utenti staff
  useEffect(() => {
    fetchStaffUsers();
  }, []);

  // Funzione per caricare gli utenti staff
  const fetchStaffUsers = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await apiRequest("GET", "/api/staff/list");
      
      if (response.ok) {
        const data = await response.json();
        setStaffUsers(data);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante il caricamento degli utenti staff");
      }
    } catch (err: any) {
      setError(err.message || "Si è verificato un errore durante il caricamento degli utenti");
      toast({
        variant: "destructive",
        title: "Errore",
        description: err.message || "Impossibile caricare gli utenti staff",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Funzione per registrare un nuovo utente staff
  const registerStaffUser = async () => {
    setFormError(null);
    setIsSubmitting(true);
    
    // Validazione di base
    if (!newUsername || !newPassword) {
      setFormError("Inserisci sia username che password");
      setIsSubmitting(false);
      return;
    }
    
    try {
      const response = await apiRequest("POST", "/api/staff/register", {
        username: newUsername,
        password: newPassword,
        email: newEmail || undefined,
        role: "staff" // Default role è staff
      });
      
      if (response.ok) {
        const newUser = await response.json();
        
        // Aggiorna la lista degli utenti
        setStaffUsers(prev => [...prev, newUser]);
        
        // Reset form
        setNewUsername("");
        setNewPassword("");
        setNewEmail("");
        
        // Chiudi dialog
        setIsAddDialogOpen(false);
        
        toast({
          title: "Utente creato",
          description: `L'utente ${newUser.username} è stato creato con successo`,
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
      setIsSubmitting(false);
    }
  };

  // Funzione per eliminare un utente staff
  const deleteStaffUser = async () => {
    if (!userToDelete) return;
    
    setIsDeleting(true);
    
    try {
      const response = await apiRequest("DELETE", `/api/staff/${userToDelete.id}`);
      
      if (response.ok) {
        // Rimuovi l'utente dalla lista
        setStaffUsers(prev => prev.filter(user => user.id !== userToDelete.id));
        
        toast({
          title: "Utente eliminato",
          description: `L'utente ${userToDelete.username} è stato eliminato con successo`,
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante l'eliminazione dell'utente");
      }
    } catch (err: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: err.message || "Impossibile eliminare l'utente staff",
      });
    } finally {
      setIsDeleting(false);
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };
  
  // Inizia il processo di eliminazione
  const handleDeleteClick = (user: StaffUser) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  // Gestione dati bancari
  const handleBankingClick = (user: StaffUser) => {
    setSelectedStaffForBanking(user);
    setBankingData({
      iban: "",
      bankName: "",
      accountHolder: user.username || "",
      swift: ""
    });
    setIsBankingDialogOpen(true);
  };

  // Gestione storico pagamenti
  const handlePaymentHistoryClick = async (user: StaffUser) => {
    setSelectedStaffForPayments(user);
    setIsPaymentHistoryDialogOpen(true);
    setIsLoadingPayments(true);
    
    try {
      const response = await apiRequest("GET", `/api/referral/staff/${user.id}/payments`);
      if (response.ok) {
        const data = await response.json();
        setPaymentHistory(data.payments || []);
      } else {
        console.error("Errore nel caricamento storico pagamenti");
        setPaymentHistory([]);
      }
    } catch (error) {
      console.error("Errore nel caricamento storico pagamenti:", error);
      setPaymentHistory([]);
    } finally {
      setIsLoadingPayments(false);
    }
  };

  // Salva dati bancari
  const saveBankingInfo = async () => {
    if (!selectedStaffForBanking) return;
    
    setIsSavingBanking(true);
    try {
      const response = await apiRequest("POST", `/api/referral/staff/${selectedStaffForBanking.id}/banking`, bankingData);
      
      if (response.ok) {
        toast({
          title: "Dati bancari salvati",
          description: `Informazioni bancarie salvate per ${selectedStaffForBanking.username}`,
        });
        setIsBankingDialogOpen(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || "Errore nel salvataggio");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Errore",
        description: error.message || "Impossibile salvare le informazioni bancarie",
      });
    } finally {
      setIsSavingBanking(false);
    }
  };
  
  // Inizia il processo di modifica
  const handleEditClick = (user: StaffUser) => {
    setUserToEdit(user);
    setEditUsername(user.username);
    setEditEmail(user.email || "");
    setEditPassword(""); // Password vuota, la modificheremo solo se inserita
    setEditFormError(null);
    setIsEditDialogOpen(true);
  };
  
  // Funzione per aggiornare un utente staff
  const updateStaffUser = async () => {
    if (!userToEdit) return;
    
    setEditFormError(null);
    setIsEditing(true);
    
    // Prepara i dati da inviare - includi solo i campi che sono stati modificati
    const updateData: any = {};
    
    if (editUsername !== userToEdit.username) {
      updateData.username = editUsername;
    }
    
    if (editEmail !== (userToEdit.email || "")) {
      updateData.email = editEmail || null; // Se vuoto, imposta null
    }
    
    // Includi la password solo se è stata inserita
    if (editPassword) {
      updateData.password = editPassword;
    }
    
    // Se non è stato modificato nulla, mostra un errore
    if (Object.keys(updateData).length === 0) {
      setEditFormError("Nessuna modifica apportata");
      setIsEditing(false);
      return;
    }
    
    try {
      const response = await apiRequest("PATCH", `/api/staff/${userToEdit.id}`, updateData);
      
      if (response.ok) {
        const updatedUser = await response.json();
        
        // Aggiorna la lista degli utenti
        setStaffUsers(prev => 
          prev.map(user => user.id === userToEdit.id ? { ...user, ...updatedUser } : user)
        );
        
        toast({
          title: "Utente aggiornato",
          description: `L'utente ${updatedUser.username} è stato aggiornato con successo`,
        });
        
        // Chiudi dialog
        setIsEditDialogOpen(false);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Errore durante l'aggiornamento dell'utente");
      }
    } catch (err: any) {
      setEditFormError(err.message || "Si è verificato un errore durante l'aggiornamento dell'utente");
      toast({
        variant: "destructive",
        title: "Errore",
        description: err.message || "Impossibile aggiornare l'utente staff",
      });
    } finally {
      setIsEditing(false);
    }
  };
  
  // Filtra gli utenti in base alla ricerca
  const filteredUsers = staffUsers.filter(user => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username per il login"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <PasswordInput
                  id="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password sicura"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email (opzionale)</Label>
                <Input
                  id="email"
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="Indirizzo email"
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Annulla
              </Button>
              <Button 
                onClick={registerStaffUser} 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creazione in corso...
                  </>
                ) : "Crea utente"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      <Card>
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center">
            <CardTitle>Utenti Staff</CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca utenti..."
                className="pl-8 w-[250px]"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-2.5"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Errore</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery 
                ? "Nessun utente trovato con i criteri di ricerca" 
                : "Nessun utente staff registrato"}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Codice Referral</TableHead>
                  <TableHead>Creato il</TableHead>
                  <TableHead className="text-right">Azioni</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell>{user.email || "-"}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        user.role === "admin" 
                          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" 
                          : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                      }`}>
                        {user.role === "admin" ? "Amministratore" : "Staff"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                        {user.referralCode || `-`}
                      </span>
                    </TableCell>
                    <TableCell>
                      {user.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString() 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleBankingClick(user)}
                          title="Gestisci dati bancari"
                        >
                          <CreditCard className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handlePaymentHistoryClick(user)}
                          title="Storico pagamenti"
                        >
                          <Euro className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleEditClick(user)}
                          title="Modifica utente"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleDeleteClick(user)}
                          disabled={user.role === "admin" && user.username === "zambelli.andrea.1973@gmail.com"}
                          title="Elimina utente"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog di conferma eliminazione */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma eliminazione</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler eliminare l'utente {userToDelete?.username}?
              Questa azione non può essere annullata.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="flex space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                setIsDeleteDialogOpen(false);
                setUserToDelete(null);
              }}
            >
              Annulla
            </Button>
            <Button 
              variant="destructive" 
              onClick={deleteStaffUser}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Eliminazione in corso...
                </>
              ) : "Elimina"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Dialog di modifica utente */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica utente</DialogTitle>
            <DialogDescription>
              Modifica le informazioni dell'utente {userToEdit?.username}.
              Lascia vuota la password se non desideri modificarla.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {editFormError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Errore</AlertTitle>
                <AlertDescription>{editFormError}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="editUsername">Username</Label>
              <Input
                id="editUsername"
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                placeholder="Username per il login"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editPassword">
                Password <span className="text-muted-foreground text-xs">(lascia vuoto per non modificare)</span>
              </Label>
              <PasswordInput
                id="editPassword"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                placeholder="Nuova password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="editEmail">Email (opzionale)</Label>
              <Input
                id="editEmail"
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Indirizzo email"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setIsEditDialogOpen(false);
                setUserToEdit(null);
              }}
            >
              Annulla
            </Button>
            <Button 
              onClick={updateStaffUser} 
              disabled={isEditing}
            >
              {isEditing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Aggiornamento in corso...
                </>
              ) : "Salva modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per gestione dati bancari */}
      <Dialog open={isBankingDialogOpen} onOpenChange={setIsBankingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestione Dati Bancari</DialogTitle>
            <DialogDescription>
              Configura le informazioni bancarie per {selectedStaffForBanking?.username}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="iban">IBAN *</Label>
              <Input
                id="iban"
                value={bankingData.iban}
                onChange={(e) => setBankingData(prev => ({ ...prev, iban: e.target.value }))}
                placeholder="IT00 0000 0000 0000 0000 0000 000"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bankName">Nome Banca</Label>
              <Input
                id="bankName"
                value={bankingData.bankName}
                onChange={(e) => setBankingData(prev => ({ ...prev, bankName: e.target.value }))}
                placeholder="Es. Banca Intesa Sanpaolo"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="accountHolder">Intestatario Conto</Label>
              <Input
                id="accountHolder"
                value={bankingData.accountHolder}
                onChange={(e) => setBankingData(prev => ({ ...prev, accountHolder: e.target.value }))}
                placeholder="Nome e Cognome"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="swift">Codice SWIFT (opzionale)</Label>
              <Input
                id="swift"
                value={bankingData.swift}
                onChange={(e) => setBankingData(prev => ({ ...prev, swift: e.target.value }))}
                placeholder="BCITITMM"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBankingDialogOpen(false)}
              disabled={isSavingBanking}
            >
              Annulla
            </Button>
            <Button
              onClick={saveBankingInfo}
              disabled={isSavingBanking || !bankingData.iban}
            >
              {isSavingBanking ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvataggio...
                </>
              ) : (
                <>
                  <CreditCard className="mr-2 h-4 w-4" />
                  Salva Dati Bancari
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog per storico pagamenti */}
      <Dialog open={isPaymentHistoryDialogOpen} onOpenChange={setIsPaymentHistoryDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Euro className="h-5 w-5" />
              Storico Pagamenti - {selectedStaffForPayments?.username}
            </DialogTitle>
            <DialogDescription>
              Visualizza tutti i pagamenti delle commissioni referral per questo staff
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {isLoadingPayments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Caricamento storico pagamenti...</span>
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8">
                <Euro className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Nessun pagamento trovato</h3>
                <p className="text-muted-foreground">
                  Non ci sono ancora pagamenti registrati per questo staff.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Statistiche rapide */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          €{paymentHistory.filter(p => p.status === 'paid').reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">Totale Pagato</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          €{paymentHistory.filter(p => p.status === 'pending').reduce((sum, p) => sum + (p.amount || 0), 0).toFixed(2)}
                        </div>
                        <div className="text-sm text-muted-foreground">In Attesa</div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold">
                          {paymentHistory.length}
                        </div>
                        <div className="text-sm text-muted-foreground">Transazioni Totali</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Tabella pagamenti */}
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Importo</TableHead>
                        <TableHead>Stato</TableHead>
                        <TableHead>ID Transazione</TableHead>
                        <TableHead>Utente Sponsorizzato</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paymentHistory.map((payment, index) => (
                        <TableRow key={index}>
                          <TableCell>
                            {payment.dueDate ? new Date(payment.dueDate).toLocaleDateString() : "-"}
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              €{((payment.amount || 0) / 100).toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              payment.status === 'paid' 
                                ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" 
                                : payment.status === 'pending'
                                ? "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                                : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            }`}>
                              {payment.status === 'paid' ? 'Pagato' : 
                               payment.status === 'pending' ? 'In Attesa' : 'Fallito'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-sm">
                              {payment.transactionId || "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {payment.sponsoredUser || `ID: ${payment.sponsoredUserId || "-"}`}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentHistoryDialogOpen(false)}>
              Chiudi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}