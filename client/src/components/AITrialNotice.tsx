import { useTranslation } from 'react-i18next';
import { Link } from 'wouter';
import { useAITrialAccess } from '@/hooks/use-ai-trial-access';

export function AITrialNotice({
  feature, activeConversation = false, blocked = false
}: {
  feature: 'appointments' | 'marketing';
  activeConversation?: boolean;
  blocked?: boolean;
}) {
  const { t } = useTranslation();
  const { data } = useAITrialAccess();
  if (!blocked && (!data || data.unlimited)) return null;
  const exhausted = blocked || Boolean(data &&
    (!data.eligible || (data[feature].remaining === 0 && !activeConversation)));
  return (
    <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
      role={exhausted ? 'alert' : 'status'} data-testid={`ai-trial-notice-${feature}`}>
      {exhausted
        ? <p>{t(data && !data.eligible ? 'aiTrial.trialExpired' : 'aiTrial.limitReached')}</p>
        : <p>{t('aiTrial.usage', { used: data![feature].used, limit: data![feature].limit })}</p>}
      {exhausted && (
        <Link href="/subscribe"
          className="mt-2 inline-flex rounded-md bg-primary px-3 py-2 font-medium text-primary-foreground"
          data-testid={`ai-trial-subscribe-${feature}`}>
          {t('aiTrial.subscribe')}
        </Link>
      )}
    </div>
  );
}