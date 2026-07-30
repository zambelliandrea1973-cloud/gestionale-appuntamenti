declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

/**
 * Fires a gtag event without PII. Safe to call in any environment.
 */
export function gtagEvent(eventName: string, params?: Record<string, any>) {
  try {
    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, { event_category: 'funnel', ...params });
    }
  } catch (_) {}
}

/**
 * Called by FunnelTracker when a new milestone is detected.
 * Fires the corresponding gtag event once per session via sessionStorage guard.
 * For subscription_purchased also fires the Google Ads conversion.
 */
export function fireGtagMilestone(milestoneName: string) {
  const key = `funnel_fired_${milestoneName}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  gtagEvent(milestoneName, { event_category: 'funnel' });
  console.log(`[FUNNEL] 📊 gtag event fired: ${milestoneName}`);

  // Google Ads conversion for subscription purchase
  if (milestoneName === 'subscription_purchased') {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          send_to: 'AW-18109628280/EaG-CNuFi9kcEPj-q7tD',
          currency: 'EUR',
          transaction_id: '',
        });
        console.log('[FUNNEL] 💰 Google Ads conversion fired: Acquisto Abbonamento');
      }
    } catch (_) {}
  }

  // Google Ads conversion for first appointment created (engagement signal)
  if (milestoneName === 'first_appointment_created') {
    try {
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'conversion', {
          send_to: 'AW-18109628280/-afjCOeRldkcEPj-q7tD',
          currency: 'EUR',
        });
        console.log('[FUNNEL] 📅 Google Ads conversion fired: Primo Appuntamento Creato');
      }
    } catch (_) {}
  }
}
