import React, { useState, useEffect } from 'react';
import { Mail, Phone, Globe, Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { ContactInfo, loadContactInfo, loadContactInfoFromAPI, formatContactInfo } from '@/lib/contactInfo';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { useUserWithLicense } from '@/hooks/use-user-with-license';

interface FooterContactIconsProps {
  ownerId?: number; // ID del proprietario (professionista) per mostrare i suoi contatti
}

export default function FooterContactIcons({ ownerId }: FooterContactIconsProps) {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});
  const { t } = useTranslation();
  const { user } = useUserWithLicense();

  // Funzione per caricare le informazioni di contatto con separazione utente
  const loadContactData = async () => {
    const targetUserId = ownerId || user?.id;
    if (!targetUserId) return;
    
    // Prima carica dal localStorage (per un caricamento veloce)
    const savedInfo = loadContactInfo(targetUserId);
    setContactInfo(savedInfo);
    
    // Poi tenta di caricare dall'API (per aggiornamenti)
    try {
      const apiInfo = await loadContactInfoFromAPI(targetUserId);
      console.log(`Informazioni di contatto caricate da API per utente ${targetUserId}:`, apiInfo);
      setContactInfo(apiInfo);
    } catch (error) {
      console.error("Errore durante il caricamento delle informazioni di contatto dall'API:", error);
    }
  };

  // Carica le informazioni all'avvio e quando cambia l'utente
  useEffect(() => {
    const targetUserId = ownerId || user?.id;
    if (targetUserId) {
      loadContactData();
    }
    
    // Aggiungi un event listener per aggiornare i contatti quando vengono salvati
    const handleStorageChange = (e: StorageEvent) => {
      const targetUserId = ownerId || user?.id;
      // Ricarica solo se è cambiato il localStorage per questo utente specifico
      if (e.key && e.key.includes(`healthcare_app_contact_info_user_${targetUserId}`)) {
        loadContactData();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    
    // Ascolta l'evento personalizzato dall'editor di contatti
    const handleContactInfoUpdated = (e: any) => {
      console.log("Evento contactInfoUpdated ricevuto:", e.detail);
      const targetUserId = ownerId || user?.id;
      // Verifica che l'evento sia per l'utente corrente
      if (e.detail && e.detail.userId === targetUserId) {
        if (e.detail.contactInfo) {
          setContactInfo(e.detail.contactInfo);
        } else {
          loadContactData();
        }
      }
    };
    
    window.addEventListener('contactInfoUpdated', handleContactInfoUpdated);
    
    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('contactInfoUpdated', handleContactInfoUpdated);
    };
  }, [user?.id, ownerId]);

  // RIDONDANZA ELIMINATA: Il componente già ascolta eventi storage e personalizzati
  // per gli aggiornamenti, non serve polling ogni 5 secondi che spreca risorse

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