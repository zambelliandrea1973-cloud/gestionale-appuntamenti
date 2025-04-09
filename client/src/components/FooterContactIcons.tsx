import React, { useState, useEffect } from 'react';
import { Mail, Phone, Globe, Facebook, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { ContactInfo, loadContactInfo, formatContactInfo } from '@/lib/contactInfo';

export default function FooterContactIcons() {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});
  const { t } = useTranslation();

  useEffect(() => {
    // Carica le informazioni di contatto dal localStorage
    const savedInfo = loadContactInfo();
    setContactInfo(savedInfo);
  }, []);

  if (!contactInfo.email && !contactInfo.phone1 && !contactInfo.phone2 && 
      !contactInfo.website && !contactInfo.facebook && !contactInfo.instagram) {
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
                className="text-primary hover:text-primary-dark"
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
                className="text-primary hover:text-primary-dark"
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
                className="text-primary hover:text-primary-dark"
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
                className="text-primary hover:text-primary-dark"
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
                className="text-primary hover:text-primary-dark"
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
                className="text-primary hover:text-primary-dark"
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