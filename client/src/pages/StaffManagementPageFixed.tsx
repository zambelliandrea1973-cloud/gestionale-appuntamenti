import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, Eye, CreditCard } from "lucide-react";
import { useState } from "react";

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

  const { data: staffUsers = [], isLoading, error } = useQuery({
    queryKey: ['/api/staff/users'],
  });

  // Filtra gli utenti in base alla ricerca
  const filteredUsers = (staffUsers as StaffUser[]).filter((user: StaffUser) => 
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
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestione Staff</h1>
          <p className="text-muted-foreground mt-1">
            Visualizza e gestisci i tuoi membri dello staff
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
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Dettagli
                  </Button>
                  <Button variant="outline" size="sm">
                    <CreditCard className="h-4 w-4 mr-2" />
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
          <p className="text-muted-foreground">
            {searchQuery ? 'Nessun risultato trovato.' : 'Nessun utente staff trovato.'}
          </p>
        </div>
      )}
    </div>
  );
}