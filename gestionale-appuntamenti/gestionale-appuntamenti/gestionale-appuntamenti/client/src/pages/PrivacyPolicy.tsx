import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export default function PrivacyPolicy() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <div className="container max-w-4xl py-12">
        <Link to="/">
          <Button variant="outline" size="sm" className="mb-6" data-testid="button-back-home">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('privacy.backButton')}
          </Button>
        </Link>

        <article className="prose dark:prose-invert max-w-none">
          <h1>{t('privacy.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('privacy.lastUpdated')}</p>

          <h2>{t('privacy.sections.intro.title')}</h2>
          <p>{t('privacy.sections.intro.text1')}</p>
          <p>{t('privacy.sections.intro.text2')}</p>

          <h2>{t('privacy.sections.dataCollection.title')}</h2>
          <p>{t('privacy.sections.dataCollection.subtitle')}</p>

          <h3>{t('privacy.sections.dataCollection.typesTitle')}</h3>
          <ul>
            <li><strong>{t('privacy.sections.dataCollection.types.personal')}</strong></li>
            <li><strong>{t('privacy.sections.dataCollection.types.usage')}</strong></li>
            <li><strong>{t('privacy.sections.dataCollection.types.calendar')}</strong></li>
            <li><strong>{t('privacy.sections.dataCollection.types.payment')}</strong></li>
            <li><strong>{t('privacy.sections.dataCollection.types.google')}</strong></li>
          </ul>

          <h3>{t('privacy.sections.dataCollection.usageTitle')}</h3>
          <p>{t('privacy.sections.dataCollection.usageSubtitle')}</p>
          <ul>
            <li>{t('privacy.sections.dataCollection.usageItems.provide')}</li>
            <li>{t('privacy.sections.dataCollection.usageItems.notify')}</li>
            <li>{t('privacy.sections.dataCollection.usageItems.interactive')}</li>
            <li>{t('privacy.sections.dataCollection.usageItems.support')}</li>
            <li>{t('privacy.sections.dataCollection.usageItems.analytics')}</li>
            <li>{t('privacy.sections.dataCollection.usageItems.monitor')}</li>
            <li>{t('privacy.sections.dataCollection.usageItems.security')}</li>
          </ul>

          <h2>{t('privacy.sections.dataSecurity.title')}</h2>
          <p>{t('privacy.sections.dataSecurity.text')}</p>

          <h2>{t('privacy.sections.googleCalendar.title')}</h2>
          <p>{t('privacy.sections.googleCalendar.text')}</p>
          <ul>
            <li>{t('privacy.sections.googleCalendar.items.token')}</li>
            <li>{t('privacy.sections.googleCalendar.items.appointments')}</li>
            <li>{t('privacy.sections.googleCalendar.items.events')}</li>
          </ul>
          <p>{t('privacy.sections.googleCalendar.footer')}</p>

          <h2>{t('privacy.sections.cookies.title')}</h2>
          <p>{t('privacy.sections.cookies.text')}</p>

          <h2>{t('privacy.sections.thirdParty.title')}</h2>
          <p>{t('privacy.sections.thirdParty.text')}</p>

          <h2>{t('privacy.sections.userRights.title')}</h2>
          <p>{t('privacy.sections.userRights.text')}</p>
          <ul>
            <li>{t('privacy.sections.userRights.items.access')}</li>
            <li>{t('privacy.sections.userRights.items.correct')}</li>
            <li>{t('privacy.sections.userRights.items.delete')}</li>
            <li>{t('privacy.sections.userRights.items.object')}</li>
            <li>{t('privacy.sections.userRights.items.restrict')}</li>
            <li>{t('privacy.sections.userRights.items.portability')}</li>
          </ul>

          <h2>{t('privacy.sections.contact.title')}</h2>
          <p>{t('privacy.sections.contact.text')}</p>

          <h2>{t('privacy.sections.changes.title')}</h2>
          <p>{t('privacy.sections.changes.text')}</p>
        </article>
      </div>
    </div>
  );
}
