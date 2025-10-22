import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "wouter";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, ShieldCheck, Users, KeyRound, Calendar, X, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface StaffUser {
  id: number;
  username: string;
  type: string;
  role: string;
}

interface License {
  license: {
    id: number;
    code: string;
    type: string;
    isActive: boolean;
    createdAt: string;
    expiresAt: string | null;
    activatedAt: string;
    userId: number;
  };
  username: string;
  userType: string;
  userRole: string;
}

// Enum che rappresenta i tipi di licenza disponibili
enum LicenseType {
  BASE = 'base',
  PRO = 'pro',
  BUSINESS = 'business'
}

export default function AdminLicenseManagementPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedLicenseType, setSelectedLicenseType] = useState<LicenseType>(LicenseType.PRO);
  const [isCreatingLicense, setIsCreatingLicense] = useState(false);
  const [confirmationDialogOpen, setConfirmationDialogOpen] = useState(false);
  const [selectedLicenseId, setSelectedLicenseId] = useState<number | null>(null);

  // Verifica che l'utente sia un amministratore
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const response = await apiRequest("GET", "/api/current-user");
        if (!response.ok) {
          throw new Error("Non autorizzato");
        }
        
        const userData = await response.json();
        if (userData.role !== "admin") {
          toast({
            title: "Accesso negato",
            description: "Solo gli amministratori possono accedere a questa pagina",
            variant: "destructive",
          });
          navigate("/dashboard");
        }
      } catch (error) {
        toast({
          title: "Errore",
          description: "Impossibile verificare l'autorizzazione",
          variant: "destructive",
        });
        navigate("/");
      }
    };
    
    checkAdminAccess();
  }, [navigate, toast]);

  // Query per ottenere l'elenco degli utenti staff
  const { 
    data: staffUsers, 
    isLoading: isLoadingStaffUsers,
    error: staffUsersError 
  } = useQuery({
    queryKey: ["/api/admin-license/staff-users"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin-license/staff-users");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Errore nel recupero degli utenti staff");
      }
      
      return response.json() as Promise<StaffUser[]>;
    }
  });

  // Query per ottenere l'elenco delle licenze
  const { 
    data: licenses, 
    isLoading: isLoadingLicenses,
    error: licensesError
  } = useQuery({
    queryKey: ["/api/admin-license/licenses"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin-license/licenses");
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Errore nel recupero delle licenze");
      }
      
      return response.json() as Promise<License[]>;
    }
  });

  // Mutation per generare una nuova licenza staff
  const generateLicenseMutation = useMutation({
    mutationFn: async ({ userId, licenseType }: { userId: number; licenseType: string }) => {
      const response = await apiRequest("POST", "/api/admin-license/generate-staff-license", {
        userId,
        licenseType
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Errore nella generazione della licenza");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Licenza gratuita creata con successo",
      });
      
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: ["/api/admin-license/licenses"] });
      
      // Reset dello stato
      setSelectedUserId(null);
      setSelectedLicenseType(LicenseType.PRO);
      setIsCreatingLicense(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      setIsCreatingLicense(false);
    }
  });

  // Mutation per revocare una licenza
  const revokeLicenseMutation = useMutation({
    mutationFn: async (licenseId: number) => {
      const response = await apiRequest("POST", "/api/admin-license/revoke-license", {
        licenseId
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Errore nella revoca della licenza");
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Successo",
        description: "Licenza revocata con successo",
      });
      
      // Invalida le query per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: ["/api/admin-license/licenses"] });
      
      // Reset dello stato
      setConfirmationDialogOpen(false);
      setSelectedLicenseId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
      setConfirmationDialogOpen(false);
    }
  });

  // Funzione per formattare la data
  const formatDate = (dateString: string | null): string => {
    if (!dateString) return "Nessuna scadenza";
    
    const date = new Date(dateString);
    return date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // Handler per la generazione di una nuova licenza
  const handleGenerateLicense = () => {
    if (!selectedUserId) {
      toast({
        title: "Attenzione",
        description: "Seleziona un utente staff",
        variant: "destructive",
      });
      return;
    }
    
    setIsCreatingLicense(true);
    generateLicenseMutation.mutate({
      userId: selectedUserId,
      licenseType: selectedLicenseType
    });
  };

  // Handler per la revoca di una licenza
  const handleConfirmRevoke = () => {
    if (selectedLicenseId !== null) {
      revokeLicenseMutation.mutate(selectedLicenseId);
    }
  };

  // Calcola la classe CSS in base allo stato della licenza
  const getLicenseStatusClass = (license: License) => {
    if (!license.license.isActive) return "text-destructive bg-destructive/10";
    
    if (!license.license.expiresAt) return "text-green-600 bg-green-50";
    
    const expiryDate = new Date(license.license.expiresAt);
    const now = new Date();
    const diffInDays = Math.floor((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays <= 0) return "text-destructive bg-destructive/10";
    if (diffInDays <= 30) return "text-amber-600 bg-amber-50";
    return "text-green-600 bg-green-50";
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 flex items-center">
        <ShieldCheck className="mr-2 h-8 w-8 text-primary" /> Gestione Licenze Staff
      </h1>
      <p className="text-muted-foreground mb-8">
        Questa sezione è riservata all'amministratore. Qui puoi gestire le licenze gratuite di 10 anni per i membri dello staff.
      </p>
      
      {(staffUsersError || licensesError) && (
        <Alert variant="destructive" className="mb-6">
          <AlertTitle>Errore</AlertTitle>
          <AlertDescription>
            {staffUsersError instanceof Error 
              ? staffUsersError.message 
              : licensesError instanceof Error 
                ? licensesError.message 
                : "Si è verificato un errore durante il caricamento dei dati"}
          </AlertDescription>
        </Alert>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Crea nuova licenza */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <KeyRound className="mr-2 h-5 w-5" /> Genera Nuova Licenza Staff
            </CardTitle>
            <CardDescription>
              Crea una licenza gratuita di 10 anni per un membro dello staff
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="staff-user">Utente Staff</Label>
                <Select 
                  disabled={isLoadingStaffUsers || isCreatingLicense}
                  value={selectedUserId?.toString() || ""}
                  onValueChange={(value) => setSelectedUserId(parseInt(value))}
                >
                  <SelectTrigger id="staff-user">
                    <SelectValue placeholder="Seleziona un utente staff" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffUsers?.map((user) => (
                      <SelectItem key={user.id} value={user.id.toString()}>
                        {user.username}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="license-type">Tipo di Licenza</Label>
                <Select 
                  disabled={isCreatingLicense}
                  value={selectedLicenseType}
                  onValueChange={(value) => setSelectedLicenseType(value as LicenseType)}
                >
                  <SelectTrigger id="license-type">
                    <SelectValue placeholder="Seleziona un tipo di licenza" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={LicenseType.BASE}>Base</SelectItem>
                    <SelectItem value={LicenseType.PRO}>Professionale</SelectItem>
                    <SelectItem value={LicenseType.BUSINESS}>Business</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={handleGenerateLicense}
              disabled={!selectedUserId || isCreatingLicense}
              className="w-full"
            >
              {isCreatingLicense ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creazione in corso...
                </>
              ) : (
                "Genera Licenza"
              )}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Lista licenze */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" /> Licenze Attive
            </CardTitle>
            <CardDescription>
              Gestisci le licenze staff esistenti
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingLicenses ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !licenses || licenses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessuna licenza trovata
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Scadenza</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((license) => (
                      <TableRow key={license.license.id}>
                        <TableCell>
                          <div className="font-medium">{license.username}</div>
                          <div className="text-xs text-muted-foreground">{license.userType}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {license.license.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="secondary"
                            className={getLicenseStatusClass(license)}
                          >
                            {license.license.isActive ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : (
                              <X className="h-3 w-3 mr-1" />
                            )}
                            {license.license.isActive ? "Attiva" : "Revocata"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <Calendar className="h-3 w-3 mr-1 text-muted-foreground" />
                            <span>{formatDate(license.license.expiresAt)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Apri menu</span>
                                <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                                  <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" />
                                </svg>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Azioni</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              {license.license.isActive && (
                                <DropdownMenuItem
                                  className="text-destructive focus:text-destructive"
                                  onClick={() => {
                                    setSelectedLicenseId(license.license.id);
                                    setConfirmationDialogOpen(true);
                                  }}
                                >
                                  Revoca licenza
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Dialog di conferma per la revoca */}
      <Dialog open={confirmationDialogOpen} onOpenChange={setConfirmationDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Conferma revoca</DialogTitle>
            <DialogDescription>
              Sei sicuro di voler revocare questa licenza? L'utente perderà l'accesso alle funzionalità premium.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmationDialogOpen(false)}
              disabled={revokeLicenseMutation.isPending}
            >
              Annulla
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRevoke}
              disabled={revokeLicenseMutation.isPending}
            >
              {revokeLicenseMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Revoca in corso...
                </>
              ) : (
                "Revoca licenza"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}