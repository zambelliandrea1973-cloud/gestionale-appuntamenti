import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export default function BetaPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [feedbackData, setFeedbackData] = useState({
    feedbackType: 'general',
    content: '',
    rating: 5
  });

  const verifyCode = useMutation({
    mutationFn: async (data: { inviteCode: string, email: string }) => {
      const res = await apiRequest('GET', `/api/beta/verify/${data.inviteCode}`);
      const responseData = await res.json();
      localStorage.setItem('betaRegistrationEmail', data.email);
      return { ...responseData, email: data.email };
    },
    onSuccess: (data) => {
      if (data.valid) {
        if (user) {
          useCodeMutation.mutate(code);
        } else {
          toast({
            title: t('betaPage.toast.codeValid'),
            description: t('betaPage.toast.codeValidDesc'),
            variant: 'default',
          });
          localStorage.setItem('betaInviteCode', code);
          localStorage.setItem('betaInviteEmail', data.email);
          localStorage.setItem('betaInviteStatus', 'valid');
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
        }
      } else {
        toast({
          title: t('betaPage.toast.codeInvalid'),
          description: data.message || t('betaPage.toast.codeInvalidDesc'),
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('betaPage.toast.error'),
        description: t('betaPage.toast.verifyError'),
        variant: 'destructive',
      });
    }
  });

  const useCodeMutation = useMutation({
    mutationFn: async (inviteCode: string) => {
      const res = await apiRequest('POST', `/api/beta/use/${inviteCode}`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: t('betaPage.toast.codeUsed'),
          description: t('betaPage.toast.codeUsedDesc'),
          variant: 'default',
        });
        setLocation('/subscribe');
      } else {
        toast({
          title: t('betaPage.toast.error'),
          description: data.message || t('betaPage.toast.useError'),
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('betaPage.toast.error'),
        description: t('betaPage.toast.useError'),
        variant: 'destructive',
      });
    }
  });

  const sendFeedbackMutation = useMutation({
    mutationFn: async (data: typeof feedbackData) => {
      const res = await apiRequest('POST', '/api/beta/feedback', data);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: t('betaPage.toast.feedbackSent'),
          description: t('betaPage.toast.feedbackSentDesc'),
          variant: 'default',
        });
        setFeedbackData({
          feedbackType: 'general',
          content: '',
          rating: 5
        });
      } else {
        toast({
          title: t('betaPage.toast.error'),
          description: data.message || t('betaPage.toast.feedbackError'),
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('betaPage.toast.error'),
        description: t('betaPage.toast.feedbackError'),
        variant: 'destructive',
      });
    }
  });

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code) {
      toast({
        title: t('betaPage.toast.codeMissing'),
        description: t('betaPage.toast.codeMissingDesc'),
        variant: 'destructive',
      });
      return;
    }

    if (!email || !validateEmail(email)) {
      toast({
        title: t('betaPage.toast.emailInvalid'),
        description: t('betaPage.toast.emailInvalidDesc'),
        variant: 'destructive',
      });
      return;
    }

    verifyCode.mutate({ inviteCode: code, email });
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendFeedback = (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackData.content) {
      toast({
        title: t('betaPage.toast.feedbackMissing'),
        description: t('betaPage.toast.feedbackMissingDesc'),
        variant: 'destructive',
      });
      return;
    }
    sendFeedbackMutation.mutate(feedbackData);
  };

  return (
    <div className="container py-10 mx-auto">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-extrabold tracking-tight text-center mb-10">{t('betaPage.title')}</h1>

        <div className="grid gap-8 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('betaPage.access.title')}</CardTitle>
              <CardDescription>
                {t('betaPage.access.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="inviteCode">{t('betaPage.inviteCode')}</Label>
                  <Input
                    id="inviteCode"
                    placeholder={t('betaPage.inviteCodePlaceholder')}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="inviteEmail">{t('betaPage.email')}</Label>
                  <Input
                    id="inviteEmail"
                    type="email"
                    placeholder={t('betaPage.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    {t('betaPage.emailHint')}
                  </p>
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={verifyCode.isPending || !code || !email}
                >
                  {verifyCode.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('betaPage.verifying')}
                    </>
                  ) : (
                    t('betaPage.verifyButton')
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('betaPage.feedback.title')}</CardTitle>
              <CardDescription>
                {t('betaPage.feedback.description')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSendFeedback} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="feedbackType">{t('betaPage.feedback.type')}</Label>
                  <select
                    id="feedbackType"
                    className="w-full p-2 border rounded-md"
                    value={feedbackData.feedbackType}
                    onChange={(e) => setFeedbackData({...feedbackData, feedbackType: e.target.value})}
                  >
                    <option value="general">{t('betaPage.feedback.general')}</option>
                    <option value="bug">{t('betaPage.feedback.bug')}</option>
                    <option value="feature">{t('betaPage.feedback.feature')}</option>
                    <option value="usability">{t('betaPage.feedback.usability')}</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="content">{t('betaPage.feedback.yourFeedback')}</Label>
                  <textarea
                    id="content"
                    rows={4}
                    className="w-full p-2 border rounded-md"
                    placeholder={t('betaPage.feedback.placeholder')}
                    value={feedbackData.content}
                    onChange={(e) => setFeedbackData({...feedbackData, content: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rating">{t('betaPage.feedback.rating')}</Label>
                  <Input
                    id="rating"
                    type="number"
                    min="1"
                    max="5"
                    value={feedbackData.rating}
                    onChange={(e) => setFeedbackData({...feedbackData, rating: parseInt(e.target.value)})}
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendFeedbackMutation.isPending || !feedbackData.content}
                >
                  {sendFeedbackMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('betaPage.feedback.sending')}
                    </>
                  ) : (
                    t('betaPage.feedback.send')
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('betaPage.howItWorks.title')}</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('betaPage.howItWorks.description')}
          </p>

          <div className="grid gap-6 md:grid-cols-3 mt-8">
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-bold mb-2">{t('betaPage.steps.code.title')}</h3>
              <p>{t('betaPage.steps.code.description')}</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-bold mb-2">{t('betaPage.steps.explore.title')}</h3>
              <p>{t('betaPage.steps.explore.description')}</p>
            </div>
            <div className="p-6 border rounded-lg">
              <h3 className="text-xl font-bold mb-2">{t('betaPage.steps.feedback.title')}</h3>
              <p>{t('betaPage.steps.feedback.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
