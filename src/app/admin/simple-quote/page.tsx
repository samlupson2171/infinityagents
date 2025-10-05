'use client';

import { useState, useEffect } from 'react';

export default function SimpleQuotePage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [selectedEnquiry, setSelectedEnquiry] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Form data
  const [formData, setFormData] = useState({
    leadName: '',
    hotelName: '',
    numberOfPeople: 4,
    numberOfRooms: 2,
    numberOfNights: 3,
    arrivalDate: '',
    isSuperPackage: false,
    whatsIncluded: '',
    transferIncluded: false,
    activitiesIncluded: '',
    totalPrice: 0,
    currency: 'GBP',
    internalNotes: ''
  });

  // Load enquiries on mount
  useEffect(() => {
    loadEnquiries();
  }, []);

  const loadEnquiries = async () => {
    try {
      const response = await fetch('/api/admin/enquiries');
      const data = await response.json();
      
      if (response.ok && data.data?.enquiries) {
        setEnquiries(data.data.enquiries);
        if (data.data.enquiries.length > 0) {
          setSelectedEnquiry(data.data.enquiries[0]._id);
          setFormData(prev => ({
            ...prev,
            leadName: data.data.enquiries[0].leadName || ''
          }));
        }
      }
    } catch (err) {
      console.error('Failed to load enquiries:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      if (!selectedEnquiry) {
        throw new Error('Please select an enquiry');
      }

      const quoteData = {
        enquiryId: selectedEnquiry,
        ...formData
      };

      console.log('Submitting quote data:', quoteData);

      const response = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteData),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok) {
        throw new Error(data.error?.message || `HTTP ${response.status}: ${JSON.stringify(data)}`);
      }

      setResult(data);
      
      // Reset form
      setFormData({
        leadName: '',
        hotelName: '',
        numberOfPeople: 4,
        numberOfRooms: 2,
        numberOfNights: 3,
        arrivalDate: '',
        isSuperPackage: false,
        whatsIncluded: '',
        transferIncluded: false,
        activitiesIncluded: '',
        totalPrice: 0,
        currency: 'GBP',
        internalNotes: ''
      });

    } catch (err) {
      console.error('Quote creation error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : 
              type === 'number' ? parseFloat(value) || 0 : value
    }));
  };

  // Set default arrival date to 7 days from now
  useEffect(() => {
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 7);
    setFormData(prev => ({
      ...prev,
      arrivalDate: defaultDate.toISOString().split('T')[0]
    }));
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Simple Quote Creation</h1>
      
      <div className="bg-white shadow rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enquiry Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Enquiry *
            </label>
            <select
              value={selectedEnquiry}
              onChange={(e) => {
                setSelectedEnquiry(e.target.value);
                const enquiry = enquiries.find(enq => enq._id === e.target.value);
                if (enquiry) {
                  setFormData(prev => ({
                    ...prev,
                    leadName: enquiry.leadName || ''
                  }));
                }
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select an enquiry...</option>
              {enquiries.map(enquiry => (
                <option key={enquiry._id} value={enquiry._id}>
                  {enquiry.leadName} - {enquiry.agentEmail} ({new Date(enquiry.createdAt).toLocaleDateString()})
                </option>
              ))}
            </select>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lead Name *
              </label>
              <input
                type="text"
                name="leadName"
                value={formData.leadName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hotel Name *
              </label>
              <input
                type="text"
                name="hotelName"
                value={formData.hotelName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* Trip Details */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                People *
              </label>
              <input
                type="number"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Rooms *
              </label>
              <input
                type="number"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nights *
              </label>
              <input
                type="number"
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
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Arrival Date *
              </label>
              <input
                type="date"
                name="arrivalDate"
                value={formData.arrivalDate}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          {/* What's Included */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              What's Included *
            </label>
            <textarea
              name="whatsIncluded"
              value={formData.whatsIncluded}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe what's included in this quote..."
              required
            />
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Total Price *
              </label>
              <input
                type="number"
                name="totalPrice"
                value={formData.totalPrice}
                onChange={handleInputChange}
                min="0"
                step="0.01"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Currency *
              </label>
              <select
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

          {/* Optional Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  name="isSuperPackage"
                  checked={formData.isSuperPackage}
                  onChange={handleInputChange}
                  className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                />
                <span className="ml-2 text-sm font-medium text-gray-700">Super Package</span>
              </label>
            </div>

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
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Activities Included
            </label>
            <textarea
              name="activitiesIncluded"
              value={formData.activitiesIncluded}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="List any activities included..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              name="internalNotes"
              value={formData.internalNotes}
              onChange={handleInputChange}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any internal notes..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Quote'}
            </button>
          </div>
        </form>

        {/* Error Display */}
        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded">
            <h3 className="text-red-800 font-medium">Error:</h3>
            <p className="text-red-700 mt-1">{error}</p>
          </div>
        )}

        {/* Success Display */}
        {result && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
            <h3 className="text-green-800 font-medium">Quote Created Successfully!</h3>
            <div className="mt-2 text-sm text-green-700">
              <p><strong>Quote ID:</strong> {result.data._id}</p>
              <p><strong>Lead Name:</strong> {result.data.leadName}</p>
              <p><strong>Hotel:</strong> {result.data.hotelName}</p>
              <p><strong>Total Price:</strong> {result.data.currency} {result.data.totalPrice}</p>
              <p><strong>Status:</strong> {result.data.status}</p>
            </div>
            
            <div className="mt-4">
              <h4 className="font-medium mb-2">Full Response:</h4>
              <pre className="bg-gray-100 p-3 rounded text-xs overflow-auto max-h-64">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}