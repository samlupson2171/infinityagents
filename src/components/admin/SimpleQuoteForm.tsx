'use client';

import { useState } from 'react';

interface SimpleQuoteFormProps {
  enquiryId?: string;
  initialEnquiryId?: string | null;
  onSubmit: (data: any) => Promise<void>;
  onCancel?: () => void;
  className?: string;
}

export default function SimpleQuoteForm({
  enquiryId,
  initialEnquiryId,
  onSubmit,
  onCancel,
  className = '',
}: SimpleQuoteFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Simple form data state
  const [formData, setFormData] = useState({
    enquiryId: enquiryId || initialEnquiryId || '',
    leadName: '',
    hotelName: '',
    numberOfPeople: 4,
    numberOfRooms: 2,
    numberOfNights: 3,
    arrivalDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    isSuperPackage: false,
    whatsIncluded: '',
    transferIncluded: false,
    activitiesIncluded: '',
    totalPrice: 0,
    currency: 'GBP',
    internalNotes: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      // Basic validation
      if (!formData.enquiryId) {
        throw new Error('Enquiry ID is required');
      }
      if (!formData.leadName.trim()) {
        throw new Error('Lead name is required');
      }
      if (!formData.hotelName.trim()) {
        throw new Error('Hotel name is required');
      }
      if (!formData.whatsIncluded.trim()) {
        throw new Error('What\'s included is required');
      }
      if (formData.totalPrice <= 0) {
        throw new Error('Total price must be greater than 0');
      }

      await onSubmit(formData);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save quote');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Create New Quote</h2>
            <p className="text-gray-600 mt-1">Complete the form below to create a new quote</p>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Enquiry ID (hidden if provided) */}
            {!enquiryId && (
              <div>
                <label htmlFor="enquiryId" className="block text-sm font-medium text-gray-700 mb-1">
                  Enquiry ID *
                </label>
                <input
                  type="text"
                  id="enquiryId"
                  name="enquiryId"
                  value={formData.enquiryId}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter enquiry ID"
                  required
                />
              </div>
            )}

            {/* Lead Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="leadName" className="block text-sm font-medium text-gray-700 mb-1">
                  Lead Name *
                </label>
                <input
                  type="text"
                  id="leadName"
                  name="leadName"
                  value={formData.leadName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter lead's name"
                  required
                />
              </div>

              <div>
                <label htmlFor="hotelName" className="block text-sm font-medium text-gray-700 mb-1">
                  Hotel Name *
                </label>
                <input
                  type="text"
                  id="hotelName"
                  name="hotelName"
                  value={formData.hotelName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter hotel name"
                  required
                />
              </div>
            </div>

            {/* Trip Details */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label htmlFor="numberOfPeople" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of People *
                </label>
                <input
                  type="number"
                  id="numberOfPeople"
                  name="numberOfPeople"
                  value={formData.numberOfPeople}
                  onChange={handleInputChange}
                  min="1"
                  max="100"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="numberOfRooms" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Rooms *
                </label>
                <input
                  type="number"
                  id="numberOfRooms"
                  name="numberOfRooms"
                  value={formData.numberOfRooms}
                  onChange={handleInputChange}
                  min="1"
                  max="50"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="numberOfNights" className="block text-sm font-medium text-gray-700 mb-1">
                  Number of Nights *
                </label>
                <input
                  type="number"
                  id="numberOfNights"
                  name="numberOfNights"
                  value={formData.numberOfNights}
                  onChange={handleInputChange}
                  min="1"
                  max="30"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label htmlFor="arrivalDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Arrival Date *
                </label>
                <input
                  type="date"
                  id="arrivalDate"
                  name="arrivalDate"
                  value={formData.arrivalDate}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
            </div>

            {/* Package Details */}
            <div>
              <label className="flex items-center mb-4">
                <input
                  type="checkbox"
                  name="isSuperPackage"
                  checked={formData.isSuperPackage}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Super Package</span>
              </label>

              <div className="mb-4">
                <label htmlFor="whatsIncluded" className="block text-sm font-medium text-gray-700 mb-1">
                  What's Included *
                </label>
                <textarea
                  id="whatsIncluded"
                  name="whatsIncluded"
                  value={formData.whatsIncluded}
                  onChange={handleInputChange}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe what's included in this quote..."
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="transferIncluded"
                      checked={formData.transferIncluded}
                      onChange={handleInputChange}
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
                    name="activitiesIncluded"
                    value={formData.activitiesIncluded}
                    onChange={handleInputChange}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="List any activities included..."
                  />
                </div>
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="totalPrice" className="block text-sm font-medium text-gray-700 mb-1">
                  Total Price *
                </label>
                <input
                  type="number"
                  id="totalPrice"
                  name="totalPrice"
                  value={formData.totalPrice}
                  onChange={handleInputChange}
                  min="0"
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-1">
                  Currency *
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="GBP">GBP (£)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="USD">USD ($)</option>
                </select>
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <label htmlFor="internalNotes" className="block text-sm font-medium text-gray-700 mb-1">
                Internal Notes (Optional)
              </label>
              <textarea
                id="internalNotes"
                name="internalNotes"
                value={formData.internalNotes}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Add any internal notes or comments..."
              />
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
                    Creating...
                  </div>
                ) : (
                  'Create Quote'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}