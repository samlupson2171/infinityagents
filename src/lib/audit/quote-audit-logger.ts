import { connectDB } from '@/lib/mongodb';
import mongoose, { Document, Schema } from 'mongoose';

export interface IAuditLog extends Document {
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userRole: 'admin' | 'agent';
  action: string;
  resource: 'quote' | 'enquiry' | 'email';
  resourceId?: mongoose.Types.ObjectId;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  success: boolean;
  errorMessage?: string;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  userEmail: {
    type: String,
    required: true,
    index: true,
  },
  userRole: {
    type: String,
    enum: ['admin', 'agent'],
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  resource: {
    type: String,
    enum: ['quote', 'enquiry', 'email'],
    required: true,
    index: true,
  },
  resourceId: {
    type: Schema.Types.ObjectId,
    index: true,
  },
  details: {
    type: Schema.Types.Mixed,
    default: {},
  },
  ipAddress: {
    type: String,
    index: true,
  },
  userAgent: {
    type: String,
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
  success: {
    type: Boolean,
    required: true,
    index: true,
  },
  errorMessage: {
    type: String,
  },
}, {
  timestamps: false, // We use our own timestamp field
});

// Compound indexes for common queries
AuditLogSchema.index({ userId: 1, timestamp: -1 });
AuditLogSchema.index({ resource: 1, resourceId: 1, timestamp: -1 });
AuditLogSchema.index({ action: 1, timestamp: -1 });
AuditLogSchema.index({ success: 1, timestamp: -1 });

// TTL index to automatically delete old audit logs after 2 years
AuditLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 }); // 2 years

const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export interface AuditContext {
  userId: string;
  userEmail: string;
  userRole: 'admin' | 'agent';
  ipAddress?: string;
  userAgent?: string;
}

export interface AuditLogEntry {
  action: string;
  resource: 'quote' | 'enquiry' | 'email';
  resourceId?: string;
  details?: Record<string, any>;
  success: boolean;
  errorMessage?: string;
}

export class QuoteAuditLogger {
  /**
   * Log a quote-related action
   */
  static async logAction(
    context: AuditContext,
    entry: AuditLogEntry
  ): Promise<void> {
    try {
      await connectDB();

      const auditLog = new AuditLog({
        userId: new mongoose.Types.ObjectId(context.userId),
        userEmail: context.userEmail,
        userRole: context.userRole,
        action: entry.action,
        resource: entry.resource,
        resourceId: entry.resourceId ? new mongoose.Types.ObjectId(entry.resourceId) : undefined,
        details: entry.details || {},
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        success: entry.success,
        errorMessage: entry.errorMessage,
        timestamp: new Date(),
      });

      await auditLog.save();
    } catch (error) {
      // Log audit failures to console but don't throw to avoid breaking main operations
      console.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Log quote creation
   */
  static async logQuoteCreation(
    context: AuditContext,
    quoteId: string,
    enquiryId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logAction(context, {
      action: 'CREATE_QUOTE',
      resource: 'quote',
      resourceId: quoteId,
      details: {
        enquiryId,
        operation: 'create',
      },
      success,
      errorMessage,
    });
  }

  /**
   * Log quote update
   */
  static async logQuoteUpdate(
    context: AuditContext,
    quoteId: string,
    changes: Record<string, any>,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logAction(context, {
      action: 'UPDATE_QUOTE',
      resource: 'quote',
      resourceId: quoteId,
      details: {
        changes,
        operation: 'update',
      },
      success,
      errorMessage,
    });
  }

  /**
   * Log quote deletion
   */
  static async logQuoteDeletion(
    context: AuditContext,
    quoteId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logAction(context, {
      action: 'DELETE_QUOTE',
      resource: 'quote',
      resourceId: quoteId,
      details: {
        operation: 'delete',
      },
      success,
      errorMessage,
    });
  }

  /**
   * Log quote email sending
   */
  static async logQuoteEmailSent(
    context: AuditContext,
    quoteId: string,
    recipientEmail: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logAction(context, {
      action: 'SEND_QUOTE_EMAIL',
      resource: 'email',
      resourceId: quoteId,
      details: {
        recipientEmail,
        operation: 'send_email',
      },
      success,
      errorMessage,
    });
  }

  /**
   * Log quote viewing
   */
  static async logQuoteView(
    context: AuditContext,
    quoteId: string,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logAction(context, {
      action: 'VIEW_QUOTE',
      resource: 'quote',
      resourceId: quoteId,
      details: {
        operation: 'view',
      },
      success,
      errorMessage,
    });
  }

  /**
   * Log quote export
   */
  static async logQuoteExport(
    context: AuditContext,
    filters: Record<string, any>,
    exportCount: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    await this.logAction(context, {
      action: 'EXPORT_QUOTES',
      resource: 'quote',
      details: {
        filters,
        exportCount,
        operation: 'export',
      },
      success,
      errorMessage,
    });
  }

  /**
   * Log permission denied attempts
   */
  static async logPermissionDenied(
    context: AuditContext,
    attemptedAction: string,
    resource: 'quote' | 'enquiry' | 'email',
    resourceId?: string
  ): Promise<void> {
    await this.logAction(context, {
      action: 'PERMISSION_DENIED',
      resource,
      resourceId,
      details: {
        attemptedAction,
        operation: 'permission_check',
      },
      success: false,
      errorMessage: 'Insufficient permissions',
    });
  }

  /**
   * Get audit logs for a specific resource
   */
  static async getResourceAuditLogs(
    resourceType: 'quote' | 'enquiry' | 'email',
    resourceId: string,
    limit: number = 50
  ): Promise<IAuditLog[]> {
    await connectDB();

    return AuditLog.find({
      resource: resourceType,
      resourceId: new mongoose.Types.ObjectId(resourceId),
    })
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get audit logs for a specific user
   */
  static async getUserAuditLogs(
    userId: string,
    limit: number = 100
  ): Promise<IAuditLog[]> {
    await connectDB();

    return AuditLog.find({
      userId: new mongoose.Types.ObjectId(userId),
    })
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get security-related audit logs (failed operations, permission denials)
   */
  static async getSecurityAuditLogs(
    limit: number = 100
  ): Promise<IAuditLog[]> {
    await connectDB();

    return AuditLog.find({
      $or: [
        { success: false },
        { action: 'PERMISSION_DENIED' },
      ],
    })
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  /**
   * Get audit statistics
   */
  static async getAuditStatistics(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalActions: number;
    successfulActions: number;
    failedActions: number;
    actionsByType: Record<string, number>;
    actionsByUser: Record<string, number>;
  }> {
    await connectDB();

    const dateFilter: any = {};
    if (startDate || endDate) {
      dateFilter.timestamp = {};
      if (startDate) dateFilter.timestamp.$gte = startDate;
      if (endDate) dateFilter.timestamp.$lte = endDate;
    }

    const [totalStats, actionStats, userStats] = await Promise.all([
      AuditLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            successful: { $sum: { $cond: ['$success', 1, 0] } },
            failed: { $sum: { $cond: ['$success', 0, 1] } },
          },
        },
      ]),
      AuditLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$action',
            count: { $sum: 1 },
          },
        },
      ]),
      AuditLog.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: '$userEmail',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const stats = totalStats[0] || { total: 0, successful: 0, failed: 0 };
    const actionsByType: Record<string, number> = {};
    const actionsByUser: Record<string, number> = {};

    actionStats.forEach((stat) => {
      actionsByType[stat._id] = stat.count;
    });

    userStats.forEach((stat) => {
      actionsByUser[stat._id] = stat.count;
    });

    return {
      totalActions: stats.total,
      successfulActions: stats.successful,
      failedActions: stats.failed,
      actionsByType,
      actionsByUser,
    };
  }
}

export default AuditLog;