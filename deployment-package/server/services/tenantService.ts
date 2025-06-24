/**
 * Servizio per la gestione dell'isolamento dei tenant
 * Ogni utente ha la propria applicazione dedicata con database separato
 * Solo l'admin può accedere a funzioni globali di gestione
 */

import { storage } from "../storage";

export interface TenantContext {
  userId: number;
  userType: 'admin' | 'customer' | 'staff' | 'client';
  username: string;
  isIsolated: boolean;
}

class TenantService {
  /**
   * Crea il contesto tenant per l'utente corrente
   */
  createTenantContext(user: any): TenantContext {
    return {
      userId: user.id,
      userType: user.type,
      username: user.username,
      isIsolated: user.type !== 'admin' // Solo admin non è isolato
    };
  }

  /**
   * Verifica se l'utente può accedere ai dati globali
   */
  canAccessGlobalData(context: TenantContext): boolean {
    return context.userType === 'admin';
  }

  /**
   * Verifica se l'utente può gestire pagamenti e abbonamenti
   */
  canManagePayments(context: TenantContext): boolean {
    return context.userType === 'admin';
  }

  /**
   * Verifica se l'utente può gestire clienti
   */
  canManageClients(context: TenantContext): boolean {
    return context.userType === 'admin' || context.userType === 'customer';
  }

  /**
   * Filtra i dati per il tenant corrente
   */
  filterDataForTenant<T extends { userId?: number }>(data: T[], context: TenantContext): T[] {
    if (this.canAccessGlobalData(context)) {
      return data; // Admin vede tutto
    }
    
    // Altri utenti vedono solo i propri dati
    return data.filter(item => item.userId === context.userId);
  }

  /**
   * Aggiunge automaticamente userId ai dati per isolamento
   */
  addTenantId<T>(data: T, context: TenantContext): T & { userId: number } {
    if (this.canAccessGlobalData(context) && !context.isIsolated) {
      // Admin può specificare userId manualmente
      return data as T & { userId: number };
    }
    
    // Altri utenti hanno userId forzato
    return {
      ...data,
      userId: context.userId
    };
  }

  /**
   * Verifica che l'utente possa accedere a un dato specifico
   */
  canAccessData(ownerId: number, context: TenantContext): boolean {
    if (this.canAccessGlobalData(context)) {
      return true; // Admin può accedere a tutto
    }
    
    return ownerId === context.userId; // Altri utenti solo ai propri dati
  }

  /**
   * Ottiene le funzionalità disponibili per il tipo di utente
   */
  getAvailableFeatures(context: TenantContext): string[] {
    const baseFeatures = ['dashboard', 'calendar', 'settings'];
    
    switch (context.userType) {
      case 'admin':
        return [
          ...baseFeatures,
          'clients',
          'services', 
          'appointments',
          'invoices',
          'reports',
          'payments',
          'subscriptions',
          'referrals',
          'user-management',
          'system-settings'
        ];
        
      case 'customer':
        return [
          ...baseFeatures,
          'clients',
          'services',
          'appointments', 
          'invoices',
          'reports'
        ];
        
      case 'staff':
        return [
          ...baseFeatures,
          'appointments',
          'clients'
        ];
        
      case 'client':
        return [
          'appointments',
          'profile'
        ];
        
      default:
        return baseFeatures;
    }
  }

  /**
   * Crea layout UI specifico per il tipo di utente
   */
  getTenantLayout(context: TenantContext) {
    const features = this.getAvailableFeatures(context);
    
    return {
      showSidebar: context.userType !== 'client',
      availableRoutes: features,
      showAdminPanel: context.userType === 'admin',
      showPayments: this.canManagePayments(context),
      showClientManagement: this.canManageClients(context),
      theme: this.getTenantTheme(context)
    };
  }

  /**
   * Ottiene tema specifico per il tenant
   */
  private getTenantTheme(context: TenantContext) {
    switch (context.userType) {
      case 'admin':
        return {
          primary: '#dc2626', // Rosso per admin
          variant: 'professional'
        };
      case 'customer':
        return {
          primary: '#2563eb', // Blu per customer
          variant: 'professional'
        };
      case 'staff':
        return {
          primary: '#059669', // Verde per staff
          variant: 'tint'
        };
      case 'client':
        return {
          primary: '#7c3aed', // Viola per client
          variant: 'vibrant'
        };
      default:
        return {
          primary: '#6b7280',
          variant: 'professional'
        };
    }
  }
}

export const tenantService = new TenantService();