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
import { Euro, Save, Edit2, Check, X, Eye, RotateCcw, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

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
const SUPPORTED_LOCALES = ['it', 'en', 'es', 'fr', 'de', 'nl', 'no', 'ro', 'ru'];

/** Normalise a BCP-47 locale tag to its base language code (e.g. "en-US" → "en"). */
const baseLocale = (lang: string): string => lang.split('-')[0].toLowerCase();

type LocaleMap = Record<string, string>;
type PresetDescriptions = Record<string, LocaleMap>;

export default function SubscriptionPlansAdmin() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [editingPlan, setEditingPlan] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<Partial<SubscriptionPlan>>({});
  const [showNewPlanForm, setShowNewPlanForm] = useState(false);
  const [newPlanForm, setNewPlanForm] = useState({ name: '', description: '', price: 0, interval: 'month' });

  // Preset Defaults state
  const [editingPresets, setEditingPresets] = useState(false);
  const [presetDraft, setPresetDraft] = useState<PresetDescriptions>({});
  const [presetActiveLang, setPresetActiveLang] = useState<string>('it');

  // Carica i piani dal backend
  const { data: plans, isLoading } = useQuery<SubscriptionPlan[]>({
    queryKey: ['/api/subscription-plans'],
  });

  // Carica i preset dal backend (nested format: { planName: { locale: description } })
  const { data: dbPresets = {} } = useQuery<PresetDescriptions>({
    queryKey: ['/api/plan-preset-descriptions'],
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

  // Mutation per aggiornare i preset
  const updatePresetsMutation = useMutation({
    mutationFn: async (presets: PresetDescriptions) => {
      const response = await apiRequest('PUT', '/api/plan-preset-descriptions', presets);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/plan-preset-descriptions'] });
      toast({
        title: t('i18nFinale.subscriptionPlansAdmin.presetsUpdatedTitle'),
        description: t('i18nFinale.subscriptionPlansAdmin.presetsUpdated'),
      });
      setEditingPresets(false);
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation per creare un nuovo piano
  const createPlanMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; price: number; interval: string }) => {
      const response = await apiRequest('POST', '/api/subscription-plans', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subscription-plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/payments/plans'] });
      queryClient.invalidateQueries({ queryKey: ['/api/plan-preset-descriptions'] });
      toast({
        title: t('i18nFinale.subscriptionPlansAdmin.planCreatedTitle'),
        description: t('i18nFinale.subscriptionPlansAdmin.planCreated'),
      });
      setShowNewPlanForm(false);
      setNewPlanForm({ name: '', description: '', price: 0, interval: 'month' });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: "destructive",
      });
    }
  });

  /**
   * Returns the best available default description for a plan in the current UI language.
   * Priority: DB preset for current locale → DB preset for 'it' → i18n translation → undefined
   */
  const getDefaultDescription = (planName: string): string | undefined => {
    const nameLower = planName.toLowerCase();
    const currentLang = baseLocale(i18n.resolvedLanguage ?? i18n.language);

    for (const [key, localeMap] of Object.entries(dbPresets)) {
      if (key.toLowerCase() !== nameLower) continue;
      if (localeMap && typeof localeMap === 'object') {
        // Try current language first, then fall back to Italian
        if (localeMap[currentLang]?.trim()) return localeMap[currentLang];
        if (currentLang !== 'it' && localeMap['it']?.trim()) return localeMap['it'];
        // Try any available locale as last resort
        const anyVal = Object.values(localeMap).find((v) => v?.trim());
        if (anyVal) return anyVal;
      }
    }

    // Fall back to the current interface language translation for known slugs,
    // then to Italian as a last resort so there is always a canonical value.
    const slug = nameLower;
    if (!KNOWN_PLAN_SLUGS.includes(slug)) return undefined;
    const tCurrent = i18n.getFixedT(currentLang);
    const valCurrent = tCurrent(`plans.${slug}.description`);
    if (valCurrent && valCurrent !== `plans.${slug}.description`) return valCurrent;
    const tIt = i18n.getFixedT('it');
    const valIt = tIt(`plans.${slug}.description`);
    return valIt !== `plans.${slug}.description` ? valIt : undefined;
  };

  /**
   * Returns how many of the supported locales have a non-empty description.
   */
  const countFilledLocales = (localeMap: LocaleMap): { filled: number; total: number; filledList: string[]; emptyList: string[] } => {
    const filledList: string[] = [];
    const emptyList: string[] = [];
    for (const lang of SUPPORTED_LOCALES) {
      if (localeMap[lang]?.trim()) {
        filledList.push(lang);
      } else {
        emptyList.push(lang);
      }
    }
    return { filled: filledList.length, total: SUPPORTED_LOCALES.length, filledList, emptyList };
  };

  /**
   * Returns the description for a plan in the current UI language from the DB presets,
   * used for the read-only view of preset rows.
   */
  const getPresetDisplayValue = (localeMap: LocaleMap): string => {
    const lang = baseLocale(i18n.resolvedLanguage ?? i18n.language);
    if (localeMap[lang]?.trim()) return localeMap[lang];
    if (localeMap['it']?.trim()) return localeMap['it'];
    return Object.values(localeMap).find((v) => v?.trim()) ?? '';
  };

  const startEditing = (plan: SubscriptionPlan) => {
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

  const startEditingPresets = () => {
    // Deep-copy dbPresets, migrating any legacy string values to { it: value }
    const draft: PresetDescriptions = {};
    for (const [key, value] of Object.entries(dbPresets)) {
      if (typeof value === 'string') {
        draft[key] = (value as string).trim() ? { it: value as string } : {};
      } else if (value && typeof value === 'object') {
        draft[key] = { ...(value as LocaleMap) };
      } else {
        draft[key] = {};
      }
    }
    setPresetDraft(draft);
    const normalised = baseLocale(i18n.resolvedLanguage ?? i18n.language);
    setPresetActiveLang(SUPPORTED_LOCALES.includes(normalised) ? normalised : 'it');
    setEditingPresets(true);
  };

  const cancelEditingPresets = () => {
    setEditingPresets(false);
    setPresetDraft({});
  };

  const savePresets = () => {
    const seen = new Set<string>();
    for (const key of Object.keys(presetDraft)) {
      const trimmed = key.trim();
      if (!trimmed) continue;
      const lower = trimmed.toLowerCase();
      if (seen.has(lower)) {
        toast({
          title: t('common.error'),
          description: `${t('i18nFinale.subscriptionPlansAdmin.presetPlanNameLabel')}: "${trimmed}"`,
          variant: "destructive",
        });
        return;
      }
      seen.add(lower);
    }
    const cleaned: PresetDescriptions = {};
    for (const [key, localeMap] of Object.entries(presetDraft)) {
      if (key.trim()) cleaned[key.trim()] = { ...localeMap };
    }
    updatePresetsMutation.mutate(cleaned);
  };

  const addPresetRow = () => {
    setPresetDraft({ ...presetDraft, '': {} });
  };

  const updatePresetKey = (oldKey: string, newKey: string) => {
    const updated: PresetDescriptions = {};
    for (const [k, v] of Object.entries(presetDraft)) {
      updated[k === oldKey ? newKey : k] = v;
    }
    setPresetDraft(updated);
  };

  const updatePresetLocaleValue = (key: string, lang: string, value: string) => {
    const currentMap = presetDraft[key] ?? {};
    setPresetDraft({
      ...presetDraft,
      [key]: { ...currentMap, [lang]: value },
    });
  };

  const removePresetRow = (key: string) => {
    const updated = { ...presetDraft };
    delete updated[key];
    setPresetDraft(updated);
  };

  if (isLoading) {
    return <div className="text-center p-4">{t('i18nFinale.subscriptionPlansAdmin.loadingPlans')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Pulsanti superiori */}
      <div className="flex justify-between items-center">
        <Button
          variant="default"
          onClick={() => setShowNewPlanForm(!showNewPlanForm)}
          className="gap-2"
          data-testid="button-new-plan"
        >
          <Plus className="h-4 w-4" />
          {t('i18nFinale.subscriptionPlansAdmin.newPlan')}
        </Button>
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

      {/* Form nuovo piano */}
      {showNewPlanForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('i18nFinale.subscriptionPlansAdmin.newPlan')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>{t('i18nFinale.subscriptionPlansAdmin.presetPlanNamePlaceholder')}</Label>
                <Input
                  value={newPlanForm.name}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, name: e.target.value })}
                  placeholder="es. Enterprise"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>{t('i18nFinale.subscriptionPlansAdmin.priceCents')}</Label>
                <Input
                  type="number"
                  value={newPlanForm.price}
                  onChange={(e) => setNewPlanForm({ ...newPlanForm, price: parseInt(e.target.value) || 0 })}
                  className="mt-1"
                />
              </div>
            </div>
            <div>
              <Label>{t('i18nFinale.subscriptionPlansAdmin.planDescription')}</Label>
              <Textarea
                value={newPlanForm.description}
                onChange={(e) => setNewPlanForm({ ...newPlanForm, description: e.target.value })}
                placeholder={t('i18nFinale.subscriptionPlansAdmin.presetDescriptionLabel')}
                rows={2}
                className="mt-1 text-sm"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setShowNewPlanForm(false); setNewPlanForm({ name: '', description: '', price: 0, interval: 'month' }); }}
                disabled={createPlanMutation.isPending}
              >
                <X className="h-4 w-4 mr-1" />
                {t('common.cancel')}
              </Button>
              <Button
                size="sm"
                onClick={() => createPlanMutation.mutate(newPlanForm)}
                disabled={createPlanMutation.isPending || !newPlanForm.name.trim()}
              >
                <Save className="h-4 w-4 mr-1" />
                {t('common.save')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sezione Preset Descrizioni */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t('i18nFinale.subscriptionPlansAdmin.presetDefaultsTitle')}</CardTitle>
              <CardDescription className="mt-1">
                {t('i18nFinale.subscriptionPlansAdmin.presetDefaultsDescription')}
              </CardDescription>
              <p className="mt-2 text-xs text-muted-foreground/70 italic">
                {t('i18nFinale.subscriptionPlansAdmin.presetLocaleNote')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {editingPresets ? (
                <>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancelEditingPresets}
                    disabled={updatePresetsMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    {t('common.cancel')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={savePresets}
                    disabled={updatePresetsMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    {t('i18nFinale.subscriptionPlansAdmin.savePresets')}
                  </Button>
                </>
              ) : (
                <Button size="sm" variant="outline" onClick={startEditingPresets}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  {t('common.edit')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {editingPresets ? (
            <div className="space-y-4">
              {/* Language selector tabs */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium mr-1">
                  {t('i18nFinale.subscriptionPlansAdmin.presetLanguageSelectorLabel')}:
                </span>
                {SUPPORTED_LOCALES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => setPresetActiveLang(lang)}
                    className={`px-2 py-0.5 rounded text-xs font-mono border transition-colors ${
                      presetActiveLang === lang
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/60 hover:text-foreground'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              {/* Preset rows */}
              {Object.entries(presetDraft).length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  {t('i18nFinale.subscriptionPlansAdmin.noPresetsConfigured')}
                </p>
              )}
              {Object.entries(presetDraft).map(([key, localeMap], index) => (
                <div key={index} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start">
                  <Input
                    value={key}
                    onChange={(e) => updatePresetKey(key, e.target.value)}
                    placeholder={t('i18nFinale.subscriptionPlansAdmin.presetPlanNamePlaceholder')}
                    className="text-sm"
                  />
                  <Textarea
                    value={localeMap[presetActiveLang] ?? ''}
                    onChange={(e) => updatePresetLocaleValue(key, presetActiveLang, e.target.value)}
                    placeholder={t('i18nFinale.subscriptionPlansAdmin.presetDescriptionLabel')}
                    rows={2}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removePresetRow(key)}
                    className="mt-1"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={addPresetRow} className="gap-1">
                <Plus className="h-4 w-4" />
                {t('i18nFinale.subscriptionPlansAdmin.addPreset')}
              </Button>
            </div>
          ) : Object.keys(dbPresets).length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              {t('i18nFinale.subscriptionPlansAdmin.noPresetsConfigured')}
            </p>
          ) : (
            <div className="space-y-2">
              {Object.entries(dbPresets).map(([key, localeMap]) => {
                const lm = (typeof localeMap === 'object' && localeMap !== null) ? (localeMap as LocaleMap) : null;
                const stats = lm ? countFilledLocales(lm) : null;
                const tooltipText = stats
                  ? [
                      stats.filledList.length > 0 ? `✓ ${stats.filledList.join(', ')}` : '',
                      stats.emptyList.length > 0 ? `✗ ${stats.emptyList.join(', ')}` : '',
                    ].filter(Boolean).join('\n')
                  : '';
                const badgeVariant = stats
                  ? stats.filled === stats.total
                    ? 'default'
                    : stats.filled === 0
                      ? 'destructive'
                      : 'secondary'
                  : 'secondary';
                return (
                  <div key={key} className="grid grid-cols-[1fr_2fr_auto] gap-2 items-start text-sm">
                    <span className="font-medium pt-0.5">{key}</span>
                    <span className="text-muted-foreground">
                      {lm ? getPresetDisplayValue(lm) : (localeMap as string)}
                    </span>
                    {stats && (
                      <Badge
                        variant={badgeVariant}
                        className="text-xs font-mono cursor-default shrink-0 mt-0.5"
                        title={tooltipText}
                      >
                        {stats.filled} / {stats.total}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Separator />

      {plans?.map((plan) => {
        const isEditing = editingPlan === plan.id;

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
                            title={t('i18nFinale.subscriptionPlansAdmin.resetDescriptionHint')}
                            onClick={() => setEditForm({ ...editForm, description: getDefaultDescription(plan.name) || '' })}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            {t('i18nFinale.subscriptionPlansAdmin.resetDescription')}
                          </Button>
                        )}
                      </div>
                    ) : !plan.description ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="italic text-muted-foreground/60">{t('i18nFinale.subscriptionPlansAdmin.noDescription')}</span>
                        {getDefaultDescription(plan.name) && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                            title={t('i18nFinale.subscriptionPlansAdmin.resetDescriptionHint')}
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
