import { useTranslation } from 'react-i18next';
import { useUserWithLicense } from './use-user-with-license';

export type Capability =
  | 'calendar'
  | 'email_notifications'
  | 'whatsapp_notifications'
  | 'invoices'
  | 'reports'
  | 'google_calendar'
  | 'client_pwa_qr'
  | 'appointment_requests'
  | 'promotional_packages'
  | 'staff_rooms'
  | 'warehouse'
  | 'unlimited_clients'
  | 'marketing_ai';

const CAPABILITY_MAP: Record<string, Capability[]> = {
  'trial': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
    'unlimited_clients',
  ],
  'base': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'appointment_requests',
  ],
  'pro': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
  ],
  'business': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
    'unlimited_clients',
  ],
  'staff_free': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
    'unlimited_clients',
  ],
  'staff_free_10years': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
    'unlimited_clients',
  ],
  'passepartout': [
    'calendar',
    'email_notifications',
    'whatsapp_notifications',
    'invoices',
    'reports',
    'google_calendar',
    'client_pwa_qr',
    'appointment_requests',
    'promotional_packages',
    'marketing_ai',
    'staff_rooms',
    'warehouse',
    'unlimited_clients',
  ],
};

const REQUIRED_PLANS: Record<Capability, string> = {
  calendar: 'Base',
  email_notifications: 'Base',
  whatsapp_notifications: 'Trial',
  invoices: 'Trial',
  reports: 'Pro',
  google_calendar: 'Pro',
  client_pwa_qr: 'Pro',
  staff_rooms: 'Business',
  warehouse: 'Business',
  unlimited_clients: 'Business',
  appointment_requests: 'Base',
  promotional_packages: 'Pro',
  marketing_ai: 'Business',
};

export interface UpgradeMessage {
  title: string;
  description: string;
  requiredPlan: string;
}

export function useCapabilities() {
  const { t } = useTranslation();
  const { user } = useUserWithLicense();

  const userCapabilities = user?.licenseInfo?.type
    ? CAPABILITY_MAP[user.licenseInfo.type] || []
    : [];

  const hasCapability = (capability: Capability): boolean => {
    return userCapabilities.includes(capability);
  };

  const getUpgradeMessage = (capability: Capability): UpgradeMessage => ({
    title: t(`capabilities.${capability}.title`),
    description: t(`capabilities.${capability}.description`),
    requiredPlan: REQUIRED_PLANS[capability],
  });

  const currentPlan = user?.licenseInfo?.type || 'trial';
  const isPlanExpired = user?.licenseInfo?.isActive === false;

  return {
    hasCapability,
    getUpgradeMessage,
    currentPlan,
    isPlanExpired,
    userCapabilities,
  };
}
