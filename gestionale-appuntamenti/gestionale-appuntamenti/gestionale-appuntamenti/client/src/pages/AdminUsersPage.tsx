import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Users, Clock, CheckCircle2, XCircle, AlertCircle, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [extendingUser, setExtendingUser] = useState<number | null>(null);

  // Fetch tutti gli utenti
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['/api/admin-license/all-users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin-license/all-users');
      return await res.json();
    },
  });

  // Mutation per estendere il trial
  const extendTrialMutation = useMutation({
    mutationFn: async (userId: number) => {
      setExtendingUser(userId);
      const res = await apiRequest('POST', '/api/admin-license/extend-trial', { userId });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Trial Esteso',
        description: data.message,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin-license/all-users'] });
      setExtendingUser(null);
    },
    onError: (error: any) => {
      toast({
        title: 'Errore',
        description: error.message || 'Impossibile estendere il trial',
        variant: 'destructive',
      });
      setExtendingUser(null);
    },
  });

  // Calcola statistiche
  const stats = usersData?.users ? {
    total: usersData.users.length,
    active: usersData.users.filter((u: any) => u.status.licenseStatus === 'active' || u.status.licenseStatus === 'subscribed').length,
    expiring: usersData.users.filter((u: any) => u.status.daysLeft !== null && u.status.daysLeft < 7 && u.status.daysLeft > 0).length,
    expired: usersData.users.filter((u: any) => u.status.licenseStatus === 'expired').length,
  } : { total: 0, active: 0, expiring: 0, expired: 0 };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'subscribed':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="w-3 h-3 mr-1" />Abbonato</Badge>;
      case 'active':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"><Clock className="w-3 h-3 mr-1" />Trial Attivo</Badge>;
      case 'expired':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="w-3 h-3 mr-1" />Scaduto</Badge>;
      case 'permanent':
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"><CheckCircle2 className="w-3 h-3 mr-1" />Permanente</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" />Sconosciuto</Badge>;
    }
  };

  const getUserTypeBadge = (type: string) => {
    switch (type) {
      case 'customer':
        return <Badge variant="outline">Cliente</Badge>;
      case 'staff':
        return <Badge className="bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">Staff</Badge>;
      case 'admin':
        return <Badge className="bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300">Admin</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Gestione Utenti</h1>
        <p className="text-muted-foreground">Visualizza e gestisci tutti gli utenti registrati nel sistema</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Totale Utenti</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Licenze Attive</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Scadenza (&lt;7gg)</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.expiring}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scaduti</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tutti gli Utenti</CardTitle>
          <CardDescription>Elenco completo con stato licenze e abbonamenti</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Stato Licenza</TableHead>
                <TableHead>Scadenza</TableHead>
                <TableHead>Giorni Rimanenti</TableHead>
                <TableHead>Piano</TableHead>
                <TableHead>Azioni</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {usersData?.users && usersData.users.length > 0 ? (
                usersData.users.map((user: any) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.username}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email || '-'}</TableCell>
                    <TableCell>{getUserTypeBadge(user.type)}</TableCell>
                    <TableCell>{getStatusBadge(user.status.licenseStatus)}</TableCell>
                    <TableCell>
                      {user.status.expiresAt ? (
                        <div className="flex items-center text-sm">
                          <Calendar className="w-3 h-3 mr-1" />
                          {format(new Date(user.status.expiresAt), 'dd/MM/yyyy')}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.status.daysLeft !== null ? (
                        <div className="flex flex-col">
                          <span className={`font-semibold ${
                            user.status.daysLeft > 7 ? 'text-green-600' : 
                            user.status.daysLeft > 0 ? 'text-orange-600' : 'text-red-600'
                          }`}>
                            {user.status.daysLeft} giorni
                          </span>
                          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className={`h-1.5 rounded-full ${
                                user.status.daysLeft > 30 ? 'bg-green-600' : 
                                user.status.daysLeft > 7 ? 'bg-orange-600' : 'bg-red-600'
                              }`}
                              style={{ width: `${Math.min(100, (user.status.daysLeft / 40) * 100)}%` }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {user.subscription?.planName || (user.license?.type || '-')}
                    </TableCell>
                    <TableCell>
                      {(user.license?.type === 'trial' || !user.subscription) && user.status.licenseStatus !== 'permanent' ? (
                        <Button
                          size="sm"
                          onClick={() => extendTrialMutation.mutate(user.id)}
                          disabled={extendingUser === user.id}
                          data-testid={`button-extend-trial-${user.id}`}
                        >
                          {extendingUser === user.id ? (
                            <><Loader2 className="w-4 h-4 mr-1 animate-spin" />Estendendo...</>
                          ) : (
                            <>+40 giorni</>
                          )}
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    Nessun utente trovato
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
