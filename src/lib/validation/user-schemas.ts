import { z } from 'zod';

// Base user validation schema
export const baseUserSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters long')
    .max(100, 'Name cannot exceed 100 characters')
    .trim(),
  contactEmail: z
    .string()
    .email('Please provide a valid email address')
    .toLowerCase(),
});

// Enhanced registration schema with all required fields
export const enhancedRegistrationSchema = baseUserSchema.extend({
  companyName: z
    .string()
    .min(2, 'Company name must be at least 2 characters long')
    .max(200, 'Company name cannot exceed 200 characters')
    .trim()
    .optional(), // Make optional for backward compatibility
  abtaPtsNumber: z
    .string()
    .regex(
      /^(ABTA|PTS)[A-Z0-9]{4,10}$/i,
      'ABTA/PTS number must start with ABTA or PTS followed by 4-10 alphanumeric characters'
    )
    .transform((val) => val.toUpperCase()),
  websiteAddress: z
    .string()
    .url('Please provide a valid HTTP or HTTPS website URL')
    .refine((url) => {
      try {
        const parsedUrl = new URL(url);
        return (
          parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:'
        );
      } catch {
        return false;
      }
    }, 'Please provide a valid HTTP or HTTPS website URL'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .max(128, 'Password cannot exceed 128 characters'),
  // Enhanced agency registration fields
  company: z
    .string()
    .min(2, 'Company name must be at least 2 characters long')
    .max(200, 'Company name cannot exceed 200 characters')
    .trim(),
  consortia: z
    .string()
    .max(200, 'Consortia name cannot exceed 200 characters')
    .trim()
    .optional(),
}).refine((data) => {
  // Ensure at least one company field is provided
  return data.company || data.companyName;
}, {
  message: 'Company name is required',
  path: ['company'],
});

// Registration status validation
export const registrationStatusSchema = z.enum(['pending', 'approved', 'rejected', 'contracted']);

// User update schema for admin operations
export const userUpdateSchema = z.object({
  registrationStatus: registrationStatusSchema.optional(),
  rejectionReason: z
    .string()
    .max(500, 'Rejection reason cannot exceed 500 characters')
    .trim()
    .optional(),
  contractVersion: z
    .string()
    .trim()
    .optional(),
});

// Contract signing schema
export const contractSigningSchema = z.object({
  signature: z.union([z.string(), z.boolean()]),
  contractVersion: z.string().min(1, 'Contract version is required'),
});

// Admin approval/rejection schema
export const adminActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
  reason: z
    .string()
    .max(500, 'Reason cannot exceed 500 characters')
    .trim()
    .optional(),
});

// Type exports for TypeScript
export type EnhancedRegistrationData = z.infer<typeof enhancedRegistrationSchema>;
export type RegistrationStatus = z.infer<typeof registrationStatusSchema>;
export type UserUpdateData = z.infer<typeof userUpdateSchema>;
export type ContractSigningData = z.infer<typeof contractSigningSchema>;
export type AdminActionData = z.infer<typeof adminActionSchema>;