import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Smartphone,
  AlertCircle,
  CheckCircle,
  Phone,
  Send
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from 'date-fns';

enum DeviceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTED = 'connected',
  VERIFICATION_PENDING = 'verification_pending',
  VERIFIED = 'verified'
}

interface DeviceInfo {
  status: DeviceStatus;
  phoneNumber: string | null;
  lastUpdated?: Date | null;
}

const SimplePhoneSetup: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(DeviceStatus.DISCONNECTED);
  const [phoneNumber, setPhoneNumber] = useState<string>('');
  const [savedPhoneNumber, setSavedPhoneNumber] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const response = await fetch('/api/direct-phone/direct-status');
        const data = await response.json();

        if (data.success && data.phoneInfo) {
          updateDeviceInfo(data.phoneInfo);
        }
      } catch (error) {
        console.error('Failed to load device status:', error);
      }
    };

    fetchInitialStatus();
  }, []);

  const updateDeviceInfo = (data: DeviceInfo) => {
    setDeviceStatus(data.status);
    setSavedPhoneNumber(data.phoneNumber);
    setLastUpdated(data.lastUpdated ? new Date(data.lastUpdated) : new Date());
  };

  const handleRegisterPhone = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: t('simplePhoneSetup.toast.errorTitle'),
        description: t('simplePhoneSetup.toast.invalidPhoneDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/direct-phone/register-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('simplePhoneSetup.toast.numberRegisteredTitle'),
          description: t('simplePhoneSetup.toast.numberRegisteredDesc'),
        });

        setDeviceStatus(DeviceStatus.VERIFICATION_PENDING);
        setSavedPhoneNumber(phoneNumber.trim());
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || t('simplePhoneSetup.toast.registerFailedDesc'));
      }
    } catch (error) {
      console.error('Failed to register phone number:', error);

      toast({
        title: t('simplePhoneSetup.toast.errorTitle'),
        description: error instanceof Error ? error.message : t('simplePhoneSetup.toast.registerFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode.trim()) {
      toast({
        title: t('simplePhoneSetup.toast.errorTitle'),
        description: t('simplePhoneSetup.toast.invalidCodeDesc'),
        variant: 'destructive',
      });
      return;
    }

    setIsVerifying(true);

    try {
      const response = await fetch('/api/direct-phone/verify-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: savedPhoneNumber,
          verificationCode: verificationCode.trim()
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('simplePhoneSetup.toast.numberVerifiedTitle'),
          description: t('simplePhoneSetup.toast.numberVerifiedDesc'),
          variant: 'default',
        });

        setDeviceStatus(DeviceStatus.VERIFIED);
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || t('simplePhoneSetup.toast.verifyFailedDesc'));
      }
    } catch (error) {
      console.error('Failed to verify code:', error);

      toast({
        title: t('simplePhoneSetup.toast.errorTitle'),
        description: error instanceof Error ? error.message : t('simplePhoneSetup.toast.verifyFailedDesc'),
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/direct-phone/disconnect-direct', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('simplePhoneSetup.toast.numberRemovedTitle'),
          description: t('simplePhoneSetup.toast.numberRemovedDesc'),
        });

        setDeviceStatus(DeviceStatus.DISCONNECTED);
        setSavedPhoneNumber(null);
        setPhoneNumber('');
        setVerificationCode('');
        setLastUpdated(new Date());
      } else {
        throw new Error(data.error || t('simplePhoneSetup.toast.removeFailedDesc'));
      }
    } catch (error) {
      console.error('Failed to remove phone number:', error);

      toast({
        title: t('simplePhoneSetup.toast.errorTitle'),
        description: t('simplePhoneSetup.toast.removeFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleSendTestSms = async () => {
    try {
      const response = await fetch('/api/direct-phone/send-test-direct', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success && data.whatsappLink) {
        window.open(data.whatsappLink, '_blank', 'noopener,noreferrer');

        toast({
          title: t('simplePhoneSetup.toast.whatsappLinkTitle'),
          description: t('simplePhoneSetup.toast.whatsappLinkDesc'),
        });
      } else {
        throw new Error(data.error || t('simplePhoneSetup.toast.whatsappFailedDesc'));
      }
    } catch (error) {
      console.error('Failed to generate WhatsApp link:', error);

      toast({
        title: t('simplePhoneSetup.toast.errorTitle'),
        description: t('simplePhoneSetup.toast.whatsappFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const getStatusText = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return t('simplePhoneSetup.status.disconnected');
      case DeviceStatus.VERIFICATION_PENDING:
        return t('simplePhoneSetup.status.pending');
      case DeviceStatus.VERIFIED:
      case DeviceStatus.CONNECTED:
        return t('simplePhoneSetup.status.connected');
      default:
        return t('simplePhoneSetup.status.unknown');
    }
  };

  const getStatusColor = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return 'text-slate-500';
      case DeviceStatus.VERIFICATION_PENDING:
        return 'text-amber-500';
      case DeviceStatus.VERIFIED:
      case DeviceStatus.CONNECTED:
        return 'text-green-600';
      default:
        return 'text-slate-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          {t('simplePhoneSetup.header.title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('simplePhoneSetup.header.subtitle')}
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <Card className="shadow-md">
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center text-xl">
                <Phone className="mr-3 h-6 w-6 text-primary" />
                {t('simplePhoneSetup.card.title')}
              </CardTitle>
              <CardDescription className="text-base">
                {deviceStatus === DeviceStatus.DISCONNECTED ?
                  t('simplePhoneSetup.card.descDisconnected') :
                  t('simplePhoneSetup.card.descConnected')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <div className="p-4 border rounded-xl bg-muted/30 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${getStatusColor(deviceStatus)}`} />
                    <span className="font-medium text-lg">{getStatusText(deviceStatus)}</span>
                  </div>

                  {(deviceStatus !== DeviceStatus.DISCONNECTED) && (
                    <div className="flex flex-col gap-2 pl-7">
                      {savedPhoneNumber && (
                        <div className="flex items-center text-base">
                          <Smartphone className="h-5 w-5 mr-2 inline text-slate-500" />
                          <span className="font-medium">{savedPhoneNumber}</span>
                        </div>
                      )}

                      {lastUpdated && (
                        <div className="text-sm text-muted-foreground">
                          {t('simplePhoneSetup.ui.lastUpdate')} {format(lastUpdated, 'HH:mm:ss')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {deviceStatus === DeviceStatus.DISCONNECTED && (
                <div className="border-2 border-dashed border-primary/30 rounded-xl bg-primary/5 p-6">
                  <div className="text-center mb-4">
                    <h3 className="font-medium text-lg mb-2">
                      {t('simplePhoneSetup.setup.heading')}
                    </h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      {t('simplePhoneSetup.setup.intro')}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone-number">{t('simplePhoneSetup.setup.phoneLabel')}</Label>
                      <Input
                        id="phone-number"
                        type="tel"
                        placeholder="+39 XXX XXXXXXX"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                      />
                      <p className="text-xs text-muted-foreground">
                        {t('simplePhoneSetup.setup.phoneHint')}
                      </p>
                    </div>

                    <Button
                      className="w-full"
                      disabled={isSubmitting || !phoneNumber.trim()}
                      onClick={handleRegisterPhone}
                    >
                      {isSubmitting
                        ? t('simplePhoneSetup.ui.registering')
                        : t('simplePhoneSetup.ui.registerThisNumber')}
                    </Button>
                  </div>
                </div>
              )}

              {deviceStatus === DeviceStatus.VERIFICATION_PENDING && (
                <div className="border-2 border-dashed border-amber-200 rounded-xl bg-amber-50 p-6">
                  <div className="text-center mb-4">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                    <h3 className="font-medium text-lg mb-2 text-amber-800">
                      {t('simplePhoneSetup.verify.heading')}
                    </h3>
                    <p className="text-amber-700 mb-4">
                      {t('simplePhoneSetup.verify.intro')} <strong>{savedPhoneNumber}</strong>
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="verification-code">{t('simplePhoneSetup.verify.codeLabel')}</Label>
                      <Input
                        id="verification-code"
                        type="text"
                        placeholder="123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                      />
                    </div>

                    <Button
                      className="w-full"
                      disabled={isVerifying || !verificationCode.trim()}
                      onClick={handleVerifyCode}
                    >
                      {isVerifying
                        ? t('simplePhoneSetup.ui.verifying')
                        : t('simplePhoneSetup.ui.verifyCode')}
                    </Button>
                  </div>
                </div>
              )}

              {(deviceStatus === DeviceStatus.VERIFIED || deviceStatus === DeviceStatus.CONNECTED) && (
                <div className="border-2 border-dashed border-green-200 rounded-xl bg-green-50 p-6">
                  <div className="text-center mb-4">
                    <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                    <h3 className="font-medium text-xl mb-2 text-green-800">
                      {t('simplePhoneSetup.connected.heading')}
                    </h3>
                    <p className="text-green-700 mb-4">
                      {t('simplePhoneSetup.connected.intro')}
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <Button
                      variant="outline"
                      className="border-green-300"
                      onClick={handleSendTestSms}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      {t('simplePhoneSetup.connected.testButton')}
                    </Button>

                    <Button
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50"
                      onClick={handleDisconnect}
                    >
                      {t('simplePhoneSetup.connected.removeButton')}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-5">
          <Card className="shadow-md">
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center">
                <Smartphone className="mr-2 h-5 w-5" />
                {t('simplePhoneSetup.guide.title')}
              </CardTitle>
              <CardDescription>
                {t('simplePhoneSetup.guide.subtitle')}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium mb-4">
                    {t('simplePhoneSetup.guide.stepsHeading')}
                  </h3>

                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">1</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('simplePhoneSetup.guide.step1Title')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('simplePhoneSetup.guide.step1Body')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">2</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('simplePhoneSetup.guide.step2Title')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('simplePhoneSetup.guide.step2Body')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">3</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('simplePhoneSetup.guide.step3Title')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('simplePhoneSetup.guide.step3Body')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-lg font-medium text-green-800 flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                    {t('simplePhoneSetup.tips.title')}
                  </h4>

                  <ul className="mt-2 space-y-2 list-disc pl-5 text-green-700">
                    <li>
                      {t('simplePhoneSetup.tips.b1')}
                    </li>
                    <li>
                      {t('simplePhoneSetup.tips.b2')}
                    </li>
                    <li>
                      {t('simplePhoneSetup.tips.b3')}
                    </li>
                    <li>
                      {t('simplePhoneSetup.tips.b4')}
                    </li>
                  </ul>
                </div>

                {(deviceStatus === DeviceStatus.VERIFIED || deviceStatus === DeviceStatus.CONNECTED) && (
                  <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-800">{t('simplePhoneSetup.next.title')}</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <p className="mb-2">
                        {t('simplePhoneSetup.next.intro')}
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>
                          {t('simplePhoneSetup.next.b1')}
                        </li>
                        <li>
                          {t('simplePhoneSetup.next.b2')}
                        </li>
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SimplePhoneSetup;
