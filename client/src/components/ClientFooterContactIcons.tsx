import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Mail, Phone, Globe, Facebook, Instagram } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';

interface ContactInfo {
  businessName?: string;
  email?: string;
  phone?: string;
  phone1?: string;
  phone2?: string;
  website?: string;
  facebook?: string;
  instagram?: string;
}

interface ClientFooterContactIconsProps {
  ownerId?: number;
}

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
  gradient, shadow, icon, label, tooltip, href,
}: {
  gradient: string; shadow: string; icon: React.ReactNode;
  label: string; tooltip: string; href: string;
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
            width: 52, height: 52, borderRadius: 14,
            background: gradient,
            boxShadow: pressed
              ? '0 1px 0 rgba(0,0,0,0.3), 0 2px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.15)'
              : shadow,
            transform: pressed ? 'translateY(3px)' : 'translateY(0)',
            transition: 'box-shadow 0.1s ease, transform 0.1s ease',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(0,0,0,0.18)', cursor: 'pointer',
            position: 'relative', overflow: 'hidden',
          }}
        >
          <span aria-hidden style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: '45%',
            background: 'linear-gradient(to bottom, rgba(255,255,255,0.22), rgba(255,255,255,0))',
            borderRadius: '14px 14px 50% 50%', pointerEvents: 'none',
          }} />
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent><p>{tooltip}</p></TooltipContent>
    </Tooltip>
  );
}

export default function ClientFooterContactIcons({ ownerId }: ClientFooterContactIconsProps) {
  const { t } = useTranslation();

  const { data: contactInfo, isLoading } = useQuery<ContactInfo>({
    queryKey: ['/api/contact-info', ownerId],
    queryFn: async () => {
      if (!ownerId) return {};
      const res = await fetch(`/api/contact-info/${ownerId}`);
      if (!res.ok) return {};
      return res.json();
    },
    enabled: !!ownerId,
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });

  const info = contactInfo ?? {};
  const hasAny =
    info.email || info.phone || info.phone1 || info.phone2 ||
    info.website || info.facebook || info.instagram;

  if (isLoading) {
    return (
      <div className="mt-6 rounded-2xl border-2 border-green-200 bg-white shadow-sm overflow-hidden animate-pulse">
        <div className="py-3 px-4 bg-green-50 border-b border-green-100">
          <div className="h-4 bg-green-100 rounded w-40 mx-auto" />
        </div>
        <div className="py-5 px-4 flex gap-4 justify-center">
          {[1, 2, 3, 4].map(i => <div key={i} className="w-12 h-12 rounded-2xl bg-gray-100" />)}
        </div>
      </div>
    );
  }

  if (!hasAny) return null;

  const buttons: { key: string; href: string; tooltip: string }[] = [];
  if (info.email)
    buttons.push({ key: 'email', href: `mailto:${info.email}`, tooltip: info.email! });
  if (info.phone)
    buttons.push({ key: 'phone', href: `tel:${info.phone}`, tooltip: info.phone! });
  if (info.phone1)
    buttons.push({ key: 'phone1', href: `tel:${info.phone1}`, tooltip: info.phone1! });
  if (info.phone2)
    buttons.push({ key: 'phone2', href: `tel:${info.phone2}`, tooltip: info.phone2! });
  if (info.website)
    buttons.push({
      key: 'website',
      href: info.website.startsWith('http') ? info.website : `https://${info.website}`,
      tooltip: info.website!,
    });
  if (info.facebook)
    buttons.push({
      key: 'facebook',
      href: info.facebook.startsWith('http') ? info.facebook : `https://facebook.com/${info.facebook}`,
      tooltip: 'Facebook',
    });
  if (info.instagram)
    buttons.push({
      key: 'instagram',
      href: `https://instagram.com/${info.instagram.replace('@', '')}`,
      tooltip: `@${info.instagram.replace('@', '')}`,
    });

  return (
    <div className="mt-6 rounded-2xl border-2 border-green-300 bg-white shadow-sm overflow-hidden">
      <div className="py-3 px-4 bg-green-50 border-b border-green-200 text-center">
        <h4 className="font-semibold text-gray-700 text-base">
          {info.businessName || t('contacts.accessOurContacts', 'Accedi ai nostri contatti')}
        </h4>
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

      <div className="px-4 pb-4 text-center space-y-1.5 text-sm text-gray-600">
        {info.email && (
          <p>
            <span className="font-medium">{t('i18nFinale.clientFooterContactIcons.emailLabel', 'Email:')}</span>{' '}
            <a href={`mailto:${info.email}`} className="text-blue-600 hover:text-blue-800">{info.email}</a>
          </p>
        )}
        {(info.phone || info.phone1) && (
          <p>
            <span className="font-medium">{t('i18nFinale.clientFooterContactIcons.phoneLabel', 'Telefono:')}</span>{' '}
            <a href={`tel:${info.phone || info.phone1}`} className="text-blue-600 hover:text-blue-800">
              {info.phone || info.phone1}
            </a>
          </p>
        )}
        {info.website && (
          <p>
            <span className="font-medium">{t('i18nFinale.clientFooterContactIcons.websiteLabel', 'Sito web:')}</span>{' '}
            <a
              href={info.website.startsWith('http') ? info.website : `https://${info.website}`}
              target="_blank" rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              {info.website}
            </a>
          </p>
        )}
        {info.instagram && (
          <p>
            <span className="font-medium">Instagram:</span>{' '}
            <a
              href={`https://instagram.com/${info.instagram.replace('@', '')}`}
              target="_blank" rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800"
            >
              @{info.instagram.replace('@', '')}
            </a>
          </p>
        )}
      </div>

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
