import React, { useState, useEffect } from 'react';
import { Mail, Phone, Globe, Facebook, Instagram } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useTranslation } from 'react-i18next';
import { ContactInfo, loadContactInfo, loadContactInfoFromAPI, formatContactInfo } from '@/lib/contactInfo';
import { useUserWithLicense } from '@/hooks/use-user-with-license';

interface FooterContactIconsProps {
  ownerId?: number;
}

// Stile 3D per ogni icona — tutti i colori vividi e saturi, nessun tono scuro (come Instagram)
const ICON_STYLES: Record<string, {
  gradient: string;
  shadow: string;
  icon: React.ReactNode;
  label: string;
}> = {
  email: {
    // Rosa acceso → rosso fuoco → arancio caldo — vivido come iOS
    gradient: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 60%, #ff7e44 100%)',
    shadow: '0 4px 0 rgba(255,65,108,0.6), 0 6px 16px rgba(255,75,43,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Mail className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Email',
  },
  phone1: {
    // Teal brillante → verde lime vivido — WhatsApp vibrancy
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    shadow: '0 4px 0 rgba(17,153,142,0.6), 0 6px 16px rgba(56,239,125,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Phone className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Telefono',
  },
  phone2: {
    // Verde menta vivido → ciano brillante
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    shadow: '0 4px 0 rgba(67,233,123,0.55), 0 6px 16px rgba(56,249,215,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Phone className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Cellulare',
  },
  website: {
    // iOS Safari: blu elettrico → azzurro cielo brillante → ciano
    gradient: 'linear-gradient(135deg, #007AFF 0%, #30b3ff 55%, #5ce0e6 100%)',
    shadow: '0 4px 0 rgba(0,122,255,0.6), 0 6px 16px rgba(48,179,255,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Globe className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Sito web',
  },
  facebook: {
    // Blu vivido → viola-blu elettrico (shift hue come Instagram)
    gradient: 'linear-gradient(135deg, #4776e6 0%, #1877F2 40%, #8e54e9 100%)',
    shadow: '0 4px 0 rgba(71,118,230,0.6), 0 6px 16px rgba(24,119,242,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Facebook className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Facebook',
  },
  instagram: {
    // Gradiente Instagram ufficiale: viola → magenta → rosso → arancio → giallo
    gradient: 'linear-gradient(135deg, #833ab4 0%, #c13584 30%, #e1306c 55%, #f77737 80%, #fcaf45 100%)',
    shadow: '0 4px 0 rgba(131,58,180,0.6), 0 6px 16px rgba(193,53,132,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Instagram className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Instagram',
  },
};

function Icon3DButton({
  gradient,
  shadow,
  icon,
  label,
  tooltip,
  href,
}: {
  gradient: string;
  shadow: string;
  icon: React.ReactNode;
  label: string;
  tooltip: string;
  href: string;
}) {
  const [pressed, setPressed] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          aria-label={label}
          onMouseDown={() => setPressed(true)}
          onMouseUp={() => setPressed(false)}
          onMouseLeave={() => setPressed(false)}
          onTouchStart={() => setPressed(true)}
          onTouchEnd={() => setPressed(false)}
          onClick={() => window.open(href, '_blank')}
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: gradient,
            boxShadow: pressed
              ? '0 1px 0 rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)'
              : shadow,
            transform: pressed ? 'translateY(3px)' : 'translateY(0)',
            transition: 'box-shadow 0.1s ease, transform 0.1s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Gloss overlay — striscia chiara in cima */}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '45%',
              background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0))',
              borderRadius: '14px 14px 50% 50%',
              pointerEvents: 'none',
            }}
          />
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

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
      setContactInfo(loadContactInfo(targetUserId));
    }
  };

  useEffect(() => {
    const targetUserId = ownerId || user?.id;
    if (targetUserId) loadContactData();

    const handleStorageChange = (e: StorageEvent) => {
      const uid = ownerId || user?.id;
      if (e.key?.includes(`healthcare_app_contact_info_user_${uid}`)) loadContactData();
    };
    const handleContactInfoUpdated = (e: any) => {
      const uid = ownerId || user?.id;
      if (e.detail?.userId === uid) {
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
      <div className="py-2.5 px-4 bg-gray-50 border-b border-gray-100 text-center">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {t('contacts.accessOurContacts', 'Accedi ai nostri contatti')}
        </p>
      </div>
      <div className="py-5 px-4 flex flex-wrap gap-4 justify-center">
        <TooltipProvider>
          {buttons.map(({ key, href, tooltip }) => {
            const style = ICON_STYLES[key];
            return (
              <Icon3DButton
                key={key}
                gradient={style.gradient}
                shadow={style.shadow}
                icon={style.icon}
                label={style.label}
                tooltip={tooltip}
                href={href}
              />
            );
          })}
        </TooltipProvider>
      </div>
    </div>
  );
}
