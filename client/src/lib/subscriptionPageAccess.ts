export function shouldRedirectFreeStaff(user: {
  type: string;
  role: string | null;
  licenseInfo: { type: string; isActive: boolean; expiresAt: string | null };
}, now = Date.now()): boolean {
  const staffOrAdmin = ['staff', 'admin'].includes(user.type) ||
    ['staff', 'admin', 'ev_staff', 'ev_admin'].includes(user.role || '');
  const freeLicense = ['staff_free', 'staff_free_10years', 'passepartout'].includes(user.licenseInfo.type);
  const active = user.licenseInfo.isActive && (!user.licenseInfo.expiresAt ||
    new Date(user.licenseInfo.expiresAt).getTime() > now);
  // Signup also uses type=staff for ordinary trial accounts. That label
  // alone does not exempt someone from needing a subscription.
  return Boolean(staffOrAdmin && freeLicense && active);
}