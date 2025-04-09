import React, { useState, useEffect } from 'react';
import { Mail, Phone, Globe, Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { ContactInfo, loadContactInfo, loadContactInfoFromAPI, formatContactInfo } from '@/lib/contactInfo';

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

  // Verifica ogni 2 secondi se ci sono nuovi dati (fallback)
  useEffect(() => {
    const interval = setInterval(() => {
      loadContactData();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  if (!contactInfo.email && !contactInfo.phone1 && !contactInfo.phone2 && 
      !contactInfo.website && !contactInfo.facebook && !contactInfo.instagram) {
    console.log("Nessuna informazione di contatto disponibile");
    return null; // Non mostrare nulla se non ci sono informazioni di contatto
  }

  return (
    <div className="flex space-x-4">
      <TooltipProvider>
        {contactInfo.email && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="link" 
                size="icon"
                className="text-primary hover:text-primary-dark p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => window.open(`mailto:${contactInfo.email}`, '_blank')}
              >
                <Mail className="h-5 w-5" />
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
                variant="link" 
                size="icon"
                className="text-primary hover:text-primary-dark p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => window.open(`tel:${contactInfo.phone1}`, '_blank')}
              >
                <Phone className="h-5 w-5" />
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
                variant="link" 
                size="icon"
                className="text-primary hover:text-primary-dark p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => window.open(`tel:${contactInfo.phone2}`, '_blank')}
              >
                <Phone className="h-5 w-5" />
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
                variant="link" 
                size="icon"
                className="text-primary hover:text-primary-dark p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => window.open(formatContactInfo('website', contactInfo.website), '_blank')}
              >
                <Globe className="h-5 w-5" />
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
                variant="link" 
                size="icon"
                className="text-primary hover:text-primary-dark p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => window.open(formatContactInfo('facebook', contactInfo.facebook), '_blank')}
              >
                <Facebook className="h-5 w-5" />
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
                variant="link" 
                size="icon"
                className="text-primary hover:text-primary-dark p-1 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                onClick={() => window.open(formatContactInfo('instagram', contactInfo.instagram), '_blank')}
              >
                <Instagram className="h-5 w-5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Instagram</p>
            </TooltipContent>
          </Tooltip>
        )}
      </TooltipProvider>
    </div>
  );
}