export const PERSONAL_SPACE_IDLE_MS = 5 * 60_000;
export const PERSONAL_SPACE_WARNING_MS = 4 * 60_000;
export const PERSONAL_SPACE_RENEW_THROTTLE_MS = 30_000;

/** No polling, visibility or background work counts as user activity. */
export function createPersonalSpaceIdle(options: {
  now: () => number; renew: () => void; expire: () => void; warning: (value: boolean) => void;
}) {
  let lastActivity = options.now();
  let lastRenewal = lastActivity;
  let expired = false;
  let warning = false;
  const check = () => {
    if (expired) return false;
    const elapsed = options.now() - lastActivity;
    if (elapsed >= PERSONAL_SPACE_IDLE_MS) {
      expired = true;
      options.warning(false);
      options.expire();
      return false;
    }
    const nextWarning = elapsed >= PERSONAL_SPACE_WARNING_MS;
    if (nextWarning !== warning) { warning = nextWarning; options.warning(warning); }
    return true;
  };
  return {
    check,
    activity(forceRenew = false) {
      // Check BEFORE updating the timestamp: returning from background cannot
      // revive a locally expired session, even on the first click.
      if (!check()) return false;
      lastActivity = options.now();
      if (warning) { warning = false; options.warning(false); }
      if (forceRenew || lastActivity - lastRenewal >= PERSONAL_SPACE_RENEW_THROTTLE_MS) {
        lastRenewal = lastActivity;
        options.renew();
      }
      return true;
    },
  };
}

export function showPersonalCalendarDetails(mode: 'work' | 'personal', unlocked: boolean, multi?: boolean) {
  return unlocked && (multi === false || mode === 'personal');
}
