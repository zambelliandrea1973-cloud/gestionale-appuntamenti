import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DirectLinkAccess } from '@/components/DirectLinkAccess';

export default function DirectAccess() {
  const { t } = useTranslation();
  const [location] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [clientId, setClientId] = useState<number | null>(null);

  useEffect(() => {
    // Estrae il token e il clientId dall'URL
    const params = new URLSearchParams(window.location.search);
    const tokenParam = params.get('token');
    const clientIdParam = params.get('clientId');

    if (tokenParam && clientIdParam) {
      setToken(tokenParam);
      setClientId(Number(clientIdParam));
    }
  }, [location]);

  if (!token || !clientId) {
    return (
      <div className="container mx-auto p-4 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t('i18nFinale.directAccess.invalidLink')}</h1>
          <p className="text-muted-foreground">
            {t('i18nFinale.directAccess.missingParams')}
          </p>
        </div>
      </div>
    );
  }

  return <DirectLinkAccess token={token} clientId={clientId} />;
}