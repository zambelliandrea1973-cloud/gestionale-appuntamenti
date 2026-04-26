import { useState } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Sparkles, 
  Building, 
  Scissors, 
  Users, 
  Clock, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface WelcomeGuideProps {
  open: boolean;
  onClose: () => void;
}

const STEP_KEYS = [
  {
    icon: Building,
    titleKey: 'welcomeGuide.steps.companyData.title',
    descKey: 'welcomeGuide.steps.companyData.description',
    buttonKey: 'welcomeGuide.steps.companyData.button',
    path: '/settings',
    tab: 'appearance',
    color: 'text-white bg-gradient-to-br from-blue-500 to-blue-600 shadow-md shadow-blue-500/30',
  },
  {
    icon: Scissors,
    titleKey: 'welcomeGuide.steps.services.title',
    descKey: 'welcomeGuide.steps.services.description',
    buttonKey: 'welcomeGuide.steps.services.button',
    path: '/settings',
    tab: 'app',
    color: 'text-white bg-gradient-to-br from-purple-500 to-purple-600 shadow-md shadow-purple-500/30',
  },
  {
    icon: Users,
    titleKey: 'welcomeGuide.steps.clients.title',
    descKey: 'welcomeGuide.steps.clients.description',
    buttonKey: 'welcomeGuide.steps.clients.button',
    path: '/clients',
    tab: null,
    color: 'text-white bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-md shadow-emerald-500/30',
  },
  {
    icon: Clock,
    titleKey: 'welcomeGuide.steps.workingHours.title',
    descKey: 'welcomeGuide.steps.workingHours.description',
    buttonKey: 'welcomeGuide.steps.workingHours.button',
    path: '/settings',
    tab: 'contacts',
    color: 'text-white bg-gradient-to-br from-orange-500 to-orange-600 shadow-md shadow-orange-500/30',
  },
];

export default function WelcomeGuide({ open, onClose }: WelcomeGuideProps) {
  const [, setLocation] = useLocation();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleNavigate = (path: string, tab: string | null) => {
    if (tab) {
      localStorage.setItem('settings_active_tab', tab);
    }
    onClose();
    setLocation(path);
  };

  const handleClose = async () => {
    if (dontShowAgain) {
      try {
        await apiRequest('POST', '/api/hide-welcome-guide', { hide: true });
      } catch (error) {
        console.error('Errore nel nascondere la guida:', error);
      }
    }
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={() => handleClose()}>
      <DialogContent className="min-[1200px]:max-w-lg max-h-[90vh] overflow-y-auto welcome-guide-scroll relative">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            {t('welcomeGuide.title')}
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t('welcomeGuide.subtitle')}
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {STEP_KEYS.map((step, index) => (
            <Card key={index} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${step.color}`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                      <h4 className="font-semibold text-sm">{t(step.titleKey)}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                      {t(step.descKey)}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleNavigate(step.path, step.tab)}
                    >
                      {t(step.buttonKey)}
                      <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <DialogFooter className="flex-col gap-3 sm:flex-col">
          <div className="flex items-center gap-2">
            <Checkbox
              id="dont-show"
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked === true)}
            />
            <label htmlFor="dont-show" className="text-sm text-muted-foreground cursor-pointer">
              {t('welcomeGuide.dontShowAgain')}
            </label>
          </div>
          <Button onClick={handleClose} className="w-full">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {t('welcomeGuide.gotIt')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
