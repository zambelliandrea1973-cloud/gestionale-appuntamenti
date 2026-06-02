import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Globe, Facebook, Instagram } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  showFacebook?: boolean;
  showInstagram?: boolean;
}

interface ClientFooterContactIconsProps {
  ownerId?: number;
}

// Stesse icone 3D di FooterContactIcons — gradienti vividi stile iOS
const ICON_STYLES: Record<string, {
  gradient: string;
  shadow: string;
  icon: React.ReactNode;
  label: string;
}> = {
  email: {
    gradient: 'linear-gradient(135deg, #ff416c 0%, #ff4b2b 60%, #ff7e44 100%)',
    shadow: '0 4px 0 rgba(255,65,108,0.6), 0 6px 16px rgba(255,75,43,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Mail className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Email',
  },
  phone: {
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    shadow: '0 4px 0 rgba(17,153,142,0.6), 0 6px 16px rgba(56,239,125,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Phone className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Telefono',
  },
  phone1: {
    gradient: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    shadow: '0 4px 0 rgba(17,153,142,0.6), 0 6px 16px rgba(56,239,125,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Phone className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Telefono',
  },
  phone2: {
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    shadow: '0 4px 0 rgba(67,233,123,0.55), 0 6px 16px rgba(56,249,215,0.4), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Phone className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Cellulare',
  },
  website: {
    gradient: 'linear-gradient(135deg, #007AFF 0%, #30b3ff 55%, #5ce0e6 100%)',
    shadow: '0 4px 0 rgba(0,122,255,0.6), 0 6px 16px rgba(48,179,255,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Globe className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Sito web',
  },
  facebook: {
    gradient: 'linear-gradient(135deg, #4776e6 0%, #1877F2 40%, #8e54e9 100%)',
    shadow: '0 4px 0 rgba(71,118,230,0.6), 0 6px 16px rgba(24,119,242,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
    icon: <Facebook className="w-5 h-5 text-white drop-shadow-sm" />,
    label: 'Facebook',
  },
  instagram: {
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
            border: '1px solid rgba(0,0,0,0.18)',
            cursor: 'pointer',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
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

export default function ClientFooterContactIcons({ ownerId }: ClientFooterContactIconsProps) {
  const { t } = useTranslation();
  const [contactInfo, setContactInfo] = useState<ContactInfo>({});

  useEffect(() => {
    const load = async () => {
      try {
        const url = ownerId
          ? `/api/public/contact-info?ownerId=${ownerId}`
          : '/api/public/contact-info';
        const response = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
        if (response.ok) {
          const data = await response.json();
          setContactInfo(data);
          console.log('📞 [CLIENT FOOTER] Contact information loaded:', data);
        }
      } catch (error) {
        console.error('❌ [CLIENT FOOTER] Error loading contacts:', error);
      }
    };
    load();
  }, [ownerId]);

  const hasAny =
    (contactInfo.email && contactInfo.showEmail !== false) ||
    (contactInfo.phone && contactInfo.showPhone !== false) ||
    (contactInfo.phone1 && contactInfo.showPhone1 !== false) ||
    contactInfo.phone2 ||
    (contactInfo.website && contactInfo.showWebsite !== false) ||
    (contactInfo.facebook && contactInfo.showFacebook !== false) ||
    (contactInfo.instagram && contactInfo.showInstagram !== false);

  if (!hasAny) return null;

  const buttons: { key: string; href: string; tooltip: string }[] = [];
  if (contactInfo.email && contactInfo.showEmail !== false)
    buttons.push({ key: 'email', href: `mailto:${contactInfo.email}`, tooltip: contactInfo.email! });
  if (contactInfo.phone && contactInfo.showPhone !== false)
    buttons.push({ key: 'phone', href: `tel:${contactInfo.phone}`, tooltip: contactInfo.phone! });
  if (contactInfo.phone1 && contactInfo.showPhone1 !== false)
    buttons.push({ key: 'phone1', href: `tel:${contactInfo.phone1}`, tooltip: contactInfo.phone1! });
  if (contactInfo.phone2)
    buttons.push({ key: 'phone2', href: `tel:${contactInfo.phone2}`, tooltip: contactInfo.phone2! });
  if (contactInfo.website && contactInfo.showWebsite !== false)
    buttons.push({
      key: 'website',
      href: contactInfo.website.startsWith('http') ? contactInfo.website : `https://${contactInfo.website}`,
      tooltip: contactInfo.website!,
    });
  if (contactInfo.facebook && contactInfo.showFacebook !== false)
    buttons.push({
      key: 'facebook',
      href: contactInfo.facebook.startsWith('http') ? contactInfo.facebook : `https://facebook.com/${contactInfo.facebook}`,
      tooltip: 'Facebook',
    });
  if (contactInfo.instagram && contactInfo.showInstagram !== false)
    buttons.push({
      key: 'instagram',
      href: `https://instagram.com/${contactInfo.instagram.replace('@', '')}`,
      tooltip: `@${contactInfo.instagram.replace('@', '')}`,
    });

  return (
    <div className="mt-6 rounded-2xl border-2 border-green-300 bg-white shadow-sm overflow-hidden">
      {/* Header con nome studio */}
      <div className="py-3 px-4 bg-green-50 border-b border-green-200 text-center">
        <h4 className="font-semibold text-gray-700 text-base">
          {contactInfo.businessName || 'Studio Professionale'}
        </h4>
      </div>

      {/* Icone 3D */}
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

      {/* Dettagli testo */}
      <div className="px-4 pb-4 text-center space-y-1.5 text-sm text-gray-600">
        {contactInfo.email && contactInfo.showEmail !== false && (
          <p>
            <span className="font-medium">{t('i18nFinale.clientFooterContactIcons.emailLabel', 'Email:')}</span>{' '}
            <a href={`mailto:${contactInfo.email}`} className="text-blue-600 hover:text-blue-800">
              {contactInfo.email}
            </a>
          </p>
        )}
        {contactInfo.phone && contactInfo.showPhone !== false && (
          <p>
            <span className="font-medium">{t('i18nFinale.clientFooterContactIcons.phoneLabel', 'Telefono:')}</span>{' '}
            <a href={`tel:${contactInfo.phone}`} className="text-blue-600 hover:text-blue-800">
              {contactInfo.phone}
            </a>
          </p>
        )}
        {contactInfo.phone1 && contactInfo.showPhone1 !== false && (
          <p>
            <span className="font-medium">{t('i18nFinale.clientFooterContactIcons.cellularLabel', 'Cellulare:')}</span>{' '}
            <a href={`tel:${contactInfo.phone1}`} className="text-blue-600 hover:text-blue-800">
              {contactInfo.phone1}
            </a>
          </p>
        )}
        {contactInfo.website && contactInfo.showWebsite !== false && (
          <p>
            <span className="font-medium">{t('i18nFinale.clientFooterContactIcons.websiteLabel', 'Sito web:')}</span>{' '}
            <a
              href={contactInfo.website.startsWith('http') ? contactInfo.website : `https://${contactInfo.website}`}
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
              href={`https://instagram.com/${contactInfo.instagram.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              @{contactInfo.instagram.replace('@', '')}
            </a>
          </p>
        )}
      </div>

      {/* Footer legale */}
      <div className="px-4 pb-4 pt-2 border-t border-gray-100 text-xs text-gray-400 space-y-1 text-center">
        <p>
          <a href="/terms" target="_blank" className="hover:text-gray-600 underline">
            {t('i18nFinale.clientFooterContactIcons.termsOfService', 'Termini di Servizio')}
          </a>
          {' · '}
          <a href="/privacy" target="_blank" className="hover:text-gray-600 underline">
            {t('i18nFinale.clientFooterContactIcons.privacyPolicy', 'Privacy Policy')}
          </a>
        </p>
        <p>{t('i18nFinale.clientFooterContactIcons.developedBy', { author: 'Zambelli Andrea', defaultValue: '© Gestionale Appuntamenti by Zambelli Andrea' })}</p>
        <p>{t('i18nFinale.clientFooterContactIcons.versionLine', { version: '2.1.0', defaultValue: 'Versione 2.1.0' })}</p>
      </div>
    </div>
  );
}
