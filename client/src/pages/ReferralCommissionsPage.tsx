import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Award, TrendingUp, Banknote, Clock, Users, Euro, CheckCircle, XCircle, Copy, Share2, CreditCard, Save, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

interface StaffCommission {
  id: number;
  commissionAmount: number;
  isPaid: boolean;
  paidAt: string | null;
  createdAt: string;
  notes: string | null;
  licenseCode: string;
  licenseType: string;
  customerEmail: string;
}

interface ReferralStats {
  sponsoredCount: number;
  totalCommissions: number;
  paidCommissions: number;
  pendingCommissions: number;
  recentCommissions: StaffCommission[];
  commissionRate: number;
  minSponsorshipForCommission: number;
}

interface ReferralOverview {
  staffStats: Array<{
    staffId: number;
    staffName: string;
    staffEmail: string;
    sponsoredCount: number;
    totalCommissions: number;
    paidCommissions: number;
    pendingCommissions: number;
  }>;
  totals: {
    totalSponsored: number;
    totalCommissions: number;
    totalPaid: number;
    totalPending: number;
  };
  commissionRate: number;
  minSponsorshipForCommission: number;
}

export default function ReferralCommissionsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Recupera le statistiche personali se è staff
  const { data: userStats, isLoading: userStatsLoading } = useQuery<ReferralStats>({
    queryKey: ['/api/referral/staff', user?.id, 'stats'],
    enabled: !!user && user.role === 'staff',
  });

  // Recupera la panoramica generale se è admin
  const { data: overview, isLoading: overviewLoading } = useQuery<ReferralOverview>({
    queryKey: ['/api/referral/overview'],
    enabled: !!user && user.role === 'admin',
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async ({ commissionId, notes }: { commissionId: number; notes?: string }) => {
      const response = await fetch(`/api/referral/commission/${commissionId}/paid`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });
      if (!response.ok) throw new Error('Errore nel segnare come pagata');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Commissione segnata come pagata",
        description: "La commissione è stata aggiornata con successo",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/referral'] });
    },
    onError: () => {
      toast({
        title: "Errore",
        description: "Impossibile aggiornare la commissione",
        variant: "destructive",
      });
    },
  });

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR',
    }).format(cents / 100);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: it });
  };

  if (!user) {
    return <div className="text-center p-8">Devi essere autenticato per vedere questa pagina.</div>;
  }

  if (user.role === 'staff') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header con gradiente blu */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-8 mb-8 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <Award className="h-10 w-10" />
              <div>
                <h1 className="text-3xl font-bold">Programma Referral</h1>
                <p className="text-blue-100">Le tue commissioni e statistiche</p>
              </div>
            </div>
          </div>

          {/* Sezione Codice Referral Personale - Compatta */}
          {userStats && (
            <Card className="bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-md border-0 mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Share2 className="h-5 w-5" />
                    <div>
                      <h3 className="font-semibold text-lg">Il Tuo Codice Referral</h3>
                      <p className="text-green-100 text-sm">Condividi con i nuovi clienti</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-3xl font-bold tracking-wider mb-1">
                      {userStats.stats?.myReferralCode || userStats.myReferralCode || 'CARICAMENTO...'}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          const code = userStats.stats?.myReferralCode || userStats.myReferralCode || '';
                          navigator.clipboard.writeText(code);
                          toast({
                            title: "Codice copiato!",
                            description: `Codice ${code} copiato negli appunti`,
                          });
                        }}
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copia
                      </Button>
                      
                      <Button
                        onClick={() => {
                          const code = userStats.stats?.myReferralCode || userStats.myReferralCode || '';
                          const message = `Utilizza il codice di attivazione (${code}) durante la registrazione`;
                          if (navigator.share) {
                            navigator.share({ title: 'Codice di Attivazione', text: message });
                          } else {
                            navigator.clipboard.writeText(message);
                            toast({
                              title: "Messaggio copiato!",
                              description: "Il messaggio completo è stato copiato",
                            });
                          }
                        }}
                        size="sm"
                        className="bg-white/20 hover:bg-white/30 text-white"
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Condividi
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="mt-3 text-center">
                  <p className="text-green-100 text-xs">
                    📝 <strong>Messaggio:</strong> "Utilizza il codice di attivazione (<span className="font-mono bg-white/20 px-1 rounded">{userStats.stats?.myReferralCode || userStats.myReferralCode || '...'}</span>) durante la registrazione"
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {userStatsLoading ? (
            <div className="text-center">Caricamento statistiche...</div>
          ) : userStats ? (
            <>
              {/* Statistiche principali */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Users className="h-5 w-5" />
                      Abbonamenti Sponsorizzati
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{userStats.sponsoredCount}</div>
                    <p className="text-sm text-gray-600">
                      {userStats.sponsoredCount >= 3 ? 'Commissioni attive!' : `${3 - userStats.sponsoredCount} per iniziare`}
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-lg border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Euro className="h-5 w-5" />
                      Commissioni Totali
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(userStats.totalCommissions)}
                    </div>
                    <p className="text-sm text-gray-600">Guadagno totale</p>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-lg border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle className="h-5 w-5" />
                      Commissioni Pagate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(userStats.paidCommissions)}
                    </div>
                    <p className="text-sm text-gray-600">Già ricevute</p>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-lg border-l-4 border-l-orange-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <Clock className="h-5 w-5" />
                      In Attesa
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      {formatCurrency(userStats.pendingCommissions)}
                    </div>
                    <p className="text-sm text-gray-600">Da ricevere</p>
                  </CardContent>
                </Card>
              </div>

              {/* Come funziona */}
              <Card className="bg-white shadow-lg mb-8 border-t-4 border-t-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <TrendingUp className="h-5 w-5" />
                    Come Funziona il Sistema Referral
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Users className="h-8 w-8 text-blue-600" />
                      </div>
                      <h3 className="font-semibold mb-2">1. Sponsorizza Clienti</h3>
                      <p className="text-sm text-gray-600">Aiuta i clienti a sottoscrivere abbonamenti</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-green-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Award className="h-8 w-8 text-green-600" />
                      </div>
                      <h3 className="font-semibold mb-2">2. Raggiungi 3 Abbonamenti</h3>
                      <p className="text-sm text-gray-600">Le commissioni iniziano dal terzo abbonamento sponsorizzato</p>
                    </div>
                    <div className="text-center">
                      <div className="bg-yellow-100 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                        <Banknote className="h-8 w-8 text-yellow-600" />
                      </div>
                      <h3 className="font-semibold mb-2">3. Ricevi €1 per Abbonamento</h3>
                      <p className="text-sm text-gray-600">Commissione fissa di €1 per ogni abbonamento attivo</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Commissioni recenti */}
              {userStats.recentCommissions.length > 0 && (
                <Card className="bg-white shadow-lg border-t-4 border-t-indigo-500">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-indigo-700">
                      <Banknote className="h-5 w-5" />
                      Commissioni Recenti
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {userStats.recentCommissions.map((commission) => (
                        <div key={commission.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={commission.licenseType === 'trial' ? 'secondary' : 'default'}>
                                {commission.licenseType.toUpperCase()}
                              </Badge>
                              <span className="text-sm text-gray-600">{commission.licenseCode}</span>
                            </div>
                            <p className="text-sm text-gray-700">{commission.customerEmail}</p>
                            <p className="text-xs text-gray-500">Creata: {formatDate(commission.createdAt)}</p>
                          </div>
                          <div className="text-right">
                            <div className="text-lg font-semibold text-green-600">
                              {formatCurrency(commission.commissionAmount)}
                            </div>
                            <div className="flex items-center gap-2">
                              {commission.isPaid ? (
                                <>
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                  <span className="text-sm text-green-600">Pagata</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="h-4 w-4 text-orange-500" />
                                  <span className="text-sm text-orange-600">In attesa</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <div className="text-center p-8">Errore nel caricamento delle statistiche</div>
          )}
        </div>
      </div>
    );
  }

  if (user.role === 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Admin */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-8 mb-8 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <Award className="h-10 w-10" />
              <div>
                <h1 className="text-3xl font-bold">Gestione Referral - Admin</h1>
                <p className="text-blue-100">Panoramica completa delle commissioni staff</p>
              </div>
            </div>
          </div>

          {overviewLoading ? (
            <div className="text-center">Caricamento panoramica...</div>
          ) : overview ? (
            <>
              {/* Totali generali */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card className="bg-white shadow-lg border-l-4 border-l-blue-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-blue-700">
                      <Users className="h-5 w-5" />
                      Totale Sponsorizzati
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">{overview.totals.totalSponsored}</div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-lg border-l-4 border-l-green-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-green-700">
                      <Euro className="h-5 w-5" />
                      Commissioni Totali
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      {formatCurrency(overview.totals.totalCommissions)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-lg border-l-4 border-l-emerald-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-emerald-700">
                      <CheckCircle className="h-5 w-5" />
                      Già Pagate
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-emerald-600">
                      {formatCurrency(overview.totals.totalPaid)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-white shadow-lg border-l-4 border-l-orange-500">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-orange-700">
                      <Clock className="h-5 w-5" />
                      Da Pagare
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-orange-600">
                      {formatCurrency(overview.totals.totalPending)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Statistiche per staff */}
              <Card className="bg-white shadow-lg border-t-4 border-t-blue-500">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-blue-700">
                    <Users className="h-5 w-5" />
                    Statistiche per Staff
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {overview.staffStats.map((staff) => (
                      <div key={staff.staffId} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <h3 className="font-semibold">{staff.staffName}</h3>
                          <p className="text-sm text-gray-600">{staff.staffEmail}</p>
                          <p className="text-sm text-blue-600">{staff.sponsoredCount} abbonamenti sponsorizzati</p>
                        </div>
                        <div className="text-right space-y-1">
                          <div className="text-lg font-semibold text-green-600">
                            {formatCurrency(staff.totalCommissions)}
                          </div>
                          <div className="flex gap-4 text-sm">
                            <span className="text-emerald-600">
                              Pagate: {formatCurrency(staff.paidCommissions)}
                            </span>
                            <span className="text-orange-600">
                              Pending: {formatCurrency(staff.pendingCommissions)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center p-8">Errore nel caricamento della panoramica</div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="text-center p-8">
      <p>Questa sezione è disponibile solo per admin e staff.</p>
    </div>
  );
}