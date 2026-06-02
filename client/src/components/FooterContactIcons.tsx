import React, { useState, useEffect } from 'react';
import { Mail, Phone, Globe, Facebook, Instagram } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { ContactInfo, loadContactInfo, loadContactInfoFromAPI, formatContactInfo } from '@/lib/contactInfo';
import { useUserWithLicense } from '@/hooks/use-user-with-license';

interface FooterContactIconsProps {
  ownerId?: number;
}

// Colori e stili per ogni tipo di contatto — stile "app icon" iOS
const ICON_STYLES: Record<string, { bg: string; icon: React.ReactNode; label: string }> = {
  email: {
    bg: 'bg-red-500',
    icon: <Mail className="w-5 h-5 text-white" />,
    label: 'Email',
  },
  phone1: {
    bg: 'bg-green-500',
    icon: <Phone className="w-5 h-5 text-white" />,
    label: 'Telefono',
  },
  phone2: {
    bg: 'bg-green-400',
    icon: <Phone className="w-5 h-5 text-white" />,
    label: 'Cellulare',
  },
  website: {
    bg: 'bg-blue-500',
    icon: <Globe className="w-5 h-5 text-white" />,
    label: 'Sito web',
  },
  facebook: {
    bg: 'bg-[#1877F2]',
    icon: <Facebook className="w-5 h-5 text-white" />,
    label: 'Facebook',
  },
  instagram: {
    bg: 'bg-gradient-to-br from-purple-500 via-pink-500 to-orange-400',
    icon: <Instagram className="w-5 h-5 text-white" />,
    label: 'Instagram',
  },
};

export default function FooterContactIcons({ ownerId }: FooterContactIconsProps) {
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});
  const { t } = useTranslation();
  const { user } = useUserWithLicense();

  const loadContactData = async () => {
    const targetUserId = ownerId || user?.id;
    if (!targetUserId) return;
    try {
      const apiInfo = await loadContactInfoFromAPI(targetUserId);
      console.log(`✅ Contact information loaded from API for user ${targetUserId}:`, apiInfo);
      setContactInfo(apiInfo);
    } catch (error) {
      console.error('❌ Error loading contact information from API:', error);
      const savedInfo = loadContactInfo(targetUserId);
      setContactInfo(savedInfo);
    }
  };

  useEffect(() => {
    const targetUserId = ownerId || user?.id;
    if (targetUserId) loadContactData();

    const handleStorageChange = (e: StorageEvent) => {
      const targetUserId = ownerId || user?.id;
      if (e.key && e.key.includes(`healthcare_app_contact_info_user_${targetUserId}`)) {
        loadContactData();
      }
    };
    const handleContactInfoUpdated = (e: any) => {
      const targetUserId = ownerId || user?.id;
      if (e.detail && e.detail.userId === targetUserId) {
        if (e.detail.contactInfo) setContactInfo(e.detail.contactInfo);
        else loadContactData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('contactInfoUpdated', handleContactInfoUpdated);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('contactInfoUpdated', handleContactInfoUpdated);
    };
  }, [user?.id, ownerId]);

  const hasAny =
    contactInfo.email || contactInfo.phone1 || contactInfo.phone2 ||
    contactInfo.website || contactInfo.facebook || contactInfo.instagram;

  if (!hasAny) {
    console.log('No contact information available');
    return null;
  }

  const buttons: { key: string; href: string; tooltip: string }[] = [];
  if (contactInfo.email)
    buttons.push({ key: 'email', href: `mailto:${contactInfo.email}`, tooltip: contactInfo.email! });
  if (contactInfo.phone1)
    buttons.push({ key: 'phone1', href: `tel:${contactInfo.phone1}`, tooltip: contactInfo.phone1! });
  if (contactInfo.phone2)
    buttons.push({ key: 'phone2', href: `tel:${contactInfo.phone2}`, tooltip: contactInfo.phone2! });
  if (contactInfo.website)
    buttons.push({ key: 'website', href: formatContactInfo('website', contactInfo.website), tooltip: contactInfo.website! });
  if (contactInfo.facebook)
    buttons.push({ key: 'facebook', href: formatContactInfo('facebook', contactInfo.facebook), tooltip: 'Facebook' });
  if (contactInfo.instagram)
    buttons.push({ key: 'instagram', href: formatContactInfo('instagram', contactInfo.instagram), tooltip: `@${contactInfo.instagram?.replace('@', '')}` });

  return (
    <div className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="py-2.5 px-4 bg-gray-50 border-b border-gray-100 text-center">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          {t('contacts.accessOurContacts', 'Accedi ai nostri contatti')}
        </p>
      </div>

      {/* Icons row */}
      <div className="py-4 px-4 flex flex-wrap gap-3 justify-center">
        <TooltipProvider>
          {buttons.map(({ key, href, tooltip }) => {
            const style = ICON_STYLES[key];
            return (
              <Tooltip key={key}>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => window.open(href, '_blank')}
                    className={`w-12 h-12 rounded-2xl ${style.bg} flex items-center justify-center shadow-sm hover:opacity-90 hover:scale-105 transition-all duration-150 active:scale-95`}
                    aria-label={style.label}
                  >
                    {style.icon}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
