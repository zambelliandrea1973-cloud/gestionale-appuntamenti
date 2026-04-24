import React from 'react';
import { useTranslation, Trans } from 'react-i18next';
import Layout from '@/components/Layout';
import NotificationTester from '@/components/NotificationTester';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, MessageSquare, LucideSmartphone } from 'lucide-react';

const TestNotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  return (
    <Layout>
      <div className="container mx-auto py-6 px-4">
        <h1 className="text-2xl font-bold mb-6">{t('testNotificationsPage.pageTitle')}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <NotificationTester />
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>{t('testNotificationsPage.instructionsTitle')}</CardTitle>
                <CardDescription>
                  {t('testNotificationsPage.instructionsDescription')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-blue-500" />
                    {t('testNotificationsPage.emailNotificationsHeading')}
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {t('testNotificationsPage.emailNotificationsDescription')}
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                    <li>{t('testNotificationsPage.emailTipSmtp')}</li>
                    <li>
                      {t('testNotificationsPage.emailTipGmail')}{' '}
                      <a
                        href="https://myaccount.google.com/apppasswords"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {t('testNotificationsPage.emailTipGmailHere')}
                      </a>
                    </li>
                    <li>{t('testNotificationsPage.emailTipRecipient')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-green-500" />
                    {t('testNotificationsPage.whatsappHeading')}
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {t('testNotificationsPage.whatsappDescription')}
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                    <li>{t('testNotificationsPage.whatsappTipFormat')}</li>
                    <li>{t('testNotificationsPage.whatsappTipLink')}</li>
                    <li>
                      <Trans
                        i18nKey="testNotificationsPage.whatsappTipNumber"
                        components={[<strong />]}
                      />
                    </li>
                    <li>{t('testNotificationsPage.whatsappTipFree')}</li>
                  </ul>
                </div>

                <div>
                  <h3 className="font-medium mb-2 flex items-center gap-2">
                    <LucideSmartphone className="h-5 w-5 text-purple-500" />
                    {t('testNotificationsPage.remindersHeading')}
                  </h3>
                  <p className="text-gray-700 text-sm">
                    {t('testNotificationsPage.remindersDescription')}
                  </p>
                  <ul className="list-disc pl-5 mt-2 text-sm text-gray-700 space-y-1">
                    <li>{t('testNotificationsPage.remindersTipEmail')}</li>
                    <li>{t('testNotificationsPage.remindersTipWhatsapp')}</li>
                    <li>{t('testNotificationsPage.remindersTipTime')}</li>
                    <li>{t('testNotificationsPage.remindersTipTemplates')}</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TestNotificationsPage;
