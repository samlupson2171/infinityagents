'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAutoSave, useUnsavedChanges } from '@/lib/hooks/useAutoSave';
import { 
  quoteFormValidationSchema, 
  QuoteFormData,
  QUOTE_BUSINESS_RULES,
  quoteValidationHelpers 
} from '@/lib/validation/quote-validation';

interface QuoteFormProps {
  enquiryId?: string;
  initialData?: Partial<QuoteFormData>;
  onSubmit: (data: QuoteFormData) => Promise<void>;
  onCancel?: () => void;
  isEditing?: boolean;
  className?: string;
}

export default function QuoteForm({
  enquiryId,
  initialData,
  onSubmit,
  onCancel,
  isEditing = false,
  className = '',
}: QuoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Form setup with react-hook-form and zod validation
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    clearErrors,
    formState: { errors, isDirty, isValidating },
    reset,
  } = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormValidationSchema),
    defaultValues: {
      enquiryId: enquiryId || initialData?.enquiryId || '',
      leadName: initialData?.leadName || '',
      hotelName: initialData?.hotelName || '',
      numberOfPeople: initialData?.numberOfPeople || 1,
      numberOfRooms: initialData?.numberOfRooms || 1,
      numberOfNights: initialData?.numberOfNights || 3,
      arrivalDate: initialData?.arrivalDate || '',
      isSuperPackage: initialData?.isSuperPackage || false,
      whatsIncluded: initialData?.whatsIncluded || '',
      transferIncluded: initialData?.transferIncluded || false,
      activitiesIncluded: initialData?.activitiesIncluded || '',
      totalPrice: initialData?.totalPrice || 0,
      currency: initialData?.currency || 'GBP',
      internalNotes: initialData?.internalNotes || '',
    },
  });

  // Watch form data for auto-save and validation
  const formData = watch();
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isValidatingServer, setIsValidatingServer] = useState(false);

  // Watch specific fields instead of entire formData object
  const numberOfPeople = watch('numberOfPeople');
  const numberOfRooms = watch('numberOfRooms');
  const totalPrice = watch('totalPrice');
  const currency = watch('currency');
  const arrivalDate = watch('arrivalDate');
  const whatsIncluded = watch('whatsIncluded');
  const transferIncluded = watch('transferIncluded');

  // Real-time validation warnings with specific dependencies
  useEffect(() => {
    const warnings: string[] = [];

    if (numberOfPeople && numberOfRooms) {
      if (!quoteValidationHelpers.isReasonableRoomRatio(numberOfPeople, numberOfRooms)) {
        warnings.push('Room to people ratio seems unusual. Consider adjusting.');
      }
    }

    if (totalPrice && numberOfPeople) {
      if (!quoteValidationHelpers.isReasonablePricePerPerson(totalPrice, numberOfPeople)) {
        warnings.push(`Price per person (${formatCurrency(totalPrice / numberOfPeople, currency)}) seems unusual.`);
      }
    }

    if (arrivalDate) {
      const arrivalDateObj = new Date(arrivalDate);
      const today = new Date();
      const daysDifference = Math.ceil((arrivalDateObj.getTime() - today.getTime()) / (1000 * 3600 * 24));
      
      if (daysDifference < 7 && daysDifference > 0) {
        warnings.push('Short notice booking - less than 7 days advance notice.');
      } else if (daysDifference > 365) {
        warnings.push('Long advance booking - more than 1 year in advance.');
      }
    }

    if (whatsIncluded && whatsIncluded.length < 50) {
      warnings.push('Consider adding more details to "What\'s included" for better customer understanding.');
    }

    if (transferIncluded && whatsIncluded && !whatsIncluded.toLowerCase().includes('transfer')) {
      warnings.push('Transfer is marked as included but not mentioned in the description.');
    }

    setValidationWarnings(warnings);
  }, [numberOfPeople, numberOfRooms, totalPrice, currency, arrivalDate, whatsIncluded, transferIncluded]);

  // Simplified validation - remove server-side validation for now
  const validateServerSide = async (field: string, value: any) => {
    // Disabled to prevent infinite loops
    return;
  };

  // Auto-save functionality - disabled to prevent issues
  const autoSaveStatus = {
    isSaving: false,
    lastSaved: null,
    error: null
  };

  // Warn about unsaved changes - disabled for now
  // useUnsavedChanges(isDirty && !autoSaveStatus.isSaving);

  // Currency formatting
  const formatCurrency = (amount: number, currency: string) => {
    const symbols = { GBP: '£', EUR: '€', USD: '$' };
    return `${symbols[currency as keyof typeof symbols] || currency} ${amount.toLocaleString()}`;
  };

  // Get tomorrow's date for minimum arrival date
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  // Handle form submission
  const onFormSubmit = async (data: QuoteFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(data);
      reset(data); // Reset form state to mark as clean
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate estimated rooms based on people
  const estimatedRooms = Math.ceil(numberOfPeople / 2);
  // Removed auto-update of rooms to prevent infinite loop
  // Users can manually adjust rooms as needed

  return (
    <div className={className}>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              {isEditing ? 'Edit Quote' : 'Create New Quote'}
            </h2>
            <p className="text-gray-600 mt-1">
              {isEditing 
                ? 'Update the quote details below'
                : 'Complete the form below to create a new quote'
              }
            </p>
            
            {/* Auto-save disabled for stability */}
          </div>

          {/* Error Display */}
          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{submitError}</p>
                </div>
              </div>
            </div>
          )}

          {/* Validation Warnings */}
          {validationWarnings.length > 0 && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-amber-800">Validation Warnings</h3>
                  <div className="text-sm text-amber-700 mt-1">
                    <ul className="list-disc list-inside space-y-1">
                      {validationWarnings.map((warning, index) => (
                        <li key={index}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Server Validation Indicator */}
          {isValidatingServer && (
            <div className="mb-4 flex items-center text-sm text-blue-600">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Validating...
            </div>
          )}

          <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
            {/* Lead Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Lead Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="leadName" className="block text-sm font-medium text-gray-700 mb-1">
                    Lead Name *
                  </label>
                  <input
                    type="text"
                    id="leadName"
                    {...register('leadName')}
                    onBlur={(e) => validateServerSide('leadName', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.leadName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter lead's name"
                  />
                  {errors.leadName && (
                    <p className="text-red-600 text-sm mt-1">{errors.leadName.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="hotelName" className="block text-sm font-medium text-gray-700 mb-1">
                    Hotel Name *
                  </label>
                  <input
                    type="text"
                    id="hotelName"
                    {...register('hotelName')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.hotelName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter hotel name"
                  />
                  {errors.hotelName && (
                    <p className="text-red-600 text-sm mt-1">{errors.hotelName.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Trip Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="numberOfPeople" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of People *
                  </label>
                  <input
                    type="number"
                    id="numberOfPeople"
                    {...register('numberOfPeople', { valueAsNumber: true })}
                    min="1"
                    max="100"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.numberOfPeople ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.numberOfPeople && (
                    <p className="text-red-600 text-sm mt-1">{errors.numberOfPeople.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="numberOfRooms" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Rooms *
                  </label>
                  <input
                    type="number"
                    id="numberOfRooms"
                    {...register('numberOfRooms', { valueAsNumber: true })}
                    min="1"
                    max="50"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.numberOfRooms ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.numberOfRooms && (
                    <p className="text-red-600 text-sm mt-1">{errors.numberOfRooms.message}</p>
                  )}
                  {numberOfRooms < estimatedRooms && (
                    <p className="text-amber-600 text-sm mt-1">
                      Suggested: {estimatedRooms} rooms for {numberOfPeople} people
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="numberOfNights" className="block text-sm font-medium text-gray-700 mb-1">
                    Number of Nights *
                  </label>
                  <input
                    type="number"
                    id="numberOfNights"
                    {...register('numberOfNights', { valueAsNumber: true })}
                    min="1"
                    max="30"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.numberOfNights ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.numberOfNights && (
                    <p className="text-red-600 text-sm mt-1">{errors.numberOfNights.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="arrivalDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Arrival Date *
                  </label>
                  <input
                    type="date"
                    id="arrivalDate"
                    {...register('arrivalDate')}
                    onBlur={(e) => validateServerSide('arrivalDate', e.target.value)}
                    min={getTomorrowDate()}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.arrivalDate ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.arrivalDate && (
                    <p className="text-red-600 text-sm mt-1">{errors.arrivalDate.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Package Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Package Details</h3>
              
              <div className="mb-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    {...register('isSuperPackage')}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm font-medium text-gray-700">Super Package</span>
                </label>
                <p className="text-sm text-gray-500 mt-1">Check if this is a premium/super package</p>
              </div>

              <div className="mb-4">
                <label htmlFor="whatsIncluded" className="block text-sm font-medium text-gray-700 mb-1">
                  What's Included *
                </label>
                <textarea
                  id="whatsIncluded"
                  {...register('whatsIncluded')}
                  rows={4}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.whatsIncluded ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Describe what's included in this quote..."
                />
                {errors.whatsIncluded && (
                  <p className="text-red-600 text-sm mt-1">{errors.whatsIncluded.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {whatsIncluded?.length || 0}/2000 characters
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      {...register('transferIncluded')}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">Transfer Included</span>
                  </label>
                </div>

                <div>
                  <label htmlFor="activitiesIncluded" className="block text-sm font-medium text-gray-700 mb-1">
                    Activities Included
                  </label>
                  <textarea
                    id="activitiesIncluded"
                    {...register('activitiesIncluded')}
                    rows={2}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.activitiesIncluded ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="List any activities included..."
                  />
                  {errors.activitiesIncluded && (
                    <p className="text-red-600 text-sm mt-1">{errors.activitiesIncluded.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="totalPrice" className="block text-sm font-medium text-gray-700 mb-1">
                    Total Price *
                  </label>
                  <input
                    type="number"
                    id="totalPrice"
                    {...register('totalPrice', { valueAsNumber: true })}
                    onBlur={(e) => validateServerSide('totalPrice', parseFloat(e.target.value))}
                    min="0"
                    max="1000000"
                    step="0.01"
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.totalPrice ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="0.00"
                  />
                  {errors.totalPrice && (
                    <p className="text-red-600 text-sm mt-1">{errors.totalPrice.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                    Currency *
                  </label>
                  <select
                    id="currency"
                    {...register('currency')}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      errors.currency ? 'border-red-500' : 'border-gray-300'
                    }`}
                  >
                    <option value="GBP">GBP (£)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                  {errors.currency && (
                    <p className="text-red-600 text-sm mt-1">{errors.currency.message}</p>
                  )}
                </div>
              </div>

              {/* Price Summary */}
              {totalPrice > 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                  <div className="text-sm">
                    <p><span className="font-medium">Total Price:</span> {formatCurrency(totalPrice, currency)}</p>
                    <p><span className="font-medium">Price per Person:</span> {formatCurrency(totalPrice / numberOfPeople, currency)}</p>
                    <p><span className="font-medium">Price per Room:</span> {formatCurrency(totalPrice / numberOfRooms, currency)}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Internal Notes */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Internal Notes</h3>
              <div>
                <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Notes (Optional)
                </label>
                <textarea
                  id="internalNotes"
                  {...register('internalNotes')}
                  rows={3}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.internalNotes ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Add any internal notes or comments..."
                />
                {errors.internalNotes && (
                  <p className="text-red-600 text-sm mt-1">{errors.internalNotes.message}</p>
                )}
                <p className="text-sm text-gray-500 mt-1">
                  {watch('internalNotes')?.length || 0}/1000 characters
                </p>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              {onCancel && (
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {isEditing ? 'Updating...' : 'Creating...'}
                  </div>
                ) : (
                  isEditing ? 'Update Quote' : 'Create Quote'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}