// @ts-nocheck
import webpush from 'web-push';
import { db } from '../db';
import { pushSubscriptions, clients } from '../../shared/schema';
import { eq, and } from 'drizzle-orm';

// Configure VAPID keys
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
    console.log('🔔 [PUSH] VAPID keys configured correctly');
  } catch (error: any) {
    console.warn('⚠️ [PUSH] Error configuring VAPID keys - push notifications disabled:', error);
  }
} else {
  console.warn('⚠️ [PUSH] VAPID keys not configured - push notifications disabled');
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
  // Save a new subscription
  async saveSubscription(clientId: number, ownerId: number, subscription: {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  }): Promise<boolean> {
    try {
      // Remove existing subscriptions for this client (avoids duplicates)
      await db.delete(pushSubscriptions)
        .where(eq(pushSubscriptions.clientId, clientId));
      
      // Insert new subscription
      await db.insert(pushSubscriptions).values({
        clientId,
        ownerId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      });
      
      console.log(`🔔 [PUSH] Subscription saved for client ${clientId}`);
      return true;
    } catch (error: any) {
      console.error('❌ [PUSH] Error saving subscription:', error);
      return false;
    }
  },

  // Remove subscription
  async removeSubscription(clientId: number): Promise<boolean> {
    try {
      await db.delete(pushSubscriptions)
        .where(eq(pushSubscriptions.clientId, clientId));
      
      console.log(`🔔 [PUSH] Subscription removed for client ${clientId}`);
      return true;
    } catch (error: any) {
      console.error('❌ [PUSH] Error removing subscription:', error);
      return false;
    }
  },

  // Send push notification to a specific client
  async sendToClient(clientId: number, payload: PushPayload): Promise<boolean> {
    try {
      const subscriptions = await db.select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.clientId, clientId));
      
      if (subscriptions.length === 0) {
        console.log(`🔔 [PUSH] No subscription found for client ${clientId}`);
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
            console.log(`🔔 [PUSH] Notification sent to client ${clientId}`);
            return true;
          } catch (error: any) {
            // If subscription expired or invalid, remove it
            if (error.statusCode === 410 || error.statusCode === 404) {
              console.log(`🔔 [PUSH] Subscription expired, removing...`);
              await db.delete(pushSubscriptions)
                .where(eq(pushSubscriptions.id, sub.id));
            } else {
              console.error(`❌ [PUSH] Error sending to ${sub.endpoint}:`, error.message);
            }
            return false;
          }
        })
      );
      
      return results.some(r => r);
    } catch (error: any) {
      console.error('❌ [PUSH] Error sending notification:', error);
      return false;
    }
  },

  // Send confirmed appointment notification
  async sendAppointmentConfirmed(clientId: number, appointmentDetails: {
    serviceName: string;
    date: string;
    time: string;
  }): Promise<boolean> {
    const payload: PushPayload = {
      title: '✅ Appointment Confirmed!',
      body: `Your appointment for ${appointmentDetails.serviceName} on ${appointmentDetails.date} at ${appointmentDetails.time} has been confirmed.`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-72.png',
      url: '/client',
      actions: [
        { action: 'view', title: 'View' },
      ],
    };
    
    return this.sendToClient(clientId, payload);
  },

  // Check if a client has an active subscription
  async hasActiveSubscription(clientId: number): Promise<boolean> {
    try {
      const subscriptions = await db.select()
        .from(pushSubscriptions)
        .where(eq(pushSubscriptions.clientId, clientId));
      
      return subscriptions.length > 0;
    } catch (error: any) {
      console.error('❌ [PUSH] Error verifying subscription:', error);
      return false;
    }
  },
};
