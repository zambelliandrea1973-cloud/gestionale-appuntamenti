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
import { Users, Search, UserPlus, CreditCard, Banknote, MoreVertical, Trash2, Edit, UserCheck, ArrowRight, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import AuthorizedRoute from "@/components/AuthorizedRoute";
import { useToast } from "@/hooks/use-toast";
import { useTranslation, Trans } from "react-i18next";
import { queryClient, apiRequest } from "@/lib/queryClient";

interface StaffUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
  referralCode?: string;
  iban?: string;
  bic?: string;
  bankName?: string;
  accountHolder?: string;
}

export default function StaffManagementPageFixed() {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Stati per i dialogs
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBankingDialogOpen, setIsBankingDialogOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<StaffUser | null>(null);

  // Modalità dialog: "search" (cerca esistente) o "create" (crea nuovo)
  const [createMode, setCreateMode] = useState<"search" | "create">("search");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [promoteRole, setPromoteRole] = useState("staff");
  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // Debounce ricerca
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Risultati ricerca utenti esistenti
  const { data: searchResults = [] } = useQuery({
    queryKey: ['/api/staff/search', debouncedSearch],
    queryFn: async () => {
      if (debouncedSearch.length < 2) return [];
      const res = await apiRequest('GET', `/api/staff/search?q=${encodeURIComponent(debouncedSearch)}`);
      return res.json();
    },
    enabled: debouncedSearch.length >= 2,
  });
  
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

  // Form state per dati bancari staff
  const [bankingData, setBankingData] = useState({
    iban: "",
    bic: "",
    bankName: "",
    accountHolder: ""
  });

  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/staff/users'],
  });

  // Mutation per promuovere utente esistente (senza password)
  const promoteMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest('POST', `/api/staff/promote/${userId}`, { role });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      toast({
        title: t('staffManagement.toast.updated.title'),
        description: `${data.username} promosso a ${data.role}`,
      });
      setIsCreateDialogOpen(false);
      resetCreateDialog();
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t('staffManagement.errors.edit'),
        variant: "destructive",
      });
    }
  });

  const resetCreateDialog = () => {
    setCreateMode("search");
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedUser(null);
    setPromoteRole("staff");
    setNewStaff({ username: "", password: "", email: "", role: "staff" });
  };

  // Mutation per creare nuovo staff
  const createStaffMutation = useMutation({
    mutationFn: async (data: typeof newStaff) => {
      const res = await apiRequest('POST', '/api/staff/register', data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      toast({
        title: t('staffManagement.toast.created.title'),
        description: t('staffManagement.toast.created.desc'),
      });
      setIsCreateDialogOpen(false);
      setNewStaff({ username: "", password: "", email: "", role: "staff" });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t('staffManagement.errors.create'),
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
        title: t('staffManagement.toast.updated.title'),
        description: t('staffManagement.toast.updated.desc'),
      });
      setIsEditDialogOpen(false);
      setSelectedStaff(null);
      setEditStaff({ username: "", password: "", email: "", role: "staff" });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t('staffManagement.errors.edit'),
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
        title: t('staffManagement.toast.deleted.title'),
        description: t('staffManagement.toast.deleted.desc'),
      });
      setIsDeleteDialogOpen(false);
      setSelectedStaff(null);
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t('staffManagement.errors.delete'),
        variant: "destructive",
      });
    }
  });

  // Mutation per salvare dati bancari staff
  const saveBankingMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: typeof bankingData }) => {
      const res = await apiRequest('PATCH', `/api/staff/${userId}/banking`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/staff/users'] });
      toast({
        title: t('staffManagement.toast.bankingSaved.title'),
        description: t('staffManagement.toast.bankingSaved.desc'),
      });
      setIsBankingDialogOpen(false);
      setSelectedStaff(null);
      setBankingData({ iban: "", bic: "", bankName: "", accountHolder: "" });
    },
    onError: (error: any) => {
      toast({
        title: t("common.error"),
        description: error.message || t('staffManagement.errors.banking'),
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
        title: t('staffManagement.requiredFields'),
        description: t('staffManagement.requiredUsernamePassword'),
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

  const handleOpenBankingDialog = (staff: StaffUser) => {
    setSelectedStaff(staff);
    setBankingData({
      iban: staff.iban || "",
      bic: staff.bic || "",
      bankName: staff.bankName || "",
      accountHolder: staff.accountHolder || ""
    });
    // Piccolo delay per permettere al dropdown di chiudersi prima di aprire il dialog
    setTimeout(() => {
      setIsBankingDialogOpen(true);
    }, 100);
  };

  const handleSaveBanking = () => {
    if (!selectedStaff) return;
    
    if (!bankingData.iban) {
      toast({
        title: t('staffManagement.requiredField'),
        description: t('staffManagement.requiredIban'),
        variant: "destructive",
      });
      return;
    }
    
    saveBankingMutation.mutate({ 
      userId: selectedStaff.id, 
      data: bankingData 
    });
  };

  const handleEditStaff = () => {
    if (!selectedStaff) return;
    
    if (!editStaff.username) {
      toast({
        title: t('staffManagement.requiredField'),
        description: t('staffManagement.requiredUsername'),
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
        <div className="text-center">{t('staffManagement.loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {t('staffManagement.loadError')}
        </div>
      </div>
    );
  }

  return (
    <AuthorizedRoute 
      requiredRole="admin" 
      featureName={t('staffManagement.featureName')}
      description={t('staffManagement.featureDesc')}
    >
      <div className="container mx-auto py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{t("staff.title")}</h1>
            <p className="text-muted-foreground mt-1">
              {t('staffManagement.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Dialog per creare nuovo staff */}
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => { setIsCreateDialogOpen(open); if (!open) resetCreateDialog(); }}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('staffManagement.addStaff')}
                </Button>
              </DialogTrigger>
              <DialogContent className="min-[1200px]:max-w-[520px]">
                <DialogHeader>
                  <DialogTitle>{t('staffManagement.createNew')}</DialogTitle>
                </DialogHeader>

                {/* Tab switcher */}
                <div className="flex rounded-lg border border-gray-200 overflow-hidden mb-2">
                  <button
                    onClick={() => setCreateMode("search")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${createMode === "search" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    <Search className="h-4 w-4" />
                    Cerca utente esistente
                  </button>
                  <button
                    onClick={() => setCreateMode("create")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition-colors ${createMode === "create" ? "bg-blue-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50"}`}
                  >
                    <UserPlus className="h-4 w-4" />
                    Crea nuovo account
                  </button>
                </div>

                {/* MODALITÀ RICERCA */}
                {createMode === "search" && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-500">Cerca per username o email (anche parziale). Non serve la password.</p>

                    {/* Campo ricerca */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        className="pl-9 pr-9"
                        placeholder="es. mario@studio.it, Studio Max, mar…"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setSelectedUser(null); }}
                        autoFocus
                      />
                      {searchTerm && (
                        <button onClick={() => { setSearchTerm(""); setSelectedUser(null); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Risultati ricerca */}
                    {debouncedSearch.length >= 2 && !selectedUser && (
                      <div className="border rounded-lg overflow-hidden">
                        {(searchResults as any[]).length === 0 ? (
                          <div className="px-4 py-6 text-center text-sm text-gray-400">
                            <span>Nessun professionista trovato per "<strong>{debouncedSearch}</strong>"</span>
                            <p className="mt-2 text-xs text-blue-600 cursor-pointer underline" onClick={() => { setCreateMode("create"); setNewStaff(s => ({ ...s, username: debouncedSearch, email: debouncedSearch.includes('@') ? debouncedSearch : '' })); }}>
                              → Crea un nuovo account con questo nome
                            </p>
                          </div>
                        ) : (
                          (searchResults as any[]).map((u: any) => {
                            const initials = (u.username || '?').substring(0, 2).toUpperCase();
                            return (
                              <button
                                key={u.id}
                                onClick={() => setSelectedUser(u)}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-blue-50 border-b last:border-0 text-left transition-colors"
                              >
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-bold text-blue-700">{initials}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm text-gray-900 truncate">{u.username}</div>
                                  {u.businessName && <div className="text-xs text-gray-500 truncate">{u.businessName}</div>}
                                  {u.email && u.email !== u.username && <div className="text-xs text-gray-400 truncate">{u.email}</div>}
                                </div>
                                <Badge variant="secondary" className={
                                  u.role === 'admin' ? 'bg-purple-100 text-purple-700 text-xs' :
                                  u.role === 'ev_admin' ? 'bg-violet-100 text-violet-700 text-xs' :
                                  u.role === 'ev_staff' ? 'bg-teal-100 text-teal-700 text-xs' :
                                  u.role === 'user' ? 'bg-green-100 text-green-700 text-xs' :
                                  'bg-blue-100 text-blue-700 text-xs'
                                }>{u.role === 'ev_staff' ? 'Staff EV' : u.role === 'ev_admin' ? 'Admin EV' : u.role}</Badge>
                                <ArrowRight className="h-4 w-4 text-gray-300 flex-shrink-0" />
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}

                    {/* Utente selezionato → scelta ruolo */}
                    {selectedUser && (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-white">{(selectedUser.username || "?").substring(0, 2).toUpperCase()}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm text-gray-900">{selectedUser.username}</div>
                            {selectedUser.email && <div className="text-xs text-gray-500">{selectedUser.email}</div>}
                          </div>
                          <button onClick={() => setSelectedUser(null)} className="text-gray-400 hover:text-gray-600">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="space-y-1">
                          <Label>Ruolo da assegnare</Label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={promoteRole}
                            onChange={(e) => setPromoteRole(e.target.value)}
                          >
                            <option value="staff">{t('staffManagement.fields.roleStaff')}</option>
                            <option value="ev_staff">{t('staffManagement.fields.roleEvStaff')}</option>
                            <option value="ev_admin">{t('staffManagement.fields.roleEvAdmin')}</option>
                            <option value="admin">{t('staffManagement.fields.roleAdmin')}</option>
                          </select>
                        </div>
                        <Button
                          className="w-full bg-blue-600 hover:bg-blue-700"
                          onClick={() => promoteMutation.mutate({ userId: selectedUser.id, role: promoteRole })}
                          disabled={promoteMutation.isPending}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          {promoteMutation.isPending ? "Salvataggio..." : `Promuovi ${selectedUser.username}`}
                        </Button>
                      </div>
                    )}

                    {!debouncedSearch && !selectedUser && (
                      <p className="text-center text-sm text-gray-400 py-4">
                        Inizia a digitare username o email dell'utente da aggiungere
                      </p>
                    )}
                  </div>
                )}

                {/* MODALITÀ CREA NUOVO */}
                {createMode === "create" && (
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="username">{t('staffManagement.fields.usernameRequired')}</Label>
                      <Input
                        id="username"
                        data-testid="input-staff-username"
                        placeholder={t('staffManagement.usernameInputPlaceholder')}
                        value={newStaff.username}
                        onChange={(e) => setNewStaff({ ...newStaff, username: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="email">{t('staffManagement.fields.emailLabel')}</Label>
                      <Input
                        id="email"
                        data-testid="input-staff-email"
                        type="email"
                        placeholder={t('staffManagement.emailInputPlaceholder')}
                        value={newStaff.email}
                        onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="password">{t('staffManagement.fields.passwordRequired')}</Label>
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
                      <Label htmlFor="role">{t('staffManagement.fields.role')}</Label>
                      <select
                        id="role"
                        data-testid="select-staff-role"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                        value={newStaff.role}
                        onChange={(e) => setNewStaff({ ...newStaff, role: e.target.value })}
                      >
                        <option value="staff">{t('staffManagement.fields.roleStaff')}</option>
                        <option value="ev_staff">{t('staffManagement.fields.roleEvStaff')}</option>
                        <option value="ev_admin">{t('staffManagement.fields.roleEvAdmin')}</option>
                        <option value="admin">{t('staffManagement.fields.roleAdmin')}</option>
                      </select>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <p className="text-sm text-blue-800">
                        <Trans i18nKey="staffManagement.proAccessNote" components={[<strong />]} />
                      </p>
                    </div>
                    <DialogFooter className="mt-0">
                      <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={createStaffMutation.isPending} data-testid="button-cancel-create-staff">
                        {t('staffManagement.cancelButton')}
                      </Button>
                      <Button onClick={handleCreateStaff} disabled={createStaffMutation.isPending} data-testid="button-confirm-create-staff">
                        {createStaffMutation.isPending ? t('staffManagement.creating') : t('staffManagement.createButton')}
                      </Button>
                    </DialogFooter>
                  </div>
                )}

                {createMode === "search" && (
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      {t('staffManagement.cancelButton')}
                    </Button>
                  </DialogFooter>
                )}
              </DialogContent>
            </Dialog>
            
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              <span className="text-sm font-medium">
                {t('staffManagement.membersCount', { count: Array.isArray(staffUsers) ? staffUsers.length : 0 })}
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
              placeholder={t('staffManagement.searchPlaceholder')}
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
                      user.role === 'ev_admin' ? 'bg-violet-100 text-violet-700' :
                      user.role === 'ev_staff' ? 'bg-teal-100 text-teal-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      {user.role === 'admin' ? t('staffManagement.adminBadge') :
                       user.role === 'user' ? t('staffManagement.customerProBadge') :
                       user.role === 'ev_admin' ? t('staffManagement.evAdminBadge') :
                       user.role === 'ev_staff' ? t('staffManagement.evStaffBadge', 'Staff EV') :
                       t('staffManagement.staffBadge')}
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
                        <DropdownMenuLabel>{t('staffManagement.actions')}</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleOpenEditDialog(user)}
                          data-testid={`menu-edit-staff-${user.id}`}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          {t('common.edit')}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleOpenDeleteDialog(user)}
                          className="text-red-600 focus:text-red-600"
                          data-testid={`menu-delete-staff-${user.id}`}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t('common.delete')}
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
                    {t('staffManagement.registered', { date: new Date(user.createdAt).toLocaleDateString('it-IT') })}
                  </div>
                )}
                
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    ID: {user.id}
                  </span>
                  <Badge className="bg-green-100 text-green-700 border-green-200">
                    {t('staffManagement.proAccessBadge')}
                  </Badge>
                </div>
                
                {/* Pulsante Dati Bancari */}
                <div className="pt-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleOpenBankingDialog(user)}
                    data-testid={`button-banking-staff-${user.id}`}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    {t('staffManagement.bankingButton')}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Messaggio quando non ci sono risultati */}
        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              {searchQuery ? t('staffManagement.noResults') : t('staffManagement.noStaff')}
            </p>
          </div>
        )}
      </div>

      {/* Dialog per modificare staff */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="min-[1200px]:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{t('staffManagement.editTitle', { username: selectedStaff?.username })}</DialogTitle>
            <DialogDescription>
              {t('staffManagement.editDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-username">{t('staffManagement.fields.usernameRequired')}</Label>
              <Input
                id="edit-username"
                data-testid="input-edit-staff-username"
                placeholder={t('staffManagement.usernameInputPlaceholder')}
                value={editStaff.username}
                onChange={(e) => setEditStaff({ ...editStaff, username: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">{t('staffManagement.fields.emailLabel')}</Label>
              <Input
                id="edit-email"
                data-testid="input-edit-staff-email"
                type="email"
                placeholder={t('staffManagement.emailInputPlaceholder')}
                value={editStaff.email}
                onChange={(e) => setEditStaff({ ...editStaff, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-password">{t('staffManagement.newPasswordLabel')}</Label>
              <Input
                id="edit-password"
                data-testid="input-edit-staff-password"
                type="password"
                placeholder={t('staffManagement.passwordEmptyHint')}
                value={editStaff.password}
                onChange={(e) => setEditStaff({ ...editStaff, password: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {t('staffManagement.passwordEmptyDesc')}
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-role">{t('staffManagement.fields.role')}</Label>
              <select
                id="edit-role"
                data-testid="select-edit-staff-role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                value={editStaff.role}
                onChange={(e) => setEditStaff({ ...editStaff, role: e.target.value })}
              >
                <option value="staff">{t('staffManagement.fields.roleStaff')}</option>
                <option value="ev_staff">{t('staffManagement.fields.roleEvStaff')}</option>
                <option value="ev_admin">{t('staffManagement.fields.roleEvAdmin')}</option>
                <option value="admin">{t('staffManagement.fields.roleAdmin')}</option>
              </select>
              <p className="text-xs text-muted-foreground">
                {t('staffManagement.roleHint')}
              </p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-green-800">
                <Trans i18nKey="staffManagement.editProAccessNote" components={[<strong />]} />
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
              {t('staffManagement.cancelButton')}
            </Button>
            <Button
              onClick={handleEditStaff}
              disabled={editStaffMutation.isPending}
              data-testid="button-confirm-edit-staff"
            >
              {editStaffMutation.isPending ? t('staffManagement.saving') : t('staffManagement.saveChanges')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog per conferma eliminazione */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('staffManagement.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <div className="font-semibold text-red-600">
                  {t('staffManagement.deleteHeader')}
                </div>
                <div className="bg-gray-100 p-3 rounded">
                  <div><strong>{t('staffManagement.usernameLabel')}</strong> {selectedStaff?.username}</div>
                  {selectedStaff?.email && <div><strong>{t('staffManagement.fields.emailLabel')}:</strong> {selectedStaff?.email}</div>}
                  <div><strong>{t('staffManagement.idLabel')}</strong> {selectedStaff?.id}</div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded p-3 space-y-2">
                  <div className="text-red-800 font-semibold">{t('staffManagement.warningTitle')}</div>
                  <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                    <li><Trans i18nKey="staffManagement.warning1" components={[<strong />]} /></li>
                    <li><Trans i18nKey="staffManagement.warning2" components={[<strong />]} /></li>
                    <li>{t('staffManagement.warning3')}</li>
                    <li>{t('staffManagement.warning4')}</li>
                  </ul>
                </div>
                <div className="text-sm font-medium">
                  {t('staffManagement.deleteConfirmText')}
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              disabled={deleteStaffMutation.isPending}
              data-testid="button-cancel-delete-staff"
            >
              {t('staffManagement.cancelButton')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteStaff}
              disabled={deleteStaffMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete-staff"
            >
              {deleteStaffMutation.isPending ? t('staffManagement.deleting') : t('staffManagement.deleteConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog Dati Bancari Staff */}
      <Dialog open={isBankingDialogOpen} onOpenChange={setIsBankingDialogOpen}>
        <DialogContent className="min-[1200px]:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-green-600" />
              {t('staffManagement.bankingTitle', { username: selectedStaff?.username })}
            </DialogTitle>
            <DialogDescription>
              {t('staffManagement.bankingDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                <Trans i18nKey="staffManagement.bankingNote" components={[<strong />]} />
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="staff-iban">{t('staffManagement.ibanRequired')}</Label>
              <Input
                id="staff-iban"
                placeholder={t('staffManagement.ibanPlaceholder')}
                className="font-mono"
                data-testid="input-staff-iban"
                value={bankingData.iban}
                onChange={(e) => setBankingData({ ...bankingData, iban: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                {t('staffManagement.ibanFormatHint')}
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="staff-bank-name">{t('staffManagement.bankNameLabel')}</Label>
              <Input
                id="staff-bank-name"
                placeholder={t('staffManagement.bankNamePlaceholder')}
                data-testid="input-staff-bank-name"
                value={bankingData.bankName}
                onChange={(e) => setBankingData({ ...bankingData, bankName: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="staff-account-holder">{t('staffManagement.accountHolderLabel')}</Label>
              <Input
                id="staff-account-holder"
                placeholder={t('staffManagement.accountHolderPlaceholder')}
                data-testid="input-staff-account-holder"
                value={bankingData.accountHolder}
                onChange={(e) => setBankingData({ ...bankingData, accountHolder: e.target.value })}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="staff-bic">{t('staffManagement.bicLabel')}</Label>
              <Input
                id="staff-bic"
                placeholder={t('staffManagement.bicPlaceholder')}
                data-testid="input-staff-bic"
                value={bankingData.bic}
                onChange={(e) => setBankingData({ ...bankingData, bic: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsBankingDialogOpen(false)}
              disabled={saveBankingMutation.isPending}
              data-testid="button-cancel-banking"
            >
              {t('staffManagement.cancelButton')}
            </Button>
            <Button
              onClick={handleSaveBanking}
              disabled={saveBankingMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
              data-testid="button-save-banking"
            >
              <CreditCard className="mr-2 h-4 w-4" />
              {saveBankingMutation.isPending ? t('staffManagement.saving') : t('staffManagement.saveBankingButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthorizedRoute>
  );
}
