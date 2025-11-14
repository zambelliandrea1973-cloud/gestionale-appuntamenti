import { useDeviceDetection } from './use-device-detection';
import { useUserWithLicense } from './use-user-with-license';

export interface DataSeparationConfig {
  shouldFilterData: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  userType: 'admin' | 'staff' | 'customer' | undefined;
  accessLevel: 'full' | 'restricted';
  reason: string;
}

/**
 * Hook per gestire la separazione dei dati in base al dispositivo e tipo utente
 * 
 * Logica:
 * - Admin desktop: accesso completo a tutti i dati
 * - Admin mobile/tablet: accesso completo (per compatibilità)
 * - Staff/Customer mobile: solo i propri dati
 * - Staff/Customer desktop: solo i propri dati
 */
export function useMobileDataSeparation(): DataSeparationConfig {
  const { deviceType } = useDeviceDetection();
  const { user } = useUserWithLicense();

  // Determina se filtrare i dati
  const shouldFilterData = user?.type !== 'admin';
  
  // Determina il livello di accesso
  const accessLevel: 'full' | 'restricted' = user?.type === 'admin' ? 'full' : 'restricted';
  
  // Motivo della configurazione
  let reason = '';
  if (user?.type === 'admin') {
    reason = 'Admin - accesso completo a tutti i dati';
  } else if (user?.type === 'staff') {
    reason = `Staff ${deviceType} - solo dati propri`;
  } else if (user?.type === 'customer') {
    reason = `Customer ${deviceType} - solo dati propri`;
  } else {
    reason = 'Utente non identificato - accesso limitato';
  }

  return {
    shouldFilterData,
    deviceType,
    userType: user?.type,
    accessLevel,
    reason
  };
}

/**
 * Hook per inviare automaticamente l'header del tipo dispositivo nelle richieste API
 */
export function useDeviceHeaders() {
  const { deviceType } = useDeviceDetection();
  
  return {
    'x-device-type': deviceType,
    'x-client-type': 'web-app'
  };
}