import { z } from 'zod';

// Business rules constants
export const QUOTE_BUSINESS_RULES = {
  MIN_PEOPLE: 1,
  MAX_PEOPLE: 100,
  MIN_ROOMS: 1,
  MAX_ROOMS: 50,
  MIN_NIGHTS: 1,
  MAX_NIGHTS: 30,
  MIN_PRICE: 0,
  MAX_PRICE: 1000000,
  MAX_LEAD_NAME_LENGTH: 100,
  MAX_HOTEL_NAME_LENGTH: 200,
  MAX_WHATS_INCLUDED_LENGTH: 2000,
  MAX_ACTIVITIES_LENGTH: 1000,
  MAX_INTERNAL_NOTES_LENGTH: 1000,
  SUPPORTED_CURRENCIES: ['GBP', 'EUR', 'USD'] as const,
  QUOTE_STATUSES: ['draft', 'sent', 'updated'] as const,
  EMAIL_DELIVERY_STATUSES: ['pending', 'delivered', 'failed'] as const,
  BOOKING_URGENCY_OPTIONS: [
    'immediately',
    'this-week', 
    'next-week',
    'within-month',
    'just-interested'
  ] as const,
  // Business logic thresholds
  MIN_ADVANCE_BOOKING_DAYS: 1, // Minimum days in advance for booking
  MAX_ADVANCE_BOOKING_DAYS: 365, // Maximum days in advance for booking
  REASONABLE_PRICE_PER_PERSON_MIN: 50, // Minimum reasonable price per person
  REASONABLE_PRICE_PER_PERSON_MAX: 10000, // Maximum reasonable price per person
  REASONABLE_ROOMS_PER_PERSON_RATIO: 0.5, // Minimum rooms per person ratio
};

// Custom validation functions
export const quoteValidationHelpers = {
  // Validate arrival date is in reasonable future range
  isValidArrivalDate: (date: string | Date): boolean => {
    const arrivalDate = new Date(date);
    const today = new Date();
    const minDate = new Date(today);
    minDate.setDate(today.getDate() + QUOTE_BUSINESS_RULES.MIN_ADVANCE_BOOKING_DAYS);
    
    const maxDate = new Date(today);
    maxDate.setDate(today.getDate() + QUOTE_BUSINESS_RULES.MAX_ADVANCE_BOOKING_DAYS);
    
    return arrivalDate >= minDate && arrivalDate <= maxDate;
  },

  // Validate room to people ratio makes sense
  isReasonableRoomRatio: (numberOfPeople: number, numberOfRooms: number): boolean => {
    const ratio = numberOfRooms / numberOfPeople;
    return ratio >= QUOTE_BUSINESS_RULES.REASONABLE_ROOMS_PER_PERSON_RATIO && ratio <= 1;
  },

  // Validate price per person is reasonable
  isReasonablePricePerPerson: (totalPrice: number, numberOfPeople: number): boolean => {
    const pricePerPerson = totalPrice / numberOfPeople;
    return pricePerPerson >= QUOTE_BUSINESS_RULES.REASONABLE_PRICE_PER_PERSON_MIN && 
           pricePerPerson <= QUOTE_BUSINESS_RULES.REASONABLE_PRICE_PER_PERSON_MAX;
  },

  // Validate email format
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate phone number format (basic international format)
  isValidPhoneNumber: (phone: string): boolean => {
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
  },

  // Check if text contains potentially harmful content
  containsHarmfulContent: (text: string): boolean => {
    const harmfulPatterns = [
      /<script/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /<iframe/i,
      /<object/i,
      /<embed/i,
    ];
    return harmfulPatterns.some(pattern => pattern.test(text));
  },
};

// Enhanced quote form validation schema
export const quoteFormValidationSchema = z.object({
  enquiryId: z.string()
    .min(1, 'Enquiry ID is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid enquiry ID format'),
    
  leadName: z.string()
    .min(1, 'Lead name is required')
    .max(QUOTE_BUSINESS_RULES.MAX_LEAD_NAME_LENGTH, `Lead name must be ${QUOTE_BUSINESS_RULES.MAX_LEAD_NAME_LENGTH} characters or less`)
    .refine(
      (name) => !quoteValidationHelpers.containsHarmfulContent(name),
      'Lead name contains invalid characters'
    )
    .refine(
      (name) => name.trim().length >= 2,
      'Lead name must be at least 2 characters'
    ),
    
  hotelName: z.string()
    .min(1, 'Hotel name is required')
    .max(QUOTE_BUSINESS_RULES.MAX_HOTEL_NAME_LENGTH, `Hotel name must be ${QUOTE_BUSINESS_RULES.MAX_HOTEL_NAME_LENGTH} characters or less`)
    .refine(
      (name) => !quoteValidationHelpers.containsHarmfulContent(name),
      'Hotel name contains invalid characters'
    ),
    
  numberOfPeople: z.number()
    .min(QUOTE_BUSINESS_RULES.MIN_PEOPLE, `Number of people must be at least ${QUOTE_BUSINESS_RULES.MIN_PEOPLE}`)
    .max(QUOTE_BUSINESS_RULES.MAX_PEOPLE, `Number of people cannot exceed ${QUOTE_BUSINESS_RULES.MAX_PEOPLE}`)
    .int('Number of people must be a whole number'),
    
  numberOfRooms: z.number()
    .min(QUOTE_BUSINESS_RULES.MIN_ROOMS, `Number of rooms must be at least ${QUOTE_BUSINESS_RULES.MIN_ROOMS}`)
    .max(QUOTE_BUSINESS_RULES.MAX_ROOMS, `Number of rooms cannot exceed ${QUOTE_BUSINESS_RULES.MAX_ROOMS}`)
    .int('Number of rooms must be a whole number'),
    
  numberOfNights: z.number()
    .min(QUOTE_BUSINESS_RULES.MIN_NIGHTS, `Number of nights must be at least ${QUOTE_BUSINESS_RULES.MIN_NIGHTS}`)
    .max(QUOTE_BUSINESS_RULES.MAX_NIGHTS, `Number of nights cannot exceed ${QUOTE_BUSINESS_RULES.MAX_NIGHTS}`)
    .int('Number of nights must be a whole number'),
    
  arrivalDate: z.string()
    .min(1, 'Arrival date is required')
    .refine(
      (date) => !isNaN(Date.parse(date)),
      'Invalid date format'
    )
    .refine(
      (date) => quoteValidationHelpers.isValidArrivalDate(date),
      `Arrival date must be between ${QUOTE_BUSINESS_RULES.MIN_ADVANCE_BOOKING_DAYS} and ${QUOTE_BUSINESS_RULES.MAX_ADVANCE_BOOKING_DAYS} days from today`
    ),
    
  isSuperPackage: z.boolean(),
  
  whatsIncluded: z.string()
    .min(1, 'What\'s included is required')
    .max(QUOTE_BUSINESS_RULES.MAX_WHATS_INCLUDED_LENGTH, `What's included must be ${QUOTE_BUSINESS_RULES.MAX_WHATS_INCLUDED_LENGTH} characters or less`)
    .refine(
      (text) => !quoteValidationHelpers.containsHarmfulContent(text),
      'What\'s included contains invalid content'
    )
    .refine(
      (text) => text.trim().length >= 10,
      'What\'s included must be at least 10 characters'
    ),
    
  transferIncluded: z.boolean(),
  
  activitiesIncluded: z.string()
    .max(QUOTE_BUSINESS_RULES.MAX_ACTIVITIES_LENGTH, `Activities included must be ${QUOTE_BUSINESS_RULES.MAX_ACTIVITIES_LENGTH} characters or less`)
    .refine(
      (text) => !text || !quoteValidationHelpers.containsHarmfulContent(text),
      'Activities included contains invalid content'
    )
    .optional(),
    
  totalPrice: z.number()
    .min(QUOTE_BUSINESS_RULES.MIN_PRICE, `Total price must be at least ${QUOTE_BUSINESS_RULES.MIN_PRICE}`)
    .max(QUOTE_BUSINESS_RULES.MAX_PRICE, `Total price cannot exceed ${QUOTE_BUSINESS_RULES.MAX_PRICE.toLocaleString()}`)
    .refine(
      (price) => Number.isFinite(price) && price >= 0,
      'Total price must be a valid positive number'
    ),
    
  currency: z.enum(QUOTE_BUSINESS_RULES.SUPPORTED_CURRENCIES, {
    errorMap: () => ({ message: `Currency must be one of: ${QUOTE_BUSINESS_RULES.SUPPORTED_CURRENCIES.join(', ')}` })
  }),
  
  internalNotes: z.string()
    .max(QUOTE_BUSINESS_RULES.MAX_INTERNAL_NOTES_LENGTH, `Internal notes must be ${QUOTE_BUSINESS_RULES.MAX_INTERNAL_NOTES_LENGTH} characters or less`)
    .refine(
      (text) => !text || !quoteValidationHelpers.containsHarmfulContent(text),
      'Internal notes contains invalid content'
    )
    .optional(),
}).refine(
  (data) => quoteValidationHelpers.isReasonableRoomRatio(data.numberOfPeople, data.numberOfRooms),
  {
    message: 'Room to people ratio seems unreasonable. Consider adjusting the number of rooms.',
    path: ['numberOfRooms']
  }
).refine(
  (data) => quoteValidationHelpers.isReasonablePricePerPerson(data.totalPrice, data.numberOfPeople),
  {
    message: `Price per person should be between £${QUOTE_BUSINESS_RULES.REASONABLE_PRICE_PER_PERSON_MIN} and £${QUOTE_BUSINESS_RULES.REASONABLE_PRICE_PER_PERSON_MAX.toLocaleString()}`,
    path: ['totalPrice']
  }
);

// Booking interest validation schema
export const bookingInterestValidationSchema = z.object({
  contactName: z.string()
    .min(1, 'Contact name is required')
    .max(100, 'Contact name must be 100 characters or less')
    .refine(
      (name) => !quoteValidationHelpers.containsHarmfulContent(name),
      'Contact name contains invalid characters'
    ),
    
  contactEmail: z.string()
    .min(1, 'Contact email is required')
    .max(200, 'Contact email must be 200 characters or less')
    .refine(
      (email) => quoteValidationHelpers.isValidEmail(email),
      'Invalid email format'
    ),
    
  contactPhone: z.string()
    .max(50, 'Contact phone must be 50 characters or less')
    .refine(
      (phone) => !phone || quoteValidationHelpers.isValidPhoneNumber(phone),
      'Invalid phone number format'
    )
    .optional(),
    
  bookingUrgency: z.enum(QUOTE_BUSINESS_RULES.BOOKING_URGENCY_OPTIONS, {
    errorMap: () => ({ message: `Booking urgency must be one of: ${QUOTE_BUSINESS_RULES.BOOKING_URGENCY_OPTIONS.join(', ')}` })
  }),
  
  additionalRequests: z.string()
    .max(1000, 'Additional requests must be 1000 characters or less')
    .refine(
      (text) => !text || !quoteValidationHelpers.containsHarmfulContent(text),
      'Additional requests contains invalid content'
    )
    .optional(),
});

// Quote update validation schema (allows partial updates)
export const quoteUpdateValidationSchema = z.object({
  enquiryId: z.string()
    .min(1, 'Enquiry ID is required')
    .regex(/^[0-9a-fA-F]{24}$/, 'Invalid enquiry ID format')
    .optional(),
    
  leadName: z.string()
    .min(1, 'Lead name is required')
    .max(QUOTE_BUSINESS_RULES.MAX_LEAD_NAME_LENGTH, `Lead name must be ${QUOTE_BUSINESS_RULES.MAX_LEAD_NAME_LENGTH} characters or less`)
    .optional(),
    
  hotelName: z.string()
    .min(1, 'Hotel name is required')
    .max(QUOTE_BUSINESS_RULES.MAX_HOTEL_NAME_LENGTH, `Hotel name must be ${QUOTE_BUSINESS_RULES.MAX_HOTEL_NAME_LENGTH} characters or less`)
    .optional(),
    
  numberOfPeople: z.number()
    .min(QUOTE_BUSINESS_RULES.MIN_PEOPLE, `Number of people must be at least ${QUOTE_BUSINESS_RULES.MIN_PEOPLE}`)
    .max(QUOTE_BUSINESS_RULES.MAX_PEOPLE, `Number of people cannot exceed ${QUOTE_BUSINESS_RULES.MAX_PEOPLE}`)
    .int('Number of people must be a whole number')
    .optional(),
    
  numberOfRooms: z.number()
    .min(QUOTE_BUSINESS_RULES.MIN_ROOMS, `Number of rooms must be at least ${QUOTE_BUSINESS_RULES.MIN_ROOMS}`)
    .max(QUOTE_BUSINESS_RULES.MAX_ROOMS, `Number of rooms cannot exceed ${QUOTE_BUSINESS_RULES.MAX_ROOMS}`)
    .int('Number of rooms must be a whole number')
    .optional(),
    
  numberOfNights: z.number()
    .min(QUOTE_BUSINESS_RULES.MIN_NIGHTS, `Number of nights must be at least ${QUOTE_BUSINESS_RULES.MIN_NIGHTS}`)
    .max(QUOTE_BUSINESS_RULES.MAX_NIGHTS, `Number of nights cannot exceed ${QUOTE_BUSINESS_RULES.MAX_NIGHTS}`)
    .int('Number of nights must be a whole number')
    .optional(),
    
  arrivalDate: z.string()
    .min(1, 'Arrival date is required')
    .refine(
      (date) => !isNaN(Date.parse(date)),
      'Invalid date format'
    )
    .refine(
      (date) => quoteValidationHelpers.isValidArrivalDate(date),
      `Arrival date must be between ${QUOTE_BUSINESS_RULES.MIN_ADVANCE_BOOKING_DAYS} and ${QUOTE_BUSINESS_RULES.MAX_ADVANCE_BOOKING_DAYS} days from today`
    )
    .optional(),
    
  isSuperPackage: z.boolean().optional(),
  
  whatsIncluded: z.string()
    .min(1, 'What\'s included is required')
    .max(QUOTE_BUSINESS_RULES.MAX_WHATS_INCLUDED_LENGTH, `What's included must be ${QUOTE_BUSINESS_RULES.MAX_WHATS_INCLUDED_LENGTH} characters or less`)
    .optional(),
    
  transferIncluded: z.boolean().optional(),
  
  activitiesIncluded: z.string()
    .max(QUOTE_BUSINESS_RULES.MAX_ACTIVITIES_LENGTH, `Activities included must be ${QUOTE_BUSINESS_RULES.MAX_ACTIVITIES_LENGTH} characters or less`)
    .optional(),
    
  totalPrice: z.number()
    .min(QUOTE_BUSINESS_RULES.MIN_PRICE, `Total price must be at least ${QUOTE_BUSINESS_RULES.MIN_PRICE}`)
    .max(QUOTE_BUSINESS_RULES.MAX_PRICE, `Total price cannot exceed ${QUOTE_BUSINESS_RULES.MAX_PRICE.toLocaleString()}`)
    .optional(),
    
  currency: z.enum(QUOTE_BUSINESS_RULES.SUPPORTED_CURRENCIES, {
    errorMap: () => ({ message: `Currency must be one of: ${QUOTE_BUSINESS_RULES.SUPPORTED_CURRENCIES.join(', ')}` })
  }).optional(),
  
  internalNotes: z.string()
    .max(QUOTE_BUSINESS_RULES.MAX_INTERNAL_NOTES_LENGTH, `Internal notes must be ${QUOTE_BUSINESS_RULES.MAX_INTERNAL_NOTES_LENGTH} characters or less`)
    .optional(),
    
  version: z.number().int().min(1).optional(),
  status: z.enum(QUOTE_BUSINESS_RULES.QUOTE_STATUSES).optional(),
});

// Server-side validation with additional business rules
export const serverSideQuoteValidation = {
  // Validate enquiry exists and is accessible
  validateEnquiryExists: async (enquiryId: string, userId: string) => {
    // This would be implemented in the API route
    // Returns validation result with detailed error information
    return {
      isValid: true,
      error: null,
      enquiry: null,
    };
  },

  // Validate user has permission to create/edit quotes
  validateUserPermissions: async (userId: string, action: 'create' | 'edit' | 'delete') => {
    // This would be implemented in the API route
    return {
      isValid: true,
      error: null,
    };
  },

  // Validate quote data consistency
  validateQuoteConsistency: (quoteData: any) => {
    const errors: string[] = [];

    // Check if arrival date is not too far in the past for updates
    const arrivalDate = new Date(quoteData.arrivalDate);
    const today = new Date();
    if (arrivalDate < today) {
      errors.push('Cannot create/update quotes for past arrival dates');
    }

    // Check if price makes sense for the destination/duration
    const pricePerNight = quoteData.totalPrice / quoteData.numberOfNights;
    if (pricePerNight < 10) {
      errors.push('Price per night seems unusually low');
    }

    // Check if room configuration makes sense
    const maxPeoplePerRoom = 4; // Business rule
    if (quoteData.numberOfPeople > (quoteData.numberOfRooms * maxPeoplePerRoom)) {
      errors.push(`Too many people for ${quoteData.numberOfRooms} rooms (max ${maxPeoplePerRoom} per room)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  },
};

// Export types
export type QuoteFormData = z.infer<typeof quoteFormValidationSchema>;
export type BookingInterestData = z.infer<typeof bookingInterestValidationSchema>;
export type QuoteUpdateData = z.infer<typeof quoteUpdateValidationSchema>;