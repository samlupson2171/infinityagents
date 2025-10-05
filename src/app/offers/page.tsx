'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/auth/ProtectedRoute';

interface PricingData {
  twoNights: number;
  threeNights: number;
  fourNights: number;
}

interface Pricing {
  month: string;
  hotel: PricingData;
  selfCatering: PricingData;
}

interface Offer {
  _id: string;
  title: string;
  description: string;
  destination: string;
  inclusions: string[];
  pricing: Pricing[];
  isActive: boolean;
}

export default function OffersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDestination, setSelectedDestination] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedAccommodation, setSelectedAccommodation] = useState<
    'hotel' | 'selfCatering'
  >('hotel');
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    try {
      const response = await fetch('/api/offers?simple=true');
      if (response.ok) {
        const data = await response.json();
        setOffers(data);
        if (data.length > 0) {
          setSelectedDestination(data[0].destination);
          setSelectedOffer(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching offers:', error);
    } finally {
      setLoading(false);
    }
  };

  const destinations = [...new Set(offers.map((offer) => offer.destination))];
  const months = selectedOffer ? selectedOffer.pricing.map((p) => p.month) : [];

  const getSelectedPricing = () => {
    if (!selectedOffer || !selectedMonth) return null;
    return selectedOffer.pricing.find((p) => p.month === selectedMonth);
  };

  const handleDestinationChange = (destination: string) => {
    setSelectedDestination(destination);
    const offer = offers.find((o) => o.destination === destination);
    setSelectedOffer(offer || null);
    setSelectedMonth('');
  };

  const handleEnquireNow = () => {
    if (!selectedOffer || !selectedMonth) {
      alert('Please select a destination and month first');
      return;
    }

    const pricing = getSelectedPricing();
    if (!pricing) return;

    // Create URL parameters with package details
    const params = new URLSearchParams({
      destination: selectedDestination,
      month: selectedMonth,
      accommodation: selectedAccommodation,
      packageTitle: selectedOffer.title,
      twoNights: pricing[selectedAccommodation].twoNights.toString(),
      threeNights: pricing[selectedAccommodation].threeNights.toString(),
      fourNights: pricing[selectedAccommodation].fourNights.toString(),
    });

    router.push(`/enquiries?${params.toString()}`);
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-12 text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Travel Packages
            </h1>
            <div className="w-24 h-1 bg-orange-500 mx-auto mb-6"></div>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
              Select your destination, month, and accommodation type to view
              pricing
            </p>
          </div>

          {offers.length === 0 ? (
            <div className="text-center py-12">
              <div className="bg-gray-50 border border-gray-200 rounded-md p-8 max-w-md mx-auto">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No Offers Available
                </h3>
                <p className="text-gray-600">
                  Check back later for new travel packages.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Filters */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8 sticky top-8">
                  <h2 className="text-2xl font-bold text-gray-900 mb-8 pb-4 border-b border-orange-200">
                    <span className="text-orange-600">Filter</span> Options
                  </h2>

                  {/* Destination Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Destination
                    </label>
                    <select
                      value={selectedDestination}
                      onChange={(e) => handleDestinationChange(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                    >
                      <option value="">Select Destination</option>
                      {destinations.map((destination) => (
                        <option key={destination} value={destination}>
                          {destination}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Month Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Month
                    </label>
                    <select
                      value={selectedMonth}
                      onChange={(e) => setSelectedMonth(e.target.value)}
                      disabled={!selectedDestination}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 disabled:bg-gray-100 transition-colors"
                    >
                      <option value="">Select Month</option>
                      {months.map((month) => (
                        <option key={month} value={month}>
                          {month}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Accommodation Type Filter */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Accommodation Type
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="accommodation"
                          value="hotel"
                          checked={selectedAccommodation === 'hotel'}
                          onChange={(e) =>
                            setSelectedAccommodation(e.target.value as 'hotel')
                          }
                          className="mr-2"
                        />
                        Hotel
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="accommodation"
                          value="selfCatering"
                          checked={selectedAccommodation === 'selfCatering'}
                          onChange={(e) =>
                            setSelectedAccommodation(
                              e.target.value as 'selfCatering'
                            )
                          }
                          className="mr-2"
                        />
                        Self-Catering
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="lg:col-span-2">
                {selectedOffer && (
                  <div className="space-y-6">
                    {/* Package Details */}
                    <div className="bg-white rounded-lg shadow-md p-6">
                      <h2 className="text-2xl font-bold text-gray-900 mb-4">
                        {selectedOffer.title}
                      </h2>
                      <p className="text-gray-600 mb-6">
                        {selectedOffer.description}
                      </p>

                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Package Inclusions:
                      </h3>
                      <ul className="space-y-2">
                        {selectedOffer.inclusions.map((inclusion, index) => (
                          <li key={index} className="flex items-start">
                            <svg
                              className="w-5 h-5 text-green-500 mr-2 mt-0.5 flex-shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                            <span className="text-gray-700">{inclusion}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Pricing Table */}
                    {selectedMonth && getSelectedPricing() && (
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">
                          Pricing for {selectedMonth} -{' '}
                          {selectedAccommodation === 'hotel'
                            ? 'Hotel'
                            : 'Self-Catering'}
                        </h3>

                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse border border-gray-300">
                            <thead>
                              <tr className="bg-gray-50">
                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                                  Duration
                                </th>
                                <th className="border border-gray-300 px-4 py-3 text-left font-semibold text-gray-900">
                                  Price per Person
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {(() => {
                                const pricing = getSelectedPricing();
                                const accommodationPricing =
                                  pricing![selectedAccommodation];
                                return [
                                  {
                                    duration: '2 Nights',
                                    price: accommodationPricing.twoNights,
                                  },
                                  {
                                    duration: '3 Nights',
                                    price: accommodationPricing.threeNights,
                                  },
                                  {
                                    duration: '4 Nights',
                                    price: accommodationPricing.fourNights,
                                  },
                                ].map((item, index) => (
                                  <tr
                                    key={index}
                                    className={
                                      index % 2 === 0
                                        ? 'bg-white'
                                        : 'bg-gray-50'
                                    }
                                  >
                                    <td className="border border-gray-300 px-4 py-3 text-gray-900">
                                      {item.duration}
                                    </td>
                                    <td className="border border-gray-300 px-4 py-3 text-gray-900 font-semibold">
                                      €{item.price}
                                    </td>
                                  </tr>
                                ));
                              })()}
                            </tbody>
                          </table>
                        </div>

                        <div className="mt-8 flex justify-center">
                          <button
                            onClick={() => handleEnquireNow()}
                            className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-4 px-10 rounded-lg text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
                          >
                            Enquire Now
                          </button>
                        </div>
                      </div>
                    )}

                    {selectedDestination && !selectedMonth && (
                      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                        <p className="text-blue-800">
                          Please select a month to view pricing information.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!selectedDestination && (
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Select a Destination
                    </h3>
                    <p className="text-gray-600">
                      Choose a destination from the filters to view available
                      packages and pricing.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
