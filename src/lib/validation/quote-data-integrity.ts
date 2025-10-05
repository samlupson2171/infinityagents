import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';
import User from '@/models/User';

export interface DataIntegrityReport {
  timestamp: Date;
  totalQuotes: number;
  totalEnquiries: number;
  issues: {
    orphanedQuotes: number;
    inconsistentRelationships: number;
    invalidReferences: number;
    duplicateQuotes: number;
    dataCorruption: number;
  };
  details: {
    orphanedQuotes: any[];
    inconsistentRelationships: any[];
    invalidReferences: any[];
    duplicateQuotes: any[];
    dataCorruption: any[];
  };
  recommendations: string[];
}

export class QuoteDataIntegrityChecker {
  /**
   * Comprehensive data integrity check for the quote system
   */
  static async runIntegrityCheck(): Promise<DataIntegrityReport> {
    try {
      await connectDB();

      const report: DataIntegrityReport = {
        timestamp: new Date(),
        totalQuotes: 0,
        totalEnquiries: 0,
        issues: {
          orphanedQuotes: 0,
          inconsistentRelationships: 0,
          invalidReferences: 0,
          duplicateQuotes: 0,
          dataCorruption: 0,
        },
        details: {
          orphanedQuotes: [],
          inconsistentRelationships: [],
          invalidReferences: [],
          duplicateQuotes: [],
          dataCorruption: [],
        },
        recommendations: [],
      };

      // Get total counts
      report.totalQuotes = await Quote.countDocuments();
      report.totalEnquiries = await Enquiry.countDocuments();

      // Check for orphaned quotes
      await this.checkOrphanedQuotes(report);

      // Check for inconsistent relationships
      await this.checkInconsistentRelationships(report);

      // Check for invalid references
      await this.checkInvalidReferences(report);

      // Check for duplicate quotes
      await this.checkDuplicateQuotes(report);

      // Check for data corruption
      await this.checkDataCorruption(report);

      // Generate recommendations
      this.generateRecommendations(report);

      return report;

    } catch (error) {
      console.error('Data integrity check failed:', error);
      throw new Error('Failed to run data integrity check');
    }
  }

  /**
   * Check for quotes without valid enquiry references
   */
  private static async checkOrphanedQuotes(report: DataIntegrityReport): Promise<void> {
    try {
      // Find quotes with non-existent enquiries
      const quotesWithEnquiries = await Quote.aggregate([
        {
          $lookup: {
            from: 'enquiries',
            localField: 'enquiryId',
            foreignField: '_id',
            as: 'enquiry'
          }
        },
        {
          $match: {
            enquiry: { $size: 0 }
          }
        },
        {
          $project: {
            _id: 1,
            leadName: 1,
            enquiryId: 1,
            createdAt: 1,
            totalPrice: 1
          }
        }
      ]);

      report.issues.orphanedQuotes = quotesWithEnquiries.length;
      report.details.orphanedQuotes = quotesWithEnquiries.map(quote => ({
        quoteId: quote._id,
        leadName: quote.leadName,
        enquiryId: quote.enquiryId,
        createdAt: quote.createdAt,
        totalPrice: quote.totalPrice,
        issue: 'Quote references non-existent enquiry'
      }));

    } catch (error) {
      console.error('Error checking orphaned quotes:', error);
    }
  }

  /**
   * Check for enquiries that don't reference their quotes
   */
  private static async checkInconsistentRelationships(report: DataIntegrityReport): Promise<void> {
    try {
      const quotes = await Quote.find({}, { _id: 1, enquiryId: 1, leadName: 1 });
      
      for (const quote of quotes) {
        const enquiry = await Enquiry.findById(quote.enquiryId);
        
        if (enquiry) {
          // Check if enquiry references this quote
          if (!enquiry.quotes || !enquiry.quotes.includes(quote._id)) {
            report.details.inconsistentRelationships.push({
              quoteId: quote._id,
              enquiryId: quote.enquiryId,
              leadName: quote.leadName,
              issue: 'Enquiry does not reference this quote'
            });
          }

          // Check hasQuotes flag consistency
          if (enquiry.quotes && enquiry.quotes.length > 0 && !enquiry.hasQuotes) {
            report.details.inconsistentRelationships.push({
              quoteId: quote._id,
              enquiryId: quote.enquiryId,
              leadName: quote.leadName,
              issue: 'Enquiry has quotes but hasQuotes flag is false'
            });
          }
        }
      }

      report.issues.inconsistentRelationships = report.details.inconsistentRelationships.length;

    } catch (error) {
      console.error('Error checking inconsistent relationships:', error);
    }
  }

  /**
   * Check for invalid user references in quotes
   */
  private static async checkInvalidReferences(report: DataIntegrityReport): Promise<void> {
    try {
      // Check for quotes with invalid createdBy references
      const quotesWithUsers = await Quote.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'createdBy',
            foreignField: '_id',
            as: 'user'
          }
        },
        {
          $match: {
            user: { $size: 0 }
          }
        },
        {
          $project: {
            _id: 1,
            leadName: 1,
            createdBy: 1,
            createdAt: 1
          }
        }
      ]);

      report.issues.invalidReferences = quotesWithUsers.length;
      report.details.invalidReferences = quotesWithUsers.map(quote => ({
        quoteId: quote._id,
        leadName: quote.leadName,
        createdBy: quote.createdBy,
        createdAt: quote.createdAt,
        issue: 'Quote references non-existent user'
      }));

    } catch (error) {
      console.error('Error checking invalid references:', error);
    }
  }

  /**
   * Check for potential duplicate quotes
   */
  private static async checkDuplicateQuotes(report: DataIntegrityReport): Promise<void> {
    try {
      // Find potential duplicates based on enquiry, lead name, and creation time
      const duplicates = await Quote.aggregate([
        {
          $group: {
            _id: {
              enquiryId: '$enquiryId',
              leadName: '$leadName',
              totalPrice: '$totalPrice',
              arrivalDate: '$arrivalDate'
            },
            quotes: {
              $push: {
                id: '$_id',
                createdAt: '$createdAt',
                version: '$version'
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $match: {
            count: { $gt: 1 }
          }
        }
      ]);

      for (const duplicate of duplicates) {
        // Check if these are actually duplicates or legitimate versions
        const sortedQuotes = duplicate.quotes.sort((a: any, b: any) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );

        // If created within 5 minutes of each other, likely duplicates
        for (let i = 1; i < sortedQuotes.length; i++) {
          const timeDiff = new Date(sortedQuotes[i].createdAt).getTime() - 
                          new Date(sortedQuotes[i-1].createdAt).getTime();
          
          if (timeDiff < 5 * 60 * 1000) { // 5 minutes
            report.details.duplicateQuotes.push({
              enquiryId: duplicate._id.enquiryId,
              leadName: duplicate._id.leadName,
              quotes: sortedQuotes,
              issue: 'Potential duplicate quotes created within 5 minutes'
            });
          }
        }
      }

      report.issues.duplicateQuotes = report.details.duplicateQuotes.length;

    } catch (error) {
      console.error('Error checking duplicate quotes:', error);
    }
  }

  /**
   * Check for data corruption issues
   */
  private static async checkDataCorruption(report: DataIntegrityReport): Promise<void> {
    try {
      const quotes = await Quote.find({});

      for (const quote of quotes) {
        const issues: string[] = [];

        // Check for invalid dates
        if (quote.arrivalDate && isNaN(quote.arrivalDate.getTime())) {
          issues.push('Invalid arrival date');
        }

        // Check for negative values
        if (quote.totalPrice < 0) {
          issues.push('Negative total price');
        }

        if (quote.numberOfPeople <= 0) {
          issues.push('Invalid number of people');
        }

        if (quote.numberOfRooms <= 0) {
          issues.push('Invalid number of rooms');
        }

        if (quote.numberOfNights <= 0) {
          issues.push('Invalid number of nights');
        }

        // Check for missing required fields
        if (!quote.leadName || quote.leadName.trim() === '') {
          issues.push('Missing lead name');
        }

        if (!quote.hotelName || quote.hotelName.trim() === '') {
          issues.push('Missing hotel name');
        }

        if (!quote.whatsIncluded || quote.whatsIncluded.trim() === '') {
          issues.push('Missing what\'s included');
        }

        // Check for unreasonable values
        if (quote.totalPrice > 1000000) {
          issues.push('Unreasonably high price');
        }

        if (quote.numberOfPeople > 100) {
          issues.push('Unreasonably high number of people');
        }

        // Check for version inconsistencies
        if (quote.version < 1) {
          issues.push('Invalid version number');
        }

        if (issues.length > 0) {
          report.details.dataCorruption.push({
            quoteId: quote._id,
            leadName: quote.leadName,
            issues: issues
          });
        }
      }

      report.issues.dataCorruption = report.details.dataCorruption.length;

    } catch (error) {
      console.error('Error checking data corruption:', error);
    }
  }

  /**
   * Generate recommendations based on found issues
   */
  private static generateRecommendations(report: DataIntegrityReport): void {
    const recommendations: string[] = [];

    if (report.issues.orphanedQuotes > 0) {
      recommendations.push(
        `Found ${report.issues.orphanedQuotes} orphaned quotes. Consider running cleanup to remove quotes without valid enquiry references.`
      );
    }

    if (report.issues.inconsistentRelationships > 0) {
      recommendations.push(
        `Found ${report.issues.inconsistentRelationships} inconsistent relationships. Run relationship repair to fix enquiry-quote references.`
      );
    }

    if (report.issues.invalidReferences > 0) {
      recommendations.push(
        `Found ${report.issues.invalidReferences} invalid user references. These quotes may need to be reassigned to valid users.`
      );
    }

    if (report.issues.duplicateQuotes > 0) {
      recommendations.push(
        `Found ${report.issues.duplicateQuotes} potential duplicate quotes. Review and merge or remove duplicates as appropriate.`
      );
    }

    if (report.issues.dataCorruption > 0) {
      recommendations.push(
        `Found ${report.issues.dataCorruption} quotes with data corruption issues. Review and fix data integrity problems.`
      );
    }

    if (recommendations.length === 0) {
      recommendations.push('No data integrity issues found. System is healthy.');
    } else {
      recommendations.push('Run regular data integrity checks to maintain system health.');
      recommendations.push('Consider implementing automated cleanup procedures for common issues.');
    }

    report.recommendations = recommendations;
  }

  /**
   * Auto-fix common data integrity issues
   */
  static async autoFixIssues(): Promise<{
    fixed: number;
    errors: string[];
    summary: string[];
  }> {
    const result = {
      fixed: 0,
      errors: [] as string[],
      summary: [] as string[]
    };

    try {
      await connectDB();

      // Fix inconsistent hasQuotes flags
      const enquiriesWithQuotes = await Enquiry.find({
        quotes: { $exists: true, $not: { $size: 0 } },
        hasQuotes: { $ne: true }
      });

      for (const enquiry of enquiriesWithQuotes) {
        enquiry.hasQuotes = true;
        await enquiry.save();
        result.fixed++;
      }

      if (enquiriesWithQuotes.length > 0) {
        result.summary.push(`Fixed ${enquiriesWithQuotes.length} enquiries with incorrect hasQuotes flag`);
      }

      // Fix missing latestQuoteDate
      const enquiriesNeedingLatestDate = await Enquiry.find({
        quotes: { $exists: true, $not: { $size: 0 } },
        latestQuoteDate: { $exists: false }
      });

      for (const enquiry of enquiriesNeedingLatestDate) {
        const latestQuote = await Quote.findOne({ enquiryId: enquiry._id })
          .sort({ createdAt: -1 });
        
        if (latestQuote) {
          enquiry.latestQuoteDate = latestQuote.createdAt;
          await enquiry.save();
          result.fixed++;
        }
      }

      if (enquiriesNeedingLatestDate.length > 0) {
        result.summary.push(`Fixed ${enquiriesNeedingLatestDate.length} enquiries with missing latestQuoteDate`);
      }

      // Fix quotes count
      const enquiriesNeedingCount = await Enquiry.find({
        quotes: { $exists: true },
        quotesCount: { $exists: false }
      });

      for (const enquiry of enquiriesNeedingCount) {
        enquiry.quotesCount = enquiry.quotes ? enquiry.quotes.length : 0;
        await enquiry.save();
        result.fixed++;
      }

      if (enquiriesNeedingCount.length > 0) {
        result.summary.push(`Fixed ${enquiriesNeedingCount.length} enquiries with missing quotesCount`);
      }

      if (result.fixed === 0) {
        result.summary.push('No auto-fixable issues found');
      }

    } catch (error) {
      result.errors.push(`Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    return result;
  }
}

/**
 * Scheduled data integrity maintenance
 */
export class QuoteDataMaintenance {
  /**
   * Run daily maintenance tasks
   */
  static async runDailyMaintenance(): Promise<void> {
    try {
      console.log('Starting daily quote data maintenance...');

      // Run integrity check
      const report = await QuoteDataIntegrityChecker.runIntegrityCheck();
      
      // Log summary
      console.log(`Data integrity check completed:
        - Total quotes: ${report.totalQuotes}
        - Total enquiries: ${report.totalEnquiries}
        - Issues found: ${Object.values(report.issues).reduce((sum, count) => sum + count, 0)}
      `);

      // Auto-fix common issues
      const autoFixResult = await QuoteDataIntegrityChecker.autoFixIssues();
      console.log(`Auto-fix completed: ${autoFixResult.fixed} issues fixed`);

      // If significant issues found, alert administrators
      const totalIssues = Object.values(report.issues).reduce((sum, count) => sum + count, 0);
      if (totalIssues > 10) {
        console.warn(`High number of data integrity issues found: ${totalIssues}. Manual review recommended.`);
        // Here you could send an email alert to administrators
      }

    } catch (error) {
      console.error('Daily maintenance failed:', error);
    }
  }

  /**
   * Run weekly deep maintenance
   */
  static async runWeeklyMaintenance(): Promise<void> {
    try {
      console.log('Starting weekly quote data deep maintenance...');

      // Run comprehensive cleanup
      const cleanupResult = await QuoteDataConsistencyValidator.cleanupOrphanedData();
      console.log(`Cleanup completed:
        - Deleted orphaned quotes: ${cleanupResult.deletedQuotes}
        - Fixed relationships: ${cleanupResult.fixedRelationships}
        - Errors: ${cleanupResult.errors.length}
      `);

      // Run daily maintenance as well
      await this.runDailyMaintenance();

    } catch (error) {
      console.error('Weekly maintenance failed:', error);
    }
  }
}