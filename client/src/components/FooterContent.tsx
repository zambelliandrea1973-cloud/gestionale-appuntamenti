import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function FooterContent() {
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [showSupportDialog, setShowSupportDialog] = useState(false);

  return (
    <div className="flex space-x-4">
      <Button variant="link" onClick={() => setShowSupportDialog(true)} className="text-primary hover:text-primary-dark text-sm">
        {t('common.support', 'Supporto')}
      </Button>
      <Button variant="link" onClick={() => navigate('/privacy')} className="text-primary hover:text-primary-dark text-sm">
        Privacy Policy
      </Button>
      <Button variant="link" onClick={() => navigate('/terms')} className="text-primary hover:text-primary-dark text-sm">
        {t('common.terms', 'Termini di Servizio')}
      </Button>

      {/* Support Dialog */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>{t('common.support', 'Supporto')}</DialogTitle>
            <DialogDescription>
              {/* Description can be empty */}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Centro Assistenza</h2>
            
            <div className="grid gap-4 md:grid-cols-2 mt-4">
              <div className="bg-background rounded-lg p-4 border shadow-sm">
                <h3 className="text-lg font-medium">Assistenza via Email</h3>
                <p className="mt-2">Per qualsiasi domanda o problema, scrivici a:</p>
                <p className="font-medium mt-1">support@gestionale-appuntamenti.it</p>
                <p className="text-muted-foreground text-sm mt-2">Risposta garantita entro 24 ore</p>
              </div>
              
              <div className="bg-background rounded-lg p-4 border shadow-sm">
                <h3 className="text-lg font-medium">Assistenza Telefonica</h3>
                <p className="mt-2">Chiama il nostro numero di supporto:</p>
                <p className="font-medium mt-1">+41 077 401 35 05</p>
                <p className="text-muted-foreground text-sm mt-2">Disponibile dal lunedì al venerdì, 9:00-18:00</p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSupportDialog(false)}>{t('common.close', 'Chiudi')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
