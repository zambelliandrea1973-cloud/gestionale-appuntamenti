// @ts-nocheck
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/use-toast';

// Tipi di licenze supportati
export enum LicenseType {
  TRIAL = 'trial',
  BASE = 'base',
  PRO = 'pro',
  BUSINESS = 'business',
  PASSEPARTOUT = 'passepartout'
}

// Interfaccia per le informazioni sulla licenza
export interface LicenseInfo {
  type: LicenseType;
  expiresAt: string | null;
  isActive: boolean;
  daysLeft: number | null;
}

// Hook per la gestione delle licenze
export function useLicense() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [appTitle, setAppTitle] = useState<string>(t('app.defaultTitle', 'Appointment Manager'));
  
  // Query per ottenere le informazioni sulla licenza
  const licenseQuery = useQuery({
    queryKey: ['/api/license/license-info'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minuti
  });
  
  // Query per verificare se l'utente ha accesso PRO
  // staleTime: 0 per forzare refetch dopo login (la cache viene pulita al login)
  const proAccessQuery = useQuery({
    queryKey: ['/api/license/has-pro-access'],
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0, // Sempre stale per forzare refetch dopo login
  });
  
  // Query per verificare se l'utente ha accesso BUSINESS
  // staleTime: 0 per forzare refetch dopo login (la cache viene pulita al login)
  const businessAccessQuery = useQuery({
    queryKey: ['/api/license/has-business-access'],
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
    staleTime: 0, // Sempre stale per forzare refetch dopo login
  });
  
  // Query per ottenere il titolo dell'applicazione
  const titleQuery = useQuery({
    queryKey: ['/api/license/application-title'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minuti
  });
  
  // Aggiorna il titolo quando viene caricato
  useEffect(() => {
    if (titleQuery.data?.title) {
      setAppTitle(titleQuery.data.title);
    }
  }, [titleQuery.data]);
  
  // Mutazione per attivare una licenza
  const activateLicenseMutation = useMutation({
    mutationFn: async (activationCode: string) => {
      const response = await apiRequest('POST', '/api/license/activate-license', { activationCode });
      return response.json();
    },
    onSuccess: () => {
      // Invalida tutte le query relative alle licenze per aggiornare i dati
      queryClient.invalidateQueries({ queryKey: ['/api/license/license-info'] });
      queryClient.invalidateQueries({ queryKey: ['/api/license/has-pro-access'] });
      queryClient.invalidateQueries({ queryKey: ['/api/license/has-business-access'] });
      queryClient.invalidateQueries({ queryKey: ['/api/license/application-title'] });
      
      toast({
        title: t('i18nFinale.useLicense.activatedTitle'),
        description: t('i18nFinale.useLicense.activated'),
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: t('i18nFinale.useLicense.activationError'),
        description: error.message || t('i18nFinale.useLicense.activationErrorDesc'),
        variant: "destructive",
      });
    }
  });
  
  // Per test e sviluppo, mutazione per generare un codice di licenza
  const generateCodeMutation = useMutation({
    mutationFn: async (licenseType: LicenseType) => {
      const response = await apiRequest('POST', '/api/license/generate-code', { licenseType });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: t('i18nFinale.useLicense.codeGeneratedTitle'),
        description: t('i18nFinale.useLicense.codeGeneratedDesc', { code: data.activationCode }),
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: t('i18nFinale.useLicense.generationError'),
        description: error.message || t('i18nFinale.useLicense.generationErrorDesc'),
        variant: "destructive",
      });
    }
  });
  
  return {
    licenseInfo: licenseQuery.data as LicenseInfo,
    isLoading: licenseQuery.isLoading || proAccessQuery.isLoading || businessAccessQuery.isLoading || titleQuery.isLoading,
    hasProAccess: proAccessQuery.data === true,
    hasBusinessAccess: businessAccessQuery.data === true,
    appTitle,
    activateLicense: activateLicenseMutation.mutate,
    generateCode: generateCodeMutation.mutate,
    activateStatus: activateLicenseMutation.status,
    generateStatus: generateCodeMutation.status,
  };
}