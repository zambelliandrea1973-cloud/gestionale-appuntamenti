/**
 * Service for managing tenant isolation
 * Each user has their own dedicated application with a separate database
 * Only the admin can access global management functions
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
   * Create the tenant context for the current user
   */
  createTenantContext(user: any): TenantContext {
    return {
      userId: user.id,
      userType: user.type,
      username: user.username,
      isIsolated: user.type !== 'admin' // Only admin is not isolated
    };
  }

  /**
   * Check if the user can access global data
   */
  canAccessGlobalData(context: TenantContext): boolean {
    return context.userType === 'admin';
  }

  /**
   * Check if the user can manage payments and subscriptions
   */
  canManagePayments(context: TenantContext): boolean {
    return context.userType === 'admin';
  }

  /**
   * Check if the user can manage clients
   */
  canManageClients(context: TenantContext): boolean {
    return context.userType === 'admin' || context.userType === 'customer';
  }

  /**
   * Filter the data for the current tenant
   */
  filterDataForTenant<T extends { userId?: number }>(data: T[], context: TenantContext): T[] {
    if (this.canAccessGlobalData(context)) {
      return data; // Admin sees everything
    }
    
    // Other users can only see their own data
    return data.filter(item => item.userId === context.userId);
  }

  /**
   * Automatically adds userId to data for isolation
   */
  addTenantId<T>(data: T, context: TenantContext): T & { userId: number } {
    if (this.canAccessGlobalData(context) && !context.isIsolated) {
      // Admin can specify userId manually
      return data as T & { userId: number };
    }
    
    // Other users have userId forced
    return {
      ...data,
      userId: context.userId
    };
  }

  /**
   * Verify that the user can access a specific record
   */
  canAccessData(ownerId: number, context: TenantContext): boolean {
    if (this.canAccessGlobalData(context)) {
      return true; // Admin can access everything
    }
    
    return ownerId === context.userId; // Other users only to their own data
  }

  /**
   * Get the features available for the user type
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
   * Create UI layout specific to the user type
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
   * Get theme specific to the tenant
   */
  private getTenantTheme(context: TenantContext) {
    switch (context.userType) {
      case 'admin':
        return {
          primary: '#dc2626', // Red for admin
          variant: 'professional'
        };
      case 'customer':
        return {
          primary: '#2563eb', // Blue for customer
          variant: 'professional'
        };
      case 'staff':
        return {
          primary: '#059669', // Green for staff
          variant: 'tint'
        };
      case 'client':
        return {
          primary: '#7c3aed', // Purple for client
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