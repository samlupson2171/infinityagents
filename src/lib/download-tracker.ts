import mongoose from 'mongoose';
import { connectToDatabase } from './mongodb';

interface DownloadLog {
  fileId: string;
  userId: string;
  userRole: string;
  downloadedAt: Date;
  ipAddress?: string;
  userAgent?: string;
  fileSize: number;
  success: boolean;
  errorMessage?: string;
}

// Simple in-memory storage for download logs (in production, use a proper database)
const downloadLogs: DownloadLog[] = [];

export class DownloadTracker {
  /**
   * Log a file download attempt
   */
  static async logDownload(log: DownloadLog): Promise<void> {
    try {
      // In a real application, you would save this to a database
      downloadLogs.push(log);
      
      // Keep only the last 10000 logs in memory
      if (downloadLogs.length > 10000) {
        downloadLogs.splice(0, downloadLogs.length - 10000);
      }
      
      // Optional: Save to database for persistent storage
      // await this.saveToDatabase(log);
    } catch (error) {
      console.error('Failed to log download:', error);
    }
  }

  /**
   * Get download statistics for a file
   */
  static getFileDownloadStats(fileId: string): {
    totalDownloads: number;
    successfulDownloads: number;
    failedDownloads: number;
    uniqueUsers: number;
    lastDownload?: Date;
  } {
    const fileLogs = downloadLogs.filter(log => log.fileId === fileId);
    const successfulLogs = fileLogs.filter(log => log.success);
    const failedLogs = fileLogs.filter(log => !log.success);
    const uniqueUsers = new Set(fileLogs.map(log => log.userId)).size;
    const lastDownload = fileLogs.length > 0 
      ? new Date(Math.max(...fileLogs.map(log => log.downloadedAt.getTime())))
      : undefined;

    return {
      totalDownloads: fileLogs.length,
      successfulDownloads: successfulLogs.length,
      failedDownloads: failedLogs.length,
      uniqueUsers,
      lastDownload,
    };
  }

  /**
   * Get download statistics for a user
   */
  static getUserDownloadStats(userId: string): {
    totalDownloads: number;
    successfulDownloads: number;
    failedDownloads: number;
    uniqueFiles: number;
    lastDownload?: Date;
  } {
    const userLogs = downloadLogs.filter(log => log.userId === userId);
    const successfulLogs = userLogs.filter(log => log.success);
    const failedLogs = userLogs.filter(log => !log.success);
    const uniqueFiles = new Set(userLogs.map(log => log.fileId)).size;
    const lastDownload = userLogs.length > 0 
      ? new Date(Math.max(...userLogs.map(log => log.downloadedAt.getTime())))
      : undefined;

    return {
      totalDownloads: userLogs.length,
      successfulDownloads: successfulLogs.length,
      failedDownloads: failedLogs.length,
      uniqueFiles,
      lastDownload,
    };
  }

  /**
   * Get recent download activity
   */
  static getRecentDownloads(limit: number = 50): DownloadLog[] {
    return downloadLogs
      .sort((a, b) => b.downloadedAt.getTime() - a.downloadedAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get download analytics for admin dashboard
   */
  static getDownloadAnalytics(): {
    totalDownloads: number;
    downloadsToday: number;
    downloadsThisWeek: number;
    downloadsThisMonth: number;
    topFiles: Array<{ fileId: string; downloads: number }>;
    topUsers: Array<{ userId: string; downloads: number }>;
  } {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const downloadsToday = downloadLogs.filter(log => log.downloadedAt >= today).length;
    const downloadsThisWeek = downloadLogs.filter(log => log.downloadedAt >= thisWeek).length;
    const downloadsThisMonth = downloadLogs.filter(log => log.downloadedAt >= thisMonth).length;

    // Top files by download count
    const fileDownloadCounts = new Map<string, number>();
    downloadLogs.forEach(log => {
      fileDownloadCounts.set(log.fileId, (fileDownloadCounts.get(log.fileId) || 0) + 1);
    });
    const topFiles = Array.from(fileDownloadCounts.entries())
      .map(([fileId, downloads]) => ({ fileId, downloads }))
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 10);

    // Top users by download count
    const userDownloadCounts = new Map<string, number>();
    downloadLogs.forEach(log => {
      userDownloadCounts.set(log.userId, (userDownloadCounts.get(log.userId) || 0) + 1);
    });
    const topUsers = Array.from(userDownloadCounts.entries())
      .map(([userId, downloads]) => ({ userId, downloads }))
      .sort((a, b) => b.downloads - a.downloads)
      .slice(0, 10);

    return {
      totalDownloads: downloadLogs.length,
      downloadsToday,
      downloadsThisWeek,
      downloadsThisMonth,
      topFiles,
      topUsers,
    };
  }

  /**
   * Check if user has download permission for file
   */
  static async checkDownloadPermission(
    userId: string,
    userRole: string,
    fileId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    try {
      await connectToDatabase();
      
      // Import FileStorage model
      const { FileStorage } = await import('@/models');
      
      // Check if file exists and is not orphaned
      const file = await FileStorage.findOne({ id: fileId });
      if (!file) {
        return { allowed: false, reason: 'File not found' };
      }
      
      if (file.isOrphaned) {
        return { allowed: false, reason: 'File not available' };
      }

      // Check role-based permissions
      if (userRole === 'admin') {
        return { allowed: true }; // Admins can download any file
      }
      
      if (userRole === 'agent') {
        return { allowed: true }; // Agents can download training files
      }
      
      // Other roles are not allowed
      return { allowed: false, reason: 'Insufficient permissions' };
    } catch (error) {
      console.error('Permission check error:', error);
      return { allowed: false, reason: 'Permission check failed' };
    }
  }

  /**
   * Get client IP address from request headers
   */
  static getClientIp(request: Request): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIp = request.headers.get('x-real-ip');
    const remoteAddr = request.headers.get('remote-addr');
    
    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }
    
    return realIp || remoteAddr || 'unknown';
  }

  /**
   * Rate limiting for downloads
   */
  static checkRateLimit(userId: string, windowMinutes: number = 60, maxDownloads: number = 100): {
    allowed: boolean;
    remaining: number;
    resetTime: Date;
  } {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);
    const recentDownloads = downloadLogs.filter(
      log => log.userId === userId && log.downloadedAt >= windowStart
    );
    
    const remaining = Math.max(0, maxDownloads - recentDownloads.length);
    const resetTime = new Date(Date.now() + windowMinutes * 60 * 1000);
    
    return {
      allowed: recentDownloads.length < maxDownloads,
      remaining,
      resetTime,
    };
  }

  /**
   * Save download log to database (for persistent storage)
   */
  private static async saveToDatabase(log: DownloadLog): Promise<void> {
    // This would implement saving to a proper database collection
    // For now, we're using in-memory storage
    
    // Example implementation:
    // const DownloadLog = mongoose.model('DownloadLog', downloadLogSchema);
    // await new DownloadLog(log).save();
  }
}