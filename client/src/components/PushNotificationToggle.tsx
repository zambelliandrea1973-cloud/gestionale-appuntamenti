import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface PushNotificationToggleProps {
  clientId: number;
  ownerId: number;
}

export function PushNotificationToggle({ clientId, ownerId }: PushNotificationToggleProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    checkSupport();
  }, []);

  const checkSupport = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('[PUSH] Push notifications non supportate');
      setIsSupported(false);
      setIsLoading(false);
      return;
    }

    setIsSupported(true);

    try {
      const response = await fetch(`/api/push/status/${clientId}`);
      if (response.ok) {
        const data = await response.json();
        setIsSubscribed(data.subscribed);
      }
    } catch (error) {
      console.error('[PUSH] Errore verifica stato:', error);
    }

    setIsLoading(false);
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribe = async () => {
    setIsLoading(true);

    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast({
          title: t('i18nFinale.pushNotifications.permissionDeniedTitle'),
          description: t('i18nFinale.pushNotifications.permissionRequired'),
          variant: 'destructive'
        });
        setIsLoading(false);
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw-push.js');
      await navigator.serviceWorker.ready;

      const keyResponse = await fetch('/api/push/vapid-public-key');
      const keyData = await keyResponse.json();

      if (!keyData.success || !keyData.publicKey) {
        throw new Error('VAPID key not available');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(keyData.publicKey)
      });

      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          ownerId,
          subscription: subscription.toJSON()
        })
      });

      if (response.ok) {
        setIsSubscribed(true);
        toast({
          title: t('i18nFinale.pushNotifications.notificationsActivatedTitle'),
          description: t('i18nFinale.pushNotifications.subscribed')
        });
      } else {
        throw new Error('Error saving subscription');
      }
    } catch (error) {
      console.error('[PUSH] Errore attivazione:', error);
      toast({
        title: t('common.error'),
        description: t('i18nFinale.pushNotifications.subscribeError'),
        variant: 'destructive'
      });
    }

    setIsLoading(false);
  };

  const unsubscribe = async () => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      await fetch('/api/push/unsubscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId })
      });

      setIsSubscribed(false);
      toast({
        title: t('i18nFinale.pushNotifications.notificationsDeactivatedTitle'),
        description: t('i18nFinale.pushNotifications.unsubscribed')
      });
    } catch (error) {
      console.error('[PUSH] Errore disattivazione:', error);
      toast({
        title: t('common.error'),
        description: t('i18nFinale.pushNotifications.unsubscribeError'),
        variant: 'destructive'
      });
    }

    setIsLoading(false);
  };

  if (!isSupported) {
    return (
      <p className="text-xs text-gray-400 italic">
        {t('i18nFinale.pushNotifications.notSupported')}
      </p>
    );
  }

  return (
    <Button
      variant={isSubscribed ? 'outline' : 'default'}
      size="sm"
      onClick={isSubscribed ? unsubscribe : subscribe}
      disabled={isLoading}
      className={isSubscribed ? 'border-green-500 text-green-700' : 'bg-blue-600 hover:bg-blue-700 text-white'}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin mr-2" />
      ) : isSubscribed ? (
        <Bell className="h-4 w-4 mr-2 text-green-600" />
      ) : (
        <BellOff className="h-4 w-4 mr-2" />
      )}
      {isLoading ? t('i18nFinale.pushNotifications.loading') : isSubscribed ? t('i18nFinale.pushNotifications.active') : t('i18nFinale.pushNotifications.enable')}
    </Button>
  );
}
