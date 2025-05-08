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
import { AlertCircle, Loader2, Search, UserPlus, X, Edit, Trash } from "lucide-react";
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
}

export default function StaffManagementPage() {
  const [staffUsers, setStaffUsers] = useState<StaffUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState<boolean>(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [userToDelete, setUserToDelete] = useState<StaffUser | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  
  // Form per nuovo utente staff
  const [newUsername, setNewUsername] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [newEmail, setNewEmail] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  
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
                      {user.createdAt 
                        ? new Date(user.createdAt).toLocaleDateString() 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8" disabled={user.role === "admin" && user.username === "zambelli.andrea.1973@gmail.com"}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="icon" 
                          className="h-8 w-8" 
                          onClick={() => handleDeleteClick(user)}
                          disabled={user.role === "admin" && user.username === "zambelli.andrea.1973@gmail.com"}
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
    </div>
  );
}