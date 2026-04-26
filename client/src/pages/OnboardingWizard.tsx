// @ts-nocheck
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Brain, ArrowRight, ArrowLeft, Lightbulb, Loader2, Clock, Users, MessageSquare, Plug, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery, useMutation } from '@tanstack/react-query';

interface BusinessAnalysis {
  suggestedBusinessType: string;
  recommendedServices: string[];
  workingHoursRecommendation: string;
  clientManagementNeeds: string[];
  communicationPreferences: string[];
  integrationGoals: string[];
  personalizedTips: string[];
}

interface StepProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
  data: any;
  isFirst: boolean;
  isLast: boolean;
  isSaving?: boolean;
}

const STEP_KEYS = [
  { titleKey: 'welcome', descKey: 'welcomeDesc' },
  { titleKey: 'businessInfo', descKey: 'businessInfoDesc' },
  { titleKey: 'aiAnalysis', descKey: 'aiAnalysisDesc' },
  { titleKey: 'services', descKey: 'servicesDesc' },
  { titleKey: 'workingHours', descKey: 'workingHoursDesc' },
  { titleKey: 'clientManagement', descKey: 'clientManagementDesc' },
  { titleKey: 'communication', descKey: 'communicationDesc' },
  { titleKey: 'integrations', descKey: 'integrationsDesc' },
  { titleKey: 'completion', descKey: 'completionDesc' },
];

// Step 1: Welcome
const WelcomeStep = ({ onNext }: StepProps) => {
  const { t } = useTranslation();
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Brain className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">{t('onboardingWizard.welcome.title')}</CardTitle>
        <CardDescription className="text-lg">
          {t('onboardingWizard.welcome.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <h3 className="font-semibold">{t('onboardingWizard.welcome.quickSetup')}</h3>
            <p className="text-sm text-muted-foreground">{t('onboardingWizard.welcome.quickSetupDesc')}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <Brain className="h-8 w-8 text-blue-500 mx-auto mb-2" />
            <h3 className="font-semibold">{t('onboardingWizard.welcome.aiAnalysis')}</h3>
            <p className="text-sm text-muted-foreground">{t('onboardingWizard.welcome.aiAnalysisDesc')}</p>
          </div>
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <Lightbulb className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
            <h3 className="font-semibold">{t('onboardingWizard.welcome.bestPractices')}</h3>
            <p className="text-sm text-muted-foreground">{t('onboardingWizard.welcome.bestPracticesDesc')}</p>
          </div>
        </div>
        <div className="flex justify-center">
          <Button onClick={() => onNext({})} size="lg" className="px-8" data-testid="button-wizard-start">
            {t('onboardingWizard.welcome.startButton')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 2: Business Info
const BusinessInfoStep = ({ onNext, onPrevious, data }: StepProps) => {
  const { t } = useTranslation();
  const [businessName, setBusinessName] = useState(data.businessName || '');
  const [businessType, setBusinessType] = useState(data.businessType || '');
  const [description, setDescription] = useState(data.description || '');

  const handleNext = () => {
    if (!businessName || !businessType) return;
    onNext({ businessName, businessType, description });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('onboardingWizard.businessInfo.title')}</CardTitle>
        <CardDescription>{t('onboardingWizard.businessInfo.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="businessName">{t('onboardingWizard.businessInfo.businessName')}</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={t('onboardingWizard.businessInfo.businessNamePlaceholder')}
            data-testid="input-business-name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessType">{t('onboardingWizard.businessInfo.businessType')}</Label>
          <Input
            id="businessType"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder={t('onboardingWizard.businessInfo.businessTypePlaceholder')}
            data-testid="input-business-type"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">{t('onboardingWizard.businessInfo.descriptionLabel')}</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('onboardingWizard.businessInfo.descriptionPlaceholder')}
            rows={3}
            data-testid="input-business-description"
          />
        </div>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboardingWizard.previous')}
          </Button>
          <Button onClick={handleNext} disabled={!businessName || !businessType} data-testid="button-businessinfo-next">
            {t('onboardingWizard.continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 3: AI Analysis
const AIAnalysisStep = ({ onNext, onPrevious, data }: StepProps) => {
  const { t } = useTranslation();
  const [analysis, setAnalysis] = useState<BusinessAnalysis | null>(data.analysis || null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const analyzeBusinessMutation = useMutation({
    mutationFn: async (businessData: any) => {
      const response = await apiRequest('POST', '/api/onboarding/analyze', businessData);
      return response.json();
    },
    onSuccess: (result) => {
      setAnalysis(result);
      setIsAnalyzing(false);
    },
    onError: (error: any) => {
      toast({
        title: t('onboardingWizard.aiAnalysisStep.errorTitle'),
        description: error.message || t('onboardingWizard.aiAnalysisStep.errorDesc'),
        variant: 'destructive',
      });
      setIsAnalyzing(false);
    },
  });

  useEffect(() => {
    if (data.businessName && data.businessType && !analysis && !isAnalyzing) {
      setIsAnalyzing(true);
      analyzeBusinessMutation.mutate(data);
    }
  }, [data]);

  const handleNext = () => {
    if (analysis) onNext({ ...data, analysis });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          {t('onboardingWizard.aiAnalysisStep.title')}
        </CardTitle>
        <CardDescription>{t('onboardingWizard.aiAnalysisStep.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isAnalyzing ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">{t('onboardingWizard.aiAnalysisStep.analyzing')}</h3>
            <p className="text-muted-foreground">
              {t('onboardingWizard.aiAnalysisStep.processingFor', { name: data.businessName })}
            </p>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900">
              <h3 className="font-semibold text-green-800 dark:text-green-300 mb-2">
                {t('onboardingWizard.aiAnalysisStep.completed')}
              </h3>
              <p className="text-green-700 dark:text-green-400">
                {t('onboardingWizard.aiAnalysisStep.identifiedBusiness')}{' '}
                <strong>{analysis.suggestedBusinessType}</strong>
              </p>
            </div>
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">{t('onboardingWizard.aiAnalysisStep.recommendedServices')}</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendedServices.map((service, index) => (
                    <Badge key={index} variant="secondary">{service}</Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold mb-2">{t('onboardingWizard.aiAnalysisStep.personalizedTips')}</h4>
                <ul className="space-y-1">
                  {analysis.personalizedTips.map((tip, index) => (
                    <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                      <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">{t('onboardingWizard.aiAnalysisStep.loading')}</p>
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboardingWizard.previous')}
          </Button>
          <Button onClick={handleNext} disabled={!analysis} data-testid="button-ai-next">
            {t('onboardingWizard.continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 4: Services
const ServicesStep = ({ onNext, onPrevious, data }: StepProps) => {
  const { t } = useTranslation();
  const [selectedServices, setSelectedServices] = useState<string[]>(
    data.primaryServices && data.primaryServices.length > 0
      ? data.primaryServices
      : (data.analysis?.recommendedServices || [])
  );
  const [customService, setCustomService] = useState('');

  const recommendedServices = data.analysis?.recommendedServices || [];

  const toggleService = (service: string) => {
    setSelectedServices((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const addCustomService = () => {
    const trimmed = customService.trim();
    if (trimmed && !selectedServices.includes(trimmed)) {
      setSelectedServices((prev) => [...prev, trimmed]);
      setCustomService('');
    }
  };

  const handleNext = () => onNext({ ...data, primaryServices: selectedServices });

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>{t('onboardingWizard.servicesStep.title')}</CardTitle>
        <CardDescription>{t('onboardingWizard.servicesStep.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {recommendedServices.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">{t('onboardingWizard.servicesStep.aiRecommended')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {recommendedServices.map((service) => (
                <Button
                  key={service}
                  variant={selectedServices.includes(service) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => toggleService(service)}
                  className="justify-start"
                >
                  {selectedServices.includes(service) && <CheckCircle className="mr-2 h-4 w-4" />}
                  {service}
                </Button>
              ))}
            </div>
          </div>
        )}
        <div>
          <h4 className="font-semibold mb-3">{t('onboardingWizard.servicesStep.addCustom')}</h4>
          <div className="flex gap-2">
            <Input
              value={customService}
              onChange={(e) => setCustomService(e.target.value)}
              placeholder={t('onboardingWizard.servicesStep.customPlaceholder')}
              onKeyPress={(e) => e.key === 'Enter' && addCustomService()}
              data-testid="input-custom-service"
            />
            <Button onClick={addCustomService} variant="outline" data-testid="button-add-custom-service">
              {t('onboardingWizard.servicesStep.addButton')}
            </Button>
          </div>
        </div>
        {selectedServices.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">{t('onboardingWizard.servicesStep.selected')}</h4>
            <div className="flex flex-wrap gap-2">
              {selectedServices.map((service) => (
                <Badge key={service} variant="default" className="cursor-pointer" onClick={() => toggleService(service)}>
                  {service} ×
                </Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t('onboardingWizard.servicesStep.editLater')}
            </p>
          </div>
        )}
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboardingWizard.previous')}
          </Button>
          <Button onClick={handleNext} disabled={selectedServices.length === 0} data-testid="button-services-next">
            {t('onboardingWizard.continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 5: Working Hours
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const WorkingHoursStep = ({ onNext, onPrevious, data }: StepProps) => {
  const { t } = useTranslation();
  const [workingDays, setWorkingDays] = useState<string[]>(
    data.workingDays || ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
  );
  const [start, setStart] = useState<string>(data.workingHoursStart || '09:00');
  const [end, setEnd] = useState<string>(data.workingHoursEnd || '18:00');

  const toggleDay = (day: string) => {
    setWorkingDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  };

  const applyPreset = (days: string[], s: string, e: string) => {
    setWorkingDays(days);
    setStart(s);
    setEnd(e);
  };

  const handleNext = () => {
    onNext({
      ...data,
      workingDays,
      workingHoursStart: start,
      workingHoursEnd: end,
    });
  };

  const isValid = workingDays.length > 0 && start < end;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-orange-500" />
          {t('onboardingWizard.workingHoursStep.title')}
        </CardTitle>
        <CardDescription>{t('onboardingWizard.workingHoursStep.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h4 className="text-sm font-semibold mb-2">{t('onboardingWizard.workingHoursStep.presets')}</h4>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => applyPreset(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'], '09:00', '18:00')}>
              {t('onboardingWizard.workingHoursStep.presetMonFri')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], '09:00', '19:00')}>
              {t('onboardingWizard.workingHoursStep.presetMonSat')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => applyPreset(['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'], '10:00', '20:00')}>
              {t('onboardingWizard.workingHoursStep.presetTueSat')}
            </Button>
          </div>
        </div>

        <div>
          <h4 className="text-sm font-semibold mb-2">{t('onboardingWizard.workingHoursStep.daysLabel')}</h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {DAYS.map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => toggleDay(day)}
                data-testid={`button-day-${day}`}
                className={`px-3 py-2 text-sm rounded-md border transition ${
                  workingDays.includes(day)
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-background hover:bg-muted'
                }`}
              >
                {t(`onboardingWizard.workingHoursStep.days.${day}`)}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="wh-start">{t('onboardingWizard.workingHoursStep.startLabel')}</Label>
            <Input
              id="wh-start"
              type="time"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              data-testid="input-working-hours-start"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-end">{t('onboardingWizard.workingHoursStep.endLabel')}</Label>
            <Input
              id="wh-end"
              type="time"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              data-testid="input-working-hours-end"
            />
          </div>
        </div>

        {!isValid && (
          <p className="text-sm text-destructive">{t('onboardingWizard.workingHoursStep.invalidHint')}</p>
        )}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboardingWizard.previous')}
          </Button>
          <Button onClick={handleNext} disabled={!isValid} data-testid="button-working-hours-next">
            {t('onboardingWizard.continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 6: Client Management
const CLIENT_NEEDS = ['notes', 'history', 'payments', 'loyalty'];

const ClientManagementStep = ({ onNext, onPrevious, data }: StepProps) => {
  const { t } = useTranslation();
  const [needs, setNeeds] = useState<string[]>(
    data.clientManagementNeeds || ['notes', 'history']
  );

  const toggle = (n: string) => {
    setNeeds((prev) => (prev.includes(n) ? prev.filter((x) => x !== n) : [...prev, n]));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5 text-green-500" />
          {t('onboardingWizard.clientManagementStep.title')}
        </CardTitle>
        <CardDescription>{t('onboardingWizard.clientManagementStep.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {CLIENT_NEEDS.map((need) => (
            <label
              key={need}
              htmlFor={`cm-${need}`}
              className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                id={`cm-${need}`}
                checked={needs.includes(need)}
                onCheckedChange={() => toggle(need)}
                data-testid={`checkbox-need-${need}`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {t(`onboardingWizard.clientManagementStep.needs.${need}.title`)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`onboardingWizard.clientManagementStep.needs.${need}.desc`)}
                </p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('onboardingWizard.clientManagementStep.helpText')}
        </p>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboardingWizard.previous')}
          </Button>
          <Button onClick={() => onNext({ ...data, clientManagementNeeds: needs })} data-testid="button-clients-next">
            {t('onboardingWizard.continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 7: Communication
const COMM_OPTIONS = ['email', 'sms', 'whatsapp', 'push'];

const CommunicationStep = ({ onNext, onPrevious, data }: StepProps) => {
  const { t } = useTranslation();
  const [prefs, setPrefs] = useState<string[]>(
    data.communicationPreferences || ['email']
  );

  const toggle = (p: string) => {
    setPrefs((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-500" />
          {t('onboardingWizard.communicationStep.title')}
        </CardTitle>
        <CardDescription>{t('onboardingWizard.communicationStep.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {COMM_OPTIONS.map((opt) => (
            <label
              key={opt}
              htmlFor={`comm-${opt}`}
              className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                id={`comm-${opt}`}
                checked={prefs.includes(opt)}
                onCheckedChange={() => toggle(opt)}
                data-testid={`checkbox-comm-${opt}`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {t(`onboardingWizard.communicationStep.options.${opt}.title`)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`onboardingWizard.communicationStep.options.${opt}.desc`)}
                </p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('onboardingWizard.communicationStep.helpText')}
        </p>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboardingWizard.previous')}
          </Button>
          <Button onClick={() => onNext({ ...data, communicationPreferences: prefs })} data-testid="button-communication-next">
            {t('onboardingWizard.continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 8: Integrations
const INT_OPTIONS = ['googleCalendar', 'appleCalendar', 'outlook', 'payments'];

const IntegrationsStep = ({ onNext, onPrevious, data }: StepProps) => {
  const { t } = useTranslation();
  const [goals, setGoals] = useState<string[]>(data.integrationGoals || []);

  const toggle = (g: string) => {
    setGoals((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]));
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plug className="h-5 w-5 text-purple-500" />
          {t('onboardingWizard.integrationsStep.title')}
        </CardTitle>
        <CardDescription>{t('onboardingWizard.integrationsStep.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {INT_OPTIONS.map((opt) => (
            <label
              key={opt}
              htmlFor={`int-${opt}`}
              className="flex items-start gap-3 p-3 rounded-md border hover:bg-muted/50 cursor-pointer"
            >
              <Checkbox
                id={`int-${opt}`}
                checked={goals.includes(opt)}
                onCheckedChange={() => toggle(opt)}
                data-testid={`checkbox-int-${opt}`}
              />
              <div className="flex-1">
                <p className="text-sm font-medium">
                  {t(`onboardingWizard.integrationsStep.options.${opt}.title`)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t(`onboardingWizard.integrationsStep.options.${opt}.desc`)}
                </p>
              </div>
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {t('onboardingWizard.integrationsStep.helpText')}
        </p>
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboardingWizard.previous')}
          </Button>
          <Button onClick={() => onNext({ ...data, integrationGoals: goals })} data-testid="button-integrations-next">
            {t('onboardingWizard.continue')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 9: Completion (summary + save)
const CompletionStep = ({ onNext, onPrevious, data, isSaving }: StepProps) => {
  const { t } = useTranslation();
  const dayLabel = (d: string) => t(`onboardingWizard.workingHoursStep.days.${d}`);
  const hasBusiness = !!(data.businessName || data.businessType);
  const services: string[] = data.primaryServices || [];
  const days: string[] = data.workingDays || [];
  const start = data.workingHoursStart;
  const end = data.workingHoursEnd;

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="h-8 w-8 text-primary" />
        </div>
        <CardTitle>{t('onboardingWizard.completionStep.title')}</CardTitle>
        <CardDescription>{t('onboardingWizard.completionStep.description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3 text-sm">
          {hasBusiness && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900">
              <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t('onboardingWizard.completionStep.summary.business')}</p>
                <p className="text-muted-foreground">
                  {data.businessName} {data.businessType ? `· ${data.businessType}` : ''}
                </p>
              </div>
            </div>
          )}
          {services.length > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-purple-50 dark:bg-purple-950/30 border border-purple-100 dark:border-purple-900">
              <CheckCircle className="h-4 w-4 text-purple-600 dark:text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">
                  {t('onboardingWizard.completionStep.summary.services', { count: services.length })}
                </p>
                <p className="text-muted-foreground">{services.join(', ')}</p>
              </div>
            </div>
          )}
          {days.length > 0 && start && end && (
            <div className="flex items-start gap-2 p-3 rounded-md bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900">
              <CheckCircle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">{t('onboardingWizard.completionStep.summary.hours')}</p>
                <p className="text-muted-foreground">
                  {days.map(dayLabel).join(', ')} · {start}–{end}
                </p>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {t('onboardingWizard.completionStep.editHint')}
        </p>

        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={onPrevious} disabled={isSaving}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t('onboardingWizard.previous')}
          </Button>
          <Button onClick={() => onNext(data)} disabled={isSaving} size="lg" data-testid="button-finish-wizard">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('onboardingWizard.completionStep.saving')}
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('onboardingWizard.completionStep.finishButton')}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Wizard
export default function OnboardingWizard() {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<any>({});
  const { toast } = useToast();

  const { data: progress, isLoading } = useQuery<any>({
    queryKey: ['/api/onboarding/progress'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/onboarding/progress');
      return response.json();
    },
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ currentStep, stepData, completedSteps }: any) => {
      const response = await apiRequest('POST', '/api/onboarding/update-step', {
        currentStep,
        stepData,
        completedSteps,
      });
      return response.json();
    },
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async (finalData: any) => {
      const response = await apiRequest('POST', '/api/onboarding/complete', { stepData: finalData });
      return response.json();
    },
    onSuccess: (result) => {
      const applied = result?.applied || {};
      const parts: string[] = [];
      if (applied.businessData) parts.push(t('onboardingWizard.appliedToast.business'));
      if (applied.services > 0) parts.push(t('onboardingWizard.appliedToast.services', { count: applied.services }));
      if (applied.workingHours) parts.push(t('onboardingWizard.appliedToast.hours'));
      if (applied.preferences) parts.push(t('onboardingWizard.appliedToast.preferences'));
      toast({
        title: t('onboardingWizard.completedToastTitle'),
        description: parts.length > 0 ? parts.join(' · ') : result?.welcomeMessage,
      });
      // Invalida le cache delle entità che il wizard ha modificato
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/services'] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
      queryClient.invalidateQueries({ queryKey: ['/api/working-hours'] });
      queryClient.invalidateQueries({ queryKey: ['/api/company-business-data'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-settings'] });
    },
    onError: (error: any) => {
      toast({
        title: t('common.error'),
        description: error?.message || t('common.tryAgain'),
        variant: 'destructive',
      });
    },
  });

  useEffect(() => {
    if (progress && !progress.isCompleted) {
      setCurrentStep(progress.currentStep || 0);
      setStepData((prev: any) => ({
        ...prev,
        businessName: progress.businessName,
        businessType: progress.businessType,
        primaryServices: progress.primaryServices,
        workingDays: progress.workingDays,
        workingHoursStart: progress.workingHoursStart,
        workingHoursEnd: progress.workingHoursEnd,
        appointmentDuration: progress.appointmentDuration,
        clientManagementNeeds: progress.clientManagementNeeds,
        communicationPreferences: progress.communicationPreferences,
        integrationGoals: progress.integrationGoals,
      }));
    }
  }, [progress]);

  const handleNext = (data: any) => {
    const newStepData = { ...stepData, ...data };
    const newCompletedSteps = [
      ...(progress?.completedSteps || []),
      currentStep,
    ].filter((step, index, arr) => arr.indexOf(step) === index);

    setStepData(newStepData);

    if (currentStep < STEP_KEYS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      updateStepMutation.mutate({
        currentStep: nextStep,
        stepData: newStepData,
        completedSteps: newCompletedSteps,
      });
    } else {
      completeOnboardingMutation.mutate(newStepData);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (progress?.isCompleted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md mx-auto text-center">
          <CardHeader>
            <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <CardTitle>{t('onboardingWizard.completedTitle')}</CardTitle>
            <CardDescription>{t('onboardingWizard.completedDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = '/')} size="lg">
              {t('onboardingWizard.goToDashboard')}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = ((currentStep + 1) / STEP_KEYS.length) * 100;

  const renderStep = () => {
    const stepProps: StepProps = {
      onNext: handleNext,
      onPrevious: handlePrevious,
      data: stepData,
      isFirst: currentStep === 0,
      isLast: currentStep === STEP_KEYS.length - 1,
      isSaving: completeOnboardingMutation.isPending,
    };

    switch (currentStep) {
      case 0:
        return <WelcomeStep {...stepProps} />;
      case 1:
        return <BusinessInfoStep {...stepProps} />;
      case 2:
        return <AIAnalysisStep {...stepProps} />;
      case 3:
        return <ServicesStep {...stepProps} />;
      case 4:
        return <WorkingHoursStep {...stepProps} />;
      case 5:
        return <ClientManagementStep {...stepProps} />;
      case 6:
        return <CommunicationStep {...stepProps} />;
      case 7:
        return <IntegrationsStep {...stepProps} />;
      case 8:
        return <CompletionStep {...stepProps} />;
      default:
        return <WelcomeStep {...stepProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">{t('onboardingWizard.headerTitle')}</h1>
          <p className="text-muted-foreground">
            {t('onboardingWizard.stepLabel', {
              current: currentStep + 1,
              total: STEP_KEYS.length,
              title: t(`onboardingWizard.steps.${STEP_KEYS[currentStep]?.titleKey}`),
            })}
          </p>
        </div>
        <div className="max-w-2xl mx-auto mb-8">
          <Progress value={progressPercentage} className="mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>{t('onboardingWizard.progressLabel')}</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
        </div>
        {renderStep()}
      </div>
    </div>
  );
}
