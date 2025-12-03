import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Users, TrendingUp, Award, Euro, CheckCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { it } from "date-fns/locale";
import { useUserWithLicense } from "@/hooks/use-user-with-license";
import AuthorizedRoute from "@/components/AuthorizedRoute";

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
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const { toast } = useToast();
  const { user } = useUserWithLicense();

  // Query per panoramica referral (solo admin)
  const { 
    data: referralOverview, 
    isLoading: overviewLoading, 
    error: overviewError 
  } = useQuery<ReferralOverview>({
    queryKey: ['/api/referral-overview'],
    enabled: user?.type === 'admin'
  });

  // Query per commissioni dettagliate di uno staff specifico
  const { 
    data: staffCommissions, 
    isLoading: commissionsLoading 
  } = useQuery<StaffCommission[]>({
    queryKey: ['/api/staff-commissions', selectedStaffId],
    enabled: !!selectedStaffId && user?.type === 'admin'
  });

  // Mutation per segnare commissione come pagata
  const markCommissionPaidMutation = useMutation({
    mutationFn: async ({ commissionId, notes }: { commissionId: number; notes?: string }) => {
      const response = await fetch(`/api/staff-commissions/${commissionId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (!response.ok) throw new Error('Errore nel segnare la commissione come pagata');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referral-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/staff-commissions'] });
      toast({
        title: "Commissione aggiornata",
        description: "La commissione è stata segnata come pagata.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Errore",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleMarkAsPaid = (commissionId: number, notes?: string) => {
    markCommissionPaidMutation.mutate({ commissionId, notes });
  };

  return (
    <AuthorizedRoute 
      requiredRole="admin"
      featureName="Gestione Commissioni Referral"
      description="Solo gli amministratori possono gestire le commissioni referral, coordinare e verificare gli abbonamenti sponsorizzati dallo staff per procedere ai pagamenti"
    >
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
            
            {referralOverview && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span className="text-sm font-medium">Staff Totali</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{referralOverview.staffStats.length}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">Clienti Sponsorizzati</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{referralOverview.totals.totalSponsored}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    <span className="text-sm font-medium">Commissioni Totali</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">€{(referralOverview.totals.totalCommissions / 100).toFixed(2)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">Commissioni Pagate</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">€{(referralOverview.totals.totalPaid / 100).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">Panoramica Staff</TabsTrigger>
              <TabsTrigger value="commissions">Commissioni Dettagliate</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Staff con Referral Attivi
                  </CardTitle>
                  <CardDescription>
                    Panoramica delle performance di referral per ogni membro dello staff
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {overviewLoading ? (
                    <div className="text-center p-8">Caricamento...</div>
                  ) : overviewError ? (
                    <div className="text-center p-8 text-red-600">Errore nel caricamento dei dati</div>
                  ) : referralOverview?.staffStats && referralOverview.staffStats.length > 0 ? (
                    <div className="space-y-4">
                      {referralOverview.staffStats.map((staff) => (
                        <div key={staff.staffId} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-lg">{staff.staffName}</h3>
                              <p className="text-gray-600">{staff.staffEmail}</p>
                            </div>
                            <div className="text-right">
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <p className="text-gray-500">Sponsorizzati</p>
                                  <p className="font-bold text-blue-600">{staff.sponsoredCount}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Tot. Commissioni</p>
                                  <p className="font-bold">€{(staff.totalCommissions / 100).toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">Pagate</p>
                                  <p className="font-bold text-green-600">€{(staff.paidCommissions / 100).toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">In Attesa</p>
                                  <p className="font-bold text-orange-600">€{(staff.pendingCommissions / 100).toFixed(2)}</p>
                                </div>
                              </div>
                              <Button 
                                onClick={() => setSelectedStaffId(staff.staffId)}
                                size="sm"
                                className="mt-2"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Dettagli
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8">Nessuno staff con referral attivi al momento</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commissions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Euro className="h-5 w-5" />
                    Commissioni Dettagliate
                  </CardTitle>
                  <CardDescription>
                    {selectedStaffId 
                      ? `Commissioni per lo staff selezionato` 
                      : "Seleziona uno staff dalla panoramica per vedere le commissioni dettagliate"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!selectedStaffId ? (
                    <div className="text-center p-8 text-gray-500">
                      Seleziona uno staff dalla scheda "Panoramica Staff" per vedere le commissioni dettagliate
                    </div>
                  ) : commissionsLoading ? (
                    <div className="text-center p-8">Caricamento commissioni...</div>
                  ) : staffCommissions && staffCommissions.length > 0 ? (
                    <div className="space-y-4">
                      {staffCommissions.map((commission) => (
                        <div key={commission.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={commission.licenseType === 'pro' ? 'default' : 'secondary'}>
                                  {commission.licenseType.toUpperCase()}
                                </Badge>
                                <span className="text-sm text-gray-600">
                                  Codice: {commission.licenseCode}
                                </span>
                              </div>
                              <p className="font-medium">{commission.customerEmail}</p>
                              <p className="text-sm text-gray-600">
                                Creata: {format(new Date(commission.createdAt), 'dd MMMM yyyy', { locale: it })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                €{(commission.commissionAmount / 100).toFixed(2)}
                              </p>
                              <div className="mt-2">
                                {commission.isPaid ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-sm">
                                      Pagata {commission.paidAt && format(new Date(commission.paidAt), 'dd/MM/yyyy', { locale: it })}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1 text-orange-600">
                                      <Clock className="h-4 w-4" />
                                      <span className="text-sm">In attesa di pagamento</span>
                                    </div>
                                    <Button
                                      onClick={() => handleMarkAsPaid(commission.id)}
                                      size="sm"
                                      disabled={markCommissionPaidMutation.isPending}
                                    >
                                      Segna come Pagata
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {commission.notes && (
                            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                              <strong>Note:</strong> {commission.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8">Nessuna commissione trovata per questo staff</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AuthorizedRoute>
  );
}