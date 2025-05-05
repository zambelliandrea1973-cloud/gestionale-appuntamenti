import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useState, useEffect } from 'react';
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
  const { toast } = useToast();
  const [appTitle, setAppTitle] = useState<string>('Gestione Appuntamenti');
  
  // Query per ottenere le informazioni sulla licenza
  const licenseQuery = useQuery({
    queryKey: ['/api/license/license-info'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minuti
  });
  
  // Query per verificare se l'utente ha accesso PRO
  const proAccessQuery = useQuery({
    queryKey: ['/api/license/has-pro-access'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minuti
  });
  
  // Query per verificare se l'utente ha accesso BUSINESS
  const businessAccessQuery = useQuery({
    queryKey: ['/api/license/has-business-access'],
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5, // 5 minuti
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
      queryClient.invalidateQueries({ queryKey: ['/api/license/application-title'] });
      
      toast({
        title: "Licenza attivata",
        description: "La tua licenza è stata attivata con successo.",
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore nell'attivazione",
        description: error.message || "Si è verificato un errore durante l'attivazione della licenza.",
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
        title: "Codice generato",
        description: `Il codice di attivazione è: ${data.activationCode}`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Errore nella generazione",
        description: error.message || "Si è verificato un errore durante la generazione del codice.",
        variant: "destructive",
      });
    }
  });
  
  return {
    licenseInfo: licenseQuery.data as LicenseInfo,
    isLoading: licenseQuery.isLoading || proAccessQuery.isLoading || titleQuery.isLoading,
    hasProAccess: proAccessQuery.data?.hasProAccess || false,
    appTitle,
    activateLicense: activateLicenseMutation.mutate,
    generateCode: generateCodeMutation.mutate,
    activateStatus: activateLicenseMutation.status,
    generateStatus: generateCodeMutation.status,
  };
}