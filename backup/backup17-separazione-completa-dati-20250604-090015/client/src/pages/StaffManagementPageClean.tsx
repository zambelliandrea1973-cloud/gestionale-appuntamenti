import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Loader2, Users, CreditCard, Search, Eye, UserPlus } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

interface StaffUser {
  id: number;
  username: string;
  email?: string;
  role: string;
  createdAt?: string;
  referralCode?: string;
}

export default function StaffManagementPageClean() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<StaffUser | null>(null);
  const [isPaymentHistoryDialogOpen, setIsPaymentHistoryDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/staff/users'],
  });

  // Filtra gli utenti in base alla ricerca
  const filteredUsers = staffUsers.filter((user: StaffUser) => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const openPaymentHistory = (user: StaffUser) => {
    setSelectedUser(user);
    setIsPaymentHistoryDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Caricamento staff...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          Errore nel caricamento: {error.message}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Staff</h1>
          <p className="text-muted-foreground mt-1">
            Visualizza e gestisci i tuoi membri dello staff e le loro commissioni
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">{staffUsers.length} membri staff</span>
        </div>
      </div>

      {/* Barra di ricerca */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Cerca per nome utente o email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Aggiungi Staff
        </Button>
      </div>

      {/* Lista Staff */}
      <div className="grid gap-4">
        {filteredUsers.map((user: StaffUser) => (
          <Card key={user.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{user.username}</h3>
                    <p className="text-muted-foreground">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge 
                        variant={user.role === 'admin' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {user.role === 'admin' ? 'Amministratore' : 'Staff'}
                      </Badge>
                      {user.referralCode && (
                        <Badge variant="outline" className="text-xs">
                          Codice: {user.referralCode}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPaymentHistory(user)}
                    className="flex items-center gap-2"
                  >
                    <Eye className="h-4 w-4" />
                    Dettagli
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2"
                  >
                    <CreditCard className="h-4 w-4" />
                    Commissioni
                  </Button>
                </div>
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

      {/* Dialog Dettagli Utente */}
      <Dialog open={isPaymentHistoryDialogOpen} onOpenChange={setIsPaymentHistoryDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Dettagli Staff: {selectedUser?.username}
            </DialogTitle>
            <DialogDescription>
              Informazioni complete e storico commissioni
            </DialogDescription>
          </DialogHeader>
          
          {selectedUser && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nome Utente</Label>
                  <p className="text-sm">{selectedUser.username}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Ruolo</Label>
                  <Badge variant={selectedUser.role === 'admin' ? 'default' : 'secondary'}>
                    {selectedUser.role === 'admin' ? 'Amministratore' : 'Staff'}
                  </Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Codice Referral</Label>
                  <p className="text-sm font-mono">{selectedUser.referralCode}</p>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Storico Commissioni</h4>
                <div className="text-center py-8 text-muted-foreground">
                  <p>Nessuna commissione registrata ancora.</p>
                  <p className="text-xs mt-1">Le commissioni verranno visualizzate qui quando generate.</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}