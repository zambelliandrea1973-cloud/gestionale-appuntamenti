import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Users, Search, UserPlus, CreditCard, Banknote, MoreVertical, Trash2, Edit } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import AuthorizedRoute from "@/components/AuthorizedRoute";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface StaffUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
  referralCode?: string;
}

export default function StaffManagementPageFixed() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Stati per i dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);
  
  // Form state per nuovo staff
  const [newStaff, setNewStaff] = useState({
    username: "",
    password: "",
    email: "",
    role: "staff"
  });
  
  // Form state per modifica staff
  const [editStaff, setEditStaff] = useState({
    username: "",
    password: "",
    email: "",
    role: "staff"
  });

  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/staff/users'],
  });

  // Mutation per creare nuovo staff
  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof newStaff) => {
      const res = await apiRequest('POST', '/api/staff/register', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      toast({
        title: "Staff creato con successo",
        description: "Il nuovo membro dello staff ha accesso PRO completo gratuito",
      });
      setIsCreateDialogOpen(false);
      setNewStaff({ username: "", password: "", email: "", role: "staff" });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile creare lo staff",
        variant: "destructive",
      });
    }
  });

  // Mutation per modificare staff
  const editStaffMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: typeof editStaff }) => {
      const res = await apiRequest('PATCH', `/api/staff/${userId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      toast({
        title: "Staff aggiornato",
        description: "Le informazioni sono state modificate con successo",
      });
      setIsEditDialogOpen(false);
      setSelectedStaff(null);
      setEditStaff({ username: "", password: "", email: "", role: "staff" });
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile modificare lo staff",
        variant: "destructive",
      });
    }
  });

  // Mutation per eliminare staff
  const deleteStaffMutation = useMutation({
    mutationFn: async (userId: number) => {
      const res = await apiRequest('DELETE', `/api/staff/${userId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      toast({
        title: "Staff eliminato",
        description: "Il membro dello staff è stato rimosso definitivamente",
      });
      setIsDeleteDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (error: any) => {
      toast({
        title: "Errore",
        description: error.message || "Impossibile eliminare lo staff",
        variant: "destructive",
      });
    }
  });

  // Filtra gli utenti in base alla ricerca
  const filteredUsers = (Array.isArray(staffUsers) ? staffUsers as StaffUser[] : []).filter((user: StaffUser) => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleCreateStaff = () => {
    if (!newStaff.username || !newStaff.password) {
      toast({
        title: "Campi obbligatori",
        description: "Username e password sono obbligatori",
        variant: "destructive",
      });
      return;
    }
    createStaffMutation.mutate(newStaff);
  };

  const handleOpenEditDialog = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setEditStaff({
      username: staff.username,
      password: "",
      email: staff.email || "",
      role: staff.role || "staff"
    });
    // Piccolo delay per permettere al dropdown di chiudersi prima di aprire il dialog
    setTimeout(() => {
      setIsEditDialogOpen(true);
    }, 100);
  };

  const handleOpenDeleteDialog = (staff: StaffUser) => {
    setSelectedStaff(staff);
    // Piccolo delay per permettere al dropdown di chiudersi prima di aprire il dialog
    setTimeout(() => {
      setIsDeleteDialogOpen(true);
    }, 100);
  };

  const handleEditStaff = () => {
    if (!selectedStaff) return;
    
    if (!editStaff.username) {
      toast({
        title: "Campo obbligatorio",
        description: "Lo username è obbligatorio",
        variant: "destructive",
      });
      return;
    }
    
    editStaffMutation.mutate({ 
      userId: selectedStaff.id, 
      data: editStaff 
    });
  };

  const handleDeleteStaff = () => {
    if (selectedStaff) {
      deleteStaffMutation.mutate(selectedStaff.id);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center">Caricamento staff...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Errore nel caricamento staff
        </div>
      </div>
    );
  }

  return (
    <AuthorizedRoute 
      requiredRole="admin" 
      featureName="Gestione Staff"
      description="Solo gli amministratori possono gestire il personale e visualizzare i codici referral"
    >
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestione Staff</h1>
            <p className="text-muted-foreground mt-1">
              Visualizza e gestisci i tuoi membri dello staff
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Dialog per creare nuovo staff */}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Aggiungi Staff
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Crea Nuovo Membro Staff</DialogTitle>
                  <DialogDescription>
                    Gli utenti staff hanno automaticamente accesso PRO completo e gratuito senza scadenza
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="username">Username *</Label>
                    <Input
                      id="username"
                      data-testid="input-staff-username"
                      placeholder="username.staff"
                      value={newStaff.username}
                      onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      data-testid="input-staff-email"
                      type="email"
                      placeholder="staff@example.com"
                      value={newStaff.email}
                      onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="password">Password *</Label>
                    <Input
                      id="password"
                      data-testid="input-staff-password"
                      type="password"
                      placeholder="••••••••"
                      value={newStaff.password}
                      onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="role">Ruolo</Label>
                    <select
                      id="role"
                      data-testid="select-staff-role"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                      value={newStaff.role}
                      onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                    >
                      <option value="staff">Staff - Dipendente con accesso PRO</option>
                      <option value="admin">Admin - Accesso completo</option>
                      <option value="user">Customer PRO - Professionista abbonato</option>
                    </select>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-2">
                    <p className="text-sm text-blue-800">
                      ✅ <strong>Accesso PRO automatico:</strong> Tutti gli staff hanno accesso completo a tutte le funzionalità PRO senza pagamento e senza scadenza
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                    disabled={createStaffMutation.isPending}
                    data-testid="button-cancel-create-staff"
                  >
                    Annulla
                  </Button>
                  <Button
                    onClick={handleCreateStaff}
                    disabled={createStaffMutation.isPending}
                    data-testid="button-confirm-create-staff"
                  >
                    {createStaffMutation.isPending ? "Creazione..." : "Crea Staff"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">
                {Array.isArray(staffUsers) ? staffUsers.length : 0} membri staff
              </span>
            </div>
          </div>
        </div>

        {/* Barra di ricerca */}
        <div className="flex items-center space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              data-testid="input-search-staff"
              placeholder="Cerca per nome utente o email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Griglia utenti staff */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredUsers.map((user: StaffUser) => (
            <Card key={user.id} className="hover:shadow-lg transition-shadow" data-testid={`card-staff-${user.id}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{user.username}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className={
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                      user.role === 'user' ? 'bg-green-100 text-green-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {user.role === 'admin' ? 'Admin' : user.role === 'user' ? 'Customer PRO' : 'Staff'}
                    </Badge>
                    
                    {/* Menu dropdown azioni */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0"
                          data-testid={`button-menu-staff-${user.id}`}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleOpenEditDialog(user)}
                          data-testid={`menu-edit-staff-${user.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifica
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDeleteDialog(user)}
                          className="text-red-600 focus:text-red-600"
                          data-testid={`menu-delete-staff-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Elimina
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {user.email && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <UserPlus className="h-4 w-4 mr-2" />
                    {user.email}
                  </div>
                )}
                
                {user.createdAt && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Registrato: {new Date(user.createdAt).toLocaleDateString('it-IT')}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    ID: {user.id}
                  </span>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    ✓ Accesso PRO
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Messaggio quando non ci sono risultati */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? 'Nessun risultato trovato.' : 'Nessun utente staff trovato.'}
            </p>
          </div>
        )}
      </div>

      {/* Dialog per modificare staff */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifica Staff: {selectedStaff?.username}</DialogTitle>
            <DialogDescription>
              Modifica le informazioni del membro dello staff. Lascia la password vuota per mantenerla invariata.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-username">Username *</Label>
              <Input
                id="edit-username"
                data-testid="input-edit-staff-username"
                placeholder="username.staff"
                value={editStaff.username}
                onChange={(e) => setEditStaff({ ...editStaff, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                data-testid="input-edit-staff-email"
                type="email"
                placeholder="staff@example.com"
                value={editStaff.email}
                onChange={(e) => setEditStaff({ ...editStaff, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">Nuova Password</Label>
              <Input
                id="edit-password"
                data-testid="input-edit-staff-password"
                type="password"
                placeholder="Lascia vuoto per non cambiare"
                value={editStaff.password}
                onChange={(e) => setEditStaff({ ...editStaff, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Lascia vuoto se non vuoi modificare la password
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">Ruolo</Label>
              <select
                id="edit-role"
                data-testid="select-edit-staff-role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={editStaff.role}
                onChange={(e) => setEditStaff({ ...editStaff, role: e.target.value })}
              >
                <option value="staff">Staff - Dipendente con accesso PRO</option>
                <option value="admin">Admin - Accesso completo</option>
                <option value="user">Customer PRO - Professionista abbonato</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Staff/Admin: dipendenti gratuiti. Customer PRO: professionista che paga abbonamento
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-green-800">
                ✅ <strong>Accesso PRO:</strong> Questo staff mantiene l'accesso completo PRO gratuito
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={editStaffMutation.isPending}
              data-testid="button-cancel-edit-staff"
            >
              Annulla
            </Button>
            <Button
              onClick={handleEditStaff}
              disabled={editStaffMutation.isPending}
              data-testid="button-confirm-edit-staff"
            >
              {editStaffMutation.isPending ? "Salvataggio..." : "Salva Modifiche"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog per conferma eliminazione */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Conferma eliminazione staff</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="font-semibold text-red-600">
                  Stai per eliminare definitivamente l'account staff:
                </div>
                <div className="bg-gray-100 p-3 rounded">
                  <div><strong>Username:</strong> {selectedStaff?.username}</div>
                  {selectedStaff?.email && <div><strong>Email:</strong> {selectedStaff?.email}</div>}
                  <div><strong>ID:</strong> {selectedStaff?.id}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
                  <div className="text-red-800 font-semibold">⚠️ ATTENZIONE:</div>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    <li>Questa azione è <strong>irreversibile</strong></li>
                    <li>L'account verrà eliminato <strong>permanentemente</strong></li>
                    <li>Tutti i dati associati saranno persi</li>
                    <li>L'utente non potrà più accedere al sistema</li>
                  </ul>
                </div>
                <div className="text-sm font-medium">
                  Sei assolutamente sicuro di voler procedere?
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteStaffMutation.isPending}
              data-testid="button-cancel-delete-staff"
            >
              Annulla
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              disabled={deleteStaffMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-staff"
            >
              {deleteStaffMutation.isPending ? "Eliminazione..." : "Sì, elimina definitivamente"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AuthorizedRoute>
  );
}
