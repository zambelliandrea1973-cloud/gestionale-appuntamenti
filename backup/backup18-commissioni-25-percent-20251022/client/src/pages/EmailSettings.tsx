import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Loader2 } from "lucide-react";

// Questa pagina ora reindirizza semplicemente alla pagina principale delle impostazioni
// con la scheda email attiva, per evitare duplicazione di funzionalità
export default function EmailSettings() {
  const [, setLocation] = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    // Imposta la scheda attiva delle impostazioni e reindirizza
    localStorage.setItem('settings_active_tab', 'integrations');
    setLocation("/settings");
  }, [setLocation]);

  // Mostra un caricatore durante il reindirizzamento
  return (
    <div className="container mx-auto flex items-center justify-center min-h-screen">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-lg">{t('Reindirizzamento alle impostazioni email...')}</p>
      </div>
    </div>
  );
}