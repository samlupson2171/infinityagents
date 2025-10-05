import { connectDB } from '@/lib/mongodb';
import Quote from '@/models/Quote';
import Enquiry from '@/models/Enquiry';
import User from '@/models/User';
import { QuoteFormData, serverSideQuoteValidation } from './quote-validation';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  data?: any;
}

export class QuoteServerValidator {
  /**
   * Comprehensive server-side validation for quote creation
   */
  static async validateQuoteCreation(
    quoteData: QuoteFormData,
    userId: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let enquiry = null;

    try {
      await connectDB();

      // 1. Validate enquiry exists and is accessible
      const enquiryValidation = await this.validateEnquiryExists(quoteData.enquiryId, userId);
      if (!enquiryValidation.isValid) {
        errors.push(...enquiryValidation.errors);
      } else {
        enquiry = enquiryValidation.data;
      }

      // 2. Validate user permissions
      const permissionValidation = await this.validateUserPermissions(userId, 'create');
      if (!permissionValidation.isValid) {
        errors.push(...permissionValidation.errors);
      }

      // 3. Check for duplicate quotes (business rule: max 5 quotes per enquiry)
      const duplicateValidation = await this.validateDuplicateQuotes(quoteData.enquiryId);
      if (!duplicateValidation.isValid) {
        errors.push(...duplicateValidation.errors);
      }
      if (duplicateValidation.warnings.length > 0) {
        warnings.push(...duplicateValidation.warnings);
      }

      // 4. Validate business logic consistency
      const consistencyValidation = this.validateBusinessLogic(quoteData, enquiry);
      if (!consistencyValidation.isValid) {
        errors.push(...consistencyValidation.errors);
      }
      if (consistencyValidation.warnings.length > 0) {
        warnings.push(...consistencyValidation.warnings);
      }

      // 5. Validate pricing reasonableness
      const pricingValidation = this.validatePricingLogic(quoteData);
      if (!pricingValidation.isValid) {
        errors.push(...pricingValidation.errors);
      }
      if (pricingValidation.warnings.length > 0) {
        warnings.push(...pricingValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: { enquiry }
      };

    } catch (error) {
      console.error('Quote validation error:', error);
      return {
        isValid: false,
        errors: ['Internal validation error occurred'],
        warnings: []
      };
    }
  }

  /**
   * Validate quote updates with version control
   */
  static async validateQuoteUpdate(
    quoteId: string,
    updateData: Partial<QuoteFormData>,
    userId: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let existingQuote = null;

    try {
      await connectDB();

      // 1. Validate quote exists
      existingQuote = await Quote.findById(quoteId).populate('enquiryId');
      if (!existingQuote) {
        errors.push('Quote not found');
        return { isValid: false, errors, warnings };
      }

      // 2. Validate user can edit this quote
      const permissionValidation = await this.validateEditPermissions(existingQuote, userId);
      if (!permissionValidation.isValid) {
        errors.push(...permissionValidation.errors);
      }

      // 3. Validate quote is not in a locked state
      const stateValidation = this.validateQuoteState(existingQuote);
      if (!stateValidation.isValid) {
        errors.push(...stateValidation.errors);
      }

      // 4. Validate update data consistency
      const mergedData = { ...existingQuote.toObject(), ...updateData };
      const consistencyValidation = this.validateBusinessLogic(mergedData, existingQuote.enquiryId);
      if (!consistencyValidation.isValid) {
        errors.push(...consistencyValidation.errors);
      }

      // 5. Check for significant changes that require re-approval
      const changeValidation = this.validateSignificantChanges(existingQuote, updateData);
      if (changeValidation.warnings.length > 0) {
        warnings.push(...changeValidation.warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        data: { existingQuote }
      };

    } catch (error) {
      console.error('Quote update validation error:', error);
      return {
        isValid: false,
        errors: ['Internal validation error occurred'],
        warnings: []
      };
    }
  }

  /**
   * Validate enquiry exists and user has access
   */
  private static async validateEnquiryExists(
    enquiryId: string,
    userId: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      const enquiry = await Enquiry.findById(enquiryId);
      
      if (!enquiry) {
        errors.push('Referenced enquiry not found');
        return { isValid: false, errors, warnings: [] };
      }

      // Check if enquiry is in a valid state for quote creation
      if (enquiry.status === 'archived') {
        errors.push('Cannot create quotes for archived enquiries');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: [],
        data: enquiry
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to validate enquiry'],
        warnings: []
      };
    }
  }

  /**
   * Validate user permissions for quote operations
   */
  private static async validateUserPermissions(
    userId: string,
    action: 'create' | 'edit' | 'delete'
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      const user = await User.findById(userId);
      
      if (!user) {
        errors.push('User not found');
        return { isValid: false, errors, warnings: [] };
      }

      // Check if user has admin role
      if (user.role !== 'admin') {
        errors.push('Insufficient permissions for quote operations');
      }

      // Check if user account is active
      if (user.status !== 'approved') {
        errors.push('User account is not approved for quote operations');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: []
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to validate user permissions'],
        warnings: []
      };
    }
  }

  /**
   * Check for duplicate or excessive quotes
   */
  private static async validateDuplicateQuotes(enquiryId: string): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const existingQuotes = await Quote.find({ enquiryId }).sort({ createdAt: -1 });
      
      // Business rule: Maximum 5 quotes per enquiry
      if (existingQuotes.length >= 5) {
        errors.push('Maximum number of quotes (5) reached for this enquiry');
      } else if (existingQuotes.length >= 3) {
        warnings.push('This enquiry already has multiple quotes. Consider updating existing quotes instead.');
      }

      // Check for recent duplicate quotes (within last hour)
      const recentQuotes = existingQuotes.filter(quote => {
        const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
        return quote.createdAt > hourAgo;
      });

      if (recentQuotes.length > 0) {
        warnings.push('A quote was recently created for this enquiry. Are you sure you want to create another?');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to check for duplicate quotes'],
        warnings: []
      };
    }
  }

  /**
   * Validate business logic and data consistency
   */
  private static validateBusinessLogic(
    quoteData: any,
    enquiry?: any
  ): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate arrival date business rules
    const arrivalDate = new Date(quoteData.arrivalDate);
    const today = new Date();
    const daysDifference = Math.ceil((arrivalDate.getTime() - today.getTime()) / (1000 * 3600 * 24));

    if (daysDifference < 1) {
      errors.push('Arrival date must be at least 1 day in the future');
    } else if (daysDifference < 7) {
      warnings.push('Short notice booking - arrival date is less than 7 days away');
    }

    if (daysDifference > 365) {
      warnings.push('Long advance booking - arrival date is more than 1 year away');
    }

    // 2. Validate room to people ratio
    const peoplePerRoom = quoteData.numberOfPeople / quoteData.numberOfRooms;
    if (peoplePerRoom > 4) {
      errors.push('Too many people per room (maximum 4 people per room)');
    } else if (peoplePerRoom > 3) {
      warnings.push('High occupancy - more than 3 people per room');
    }

    // 3. Validate pricing logic
    const pricePerPerson = quoteData.totalPrice / quoteData.numberOfPeople;
    const pricePerNight = quoteData.totalPrice / quoteData.numberOfNights;

    if (pricePerPerson < 50) {
      warnings.push('Price per person seems low - please verify pricing');
    } else if (pricePerPerson > 5000) {
      warnings.push('Price per person seems high - please verify pricing');
    }

    if (pricePerNight < 20) {
      warnings.push('Price per night seems low - please verify pricing');
    }

    // 4. Validate package consistency
    if (quoteData.isSuperPackage && pricePerPerson < 200) {
      warnings.push('Super package pricing seems low for premium offering');
    }

    // 5. Validate content completeness
    if (quoteData.whatsIncluded.length < 50) {
      warnings.push('What\'s included description is quite short - consider adding more details');
    }

    if (quoteData.transferIncluded && !quoteData.whatsIncluded.toLowerCase().includes('transfer')) {
      warnings.push('Transfer is marked as included but not mentioned in what\'s included');
    }

    // 6. Cross-reference with enquiry data if available
    if (enquiry) {
      if (enquiry.numberOfPeople && enquiry.numberOfPeople !== quoteData.numberOfPeople) {
        warnings.push('Number of people differs from original enquiry');
      }

      if (enquiry.departureDate) {
        const enquiryArrival = new Date(enquiry.departureDate);
        const quoteDeparture = new Date(arrivalDate);
        quoteDeparture.setDate(quoteDeparture.getDate() + quoteData.numberOfNights);
        
        const dateDiff = Math.abs(enquiryArrival.getTime() - quoteDeparture.getTime()) / (1000 * 3600 * 24);
        if (dateDiff > 2) {
          warnings.push('Quote dates differ significantly from enquiry dates');
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate pricing logic and reasonableness
   */
  private static validatePricingLogic(quoteData: QuoteFormData): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    const { totalPrice, numberOfPeople, numberOfNights, currency } = quoteData;

    // Currency-specific validation
    const currencyMultipliers = { GBP: 1, EUR: 1.15, USD: 1.25 };
    const basePriceGBP = totalPrice / (currencyMultipliers[currency] || 1);

    // Minimum viable price checks
    const minPricePerPersonPerNight = 15; // £15 minimum per person per night
    const calculatedMinPrice = numberOfPeople * numberOfNights * minPricePerPersonPerNight;

    if (basePriceGBP < calculatedMinPrice) {
      errors.push(`Price seems too low. Minimum expected: £${calculatedMinPrice} (${currency} ${(calculatedMinPrice * (currencyMultipliers[currency] || 1)).toFixed(2)})`);
    }

    // Maximum reasonable price checks
    const maxPricePerPersonPerNight = 1000; // £1000 maximum per person per night
    const calculatedMaxPrice = numberOfPeople * numberOfNights * maxPricePerPersonPerNight;

    if (basePriceGBP > calculatedMaxPrice) {
      warnings.push(`Price seems very high. Consider reviewing: £${calculatedMaxPrice} (${currency} ${(calculatedMaxPrice * (currencyMultipliers[currency] || 1)).toFixed(2)})`);
    }

    // Price consistency checks
    const pricePerPersonPerNight = basePriceGBP / (numberOfPeople * numberOfNights);
    
    if (pricePerPersonPerNight < 25) {
      warnings.push('Price per person per night is quite low - please verify this is correct');
    } else if (pricePerPersonPerNight > 500) {
      warnings.push('Price per person per night is quite high - please verify this is correct');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate user can edit specific quote
   */
  private static async validateEditPermissions(
    quote: any,
    userId: string
  ): Promise<ValidationResult> {
    const errors: string[] = [];

    // Check if user is the creator or has admin privileges
    if (quote.createdBy.toString() !== userId) {
      const user = await User.findById(userId);
      if (!user || user.role !== 'admin') {
        errors.push('You can only edit quotes you created');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate quote state allows editing
   */
  private static validateQuoteState(quote: any): ValidationResult {
    const errors: string[] = [];

    // Check if quote is in editable state
    if (quote.status === 'sent' && quote.emailSent) {
      // Allow editing sent quotes but warn about implications
      // This is a business decision - some companies may want to prevent this
    }

    // Check if arrival date has passed
    if (quote.arrivalDate < new Date()) {
      errors.push('Cannot edit quotes for past arrival dates');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Check for significant changes that may require re-approval
   */
  private static validateSignificantChanges(
    existingQuote: any,
    updateData: any
  ): ValidationResult {
    const warnings: string[] = [];

    // Define significant change thresholds
    const SIGNIFICANT_PRICE_CHANGE_PERCENT = 10; // 10% change
    const SIGNIFICANT_DATE_CHANGE_DAYS = 2; // 2 days change

    // Check price changes
    if (updateData.totalPrice && existingQuote.totalPrice) {
      const priceChangePercent = Math.abs(
        (updateData.totalPrice - existingQuote.totalPrice) / existingQuote.totalPrice * 100
      );
      
      if (priceChangePercent > SIGNIFICANT_PRICE_CHANGE_PERCENT) {
        warnings.push(`Significant price change detected (${priceChangePercent.toFixed(1)}%). Consider notifying the customer.`);
      }
    }

    // Check date changes
    if (updateData.arrivalDate && existingQuote.arrivalDate) {
      const existingDate = new Date(existingQuote.arrivalDate);
      const newDate = new Date(updateData.arrivalDate);
      const daysDifference = Math.abs((newDate.getTime() - existingDate.getTime()) / (1000 * 3600 * 24));
      
      if (daysDifference > SIGNIFICANT_DATE_CHANGE_DAYS) {
        warnings.push(`Significant date change detected (${daysDifference} days). Consider notifying the customer.`);
      }
    }

    // Check accommodation changes
    if (updateData.numberOfPeople && updateData.numberOfPeople !== existingQuote.numberOfPeople) {
      warnings.push('Number of people changed. This may affect room allocation and pricing.');
    }

    if (updateData.numberOfRooms && updateData.numberOfRooms !== existingQuote.numberOfRooms) {
      warnings.push('Number of rooms changed. This may affect availability and pricing.');
    }

    return {
      isValid: true,
      errors: [],
      warnings
    };
  }
}

/**
 * Data consistency validation utilities
 */
export class QuoteDataConsistencyValidator {
  /**
   * Validate quote-enquiry relationship integrity
   */
  static async validateQuoteEnquiryRelationship(quoteId: string): Promise<ValidationResult> {
    const errors: string[] = [];

    try {
      await connectDB();

      const quote = await Quote.findById(quoteId);
      if (!quote) {
        errors.push('Quote not found');
        return { isValid: false, errors, warnings: [] };
      }

      const enquiry = await Enquiry.findById(quote.enquiryId);
      if (!enquiry) {
        errors.push('Referenced enquiry not found - orphaned quote detected');
        return { isValid: false, errors, warnings: [] };
      }

      // Check if enquiry references this quote
      if (!enquiry.quotes || !enquiry.quotes.includes(quote._id)) {
        errors.push('Enquiry does not reference this quote - relationship inconsistency detected');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: []
      };

    } catch (error) {
      return {
        isValid: false,
        errors: ['Failed to validate quote-enquiry relationship'],
        warnings: []
      };
    }
  }

  /**
   * Find and report orphaned quotes
   */
  static async findOrphanedQuotes(): Promise<{
    orphanedQuotes: any[];
    inconsistentRelationships: any[];
  }> {
    try {
      await connectDB();

      // Find quotes with non-existent enquiries
      const allQuotes = await Quote.find({}).populate('enquiryId');
      const orphanedQuotes = allQuotes.filter(quote => !quote.enquiryId);

      // Find quotes not referenced by their enquiries
      const inconsistentRelationships = [];
      for (const quote of allQuotes) {
        if (quote.enquiryId) {
          const enquiry = await Enquiry.findById(quote.enquiryId);
          if (enquiry && (!enquiry.quotes || !enquiry.quotes.includes(quote._id))) {
            inconsistentRelationships.push({
              quoteId: quote._id,
              enquiryId: quote.enquiryId,
              issue: 'Quote not referenced by enquiry'
            });
          }
        }
      }

      return {
        orphanedQuotes,
        inconsistentRelationships
      };

    } catch (error) {
      console.error('Error finding orphaned quotes:', error);
      return {
        orphanedQuotes: [],
        inconsistentRelationships: []
      };
    }
  }

  /**
   * Clean up orphaned quotes and fix relationships
   */
  static async cleanupOrphanedData(): Promise<{
    deletedQuotes: number;
    fixedRelationships: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let deletedQuotes = 0;
    let fixedRelationships = 0;

    try {
      await connectDB();

      const { orphanedQuotes, inconsistentRelationships } = await this.findOrphanedQuotes();

      // Delete orphaned quotes (quotes with no enquiry)
      for (const quote of orphanedQuotes) {
        try {
          await Quote.findByIdAndDelete(quote._id);
          deletedQuotes++;
        } catch (error) {
          errors.push(`Failed to delete orphaned quote ${quote._id}`);
        }
      }

      // Fix inconsistent relationships
      for (const relationship of inconsistentRelationships) {
        try {
          const enquiry = await Enquiry.findById(relationship.enquiryId);
          if (enquiry) {
            if (!enquiry.quotes) {
              enquiry.quotes = [];
            }
            if (!enquiry.quotes.includes(relationship.quoteId)) {
              enquiry.quotes.push(relationship.quoteId);
              enquiry.hasQuotes = true;
              await enquiry.save();
              fixedRelationships++;
            }
          }
        } catch (error) {
          errors.push(`Failed to fix relationship for quote ${relationship.quoteId}`);
        }
      }

      return {
        deletedQuotes,
        fixedRelationships,
        errors
      };

    } catch (error) {
      errors.push('Failed to cleanup orphaned data');
      return {
        deletedQuotes: 0,
        fixedRelationships: 0,
        errors
      };
    }
  }
}