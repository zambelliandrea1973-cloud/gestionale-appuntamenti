import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle2, SendHorizontal, MessageSquare, ExternalLink, Mail } from 'lucide-react';

const NotificationTester: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [recipient, setRecipient] = useState('');
  const [message, setMessage] = useState(t('notificationTester.defaultMessage'));
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<'email' | 'whatsapp'>('email');
  const lastDefaultMessageRef = useRef(t('notificationTester.defaultMessage'));

  useEffect(() => {
    const newDefault = t('notificationTester.defaultMessage');
    setMessage((prev) => (prev === lastDefaultMessageRef.current ? newDefault : prev));
    lastDefaultMessageRef.current = newDefault;
  }, [i18n.language, t]);

  const handleSendTest = async () => {
    if (!recipient || !message) {
      toast({
        title: t('common.error'),
        description: selectedMethod === 'email'
          ? t('notificationTester.requiredEmailFields')
          : t('notificationTester.requiredPhoneFields'),
        variant: 'destructive'
      });
      return;
    }

    setIsSending(true);
    setResult(null);
    setError(null);

    try {
      const endpoint = selectedMethod === 'email'
        ? '/api/notification-settings/test-email'
        : '/api/test-whatsapp';

      const payload = selectedMethod === 'email'
        ? {
            to: recipient,
            subject: t('notificationTester.emailSubject'),
            message: message
          }
        : {
            phoneNumber: recipient,
            message: message
          };

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || data.message || t('notificationTester.unknownError'));
      }

      setResult(data);

      if (selectedMethod === 'email') {
        toast({
          title: t('notificationTester.emailToastTitle'),
          description: t('notificationTester.emailToastDescription'),
          variant: 'default'
        });
      } else {
        toast({
          title: t('notificationTester.whatsappToastTitle'),
          description: t('notificationTester.whatsappToastDescription'),
          variant: 'default'
        });
      }
    } catch (err: any) {
      console.error('Error sending message:', err);
      setError(err.message || t('notificationTester.unknownError'));

      toast({
        title: t('common.error'),
        description: err.message || t('notificationTester.sendErrorTitle'),
        variant: 'destructive'
      });
    } finally {
      setIsSending(false);
    }
  };

  const handleMethodChange = (method: 'email' | 'whatsapp') => {
    setSelectedMethod(method);
    setResult(null);
    setError(null);
    setRecipient('');
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle>{t('notificationTester.cardTitle')}</CardTitle>
        <CardDescription>
          {t('notificationTester.cardDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex border rounded-md overflow-hidden">
            <Button
              type="button"
              variant={selectedMethod === 'email' ? 'default' : 'outline'}
              className="flex-1 rounded-none"
              onClick={() => handleMethodChange('email')}
            >
              <Mail className="mr-2 h-4 w-4" />
              {t('notificationTester.emailTab')}
            </Button>
            <Button
              type="button"
              variant={selectedMethod === 'whatsapp' ? 'default' : 'outline'}
              className="flex-1 rounded-none"
              onClick={() => handleMethodChange('whatsapp')}
            >
              <MessageSquare className="mr-2 h-4 w-4" />
              {t('notificationTester.whatsappTab')}
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient">
              {selectedMethod === 'email' ? t('notificationTester.recipientEmail') : t('notificationTester.recipientPhone')}
            </Label>
            <Input
              id="recipient"
              value={recipient}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setRecipient(e.target.value)}
              placeholder={selectedMethod === 'email' ? t('notificationTester.emailPlaceholder') : t('notificationTester.phonePlaceholder')}
              className="w-full"
            />
            <p className="text-xs text-gray-500">
              {selectedMethod === 'email'
                ? t('notificationTester.emailHint')
                : t('notificationTester.phoneHint')}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">{t('notificationTester.messageLabel')}</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessage(e.target.value)}
              placeholder={t('notificationTester.messagePlaceholder')}
              className="w-full"
            />
          </div>

          <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm">
            <p className="font-medium text-blue-800">
              {selectedMethod === 'email'
                ? t('notificationTester.emailInfoTitle')
                : t('notificationTester.whatsappInfoTitle')}
            </p>
            <p className="mt-1 text-blue-700">
              {selectedMethod === 'email'
                ? t('notificationTester.emailInfoText')
                : t('notificationTester.whatsappInfoText')}
            </p>
          </div>

          {result && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-start">
                <CheckCircle2 className="h-5 w-5 text-green-500 mr-2 mt-0.5" />
                <div>
                  {selectedMethod === 'email' ? (
                    <>
                      <p className="font-medium text-green-800">{t('notificationTester.emailSentTitle')}</p>
                      <p className="mt-1 text-sm text-green-700">
                        {t('notificationTester.emailSentDescription', { recipient })}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium text-green-800">{t('notificationTester.whatsappLinkTitle')}</p>
                      {result.whatsappLink && (
                        <div className="mt-2">
                          <a
                            href={result.whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                          >
                            <ExternalLink className="h-4 w-4" />
                            {t('notificationTester.openWhatsappLink')}
                          </a>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">{t('notificationTester.sendErrorTitle')}</p>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={handleSendTest}
          disabled={isSending || !recipient || !message}
          className="w-full"
        >
          {isSending ? (
            <>
              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
              {selectedMethod === 'email' ? t('notificationTester.sendingEmail') : t('notificationTester.sendingWhatsapp')}
            </>
          ) : (
            <>
              <SendHorizontal className="mr-2 h-4 w-4" />
              {selectedMethod === 'email' ? t('notificationTester.sendEmailButton') : t('notificationTester.generateWhatsappButton')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default NotificationTester;
