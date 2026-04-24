import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link as LinkIcon, ExternalLink, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DirectLinkAccessProps {
  token?: string;
  clientId?: number;
}

export function DirectLinkAccess({ token, clientId }: DirectLinkAccessProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const getDirectLink = () => {
    const baseUrl = window.location.origin;
    if (token) {
      return `${baseUrl}/client-area?token=${token}`;
    }
    return `${baseUrl}/client-area`;
  };

  const directLink = getDirectLink();

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(directLink);
      setCopied(true);

      toast({
        title: t('directLinkAccess.copiedToastTitle'),
        description: t('directLinkAccess.copiedToastDescription'),
        variant: "default",
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Errore nella copia del link:", error);
      toast({
        title: t('common.error'),
        description: t('directLinkAccess.copyErrorDescription'),
        variant: "destructive",
      });
    }
  };

  const openDirectLink = () => {
    window.open(directLink, '_blank');
  };

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <Card className="mb-6 border-green-200 bg-green-50/50 overflow-hidden">
      <CardHeader
        className="pb-2 cursor-pointer hover:bg-green-100/50 transition-colors"
        onClick={toggleExpand}
      >
        <div className="flex justify-between items-center w-full">
          <CardTitle className="text-lg flex items-center">
            <LinkIcon className="mr-2 h-5 w-5" />
            {t('directLinkAccess.title')}
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
        {!expanded && (
          <CardDescription className="text-xs">
            {t('directLinkAccess.collapseHint')}
          </CardDescription>
        )}
      </CardHeader>

      {expanded && (
        <>
          <CardContent>
            <CardDescription className="mb-3">
              {t('directLinkAccess.bodyDescription')}
            </CardDescription>
            <div className="flex items-center space-x-2 mb-2">
              <Input
                value={directLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title={t('directLinkAccess.copyTitle')}
              >
                {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {token
                ? t('directLinkAccess.tokenNote')
                : t('directLinkAccess.noTokenNote')}
            </p>
          </CardContent>
          <CardFooter>
            <div className="flex w-full gap-2">
              <Button
                variant="default"
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={openDirectLink}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('directLinkAccess.openClientArea')}
              </Button>
              <Button
                variant="outline"
                className="w-auto"
                onClick={copyToClipboard}
              >
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {t('directLinkAccess.copyLinkButton')}
              </Button>
            </div>
          </CardFooter>
        </>
      )}
    </Card>
  );
}
