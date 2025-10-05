'use client';

import React, { useState, useEffect } from 'react';
import { IDestination } from '@/models/Destination';

interface RelatedItem {
  _id: string;
  name: string;
  description?: string;
  price?: number;
  slug?: string;
  country?: string;
  region?: string;
}

interface RelationshipManagerProps {
  destination: IDestination;
  onUpdate: (relationships: {
    relatedOffers: string[];
    relatedActivities: string[];
    relatedDestinations: string[];
  }) => void;
  className?: string;
}

export default function RelationshipManager({
  destination,
  onUpdate,
  className = ''
}: RelationshipManagerProps) {
  const [offers, setOffers] = useState<RelatedItem[]>([]);
  const [activities, setActivities] = useState<RelatedItem[]>([]);
  const [destinations, setDestinations] = useState<RelatedItem[]>([]);
  
  const [selectedOffers, setSelectedOffers] = useState<string[]>(
    destination.relatedOffers?.map(id => id.toString()) || []
  );
  const [selectedActivities, setSelectedActivities] = useState<string[]>(
    destination.relatedActivities?.map(id => id.toString()) || []
  );
  const [selectedDestinations, setSelectedDestinations] = useState<string[]>(
    destination.relatedDestinations?.map(id => id.toString()) || []
  );
  
  const [loading, setLoading] = useState(true);
  const [searchTerms, setSearchTerms] = useState({
    offers: '',
    activities: '',
    destinations: ''
  });

  useEffect(() => {
    fetchRelatedContent();
  }, []);

  useEffect(() => {
    onUpdate({
      relatedOffers: selectedOffers,
      relatedActivities: selectedActivities,
      relatedDestinations: selectedDestinations
    });
  }, [selectedOffers, selectedActivities, selectedDestinations, onUpdate]);

  const fetchRelatedContent = async () => {
    try {
      setLoading(true);
      
      const [offersRes, activitiesRes, destinationsRes] = await Promise.all([
        fetch('/api/admin/offers?limit=100'),
        fetch('/api/admin/activities?limit=100'),
        fetch(`/api/admin/destinations?limit=100&exclude=${destination._id}`)
      ]);

      if (offersRes.ok) {
        const offersData = await offersRes.json();
        setOffers(offersData.offers || []);
      }

      if (activitiesRes.ok) {
        const activitiesData = await activitiesRes.json();
        setActivities(activitiesData.activities || []);
      }

      if (destinationsRes.ok) {
        const destinationsData = await destinationsRes.json();
        setDestinations(destinationsData.destinations || []);
      }
    } catch (error) {
      console.error('Error fetching related content:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOfferToggle = (offerId: string) => {
    setSelectedOffers(prev => 
      prev.includes(offerId) 
        ? prev.filter(id => id !== offerId)
        : [...prev, offerId]
    );
  };

  const handleActivityToggle = (activityId: string) => {
    setSelectedActivities(prev => 
      prev.includes(activityId) 
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    );
  };

  const handleDestinationToggle = (destinationId: string) => {
    setSelectedDestinations(prev => 
      prev.includes(destinationId) 
        ? prev.filter(id => id !== destinationId)
        : [...prev, destinationId]
    );
  };

  const filterItems = (items: RelatedItem[], searchTerm: string) => {
    if (!searchTerm.trim()) return items;
    
    const term = searchTerm.toLowerCase();
    return items.filter(item => 
      item.name.toLowerCase().includes(term) ||
      item.description?.toLowerCase().includes(term) ||
      item.country?.toLowerCase().includes(term) ||
      item.region?.toLowerCase().includes(term)
    );
  };

  const renderItemList = (
    items: RelatedItem[],
    selectedItems: string[],
    onToggle: (id: string) => void,
    searchTerm: string,
    onSearchChange: (term: string) => void,
    title: string,
    emptyMessage: string
  ) => {
    const filteredItems = filterItems(items, searchTerm);
    
    return (
      <div className="space-y-4">
        <div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">{title}</h4>
          <input
            type="text"
            placeholder={`Search ${title.toLowerCase()}...`}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        
        <div className="max-h-64 overflow-y-auto border border-gray-200 rounded-md">
          {filteredItems.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              {items.length === 0 ? emptyMessage : 'No items match your search'}
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <label
                  key={item._id}
                  className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item._id)}
                    onChange={() => onToggle(item._id)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-sm font-medium text-gray-900">
                      {item.name}
                    </div>
                    {item.description && (
                      <div className="text-sm text-gray-500 truncate">
                        {item.description}
                      </div>
                    )}
                    {(item.country || item.region) && (
                      <div className="text-xs text-gray-400">
                        {item.region && item.country ? `${item.region}, ${item.country}` : item.country || item.region}
                      </div>
                    )}
                    {item.price && (
                      <div className="text-xs text-green-600 font-medium">
                        From £{item.price}
                      </div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}
        </div>
        
        {selectedItems.length > 0 && (
          <div className="text-sm text-gray-600">
            {selectedItems.length} {title.toLowerCase()} selected
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Content Relationships</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          <span className="ml-2 text-gray-600">Loading related content...</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900">Content Relationships</h3>
        <p className="text-sm text-gray-600 mt-1">
          Link this destination with related offers, activities, and other destinations to provide visitors with comprehensive travel information.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Related Offers */}
        <div>
          {renderItemList(
            offers,
            selectedOffers,
            handleOfferToggle,
            searchTerms.offers,
            (term) => setSearchTerms(prev => ({ ...prev, offers: term })),
            'Related Offers',
            'No offers available'
          )}
        </div>

        {/* Related Activities */}
        <div>
          {renderItemList(
            activities,
            selectedActivities,
            handleActivityToggle,
            searchTerms.activities,
            (term) => setSearchTerms(prev => ({ ...prev, activities: term })),
            'Related Activities',
            'No activities available'
          )}
        </div>

        {/* Related Destinations */}
        <div>
          {renderItemList(
            destinations,
            selectedDestinations,
            handleDestinationToggle,
            searchTerms.destinations,
            (term) => setSearchTerms(prev => ({ ...prev, destinations: term })),
            'Related Destinations',
            'No other destinations available'
          )}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Relationship Summary</h4>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Offers:</span>
            <span className="ml-1 font-medium">{selectedOffers.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Activities:</span>
            <span className="ml-1 font-medium">{selectedActivities.length}</span>
          </div>
          <div>
            <span className="text-gray-600">Destinations:</span>
            <span className="ml-1 font-medium">{selectedDestinations.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}