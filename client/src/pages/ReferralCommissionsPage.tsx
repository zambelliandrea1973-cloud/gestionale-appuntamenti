import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/hooks/use-currency";
import { queryClient } from "@/lib/queryClient";
import { Users, TrendingUp, Award, Coins, CheckCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";
import { getDateLocale } from "@/lib/utils/date";
import { useTranslation } from "react-i18next";
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
  staffName?: string;
  staffEmail?: string;
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
  const { t, i18n } = useTranslation();
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const { toast } = useToast();
  const { symbol } = useCurrency();
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

  // Query per commissioni dettagliate (uno staff specifico o tutti)
  const { 
    data: staffCommissions, 
    isLoading: commissionsLoading 
  } = useQuery<StaffCommission[]>({
    queryKey: selectedStaffId 
      ? ['/api/staff-commissions', selectedStaffId] 
      : ['/api/staff-commissions', 'all'],
    enabled: user?.type === 'admin'
  });

  // Mutation per segnare commissione come pagata
  const markCommissionPaidMutation = useMutation({
    mutationFn: async ({ commissionId, notes }: { commissionId: number; notes?: string }) => {
      const response = await fetch(`/api/staff-commissions/${commissionId}/mark-paid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      if (!response.ok) throw new Error(t('referral.markPaidError'));
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referral-overview'] });
      queryClient.invalidateQueries({ queryKey: ['/api/staff-commissions'] });
      toast({
        title: t('referral.commissionMarkedTitle'),
        description: t('referral.commissionMarkedDesc'),
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
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
      featureName={t('referral.adminFeatureName')}
      description={t('referral.adminOnly')}
    >
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header Admin */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg p-8 mb-8 shadow-lg">
            <div className="flex items-center gap-4 mb-4">
              <Award className="h-10 w-10" />
              <div>
                <h1 className="text-3xl font-bold">{t('referral.adminTitle')}</h1>
                <p className="text-blue-100">{t('referral.adminSubtitle')}</p>
              </div>
            </div>
            
            {referralOverview && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    <span className="text-sm font-medium">{t('referral.staffTotal')}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{referralOverview.staffStats.length}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    <span className="text-sm font-medium">{t('referral.sponsoredClients')}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{referralOverview.totals.totalSponsored}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    <span className="text-sm font-medium">{t('referral.totalCommissions')}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{symbol}{(referralOverview.totals.totalCommissions / 100).toFixed(2)}</p>
                </div>
                <div className="bg-white/10 rounded-lg p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    <span className="text-sm font-medium">{t('referral.paidCommissions')}</span>
                  </div>
                  <p className="text-2xl font-bold mt-1">{symbol}{(referralOverview.totals.totalPaid / 100).toFixed(2)}</p>
                </div>
              </div>
            )}
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="overview">{t('referral.staffOverviewTab')}</TabsTrigger>
              <TabsTrigger value="commissions">{t('referral.detailedCommissions')}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    {t('referral.activeStaffReferrals')}
                  </CardTitle>
                  <CardDescription>
                    {t('referral.staffPerformanceDesc')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {overviewLoading ? (
                    <div className="text-center p-8">{t('common.loading')}</div>
                  ) : overviewError ? (
                    <div className="text-center p-8 text-red-600">{t('referral.loadingError')}</div>
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
                                  <p className="text-gray-500">{t('referral.sponsored')}</p>
                                  <p className="font-bold text-blue-600">{staff.sponsoredCount}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">{t('referral.totalCommissionsShort')}</p>
                                  <p className="font-bold">{symbol}{(staff.totalCommissions / 100).toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">{t('referral.paidPlural')}</p>
                                  <p className="font-bold text-green-600">{symbol}{(staff.paidCommissions / 100).toFixed(2)}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500">{t('referral.pendingPlural')}</p>
                                  <p className="font-bold text-orange-600">{symbol}{(staff.pendingCommissions / 100).toFixed(2)}</p>
                                </div>
                              </div>
                              <Button 
                                onClick={() => {
                                  setSelectedStaffId(staff.staffId);
                                  setActiveTab("commissions");
                                }}
                                size="sm"
                                className="mt-2"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                {t('referral.detailsBtn')}
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8">{t('referral.noStaffActive')}</div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="commissions">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Coins className="h-5 w-5" />
                    {t('referral.detailedCommissions')}
                  </CardTitle>
                  <CardDescription>
                    {selectedStaffId 
                      ? t('referral.commissionsForStaff') 
                      : t('referral.allCommissionsAllStaff')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {commissionsLoading ? (
                    <div className="text-center p-8">{t('referral.loadingCommissions')}</div>
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
                                  {t('referral.codeLabel')} {commission.licenseCode}
                                </span>
                              </div>
                              <p className="font-medium">{commission.customerEmail}</p>
                              {!selectedStaffId && commission.staffName && (
                                <p className="text-sm font-medium text-blue-600 mt-1">
                                  {t('referral.staffLabel')} {commission.staffName}
                                </p>
                              )}
                              <p className="text-sm text-gray-600">
                                {t('referral.createdLabel')} {format(new Date(commission.createdAt), 'dd MMMM yyyy', { locale: getDateLocale(i18n.language) })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold">
                                {symbol}{(commission.commissionAmount / 100).toFixed(2)}
                              </p>
                              <div className="mt-2">
                                {commission.isPaid ? (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="h-4 w-4" />
                                    <span className="text-sm">
                                      {t('referral.paidOn', { date: commission.paidAt ? format(new Date(commission.paidAt), 'dd/MM/yyyy') : '' })}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="space-y-2">
                                    <div className="flex items-center gap-1 text-orange-600">
                                      <Clock className="h-4 w-4" />
                                      <span className="text-sm">{t('referral.awaitingPayment')}</span>
                                    </div>
                                    <Button
                                      onClick={() => handleMarkAsPaid(commission.id)}
                                      size="sm"
                                      disabled={markCommissionPaidMutation.isPending}
                                    >
                                      {t('referral.markAsPaidBtn')}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {commission.notes && (
                            <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                              <strong>{t('referral.notesLabel')}</strong> {commission.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center p-8">{t('referral.noCommissionsForStaff')}</div>
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