import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Brain, ArrowRight, ArrowLeft, Lightbulb, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface OnboardingProgress {
  id: number;
  userId: number;
  currentStep: number;
  completedSteps: number[];
  isCompleted: boolean;
  businessName?: string;
  businessType?: string;
  primaryServices?: string[];
  workingHours?: string;
  appointmentDuration?: number;
  clientManagementNeeds?: string[];
  communicationPreferences?: string[];
  integrationGoals?: string[];
  aiRecommendations?: string;
}

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
  recommendations?: string[];
}

const STEPS = [
  { title: 'Benvenuto', description: 'Iniziamo a configurare la tua attività' },
  { title: 'Informazioni Business', description: 'Parlaci della tua attività' },
  { title: 'Analisi AI', description: 'Lascia che l\'AI analizzi le tue esigenze' },
  { title: 'Servizi', description: 'Configura i tuoi servizi principali' },
  { title: 'Orari di Lavoro', description: 'Imposta i tuoi orari' },
  { title: 'Gestione Clienti', description: 'Come vuoi gestire i tuoi clienti' },
  { title: 'Comunicazione', description: 'Preferenze di comunicazione' },
  { title: 'Integrazioni', description: 'Servizi esterni da integrare' },
  { title: 'Completamento', description: 'Configurazione completata!' }
];

// Step 1: Welcome
const WelcomeStep = ({ onNext, isFirst, isLast }: StepProps) => (
  <Card className="max-w-2xl mx-auto">
    <CardHeader className="text-center">
      <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
        <Brain className="h-8 w-8 text-primary" />
      </div>
      <CardTitle className="text-2xl">Benvenuto nell'Onboarding Intelligente</CardTitle>
      <CardDescription className="text-lg">
        La nostra AI ti guiderà nella configurazione personalizzata della tua attività professionale
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
          <h3 className="font-semibold">Configurazione Rapida</h3>
          <p className="text-sm text-muted-foreground">Setup in pochi minuti</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <Brain className="h-8 w-8 text-blue-500 mx-auto mb-2" />
          <h3 className="font-semibold">Analisi AI</h3>
          <p className="text-sm text-muted-foreground">Raccomandazioni personalizzate</p>
        </div>
        <div className="text-center p-4 rounded-lg bg-muted/50">
          <Lightbulb className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
          <h3 className="font-semibold">Best Practices</h3>
          <p className="text-sm text-muted-foreground">Consigli da esperti</p>
        </div>
      </div>
      <div className="flex justify-center">
        <Button onClick={() => onNext({})} size="lg" className="px-8">
          Inizia Configurazione
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </CardContent>
  </Card>
);

// Step 2: Business Info
const BusinessInfoStep = ({ onNext, onPrevious, data, isFirst, isLast }: StepProps) => {
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
        <CardTitle>Informazioni sulla tua Attività</CardTitle>
        <CardDescription>
          Aiutaci a comprendere meglio la tua attività professionale
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="businessName">Nome dell'Attività *</Label>
          <Input
            id="businessName"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder="Es. Studio Medico Rossi"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="businessType">Tipo di Attività *</Label>
          <Input
            id="businessType"
            value={businessType}
            onChange={(e) => setBusinessType(e.target.value)}
            placeholder="Es. Medico, Fisioterapista, Consulente, Parrucchiere..."
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="description">Descrizione (opzionale)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrivi brevemente i tuoi servizi e la tua specializzazione..."
            rows={3}
          />
        </div>
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!businessName || !businessType}
          >
            Continua
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 3: AI Analysis
const AIAnalysisStep = ({ onNext, onPrevious, data, isFirst, isLast }: StepProps) => {
  const [analysis, setAnalysis] = useState<BusinessAnalysis | null>(null);
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
        title: "Errore nell'analisi",
        description: error.message || "Si è verificato un errore durante l'analisi AI",
        variant: "destructive"
      });
      setIsAnalyzing(false);
    }
  });

  useEffect(() => {
    if (data.businessName && data.businessType && !analysis && !isAnalyzing) {
      setIsAnalyzing(true);
      analyzeBusinessMutation.mutate(data);
    }
  }, [data]);

  const handleNext = () => {
    if (analysis) {
      onNext({ ...data, analysis });
    }
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Analisi AI in Corso
        </CardTitle>
        <CardDescription>
          La nostra AI sta analizzando le tue esigenze per fornirti raccomandazioni personalizzate
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {isAnalyzing ? (
          <div className="text-center py-8">
            <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
            <h3 className="text-lg font-semibold mb-2">Analisi in corso...</h3>
            <p className="text-muted-foreground">
              Stiamo elaborando le informazioni della tua attività "{data.businessName}"
            </p>
          </div>
        ) : analysis ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-semibold text-green-800 mb-2">✨ Analisi Completata</h3>
              <p className="text-green-700">
                Abbiamo identificato il tuo business come: <strong>{analysis.suggestedBusinessType}</strong>
              </p>
            </div>
            
            <div className="space-y-3">
              <div>
                <h4 className="font-semibold mb-2">Servizi Raccomandati:</h4>
                <div className="flex flex-wrap gap-2">
                  {analysis.recommendedServices.map((service, index) => (
                    <Badge key={index} variant="secondary">{service}</Badge>
                  ))}
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold mb-2">Consigli Personalizzati:</h4>
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
            <p className="text-muted-foreground">Caricamento analisi...</p>
          </div>
        )}
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>
          <Button 
            onClick={handleNext}
            disabled={!analysis}
          >
            Continua
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Step 4: Services Configuration
const ServicesStep = ({ onNext, onPrevious, data, isFirst, isLast, recommendations }: StepProps) => {
  const [selectedServices, setSelectedServices] = useState<string[]>(data.primaryServices || []);
  const [customService, setCustomService] = useState('');

  const recommendedServices = data.analysis?.recommendedServices || recommendations || [];

  const toggleService = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service) 
        ? prev.filter((s: string) => s !== service)
        : [...prev, service]
    );
  };

  const addCustomService = () => {
    if (customService && !selectedServices.includes(customService)) {
      setSelectedServices(prev => [...prev, customService]);
      setCustomService('');
    }
  };

  const handleNext = () => {
    onNext({ ...data, primaryServices: selectedServices });
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Configura i tuoi Servizi</CardTitle>
        <CardDescription>
          Seleziona i servizi che offri ai tuoi clienti
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {recommendedServices.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Servizi Raccomandati dall'AI:</h4>
            <div className="grid grid-cols-2 gap-2">
              {recommendedServices.map((service) => (
                <Button
                  key={service}
                  variant={selectedServices.includes(service) ? "default" : "outline"}
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
          <h4 className="font-semibold mb-3">Aggiungi Servizio Personalizzato:</h4>
          <div className="flex gap-2">
            <Input
              value={customService}
              onChange={(e) => setCustomService(e.target.value)}
              placeholder="Nome del servizio..."
              onKeyPress={(e) => e.key === 'Enter' && addCustomService()}
            />
            <Button onClick={addCustomService} variant="outline">
              Aggiungi
            </Button>
          </div>
        </div>
        
        {selectedServices.length > 0 && (
          <div>
            <h4 className="font-semibold mb-3">Servizi Selezionati:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedServices.map((service) => (
                <Badge 
                  key={service} 
                  variant="default" 
                  className="cursor-pointer"
                  onClick={() => toggleService(service)}
                >
                  {service} ×
                </Badge>
              ))}
            </div>
          </div>
        )}
        
        <div className="flex justify-between">
          <Button variant="outline" onClick={onPrevious}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Indietro
          </Button>
          <Button 
            onClick={handleNext}
            disabled={selectedServices.length === 0}
          >
            Continua
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// Main Onboarding Wizard Component
export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [stepData, setStepData] = useState<any>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['/api/onboarding/progress'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/onboarding/progress');
      return response.json();
    }
  });

  const updateStepMutation = useMutation({
    mutationFn: async ({ currentStep, stepData, completedSteps }: any) => {
      const response = await apiRequest('POST', '/api/onboarding/update-step', {
        currentStep,
        stepData,
        completedSteps
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/progress'] });
    }
  });

  const completeOnboardingMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/onboarding/complete');
      return response.json();
    },
    onSuccess: (result) => {
      toast({
        title: "Onboarding Completato!",
        description: result.welcomeMessage,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/onboarding/progress'] });
    }
  });

  useEffect(() => {
    if (progress && !progress.isCompleted) {
      setCurrentStep(progress.currentStep || 0);
      setStepData({
        businessName: progress.businessName,
        businessType: progress.businessType,
        primaryServices: progress.primaryServices,
        workingHours: progress.workingHours,
        appointmentDuration: progress.appointmentDuration,
        clientManagementNeeds: progress.clientManagementNeeds,
        communicationPreferences: progress.communicationPreferences,
        integrationGoals: progress.integrationGoals
      });
    }
  }, [progress]);

  const handleNext = (data: any) => {
    const newStepData = { ...stepData, ...data };
    const newCompletedSteps = [...(progress?.completedSteps || []), currentStep].filter((step, index, arr) => arr.indexOf(step) === index);
    
    setStepData(newStepData);
    
    if (currentStep < STEPS.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      updateStepMutation.mutate({
        currentStep: nextStep,
        stepData: newStepData,
        completedSteps: newCompletedSteps
      });
    } else {
      completeOnboardingMutation.mutate();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
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
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle>Onboarding Completato!</CardTitle>
            <CardDescription>
              La tua attività è stata configurata con successo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.href = '/'} size="lg">
              Vai alla Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const progressPercentage = ((currentStep + 1) / STEPS.length) * 100;

  const renderStep = () => {
    const stepProps: StepProps = {
      onNext: handleNext,
      onPrevious: handlePrevious,
      data: stepData,
      isFirst: currentStep === 0,
      isLast: currentStep === STEPS.length - 1
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
      default:
        return <WelcomeStep {...stepProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Configurazione Intelligente</h1>
          <p className="text-muted-foreground">
            Step {currentStep + 1} di {STEPS.length}: {STEPS[currentStep]?.title}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="max-w-2xl mx-auto mb-8">
          <Progress value={progressPercentage} className="mb-2" />
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progresso</span>
            <span>{Math.round(progressPercentage)}%</span>
          </div>
        </div>

        {/* Current Step */}
        {renderStep()}
      </div>
    </div>
  );
}