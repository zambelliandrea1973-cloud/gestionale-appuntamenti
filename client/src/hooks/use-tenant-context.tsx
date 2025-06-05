import { createContext, ReactNode, useContext } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export interface TenantPermissions {
  canAccessGlobalData: boolean;
  canManagePayments: boolean;
  canManageClients: boolean;
}

export interface TenantLayout {
  showSidebar: boolean;
  availableRoutes: string[];
  showAdminPanel: boolean;
  showPayments: boolean;
  showClientManagement: boolean;
  theme: {
    primary: string;
    variant: string;
  };
}

export interface TenantContext {
  userId: number;
  userType: 'admin' | 'customer' | 'staff' | 'client';
  username: string;
  isIsolated: boolean;
  availableFeatures: string[];
  layout: TenantLayout;
  permissions: TenantPermissions;
}

interface TenantContextType {
  context: TenantContext | null;
  isLoading: boolean;
  error: Error | null;
  hasFeature: (feature: string) => boolean;
  canAccess: (resource: string) => boolean;
}

const TenantContextContext = createContext<TenantContextType | null>(null);

export function TenantContextProvider({ children }: { children: ReactNode }) {
  const {
    data: context,
    error,
    isLoading,
  } = useQuery<TenantContext>({
    queryKey: ["/api/tenant-context"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/tenant-context");
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("UNAUTHENTICATED"); // Forza skip se non autenticato
          }
          throw new Error(`HTTP ${response.status}`);
        }
        const data = await response.json();
        console.log(`🏢 FRONTEND: Contesto tenant caricato per ${data.username} (${data.userType})`);
        return data;
      } catch (error) {
        if (error.message === "UNAUTHENTICATED") {
          throw error; // Propaga errore di autenticazione
        }
        console.error("Errore caricamento contesto tenant:", error);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 1;
    },
    staleTime: 5 * 60 * 1000, // 5 minuti
    gcTime: 10 * 60 * 1000, // 10 minuti
  });

  const hasFeature = (feature: string): boolean => {
    return context?.availableFeatures.includes(feature) || false;
  };

  const canAccess = (resource: string): boolean => {
    switch (resource) {
      case 'global-data':
        return context?.permissions.canAccessGlobalData || false;
      case 'payments':
        return context?.permissions.canManagePayments || false;
      case 'clients':
        return context?.permissions.canManageClients || false;
      default:
        return hasFeature(resource);
    }
  };

  return (
    <TenantContextContext.Provider
      value={{
        context: context || null,
        isLoading,
        error,
        hasFeature,
        canAccess,
      }}
    >
      {children}
    </TenantContextContext.Provider>
  );
}

export function useTenantContext() {
  const context = useContext(TenantContextContext);
  if (!context) {
    throw new Error("useTenantContext must be used within a TenantContextProvider");
  }
  return context;
}