import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { InfoIcon, SendIcon, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const WhatsAppConfigHelper: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [configStatus, setConfigStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testData, setTestData] = useState({
    phoneNumber: '',
    message: t('whatsappConfigHelper.testMessageDefault')
  });
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    fetchConfigStatus();
  }, []);

  const fetchConfigStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/messaging-config-status');
      const data = await response.json();
      setConfigStatus(data);
    } catch (error) {
      console.error('Error fetching configuration status:', error);
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('whatsappConfigHelper.errors.fetchStatus')
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestSend = async () => {
    if (!testData.phoneNumber) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('whatsappConfigHelper.errors.invalidPhone')
      });
      return;
    }

    try {
      setIsTesting(true);
      setTestResult(null);
      
      const response = await apiRequest('POST', '/api/test-whatsapp', {
        to: testData.phoneNumber,
        message: testData.message
      });
      
      const result = await response.json();
      setTestResult(result);
      
      if (response.ok) {
        toast({
          title: t('whatsappConfigHelper.linkGeneratedTitle'),
          description: t('whatsappConfigHelper.linkGeneratedDesc'),
          variant: "default"
        });
      } else {
        toast({
          title: t('whatsappConfigHelper.errors.generationTitle'),
          description: result.message || t('whatsappConfigHelper.errors.generationDesc'),
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Error during test:', error);
      setTestResult({
        success: false,
        message: t('whatsappConfigHelper.errors.connectionTest')
      });
      toast({
        variant: "destructive",
        title: t('whatsappConfigHelper.errors.connectionTitle'),
        description: t('whatsappConfigHelper.errors.testFailed')
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>{t('whatsappConfigHelper.title')}</CardTitle>
          <CardDescription>{t('whatsappConfigHelper.statusChecking')}</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </CardContent>
      </Card>
    );
  }

  const isConfigured = configStatus?.config?.status === 'configurata';

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {t('whatsappConfigHelper.messagingTitle')}
          {isConfigured ? (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              {t('whatsappConfigHelper.configured')}
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
              {t('whatsappConfigHelper.configRequired')}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {t('whatsappConfigHelper.cardDescription')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="font-medium">{t('whatsappConfigHelper.statusLabel')}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="flex items-center gap-2">
              <span>{t('whatsappConfigHelper.emailConfigured')}</span>
              {configStatus?.config?.emailConfigured ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <span>{t('whatsappConfigHelper.phoneNumberLabel')}</span>
              {configStatus?.config?.whatsappConfigured ? (
                <div className="flex gap-1 items-center">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="text-sm text-muted-foreground">{configStatus?.config?.professionalPhone}</span>
                </div>
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
        </div>
        
        <Separator />
        
        {!configStatus?.config?.whatsappConfigured && (
          <div className="bg-amber-50 p-4 rounded-md border border-amber-200">
            <div className="flex gap-2 items-start">
              <InfoIcon className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-800">{t('whatsappConfigHelper.configRequired')}</h4>
                <p className="text-sm text-amber-700 mt-1">{t('whatsappConfigHelper.configRequiredDesc')}</p>
              </div>
            </div>
            
            <div className="mt-3 text-sm text-amber-700 space-y-2">
              <p className="font-medium">{t('whatsappConfigHelper.stepsTitle')}</p>
              <ol className="list-decimal pl-5 space-y-1">
                <li>{t('whatsappConfigHelper.step1')}</li>
                <li>{t('whatsappConfigHelper.step2')}</li>
                <li>{t('whatsappConfigHelper.step3')}</li>
                <li>{t('whatsappConfigHelper.step4')}</li>
              </ol>
            </div>
          </div>
        )}
        
        <div className="bg-green-50 p-4 rounded-md border border-green-200">
          <div className="flex gap-2 items-start">
            <InfoIcon className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <h4 className="font-medium text-green-800">{t('whatsappConfigHelper.directMethodTitle')}</h4>
              <p className="text-sm text-green-700 mt-1">
                {t('whatsappConfigHelper.directMethodDesc1')}
              </p>
              <p className="text-sm text-green-700 mt-2">
                {t('whatsappConfigHelper.directMethodDesc2')}
              </p>
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="font-medium mb-2">{t('whatsappConfigHelper.testSendTitle')}</h3>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="phoneNumber">{t('whatsappConfigHelper.phoneInternationalLabel')}</Label>
              <Input
                id="phoneNumber"
                placeholder="+39xxxxxxxxxx"
                value={testData.phoneNumber}
                onChange={(e) => setTestData({...testData, phoneNumber: e.target.value})}
              />
              <p className="text-xs text-muted-foreground">
                {t('whatsappConfigHelper.phoneInternationalHint')}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="message">{t('whatsappConfigHelper.testMessageLabel')}</Label>
              <Input
                id="message"
                placeholder={t('whatsappConfigHelper.testMessagePlaceholder')}
                value={testData.message}
                onChange={(e) => setTestData({...testData, message: e.target.value})}
              />
            </div>
          </div>
        </div>
        
        {testResult && (
          <div className={`p-4 rounded-md border ${testResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h4 className={`font-medium ${testResult.success ? 'text-green-800' : 'text-red-800'}`}>
              {testResult.success ? t('whatsappConfigHelper.linkGeneratedSuccess') : t('whatsappConfigHelper.generationError')}
            </h4>
            <p className={`text-sm mt-1 ${testResult.success ? 'text-green-700' : 'text-red-700'}`}>
              {testResult.message}
            </p>
            
            {testResult.whatsappLink && (
              <div className="mt-3">
                <a 
                  href={testResult.whatsappLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-green-100 hover:bg-green-200 text-green-800 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <ExternalLink className="h-4 w-4" />
                  {t('whatsappConfigHelper.openWhatsappAndSend')}
                </a>
                <p className="text-xs text-green-600 mt-2">
                  {t('whatsappConfigHelper.openWhatsappHint')}
                </p>
              </div>
            )}
            
            {testResult.instructions && (
              <div className="mt-2 text-sm text-green-700">
                <p className="font-medium">{t('whatsappConfigHelper.instructionsLabel')}</p>
                <p className="mt-1">
                  {testResult.instructions}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="justify-between">
        <Button 
          variant="outline" 
          onClick={fetchConfigStatus}
          disabled={isLoading || isTesting}
        >
          {t('whatsappConfigHelper.refreshStatus')}
        </Button>
        <Button 
          onClick={handleTestSend} 
          disabled={isLoading || isTesting || !testData.phoneNumber}
        >
          {isTesting ? (
            <>
              <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full mr-2"></div>
              {t('whatsappConfigHelper.generating')}
            </>
          ) : (
            <>
              <SendIcon className="h-4 w-4 mr-2" />
              {t('whatsappConfigHelper.generateLink')}
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default WhatsAppConfigHelper;
