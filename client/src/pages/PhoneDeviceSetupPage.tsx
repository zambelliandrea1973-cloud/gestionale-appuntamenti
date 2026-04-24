import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Smartphone,
  AlertCircle,
  QrCode,
  RefreshCw,
  CheckCircle,
  Phone,
  Sparkles
} from "lucide-react";
import { QRCodeSVG } from 'qrcode.react';
import { useToast } from "@/hooks/use-toast";
import { socketIo } from '../lib/socket';
import { format } from 'date-fns';

enum DeviceStatus {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  QR_READY = 'qr_ready',
  AUTHENTICATED = 'authenticated',
  AUTH_FAILURE = 'auth_failure'
}

interface DeviceInfo {
  status: DeviceStatus;
  deviceId: string | null;
  phoneNumber: string | null;
}

const PhoneDeviceSetupPage: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [deviceStatus, setDeviceStatus] = useState<DeviceStatus>(DeviceStatus.DISCONNECTED);
  const [qrCode, setQrCode] = useState<string>('');
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);
  const [isGeneratingQR, setIsGeneratingQR] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [simulationInProgress, setSimulationInProgress] = useState(false);

  useEffect(() => {
    const fetchInitialStatus = async () => {
      try {
        const response = await fetch('/api/phone-device/status');
        const data = await response.json();

        if (data.success && data.status) {
          updateDeviceInfo(data.status);
        }
      } catch (error) {
        console.error('Failed to load device status:', error);
      }
    };

    fetchInitialStatus();

    const newSocket = socketIo;

    newSocket.on('device_status', (data: DeviceInfo) => {
      updateDeviceInfo(data);
    });

    newSocket.on('qr_code', (data: { qrCode: string }) => {
      setQrCode(data.qrCode);
      setIsGeneratingQR(false);
      setLastUpdated(new Date());
    });

    return () => {
      newSocket.off('device_status');
      newSocket.off('qr_code');
    };
  }, []);

  const updateDeviceInfo = (data: DeviceInfo) => {
    setDeviceStatus(data.status);
    setDeviceId(data.deviceId);
    setPhoneNumber(data.phoneNumber);
    setLastUpdated(new Date());

    if (data.status === DeviceStatus.AUTHENTICATED || data.status === DeviceStatus.CONNECTED) {
      setQrCode('');
    }
  };

  const handleStartPairing = async () => {
    setIsGeneratingQR(true);

    try {
      const response = await fetch('/api/phone-device/start-pairing', {
        method: 'POST',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || t('phoneDeviceSetup.toast.pairingFailedDesc'));
      }

      toast({
        title: t('phoneDeviceSetup.toast.qrGeneratingTitle'),
        description: t('phoneDeviceSetup.toast.qrGeneratingDesc'),
      });

    } catch (error) {
      console.error('Failed to start pairing:', error);
      setIsGeneratingQR(false);

      toast({
        title: t('phoneDeviceSetup.toast.errorTitle'),
        description: t('phoneDeviceSetup.toast.pairingFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      const response = await fetch('/api/phone-device/disconnect', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('phoneDeviceSetup.toast.disconnectedTitle'),
          description: t('phoneDeviceSetup.toast.disconnectedDesc'),
        });

        setDeviceStatus(DeviceStatus.DISCONNECTED);
        setQrCode('');
        setDeviceId(null);
        setPhoneNumber(null);
      } else {
        throw new Error(data.error || t('phoneDeviceSetup.toast.disconnectFailedDesc'));
      }
    } catch (error) {
      console.error('Failed to disconnect device:', error);

      toast({
        title: t('phoneDeviceSetup.toast.errorTitle'),
        description: t('phoneDeviceSetup.toast.disconnectFailedDesc'),
        variant: 'destructive',
      });
    }
  };

  const handleSimulateScan = async () => {
    setSimulationInProgress(true);

    try {
      const response = await fetch('/api/phone-device/simulate-scan', {
        method: 'POST'
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: t('phoneDeviceSetup.toast.simulationOkTitle'),
          description: t('phoneDeviceSetup.toast.simulationOkDesc'),
          variant: 'default'
        });
      } else {
        throw new Error(data.error || t('phoneDeviceSetup.toast.simulationErrorDesc'));
      }
    } catch (error) {
      console.error('Failed to simulate scan:', error);

      toast({
        title: t('phoneDeviceSetup.toast.simulationErrorTitle'),
        description: t('phoneDeviceSetup.toast.simulationErrorDesc'),
        variant: 'destructive',
      });
    } finally {
      setSimulationInProgress(false);
    }
  };

  const getStatusText = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return t('phoneDeviceSetup.status.disconnected');
      case DeviceStatus.CONNECTING:
        return t('phoneDeviceSetup.status.connecting');
      case DeviceStatus.CONNECTED:
        return t('phoneDeviceSetup.status.connected');
      case DeviceStatus.QR_READY:
        return t('phoneDeviceSetup.status.waitingScan');
      case DeviceStatus.AUTHENTICATED:
        return t('phoneDeviceSetup.status.ready');
      case DeviceStatus.AUTH_FAILURE:
        return t('phoneDeviceSetup.status.error');
      default:
        return t('phoneDeviceSetup.status.unknown');
    }
  };

  const getStatusColor = (status: DeviceStatus): string => {
    switch (status) {
      case DeviceStatus.DISCONNECTED:
        return 'text-slate-500';
      case DeviceStatus.CONNECTING:
        return 'text-amber-500';
      case DeviceStatus.CONNECTED:
        return 'text-green-500';
      case DeviceStatus.QR_READY:
        return 'text-blue-500';
      case DeviceStatus.AUTHENTICATED:
        return 'text-green-600';
      case DeviceStatus.AUTH_FAILURE:
        return 'text-red-500';
      default:
        return 'text-slate-500';
    }
  };

  const shouldShowQRCode = () => {
    return deviceStatus === DeviceStatus.QR_READY && qrCode;
  };

  const shouldShowPairingButton = () => {
    return [DeviceStatus.DISCONNECTED, DeviceStatus.AUTH_FAILURE].includes(deviceStatus);
  };

  const shouldShowDisconnectButton = () => {
    return [DeviceStatus.AUTHENTICATED, DeviceStatus.CONNECTED].includes(deviceStatus);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-2">
          {t('phoneDeviceSetup.header.title')}
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          {t('phoneDeviceSetup.header.subtitle')}
        </p>
      </header>

      <div className="grid gap-8 md:grid-cols-12">
        <div className="md:col-span-7">
          <Card className="shadow-md">
            <CardHeader className="bg-slate-50">
              <CardTitle className="flex items-center text-xl">
                <Phone className="mr-3 h-6 w-6 text-primary" />
                {t('phoneDeviceSetup.card.title')}
              </CardTitle>
              <CardDescription className="text-base">
                {deviceStatus === DeviceStatus.DISCONNECTED ?
                  t('phoneDeviceSetup.card.descDisconnected') :
                  t('phoneDeviceSetup.card.descConnected')}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 p-6">
              <div className="p-4 border rounded-xl bg-muted/30 shadow-sm">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 rounded-full mr-3 ${getStatusColor(deviceStatus)}`} />
                    <span className="font-medium text-lg">{getStatusText(deviceStatus)}</span>
                  </div>

                  {(deviceStatus === DeviceStatus.AUTHENTICATED || deviceStatus === DeviceStatus.CONNECTED) && (
                    <div className="flex flex-col gap-2 pl-7">
                      {phoneNumber && (
                        <div className="flex items-center text-base">
                          <Smartphone className="h-5 w-5 mr-2 inline text-slate-500" />
                          <span className="font-medium">{phoneNumber}</span>
                        </div>
                      )}

                      {lastUpdated && (
                        <div className="text-sm text-muted-foreground">
                          {t('phoneDeviceSetup.ui.lastUpdate')} {format(lastUpdated, 'HH:mm:ss')}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {shouldShowPairingButton() && (
                  <div className="flex flex-col gap-6 items-center p-6 border-2 border-dashed border-primary/30 rounded-xl bg-primary/5">
                    <div className="text-center max-w-sm">
                      <h3 className="font-medium text-lg mb-2">
                        {t('phoneDeviceSetup.setup.heading')}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4">
                        {t('phoneDeviceSetup.setup.intro')}
                      </p>
                    </div>

                    <Button
                      variant="default"
                      size="lg"
                      onClick={handleStartPairing}
                      disabled={isGeneratingQR}
                      className="text-base py-6 px-8"
                    >
                      {isGeneratingQR ? (
                        <>
                          <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                          {t('phoneDeviceSetup.setup.preparing')}
                        </>
                      ) : (
                        <>
                          <QrCode className="mr-2 h-5 w-5" />
                          {t('phoneDeviceSetup.setup.startButton')}
                        </>
                      )}
                    </Button>

                    <div className="w-full pt-4 mt-4 border-t border-dashed border-slate-200">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSimulateScan}
                        disabled={simulationInProgress || deviceStatus !== DeviceStatus.QR_READY}
                        className="w-full"
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {simulationInProgress
                          ? t('phoneDeviceSetup.ui.simulating')
                          : t('phoneDeviceSetup.ui.testModeButton')}
                      </Button>
                    </div>
                  </div>
                )}

                {shouldShowDisconnectButton() && (
                  <div className="flex flex-col gap-4 items-center p-6 border-2 border-dashed border-green-200 rounded-xl bg-green-50">
                    <div className="text-center">
                      <CheckCircle className="h-10 w-10 text-green-500 mx-auto mb-2" />
                      <h3 className="font-medium text-xl mb-2 text-green-800">
                        {t('phoneDeviceSetup.connected.heading')}
                      </h3>
                      <p className="text-green-700 mb-4">
                        {t('phoneDeviceSetup.connected.intro')}
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      onClick={handleDisconnect}
                      className="border-green-300"
                    >
                      {t('phoneDeviceSetup.connected.disconnectButton')}
                    </Button>
                  </div>
                )}
              </div>

              {shouldShowQRCode() && (
                <div className="flex flex-col items-center p-6 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50">
                  <div className="text-center mb-4">
                    <h3 className="font-medium text-xl mb-2 text-blue-800">
                      {t('phoneDeviceSetup.scan.heading')}
                    </h3>
                    <p className="text-blue-700 mb-2">
                      {t('phoneDeviceSetup.scan.intro')}
                    </p>
                    <ol className="text-sm text-blue-600 text-left list-decimal pl-5 space-y-1">
                      <li>{t('phoneDeviceSetup.qr.step1')}</li>
                      <li>{t('phoneDeviceSetup.qr.step2')}</li>
                      <li>{t('phoneDeviceSetup.qr.step3')}</li>
                      <li>{t('phoneDeviceSetup.qr.step4')}</li>
                    </ol>
                  </div>

                  <div className="bg-white p-4 rounded-xl border-4 border-blue-100 shadow-md">
                    <QRCode value={qrCode} size={250} />
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
                {t('phoneDeviceSetup.guide.title')}
              </CardTitle>
              <CardDescription>
                {t('phoneDeviceSetup.guide.subtitle')}
              </CardDescription>
            </CardHeader>

            <CardContent className="p-6">
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-medium mb-4">
                    {t('phoneDeviceSetup.guide.stepsHeading')}
                  </h3>

                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">1</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('phoneDeviceSetup.setup.heading')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('phoneDeviceSetup.guide.step1Body')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">2</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('phoneDeviceSetup.guide.step2Title')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('phoneDeviceSetup.guide.step2Body')}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">3</div>
                      <div>
                        <h4 className="text-lg font-medium">{t('phoneDeviceSetup.guide.step3Title')}</h4>
                        <p className="text-muted-foreground mt-1">
                          {t('phoneDeviceSetup.guide.step3Body')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                  <h4 className="text-lg font-medium text-amber-800 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2 text-amber-600" />
                    {t('phoneDeviceSetup.tips.title')}
                  </h4>

                  <ul className="mt-2 space-y-2 list-disc pl-5 text-amber-700">
                    <li>
                      {t('phoneDeviceSetup.tips.b1')}
                    </li>
                    <li>
                      {t('phoneDeviceSetup.tips.b2')}
                    </li>
                    <li>
                      {t('phoneDeviceSetup.tips.b3')}
                    </li>
                    <li>
                      {t('phoneDeviceSetup.tips.b4')}
                    </li>
                  </ul>
                </div>

                {(deviceStatus === DeviceStatus.AUTHENTICATED || deviceStatus === DeviceStatus.CONNECTED) && (
                  <Alert variant="default" className="bg-green-50 border-green-200">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <AlertTitle className="text-green-800">{t('phoneDeviceSetup.next.title')}</AlertTitle>
                    <AlertDescription className="text-green-700">
                      <p className="mb-2">
                        {t('phoneDeviceSetup.next.intro')}
                      </p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        <li>
                          {t('phoneDeviceSetup.next.b1')}
                        </li>
                        <li>
                          {t('phoneDeviceSetup.next.b2')}
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

const QRCode = ({ value, size = 256 }: { value: string, size?: number }) => {
  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <QRCodeSVG
        value={value}
        size={size}
        bgColor={"#ffffff"}
        fgColor={"#000000"}
        level={"L"}
        includeMargin={false}
      />
    </div>
  );
};

export default PhoneDeviceSetupPage;
