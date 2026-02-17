import React, { useState, useEffect } from 'react';
import { Mail, Phone, Globe, Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

interface ContactInfo {
  businessName?: string;
  email?: string;
  phone?: string;
  phone1?: string;
  phone2?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
  showEmail?: boolean;
  showPhone?: boolean;
  showPhone1?: boolean;
  showWebsite?: boolean;
  showInstagram?: boolean;
}

export default function ClientFooterContactIcons() {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});

  // Funzione per caricare le informazioni di contatto dall'endpoint pubblico
  const loadContactData = async () => {
    try {
      const response = await fetch('/api/public/contact-info', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContactInfo(data);
        console.log('📞 [CLIENT FOOTER] Informazioni contatto caricate:', data);
      }
    } catch (error) {
      console.error('❌ [CLIENT FOOTER] Errore caricamento contatti:', error);
    }
  };

  useEffect(() => {
    loadContactData();
  }, []);

  // Se non ci sono informazioni di contatto, non mostrare nulla
  if (!contactInfo.email && !contactInfo.phone1 && !contactInfo.phone && 
      !contactInfo.website && !contactInfo.instagram) {
    return null;
  }

  return (
    <div className="mt-8">
      <Card className="bg-gray-50">
        <CardHeader className="pb-4">
          <h4 className="font-medium text-gray-800 text-center">
            {contactInfo.businessName || 'Studio Professionale'}
          </h4>
        </CardHeader>
        <CardContent className="space-y-3">
          <TooltipProvider>
            <div className="flex justify-center space-x-4">
              {contactInfo.email && contactInfo.showEmail !== false && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => window.location.href = `mailto:${contactInfo.email}`}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{contactInfo.email}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {contactInfo.phone && contactInfo.showPhone !== false && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => window.location.href = `tel:${contactInfo.phone}`}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{contactInfo.phone}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {contactInfo.phone1 && contactInfo.showPhone1 !== false && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => window.location.href = `tel:${contactInfo.phone1}`}
                    >
                      <Phone className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{contactInfo.phone1}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {contactInfo.website && contactInfo.showWebsite !== false && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => window.open(
                        contactInfo.website?.startsWith('http') 
                          ? contactInfo.website 
                          : `https://${contactInfo.website}`, 
                        '_blank'
                      )}
                    >
                      <Globe className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{contactInfo.website}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {contactInfo.instagram && contactInfo.showInstagram !== false && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0"
                      onClick={() => window.open(
                        `https://instagram.com/${contactInfo.instagram?.replace('@', '')}`, 
                        '_blank'
                      )}
                    >
                      <Instagram className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>@{contactInfo.instagram?.replace('@', '')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>

          {/* Informazioni dettagliate in formato testo */}
          <div className="text-center space-y-2 text-sm text-gray-600">
            {contactInfo.email && contactInfo.showEmail !== false && (
              <p>
                <span className="font-medium">Email:</span>{' '}
                <a 
                  href={`mailto:${contactInfo.email}`} 
                  className="text-blue-600 hover:text-blue-800"
                >
                  {contactInfo.email}
                </a>
              </p>
            )}
            
            {contactInfo.phone && contactInfo.showPhone !== false && (
              <p>
                <span className="font-medium">Telefono:</span>{' '}
                <a 
                  href={`tel:${contactInfo.phone}`} 
                  className="text-blue-600 hover:text-blue-800"
                >
                  {contactInfo.phone}
                </a>
              </p>
            )}

            {contactInfo.phone1 && contactInfo.showPhone1 !== false && (
              <p>
                <span className="font-medium">Cellulare:</span>{' '}
                <a 
                  href={`tel:${contactInfo.phone1}`} 
                  className="text-blue-600 hover:text-blue-800"
                >
                  {contactInfo.phone1}
                </a>
              </p>
            )}
            
            {contactInfo.website && contactInfo.showWebsite !== false && (
              <p>
                <span className="font-medium">Sito web:</span>{' '}
                <a 
                  href={contactInfo.website?.startsWith('http') ? contactInfo.website : `https://${contactInfo.website}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-800"
                >
                  {contactInfo.website}
                </a>
              </p>
            )}
            
            {contactInfo.instagram && contactInfo.showInstagram !== false && (
              <p>
                <span className="font-medium">Instagram:</span>{' '}
                <a 
                  href={`https://instagram.com/${contactInfo.instagram?.replace('@', '')}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:text-blue-800"
                >
                  @{contactInfo.instagram?.replace('@', '')}
                </a>
              </p>
            )}
          </div>
          
          <div className="pt-2 border-t border-gray-300 text-xs text-gray-500 space-y-1 text-center">
            <p>
              <a 
                href="/terms" 
                target="_blank" 
                className="text-gray-600 hover:text-gray-800 underline"
              >
                Termini di Servizio
              </a>
              {' · '}
              <a 
                href="/privacy" 
                target="_blank" 
                className="text-gray-600 hover:text-gray-800 underline"
              >
                Privacy Policy
              </a>
            </p>
            <p>Sviluppato da Zambelli Andrea</p>
            <p>Versione 2.1.0 - Gestionale Sanitario PWA</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}