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
  accommodationType?: string;
  nights?: number;
  pax?: number;
  price: number;
  specialPeriod?: string;
}

interface UnifiedOfferCreatorProps {
  onSave: (offerData: OfferFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<OfferFormData>;
}

export default function UnifiedOfferCreator({
  onSave,
  onCancel,
  initialData,
}: UnifiedOfferCreatorProps) {
  const [creationMethod, setCreationMethod] = useState<'manual' | 'excel'>(
    'manual'
  );
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
  const [newPricingEntry, setNewPricingEntry] = useState<Partial<PricingEntry>>(
    {
      month: '',
      price: 0,
    }
  );

  const handleMethodChange = (method: 'manual' | 'excel') => {
    setCreationMethod(method);
    if (method === 'manual') {
      // Clear Excel-specific state
      setExcelFile(null);
      setExcelAnalysis(null);
      setParsedExcelData(null);
    }
  };

  const handleFormDataChange = (field: keyof OfferFormData, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setFormData((prev) => ({
        ...prev,
        inclusions: [...prev.inclusions, newInclusion.trim()],
      }));
      setNewInclusion('');
    }
  };

  const handleRemoveInclusion = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      inclusions: prev.inclusions.filter((_, i) => i !== index),
    }));
  };

  const handleAddPricingEntry = () => {
    if (
      newPricingEntry.month &&
      newPricingEntry.price &&
      newPricingEntry.price > 0
    ) {
      setFormData((prev) => ({
        ...prev,
        pricing: [...prev.pricing, newPricingEntry as PricingEntry],
      }));
      setNewPricingEntry({ month: '', price: 0 });
    }
  };

  const handleRemovePricingEntry = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      pricing: prev.pricing.filter((_, i) => i !== index),
    }));
  };

  const handleExcelUpload = async (file: File) => {
    setIsProcessing(true);
    setExcelFile(file);

    try {
      // Convert file to buffer and process with existing Excel parser
      const buffer = Buffer.from(await file.arrayBuffer());
      
      // First, let's analyze the Excel file structure
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Convert to JSON to see the structure
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log('Excel structure analysis:');
      console.log('Sheet name:', sheetName);
      console.log('Total rows:', jsonData.length);
      console.log('Headers (first row):', jsonData[0]);
      console.log('Sample data (first 5 rows):', jsonData.slice(0, 5));
      
      // Create a custom parser for your Excel format
      const customParseResult = parseCustomExcelFormat(jsonData);
      
      if (customParseResult.success && customParseResult.data.length > 0) {
        // Use the custom parsed data
        const firstOffer = customParseResult.data[0];
        
        // Update form data with parsed Excel data
        setFormData(prev => ({
          ...prev,
          resortName: firstOffer.title,
          destination: firstOffer.destination,
          description: firstOffer.description,
          inclusions: firstOffer.inclusions,
          pricing: firstOffer.pricing.map(p => ({
            month: p.month,
            accommodationType: p.accommodation,
            nights: p.duration,
            price: p.price
          }))
        }));
        
        // Show success message with summary
        alert(`Successfully processed Excel file!\n\nFound: ${firstOffer.title}\nDestination: ${firstOffer.destination}\nPricing entries: ${firstOffer.pricing.length}\nInclusions: ${firstOffer.inclusions.length}\n\nData has been populated in the form below.`);
        return;
      }
      
      // If custom parser fails, show detailed error
      throw new Error(`Could not parse Excel file format.

Headers found: ${jsonData[0]?.join(', ')}
Total rows: ${jsonData.length}
Sample data: ${JSON.stringify(jsonData.slice(0, 3), null, 2)}

Please ensure your Excel file has:
- Resort/destination name in the header
- Pricing data in subsequent rows
- Month and price information`);
      
      // Helper function to parse your specific Excel format
      function parseCustomExcelFormat(data: any[][]) {
        try {
          const result = {
            success: false,
            data: [] as any[],
            errors: [] as string[]
          };
          
          if (data.length < 2) {
            result.errors.push('Not enough data rows');
            return result;
          }
          
          // Extract destination from header row
          const headerRow = data[0] || [];
          let destination = 'Unknown';
          let title = 'Package';
          
          // Look for destination in header row
          for (const cell of headerRow) {
            if (cell && typeof cell === 'string' && cell.trim()) {
              const cellValue = cell.trim();
              if (cellValue.toLowerCase().includes('albufeira') || 
                  cellValue.toLowerCase().includes('benidorm') ||
                  cellValue.toLowerCase().includes('mallorca') ||
                  cellValue.toLowerCase().includes('ibiza')) {
                destination = cellValue.split(' ')[0]; // Take first word as destination
                title = cellValue;
                break;
              }
            }
          }
          
          // Extract pricing data from subsequent rows
          const pricing = [];
          const inclusions = [];
          
          for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;
            
            // Look for pricing data (numbers that could be prices)
            for (let j = 0; j < row.length; j++) {
              const cell = row[j];
              if (cell && (typeof cell === 'number' || (typeof cell === 'string' && /[\d.,]+/.test(cell)))) {
                const price = parseFloat(String(cell).replace(/[^\d.]/g, ''));
                if (price > 0 && price < 10000) { // Reasonable price range
                  pricing.push({
                    month: `Month ${pricing.length + 1}`,
                    accommodation: 'Standard',
                    duration: 7,
                    price: price
                  });
                }
              }
              
              // Look for text that could be inclusions
              if (cell && typeof cell === 'string' && cell.length > 5 && 
                  !cell.match(/^\d+$/) && // Not just numbers
                  (cell.toLowerCase().includes('breakfast') ||
                   cell.toLowerCase().includes('wifi') ||
                   cell.toLowerCase().includes('pool') ||
                   cell.toLowerCase().includes('transfer') ||
                   cell.toLowerCase().includes('included'))) {
                inclusions.push(cell.trim());
              }
            }
          }
          
          if (pricing.length > 0) {
            result.data.push({
              title: title,
              destination: destination,
              description: `${destination} package for 2026`,
              inclusions: inclusions.length > 0 ? inclusions : ['Accommodation', 'Standard amenities'],
              pricing: pricing
            });
            result.success = true;
          } else {
            result.errors.push('No pricing data found');
          }
          
          return result;
        } catch (error) {
          return {
            success: false,
            data: [],
            errors: [error instanceof Error ? error.message : 'Unknown parsing error']
          };
        }
      }
      
      // Take the first offer from the parsed data and populate the form
      const firstOffer = parseResult.data[0];
      
      // Update form data with parsed Excel data
      setFormData(prev => ({
        ...prev,
        resortName: firstOffer.title,
        destination: firstOffer.destination,
        description: firstOffer.description,
        inclusions: firstOffer.inclusions,
        pricing: firstOffer.pricing.map(p => ({
          month: p.month,
          accommodationType: p.accommodation,
          nights: p.duration,
          price: p.price
        }))
      }));
      
      // Show success message with summary
      alert(`Successfully processed Excel file!\n\nFound ${parseResult.data.length} offer(s)\nLoaded: ${firstOffer.title}\nDestination: ${firstOffer.destination}\nPricing entries: ${firstOffer.pricing.length}\n\nData has been populated in the form below.`);
      
    } catch (error) {
      console.error('Excel processing failed:', error);
      
      // Show detailed error information to help with debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Excel processing failed:\n\n${errorMessage}\n\nTip: Make sure your Excel file has columns for:\n- Resort/Hotel name\n- Destination\n- Month\n- Price\n- Inclusions\n\nCheck the browser console for more details.`);
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

  const isFormValid = () => {
    return (
      formData.resortName.trim() &&
      formData.destination.trim() &&
      formData.description.trim()
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Create New Offer</h2>
          <p className="text-sm text-gray-500">
            Create a new offer manually or by uploading an Excel file
          </p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Save Offer
          </button>
        </div>
      </div>

      {/* Creation Method Selector */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          How would you like to create this offer?
        </h3>
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
                  Enter offer details manually using forms
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
                  Upload and parse an Excel file with pricing data
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Basic Information Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Basic Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resort Name *
            </label>
            <input
              type="text"
              value={formData.resortName}
              onChange={(e) =>
                handleFormDataChange('resortName', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter resort name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Destination *
            </label>
            <input
              type="text"
              value={formData.destination}
              onChange={(e) =>
                handleFormDataChange('destination', e.target.value)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter destination"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                handleFormDataChange('description', e.target.value)
              }
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter offer description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) => handleFormDataChange('currency', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="USD">USD ($)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Excel Upload Section */}
      {creationMethod === 'excel' && (
        <div className="space-y-6">
          {/* File Upload */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Excel File Upload
            </h3>
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
                      Supports .xlsx and .xls files up to 10MB
                    </span>
                  </label>
                  <input
                    id="excel-upload"
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleExcelUpload(file);
                    }}
                    className="sr-only"
                  />
                </div>
                <p className="mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById('excel-upload')?.click()
                    }
                    className="font-medium text-blue-600 hover:text-blue-500"
                  >
                    Choose file
                  </button>
                  <span className="text-gray-500"> or drag and drop</span>
                </p>
              </div>
            </div>
            {isProcessing && (
              <div className="mt-4 text-center">
                <div className="inline-flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Analyzing Excel file...
                </div>
              </div>
            )}
          </div>

          {/* Excel Processing Results */}
          {excelFile && !isProcessing && (
            <div className="bg-white border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Excel File Processed
              </h3>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <svg
                    className="h-5 w-5 text-green-500 mr-2"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="text-sm text-green-700">
                    Successfully processed: {excelFile.name}
                  </span>
                </div>
                <div className="mt-3 text-sm text-green-700">
                  <p><strong>Resort:</strong> {formData.resortName || 'Not detected'}</p>
                  <p><strong>Destination:</strong> {formData.destination || 'Not detected'}</p>
                  <p><strong>Inclusions:</strong> {formData.inclusions.length} items found</p>
                  <p><strong>Pricing entries:</strong> {formData.pricing.length} entries found</p>
                </div>
                <p className="text-xs text-green-600 mt-2">
                  Data has been automatically populated in the form below. Review and edit as needed before saving.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Entry Sections */}
      {creationMethod === 'manual' && (
        <div className="space-y-6">
          {/* Inclusions */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Package Inclusions
            </h3>
            <div className="space-y-4">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newInclusion}
                  onChange={(e) => setNewInclusion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddInclusion()}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter inclusion (e.g., Daily breakfast, Free WiFi)"
                />
                <button
                  onClick={handleAddInclusion}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Add
                </button>
              </div>
              {formData.inclusions.length > 0 && (
                <div className="space-y-2">
                  {formData.inclusions.map((inclusion, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded-md"
                    >
                      <span className="text-sm text-gray-700">
                        • {inclusion}
                      </span>
                      <button
                        onClick={() => handleRemoveInclusion(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Pricing Information
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Month *
                  </label>
                  <input
                    type="text"
                    value={newPricingEntry.month || ''}
                    onChange={(e) =>
                      setNewPricingEntry((prev) => ({
                        ...prev,
                        month: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="January"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Accommodation
                  </label>
                  <input
                    type="text"
                    value={newPricingEntry.accommodationType || ''}
                    onChange={(e) =>
                      setNewPricingEntry((prev) => ({
                        ...prev,
                        accommodationType: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Hotel"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nights
                  </label>
                  <input
                    type="number"
                    value={newPricingEntry.nights || ''}
                    onChange={(e) =>
                      setNewPricingEntry((prev) => ({
                        ...prev,
                        nights: parseInt(e.target.value) || undefined,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="7"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={newPricingEntry.price || ''}
                    onChange={(e) =>
                      setNewPricingEntry((prev) => ({
                        ...prev,
                        price: parseFloat(e.target.value) || 0,
                      }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="150.00"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleAddPricingEntry}
                    className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Add
                  </button>
                </div>
              </div>

              {formData.pricing.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Month
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Accommodation
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Nights
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Price
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {formData.pricing.map((entry, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {entry.month}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.accommodationType || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {entry.nights || '-'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {formData.currency === 'EUR'
                              ? '€'
                              : formData.currency === 'GBP'
                                ? '£'
                                : '$'}
                            {entry.price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <button
                              onClick={() => handleRemovePricingEntry(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Combined Inclusions Display */}
      {formData.inclusions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Current Inclusions ({formData.inclusions.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {formData.inclusions.map((inclusion, index) => (
              <div key={index} className="flex items-center space-x-2">
                <svg
                  className="h-4 w-4 text-green-500 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm text-gray-700">{inclusion}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Offer Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Resort:</span>
            <span className="ml-2 text-gray-900">
              {formData.resortName || 'Not specified'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Destination:</span>
            <span className="ml-2 text-gray-900">
              {formData.destination || 'Not specified'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Currency:</span>
            <span className="ml-2 text-gray-900">{formData.currency}</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Inclusions:</span>
            <span className="ml-2 text-gray-900">
              {formData.inclusions.length} items
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Pricing entries:</span>
            <span className="ml-2 text-gray-900">
              {formData.pricing.length} entries
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Status:</span>
            <span
              className={`ml-2 font-medium ${
                isFormValid() ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isFormValid() ? 'Ready to save' : 'Missing required fields'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
