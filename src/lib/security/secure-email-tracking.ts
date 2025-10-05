import { connectDB } from '@/lib/mongodb';
import mongoose, { Document, Schema } from 'mongoose';
import crypto from 'crypto';

export interface IEmailTracking extends Document {
  trackingId: string; // Secure hash, not the actual quote ID
  quoteId: mongoose.Types.ObjectId;
  recipientEmail: string; // Hashed for privacy
  sentAt: Date;
  openedAt?: Date;
  clickedAt?: Date;
  booked: boolean;
  bookedAt?: Date;
  ipAddress?: string; // Hashed for privacy
  userAgent?: string;
  expiresAt: Date;
}

const EmailTrackingSchema = new Schema<IEmailTracking>({
  trackingId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  quoteId: {
    type: Schema.Types.ObjectId,
    ref: 'Quote',
    required: true,
    index: true,
  },
  recipientEmail: {
    type: String,
    required: true,
    index: true,
  },
  sentAt: {
    type: Date,
    default: Date.now,
    index: true,
  },
  openedAt: {
    type: Date,
    index: true,
  },
  clickedAt: {
    type: Date,
    index: true,
  },
  booked: {
    type: Boolean,
    default: false,
    index: true,
  },
  bookedAt: {
    type: Date,
    index: true,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expireAfterSeconds: 0 }, // TTL index
  },
}, {
  timestamps: false, // We use our own timestamp fields
});

// Compound indexes for analytics
EmailTrackingSchema.index({ sentAt: -1, booked: 1 });
EmailTrackingSchema.index({ quoteId: 1, sentAt: -1 });

const EmailTracking = mongoose.models.EmailTracking || 
  mongoose.model<IEmailTracking>('EmailTracking', EmailTrackingSchema);

export class SecureEmailTracker {
  private static readonly TRACKING_SECRET = process.env.EMAIL_TRACKING_SECRET || 'change-in-production';
  private static readonly TRACKING_EXPIRY_DAYS = 30;

  /**
   * Generate a secure tracking ID that doesn't expose the quote ID
   */
  static generateTrackingId(quoteId: string, recipientEmail: string): string {
    const timestamp = Date.now().toString();
    const randomBytes = crypto.randomBytes(8).toString('hex');
    
    // Create HMAC with quote ID, email, and timestamp
    const hmac = crypto.createHmac('sha256', this.TRACKING_SECRET);
    hmac.update(`${quoteId}:${recipientEmail}:${timestamp}:${randomBytes}`);
    const signature = hmac.digest('hex').substring(0, 16);
    
    // Combine timestamp, random bytes, and signature
    return `${timestamp}_${randomBytes}_${signature}`;
  }

  /**
   * Hash sensitive data for storage
   */
  static hashSensitiveData(data: string): string {
    return crypto.createHash('sha256').update(data + this.TRACKING_SECRET).digest('hex');
  }

  /**
   * Create email tracking record
   */
  static async createTrackingRecord(
    quoteId: string,
    recipientEmail: string
  ): Promise<string> {
    await connectDB();

    const trackingId = this.generateTrackingId(quoteId, recipientEmail);
    const hashedEmail = this.hashSensitiveData(recipientEmail);
    
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.TRACKING_EXPIRY_DAYS);

    const tracking = new EmailTracking({
      trackingId,
      quoteId: new mongoose.Types.ObjectId(quoteId),
      recipientEmail: hashedEmail,
      sentAt: new Date(),
      expiresAt,
    });

    await tracking.save();
    return trackingId;
  }

  /**
   * Track email open (via tracking pixel)
   */
  static async trackEmailOpen(
    trackingId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<boolean> {
    try {
      await connectDB();

      const hashedIP = ipAddress ? this.hashSensitiveData(ipAddress) : undefined;

      const result = await EmailTracking.findOneAndUpdate(
        { 
          trackingId,
          openedAt: { $exists: false }, // Only track first open
        },
        {
          $set: {
            openedAt: new Date(),
            ipAddress: hashedIP,
            userAgent: userAgent?.substring(0, 200), // Truncate user agent
          },
        }
      );

      return !!result;
    } catch (error) {
      console.error('Error tracking email open:', error);
      return false;
    }
  }

  /**
   * Track email click (CTA button)
   */
  static async trackEmailClick(
    trackingId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<{ success: boolean; quoteId?: string }> {
    try {
      await connectDB();

      const hashedIP = ipAddress ? this.hashSensitiveData(ipAddress) : undefined;

      const tracking = await EmailTracking.findOneAndUpdate(
        { trackingId },
        {
          $set: {
            clickedAt: new Date(),
            ipAddress: hashedIP,
            userAgent: userAgent?.substring(0, 200),
          },
        },
        { new: true }
      );

      if (!tracking) {
        return { success: false };
      }

      return { 
        success: true, 
        quoteId: tracking.quoteId.toString() 
      };
    } catch (error) {
      console.error('Error tracking email click:', error);
      return { success: false };
    }
  }

  /**
   * Track booking conversion
   */
  static async trackBookingConversion(
    trackingId: string
  ): Promise<boolean> {
    try {
      await connectDB();

      const result = await EmailTracking.findOneAndUpdate(
        { 
          trackingId,
          booked: false, // Only track first booking
        },
        {
          $set: {
            booked: true,
            bookedAt: new Date(),
          },
        }
      );

      return !!result;
    } catch (error) {
      console.error('Error tracking booking conversion:', error);
      return false;
    }
  }

  /**
   * Get tracking statistics for a quote (without exposing sensitive data)
   */
  static async getQuoteTrackingStats(quoteId: string): Promise<{
    sent: boolean;
    sentAt?: Date;
    opened: boolean;
    openedAt?: Date;
    clicked: boolean;
    clickedAt?: Date;
    booked: boolean;
    bookedAt?: Date;
  }> {
    try {
      await connectDB();

      const tracking = await EmailTracking.findOne({ 
        quoteId: new mongoose.Types.ObjectId(quoteId) 
      }).sort({ sentAt: -1 }); // Get most recent tracking record

      if (!tracking) {
        return {
          sent: false,
          opened: false,
          clicked: false,
          booked: false,
        };
      }

      return {
        sent: true,
        sentAt: tracking.sentAt,
        opened: !!tracking.openedAt,
        openedAt: tracking.openedAt,
        clicked: !!tracking.clickedAt,
        clickedAt: tracking.clickedAt,
        booked: tracking.booked,
        bookedAt: tracking.bookedAt,
      };
    } catch (error) {
      console.error('Error getting quote tracking stats:', error);
      return {
        sent: false,
        opened: false,
        clicked: false,
        booked: false,
      };
    }
  }

  /**
   * Get aggregated tracking statistics (for analytics)
   */
  static async getAggregatedStats(
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalSent: number;
    totalOpened: number;
    totalClicked: number;
    totalBooked: number;
    openRate: number;
    clickRate: number;
    conversionRate: number;
  }> {
    try {
      await connectDB();

      const dateFilter: any = {};
      if (startDate || endDate) {
        dateFilter.sentAt = {};
        if (startDate) dateFilter.sentAt.$gte = startDate;
        if (endDate) dateFilter.sentAt.$lte = endDate;
      }

      const stats = await EmailTracking.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            totalSent: { $sum: 1 },
            totalOpened: { 
              $sum: { $cond: [{ $ne: ['$openedAt', null] }, 1, 0] } 
            },
            totalClicked: { 
              $sum: { $cond: [{ $ne: ['$clickedAt', null] }, 1, 0] } 
            },
            totalBooked: { 
              $sum: { $cond: ['$booked', 1, 0] } 
            },
          },
        },
      ]);

      const result = stats[0] || {
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalBooked: 0,
      };

      return {
        ...result,
        openRate: result.totalSent > 0 ? (result.totalOpened / result.totalSent) * 100 : 0,
        clickRate: result.totalSent > 0 ? (result.totalClicked / result.totalSent) * 100 : 0,
        conversionRate: result.totalSent > 0 ? (result.totalBooked / result.totalSent) * 100 : 0,
      };
    } catch (error) {
      console.error('Error getting aggregated tracking stats:', error);
      return {
        totalSent: 0,
        totalOpened: 0,
        totalClicked: 0,
        totalBooked: 0,
        openRate: 0,
        clickRate: 0,
        conversionRate: 0,
      };
    }
  }

  /**
   * Validate tracking ID format
   */
  static validateTrackingId(trackingId: string): boolean {
    if (!trackingId || typeof trackingId !== 'string') {
      return false;
    }

    // Check format: timestamp_randomBytes_signature
    const parts = trackingId.split('_');
    if (parts.length !== 3) {
      return false;
    }

    const [timestamp, randomBytes, signature] = parts;

    // Validate timestamp (should be a number)
    if (!/^\d+$/.test(timestamp)) {
      return false;
    }

    // Validate random bytes (should be hex)
    if (!/^[a-f0-9]{16}$/.test(randomBytes)) {
      return false;
    }

    // Validate signature (should be hex)
    if (!/^[a-f0-9]{16}$/.test(signature)) {
      return false;
    }

    // Check if timestamp is reasonable (not too old or in future)
    const trackingTime = parseInt(timestamp);
    const now = Date.now();
    const maxAge = this.TRACKING_EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    if (trackingTime > now || (now - trackingTime) > maxAge) {
      return false;
    }

    return true;
  }

  /**
   * Clean up expired tracking records (called by cron job)
   */
  static async cleanupExpiredRecords(): Promise<number> {
    try {
      await connectDB();

      const result = await EmailTracking.deleteMany({
        expiresAt: { $lt: new Date() },
      });

      return result.deletedCount || 0;
    } catch (error) {
      console.error('Error cleaning up expired tracking records:', error);
      return 0;
    }
  }

  /**
   * Generate tracking pixel URL
   */
  static generateTrackingPixelUrl(trackingId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/api/tracking/pixel/${trackingId}`;
  }

  /**
   * Generate secure booking link
   */
  static generateBookingLink(trackingId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/booking/interest?t=${trackingId}`;
  }
}

export default EmailTracking;