// @ts-nocheck
import webpush from 'web-push';
import { db } from '../db';
import { pushSubscriptions, clients } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Configura VAPID keys
const VAPID_PUBLIC_KEY = (process.env.VITE_VAPID_PUBLIC_KEY || '').trim();
const VAPID_PRIVATE_KEY = (process.env.VAPID_PRIVATE_KEY || '').trim();
let vapidConfigured = false;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails(
      'mailto:support@gestionale-appuntamenti.com',
      VAPID_PUBLIC_KEY,
      VAPID_PRIVATE_KEY
    );
    vapidConfigured = true;
    console.log('🔔 [PUSH] VAPID keys configurate correttamente');
  } catch (error: any) {
    console.warn('⚠️ [PUSH] Errore configurazione VAPID keys - push notifications disabilitate:', error);
  }
} else {
  console.warn('⚠️ [PUSH] VAPID keys non configurate - push notifications disabilitate');
}

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
  actions?: { action: string; title: string }[];
}

export const pushNotificationService = {
  // Salva una nuova subscription
  async saveSubscription(clientId: number, ownerId: number, subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<boolean> {
    try {
      // Rimuovi subscription esistenti per questo client (evita duplicati)
      await db.delete(pushSubscriptions)
        .where(eq(pushSubscriptions.clientId, clientId));
      
      // Inserisci nuova subscription
      await db.insert(pushSubscriptions).values({
        clientId,
        ownerId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
      
      console.log(`🔔 [PUSH] Subscription salvata per cliente ${clientId}`);
      return true;
    } catch (error: any) {
      console.error('❌ [PUSH] Errore salvataggio subscription:', error);
      return false;
    }
  },

  // Rimuovi subscription
  async removeSubscription(clientId: number): Promise<boolean> {
    try {
      await db.delete(pushSubscriptions)
        .where(eq(pushSubscriptions.clientId, clientId));
      
      console.log(`🔔 [PUSH] Subscription rimossa per cliente ${clientId}`);
      return true;
    } catch (error: any) {
      console.error('❌ [PUSH] Errore rimozione subscription:', error);
      return false;
    }
  },

  // Invia notifica push a un cliente specifico
  async sendToClient(clientId: number, payload: PushPayload): Promise<boolean> {
    try {
      const subscriptions = await db.select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.clientId, clientId));
      
      if (subscriptions.length === 0) {
        console.log(`🔔 [PUSH] Nessuna subscription trovata per cliente ${clientId}`);
        return false;
      }
      
      const results = await Promise.all(
        subscriptions.map(async (sub) => {
          try {
            await webpush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth,
                },
              },
              JSON.stringify(payload)
            );
            console.log(`🔔 [PUSH] Notifica inviata a cliente ${clientId}`);
            return true;
          } catch (error: any) {
            // Se subscription scaduta o invalida, rimuovila
            if (error.statusCode === 410 || error.statusCode === 404) {
              console.log(`🔔 [PUSH] Subscription scaduta, rimozione...`);
              await db.delete(pushSubscriptions)
                .where(eq(pushSubscriptions.id, sub.id));
            } else {
              console.error(`❌ [PUSH] Errore invio a ${sub.endpoint}:`, error.message);
            }
            return false;
          }
        })
      );
      
      return results.some(r => r);
    } catch (error: any) {
      console.error('❌ [PUSH] Errore invio notifica:', error);
      return false;
    }
  },

  // Invia notifica di appuntamento confermato
  async sendAppointmentConfirmed(clientId: number, appointmentDetails: {
    serviceName: string;
    date: string;
    time: string;
  }): Promise<boolean> {
    const payload: PushPayload = {
      title: '✅ Appuntamento Confermato!',
      body: `Il tuo appuntamento per ${appointmentDetails.serviceName} il ${appointmentDetails.date} alle ${appointmentDetails.time} è stato confermato.`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      url: '/client',
      actions: [
        { action: 'view', title: 'Visualizza' },
      ],
    };
    
    return this.sendToClient(clientId, payload);
  },

  // Verifica se un client ha una subscription attiva
  async hasActiveSubscription(clientId: number): Promise<boolean> {
    try {
      const subscriptions = await db.select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.clientId, clientId));
      
      return subscriptions.length > 0;
    } catch (error: any) {
      console.error('❌ [PUSH] Errore verifica subscription:', error);
      return false;
    }
  },
};
