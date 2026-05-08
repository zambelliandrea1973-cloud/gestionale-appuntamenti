import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Euro, Save, Edit2, Check, X, Eye, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

interface SubscriptionPlan {
  id: number;
  name: string;
  description: string | null;
  price: number;
  interval: string;
  features: any;
  clientLimit: number | null;
  isActive: boolean;
  sortOrder: number;
}

interface PlanFeature {
  key?: string;
  name?: string;
  included: boolean;
}

const KNOWN_PLAN_SLUGS = ['base', 'pro', 'professional', 'business', 'trial'];

export default function SubscriptionPlansAdmin() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [editingPlan, setEditingPlan] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({});

  // Carica i piani dal backend
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
  });

  // Mutation per aggiornare un piano
  const updatePlanMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<SubscriptionPlan> }) => {
      const response = await apiRequest('PUT', `/api/subscription-plans/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/plans'] });
      toast({
        title: t('i18nFinale.subscriptionPlansAdmin.planUpdatedTitle'),
        description: t('i18nFinale.subscriptionPlansAdmin.planUpdated'),
      });
      setEditingPlan(null);
      setEditForm({});
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getDefaultDescription = (planName: string): string | undefined => {
    const slug = planName.toLowerCase();
    if (!KNOWN_PLAN_SLUGS.includes(slug)) return undefined;
    const tIt = i18n.getFixedT('it');
    const val = tIt(`plans.${slug}.description`);
    return val !== `plans.${slug}.description` ? val : undefined;
  };

  const startEditing = (plan: SubscriptionPlan) => {
    // Gestione corretta delle features all'avvio dell'editing
    let parsedFeatures: PlanFeature[] = [];
    if (plan.features) {
      if (typeof plan.features === 'string') {
        try {
          parsedFeatures = JSON.parse(plan.features);
        } catch {
          parsedFeatures = [];
        }
      } else if (Array.isArray(plan.features)) {
        parsedFeatures = plan.features;
      }
    }
    
    setEditingPlan(plan.id);
    setEditForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price,
      interval: plan.interval,
      features: parsedFeatures,
      clientLimit: plan.clientLimit,
      isActive: plan.isActive,
    });
  };

  const cancelEditing = () => {
    setEditingPlan(null);
    setEditForm({});
  };

  const saveChanges = (planId: number) => {
    updatePlanMutation.mutate({ id: planId, data: editForm });
  };

  const updateFeature = (featureIndex: number, field: 'name' | 'included', value: any) => {
    const currentFeatures = editForm.features || [];
    const updatedFeatures = [...currentFeatures];
    updatedFeatures[featureIndex] = {
      ...updatedFeatures[featureIndex],
      [field]: value,
    };
    setEditForm({ ...editForm, features: updatedFeatures });
  };

  const addFeature = () => {
    const currentFeatures = editForm.features || [];
    setEditForm({
      ...editForm,
      features: [...currentFeatures, { name: '', included: true }],
    });
  };

  const removeFeature = (index: number) => {
    const currentFeatures = editForm.features || [];
    setEditForm({
      ...editForm,
      features: currentFeatures.filter((_: any, i: number) => i !== index),
    });
  };

  if (isLoading) {
    return <div className="text-center p-4">{t('i18nFinale.subscriptionPlansAdmin.loadingPlans')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pulsante Anteprima */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={() => window.open('/subscribe', '_blank')}
          className="gap-2"
          data-testid="button-preview-plans"
        >
          <Eye className="h-4 w-4" />
          {t('i18nFinale.subscriptionPlansAdmin.previewPublicPlans')}
        </Button>
      </div>
      {plans?.map((plan) => {
        const isEditing = editingPlan === plan.id;
        
        // Gestione corretta delle features (potrebbero essere string JSON o array)
        let features: PlanFeature[] = [];
        if (plan.features) {
          if (typeof plan.features === 'string') {
            try {
              features = JSON.parse(plan.features);
            } catch {
              features = [];
            }
          } else if (Array.isArray(plan.features)) {
            features = plan.features;
          }
        }

        return (
          <Card key={plan.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {isEditing ? (
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="max-w-xs"
                      />
                    ) : (
                      <>
                        {plan.name}
                        {!plan.isActive && <Badge variant="secondary">Disattivo</Badge>}
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="mt-2">
                    {isEditing ? (
                      <div className="space-y-1">
                        <Textarea
                          value={editForm.description || ''}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder={t('i18nFinale.subscriptionPlansAdmin.planDescription')}
                          rows={2}
                          className="text-sm"
                        />
                        {getDefaultDescription(plan.name) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setEditForm({ ...editForm, description: getDefaultDescription(plan.name) || '' })}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t('i18nFinale.subscriptionPlansAdmin.resetDescription')}
                          </Button>
                        )}
                      </div>
                    ) : !plan.description ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="italic text-muted-foreground/60">{t('i18nFinale.subscriptionPlansAdmin.noDescription', 'Nessuna descrizione')}</span>
                        {getDefaultDescription(plan.name) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => startEditing({ ...plan, description: getDefaultDescription(plan.name) || null })}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t('i18nFinale.subscriptionPlansAdmin.resetDescription')}
                          </Button>
                        )}
                      </div>
                    ) : (
                      plan.description
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditing}
                        disabled={updatePlanMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        {t('common.cancel')}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveChanges(plan.id)}
                        disabled={updatePlanMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        {t('common.save')}
                      </Button>
                    </>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => startEditing(plan)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      {t('common.edit')}
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Prezzo e Intervallo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>{t('i18nFinale.subscriptionPlansAdmin.priceCents')}</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editForm.price || 0}
                      onChange={(e) => setEditForm({ ...editForm, price: parseInt(e.target.value) })}
                    />
                  ) : (
                    <div className="flex items-center gap-2 mt-2">
                      <Euro className="h-4 w-4 text-muted-foreground" />
                      <span className="font-semibold">{(plan.price / 100).toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground">/ {plan.interval === 'month' ? t('i18nFinale.subscriptionPlansAdmin.monthShort') : t('i18nFinale.subscriptionPlansAdmin.yearShort')}</span>
                    </div>
                  )}
                </div>

                <div>
                  <Label>{t('i18nFinale.subscriptionPlansAdmin.clientLimit')}</Label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editForm.clientLimit || ''}
                      onChange={(e) => setEditForm({ ...editForm, clientLimit: e.target.value ? parseInt(e.target.value) : null })}
                      placeholder={t('i18nFinale.subscriptionPlansAdmin.unlimited')}
                    />
                  ) : (
                    <div className="mt-2 font-medium">{plan.clientLimit || t('i18nFinale.subscriptionPlansAdmin.unlimited')}</div>
                  )}
                </div>

                <div>
                  <Label>{t('i18nFinale.subscriptionPlansAdmin.statusLabel')}</Label>
                  {isEditing ? (
                    <div className="flex items-center gap-2 mt-2">
                      <Switch
                        checked={editForm.isActive}
                        onCheckedChange={(checked) => setEditForm({ ...editForm, isActive: checked })}
                      />
                      <span className="text-sm">{editForm.isActive ? 'Attivo' : 'Disattivo'}</span>
                    </div>
                  ) : (
                    <Badge className="mt-2" variant={plan.isActive ? 'default' : 'secondary'}>
                      {plan.isActive ? 'Attivo' : 'Disattivo'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Features */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>{t('i18nFinale.subscriptionPlansAdmin.featuresIncluded')}</Label>
                  {isEditing && (
                    <Button size="sm" variant="outline" onClick={addFeature}>
                      {t('i18nFinale.subscriptionPlansAdmin.addFeature')}
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  {isEditing ? (
                    (editForm.features || []).map((feature: PlanFeature, index: number) => (
                      <div key={index} className="flex items-center gap-2">
                        {feature.key ? (
                          <span className="flex-1 text-sm px-3 py-2 bg-muted rounded-md text-foreground">
                            {t(`planFeatures.${feature.key}`, feature.key)}
                          </span>
                        ) : (
                          <Input
                            value={feature.name || ''}
                            onChange={(e) => updateFeature(index, 'name', e.target.value)}
                            placeholder={t('i18nFinale.subscriptionPlansAdmin.featureNamePlaceholder')}
                          />
                        )}
                        <Switch
                          checked={feature.included}
                          onCheckedChange={(checked) => updateFeature(index, 'included', checked)}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFeature(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))
                  ) : features.length > 0 ? (
                    features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2">
                        {feature.included ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-gray-400" />
                        )}
                        <span className={feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}>
                          {feature.key
                            ? t(`planFeatures.${feature.key}`, feature.name || feature.key)
                            : (feature.name || '')}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-muted-foreground italic">
                      {t('i18nFinale.subscriptionPlansAdmin.noFeatures')}
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
