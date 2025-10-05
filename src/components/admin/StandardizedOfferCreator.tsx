'use client';

import React, { useState } from 'react';

interface OfferFormData {
  resortName: string;
  destination: string;
  description: string;
  inclusions: string[];
  currency: string;
  pricing: PricingEntry[];
}

interface PricingEntry {
  month: string;
  accommodationType: string;
  nights: number;
  price: number;
  pax: number;
  specialPeriod?: string;
}

interface StandardizedOfferCreatorProps {
  onSave: (offerData: OfferFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<OfferFormData>;
}

export default function StandardizedOfferCreator({
  onSave,
  onCancel,
  initialData,
}: StandardizedOfferCreatorProps) {
  const [creationMethod, setCreationMethod] = useState<'manual' | 'excel'>('manual');
  const [formData, setFormData] = useState<OfferFormData>({
    resortName: initialData?.resortName || '',
    destination: initialData?.destination || '',
    description: initialData?.description || '',
    inclusions: initialData?.inclusions || [],
    currency: initialData?.currency || 'EUR',
    pricing: initialData?.pricing || [],
  });

  // Excel upload state
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Manual entry state
  const [newInclusion, setNewInclusion] = useState('');
  const [newPricingEntry, setNewPricingEntry] = useState<Partial<PricingEntry>>({
    month: '',
    accommodationType: 'Apartment',
    nights: 3,
    price: 0,
    pax: 8,
  });

  const handleMethodChange = (method: 'manual' | 'excel') => {
    setCreationMethod(method);
    if (method === 'manual') {
      setExcelFile(null);
    }
  };

  const handleExcelUpload = async (file: File) => {
    setIsProcessing(true);
    setExcelFile(file);

    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      
      const { parseAlbufeiraExcel } = await import('@/lib/albufeira-excel-parser');
      const parsedData = parseAlbufeiraExcel(buffer);
      
      setFormData(prev => ({
        ...prev,
        resortName: parsedData.resortName,
        destination: parsedData.destination,
        description: parsedData.description,
        inclusions: parsedData.inclusions,
        currency: parsedData.currency,
        pricing: parsedData.pricing
      }));
      
      alert(`Successfully processed Excel file!\n\nResort: ${parsedData.resortName}\nDestination: ${parsedData.destination}\nPricing entries: ${parsedData.pricing.length}\nInclusions: ${parsedData.inclusions.length}\n\nData has been populated in the form below.`);
      
    } catch (error) {
      console.error('Excel processing failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Excel processing failed:\n\n${errorMessage}\n\nPlease use the provided template with exact column names:\n- Resort Name\n- Destination\n- Description\n- Month\n- Accommodation Type\n- Nights\n- Price\n- Currency\n- Inclusion 1, Inclusion 2, etc.\n\nDownload the template from the templates folder.`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    try {
      console.log('Saving offer data:', formData);
      await onSave(formData);
      alert('Offer saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert(`Failed to save offer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const addInclusion = () => {
    if (newInclusion.trim()) {
      setFormData(prev => ({
        ...prev,
        inclusions: [...prev.inclusions, newInclusion.trim()]
      }));
      setNewInclusion('');
    }
  };

  const removeInclusion = (index: number) => {
    setFormData(prev => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index)
    }));
  };

  const addPricingEntry = () => {
    if (newPricingEntry.month && newPricingEntry.price && newPricingEntry.price > 0 && newPricingEntry.nights && newPricingEntry.pax && newPricingEntry.accommodationType) {
      setFormData(prev => ({
        ...prev,
        pricing: [...prev.pricing, newPricingEntry as PricingEntry]
      }));
      setNewPricingEntry({
        month: '',
        accommodationType: 'Apartment',
        nights: 3,
        price: 0,
        pax: 8,
      });
    }
  };

  const removePricingEntry = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pricing: prev.pricing.filter((_, i) => i !== index)
    }));
  };

  const isFormValid = () => {
    return (
      formData.resortName.trim() &&
      formData.destination.trim() &&
      formData.description.trim() &&
      formData.inclusions.length > 0 &&
      formData.pricing.length > 0
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Create New Offer</h2>
        <p className="text-sm text-gray-500">
          Create a new offer manually or by uploading a standardized Excel file
        </p>
      </div>

      {/* Method Selection */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Creation Method</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => handleMethodChange('manual')}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              creationMethod === 'manual'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-4 h-4 rounded-full border-2 ${
                  creationMethod === 'manual'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {creationMethod === 'manual' && (
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Manual Entry</h4>
                <p className="text-sm text-gray-500">
                  Enter offer details manually using the form
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => handleMethodChange('excel')}
            className={`p-4 border-2 rounded-lg text-left transition-colors ${
              creationMethod === 'excel'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className={`w-4 h-4 rounded-full border-2 ${
                  creationMethod === 'excel'
                    ? 'border-blue-500 bg-blue-500'
                    : 'border-gray-300'
                }`}
              >
                {creationMethod === 'excel' && (
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5"></div>
                )}
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Excel Upload</h4>
                <p className="text-sm text-gray-500">
                  Upload a standardized Excel template
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Excel Upload Section */}
      {creationMethod === 'excel' && (
        <div className="space-y-6 mb-8">
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Excel File Upload
            </h3>
            
            {/* Template Download Link */}
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">📋 Use the Standardized Template</h4>
              <p className="text-sm text-blue-700 mb-3">
                Download and use our standardized template to ensure successful upload:
              </p>
              <a 
                href="/templates/offer-upload-template.csv" 
                download
                className="inline-flex items-center px-3 py-2 border border-blue-300 shadow-sm text-sm leading-4 font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                📥 Download Template
              </a>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  stroke="currentColor"
                  fill="none"
                  viewBox="0 0 48 48"
                >
                  <path
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-4">
                  <label htmlFor="excel-upload" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      {excelFile ? excelFile.name : 'Upload Excel file'}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      Supports .xlsx and .csv files up to 10MB
                    </span>
                  </label>
                  <input
                    id="excel-upload"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleExcelUpload(file);
                    }}
                    className="sr-only"
                  />
                </div>
                {!excelFile && (
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById('excel-upload')?.click()
                    }
                    className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Choose File
                  </button>
                )}
              </div>
            </div>

            {isProcessing && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="ml-2 text-sm text-gray-600">
                    Processing Excel file...
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Resort Name *
              </label>
              <input
                type="text"
                value={formData.resortName}
                onChange={(e) => setFormData(prev => ({ ...prev, resortName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Hotel Servigroup Pueblo Benidorm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Destination *
              </label>
              <select
                value={formData.destination}
                onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select destination</option>
                <option value="Benidorm">Benidorm</option>
                <option value="Albufeira">Albufeira</option>
              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the offer..."
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency *
            </label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
              <option value="USD">USD</option>
            </select>
          </div>
        </div>

        {/* Inclusions */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Inclusions</h3>
          <div className="space-y-2 mb-4">
            {formData.inclusions.map((inclusion, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                <span className="text-sm">{inclusion}</span>
                <button
                  onClick={() => removeInclusion(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="flex space-x-2">
            <input
              type="text"
              value={newInclusion}
              onChange={(e) => setNewInclusion(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add inclusion..."
              onKeyPress={(e) => e.key === 'Enter' && addInclusion()}
            />
            <button
              onClick={addInclusion}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Pricing</h3>
          <div className="space-y-2 mb-4">
            {formData.pricing.map((pricing, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded">
                <span className="text-sm">
                  {pricing.month} - {pricing.accommodationType} - {pricing.nights} nights - {pricing.pax} pax - {pricing.price} {formData.currency}
                  {pricing.specialPeriod && <span className="text-gray-600"> ({pricing.specialPeriod})</span>}
                </span>
                <button
                  onClick={() => removePricingEntry(index)}
                  className="text-red-600 hover:text-red-800"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mb-2">
            <select
              value={newPricingEntry.month}
              onChange={(e) => setNewPricingEntry(prev => ({ ...prev, month: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Month</option>
              {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map(month => (
                <option key={month} value={month}>{month}</option>
              ))}
            </select>
            <select
              value={newPricingEntry.accommodationType}
              onChange={(e) => setNewPricingEntry(prev => ({ ...prev, accommodationType: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {['Apartment', 'Hotel', 'Self-Catering', 'Villa', 'Hostel', 'Resort'].map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <input
              type="number"
              value={newPricingEntry.nights}
              onChange={(e) => setNewPricingEntry(prev => ({ ...prev, nights: parseInt(e.target.value) || 0 }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nights"
              min="1"
              max="14"
            />
            <input
              type="number"
              value={newPricingEntry.pax}
              onChange={(e) => setNewPricingEntry(prev => ({ ...prev, pax: parseInt(e.target.value) || 0 }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="People"
              min="1"
              max="50"
            />
            <input
              type="number"
              value={newPricingEntry.price}
              onChange={(e) => setNewPricingEntry(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Price"
              min="0"
              step="0.01"
            />
          </div>
          <button
            onClick={addPricingEntry}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Add Pricing
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mt-8">
        <button
          onClick={onCancel}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!isFormValid()}
          className={`px-6 py-2 rounded-md ${
            isFormValid()
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Save Offer
        </button>
      </div>
    </div>
  );
}