import { useState } from 'react';
import { useLocation } from 'wouter';
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

const STEPS = [
  {
    icon: Building,
    title: 'Dati Aziendali',
    description: 'Inserisci il nome della tua attività, indirizzo, email e telefono. Questi dati appariranno nelle comunicazioni ai clienti.',
    path: '/settings',
    tab: 'appearance',
    buttonLabel: 'Vai a Dati Aziendali',
    color: 'text-blue-600 bg-blue-100',
  },
  {
    icon: Scissors,
    title: 'Servizi / Trattamenti',
    description: 'Aggiungi i servizi che offri con durata e prezzo. Serviranno per creare appuntamenti e calcolare i costi.',
    path: '/settings',
    tab: 'app',
    buttonLabel: 'Vai ai Servizi',
    color: 'text-purple-600 bg-purple-100',
  },
  {
    icon: Users,
    title: 'Clienti',
    description: 'Aggiungi i tuoi clienti con nome, telefono ed email. Potrai anche importarli dai contatti Google o da un file CSV.',
    path: '/clients',
    tab: null,
    buttonLabel: 'Vai ai Clienti',
    color: 'text-green-600 bg-green-100',
  },
  {
    icon: Clock,
    title: 'Orari di Lavoro',
    description: 'Configura i giorni e gli orari di apertura del tuo studio. I clienti vedranno solo gli slot disponibili.',
    path: '/settings',
    tab: 'contacts',
    buttonLabel: 'Vai agli Orari',
    color: 'text-orange-600 bg-orange-100',
  },
];

export default function WelcomeGuide({ open, onClose }: WelcomeGuideProps) {
  const [, setLocation] = useLocation();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const { toast } = useToast();

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
      <DialogContent className="md:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-center pb-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl">
            Benvenuto nel tuo gestionale!
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Per iniziare al meglio, completa questi passaggi fondamentali:
          </p>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {STEPS.map((step, index) => (
            <Card key={index} className="border hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${step.color}`}>
                    <step.icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                      <h4 className="font-semibold text-sm">{step.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                      {step.description}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleNavigate(step.path, step.tab)}
                    >
                      {step.buttonLabel}
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
              Non mostrare più questo messaggio
            </label>
          </div>
          <Button onClick={handleClose} className="w-full">
            <CheckCircle2 className="mr-2 h-4 w-4" />
            Ho capito, iniziamo!
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}