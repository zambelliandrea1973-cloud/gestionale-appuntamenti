import { useMemo, useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Building,
  Scissors,
  Users,
  Clock,
  ArrowRight,
  CheckCircle2,
  X,
  Compass,
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface OnboardingBannerProps {
  onDismiss: () => void;
}

interface ChecklistStep {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  titleKey: string;
  buttonKey: string;
  path: string;
  tab: string | null;
  done: boolean;
  // Coppia di classi Tailwind statiche per il colore pastello dell'icona
  // (un colore diverso per ogni passo, coerente con il modale WelcomeGuide).
  color: string;
}

export default function OnboardingBanner({ onDismiss }: OnboardingBannerProps) {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const [dismissing, setDismissing] = useState(false);

  const { data: services = [] } = useQuery<Array<{ id: number; isDemo?: boolean }>>({
    queryKey: ['/api/services'],
  });
  const { data: clients = [] } = useQuery<Array<{ id: number; isDemo?: boolean }>>({
    queryKey: ['/api/clients'],
  });
  const { data: businessData } = useQuery<{ companyName?: string }>({
    queryKey: ['/api/company-business-data'],
  });
  const { data: workingHours } = useQuery<{ dailySchedule?: unknown }>({
    queryKey: ['/api/working-hours'],
  });

  const steps: ChecklistStep[] = useMemo(() => {
    const realServices = services.filter((s) => !s.isDemo).length;
    const realClients = clients.filter((c) => !c.isDemo).length;
    const businessDone = !!(businessData?.companyName && businessData.companyName.trim().length > 0);
    const hoursDone = !!workingHours?.dailySchedule;

    return [
      {
        id: 'companyData',
        icon: Building,
        titleKey: 'welcomeGuide.steps.companyData.title',
        buttonKey: 'welcomeGuide.steps.companyData.button',
        path: '/settings',
        tab: 'appearance',
        done: businessDone,
        color: 'text-blue-600 bg-blue-100',
      },
      {
        id: 'services',
        icon: Scissors,
        titleKey: 'welcomeGuide.steps.services.title',
        buttonKey: 'welcomeGuide.steps.services.button',
        path: '/settings',
        tab: 'app',
        done: realServices > 0,
        color: 'text-purple-600 bg-purple-100',
      },
      {
        id: 'clients',
        icon: Users,
        titleKey: 'welcomeGuide.steps.clients.title',
        buttonKey: 'welcomeGuide.steps.clients.button',
        path: '/clients',
        tab: null,
        done: realClients > 0,
        color: 'text-green-600 bg-green-100',
      },
      {
        id: 'workingHours',
        icon: Clock,
        titleKey: 'welcomeGuide.steps.workingHours.title',
        buttonKey: 'welcomeGuide.steps.workingHours.button',
        path: '/settings',
        tab: 'contacts',
        done: hoursDone,
        color: 'text-orange-600 bg-orange-100',
      },
    ];
  }, [services, clients, businessData, workingHours]);

  const completed = steps.filter((s) => s.done).length;
  const total = steps.length;
  const progressPct = Math.round((completed / total) * 100);

  const handleNavigate = (path: string, tab: string | null) => {
    if (tab) localStorage.setItem('settings_active_tab', tab);
    setLocation(path);
  };

  const handleDismiss = async () => {
    setDismissing(true);
    try {
      await apiRequest('POST', '/api/hide-welcome-guide');
      queryClient.invalidateQueries({ queryKey: ['/api/user'] });
      queryClient.invalidateQueries({ queryKey: ['/api/user-with-license'] });
      onDismiss();
    } catch {
      toast({
        title: t('common.error'),
        description: t('common.tryAgain'),
        variant: 'destructive',
      });
    } finally {
      setDismissing(false);
    }
  };

  return (
    <Card
      data-testid="onboarding-banner"
      className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background shadow-sm"
    >
      <CardContent className="p-4 md:p-6 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="hidden sm:flex h-10 w-10 rounded-full bg-primary/10 items-center justify-center shrink-0">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-base md:text-lg font-semibold leading-tight">
                {t('onboarding.banner.title')}
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                {t('onboarding.banner.subtitle', { completed, total })}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            disabled={dismissing}
            className="shrink-0 h-8 w-8"
            data-testid="button-dismiss-onboarding"
            aria-label={t('onboarding.banner.dismiss')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-1">
          <Progress value={progressPct} className="h-1.5" />
          <p className="text-[11px] text-muted-foreground text-right">
            {progressPct}%
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => handleNavigate(step.path, step.tab)}
                data-testid={`onboarding-step-${step.id}`}
                className={`group flex items-center gap-3 rounded-md border p-3 text-left transition hover:border-primary/50 hover:bg-primary/5 ${
                  step.done ? 'bg-muted/40 border-muted' : 'bg-background'
                }`}
              >
                <div
                  className={`shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                    step.done
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
                      : step.color
                  }`}
                >
                  {step.done ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <Icon className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium truncate ${
                      step.done ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {t(step.titleKey)}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {step.done
                      ? t('onboarding.banner.stepDone')
                      : t(step.buttonKey)}
                  </p>
                </div>
                {!step.done && (
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation('/onboarding')}
            data-testid="button-take-tour"
            className="gap-2"
          >
            <Compass className="h-4 w-4" />
            {t('onboarding.banner.takeTour')}
          </Button>
          {completed === total && (
            <Button
              variant="default"
              size="sm"
              onClick={handleDismiss}
              disabled={dismissing}
              data-testid="button-finish-onboarding"
              className="gap-2"
            >
              <CheckCircle2 className="h-4 w-4" />
              {t('onboarding.banner.allDone')}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
