'use client';

import React, { useState, useEffect } from 'react';
import { IPublishingHistoryEntry } from '@/models/Destination';

interface PublishingHistoryProps {
  destinationId: string;
  className?: string;
}

interface HistoryResponse {
  destination: {
    id: string;
    name: string;
    slug: string;
  };
  history: IPublishingHistoryEntry[];
}

export default function PublishingHistory({
  destinationId,
  className = ''
}: PublishingHistoryProps) {
  const [history, setHistory] = useState<IPublishingHistoryEntry[]>([]);
  const [destination, setDestination] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, [destinationId]);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/admin/destinations/${destinationId}/history`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch history');
      }

      const data: HistoryResponse = await response.json();
      setHistory(data.history);
      setDestination(data.destination);
    } catch (error) {
      console.error('Error fetching publishing history:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    const iconClasses = "w-4 h-4";
    
    switch (action) {
      case 'published':
        return <div className={`${iconClasses} bg-green-500 rounded-full`}></div>;
      case 'unpublished':
        return <div className={`${iconClasses} bg-yellow-500 rounded-full`}></div>;
      case 'archived':
        return <div className={`${iconClasses} bg-gray-500 rounded-full`}></div>;
      case 'scheduled':
        return <div className={`${iconClasses} bg-blue-500 rounded-full`}></div>;
      case 'approved':
        return <div className={`${iconClasses} bg-emerald-500 rounded-full`}></div>;
      case 'rejected':
        return <div className={`${iconClasses} bg-red-500 rounded-full`}></div>;
      default:
        return <div className={`${iconClasses} bg-gray-400 rounded-full`}></div>;
    }
  };

  const getActionText = (entry: IPublishingHistoryEntry) => {
    const baseText = entry.action.charAt(0).toUpperCase() + entry.action.slice(1);
    
    if (entry.action === 'scheduled' && entry.scheduledFor) {
      return `${baseText} for ${new Date(entry.scheduledFor).toLocaleString()}`;
    }
    
    if (entry.previousStatus && entry.newStatus && entry.previousStatus !== entry.newStatus) {
      return `${baseText} (${entry.previousStatus} → ${entry.newStatus})`;
    }
    
    return baseText;
  };

  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
  };

  if (isLoading) {
    return (
      <div className={`bg-white border rounded-lg p-4 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-gray-200 rounded-full"></div>
                <div className="flex-1 h-4 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white border rounded-lg p-4 ${className}`}>
        <div className="text-center py-8">
          <div className="text-red-600 mb-2">Failed to load publishing history</div>
          <button
            onClick={fetchHistory}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium text-gray-900">Publishing History</h3>
        {destination && (
          <div className="text-sm text-gray-600">
            {destination.name}
          </div>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No publishing history available
        </div>
      ) : (
        <div className="space-y-4">
          {history.map((entry, index) => {
            const timestamp = formatTimestamp(entry.timestamp);
            
            return (
              <div key={index} className="flex items-start space-x-3 pb-4 border-b border-gray-100 last:border-b-0">
                <div className="flex-shrink-0 mt-1">
                  {getActionIcon(entry.action)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">
                      {getActionText(entry)}
                    </p>
                    <div className="text-xs text-gray-500">
                      <div>{timestamp.date}</div>
                      <div>{timestamp.time}</div>
                    </div>
                  </div>
                  
                  {entry.performedBy && (
                    <p className="text-xs text-gray-600 mt-1">
                      by {entry.performedBy.name}
                    </p>
                  )}
                  
                  {entry.comment && (
                    <p className="text-sm text-gray-700 mt-2 bg-gray-50 rounded p-2">
                      {entry.comment}
                    </p>
                  )}
                  
                  {entry.version && (
                    <p className="text-xs text-gray-500 mt-1">
                      Version {entry.version}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-gray-200">
        <button
          onClick={fetchHistory}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Refresh History
        </button>
      </div>
    </div>
  );
}