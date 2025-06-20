import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, Eye, CreditCard, Banknote } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import AuthorizedRoute from "@/components/AuthorizedRoute";

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

  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/staff/users'],
  });

  // Filtra gli utenti in base alla ricerca
  const filteredUsers = (Array.isArray(staffUsers) ? staffUsers as StaffUser[] : []).filter((user: StaffUser) => 
    user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
            <Button 
              onClick={() => setLocation('/banking-settings')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Banknote className="h-4 w-4 mr-2" />
              Configurazione Bancaria
            </Button>
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
            <Card key={user.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{user.username}</CardTitle>
                  <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                    Staff
                  </Badge>
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setLocation(`/staff/${user.id}`)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Dettagli
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
              {searchQuery ? 'Nessun risultato trovato.' : 'Nessun utente staff trovato.'}
            </p>
          </div>
        )}
      </div>
    </AuthorizedRoute>
  );
}