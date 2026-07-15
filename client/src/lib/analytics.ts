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
 */
export function fireGtagMilestone(milestoneName: string) {
  const key = `funnel_fired_${milestoneName}`;
  if (sessionStorage.getItem(key)) return;
  sessionStorage.setItem(key, '1');
  gtagEvent(milestoneName, { event_category: 'funnel' });
  console.log(`[FUNNEL] 📊 gtag event fired: ${milestoneName}`);
}
