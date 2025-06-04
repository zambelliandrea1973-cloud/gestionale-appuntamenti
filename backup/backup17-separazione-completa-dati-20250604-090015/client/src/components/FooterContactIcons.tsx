import React, { useState, useEffect } from 'react';
import { Mail, Phone, Globe, Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { ContactInfo, loadContactInfo, loadContactInfoFromAPI, formatContactInfo } from '@/lib/contactInfo';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

export default function FooterContactIcons() {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});
  const { t } = useTranslation();

  // Funzione per caricare le informazioni di contatto
  const loadContactData = async () => {
    // Prima carica dal localStorage (per un caricamento veloce)
    const savedInfo = loadContactInfo();
    setContactInfo(savedInfo);
    
    // Poi tenta di caricare dall'API (per aggiornamenti)
    try {
      const apiInfo = await loadContactInfoFromAPI();
      console.log("Informazioni di contatto caricate da API:", apiInfo);
      setContactInfo(apiInfo);
    } catch (error) {
      console.error("Errore durante il caricamento delle informazioni di contatto dall'API:", error);
    }
  };

  // Carica le informazioni all'avvio
  useEffect(() => {
    loadContactData();
    
    // Aggiungi un event listener per aggiornare i contatti quando vengono salvati
    window.addEventListener('storage', handleStorageChange);
    
    // Ascolta l'evento personalizzato dall'editor di contatti
    window.addEventListener('contactInfoUpdated', (e: any) => {
      console.log("Evento contactInfoUpdated ricevuto:", e.detail);
      if (e.detail && e.detail.contactInfo) {
        setContactInfo(e.detail.contactInfo);
      } else {
        loadContactData();
      }
    });
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('contactInfoUpdated', (e: any) => {});
    };
  }, []);
  
  // Gestisce i cambiamenti nel localStorage
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key === 'healthcare_app_contact_info') {
      loadContactData();
    }
  };

  // Verifica ogni 5 secondi se ci sono nuovi dati (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      console.log("Verifica periodica delle informazioni di contatto...");
      loadContactData();
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (!contactInfo.email && !contactInfo.phone1 && !contactInfo.phone2 && 
      !contactInfo.website && !contactInfo.facebook && !contactInfo.instagram) {
    console.log("Nessuna informazione di contatto disponibile");
    return null; // Non mostrare nulla se non ci sono informazioni di contatto
  }

  return (
    <Card className="border-2 border-primary/40 shadow-md bg-white/95 backdrop-blur-sm hover:shadow-lg transition-all">
      <CardHeader className="py-2 px-4 bg-primary/15 border-b border-primary/30">
        <h3 className="text-sm font-semibold text-primary text-center animate-pulse-slow">
          {t('contacts.accessOurContacts', 'Accedi ai nostri contatti')}
        </h3>
      </CardHeader>
      <CardContent className="p-3">
        <div className="flex flex-row flex-wrap gap-3 justify-center">
          <TooltipProvider>
            {contactInfo.email && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white hover:bg-primary/10 border-primary/30 transition-colors"
                    onClick={() => window.open(`mailto:${contactInfo.email}`, '_blank')}
                  >
                    <Mail className="h-5 w-5 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{contactInfo.email}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {contactInfo.phone1 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white hover:bg-primary/10 border-primary/30 transition-colors"
                    onClick={() => window.open(`tel:${contactInfo.phone1}`, '_blank')}
                  >
                    <Phone className="h-5 w-5 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{contactInfo.phone1}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {contactInfo.phone2 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white hover:bg-primary/10 border-primary/30 transition-colors"
                    onClick={() => window.open(`tel:${contactInfo.phone2}`, '_blank')}
                  >
                    <Phone className="h-5 w-5 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{contactInfo.phone2}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {contactInfo.website && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white hover:bg-primary/10 border-primary/30 transition-colors"
                    onClick={() => window.open(formatContactInfo('website', contactInfo.website), '_blank')}
                  >
                    <Globe className="h-5 w-5 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{contactInfo.website}</p>
                </TooltipContent>
              </Tooltip>
            )}

            {contactInfo.facebook && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white hover:bg-primary/10 border-primary/30 transition-colors"
                    onClick={() => window.open(formatContactInfo('facebook', contactInfo.facebook), '_blank')}
                  >
                    <Facebook className="h-5 w-5 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Facebook</p>
                </TooltipContent>
              </Tooltip>
            )}

            {contactInfo.instagram && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="h-10 w-10 rounded-full bg-white hover:bg-primary/10 border-primary/30 transition-colors"
                    onClick={() => window.open(formatContactInfo('instagram', contactInfo.instagram), '_blank')}
                  >
                    <Instagram className="h-5 w-5 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Instagram</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
        </div>
      </CardContent>
    </Card>
  );
}