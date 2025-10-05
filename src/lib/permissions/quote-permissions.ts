import { IUser } from '@/models/User';
import { IQuote } from '@/models/Quote';

export interface QuotePermissions {
  canCreateQuote: boolean;
  canViewQuote: boolean;
  canEditQuote: boolean;
  canDeleteQuote: boolean;
  canSendQuoteEmail: boolean;
  canViewQuoteHistory: boolean;
  canExportQuotes: boolean;
  canViewQuoteAnalytics: boolean;
  canManageQuoteSettings: boolean;
}

export interface UserContext {
  id: string;
  role: 'admin' | 'agent';
  isApproved: boolean;
  registrationStatus: string;
}

export class QuotePermissionManager {
  /**
   * Get comprehensive permissions for a user regarding quote operations
   */
  static getQuotePermissions(user: UserContext): QuotePermissions {
    // Base permissions - no access by default
    const permissions: QuotePermissions = {
      canCreateQuote: false,
      canViewQuote: false,
      canEditQuote: false,
      canDeleteQuote: false,
      canSendQuoteEmail: false,
      canViewQuoteHistory: false,
      canExportQuotes: false,
      canViewQuoteAnalytics: false,
      canManageQuoteSettings: false,
    };

    // User must be approved to have any quote permissions
    if (!user.isApproved || user.registrationStatus !== 'approved') {
      return permissions;
    }

    // Admin permissions - full access to all quote operations
    if (user.role === 'admin') {
      return {
        canCreateQuote: true,
        canViewQuote: true,
        canEditQuote: true,
        canDeleteQuote: true,
        canSendQuoteEmail: true,
        canViewQuoteHistory: true,
        canExportQuotes: true,
        canViewQuoteAnalytics: true,
        canManageQuoteSettings: true,
      };
    }

    // Agent permissions - limited access
    if (user.role === 'agent') {
      return {
        canCreateQuote: false, // Agents cannot create quotes
        canViewQuote: false,   // Agents cannot view quotes directly
        canEditQuote: false,   // Agents cannot edit quotes
        canDeleteQuote: false, // Agents cannot delete quotes
        canSendQuoteEmail: false, // Agents cannot send quote emails
        canViewQuoteHistory: false, // Agents cannot view quote history
        canExportQuotes: false, // Agents cannot export quotes
        canViewQuoteAnalytics: false, // Agents cannot view analytics
        canManageQuoteSettings: false, // Agents cannot manage settings
      };
    }

    return permissions;
  }

  /**
   * Check if user can perform a specific quote operation
   */
  static canPerformOperation(
    user: UserContext,
    operation: keyof QuotePermissions
  ): boolean {
    const permissions = this.getQuotePermissions(user);
    return permissions[operation];
  }

  /**
   * Check if user can access a specific quote
   */
  static canAccessQuote(user: UserContext, quote?: IQuote): boolean {
    const permissions = this.getQuotePermissions(user);
    
    if (!permissions.canViewQuote) {
      return false;
    }

    // Admins can access all quotes
    if (user.role === 'admin') {
      return true;
    }

    // Additional logic for quote-specific access could go here
    // For now, agents have no quote access
    return false;
  }

  /**
   * Check if user can modify a specific quote
   */
  static canModifyQuote(user: UserContext, quote?: IQuote): boolean {
    const permissions = this.getQuotePermissions(user);
    
    if (!permissions.canEditQuote) {
      return false;
    }

    // Admins can modify all quotes
    if (user.role === 'admin') {
      return true;
    }

    // Additional logic for quote-specific modification rights could go here
    return false;
  }

  /**
   * Validate user has required permissions for an operation
   */
  static validatePermission(
    user: UserContext,
    operation: keyof QuotePermissions,
    errorMessage?: string
  ): void {
    if (!this.canPerformOperation(user, operation)) {
      throw new Error(
        errorMessage || `Insufficient permissions for operation: ${operation}`
      );
    }
  }

  /**
   * Get permission summary for debugging/logging
   */
  static getPermissionSummary(user: UserContext): {
    userId: string;
    role: string;
    isApproved: boolean;
    permissions: QuotePermissions;
  } {
    return {
      userId: user.id,
      role: user.role,
      isApproved: user.isApproved,
      permissions: this.getQuotePermissions(user),
    };
  }
}

/**
 * Middleware function to check quote permissions
 */
export function requireQuotePermission(operation: keyof QuotePermissions) {
  return (user: UserContext) => {
    QuotePermissionManager.validatePermission(
      user,
      operation,
      `Access denied: ${operation} permission required`
    );
  };
}

/**
 * Permission constants for easy reference
 */
export const QUOTE_OPERATIONS = {
  CREATE: 'canCreateQuote' as const,
  VIEW: 'canViewQuote' as const,
  EDIT: 'canEditQuote' as const,
  DELETE: 'canDeleteQuote' as const,
  SEND_EMAIL: 'canSendQuoteEmail' as const,
  VIEW_HISTORY: 'canViewQuoteHistory' as const,
  EXPORT: 'canExportQuotes' as const,
  VIEW_ANALYTICS: 'canViewQuoteAnalytics' as const,
  MANAGE_SETTINGS: 'canManageQuoteSettings' as const,
} as const;