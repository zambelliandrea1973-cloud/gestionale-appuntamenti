import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation, Trans } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Share2, QrCode, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getQueryFn } from "@/lib/queryClient";

interface AssignmentCodeData {
  assignmentCode: string;
  username: string;
  email: string;
}

export default function AssignmentCodeDisplay() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const { data: codeData, isLoading, refetch } = useQuery<AssignmentCodeData>({
    queryKey: ['/api/assignment-code'],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const copyToClipboard = async () => {
    if (!codeData?.assignmentCode) return;

    try {
      await navigator.clipboard.writeText(codeData.assignmentCode);
      setCopied(true);
      toast({
        title: t('assignmentCode.copiedTitle'),
        description: t('assignmentCode.copiedDescription'),
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('assignmentCode.copyErrorDescription'),
      });
    }
  };

  const shareCode = async () => {
    if (!codeData?.assignmentCode) return;

    const shareText = t('assignmentCode.shareText', { code: codeData.assignmentCode });

    if (navigator.share) {
      try {
        await navigator.share({
          title: t('assignmentCode.shareCardTitle'),
          text: shareText,
        });
      } catch (error) {
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="mr-2 h-5 w-5" />
            {t('assignmentCode.cardTitle')}
          </CardTitle>
          <CardDescription>
            {t('assignmentCode.loadingDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-16">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!codeData?.assignmentCode) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <QrCode className="mr-2 h-5 w-5" />
            {t('assignmentCode.cardTitle')}
          </CardTitle>
          <CardDescription>
            {t('assignmentCode.noCodeDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground">
            {t('assignmentCode.noCodeMessage')}
          </p>
          <Button onClick={() => refetch()} className="w-full mt-4">
            <RefreshCw className="mr-2 h-4 w-4" />
            {t('assignmentCode.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <QrCode className="mr-2 h-5 w-5" />
          {t('assignmentCode.cardTitle')}
        </CardTitle>
        <CardDescription>
          {t('assignmentCode.shareDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col space-y-4">
          <div>
            <label className="text-sm font-medium text-muted-foreground">
              {t('assignmentCode.yourCode')}
            </label>
            <div className="flex gap-2 mt-2">
              <Input
                value={codeData.assignmentCode}
                readOnly
                className="font-mono text-lg text-center bg-primary/10 border-primary/20"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title={t('assignmentCode.copyTitle')}
              >
                <Copy className={`h-4 w-4 ${copied ? 'text-green-600' : ''}`} />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={shareCode}
                title={t('assignmentCode.shareTitle')}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">{t('assignmentCode.howToTitle')}</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>
                <Trans
                  i18nKey="assignmentCode.howToStep1"
                  values={{ code: codeData.assignmentCode }}
                  components={[<span className="font-mono bg-blue-100 px-1 rounded" />]}
                />
              </li>
              <li>{t('assignmentCode.howToStep2')}</li>
              <li>{t('assignmentCode.howToStep3')}</li>
              <li>{t('assignmentCode.howToStep4')}</li>
            </ol>
          </div>

          <div className="text-xs text-muted-foreground">
            {t('assignmentCode.accountLabel', { email: codeData.email })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
