'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

interface EnquiryFormData {
  leadName: string;
  tripType: 'stag' | 'hen' | 'other';
  firstChoiceDestination: string;
  secondChoiceDestination: string;
  thirdChoiceDestination: string;
  resort: string;
  travelDate: string;
  departureAirport: string;
  numberOfNights: number;
  numberOfGuests: number;
  eventsRequested: string[];
  accommodationType: 'hotel' | 'apartments';
  boardType: string;
  budgetPerPerson: number;
  additionalNotes: string;
  packageDetails?: {
    destination: string;
    month: string;
    accommodation: string;
    packageTitle: string;
    pricing: {
      twoNights: number;
      threeNights: number;
      fourNights: number;
    };
  };
}

interface EnquiryFormProps {
  className?: string;
}

export default function EnquiryForm({ className = '' }: EnquiryFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formData, setFormData] = useState<EnquiryFormData>({
    leadName: '',
    tripType: 'stag',
    firstChoiceDestination: '',
    secondChoiceDestination: '',
    thirdChoiceDestination: '',
    resort: '',
    travelDate: '',
    departureAirport: '',
    numberOfNights: 3,
    numberOfGuests: 10,
    eventsRequested: [],
    accommodationType: 'hotel',
    boardType: '',
    budgetPerPerson: 500,
    additionalNotes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load package details from URL parameters
  useEffect(() => {
    const destination = searchParams.get('destination');
    const month = searchParams.get('month');
    const accommodation = searchParams.get('accommodation');
    const packageTitle = searchParams.get('packageTitle');
    const twoNights = searchParams.get('twoNights');
    const threeNights = searchParams.get('threeNights');
    const fourNights = searchParams.get('fourNights');

    if (
      destination &&
      month &&
      accommodation &&
      packageTitle &&
      twoNights &&
      threeNights &&
      fourNights
    ) {
      const packageDetails = {
        destination,
        month,
        accommodation,
        packageTitle,
        pricing: {
          twoNights: parseInt(twoNights),
          threeNights: parseInt(threeNights),
          fourNights: parseInt(fourNights),
        },
      };

      setFormData((prev) => ({
        ...prev,
        firstChoiceDestination: destination,
        accommodationType:
          accommodation === 'selfCatering' ? 'apartments' : 'hotel',
        packageDetails,
      }));
    }
  }, [searchParams]);

  const eventOptions = [
    'Boat Party',
    'Club Entry',
    'Bar Crawl',
    'Beach Activities',
    'Water Sports',
    'Go Karting',
    'Paintball',
    'Quad Biking',
    'Spa Treatment',
    'Restaurant Booking',
    'Private Transfer',
    'Airport Meet & Greet',
  ];

  const destinationOptions = [
    'Benidorm',
    'Magaluf',
    'Ibiza',
    'Barcelona',
    'Prague',
    'Amsterdam',
    'Dublin',
    'Budapest',
    'Krakow',
    'Berlin',
    'Munich',
    'Vienna',
    'Lisbon',
    'Madrid',
    'Rome',
    'Milan',
    'Paris',
    'Nice',
    'Marbella',
    'Salou',
  ];

  const boardTypeOptions = [
    'Room Only',
    'Bed & Breakfast',
    'Half Board',
    'Full Board',
    'All Inclusive',
  ];

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;

    if (type === 'number') {
      setFormData((prev) => ({
        ...prev,
        [name]: parseInt(value) || 0,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handleEventToggle = (event: string) => {
    setFormData((prev) => ({
      ...prev,
      eventsRequested: prev.eventsRequested.includes(event)
        ? prev.eventsRequested.filter((e) => e !== event)
        : [...prev.eventsRequested, event],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const enquiryData = {
        ...formData,
        ...(formData.packageDetails && {
          additionalNotes:
            formData.additionalNotes +
            `\n\n--- SELECTED PACKAGE ---\n` +
            `Package: ${formData.packageDetails.packageTitle}\n` +
            `Destination: ${formData.packageDetails.destination}\n` +
            `Month: ${formData.packageDetails.month}\n` +
            `Accommodation: ${formData.packageDetails.accommodation === 'selfCatering' ? 'Self-Catering' : 'Hotel'}\n` +
            `Pricing: 2N: €${formData.packageDetails.pricing.twoNights}, 3N: €${formData.packageDetails.pricing.threeNights}, 4N: €${formData.packageDetails.pricing.fourNights}`,
        }),
      };

      const response = await fetch('/api/enquiries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(enquiryData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to submit enquiry');
      }

      // Redirect to confirmation page
      router.push(`/enquiries/confirmation?id=${data.data.enquiryId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const totalBudget = formData.budgetPerPerson * formData.numberOfGuests;

  return (
    <div className={className}>
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">
              Submit New Enquiry
            </h2>
            <p className="text-gray-600 mt-1">
              Complete the form below to submit an enquiry for your client
            </p>
            {session?.user?.email && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">Agent Email:</span>{' '}
                  {session.user.email}
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-400"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Package Details (if coming from offers page) */}
            {formData.packageDetails && (
              <div className="bg-orange-50 border border-orange-200 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-orange-900 mb-4 flex items-center">
                  <svg
                    className="w-5 h-5 mr-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                  Selected Package Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p>
                      <span className="font-medium text-orange-800">
                        Package:
                      </span>{' '}
                      {formData.packageDetails.packageTitle}
                    </p>
                    <p>
                      <span className="font-medium text-orange-800">
                        Destination:
                      </span>{' '}
                      {formData.packageDetails.destination}
                    </p>
                    <p>
                      <span className="font-medium text-orange-800">
                        Month:
                      </span>{' '}
                      {formData.packageDetails.month}
                    </p>
                    <p>
                      <span className="font-medium text-orange-800">
                        Accommodation:
                      </span>{' '}
                      {formData.packageDetails.accommodation === 'selfCatering'
                        ? 'Self-Catering'
                        : 'Hotel'}
                    </p>
                  </div>
                  <div>
                    <p className="font-medium text-orange-800 mb-2">
                      Pricing per person:
                    </p>
                    <p>
                      • 2 Nights: €{formData.packageDetails.pricing.twoNights}
                    </p>
                    <p>
                      • 3 Nights: €{formData.packageDetails.pricing.threeNights}
                    </p>
                    <p>
                      • 4 Nights: €{formData.packageDetails.pricing.fourNights}
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-orange-100 rounded-md">
                  <p className="text-sm text-orange-800">
                    <span className="font-medium">Note:</span> The form below
                    has been pre-filled with your package selection. You can
                    modify any details as needed.
                  </p>
                </div>
              </div>
            )}

            {/* Lead Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Lead Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="leadName"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Lead Name *
                  </label>
                  <input
                    type="text"
                    id="leadName"
                    name="leadName"
                    value={formData.leadName}
                    onChange={handleInputChange}
                    required
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter lead's name"
                  />
                </div>

                <div>
                  <label
                    htmlFor="tripType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Trip Type *
                  </label>
                  <select
                    id="tripType"
                    name="tripType"
                    value={formData.tripType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="stag">Stag Do</option>
                    <option value="hen">Hen Do</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Trip Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Trip Details
              </h3>

              {/* Destination Preferences */}
              <div className="mb-6">
                <h4 className="text-md font-medium text-gray-800 mb-3">
                  Destination Preferences (in order of preference)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label
                      htmlFor="firstChoiceDestination"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      1st Choice *
                    </label>
                    <select
                      id="firstChoiceDestination"
                      name="firstChoiceDestination"
                      value={formData.firstChoiceDestination}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select destination</option>
                      {destinationOptions.map((destination) => (
                        <option key={destination} value={destination}>
                          {destination}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="secondChoiceDestination"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      2nd Choice
                    </label>
                    <select
                      id="secondChoiceDestination"
                      name="secondChoiceDestination"
                      value={formData.secondChoiceDestination}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select destination</option>
                      {destinationOptions
                        .filter(
                          (dest) => dest !== formData.firstChoiceDestination
                        )
                        .map((destination) => (
                          <option key={destination} value={destination}>
                            {destination}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="thirdChoiceDestination"
                      className="block text-sm font-medium text-gray-700 mb-1"
                    >
                      3rd Choice
                    </label>
                    <select
                      id="thirdChoiceDestination"
                      name="thirdChoiceDestination"
                      value={formData.thirdChoiceDestination}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select destination</option>
                      {destinationOptions
                        .filter(
                          (dest) =>
                            dest !== formData.firstChoiceDestination &&
                            dest !== formData.secondChoiceDestination
                        )
                        .map((destination) => (
                          <option key={destination} value={destination}>
                            {destination}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="resort"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Specific Resort/Hotel (Optional)
                  </label>
                  <input
                    type="text"
                    id="resort"
                    name="resort"
                    value={formData.resort}
                    onChange={handleInputChange}
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., Hotel Sol Pelicanos, Magaluf Strip"
                  />
                </div>

                <div>
                  <label
                    htmlFor="travelDate"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Travel Date *
                  </label>
                  <input
                    type="date"
                    id="travelDate"
                    name="travelDate"
                    value={formData.travelDate}
                    onChange={handleInputChange}
                    required
                    min={getTomorrowDate()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="departureAirport"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Departure Airport *
                  </label>
                  <input
                    type="text"
                    id="departureAirport"
                    name="departureAirport"
                    value={formData.departureAirport}
                    onChange={handleInputChange}
                    required
                    maxLength={100}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g., London Heathrow, Manchester"
                  />
                </div>

                <div>
                  <label
                    htmlFor="numberOfNights"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Number of Nights *
                  </label>
                  <input
                    type="number"
                    id="numberOfNights"
                    name="numberOfNights"
                    value={formData.numberOfNights}
                    onChange={handleInputChange}
                    required
                    min={1}
                    max={30}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="numberOfGuests"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Number of Guests *
                  </label>
                  <input
                    type="number"
                    id="numberOfGuests"
                    name="numberOfGuests"
                    value={formData.numberOfGuests}
                    onChange={handleInputChange}
                    required
                    min={1}
                    max={50}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label
                    htmlFor="budgetPerPerson"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Budget per Person (£) *
                  </label>
                  <input
                    type="number"
                    id="budgetPerPerson"
                    name="budgetPerPerson"
                    value={formData.budgetPerPerson}
                    onChange={handleInputChange}
                    required
                    min={0}
                    max={10000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Total budget: £{totalBudget.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Accommodation */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Accommodation
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="accommodationType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Accommodation Type *
                  </label>
                  <select
                    id="accommodationType"
                    name="accommodationType"
                    value={formData.accommodationType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="hotel">Hotel</option>
                    <option value="apartments">Apartments</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="boardType"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Board Type *
                  </label>
                  <select
                    id="boardType"
                    name="boardType"
                    value={formData.boardType}
                    onChange={handleInputChange}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select board type</option>
                    {boardTypeOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Events Requested */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Events Requested (Optional)
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Select any events or activities your client is interested in:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {eventOptions.map((event) => (
                  <label key={event} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.eventsRequested.includes(event)}
                      onChange={() => handleEventToggle(event)}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700">{event}</span>
                  </label>
                ))}
              </div>
              {formData.eventsRequested.length > 0 && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-sm text-blue-800">
                    <span className="font-medium">Selected events:</span>{' '}
                    {formData.eventsRequested.join(', ')}
                  </p>
                </div>
              )}
            </div>

            {/* Additional Notes */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Additional Notes
              </h3>
              <div>
                <label
                  htmlFor="additionalNotes"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Any other requirements or notes (Optional)
                </label>
                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  rows={4}
                  maxLength={1000}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter any additional requirements, special requests, or notes about the enquiry..."
                />
                <p className="text-sm text-gray-500 mt-1">
                  {formData.additionalNotes.length}/1000 characters
                </p>
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <h3 className="text-lg font-medium text-blue-900 mb-3">
                Enquiry Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p>
                    <span className="font-medium">Lead:</span>{' '}
                    {formData.leadName || 'Not specified'}
                  </p>
                  <p>
                    <span className="font-medium">Trip Type:</span>{' '}
                    {formData.tripType === 'stag'
                      ? 'Stag Do'
                      : formData.tripType === 'hen'
                        ? 'Hen Do'
                        : 'Other'}
                  </p>
                  <p>
                    <span className="font-medium">Destinations:</span>
                    {formData.firstChoiceDestination ? (
                      <>
                        1st: {formData.firstChoiceDestination}
                        {formData.secondChoiceDestination &&
                          `, 2nd: ${formData.secondChoiceDestination}`}
                        {formData.thirdChoiceDestination &&
                          `, 3rd: ${formData.thirdChoiceDestination}`}
                      </>
                    ) : (
                      'Not specified'
                    )}
                  </p>
                  <p>
                    <span className="font-medium">Specific Resort:</span>{' '}
                    {formData.resort || 'Not specified'}
                  </p>
                  <p>
                    <span className="font-medium">Travel Date:</span>{' '}
                    {formData.travelDate
                      ? new Date(formData.travelDate).toLocaleDateString(
                          'en-GB'
                        )
                      : 'Not specified'}
                  </p>
                </div>
                <div>
                  <p>
                    <span className="font-medium">Duration:</span>{' '}
                    {formData.numberOfNights} night
                    {formData.numberOfNights !== 1 ? 's' : ''}
                  </p>
                  <p>
                    <span className="font-medium">Guests:</span>{' '}
                    {formData.numberOfGuests}
                  </p>
                  <p>
                    <span className="font-medium">Budget per Person:</span> £
                    {formData.budgetPerPerson.toLocaleString()}
                  </p>
                  <p>
                    <span className="font-medium text-blue-900">
                      Total Budget:
                    </span>{' '}
                    £{totalBudget.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-6 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-400"
              >
                {loading ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-3 h-4 w-4 text-white inline"
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
                    Submitting...
                  </>
                ) : (
                  'Submit Enquiry'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
